# Change: Padronização da Interface de Descoberta e Configuração MCP no DailyYrd

- **Data**: 2026-09-18
- **Autor**: Antigravity AI Agent
- **Status**: Implementado & Validado
- **Repositórios Alinhados**: RetroYrd, DailyYrd, PlanningYrd

## Contexto & Motivação
Para unificar a experiência do usuário entre RetroYrd, DailyYrd e PlanningYrd, adicionamos a camada de UI de configuração do MCP no DailyYrd, permitindo que os times descubram as ferramentas do backend (`daily_submit_checkin`, `daily_get_board_summary`, etc.) e conectem seus assistentes de IA diretamente ao DailyYrd.

## Alterações Realizadas
1. **Componente `McpModal.tsx`**: Criado componente de visualização de status, endpoints, snippet JSON configurável para `claude_desktop_config.json` e Cursor, lista descritiva de tools e teste interativo de conectividade `/mcp`.
2. **Botão Padronizado**: Adicionado botão com ícone `Bot` e etiqueta "MCP" em `HomeView.tsx` (na página inicial) e em `Header.tsx` (na visualização de daily ativa).
3. **Internacionalização (i18n)**: Inclusão de chaves `mcp` em português e inglês no arquivo `frontend/src/i18n/index.ts`.
4. **Vite Proxy**: Configurado proxy de `/mcp` para `http://127.0.0.1:8081` em desenvolvimento.
5. **OpenSpec**: Especificação atualizada em `openspec/specs/mcp-server/spec.md`.
