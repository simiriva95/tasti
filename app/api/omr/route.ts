import { NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 300; // OMR is slow (proxied, but keep headroom)

const ALLOWED = /\.(pdf|png|jpe?g|tiff?|bmp)$/i;
const MAX_BYTES = 15_000_000; // 15 MB upload cap

/**
 * Proxy a sheet (PDF/image) to the external Audiveris OMR microservice
 * (`OMR_SERVICE_URL`) and return its `{ xml, name, bpm }`. The app itself runs
 * no native binaries, so it deploys cleanly on Vercel.
 */
export async function POST(req: Request) {
  if (!rateLimit(`omr:${clientIp(req)}`, 8, 60_000)) {
    return NextResponse.json(
      { error: "Troppe richieste. Aspetta un minuto." },
      { status: 429 }
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Nessun file ricevuto." }, { status: 400 });
  }
  if (!ALLOWED.test(file.name)) {
    return NextResponse.json(
      { error: "Carica un PDF o un'immagine di spartito." },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File troppo grande." }, { status: 413 });
  }

  const base = process.env.OMR_SERVICE_URL?.replace(/\/$/, "");
  if (!base) {
    // Dev fallback: use a locally-installed Audiveris if available.
    if (process.env.AUDIVERIS_CMD) {
      try {
        const { runLocalOmr } = await import("@/lib/omrLocal");
        return NextResponse.json(await runLocalOmr(file));
      } catch (e) {
        return NextResponse.json(
          { error: e instanceof Error ? e.message : "Conversione fallita." },
          { status: 500 }
        );
      }
    }
    return NextResponse.json(
      {
        error:
          "La conversione degli spartiti non è disponibile al momento. Carica un file MIDI o MusicXML.",
      },
      { status: 501 }
    );
  }

  const out = new FormData();
  out.append("file", file, file.name);

  let res: Response;
  try {
    res = await fetch(`${base}/omr`, {
      method: "POST",
      headers: { "x-omr-secret": process.env.OMR_SERVICE_SECRET ?? "" },
      body: out,
    });
  } catch {
    return NextResponse.json(
      { error: "Il convertitore non risponde. Riprova tra poco." },
      { status: 502 }
    );
  }

  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "content-type": "application/json" },
  });
}
