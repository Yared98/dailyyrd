use axum::{
    extract::State,
    http::HeaderMap,
    response::{IntoResponse, Json},
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tracing::info;
use ulid::Ulid;

use crate::{
    db::{now_ts, today_str},
    models::{SaveCheckInRequest, WsMessage},
    state::AppState,
};

#[derive(Debug, Deserialize)]
pub struct JsonRpcRequest {
    #[allow(dead_code)]
    pub jsonrpc: String,
    pub id: Option<Value>,
    pub method: String,
    #[serde(default)]
    pub params: Option<Value>,
}

#[derive(Debug, Serialize)]
pub struct JsonRpcResponse {
    pub jsonrpc: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub result: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<JsonRpcError>,
}

#[derive(Debug, Serialize)]
pub struct JsonRpcError {
    pub code: i32,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<Value>,
}

fn extract_facilitator_token(headers: &HeaderMap, args: &Value) -> Option<String> {
    if let Some(token) = args.get("facilitator_token").or_else(|| args.get("token")).and_then(|v| v.as_str()) {
        if !token.trim().is_empty() {
            return Some(token.trim().to_string());
        }
    }
    if let Some(auth) = headers.get("authorization").and_then(|v| v.to_str().ok()) {
        if let Some(token) = auth.strip_prefix("Bearer ") {
            if !token.trim().is_empty() {
                return Some(token.trim().to_string());
            }
        }
    }
    if let Some(token) = headers.get("x-facilitator-token").and_then(|v| v.to_str().ok()) {
        if !token.trim().is_empty() {
            return Some(token.trim().to_string());
        }
    }
    None
}

fn verify_facilitator(state: &AppState, board_id: &str, token: Option<&str>) -> Result<(), JsonRpcError> {
    let board = state.db.get_board(board_id).map_err(|e| JsonRpcError {
        code: -32603,
        message: format!("Database error: {}", e),
        data: None,
    })?.ok_or_else(|| JsonRpcError {
        code: -32004,
        message: format!("Board '{}' not found", board_id),
        data: None,
    })?;

    match token {
        Some(t) if t == board.facilitator_token => Ok(()),
        _ => Err(JsonRpcError {
            code: -32003,
            message: "Unauthorized: Invalid or missing facilitator token".to_string(),
            data: None,
        }),
    }
}

pub async fn handle_mcp_request(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(req): Json<JsonRpcRequest>,
) -> impl IntoResponse {
    let id = req.id.clone();
    let result = match req.method.as_str() {
        "initialize" => Ok(json!({
            "protocolVersion": "2024-11-05",
            "capabilities": {
                "resources": { "subscribe": false, "listChanged": true },
                "tools": { "listChanged": true }
            },
            "serverInfo": {
                "name": "dailyyrd-mcp",
                "version": "1.0.0"
            }
        })),

        "resources/list" => {
            Ok(json!({
                "resources": [
                    {
                        "uri": "daily://board/{board_id}/today",
                        "name": "Daily Board Today's Check-ins",
                        "description": "Full structured list of check-ins, blockers, and meeting state for today's daily standup.",
                        "mimeType": "application/json"
                    },
                    {
                        "uri": "daily://board/{board_id}/blockers",
                        "name": "Daily Board Active Blockers",
                        "description": "Filtered list of active impediments and blockers reported by the team today.",
                        "mimeType": "application/json"
                    }
                ]
            }))
        }

        "resources/read" => {
            let uri = req.params.as_ref()
                .and_then(|p| p.get("uri"))
                .and_then(|u| u.as_str())
                .unwrap_or("");
            read_resource(&state, uri).await
        }

        "tools/list" => {
            Ok(json!({
                "tools": [
                    {
                        "name": "daily_submit_checkin",
                        "description": "Submits or updates a daily check-in for a team member. Ideal for AI agents auto-drafting updates from git commits, PRs, or Kanban tickets. Broadcasts in real-time via WebSocket.",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "board_id": { "type": "string", "description": "The ULID of the daily board" },
                                "user_name": { "type": "string", "description": "Name of the participant (max 60 chars)" },
                                "yesterday": { "type": "string", "description": "What was accomplished yesterday (max 5000 chars)" },
                                "today": { "type": "string", "description": "What will be done today (max 5000 chars)" },
                                "blockers": { "type": "string", "description": "Impediments or blockers (optional, max 2000 chars)" },
                                "has_blockers": { "type": "boolean", "description": "Whether the participant is blocked (defaults to true if blockers non-empty)" },
                                "date": { "type": "string", "description": "Date in YYYY-MM-DD format (optional, defaults to today)" },
                                "role": { "type": "string", "description": "Role/title of the participant (optional, max 60 chars)" },
                                "avatar_color": { "type": "string", "description": "Hex color code e.g. #6366F1 (optional)" },
                                "mood": { "type": "string", "description": "Mood emoji or text (optional)" },
                                "session_hash": { "type": "string", "description": "Unique session identifier for the participant (optional, auto-generated if omitted)" }
                            },
                            "required": ["board_id", "user_name", "yesterday", "today"]
                        }
                    },
                    {
                        "name": "daily_delete_checkin",
                        "description": "Removes a check-in from the board and broadcasts deletion in real-time. Allowed for original author (via session_hash) or board facilitator.",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "board_id": { "type": "string", "description": "The ULID of the daily board" },
                                "checkin_id": { "type": "string", "description": "ID of the check-in to delete" },
                                "session_hash": { "type": "string", "description": "Session hash of the creator (optional if facilitator_token provided)" },
                                "facilitator_token": { "type": "string", "description": "Facilitator token (or via Authorization/x-facilitator-token header)" }
                            },
                            "required": ["board_id", "checkin_id"]
                        }
                    },
                    {
                        "name": "daily_start_meeting",
                        "description": "Starts the live daily standup meeting timer and speaker rotation with real-time broadcast. Requires facilitator token.",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "board_id": { "type": "string", "description": "The ULID of the daily board" },
                                "date": { "type": "string", "description": "Date in YYYY-MM-DD format (optional, defaults to today)" },
                                "speaker_order": {
                                    "type": "array",
                                    "items": { "type": "string" },
                                    "description": "Custom speaker order list (optional, auto-built from check-ins if omitted)"
                                },
                                "facilitator_token": { "type": "string", "description": "Facilitator token (or via Authorization/x-facilitator-token header)" }
                            },
                            "required": ["board_id"]
                        }
                    },
                    {
                        "name": "daily_next_speaker",
                        "description": "Advances to the next speaker in the live meeting and restarts the per-speaker timer. Requires facilitator token.",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "board_id": { "type": "string", "description": "The ULID of the daily board" },
                                "date": { "type": "string", "description": "Date in YYYY-MM-DD format (optional, defaults to today)" },
                                "facilitator_token": { "type": "string", "description": "Facilitator token (or via Authorization/x-facilitator-token header)" }
                            },
                            "required": ["board_id"]
                        }
                    },
                    {
                        "name": "daily_set_timer",
                        "description": "Controls the meeting timer: start, pause, or reset. Requires facilitator token.",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "board_id": { "type": "string", "description": "The ULID of the daily board" },
                                "action": { "type": "string", "enum": ["start", "pause", "reset"], "description": "Action to perform on timer" },
                                "seconds": { "type": "integer", "description": "Duration in seconds (optional, 10 to 600, default 90)" },
                                "date": { "type": "string", "description": "Date in YYYY-MM-DD format (optional, defaults to today)" },
                                "facilitator_token": { "type": "string", "description": "Facilitator token (or via Authorization/x-facilitator-token header)" }
                            },
                            "required": ["board_id", "action"]
                        }
                    },
                    {
                        "name": "daily_end_meeting",
                        "description": "Concludes the active live standup meeting. Requires facilitator token.",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "board_id": { "type": "string", "description": "The ULID of the daily board" },
                                "date": { "type": "string", "description": "Date in YYYY-MM-DD format (optional, defaults to today)" },
                                "facilitator_token": { "type": "string", "description": "Facilitator token (or via Authorization/x-facilitator-token header)" }
                            },
                            "required": ["board_id"]
                        }
                    },
                    {
                        "name": "daily_get_board_summary",
                        "description": "Fetches a complete executive summary of today's daily board: participant count, blockers list, meeting status, and check-ins.",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "board_id": { "type": "string", "description": "The ULID of the daily board" },
                                "date": { "type": "string", "description": "Date in YYYY-MM-DD format (optional, defaults to today)" }
                            },
                            "required": ["board_id"]
                        }
                    }
                ]
            }))
        }

        "tools/call" => {
            let params = req.params.as_ref().unwrap_or(&Value::Null);
            let tool_name = params.get("name").and_then(|v| v.as_str()).unwrap_or("");
            let arguments = params.get("arguments").cloned().unwrap_or(json!({}));

            call_tool(&state, &headers, tool_name, arguments).await
        }

        unknown => Err(JsonRpcError {
            code: -32601,
            message: format!("Method '{}' not found", unknown),
            data: None,
        }),
    };

    let resp = match result {
        Ok(val) => JsonRpcResponse {
            jsonrpc: "2.0".to_string(),
            id,
            result: Some(val),
            error: None,
        },
        Err(err) => JsonRpcResponse {
            jsonrpc: "2.0".to_string(),
            id,
            result: None,
            error: Some(err),
        },
    };

    Json(resp)
}

async fn read_resource(state: &AppState, uri: &str) -> Result<Value, JsonRpcError> {
    if let Some(board_id) = uri.strip_prefix("daily://board/").and_then(|s| s.strip_suffix("/today")) {
        let board = state.db.get_board(board_id).map_err(|e| JsonRpcError {
            code: -32603,
            message: format!("Database error: {}", e),
            data: None,
        })?.ok_or_else(|| JsonRpcError {
            code: -32004,
            message: format!("Board '{}' not found", board_id),
            data: None,
        })?;

        let today = today_str();
        let checkins = state.db.get_checkins(board_id, &today).unwrap_or_default();
        let meeting_state = state.db.get_meeting_state(board_id, &today, board.meeting_timer_seconds).unwrap_or_default();
        let blockers_count = checkins.iter().filter(|c| c.has_blockers).count();

        return Ok(json!({
            "contents": [{
                "uri": uri,
                "mimeType": "application/json",
                "text": serde_json::to_string_pretty(&json!({
                    "board_id": board.id,
                    "title": board.title,
                    "date": today,
                    "total_checkins": checkins.len(),
                    "blockers_count": blockers_count,
                    "meeting_active": meeting_state.is_active,
                    "checkins": checkins,
                    "meeting_state": meeting_state
                })).unwrap()
            }]
        }));
    }

    if let Some(board_id) = uri.strip_prefix("daily://board/").and_then(|s| s.strip_suffix("/blockers")) {
        let board = state.db.get_board(board_id).map_err(|e| JsonRpcError {
            code: -32603,
            message: format!("Database error: {}", e),
            data: None,
        })?.ok_or_else(|| JsonRpcError {
            code: -32004,
            message: format!("Board '{}' not found", board_id),
            data: None,
        })?;

        let today = today_str();
        let checkins = state.db.get_checkins(board_id, &today).unwrap_or_default();
        let blockers: Vec<_> = checkins
            .into_iter()
            .filter(|c| c.has_blockers)
            .map(|c| json!({
                "user_name": c.user_name,
                "role": c.role,
                "blockers": c.blockers,
                "updated_at": c.updated_at
            }))
            .collect();

        return Ok(json!({
            "contents": [{
                "uri": uri,
                "mimeType": "application/json",
                "text": serde_json::to_string_pretty(&json!({
                    "board_id": board.id,
                    "title": board.title,
                    "date": today,
                    "total_blockers": blockers.len(),
                    "blockers": blockers
                })).unwrap()
            }]
        }));
    }

    Err(JsonRpcError {
        code: -32002,
        message: format!("Invalid or unsupported URI: '{}'", uri),
        data: None,
    })
}

async fn call_tool(state: &AppState, headers: &HeaderMap, name: &str, args: Value) -> Result<Value, JsonRpcError> {
    match name {
        "daily_submit_checkin" => {
            let board_id = args.get("board_id").and_then(|v| v.as_str()).ok_or_else(|| JsonRpcError {
                code: -32602,
                message: "Missing 'board_id' argument".to_string(),
                data: None,
            })?;

            let user_name = args.get("user_name").and_then(|v| v.as_str()).unwrap_or("").trim();
            if user_name.is_empty() {
                return Err(JsonRpcError {
                    code: -32602,
                    message: "User name cannot be empty".to_string(),
                    data: None,
                });
            }

            let yesterday = args.get("yesterday").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let today_tasks = args.get("today").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let blockers = args.get("blockers").and_then(|v| v.as_str()).map(|s| s.to_string());
            let has_blockers = args.get("has_blockers").and_then(|v| v.as_bool()).unwrap_or_else(|| {
                blockers.as_ref().map(|b| !b.trim().is_empty()).unwrap_or(false)
            });

            let date = args.get("date")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
                .unwrap_or_else(today_str);

            let session_hash = args.get("session_hash")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
                .unwrap_or_else(|| Ulid::new().to_string());

            let role = args.get("role").and_then(|v| v.as_str()).map(|s| s.to_string());
            let avatar_color = args.get("avatar_color").and_then(|v| v.as_str()).map(|s| s.to_string());
            let mood = args.get("mood").and_then(|v| v.as_str()).map(|s| s.to_string());

            let req = SaveCheckInRequest {
                date: date.clone(),
                user_name: user_name.to_string(),
                role,
                avatar_color,
                yesterday,
                today: today_tasks,
                blockers,
                has_blockers,
                mood,
                session_hash,
            };

            req.validate().map_err(|e| JsonRpcError {
                code: -32602,
                message: format!("Validation error: {}", e),
                data: None,
            })?;

            let checkin = state.db.save_checkin(board_id, &req).map_err(|e| JsonRpcError {
                code: -32603,
                message: format!("Failed to save checkin: {}", e),
                data: None,
            })?;

            // Broadcast check-in saved to everyone connected via WebSocket
            state.broadcast(
                board_id,
                WsMessage {
                    msg_type: "CHECKIN_SAVED".to_string(),
                    payload: json!({ "checkin": checkin }),
                    timestamp: now_ts(),
                },
            );

            info!(board_id = %board_id, user = %checkin.user_name, "Check-in submitted via MCP Tool");

            Ok(json!({
                "content": [{
                    "type": "text",
                    "text": format!("Check-in for '{}' successfully submitted on board '{}' for date '{}'.", checkin.user_name, board_id, date)
                }],
                "checkin_id": checkin.id,
                "has_blockers": checkin.has_blockers
            }))
        }

        "daily_delete_checkin" => {
            let board_id = args.get("board_id").and_then(|v| v.as_str()).ok_or_else(|| JsonRpcError {
                code: -32602,
                message: "Missing 'board_id' argument".to_string(),
                data: None,
            })?;

            let checkin_id = args.get("checkin_id").and_then(|v| v.as_str()).ok_or_else(|| JsonRpcError {
                code: -32602,
                message: "Missing 'checkin_id' argument".to_string(),
                data: None,
            })?;

            let session_hash = args.get("session_hash").and_then(|v| v.as_str()).unwrap_or("");
            let token = extract_facilitator_token(headers, &args);

            let is_facilitator = if let Some(ref t) = token {
                state.db.get_board(board_id).ok().flatten().map(|b| b.facilitator_token == *t).unwrap_or(false)
            } else {
                false
            };

            let deleted = state.db.delete_checkin(board_id, checkin_id, session_hash, is_facilitator).map_err(|e| JsonRpcError {
                code: -32603,
                message: format!("DB error: {}", e),
                data: None,
            })?;

            if deleted {
                state.broadcast(
                    board_id,
                    WsMessage {
                        msg_type: "CHECKIN_DELETED".to_string(),
                        payload: json!({ "checkin_id": checkin_id }),
                        timestamp: now_ts(),
                    },
                );

                Ok(json!({
                    "content": [{
                        "type": "text",
                        "text": format!("Check-in '{}' deleted successfully from board '{}'.", checkin_id, board_id)
                    }],
                    "deleted": true
                }))
            } else {
                Err(JsonRpcError {
                    code: -32003,
                    message: "Permission denied or check-in not found".to_string(),
                    data: None,
                })
            }
        }

        "daily_start_meeting" => {
            let board_id = args.get("board_id").and_then(|v| v.as_str()).ok_or_else(|| JsonRpcError {
                code: -32602,
                message: "Missing 'board_id' argument".to_string(),
                data: None,
            })?;

            let token = extract_facilitator_token(headers, &args);
            verify_facilitator(state, board_id, token.as_deref())?;

            let date = args.get("date").and_then(|v| v.as_str()).map(|s| s.to_string()).unwrap_or_else(today_str);
            let default_timer = state.db.get_board(board_id).ok().flatten().map(|b| b.meeting_timer_seconds).unwrap_or(90);

            let mut current = state.db.get_meeting_state(board_id, &date, default_timer).unwrap_or_default();
            current.board_id = board_id.to_string();
            current.date = date.clone();
            current.is_active = true;
            current.started_at = Some(now_ts());
            current.current_speaker_index = 0;
            current.timer_seconds_remaining = default_timer;
            current.timer_is_running = true;
            current.timer_ends_at = Some(now_ts() + default_timer as i64);

            if let Some(order_arr) = args.get("speaker_order").and_then(|v| v.as_array()) {
                current.speaker_order = order_arr
                    .iter()
                    .take(100)
                    .filter_map(|v| v.as_str().map(|s| s.chars().take(80).collect::<String>()))
                    .collect();
            } else if current.speaker_order.is_empty() {
                if let Ok(checkins) = state.db.get_checkins(board_id, &date) {
                    current.speaker_order = checkins.into_iter().map(|c| c.user_name).collect();
                }
            }

            let _ = state.db.save_meeting_state(&current);

            state.broadcast(
                board_id,
                WsMessage {
                    msg_type: "MEETING_STATE_CHANGED".to_string(),
                    payload: json!({ "meeting_state": current }),
                    timestamp: now_ts(),
                },
            );

            Ok(json!({
                "content": [{
                    "type": "text",
                    "text": format!("Live meeting started on board '{}' for date '{}' with {} speakers.", board_id, date, current.speaker_order.len())
                }],
                "meeting_state": current
            }))
        }

        "daily_next_speaker" => {
            let board_id = args.get("board_id").and_then(|v| v.as_str()).ok_or_else(|| JsonRpcError {
                code: -32602,
                message: "Missing 'board_id' argument".to_string(),
                data: None,
            })?;

            let token = extract_facilitator_token(headers, &args);
            verify_facilitator(state, board_id, token.as_deref())?;

            let date = args.get("date").and_then(|v| v.as_str()).map(|s| s.to_string()).unwrap_or_else(today_str);
            let default_timer = state.db.get_board(board_id).ok().flatten().map(|b| b.meeting_timer_seconds).unwrap_or(90);

            let mut current = state.db.get_meeting_state(board_id, &date, default_timer).unwrap_or_default();
            let total = current.speaker_order.len() as i32;
            if current.current_speaker_index + 1 < total {
                current.current_speaker_index += 1;
            }
            current.timer_seconds_remaining = default_timer;
            current.timer_is_running = true;
            current.timer_ends_at = Some(now_ts() + default_timer as i64);

            let _ = state.db.save_meeting_state(&current);

            state.broadcast(
                board_id,
                WsMessage {
                    msg_type: "MEETING_STATE_CHANGED".to_string(),
                    payload: json!({ "meeting_state": current }),
                    timestamp: now_ts(),
                },
            );

            let current_speaker = current.speaker_order.get(current.current_speaker_index as usize).cloned().unwrap_or_default();

            Ok(json!({
                "content": [{
                    "type": "text",
                    "text": format!("Advanced to next speaker: '{}' ({}/{})", current_speaker, current.current_speaker_index + 1, total)
                }],
                "current_speaker": current_speaker,
                "current_speaker_index": current.current_speaker_index
            }))
        }

        "daily_set_timer" => {
            let board_id = args.get("board_id").and_then(|v| v.as_str()).ok_or_else(|| JsonRpcError {
                code: -32602,
                message: "Missing 'board_id' argument".to_string(),
                data: None,
            })?;

            let token = extract_facilitator_token(headers, &args);
            verify_facilitator(state, board_id, token.as_deref())?;

            let action = args.get("action").and_then(|v| v.as_str()).unwrap_or("start");
            let date = args.get("date").and_then(|v| v.as_str()).map(|s| s.to_string()).unwrap_or_else(today_str);
            let raw_seconds = args.get("seconds").and_then(|v| v.as_i64()).unwrap_or(90) as i32;
            let seconds = raw_seconds.clamp(10, 600);

            let mut current = state.db.get_meeting_state(board_id, &date, seconds).unwrap_or_default();

            match action {
                "start" => {
                    current.timer_seconds_remaining = seconds;
                    current.timer_is_running = true;
                    current.timer_ends_at = Some(now_ts() + seconds as i64);
                }
                "pause" => {
                    let remaining = if let Some(ends_at) = current.timer_ends_at {
                        (ends_at - now_ts()).max(0) as i32
                    } else {
                        current.timer_seconds_remaining
                    };
                    current.timer_seconds_remaining = remaining.clamp(0, 600);
                    current.timer_is_running = false;
                    current.timer_ends_at = None;
                }
                "reset" => {
                    current.timer_seconds_remaining = seconds;
                    current.timer_is_running = false;
                    current.timer_ends_at = None;
                }
                _ => {}
            }

            let _ = state.db.save_meeting_state(&current);

            state.broadcast(
                board_id,
                WsMessage {
                    msg_type: "MEETING_STATE_CHANGED".to_string(),
                    payload: json!({ "meeting_state": current }),
                    timestamp: now_ts(),
                },
            );

            Ok(json!({
                "content": [{
                    "type": "text",
                    "text": format!("Timer action '{}' applied on board '{}'. Seconds remaining: {}.", action, board_id, current.timer_seconds_remaining)
                }],
                "action": action,
                "seconds_remaining": current.timer_seconds_remaining
            }))
        }

        "daily_end_meeting" => {
            let board_id = args.get("board_id").and_then(|v| v.as_str()).ok_or_else(|| JsonRpcError {
                code: -32602,
                message: "Missing 'board_id' argument".to_string(),
                data: None,
            })?;

            let token = extract_facilitator_token(headers, &args);
            verify_facilitator(state, board_id, token.as_deref())?;

            let date = args.get("date").and_then(|v| v.as_str()).map(|s| s.to_string()).unwrap_or_else(today_str);
            let mut current = state.db.get_meeting_state(board_id, &date, 90).unwrap_or_default();
            current.is_active = false;
            current.timer_is_running = false;
            current.timer_ends_at = None;

            let _ = state.db.save_meeting_state(&current);

            state.broadcast(
                board_id,
                WsMessage {
                    msg_type: "MEETING_STATE_CHANGED".to_string(),
                    payload: json!({ "meeting_state": current }),
                    timestamp: now_ts(),
                },
            );

            Ok(json!({
                "content": [{
                    "type": "text",
                    "text": format!("Live meeting ended on board '{}'.", board_id)
                }],
                "meeting_active": false
            }))
        }

        "daily_get_board_summary" => {
            let board_id = args.get("board_id").and_then(|v| v.as_str()).ok_or_else(|| JsonRpcError {
                code: -32602,
                message: "Missing 'board_id' argument".to_string(),
                data: None,
            })?;

            let date = args.get("date").and_then(|v| v.as_str()).map(|s| s.to_string()).unwrap_or_else(today_str);

            let board = state.db.get_board(board_id).map_err(|e| JsonRpcError {
                code: -32603,
                message: format!("DB error: {}", e),
                data: None,
            })?.ok_or_else(|| JsonRpcError {
                code: -32004,
                message: format!("Board '{}' not found", board_id),
                data: None,
            })?;

            let checkins = state.db.get_checkins(board_id, &date).unwrap_or_default();
            let meeting_state = state.db.get_meeting_state(board_id, &date, board.meeting_timer_seconds).unwrap_or_default();
            let blockers: Vec<_> = checkins.iter().filter(|c| c.has_blockers).map(|c| c.user_name.clone()).collect();

            Ok(json!({
                "board": {
                    "id": board.id,
                    "title": board.title,
                    "description": board.description,
                    "meeting_timer_seconds": board.meeting_timer_seconds,
                    "target_time": board.target_time
                },
                "date": date,
                "total_checkins": checkins.len(),
                "blockers_count": blockers.len(),
                "blocked_users": blockers,
                "meeting_state": meeting_state,
                "checkins": checkins
            }))
        }

        unknown => Err(JsonRpcError {
            code: -32601,
            message: format!("Tool '{}' not found", unknown),
            data: None,
        }),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::Database;

    fn setup_test_state() -> AppState {
        let db = Database::new(":memory:").unwrap();
        AppState::new(db)
    }

    #[tokio::test]
    async fn test_mcp_initialize() {
        let state = setup_test_state();
        let req = JsonRpcRequest {
            jsonrpc: "2.0".to_string(),
            id: Some(json!(1)),
            method: "initialize".to_string(),
            params: None,
        };

        let headers = HeaderMap::new();
        let _resp = handle_mcp_request(State(state), headers, Json(req)).await;
    }

    #[tokio::test]
    async fn test_mcp_submit_checkin_and_read_resource() {
        let state = setup_test_state();
        let board_id = "test_daily_mcp_board";

        let _board = state.db.create_board(
            board_id,
            "Team Falcon Daily",
            "Sprint daily board",
            "token_daily",
            90,
            Some("09:30"),
        ).unwrap();

        let headers = HeaderMap::new();

        // 1. Submit check-in via MCP tool
        let submit_args = json!({
            "board_id": board_id,
            "user_name": "Carol Danvers",
            "role": "Tech Lead",
            "yesterday": "Merged PR #104 and refactored auth module",
            "today": "Working on MCP server implementation",
            "blockers": "Need staging database access credentials",
            "has_blockers": true
        });

        let call_res = call_tool(&state, &headers, "daily_submit_checkin", submit_args).await;
        assert!(call_res.is_ok());
        let val = call_res.unwrap();
        assert_eq!(val["has_blockers"], true);

        // 2. Read resource daily://board/test_daily_mcp_board/today
        let uri = "daily://board/test_daily_mcp_board/today";
        let res = read_resource(&state, uri).await;
        assert!(res.is_ok());
        let res_val = res.unwrap();
        let text = res_val["contents"][0]["text"].as_str().unwrap();
        assert!(text.contains("Carol Danvers"));
        assert!(text.contains("Need staging database access credentials"));

        // 3. Read resource daily://board/test_daily_mcp_board/blockers
        let blockers_uri = "daily://board/test_daily_mcp_board/blockers";
        let blockers_res = read_resource(&state, blockers_uri).await;
        assert!(blockers_res.is_ok());
        let blockers_val = blockers_res.unwrap();
        let blockers_text = blockers_val["contents"][0]["text"].as_str().unwrap();
        assert!(blockers_text.contains("Carol Danvers"));
    }

    #[tokio::test]
    async fn test_mcp_meeting_authorization() {
        let state = setup_test_state();
        let board_id = "auth_board_test";

        let _board = state.db.create_board(
            board_id,
            "Auth Test Daily",
            "Testing meeting controls",
            "secret_token_123",
            90,
            None,
        ).unwrap();

        let headers = HeaderMap::new();

        // 1. Attempt to start meeting without facilitator token -> should fail with -32003
        let start_args_no_token = json!({ "board_id": board_id });
        let fail_res = call_tool(&state, &headers, "daily_start_meeting", start_args_no_token).await;
        assert!(fail_res.is_err());
        assert_eq!(fail_res.unwrap_err().code, -32003);

        // 2. Start meeting with valid facilitator token in args -> should succeed
        let start_args_token = json!({
            "board_id": board_id,
            "facilitator_token": "secret_token_123"
        });
        let ok_res = call_tool(&state, &headers, "daily_start_meeting", start_args_token).await;
        assert!(ok_res.is_ok());

        // 3. Start meeting with valid facilitator token in Authorization header -> should succeed
        let mut auth_headers = HeaderMap::new();
        auth_headers.insert("authorization", "Bearer secret_token_123".parse().unwrap());
        let ok_header_res = call_tool(&state, &auth_headers, "daily_next_speaker", json!({ "board_id": board_id })).await;
        assert!(ok_header_res.is_ok());
    }
}
