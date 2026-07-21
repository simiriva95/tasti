import type { Metadata } from "next";
import Link from "next/link";
import {
  PianoKeysIcon,
  UploadSimpleIcon,
  CursorClickIcon,
  WaveformIcon,
  FilePdfIcon,
  MusicNotesIcon,
  SlidersIcon,
} from "@phosphor-icons/react/dist/ssr";

export const metadata: Metadata = {
  title: "Tasti — vedi quali tasti del pianoforte suonare",
  description:
    "Carica un MIDI, uno spartito MusicXML o un PDF e guarda, sulla tastiera, esattamente quali tasti premere. Note che scendono stile Synthesia, accordi riconosciuti, audio piano/chitarra/archi. Senza teoria musicale.",
  alternates: { canonical: "/" },
};

const steps = [
  {
    icon: UploadSimpleIcon,
    title: "Carica il brano",
    body: "Un file MIDI, uno spartito MusicXML o un PDF dello spartito. Pensiamo noi a leggerlo.",
  },
  {
    icon: WaveformIcon,
    title: "Premi play",
    body: "Le note scendono verso la tastiera e i tasti giusti si illuminano, sull'ottava giusta.",
  },
  {
    icon: CursorClickIcon,
    title: "Clicca un accordo",
    body: "Ti fermi su qualsiasi nota o accordo e vedi quali tasti premere, con il nome dell'accordo.",
  },
];

const features = [
  {
    icon: FilePdfIcon,
    title: "Leggi i PDF",
    body: "Hai lo spartito in PDF? Lo convertiamo e ti mostriamo le note. Tempo letto in automatico quando c'è.",
  },
  {
    icon: MusicNotesIcon,
    title: "Accordi riconosciuti",
    body: "Niente teoria: ti diciamo che è un Do maggiore, un Sol7, e quali tasti compongono l'accordo.",
  },
  {
    icon: SlidersIcon,
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

export default function Landing() {
  return (
    <div className="min-h-[100dvh] bg-[#0c0718] text-zinc-100">
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
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-pink-400 to-indigo-400 text-white">
            <PianoKeysIcon size={20} weight="fill" />
          </span>
          <span className="text-lg font-semibold tracking-tight">Tasti</span>
        </div>
        <Link
          href="/app"
          className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium ring-1 ring-white/15 backdrop-blur transition hover:bg-white/15"
        >
          Apri l&apos;app
        </Link>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 70% at 50% 0%, rgba(150,90,200,0.35), transparent 60%), radial-gradient(80% 50% at 80% 20%, rgba(80,200,220,0.18), transparent 60%)",
          }}
        />
        <div className="relative mx-auto max-w-3xl px-6 pb-20 pt-16 text-center sm:pt-24">
          <p className="mb-4 inline-block rounded-full bg-white/5 px-3 py-1 text-xs font-medium tracking-wide text-pink-200 ring-1 ring-white/10">
            Senza teoria musicale
          </p>
          <h1 className="bg-gradient-to-r from-pink-200 via-indigo-200 to-teal-200 bg-clip-text text-4xl font-semibold leading-tight tracking-tight text-transparent sm:text-6xl">
            Vedi quali tasti suonare.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-zinc-300">
            Carica un MIDI, uno spartito MusicXML o un PDF. Le note scendono verso
            la tastiera e i tasti giusti si illuminano. Clicca un accordo e vedi
            cosa premere.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              href="/app"
              className="rounded-full bg-gradient-to-r from-pink-400 to-indigo-400 px-6 py-3 font-medium text-white shadow-[0_8px_30px_rgba(180,120,220,0.45)] transition hover:brightness-110"
            >
              Inizia ora
            </Link>
            <a
              href="#come-funziona"
              className="rounded-full px-5 py-3 font-medium text-zinc-300 ring-1 ring-white/15 transition hover:bg-white/5"
            >
              Come funziona
            </a>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="come-funziona" className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="mb-10 text-center text-2xl font-semibold tracking-tight sm:text-3xl">
          Tre passi, zero teoria
        </h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {steps.map((s, i) => (
            <div
              key={s.title}
              className="rounded-2xl bg-white/[0.03] p-6 ring-1 ring-white/10"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-pink-400/30 to-indigo-400/30 text-pink-200">
                <s.icon size={22} weight="bold" />
              </div>
              <p className="mb-1 text-sm font-medium text-zinc-400">
                Passo {i + 1}
              </p>
              <h3 className="mb-2 text-lg font-semibold">{s.title}</h3>
              <p className="text-sm leading-relaxed text-zinc-400">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-6 sm:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl bg-white/[0.03] p-6 ring-1 ring-white/10"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400/25 to-indigo-400/25 text-teal-200">
                <f.icon size={22} weight="bold" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">{f.title}</h3>
              <p className="text-sm leading-relaxed text-zinc-400">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-6 py-16">
        <h2 className="mb-8 text-center text-2xl font-semibold tracking-tight sm:text-3xl">
          Domande frequenti
        </h2>
        <div className="divide-y divide-white/10 rounded-2xl bg-white/[0.03] ring-1 ring-white/10">
          {faqs.map((f) => (
            <details key={f.q} className="group p-6">
              <summary className="cursor-pointer list-none font-medium">
                {f.q}
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-3xl px-6 pb-24 text-center">
        <div className="rounded-3xl bg-gradient-to-br from-pink-500/15 to-indigo-500/15 p-10 ring-1 ring-white/10">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Pronto a suonare?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-zinc-300">
            Carica il tuo primo brano. Niente registrazione richiesta per provare.
          </p>
          <Link
            href="/app"
            className="mt-6 inline-block rounded-full bg-gradient-to-r from-pink-400 to-indigo-400 px-6 py-3 font-medium text-white transition hover:brightness-110"
          >
            Apri l&apos;app
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/10 py-8 text-center text-sm text-zinc-500">
        Tasti — vedi quali tasti suonare.
      </footer>
    </div>
  );
}
