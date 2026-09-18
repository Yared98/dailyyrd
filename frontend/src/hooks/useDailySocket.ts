import { useEffect, useRef, useState, useCallback } from 'react';
import type { CheckIn, LiveMeetingState, WsMessage } from '../types';

interface UseDailySocketProps {
  boardId: string;
  sessionHash: string;
  facilitatorToken: string | null;
  onCheckInSaved?: (checkin: CheckIn) => void;
  onCheckInDeleted?: (checkinId: string) => void;
  onMeetingStateChanged?: (state: LiveMeetingState) => void;
  onPresenceUpdated?: (count: number) => void;
}

export function useDailySocket({
  boardId,
  sessionHash,
  facilitatorToken,
  onCheckInSaved,
  onCheckInDeleted,
  onMeetingStateChanged,
  onPresenceUpdated,
}: UseDailySocketProps) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<number | null>(null);

  const connect = useCallback(() => {
    if (!boardId) return;

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.port === '5173' ? `${window.location.hostname}:8081` : window.location.host;
    let url = `${protocol}//${host}/ws/board/${boardId}?session_hash=${sessionHash}`;
    if (facilitatorToken) {
      url += `&facilitator_token=${facilitatorToken}`;
    }

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const msg: WsMessage = JSON.parse(event.data);
        switch (msg.type) {
          case 'PRESENCE_UPDATE':
            if (onPresenceUpdated && msg.payload?.online_count !== undefined) {
              onPresenceUpdated(msg.payload.online_count);
            }
            break;
          case 'CHECKIN_SAVED':
            if (onCheckInSaved && msg.payload?.checkin) {
              onCheckInSaved(msg.payload.checkin);
            }
            break;
          case 'CHECKIN_DELETED':
            if (onCheckInDeleted && msg.payload?.checkin_id) {
              onCheckInDeleted(msg.payload.checkin_id);
            }
            break;
          case 'MEETING_STATE_CHANGED':
            if (onMeetingStateChanged && msg.payload?.meeting_state) {
              onMeetingStateChanged(msg.payload.meeting_state);
            }
            break;
          default:
            break;
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      reconnectTimeoutRef.current = window.setTimeout(() => {
        connect();
      }, 2000);
    };

    ws.onerror = (err) => {
      console.warn('WebSocket encountered error:', err);
      ws.close();
    };
  }, [boardId, sessionHash, facilitatorToken, onCheckInSaved, onCheckInDeleted, onMeetingStateChanged, onPresenceUpdated]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const send = useCallback((type: string, payload: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const msg: WsMessage = {
        type,
        payload,
        timestamp: Date.now(),
      };
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const deleteCheckIn = useCallback((checkinId: string) => {
    send('CHECKIN_DELETED', { checkin_id: checkinId });
  }, [send]);

  const startMeeting = useCallback((date: string, speakerOrder: string[]) => {
    send('START_MEETING', { date, speaker_order: speakerOrder });
  }, [send]);

  const endMeeting = useCallback((date: string) => {
    send('END_MEETING', { date });
  }, [send]);

  const shuffleOrder = useCallback((date: string, speakerOrder: string[]) => {
    send('SHUFFLE_ORDER', { date, speaker_order: speakerOrder });
  }, [send]);

  const nextSpeaker = useCallback((date: string) => {
    send('NEXT_SPEAKER', { date });
  }, [send]);

  const prevSpeaker = useCallback((date: string) => {
    send('PREV_SPEAKER', { date });
  }, [send]);

  const setSpeaker = useCallback((date: string, index: number) => {
    send('SET_SPEAKER', { date, index });
  }, [send]);

  const startTimer = useCallback((date: string, seconds: number) => {
    send('START_TIMER', { date, seconds });
  }, [send]);

  const pauseTimer = useCallback((date: string, secondsRemaining: number) => {
    send('PAUSE_TIMER', { date, seconds_remaining: secondsRemaining });
  }, [send]);

  const resetTimer = useCallback((date: string, seconds: number) => {
    send('RESET_TIMER', { date, seconds });
  }, [send]);

  return {
    isConnected,
    send,
    deleteCheckIn,
    startMeeting,
    endMeeting,
    shuffleOrder,
    nextSpeaker,
    prevSpeaker,
    setSpeaker,
    startTimer,
    pauseTimer,
    resetTimer,
  };
}
