import { Midi } from "@tonejs/midi";
import type { Song } from "./types";

/** Parse a MIDI ArrayBuffer into the unified Song model. */
export function parseMidi(buffer: ArrayBuffer, name: string): Song {
  const midi = new Midi(buffer);

  const notes = midi.tracks.flatMap((track, trackIndex) =>
    track.notes.map((n) => ({
      midi: n.midi,
      time: n.time,
      duration: n.duration,
      track: trackIndex,
    }))
  );

  notes.sort((a, b) => a.time - b.time);

  const durationSec = notes.reduce(
    (max, n) => Math.max(max, n.time + n.duration),
    0
  );

  const bpm = midi.header.tempos[0]?.bpm ?? 120;

  return { notes, durationSec, bpm, name };
}
