# DailyYrd - MCP Server Specification

## 1. Visão Geral
O backend do **DailyYrd** expõe um servidor nativo Model Context Protocol (MCP) via HTTP JSON-RPC 2.0 no endpoint `POST /mcp`.
Ele permite que agentes autônomos e copilotos de IA interajam diretamente com os dados e cerimônias de daily.

## 2. Resources Expostos
1. **`daily://board/{id}/today`**:
   - Retorna o snapshot completo do board da daily na data de hoje (check-ins, bloqueios, contagem de presença e estado da reunião).
2. **`daily://board/{id}/blockers`**:
   - Retorna exclusivamente a lista de membros e tarefas bloqueadas na data corrente.

## 3. Tools Disponíveis
- **`daily_submit_checkin`**: Submete ou atualiza o check-in de um membro a partir de dados coletados pelo agente (ex: commits no Git, PRs abertos no GitHub, cards finalizados no Kanban).
- **`daily_delete_checkin`**: Remove um check-in pelo ID e `session_hash`.
- **`daily_start_meeting`**: Inicia a reunião diária ao vivo com a lista ordenada de oradores.
- **`daily_next_speaker`**: Avança o turno para o próximo membro da roleta.
- **`daily_set_timer`**: Configura ou reinicia o cronômetro da reunião.
- **`daily_end_meeting`**: Conclui a reunião ao vivo e emite resumo.
- **`daily_get_board_summary`**: Extrai resumo consolidado do dia para exportação.

## 4. Requisitos de Tempo Real
- **WHEN** qualquer ferramenta MCP executa uma mutação:
  - **THEN** o servidor persiste a alteração no SQLite.
  - **AND** despacha a mensagem correspondente no Event Broker (`broadcast`), atualizando instantaneamente os clientes conectados via WebSocket.
