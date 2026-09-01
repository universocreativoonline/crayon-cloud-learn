import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ColoringCanvas, type ColoringCanvasHandle } from "@/components/coloring/ColoringCanvas";
import { speak } from "@/lib/speech";
import { checkoutUrl } from "@/lib/hotmart";
import { useI18n } from "@/lib/i18n";
import { LanguageSelector } from "@/components/LanguageSelector";

export const Route = createFileRoute("/")({
  component: LandingPage,
  head: () => ({
    meta: [
      { title: "Pinturitas · Aprende inglés dibujando" },
      {
        name: "description",
        content:
          "Aprender inglés nunca fue tan divertido. Tu hijo aprende inglés dibujando con el dedo, jugando y sin frustraciones. Para niños de 3 a 7 años: suscríbete y desbloquea los 33 mundos.",
      },
      { property: "og:title", content: "Pinturitas · Aprende inglés dibujando" },
      {
        property: "og:description",
        content: "Aprender inglés nunca fue tan divertido: tu hijo pinta con el dedo, escucha la palabra y la aprende jugando. Fácil y sin frustraciones. 3 a 7 años.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
});

/** Slugs de los 33 mundos; el nombre visible sale de las traducciones. */
const WORLD_SLUGS = [
  "pets", "farm", "wild", "forest", "ocean", "flying", "bugs", "dinosaurs", "vehicles",
  "space", "princesses-castle", "food", "sports", "jobs", "instruments", "beach", "holidays",
  "fruits", "vegetables", "family", "body", "clothes", "colors", "shapes", "numbers", "home",
  "kitchen", "toys", "school", "nature", "weather", "city", "tools",
];

/* ---------- página ---------- */

function LandingPage() {
  const { t, locale } = useI18n();
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
  }, []);
  const appLabel = authed ? t("nav.goApp") : t("nav.enter");

  const steps = [
    { n: "1", title: t("how.s1t"), body: t("how.s1b"), img: "/line-art/pets/dog.png" },
    { n: "2", title: t("how.s2t"), body: t("how.s2b"), img: "/landing/dog-color.png" },
    { n: "3", title: t("how.s3t"), body: t("how.s3b"), img: null as string | null },
  ];

  const benefits: [string, string, string][] = [
    ["🗣️", t("benefits.b1t"), t("benefits.b1b")],
    ["✍️", t("benefits.b2t"), t("benefits.b2b")],
    ["🎯", t("benefits.b3t"), t("benefits.b3b")],
    ["🎨", t("benefits.b4t"), t("benefits.b4b")],
    ["💛", t("benefits.b5t"), t("benefits.b5b")],
    ["📚", t("benefits.b6t"), t("benefits.b6b")],
  ];

  const plans = [
    { code: "basico", name: t("plans.monthly"), price: "4.99", per: t("plans.perMonth"), note: t("plans.monthlyNote"), best: false, tag: undefined as string | undefined, url: checkoutUrl("basico", locale) },
    { code: "premium", name: t("plans.yearly"), price: "29.99", per: t("plans.perYear"), note: t("plans.yearlyNote"), best: true, tag: t("plans.yearlyTag"), url: checkoutUrl("premium", locale) },
  ];

  const planFeatures = [t("plans.f1"), t("plans.f2"), t("plans.f3"), t("plans.f4"), t("plans.f5"), t("plans.f6"), t("plans.f7"), t("plans.f8")];

  const faqs = [
    { q: t("faq.q1"), a: t("faq.a1") },
    { q: t("faq.q2"), a: t("faq.a2") },
    { q: t("faq.q3"), a: t("faq.a3") },
    { q: t("faq.q4"), a: t("faq.a4") },
    { q: t("faq.q5"), a: t("faq.a5") },
    { q: t("faq.q6"), a: t("faq.a6") },
    { q: t("faq.q7"), a: t("faq.a7") },
  ];

  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* NAV */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-paper/85 backdrop-blur safe-top">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <img src="/brand/app-icon.png" alt="" className="h-9 w-9 rounded-xl object-cover" onError={hideImg} />
            <span className="font-display text-xl font-bold text-primary">Pinturitas</span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSelector />
            <Link to="/auth" className="rounded-full px-3 py-2 font-display text-sm font-bold text-ink-soft hover:text-ink sm:px-4">
              {appLabel}
            </Link>
            <a href="#planes" className="rounded-full bg-primary px-4 py-2.5 font-display text-sm font-bold text-primary-foreground shadow-crayon active:scale-95 sm:px-5">
              {t("nav.subscribe")}
            </a>
          </div>
        </nav>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-14 md:grid-cols-2 md:py-20">
          <div>
            <span className="inline-block rounded-full bg-secondary/15 px-3 py-1 font-display text-xs font-bold text-secondary">
              {t("hero.badge")}
            </span>
            <h1 className="mt-4 font-display text-4xl font-bold leading-[1.05] text-ink sm:text-5xl">
              {t("hero.titleA")} <span className="text-primary">{t("hero.titleHi")}</span>
            </h1>
            <p className="mt-4 max-w-md text-lg text-ink-soft">{t("hero.desc")}</p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <a href="#planes" className="rounded-2xl bg-primary px-7 py-4 font-display text-lg font-bold text-primary-foreground shadow-crayon active:scale-95">
                {t("hero.ctaPlans")}
              </a>
              <a href="#beneficios" className="rounded-2xl border border-border px-6 py-4 font-display font-bold text-ink hover:bg-surface">
                {t("hero.ctaWhy")}
              </a>
            </div>
            <p className="mt-3 text-sm text-ink-soft">
              {t("hero.family")} ·{" "}
              <Link to="/auth" className="font-semibold text-primary">{t("hero.haveAccount")}</Link>
            </p>
          </div>

          <div className="relative">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {["butterfly", "lion", "goldfish", "elephant"].map((s, i) => (
                <img key={s} src={`/landing/${s}-color.png`} alt="" onError={hideImg}
                  className={`w-full rounded-3xl bg-surface p-2 shadow-crayon ${i % 2 ? "translate-y-4" : ""}`} />
              ))}
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-achievement/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-secondary/15 blur-3xl" />
      </section>

      {/* TRUST BAR */}
      <section className="border-y border-border bg-surface">
        <div className="mx-auto grid max-w-4xl grid-cols-3 gap-4 px-4 py-6 text-center">
          {[["33", t("trust.worlds")], ["+630", t("trust.drawings")], ["+600", t("trust.words")]].map(([n, l]) => (
            <div key={l}>
              <div className="font-display text-3xl font-bold text-primary">{n}</div>
              <div className="text-sm text-ink-soft">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* LA VENTANA DE ORO */}
      <section id="beneficios" className="mx-auto max-w-4xl px-4 py-16 text-center">
        <span className="font-display text-sm font-bold uppercase tracking-wide text-secondary">{t("golden.kicker")}</span>
        <h2 className="mt-2 font-display text-3xl font-bold text-ink sm:text-4xl">{t("golden.title")}</h2>
        <p className="mt-4 text-lg text-ink-soft">{t("golden.body")}</p>
        <p className="mt-3 font-display text-xl font-bold text-primary">{t("golden.tagline")}</p>
      </section>

      {/* CÓMO FUNCIONA */}
      <section className="bg-surface py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center font-display text-3xl font-bold text-ink sm:text-4xl">{t("how.title")}</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-ink-soft">{t("how.subtitle")}</p>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {steps.map((s, i) => (
              <div key={s.n} className="rounded-3xl border border-border bg-paper p-6 shadow-soft">
                <div className="canvas-paper mb-5 grid aspect-square place-items-center overflow-hidden rounded-2xl">
                  {s.img ? <img src={s.img} alt="" className="h-full w-full object-contain p-2" onError={hideImg} /> : <WordCardMock />}
                </div>
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-full font-display font-bold text-white"
                    style={{ background: i === 0 ? "var(--color-secondary)" : i === 1 ? "var(--color-primary)" : "var(--color-achievement)" }}>
                    {s.n}
                  </span>
                  <h3 className="font-display text-xl font-bold text-ink">{s.title}</h3>
                </div>
                <p className="mt-2 text-ink-soft">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DEMO INTERACTIVO */}
      <section className="mx-auto max-w-4xl px-4 py-16 text-center">
        <span className="font-display text-sm font-bold uppercase tracking-wide text-secondary">{t("demo.kicker")}</span>
        <h2 className="mt-2 font-display text-3xl font-bold text-ink sm:text-4xl">{t("demo.title")}</h2>
        <p className="mx-auto mt-3 max-w-xl text-ink-soft">{t("demo.body")}</p>
        <div className="mt-8">
          <DemoColoring />
        </div>
      </section>

      {/* BENEFICIOS */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-10 text-center">
          <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl">{t("benefits.title")}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-ink-soft">{t("benefits.subtitle")}</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map(([e, title, body]) => (
            <div key={title} className="rounded-3xl border border-border bg-surface p-6 shadow-soft">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-2xl">{e}</div>
              <h3 className="mt-4 font-display text-lg font-bold text-ink">{title}</h3>
              <p className="mt-1.5 text-sm text-ink-soft">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* TIEMPO DE PANTALLA */}
      <section className="bg-primary py-16 text-primary-foreground">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">{t("screen.title")}</h2>
          <p className="mt-4 text-lg opacity-95">{t("screen.body")}</p>
          <p className="mt-3 font-display text-xl font-bold">{t("screen.tagline")}</p>
        </div>
      </section>

      {/* MUNDOS */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-8 text-center">
          <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl">{t("worldsSec.title")}</h2>
          <p className="mx-auto mt-3 max-w-xl text-ink-soft">{t("worldsSec.subtitle")}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {WORLD_SLUGS.map((slug) => {
            const name = t(`worlds.${slug}`);
            return (
              <div key={slug} className="relative overflow-hidden rounded-2xl shadow-soft">
                <img src={`/covers/${slug}.png`} alt={name} loading="lazy" decoding="async" className="aspect-square w-full object-cover" onError={hideImg} />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5">
                  <span className="font-display text-xs font-bold text-white">{name}</span>
                </div>
              </div>
            );
          })}
          <div className="grid aspect-square place-items-center rounded-2xl bg-primary/10 text-center">
            <span className="px-2 font-display text-sm font-bold text-primary">{t("worldsSec.more")}</span>
          </div>
        </div>
      </section>

      {/* JUEGOS */}
      <section className="mx-auto max-w-4xl px-4 py-16 text-center">
        <span className="font-display text-sm font-bold uppercase tracking-wide text-secondary">{t("games.kicker")}</span>
        <h2 className="mt-2 font-display text-3xl font-bold text-ink sm:text-4xl">{t("games.title")}</h2>
        <p className="mx-auto mt-3 max-w-xl text-ink-soft">{t("games.body")}</p>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            ["👂", t("games.g1")],
            ["🃏", t("games.g2")],
            ["🕵️", t("games.g3")],
            ["🎨", t("games.g4")],
            ["⭐", t("games.g5")],
          ].map(([e, label]) => (
            <div key={label} className="rounded-2xl border border-border bg-surface p-4 shadow-soft">
              <div className="text-3xl">{e}</div>
              <div className="mt-2 font-display text-sm font-bold leading-tight text-ink">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* BILINGÜE HABLADO */}
      <section className="bg-surface py-16">
        <div className="mx-auto grid max-w-5xl items-center gap-10 px-4 md:grid-cols-2">
          <div className="order-2 md:order-1">
            <span className="font-display text-sm font-bold uppercase tracking-wide text-secondary">{t("bilingual.kicker")}</span>
            <h2 className="mt-2 font-display text-3xl font-bold text-ink sm:text-4xl">{t("bilingual.title")}</h2>
            <p className="mt-4 text-lg text-ink-soft">{t("bilingual.body")}</p>
            <ul className="mt-5 space-y-2 text-ink">
              <li className="flex gap-2"><span className="text-secondary">✓</span> {t("bilingual.li1")}</li>
              <li className="flex gap-2"><span className="text-secondary">✓</span> {t("bilingual.li2")}</li>
              <li className="flex gap-2"><span className="text-secondary">✓</span> {t("bilingual.li3")}</li>
            </ul>
          </div>
          <div className="order-1 flex justify-center md:order-2"><WordCardMock large /></div>
        </div>
      </section>

      {/* UN RATO QUE LOS UNE */}
      <section className="mx-auto max-w-5xl px-4 py-16">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div className="grid grid-cols-2 gap-3">
            {["turtle", "dolphin", "cow", "goldfish"].map((s) => (
              <img key={s} src={`/landing/${s}-color.png`} alt="" className="w-full rounded-3xl bg-surface p-2 shadow-soft" onError={hideImg} />
            ))}
          </div>
          <div>
            <span className="font-display text-sm font-bold uppercase tracking-wide text-secondary">{t("together.kicker")}</span>
            <h2 className="mt-2 font-display text-3xl font-bold text-ink sm:text-4xl">{t("together.title")}</h2>
            <p className="mt-4 text-lg text-ink-soft">{t("together.body")}</p>
          </div>
        </div>
      </section>

      {/* PARA PAPÁS */}
      <section className="bg-surface py-16">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-center font-display text-3xl font-bold text-ink sm:text-4xl">{t("parents.title")}</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["📈", t("parents.p1t"), t("parents.p1b")],
              ["🔒", t("parents.p2t"), t("parents.p2b")],
              ["🚫", t("parents.p3t"), t("parents.p3b")],
              ["👨‍👩‍👧", t("parents.p4t"), t("parents.p4b")],
            ].map(([e, title, body]) => (
              <div key={title} className="rounded-3xl border border-border bg-paper p-5 shadow-soft">
                <div className="text-3xl">{e}</div>
                <h3 className="mt-3 font-display text-lg font-bold text-ink">{title}</h3>
                <p className="mt-1 text-sm text-ink-soft">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* NUESTRA MISIÓN */}
      <section className="mx-auto max-w-3xl px-4 py-16 text-center">
        <div className="text-4xl">💛</div>
        <h2 className="mt-3 font-display text-3xl font-bold text-ink sm:text-4xl">{t("mission.title")}</h2>
        <p className="mt-4 text-lg text-ink-soft">{t("mission.body")}</p>
        <p className="mt-4 font-display text-lg font-bold text-primary">{t("mission.tagline")}</p>
        <p className="mt-2 text-sm text-ink-soft">{t("mission.sign")}</p>
      </section>

      {/* PLANES */}
      <section id="planes" className="mx-auto max-w-4xl px-4 py-16">
        <div className="mb-3 text-center">
          <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl">{t("plans.title")}</h2>
          <p className="mx-auto mt-3 max-w-xl text-ink-soft">{t("plans.subtitle")}</p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {plans.map((p) => (
            <div key={p.code} className={`relative rounded-3xl border-2 bg-surface p-6 shadow-soft ${p.best ? "border-primary" : "border-border"}`}>
              {p.tag && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-[11px] font-bold text-primary-foreground">
                  {p.tag}
                </span>
              )}
              <div className="font-display text-lg font-bold text-ink">{p.name}</div>
              <div className="mt-2 flex items-end gap-1">
                <span className="font-display text-4xl font-bold text-ink">${p.price}</span>
                <span className="pb-1 text-sm text-ink-soft">{p.per}</span>
              </div>
              <div className="min-h-[20px] text-xs text-ink-soft">{p.note}</div>
              <ul className="mt-4 space-y-1.5 text-sm text-ink">
                {planFeatures.map((f) => (
                  <li key={f} className="flex gap-2"><span className="text-secondary">✓</span> {f}</li>
                ))}
              </ul>
              <a href={p.url} className={`mt-5 block w-full rounded-2xl py-3 text-center font-display font-bold active:scale-95 ${p.best ? "bg-primary text-primary-foreground shadow-crayon" : "border border-border text-ink"}`}>
                {t("plans.subscribe")}
              </a>
            </div>
          ))}
        </div>
        <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-sm font-semibold text-secondary">
          <span>✓</span> {t("plans.cancelNote")}
        </p>
        <p className="mt-2 text-center text-sm text-ink-soft">
          {t("plans.haveAccount")}{" "}
          <Link to="/auth" className="font-semibold text-primary">{t("plans.haveAccountLink")}</Link>.
        </p>
      </section>

      {/* SIN RIESGO */}
      <section className="mx-auto max-w-4xl px-4 pb-2">
        <div className="rounded-3xl border border-border bg-surface p-6 text-center shadow-soft sm:p-8">
          <div className="text-3xl">🛡️</div>
          <h2 className="mt-2 font-display text-2xl font-bold text-ink">{t("risk.title")}</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {[
              [t("risk.r1t"), t("risk.r1b")],
              [t("risk.r2t"), t("risk.r2b")],
              [t("risk.r3t"), t("risk.r3b")],
            ].map(([title, body]) => (
              <div key={title}>
                <div className="font-display font-bold text-ink">{title}</div>
                <div className="text-sm text-ink-soft">{body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-surface py-16">
        <div className="mx-auto max-w-2xl px-4">
          <h2 className="text-center font-display text-3xl font-bold text-ink sm:text-4xl">{t("faq.title")}</h2>
          <div className="mt-8 space-y-3">
            {faqs.map((f) => (
              <details key={f.q} className="group rounded-2xl border border-border bg-paper p-4">
                <summary className="flex cursor-pointer list-none items-center justify-between font-display font-bold text-ink">
                  {f.q}
                  <span className="text-ink-soft transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2 text-ink-soft">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="mx-auto max-w-4xl px-4 py-20 text-center">
        <h2 className="font-display text-4xl font-bold text-ink sm:text-5xl">
          {t("ctaFinal.titleA")} <span className="text-primary">{t("ctaFinal.titleHi")}</span>
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-lg text-ink-soft">{t("ctaFinal.body")}</p>
        <p className="mx-auto mt-3 max-w-lg font-display text-xl font-bold text-primary">{t("ctaFinal.tagline")}</p>
        <a href="#planes" className="mt-8 inline-block rounded-2xl bg-primary px-9 py-4 font-display text-lg font-bold text-primary-foreground shadow-crayon active:scale-95">
          {t("ctaFinal.button")}
        </a>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-ink-soft sm:flex-row">
          <div className="flex items-center gap-2">
            <img src="/brand/app-icon.png" alt="" className="h-7 w-7 rounded-lg object-cover" onError={hideImg} />
            <span className="font-display font-bold text-ink">Pinturitas</span>
          </div>
          <p>{t("footer.tagline")}</p>
          <Link to="/auth" className="font-display font-bold text-primary">{appLabel}</Link>
        </div>
      </footer>
    </div>
  );
}

function hideImg(e: React.SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.style.visibility = "hidden";
}

const DEMO_COLORS = [
  { hex: "#E2453C", en: "Red", es: "rojo" },
  { hex: "#F2842B", en: "Orange", es: "naranja" },
  { hex: "#FFC43D", en: "Yellow", es: "amarillo" },
  { hex: "#46B45C", en: "Green", es: "verde" },
  { hex: "#2F7FEA", en: "Blue", es: "azul" },
  { hex: "#8B5CF6", en: "Purple", es: "morado" },
  { hex: "#96613B", en: "Brown", es: "café" },
  { hex: "#2B2B2B", en: "Black", es: "negro" },
];

/** La palabra en inglés que enseña el dibujo del demo (lámina: perro). */
const DEMO_WORD_EN = "Dog";

/** Mini estudio de coloreo en la landing: el mismo motor real de la app. */
function DemoColoring() {
  const { t } = useI18n();
  const ref = useRef<ColoringCanvasHandle>(null);
  const [color, setColor] = useState(DEMO_COLORS[1].hex);
  const [tool, setTool] = useState<"fill" | "brush">("fill");

  // El nombre se escucha SOLO al tocar la bocina, y SOLO en inglés.
  const sayWord = () => speak(DEMO_WORD_EN);

  return (
    <div className="mx-auto max-w-sm">
      {/* Tarjeta de palabra: toca para escuchar el nombre en inglés */}
      <button
        type="button"
        onClick={sayWord}
        aria-label={`${DEMO_WORD_EN} — ${t("demo.tapListen")}`}
        className="mx-auto mb-4 flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-2.5 shadow-soft transition-transform active:scale-95"
      >
        <span className="grid h-11 w-11 flex-none place-items-center rounded-full bg-primary text-primary-foreground">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M4 9v6h4l5 4V5L8 9H4z" />
            <path d="M16.5 8.5a5 5 0 010 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
        <span className="text-left leading-tight">
          <span className="block font-display text-2xl font-bold text-ink">{DEMO_WORD_EN}</span>
          <span className="block text-xs text-ink-soft">{t("demo.tapListen")} 🔊</span>
        </span>
      </button>

      <ColoringCanvas
        ref={ref}
        imageUrl="/line-art/pets/dog.png"
        color={color}
        tool={tool}
        className="shadow-crayon"
      />

      {/* Herramienta: rellenar (balde) o pintar libre con el dedo */}
      <div className="mt-3 flex justify-center gap-2">
        {([
          ["fill", t("demo.fill")],
          ["brush", t("demo.brush")],
        ] as const).map(([tk, label]) => (
          <button
            key={tk}
            type="button"
            onClick={() => setTool(tk)}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
              tool === tk
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-ink-soft hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-8 gap-2">
        {DEMO_COLORS.map((c) => (
          <button
            key={c.hex}
            onClick={() => setColor(c.hex)}
            aria-label={c.en}
            className="aspect-square rounded-xl border-2 transition-transform active:scale-90"
            style={{ background: c.hex, borderColor: color === c.hex ? "var(--color-ink)" : "rgba(0,0,0,.14)" }}
          />
        ))}
      </div>

      <button
        onClick={() => ref.current?.clear()}
        className="mt-3 rounded-full border border-border px-4 py-1.5 text-sm font-semibold text-ink-soft hover:text-ink"
      >
        {t("demo.reset")}
      </button>

      {/* Deja claro que es apenas una muestra de todo lo que hay dentro */}
      <p className="mx-auto mt-6 max-w-md rounded-2xl bg-surface px-5 py-4 text-sm text-ink-soft">
        {t("demo.note")}
      </p>
    </div>
  );
}

/** Maqueta de la tarjeta de palabra (feature bilingüe hablado). El niño aprende inglés. */
function WordCardMock({ large = false }: { large?: boolean }) {
  return (
    <div className={`flex items-center gap-3 rounded-3xl border border-border bg-surface shadow-crayon ${large ? "w-full max-w-xs p-5" : "p-4"}`}>
      <div className="min-w-0 flex-1">
        <div className={`font-display font-bold text-ink ${large ? "text-4xl" : "text-2xl"}`}>Dog</div>
        <div className="font-mono text-xs text-secondary">🔊 dog</div>
      </div>
      <span className="grid h-12 w-12 flex-none place-items-center rounded-full bg-primary text-primary-foreground">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M4 9v6h4l5 4V5L8 9H4z" />
          <path d="M16.5 8.5a5 5 0 010 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </span>
    </div>
  );
}
