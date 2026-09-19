# Change: Política de Retenção de Dados e Auto-Purge no DailyYrd

- **Data**: 2026-09-19
- **Status**: Concluído
- **Contexto**: Padronização do tempo de guarda de dados com o ecossistema Yrd (RetroYrd / PlanningYrd).

## Modificações Realizadas
1. **Método de Limpeza no Banco (`db.rs`)**:
   - Adicionado `cleanup_expired_boards(&self, retention_days: i64) -> Result<usize>`.
   - Remoção de boards com `created_at < now - retention_days`.
   - Propagação em cascata no SQLite (`ON DELETE CASCADE`) para `checkins` e `board_state`.
   - Teste unitário automatizado `test_cleanup_expired_boards`.
2. **Rotina em Segundo Plano (`main.rs`)**:
   - `tokio::spawn` rodando a cada 24 horas (`tokio::time::interval`).
   - Leitura da variável de ambiente `BOARD_RETENTION_DAYS` (padrão: `60`).
3. **Configuração e Documentação**:
   - Documentado no `.env.example`, `Dockerfile`, `docker-compose.yml`, e `openspec/specs/security-resilience/spec.md`.
