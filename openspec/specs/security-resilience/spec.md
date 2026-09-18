# DailyYrd - Security & Resilience Specification

## 1. Isolamento de Credenciais de Sessão (Mitigação de IDOR)
- **Obrigatório**: O campo `session_hash` da struct `CheckIn` utiliza `#[serde(skip_serializing)]`.
- **Regra**: O `session_hash` **NUNCA** deve ser transmitido em JSON para o cliente via REST (`GET /api/boards/{id}`) ou broadcast WebSocket (`CHECKIN_SAVED`).
- **Validação de Posse**: A struct `DailyBoardSnapshot` retorna `user_checkin_id: Option<String>` indicando se o solicitante possui um check-in no dia.

## 2. Prevenção de DoS no Heartbeat PING
- Mensagens de `PING` enviadas por clientes WebSocket não devem disparar broadcast de `PONG` para a sala.
- O heartbeat de transporte é mantido pelos frames nativos do protocolo WebSocket.

## 3. Limites de Entrada e Proteção contra Crawlers
- **Nomes de Time**: 1 a 100 caracteres.
- **Descrições**: Máximo de 1000 caracteres.
- **Proteção contra Indexação**: Rota `/robots.txt` responde com `Disallow: /` para impedir indexação de boards internos por motores de busca.
