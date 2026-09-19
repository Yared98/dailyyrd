import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Calendar,
  Clock,
  Copy,
  Check,
  Globe,
  Moon,
  Sun,
  Radio,
  PlusCircle,
  ChevronLeft,
  ChevronRight,
  Bot,
} from 'lucide-react';
import { EcosystemSwitcher } from './EcosystemSwitcher';
import { McpModal } from './McpModal';
import { GithubIcon } from './Footer';
import type { DailyBoard } from '../types';

interface HeaderProps {
  board?: DailyBoard | null;
  selectedDate: string;
  availableDates: string[];
  onSelectDate: (date: string) => void;
  onlineCount: number;
  isFacilitator: boolean;
  theme: 'dark' | 'light';
  userName?: string;
  onEditIdentity?: () => void;
  onToggleTheme: () => void;
  onOpenCreateBoard: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  board,
  selectedDate,
  availableDates: _availableDates,
  onSelectDate,
  onlineCount,
  isFacilitator,
  theme,
  userName,
  onEditIdentity,
  onToggleTheme,
  onOpenCreateBoard,
}) => {
  const { t, i18n } = useTranslation();
  const [copied, setCopied] = React.useState(false);
  const [showMcpModal, setShowMcpModal] = React.useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleLanguage = () => {
    const next = i18n.language.startsWith('en') ? 'pt' : 'en';
    i18n.changeLanguage(next);
  };

  return (
    <>
    <header className="app-header">
      {/* Brand & Board Info */}
      <div className="header-left" style={{ gap: '0.65rem' }}>
        <a
          href="/"
          className="brand-logo"
          title="DailyYrd - Início"
          aria-label="DailyYrd Home"
        >
          <div className="brand-icon-box">
            <Clock size={18} />
          </div>
          <span className="brand-title">
            Daily<span style={{ color: 'var(--color-primary)' }}>Yrd</span>
          </span>
        </a>

        <EcosystemSwitcher currentApp="daily" />

        {board && (
          <div
            style={{
              height: '20px',
              width: '1px',
              backgroundColor: 'var(--border-subtle)',
              margin: '0 0.15rem',
              flexShrink: 0,
            }}
          />
        )}

        {board && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0, maxWidth: '140px' }}>
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                backgroundColor: 'var(--color-success)',
                boxShadow: '0 0 6px var(--color-success-glow)',
                flexShrink: 0,
              }}
              title="Daily Ativa"
            />
            <h1 style={{ fontSize: '0.925rem', fontWeight: 700, color: 'var(--text-main)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={board.title}>
              {board.title}
            </h1>
            {isFacilitator && (
              <span
                style={{
                  fontSize: '0.625rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  padding: '0.1rem 0.4rem',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'rgba(99, 102, 241, 0.15)',
                  border: '1px solid var(--border-primary)',
                  color: 'var(--color-primary)',
                  flexShrink: 0,
                  cursor: 'help',
                }}
                title={t('app.facilitatorTooltip', 'Você é o Facilitador desta sessão')}
              >
                FAC
              </span>
            )}
          </div>
        )}
      </div>

      {/* Right Controls: Share, MCP, New Board, Language, Theme, GitHub */}
      <div className="header-right" style={{ gap: '0.4rem' }}>
        {board && (
          <button
            onClick={handleCopyLink}
            className="btn-secondary"
            style={{ padding: '0.35rem 0.6rem', fontSize: '0.78rem' }}
            title={t('board.shareInvite')}
          >
            {copied ? <Check size={14} color="var(--color-success)" /> : <Copy size={14} />}
            <span className="header-btn-text">{copied ? t('exportModal.copied') : t('board.shareInvite')}</span>
          </button>
        )}

        {/* Botão MCP Padronizado */}
        <button
          onClick={() => setShowMcpModal(true)}
          className="btn-secondary"
          style={{
            padding: '0.35rem 0.6rem',
            fontSize: '0.75rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            background: 'var(--color-primary-subtle, rgba(99, 102, 241, 0.15))',
            border: '1px solid var(--border-primary, rgba(99, 102, 241, 0.35))',
            color: 'var(--color-primary)',
            fontWeight: 700,
            cursor: 'pointer',
          }}
          title={t('mcp.button_title', 'Configurar Servidor MCP (IA)')}
        >
          <Bot size={13} />
          <span>MCP</span>
        </button>

        {/* Create board button */}
        <button
          onClick={onOpenCreateBoard}
          className="btn-secondary"
          style={{ padding: '0.35rem 0.6rem', fontSize: '0.78rem' }}
          title={t('app.newBoard')}
        >
          <PlusCircle size={14} color="var(--color-primary)" />
          <span className="header-btn-text">{t('app.newBoard')}</span>
        </button>

        {/* User Identity Badge */}
        {userName && (
          <button
            onClick={onEditIdentity}
            className="btn-secondary"
            style={{
              padding: '0.28rem 0.65rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.78rem',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              cursor: 'pointer',
            }}
            title={t('identity.edit_identity', 'Alterar meu nome')}
          >
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                backgroundColor: 'var(--color-primary-subtle, rgba(99, 102, 241, 0.15))',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.7rem',
                fontWeight: 800,
              }}
            >
              {userName.charAt(0).toUpperCase()}
            </div>
            <span className="header-btn-text" style={{ maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {userName}
            </span>
          </button>
        )}

        {/* Language switch */}
        <button
          onClick={toggleLanguage}
          className="btn-secondary"
          style={{ padding: '0.35rem 0.55rem', fontSize: '0.75rem', fontWeight: 700 }}
          title={t('app.languageToggle')}
        >
          <Globe size={13} />
          <span>{i18n.language.startsWith('en') ? 'EN' : 'PT'}</span>
        </button>

        {/* Theme switch */}
        <button
          onClick={onToggleTheme}
          className="btn-secondary"
          style={{ padding: '0.35rem 0.5rem', borderRadius: 'var(--radius-md)' }}
          title={t('app.themeToggle')}
        >
          {theme === 'dark' ? <Sun size={14} color="#fbbf24" /> : <Moon size={14} color="var(--color-primary)" />}
        </button>

        {/* GitHub link */}
        <a
          href="https://github.com/Yared98/dailyyrd"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary"
          style={{ padding: '0.35rem 0.5rem', borderRadius: 'var(--radius-md)', display: 'inline-flex', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}
          title={t('footer.github_title', 'Ver código-fonte do DailyYrd no GitHub')}
          aria-label="GitHub"
        >
          <GithubIcon size={14} />
        </a>
      </div>
    </header>

    {/* In-Session Sub-Header for Date Navigation & Presence */}
    {board && (
      <div className="session-sub-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.2rem 0.55rem',
              backgroundColor: 'var(--color-success-bg)',
              border: '1px solid var(--color-success-border)',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--color-success)',
            }}
            title={`${onlineCount} ${onlineCount === 1 ? t('app.onlineCount') : t('app.onlineCountPlural')}`}
          >
            <Radio size={11} className="animate-pulse" />
            <span>{onlineCount} {onlineCount === 1 ? t('app.onlineCount') : t('app.onlineCountPlural')}</span>
          </div>
          {board.description && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
              {board.description}
            </span>
          )}
        </div>

        {/* Center Date Navigator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <button
            onClick={() => {
              const current = new Date(selectedDate + 'T12:00:00');
              current.setDate(current.getDate() - 1);
              onSelectDate(current.toISOString().split('T')[0]);
            }}
            className="btn-secondary"
            style={{ padding: '0.25rem 0.45rem', fontSize: '0.75rem' }}
            title="Dia anterior"
          >
            <ChevronLeft size={14} />
          </button>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '0.25rem 0.55rem',
              color: 'var(--text-main)',
              fontSize: '0.8rem',
            }}
          >
            <Calendar size={13} color="var(--color-primary)" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                if (e.target.value) onSelectDate(e.target.value);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'inherit',
                outline: 'none',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '0.8rem',
              }}
            />
          </div>

          <button
            onClick={() => {
              const current = new Date(selectedDate + 'T12:00:00');
              current.setDate(current.getDate() + 1);
              onSelectDate(current.toISOString().split('T')[0]);
            }}
            className="btn-secondary"
            style={{ padding: '0.25rem 0.45rem', fontSize: '0.75rem' }}
            title="Próximo dia"
          >
            <ChevronRight size={14} />
          </button>

          {selectedDate !== new Date().toISOString().split('T')[0] && (
            <button
              onClick={() => onSelectDate(new Date().toISOString().split('T')[0])}
              className="btn-primary"
              style={{ padding: '0.22rem 0.55rem', fontSize: '0.7rem', borderRadius: 'var(--radius-full)' }}
              title="Voltar para Hoje"
            >
              Hoje
            </button>
          )}
        </div>
      </div>
    )}

    {/* Modal MCP */}
    <McpModal
      isOpen={showMcpModal}
      onClose={() => setShowMcpModal(false)}
      boardId={board?.id}
      isFacilitator={isFacilitator}
    />
  </>
);
};
