import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { songs } from "@/lib/db/schema";

export const runtime = "nodejs";

/** Return one saved song's bytes (owner only). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  }
  const { id } = await params;
  const [row] = await db
    .select()
    .from(songs)
    .where(and(eq(songs.id, id), eq(songs.userId, session.user.id)))
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "Non trovato." }, { status: 404 });
  }
  return NextResponse.json({
    name: row.name,
    format: row.format,
    dataB64: row.dataB64,
    bpm: row.bpm,
    durationSec: row.durationSec,
  });
}

/** Delete one saved song (owner only). */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  }
  const { id } = await params;
  const deleted = await db
    .delete(songs)
    .where(and(eq(songs.id, id), eq(songs.userId, session.user.id)))
    .returning({ id: songs.id });

  if (deleted.length === 0) {
    return NextResponse.json({ error: "Non trovato." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
