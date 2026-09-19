import { useState, useEffect, useCallback } from 'react';
import './i18n';
import type {
  DailyBoardSnapshot,
  CheckIn,
  LiveMeetingState,
  SaveCheckInPayload,
} from './types';
import { Header } from './components/Header';
import { DailyBoardView } from './components/DailyBoardView';
import { HomeView } from './components/HomeView';
import { CheckInModal } from './components/CheckInModal';
import { LiveMeetingModal } from './components/LiveMeetingModal';
import { ExportModal } from './components/ExportModal';
import { CreateBoardModal } from './components/CreateBoardModal';
import { IdentityModal } from './components/IdentityModal';
import { Footer } from './components/Footer';
import { useDailySocket } from './hooks/useDailySocket';
import {
  getSessionHash,
  getFacilitatorToken,
  saveFacilitatorToken,
  addRecentBoard,
  getSavedUserProfile,
} from './utils/session';
import { initAnalytics, trackPageView } from './utils/analytics';

export function App() {
  useEffect(() => {
    initAnalytics();
  }, []);
  const sessionHash = getSessionHash();

  // Route / Board identification
  const getBoardIdFromUrl = () => {
    const parts = window.location.pathname.split('/');
    if (parts.length >= 3 && parts[1] === 'board') {
      return parts[2];
    }
    const params = new URLSearchParams(window.location.search);
    return params.get('board') || null;
  };

  const [currentBoardId, setCurrentBoardId] = useState<string | null>(getBoardIdFromUrl());

  useEffect(() => {
    if (currentBoardId) {
      trackPageView('/board', 'DailyYrd — Quadro da Daily');
    } else {
      trackPageView('/', 'DailyYrd — Início');
    }
  }, [currentBoardId]);
  const [boardSnapshot, setBoardSnapshot] = useState<DailyBoardSnapshot | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [userName, setUserName] = useState<string>(() => getSavedUserProfile().name);
  const [showIdentityModal, setShowIdentityModal] = useState<boolean>(false);

  useEffect(() => {
    if (currentBoardId && !userName) {
      setShowIdentityModal(true);
    }
  }, [currentBoardId, userName]);

  const [onlineCount, setOnlineCount] = useState<number>(1);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modals state
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState<boolean>(false);
  const [isLiveMeetingModalOpen, setIsLiveMeetingModalOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isCreateBoardModalOpen, setIsCreateBoardModalOpen] = useState<boolean>(false);

  // Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('dailyyrd_theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('dailyyrd_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const [myCheckinId, setMyCheckinId] = useState<string | null>(null);

  // Helper to determine facilitator status
  const facilitatorToken = currentBoardId ? getFacilitatorToken(currentBoardId) : null;

  // Load board data from backend
  const loadBoardSnapshot = useCallback(async (boardId: string, date: string) => {
    setErrorMsg(null);
    try {
      const token = getFacilitatorToken(boardId);
      let url = `/api/boards/${boardId}?date=${date}&session_hash=${sessionHash}`;
      if (token) {
        url += `&token=${token}`;
      }

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error('Não foi possível carregar o board da Daily.');
      }
      const data: DailyBoardSnapshot = await res.json();
      setBoardSnapshot(data);
      if (data.user_checkin_id) {
        setMyCheckinId(data.user_checkin_id);
      }
      setSelectedDate(data.date);
      const facToken = getFacilitatorToken(data.board.id);
      addRecentBoard({
        id: data.board.id,
        title: data.board.title,
        role: facToken ? 'facilitator' : 'member',
        facilitatorToken: facToken,
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao carregar dados');
    }
  }, [sessionHash]);

  useEffect(() => {
    if (currentBoardId) {
      loadBoardSnapshot(currentBoardId, selectedDate);
    } else {
      setBoardSnapshot(null);
    }
  }, [currentBoardId, selectedDate, loadBoardSnapshot]);

  // WebSocket event callbacks
  const handleCheckInSaved = useCallback((saved: CheckIn) => {
    setBoardSnapshot((prev) => {
      if (!prev) return prev;
      if (saved.date !== prev.date) return prev;

      const idx = prev.checkins.findIndex((c) => c.id === saved.id);
      let nextCheckins: CheckIn[];
      if (idx >= 0) {
        nextCheckins = [...prev.checkins];
        nextCheckins[idx] = saved;
      } else {
        nextCheckins = [...prev.checkins, saved];
      }

      return {
        ...prev,
        checkins: nextCheckins,
      };
    });
  }, []);

  const handleCheckInDeleted = useCallback((checkinId: string) => {
    setBoardSnapshot((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        checkins: prev.checkins.filter((c) => c.id !== checkinId),
      };
    });
  }, []);

  const handleMeetingStateChanged = useCallback((meetingState: LiveMeetingState) => {
    setBoardSnapshot((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        meeting_state: meetingState,
      };
    });

    // Auto-open live meeting modal when meeting becomes active
    if (meetingState.is_active) {
      setIsLiveMeetingModalOpen(true);
    }
  }, []);

  const handlePresenceUpdated = useCallback((count: number) => {
    setOnlineCount(count);
  }, []);

  // WebSocket Hook
  const {
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
  } = useDailySocket({
    boardId: currentBoardId || '',
    sessionHash,
    facilitatorToken,
    onCheckInSaved: handleCheckInSaved,
    onCheckInDeleted: handleCheckInDeleted,
    onMeetingStateChanged: handleMeetingStateChanged,
    onPresenceUpdated: handlePresenceUpdated,
  });

  // Action: Save Check-in
  const handleSaveCheckIn = async (payload: SaveCheckInPayload) => {
    if (!currentBoardId) return;

    const res = await fetch(`/api/boards/${currentBoardId}/checkins`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'Falha ao salvar check-in');
    }

    const saved: CheckIn = await res.json();
    setMyCheckinId(saved.id);
    handleCheckInSaved(saved);
  };

  // Action: Delete Check-in
  const handleDeleteCheckIn = async (checkinId: string) => {
    if (!currentBoardId) return;

    let url = `/api/boards/${currentBoardId}/checkins/${checkinId}?session_hash=${sessionHash}`;
    if (facilitatorToken) {
      url += `&token=${facilitatorToken}`;
    }

    const res = await fetch(url, { method: 'DELETE' });
    if (!res.ok) {
      alert('Não foi possível excluir este check-in');
      return;
    }

    if (myCheckinId === checkinId) {
      setMyCheckinId(null);
    }

    handleCheckInDeleted(checkinId);
    deleteCheckIn(checkinId);
  };

  // Action: Create Board
  const handleCreateBoard = async (data: {
    title: string;
    description: string;
    meeting_timer_seconds: number;
    target_time?: string;
  }) => {
    const res = await fetch('/api/boards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Erro ao criar board');
    }

    const created = await res.json();
    saveFacilitatorToken(created.id, created.facilitator_token);
    addRecentBoard({
      id: created.id,
      title: data.title,
      role: 'facilitator',
      facilitatorToken: created.facilitator_token,
    });

    // Navigate to board URL
    window.history.pushState({}, '', `/board/${created.id}`);
    setCurrentBoardId(created.id);
  };

  const handleSelectBoard = (boardId: string) => {
    window.history.pushState({}, '', `/board/${boardId}`);
    setCurrentBoardId(boardId);
  };

  if (!currentBoardId) {
    return (
      <HomeView
        onCreate={handleCreateBoard}
        onSelectBoard={handleSelectBoard}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  const effectiveMyCheckInId = myCheckinId || boardSnapshot?.user_checkin_id;
  // User's own check-in for editing
  const myCheckIn = boardSnapshot?.checkins.find((c) => (effectiveMyCheckInId && c.id === effectiveMyCheckInId) || (c.session_hash && c.session_hash === sessionHash));

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header
        board={boardSnapshot?.board}
        selectedDate={selectedDate}
        availableDates={boardSnapshot?.available_dates || [selectedDate]}
        onSelectDate={setSelectedDate}
        onlineCount={onlineCount}
        isFacilitator={boardSnapshot?.is_facilitator || !!facilitatorToken}
        theme={theme}
        userName={userName}
        onEditIdentity={() => setShowIdentityModal(true)}
        onToggleTheme={toggleTheme}
        onOpenCreateBoard={() => setIsCreateBoardModalOpen(true)}
      />

      {errorMsg ? (
        <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <h2 style={{ color: 'var(--color-blocker)', marginBottom: '1rem' }}>{errorMsg}</h2>
          <button
            onClick={() => {
              window.history.pushState({}, '', '/');
              setCurrentBoardId(null);
            }}
            className="btn-secondary"
          >
            Voltar ao Início
          </button>
        </div>
      ) : boardSnapshot ? (
        <DailyBoardView
          board={boardSnapshot.board}
          date={selectedDate}
          checkins={boardSnapshot.checkins}
          meetingState={boardSnapshot.meeting_state}
          isFacilitator={boardSnapshot.is_facilitator}
          userCheckinId={effectiveMyCheckInId || undefined}
          onOpenCheckInModal={() => setIsCheckInModalOpen(true)}
          onOpenLiveMeetingModal={() => {
            if (!boardSnapshot.meeting_state.is_active) {
              startMeeting(selectedDate, boardSnapshot.checkins.map((c) => c.user_name));
            }
            setIsLiveMeetingModalOpen(true);
          }}
          onOpenExportModal={() => setIsExportModalOpen(true)}
          onDeleteCheckIn={handleDeleteCheckIn}
        />
      ) : (
        <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Carregando dados da Daily...
        </div>
      )}

      {/* Modals */}
      {boardSnapshot && (
        <>
          <CheckInModal
            isOpen={isCheckInModalOpen}
            onClose={() => setIsCheckInModalOpen(false)}
            date={selectedDate}
            existingCheckIn={myCheckIn}
            onSave={handleSaveCheckIn}
          />

          <LiveMeetingModal
            isOpen={isLiveMeetingModalOpen}
            onClose={() => setIsLiveMeetingModalOpen(false)}
            date={selectedDate}
            checkins={boardSnapshot.checkins}
            meetingState={boardSnapshot.meeting_state}
            isFacilitator={boardSnapshot.is_facilitator}
            onStartMeeting={startMeeting}
            onEndMeeting={endMeeting}
            onShuffleOrder={shuffleOrder}
            onNextSpeaker={nextSpeaker}
            onPrevSpeaker={prevSpeaker}
            onSetSpeaker={setSpeaker}
            onStartTimer={startTimer}
            onPauseTimer={pauseTimer}
            onResetTimer={resetTimer}
            defaultTimerSeconds={boardSnapshot.board.meeting_timer_seconds}
          />

          <ExportModal
            isOpen={isExportModalOpen}
            onClose={() => setIsExportModalOpen(false)}
            board={boardSnapshot.board}
            date={selectedDate}
            checkins={boardSnapshot.checkins}
          />
        </>
      )}

      <CreateBoardModal
        isOpen={isCreateBoardModalOpen}
        onClose={() => setIsCreateBoardModalOpen(false)}
        onCreate={handleCreateBoard}
      />

      <IdentityModal
        isOpen={showIdentityModal}
        onClose={() => setShowIdentityModal(false)}
        onSave={(name) => {
          setUserName(name);
          setShowIdentityModal(false);
        }}
        isMandatory={!userName}
      />

      <Footer />
    </div>
  );
}

export default App;
