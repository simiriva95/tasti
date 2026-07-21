"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { signIn, signOut } from "next-auth/react";
import {
  PianoKeysIcon,
  ArrowCounterClockwiseIcon,
  FloppyDiskIcon,
  MusicNotesIcon,
  SignOutIcon,
  GithubLogoIcon,
} from "@phosphor-icons/react";
import FileDrop from "@/components/FileDrop";
import PianoStage from "@/components/PianoStage";
import { loadSong } from "@/lib/loadSong";
import { parseMusicXml } from "@/lib/parseMusicXml";
import { mxlToXml } from "@/lib/mxl";
import { cleanPhoto } from "@/lib/cleanPhoto";
import { mergeSongs, songToMidiBytes } from "@/lib/songMerge";
import { detectChords } from "@/lib/chords";
import type { Song } from "@/lib/types";

export interface SessionUser {
  id: string;
  name?: string | null;
  image?: string | null;
}

interface Savable {
  name: string;
  format: "midi" | "musicxml";
  dataB64: string;
}

function bytesToB64(u8: Uint8Array): string {
  let s = "";
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
  return btoa(s);
}
function textToB64(text: string): string {
  return bytesToB64(new TextEncoder().encode(text));
}

export default function ToolClient({ user }: { user: SessionUser | null }) {
  const [song, setSong] = useState<Song | null>(null);
  const [savable, setSavable] = useState<Savable | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  const events = useMemo(() => (song ? detectChords(song) : []), [song]);

  /** Poll an async OMR job until it finishes (see omr-service). Slow scores no
   *  longer hit any request timeout — the work runs in the background. */
  async function pollOmr(
    jobId: string,
    quiet: boolean
  ): Promise<{ xml: string; name?: string; bpm?: number }> {
    const started = Date.now();
    const MAX_MS = 16 * 60 * 1000;
    for (;;) {
      await new Promise((r) => setTimeout(r, 3000));
      const res = await fetch(`/api/omr/${jobId}`);
      if (res.status === 404)
        throw new Error("Sessione scaduta, ricarica il file.");
      const d = await res.json();
      if (d.status === "done") return d;
      if (d.status === "error")
        throw new Error(d.error ?? "Conversione fallita.");
      if (Date.now() - started > MAX_MS)
        throw new Error("Conversione troppo lunga. Prova uno spartito più corto.");
      if (!quiet) setLoadingText("Sto leggendo lo spartito... ci lavoro");
    }
  }

  async function omrToSong(
    file: File,
    quiet = false
  ): Promise<{ song: Song; xml: string }> {
    if (!quiet)
      setLoadingText("Sto leggendo lo spartito... (puo' richiedere qualche minuto)");
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/omr", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok && !data.jobId)
      throw new Error(data.error ?? "Conversione PDF fallita.");
    // Async path returns a jobId to poll; local-dev fallback returns xml directly.
    const result = data.jobId ? await pollOmr(data.jobId, quiet) : data;
    const parsed = parseMusicXml(
      result.xml,
      result.name ?? file.name,
      result.bpm ?? 120
    );
    return { song: parsed, xml: result.xml };
  }

  const IMAGE_RE = /\.(png|jpe?g|tiff?|bmp)$/i;

  /** Batch of photos of a paper score: OMR each page, then stitch the result
   *  into one song (and a downloadable/savable MIDI). */
  async function handlePhotoBatch(files: File[]) {
    const pages = [...files].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true })
    );
    const songsParsed: Song[] = [];
    for (let i = 0; i < pages.length; i++) {
      setLoadingText(`Leggo pagina ${i + 1} di ${pages.length}...`);
      const cleaned = await cleanPhoto(pages[i]);
      try {
        const { song: s } = await omrToSong(cleaned, true);
        songsParsed.push(s);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "conversione fallita";
        throw new Error(`Pagina ${i + 1} (${pages[i].name}): ${msg}`);
      }
    }
    const name = pages[0].name.replace(/\.[^.]+$/, "");
    const merged = mergeSongs(songsParsed, name);
    if (merged.notes.length === 0) {
      throw new Error("Non ho trovato note nelle foto.");
    }
    setSong(merged);
    setSavable({
      name,
      format: "midi",
      dataB64: bytesToB64(songToMidiBytes(merged)),
    });
  }

  async function handleFiles(files: File[]) {
    setLoading(true);
    setLoadingText(undefined);
    setError(null);
    setSaveState("idle");
    try {
      if (files.length > 1) {
        if (!files.every((f) => IMAGE_RE.test(f.name))) {
          throw new Error(
            "Puoi caricare più file solo se sono tutte foto dello spartito."
          );
        }
        await handlePhotoBatch(files);
        return;
      }
      await handleFile(files[0]);
      return;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore nella lettura dei file.");
    } finally {
      setLoading(false);
      setLoadingText(undefined);
    }
  }

  async function handleFile(file: File) {
    try {
      const name = file.name.replace(/\.[^.]+$/, "");
      let parsed: Song;
      let toSave: Savable;

      if (/\.(pdf|png|jpe?g|tiff?|bmp)$/i.test(file.name)) {
        const { song: s, xml } = await omrToSong(file);
        parsed = s;
        toSave = { name, format: "musicxml", dataB64: textToB64(xml) };
      } else if (/\.midi?$/i.test(file.name)) {
        parsed = await loadSong(file);
        toSave = {
          name,
          format: "midi",
          dataB64: bytesToB64(new Uint8Array(await file.arrayBuffer())),
        };
      } else if (/\.mxl$/i.test(file.name)) {
        parsed = await loadSong(file);
        const xml = mxlToXml(new Uint8Array(await file.arrayBuffer()));
        toSave = { name, format: "musicxml", dataB64: textToB64(xml) };
      } else {
        parsed = await loadSong(file);
        toSave = { name, format: "musicxml", dataB64: textToB64(await file.text()) };
      }

      if (parsed.notes.length === 0) {
        throw new Error("Non ho trovato note in questo file.");
      }
      setSong(parsed);
      setSavable(toSave);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore nella lettura del file.");
    } finally {
      setLoading(false);
      setLoadingText(undefined);
    }
  }

  async function save() {
    if (!savable || !song) return;
    setSaveState("saving");
    try {
      const res = await fetch("/api/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...savable,
          bpm: Math.round(song.bpm) || null,
          durationSec: song.durationSec ?? null,
        }),
      });
      if (!res.ok) throw new Error();
      setSaveState("saved");
    } catch {
      setSaveState("idle");
      setError("Salvataggio non riuscito.");
    }
  }

  function reset() {
    setSong(null);
    setSavable(null);
    setError(null);
    setSaveState("idle");
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[var(--ch-bg)] text-[var(--ch-text)]">
      <header className="flex shrink-0 items-center justify-between border-b border-[var(--ch-line)] px-5 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--ch-brass)] text-[var(--ch-bg-deep)]">
            <PianoKeysIcon size={20} weight="fill" />
          </span>
          <div className="leading-tight">
            <h1 className="display text-lg leading-none text-[var(--ch-ivory)]">Tasti</h1>
            <p className="mt-0.5 text-xs text-[var(--ch-faint)]">Vedi quali tasti suonare</p>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          {song && (
            <button
              onClick={reset}
              className="flex items-center gap-2 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
            >
              <ArrowCounterClockwiseIcon size={16} weight="bold" />
              Nuovo
            </button>
          )}
          {song && user && (
            <button
              onClick={save}
              disabled={saveState !== "idle"}
              className="flex items-center gap-2 rounded-lg bg-[var(--ch-brass)] px-3 py-1.5 text-sm font-semibold text-[var(--ch-bg-deep)] transition hover:bg-[var(--ch-ivory)] disabled:opacity-60"
            >
              <FloppyDiskIcon size={16} weight="bold" />
              {saveState === "saved"
                ? "Salvato"
                : saveState === "saving"
                  ? "Salvo..."
                  : "Salva"}
            </button>
          )}
          {user ? (
            <>
              <Link
                href="/library"
                className="flex items-center gap-2 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
              >
                <MusicNotesIcon size={16} weight="bold" />
                Libreria
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                title="Esci"
                className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-zinc-300 dark:border-zinc-700"
              >
                {user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.image} alt="" className="h-full w-full object-cover" />
                ) : (
                  <SignOutIcon size={16} />
                )}
              </button>
            </>
          ) : (
            <button
              onClick={() => signIn("github")}
              className="flex items-center gap-2 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
            >
              <GithubLogoIcon size={16} weight="bold" />
              Accedi
            </button>
          )}
        </div>
      </header>

      {!song ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-8 px-5 py-12">
          <div className="max-w-lg text-center">
            <h2
              className="display text-[var(--ch-ivory)]"
              style={{ fontSize: "clamp(2rem, 5vw, 2.9rem)", lineHeight: 1.05 }}
            >
              Carica un brano, vedi i tasti.
            </h2>
            <p className="mt-4 leading-relaxed text-[var(--ch-muted)]">
              Apri un file MIDI, uno spartito MusicXML o un PDF. Premi play: le
              note scendono verso la tastiera e i tasti si illuminano. Clicca una
              nota per fermarti e vedere l&apos;accordo.
            </p>
          </div>
          <FileDrop
            onFiles={handleFiles}
            loading={loading}
            loadingText={loadingText}
            error={error}
          />
        </div>
      ) : (
        <PianoStage key={savable?.name ?? song.name} song={song} events={events} />
      )}
    </div>
  );
}
