import React from 'react';
import { Globe, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface FooterProps {
  style?: React.CSSProperties;
}

export const GithubIcon: React.FC<{ size?: number; color?: string }> = ({ size = 16, color = 'currentColor' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ display: 'inline-block', verticalAlign: 'middle' }}
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

export const Footer: React.FC<FooterProps> = ({ style }) => {
  const { t } = useTranslation();
  return (
    <footer
      style={{
        padding: '1.5rem 1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1.25rem',
        flexWrap: 'wrap',
        fontSize: '0.82rem',
        color: 'var(--text-muted)',
        borderTop: '1px solid var(--border-subtle)',
        background: 'transparent',
        transition: 'color var(--transition-fast)',
        marginTop: 'auto',
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <span>{t('footer.developed_by', 'Desenvolvido por')}</span>
        <a
          href="https://yared.com.br/"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontWeight: 700,
            color: 'var(--text-main)',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            borderBottom: '1px dotted var(--text-muted)',
            transition: 'color var(--transition-fast), border-color var(--transition-fast)',
          }}
          className="hover-link"
        >
          Yared
        </a>
      </div>

      <div style={{ width: 1, height: 14, background: 'var(--border-subtle)' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        {/* Link para Site Pessoal */}
        <a
          href="https://yared.com.br/"
          target="_blank"
          rel="noopener noreferrer"
          title={t('footer.website_title', 'Visitar yared.com.br')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            color: 'var(--text-muted)',
            textDecoration: 'none',
            padding: '0.25rem 0.5rem',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.78rem',
            fontWeight: 600,
            transition: 'all var(--transition-fast)',
          }}
        >
          <Globe size={14} />
          <span>yared.com.br</span>
          <ExternalLink size={11} style={{ opacity: 0.7 }} />
        </a>

        {/* Link para Projeto no GitHub */}
        <a
          href="https://github.com/Yared98/dailyyrd"
          target="_blank"
          rel="noopener noreferrer"
          title={t('footer.github_title', 'Ver código-fonte do DailyYrd no GitHub')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            color: 'var(--text-muted)',
            textDecoration: 'none',
            padding: '0.25rem 0.5rem',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.78rem',
            fontWeight: 600,
            transition: 'all var(--transition-fast)',
          }}
        >
          <GithubIcon size={14} />
          <span>GitHub</span>
          <ExternalLink size={11} style={{ opacity: 0.7 }} />
        </a>
      </div>
    </footer>
  );
};
