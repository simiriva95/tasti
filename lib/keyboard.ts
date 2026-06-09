// Geometry for an 88-key piano (A0 = MIDI 21 .. C8 = MIDI 108), shared by the
// keyboard component and the piano roll so their columns line up exactly.

export const FIRST_MIDI = 21; // A0
export const LAST_MIDI = 108; // C8
export const WHITE_KEYS = 52;

const BLACK_SEMITONES = new Set([1, 3, 6, 8, 10]);

export function isBlackKey(midi: number): boolean {
  return BLACK_SEMITONES.has(((midi % 12) + 12) % 12);
}

export interface KeyGeom {
  midi: number;
  black: boolean;
  /** Left edge in px. */
  x: number;
  /** Width in px. */
  w: number;
  /** Center in px (used to align roll bars to keys). */
  cx: number;
}

export interface KeyboardLayout {
  keys: KeyGeom[];
  width: number;
  /** midi -> center x, for the piano roll. */
  centerOf: (midi: number) => number;
}

/**
 * Build key rectangles for the full 88-key board.
 * White keys tile left-to-right; black keys straddle the seam between whites.
 */
export function layoutKeyboard(whiteW: number, blackW: number): KeyboardLayout {
  const keys: KeyGeom[] = [];
  const centers = new Map<number, number>();
  let whiteIndex = 0;

  for (let midi = FIRST_MIDI; midi <= LAST_MIDI; midi++) {
    if (isBlackKey(midi)) {
      const seam = whiteIndex * whiteW; // boundary before the upcoming white key
      const x = seam - blackW / 2;
      const cx = seam;
      keys.push({ midi, black: true, x, w: blackW, cx });
      centers.set(midi, cx);
    } else {
      const x = whiteIndex * whiteW;
      const cx = x + whiteW / 2;
      keys.push({ midi, black: false, x, w: whiteW, cx });
      centers.set(midi, cx);
      whiteIndex++;
    }
  }

  return {
    keys,
    width: WHITE_KEYS * whiteW,
    centerOf: (midi) => centers.get(midi) ?? 0,
  };
}
