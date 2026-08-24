import { createFileRoute } from "@tanstack/react-router";

/**
 * Webhook de Hotmart: POST /api/hotmart
 * (alias público equivalente: POST /api/public/hotmart)
 */
export const Route = createFileRoute("/api/hotmart")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleHotmartWebhook } = await import("@/lib/hotmart-webhook.server");
        return handleHotmartWebhook(request);
      },
    },
  },
});
