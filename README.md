<div align="center">

# ⏱️ DailyYrd

**Standups Ágeis & Síncronas em Tempo Real**

*Acompanhamento inteligente de Daily Standups com destaque imediato de impedimentos, roleta de ordem de fala ao vivo e sincronização por WebSockets.*

[![Rust](https://img.shields.io/badge/Rust-1.80+-orange.svg?logo=rust)](https://www.rust-lang.org)
[![Axum](https://img.shields.io/badge/Axum-0.8-blue.svg)](https://github.com/tokio-rs/axum)
[![React](https://img.shields.io/badge/React-19-61dafb.svg?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6+-3178c6.svg?logo=typescript)](https://www.typescriptlang.org)
[![Design System](https://img.shields.io/badge/Design_System-Agile_Cadence-6366f1.svg)](https://github.com/Yared98)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**[🚀 Teste a Demonstração Online](https://daily.yared.com.br)** • [Funcionalidades](#-funcionalidades) • [Arquitetura](#-arquitetura) • [Como Executar](#-como-executar) • [API & WebSockets](#-api--websockets) • [Toolkit](#-yrd-agile-toolkit)

</div>

---

## 🎯 Visão Geral

O **DailyYrd** foi projetado para eliminar o tédio e a ineficiência das reuniões diárias de times ágeis. Combinando flexibilidade assíncrona com interatividade ao vivo, a ferramenta atende tanto equipes 100% remotas distribuídas em fusos horários diferentes quanto times que realizam a cerimônia síncrona de 15 minutos:

1. **Modo Assíncrono:** Os desenvolvedores preenchem seu status em menos de 1 minuto logo no início do dia (O que fiz ontem, O que farei hoje, Impedimentos).
2. **Spotlight de Bloqueios:** Impedimentos e alertas críticos são destacados no topo com visual contrastante e pulso semafórico em Coral/Rose, permitindo que Tech Leads e Scrum Masters ajam antes que prazos sejam comprometidos.
3. **Modo Reunião / Roleta Síncrona:** Sorteio dinâmico da ordem de fala com cronômetro regressivo de 90 segundos por pessoa, sincronizado em tempo real para todos os participantes via WebSockets, e chuva de confetes ao concluir a reunião!
4. **Exportação com 1 Clique:** Formatação automática pronta para compartilhar no Slack, Discord, Microsoft Teams ou documentar em Markdown.
5. **Internacionalização (i18n):** Suporte nativo completo a Português (`pt-BR`) e Inglês (`en-US`).

---

## 🚀 Funcionalidades Principais

- ⚡ **Check-in Rápido e Intuitivo:** Interface leve com suporte a markdown, tags de humor (Foco, Motivado, Preciso de café, etc.) e seleção de cor de avatar.
- 🚨 **Painel de Triagem de Bloqueios:** Visão consolidada que separa membros desimpedidos de membros bloqueados, com filtros rápidos e busca em tempo real.
- 🎲 **Roleta de Ordem de Fala (Live Standup):**
  - Sorteio aleatório ou reordenação com um clique.
  - Temporizador por participante com alerta visual e sonoro quando o tempo se esgota.
  - Indicador de quem está falando agora e quem é o próximo.
  - Celebração ao finalizar com fogos/confetes.
- 👥 **Presença ao Vivo:** Contagem de participantes conectados em tempo real no board.
- 📅 **Histórico Completo por Data:** Navegação simplificada entre dias anteriores para auditoria e retrospectivas.
- 📋 **Exportação Inteligente:**
  - Sintaxe rica para Slack / Discord (`*negrito*`, emojis, menções de bloqueio).
  - Tabela e listas estruturadas em Markdown.
- 🔒 **Sem Dependências Pesadas:** Backend compilado em binário único com SQLite integrado em modo WAL de alta concorrência.

---

## 🏗️ Arquitetura

O DailyYrd segue a governança do ecossistema **Yrd Agile Toolkit** e o padrão **OpenSpec**:

```
dailyyrd/
├── backend/                  # Servidor Rust de alta performance
│   ├── src/
│   │   ├── main.rs           # Servidor Axum, rotas REST e SPA static service
│   │   ├── db.rs             # SQLite (rusqlite) com WAL mode e migrations
│   │   ├── models.rs         # Modelos de dados e tipos de mensagens
│   │   ├── state.rs          # Estado compartilhado, canais de broadcast e presença
│   │   └── ws.rs             # Handler de WebSocket e sincronização de eventos
│   └── Cargo.toml
├── frontend/                 # Interface React moderna
│   ├── src/
│   │   ├── components/       # Header, DailyBoardView, LiveMeetingModal, etc.
│   │   ├── hooks/            # useDailySocket para conexão bidirecional resiliente
│   │   ├── i18n/             # Dicionários de tradução (pt-BR / en-US)
│   │   ├── utils/            # Gerenciamento de sessão, perfil e histórico local
│   │   ├── types.ts          # Tipagens estritas TypeScript
│   │   ├── index.css         # Design System "Agile Cadence" (Stitch MCP)
│   │   └── App.tsx           # Ponto de entrada e gerenciamento de estado
│   └── package.json
└── openspec/                 # Governança e especificações arquiteturais
```

---

## 💻 Como Executar

### Pré-requisitos
- **Rust** 1.80+ ([Instalar Rust](https://rustup.rs))
- **Node.js** 20+ & npm ([Instalar Node](https://nodejs.org))

### 1. Backend (Rust)
```bash
cd backend
cargo run
```
O servidor iniciará em `http://localhost:8081`. O banco de dados SQLite será criado automaticamente em `backend/data/daily.db`.

### 2. Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
O frontend estará acessível em `http://localhost:5173`. As chamadas de `/api` e os WebSockets de `/ws` serão redirecionados automaticamente para o backend pelo proxy do Vite.

### 3. Build de Produção (Single Binary)
```bash
# 1. Compilar o frontend
cd frontend
npm run build

# 2. Executar o backend apontando para os assets compilados
cd ../backend
cargo run --release
```
O Axum servirá toda a aplicação (API, WebSockets e frontend SPA) na porta `8081`!

---

## 📡 API & WebSockets

### REST Endpoints
| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/health` | Verificação de integridade do servidor |
| `POST` | `/api/boards` | Cria um novo board de Daily para o time |
| `GET` | `/api/boards/:id` | Retorna snapshot do board (check-ins, reunião, presença) |
| `GET` | `/api/boards/:id/dates` | Lista as datas disponíveis com check-ins |
| `POST` | `/api/boards/:id/checkins` | Salva ou atualiza o check-in diário de um membro |
| `DELETE` | `/api/boards/:id/checkins/:checkin_id` | Exclui um check-in (autor ou facilitador) |
| `GET` | `/api/boards/:id/export` | Gera resumo formatado (`?format=slack` ou `markdown`) |

### Eventos WebSocket (`/ws/board/:id`)
- `PRESENCE_UPDATE`: Atualização da contagem de pessoas online.
- `CHECKIN_SAVED`: Broadcast instantâneo de novos check-ins para todos os membros.
- `CHECKIN_DELETED`: Remoção em tempo real de check-ins deletados.
- `MEETING_STATE_CHANGED`: Sincronização do turno atual, timer e ordem da roleta.
- `START_TIMER` / `PAUSE_TIMER` / `RESET_TIMER`: Controle do cronômetro sincronizado.

---

## 🎨 Design System: "Agile Cadence"

O projeto utiliza a identidade visual padronizada do portfólio **Yrd**, gerada com auxílio do **Stitch MCP**:
- **Canvas Base:** `#090D16` (Profundidade Obsidian/Slate)
- **Primary Action:** `#6366F1` (Electric Indigo) com brilho volumétrico
- **Success / Unimpeded:** `#10B981` (Emerald Green)
- **Blocker / Impediment:** `#F43F5E` (Rose Coral radiante com pulso luminoso)
- **Tipografia:** `Plus Jakarta Sans` (Display & Interface) e `JetBrains Mono` (Contadores & Timers)
- **Superfícies:** Vidro fosco (*glassmorphism*) com bordas de 1px translúcidas (`rgba(255, 255, 255, 0.08)`).

---

## 🧰 Yrd Agile Toolkit

O **DailyYrd** faz parte do ecossistema de cerimônias ágeis corporativas sem custo de licenciamento:

| Ferramenta | Propósito | Link de Produção |
| :--- | :--- | :--- |
| **RetroYrd** | Retrospectivas Ágeis com Segurança Psicológica, Modo Cego e Servidor MCP | [retro.yared.com.br](https://retro.yared.com.br) |
| **DailyYrd** | Standups Diárias com Roleta de Fala, Spotlight de Bloqueios e Exportação Slack | [daily.yared.com.br](https://daily.yared.com.br) |
| **PlanningYrd** | Planning Poker em Tempo Real, Métricas de Consenso e Backlog de Histórias | [planning.yared.com.br](https://planning.yared.com.br) |

---

## 📄 Licença

Distribuído sob a licença MIT. Consulte `LICENSE` para mais detalhes.
Desenvolvido por **[Yared](https://yared.com.br)**.
