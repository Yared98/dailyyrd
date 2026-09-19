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
  Shield,
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
      <div className="header-left" style={{ gap: '0.85rem' }}>
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
              height: '24px',
              width: '1px',
              backgroundColor: 'var(--border-subtle)',
              margin: '0 0.25rem',
              flexShrink: 0,
            }}
          />
        )}

        {board && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h1 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {board.title}
              </h1>
              {isFacilitator && (
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    padding: '0.15rem 0.5rem',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'rgba(99, 102, 241, 0.15)',
                    border: '1px solid var(--border-primary)',
                    color: 'var(--color-primary)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                  }}
                >
                  <Shield size={11} /> {t('app.facilitatorBadge')}
                </span>
              )}
            </div>
            {board.description && (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {board.description}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Center: Date Selector & History Navigation */}
      {board && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {/* Previous Day Button */}
          <button
            onClick={() => {
              const current = new Date(selectedDate + 'T12:00:00');
              current.setDate(current.getDate() - 1);
              onSelectDate(current.toISOString().split('T')[0]);
            }}
            className="btn-secondary"
            style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
            title="Dia anterior"
          >
            <ChevronLeft size={15} />
          </button>

          {/* Date Selector Dropdown / Picker */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '0.35rem 0.65rem',
              color: 'var(--text-main)',
              fontSize: '0.875rem',
            }}
          >
            <Calendar size={15} color="var(--color-primary)" />
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
                fontSize: '0.85rem',
              }}
            />
          </div>

          {/* Next Day Button */}
          <button
            onClick={() => {
              const current = new Date(selectedDate + 'T12:00:00');
              current.setDate(current.getDate() + 1);
              onSelectDate(current.toISOString().split('T')[0]);
            }}
            className="btn-secondary"
            style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
            title="Próximo dia"
          >
            <ChevronRight size={15} />
          </button>

          {/* Return to Today button if on past or future date */}
          {selectedDate !== new Date().toISOString().split('T')[0] && (
            <button
              onClick={() => onSelectDate(new Date().toISOString().split('T')[0])}
              className="btn-primary"
              style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem', borderRadius: 'var(--radius-full)' }}
              title="Voltar para Hoje"
            >
              Hoje
            </button>
          )}
        </div>
      )}

      {/* Right: Presence, Invite, Theme, Language, New Board */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {board && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.35rem 0.65rem',
              backgroundColor: 'var(--color-success-bg)',
              border: '1px solid var(--color-success-border)',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: 'var(--color-success)',
            }}
            title={`${onlineCount} ${onlineCount === 1 ? t('app.onlineCount') : t('app.onlineCountPlural')}`}
          >
            <Radio size={12} className="animate-pulse" />
            <span>{onlineCount} {onlineCount === 1 ? t('app.onlineCount') : t('app.onlineCountPlural')}</span>
          </div>
        )}

        {board && (
          <button
            onClick={handleCopyLink}
            className="btn-secondary"
            style={{ padding: '0.45rem 0.75rem', fontSize: '0.825rem' }}
            title={t('board.shareInvite')}
          >
            {copied ? <Check size={14} color="var(--color-success)" /> : <Copy size={14} />}
            <span>{copied ? t('exportModal.copied') : t('board.shareInvite')}</span>
          </button>
        )}

        {/* Botão MCP Padronizado */}
        <button
          onClick={() => setShowMcpModal(true)}
          className="btn-secondary"
          style={{
            padding: '0.45rem 0.75rem',
            fontSize: '0.825rem',
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
          <Bot size={14} />
          <span>MCP</span>
        </button>

        {/* Create board button */}
        <button
          onClick={onOpenCreateBoard}
          className="btn-secondary"
          style={{ padding: '0.45rem 0.75rem', fontSize: '0.825rem' }}
          title={t('app.newBoard')}
        >
          <PlusCircle size={15} color="var(--color-primary)" />
          <span>{t('app.newBoard')}</span>
        </button>

        {/* Language switch */}
        <button
          onClick={toggleLanguage}
          className="btn-secondary"
          style={{ padding: '0.45rem 0.65rem', fontSize: '0.825rem' }}
          title={t('app.languageToggle')}
        >
          <Globe size={15} />
          <span style={{ textTransform: 'uppercase', fontWeight: 700 }}>
            {i18n.language.startsWith('en') ? 'EN' : 'PT'}
          </span>
        </button>

        {/* Theme switch */}
        <button
          onClick={onToggleTheme}
          className="btn-secondary"
          style={{ padding: '0.45rem', borderRadius: 'var(--radius-md)' }}
          title={t('app.themeToggle')}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* GitHub link */}
        <a
          href="https://github.com/Yared98/dailyyrd"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary"
          style={{ padding: '0.45rem', borderRadius: 'var(--radius-md)', display: 'inline-flex', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}
          title={t('footer.github_title', 'Ver código-fonte do DailyYrd no GitHub')}
          aria-label="GitHub"
        >
          <GithubIcon size={16} />
        </a>
      </div>
    </header>

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
