# Change: Expansão do Background Atmosférico e Segregação de Papéis em Times Recentes

## Contexto
O background radial foi expandido para todas as telas do DailyYrd, e o histórico de times da tela inicial foi estruturado para diferenciar facilitação de participação.

## Mudanças Realizadas
- `html, body` em `index.css` configurado com `background: var(--bg-canvas-radial)` e `background-attachment: fixed`.
- Interface `RecentBoard` enriquecida com `role: 'facilitator' | 'member'` e `facilitatorToken`.
- Tela inicial `HomeView.tsx` atualizada para dividir times em seções dedicadas: "Times que Facilito" (com badge de facilitador) e "Times que Participo".
- Inclusão de modal de confirmação para remoção de time do histórico.
