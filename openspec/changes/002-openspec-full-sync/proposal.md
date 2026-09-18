# Proposal: OpenSpec Full Sync — 2026-09-18

## Tipo
`spec-sync` | Sincronização de documentação com o código atual

## Escopo
Auditoria e atualização completa dos specs do DailyYrd para refletir o estado real da implementação.

## Mudanças Registradas

### `specs/core-workflow/spec.md` — v1.2 → v1.3
- **Adicionado**: Seção `API REST` completa:
  - `POST /api/boards` com validações de `meeting_timer_seconds` e `target_time`
  - `GET /api/boards/{id}` com query params `date`, `token`, `session_hash`
  - `PATCH /api/boards/{id}` — atualização de configurações (somente facilitador)
  - `GET /api/boards/{id}/dates` — datas com check-ins registrados
  - `POST /api/boards/{id}/checkins` com payload completo e broadcast WS
  - `DELETE /api/boards/{id}/checkins/{id}` com autorizações por hash ou token
  - `GET /api/boards/{id}/export` com `format=markdown|slack|discord`
- **Atualizado**: Formatos de exportação Slack/Discord documentados
