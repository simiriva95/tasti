"use client";

import { useMemo } from "react";
import { layoutKeyboard } from "@/lib/keyboard";
import { noteRGBFrom, mixWhite, rgb, DEFAULT_STOPS, type RGB } from "@/lib/colors";

const WHITE_W = 24;
const WHITE_H = 150;
const BLACK_W = 14;
const BLACK_H = 96;
const FELT_H = 6;

interface Props {
  activeMidis: number[];
  rootMidi?: number;
  palette?: RGB[];
  onKeyClick?: (midi: number) => void;
}

export default function PianoKeyboard({
  activeMidis,
  rootMidi,
  palette = DEFAULT_STOPS,
  onKeyClick,
}: Props) {
  const layout = useMemo(() => layoutKeyboard(WHITE_W, BLACK_W), []);
  const active = useMemo(() => new Set(activeMidis), [activeMidis]);

  const whites = layout.keys.filter((k) => !k.black);
  const blacks = layout.keys.filter((k) => k.black);
  const totalH = WHITE_H + FELT_H;

  const activeFill = (midi: number) => {
    const base = noteRGBFrom(palette, midi);
    return rgb(midi === rootMidi ? mixWhite(base, 0.25) : base);
  };

  return (
    <svg
      viewBox={`0 0 ${layout.width} ${totalH}`}
      className="block w-full select-none"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Tastiera del pianoforte"
    >
      <defs>
        <linearGradient id="whiteKey" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.82" stopColor="#f1f1f7" />
          <stop offset="1" stopColor="#dcdce6" />
        </linearGradient>
        <linearGradient id="blackKey" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a3a4a" />
          <stop offset="0.12" stopColor="#23232f" />
          <stop offset="1" stopColor="#0c0c14" />
        </linearGradient>
        <linearGradient id="felt" x1="0" y1="0" x2="1" y2="0">
          {palette.map((s, i) => (
            <stop
              key={i}
              offset={i / (palette.length - 1)}
              stopColor={rgb(s)}
            />
          ))}
        </linearGradient>
        <filter id="kglow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* White keys */}
      {whites.map((k) => {
        const on = active.has(k.midi);
        return (
          <rect
            key={k.midi}
            x={k.x + 0.5}
            y={FELT_H}
            width={WHITE_W - 1}
            height={WHITE_H}
            rx={3}
            fill={on ? activeFill(k.midi) : "url(#whiteKey)"}
            stroke="rgba(140,140,170,0.45)"
            strokeWidth={0.75}
            filter={on ? "url(#kglow)" : undefined}
            onClick={onKeyClick ? () => onKeyClick(k.midi) : undefined}
            style={{ cursor: onKeyClick ? "pointer" : "default" }}
          />
        );
      })}

      {/* Black keys */}
      {blacks.map((k) => {
        const on = active.has(k.midi);
        return (
          <rect
            key={k.midi}
            x={k.x}
            y={FELT_H}
            width={BLACK_W}
            height={BLACK_H}
            rx={2.5}
            fill={on ? activeFill(k.midi) : "url(#blackKey)"}
            stroke={on ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.5)"}
            strokeWidth={0.75}
            filter={on ? "url(#kglow)" : undefined}
            onClick={onKeyClick ? () => onKeyClick(k.midi) : undefined}
            style={{ cursor: onKeyClick ? "pointer" : "default" }}
          />
        );
      })}

      {/* Felt strip across the top */}
      <rect x={0} y={0} width={layout.width} height={FELT_H} fill="url(#felt)" />
      <rect
        x={0}
        y={FELT_H}
        width={layout.width}
        height={1.2}
        fill="rgba(0,0,0,0.35)"
      />
    </svg>
  );
}
