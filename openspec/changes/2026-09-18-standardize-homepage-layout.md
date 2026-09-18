# Mudança: Padronização Estrutural da Homepage no DailyYrd

- **Data**: 2026-09-18
- **Autor**: Antigravity AI
- **Repositórios Impactados**: `dailyyrd`, `retroyrd`, `planningyrd`

## Contexto e Motivação
A estrutura visual da homepage do `DailyYrd` foi padronizada com o modelo do `PlanningYrd`:
1. Hero banner centralizado externo ao card, contendo badge da marca com ícone `.brand-icon-box` iluminado, título e subtítulo.
2. Glass card centralizado (largura 480px, `border-radius: var(--radius-2xl)`) com abas de navegação internas ("Criar Time / Daily" e "Entrar com Código").
3. Aba "Criar" com inputs de nome do time, descrição, seleção rápida de tempo por membro (45s, 60s, 90s, 120s) e pilares em destaque.
4. Aba "Entrar com Código" com campo para digitação do código/ID do time e entrada imediata.
5. Histórico recente segregado por "Times que Facilito" e "Times que Participo" mantido dentro do card, com diálogo modal de exclusão.
6. Rodapé padronizado externo ao card alinhado a 480px de largura.
