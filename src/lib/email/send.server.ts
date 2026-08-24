import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { renderEventEmail, type EmailVars } from "./templates.server";

/**
 * Envío de correos con Resend. La clave vive solo en la variable de entorno
 * RESEND_API_KEY; nunca en el código ni en el navegador.
 */
const SENDER_DOMAIN = "mail.academiasinfronteras.com";

function fromAddress(): string {
  return process.env["RESEND_FROM_EMAIL"] || `Pinturitas <hola@${SENDER_DOMAIN}>`;
}

async function logEmail(row: {
  user_id?: string | null;
  template_code: string;
  to_email: string;
  status: string;
  provider_message_id?: string | null;
  error?: string | null;
}) {
  try {
    await supabaseAdmin.from("email_log").insert(row);
  } catch (err) {
    console.error("[email] no se pudo registrar en email_log", err);
  }
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  templateCode: string;
  userId?: string | null;
}): Promise<{ sent: boolean; id?: string; error?: string }> {
  const apiKey = process.env["RESEND_API_KEY"];
  if (!apiKey) {
    const error = "RESEND_API_KEY no está configurada";
    console.error(`[email] ${error}`);
    await logEmail({ ...base(opts), status: "error", error });
    return { sent: false, error };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: fromAddress(),
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
      }),
    });
    const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok) {
      const error = `Resend ${res.status}: ${body.message ?? "error desconocido"}`;
      console.error(`[email] ${error}`);
      await logEmail({ ...base(opts), status: "error", error });
      return { sent: false, error };
    }
    await logEmail({ ...base(opts), status: "enviado", provider_message_id: body.id ?? null });
    return { sent: true, id: body.id };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error("[email] fallo de red al enviar", error);
    await logEmail({ ...base(opts), status: "error", error });
    return { sent: false, error };
  }
}

function base(opts: { to: string; templateCode: string; userId?: string | null }) {
  return { to_email: opts.to, template_code: opts.templateCode, user_id: opts.userId ?? null };
}

/** Envía el correo que corresponda al evento de Hotmart (si hay plantilla). */
export async function sendEventEmail(
  event: string,
  to: string,
  vars: EmailVars,
  userId?: string | null,
): Promise<void> {
  const content = renderEventEmail(event, vars);
  if (!content) return;
  await sendEmail({
    to,
    subject: content.subject,
    html: content.html,
    templateCode: event.toLowerCase(),
    userId: userId ?? null,
  });
}
