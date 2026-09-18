# Governança do Projeto DailyYrd (AGENTS.md)

Este projeto adota a metodologia **Spec-Driven Development** através do diretório `openspec/`.

## Regras Obrigatórias para Agentes de IA
1. **Isolamento de Sessão & Privacidade**:
   - O campo `session_hash` do participante é um segredo de autorização e **NUNCA** deve ser serializado em payloads JSON públicos ou broadcasts WebSocket.
   - Crawlers são impedidos de indexar salas através de `/robots.txt`.
2. **Servidor MCP Nativo (`POST /mcp`)**:
   - Tools de check-in e facilitação ao vivo sincronizam em tempo real com clientes conectados via WebSocket.
3. **Sincronização Contínua do OpenSpec**:
   - Toda alteração funcional, de endpoint, segurança ou UI deve ser refletida em `openspec/specs/` e documentada em `openspec/changes/`.
   - Consulte `openspec/AGENTS.md` e as especificações em `openspec/specs/` para orientações detalhadas.
