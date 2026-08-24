import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { planCodeForOffer } from "@/lib/hotmart";
import { sendEventEmail } from "@/lib/email/send.server";

/**
 * Webhook de Hotmart.
 *
 * - Verifica el hottok contra HOTMART_HOTTOK (variable de entorno).
 * - Idempotencia: cada evento se guarda una sola vez en `payment_events`.
 * - Crea la cuenta al aprobar el pago y envía el correo de activación.
 * - Actualiza `subscriptions` según el evento.
 */

type SubStatus = "activa" | "pendiente" | "cancelada" | "vencida";

const ACTIVATE = new Set(["PURCHASE_APPROVED", "PURCHASE_COMPLETE", "SWITCH_PLAN"]);
const PENDING = new Set(["PURCHASE_BILLET_PRINTED", "PURCHASE_OUT_OF_SHOPPING_CART", "PURCHASE_DELAYED", "PURCHASE_PROTEST"]);
const CANCEL = new Set(["PURCHASE_CANCELED", "SUBSCRIPTION_CANCELLATION"]);
const EXPIRE = new Set(["PURCHASE_EXPIRED", "PURCHASE_REFUNDED", "PURCHASE_CHARGEBACK"]);

function statusFor(event: string): SubStatus | null {
  if (ACTIVATE.has(event)) return "activa";
  if (PENDING.has(event)) return "pendiente";
  if (CANCEL.has(event)) return "cancelada";
  if (EXPIRE.has(event)) return "vencida";
  return null;
}

function pick<T>(...vals: (T | undefined | null)[]): T | undefined {
  for (const v of vals) if (v !== undefined && v !== null && v !== "") return v as T;
  return undefined;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function formatDate(ms?: number): string | undefined {
  if (!ms) return undefined;
  try {
    return new Date(ms).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return undefined;
  }
}

export async function handleHotmartWebhook(request: Request): Promise<Response> {
  const expected = process.env["HOTMART_HOTTOK"];
  if (!expected) {
    console.error("[hotmart] HOTMART_HOTTOK no está configurada");
    return json({ ok: false, message: "Webhook no configurado" }, 500);
  }

  const raw = await request.text();
  let payload: any;
  try {
    payload = JSON.parse(raw);
  } catch {
    return json({ ok: false, message: "JSON no válido" }, 400);
  }

  const hottok = pick<string>(
    request.headers.get("x-hotmart-hottok") ?? undefined,
    request.headers.get("X-HOTMART-HOTTOK") ?? undefined,
    payload?.hottok,
  );
  if (!hottok || !timingSafeEqual(hottok, expected)) {
    return json({ ok: false, message: "hottok inválido" }, 401);
  }

  const event: string = pick<string>(payload?.event, payload?.data?.event) ?? "UNKNOWN";
  const externalId: string =
    pick<string>(payload?.id, payload?.event_id, payload?.data?.purchase?.transaction) ??
    `${event}-${Date.now()}`;

  // Idempotencia: si el evento ya se registró, no se re-procesa.
  const { error: dupError } = await supabaseAdmin
    .from("payment_events")
    .insert({ provider: "hotmart", event_type: event, external_id: externalId, payload });
  if (dupError) {
    if (dupError.code === "23505" || /duplicate|unique/i.test(dupError.message)) {
      return json({ ok: true, duplicated: true });
    }
    console.error("[hotmart] no se pudo registrar el evento", dupError);
    return json({ ok: false, message: "Error al registrar el evento" }, 500);
  }

  const data = payload?.data ?? {};
  const buyer = data.buyer ?? data.subscriber ?? {};
  const email: string | undefined = pick<string>(buyer.email, data.subscription?.subscriber?.email)?.toLowerCase();
  const name: string | undefined = pick<string>(buyer.name, buyer.first_name, data.subscription?.subscriber?.name);
  const offer: string | undefined = pick<string>(data.purchase?.offer?.code, data.subscription?.plan?.offer?.code, data.plan?.offer?.code);
  const subscriberCode: string | undefined = pick<string>(
    data.subscription?.subscriber?.code,
    data.subscriber?.code,
  );
  const nextChargeMs: number | undefined = pick<number>(
    data.purchase?.date_next_charge,
    data.subscription?.date_next_charge,
  );
  const amount = data.purchase?.price?.value
    ? `${data.purchase.price.value} ${data.purchase.price.currency_value ?? "USD"}`
    : undefined;

  const status = statusFor(event);
  const planCode = planCodeForOffer(offer);

  let userId: string | null = null;
  let accessUrl: string | undefined;
  let planName: string | undefined;

  if (email) {
    if (status === "activa") {
      const created = await ensureUser(email, name);
      userId = created.userId;
      accessUrl = created.accessUrl;
    } else {
      userId = await findUser(email);
    }
  }

  if (userId) {
    const plan = await resolvePlan(planCode);
    planName = plan?.name ?? undefined;
    if (plan && status) {
      await upsertSubscription({
        userId,
        planId: plan.id,
        status,
        offer: offer ?? null,
        subscriberCode: subscriberCode ?? null,
        renewsAt: nextChargeMs ? new Date(nextChargeMs).toISOString() : null,
        payload,
      });
    }
  }

  if (email) {
    await sendEventEmail(
      event,
      email,
      {
        name,
        plan_name: planName,
        amount,
        date: formatDate(nextChargeMs),
        access_url: accessUrl,
        billet_url: pick<string>(data.purchase?.payment?.billet_barcode, data.purchase?.checkout_country?.billet_url),
      },
      userId,
    );
  }

  return json({ ok: true, event, status: status ?? "ignorado" });
}

async function findUser(email: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  return data?.id ?? null;
}

/** Crea la cuenta si no existe y devuelve un enlace para poner contraseña. */
async function ensureUser(email: string, name?: string): Promise<{ userId: string | null; accessUrl?: string }> {
  const existing = await findUser(email);
  let userId = existing;

  if (!userId) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      password: crypto.randomUUID() + crypto.randomUUID(),
      user_metadata: { display_name: name ?? email.split("@")[0] },
    });
    if (error) {
      console.error("[hotmart] no se pudo crear la cuenta", error.message);
      return { userId: null };
    }
    userId = data.user?.id ?? null;
  }

  const redirectTo = `${process.env["APP_URL"] ?? "https://pinturitas.lovable.app"}/reset-password`;
  const { data: link, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo },
  });
  if (linkError) console.error("[hotmart] no se pudo generar el enlace de acceso", linkError.message);

  return { userId, accessUrl: link?.properties?.action_link };
}

async function resolvePlan(planCode: string | null) {
  const query = supabaseAdmin.from("plans").select("id, name, code, months").limit(1);
  const { data } = planCode
    ? await query.eq("code", planCode)
    : await query.eq("is_active", true).order("sort_order");
  return data?.[0] ?? null;
}

async function upsertSubscription(p: {
  userId: string;
  planId: string;
  status: SubStatus;
  offer: string | null;
  subscriberCode: string | null;
  renewsAt: string | null;
  payload: unknown;
}) {
  const { data: existing } = await supabaseAdmin
    .from("subscriptions")
    .select("id")
    .eq("user_id", p.userId)
    .order("created_at", { ascending: false })
    .limit(1);

  const row = {
    user_id: p.userId,
    plan_id: p.planId,
    status: p.status,
    hotmart_offer_code: p.offer,
    hotmart_subscriber_code: p.subscriberCode,
    renews_at: p.renewsAt,
    raw_payload: p.payload as never,
    ...(p.status === "activa" ? { started_at: new Date().toISOString(), canceled_at: null } : {}),
    ...(p.status === "cancelada" ? { canceled_at: new Date().toISOString() } : {}),
  };

  const { error } = existing?.[0]
    ? await supabaseAdmin.from("subscriptions").update(row).eq("id", existing[0].id)
    : await supabaseAdmin.from("subscriptions").insert(row);
  if (error) console.error("[hotmart] no se pudo actualizar la suscripción", error);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
