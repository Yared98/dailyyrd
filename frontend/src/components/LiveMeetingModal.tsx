import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import confetti from 'canvas-confetti';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  SkipBack,
  Shuffle,
  Trophy,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { CheckIn, LiveMeetingState } from '../types';
import { playTurnChime, playTimeExpiredChime } from '../utils/audio';

interface LiveMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  checkins: CheckIn[];
  meetingState: LiveMeetingState;
  isFacilitator: boolean;
  onStartMeeting: (date: string, speakerOrder: string[]) => void;
  onEndMeeting: (date: string) => void;
  onShuffleOrder: (date: string, speakerOrder: string[]) => void;
  onNextSpeaker: (date: string) => void;
  onPrevSpeaker: (date: string) => void;
  onSetSpeaker: (date: string, index: number) => void;
  onStartTimer: (date: string, seconds: number) => void;
  onPauseTimer: (date: string, remaining: number) => void;
  onResetTimer: (date: string, seconds: number) => void;
  defaultTimerSeconds: number;
}

export const LiveMeetingModal: React.FC<LiveMeetingModalProps> = ({
  isOpen,
  onClose,
  date,
  checkins,
  meetingState,
  onEndMeeting,
  onShuffleOrder,
  onNextSpeaker,
  onPrevSpeaker,
  onSetSpeaker,
  onStartTimer,
  onPauseTimer,
  onResetTimer,
  defaultTimerSeconds,
}) => {
  const { t } = useTranslation();
  const [secondsRemaining, setSecondsRemaining] = useState(defaultTimerSeconds);
  const [isCompleted, setIsCompleted] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('dailyyrd_sound') !== 'false';
  });

  // Derive speaker names from check-ins if order is empty
  const allSpeakerNames = meetingState.speaker_order.length > 0
    ? meetingState.speaker_order
    : checkins.map((c) => c.user_name);

  const currentIndex = meetingState.current_speaker_index;
  const currentSpeakerName = allSpeakerNames[currentIndex] || '';
  const currentCheckin = checkins.find((c) => c.user_name === currentSpeakerName);
  const nextSpeakerName = allSpeakerNames[currentIndex + 1];

  const prevIndexRef = useRef<number>(currentIndex);
  const isFirstMountRef = useRef<boolean>(true);
  const hasPlayedExpiredRef = useRef<boolean>(false);

  // Play chime when speaker changes
  useEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      prevIndexRef.current = currentIndex;
      return;
    }
    if (prevIndexRef.current !== currentIndex) {
      if (soundEnabled && isOpen) {
        playTurnChime();
      }
      prevIndexRef.current = currentIndex;
    }
  }, [currentIndex, soundEnabled, isOpen]);

  // Play subtle chime when countdown hits zero
  useEffect(() => {
    if (secondsRemaining === 0 && meetingState.timer_is_running) {
      if (!hasPlayedExpiredRef.current) {
        if (soundEnabled && isOpen) {
          playTimeExpiredChime();
        }
        hasPlayedExpiredRef.current = true;
      }
    } else if (secondsRemaining > 0) {
      hasPlayedExpiredRef.current = false;
    }
  }, [secondsRemaining, meetingState.timer_is_running, soundEnabled, isOpen]);

  // Timer countdown local loop synchronized with server ends_at
  useEffect(() => {
    if (!meetingState.timer_is_running || !meetingState.timer_ends_at) {
      setSecondsRemaining(meetingState.timer_seconds_remaining);
      return;
    }

    const interval = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = Math.max(0, meetingState.timer_ends_at! - now);
      setSecondsRemaining(remaining);

      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 250);

    return () => clearInterval(interval);
  }, [meetingState.timer_is_running, meetingState.timer_ends_at, meetingState.timer_seconds_remaining]);

  if (!isOpen) return null;

  const handleToggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('dailyyrd_sound', String(next));
      if (next) {
        playTurnChime();
      }
      return next;
    });
  };

  const handleShuffle = () => {
    const shuffled = [...allSpeakerNames].sort(() => Math.random() - 0.5);
    onShuffleOrder(date, shuffled);
  };

  const handleToggleTimer = () => {
    if (meetingState.timer_is_running) {
      onPauseTimer(date, secondsRemaining);
    } else {
      onStartTimer(date, secondsRemaining > 0 ? secondsRemaining : defaultTimerSeconds);
    }
  };

  const handleResetTimer = () => {
    onResetTimer(date, defaultTimerSeconds);
    setSecondsRemaining(defaultTimerSeconds);
  };

  const handleFinish = () => {
    setIsCompleted(true);
    onEndMeeting(date);
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
    });
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isTimeWarning = secondsRemaining <= 10 && meetingState.timer_is_running;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '820px', padding: '0', overflow: 'hidden' }}
      >
        {/* Top Header */}
        <div
          style={{
            padding: '1.15rem 1.75rem',
            backgroundColor: 'var(--bg-header)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(99, 102, 241, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sparkles size={18} color="var(--color-primary)" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.01em' }}>
                {t('liveMeeting.title')}
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {date} • {allSpeakerNames.length} {t('board.checkInsCount')}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={handleToggleSound}
              className="btn-secondary"
              style={{
                padding: '0.45rem 0.65rem',
                fontSize: '0.825rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                color: soundEnabled ? 'var(--color-primary)' : 'var(--text-muted)',
              }}
              title={soundEnabled ? 'Sons ativados (Clique para silenciar)' : 'Sons desativados (Clique para ativar)'}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              <span style={{ fontSize: '0.75rem' }}>{soundEnabled ? 'Som on' : 'Mudo'}</span>
            </button>
            <button
              onClick={handleShuffle}
              className="btn-secondary"
              style={{ padding: '0.45rem 0.8rem', fontSize: '0.825rem' }}
              title={t('liveMeeting.shuffle')}
            >
              <Shuffle size={14} />
              <span>{t('liveMeeting.shuffle')}</span>
            </button>
            <button onClick={onClose} style={{ color: 'var(--text-muted)', padding: '0.4rem' }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Meeting Content */}
        <div style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {isCompleted ? (
            <div
              style={{
                textAlign: 'center',
                padding: '3rem 1.5rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1rem',
              }}
            >
              <div
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--color-success-bg)',
                  border: '2px solid var(--color-success-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 30px var(--color-success-glow)',
                }}
              >
                <Trophy size={36} color="var(--color-success)" />
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                {t('liveMeeting.congratulations')}
              </h3>
              <p style={{ color: 'var(--text-muted)', maxWidth: '440px' }}>
                Todos os membros compartilharam seus status e os alinhamentos necessários foram mapeados.
              </p>
              <button onClick={onClose} className="btn-primary" style={{ marginTop: '1rem' }}>
                {t('liveMeeting.close')}
              </button>
            </div>
          ) : (
            <>
              {/* Speaker Progress Bar */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>
                    {t('liveMeeting.rouletteMode')} ({currentIndex + 1} / {allSpeakerNames.length})
                  </span>
                  {nextSpeakerName && (
                    <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                      {t('liveMeeting.nextSpeaker')} <strong style={{ color: 'var(--text-main)' }}>{nextSpeakerName}</strong>
                    </span>
                  )}
                </div>

                {/* Speakers Pill Carousel */}
                <div
                  style={{
                    display: 'flex',
                    gap: '0.5rem',
                    overflowX: 'auto',
                    paddingBottom: '0.5rem',
                  }}
                >
                  {allSpeakerNames.map((name, idx) => {
                    const isCurrent = idx === currentIndex;
                    const isDone = idx < currentIndex;
                    const check = checkins.find((c) => c.user_name === name);

                    return (
                      <button
                        key={name + idx}
                        onClick={() => onSetSpeaker(date, idx)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.45rem',
                          padding: '0.4rem 0.85rem',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '0.825rem',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          backgroundColor: isCurrent
                            ? 'var(--color-primary)'
                            : isDone
                            ? 'var(--bg-subtle)'
                            : 'var(--bg-card)',
                          color: isCurrent ? '#ffffff' : isDone ? 'var(--text-dim)' : 'var(--text-main)',
                          border: isCurrent
                            ? '1px solid var(--color-primary-hover)'
                            : '1px solid var(--border-subtle)',
                          boxShadow: isCurrent ? '0 0 16px var(--color-primary-glow)' : 'none',
                          cursor: 'pointer',
                          transition: 'all var(--transition-fast)',
                        }}
                      >
                        {isDone ? (
                          <CheckCircle2 size={14} color="var(--color-success)" />
                        ) : (
                          <div
                            style={{
                              width: '18px',
                              height: '18px',
                              borderRadius: 'var(--radius-full)',
                              backgroundColor: check?.avatar_color || '#6366F1',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.65rem',
                              color: '#fff',
                            }}
                          >
                            {name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span>{name}</span>
                        {check?.has_blockers && (
                          <span
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: 'var(--radius-full)',
                              backgroundColor: 'var(--color-blocker)',
                              boxShadow: '0 0 6px var(--color-blocker)',
                            }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Central Speaker Spotlight Card */}
              <div
                style={{
                  backgroundColor: 'var(--bg-card)',
                  border: isTimeWarning
                    ? '2px solid var(--color-blocker)'
                    : '1px solid var(--border-highlight)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '1.75rem',
                  display: 'grid',
                  gridTemplateColumns: '1.2fr 1fr',
                  gap: '1.5rem',
                  boxShadow: isTimeWarning
                    ? '0 0 30px var(--color-blocker-glow)'
                    : 'var(--shadow-md)',
                  transition: 'all 0.3s ease',
                }}
              >
                {/* Left: Speaker Identity & Checkin details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div
                      style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: currentCheckin?.avatar_color || 'var(--color-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.5rem',
                        fontWeight: 800,
                        color: '#ffffff',
                        boxShadow: `0 0 20px ${currentCheckin?.avatar_color || 'var(--color-primary)'}66`,
                      }}
                    >
                      {currentSpeakerName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {t('liveMeeting.currentSpeaker')}
                      </span>
                      <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)' }}>
                        {currentSpeakerName}
                      </h3>
                      {currentCheckin?.role && (
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                          {currentCheckin.role} • {currentCheckin.mood}
                        </p>
                      )}
                    </div>
                  </div>

                  {currentCheckin ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
                      <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>
                          ONTEM:
                        </span>
                        <p style={{ whiteSpace: 'pre-wrap', color: 'var(--text-main)' }}>
                          {currentCheckin.yesterday}
                        </p>
                      </div>

                      <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>
                          HOJE:
                        </span>
                        <p style={{ whiteSpace: 'pre-wrap', color: 'var(--text-main)' }}>
                          {currentCheckin.today}
                        </p>
                      </div>

                      {currentCheckin.has_blockers && (
                        <div
                          style={{
                            backgroundColor: 'var(--color-blocker-bg)',
                            border: '1px solid var(--color-blocker-border)',
                            padding: '0.75rem 1rem',
                            borderRadius: 'var(--radius-md)',
                          }}
                        >
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-blocker)', display: 'block', marginBottom: '0.2rem' }}>
                            🚨 IMPEDIMENTO:
                          </span>
                          <p style={{ whiteSpace: 'pre-wrap', color: 'var(--text-main)', fontWeight: 600 }}>
                            {currentCheckin.blockers}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: '1.5rem',
                        backgroundColor: 'var(--bg-subtle)',
                        borderRadius: 'var(--radius-md)',
                        textAlign: 'center',
                        color: 'var(--text-muted)',
                      }}
                    >
                      <AlertCircle size={24} style={{ margin: '0 auto 0.5rem', color: 'var(--color-warning)' }} />
                      <p>Este participante ainda não enviou o check-in por escrito.</p>
                    </div>
                  )}
                </div>

                {/* Right: Circular / Digital Countdown Timer & Controls */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '1.25rem',
                    borderLeft: '1px solid var(--border-subtle)',
                    paddingLeft: '1.5rem',
                  }}
                >
                  {/* Digital Clock */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                    }}
                  >
                    <div
                      className="mono-text"
                      style={{
                        fontSize: '3.75rem',
                        fontWeight: 800,
                        letterSpacing: '-0.02em',
                        color: isTimeWarning ? 'var(--color-blocker)' : 'var(--text-main)',
                        transition: 'color 0.2s ease',
                      }}
                    >
                      {formatTime(secondsRemaining)}
                    </div>
                    {isTimeWarning && (
                      <span
                        style={{
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          color: 'var(--color-blocker)',
                          textTransform: 'uppercase',
                          animation: 'pulse-blocker 1s infinite ease-in-out',
                        }}
                      >
                        {t('liveMeeting.timeWarning')}
                      </span>
                    )}
                  </div>

                  {/* Timer Controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button
                      onClick={handleToggleTimer}
                      className={meetingState.timer_is_running ? 'btn-secondary' : 'btn-primary'}
                      style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: 'var(--radius-full)',
                        padding: 0,
                      }}
                      title={meetingState.timer_is_running ? t('liveMeeting.pauseTimer') : t('liveMeeting.startTimer')}
                    >
                      {meetingState.timer_is_running ? <Pause size={20} /> : <Play size={20} style={{ marginLeft: '2px' }} />}
                    </button>

                    <button
                      onClick={handleResetTimer}
                      className="btn-secondary"
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: 'var(--radius-full)',
                        padding: 0,
                      }}
                      title={t('liveMeeting.resetTimer')}
                    >
                      <RotateCcw size={18} />
                    </button>
                  </div>

                  {/* Quick Preset Buttons & Bonus Time */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.45rem', marginTop: '0.25rem' }}>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      {[60, 90, 120, 180].map((sec) => (
                        <button
                          key={sec}
                          type="button"
                          onClick={() => {
                            onResetTimer(date, sec);
                            setSecondsRemaining(sec);
                          }}
                          style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            backgroundColor: 'var(--bg-subtle)',
                            border: '1px solid var(--border-subtle)',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                          }}
                          title={`Ajustar tempo para ${sec}s`}
                        >
                          {sec >= 60 ? `${sec / 60}m` : `${sec}s`}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const next = secondsRemaining + 30;
                        onStartTimer(date, next);
                        setSecondsRemaining(next);
                      }}
                      style={{
                        padding: '0.2rem 0.65rem',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.725rem',
                        fontWeight: 700,
                        backgroundColor: 'var(--color-primary-subtle)',
                        border: '1px solid var(--border-primary)',
                        color: 'var(--color-primary)',
                        cursor: 'pointer',
                      }}
                      title="Adicionar 30 segundos de tolerância/bônus"
                    >
                      +30s Bônus
                    </button>
                  </div>
                </div>
              </div>

              {/* Bottom Turn Navigation Controls */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                <button
                  onClick={() => onPrevSpeaker(date)}
                  disabled={currentIndex === 0}
                  className="btn-secondary"
                  style={{ opacity: currentIndex === 0 ? 0.4 : 1 }}
                >
                  <SkipBack size={16} />
                  <span>{t('liveMeeting.prevTurn')}</span>
                </button>

                {currentIndex + 1 >= allSpeakerNames.length ? (
                  <button onClick={handleFinish} className="btn-primary" style={{ backgroundColor: 'var(--color-success)' }}>
                    <Trophy size={18} />
                    <span>{t('liveMeeting.finishMeeting')}</span>
                  </button>
                ) : (
                  <button onClick={() => onNextSpeaker(date)} className="btn-primary">
                    <span>{t('liveMeeting.nextTurn')}</span>
                    <SkipForward size={16} />
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
