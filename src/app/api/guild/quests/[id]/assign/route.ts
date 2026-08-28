import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/session";

// Assign or update quest progress for a character
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireUser();
  if (!session) return NextResponse.json({ error: "Войдите как авантюрист" }, { status: 401 });
  const { id } = await params;
  const { characterId, status } = await req.json();

  // Verify character belongs to the user (unless admin)
  const character = await db.character.findUnique({ where: { id: characterId } });
  if (!character) return NextResponse.json({ error: "Персонаж не найден" }, { status: 404 });
  const admin = await requireAdmin();
  if (!admin && character.userId !== session.user.id) {
    return NextResponse.json({ error: "Можно управлять лишь своим персонажем" }, { status: 403 });
  }

  const quest = await db.quest.findUnique({ where: { id } });
  if (!quest) return NextResponse.json({ error: "Задание не найдено" }, { status: 404 });

  const progress = await db.questProgress.upsert({
    where: { questId_characterId: { questId: id, characterId } },
    update: { status, completedAt: status === "COMPLETED" ? new Date() : null },
    create: {
      questId: id,
      characterId,
      status: status ?? "ASSIGNED",
      completedAt: status === "COMPLETED" ? new Date() : null,
    },
  });

  // Update quest status
  if (status === "COMPLETED") {
    await db.quest.update({ where: { id }, data: { status: "COMPLETED" } });
  } else {
    await db.quest.update({ where: { id }, data: { status: "ASSIGNED" } });
  }

  // Grant XP on completion
  if (status === "COMPLETED") {
    const xpReward = { TRIVIAL: 20, EASY: 50, MEDIUM: 120, HARD: 250, DEADLY: 500 }[quest.difficulty] ?? 50;
    await db.character.update({ where: { id: characterId }, data: { xp: { increment: xpReward } } });
    // Auto rank-up
    const char = await db.character.findUnique({ where: { id: characterId } });
    if (char) {
      const newRank = await db.guildRank.findFirst({
        where: { minXp: { lte: char.xp } },
        orderBy: { minXp: "desc" },
      });
      if (newRank && newRank.id !== char.guildRankId) {
        await db.character.update({ where: { id: characterId }, data: { guildRankId: newRank.id, level: { increment: 1 } } });
      }
    }
  }

  return NextResponse.json(progress);
}

// Remove assignment
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Доступ дарован лишь Божеству" }, { status: 403 });
  const { id } = await params;
  const url = new URL(_req.url);
  const characterId = url.searchParams.get("characterId");
  if (!characterId) return NextResponse.json({ error: "Укажите characterId" }, { status: 400 });
  await db.questProgress.delete({ where: { questId_characterId: { questId: id, characterId } } }).catch(() => {});
  await db.quest.update({ where: { id }, data: { status: "OPEN" } });
  return NextResponse.json({ ok: true });
}
