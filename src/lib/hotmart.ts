/**
 * Enlaces de pago de Hotmart (públicos, seguros de exponer en el navegador).
 *
 * Cada `code` coincide con `public.plans.code` en la base de datos y con
 * `off=` del enlace de checkout, para que el webhook pueda resolver el plan.
 */
export const HOTMART_PRODUCT_ID = "F107294187I";

export const HOTMART_OFFERS: Record<string, string> = {
  basico: "t5z829tk", // Mensual $4.99
  premium: "1yo6anl1", // Anual $29.99
};

export function checkoutUrl(planCode: keyof typeof HOTMART_OFFERS | string): string {
  const off = HOTMART_OFFERS[planCode];
  return `https://pay.hotmart.com/${HOTMART_PRODUCT_ID}${off ? `?off=${off}&checkoutMode=6` : ""}`;
}

/** Plan al que pertenece una oferta de Hotmart (uso en el webhook). */
export function planCodeForOffer(offer: string | null | undefined): string | null {
  if (!offer) return null;
  const entry = Object.entries(HOTMART_OFFERS).find(([, off]) => off === offer);
  return entry ? entry[0] : null;
}
