# DailyYrd - Core Workflow Specification

**Versão:** 1.3.0 | **Atualizado:** 2026-09-18

## 1. Visão Geral
O **DailyYrd** suporta duas modalidades de cerimônia diária:
1. **Modo Assíncrono**: Membros preenchem seu check-in antes da hora de início da daily.
2. **Modo Síncrono (Reunião ao Vivo)**: O facilitador conduz a reunião com roleta de participantes, cronômetro regressivo sincronizado e passagem de vez sem atritos.

---

## 2. API REST

### `POST /api/boards`
Cria um novo board de time.

**Request Body:**
```json
{
  "title": "Equipe Fênix",
  "description": "Squad de plataforma",
  "meeting_timer_seconds": 90,
  "target_time": "09:30"
}
```

**Response `201`:**
```json
{
  "id": "01HXXX...",
  "title": "Equipe Fênix",
  "facilitator_token": "01HYYY...",
  "invite_url": "/board/01HXXX..."
}
```

- `meeting_timer_seconds`: Padrão `90`. Válido entre `10` e `600`.
- `target_time`: Horário da daily no formato `HH:MM` (opcional).

### `GET /api/boards/{id}`
Retorna o snapshot completo do board para uma data.

**Query Params:**
- `date` (opcional): `YYYY-MM-DD`. Padrão: data atual.
- `token` (opcional): `facilitator_token` para acesso privilegiado.
- `session_hash` (opcional): Hash do participante para identificar seu check-in.

**Response `200`:** `DailyBoardSnapshot`

### `PATCH /api/boards/{id}`
Atualiza configurações do board. **Requer** `?token=<facilitator_token>`.

**Request Body:**
```json
{
  "title": "Novo Nome do Time",
  "description": "Nova descrição",
  "meeting_timer_seconds": 120,
  "target_time": "10:00"
}
```

**Validações:**
- `title`: 1 a 100 caracteres.
- `description`: Máximo 1000 caracteres.
- `meeting_timer_seconds`: 10 a 600.
- `target_time`: Formato `HH:MM`.

### `GET /api/boards/{id}/dates`
Retorna a lista de datas com check-ins registrados.

**Response `200`:** `["2026-09-18", "2026-09-17", ...]`

### `POST /api/boards/{id}/checkins`
Registra ou atualiza o check-in de um membro.

**Request Body:**
```json
{
  "user_name": "Yared",
  "role": "Dev",
  "yesterday": "Terminei o PR #42",
  "today": "Review + testes do módulo X",
  "has_blockers": false,
  "blockers": "",
  "mood": "😊",
  "session_hash": "abc123"
}
```

Emite broadcast WebSocket `CHECKIN_SAVED` para todos os conectados.

### `DELETE /api/boards/{id}/checkins/{checkin_id}`
Remove um check-in. Requer `?session_hash=<hash>` (dono) **ou** `?token=<facilitator_token>`.

Emite broadcast WebSocket `CHECKIN_DELETED`.

### `GET /api/boards/{id}/export`
Exporta o resumo da daily. **Query params:** `date=YYYY-MM-DD`, `format=markdown|slack|discord`.

---

## 3. Página Inicial Centralizada (Ceremony-First Landing)
- **WHEN** o usuário acessa a raiz (`/`) sem um identificador de time:
  - **THEN** o sistema apresenta a tela inicial focada em card glassmorphic (`HomeView`), com:
    - Identidade visual DailyYrd e os 3 pilares da ferramenta.
    - Formulário direto para criação de time com tempo de fala selecionável (`45s`, `60s`, `90s`, `120s`).
    - Lista de times acessados recentemente (`Recent Boards`) com botões para acesso direto, cópia de link de convite e remoção do histórico local.
    - Barra de ferramentas com alternador do ecossistema (`EcosystemSwitcher`), idioma, tema e GitHub.
    - Rodapé de autoria e links do ecossistema.

## 4. Preenchimento de Check-in (Assíncrono)
- **WHEN** um membro acessa o board do dia e abre o formulário de check-in:
  - **THEN** ele responde:
    1. *O que fiz ontem?* (tarefas concluídas, PRs, reuniões).
    2. *O que farei hoje?* (metas e foco do dia).
    3. *Impedimentos ou bloqueios?* (com checkbox explícito "Estou bloqueado").
  - **AND** o estado é salvo no SQLite e distribuído via broadcast `CHECKIN_SAVED` para todos os clientes conectados.

## 5. Spotlight de Bloqueios
- **WHEN** um ou mais membros marcam que possuem impedimentos no dia:
  - **THEN** o painel superior `BlockerSpotlight` exibe cards destacados em coral radiante (`--color-blocker`), permitindo que a liderança tome ações imediatas.

## 6. Reunião ao Vivo (Modo Síncrono)
- **WHEN** o facilitador inicia a reunião ao vivo (`daily_start_meeting` ou botão na interface):
  - **THEN** o modal `LiveMeetingModal` é ativado com:
    - **Roleta de Ordem de Fala**: Sorteio aleatório ou reordenação dos participantes.
    - **Cronômetro Sincronizado**: Countdown decrescente sincronizado via WebSockets com aviso sonoro e visual ao esgotar.
    - **Passagem de Vez**: Controles de *Próximo Membro*, *Anterior* e *Finalizar Reunião*.

## 7. Exportação de Resumo
- **WHEN** a cerimônia é concluída ou sob demanda:
  - **THEN** o sistema gera resumos pré-formatados em:
    - **Markdown** estruturado com participantes, bloqueios e respostas individuais.
    - **Formato Slack/Discord**: Com negrito, menções e destaques de impedimentos.
