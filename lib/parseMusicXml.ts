import type { Note, Song } from "./types";

const STEP_SEMITONES: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

function text(el: Element | null, tag: string): string | null {
  const child = el?.querySelector(tag);
  return child?.textContent?.trim() ?? null;
}

function num(el: Element | null, tag: string): number | null {
  const t = text(el, tag);
  if (t === null) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

const BEAT_UNIT_QUARTERS: Record<string, number> = {
  whole: 4,
  half: 2,
  quarter: 1,
  eighth: 0.5,
  "16th": 0.25,
  "32nd": 0.125,
};

/**
 * Read a <metronome> mark (e.g. quarter = 82) and return the equivalent
 * quarter-note BPM, accounting for the beat unit and an optional dot.
 * Returns 0 when no usable metronome is present.
 */
function metronomeBpm(direction: Element): number {
  const metro = direction.querySelector("metronome");
  if (!metro) return 0;
  const perMinute = num(metro, "per-minute");
  const unit = text(metro, "beat-unit");
  if (!perMinute || !unit) return 0;
  let unitQuarters = BEAT_UNIT_QUARTERS[unit.toLowerCase()] ?? 1;
  if (metro.querySelector("beat-unit-dot")) unitQuarters *= 1.5;
  return perMinute * unitQuarters;
}

/** Convert a MusicXML <pitch> element into a MIDI note number. */
function pitchToMidi(pitch: Element): number | null {
  const step = text(pitch, "step");
  const octave = num(pitch, "octave");
  if (step === null || octave === null) return null;
  const semitone = STEP_SEMITONES[step.toUpperCase()];
  if (semitone === undefined) return null;
  const alter = num(pitch, "alter") ?? 0;
  return (octave + 1) * 12 + semitone + alter;
}

/**
 * Parse a (plain, uncompressed) MusicXML document into the unified Song model.
 *
 * Walks every part independently (each part has its own timeline starting at 0),
 * tracking a divisions-based cursor. Handles <chord/> (stacked onset), <rest>,
 * <backup>, <forward>, per-measure <divisions>, and <sound tempo>.
 */
export function parseMusicXml(
  xmlText: string,
  name: string,
  fallbackBpm = 120
): Song {
  const doc = new DOMParser().parseFromString(xmlText, "application/xml");

  if (doc.querySelector("parsererror")) {
    throw new Error("File MusicXML non valido.");
  }

  const parts = Array.from(doc.querySelectorAll("part"));
  if (parts.length === 0) {
    throw new Error("Nessuna parte trovata nel file MusicXML.");
  }

  let firstBpm = 0; // first tempo seen anywhere, used as the song's nominal bpm
  const notes: Note[] = [];

  parts.forEach((part, trackIndex) => {
    let divisions = 1; // ticks per quarter note (carried across measures)
    let bpm = fallbackBpm; // current tempo; <sound tempo>/<metronome> overrides
    let timeSec = 0; // REAL seconds from part start (integrates tempo changes)
    let lastOnsetSec = 0; // onset of the previous note (for <chord/>)
    const tiePending = new Map<string, Note>(); // voice:midi -> note to extend

    // Seconds for a span given in divisions, at the *currently active* tempo.
    const toSec = (divs: number) => (divs * 60) / bpm / divisions;

    for (const measure of Array.from(part.querySelectorAll("measure"))) {
      const measureDivisions = num(measure, "divisions");
      if (measureDivisions && measureDivisions > 0) divisions = measureDivisions;

      // Walk direct children in document order so timing stays correct.
      for (const el of Array.from(measure.children)) {
        const tag = el.tagName.toLowerCase();

        if (tag === "attributes") {
          const d = num(el, "divisions");
          if (d && d > 0) divisions = d;
          continue;
        }

        if (tag === "direction" || tag === "sound") {
          const sound = tag === "sound" ? el : el.querySelector("sound");
          const tempo = sound?.getAttribute("tempo");
          // Prefer an explicit <sound tempo>; otherwise read a <metronome> mark
          // (e.g. quarter = 82) which is what most engravers/OMR actually emit.
          const next = tempo ? Number(tempo) : metronomeBpm(el);
          if (next && next > 0) {
            // Applies from here on; earlier seconds keep their own tempo because
            // time is accumulated incrementally below.
            bpm = next;
            if (!firstBpm) firstBpm = bpm;
          }
          continue;
        }

        if (tag === "backup") {
          timeSec -= toSec(num(el, "duration") ?? 0);
          continue;
        }

        if (tag === "forward") {
          timeSec += toSec(num(el, "duration") ?? 0);
          continue;
        }

        if (tag !== "note") continue;

        const duration = num(el, "duration") ?? 0;
        const isChord = el.querySelector("chord") !== null;
        const isRest = el.querySelector("rest") !== null;
        const pitchEl = el.querySelector("pitch");

        const durSec = toSec(duration);
        // A chord note shares the previous note's onset and does not advance.
        const onsetSec = isChord ? lastOnsetSec : timeSec;

        if (!isRest && pitchEl) {
          const midi = pitchToMidi(pitchEl);
          if (midi !== null) {
            const voice = text(el, "voice") ?? "1";
            const key = `${voice}:${midi}`;
            const tieStop = el.querySelector('tie[type="stop"]') !== null;
            const tieStart = el.querySelector('tie[type="start"]') !== null;

            const held = tieStop ? tiePending.get(key) : undefined;
            if (held) {
              // Continuation of a tied note: extend it instead of re-striking.
              held.duration += durSec;
              if (tieStart) tiePending.set(key, held);
              else tiePending.delete(key);
            } else {
              const note: Note = {
                midi,
                time: onsetSec,
                duration: durSec,
                track: trackIndex,
              };
              notes.push(note);
              if (tieStart) tiePending.set(key, note);
            }
          }
        }

        if (!isChord) {
          lastOnsetSec = timeSec;
          timeSec += durSec;
        }
      }
    }
  });

  notes.sort((a, b) => a.time - b.time);

  const durationSec = notes.reduce(
    (max, n) => Math.max(max, n.time + n.duration),
    0
  );

  return { notes, durationSec, bpm: firstBpm || fallbackBpm, name };
}
