import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Tasti — vedi quali tasti del pianoforte suonare",
  description:
    "Carica un MIDI, uno spartito MusicXML o un PDF e guarda, sulla tastiera, esattamente quali tasti premere. Note che scendono stile Synthesia, accordi riconosciuti, audio piano/chitarra/archi. Senza teoria musicale.",
  alternates: { canonical: "/" },
};

const steps = [
  {
    n: "01",
    title: "Carica il brano",
    body: "Un file MIDI, uno spartito MusicXML o un PDF. Pensiamo noi a leggerlo.",
  },
  {
    n: "02",
    title: "Premi play",
    body: "Le note scendono verso la tastiera e i tasti giusti si illuminano, sull'ottava giusta.",
  },
  {
    n: "03",
    title: "Clicca un accordo",
    body: "Fermati su qualsiasi nota o accordo: vedi quali tasti premere e il nome dell'accordo.",
  },
];

const features = [
  {
    title: "Legge i PDF",
    body: "Hai lo spartito in PDF? Lo convertiamo e ti mostriamo le note. Il tempo viene letto in automatico quando c'è.",
  },
  {
    title: "Accordi riconosciuti",
    body: "Niente teoria: ti diciamo che è un Do maggiore, un Sol settima, e quali tasti lo compongono.",
  },
  {
    title: "Al tuo ritmo",
    body: "Rallenta il brano, regola i BPM, allunga le note. Suono di piano, chitarra o archi.",
  },
];

const faqs = [
  {
    q: "Devo conoscere la teoria musicale?",
    a: "No. Tasti è fatto apposta per chi non la conosce: ti mostra graficamente i tasti da premere.",
  },
  {
    q: "Che file posso caricare?",
    a: "MIDI (.mid), MusicXML (.musicxml, .xml, .mxl) e PDF di spartiti per pianoforte.",
  },
  {
    q: "Quanto costa?",
    a: "È gratis. Accedi con GitHub per salvare i tuoi brani in una libreria personale.",
  },
];

// ── Keyboard stage: two octaves, a lit C-major triad, notes falling onto it.
const WHITE = ["C", "D", "E", "F", "G", "A", "B"];
const BLACK_AFTER = new Set(["C", "D", "F", "G", "A"]);
const keys = Array.from({ length: 14 }, (_, i) => WHITE[i % 7]);
const LIT = new Set([7, 9, 11]); // C · E · G, second octave
const NOTE: Record<number, { h: number; delay: number }> = {
  7: { h: 58, delay: 0.55 },
  9: { h: 96, delay: 0.75 },
  11: { h: 46, delay: 0.95 },
};

function Keyboard() {
  return (
    <div className="ch-keyboard ch-stage" aria-hidden="true">
      {keys.map((letter, i) => (
        <div key={i} className={`ch-wkey${LIT.has(i) ? " lit" : ""}`}>
          {NOTE[i] && (
            <span
              className="ch-note"
              style={{ height: NOTE[i].h, animationDelay: `${NOTE[i].delay}s` }}
            />
          )}
          {BLACK_AFTER.has(letter) && (
            <span
              className="ch-bkey"
              style={{ right: "calc(-0.31 * var(--wk) - 1.5px)" }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function Wordmark() {
  return (
    <span className="flex items-center gap-2.5">
      <span className="flex h-5 items-end gap-[2px]" aria-hidden="true">
        <span className="h-5 w-[3px] rounded-sm bg-[var(--ch-ivory)]" />
        <span className="h-3.5 w-[3px] rounded-sm bg-[var(--ch-brass)]" />
        <span className="h-5 w-[3px] rounded-sm bg-[var(--ch-ivory)]" />
      </span>
      <span
        className="display text-[1.35rem] leading-none text-[var(--ch-ivory)]"
        style={{ letterSpacing: "0.01em" }}
      >
        Tasti
      </span>
    </span>
  );
}

export default function Landing() {
  return (
    <div className="concert min-h-[100dvh]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "Tasti",
            applicationCategory: "MultimediaApplication",
            operatingSystem: "Web",
            offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
            description:
              "Carica un MIDI, MusicXML o PDF e guarda quali tasti del pianoforte suonare. Note stile Synthesia, accordi riconosciuti.",
          }),
        }}
      />

      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Wordmark />
        <Link
          href="/app"
          className="text-sm font-medium text-[var(--ch-muted)] underline-offset-8 transition hover:text-[var(--ch-ivory)] hover:underline"
        >
          Apri l&apos;app
        </Link>
      </header>

      {/* Hero */}
      <section className="ch-spotlight relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-6 pb-4 pt-10 sm:pt-16">
          <div className="ch-reveal max-w-3xl">
            <p
              className="mb-6 text-xs font-semibold uppercase text-[var(--ch-brass)]"
              style={{ letterSpacing: "0.28em" }}
            >
              Senza teoria musicale
            </p>
            <h1
              className="display text-[var(--ch-ivory)]"
              style={{
                fontSize: "clamp(2.7rem, 7.5vw, 5.5rem)",
                lineHeight: 1.0,
              }}
            >
              Vedi quali tasti{" "}
              <em
                className="not-italic"
                style={{
                  fontStyle: "italic",
                  fontWeight: 500,
                  color: "var(--ch-brass)",
                }}
              >
                suonare.
              </em>
            </h1>
            <p
              className="mt-7 max-w-[54ch] text-[var(--ch-muted)]"
              style={{ fontSize: "clamp(1.05rem, 1.5vw, 1.3rem)", lineHeight: 1.65 }}
            >
              Carica un MIDI, uno spartito MusicXML o un PDF. Le note scendono
              verso la tastiera e i tasti giusti si illuminano. Fermati su un
              accordo e vedi cosa premere.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-6">
              <Link
                href="/app"
                className="rounded-full bg-[var(--ch-brass)] px-7 py-3.5 text-[0.95rem] font-semibold text-[var(--ch-bg-deep)] transition duration-300 hover:bg-[var(--ch-ivory)]"
              >
                Inizia ora
              </Link>
              <a
                href="#come-funziona"
                className="text-[0.95rem] font-medium text-[var(--ch-muted)] underline-offset-8 transition hover:text-[var(--ch-ivory)] hover:underline"
              >
                Come funziona
              </a>
            </div>
          </div>

          {/* The stage */}
          <div className="mt-16 overflow-hidden pb-1 pt-8 sm:mt-20">
            <Keyboard />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section
        id="come-funziona"
        className="mx-auto max-w-6xl scroll-mt-8 px-6 py-24 sm:py-32"
      >
        <h2
          className="display max-w-xl text-[var(--ch-ivory)]"
          style={{ fontSize: "clamp(1.9rem, 4vw, 3rem)", lineHeight: 1.05 }}
        >
          Tre passi, zero teoria.
        </h2>
        <div className="mt-14 grid gap-x-10 gap-y-12 sm:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="border-t border-[var(--ch-line-strong)] pt-6">
              <p
                className="display text-[var(--ch-brass)]"
                style={{ fontSize: "clamp(2rem, 3.5vw, 2.9rem)", lineHeight: 1 }}
              >
                {s.n}
              </p>
              <h3 className="mt-5 text-lg font-semibold text-[var(--ch-ivory)]">
                {s.title}
              </h3>
              <p className="mt-2 max-w-[38ch] leading-relaxed text-[var(--ch-muted)]">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Features — editorial list, no boxes */}
      <section className="border-y border-[var(--ch-line)] bg-[var(--ch-bg-deep)]">
        <div className="mx-auto grid max-w-6xl gap-x-12 gap-y-14 px-6 py-24 sm:py-28 md:grid-cols-[0.8fr_1.2fr]">
          <h2
            className="display self-start text-[var(--ch-ivory)]"
            style={{ fontSize: "clamp(1.9rem, 4vw, 3rem)", lineHeight: 1.05 }}
          >
            Fatto per chi
            <br />
            vuole solo suonare.
          </h2>
          <dl className="divide-y divide-[var(--ch-line)]">
            {features.map((f) => (
              <div
                key={f.title}
                className="grid gap-2 py-7 first:pt-0 sm:grid-cols-[1fr_1.6fr] sm:gap-8"
              >
                <dt className="text-lg font-semibold text-[var(--ch-ivory)]">
                  {f.title}
                </dt>
                <dd className="max-w-[52ch] leading-relaxed text-[var(--ch-muted)]">
                  {f.body}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-6 py-24 sm:py-32">
        <h2
          className="display text-[var(--ch-ivory)]"
          style={{ fontSize: "clamp(1.9rem, 4vw, 3rem)", lineHeight: 1.05 }}
        >
          Domande frequenti.
        </h2>
        <div className="mt-10 divide-y divide-[var(--ch-line)] border-t border-[var(--ch-line)]">
          {faqs.map((f) => (
            <details key={f.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-medium text-[var(--ch-text)] transition group-open:text-[var(--ch-ivory)]">
                {f.q}
                <span className="text-[var(--ch-brass)] transition duration-300 group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 max-w-[62ch] leading-relaxed text-[var(--ch-muted)]">
                {f.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* Closing */}
      <section className="mx-auto max-w-6xl px-6 pb-28">
        <div className="ch-spotlight rounded-3xl border border-[var(--ch-line-strong)] px-8 py-16 text-center sm:py-20">
          <h2
            className="display mx-auto max-w-2xl text-[var(--ch-ivory)]"
            style={{ fontSize: "clamp(2.1rem, 4.5vw, 3.4rem)", lineHeight: 1.03 }}
          >
            Il primo brano è a un clic.
          </h2>
          <p className="mx-auto mt-4 max-w-md leading-relaxed text-[var(--ch-muted)]">
            Nessuna registrazione per provare. Accedi solo quando vuoi salvare.
          </p>
          <Link
            href="/app"
            className="mt-9 inline-block rounded-full bg-[var(--ch-brass)] px-8 py-3.5 text-[0.95rem] font-semibold text-[var(--ch-bg-deep)] transition duration-300 hover:bg-[var(--ch-ivory)]"
          >
            Apri l&apos;app
          </Link>
        </div>
      </section>

      <footer className="border-t border-[var(--ch-line)]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-9 sm:flex-row">
          <Wordmark />
          <p className="text-sm text-[var(--ch-faint)]">
            Vedi quali tasti suonare.
          </p>
        </div>
      </footer>
    </div>
  );
}
