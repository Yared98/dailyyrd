use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        Path, Query, State,
    },
    response::IntoResponse,
};
use futures_util::{SinkExt, StreamExt};
use serde::Deserialize;
use serde_json::json;
use tracing::{info, warn};

use crate::db::now_ts;
use crate::models::{LiveMeetingState, WsMessage};
use crate::state::AppState;

#[derive(Deserialize)]
pub struct WsQuery {
    pub session_hash: Option<String>,
    pub facilitator_token: Option<String>,
}

pub async fn ws_handler(
    ws: WebSocketUpgrade,
    Path(board_id): Path<String>,
    Query(query): Query<WsQuery>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    let session_hash = query
        .session_hash
        .unwrap_or_else(|| ulid::Ulid::new().to_string());
    let facilitator_token = query.facilitator_token;

    ws.on_upgrade(move |socket| handle_socket(socket, board_id, session_hash, facilitator_token, state))
}

async fn handle_socket(
    socket: WebSocket,
    board_id: String,
    session_hash: String,
    facilitator_token: Option<String>,
    state: AppState,
) {
    let (mut sender, mut receiver) = socket.split();
    let tx = state.get_or_create_channel(&board_id);
    let mut rx = tx.subscribe();

    // Verify if caller is facilitator
    let is_facilitator = if let Some(ref token) = facilitator_token {
        if let Ok(Some(board)) = state.db.get_board(&board_id) {
            board.facilitator_token == *token
        } else {
            false
        }
    } else {
        false
    };

    // Update presence
    let count = state.add_presence(&board_id, &session_hash);
    info!(board_id = %board_id, session = %session_hash, online = count, "WebSocket client connected");

    // Broadcast presence update
    state.broadcast(
        &board_id,
        WsMessage {
            msg_type: "PRESENCE_UPDATE".to_string(),
            payload: json!({ "online_count": count }),
            timestamp: now_ts(),
        },
    );

    // Spawn task to forward broadcast messages to this client
    let mut send_task = tokio::spawn(async move {
        loop {
            match rx.recv().await {
                Ok(msg) => {
                    if let Ok(text) = serde_json::to_string(&msg) {
                        if sender.send(Message::Text(text.into())).await.is_err() {
                            break;
                        }
                    }
                }
                Err(tokio::sync::broadcast::error::RecvError::Lagged(skipped)) => {
                    warn!(skipped, "WebSocket client lagged behind broadcast stream; continuing");
                }
                Err(tokio::sync::broadcast::error::RecvError::Closed) => {
                    break;
                }
            }
        }
    });

    // Handle incoming messages from this client
    let state_clone = state.clone();
    let board_id_clone = board_id.clone();
    let session_hash_clone = session_hash.clone();

    let mut recv_task = tokio::spawn(async move {
        while let Some(Ok(msg)) = receiver.next().await {
            match msg {
                Message::Text(text) => {
                    if let Ok(parsed) = serde_json::from_str::<WsMessage>(&text) {
                        handle_incoming_message(
                            parsed,
                            &board_id_clone,
                            &session_hash_clone,
                            is_facilitator,
                            &state_clone,
                        )
                        .await;
                    }
                }
                Message::Ping(_bytes) => {
                    let _ = state_clone; // ping is handled by axum automatically
                }
                Message::Close(_) => break,
                _ => {}
            }
        }
    });

    // Wait for any task to terminate
    tokio::select! {
        _ = (&mut send_task) => recv_task.abort(),
        _ = (&mut recv_task) => send_task.abort(),
    }

    // Clean up presence
    let new_count = state.remove_presence(&board_id, &session_hash);
    info!(board_id = %board_id, session = %session_hash, online = new_count, "WebSocket client disconnected");

    state.broadcast(
        &board_id,
        WsMessage {
            msg_type: "PRESENCE_UPDATE".to_string(),
            payload: json!({ "online_count": new_count }),
            timestamp: now_ts(),
        },
    );
}

async fn handle_incoming_message(
    msg: WsMessage,
    board_id: &str,
    session_hash: &str,
    is_facilitator: bool,
    state: &AppState,
) {
    match msg.msg_type.as_str() {
        "PING" => {
            // Heartbeats are handled at the WebSocket protocol frame level; do not broadcast to room to prevent DoS.
        }

        "CHECKIN_SAVED" => {
            // Security: Client-initiated CHECKIN_SAVED broadcast is disabled to prevent spoofing.
            // Check-in saves and broadcasts are securely processed via POST /api/boards/:id/checkins.
            warn!(session = %session_hash, "Ignoring unauthorized client-side CHECKIN_SAVED broadcast request");
        }

        "CHECKIN_DELETED" => {
            if let Some(checkin_id) = msg.payload.get("checkin_id").and_then(|v| v.as_str()) {
                if let Ok(true) = state.db.delete_checkin(board_id, checkin_id, session_hash, is_facilitator) {
                    state.broadcast(
                        board_id,
                        WsMessage {
                            msg_type: "CHECKIN_DELETED".to_string(),
                            payload: json!({ "checkin_id": checkin_id }),
                            timestamp: now_ts(),
                        },
                    );
                }
            }
        }

        "START_MEETING" => {
            let date = msg.payload.get("date").and_then(|v| v.as_str()).unwrap_or("");
            let default_timer = state
                .db
                .get_board(board_id)
                .ok()
                .flatten()
                .map(|b| b.meeting_timer_seconds)
                .unwrap_or(90);

            let mut current = state.db.get_meeting_state(board_id, date, default_timer).unwrap_or_default();
            current.board_id = board_id.to_string();
            current.date = date.to_string();
            current.is_active = true;
            current.started_at = Some(now_ts());
            current.current_speaker_index = 0;
            current.timer_seconds_remaining = default_timer;
            current.timer_is_running = true;
            current.timer_ends_at = Some(now_ts() + default_timer as i64);

            if let Some(order_arr) = msg.payload.get("speaker_order").and_then(|v| v.as_array()) {
                current.speaker_order = order_arr
                    .iter()
                    .take(100)
                    .filter_map(|v| v.as_str().map(|s| s.chars().take(80).collect::<String>()))
                    .collect();
            } else if current.speaker_order.is_empty() {
                // If speaker order not provided, build from checkins
                if let Ok(checkins) = state.db.get_checkins(board_id, date) {
                    current.speaker_order = checkins.into_iter().map(|c| c.user_name).collect();
                }
            }

            let _ = state.db.save_meeting_state(&current);
            broadcast_meeting_state(board_id, &current, state);
        }

        "END_MEETING" => {
            let date = msg.payload.get("date").and_then(|v| v.as_str()).unwrap_or("");
            let default_timer = 90;
            let mut current = state.db.get_meeting_state(board_id, date, default_timer).unwrap_or_default();
            current.is_active = false;
            current.timer_is_running = false;
            current.timer_ends_at = None;

            let _ = state.db.save_meeting_state(&current);
            broadcast_meeting_state(board_id, &current, state);
        }

        "SHUFFLE_ORDER" => {
            let date = msg.payload.get("date").and_then(|v| v.as_str()).unwrap_or("");
            let default_timer = 90;
            let mut current = state.db.get_meeting_state(board_id, date, default_timer).unwrap_or_default();

            if let Some(order_arr) = msg.payload.get("speaker_order").and_then(|v| v.as_array()) {
                current.speaker_order = order_arr
                    .iter()
                    .take(100)
                    .filter_map(|v| v.as_str().map(|s| s.chars().take(80).collect::<String>()))
                    .collect();
            }
            current.current_speaker_index = 0;

            let _ = state.db.save_meeting_state(&current);
            broadcast_meeting_state(board_id, &current, state);
        }

        "NEXT_SPEAKER" => {
            let date = msg.payload.get("date").and_then(|v| v.as_str()).unwrap_or("");
            let default_timer = state
                .db
                .get_board(board_id)
                .ok()
                .flatten()
                .map(|b| b.meeting_timer_seconds)
                .unwrap_or(90);

            let mut current = state.db.get_meeting_state(board_id, date, default_timer).unwrap_or_default();
            let total = current.speaker_order.len() as i32;
            if current.current_speaker_index + 1 < total {
                current.current_speaker_index += 1;
            }
            current.timer_seconds_remaining = default_timer;
            current.timer_is_running = true;
            current.timer_ends_at = Some(now_ts() + default_timer as i64);

            let _ = state.db.save_meeting_state(&current);
            broadcast_meeting_state(board_id, &current, state);
        }

        "PREV_SPEAKER" => {
            let date = msg.payload.get("date").and_then(|v| v.as_str()).unwrap_or("");
            let default_timer = state
                .db
                .get_board(board_id)
                .ok()
                .flatten()
                .map(|b| b.meeting_timer_seconds)
                .unwrap_or(90);

            let mut current = state.db.get_meeting_state(board_id, date, default_timer).unwrap_or_default();
            if current.current_speaker_index > 0 {
                current.current_speaker_index -= 1;
            }
            current.timer_seconds_remaining = default_timer;
            current.timer_is_running = true;
            current.timer_ends_at = Some(now_ts() + default_timer as i64);

            let _ = state.db.save_meeting_state(&current);
            broadcast_meeting_state(board_id, &current, state);
        }

        "SET_SPEAKER" => {
            let date = msg.payload.get("date").and_then(|v| v.as_str()).unwrap_or("");
            let index = msg.payload.get("index").and_then(|v| v.as_i64()).unwrap_or(0) as i32;
            let default_timer = state
                .db
                .get_board(board_id)
                .ok()
                .flatten()
                .map(|b| b.meeting_timer_seconds)
                .unwrap_or(90);

            let mut current = state.db.get_meeting_state(board_id, date, default_timer).unwrap_or_default();
            let total = current.speaker_order.len() as i32;
            if index >= 0 && index < total {
                current.current_speaker_index = index;
                current.timer_seconds_remaining = default_timer;
                current.timer_is_running = true;
                current.timer_ends_at = Some(now_ts() + default_timer as i64);

                let _ = state.db.save_meeting_state(&current);
                broadcast_meeting_state(board_id, &current, state);
            }
        }

        "START_TIMER" => {
            let date = msg.payload.get("date").and_then(|v| v.as_str()).unwrap_or("");
            let raw_seconds = msg
                .payload
                .get("seconds")
                .and_then(|v| v.as_i64())
                .unwrap_or(90) as i32;
            let seconds = raw_seconds.clamp(10, 600);

            let mut current = state.db.get_meeting_state(board_id, date, seconds).unwrap_or_default();
            current.timer_seconds_remaining = seconds;
            current.timer_is_running = true;
            current.timer_ends_at = Some(now_ts() + seconds as i64);

            let _ = state.db.save_meeting_state(&current);
            broadcast_meeting_state(board_id, &current, state);
        }

        "PAUSE_TIMER" => {
            let date = msg.payload.get("date").and_then(|v| v.as_str()).unwrap_or("");
            let default_timer = 90;
            let mut current = state.db.get_meeting_state(board_id, date, default_timer).unwrap_or_default();
            let remaining = msg
                .payload
                .get("seconds_remaining")
                .and_then(|v| v.as_i64())
                .map(|v| v as i32)
                .unwrap_or_else(|| {
                    if let Some(ends_at) = current.timer_ends_at {
                        (ends_at - now_ts()).max(0) as i32
                    } else {
                        current.timer_seconds_remaining
                    }
                });

            current.timer_seconds_remaining = remaining.clamp(0, 600);
            current.timer_is_running = false;
            current.timer_ends_at = None;

            let _ = state.db.save_meeting_state(&current);
            broadcast_meeting_state(board_id, &current, state);
        }

        "RESET_TIMER" => {
            let date = msg.payload.get("date").and_then(|v| v.as_str()).unwrap_or("");
            let raw_seconds = msg
                .payload
                .get("seconds")
                .and_then(|v| v.as_i64())
                .unwrap_or(90) as i32;
            let seconds = raw_seconds.clamp(10, 600);

            let mut current = state.db.get_meeting_state(board_id, date, seconds).unwrap_or_default();
            current.timer_seconds_remaining = seconds;
            current.timer_is_running = false;
            current.timer_ends_at = None;

            let _ = state.db.save_meeting_state(&current);
            broadcast_meeting_state(board_id, &current, state);
        }

        other => {
            warn!(msg_type = %other, "Unhandled WebSocket message type");
        }
    }
}

fn broadcast_meeting_state(board_id: &str, meeting_state: &LiveMeetingState, state: &AppState) {
    state.broadcast(
        board_id,
        WsMessage {
            msg_type: "MEETING_STATE_CHANGED".to_string(),
            payload: json!({ "meeting_state": meeting_state }),
            timestamp: now_ts(),
        },
    );
}
