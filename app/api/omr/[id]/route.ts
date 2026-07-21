import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Poll an async OMR job on the external Audiveris service. The heavy work runs
 * in the background there (see omr-service/server.mjs), so this stays a quick
 * request — no 300s function-limit risk. Returns { status, xml?, name?, bpm?, error? }.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const base = process.env.OMR_SERVICE_URL?.replace(/\/$/, "");
  if (!base) {
    return NextResponse.json(
      { status: "error", error: "OMR non configurato." },
      { status: 501 }
    );
  }

  let res: Response;
  try {
    res = await fetch(`${base}/omr/${encodeURIComponent(id)}`, {
      headers: { "x-omr-secret": process.env.OMR_SERVICE_SECRET ?? "" },
    });
  } catch {
    return NextResponse.json(
      { status: "error", error: "Il convertitore non risponde." },
      { status: 502 }
    );
  }

  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "content-type": "application/json" },
  });
}
