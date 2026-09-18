# Diretrizes para Agentes de IA (DailyYrd)

Este projeto segue a metodologia **OpenSpec (Spec-Driven Development)**.
Como um agente atuando neste repositório, você deve seguir rigorosamente estas diretrizes:

## Arquitetura Base
- **Backend:** Rust (Axum, Tokio, WebSockets). Foco em alta performance, persistência leve e event broker em memória.
- **Frontend:** React + Vite + TypeScript. 
- **Identidade Visual (Stitch MCP):** O projeto deve manter a exata mesma identidade visual do *Retroyrd* (Design System "Agile Cadence"). As interfaces devem ser geradas e prototipadas utilizando o servidor **Stitch MCP** para garantir consistência visual no portfólio.
- **Internacionalização (i18n):** Suporte multi-language obrigatório desde a base.

## Regras de Modificação
1. Toda nova funcionalidade deve ser precedida por uma especificação na pasta `openspec/specs/`.
2. Qualquer mudança arquitetural deve ser documentada em `openspec/changes/`.
3. Priorize WebSockets para atualizações de status em tempo real durante a daily assíncrona.
