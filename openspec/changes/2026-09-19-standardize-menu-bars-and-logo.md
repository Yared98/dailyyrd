# Padronização de Menu Bars e Navegação via Logo no DailyYrd

## Contexto
O DailyYrd apresentava layout flutuante absoluto na página inicial (`HomeView.tsx`) e estilizações inline ad-hoc em seu cabeçalho (`Header.tsx`). Foi realizada a padronização do menu bar (`app-header`) e da navegação de retorno à tela inicial via clique na marca/logo.

## Mudanças Realizadas
1. **Padronização das Classes e Dimensões do Logo**:
   - Atualizado o logo com `.brand-logo` e `.brand-icon-box` padronizados (32x32px com gradiente de destaque e brilho).
   - O logo agora é um link `<a href="/" className="brand-logo">` direcionando diretamente para a tela inicial `/`.
2. **Menu Bar Padronizado na Página Inicial (`HomeView.tsx`)**:
   - Substituídos os controles flutuantes absolutos pelo `<header className="app-header">`.
   - À esquerda: Logo clicável direcionando a `/` e `EcosystemSwitcher`.
   - À direita: Botão MCP, seletor de idiomas (PT/EN), alternador de temas e link GitHub.
3. **Arquitetura Unificada de 2 Níveis (Tier 1 & Tier 2)**:
   - Nível 1 (`.app-header`): Marca `DailyYrd` clicável para `/`, `EcosystemSwitcher`, título do board (badge com status dot e tag FAC), e ferramentas utilitárias à direita (Convidar, MCP, Nova Daily, Idioma, Tema, GitHub).
   - Nível 2 (`.session-sub-header`): Barra de fluxo da sessão com contagem de membros online à esquerda e navegador de datas (`< 09/19/2026 > Hoje`) à direita.
   - Ocultação responsiva de rótulos de texto (`.header-btn-text` e `.ecosystem-switcher-label`) em telas `< 768px`.
