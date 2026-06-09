import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { songs } from "@/lib/db/schema";

export const runtime = "nodejs";

const MAX_BYTES = 1_000_000; // 1 MB per song

const SaveSchema = z.object({
  name: z.string().trim().min(1).max(200),
  format: z.enum(["midi", "musicxml"]),
  dataB64: z.string().min(1).max(2_000_000),
  bpm: z.number().int().positive().max(400).nullable().optional(),
  durationSec: z.number().nonnegative().nullable().optional(),
});

/** List the signed-in user's saved songs (metadata only). */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  }
  const rows = await db
    .select({
      id: songs.id,
      name: songs.name,
      format: songs.format,
      bpm: songs.bpm,
      durationSec: songs.durationSec,
      sizeBytes: songs.sizeBytes,
      createdAt: songs.createdAt,
    })
    .from(songs)
    .where(eq(songs.userId, session.user.id))
    .orderBy(desc(songs.createdAt));
  return NextResponse.json({ songs: rows });
}

/** Save the current song to the user's library. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  }

  const parsed = SaveSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dati non validi." }, { status: 400 });
  }
  const { name, format, dataB64, bpm, durationSec } = parsed.data;

  const sizeBytes = Math.floor((dataB64.length * 3) / 4);
  if (sizeBytes > MAX_BYTES) {
    return NextResponse.json({ error: "File troppo grande." }, { status: 413 });
  }

  const [row] = await db
    .insert(songs)
    .values({
      userId: session.user.id,
      name,
      format,
      dataB64,
      sizeBytes,
      bpm: bpm ?? null,
      durationSec: durationSec ?? null,
    })
    .returning({ id: songs.id });

  return NextResponse.json({ id: row.id });
}
