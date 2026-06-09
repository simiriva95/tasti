"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  PlayIcon,
  PauseIcon,
  ArrowCounterClockwiseIcon,
} from "@phosphor-icons/react";
import PianoKeyboard from "@/components/PianoKeyboard";
import { layoutKeyboard, isBlackKey } from "@/lib/keyboard";
import {
  playMidis,
  ensureAudio,
  loadSchedule,
  disposeSchedule,
  getTransport,
  setInstrument,
  INSTRUMENTS,
  type InstrumentId,
} from "@/lib/audio";
import { chordContext } from "@/lib/chords";
import {
  noteRGBFrom,
  mixWhite,
  rgb,
  THEMES,
  DEFAULT_STOPS,
  gradientFromHue,
  themeCss,
  type RGB,
} from "@/lib/colors";
import type { ChordEvent, Song } from "@/lib/types";

const PX_PER_SEC = 150; // base pixels a note travels per (stage) second
const HIT_FROM_BOTTOM = 8; // hit line distance from canvas bottom
const MIN_BPM = 30;
const MAX_BPM = 260;
const SCROLLS = [1, 1.5, 2, 3]; // visual note stretch (does not touch tempo)
const MULTIPLIERS = [0.25, 0.5, 0.75, 1]; // playback speed presets

const baseLayout = layoutKeyboard(24, 14);

interface Props {
  song: Song;
  events: ChordEvent[];
}

export default function PianoStage({ song, events }: Props) {
  const notes = useMemo(
    () => [...song.notes].sort((a, b) => a.time - b.time),
    [song]
  );
  const eventTimes = useMemo(() => events.map((e) => e.time), [events]);

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const playingRef = useRef(false);
  const rafRef = useRef(0);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });
  const speedRef = useRef(1);
  const scrollRef = useRef(1);
  const paletteRef = useRef<RGB[]>(DEFAULT_STOPS);
  const scheduledSpeedRef = useRef<number | null>(null);

  // Impact effects (sparks + flash rings) at the hit line.
  const sparksRef = useRef<
    { x: number; y: number; vx: number; vy: number; life: number; max: number; color: RGB; size: number }[]
  >([]);
  const ringsRef = useRef<{ x: number; r: number; life: number; color: RGB }[]>([]);
  const hitIdxRef = useRef(0);
  const lastDrawTsRef = useRef(0);
  const tickRef = useRef<() => void>(() => {});
  const selectedRef = useRef<{ t0: number; t1: number; midis: Set<number> } | null>(
    null
  );
  const lastActiveKey = useRef("");

  const baseBpm = Math.round(song.bpm) || 120;
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [bpm, setBpm] = useState(baseBpm);
  const [scroll, setScroll] = useState(1);
  const [palette, setPalette] = useState<RGB[]>(DEFAULT_STOPS);
  const [hue, setHue] = useState(320);
  const [instrument, setInstrumentState] = useState<InstrumentId>(
    "acoustic_grand_piano"
  );
  const [activeMidis, setActiveMidis] = useState<number[]>([]);
  const [rootMidi, setRootMidi] = useState<number | undefined>(undefined);
  const [label, setLabel] = useState("");
  const [uiTime, setUiTime] = useState(0); // stage seconds, drives the slider

  const duration = song.durationSec;
  const stageDuration = duration / speed;

  const centerX = useCallback(
    (midi: number) =>
      (baseLayout.centerOf(midi) / baseLayout.width) * sizeRef.current.w,
    []
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const { w, h } = sizeRef.current;
    const sp = speedRef.current;
    const px = PX_PER_SEC * scrollRef.current; // visual stretch
    const T = getTransport().seconds; // stage seconds
    const realT = T * sp;
    const hitY = h - HIT_FROM_BOTTOM;

    ctx.clearRect(0, 0, w, h);

    // Faint octave guide lines at every C.
    ctx.strokeStyle = "rgba(170,150,255,0.07)";
    ctx.lineWidth = 1;
    for (const key of baseLayout.keys) {
      if (key.midi % 12 === 0 && !isBlackKey(key.midi)) {
        const x = centerX(key.midi);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
    }

    const sel = selectedRef.current;

    for (const n of notes) {
      const yLead = hitY - ((n.time - realT) / sp) * px;
      const barH = Math.max((n.duration / sp) * px, 6);
      const yTop = yLead - barH;
      if (yLead < 0 || yTop > h) continue;

      const black = isBlackKey(n.midi);
      const bw = ((black ? 0.6 : 0.82) * w) / 52;
      const x = centerX(n.midi) - bw / 2;
      const playing = n.time <= realT && realT <= n.time + n.duration;
      const isSel =
        sel !== null &&
        sel.midis.has(n.midi) &&
        n.time >= sel.t0 - 0.03 &&
        n.time <= sel.t1 + 0.03;

      const base = noteRGBFrom(paletteRef.current, n.midi);
      const top = mixWhite(base, 0.45);
      const grad = ctx.createLinearGradient(0, yTop, 0, yLead);
      grad.addColorStop(0, rgb(top));
      grad.addColorStop(1, rgb(base));

      // Notes glow as they cross the hit line (and the selected one too).
      if (playing || isSel) {
        ctx.shadowColor = rgb(mixWhite(base, 0.2), 0.9);
        ctx.shadowBlur = playing ? 26 : 14;
      } else {
        ctx.shadowBlur = 0;
      }

      ctx.fillStyle = playing ? rgb(mixWhite(base, 0.3)) : grad;
      roundRect(ctx, x, yTop, bw, barH, Math.min(6, bw / 2));
      ctx.fill();
      ctx.shadowBlur = 0;

      // Glossy top highlight.
      ctx.fillStyle = "rgba(255,255,255,0.22)";
      roundRect(ctx, x, yTop, bw, Math.min(barH * 0.4, 10), Math.min(6, bw / 2));
      ctx.fill();

      if (isSel) {
        ctx.strokeStyle = "rgba(255,255,255,0.9)";
        ctx.lineWidth = 2;
        roundRect(ctx, x, yTop, bw, barH, Math.min(6, bw / 2));
        ctx.stroke();
      }
    }

    // Glowing vaporwave hit line + soft bloom band above it.
    const bloom = ctx.createLinearGradient(0, hitY - 26, 0, hitY);
    bloom.addColorStop(0, "rgba(199,143,232,0)");
    bloom.addColorStop(1, "rgba(199,143,232,0.18)");
    ctx.fillStyle = bloom;
    ctx.fillRect(0, hitY - 26, w, 26);

    const line = ctx.createLinearGradient(0, 0, w, 0);
    line.addColorStop(0, "#ff8fd0");
    line.addColorStop(0.5, "#9b9bf0");
    line.addColorStop(1, "#8ef0dc");
    ctx.shadowColor = "rgba(180,150,255,0.9)";
    ctx.shadowBlur = 16;
    ctx.strokeStyle = line;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, hitY);
    ctx.lineTo(w, hitY);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // ----- Impact effects (sparks + flash rings) -----
    const now = performance.now();
    const dt = Math.min((now - (lastDrawTsRef.current || now)) / 1000, 0.05);
    lastDrawTsRef.current = now;

    ctx.globalCompositeOperation = "lighter";

    const rings = ringsRef.current;
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i];
      r.life -= dt;
      r.r += dt * 220;
      if (r.life <= 0) {
        rings.splice(i, 1);
        continue;
      }
      const a = r.life / 0.4;
      ctx.strokeStyle = rgb(mixWhite(r.color, 0.3), 0.5 * a);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(r.x, hitY, r.r, Math.PI, 2 * Math.PI);
      ctx.stroke();
    }

    const sparks = sparksRef.current;
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.life -= dt;
      if (s.life <= 0) {
        sparks.splice(i, 1);
        continue;
      }
      s.vy += dt * 90; // slight gravity
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      const a = s.life / s.max;
      ctx.fillStyle = rgb(s.color, 0.22 * a);
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size * 2.4, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillStyle = rgb(mixWhite(s.color, 0.6), 0.95 * a);
      ctx.beginPath();
      ctx.arc(s.x, s.y, Math.max(s.size * a, 0.6), 0, 2 * Math.PI);
      ctx.fill();
    }

    ctx.globalCompositeOperation = "source-over";
  }, [notes, centerX]);

  // Spawn a burst of sparks + a flash ring at a hit position.
  const spawnBurst = useCallback((x: number, color: RGB) => {
    const ringColor = color;
    ringsRef.current.push({ x, r: 2, life: 0.4, color: ringColor });
    const n = 9;
    for (let i = 0; i < n; i++) {
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * 1.9; // upward fan
      const sp = 60 + Math.random() * 130;
      sparksRef.current.push({
        x: x + (Math.random() - 0.5) * 6,
        y: sizeRef.current.h - HIT_FROM_BOTTOM,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        life: 0.45 + Math.random() * 0.4,
        max: 0.85,
        color,
        size: 1.4 + Math.random() * 2.2,
      });
    }
  }, []);

  // Point the impact spawner just past the current time (so seeking/playing
  // from a position doesn't burst every past note at once).
  const resetHitIdx = useCallback(
    (realT: number) => {
      let lo = 0,
        hi = notes.length;
      while (lo < hi) {
        const m = (lo + hi) >> 1;
        if (notes[m].time <= realT) lo = m + 1;
        else hi = m;
      }
      hitIdxRef.current = lo;
      sparksRef.current = [];
      ringsRef.current = [];
    },
    [notes]
  );

  const soundingNow = useCallback(
    (realT: number) => {
      const out: number[] = [];
      for (const n of notes) {
        if (n.time > realT) break;
        if (realT < n.time + n.duration) out.push(n.midi);
      }
      return out.sort((a, b) => a - b);
    },
    [notes]
  );

  const nearestEventLabel = useCallback(
    (realT: number) => {
      if (eventTimes.length === 0) return "";
      let lo = 0,
        hi = eventTimes.length - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (eventTimes[mid] < realT) lo = mid + 1;
        else hi = mid;
      }
      if (lo > 0 && Math.abs(eventTimes[lo - 1] - realT) <= Math.abs(eventTimes[lo] - realT))
        lo -= 1;
      return events[lo]?.label ?? "";
    },
    [eventTimes, events]
  );

  const syncKeyboard = useCallback(
    (realT: number) => {
      const ms = soundingNow(realT);
      const key = ms.join(",");
      if (key !== lastActiveKey.current) {
        lastActiveKey.current = key;
        setActiveMidis(ms);
        setRootMidi(ms[0]);
      }
      setLabel(nearestEventLabel(realT));
    },
    [soundingNow, nearestEventLabel]
  );

  const pause = useCallback(() => {
    playingRef.current = false;
    cancelAnimationFrame(rafRef.current);
    getTransport().pause();
    setIsPlaying(false);
  }, []);

  const tick = useCallback(() => {
    if (!playingRef.current) return;
    const T = getTransport().seconds;
    const realT = T * speedRef.current;

    // Fire an impact burst for every note that just reached the hit line.
    while (
      hitIdxRef.current < notes.length &&
      notes[hitIdxRef.current].time <= realT
    ) {
      const nn = notes[hitIdxRef.current];
      spawnBurst(centerX(nn.midi), noteRGBFrom(paletteRef.current, nn.midi));
      hitIdxRef.current++;
    }

    if (T >= stageDuration) {
      pause();
      return;
    }
    draw();
    syncKeyboard(realT);
    setUiTime(T);
    rafRef.current = requestAnimationFrame(() => tickRef.current());
  }, [stageDuration, draw, syncKeyboard, pause, notes, spawnBurst, centerX]);

  useEffect(() => {
    tickRef.current = tick;
  }, [tick]);

  const ensureSchedule = useCallback(async () => {
    if (scheduledSpeedRef.current === speedRef.current) return;
    const tr = getTransport();
    const keep = tr.seconds;
    await loadSchedule(notes, speedRef.current); // resets transport to 0
    scheduledSpeedRef.current = speedRef.current;
    tr.seconds = keep;
  }, [notes]);

  const play = useCallback(async () => {
    if (playingRef.current) return;
    await ensureAudio();
    if (getTransport().seconds >= stageDuration) getTransport().seconds = 0;
    await ensureSchedule();
    selectedRef.current = null;
    resetHitIdx(getTransport().seconds * speedRef.current);
    playingRef.current = true;
    setIsPlaying(true);
    getTransport().start();
    rafRef.current = requestAnimationFrame(tick);
  }, [stageDuration, ensureSchedule, tick, resetHitIdx]);

  const restart = useCallback(() => {
    pause();
    getTransport().stop();
    getTransport().seconds = 0;
    resetHitIdx(0);
    selectedRef.current = null;
    lastActiveKey.current = "";
    setActiveMidis([]);
    setRootMidi(undefined);
    setLabel("");
    setUiTime(0);
    draw();
  }, [pause, draw, resetHitIdx]);

  const seek = useCallback(
    (stageT: number) => {
      getTransport().seconds = stageT;
      setUiTime(stageT);
      resetHitIdx(stageT * speedRef.current);
      draw();
      syncKeyboard(stageT * speedRef.current);
    },
    [draw, syncKeyboard, resetHitIdx]
  );

  const changeSpeed = useCallback(
    (v: number) => {
      const tr = getTransport();
      const realT = tr.seconds * speedRef.current;
      const wasPlaying = playingRef.current;
      pause();
      speedRef.current = v;
      setSpeed(v);
      scheduledSpeedRef.current = null; // force reschedule at new speed
      const newStage = realT / v;
      tr.seconds = newStage;
      setUiTime(newStage);
      draw();
      if (wasPlaying) play();
    },
    [pause, draw, play]
  );

  // Set the target tempo (the sheet often has none, or OMR misses it).
  const changeBpm = useCallback(
    (next: number) => {
      const clamped = Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(next)));
      setBpm(clamped);
      changeSpeed(clamped / baseBpm); // speed = target / nominal tempo
    },
    [changeSpeed, baseBpm]
  );

  // Visual-only note stretch (rhythm-game scroll speed); tempo/audio untouched.
  const changeScroll = useCallback(
    (v: number) => {
      scrollRef.current = v;
      setScroll(v);
      draw();
    },
    [draw]
  );

  const changeInstrument = useCallback((id: InstrumentId) => {
    setInstrumentState(id);
    setInstrument(id).catch(() => {});
  }, []);

  const changePalette = useCallback(
    (stops: RGB[]) => {
      paletteRef.current = stops;
      setPalette(stops);
      draw();
    },
    [draw]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const py = e.clientY - rect.top;
      const hitY = sizeRef.current.h - HIT_FROM_BOTTOM;
      const sp = speedRef.current;
      const px = PX_PER_SEC * scrollRef.current;
      const realClicked = getTransport().seconds * sp + ((hitY - py) / px) * sp;
      if (realClicked < 0) return;

      const ctx = chordContext(notes, events, realClicked, 60 / (song.bpm || 120));
      if (ctx.midis.length === 0) return;

      pause();
      selectedRef.current = { t0: ctx.t0, t1: ctx.t1, midis: new Set(ctx.midis) };
      getTransport().seconds = realClicked / sp; // snap to hit line
      lastActiveKey.current = "manual";
      setActiveMidis(ctx.midis);
      setRootMidi(ctx.midis[0]);
      setLabel(ctx.label);
      setUiTime(realClicked / sp);
      draw();
      playMidis(ctx.midis, 1.4).catch(() => {});
    },
    [notes, events, song.bpm, pause, draw]
  );

  // Size canvas to container.
  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      sizeRef.current = { w, h, dpr };
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const c = canvas.getContext("2d");
      if (c) c.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [draw]);

  // Cleanup transport/schedule on unmount or song change.
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      disposeSchedule();
      scheduledSpeedRef.current = null;
    };
  }, [song]);

  // Spacebar toggles play/pause.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        if (playingRef.current) pause();
        else play();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [play, pause]);

  const fmt = (s: number) => {
    const v = Math.max(0, s);
    return `${Math.floor(v / 60)}:${Math.floor(v % 60)
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Row 1: playback */}
      <div className="flex shrink-0 items-center gap-3 border-b border-zinc-200 bg-white px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-900">
        <button
          onClick={isPlaying ? pause : play}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white transition active:scale-95 hover:bg-emerald-600"
          aria-label={isPlaying ? "Pausa" : "Play"}
        >
          {isPlaying ? (
            <PauseIcon size={20} weight="fill" />
          ) : (
            <PlayIcon size={20} weight="fill" />
          )}
        </button>
        <button
          onClick={restart}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-300 text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          aria-label="Ricomincia"
        >
          <ArrowCounterClockwiseIcon size={16} weight="bold" />
        </button>

        <span className="w-12 text-right font-mono text-xs text-zinc-500">
          {fmt(uiTime)}
        </span>
        <input
          type="range"
          min={0}
          max={stageDuration}
          step={0.01}
          value={Math.min(Math.max(uiTime, 0), stageDuration)}
          onChange={(e) => seek(Number(e.target.value))}
          className="h-1.5 flex-1 cursor-pointer accent-emerald-500"
          aria-label="Posizione"
        />
        <span className="w-12 font-mono text-xs text-zinc-500">
          {fmt(stageDuration)}
        </span>

        <span className="ml-1 min-w-24 text-right text-lg font-semibold tracking-tight">
          {label || "—"}
        </span>
      </div>

      {/* Row 2: settings */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-5 gap-y-2 border-b border-zinc-200 bg-zinc-50 px-4 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-950/40">
        {/* Instrument */}
        <Group label="Suono">
          {(Object.keys(INSTRUMENTS) as InstrumentId[]).map((id) => (
            <Seg
              key={id}
              active={instrument === id}
              onClick={() => changeInstrument(id)}
            >
              {INSTRUMENTS[id]}
            </Seg>
          ))}
        </Group>

        {/* Tempo: presets + BPM stepper */}
        <Group label="Velocità">
          {MULTIPLIERS.map((m) => (
            <Seg
              key={m}
              active={bpm === Math.round(baseBpm * m)}
              onClick={() => changeBpm(Math.round(baseBpm * m))}
            >
              {m}×
            </Seg>
          ))}
          <span className="mx-1 h-4 w-px bg-zinc-300 dark:bg-zinc-700" />
          <button
            onClick={() => changeBpm(bpm - 4)}
            className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-600 transition hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-700"
            aria-label="Rallenta"
          >
            −
          </button>
          <input
            type="number"
            min={MIN_BPM}
            max={MAX_BPM}
            value={bpm}
            onChange={(e) => changeBpm(Number(e.target.value))}
            className="w-9 bg-transparent text-center font-mono text-sm font-semibold outline-none"
            aria-label="BPM"
          />
          <span className="text-[10px] text-zinc-500">BPM</span>
          <button
            onClick={() => changeBpm(bpm + 4)}
            className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-600 transition hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-700"
            aria-label="Accelera"
          >
            +
          </button>
        </Group>

        {/* Scroll speed (visual stretch only) */}
        <Group label="Note">
          {SCROLLS.map((s) => (
            <Seg key={s} active={scroll === s} onClick={() => changeScroll(s)}>
              {s}×
            </Seg>
          ))}
        </Group>

        {/* Colour palette */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
            Colore
          </span>
          <div className="flex items-center gap-1.5">
            {THEMES.map((t) => {
              const on = palette === t.stops;
              return (
                <button
                  key={t.id}
                  onClick={() => changePalette(t.stops)}
                  title={t.name}
                  className={`h-6 w-6 rounded-full ring-offset-1 transition ${
                    on
                      ? "ring-2 ring-emerald-400 ring-offset-zinc-900"
                      : "ring-1 ring-white/20 hover:ring-white/50"
                  }`}
                  style={{ backgroundImage: themeCss(t.stops) }}
                />
              );
            })}
            <input
              type="range"
              min={0}
              max={360}
              value={hue}
              onChange={(e) => {
                const h = Number(e.target.value);
                setHue(h);
                changePalette(gradientFromHue(h));
              }}
              title="Tonalità personalizzata"
              aria-label="Tonalità"
              className="h-2 w-28 cursor-pointer appearance-none rounded-full"
              style={{
                background:
                  "linear-gradient(90deg, hsl(0 70% 65%), hsl(60 70% 65%), hsl(120 70% 65%), hsl(180 70% 65%), hsl(240 70% 65%), hsl(300 70% 65%), hsl(360 70% 65%))",
              }}
            />
          </div>
        </div>
      </div>

      <div
        ref={wrapRef}
        className="relative min-h-0 flex-1"
        style={{
          background:
            "radial-gradient(130% 70% at 50% 100%, rgba(150,90,200,0.30), transparent 60%), linear-gradient(180deg, #1a1030 0%, #0c0718 100%)",
        }}
      >
        <canvas
          ref={canvasRef}
          onClick={handleClick}
          className="block cursor-pointer"
        />
      </div>

      <div
        className="shrink-0 shadow-[0_-12px_32px_rgba(120,80,180,0.25)]"
        style={{
          background: "linear-gradient(180deg, #14091f 0%, #1d1130 100%)",
          padding: "0",
        }}
      >
        <PianoKeyboard
          activeMidis={activeMidis}
          rootMidi={rootMidi}
          palette={palette}
          onKeyClick={(midi) => playMidis([midi]).catch(() => {})}
        />
      </div>
    </div>
  );
}

function Group({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
        {label}
      </span>
      <div className="flex items-center gap-0.5 rounded-lg bg-zinc-100 p-0.5 dark:bg-zinc-800">
        {children}
      </div>
    </div>
  );
}

function Seg({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-2 py-1 text-xs font-medium transition ${
        active
          ? "bg-emerald-500 text-white"
          : "text-zinc-600 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-700"
      }`}
    >
      {children}
    </button>
  );
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}
