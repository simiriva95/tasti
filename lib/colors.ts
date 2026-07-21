// Note palette. The colour of a note (and of its key) is interpolated across a
// set of stops by pitch. The palette is swappable from the UI (presets or a
// custom colour), shared by the falling-notes canvas and the keyboard.

export type RGB = [number, number, number];

export interface Theme {
  id: string;
  name: string;
  stops: RGB[];
}

export const THEMES: Theme[] = [
  {
    id: "concerto",
    name: "Concerto",
    // Warm brass ramp, deep bronze (low notes) → pale gold (high notes).
    stops: [
      [150, 92, 40],
      [193, 129, 58],
      [209, 163, 90],
      [230, 197, 140],
      [242, 225, 190],
    ],
  },
  {
    id: "vaporwave",
    name: "Vaporwave",
    stops: [
      [255, 143, 208],
      [199, 143, 232],
      [155, 155, 240],
      [143, 200, 255],
      [142, 240, 220],
    ],
  },
  {
    id: "synthwave",
    name: "Synthwave",
    stops: [
      [255, 94, 148],
      [255, 128, 181],
      [179, 107, 255],
      [120, 115, 245],
      [88, 200, 255],
    ],
  },
  {
    id: "sunset",
    name: "Tramonto",
    stops: [
      [255, 196, 120],
      [255, 140, 120],
      [233, 109, 168],
      [168, 94, 200],
      [120, 96, 210],
    ],
  },
  {
    id: "aqua",
    name: "Acqua",
    stops: [
      [120, 255, 214],
      [110, 230, 235],
      [120, 200, 255],
      [150, 170, 255],
      [190, 160, 255],
    ],
  },
  {
    id: "inferno",
    name: "Fiamma",
    stops: [
      [255, 221, 120],
      [255, 170, 80],
      [255, 110, 80],
      [235, 70, 110],
      [180, 50, 150],
    ],
  },
];

export const DEFAULT_STOPS = THEMES[0].stops; // Concerto

const FIRST = 21; // A0
const LAST = 108; // C8

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

/** Interpolate a colour for a MIDI note across evenly-spaced palette stops. */
export function noteRGBFrom(stops: RGB[], midi: number): RGB {
  const t = clamp01((midi - FIRST) / (LAST - FIRST));
  const n = stops.length - 1;
  const seg = clamp01(t) * n;
  const i = Math.min(n - 1, Math.floor(seg));
  const f = seg - i;
  const a = stops[i];
  const b = stops[i + 1];
  return [
    Math.round(a[0] + (b[0] - a[0]) * f),
    Math.round(a[1] + (b[1] - a[1]) * f),
    Math.round(a[2] + (b[2] - a[2]) * f),
  ];
}

export function mixWhite([r, g, b]: RGB, amt: number): RGB {
  return [
    Math.round(r + (255 - r) * amt),
    Math.round(g + (255 - g) * amt),
    Math.round(b + (255 - b) * amt),
  ];
}

export const rgb = ([r, g, b]: RGB, a = 1) =>
  a >= 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${a})`;

function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "");
  const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [
    parseInt(v.slice(0, 2), 16),
    parseInt(v.slice(2, 4), 16),
    parseInt(v.slice(4, 6), 16),
  ];
}

function rgbToHsl([r, g, b]: RGB): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): RGB {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0,
    g = 0,
    b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

/** Build a pleasant pastel gradient sweeping hues around a base hue (0-360). */
export function gradientFromHue(h: number): RGB[] {
  const S = 0.68;
  const L = 0.72;
  return [-70, -35, 0, 35, 70].map((d) => hslToRgb(h + d, S, L));
}

/** Same, from a hex colour. */
export function gradientFromHex(hex: string): RGB[] {
  return gradientFromHue(rgbToHsl(hexToRgb(hex))[0]);
}

/** CSS linear-gradient string for a palette (for swatches/previews). */
export const themeCss = (stops: RGB[]) =>
  `linear-gradient(90deg, ${stops.map((s) => rgb(s)).join(", ")})`;
