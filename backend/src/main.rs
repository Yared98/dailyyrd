use std::net::SocketAddr;
use std::path::PathBuf;
use axum::{
    extract::{Path, Query, State},
    http::{header, StatusCode},
    response::IntoResponse,
    routing::{delete, get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use tower_http::cors::{Any, CorsLayer};
use tower_http::services::ServeDir;
use tracing::info;

mod admin;
mod db;
mod mcp;
mod models;
mod state;
mod ws;

use db::{now_ts, today_str, Database};
use models::{
    CreateBoardRequest, CreateBoardResponse, DailyBoardSnapshot, SaveCheckInRequest, WsMessage,
};
use state::AppState;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "backend=info,tower_http=info".into()),
        )
        .init();

    // Ensure persistence data directory exists
    std::fs::create_dir_all("data").expect("Falha ao criar diretório data");
    let db_path = std::env::var("DATABASE_URL").unwrap_or_else(|_| "data/daily.db".to_string());

    let db = Database::new(&db_path).expect("Falha ao inicializar SQLite com WAL mode");
    let state = AppState::new(db, db_path.clone());

    // Rotina periódica de auto-purge para higienização de boards antigos (Padrão: 60 dias)
    // Aceita RETENTION_DAYS unificada ou BOARD_RETENTION_DAYS específica
    let retention_days: i64 = std::env::var("RETENTION_DAYS")
        .or_else(|_| std::env::var("BOARD_RETENTION_DAYS"))
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(60);

    let cleanup_state = state.clone();
    tokio::spawn(async move {
        // Checar na inicialização e a cada 24 horas
        let mut interval = tokio::time::interval(std::time::Duration::from_secs(24 * 3600));
        loop {
            interval.tick().await;
            match cleanup_state.db.cleanup_expired_boards(retention_days) {
                Ok(count) if count > 0 => {
                    tracing::info!(
                        purged_boards = count,
                        retention_days = retention_days,
                        "Auto-purge: boards com mais de {} dias removidos com sucesso",
                        retention_days
                    );
                }
                Ok(_) => {}
                Err(e) => {
                    tracing::warn!(error = %e, "Erro ao executar rotina de auto-purge de boards no DailyYrd");
                }
            }
        }
    });

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let static_dir = std::env::var("STATIC_DIR").unwrap_or_else(|_| "../frontend/dist".to_string());
    let static_service = ServeDir::new(PathBuf::from(&static_dir))
        .fallback(get(spa_fallback));

    let app = Router::new()
        .route("/health", get(health_check))
        .route("/robots.txt", get(robots_txt_handler))
        .route("/api/config", get(client_config_handler))
        .nest("/api/admin", admin::admin_routes())
        .route("/api/boards", post(create_board_handler))
        .route("/api/boards/{id}", get(get_board_snapshot_handler).patch(update_board_handler))
        .route("/api/boards/{id}/dates", get(get_board_dates_handler))
        .route("/api/boards/{id}/checkins", post(save_checkin_handler))
        .route("/api/boards/{id}/checkins/{checkin_id}", delete(delete_checkin_handler))
        .route("/api/boards/{id}/export", get(export_board_handler))
        .route("/ws/board/{id}", get(ws::ws_handler))
        .route("/mcp", post(mcp::handle_mcp_request))
        .fallback_service(static_service)
        .layer(cors)
        .with_state(state);

    let port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(8081);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));

    info!("🚀 DailyYrd backend rodando em http://{}", addr);
    info!("🔗 WebSocket disponível em ws://{}/ws/board/{{board_id}}", addr);
    info!("🤖 Servidor MCP disponível em http://{}/mcp", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn health_check() -> &'static str {
    "OK"
}

#[derive(Debug, Serialize)]
pub struct ClientConfigResponse {
    pub umami_script_url: Option<String>,
    pub umami_website_id: Option<String>,
}

async fn client_config_handler() -> Json<ClientConfigResponse> {
    Json(ClientConfigResponse {
        umami_script_url: std::env::var("UMAMI_SCRIPT_URL").ok().filter(|s| !s.trim().is_empty()),
        umami_website_id: std::env::var("UMAMI_WEBSITE_ID").ok().filter(|s| !s.trim().is_empty()),
    })
}

async fn robots_txt_handler() -> impl IntoResponse {
    (
        [(header::CONTENT_TYPE, "text/plain; charset=utf-8")],
        "User-agent: *\nDisallow: /\n",
    )
}

async fn spa_fallback() -> impl IntoResponse {
    let index_path = std::env::var("STATIC_DIR")
        .map(|d| PathBuf::from(d).join("index.html"))
        .unwrap_or_else(|_| PathBuf::from("../frontend/dist/index.html"));

    match tokio::fs::read_to_string(index_path).await {
        Ok(html) => (
            StatusCode::OK,
            [(header::CONTENT_TYPE, "text/html; charset=utf-8")],
            html,
        )
            .into_response(),
        Err(_) => (
            StatusCode::OK,
            [(header::CONTENT_TYPE, "text/html; charset=utf-8")],
            "<!DOCTYPE html><html><head><title>DailyYrd</title></head><body><div id=\"root\"></div></body></html>".to_string(),
        )
            .into_response(),
    }
}

// REST Handlers

async fn create_board_handler(
    State(state): State<AppState>,
    Json(req): Json<CreateBoardRequest>,
) -> Result<Json<CreateBoardResponse>, (StatusCode, String)> {
    req.validate().map_err(|e| (StatusCode::BAD_REQUEST, e))?;

    let id = ulid::Ulid::new().to_string();
    let facilitator_token = ulid::Ulid::new().to_string();
    let meeting_timer_seconds = req.meeting_timer_seconds.unwrap_or(90);
    let description = req.description.unwrap_or_default();

    state
        .db
        .create_board(
            &id,
            req.title.trim(),
            description.trim(),
            &facilitator_token,
            meeting_timer_seconds,
            req.target_time.as_deref(),
        )
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(CreateBoardResponse {
        id: id.clone(),
        title: req.title.trim().to_string(),
        facilitator_token: facilitator_token.clone(),
        invite_url: format!("/board/{}", id),
    }))
}

#[derive(Deserialize)]
struct GetBoardQuery {
    date: Option<String>,
    token: Option<String>,
    session_hash: Option<String>,
}

async fn get_board_snapshot_handler(
    Path(board_id): Path<String>,
    Query(query): Query<GetBoardQuery>,
    State(state): State<AppState>,
) -> Result<Json<DailyBoardSnapshot>, (StatusCode, String)> {
    if let Some(ref d) = query.date {
        if chrono::NaiveDate::parse_from_str(d, "%Y-%m-%d").is_err() {
            return Err((StatusCode::BAD_REQUEST, "Formato de data inválido (esperado YYYY-MM-DD)".to_string()));
        }
    }

    let board = state
        .db
        .get_board(&board_id)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or((StatusCode::NOT_FOUND, "Board não encontrado".to_string()))?;

    let is_facilitator = query
        .token
        .as_ref()
        .map(|t| *t == board.facilitator_token)
        .unwrap_or(false);

    let target_date = query.date.unwrap_or_else(today_str);
    let available_dates = state
        .db
        .get_available_dates(&board_id)
        .unwrap_or_else(|_| vec![today_str()]);

    let checkins = state
        .db
        .get_checkins(&board_id, &target_date)
        .unwrap_or_default();

    let user_checkin_id = query.session_hash.as_deref().and_then(|hash| {
        checkins.iter().find(|c| c.session_hash == hash).map(|c| c.id.clone())
    });

    let meeting_state = state
        .db
        .get_meeting_state(&board_id, &target_date, board.meeting_timer_seconds)
        .unwrap_or_default();

    let online_count = state.get_presence_count(&board_id);

    Ok(Json(DailyBoardSnapshot {
        board,
        date: target_date,
        available_dates,
        checkins,
        meeting_state,
        is_facilitator,
        online_count,
        user_checkin_id,
    }))
}

#[derive(Deserialize)]
struct UpdateBoardQuery {
    token: Option<String>,
}

#[derive(Deserialize)]
struct UpdateBoardPayload {
    title: Option<String>,
    description: Option<String>,
    meeting_timer_seconds: Option<i32>,
    target_time: Option<String>,
}

async fn update_board_handler(
    Path(board_id): Path<String>,
    Query(query): Query<UpdateBoardQuery>,
    State(state): State<AppState>,
    Json(payload): Json<UpdateBoardPayload>,
) -> Result<Json<models::DailyBoard>, (StatusCode, String)> {
    let board = state
        .db
        .get_board(&board_id)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or((StatusCode::NOT_FOUND, "Board não encontrado".to_string()))?;

    let is_facilitator = query
        .token
        .as_ref()
        .map(|t| *t == board.facilitator_token)
        .unwrap_or(false);

    if !is_facilitator {
        return Err((StatusCode::FORBIDDEN, "Apenas o facilitador pode alterar configurações do time".to_string()));
    }

    if let Some(ref t) = payload.title {
        let trimmed = t.trim();
        if trimmed.is_empty() || trimmed.chars().count() > 100 {
            return Err((StatusCode::BAD_REQUEST, "Título deve ter entre 1 e 100 caracteres".to_string()));
        }
    }
    if let Some(ref d) = payload.description {
        if d.chars().count() > 1000 {
            return Err((StatusCode::BAD_REQUEST, "Descrição não pode exceder 1000 caracteres".to_string()));
        }
    }
    if let Some(s) = payload.meeting_timer_seconds {
        if !(10..=600).contains(&s) {
            return Err((StatusCode::BAD_REQUEST, "Tempo do cronômetro deve estar entre 10 e 600 segundos".to_string()));
        }
    }
    if let Some(ref tt) = payload.target_time {
        if !tt.is_empty() && chrono::NaiveTime::parse_from_str(tt, "%H:%M").is_err() {
            return Err((StatusCode::BAD_REQUEST, "Horário da Daily inválido (esperado formato HH:MM)".to_string()));
        }
    }

    let updated = state
        .db
        .update_board(
            &board_id,
            payload.title.as_deref().map(|s| s.trim()),
            payload.description.as_deref().map(|s| s.trim()),
            payload.meeting_timer_seconds,
            payload.target_time.as_deref(),
        )
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(updated))
}

async fn get_board_dates_handler(
    Path(board_id): Path<String>,
    State(state): State<AppState>,
) -> Result<Json<Vec<String>>, (StatusCode, String)> {
    let dates = state
        .db
        .get_available_dates(&board_id)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(dates))
}

async fn save_checkin_handler(
    Path(board_id): Path<String>,
    State(state): State<AppState>,
    Json(req): Json<SaveCheckInRequest>,
) -> Result<Json<models::CheckIn>, (StatusCode, String)> {
    req.validate().map_err(|e| (StatusCode::BAD_REQUEST, e))?;

    let checkin = state
        .db
        .save_checkin(&board_id, &req)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Broadcast check-in saved to everyone connected
    state.broadcast(
        &board_id,
        WsMessage {
            msg_type: "CHECKIN_SAVED".to_string(),
            payload: json!({ "checkin": checkin }),
            timestamp: now_ts(),
        },
    );

    Ok(Json(checkin))
}

#[derive(Deserialize)]
struct DeleteCheckinQuery {
    session_hash: Option<String>,
    token: Option<String>,
}

async fn delete_checkin_handler(
    Path((board_id, checkin_id)): Path<(String, String)>,
    Query(query): Query<DeleteCheckinQuery>,
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let board = state
        .db
        .get_board(&board_id)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or((StatusCode::NOT_FOUND, "Board não encontrado".to_string()))?;

    let is_facilitator = query
        .token
        .as_ref()
        .map(|t| *t == board.facilitator_token)
        .unwrap_or(false);

    let session_hash = query.session_hash.unwrap_or_default();

    let deleted = state
        .db
        .delete_checkin(&board_id, &checkin_id, &session_hash, is_facilitator)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if deleted {
        state.broadcast(
            &board_id,
            WsMessage {
                msg_type: "CHECKIN_DELETED".to_string(),
                payload: json!({ "checkin_id": checkin_id }),
                timestamp: now_ts(),
            },
        );
        Ok(Json(json!({ "success": true })))
    } else {
        Err((StatusCode::FORBIDDEN, "Sem permissão para excluir este check-in".to_string()))
    }
}

#[derive(Deserialize)]
struct ExportQuery {
    date: Option<String>,
    format: Option<String>, // "markdown", "slack", "discord"
}

async fn export_board_handler(
    Path(board_id): Path<String>,
    Query(query): Query<ExportQuery>,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let board = state
        .db
        .get_board(&board_id)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or((StatusCode::NOT_FOUND, "Board não encontrado".to_string()))?;

    if let Some(ref d) = query.date {
        if chrono::NaiveDate::parse_from_str(d, "%Y-%m-%d").is_err() {
            return Err((StatusCode::BAD_REQUEST, "Formato de data inválido (esperado YYYY-MM-DD)".to_string()));
        }
    }

    let date = query.date.unwrap_or_else(today_str);
    let checkins = state
        .db
        .get_checkins(&board_id, &date)
        .unwrap_or_default();

    let fmt = query.format.unwrap_or_else(|| "markdown".to_string());

    let mut output = String::new();
    let total_members = checkins.len();
    let is_blocked = |c: &models::CheckIn| c.has_blockers && !c.blockers.trim().is_empty();
    let blockers_count = checkins.iter().filter(|c| is_blocked(c)).count();

    if fmt == "slack" || fmt == "discord" {
        output.push_str(&format!("*📋 Daily Standup — {} ({})*\n", board.title, date));
        output.push_str(&format!("👥 Participantes: {} | 🚨 Bloqueios: {}\n\n", total_members, blockers_count));

        if blockers_count > 0 {
            output.push_str("*🚨 BLOQUEIOS IDENTIFICADOS:*\n");
            for c in checkins.iter().filter(|c| is_blocked(c)) {
                output.push_str(&format!("• *{}*: {}\n", c.user_name, c.blockers.trim()));
            }
            output.push_str("\n---\n\n");
        }

        for c in &checkins {
            let mood_str = c.mood.as_ref().map(|m| format!(" ({})", m)).unwrap_or_default();
            output.push_str(&format!("*👤 {}{}*\n", c.user_name, mood_str));
            output.push_str(&format!("*Ontem:* {}\n", c.yesterday.trim()));
            output.push_str(&format!("*Hoje:* {}\n", c.today.trim()));
            if is_blocked(c) {
                output.push_str(&format!("*Impedimento:* {}\n", c.blockers.trim()));
            }
            output.push_str("\n");
        }
    } else {
        output.push_str(&format!("# 📋 Daily Standup: {} ({})\n\n", board.title, date));
        output.push_str(&format!("- **Participantes:** {}\n- **Bloqueios:** {}\n\n", total_members, blockers_count));

        if blockers_count > 0 {
            output.push_str("### 🚨 Bloqueios do Dia\n\n");
            for c in checkins.iter().filter(|c| is_blocked(c)) {
                output.push_str(&format!("- **{}:** {}\n", c.user_name, c.blockers.trim()));
            }
            output.push_str("\n---\n\n");
        }

        output.push_str("### 👥 Respostas da Equipe\n\n");
        for c in &checkins {
            let role_str = c.role.as_ref().map(|r| format!(" - _{}_", r)).unwrap_or_default();
            let mood_str = c.mood.as_ref().map(|m| format!(" | {}", m)).unwrap_or_default();
            output.push_str(&format!("#### {}{}{}\n\n", c.user_name, role_str, mood_str));
            output.push_str(&format!("- **O que fiz ontem:**\n  {}\n", c.yesterday.trim().replace('\n', "\n  ")));
            output.push_str(&format!("- **O que farei hoje:**\n  {}\n", c.today.trim().replace('\n', "\n  ")));
            if is_blocked(c) {
                output.push_str(&format!("- **🚨 Impedimentos:**\n  {}\n", c.blockers.trim().replace('\n', "\n  ")));
            }
            output.push_str("\n");
        }
    }

    Ok((
        StatusCode::OK,
        [(header::CONTENT_TYPE, "text/plain; charset=utf-8")],
        output,
    ))
}
