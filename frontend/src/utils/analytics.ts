// Utilitário de telemetria e analytics integrado ao Umami
// Blindado para privacidade:
// 1. O script é injetado dinamicamente APENAS se configurado via .env / backend /api/config.
// 2. data-auto-track="false" é sempre aplicado.
// 3. Rotas de sessão são sempre mascaradas para '/board', sem IDs e sem tokens.

declare global {
  interface Window {
    umami?: {
      track: {
        (payload?: (props: Record<string, any>) => Record<string, any>): void;
        (eventName: string, eventData?: Record<string, any>): void;
      };
    };
  }
}

let isInitialized = false;

/**
 * Inicializa dinamicamente o Umami buscando as configurações do backend ou variáveis Vite.
 * Se nenhuma configuração for encontrada, o analytics permanece completamente inativo.
 */
export async function initAnalytics(): Promise<void> {
  if (isInitialized || typeof window === 'undefined') return;
  isInitialized = true;

  try {
    let scriptUrl = (import.meta as any).env?.VITE_UMAMI_SCRIPT_URL;
    let websiteId = (import.meta as any).env?.VITE_UMAMI_WEBSITE_ID;

    // Se não estiver embutido no build Vite, consulta o backend (/api/config)
    if (!scriptUrl || !websiteId) {
      try {
        const res = await fetch('/api/config');
        if (res.ok) {
          const data = await res.json();
          scriptUrl = data.umami_script_url;
          websiteId = data.umami_website_id;
        }
      } catch {
        // Falha silenciosa se backend não responder
      }
    }

    if (scriptUrl && websiteId) {
      // Garantir que não duplica o script
      if (!document.querySelector(`script[data-website-id="${websiteId}"]`)) {
        const script = document.createElement('script');
        script.defer = true;
        script.src = scriptUrl;
        script.setAttribute('data-website-id', websiteId);
        script.setAttribute('data-auto-track', 'false'); // Impede envio automático de rotas com tokens/IDs
        document.head.appendChild(script);
      }
    }
  } catch (err) {
    console.debug('[Analytics] Inicialização opcional ignorada:', err);
  }
}

/**
 * Registra um pageview higienizado no Umami.
 * Garante que rotas de board não vazem o ID da sala nem o token do facilitador.
 */
export function trackPageView(sanitizedPath: '/' | '/board', title?: string) {
  try {
    if (typeof window !== 'undefined' && window.umami) {
      window.umami.track((props) => ({
        ...props,
        url: sanitizedPath,
        title: title || (sanitizedPath === '/' ? 'DailyYrd — Início' : 'DailyYrd — Quadro da Daily'),
      }));
    }
  } catch (err) {
    console.debug('[Analytics] Falha ao registrar pageview:', err);
  }
}

/**
 * Dispara um evento de produto customizado com dados agregados/anônimos.
 */
export function trackEvent(eventName: string, eventData?: Record<string, string | number | boolean>) {
  try {
    if (typeof window !== 'undefined' && window.umami) {
      window.umami.track(eventName, eventData);
    }
  } catch (err) {
    console.debug(`[Analytics] Falha ao registrar evento ${eventName}:`, err);
  }
}
