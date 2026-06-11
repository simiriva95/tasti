import { Midi } from "@tonejs/midi";
import type { Song } from "./types";

const PAGE_GAP_SEC = 0.6; // small breath between pages

/** Append songs one after another on a single timeline (page 1, page 2, ...). */
export function mergeSongs(songs: Song[], name: string): Song {
  const notes: Song["notes"] = [];
  let offset = 0;
  for (const s of songs) {
    for (const n of s.notes) {
      notes.push({ ...n, time: n.time + offset });
    }
    offset += s.durationSec + PAGE_GAP_SEC;
  }
  const durationSec = notes.reduce(
    (m, n) => Math.max(m, n.time + n.duration),
    0
  );
  return { notes, durationSec, bpm: songs[0]?.bpm ?? 120, name };
}

/** Render a Song to standard MIDI bytes (for saving/exporting). */
export function songToMidiBytes(song: Song): Uint8Array {
  const midi = new Midi();
  midi.header.setTempo(song.bpm || 120);
  const track = midi.addTrack();
  for (const n of song.notes) {
    track.addNote({ midi: n.midi, time: n.time, duration: n.duration });
  }
  return midi.toArray();
}
