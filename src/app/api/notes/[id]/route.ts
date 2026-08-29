import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireUser();
  if (!session) return NextResponse.json({ error: "Войдите" }, { status: 401 });
  const { id } = await params;
  const { title, content } = await req.json();
  const note = await db.note.findUnique({ where: { id }, include: { character: true } });
  if (!note) return NextResponse.json({ error: "Заметка не найдена" }, { status: 404 });
  if (note.character.userId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Чужая заметка" }, { status: 403 });
  }
  const updated = await db.note.update({
    where: { id },
    data: { title: title ?? null, content: content ?? note.content },
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
