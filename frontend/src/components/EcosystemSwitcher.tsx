import React, { useState, useRef, useEffect } from 'react';
import { Layers, Clock, ShieldCheck, Coffee, ChevronDown, Sparkles, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface EcosystemSwitcherProps {
  currentApp?: 'retro' | 'daily' | 'planning' | 'coffee';
}

export const EcosystemSwitcher: React.FC<EcosystemSwitcherProps> = ({ currentApp = 'daily' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { i18n } = useTranslation();
  const isEn = i18n.language.startsWith('en');

  const getAppUrl = (app: 'retro' | 'daily' | 'planning' | 'coffee') => {
    // 1. Check for explicit env var
    const envUrl = (import.meta as any).env?.[`VITE_${app.toUpperCase()}_URL`];
    if (envUrl) return envUrl;

    // 2. Localhost development defaults (optional, but convenient)
    const isDev =
      window.location.port === '5173' ||
      window.location.port === '8080' ||
      window.location.port === '8081' ||
      window.location.port === '8082' ||
      window.location.port === '3000';
    if (isDev) {
      if (app === 'retro') return 'http://localhost:8080';
      if (app === 'daily') return 'http://localhost:8081';
      if (app === 'planning') return 'http://localhost:3000';
      if (app === 'coffee') return 'http://localhost:8082';
    }

    // 3. Not configured
    return undefined;
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const apps = [
    {
      id: 'retro' as const,
      name: 'RetroYrd',
      desc: isEn ? 'Psychological safety & anonymous retros' : 'Retrospectivas anônimas & seguras',
      icon: ShieldCheck,
      color: '#6366f1',
      url: getAppUrl('retro'),
    },
    {
      id: 'daily' as const,
      name: 'DailyYrd',
      desc: isEn ? 'Timeboxed standups in < 15 minutes' : 'Dailies cronometradas em < 15 min',
      icon: Clock,
      color: '#10b981',
      url: getAppUrl('daily'),
    },
    {
      id: 'planning' as const,
      name: 'PlanningYrd',
      desc: isEn ? 'Real-time collaborative planning poker' : 'Planning poker colaborativo em tempo real',
      icon: Layers,
      color: '#3b82f6',
      url: getAppUrl('planning'),
    },
    {
      id: 'coffee' as const,
      name: 'CoffeeYrd',
      desc: isEn ? 'Lean Coffee agenda-less meetings' : 'Reuniões Lean Coffee com timeboxes',
      icon: Coffee,
      color: '#f59e0b',
      url: getAppUrl('coffee'),
    },
  ];

  const configuredApps = apps.filter((app) => app.url || app.id === currentApp);

  if (configuredApps.length <= 1) {
    return null;
  }

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          padding: '0.28rem 0.6rem',
          borderRadius: 'var(--radius-full)',
          background: isOpen ? 'var(--bg-surface-elevated, var(--bg-surface))' : 'var(--bg-subtle)',
          border: '1px solid var(--border-subtle)',
          color: 'var(--text-main)',
          fontSize: '0.75rem',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all var(--transition-fast)',
        }}
        title={isEn ? 'Ecosystem' : 'Ecossistema'}
      >
        <Sparkles size={13} style={{ color: 'var(--color-primary)' }} />
        <span className="ecosystem-switcher-label">{isEn ? 'Ecosystem' : 'Ecossistema'}</span>
        <ChevronDown size={12} style={{ opacity: 0.65, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            width: '280px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-surface-elevated, var(--bg-surface))',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid var(--border-primary, var(--border-subtle))',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.35)',
            zIndex: 1000,
            padding: '0.5rem',
          }}
        >
          <div style={{ padding: '0.4rem 0.6rem 0.5rem', borderBottom: '1px solid var(--border-subtle)', marginBottom: '0.35rem' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-primary)' }}>
              {isEn ? 'Ecosystem' : 'Ecossistema'}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {isEn ? 'Private & AI-integrated agile suite' : 'Suíte ágil privada e integrada com IA'}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            {configuredApps.map((app) => {
              const isCurrent = app.id === currentApp;
              const Icon = app.icon;

              if (isCurrent) {
                return (
                  <div
                    key={app.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      padding: '0.45rem 0.6rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-subtle)',
                      border: '1px solid var(--border-subtle)',
                      cursor: 'default',
                    }}
                  >
                    <div style={{ width: 28, height: 28, borderRadius: 6, background: `${app.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: app.color, flexShrink: 0 }}>
                      <Icon size={16} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' }}>{app.name}</span>
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', background: 'var(--color-primary)', color: '#ffffff', padding: '0.05rem 0.4rem', borderRadius: 'var(--radius-full)' }}>
                          {isEn ? 'Active' : 'Ativo'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {app.desc}
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <a
                  key={app.id}
                  href={app.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '0.45rem 0.6rem',
                    borderRadius: 'var(--radius-sm)',
                    textDecoration: 'none',
                    color: 'inherit',
                    transition: 'background var(--transition-fast)',
                  }}
                >
                  <div style={{ width: 28, height: 28, borderRadius: 6, background: `${app.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: app.color, flexShrink: 0 }}>
                    <Icon size={16} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)' }}>{app.name}</span>
                      <ExternalLink size={12} style={{ opacity: 0.5 }} />
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {app.desc}
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
