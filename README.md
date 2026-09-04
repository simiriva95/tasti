<h1 align="center">Tasti</h1>
<p align="center"><em>Drop in a MIDI file, a MusicXML score or a PDF and see exactly which piano keys to press — no music theory required.</em></p>

<p align="center">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16.2-000000?logo=nextdotjs&logoColor=white">
  <img alt="React" src="https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=black">
  <img alt="Postgres" src="https://img.shields.io/badge/Postgres-Drizzle_ORM-4169E1?logo=postgresql&logoColor=white">
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-4.x-06B6D4?logo=tailwindcss&logoColor=white">
  <img alt="Docker" src="https://img.shields.io/badge/OMR_service-Docker-2496ED?logo=docker&logoColor=white">
</p>

<!-- SCREENSHOT: hero shot — the piano stage with falling notes above the 88-key keyboard, a chord lit up, 1280px wide -->

Beginners can read a chord symbol and still not know which keys it maps to, or on which octave. Tasti removes that step: it parses the music you already have — a MIDI export, a MusicXML score, or a scanned or photographed PDF — and renders it as a piano roll that falls onto a real 88-key keyboard, lighting the exact keys and naming the chord. Sheet music that only exists as a PDF or a phone photo goes through an **Audiveris** optical music recognition service running as a separate container, so the Next.js app itself never shells out to a native binary and stays deployable on serverless.

## Features

- **One model, three inputs** — MIDI, MusicXML (`.musicxml`, `.xml`, `.mxl`) and OMR output all parse into the same `Song` shape, so the UI never knows which format was uploaded.
- **Falling-notes stage** — a canvas piano roll whose columns are geometrically aligned with the keyboard below, sharing a single layout module so bars land on their own keys.
- **Chord naming** — onsets within 60 ms are grouped, forward harmony is gathered over a beat, and `@tonaljs/tonal` turns the pitch set into a readable label ("C major") instead of a terse symbol.
- **Click to hear** — clicking a chord in the roll or a single key plays it through sampled soundfonts (piano, guitar, strings) via `smplr` on a Tone.js audio context.
- **Practice controls** — tempo presets and a BPM stepper, an independent scroll-speed stretch, and swappable pitch-to-colour palettes including a custom hue slider.
- **PDF and photo scores** — sheets are converted to MusicXML by Audiveris; photos get a client-side grayscale + contrast-stretch pass first, and multi-page batches are stitched onto one timeline.
- **Tempo from the PDF** — for vector PDFs the service scans the text layer of the first pages for a `= 120` style marking and returns the BPM.
- **Personal library** — GitHub sign-in (Auth.js v5, database sessions) with per-user saved songs; every library route is owner-scoped in the query itself.
- **Hardened by default** — a full Content-Security-Policy plus HSTS/nosniff/frame-deny headers, Zod-validated request bodies, upload size caps, and an in-memory rate limit on the public OMR proxy.

<!-- SCREENSHOT: the tempo / sound / colour control bar with a chord label visible -->

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16.2 (App Router, React 19.2, TypeScript 5) |
| Styling | Tailwind CSS 4, Bodoni Moda + Hanken Grotesk via `next/font` |
| Auth | Auth.js / NextAuth v5 beta, GitHub provider, Drizzle adapter, database sessions |
| Database | Postgres (Neon serverless driver) + Drizzle ORM 0.45 / drizzle-kit |
| Music parsing | `@tonejs/midi`, a hand-written MusicXML DOM parser, `fflate` for `.mxl` |
| Music theory | `@tonaljs/tonal` |
| Audio | `tone` + `smplr` (MusyngKite soundfonts) |
| Validation | `zod` 4 |
| OMR service | Node 22 + Express 4 + multer, Audiveris 5.10.2 in Docker (Ubuntu 24.04), `pdfjs-dist` for tempo text |

## Getting started

### Prerequisites

- Node.js 22 (`drizzle.config.ts` calls `process.loadEnvFile`, which needs Node 21+)
- A Postgres database — the app uses the Neon serverless driver
- A GitHub OAuth app, for sign-in and the saved library
- Optional, only for PDF/image scores: Docker, or a local Audiveris install

### Run the app

```bash
npm install
cp .env.example .env.local   # fill in the values, see Configuration
npm run db:push              # create the Auth.js tables + `song`
npm run dev
```

Open http://localhost:3000 and drop a `.mid`, `.midi`, `.musicxml`, `.xml` or `.mxl` file — ready-made samples live in `public/samples/`. Sign-in and the library need `AUTH_SECRET`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET` and `DATABASE_URL`; viewing and playing a file works without them.

Other scripts: `npm run build`, `npm run start`, `npm run lint`, `npm run db:generate`.

### Run the OMR service (only for PDF / image scores)

The service is a self-contained folder with its own `package.json` and Dockerfile. The image downloads and extracts the official Audiveris `.deb`, which bundles its own JRE — no separate Java install.

```bash
cd omr-service
docker build -t tasti-omr .
docker run -p 8080:8080 -e OMR_SERVICE_SECRET=<same-secret-as-the-app> tasti-omr
```

Then set `OMR_SERVICE_URL=http://localhost:8080` and the matching `OMR_SERVICE_SECRET` in `.env.local` and restart `npm run dev`.

Without Docker you can run `npm install && npm start` inside `omr-service` with Audiveris installed and `AUDIVERIS_CMD` pointing at its launcher. As a third option, setting only `AUDIVERIS_CMD` on the Next.js side makes `/api/omr` fall back to a local, synchronous Audiveris run (`lib/omrLocal.ts`). With neither configured, `/api/omr` answers `501` and MIDI/MusicXML keep working.

Quick check against a running service:

```bash
curl -F file=@score.pdf -H "x-omr-secret: <secret>" http://localhost:8080/omr
```

Deployment notes for Vercel + Neon + Render are in [DEPLOY.md](DEPLOY.md).

## Configuration

Copy `.env.example` to `.env.local`.

**Next.js app**

| Variable | Required | What it does |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | recommended | Public base URL used for canonical links, sitemap and OG metadata; falls back to `http://localhost:3000` |
| `AUTH_SECRET` | for auth | Auth.js session secret (`openssl rand -base64 32`) |
| `AUTH_GITHUB_ID` | for auth | GitHub OAuth app client id |
| `AUTH_GITHUB_SECRET` | for auth | GitHub OAuth app client secret |
| `DATABASE_URL` | for auth/library | Postgres connection string; also read by drizzle-kit |
| `OMR_SERVICE_URL` | for PDF/images | Base URL of the OMR service; when unset the app tries the local fallback, then returns `501` |
| `OMR_SERVICE_SECRET` | with `OMR_SERVICE_URL` | Shared secret sent as the `x-omr-secret` header; must match the service |
| `AUDIVERIS_CMD` | dev fallback only | Path to a locally installed Audiveris launcher, enabling in-process OMR when `OMR_SERVICE_URL` is absent |

**OMR service**

| Variable | Required | What it does |
|---|---|---|
| `OMR_SERVICE_SECRET` | yes | Rejects every request whose `x-omr-secret` header does not match — and all requests if unset |
| `AUDIVERIS_CMD` | yes | Audiveris launcher path; set to `/opt/audiveris/bin/Audiveris` in the Dockerfile |
| `USE_XVFB` | in Docker | `1` wraps Audiveris in `xvfb-run` for headless hosts; set in the Dockerfile |
| `PORT` | no | Listen port, default `8080` |

## How it works

Two deployables, one shared secret.

```
browser ──upload──> Next.js /api/omr ──x-omr-secret──> omr-service (Docker)
   │  poll /api/omr/:id ──────────────────────────────>  GET /omr/:id
   │
   └── MusicXML ──> parse ──> Song ──> chord detection ──> roll + keyboard + audio
```

- **Next.js app** (Vercel-friendly): parses MIDI/MusicXML entirely in the browser and runs no native binaries. `/api/omr` is a thin authenticated proxy that adds a rate limit, an extension allowlist and a 15 MB cap before forwarding the upload.
- **OMR service** (Express in Docker): Audiveris can take minutes, which would blow past a serverless function limit, so `POST /omr` enqueues a job, replies `202 { jobId }` immediately, and does the work in the background; the client polls `GET /omr/:id` through the app until it reports `done`. Jobs live in an in-memory map pruned after 20 minutes — losing one on restart just means re-uploading.
- **Result handling**: Audiveris writes `.mxl`, which the service unzips (reading `META-INF/container.xml`) and returns as raw MusicXML plus a name and an optional BPM read from the PDF text layer.
- **Convergence**: `lib/loadSong.ts` routes every input to a parser, and all of them emit the same `Song` (`notes[]` of MIDI number, onset, duration, track). Everything downstream — chord grouping, the canvas roll, key highlighting, audio, MIDI export for the library — works on that one structure.

OMR is automatic but imperfect: dense scores are worth correcting in an editor such as MuseScore before exporting the final MusicXML.

## Project structure

```
app/            App Router: landing, /app tool, /login, /library, SEO routes
  api/          auth, library CRUD, OMR proxy + job polling
components/     FileDrop, PianoStage (canvas roll), PianoKeyboard, clients
lib/            parsers (midi, musicxml, mxl), chords, audio, keyboard geometry,
                colors, rate limit, local OMR fallback, db (Drizzle schema)
omr-service/    standalone Express + Audiveris service (Dockerfile, server.mjs)
public/samples/ sample MIDI / MusicXML / score image + generator scripts
```

## License

No LICENSE file is present in this repository, so no license is declared yet.
