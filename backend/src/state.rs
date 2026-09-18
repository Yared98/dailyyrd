use std::collections::HashSet;
use std::sync::Arc;
use dashmap::DashMap;
use tokio::sync::broadcast;
use crate::db::Database;
use crate::models::WsMessage;

#[derive(Clone)]
pub struct AppState {
    pub db: Database,
    pub channels: Arc<DashMap<String, broadcast::Sender<WsMessage>>>,
    pub presence: Arc<DashMap<String, HashSet<String>>>,
}

impl AppState {
    pub fn new(db: Database) -> Self {
        Self {
            db,
            channels: Arc::new(DashMap::new()),
            presence: Arc::new(DashMap::new()),
        }
    }

    pub fn get_or_create_channel(&self, board_id: &str) -> broadcast::Sender<WsMessage> {
        self.channels
            .entry(board_id.to_string())
            .or_insert_with(|| {
                let (tx, _rx) = broadcast::channel(100);
                tx
            })
            .clone()
    }

    pub fn broadcast(&self, board_id: &str, msg: WsMessage) {
        if let Some(channel) = self.channels.get(board_id) {
            let _ = channel.send(msg);
        }
    }

    pub fn add_presence(&self, board_id: &str, session_hash: &str) -> usize {
        let mut set = self.presence.entry(board_id.to_string()).or_default();
        set.insert(session_hash.to_string());
        set.len()
    }

    pub fn remove_presence(&self, board_id: &str, session_hash: &str) -> usize {
        let mut set = self.presence.entry(board_id.to_string()).or_default();
        set.remove(session_hash);
        let len = set.len();
        if len == 0 {
            drop(set);
            self.presence.remove(board_id);
            self.channels.remove(board_id);
        }
        len
    }

    pub fn get_presence_count(&self, board_id: &str) -> usize {
        self.presence.get(board_id).map(|s| s.len()).unwrap_or(0)
    }
}
