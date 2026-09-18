import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertOctagon, CheckCircle2 } from 'lucide-react';
import type { CheckIn } from '../types';

interface BlockerSpotlightProps {
  checkins: CheckIn[];
}

export const BlockerSpotlight: React.FC<BlockerSpotlightProps> = ({ checkins }) => {
  const { t } = useTranslation();
  const blockedCheckins = checkins.filter((c) => c.has_blockers && !!c.blockers && c.blockers.trim().length > 0);

  if (blockedCheckins.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.9rem 1.25rem',
          backgroundColor: 'var(--color-success-bg)',
          border: '1px solid var(--color-success-border)',
          borderRadius: 'var(--radius-lg)',
          color: 'var(--color-success)',
          marginBottom: '1.5rem',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <CheckCircle2 size={20} style={{ flexShrink: 0 }} />
        <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>
          {t('spotlight.noBlockers')}
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '1.15rem 1.4rem',
        backgroundColor: 'var(--color-blocker-bg)',
        border: '1px solid var(--color-blocker-border)',
        borderRadius: 'var(--radius-xl)',
        marginBottom: '1.75rem',
        boxShadow: '0 4px 20px var(--color-blocker-glow)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
        <AlertOctagon size={22} color="var(--color-blocker)" />
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-blocker)' }}>
          {t('spotlight.title')} ({blockedCheckins.length})
        </h3>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {t('spotlight.subtitle')}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
        {blockedCheckins.map((item) => (
          <div
            key={item.id}
            style={{
              padding: '0.85rem 1rem',
              backgroundColor: 'var(--bg-surface-elevated)',
              border: '1px solid var(--color-blocker-border)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: item.avatar_color || 'var(--color-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#ffffff',
                }}
              >
                {item.user_name.charAt(0).toUpperCase()}
              </div>
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                {item.user_name}
              </span>
              {item.role && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  ({item.role})
                </span>
              )}
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
              {item.blockers}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
