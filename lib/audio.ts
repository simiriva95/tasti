import * as Tone from "tone";
import { Soundfont } from "smplr";

// General-MIDI instruments offered in the UI (MusyngKite soundfont names).
export const INSTRUMENTS = {
  acoustic_grand_piano: "Piano",
  acoustic_guitar_nylon: "Chitarra",
  string_ensemble_1: "Archi",
} as const;
export type InstrumentId = keyof typeof INSTRUMENTS;

let started = false;
let currentId: InstrumentId = "acoustic_grand_piano";
const cache = new Map<InstrumentId, Soundfont>();

function rawContext(): AudioContext {
  return Tone.getContext().rawContext as unknown as AudioContext;
}

async function getInstrument(id: InstrumentId): Promise<Soundfont> {
  let inst = cache.get(id);
  if (!inst) {
    inst = new Soundfont(rawContext(), { instrument: id });
    cache.set(id, inst);
  }
  await inst.load;
  return inst;
}

/** Start the audio context (needs a user gesture) and load the current sound. */
export async function ensureAudio(): Promise<void> {
  if (!started) {
    await Tone.start();
    started = true;
  }
  await getInstrument(currentId);
}

export function getInstrumentId(): InstrumentId {
  return currentId;
}

/** Switch instrument (piano / guitar / strings) and preload its samples. */
export async function setInstrument(id: InstrumentId): Promise<void> {
  currentId = id;
  await ensureAudio();
}

/** Play one or more MIDI notes immediately (click-to-hear). */
export async function playMidis(midis: number[], durationSec = 1.4) {
  await ensureAudio();
  const inst = cache.get(currentId);
  if (!inst) return;
  const t = rawContext().currentTime;
  for (const m of midis) inst.start({ note: m, time: t, duration: durationSec });
}

// ----- Transport-driven playback (the master clock for the falling notes) -----

type PartEvent = { time: number; midi: number; dur: number };
let part: Tone.Part<PartEvent> | null = null;

export function getTransport() {
  return Tone.getTransport();
}

/**
 * Schedule the whole song on Tone.Transport so audio fires on the precise audio
 * clock. `speed` scales playback (1 = original). Times are stage seconds.
 */
export async function loadSchedule(
  notes: { time: number; midi: number; duration: number }[],
  speed = 1
) {
  await ensureAudio();
  const tr = Tone.getTransport();
  tr.stop();
  tr.cancel();
  tr.position = 0;
  if (part) {
    part.dispose();
    part = null;
  }
  part = new Tone.Part<PartEvent>(
    (time, ev) => {
      const inst = cache.get(currentId);
      if (inst) inst.start({ note: ev.midi, time, duration: ev.dur });
    },
    notes.map((n) => ({
      time: n.time / speed,
      midi: n.midi,
      dur: Math.min(Math.max(n.duration / speed, 0.12), 6),
    }))
  );
  part.start(0);
}

export function disposeSchedule() {
  if (part) {
    part.dispose();
    part = null;
  }
  const tr = Tone.getTransport();
  tr.stop();
  tr.cancel();
}
