// Dev-only local OMR: spawn a locally-installed Audiveris (AUDIVERIS_CMD) to
// convert a sheet to MusicXML. Imported dynamically by the OMR route ONLY when
// no OMR_SERVICE_URL is configured, so production (Vercel, proxy mode) never
// pulls child_process into the bundle. Tempo detection is skipped locally
// (the cloud OMR service handles it); bpm defaults on the client.

import { spawn } from "node:child_process";
import { mkdtemp, writeFile, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mxlToXml } from "./mxl";

const OMR_TIMEOUT_MS = 4 * 60 * 1000;

async function findFiles(
  dir: string,
  test: (n: string) => boolean
): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const out: string[] = [];
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await findFiles(full, test)));
    else if (test(e.name)) out.push(full);
  }
  return out;
}

const TEMPO_RE = /=\s*(\d{2,3})\b/;

/** Read a tempo mark (e.g. "♩ = 57") from a vector PDF's text layer. */
async function detectPdfTempo(data: Uint8Array): Promise<number | null> {
  try {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const task = pdfjs.getDocument({ data, useSystemFonts: true });
    const doc = await task.promise;
    for (let p = 1; p <= Math.min(2, doc.numPages); p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      for (const item of content.items) {
        const s = (item as { str?: string }).str;
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
    // raster PDF / no text layer
  }
  return null;
}

export async function runLocalOmr(
  file: File
): Promise<{ xml: string; name: string; bpm: number | null }> {
  const ext = file.name.match(/\.(pdf|png|jpe?g|tiff?|bmp)$/i)?.[1]?.toLowerCase();
  if (!ext) throw new Error("Tipo non supportato.");

  const cmd = process.env.AUDIVERIS_CMD!;
  const work = await mkdtemp(join(tmpdir(), "omr-local-"));
  const outDir = join(work, "out");
  const input = join(work, `input.${ext}`);

  try {
    await writeFile(input, Buffer.from(await file.arrayBuffer()));

    await new Promise<void>((resolve, reject) => {
      const child = spawn(cmd, ["-batch", "-export", "-output", outDir, input], {
        shell: true,
      });
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

    const mxls = await findFiles(outDir, (n) => /\.mxl$/i.test(n));
    let xml: string;
    if (mxls.length) xml = mxlToXml(new Uint8Array(await readFile(mxls[0])));
    else {
      const xmls = await findFiles(outDir, (n) => /\.(musicxml|xml)$/i.test(n));
      if (!xmls.length) throw new Error("Audiveris non ha prodotto MusicXML.");
      xml = await readFile(xmls[0], "utf8");
    }

    const bpm =
      ext === "pdf"
        ? await detectPdfTempo(new Uint8Array(await file.arrayBuffer()))
        : null;

    return { xml, name: file.name.replace(/\.[^.]+$/, ""), bpm };
  } finally {
    await rm(work, { recursive: true, force: true }).catch(() => {});
  }
}
