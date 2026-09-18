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
