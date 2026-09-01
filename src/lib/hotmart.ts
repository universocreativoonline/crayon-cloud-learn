/**
 * Enlaces de pago de Hotmart (públicos, seguros de exponer en el navegador).
 *
 * Cada `code` coincide con `public.plans.code` en la base de datos y con el
 * `off=` del enlace de checkout, para que el webhook pueda resolver el plan.
 *
 * CHECKOUT POR PAÍS: cada idioma puede tener sus propias ofertas de Hotmart
 * (moneda/idioma del checkout). Rellena OFFERS_BY_LOCALE con los códigos `off=`
 * que te dé Hotmart para cada país. Si un país no tiene su propia oferta, se
 * usa la oferta base (español) automáticamente.
 */
export const HOTMART_PRODUCT_ID = "F107294187I";

/** Oferta base (español / LatAm). */
export const HOTMART_OFFERS: Record<string, string> = {
  basico: "t5z829tk", // Mensual $4.99
  premium: "1yo6anl1", // Anual $29.99
};

/**
 * Ofertas por idioma/país. Deja el objeto vacío para usar la oferta base.
 * Ejemplo cuando tengas los links de Hotmart para Francia y Rusia:
 *   fr: { basico: "xxxxxxx", premium: "yyyyyyy" },
 *   ru: { basico: "zzzzzzz", premium: "wwwwwww" },
 */
export const HOTMART_OFFERS_BY_LOCALE: Record<string, Partial<Record<string, string>>> = {
  es: HOTMART_OFFERS,
  fr: {}, // TODO: ofertas de Hotmart para Francia
  ru: {}, // TODO: ofertas de Hotmart para Rusia
};

/** Devuelve el código de oferta para un plan en un idioma dado (con respaldo a la base). */
export function offerFor(planCode: string, locale = "es"): string | undefined {
  return HOTMART_OFFERS_BY_LOCALE[locale]?.[planCode] ?? HOTMART_OFFERS[planCode];
}

/** URL de checkout de Hotmart para un plan, según el país/idioma del usuario. */
export function checkoutUrl(planCode: string, locale = "es"): string {
  const off = offerFor(planCode, locale);
  return `https://pay.hotmart.com/${HOTMART_PRODUCT_ID}${off ? `?off=${off}&checkoutMode=6` : ""}`;
}

/** Plan al que pertenece una oferta de Hotmart (uso en el webhook). Busca en todas las ofertas. */
export function planCodeForOffer(offer: string | null | undefined): string | null {
  if (!offer) return null;
  const base = Object.entries(HOTMART_OFFERS).find(([, off]) => off === offer);
  if (base) return base[0];
  for (const offers of Object.values(HOTMART_OFFERS_BY_LOCALE)) {
    const hit = Object.entries(offers).find(([, off]) => off === offer);
    if (hit) return hit[0];
  }
  return null;
}
