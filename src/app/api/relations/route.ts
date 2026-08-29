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
  const { ownerId, targetCharacterId, targetPersonalityId, relationLabel, description } = await req.json();
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
  const relation = await db.characterRelation.create({
    data: { ownerId, targetCharacterId: targetCharacterId ?? null, targetPersonalityId: targetPersonalityId ?? null, relationLabel, description: description ?? null },
  });
  return NextResponse.json(relation, { status: 201 });
}
