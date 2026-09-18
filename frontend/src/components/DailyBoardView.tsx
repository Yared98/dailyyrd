import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Users,
  AlertOctagon,
  CheckCircle2,
  Clock,
  Search,
  PlusCircle,
  Play,
  FileText,
  Edit2,
  Trash2,
  Filter,
} from 'lucide-react';
import type { CheckIn, DailyBoard, LiveMeetingState } from '../types';
import { BlockerSpotlight } from './BlockerSpotlight';
import { getSessionHash } from '../utils/session';

interface DailyBoardViewProps {
  board: DailyBoard;
  date: string;
  checkins: CheckIn[];
  meetingState: LiveMeetingState;
  isFacilitator: boolean;
  userCheckinId?: string;
  onOpenCheckInModal: () => void;
  onOpenLiveMeetingModal: () => void;
  onOpenExportModal: () => void;
  onDeleteCheckIn: (id: string) => Promise<void>;
}

export const DailyBoardView: React.FC<DailyBoardViewProps> = ({
  board,
  checkins,
  meetingState,
  isFacilitator,
  userCheckinId,
  onOpenCheckInModal,
  onOpenLiveMeetingModal,
  onOpenExportModal,
  onDeleteCheckIn,
}) => {
  const { t } = useTranslation();
  const sessionHash = getSessionHash();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterBlockedOnly, setFilterBlockedOnly] = useState(false);

  // Check if current browser user already has submitted a check-in today
  const myCheckIn = checkins.find(
    (c) => (userCheckinId && c.id === userCheckinId) || (c.session_hash && c.session_hash === sessionHash)
  );

  // Reliable helper to test if check-in has an active impediment
  const isBlocked = (c: CheckIn) => c.has_blockers && !!c.blockers && c.blockers.trim().length > 0;

  // Filtered checkins
  const filteredCheckins = checkins.filter((item) => {
    if (filterBlockedOnly && !isBlocked(item)) {
      return false;
    }
    if (!searchQuery.trim()) return true;

    const q = searchQuery.toLowerCase();
    return (
      item.user_name.toLowerCase().includes(q) ||
      (item.role && item.role.toLowerCase().includes(q)) ||
      item.yesterday.toLowerCase().includes(q) ||
      item.today.toLowerCase().includes(q) ||
      item.blockers.toLowerCase().includes(q)
    );
  });

  const totalMembers = checkins.length;
  const blockersCount = checkins.filter(isBlocked).length;
  const unimpededCount = Math.max(0, totalMembers - blockersCount);

  return (
    <main style={{ flex: 1, maxWidth: '1440px', margin: '0 auto', width: '100%', padding: '2rem 1.75rem' }}>
      {/* Top Metrics Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '1.75rem',
        }}
      >
        {/* Metric 1: Total Check-ins */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              {t('board.checkInsCount')}
            </span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(99, 102, 241, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-primary)',
              }}
            >
              <Users size={16} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.5rem' }}>
            {totalMembers}
          </div>
        </div>

        {/* Metric 2: Blockers */}
        <div
          className="glass-panel"
          style={{
            padding: '1.25rem',
            borderColor: blockersCount > 0 ? 'var(--color-blocker-border)' : undefined,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              {t('board.blockersCount')}
            </span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: blockersCount > 0 ? 'var(--color-blocker-bg)' : 'var(--bg-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: blockersCount > 0 ? 'var(--color-blocker)' : 'var(--text-dim)',
              }}
            >
              <AlertOctagon size={16} />
            </div>
          </div>
          <div
            style={{
              fontSize: '2rem',
              fontWeight: 800,
              marginTop: '0.5rem',
              color: blockersCount > 0 ? 'var(--color-blocker)' : 'inherit',
            }}
          >
            {blockersCount}
          </div>
        </div>

        {/* Metric 3: Clear to go */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              {t('board.unimpeded')}
            </span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-success-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-success)',
              }}
            >
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.5rem', color: 'var(--color-success)' }}>
            {unimpededCount}
          </div>
        </div>

        {/* Metric 4: Scheduled time */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              {t('createModal.targetTime')}
            </span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
              }}
            >
              <Clock size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.5rem', color: 'var(--text-muted)' }}>
            {board.target_time || '09:30'}
          </div>
        </div>
      </div>

      {/* Blocker Spotlight Component */}
      <BlockerSpotlight checkins={checkins} />

      {/* Action and Filter Toolbar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '1.75rem',
        }}
      >
        {/* Search & Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '280px' }}>
          <div
            style={{
              position: 'relative',
              flex: 1,
              maxWidth: '380px',
            }}
          >
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '0.85rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-dim)',
              }}
            />
            <input
              type="text"
              placeholder={t('board.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field"
              style={{ paddingLeft: '2.4rem', fontSize: '0.875rem' }}
            />
          </div>

          <button
            onClick={() => setFilterBlockedOnly(!filterBlockedOnly)}
            className={filterBlockedOnly ? 'btn-blocker' : 'btn-secondary'}
            style={{ fontSize: '0.825rem', padding: '0.5rem 0.85rem' }}
          >
            <Filter size={14} />
            <span>{filterBlockedOnly ? t('board.filterBlockers') : t('board.filterAll')}</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Live Standup Button */}
          <button
            onClick={onOpenLiveMeetingModal}
            className="btn-secondary"
            style={{
              borderColor: meetingState.is_active ? 'var(--color-blocker-border)' : undefined,
              backgroundColor: meetingState.is_active ? 'var(--color-blocker-bg)' : undefined,
              color: meetingState.is_active ? 'var(--color-blocker)' : undefined,
            }}
          >
            <Play size={16} color={meetingState.is_active ? 'var(--color-blocker)' : 'var(--color-primary)'} />
            <span>
              {meetingState.is_active ? t('board.liveMeetingActive') : t('board.startLiveMeeting')}
            </span>
          </button>

          {/* Export Button */}
          <button onClick={onOpenExportModal} className="btn-secondary">
            <FileText size={16} />
            <span>{t('board.exportSummary')}</span>
          </button>

          {/* Check-in CTA Button */}
          <button onClick={onOpenCheckInModal} className="btn-primary">
            <PlusCircle size={16} />
            <span>{myCheckIn ? t('board.editCheckIn') : t('board.checkInButton')}</span>
          </button>
        </div>
      </div>

      {/* Member Check-in Cards Grid */}
      {filteredCheckins.length === 0 ? (
        <div
          className="glass-panel"
          style={{
            padding: '4rem 2rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--bg-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-primary)',
            }}
          >
            <Users size={32} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
            {t('board.noCheckinsYet')}
          </h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: '420px', fontSize: '0.9rem' }}>
            {t('board.beTheFirst')}
          </p>
          <button onClick={onOpenCheckInModal} className="btn-primary" style={{ marginTop: '0.5rem' }}>
            <PlusCircle size={16} />
            <span>{t('board.checkInButton')}</span>
          </button>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {filteredCheckins.map((item) => {
            const isMine = (userCheckinId && item.id === userCheckinId) || (item.session_hash && item.session_hash === sessionHash);
            const canDelete = isMine || isFacilitator;

            return (
              <div
                key={item.id}
                className="glass-panel"
                style={{
                  padding: '1.4rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  borderLeft: `4px solid ${isBlocked(item) ? 'var(--color-blocker)' : 'var(--color-success)'}`,
                  position: 'relative',
                  transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)',
                }}
              >
                {/* Card Header: Member info & Actions */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: item.avatar_color || 'var(--color-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.1rem',
                        fontWeight: 800,
                        color: '#ffffff',
                        boxShadow: `0 0 14px ${item.avatar_color || 'var(--color-primary)'}55`,
                      }}
                    >
                      {item.user_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <h4 style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-main)' }}>
                          {item.user_name}
                        </h4>
                        {isMine && (
                          <span
                            style={{
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              backgroundColor: 'rgba(99, 102, 241, 0.15)',
                              color: 'var(--color-primary)',
                              padding: '0.1rem 0.4rem',
                              borderRadius: 'var(--radius-full)',
                            }}
                          >
                            Você
                          </span>
                        )}
                      </div>
                      {item.role && (
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                          {item.role}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Badges & Edit/Delete actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {isBlocked(item) ? (
                      <span className="badge-blocker">
                        <AlertOctagon size={11} />
                        {t('board.blocked')}
                      </span>
                    ) : (
                      <span className="badge-clear">
                        <CheckCircle2 size={11} />
                        {t('board.unimpeded')}
                      </span>
                    )}

                    {isMine && (
                      <button
                        onClick={onOpenCheckInModal}
                        style={{
                          color: 'var(--text-dim)',
                          padding: '0.3rem',
                          borderRadius: 'var(--radius-sm)',
                        }}
                        title={t('board.editCheckIn')}
                      >
                        <Edit2 size={15} />
                      </button>
                    )}

                    {canDelete && (
                      <button
                        onClick={() => {
                          if (window.confirm('Excluir este check-in?')) {
                            onDeleteCheckIn(item.id);
                          }
                        }}
                        style={{
                          color: 'var(--text-dim)',
                          padding: '0.3rem',
                          borderRadius: 'var(--radius-sm)',
                        }}
                        title="Excluir check-in"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Mood Tag */}
                {item.mood && (
                  <div
                    style={{
                      alignSelf: 'flex-start',
                      fontSize: '0.775rem',
                      fontWeight: 600,
                      backgroundColor: 'var(--bg-subtle)',
                      padding: '0.2rem 0.6rem',
                      borderRadius: 'var(--radius-full)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {item.mood}
                  </div>
                )}

                {/* Question 1: Yesterday */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: 'var(--text-dim)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    1. Feito ontem
                  </span>
                  <div
                    style={{
                      backgroundColor: 'var(--bg-subtle)',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.875rem',
                      lineHeight: 1.45,
                      whiteSpace: 'pre-wrap',
                      color: 'var(--text-main)',
                    }}
                  >
                    {item.yesterday}
                  </div>
                </div>

                {/* Question 2: Today */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: 'var(--text-dim)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    2. Metas para hoje
                  </span>
                  <div
                    style={{
                      backgroundColor: 'var(--bg-subtle)',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.875rem',
                      lineHeight: 1.45,
                      whiteSpace: 'pre-wrap',
                      color: 'var(--text-main)',
                    }}
                  >
                    {item.today}
                  </div>
                </div>

                {/* Question 3: Blockers */}
                {isBlocked(item) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: 'var(--color-blocker)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      3. Impedimento / Bloqueio
                    </span>
                    <div
                      style={{
                        backgroundColor: 'var(--color-blocker-bg)',
                        border: '1px solid var(--color-blocker-border)',
                        padding: '0.65rem 0.85rem',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.875rem',
                        lineHeight: 1.45,
                        whiteSpace: 'pre-wrap',
                        color: 'var(--color-blocker)',
                        fontWeight: 600,
                      }}
                    >
                      {item.blockers}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
};
