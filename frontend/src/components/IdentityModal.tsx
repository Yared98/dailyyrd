import React, { useState, useEffect } from 'react';
import { User, X, Check, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getSavedUserProfile, saveUserProfile } from '../utils/session';

interface IdentityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  isMandatory?: boolean;
}

export const IdentityModal: React.FC<IdentityModalProps> = ({
  isOpen,
  onClose,
  onSave,
  isMandatory = false,
}) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(getSavedUserProfile().name);
      setError(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = name.trim();
    if (!clean) {
      setError(true);
      return;
    }
    saveUserProfile({ name: clean });
    onSave(clean);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={isMandatory ? undefined : onClose}
    >
      <div
        className="glass-modal"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '1.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          backgroundColor: 'var(--bg-surface-elevated, #1e293b)',
          border: '1px solid var(--border-highlight, var(--border-subtle))',
          borderRadius: 'var(--radius-lg, 16px)',
          boxShadow: 'var(--shadow-xl)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-primary-subtle, rgba(99, 102, 241, 0.15))',
                border: '1px solid var(--border-primary, rgba(99, 102, 241, 0.35))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-primary)',
              }}
            >
              {isMandatory ? <Clock size={20} /> : <User size={20} />}
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                {isMandatory
                  ? t('identity.modal_welcome_title', 'Bem-vindo ao DailyYrd!')
                  : t('identity.modal_title', 'Identificação do Membro')}
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                {isMandatory
                  ? t('identity.modal_welcome_subtitle', 'Como você gostaria de ser identificado neste quadro da daily?')
                  : t('identity.modal_subtitle', 'Atualize seu nome para identificação nos check-ins e reuniões.')}
              </p>
            </div>
          </div>
          {!isMandatory && (
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                padding: '0.35rem',
              }}
            >
              <X size={18} />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: 'var(--text-muted)',
                marginBottom: '0.4rem',
              }}
            >
              {t('checkinModal.nameLabel', 'Seu Nome / Apelido')} *
            </label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(false);
              }}
              placeholder={t('checkinModal.namePlaceholder', 'Ex: Mariana, Carlos Silva...')}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                border: error ? '1px solid var(--color-blocker, #f43f5e)' : '1px solid var(--border-subtle)',
                background: 'var(--bg-input, var(--bg-surface))',
                color: 'var(--text-main)',
                fontSize: '0.9rem',
                fontWeight: 600,
                outline: 'none',
              }}
            />
            {error && (
              <span style={{ fontSize: '0.72rem', color: 'var(--color-blocker, #f43f5e)', marginTop: '0.3rem', display: 'block' }}>
                {t('identity.name_required', 'Por favor, informe seu nome para continuar.')}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.25rem' }}>
            {!isMandatory && (
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
                style={{ padding: '0.5rem 1rem', fontSize: '0.82rem' }}
              >
                {t('common.cancel', 'Cancelar')}
              </button>
            )}
            <button
              type="submit"
              className="btn-primary"
              style={{
                padding: '0.5rem 1.25rem',
                fontSize: '0.82rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <Check size={15} />
              <span>{isMandatory ? t('identity.enter_btn', 'Acessar Quadro') : t('identity.save_btn', 'Salvar Nome')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
