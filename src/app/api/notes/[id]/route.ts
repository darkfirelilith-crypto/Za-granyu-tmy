import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireUser();
  if (!session) return NextResponse.json({ error: "Войдите" }, { status: 401 });
  const { id } = await params;
  let body: { title?: string | null; content?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Неверное тело запроса" }, { status: 400 });
  }
  const note = await db.note.findUnique({ where: { id }, include: { character: true } });
  if (!note) return NextResponse.json({ error: "Заметка не найдена" }, { status: 404 });
  if (note.character.userId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Чужая заметка" }, { status: 403 });
  }
  // content is non-nullable in schema; reject null explicitly, preserve existing when omitted
  if (body.content === null) {
    return NextResponse.json({ error: "Текст заметки не может быть пустым" }, { status: 400 });
  }
  const updated = await db.note.update({
    where: { id },
    data: {
      title: body.title === undefined ? note.title : body.title,
      content: body.content === undefined ? note.content : body.content,
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireUser();
  if (!session) return NextResponse.json({ error: "Войдите" }, { status: 401 });
  const { id } = await params;
  const note = await db.note.findUnique({ where: { id }, include: { character: true } });
  if (!note) return NextResponse.json({ error: "Заметка не найдена" }, { status: 404 });
  if (note.character.userId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Чужая заметка" }, { status: 403 });
  }
  await db.note.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
