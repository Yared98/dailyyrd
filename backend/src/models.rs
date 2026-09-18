use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DailyBoard {
    pub id: String,
    pub title: String,
    pub description: String,
    pub facilitator_token: String,
    pub meeting_timer_seconds: i32,
    pub target_time: Option<String>,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CheckIn {
    pub id: String,
    pub board_id: String,
    pub date: String,
    pub user_name: String,
    pub role: Option<String>,
    pub avatar_color: String,
    pub yesterday: String,
    pub today: String,
    pub blockers: String,
    pub has_blockers: bool,
    pub mood: Option<String>,
    #[serde(skip_serializing)]
    pub session_hash: String,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LiveMeetingState {
    pub board_id: String,
    pub date: String,
    pub is_active: bool,
    pub speaker_order: Vec<String>,
    pub current_speaker_index: i32,
    pub timer_seconds_remaining: i32,
    pub timer_is_running: bool,
    pub timer_ends_at: Option<i64>,
    pub started_at: Option<i64>,
}

impl Default for LiveMeetingState {
    fn default() -> Self {
        Self {
            board_id: String::new(),
            date: String::new(),
            is_active: false,
            speaker_order: Vec::new(),
            current_speaker_index: 0,
            timer_seconds_remaining: 90,
            timer_is_running: false,
            timer_ends_at: None,
            started_at: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateBoardRequest {
    pub title: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub meeting_timer_seconds: Option<i32>,
    #[serde(default)]
    pub target_time: Option<String>,
}

impl CreateBoardRequest {
    pub fn validate(&self) -> Result<(), String> {
        let trimmed_title = self.title.trim();
        if trimmed_title.is_empty() {
            return Err("Título do time é obrigatório".to_string());
        }
        if trimmed_title.chars().count() > 100 {
            return Err("Título não pode exceder 100 caracteres".to_string());
        }
        if let Some(ref desc) = self.description {
            if desc.chars().count() > 1000 {
                return Err("Descrição não pode exceder 1000 caracteres".to_string());
            }
        }
        if let Some(timer) = self.meeting_timer_seconds {
            if !(10..=600).contains(&timer) {
                return Err("Tempo do cronômetro deve estar entre 10 e 600 segundos".to_string());
            }
        }
        if let Some(ref tt) = self.target_time {
            if !tt.is_empty() && chrono::NaiveTime::parse_from_str(tt, "%H:%M").is_err() {
                return Err("Horário da Daily inválido (esperado formato HH:MM)".to_string());
            }
        }
        Ok(())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateBoardResponse {
    pub id: String,
    pub title: String,
    pub facilitator_token: String,
    pub invite_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SaveCheckInRequest {
    pub date: String,
    pub user_name: String,
    #[serde(default)]
    pub role: Option<String>,
    #[serde(default)]
    pub avatar_color: Option<String>,
    pub yesterday: String,
    pub today: String,
    #[serde(default)]
    pub blockers: Option<String>,
    #[serde(default)]
    pub has_blockers: bool,
    #[serde(default)]
    pub mood: Option<String>,
    pub session_hash: String,
}

impl SaveCheckInRequest {
    pub fn validate(&self) -> Result<(), String> {
        if chrono::NaiveDate::parse_from_str(&self.date, "%Y-%m-%d").is_err() {
            return Err("Formato de data inválido (esperado YYYY-MM-DD)".to_string());
        }
        let trimmed_name = self.user_name.trim();
        if trimmed_name.is_empty() {
            return Err("Nome do participante é obrigatório".to_string());
        }
        if trimmed_name.chars().count() > 60 {
            return Err("Nome do participante não pode exceder 60 caracteres".to_string());
        }
        if let Some(ref r) = self.role {
            if r.chars().count() > 60 {
                return Err("Papel/Cargo não pode exceder 60 caracteres".to_string());
            }
        }
        if self.yesterday.chars().count() > 5000 {
            return Err("Relato do que foi feito ontem não pode exceder 5000 caracteres".to_string());
        }
        if self.today.chars().count() > 5000 {
            return Err("Relato de metas de hoje não pode exceder 5000 caracteres".to_string());
        }
        if let Some(ref b) = self.blockers {
            if b.chars().count() > 2000 {
                return Err("Descrição do bloqueio não pode exceder 2000 caracteres".to_string());
            }
        }
        if let Some(ref c) = self.avatar_color {
            if c.len() != 7 || !c.starts_with('#') || !c[1..].chars().all(|ch| ch.is_ascii_hexdigit()) {
                return Err("Cor de avatar inválida (esperado formato hex #RRGGBB)".to_string());
            }
        }
        if self.session_hash.trim().is_empty() || self.session_hash.chars().count() > 100 {
            return Err("Identificador de sessão inválido".to_string());
        }
        Ok(())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DailyBoardSnapshot {
    pub board: DailyBoard,
    pub date: String,
    pub available_dates: Vec<String>,
    pub checkins: Vec<CheckIn>,
    pub meeting_state: LiveMeetingState,
    pub is_facilitator: bool,
    pub online_count: usize,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub user_checkin_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WsMessage {
    #[serde(rename = "type")]
    pub msg_type: String,
    pub payload: serde_json::Value,
    #[serde(default)]
    pub timestamp: i64,
}
