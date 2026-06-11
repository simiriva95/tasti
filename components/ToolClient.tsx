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
  GoogleLogoIcon,
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

  async function omrToSong(
    file: File,
    quiet = false
  ): Promise<{ song: Song; xml: string }> {
    if (!quiet)
      setLoadingText("Sto leggendo lo spartito... (puo' richiedere un minuto)");
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/omr", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Conversione PDF fallita.");
    const parsed = parseMusicXml(data.xml, data.name ?? file.name, data.bpm ?? 120);
    return { song: parsed, xml: data.xml };
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
    <div className="flex min-h-[100dvh] flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="flex shrink-0 items-center justify-between border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white">
            <PianoKeysIcon size={20} weight="fill" />
          </span>
          <div className="leading-tight">
            <h1 className="text-base font-semibold tracking-tight">Tasti</h1>
            <p className="text-xs text-zinc-500">Vedi quali tasti suonare</p>
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
              className="flex items-center gap-2 rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-emerald-600 disabled:opacity-60"
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
              onClick={() => signIn("google")}
              className="flex items-center gap-2 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
            >
              <GoogleLogoIcon size={16} weight="bold" />
              Accedi
            </button>
          )}
        </div>
      </header>

      {!song ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-8 px-5 py-12">
          <div className="max-w-lg text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Carica un brano, vedi i tasti.
            </h2>
            <p className="mt-3 text-zinc-600 dark:text-zinc-400">
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
