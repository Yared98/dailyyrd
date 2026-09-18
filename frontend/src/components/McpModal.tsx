import React, { useState } from 'react';
import { X, Bot, Copy, Check, Terminal, Shield, Key, Sparkles, BookOpen, Activity } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface McpModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardId?: string | null;
  isFacilitator?: boolean;
  facilitatorToken?: string | null;
}

export const McpModal: React.FC<McpModalProps> = ({
  isOpen,
  onClose,
  boardId,
  isFacilitator,
  facilitatorToken,
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'config' | 'tools' | 'guide'>('config');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedTodayUri, setCopiedTodayUri] = useState(false);
  const [copiedBlockersUri, setCopiedBlockersUri] = useState(false);
  const [copiedConfig, setCopiedConfig] = useState(false);
  const [pingStatus, setPingStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [pingResult, setPingResult] = useState<string | null>(null);

  if (!isOpen) return null;

  const mcpServerUrl = `${window.location.origin}/mcp`;
  const todayUri = boardId
    ? `daily://board/${boardId}/today${isFacilitator && facilitatorToken ? `?token=${facilitatorToken}` : ''}`
    : 'daily://board/{board_id}/today';
  const blockersUri = boardId
    ? `daily://board/${boardId}/blockers`
    : 'daily://board/{board_id}/blockers';

  const jsonConfigSnippet = JSON.stringify(
    {
      mcpServers: {
        dailyyrd: {
          url: mcpServerUrl,
        },
      },
    },
    null,
    2
  );

  const copyToClipboard = (text: string, setCopiedState: (v: boolean) => void) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedState(true);
      setTimeout(() => setCopiedState(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handlePingMcp = async () => {
    setPingStatus('loading');
    setPingResult(null);
    const startTime = performance.now();

    try {
      const res = await fetch('/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'initialize',
          params: {},
        }),
      });

      const elapsed = Math.round(performance.now() - startTime);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      if (data.result?.serverInfo) {
        setPingStatus('success');
        setPingResult(
          `${data.result.serverInfo.name} v${data.result.serverInfo.version} (${elapsed}ms) — Protocolo ${data.result.protocolVersion}`
        );
      } else if (data.error) {
        setPingStatus('error');
        setPingResult(`Erro JSON-RPC: ${data.error.message}`);
      } else {
        setPingStatus('success');
        setPingResult(`Servidor respondeu em ${elapsed}ms`);
      }
    } catch (err: any) {
      setPingStatus('error');
      setPingResult(err.message || 'Falha ao conectar ao endpoint /mcp');
    }
  };

  const tools = [
    {
      name: 'daily_submit_checkin',
      desc: t(
        'mcp.tool_submit_desc',
        'Submete ou atualiza o check-in diário de um membro (ontem, hoje, bloqueios). Ideal para agentes de IA que analisam commits git e PRs para redigir o status do desenvolvedor.'
      ),
      params: ['board_id', 'user_name', 'yesterday', 'today', 'blockers?', 'role?', 'mood?'],
    },
    {
      name: 'daily_get_board_summary',
      desc: t(
        'mcp.tool_summary_desc',
        'Retorna o resumo executivo completo do dia: membros que participaram, bloqueios pendentes e status da reunião ao vivo.'
      ),
      params: ['board_id', 'date?'],
    },
    {
      name: 'daily_start_meeting',
      desc: t(
        'mcp.tool_start_meeting_desc',
        'Inicia a reunião de standup ao vivo, acionando o timer síncrono e ordenando a vez de cada membro.'
      ),
      params: ['board_id', 'speaker_order?', 'date?'],
    },
    {
      name: 'daily_next_speaker',
      desc: t(
        'mcp.tool_next_speaker_desc',
        'Avança a palavra para o próximo membro na reunião ao vivo e reinicia o cronômetro do participante.'
      ),
      params: ['board_id', 'date?'],
    },
    {
      name: 'daily_set_timer',
      desc: t(
        'mcp.tool_set_timer_desc',
        'Controla o cronômetro da reunião: start, pause ou reset (com ajuste opcional de segundos).'
      ),
      params: ['board_id', 'action ("start" | "pause" | "reset")', 'seconds?'],
    },
    {
      name: 'daily_end_meeting',
      desc: t(
        'mcp.tool_end_meeting_desc',
        'Encerra a reunião diária ao vivo e conclui a sessão de standup.'
      ),
      params: ['board_id', 'date?'],
    },
    {
      name: 'daily_delete_checkin',
      desc: t(
        'mcp.tool_delete_desc',
        'Remove um check-in registrado na daily com propagação instantânea via WebSocket.'
      ),
      params: ['board_id', 'checkin_id', 'facilitator_token?'],
    },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        animation: 'fadeIn 0.15s ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-surface-elevated, #18181b)',
          border: '1px solid var(--border-highlight, rgba(255, 255, 255, 0.12))',
          borderRadius: 'var(--radius-lg, 16px)',
          width: '100%',
          maxWidth: '640px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-lg, 0 20px 25px -5px rgba(0, 0, 0, 0.5))',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                backgroundColor: 'rgba(99, 102, 241, 0.15)',
                border: '1px solid var(--border-primary, rgba(99, 102, 241, 0.35))',
                padding: '0.45rem',
                borderRadius: 'var(--radius-md, 10px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Bot size={22} color="var(--color-primary, #6366f1)" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-main, #ffffff)' }}>
                  Model Context Protocol (MCP)
                </h3>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '0.1rem 0.45rem',
                    borderRadius: 'var(--radius-full, 9999px)',
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#10b981',
                    border: '1px solid rgba(16, 185, 129, 0.35)',
                  }}
                >
                  <span className="pulse-dot" style={{ width: 6, height: 6, backgroundColor: '#10b981' }} />
                  {t('mcp.active_badge', 'Servidor /mcp Ativo')}
                </span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted, #a1a1aa)', margin: '0.15rem 0 0' }}>
                {t('mcp.subtitle', 'Conecte Claude Desktop, Cursor ou agentes autônomos ao DailyYrd')}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn-icon"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted, #a1a1aa)',
              cursor: 'pointer',
              padding: '0.35rem',
              borderRadius: 'var(--radius-sm, 6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title={t('common.close', 'Fechar')}
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
            padding: '0 1.5rem',
            gap: '1rem',
            backgroundColor: 'var(--bg-subtle, rgba(255, 255, 255, 0.02))',
          }}
        >
          <button
            onClick={() => setActiveTab('config')}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'config' ? '2px solid var(--color-primary, #6366f1)' : '2px solid transparent',
              padding: '0.75rem 0.25rem',
              color: activeTab === 'config' ? 'var(--color-primary, #6366f1)' : 'var(--text-muted, #a1a1aa)',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <Terminal size={14} />
            <span>{t('mcp.tab_config', 'Configuração & Conexão')}</span>
          </button>

          <button
            onClick={() => setActiveTab('tools')}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'tools' ? '2px solid var(--color-primary, #6366f1)' : '2px solid transparent',
              padding: '0.75rem 0.25rem',
              color: activeTab === 'tools' ? 'var(--color-primary, #6366f1)' : 'var(--text-muted, #a1a1aa)',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <Sparkles size={14} />
            <span>{t('mcp.tab_tools', 'Ferramentas (Tools)')}</span>
            <span
              style={{
                fontSize: '0.68rem',
                padding: '0.05rem 0.35rem',
                borderRadius: 'var(--radius-full, 9999px)',
                background: 'var(--bg-subtle-hover, rgba(255, 255, 255, 0.08))',
              }}
            >
              {tools.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'guide' ? '2px solid var(--color-primary, #6366f1)' : '2px solid transparent',
              padding: '0.75rem 0.25rem',
              color: activeTab === 'guide' ? 'var(--color-primary, #6366f1)' : 'var(--text-muted, #a1a1aa)',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <BookOpen size={14} />
            <span>{t('mcp.tab_guide', 'Instruções de Setup')}</span>
          </button>
        </div>

        {/* Body Content */}
        <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {activeTab === 'config' && (
            <>
              {/* Context Banner */}
              <div
                style={{
                  background: 'var(--bg-subtle, rgba(255, 255, 255, 0.03))',
                  border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
                  borderRadius: 'var(--radius-md, 10px)',
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main, #ffffff)' }}>
                    {boardId ? `Time / Board: ${boardId}` : t('mcp.global_server', 'Servidor MCP Global do DailyYrd')}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted, #a1a1aa)', marginTop: '0.15rem' }}>
                    {t(
                      'mcp.context_desc',
                      'Suporta JSON-RPC 2.0 via HTTP POST em /mcp para sincronização bidirecional em tempo real.'
                    )}
                  </div>
                </div>

                {isFacilitator ? (
                  <span
                    style={{
                      background: 'rgba(245, 158, 11, 0.15)',
                      color: '#f59e0b',
                      border: '1px solid rgba(245, 158, 11, 0.35)',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      padding: '0.2rem 0.5rem',
                      borderRadius: 'var(--radius-full, 9999px)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Key size={11} />
                    <span>{t('app.facilitatorBadge', 'Facilitador')}</span>
                  </span>
                ) : (
                  <span
                    style={{
                      background: 'var(--bg-subtle-hover, rgba(255, 255, 255, 0.08))',
                      color: 'var(--text-muted, #a1a1aa)',
                      border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.12))',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.5rem',
                      borderRadius: 'var(--radius-full, 9999px)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Shield size={11} />
                    <span>{t('mcp.participant', 'Membro')}</span>
                  </span>
                )}
              </div>

              {/* 1. Endpoint URL */}
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-dim, #71717a)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {t('mcp.server_url_label', '1. Endpoint do Servidor MCP')}
                </div>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <input
                    readOnly
                    value={mcpServerUrl}
                    style={{
                      flex: 1,
                      background: 'var(--bg-input, rgba(0, 0, 0, 0.25))',
                      border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))',
                      borderRadius: 'var(--radius-sm, 6px)',
                      padding: '0.45rem 0.65rem',
                      color: 'var(--text-main, #ffffff)',
                      fontFamily: 'var(--font-mono, monospace)',
                      fontSize: '0.78rem',
                    }}
                  />
                  <button
                    onClick={() => copyToClipboard(mcpServerUrl, setCopiedUrl)}
                    className="btn-secondary"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.45rem 0.75rem',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {copiedUrl ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                    <span>{copiedUrl ? t('common.copied', 'Copiado!') : t('common.copy', 'Copiar')}</span>
                  </button>
                </div>
              </div>

              {/* 2. Resource URIs */}
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-dim, #71717a)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {t('mcp.resources_label', '2. Recursos MCP do Time (Resources)')}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <input
                      readOnly
                      value={todayUri}
                      style={{
                        flex: 1,
                        background: 'var(--bg-input, rgba(0, 0, 0, 0.25))',
                        border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))',
                        borderRadius: 'var(--radius-sm, 6px)',
                        padding: '0.45rem 0.65rem',
                        color: 'var(--text-main, #ffffff)',
                        fontFamily: 'var(--font-mono, monospace)',
                        fontSize: '0.74rem',
                      }}
                      title="Status completo de check-ins de hoje"
                    />
                    <button
                      onClick={() => copyToClipboard(todayUri, setCopiedTodayUri)}
                      className="btn-secondary"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.45rem 0.65rem',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {copiedTodayUri ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                      <span>today</span>
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <input
                      readOnly
                      value={blockersUri}
                      style={{
                        flex: 1,
                        background: 'var(--bg-input, rgba(0, 0, 0, 0.25))',
                        border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))',
                        borderRadius: 'var(--radius-sm, 6px)',
                        padding: '0.45rem 0.65rem',
                        color: 'var(--text-main, #ffffff)',
                        fontFamily: 'var(--font-mono, monospace)',
                        fontSize: '0.74rem',
                      }}
                      title="Lista de impedimentos ativos"
                    />
                    <button
                      onClick={() => copyToClipboard(blockersUri, setCopiedBlockersUri)}
                      className="btn-secondary"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.45rem 0.65rem',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {copiedBlockersUri ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                      <span>blockers</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 3. JSON Configuration */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-dim, #71717a)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {t('mcp.json_config_label', '3. Configuração JSON (Claude Desktop / Cursor)')}
                  </span>
                  <button
                    onClick={() => copyToClipboard(jsonConfigSnippet, setCopiedConfig)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      background: 'transparent',
                      border: 'none',
                      color: copiedConfig ? '#10b981' : 'var(--color-primary, #6366f1)',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    {copiedConfig ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copiedConfig ? t('common.copied', 'Copiado!') : t('mcp.copy_json', 'Copiar JSON')}</span>
                  </button>
                </div>
                <pre
                  style={{
                    background: 'var(--bg-input, rgba(0, 0, 0, 0.35))',
                    border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))',
                    borderRadius: 'var(--radius-sm, 6px)',
                    padding: '0.65rem 0.85rem',
                    margin: 0,
                    fontFamily: 'var(--font-mono, monospace)',
                    fontSize: '0.74rem',
                    color: 'var(--text-muted, #a1a1aa)',
                    overflowX: 'auto',
                  }}
                >
                  {jsonConfigSnippet}
                </pre>
              </div>

              {/* Ping Connectivity Test */}
              <div
                style={{
                  background: 'rgba(99, 102, 241, 0.08)',
                  border: '1px solid var(--border-primary, rgba(99, 102, 241, 0.25))',
                  borderRadius: 'var(--radius-md, 10px)',
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main, #ffffff)' }}>
                    <Activity size={14} color="var(--color-primary, #6366f1)" />
                    <span>{t('mcp.test_connectivity', 'Testar Conexão com o Servidor')}</span>
                  </div>
                  {pingResult && (
                    <div
                      style={{
                        fontSize: '0.72rem',
                        marginTop: '0.2rem',
                        color: pingStatus === 'success' ? '#10b981' : '#ef4444',
                        fontWeight: 600,
                      }}
                    >
                      {pingResult}
                    </div>
                  )}
                </div>

                <button
                  onClick={handlePingMcp}
                  disabled={pingStatus === 'loading'}
                  className="btn-primary"
                  style={{
                    padding: '0.4rem 0.8rem',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: pingStatus === 'loading' ? 'wait' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {pingStatus === 'loading' ? 'Testando...' : 'Ping /mcp'}
                </button>
              </div>
            </>
          )}

          {activeTab === 'tools' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted, #a1a1aa)', margin: 0, lineHeight: 1.4 }}>
                {t(
                  'mcp.tools_intro',
                  'O DailyYrd implementa ferramentas semânticas padronizadas pela especificação OpenSpec para orquestrar check-ins diários e reuniões ao vivo.'
                )}
              </p>

              {tools.map((tool) => (
                <div
                  key={tool.name}
                  style={{
                    background: 'var(--bg-subtle, rgba(255, 255, 255, 0.03))',
                    border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
                    borderRadius: 'var(--radius-md, 10px)',
                    padding: '0.85rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.35rem' }}>
                    <code
                      style={{
                        fontFamily: 'var(--font-mono, monospace)',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        color: 'var(--color-primary, #6366f1)',
                        background: 'rgba(99, 102, 241, 0.1)',
                        padding: '0.15rem 0.4rem',
                        borderRadius: 'var(--radius-xs, 4px)',
                      }}
                    >
                      {tool.name}
                    </code>
                  </div>
                  <p style={{ fontSize: '0.76rem', color: 'var(--text-main, #ffffff)', margin: '0 0 0.5rem', lineHeight: 1.4 }}>
                    {tool.desc}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-dim, #71717a)', fontWeight: 600 }}>Parâmetros:</span>
                    {tool.params.map((p) => (
                      <span
                        key={p}
                        style={{
                          fontFamily: 'var(--font-mono, monospace)',
                          fontSize: '0.67rem',
                          background: 'var(--bg-input, rgba(0, 0, 0, 0.25))',
                          border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
                          color: 'var(--text-muted, #a1a1aa)',
                          padding: '0.05rem 0.35rem',
                          borderRadius: 'var(--radius-xs, 4px)',
                        }}
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'guide' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.8rem', lineHeight: 1.5 }}>
              <div
                style={{
                  background: 'var(--bg-subtle, rgba(255, 255, 255, 0.03))',
                  border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
                  borderRadius: 'var(--radius-md, 10px)',
                  padding: '1rem',
                }}
              >
                <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main, #ffffff)' }}>
                  1. Claude Desktop (Anthropic)
                </h4>
                <p style={{ margin: '0 0 0.5rem', color: 'var(--text-muted, #a1a1aa)', fontSize: '0.76rem' }}>
                  Adicione a configuração no arquivo <code style={{ fontFamily: 'var(--font-mono)' }}>claude_desktop_config.json</code>:
                </p>
                <div style={{ background: 'var(--bg-input, rgba(0,0,0,0.3))', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  <div><strong>macOS:</strong> ~/Library/Application Support/Claude/claude_desktop_config.json</div>
                  <div style={{ marginTop: '0.2rem' }}><strong>Windows:</strong> %APPDATA%\Claude\claude_desktop_config.json</div>
                </div>
                <p style={{ margin: '0.5rem 0 0', color: 'var(--text-muted, #a1a1aa)', fontSize: '0.74rem' }}>
                  Reinicie o Claude Desktop para carregar as ferramentas. O ícone de martelo (Tools) exibirá as ferramentas do DailyYrd.
                </p>
              </div>

              <div
                style={{
                  background: 'var(--bg-subtle, rgba(255, 255, 255, 0.03))',
                  border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
                  borderRadius: 'var(--radius-md, 10px)',
                  padding: '1rem',
                }}
              >
                <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main, #ffffff)' }}>
                  2. Cursor & VS Code
                </h4>
                <p style={{ margin: '0 0 0.5rem', color: 'var(--text-muted, #a1a1aa)', fontSize: '0.76rem' }}>
                  No Cursor, vá em <strong>Settings &gt; Features &gt; MCP &gt; Add New MCP Server</strong>:
                </p>
                <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--text-muted, #a1a1aa)', fontSize: '0.75rem' }}>
                  <li>Type: <code>sse</code> ou <code>http</code></li>
                  <li>Name: <code>dailyyrd</code></li>
                  <li>URL: <code>{mcpServerUrl}</code></li>
                </ul>
              </div>

              <div
                style={{
                  background: 'var(--bg-subtle, rgba(255, 255, 255, 0.03))',
                  border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
                  borderRadius: 'var(--radius-md, 10px)',
                  padding: '1rem',
                }}
              >
                <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main, #ffffff)' }}>
                  3. Agentes Autônomos & Antigravity
                </h4>
                <p style={{ margin: 0, color: 'var(--text-muted, #a1a1aa)', fontSize: '0.76rem' }}>
                  Agentes de automação contínua podem executar chamadas JSON-RPC 2.0 diretamente via POST contra <code>{mcpServerUrl}</code> com <code>tools/call</code> ou consultar o recurso <code>daily://board/&#123;id&#125;/today</code> via <code>resources/read</code>.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
