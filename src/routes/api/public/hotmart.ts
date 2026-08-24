import { createFileRoute } from "@tanstack/react-router";

/**
 * Alias público del webhook de Hotmart: POST /api/public/hotmart
 * Este prefijo no pasa por la autenticación del sitio publicado, así que es
 * la URL recomendada para configurar en el panel de Hotmart.
 * La seguridad la da la verificación del hottok dentro del handler.
 */
export const Route = createFileRoute("/api/public/hotmart")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleHotmartWebhook } = await import("@/lib/hotmart-webhook.server");
        return handleHotmartWebhook(request);
      },
    },
  },
});
