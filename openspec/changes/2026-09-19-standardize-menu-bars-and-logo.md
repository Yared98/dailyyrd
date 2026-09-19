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
3. **Harmonização do Cabeçalho de Sessão (`Header.tsx`)**:
   - Alinhado para usar a classe `.app-header` com `.header-left` e `.header-right` responsivos.
