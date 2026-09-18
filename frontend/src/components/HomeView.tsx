import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Clock,
  AlertOctagon,
  Play,
  ArrowRight,
  History,
  Trash2,
  ExternalLink,
  Share2,
  Check,
  Sun,
  Moon,
  Globe,
} from 'lucide-react';
import { getRecentBoards, removeRecentBoard, type RecentBoard } from '../utils/session';
import { EcosystemSwitcher } from './EcosystemSwitcher';
import { GithubIcon, Footer } from './Footer';

interface HomeViewProps {
  onCreate: (data: {
    title: string;
    description: string;
    meeting_timer_seconds: number;
    target_time?: string;
  }) => Promise<void>;
  onSelectBoard: (boardId: string) => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onCreate,
  onSelectBoard,
  theme = 'dark',
  onToggleTheme,
}) => {
  const { t, i18n } = useTranslation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [timerSeconds, setTimerSeconds] = useState(90);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [recentBoards, setRecentBoards] = useState<RecentBoard[]>(() => getRecentBoards());
  const [copiedBoardId, setCopiedBoardId] = useState<string | null>(null);

  const toggleLanguage = () => {
    const next = i18n.language.startsWith('en') ? 'pt' : 'en';
    i18n.changeLanguage(next);
  };

  const timerOptions = [
    { label: '45s', value: 45 },
    { label: '60s', value: 60 },
    { label: '90s', value: 90 },
    { label: '120s', value: 120 },
  ];

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
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao criar time');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyInvite = (boardId: string) => {
    const url = `${window.location.origin}/board/${boardId}`;
    navigator.clipboard.writeText(url);
    setCopiedBoardId(boardId);
    setTimeout(() => setCopiedBoardId(null), 2000);
  };

  const handleRemoveBoard = (boardId: string) => {
    const updated = removeRecentBoard(boardId);
    setRecentBoards(updated);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem',
        background: 'var(--bg-canvas-radial, radial-gradient(circle at 50% 20%, #151d32 0%, var(--bg-canvas) 80%))',
        position: 'relative',
        transition: 'background var(--transition-smooth)',
      }}
    >
      {/* Top Bar Controls (Ecosystem, Language, Theme, GitHub) */}
      <div
        style={{
          position: 'absolute',
          top: '1.25rem',
          right: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          zIndex: 10,
        }}
      >
        <EcosystemSwitcher currentApp="daily" />

        {/* Alternador de Idioma */}
        <button
          onClick={toggleLanguage}
          className="btn-secondary"
          style={{
            padding: '0.35rem 0.65rem',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.75rem',
            fontWeight: 700,
          }}
          title={t('app.languageToggle')}
        >
          <Globe size={13} />
          <span>{i18n.language.startsWith('en') ? 'EN' : 'PT'}</span>
        </button>

        {/* Alternador de Tema */}
        {onToggleTheme && (
          <button
            onClick={onToggleTheme}
            className="btn-secondary"
            style={{
              padding: '0.35rem 0.65rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.75rem',
              fontWeight: 600,
            }}
            title={theme === 'dark' ? t('app.themeToggle') : t('app.themeToggle')}
          >
            {theme === 'dark' ? <Sun size={14} color="#fbbf24" /> : <Moon size={14} color="var(--color-primary)" />}
          </button>
        )}

        {/* Link GitHub */}
        <a
          href="https://github.com/Yared98/dailyyrd"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary"
          style={{
            padding: '0.35rem 0.55rem',
            borderRadius: 'var(--radius-full)',
            display: 'inline-flex',
            alignItems: 'center',
            textDecoration: 'none',
            color: 'inherit',
          }}
          title={t('footer.github_title', 'Ver código-fonte do DailyYrd no GitHub')}
          aria-label="GitHub"
        >
          <GithubIcon size={14} />
        </a>
      </div>

      {/* Main Glass Card */}
      <div className="glass-modal" style={{ maxWidth: 540, width: '100%', padding: '2.5rem' }}>
        {/* Logo / Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div
            style={{
              background: 'var(--color-primary-subtle)',
              border: '1px solid var(--border-primary)',
              padding: '0.55rem',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Clock size={24} color="var(--color-primary)" />
          </div>
          <div>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 800,
                color: 'var(--color-primary)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              DAILY YRD
            </span>
            <h1
              style={{
                fontSize: '1.5rem',
                fontWeight: 800,
                color: 'var(--text-main)',
                letterSpacing: '-0.02em',
                margin: 0,
              }}
            >
              {t('createModal.title')}
            </h1>
          </div>
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
          {t('app.tagline')}
        </p>

        {/* Features / Highlights */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <Clock size={16} color="var(--color-went-well, #10b981)" />
            <span>
              <strong>{t('home.pillar1Title')}:</strong> {t('home.pillar1Desc')}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <AlertOctagon size={16} color="var(--color-blocker, #f43f5e)" />
            <span>
              <strong>{t('home.pillar2Title')}:</strong> {t('home.pillar2Desc')}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <Play size={16} color="var(--color-action, #6366f1)" />
            <span>
              <strong>{t('home.pillar3Title')}:</strong> {t('home.pillar3Desc')}
            </span>
          </div>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'var(--color-blocker-bg)',
              border: '1px solid var(--color-blocker-border)',
              color: 'var(--color-blocker)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
              marginBottom: '1rem',
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: 'var(--text-main)',
                marginBottom: '0.4rem',
              }}
            >
              {t('createModal.boardName')} *
            </label>
            <input
              type="text"
              autoFocus
              required
              maxLength={100}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('createModal.boardNamePlaceholder')}
              style={{
                width: '100%',
                background: 'var(--bg-input, var(--bg-surface))',
                border: '1px solid var(--border-highlight, var(--border-subtle))',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem 1rem',
                color: 'var(--text-main)',
                fontSize: '0.95rem',
                outline: 'none',
                transition: 'border-color var(--transition-fast)',
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: 'var(--text-main)',
                marginBottom: '0.4rem',
              }}
            >
              {t('createModal.description')}
            </label>
            <input
              type="text"
              maxLength={200}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('createModal.descriptionPlaceholder')}
              style={{
                width: '100%',
                background: 'var(--bg-input, var(--bg-surface))',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '0.7rem 1rem',
                color: 'var(--text-main)',
                fontSize: '0.9rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Seletor de Tempo por Pessoa */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>
                {t('createModal.timerSeconds')}
              </label>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 700 }}>
                {timerSeconds}s {i18n.language.startsWith('en') ? 'per speaker' : 'por membro'}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
              {timerOptions.map((opt) => {
                const isSelected = timerSeconds === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTimerSeconds(opt.value)}
                    style={{
                      background: isSelected ? 'var(--color-primary)' : 'var(--bg-subtle)',
                      border: isSelected ? '1px solid var(--color-primary)' : '1px solid var(--border-subtle)',
                      color: isSelected ? '#ffffff' : 'var(--text-muted)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.5rem 0.25rem',
                      fontSize: '0.75rem',
                      fontWeight: isSelected ? 700 : 500,
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !title.trim()}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              background: 'var(--color-primary)',
              border: 'none',
              color: '#ffffff',
              padding: '0.85rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.95rem',
              fontWeight: 700,
              cursor: isSubmitting || !title.trim() ? 'not-allowed' : 'pointer',
              opacity: isSubmitting || !title.trim() ? 0.6 : 1,
              boxShadow: 'var(--shadow-sm)',
              transition: 'all var(--transition-fast)',
              marginTop: '0.4rem',
            }}
          >
            <span>{isSubmitting ? t('createModal.creating') : t('createModal.create')}</span>
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Histórico de Times Recentes */}
        {recentBoards.length > 0 && (
          <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 700 }}>
                <History size={15} color="var(--color-primary)" />
                <span>{t('home.recentBoardsTitle')}</span>
              </div>
              <span
                style={{
                  fontSize: '0.72rem',
                  color: 'var(--text-dim)',
                  background: 'var(--bg-subtle)',
                  padding: '0.15rem 0.5rem',
                  borderRadius: 'var(--radius-full)',
                }}
              >
                {recentBoards.length}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: 220, overflowY: 'auto', paddingRight: '0.25rem' }}>
              {recentBoards.map((b) => (
                <div
                  key={b.id}
                  style={{
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.75rem 0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        color: 'var(--text-main)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {b.title}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.15rem' }}>
                      {new Date(b.visitedAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                    {/* Botão Copiar Link */}
                    <button
                      type="button"
                      onClick={() => handleCopyInvite(b.id)}
                      title={t('board.shareInvite')}
                      style={{
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '0.35rem 0.55rem',
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                      }}
                    >
                      {copiedBoardId === b.id ? (
                        <Check size={12} color="var(--color-went-well, #10b981)" />
                      ) : (
                        <Share2 size={12} />
                      )}
                      <span>{copiedBoardId === b.id ? t('exportModal.copied') : 'Link'}</span>
                    </button>

                    {/* Botão Acessar Board */}
                    <button
                      type="button"
                      onClick={() => onSelectBoard(b.id)}
                      style={{
                        background: 'var(--color-primary-subtle)',
                        border: '1px solid var(--color-primary)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '0.35rem 0.65rem',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: 'var(--color-primary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        transition: 'all var(--transition-fast)',
                      }}
                    >
                      <span>Acessar</span>
                      <ExternalLink size={12} />
                    </button>

                    {/* Botão Remover do Histórico */}
                    <button
                      type="button"
                      onClick={() => handleRemoveBoard(b.id)}
                      title="Remover do histórico"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-dim)',
                        cursor: 'pointer',
                        padding: '0.3rem',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer no rodapé da página */}
      <Footer style={{ borderTop: 'none', marginTop: '1.5rem', width: '100%', maxWidth: 540 }} />
    </div>
  );
};
