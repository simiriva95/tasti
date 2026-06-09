// Unified music model. Both MIDI and MusicXML parse into this shape so the rest
// of the app never needs to know which format the user uploaded.

export interface Note {
  /** MIDI note number, 21 (A0) .. 108 (C8). Middle C (C4) = 60. */
  midi: number;
  /** Onset in seconds from the start of the piece. */
  time: number;
  /** Duration in seconds. */
  duration: number;
  /** Source track/part index, kept for optional per-hand coloring. */
  track: number;
}

export interface Song {
  notes: Note[];
  /** Total length in seconds. */
  durationSec: number;
  bpm: number;
  name: string;
}

export interface ChordEvent {
  /** Onset in seconds (shared by all notes struck at this moment). */
  time: number;
  /** MIDI numbers struck at this onset, ascending (used for the roll bars). */
  midis: number[];
  /**
   * MIDI numbers to highlight/play for this event: the full harmonic group
   * (chord tones sounding around this onset, e.g. an arpeggio resolved into a
   * chord). Equals `midis` when no wider harmony is detected.
   */
  chordMidis: number[];
  /** Longest duration among the struck notes (for the roll bar height). */
  duration: number;
  /** Human label: a chord name ("C major") or a note / note list. */
  label: string;
}
