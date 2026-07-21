"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  PianoKeysIcon,
  ArrowLeftIcon,
  TrashIcon,
  MusicNoteIcon,
} from "@phosphor-icons/react";
import PianoStage from "@/components/PianoStage";
import { parseMidi } from "@/lib/parseMidi";
import { parseMusicXml } from "@/lib/parseMusicXml";
import { detectChords } from "@/lib/chords";
import type { Song } from "@/lib/types";

interface Item {
  id: string;
  name: string;
  format: "midi" | "musicxml";
  bpm: number | null;
  durationSec: number | null;
  sizeBytes: number;
  createdAt: string;
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8;
}

export default function LibraryClient() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [song, setSong] = useState<Song | null>(null);
  const [busy, setBusy] = useState(false);
  const events = useMemo(() => (song ? detectChords(song) : []), [song]);

  async function refresh() {
    const res = await fetch("/api/library");
    const data = await res.json();
    setItems(res.ok ? data.songs : []);
  }

  useEffect(() => {
    // Fetch the library once on mount (state is set after the await, async).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, []);

  async function open(item: Item) {
    setBusy(true);
    try {
      const res = await fetch(`/api/library/${item.id}`);
      const data = await res.json();
      if (!res.ok) return;
      const bytes = b64ToBytes(data.dataB64);
      const parsed =
        data.format === "midi"
          ? parseMidi(
              bytes.buffer.slice(
                bytes.byteOffset,
                bytes.byteOffset + bytes.byteLength
              ) as ArrayBuffer,
              data.name
            )
          : parseMusicXml(
              new TextDecoder().decode(b64ToBytes(data.dataB64)),
              data.name,
              data.bpm ?? 120
            );
      setSong(parsed);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    await fetch(`/api/library/${id}`, { method: "DELETE" });
    setItems((prev) => prev?.filter((i) => i.id !== id) ?? null);
  }

  if (song) {
    return (
      <div className="flex min-h-[100dvh] flex-col bg-[var(--ch-bg)]">
        <header className="flex shrink-0 items-center gap-3 border-b border-[var(--ch-line)] px-5 py-3">
          <button
            onClick={() => setSong(null)}
            className="flex items-center gap-2 rounded-lg border border-[var(--ch-line-strong)] px-3 py-1.5 text-sm font-medium text-[var(--ch-text)] transition hover:bg-white/5"
          >
            <ArrowLeftIcon size={16} weight="bold" />
            Libreria
          </button>
        </header>
        <PianoStage key={song.name} song={song} events={events} />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[var(--ch-bg)] text-[var(--ch-text)]">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <Link href="/app" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--ch-brass)] text-[var(--ch-bg-deep)]">
            <PianoKeysIcon size={18} weight="fill" />
          </span>
          <span className="display text-xl leading-none text-[var(--ch-ivory)]">
            La tua libreria
          </span>
        </Link>
        <Link
          href="/app"
          className="rounded-full border border-[var(--ch-line-strong)] px-4 py-2 text-sm font-medium text-[var(--ch-text)] transition hover:bg-white/5"
        >
          Carica nuovo
        </Link>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-6">
        {items === null ? (
          <p className="py-20 text-center text-[var(--ch-faint)]">Carico…</p>
        ) : items.length === 0 ? (
          <div className="py-20 text-center text-[var(--ch-muted)]">
            <MusicNoteIcon size={32} className="mx-auto mb-3 text-[var(--ch-brass)]" />
            <p>Nessun brano salvato. Caricane uno e premi “Salva”.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="group flex items-center justify-between rounded-xl border border-[var(--ch-line)] bg-[var(--ch-surface)] p-4 transition hover:border-[var(--ch-line-strong)]"
              >
                <button
                  onClick={() => open(item)}
                  disabled={busy}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate font-medium">{item.name}</p>
                  <p className="text-xs text-zinc-500">
                    {item.format === "midi" ? "MIDI" : "MusicXML"}
                    {item.bpm ? ` · ${item.bpm} BPM` : ""}
                  </p>
                </button>
                <button
                  onClick={() => remove(item.id)}
                  title="Elimina"
                  className="ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/40"
                >
                  <TrashIcon size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
