import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireUser();
  if (!session) return NextResponse.json({ error: "Войдите" }, { status: 401 });
  const { id } = await params;
  const { relationLabel, description } = await req.json();
  const rel = await db.characterRelation.findUnique({ where: { id }, include: { owner: true } });
  if (!rel) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  if (rel.owner.userId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Чужая связь" }, { status: 403 });
  }
  const updated = await db.characterRelation.update({
    where: { id },
    data: { relationLabel: relationLabel ?? rel.relationLabel, description: description ?? rel.description },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireUser();
  if (!session) return NextResponse.json({ error: "Войдите" }, { status: 401 });
  const { id } = await params;
  const rel = await db.characterRelation.findUnique({ where: { id }, include: { owner: true } });
  if (!rel) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  if (rel.owner.userId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Чужая связь" }, { status: 403 });
  }
  await db.characterRelation.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
