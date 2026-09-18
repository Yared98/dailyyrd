export interface DailyBoard {
  id: string;
  title: string;
  description: string;
  facilitator_token: string;
  meeting_timer_seconds: number;
  target_time?: string;
  created_at: number;
}

export interface CheckIn {
  id: string;
  board_id: string;
  date: string;
  user_name: string;
  role?: string;
  avatar_color: string;
  yesterday: string;
  today: string;
  blockers: string;
  has_blockers: boolean;
  mood?: string;
  session_hash?: string;
  created_at: number;
  updated_at: number;
}

export interface LiveMeetingState {
  board_id: string;
  date: string;
  is_active: boolean;
  speaker_order: string[];
  current_speaker_index: number;
  timer_seconds_remaining: number;
  timer_is_running: boolean;
  timer_ends_at?: number;
  started_at?: number;
}

export interface DailyBoardSnapshot {
  board: DailyBoard;
  date: string;
  available_dates: string[];
  checkins: CheckIn[];
  meeting_state: LiveMeetingState;
  is_facilitator: boolean;
  online_count: number;
  user_checkin_id?: string;
}

export interface WsMessage {
  type: string;
  payload: any;
  timestamp?: number;
}

export interface SaveCheckInPayload {
  date: string;
  user_name: string;
  role?: string;
  avatar_color?: string;
  yesterday: string;
  today: string;
  blockers?: string;
  has_blockers: boolean;
  mood?: string;
  session_hash: string;
}
