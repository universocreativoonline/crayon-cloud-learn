/**
 * Plantillas de correo de Pinturitas con la identidad "Caja de Crayones".
 *
 * Un solo layout para todos los eventos, así todos los correos se ven igual:
 * papel `#FFF6EE`, tarjeta blanca, títulos Fredoka, cuerpo Nunito,
 * mandarina `#FF7A3D` y turquesa `#17B8B0`.
 */

const APP_NAME = "Pinturitas";
const APP_URL = "https://pinturitas.lovable.app";
const LOGO_EMOJI = "🎨";

export type EmailContent = { subject: string; html: string };

type Block = { title: string; lead: string; body?: string[]; cta?: { label: string; url: string } };

function layout(b: Block, accent = "#FF7A3D"): string {
  const paragraphs = (b.body ?? []).map((p) => `<p>${p}</p>`).join("");
  const cta = b.cta
    ? `<p style="text-align:center;"><a class="cta" style="background:${accent}" href="${b.cta.url}">${b.cta.label}</a></p>`
    : "";
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${b.title}</title>
<style>
  body { margin:0; padding:0; background:#FFF6EE; font-family:"Nunito",Helvetica,Arial,sans-serif; color:#2A2118; }
  .wrap { padding:32px 16px; }
  .card { max-width:600px; margin:0 auto; background:#FFFFFF; border:1px solid #F0E2D4; border-radius:20px; padding:40px 32px; }
  .brand { text-align:center; font-weight:700; font-size:20px; color:${accent}; margin:0 0 20px; }
  h1 { font-family:"Fredoka",Georgia,serif; color:${accent}; margin:0 0 16px; font-size:26px; }
  p { line-height:1.6; margin:0 0 16px; font-size:16px; }
  .lead { font-size:17px; }
  .cta { display:inline-block; color:#FFFFFF !important; text-decoration:none; padding:16px 28px; border-radius:16px; font-weight:700; margin:12px 0; }
  .foot { text-align:center; color:#7A6A5C; font-size:12px; padding:16px; }
</style></head>
<body><div class="wrap"><div class="card">
  <p class="brand">${LOGO_EMOJI} ${APP_NAME}</p>
  <h1>${b.title}</h1>
  <p class="lead">${b.lead}</p>
  ${paragraphs}
  ${cta}
  <p>Si necesitas ayuda, solo responde a este correo. Estamos para acompañarte.</p>
  <p>Un abrazo,<br/>El equipo de ${APP_NAME}</p>
</div><p class="foot">Recibes este correo por tu compra o suscripción en ${APP_NAME}.</p></div></body></html>`;
}

export type EmailVars = {
  name?: string;
  plan_name?: string;
  amount?: string;
  date?: string;
  access_url?: string;
  billet_url?: string;
};

const TURQUOISE = "#17B8B0";
const RED = "#E63946";

/**
 * Contenido por evento de Hotmart. Cubre los 9 eventos de compra y los 3 de
 * suscripción; cualquier evento nuevo cae en un correo informativo genérico.
 */
export function renderEventEmail(event: string, v: EmailVars): EmailContent | null {
  const hi = v.name ? `Hola, ${v.name}` : "Hola";
  const plan = v.plan_name ?? "tu plan";
  const access = v.access_url ?? `${APP_URL}/auth`;

  switch (event) {
    case "PURCHASE_APPROVED":
      return {
        subject: `¡Tu acceso a ${APP_NAME} está listo!`,
        html: layout({
          title: "¡Bienvenido a Pinturitas!",
          lead: `${hi}. Tu pago de <strong>${plan}</strong> fue aprobado y tu cuenta ya está activa.`,
          body: [
            "Pulsa el botón para crear tu contraseña y entrar. Luego crea el perfil de tu peque y elige el primer mundo.",
            "Tienes los 33 mundos completos, más de 630 láminas, audio en inglés y español, juegos y hasta 4 perfiles de niño.",
          ],
          cta: { label: "Activar mi cuenta", url: access },
        }),
      };
    case "PURCHASE_COMPLETE":
      return {
        subject: `Tu compra en ${APP_NAME} está completa`,
        html: layout({
          title: "Compra completada",
          lead: `${hi}. Confirmamos que tu compra de <strong>${plan}</strong> quedó completa.`,
          body: ["Tu acceso sigue activo. ¡A colorear y aprender!"],
          cta: { label: "Entrar a Pinturitas", url: access },
        }, TURQUOISE),
      };
    case "PURCHASE_BILLET_PRINTED":
    case "PURCHASE_OUT_OF_SHOPPING_CART":
      return {
        subject: `Estamos a la espera de tu pago · ${APP_NAME}`,
        html: layout({
          title: "A la espera de pago",
          lead: `${hi}. Generamos tu orden de <strong>${plan}</strong> y esperamos la confirmación del pago.`,
          body: [
            "En cuanto el pago se acredite, te enviamos el correo con tu acceso.",
            v.billet_url ? `Puedes completar el pago aquí: <a href="${v.billet_url}">${v.billet_url}</a>` : "",
          ].filter(Boolean),
        }, TURQUOISE),
      };
    case "PURCHASE_DELAYED":
      return {
        subject: `Tu pago está atrasado · ${APP_NAME}`,
        html: layout({
          title: "Pago atrasado",
          lead: `${hi}. Todavía no vemos el pago de <strong>${plan}</strong>.`,
          body: ["Si ya pagaste, puede tardar unas horas en reflejarse. Si no, puedes reintentarlo cuando quieras."],
          cta: { label: "Reintentar el pago", url: APP_URL + "/#planes" },
        }, RED),
      };
    case "PURCHASE_CANCELED":
      return {
        subject: `Tu compra fue cancelada · ${APP_NAME}`,
        html: layout({
          title: "Compra cancelada",
          lead: `${hi}. Tu compra de <strong>${plan}</strong> fue cancelada y no se realizó ningún cobro.`,
          body: ["Si fue un error, puedes volver a intentarlo cuando quieras."],
          cta: { label: "Ver los planes", url: APP_URL + "/#planes" },
        }, RED),
      };
    case "PURCHASE_EXPIRED":
      return {
        subject: `Tu compra venció · ${APP_NAME}`,
        html: layout({
          title: "Compra con plazo vencido",
          lead: `${hi}. El plazo para pagar <strong>${plan}</strong> se venció, así que cerramos la orden.`,
          body: ["Puedes iniciar una nueva compra en cualquier momento; nada se pierde."],
          cta: { label: "Empezar de nuevo", url: APP_URL + "/#planes" },
        }, RED),
      };
    case "PURCHASE_REFUNDED":
      return {
        subject: `Tu reembolso fue procesado · ${APP_NAME}`,
        html: layout({
          title: "Compra reembolsada",
          lead: `${hi}. Procesamos el reembolso de <strong>${plan}</strong>${v.amount ? ` por ${v.amount}` : ""}.`,
          body: [
            "El dinero puede tardar unos días en aparecer en tu estado de cuenta, según tu banco.",
            "El acceso a los mundos de pago quedó desactivado, pero el progreso de tu peque se conserva por si vuelves.",
          ],
        }, RED),
      };
    case "PURCHASE_PROTEST":
      return {
        subject: `Recibimos tu pedido de reembolso · ${APP_NAME}`,
        html: layout({
          title: "Pedido de reembolso recibido",
          lead: `${hi}. Registramos tu solicitud de reembolso de <strong>${plan}</strong>.`,
          body: ["La estamos revisando y te avisaremos por correo en cuanto se resuelva."],
        }, RED),
      };
    case "PURCHASE_CHARGEBACK":
      return {
        subject: `Hay una disputa con tu pago · ${APP_NAME}`,
        html: layout({
          title: "Contracargo (chargeback)",
          lead: `${hi}. Tu banco abrió una disputa por el pago de <strong>${plan}</strong>.`,
          body: [
            "Mientras se resuelve, el acceso a los mundos de pago queda suspendido.",
            "Si fue un error, responde a este correo y lo revisamos contigo.",
          ],
        }, RED),
      };
    case "SUBSCRIPTION_CANCELLATION":
      return {
        subject: `Tu suscripción fue cancelada · ${APP_NAME}`,
        html: layout({
          title: "Suscripción cancelada",
          lead: `${hi}. Cancelamos tu suscripción a <strong>${plan}</strong>, como pediste.`,
          body: [
            v.date ? `Conservas el acceso hasta el <strong>${v.date}</strong>.` : "Conservas el acceso hasta el final del periodo ya pagado.",
            "Cuando quieras volver, tu progreso y la galería seguirán intactos.",
          ],
          cta: { label: "Reactivar cuando quieras", url: APP_URL + "/#planes" },
        }, RED),
      };
    case "SWITCH_PLAN":
      return {
        subject: `Cambiamos tu plan · ${APP_NAME}`,
        html: layout({
          title: "Cambio de plan",
          lead: `${hi}. Tu suscripción ahora es <strong>${plan}</strong>.`,
          body: [
            v.date ? `El próximo cobro será el <strong>${v.date}</strong>.` : "",
            "Todos los planes incluyen exactamente lo mismo: los 33 mundos completos.",
          ].filter(Boolean),
          cta: { label: "Entrar a Pinturitas", url: access },
        }, TURQUOISE),
      };
    case "UPDATE_SUBSCRIPTION_CHARGE_DATE":
      return {
        subject: `Actualizamos la fecha de tu cobro · ${APP_NAME}`,
        html: layout({
          title: "Nueva fecha de cobro",
          lead: `${hi}. Actualizamos la fecha del próximo cobro de <strong>${plan}</strong>.`,
          body: [v.date ? `Nuevo cobro: <strong>${v.date}</strong>${v.amount ? ` (${v.amount})` : ""}.` : "Te avisaremos antes del próximo cobro."],
        }, TURQUOISE),
      };
    default:
      return null;
  }
}
