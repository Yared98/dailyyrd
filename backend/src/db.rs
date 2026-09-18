use std::sync::{Arc, Mutex};
use chrono::Utc;
use rusqlite::{params, Connection, OptionalExtension, Result};
use crate::models::{CheckIn, DailyBoard, LiveMeetingState, SaveCheckInRequest};

pub fn now_ts() -> i64 {
    Utc::now().timestamp()
}

pub fn today_str() -> String {
    Utc::now().format("%Y-%m-%d").to_string()
}

#[derive(Clone)]
pub struct Database {
    conn: Arc<Mutex<Connection>>,
}

impl Database {
    pub fn new(path: &str) -> Result<Self> {
        let conn = Connection::open(path)?;

        // WAL mode & constraints
        conn.execute_batch(
            "PRAGMA journal_mode = WAL;
             PRAGMA synchronous = NORMAL;
             PRAGMA foreign_keys = ON;"
        )?;

        let db = Self {
            conn: Arc::new(Mutex::new(conn)),
        };
        db.migrate()?;
        Ok(db)
    }

    fn get_conn(&self) -> std::sync::MutexGuard<'_, Connection> {
        self.conn.lock().unwrap_or_else(|poisoned| poisoned.into_inner())
    }

    fn migrate(&self) -> Result<()> {
        let conn = self.get_conn();
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS boards (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                facilitator_token TEXT NOT NULL,
                meeting_timer_seconds INTEGER NOT NULL DEFAULT 90,
                target_time TEXT,
                created_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS checkins (
                id TEXT PRIMARY KEY,
                board_id TEXT NOT NULL,
                date TEXT NOT NULL,
                user_name TEXT NOT NULL,
                role TEXT,
                avatar_color TEXT NOT NULL DEFAULT '#6366F1',
                yesterday TEXT NOT NULL,
                today TEXT NOT NULL,
                blockers TEXT NOT NULL DEFAULT '',
                has_blockers INTEGER NOT NULL DEFAULT 0,
                mood TEXT,
                session_hash TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_checkins_board_date ON checkins(board_id, date);
            CREATE INDEX IF NOT EXISTS idx_checkins_session ON checkins(board_id, date, session_hash);

            CREATE TABLE IF NOT EXISTS meeting_states (
                board_id TEXT NOT NULL,
                date TEXT NOT NULL,
                is_active INTEGER NOT NULL DEFAULT 0,
                speaker_order TEXT NOT NULL DEFAULT '[]',
                current_speaker_index INTEGER NOT NULL DEFAULT 0,
                timer_seconds_remaining INTEGER NOT NULL DEFAULT 90,
                timer_is_running INTEGER NOT NULL DEFAULT 0,
                timer_ends_at INTEGER,
                started_at INTEGER,
                PRIMARY KEY (board_id, date),
                FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
            );

            -- Auto-clean desynced blocker rows where blockers text is blank
            UPDATE checkins SET has_blockers = 0 WHERE TRIM(blockers) = '' AND has_blockers != 0;"
        )?;
        Ok(())
    }

    pub fn create_board(
        &self,
        id: &str,
        title: &str,
        description: &str,
        facilitator_token: &str,
        meeting_timer_seconds: i32,
        target_time: Option<&str>,
    ) -> Result<DailyBoard> {
        let conn = self.get_conn();
        let now = now_ts();
        conn.execute(
            "INSERT INTO boards (id, title, description, facilitator_token, meeting_timer_seconds, target_time, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![id, title, description, facilitator_token, meeting_timer_seconds, target_time, now],
        )?;

        Ok(DailyBoard {
            id: id.to_string(),
            title: title.to_string(),
            description: description.to_string(),
            facilitator_token: facilitator_token.to_string(),
            meeting_timer_seconds,
            target_time: target_time.map(|s| s.to_string()),
            created_at: now,
        })
    }

    pub fn get_board(&self, id: &str) -> Result<Option<DailyBoard>> {
        let conn = self.get_conn();
        conn.query_row(
            "SELECT id, title, description, facilitator_token, meeting_timer_seconds, target_time, created_at
             FROM boards WHERE id = ?1",
            params![id],
            |row| {
                Ok(DailyBoard {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    description: row.get(2)?,
                    facilitator_token: row.get(3)?,
                    meeting_timer_seconds: row.get(4)?,
                    target_time: row.get(5)?,
                    created_at: row.get(6)?,
                })
            },
        )
        .optional()
    }

    pub fn update_board(
        &self,
        id: &str,
        title: Option<&str>,
        description: Option<&str>,
        meeting_timer_seconds: Option<i32>,
        target_time: Option<&str>,
    ) -> Result<DailyBoard> {
        let conn = self.get_conn();
        if let Some(t) = title {
            conn.execute("UPDATE boards SET title = ?1 WHERE id = ?2", params![t, id])?;
        }
        if let Some(d) = description {
            conn.execute("UPDATE boards SET description = ?1 WHERE id = ?2", params![d, id])?;
        }
        if let Some(s) = meeting_timer_seconds {
            conn.execute("UPDATE boards SET meeting_timer_seconds = ?1 WHERE id = ?2", params![s, id])?;
        }
        if let Some(tt) = target_time {
            conn.execute("UPDATE boards SET target_time = ?1 WHERE id = ?2", params![tt, id])?;
        }

        conn.query_row(
            "SELECT id, title, description, facilitator_token, meeting_timer_seconds, target_time, created_at
             FROM boards WHERE id = ?1",
            params![id],
            |row| {
                Ok(DailyBoard {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    description: row.get(2)?,
                    facilitator_token: row.get(3)?,
                    meeting_timer_seconds: row.get(4)?,
                    target_time: row.get(5)?,
                    created_at: row.get(6)?,
                })
            },
        )
    }

    pub fn get_available_dates(&self, board_id: &str) -> Result<Vec<String>> {
        let conn = self.get_conn();
        let mut stmt = conn.prepare(
            "SELECT DISTINCT date FROM checkins WHERE board_id = ?1 ORDER BY date DESC LIMIT 30"
        )?;
        let rows = stmt.query_map(params![board_id], |row| row.get(0))?;
        let mut dates = Vec::new();
        for r in rows {
            dates.push(r?);
        }
        let today = today_str();
        if !dates.contains(&today) {
            dates.insert(0, today);
        }
        Ok(dates)
    }

    pub fn get_checkins(&self, board_id: &str, date: &str) -> Result<Vec<CheckIn>> {
        let conn = self.get_conn();
        let mut stmt = conn.prepare(
            "SELECT id, board_id, date, user_name, role, avatar_color, yesterday, today, blockers, has_blockers, mood, session_hash, created_at, updated_at
             FROM checkins WHERE board_id = ?1 AND date = ?2 ORDER BY created_at ASC"
        )?;
        let rows = stmt.query_map(params![board_id, date], |row| {
            let blockers: String = row.get(8)?;
            let has_blockers_int: i32 = row.get(9)?;
            let is_blocked = has_blockers_int != 0 && !blockers.trim().is_empty();
            Ok(CheckIn {
                id: row.get(0)?,
                board_id: row.get(1)?,
                date: row.get(2)?,
                user_name: row.get(3)?,
                role: row.get(4)?,
                avatar_color: row.get(5)?,
                yesterday: row.get(6)?,
                today: row.get(7)?,
                blockers,
                has_blockers: is_blocked,
                mood: row.get(10)?,
                session_hash: row.get(11)?,
                created_at: row.get(12)?,
                updated_at: row.get(13)?,
            })
        })?;

        let mut list = Vec::new();
        for item in rows {
            list.push(item?);
        }
        Ok(list)
    }

    pub fn save_checkin(&self, board_id: &str, req: &SaveCheckInRequest) -> Result<CheckIn> {
        let conn = self.get_conn();
        let now = now_ts();

        // Match existing checkin strictly by board, date and user's session_hash (prevents impersonation)
        let existing: Option<(String, i64)> = conn.query_row(
            "SELECT id, created_at FROM checkins WHERE board_id = ?1 AND date = ?2 AND session_hash = ?3",
            params![board_id, req.date, req.session_hash],
            |row| Ok((row.get(0)?, row.get(1)?)),
        ).optional()?;

        let (id, created_at) = if let Some((existing_id, created)) = existing {
            (existing_id, created)
        } else {
            (ulid::Ulid::new().to_string(), now)
        };

        let avatar_color = req.avatar_color.clone().unwrap_or_else(|| "#6366F1".to_string());
        let raw_blockers = req.blockers.as_deref().unwrap_or("").trim();
        let is_explicitly_blocked = req.has_blockers || !raw_blockers.is_empty();
        let (final_blockers, has_blockers_int) = if is_explicitly_blocked && !raw_blockers.is_empty() {
            (raw_blockers.to_string(), 1)
        } else if req.has_blockers && raw_blockers.is_empty() {
            ("Impedimento relatado / Preciso de ajuda".to_string(), 1)
        } else {
            (String::new(), 0)
        };
        let is_blocked = has_blockers_int != 0;

        conn.execute(
            "INSERT INTO checkins (id, board_id, date, user_name, role, avatar_color, yesterday, today, blockers, has_blockers, mood, session_hash, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)
             ON CONFLICT(id) DO UPDATE SET
                user_name = excluded.user_name,
                role = excluded.role,
                avatar_color = excluded.avatar_color,
                yesterday = excluded.yesterday,
                today = excluded.today,
                blockers = excluded.blockers,
                has_blockers = excluded.has_blockers,
                mood = excluded.mood,
                session_hash = excluded.session_hash,
                updated_at = excluded.updated_at",
            params![
                id,
                board_id,
                req.date,
                req.user_name,
                req.role,
                avatar_color,
                req.yesterday,
                req.today,
                final_blockers,
                has_blockers_int,
                req.mood,
                req.session_hash,
                created_at,
                now
            ],
        )?;

        Ok(CheckIn {
            id,
            board_id: board_id.to_string(),
            date: req.date.clone(),
            user_name: req.user_name.clone(),
            role: req.role.clone(),
            avatar_color,
            yesterday: req.yesterday.clone(),
            today: req.today.clone(),
            blockers: final_blockers,
            has_blockers: is_blocked,
            mood: req.mood.clone(),
            session_hash: req.session_hash.clone(),
            created_at,
            updated_at: now,
        })
    }

    pub fn delete_checkin(&self, board_id: &str, checkin_id: &str, session_hash: &str, is_facilitator: bool) -> Result<bool> {
        let conn = self.get_conn();
        let rows = if is_facilitator {
            conn.execute(
                "DELETE FROM checkins WHERE id = ?1 AND board_id = ?2",
                params![checkin_id, board_id],
            )?
        } else {
            conn.execute(
                "DELETE FROM checkins WHERE id = ?1 AND board_id = ?2 AND session_hash = ?3",
                params![checkin_id, board_id, session_hash],
            )?
        };
        Ok(rows > 0)
    }

    pub fn get_meeting_state(&self, board_id: &str, date: &str, default_timer: i32) -> Result<LiveMeetingState> {
        let conn = self.get_conn();
        let state: Option<LiveMeetingState> = conn.query_row(
            "SELECT is_active, speaker_order, current_speaker_index, timer_seconds_remaining, timer_is_running, timer_ends_at, started_at
             FROM meeting_states WHERE board_id = ?1 AND date = ?2",
            params![board_id, date],
            |row| {
                let is_active_int: i32 = row.get(0)?;
                let order_json: String = row.get(1)?;
                let speaker_order: Vec<String> = serde_json::from_str(&order_json).unwrap_or_default();
                let timer_is_running_int: i32 = row.get(4)?;
                Ok(LiveMeetingState {
                    board_id: board_id.to_string(),
                    date: date.to_string(),
                    is_active: is_active_int != 0,
                    speaker_order,
                    current_speaker_index: row.get(2)?,
                    timer_seconds_remaining: row.get(3)?,
                    timer_is_running: timer_is_running_int != 0,
                    timer_ends_at: row.get(5)?,
                    started_at: row.get(6)?,
                })
            },
        ).optional()?;

        Ok(state.unwrap_or_else(|| LiveMeetingState {
            board_id: board_id.to_string(),
            date: date.to_string(),
            is_active: false,
            speaker_order: Vec::new(),
            current_speaker_index: 0,
            timer_seconds_remaining: default_timer,
            timer_is_running: false,
            timer_ends_at: None,
            started_at: None,
        }))
    }

    pub fn save_meeting_state(&self, state: &LiveMeetingState) -> Result<()> {
        let conn = self.get_conn();
        let order_json = serde_json::to_string(&state.speaker_order).unwrap_or_else(|_| "[]".to_string());
        conn.execute(
            "INSERT INTO meeting_states (board_id, date, is_active, speaker_order, current_speaker_index, timer_seconds_remaining, timer_is_running, timer_ends_at, started_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
             ON CONFLICT(board_id, date) DO UPDATE SET
                is_active = excluded.is_active,
                speaker_order = excluded.speaker_order,
                current_speaker_index = excluded.current_speaker_index,
                timer_seconds_remaining = excluded.timer_seconds_remaining,
                timer_is_running = excluded.timer_is_running,
                timer_ends_at = excluded.timer_ends_at,
                started_at = excluded.started_at",
            params![
                state.board_id,
                state.date,
                if state.is_active { 1 } else { 0 },
                order_json,
                state.current_speaker_index,
                state.timer_seconds_remaining,
                if state.timer_is_running { 1 } else { 0 },
                state.timer_ends_at,
                state.started_at
            ],
        )?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_board_lifecycle() {
        let db = Database::new(":memory:").expect("Failed to create in-memory db");
        let board = db
            .create_board("board_123", "Squad Alpha", "Alpha team standup", "token_xyz", 90, Some("09:30"))
            .expect("Failed to create board");

        assert_eq!(board.id, "board_123");
        assert_eq!(board.title, "Squad Alpha");
        assert_eq!(board.meeting_timer_seconds, 90);

        let retrieved = db.get_board("board_123").expect("Query failed").expect("Board not found");
        assert_eq!(retrieved.title, "Squad Alpha");
        assert_eq!(retrieved.facilitator_token, "token_xyz");
    }

    #[test]
    fn test_checkin_crud() {
        let db = Database::new(":memory:").expect("Failed to create in-memory db");
        db.create_board("board_1", "Team", "", "tok", 90, None).unwrap();

        let req = SaveCheckInRequest {
            date: "2026-09-18".to_string(),
            user_name: "Yared".to_string(),
            role: Some("Tech Lead".to_string()),
            avatar_color: Some("#6366F1".to_string()),
            yesterday: "Finalizei a API de websockets".to_string(),
            today: "Vou implementar o frontend da roleta".to_string(),
            blockers: Some("Aguardando aprovação de credenciais".to_string()),
            has_blockers: true,
            mood: Some("🚀 Super Motivado".to_string()),
            session_hash: "sess_1".to_string(),
        };

        let checkin = db.save_checkin("board_1", &req).expect("Failed to save checkin");
        assert_eq!(checkin.user_name, "Yared");
        assert!(checkin.has_blockers);

        let list = db.get_checkins("board_1", "2026-09-18").expect("Failed to query checkins");
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].yesterday, "Finalizei a API de websockets");

        // Test upsert update
        let req_update = SaveCheckInRequest {
            date: "2026-09-18".to_string(),
            user_name: "Yared".to_string(),
            role: Some("Tech Lead".to_string()),
            avatar_color: Some("#6366F1".to_string()),
            yesterday: "Finalizei a API de websockets e testes".to_string(),
            today: "Vou implementar o frontend da roleta".to_string(),
            blockers: None,
            has_blockers: false,
            mood: Some("⚡ No Foco".to_string()),
            session_hash: "sess_1".to_string(),
        };

        let updated = db.save_checkin("board_1", &req_update).expect("Failed to update checkin");
        assert_eq!(updated.id, checkin.id);
        assert!(!updated.has_blockers);

        let list_updated = db.get_checkins("board_1", "2026-09-18").expect("Failed to query checkins");
        assert_eq!(list_updated.len(), 1);
        assert_eq!(list_updated[0].yesterday, "Finalizei a API de websockets e testes");

        // Test delete
        let deleted = db.delete_checkin("board_1", &checkin.id, "sess_1", false).expect("Delete failed");
        assert!(deleted);

        let list_after_delete = db.get_checkins("board_1", "2026-09-18").expect("Failed to query checkins");
        assert_eq!(list_after_delete.len(), 0);
    }

    #[test]
    fn test_meeting_state_lifecycle() {
        let db = Database::new(":memory:").expect("Failed to create in-memory db");
        db.create_board("board_2", "Team", "", "tok", 90, None).unwrap();

        let initial = db.get_meeting_state("board_2", "2026-09-18", 90).unwrap();
        assert!(!initial.is_active);
        assert_eq!(initial.timer_seconds_remaining, 90);

        let updated_state = LiveMeetingState {
            board_id: "board_2".to_string(),
            date: "2026-09-18".to_string(),
            is_active: true,
            speaker_order: vec!["Alice".to_string(), "Bob".to_string()],
            current_speaker_index: 1,
            timer_seconds_remaining: 45,
            timer_is_running: true,
            timer_ends_at: Some(1726665000),
            started_at: Some(1726664000),
        };

        db.save_meeting_state(&updated_state).expect("Save state failed");

        let retrieved = db.get_meeting_state("board_2", "2026-09-18", 90).unwrap();
        assert!(retrieved.is_active);
        assert_eq!(retrieved.speaker_order, vec!["Alice", "Bob"]);
        assert_eq!(retrieved.current_speaker_index, 1);
        assert_eq!(retrieved.timer_seconds_remaining, 45);
    }

    #[test]
    fn test_checkin_session_isolation_and_empty_blocker() {
        let db = Database::new(":memory:").expect("Failed to create in-memory db");
        db.create_board("board_sec", "Sec Team", "", "tok", 90, None).unwrap();

        // User 1 (Alice with session_1)
        let req1 = SaveCheckInRequest {
            date: "2026-09-18".to_string(),
            user_name: "Alice".to_string(),
            role: Some("Dev".to_string()),
            avatar_color: Some("#6366F1".to_string()),
            yesterday: "Task A".to_string(),
            today: "Task B".to_string(),
            blockers: Some("Impedimento real".to_string()),
            has_blockers: true,
            mood: Some("⚡ No Foco".to_string()),
            session_hash: "sess_alice".to_string(),
        };
        assert!(req1.validate().is_ok());
        let c1 = db.save_checkin("board_sec", &req1).unwrap();
        assert!(c1.has_blockers);

        // User 2 (Also named Alice, but with sess_alice_2)
        let req2 = SaveCheckInRequest {
            date: "2026-09-18".to_string(),
            user_name: "Alice".to_string(),
            role: Some("QA".to_string()),
            avatar_color: Some("#10B981".to_string()),
            yesterday: "Test A".to_string(),
            today: "Test B".to_string(),
            blockers: None,
            has_blockers: false,
            mood: Some("⚡ No Foco".to_string()),
            session_hash: "sess_alice_2".to_string(),
        };
        assert!(req2.validate().is_ok());
        let c2 = db.save_checkin("board_sec", &req2).unwrap();

        // Must be separate check-ins, c1 must NOT be overwritten!
        assert_ne!(c1.id, c2.id);
        let list = db.get_checkins("board_sec", "2026-09-18").unwrap();
        assert_eq!(list.len(), 2);

        // Test that clearing blocker text removes has_blockers
        let req1_cleared = SaveCheckInRequest {
            date: "2026-09-18".to_string(),
            user_name: "Alice".to_string(),
            role: Some("Dev".to_string()),
            avatar_color: Some("#6366F1".to_string()),
            yesterday: "Task A".to_string(),
            today: "Task B".to_string(),
            blockers: Some("   ".to_string()),
            has_blockers: false,
            mood: Some("⚡ No Foco".to_string()),
            session_hash: "sess_alice".to_string(),
        };
        let c1_updated = db.save_checkin("board_sec", &req1_cleared).unwrap();
        assert_eq!(c1_updated.id, c1.id);
        assert!(!c1_updated.has_blockers);
        assert_eq!(c1_updated.blockers, "");

        // Test validation rejection on invalid date
        let req_bad_date = SaveCheckInRequest {
            date: "not-a-date".to_string(),
            user_name: "Bad".to_string(),
            role: None,
            avatar_color: None,
            yesterday: "Y".to_string(),
            today: "T".to_string(),
            blockers: None,
            has_blockers: false,
            mood: None,
            session_hash: "sess_x".to_string(),
        };
        assert!(req_bad_date.validate().is_err());
    }
}
