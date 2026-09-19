import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, CheckCircle, AlertTriangle, Sparkles } from 'lucide-react';
import type { CheckIn, SaveCheckInPayload } from '../types';
import { getSavedUserProfile, saveUserProfile, getSessionHash } from '../utils/session';

interface CheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  existingCheckIn?: CheckIn | null;
  onSave: (payload: SaveCheckInPayload) => Promise<void>;
}

const COLOR_PRESETS = [
  '#6366F1', // Indigo
  '#10B981', // Emerald
  '#F43F5E', // Rose
  '#8B5CF6', // Violet
  '#F59E0B', // Amber
  '#06B6D4', // Cyan
  '#EC4899', // Pink
  '#3B82F6', // Blue
];

export const CheckInModal: React.FC<CheckInModalProps> = ({
  isOpen,
  onClose,
  date,
  existingCheckIn,
  onSave,
}) => {
  const { t } = useTranslation();
  const savedProfile = getSavedUserProfile();

  const [userName, setUserName] = useState(existingCheckIn?.user_name || savedProfile.name);
  const [role, setRole] = useState(existingCheckIn?.role || savedProfile.role);
  const [avatarColor, setAvatarColor] = useState(
    existingCheckIn?.avatar_color || savedProfile.avatarColor || '#6366F1'
  );
  const [yesterday, setYesterday] = useState(existingCheckIn?.yesterday || '');
  const [today, setToday] = useState(existingCheckIn?.today || '');
  const [blockers, setBlockers] = useState(existingCheckIn?.blockers || '');
  const [hasBlockers, setHasBlockers] = useState(existingCheckIn?.has_blockers || false);
  const [mood, setMood] = useState(existingCheckIn?.mood || '⚡ No Foco');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (existingCheckIn) {
      setUserName(existingCheckIn.user_name);
      setRole(existingCheckIn.role || '');
      setAvatarColor(existingCheckIn.avatar_color);
      setYesterday(existingCheckIn.yesterday);
      setToday(existingCheckIn.today);
      const blockerText = existingCheckIn.blockers || '';
      setBlockers(blockerText);
      setHasBlockers(existingCheckIn.has_blockers && blockerText.trim().length > 0);
      setMood(existingCheckIn.mood || '⚡ No Foco');
    } else {
      const prof = getSavedUserProfile();
      setUserName(prof.name);
      setRole(prof.role);
      setAvatarColor(prof.avatarColor || '#6366F1');
      setYesterday('');
      setToday('');
      setBlockers('');
      setHasBlockers(false);
      setMood('⚡ No Foco');
    }
  }, [existingCheckIn, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) {
      setErrorMsg(t('checkinModal.namePlaceholder'));
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      saveUserProfile({
        name: userName.trim(),
        role: role.trim(),
        avatarColor,
      });

      const sessionHash = getSessionHash();
      const cleanedBlockers = blockers.trim();
      const isBlocked = hasBlockers || cleanedBlockers.length > 0;
      const finalBlockers = cleanedBlockers.length > 0
        ? cleanedBlockers
        : (hasBlockers ? 'Impedimento relatado / Preciso de ajuda' : '');

      await onSave({
        date,
        user_name: userName.trim(),
        role: role.trim() || undefined,
        avatar_color: avatarColor,
        yesterday: yesterday.trim(),
        today: today.trim(),
        blockers: finalBlockers,
        has_blockers: isBlocked,
        mood,
        session_hash: sessionHash,
      });

      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar check-in');
    } finally {
      setIsSubmitting(false);
    }
  };

  const moodOptions = [
    { label: t('checkinModal.moodOptionFocus'), value: '⚡ No Foco' },
    { label: t('checkinModal.moodOptionMotivated'), value: '🚀 Super Motivado' },
    { label: t('checkinModal.moodOptionCoffee'), value: '☕ Preciso de Café' },
    { label: t('checkinModal.moodOptionChill'), value: '😎 Tranquilo' },
    { label: t('checkinModal.moodOptionOverloaded'), value: '⚠️ Sobrecarregado' },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Sparkles size={20} color="var(--color-primary)" />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
              {existingCheckIn ? t('checkinModal.titleEdit') : t('checkinModal.titleNew')}
            </h2>
            <span
              style={{
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                backgroundColor: 'var(--bg-subtle)',
                padding: '0.15rem 0.5rem',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              {date}
            </span>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {errorMsg && (
            <div
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: 'var(--color-blocker-bg)',
                border: '1px solid var(--color-blocker-border)',
                color: 'var(--color-blocker)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem',
              }}
            >
              {errorMsg}
            </div>
          )}

          {/* User Info Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                <span>{t('checkinModal.nameLabel')} *</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                  ({t('identity.verified_identity', 'Sua Identidade')})
                </span>
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder={t('checkinModal.namePlaceholder')}
                  value={userName}
                  maxLength={60}
                  onChange={(e) => setUserName(e.target.value)}
                  required
                  style={{ paddingLeft: '2.4rem' }}
                />
                <div
                  style={{
                    position: 'absolute',
                    left: '0.55rem',
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    backgroundColor: avatarColor,
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  {userName ? userName.charAt(0).toUpperCase() : '?'}
                </div>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                {t('checkinModal.roleLabel')}
              </label>
              <input
                type="text"
                className="input-field"
                placeholder={t('checkinModal.rolePlaceholder')}
                value={role}
                maxLength={60}
                onChange={(e) => setRole(e.target.value)}
              />
            </div>
          </div>

          {/* Avatar Color Picker & Mood */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'center' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.45rem' }}>
                {t('checkinModal.avatarColor')}
              </label>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setAvatarColor(c)}
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: c,
                      border: avatarColor === c ? '2px solid #ffffff' : '1px solid rgba(0,0,0,0.2)',
                      boxShadow: avatarColor === c ? `0 0 10px ${c}` : 'none',
                      transform: avatarColor === c ? 'scale(1.15)' : 'scale(1)',
                      transition: 'all var(--transition-fast)',
                    }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.45rem' }}>
                {t('checkinModal.moodLabel')}
              </label>
              <select
                className="input-field"
                value={mood}
                onChange={(e) => setMood(e.target.value)}
              >
                {moodOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Question 1: Yesterday */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.35rem' }}>
              {t('checkinModal.yesterdayLabel')}
            </label>
            <textarea
              className="input-field"
              rows={3}
              placeholder={t('checkinModal.yesterdayPlaceholder')}
              value={yesterday}
              maxLength={5000}
              onChange={(e) => setYesterday(e.target.value)}
              required
            />
          </div>

          {/* Question 2: Today */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.35rem' }}>
              {t('checkinModal.todayLabel')}
            </label>
            <textarea
              className="input-field"
              rows={3}
              placeholder={t('checkinModal.todayPlaceholder')}
              value={today}
              maxLength={5000}
              onChange={(e) => setToday(e.target.value)}
              required
            />
          </div>

          {/* Question 3: Blockers */}
          <div
            style={{
              padding: '1rem',
              backgroundColor: hasBlockers ? 'var(--color-blocker-bg)' : 'var(--bg-subtle)',
              border: `1px solid ${hasBlockers ? 'var(--color-blocker-border)' : 'var(--border-subtle)'}`,
              borderRadius: 'var(--radius-lg)',
              transition: 'all var(--transition-fast)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: hasBlockers ? 'var(--color-blocker)' : 'inherit',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={hasBlockers}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setHasBlockers(checked);
                    if (!checked) {
                      setBlockers('');
                    }
                  }}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--color-blocker)' }}
                />
                {t('checkinModal.hasBlockersCheckbox')}
              </label>
              {hasBlockers && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setHasBlockers(false);
                      setBlockers('');
                    }}
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      textDecoration: 'underline',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    Limpar impedimento
                  </button>
                  <AlertTriangle size={18} color="var(--color-blocker)" />
                </div>
              )}
            </div>

            <textarea
              className="input-field"
              rows={2}
              placeholder={t('checkinModal.blockersPlaceholder')}
              value={blockers}
              maxLength={2000}
              onChange={(e) => {
                const val = e.target.value;
                setBlockers(val);
                if (val.trim().length > 0) {
                  setHasBlockers(true);
                } else {
                  setHasBlockers(false);
                }
              }}
              style={{
                borderColor: hasBlockers ? 'var(--color-blocker-border)' : undefined,
              }}
            />
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" onClick={onClose} className="btn-secondary">
              {t('checkinModal.cancel')}
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              <CheckCircle size={16} />
              <span>{isSubmitting ? t('checkinModal.saving') : t('checkinModal.save')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
