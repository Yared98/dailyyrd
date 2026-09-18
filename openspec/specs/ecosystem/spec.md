# DailyYrd - Ecosystem & Analytics Specification

## 1. Yrd Agile Toolkit Switcher
- O componente `EcosystemSwitcher` permite navegação cruzada transparente entre `RetroYrd`, `DailyYrd` e `PlanningYrd`.
- Detecta ambiente local (`localhost:8080`, `localhost:8081`, `localhost:3000`) e redireciona para portas dev ou subdomínios de produção (`retro.yared.com.br`, `daily.yared.com.br`, `planning.yared.com.br`).

## 2. Rodapé Padronizado
- Exibe autoria ("Desenvolvido por Yared") com link para `https://yared.com.br/` e botão com ícone do GitHub apontando para `https://github.com/Yared98/dailyyrd`.

## 3. Umami Analytics Blindado para Privacidade
- Endpoint `GET /api/config` disponibiliza `umami_script_url` e `umami_website_id` definidos via variáveis de ambiente.
- O script injetado força `data-auto-track="false"`.
- Rotas são higienizadas para `/` e `/board` sem vazar IDs de times ou parâmetros sensíveis de URL.

## 4. Design System & Tema Unificado
- Utiliza tema escuro "Agile Cadence" com paleta Slate/Obsidian (`--bg-canvas: #090d16`, `--bg-surface: #0f172a`, `--bg-surface-elevated: #1e293b`, `--bg-card: rgba(30, 41, 59, 0.7)`).
- Tela inicial com iluminação atmosférica via background radial gradient (`--bg-canvas-radial: radial-gradient(circle at 50% 20%, #151d32 0%, var(--bg-canvas) 80%)`).
- Cartões com acabamento glassmorphism (`backdrop-filter: blur(20px)`, `border-radius: var(--radius-2xl)`).

## 5. Ambient Background Global & Histórico de Times Recentes
- Background radial fixo no `body` (`background-attachment: fixed`), garantindo iluminação uniforme em todas as telas (Home e Quadro de Daily).
- Histórico de times recentes com segregação explícita entre "Times que Facilito" (com token de facilitador) e "Times que Participo", permitindo acesso direto e remoção individual com confirmação.

## 6. Padronização da Estrutura da Homepage
- Arquitetura unificada com o modelo de referência do PlanningYrd em todo o ecossistema:
  - Controles de topo (EcosystemSwitcher, Alternador de Idioma PT/EN, Alternador de Tema Claro/Escuro, Link GitHub) posicionados no canto superior direito.
  - Hero banner centralizado externo ao card com badge de marca com efeito `.brand-icon-box`, título `<h1>` e subtítulo `<p>`.
  - Glass Card centralizado de 480px com abas internas de navegação: "Criar Time / Daily" e "Entrar com Código".
  - Aba Criar com formulário de time, timer de standup e destaques dos 3 pilares.
  - Aba Entrar com campo de código/ID do time para entrada rápida.
  - Histórico de times segregado por papel (Facilitador vs Participante) integrado no card.
  - Rodapé padronizado externo ao card com largura consistente de 480px.
