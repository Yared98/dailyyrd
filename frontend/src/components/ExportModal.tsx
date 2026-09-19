import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Copy, Check, FileText, Send } from 'lucide-react';
import { copyToClipboard } from '../utils/clipboard';
import type { CheckIn, DailyBoard } from '../types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  board: DailyBoard;
  date: string;
  checkins: CheckIn[];
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  board,
  date,
  checkins,
}) => {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'slack' | 'markdown'>('slack');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const totalMembers = checkins.length;
  const isBlocked = (c: CheckIn) => c.has_blockers && !!c.blockers && c.blockers.trim().length > 0;
  const blockersCount = checkins.filter(isBlocked).length;

  const generateSlackText = () => {
    let out = `*📋 Daily Standup — ${board.title} (${date})*\n`;
    out += `👥 Participantes: ${totalMembers} | 🚨 Bloqueios: ${blockersCount}\n\n`;

    if (blockersCount > 0) {
      out += `*🚨 BLOQUEIOS IDENTIFICADOS:*\n`;
      checkins
        .filter(isBlocked)
        .forEach((c) => {
          out += `• *${c.user_name}*: ${c.blockers.trim()}\n`;
        });
      out += `\n---\n\n`;
    }

    checkins.forEach((c) => {
      const moodStr = c.mood ? ` (${c.mood})` : '';
      out += `*👤 ${c.user_name}${moodStr}*\n`;
      out += `*Ontem:* ${c.yesterday.trim()}\n`;
      out += `*Hoje:* ${c.today.trim()}\n`;
      if (isBlocked(c)) {
        out += `*🚨 Impedimento:* ${c.blockers.trim()}\n`;
      }
      out += `\n`;
    });

    return out;
  };

  const generateMarkdownText = () => {
    let out = `# 📋 Daily Standup: ${board.title} (${date})\n\n`;
    out += `- **Participantes:** ${totalMembers}\n- **Bloqueios:** ${blockersCount}\n\n`;

    if (blockersCount > 0) {
      out += `### 🚨 Bloqueios do Dia\n\n`;
      checkins
        .filter(isBlocked)
        .forEach((c) => {
          out += `- **${c.user_name}:** ${c.blockers.trim()}\n`;
        });
      out += `\n---\n\n`;
    }

    out += `### 👥 Respostas da Equipe\n\n`;
    checkins.forEach((c) => {
      const roleStr = c.role ? ` - _${c.role}_` : '';
      const moodStr = c.mood ? ` | ${c.mood}` : '';
      out += `#### ${c.user_name}${roleStr}${moodStr}\n\n`;
      out += `- **O que fiz ontem:**\n  ${c.yesterday.trim().replace(/\n/g, '\n  ')}\n`;
      out += `- **O que farei hoje:**\n  ${c.today.trim().replace(/\n/g, '\n  ')}\n`;
      if (isBlocked(c)) {
        out += `- **🚨 Impedimentos:**\n  ${c.blockers.trim().replace(/\n/g, '\n  ')}\n`;
      }
      out += `\n`;
    });

    return out;
  };

  const content = tab === 'slack' ? generateSlackText() : generateMarkdownText();

  const handleCopy = async () => {
    const success = await copyToClipboard(content);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
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
            <FileText size={20} color="var(--color-primary)" />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
              {t('exportModal.title')}
            </h2>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Tab switcher */}
        <div
          style={{
            display: 'flex',
            padding: '0.75rem 1.5rem 0',
            borderBottom: '1px solid var(--border-subtle)',
            gap: '1rem',
          }}
        >
          <button
            onClick={() => setTab('slack')}
            style={{
              padding: '0.5rem 0.25rem',
              fontWeight: 600,
              fontSize: '0.9rem',
              color: tab === 'slack' ? 'var(--color-primary)' : 'var(--text-muted)',
              borderBottom: tab === 'slack' ? '2px solid var(--color-primary)' : '2px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <Send size={15} />
            <span>{t('exportModal.tabSlack')}</span>
          </button>

          <button
            onClick={() => setTab('markdown')}
            style={{
              padding: '0.5rem 0.25rem',
              fontWeight: 600,
              fontSize: '0.9rem',
              color: tab === 'markdown' ? 'var(--color-primary)' : 'var(--text-muted)',
              borderBottom: tab === 'markdown' ? '2px solid var(--color-primary)' : '2px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <FileText size={15} />
            <span>{t('exportModal.tabMarkdown')}</span>
          </button>
        </div>

        {/* Text Preview */}
        <div style={{ padding: '1.5rem' }}>
          <textarea
            readOnly
            value={content}
            className="input-field mono-text"
            rows={12}
            style={{ fontSize: '0.825rem', lineHeight: 1.4, resize: 'vertical' }}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
            <button onClick={onClose} className="btn-secondary">
              {t('checkinModal.cancel')}
            </button>
            <button onClick={handleCopy} className="btn-primary">
              {copied ? <Check size={16} color="#fff" /> : <Copy size={16} />}
              <span>{copied ? t('exportModal.copied') : t('exportModal.copyButton')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
