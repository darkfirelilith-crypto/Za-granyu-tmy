import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, getCurrentCharacter } from "@/lib/session";

/** GET /api/notes?characterId=... — list notes for the caller's character (or any if admin). */
export async function GET(req: NextRequest) {
  const session = await requireUser();
  if (!session) return NextResponse.json({ error: "Войдите" }, { status: 401 });
  const url = new URL(req.url);
  const characterId = url.searchParams.get("characterId");
  if (!characterId) return NextResponse.json({ error: "Укажите characterId" }, { status: 400 });

  const char = await db.character.findUnique({ where: { id: characterId } });
  if (!char) return NextResponse.json({ error: "Персонаж не найден" }, { status: 404 });

  // Players can only read their own character's notes; admin can read any
  if (char.userId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Чужой свиток не читается" }, { status: 403 });
  }
  const notes = await db.note.findMany({
    where: { characterId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(notes);
}

/** POST — create a note for the caller's character. */
export async function POST(req: NextRequest) {
  const session = await requireUser();
  if (!session) return NextResponse.json({ error: "Войдите" }, { status: 401 });
  const { characterId, title, content } = await req.json();
  if (!characterId || !content) return NextResponse.json({ error: "Нужны characterId и content" }, { status: 400 });

  const char = await db.character.findUnique({ where: { id: characterId } });
  if (!char) return NextResponse.json({ error: "Персонаж не найден" }, { status: 404 });
  if (char.userId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Только владелец может писать заметки" }, { status: 403 });
  }
  const note = await db.note.create({
    data: { characterId, title: title || null, content },
  });
  return NextResponse.json(note, { status: 201 });
}
