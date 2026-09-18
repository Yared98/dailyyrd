import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Plus, Users } from 'lucide-react';

interface CreateBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: {
    title: string;
    description: string;
    meeting_timer_seconds: number;
    target_time?: string;
  }) => Promise<void>;
}

export const CreateBoardModal: React.FC<CreateBoardModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [timerSeconds, setTimerSeconds] = useState(90);
  const [targetTime, setTargetTime] = useState('09:30');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg(t('createModal.boardNamePlaceholder'));
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await onCreate({
        title: title.trim(),
        description: description.trim(),
        meeting_timer_seconds: Number(timerSeconds) || 90,
        target_time: targetTime.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao criar time');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
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
            <Users size={20} color="var(--color-primary)" />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
              {t('createModal.title')}
            </h2>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
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

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
              {t('createModal.boardName')} *
            </label>
            <input
              type="text"
              className="input-field"
              placeholder={t('createModal.boardNamePlaceholder')}
              value={title}
              maxLength={100}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
              {t('createModal.description')}
            </label>
            <input
              type="text"
              className="input-field"
              placeholder={t('createModal.descriptionPlaceholder')}
              value={description}
              maxLength={1000}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                {t('createModal.timerSeconds')}
              </label>
              <input
                type="number"
                className="input-field"
                min={30}
                max={600}
                step={15}
                value={timerSeconds}
                onChange={(e) => setTimerSeconds(Number(e.target.value))}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                {t('createModal.targetTime')}
              </label>
              <input
                type="time"
                className="input-field"
                value={targetTime}
                onChange={(e) => setTargetTime(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem' }}>
            <button type="button" onClick={onClose} className="btn-secondary">
              {t('createModal.cancel')}
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              <Plus size={16} />
              <span>{isSubmitting ? t('createModal.creating') : t('createModal.create')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
