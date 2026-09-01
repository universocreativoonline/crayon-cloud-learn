/**
 * i18n propio y ligero (sin dependencias). Traduce SOLO el idioma de apoyo de
 * los padres (interfaz + landing). El niño siempre aprende inglés.
 *
 * - Detección automática: localStorage -> idioma del navegador -> español.
 * - Selector manual (ver components/LanguageSelector.tsx) que recuerda la elección.
 * - Respaldo: si falta una clave/idioma, se usa el español.
 *
 * Para lanzar con más países: traduce su bloque en i18n-dict.ts y añade su
 * código a ENABLED_LOCALES aquí abajo.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { dictionaries, type Dict } from "./i18n-dict";

export type LocaleMeta = { code: string; label: string; flag: string };

/** Los 7 idiomas del proyecto. `enabled:false` = definido pero aún sin traducir. */
export const LOCALES: LocaleMeta[] = [
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "it", label: "Italiano", flag: "🇮🇹" },
  { code: "no", label: "Norsk", flag: "🇳🇴" },
  { code: "sv", label: "Svenska", flag: "🇸🇪" },
];

/**
 * Idiomas ACTIVOS en el selector (campaña inicial: Español, Francés, Ruso).
 * Para activar otro país: tradúcelo en i18n-dict.ts y añádelo aquí.
 */
export const ENABLED_LOCALES = ["es", "fr", "ru"] as const;

export const DEFAULT_LOCALE = "es";
const STORAGE_KEY = "pinturitas.lang";

export const enabledLocales = (): LocaleMeta[] =>
  LOCALES.filter((l) => (ENABLED_LOCALES as readonly string[]).includes(l.code));

/** Normaliza un código de navegador (ej. "nb-NO") a uno soportado, o null. */
function normalize(tag: string): string | null {
  const primary = tag.toLowerCase().split("-")[0];
  const mapped = primary === "nb" || primary === "nn" ? "no" : primary;
  return (ENABLED_LOCALES as readonly string[]).includes(mapped) ? mapped : null;
}

/** Detecta el idioma inicial: preferencia guardada -> navegador -> español. */
export function detectLocale(): string {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && (ENABLED_LOCALES as readonly string[]).includes(saved)) return saved;
  } catch { /* ignore */ }
  const langs = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language]) || [];
  for (const tag of langs) {
    const m = tag ? normalize(tag) : null;
    if (m) return m;
  }
  return DEFAULT_LOCALE;
}

function lookup(dict: Dict | undefined, path: string[]): unknown {
  let cur: unknown = dict;
  for (const key of path) {
    if (cur && typeof cur === "object" && key in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[key];
    } else return undefined;
  }
  return cur;
}

type I18nValue = {
  locale: string;
  setLocale: (code: string) => void;
  /** t("hero.title") -> texto en el idioma actual, con respaldo al español. */
  t: (key: string) => string;
  locales: LocaleMeta[];
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  // SSR y primer render del cliente: español (evita desajuste de hidratación).
  const [locale, setLocaleState] = useState<string>(DEFAULT_LOCALE);

  // Tras montar, aplica el idioma detectado (guardado o del navegador).
  useEffect(() => {
    const detected = detectLocale();
    if (detected !== locale) setLocaleState(detected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mantiene <html lang> sincronizado para accesibilidad y SEO.
  useEffect(() => {
    if (typeof document !== "undefined") document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((code: string) => {
    if (!(ENABLED_LOCALES as readonly string[]).includes(code)) return;
    setLocaleState(code);
    try { window.localStorage.setItem(STORAGE_KEY, code); } catch { /* ignore */ }
  }, []);

  const t = useCallback(
    (key: string): string => {
      const path = key.split(".");
      const val = lookup(dictionaries[locale], path) ?? lookup(dictionaries[DEFAULT_LOCALE], path);
      return typeof val === "string" ? val : key;
    },
    [locale],
  );

  const value = useMemo<I18nValue>(
    () => ({ locale, setLocale, t, locales: enabledLocales() }),
    [locale, setLocale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n debe usarse dentro de <I18nProvider>");
  return ctx;
}
