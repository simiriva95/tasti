import { Chord, Note as TonalNote } from "@tonaljs/tonal";
import type { ChordEvent, Note, Song } from "./types";

const ONSET_TOLERANCE = 0.06; // seconds; notes struck within this = one onset
const HARMONY_BEATS = 1.0; // how far forward (in beats) to gather chord tones

/** Pretty note name with octave, e.g. 60 -> "C4". */
export function midiToName(midi: number): string {
  return TonalNote.fromMidi(midi);
}

/** Pitch class only, e.g. 61 -> "C#". */
function midiToPitchClass(midi: number): string {
  return TonalNote.pitchClass(TonalNote.fromMidi(midi)) || "";
}

/** Turn tonal's terse symbols into friendly labels (e.g. "CM" -> "C major"). */
function friendlyChord(detected: string): string {
  const chord = Chord.get(detected);
  if (chord.empty || !chord.tonic) return detected;
  const quality = chord.type && chord.type !== "major" ? ` ${chord.type}` : "";
  const base = chord.type === "major" ? `${chord.tonic} major` : `${chord.tonic}${quality}`;
  return base.trim();
}

/** Try to name a chord from a set of MIDI notes; null if nothing convincing. */
function tryNamedChord(midis: number[]): string | null {
  const pcs = Array.from(new Set(midis.map(midiToPitchClass))).filter(Boolean);
  if (pcs.length < 3) return null; // need a real triad to claim a chord
  const detected = Chord.detect(pcs, { assumePerfectFifth: true });
  if (detected.length === 0) return null;
  const friendly = friendlyChord(detected[0]);
  // Reject "names" that are just the raw note set echoed back.
  return /[A-G]/.test(friendly) && !friendly.includes(",") ? friendly : null;
}

/** Fallback label when no named chord: single note, or a short note list. */
function plainLabel(midis: number[]): string {
  if (midis.length === 1) return midiToName(midis[0]);
  const named = tryNamedChord(midis);
  if (named) return named;
  return midis.map(midiToName).join(" + ");
}

const HARMONY_BACK = 0.08; // seconds; tolerance for notes struck just before t

/**
 * Gather the chord tones of an arpeggio / broken chord: notes whose ONSET falls
 * in a short window around `t` (struck in quick succession). Grouping by onset
 * (not by sustain) avoids dragging in the ringing tail of the previous chord.
 * `notes` must be sorted by time.
 */
function harmonicGroup(notes: Note[], t: number, beat: number): number[] {
  const fwd = beat * HARMONY_BEATS;
  const out = new Set<number>();
  for (const n of notes) {
    if (n.time > t + fwd) break; // sorted: nothing later can qualify
    if (n.time >= t - HARMONY_BACK) out.add(n.midi);
  }
  return Array.from(out).sort((a, b) => a - b);
}

export interface ChordContext {
  midis: number[];
  label: string;
  /** Onset span of the notes that make up this context (for highlighting). */
  t0: number;
  t1: number;
}

/**
 * Resolve the harmony around an arbitrary time `t` (e.g. where the user clicked).
 * Uses a symmetric window so clicking ANY note of an arpeggio reveals the whole
 * chord. Falls back to the single struck note/onset when no chord is present.
 * `notes` must be sorted by time.
 */
export function chordContext(
  notes: Note[],
  events: ChordEvent[],
  t: number,
  beat: number
): ChordContext {
  const W = beat * 0.6;
  const group: Note[] = [];
  for (const n of notes) {
    if (n.time > t + W) break;
    if (n.time >= t - W) group.push(n);
  }
  const gmidis = Array.from(new Set(group.map((n) => n.midi))).sort(
    (a, b) => a - b
  );
  const named = tryNamedChord(gmidis);
  if (named && group.length) {
    const onsets = group.map((n) => n.time);
    return { midis: gmidis, label: named, t0: Math.min(...onsets), t1: Math.max(...onsets) };
  }

  // No chord: show just the note(s) struck at the nearest onset.
  let best: ChordEvent | null = null;
  let bd = Infinity;
  for (const e of events) {
    const d = Math.abs(e.time - t);
    if (d < bd) {
      bd = d;
      best = e;
    }
  }
  if (!best) return { midis: gmidis, label: plainLabel(gmidis), t0: t, t1: t };
  return { midis: best.chordMidis, label: best.label, t0: best.time, t1: best.time };
}

/**
 * Group a song's notes into chord events by shared onset time.
 * Single notes become single-note events. Result is time-ordered.
 */
export function detectChords(song: Song): ChordEvent[] {
  const notes = [...song.notes].sort((a, b) => a.time - b.time || a.midi - b.midi);
  const beat = 60 / (song.bpm || 120);
  const events: ChordEvent[] = [];

  let bucket: Note[] = [];
  let bucketStart = -Infinity;

  const flush = () => {
    if (bucket.length === 0) return;
    const time = bucket[0].time;
    const midis = Array.from(new Set(bucket.map((n) => n.midi))).sort(
      (a, b) => a - b
    );

    // Look at the wider harmonic window to name a chord even from arpeggios.
    const group = harmonicGroup(notes, time, beat);
    const named = tryNamedChord(group);

    events.push({
      time,
      midis,
      // When a chord is recognized, highlight/play its full set of tones;
      // otherwise just the notes struck at this onset.
      chordMidis: named ? group : midis,
      duration: Math.max(...bucket.map((n) => n.duration)),
      label: named ?? plainLabel(midis),
    });
    bucket = [];
  };

  for (const note of notes) {
    if (note.time - bucketStart > ONSET_TOLERANCE) {
      flush();
      bucketStart = note.time;
    }
    bucket.push(note);
  }
  flush();

  return events;
}
