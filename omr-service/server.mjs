// Tasti OMR microservice: receives a PDF/image, runs Audiveris (PDF→MusicXML),
// reads the tempo from a vector PDF's text layer, returns { xml, name, bpm }.
// Designed for a Docker container (Render free tier). Protected by a shared secret.

import express from "express";
import multer from "multer";
import { spawn } from "node:child_process";
import { mkdtemp, writeFile, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { unzipSync, strFromU8 } from "fflate";

const SECRET = process.env.OMR_SERVICE_SECRET;
const CMD = process.env.AUDIVERIS_CMD || "audiveris";
const USE_XVFB = process.env.USE_XVFB === "1";
const PORT = process.env.PORT || 8080;
// Jobs run in the background (see below), decoupled from the HTTP request, so
// this is no longer bounded by the caller's 300s limit. Generous cap for slow
// free-tier CPU on heavy scores.
const OMR_TIMEOUT_MS = 15 * 60 * 1000;
const ALLOWED = /\.(pdf|png|jpe?g|tiff?|bmp)$/i;

const upload = multer({ limits: { fileSize: 20 * 1024 * 1024 } });
const app = express();

app.get("/", (_req, res) => res.json({ ok: true }));

// ── Async jobs ──────────────────────────────────────────────────────────
// Audiveris is slow; a synchronous request would hit the caller's 300s limit
// (Vercel). Instead POST /omr enqueues and returns a jobId immediately, the
// work runs in the background, and the client polls GET /omr/:id. In-memory
// store is fine: a lost job on restart just means the user re-uploads.
const jobs = new Map(); // id -> { status, result?, error?, ts }
let seq = 0;

function pruneJobs() {
  const cutoff = Date.now() - 20 * 60 * 1000;
  for (const [id, j] of jobs) if (j.ts < cutoff) jobs.delete(id);
}

app.post("/omr", upload.single("file"), (req, res) => {
  if (!SECRET || req.get("x-omr-secret") !== SECRET) {
    return res.status(401).json({ error: "unauthorized" });
  }
  if (!req.file) return res.status(400).json({ error: "Nessun file ricevuto." });
  const ext = (req.file.originalname.match(ALLOWED) || [])[1]?.toLowerCase();
  if (!ext) return res.status(400).json({ error: "Tipo non supportato." });

  pruneJobs();
  const id = `${Date.now().toString(36)}-${(seq++).toString(36)}`;
  jobs.set(id, { status: "pending", ts: Date.now() });
  res.status(202).json({ jobId: id });

  // Fire-and-forget: keep processing after the response is sent.
  runJob(id, req.file, ext);
});

app.get("/omr/:id", (req, res) => {
  if (!SECRET || req.get("x-omr-secret") !== SECRET) {
    return res.status(401).json({ error: "unauthorized" });
  }
  const j = jobs.get(req.params.id);
  if (!j) return res.status(404).json({ error: "Job non trovato (scaduto?)." });
  if (j.status === "done") return res.json({ status: "done", ...j.result });
  if (j.status === "error") return res.json({ status: "error", error: j.error });
  return res.json({ status: "pending" });
});

async function runJob(id, file, ext) {
  let work = null;
  try {
    work = await mkdtemp(join(tmpdir(), "omr-"));
    const outDir = join(work, "out");
    const input = join(work, `input.${ext}`);
    await writeFile(input, file.buffer);

    const bpm = ext === "pdf" ? await detectPdfTempo(file.buffer) : null;
    await runAudiveris(input, outDir);
    const xml = await readResult(outDir);

    jobs.set(id, {
      status: "done",
      ts: Date.now(),
      result: { xml, name: file.originalname.replace(/\.[^.]+$/, ""), bpm },
    });
  } catch (e) {
    jobs.set(id, { status: "error", ts: Date.now(), error: String(e?.message || e) });
  } finally {
    if (work) await rm(work, { recursive: true, force: true }).catch(() => {});
  }
}

function runAudiveris(input, outDir) {
  const args = ["-batch", "-export", "-output", outDir, input];
  const cmd = USE_XVFB ? "xvfb-run" : CMD;
  const cmdArgs = USE_XVFB ? ["-a", CMD, ...args] : args;
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, cmdArgs, { shell: false });
    let out = "";
    child.stderr.on("data", (d) => (out += d.toString()));
    child.stdout.on("data", (d) => (out += d.toString()));
    child.on("error", reject);
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("Audiveris timeout."));
    }, OMR_TIMEOUT_MS);
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(out.slice(-900) || `Audiveris exit ${code} (no output)`));
    });
  });
}

async function findFiles(dir, test) {
  const entries = await readdir(dir, { withFileTypes: true });
  const out = [];
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await findFiles(full, test)));
    else if (test(e.name)) out.push(full);
  }
  return out;
}

async function readResult(outDir) {
  const mxls = await findFiles(outDir, (n) => /\.mxl$/i.test(n));
  if (mxls.length) return mxlToXml(new Uint8Array(await readFile(mxls[0])));
  const xmls = await findFiles(outDir, (n) => /\.(musicxml|xml)$/i.test(n));
  if (!xmls.length) throw new Error("Audiveris non ha prodotto MusicXML.");
  return readFile(xmls[0], "utf8");
}

function mxlToXml(data) {
  const files = unzipSync(data);
  const container = files["META-INF/container.xml"];
  if (container) {
    const m = strFromU8(container).match(/full-path\s*=\s*"([^"]+)"/i);
    if (m && files[m[1]]) return strFromU8(files[m[1]]);
  }
  const entry = Object.keys(files).find(
    (n) => /\.(musicxml|xml)$/i.test(n) && !n.startsWith("META-INF/")
  );
  if (entry) return strFromU8(files[entry]);
  throw new Error("Archivio .mxl senza MusicXML.");
}

const TEMPO_RE = /=\s*(\d{2,3})\b/;
async function detectPdfTempo(data) {
  try {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const task = pdfjs.getDocument({ data: new Uint8Array(data), useSystemFonts: true });
    const doc = await task.promise;
    for (let p = 1; p <= Math.min(2, doc.numPages); p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      for (const item of content.items) {
        const s = item.str;
        if (s && s.includes("=")) {
          const m = s.match(TEMPO_RE);
          if (m) {
            const bpm = Number(m[1]);
            if (bpm >= 20 && bpm <= 400) {
              await task.destroy();
              return bpm;
            }
          }
        }
      }
    }
    await task.destroy();
  } catch {
    // raster PDF / no text layer → no tempo
  }
  return null;
}

app.listen(PORT, () => console.log(`OMR service on :${PORT}`));
