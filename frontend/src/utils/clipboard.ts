/**
 * Utilitário universal de cópia para área de transferência.
 * Garante funcionamento tanto em contextos seguros (HTTPS/localhost)
 * quanto em conexões locais HTTP ou navegadores sem permissão direta de clipboard.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // 1. Tenta API moderna navigator.clipboard se disponível
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('navigator.clipboard.writeText falhou, acionando fallback execCommand:', err);
    }
  }

  // 2. Fallback clássico robusto utilizando textarea invisível e document.execCommand('copy')
  if (typeof document !== 'undefined') {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      // Previne scroll ou visualização indesejada na tela
      textArea.style.position = 'fixed';
      textArea.style.top = '0';
      textArea.style.left = '0';
      textArea.style.width = '2em';
      textArea.style.height = '2em';
      textArea.style.padding = '0';
      textArea.style.border = 'none';
      textArea.style.outline = 'none';
      textArea.style.boxShadow = 'none';
      textArea.style.background = 'transparent';
      textArea.style.opacity = '0';
      textArea.setAttribute('readonly', '');

      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      textArea.setSelectionRange(0, text.length);

      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);

      if (successful) return true;
    } catch (fallbackErr) {
      console.error('Fallback document.execCommand falhou:', fallbackErr);
    }
  }

  return false;
}
