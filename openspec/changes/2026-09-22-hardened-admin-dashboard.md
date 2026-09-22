# Change: Console Administrativo Seguro e Espaçoso (/admin) no DailyYrd

## Contexto & Motivação
Implementação de observabilidade administrativa centralizada, controle de ciclo de vida de times (boards) e acompanhamento de adesão de check-ins e bloqueios de daily meetings, respeitando a identidade visual espaçosa da Home e a paleta Emerald do DailyYrd.

## Especificação Técnica
1. **Segurança de Acesso**:
   - Autenticação via `ADMIN_TOKEN` com comparação em tempo constante (`constant_time_eq`) para proteção contra timing attacks.
   - Rate limiting de 5 tentativas a cada 15 minutos por endereço IP (retornando HTTP 429 quando excedido).
   - Sessão via cookie `HttpOnly; SameSite=Strict; Max-Age=7200` (`yrd_admin_session`) e suporte a `Authorization: Bearer <token>`.
2. **Endpoints Administrativos**:
   - `POST /api/admin/login`: Autenticação e emissão do cookie seguro.
   - `POST /api/admin/logout`: Revogação da sessão.
   - `GET /api/admin/verify`: Verificação de status de autorização.
   - `GET /api/admin/metrics`: Coleta de métricas (total de times/boards, ativos em 30d, total de check-ins, bloqueios reportados, participantes únicos e tamanho do SQLite).
   - `POST /api/admin/purge`: Disparo manual de expurgo de times inativos (> 60 dias).
   - `DELETE /api/admin/boards/{id}`: Exclusão pontual de time com cascading delete de check-ins e estados de reunião.
3. **UI / Design System**:
   - Alinhamento total com a Home: layout fluido `.admin-layout`, `.admin-main` (`max-width: 1200px`), tipografia `Plus Jakarta Sans` e `JetBrains Mono`.
   - Grid de cartões KPI espaçoso com fundo `var(--bg-surface)`, bordas `var(--border-highlight)` e elevação suave.
   - Paleta de cores oficial DailyYrd: Emerald (`#10b981` / `#059669`), ícone `Clock`.
   - Tabela de times com paginação visual, cópia rápida de ID e link direto para os times.
