# Change Proposal: 001 - MCP Server, Umami Analytics, Hardening e Nova Landing Page

## Motivação
Elevar o DailyYrd aos padrões de segurança, automação por IA e identidade visual unificada do ecossistema Yrd Agile Toolkit.

## Mudanças Principais
1. **Servidor MCP Nativo**: Implementado endpoint `POST /mcp` com suporte a tools de check-in e copiloto de daily ao vivo.
2. **Hardening de Segurança**:
   - `session_hash` oculto da serialização JSON.
   - PONG broadcast eliminado.
   - `/robots.txt` adicionado.
3. **Privacidade e Analytics**:
   - Rota `/api/config` e utilitário `analytics.ts` com rotas higienizadas.
4. **Interface Unificada**:
   - `HomeView.tsx` redesenhado para card centralizado focado na cerimônia, com seletor de timer e histórico local.
   - `EcosystemSwitcher` e `Footer` padronizados.
