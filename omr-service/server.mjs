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
const OMR_TIMEOUT_MS = 4 * 60 * 1000;
const ALLOWED = /\.(pdf|png|jpe?g|tiff?|bmp)$/i;

const upload = multer({ limits: { fileSize: 20 * 1024 * 1024 } });
const app = express();

app.get("/", (_req, res) => res.json({ ok: true }));

app.post("/omr", upload.single("file"), async (req, res) => {
  if (!SECRET || req.get("x-omr-secret") !== SECRET) {
    return res.status(401).json({ error: "unauthorized" });
  }
  if (!req.file) return res.status(400).json({ error: "Nessun file ricevuto." });
  const ext = (req.file.originalname.match(ALLOWED) || [])[1]?.toLowerCase();
  if (!ext) return res.status(400).json({ error: "Tipo non supportato." });

  let work = null;
  try {
    work = await mkdtemp(join(tmpdir(), "omr-"));
    const outDir = join(work, "out");
    const input = join(work, `input.${ext}`);
    await writeFile(input, req.file.buffer);

    const bpm = ext === "pdf" ? await detectPdfTempo(req.file.buffer) : null;
    await runAudiveris(input, outDir);
    const xml = await readResult(outDir);

    res.json({
      xml,
      name: req.file.originalname.replace(/\.[^.]+$/, ""),
      bpm,
    });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  } finally {
    if (work) await rm(work, { recursive: true, force: true }).catch(() => {});
  }
});

function runAudiveris(input, outDir) {
  const args = ["-batch", "-export", "-output", outDir, input];
  const cmd = USE_XVFB ? "xvfb-run" : CMD;
  const cmdArgs = USE_XVFB ? ["-a", CMD, ...args] : args;
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, cmdArgs, { shell: false });
    let stderr = "";
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("error", reject);
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("Audiveris timeout."));
    }, OMR_TIMEOUT_MS);
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(stderr.slice(-600) || `Audiveris exit ${code}`));
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
