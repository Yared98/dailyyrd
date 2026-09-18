# Change: Harmonização Visual do Tema e Background da Tela Inicial

## Contexto
O tema visual e o background da tela inicial do DailyYrd foram harmonizados com o padrão do PlanningYrd, aplicando iluminação atmosférica radial e a paleta Slate/Obsidian.

## Mudanças Realizadas
- Adicionada variável `--bg-canvas-radial` com radial gradient (`#151d32` no centro superior a 50% 20% difundindo até `--bg-canvas` a 80%).
- Harmonização dos tokens CSS do tema escuro (`--bg-surface-elevated: #1e293b`, `--bg-card: rgba(30, 41, 59, 0.7)`).
- Atualização do componente `HomeView.tsx` para renderizar `var(--bg-canvas-radial)` no container da landing page.
- Refinamento do `.glass-modal` para raio de borda `--radius-2xl` (1.5rem / 24px) e desfoque `blur(20px)`.
- Suporte correspondente no tema claro para ambientação com tonalidade índigo suave (`#e0e7ff`).
