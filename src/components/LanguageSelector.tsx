/**
 * Selector visual de idioma (banderas). Reutilizable: quien lo usa decide la
 * posición (en la landing va dentro del nav; en la app va fijo arriba a la
 * derecha, ver __root.tsx). Cambia el idioma de apoyo de los padres.
 */
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";

export function LanguageSelector({ className = "" }: { className?: string }) {
  const { locale, setLocale, locales } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = locales.find((l) => l.code === locale) ?? locales[0];

  // Cerrar al hacer clic fuera o con Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Idioma / Language"
        className="flex items-center gap-1.5 rounded-full border border-border bg-paper/90 px-3 py-1.5 font-display text-sm font-bold text-ink shadow-soft backdrop-blur transition-transform active:scale-95"
      >
        <span className="text-base leading-none" aria-hidden="true">{current?.flag}</span>
        <span className="hidden sm:inline">{current?.code.toUpperCase()}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true">
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 z-50 mt-2 min-w-[160px] overflow-hidden rounded-2xl border border-border bg-paper py-1 shadow-crayon"
        >
          {locales.map((l) => (
            <li key={l.code} role="option" aria-selected={l.code === locale}>
              <button
                type="button"
                onClick={() => { setLocale(l.code); setOpen(false); }}
                className={`flex w-full items-center gap-2.5 px-4 py-2 text-left font-display text-sm font-semibold transition-colors ${
                  l.code === locale ? "bg-primary/10 text-primary" : "text-ink hover:bg-surface"
                }`}
              >
                <span className="text-base leading-none" aria-hidden="true">{l.flag}</span>
                <span>{l.label}</span>
                {l.code === locale && <span className="ml-auto text-secondary">✓</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
