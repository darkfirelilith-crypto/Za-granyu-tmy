import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

// Grant an achievement to a character (admin), or revoke it
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Лишь Божество раздаёт достижения" }, { status: 403 });
  let body: { characterId?: string; achievementId?: string; action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Неверное тело запроса" }, { status: 400 });
  }
  const { characterId, achievementId, action } = body;
  if (!characterId || !achievementId) {
    return NextResponse.json({ error: "Укажите characterId и achievementId" }, { status: 400 });
  }

  if (action === "revoke") {
    try {
      await db.characterAchievement.delete({
        where: { characterId_achievementId: { characterId, achievementId } },
      });
    } catch {
      // Already revoked — not an error
    }
    return NextResponse.json({ ok: true, revoked: true });
  }

  // Validate FK existence before upsert
  const [char, ach] = await Promise.all([
    db.character.findUnique({ where: { id: characterId }, select: { id: true } }),
    db.achievement.findUnique({ where: { id: achievementId }, select: { id: true } }),
  ]);
  if (!char) return NextResponse.json({ error: "Персонаж не найден" }, { status: 404 });
  if (!ach) return NextResponse.json({ error: "Достижение не найдено" }, { status: 404 });

  try {
    await db.characterAchievement.upsert({
      where: { characterId_achievementId: { characterId, achievementId } },
      update: {},
      create: { characterId, achievementId, grantedBy: admin.user.id },
    });
    return NextResponse.json({ ok: true, granted: true });
  } catch (e) {
    console.error("grant failed:", e);
    return NextResponse.json({ ok: false, error: "Не удалось выдать достижение" }, { status: 500 });
  }
}
