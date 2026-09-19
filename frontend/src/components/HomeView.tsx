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
  Shield,
  AlertTriangle,
  Bot,
} from 'lucide-react';
import {
  getRecentBoards,
  removeRecentBoard,
  getSavedUserProfile,
  saveUserProfile,
  type RecentBoard,
} from '../utils/session';
import { EcosystemSwitcher } from './EcosystemSwitcher';
import { McpModal } from './McpModal';
import { GithubIcon, Footer } from './Footer';
import { copyToClipboard } from '../utils/clipboard';

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
  const [userName, setUserName] = useState(() => getSavedUserProfile().name);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [timerSeconds, setTimerSeconds] = useState(90);
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [joinCode, setJoinCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [recentBoards, setRecentBoards] = useState<RecentBoard[]>(() => getRecentBoards());
  const [boardToDelete, setBoardToDelete] = useState<RecentBoard | null>(null);
  const [copiedBoardId, setCopiedBoardId] = useState<string | null>(null);
  const [showMcpModal, setShowMcpModal] = useState(false);

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    if (userName.trim()) {
      saveUserProfile({ name: userName.trim() });
    }
    onSelectBoard(joinCode.trim());
  };

  const facilitatorBoards = recentBoards.filter((b) => b.role === 'facilitator' || b.facilitatorToken);
  const memberBoards = recentBoards.filter((b) => b.role !== 'facilitator' && !b.facilitatorToken);

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

    if (userName.trim()) {
      saveUserProfile({ name: userName.trim() });
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

  const handleCopyInvite = async (boardId: string) => {
    const url = `${window.location.origin}/board/${boardId}`;
    const success = await copyToClipboard(url);
    if (success) {
      setCopiedBoardId(boardId);
      setTimeout(() => setCopiedBoardId(null), 2000);
    }
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
        background: 'transparent',
        position: 'relative',
        transition: 'background var(--transition-smooth)',
      }}
    >
      {/* Top Menu Bar Padronizado */}
      <header className="app-header">
        <div className="header-left">
          <a href="/" className="brand-logo" title="DailyYrd - Início" aria-label="DailyYrd Home">
            <div className="brand-icon-box">
              <Clock size={18} />
            </div>
            <span className="brand-title">
              Daily<span style={{ color: 'var(--color-primary)' }}>Yrd</span>
            </span>
          </a>
          <EcosystemSwitcher currentApp="daily" />
        </div>

        <div className="header-right">
          {/* Botão MCP Padronizado */}
          <button
            onClick={() => setShowMcpModal(true)}
            className="btn-secondary"
            style={{
              padding: '0.35rem 0.65rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.75rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: 'var(--color-primary-subtle, rgba(99, 102, 241, 0.15))',
              border: '1px solid var(--border-primary, rgba(99, 102, 241, 0.35))',
              color: 'var(--color-primary)',
              cursor: 'pointer',
              transition: 'all var(--transition-fast, 0.15s ease)',
            }}
            title={t('mcp.button_title', 'Configurar Servidor MCP (IA)')}
          >
            <Bot size={13} />
            <span>MCP</span>
          </button>

          {/* Alternador de Idioma */}
          <button
            onClick={toggleLanguage}
            className="btn-secondary"
            style={{
              padding: '0.35rem 0.65rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.75rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-main)',
              cursor: 'pointer',
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
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-main)',
                cursor: 'pointer',
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
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
            }}
            title={t('footer.github_title', 'Ver código-fonte do DailyYrd no GitHub')}
            aria-label="GitHub"
          >
            <GithubIcon size={14} />
          </a>
        </div>
      </header>

      {/* Main Content Area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem 1.5rem',
          width: '100%',
        }}
      >
        {/* Hero Header Outside Card */}
        <div style={{ maxWidth: '480px', width: '100%', textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', padding: '0.35rem 0.85rem', borderRadius: 'var(--radius-full)', marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>
            <Clock size={14} color="var(--color-primary)" />
            <span>DailyYrd</span>
          </div>

        <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.2 }}>
          {t('createModal.title')}
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', marginTop: '0.5rem' }}>
          {t('app.tagline')}
        </p>
      </div>

      {/* Main Glass Card */}
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-highlight)',
          borderRadius: 'var(--radius-2xl)',
          padding: '2rem',
          maxWidth: '480px',
          width: '100%',
          boxShadow: 'var(--shadow-lg)',
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Navigation Tabs (Segmented Control) */}
        <div
          style={{
            display: 'flex',
            background: 'var(--bg-subtle)',
            padding: '4px',
            borderRadius: 'var(--radius-lg)',
            marginBottom: '1.5rem',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            style={{
              flex: 1,
              padding: '0.5rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.875rem',
              fontWeight: 600,
              background: activeTab === 'create' ? 'var(--bg-surface-elevated, var(--bg-surface))' : 'transparent',
              color: activeTab === 'create' ? 'var(--text-main)' : 'var(--text-muted)',
              border: activeTab === 'create' ? '1px solid var(--border-highlight)' : '1px solid transparent',
              boxShadow: activeTab === 'create' ? 'var(--shadow-sm)' : 'none',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
            }}
          >
            {t('home.tabCreate')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('join')}
            style={{
              flex: 1,
              padding: '0.5rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.875rem',
              fontWeight: 600,
              background: activeTab === 'join' ? 'var(--bg-surface-elevated, var(--bg-surface))' : 'transparent',
              color: activeTab === 'join' ? 'var(--text-main)' : 'var(--text-muted)',
              border: activeTab === 'join' ? '1px solid var(--border-highlight)' : '1px solid transparent',
              boxShadow: activeTab === 'join' ? 'var(--shadow-sm)' : 'none',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
            }}
          >
            {t('home.tabJoin')}
          </button>
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

        {activeTab === 'create' ? (
          <>
            {/* Features / Highlights */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <Clock size={16} color="var(--color-went-well, #10b981)" style={{ flexShrink: 0 }} />
                <span><strong>{t('home.pillar1Title')}</strong> {t('home.pillar1Desc')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <AlertOctagon size={16} color="var(--color-blocker, #f43f5e)" style={{ flexShrink: 0 }} />
                <span><strong>{t('home.pillar2Title')}</strong> {t('home.pillar2Desc')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <Play size={16} color="var(--color-action, #6366f1)" style={{ flexShrink: 0 }} />
                <span><strong>{t('home.pillar3Title')}</strong> {t('home.pillar3Desc')}</span>
              </div>
            </div>

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
              {t('checkinModal.nameLabel', 'Seu Nome / Apelido')} *
            </label>
            <input
              type="text"
              required
              maxLength={60}
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder={t('checkinModal.namePlaceholder', 'Como o time te conhece?')}
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
                      background: isSelected ? 'var(--color-primary-subtle)' : 'var(--bg-subtle)',
                      border: isSelected ? '1.5px solid var(--color-primary)' : '1px solid var(--border-subtle)',
                      color: isSelected ? 'var(--color-primary)' : 'var(--text-muted)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.5rem 0.25rem',
                      fontSize: '0.75rem',
                      fontWeight: isSelected ? 700 : 500,
                      cursor: 'pointer',
                      boxShadow: isSelected ? '0 0 10px var(--color-primary-glow)' : 'none',
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
            disabled={isSubmitting || !title.trim() || !userName.trim()}
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
              cursor: isSubmitting || !title.trim() || !userName.trim() ? 'not-allowed' : 'pointer',
              opacity: isSubmitting || !title.trim() || !userName.trim() ? 0.6 : 1,
              boxShadow: 'var(--shadow-sm)',
              transition: 'all var(--transition-fast)',
              marginTop: '0.4rem',
            }}
          >
            <span>{isSubmitting ? t('createModal.creating') : t('createModal.create')}</span>
            <ArrowRight size={16} />
          </button>
        </form>
          </>
        ) : (
          /* Formulário de Entrada */
          <form onSubmit={handleJoinSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                {t('checkinModal.nameLabel', 'Seu Nome / Apelido')} *
              </label>
              <input
                type="text"
                required
                maxLength={60}
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder={t('checkinModal.namePlaceholder', 'Como o time te conhece?')}
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
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                {t('home.joinCodeLabel')}
              </label>
              <input
                type="text"
                autoFocus
                required
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder={t('home.joinCodePlaceholder')}
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

            <button
              type="submit"
              disabled={!joinCode.trim() || !userName.trim()}
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
                cursor: !joinCode.trim() || !userName.trim() ? 'not-allowed' : 'pointer',
                opacity: !joinCode.trim() || !userName.trim() ? 0.6 : 1,
                boxShadow: 'var(--shadow-sm)',
                transition: 'all var(--transition-fast)',
                marginTop: '0.4rem',
              }}
            >
              <span>{t('home.joinButton')}</span>
              <ArrowRight size={16} />
            </button>
          </form>
        )}

        {/* Histórico: Times que Facilito */}
        {facilitatorBoards.length > 0 && (
          <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 700 }}>
                <Shield size={15} color="var(--color-primary)" />
                <span>{t('home.recentFacilitatorTitle')}</span>
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
                {facilitatorBoards.length}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: 220, overflowY: 'auto', paddingRight: '0.25rem' }}>
              {facilitatorBoards.map((b) => (
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
                      onClick={() => setBoardToDelete(b)}
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
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-blocker)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-dim)'; }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Histórico: Times que Participo */}
        {memberBoards.length > 0 && (
          <div style={{ marginTop: facilitatorBoards.length > 0 ? '1.25rem' : '2rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 700 }}>
                <History size={15} color="var(--text-dim)" />
                <span>{t('home.recentParticipantTitle')}</span>
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
                {memberBoards.length}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: 220, overflowY: 'auto', paddingRight: '0.25rem' }}>
              {memberBoards.map((b) => (
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
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '0.35rem 0.65rem',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: 'var(--text-main)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                      }}
                    >
                      <span>Acessar</span>
                      <ExternalLink size={12} />
                    </button>

                    {/* Botão Remover do Histórico */}
                    <button
                      type="button"
                      onClick={() => setBoardToDelete(b)}
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
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-blocker)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-dim)'; }}
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

      {/* Modal de Confirmação para Remoção de Time */}
      {boardToDelete && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(9, 13, 22, 0.75)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1.5rem',
          }}
        >
          <div
            style={{
              maxWidth: 440,
              width: '100%',
              padding: '1.75rem',
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-highlight)',
              borderRadius: 'var(--radius-xl)',
              boxShadow: 'var(--shadow-lg)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
              <div
                style={{
                  background: 'var(--color-blocker-bg)',
                  border: '1px solid var(--color-blocker-border)',
                  color: 'var(--color-blocker)',
                  padding: '0.6rem',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  flexShrink: 0,
                }}
              >
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  {t('home.removeTitle')}
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0.4rem 0 0 0', lineHeight: 1.45 }}>
                  {t('home.removeConfirm1')} <strong style={{ color: 'var(--text-main)' }}>"{boardToDelete.title}"</strong> {t('home.removeConfirm2')}
                </p>
              </div>
            </div>

            <div
              style={{
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.65rem 0.85rem',
                fontSize: '0.75rem',
                color: 'var(--text-dim)',
                lineHeight: 1.4,
              }}
            >
              {t('home.removeWarning')}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setBoardToDelete(null)}
                style={{
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.55rem 1rem',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: 'var(--text-main)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
              >
                {t('home.cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  handleRemoveBoard(boardToDelete.id);
                  setBoardToDelete(null);
                }}
                style={{
                  background: 'var(--color-blocker)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.55rem 1.1rem',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <Trash2 size={14} />
                <span>{t('home.confirmRemove')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer no rodapé da página */}
      <Footer style={{ borderTop: 'none', marginTop: '2.5rem', width: '100%', maxWidth: '480px' }} />

      </div>

      {/* Modal MCP */}
      <McpModal
        isOpen={showMcpModal}
        onClose={() => setShowMcpModal(false)}
      />
    </div>
  );
};
