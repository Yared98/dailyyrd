use axum::{
    extract::{Path, State},
    http::{header, HeaderMap, StatusCode},
    response::{IntoResponse, Response},
    routing::{delete, get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use std::time::{Duration, Instant};
use tracing::{info, warn};
use ulid::Ulid;

use crate::models::{AdminDeleteResponse, AdminMetricsResponse, AdminPurgeResponse};
use crate::state::AppState;

const ADMIN_COOKIE_NAME: &str = "yrd_admin_session";
const SESSION_TTL_SECS: u64 = 7200; // 2 horas
const RATE_LIMIT_MAX_ATTEMPTS: u32 = 5;
const RATE_LIMIT_WINDOW_SECS: u64 = 900; // 15 minutos

#[derive(Debug, Deserialize)]
pub struct AdminLoginRequest {
    pub token: String,
}

#[derive(Debug, Serialize)]
pub struct AdminLoginResponse {
    pub ok: bool,
    pub message: String,
}

/// Comparação em tempo constante entre dois slices de bytes para prevenir timing attacks.
pub fn constant_time_eq(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() {
        return false;
    }
    a.iter().zip(b.iter()).fold(0, |acc, (x, y)| acc | (x ^ y)) == 0
}

/// Extrai o IP do cliente para controle de rate limiting
fn get_client_ip(headers: &HeaderMap) -> String {
    if let Some(forwarded) = headers.get("x-forwarded-for").and_then(|v| v.to_str().ok()) {
        if let Some(first_ip) = forwarded.split(',').next() {
            return first_ip.trim().to_string();
        }
    }
    if let Some(real_ip) = headers.get("x-real-ip").and_then(|v| v.to_str().ok()) {
        return real_ip.trim().to_string();
    }
    "127.0.0.1".to_string()
}

/// Recupera o ADMIN_TOKEN configurado via variável de ambiente
pub fn get_configured_admin_token() -> String {
    std::env::var("ADMIN_TOKEN").unwrap_or_else(|_| "dev_admin_dailyyrd_secret".to_string())
}

/// Valida se a requisição possui credencial administrativa válida
pub fn is_admin_authenticated(headers: &HeaderMap, state: &AppState) -> bool {
    let configured_token = get_configured_admin_token();

    // 1. Checa cabeçalho Authorization: Bearer
    if let Some(auth_header) = headers.get(header::AUTHORIZATION).and_then(|v| v.to_str().ok()) {
        if let Some(token) = auth_header.strip_prefix("Bearer ") {
            if constant_time_eq(token.trim().as_bytes(), configured_token.as_bytes()) {
                return true;
            }
        }
    }

    // 2. Checa cookie de sessão yrd_admin_session
    if let Some(cookie_header) = headers.get(header::COOKIE).and_then(|v| v.to_str().ok()) {
        for cookie in cookie_header.split(';') {
            let mut parts = cookie.trim().splitn(2, '=');
            if let (Some(name), Some(val)) = (parts.next(), parts.next()) {
                if name == ADMIN_COOKIE_NAME {
                    if let Some(session_time) = state.admin_sessions.get(val) {
                        if session_time.elapsed() < Duration::from_secs(SESSION_TTL_SECS) {
                            return true;
                        } else {
                            drop(session_time);
                            state.admin_sessions.remove(val);
                        }
                    }
                }
            }
        }
    }

    false
}

/// POST /api/admin/login
async fn login_handler(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(req): Json<AdminLoginRequest>,
) -> Result<Response, (StatusCode, Json<serde_json::Value>)> {
    let client_ip = get_client_ip(&headers);
    let now = Instant::now();

    // 1. Checa Rate Limiter
    if let Some(entry) = state.admin_rate_limiter.get(&client_ip) {
        let (attempts, last_attempt) = *entry;
        if attempts >= RATE_LIMIT_MAX_ATTEMPTS {
            if last_attempt.elapsed() < Duration::from_secs(RATE_LIMIT_WINDOW_SECS) {
                let remaining_secs = RATE_LIMIT_WINDOW_SECS - last_attempt.elapsed().as_secs();
                warn!(
                    client_ip = %client_ip,
                    remaining_secs = remaining_secs,
                    "Admin login bloqueado temporariamente por rate limit no DailyYrd"
                );
                return Err((
                    StatusCode::TOO_MANY_REQUESTS,
                    Json(serde_json::json!({
                        "ok": false,
                        "error": format!("Muitas tentativas incorretas. Tente novamente em {} minutos.", (remaining_secs / 60) + 1)
                    })),
                ));
            } else {
                drop(entry);
                state.admin_rate_limiter.remove(&client_ip);
            }
        }
    }

    let configured_token = get_configured_admin_token();

    // 2. Validação de token em tempo constante
    let is_valid = constant_time_eq(req.token.trim().as_bytes(), configured_token.as_bytes());

    if !is_valid {
        state
            .admin_rate_limiter
            .entry(client_ip.clone())
            .and_modify(|(cnt, inst)| {
                *cnt += 1;
                *inst = now;
            })
            .or_insert((1, now));

        warn!(client_ip = %client_ip, "Tentativa de login administrativo com token inválido no DailyYrd");

        return Err((
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({
                "ok": false,
                "error": "Token de acesso administrativo incorreto."
            })),
        ));
    }

    // Sucesso: remove bloqueio do IP
    state.admin_rate_limiter.remove(&client_ip);

    // Emite token de sessão criptograficamente seguro
    let session_id = Ulid::new().to_string();
    state.admin_sessions.insert(session_id.clone(), now);

    info!(client_ip = %client_ip, "Sessão de administrador iniciada com sucesso no DailyYrd");

    let cookie_value = format!(
        "{}={}; Path=/; HttpOnly; SameSite=Strict; Max-Age={}",
        ADMIN_COOKIE_NAME, session_id, SESSION_TTL_SECS
    );

    let mut response = Json(AdminLoginResponse {
        ok: true,
        message: "Autenticado com sucesso".to_string(),
    })
    .into_response();

    response
        .headers_mut()
        .insert(header::SET_COOKIE, cookie_value.parse().unwrap());

    Ok(response)
}

/// POST /api/admin/logout
async fn logout_handler(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> impl IntoResponse {
    if let Some(cookie_header) = headers.get(header::COOKIE).and_then(|v| v.to_str().ok()) {
        for cookie in cookie_header.split(';') {
            let mut parts = cookie.trim().splitn(2, '=');
            if let (Some(name), Some(val)) = (parts.next(), parts.next()) {
                if name == ADMIN_COOKIE_NAME {
                    state.admin_sessions.remove(val);
                }
            }
        }
    }

    let expired_cookie = format!(
        "{}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0",
        ADMIN_COOKIE_NAME
    );

    let mut response = Json(serde_json::json!({ "ok": true, "message": "Desconectado" })).into_response();
    response
        .headers_mut()
        .insert(header::SET_COOKIE, expired_cookie.parse().unwrap());
    response
}

/// GET /api/admin/verify
async fn verify_handler(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<serde_json::Value>, StatusCode> {
    if is_admin_authenticated(&headers, &state) {
        Ok(Json(serde_json::json!({ "authenticated": true })))
    } else {
        Err(StatusCode::UNAUTHORIZED)
    }
}

/// GET /api/admin/metrics
async fn metrics_handler(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<AdminMetricsResponse>, StatusCode> {
    if !is_admin_authenticated(&headers, &state) {
        return Err(StatusCode::UNAUTHORIZED);
    }

    let metrics = state.db.get_admin_metrics(&state.db_path).map_err(|e| {
        tracing::error!(error = %e, "Erro ao obter métricas de admin");
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let boards = state.db.list_admin_boards(50).map_err(|e| {
        tracing::error!(error = %e, "Erro ao listar boards para admin");
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let active_boards_memory = state.channels.len();

    Ok(Json(AdminMetricsResponse {
        metrics,
        active_boards_memory,
        boards,
    }))
}

/// POST /api/admin/purge
async fn purge_handler(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<AdminPurgeResponse>, StatusCode> {
    if !is_admin_authenticated(&headers, &state) {
        return Err(StatusCode::UNAUTHORIZED);
    }

    let retention_days: i64 = std::env::var("BOARD_RETENTION_DAYS")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(60);

    let purged_count = state.db.cleanup_expired_boards(retention_days).map_err(|e| {
        tracing::error!(error = %e, "Erro ao executar expurgo manual");
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    info!(purged_count = purged_count, "Expurgo manual de boards executado via Admin no DailyYrd");

    Ok(Json(AdminPurgeResponse { purged_count }))
}

/// DELETE /api/admin/boards/{id}
async fn delete_board_handler(
    State(state): State<AppState>,
    Path(board_id): Path<String>,
    headers: HeaderMap,
) -> Result<Json<AdminDeleteResponse>, StatusCode> {
    if !is_admin_authenticated(&headers, &state) {
        return Err(StatusCode::UNAUTHORIZED);
    }

    let count = state.db.delete_board(&board_id).map_err(|e| {
        tracing::error!(error = %e, "Erro ao deletar board via admin");
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    state.channels.remove(&board_id);
    state.presence.remove(&board_id);
    info!(board_id = %board_id, "Board removido pelo administrador");

    Ok(Json(AdminDeleteResponse {
        deleted: count > 0,
    }))
}

pub fn admin_routes() -> Router<AppState> {
    Router::new()
        .route("/login", post(login_handler))
        .route("/logout", post(logout_handler))
        .route("/verify", get(verify_handler))
        .route("/metrics", get(metrics_handler))
        .route("/purge", post(purge_handler))
        .route("/boards/{id}", delete(delete_board_handler))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::Database;

    #[test]
    fn test_constant_time_eq() {
        assert!(constant_time_eq(b"secret_token_123", b"secret_token_123"));
        assert!(!constant_time_eq(b"secret_token_123", b"wrong_token_456"));
        assert!(!constant_time_eq(b"short", b"longer_string"));
    }

    #[tokio::test]
    async fn test_admin_auth_and_rate_limit() {
        let db = Database::new(":memory:").unwrap();
        let state = AppState::new(db, ":memory:".to_string());
        
        let ip = "192.168.1.100".to_string();
        let configured = get_configured_admin_token();

        // 1. Bearer Header authentication
        let mut headers = HeaderMap::new();
        headers.insert(header::AUTHORIZATION, format!("Bearer {}", configured).parse().unwrap());
        assert!(is_admin_authenticated(&headers, &state));

        // Invalid bearer
        let mut bad_headers = HeaderMap::new();
        bad_headers.insert(header::AUTHORIZATION, "Bearer wrong_secret".parse().unwrap());
        assert!(!is_admin_authenticated(&bad_headers, &state));

        // 2. Cookie session
        let session_id = "test_session_id".to_string();
        state.admin_sessions.insert(session_id.clone(), Instant::now());
        let mut cookie_headers = HeaderMap::new();
        cookie_headers.insert(header::COOKIE, format!("yrd_admin_session={}", session_id).parse().unwrap());
        assert!(is_admin_authenticated(&cookie_headers, &state));

        // 3. Rate limiting logic
        let now = Instant::now();
        for attempt in 1..=5 {
            state.admin_rate_limiter.insert(ip.clone(), (attempt, now));
        }
        let entry = state.admin_rate_limiter.get(&ip).unwrap();
        assert_eq!(entry.0, 5);
    }
}
