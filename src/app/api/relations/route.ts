import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";

// GET relations owned by a character (?ownerId=...) — owner or admin can read
export async function GET(req: NextRequest) {
  const session = await requireUser();
  if (!session) return NextResponse.json({ error: "Войдите" }, { status: 401 });
  const url = new URL(req.url);
  const ownerId = url.searchParams.get("ownerId");
  if (!ownerId) return NextResponse.json({ error: "Укажите ownerId" }, { status: 400 });
  const owner = await db.character.findUnique({ where: { id: ownerId } });
  if (!owner) return NextResponse.json({ error: "Персонаж не найден" }, { status: 404 });
  if (owner.userId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Чужой свиток" }, { status: 403 });
  }
  const relations = await db.characterRelation.findMany({
    where: { ownerId },
    include: {
      targetCharacter: { select: { id: true, name: true, portrait: true, race: true, charClass: true } },
      targetPersonality: { select: { id: true, name: true, title: true, portrait: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(relations);
}

// POST create a relation — owner must be the caller's own character (or admin)
export async function POST(req: NextRequest) {
  const session = await requireUser();
  if (!session) return NextResponse.json({ error: "Войдите" }, { status: 401 });
  let body: { ownerId?: string; targetCharacterId?: string | null; targetPersonalityId?: string | null; relationLabel?: string; description?: string | null };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Неверное тело запроса" }, { status: 400 }); }
  const { ownerId, targetCharacterId, targetPersonalityId, relationLabel, description } = body;
  if (!ownerId) return NextResponse.json({ error: "Укажите ownerId" }, { status: 400 });
  if (!targetCharacterId && !targetPersonalityId) {
    return NextResponse.json({ error: "Укажите targetCharacterId или targetPersonalityId" }, { status: 400 });
  }
  if (targetCharacterId && targetPersonalityId) {
    return NextResponse.json({ error: "Только одна цель — персонаж ИЛИ НПС" }, { status: 400 });
  }
  if (!relationLabel) return NextResponse.json({ error: "Укажите relationLabel" }, { status: 400 });
  const owner = await db.character.findUnique({ where: { id: ownerId } });
  if (!owner) return NextResponse.json({ error: "Персонаж не найден" }, { status: 404 });
  if (owner.userId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Можно только для своего персонажа" }, { status: 403 });
  }
  // Validate target FK existence
  if (targetCharacterId) {
    const tc = await db.character.findUnique({ where: { id: targetCharacterId }, select: { id: true } });
    if (!tc) return NextResponse.json({ error: "Целевой персонаж не найден" }, { status: 404 });
  }
  if (targetPersonalityId) {
    const tp = await db.personality.findUnique({ where: { id: targetPersonalityId }, select: { id: true } });
    if (!tp) return NextResponse.json({ error: "Целевая личность не найдена" }, { status: 404 });
  }
  try {
    const relation = await db.characterRelation.create({
      data: { ownerId, targetCharacterId: targetCharacterId ?? null, targetPersonalityId: targetPersonalityId ?? null, relationLabel, description: description ?? null },
    });
    return NextResponse.json(relation, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Не удалось создать связь" }, { status: 500 });
  }
}
