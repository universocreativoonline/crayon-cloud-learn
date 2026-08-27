// ============================================================================
// Supabase Edge Function · Webhook de Hotmart (Postback / Webhook 2.0)
//
//   URL pública:  https://<PROJECT-REF>.supabase.co/functions/v1/hotmart
//   Método:       POST
//   verify_jwt:   false  (autenticación propia con el HOTTOK)
//
// Variables de entorno (Secrets de la función; NUNCA en el código):
//   - HOTMART_HOTTOK              (obligatoria) se valida contra el hottok recibido
//   - RESEND_API_KEY             (obligatoria) envío de correos branded
//   - RESEND_FROM_EMAIL          (opcional)    remitente; por defecto el dominio verificado
//   - APP_URL                    (opcional)    base para los botones de los correos
//   - SUPABASE_URL               (automática en edge functions)
//   - SUPABASE_SERVICE_ROLE_KEY  (automática en edge functions) — escribe en BD sin RLS
// ============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// HOTTOK: verificación en tiempo constante
// ---------------------------------------------------------------------------
async function sha256(s: string): Promise<Uint8Array> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return new Uint8Array(buf);
}
function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a[i] ^ b[i];
  return r === 0;
}
async function verifyHottok(headers: Headers, body: any): Promise<{ ok: boolean; reason?: string }> {
  const expected = Deno.env.get("HOTMART_HOTTOK");
  if (!expected) return { ok: false, reason: "Falta HOTMART_HOTTOK en los Secrets" };
  const received =
    headers.get("x-hotmart-hottok") ||
    (typeof body?.hottok === "string" ? body.hottok : "") ||
    (typeof body?.data?.hottok === "string" ? body.data.hottok : "");
  if (!received) return { ok: false, reason: "No llegó el hottok en el header ni en el cuerpo" };
  if (!constantTimeEqual(await sha256(received), await sha256(expected)))
    return { ok: false, reason: "HOTTOK inválido" };
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Parseo defensivo del payload
// ---------------------------------------------------------------------------
const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
function humanDate(input: unknown): string {
  if (!input) return "";
  let d: Date | null = null;
  if (typeof input === "number") d = new Date(input);
  else if (typeof input === "string") {
    const n = Number(input);
    d = Number.isFinite(n) && input.trim() !== "" ? new Date(n) : new Date(input);
  }
  if (!d || isNaN(d.getTime())) return str(input);
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function parsePayload(body: any) {
  const data = body?.data ?? {};
  const purchase = data?.purchase ?? {};
  const buyer = data?.buyer ?? {};
  const subscription = data?.subscription ?? {};
  const product = data?.product ?? {};
  const offer = purchase?.offer ?? subscription?.plan ?? {};
  return {
    event: str(body?.event).toUpperCase(),
    eventId: str(body?.id) || str(purchase?.transaction) || str(body?.creation_date),
    buyerEmail: str(buyer?.email).toLowerCase(),
    buyerName: str(buyer?.name),
    offerCode: str(offer?.code || offer?.key),
    transaction: str(purchase?.transaction),
    subscriberCode: str(subscription?.subscriber?.code || subscription?.subscriber_code),
    planName: str(subscription?.plan?.name || offer?.name),
    nextChargeRaw: purchase?.date_next_charge ?? subscription?.date_next_charge ?? data?.date_next_charge,
  };
}
type Status = "activa" | "pendiente" | "cancelada" | "vencida" | null;
function eventToEffect(event: string): { status: Status; setStarted?: boolean } {
  switch (event) {
    case "PURCHASE_APPROVED":
    case "PURCHASE_COMPLETE":
      return { status: "activa", setStarted: true };
    case "SWITCH_PLAN":
    case "UPDATE_SUBSCRIPTION_CHARGE_DATE":
      return { status: "activa", setStarted: false };
    case "PURCHASE_BILLET_PRINTED":
    case "PURCHASE_DELAYED":
      return { status: "pendiente" };
    case "PURCHASE_CANCELED":
    case "PURCHASE_REFUNDED":
    case "PURCHASE_CHARGEBACK":
    case "SUBSCRIPTION_CANCELLATION":
      return { status: "cancelada" };
    case "PURCHASE_EXPIRED":
      return { status: "vencida" };
    default:
      return { status: null };
  }
}

// ---------------------------------------------------------------------------
// Correos branded "Caja de Crayones" (mismo layout para todos los eventos)
// ---------------------------------------------------------------------------
const BRAND = {
  paper: "#FFF6EE", card: "#FFFFFF", border: "#F0E2D4", ink: "#2A2118",
  muted: "#7A6A5C", info: "#F7EFE6", orange: "#FF7A3D", turquoise: "#17B8B0", red: "#E63946",
};
const APP = (Deno.env.get("APP_URL") || "https://pinturita.lovable.app").replace(/\/+$/, "");
const appUrl = (p = "") => (p ? `${APP}/${p.replace(/^\/+/, "")}` : APP);
const esc = (v: string) => String(v ?? "").replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]!));

type BrandedEmail = {
  subject: string; accent?: string; title: string; body: string[];
  info?: Array<{ label: string; value: string }>; ctaLabel?: string; ctaUrl?: string; footNote?: string;
};
function renderBrandedEmail(e: BrandedEmail): string {
  const accent = e.accent || BRAND.orange;
  const paragraphs = e.body.map((p) => `<p>${p}</p>`).join("\n        ");
  const info = e.info?.length
    ? `<div class="info">${e.info.map((r) => `<strong>${esc(r.label)}:</strong> ${esc(r.value)}`).join("<br/>")}</div>`
    : "";
  const cta = e.ctaLabel && e.ctaUrl
    ? `<p style="text-align:center;"><a class="cta" href="${esc(e.ctaUrl)}">${esc(e.ctaLabel)}</a></p>` : "";
  const foot = e.footNote || "Puedes gestionar tu suscripción desde la Zona de Padres.";
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(e.subject)}</title>
<style>
  body { margin:0; padding:0; background:${BRAND.paper}; font-family:"Nunito",Helvetica,Arial,sans-serif; color:${BRAND.ink}; }
  .wrap { padding:32px 16px; } .brand { text-align:center; font-family:"Fredoka",Georgia,serif; font-weight:700; font-size:22px; color:${BRAND.orange}; margin:0 auto 16px; }
  .card { max-width:600px; margin:0 auto; background:${BRAND.card}; border:1px solid ${BRAND.border}; border-radius:20px; padding:40px 32px; }
  h1 { font-family:"Fredoka",Georgia,serif; color:${accent}; margin:0 0 16px; font-size:28px; }
  p { line-height:1.6; margin:0 0 16px; font-size:16px; }
  .info { background:${BRAND.info}; border-radius:16px; padding:16px 20px; margin:16px 0; }
  .cta { display:inline-block; background:${BRAND.orange}; color:#FFFFFF !important; text-decoration:none; padding:16px 28px; border-radius:16px; font-weight:700; margin:16px 0; }
  .foot { text-align:center; color:${BRAND.muted}; font-size:12px; padding:16px; }
</style></head>
<body><div class="wrap"><div class="brand">🖍️ Pinturitas</div>
<div class="card"><h1>${esc(e.title)}</h1>
        ${paragraphs}
        ${info}
        ${cta}
        <p>Un abrazo,<br/>El equipo de Pinturitas</p></div>
<p class="foot">${esc(foot)}</p></div></body></html>`;
}

type Vars = { display_name?: string; plan_name?: string; renews_at?: string; amount?: string; charge_date?: string };
const nm = (v: Vars) => v.display_name?.trim() || "hola";
const HOTMART_EMAILS: Record<string, (v: Vars) => BrandedEmail> = {
  PURCHASE_APPROVED: (v) => ({
    subject: "¡Tu suscripción a Pinturitas está activa!", accent: BRAND.turquoise,
    title: `¡Suscripción activa, ${nm(v)}!`,
    body: ["Ya tienes acceso completo a todos los mundos, láminas y juegos de Pinturitas.", "Crea el perfil de tu peque y elige el primer mundo para empezar."],
    info: [...(v.plan_name ? [{ label: "Plan", value: v.plan_name }] : []), ...(v.renews_at ? [{ label: "Próxima renovación", value: v.renews_at }] : [])],
    ctaLabel: "Explorar todos los mundos", ctaUrl: appUrl("/mundos"),
  }),
  PURCHASE_COMPLETE: (v) => ({
    subject: "Tu compra en Pinturitas se completó", accent: BRAND.turquoise,
    title: `¡Todo listo, ${nm(v)}!`,
    body: ["Tu compra quedó completada y tu acceso está confirmado.", "Gracias por confiar en nosotros para acompañar a tu peque."],
    ctaLabel: "Entrar a Pinturitas", ctaUrl: appUrl("/hoy"),
  }),
  PURCHASE_BILLET_PRINTED: (v) => ({
    subject: "Estamos a la espera de tu pago", title: `Ya casi, ${nm(v)}`,
    body: ["Generamos tu orden y estamos <strong>a la espera del pago</strong>.", "En cuanto se confirme, activaremos tu acceso automáticamente y te avisaremos por aquí."],
  }),
  PURCHASE_DELAYED: (v) => ({
    subject: "Tu pago está retrasado", accent: BRAND.red, title: `Un aviso, ${nm(v)}`,
    body: ["El cobro de tu suscripción aparece como <strong>atrasado</strong>.", "Si ya lo realizaste, ignora este mensaje. Si no, puedes completarlo para no perder el acceso."],
    ctaLabel: "Revisar mi plan", ctaUrl: appUrl("/padres/planes"),
  }),
  PURCHASE_CANCELED: (v) => ({
    subject: "Tu compra fue cancelada", accent: BRAND.red, title: `Compra cancelada, ${nm(v)}`,
    body: ["Tu compra en Pinturitas fue <strong>cancelada</strong> y por ahora no tienes acceso activo.", "Si fue un error o quieres volver, puedes suscribirte de nuevo cuando quieras."],
    ctaLabel: "Ver los planes", ctaUrl: appUrl("/padres/planes"),
  }),
  PURCHASE_REFUNDED: (v) => ({
    subject: "Tu reembolso fue procesado", accent: BRAND.red, title: `Reembolso procesado, ${nm(v)}`,
    body: ["Procesamos el <strong>reembolso</strong> de tu compra. El acceso quedó desactivado.", "Lamentamos que te vayas. Si cambias de idea, aquí te esperamos."],
    ctaLabel: "Volver a Pinturitas", ctaUrl: appUrl("/padres/planes"),
  }),
  PURCHASE_CHARGEBACK: (v) => ({
    subject: "Recibimos un contracargo de tu compra", accent: BRAND.red, title: `Aviso sobre tu pago, ${nm(v)}`,
    body: ["Se registró un <strong>contracargo (chargeback)</strong> sobre tu compra, así que el acceso quedó suspendido.", "Si crees que es un error, responde a este correo y te ayudamos a resolverlo."],
  }),
  PURCHASE_PROTEST: (v) => ({
    subject: "Recibimos tu solicitud de reembolso", accent: BRAND.red, title: `Estamos en ello, ${nm(v)}`,
    body: ["Registramos tu <strong>solicitud de reembolso</strong> y la estamos revisando.", "Te avisaremos por este mismo medio cuando tengamos una respuesta."],
  }),
  PURCHASE_EXPIRED: (v) => ({
    subject: "Tu orden de pago venció", accent: BRAND.red, title: `Se venció el plazo, ${nm(v)}`,
    body: ["La orden de pago venció antes de completarse, así que no pudimos activar tu acceso.", "No te preocupes: puedes generar una nueva en un par de clics."],
    ctaLabel: "Reintentar mi compra", ctaUrl: appUrl("/padres/planes"),
  }),
  SUBSCRIPTION_CANCELLATION: (v) => ({
    subject: "Tu suscripción fue cancelada", accent: BRAND.red, title: `Suscripción cancelada, ${nm(v)}`,
    body: ["Confirmamos la <strong>cancelación</strong> de tu suscripción a Pinturitas.", "Podrás usar el servicio hasta el final del período ya pagado. ¡Gracias por acompañarnos!"],
    ctaLabel: "Reactivar cuando quieras", ctaUrl: appUrl("/padres/planes"),
  }),
  SWITCH_PLAN: (v) => ({
    subject: "Cambiaste de plan en Pinturitas", accent: BRAND.turquoise, title: `Plan actualizado, ${nm(v)}`,
    body: ["Tu plan se actualizó correctamente. Estos son los nuevos datos:"],
    info: [...(v.plan_name ? [{ label: "Nuevo plan", value: v.plan_name }] : []), ...(v.renews_at ? [{ label: "Próxima renovación", value: v.renews_at }] : [])],
    ctaLabel: "Ver mi suscripción", ctaUrl: appUrl("/padres/planes"),
  }),
  UPDATE_SUBSCRIPTION_CHARGE_DATE: (v) => ({
    subject: "Actualizamos la fecha de tu próximo cobro", accent: BRAND.turquoise, title: `Nueva fecha de cobro, ${nm(v)}`,
    body: ["Actualizamos la fecha del próximo cobro de tu suscripción."],
    info: [{ label: "Próximo cobro", value: v.charge_date || v.renews_at || "—" }],
  }),
};

async function sendEmail(supabase: any, event: string, to: string, userId: string | null, vars: Vars) {
  const builder = HOTMART_EMAILS[event];
  if (!builder || !to) return { skipped: true };
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("RESEND_FROM_EMAIL") || "Pinturitas <no-reply@mail.academiasinfronteras.com>";
  const email = builder(vars);
  const template_code = `hotmart_${event.toLowerCase()}`;

  const log = async (status: string, provider_message_id: string | null, error: string | null) => {
    const { error: logErr } = await supabase
      .from("email_log")
      .insert({ user_id: userId, template_code, to_email: to, status, provider_message_id, error });
    if (logErr) console.error("[hotmart] no se pudo escribir email_log:", logErr.message ?? logErr);
  };

  if (!apiKey) {
    await log("error", null, "Falta RESEND_API_KEY");
    return { ok: false, error: "Falta RESEND_API_KEY" };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject: email.subject, html: renderBrandedEmail(email) }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      await log("error", null, data?.message || `Resend ${res.status}`);
      return { ok: false, error: data?.message || `Resend ${res.status}` };
    }
    await log("sent", data?.id ?? null, null);
    return { ok: true, id: data?.id };
  } catch (err) {
    await log("error", null, String(err));
    return { ok: false, error: String(err) };
  }
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
Deno.serve(async (req) => {
  const json = (obj: unknown, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });

  if (req.method !== "POST") return json({ ok: false, error: "Usa POST" }, 405);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "JSON inválido" }, 400);
  }

  // 1. HOTTOK
  const auth = await verifyHottok(req.headers, body);
  if (!auth.ok) {
    console.warn(`[hotmart] rechazado: ${auth.reason}`);
    return json({ ok: false, error: auth.reason }, 401);
  }

  const p = parsePayload(body);
  if (!p.event) return json({ ok: false, error: "evento ausente" }, 400);

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // 2. Idempotencia
    const externalId = p.eventId || `${p.event}:${p.transaction}`;
    const { error: insErr } = await supabase.from("payment_events").insert({
      provider: "hotmart", event_type: p.event, external_id: externalId, payload: body,
    });
    if (insErr) {
      if ((insErr as any).code === "23505") return json({ ok: true, duplicate: true });
      console.error("[hotmart] error en payment_events:", insErr);
      return json({ ok: false, error: "no se pudo registrar el evento" }, 500);
    }

    // 3. Usuario + plan (registramos errores en vez de tragarlos en silencio)
    const { data: profile, error: profileErr } = await supabase
      .from("profiles").select("id, display_name, email").eq("email", p.buyerEmail).maybeSingle();
    if (profileErr) console.error("[hotmart] error leyendo profiles:", profileErr.message ?? profileErr);
    const { data: plan, error: planErr } = p.offerCode
      ? await supabase.from("plans").select("id, name, months, price_usd").eq("hotmart_offer_code", p.offerCode).maybeSingle()
      : { data: null as any, error: null };
    if (planErr) console.error("[hotmart] error leyendo plans:", planErr.message ?? planErr);

    const effect = eventToEffect(p.event);
    let subscriptionId: string | null = null;

    // 4. Suscripción
    if (profile?.id && effect.status) {
      const now = new Date();
      const computed = new Date(now);
      computed.setMonth(computed.getMonth() + (plan?.months ?? 1));
      const nextChargeMs = Number(p.nextChargeRaw);
      const renewsIso = Number.isFinite(nextChargeMs) && nextChargeMs > 0
        ? new Date(nextChargeMs).toISOString() : computed.toISOString();

      const patch: Record<string, unknown> = {
        status: effect.status,
        external_reference: p.transaction || null,
        hotmart_offer_code: p.offerCode || null,
        hotmart_subscriber_code: p.subscriberCode || null,
        raw_payload: body,
      };
      if (plan?.id) patch.plan_id = plan.id;
      if (effect.status === "activa") {
        if (effect.setStarted) patch.started_at = now.toISOString();
        patch.renews_at = renewsIso;
        patch.canceled_at = null;
      }
      if (effect.status === "cancelada") patch.canceled_at = now.toISOString();

      const { data: existing } = await supabase
        .from("subscriptions").select("id").eq("user_id", profile.id)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();

      if (existing?.id) {
        await supabase.from("subscriptions").update(patch).eq("id", existing.id);
        subscriptionId = existing.id;
      } else if (plan?.id) {
        const { data: created } = await supabase
          .from("subscriptions").insert({ user_id: profile.id, plan_id: plan.id, ...patch }).select("id").maybeSingle();
        subscriptionId = created?.id ?? null;
      }
      if (subscriptionId) {
        await supabase.from("payment_events").update({ subscription_id: subscriptionId }).eq("external_id", externalId);
      }
    }

    // 5. Correo branded
    const displayName = profile?.display_name || p.buyerName || p.buyerEmail.split("@")[0] || "";
    const chargeDate = humanDate(p.nextChargeRaw);
    const email = await sendEmail(supabase, p.event, p.buyerEmail, profile?.id ?? null, {
      display_name: displayName,
      plan_name: plan?.name || p.planName || undefined,
      renews_at: chargeDate || undefined,
      amount: plan?.price_usd != null ? `$${plan.price_usd}` : undefined,
      charge_date: chargeDate || undefined,
    });

    return json({
      ok: true, event: p.event,
      matched_user: Boolean(profile?.id), matched_plan: Boolean(plan?.id),
      subscription_updated: Boolean(subscriptionId), email,
    });
  } catch (err) {
    console.error("[hotmart] error procesando el evento:", err);
    return json({ ok: false, error: (err as any)?.message || "error interno" }, 500);
  }
});
