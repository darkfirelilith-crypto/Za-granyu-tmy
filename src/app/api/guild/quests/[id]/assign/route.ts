import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/session";

const ALLOWED_STATUS = ["ASSIGNED", "COMPLETED", "FAILED"] as const;
type QuestStatus = (typeof ALLOWED_STATUS)[number];

// Assign or update quest progress for a character
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireUser();
  if (!session) return NextResponse.json({ error: "Войдите как авантюрист" }, { status: 401 });
  const { id } = await params;

  let body: { characterId?: string; status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Неверное тело запроса" }, { status: 400 });
  }
  const { characterId, status } = body;
  if (!characterId) return NextResponse.json({ error: "Укажите characterId" }, { status: 400 });
  if (!status || !ALLOWED_STATUS.includes(status as QuestStatus)) {
    return NextResponse.json({ error: "Неверный status" }, { status: 400 });
  }

  // Verify character belongs to the user (unless admin)
  const character = await db.character.findUnique({ where: { id: characterId } });
  if (!character) return NextResponse.json({ error: "Персонаж не найден" }, { status: 404 });
  const admin = await requireAdmin();
  if (!admin && character.userId !== session.user.id) {
    return NextResponse.json({ error: "Можно управлять лишь своим персонажем" }, { status: 403 });
  }

  const quest = await db.quest.findUnique({ where: { id } });
  if (!quest) return NextResponse.json({ error: "Задание не найдено" }, { status: 404 });

  // Read existing progress to prevent XP replay and backward quest-status transitions
  const existing = await db.questProgress.findUnique({
    where: { questId_characterId: { questId: id, characterId } },
  });
  const wasCompleted = existing?.status === "COMPLETED";
  // A non-admin cannot reopen a quest that is globally COMPLETED (no undoing global completion)
  if (quest.status === "COMPLETED" && status !== "COMPLETED" && !admin) {
    return NextResponse.json({ error: "Завершённое задание нельзя открыть заново" }, { status: 400 });
  }

  const completedAt = status === "COMPLETED" ? new Date() : null;
  const progress = await db.questProgress.upsert({
    where: { questId_characterId: { questId: id, characterId } },
    update: { status, completedAt },
    create: {
      questId: id,
      characterId,
      status,
      completedAt,
    },
  });

  // Update quest status — only transition forward (OPEN -> ASSIGNED -> COMPLETED)
  let nextQuestStatus = quest.status;
  if (status === "COMPLETED") {
    nextQuestStatus = "COMPLETED";
  } else if (status === "ASSIGNED" && quest.status === "OPEN") {
    nextQuestStatus = "ASSIGNED";
  }
  // FAILED doesn't change global quest status
  if (nextQuestStatus !== quest.status) {
    await db.quest.update({ where: { id }, data: { status: nextQuestStatus } });
  }

  // Grant XP only on a fresh completion (prevents replay: COMPLETED -> COMPLETED -> infinite XP)
  if (status === "COMPLETED" && !wasCompleted) {
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

    // Evaluate auto-unlock conditions (grimoire pages + achievements)
    try {
      const { evaluateConditions } = await import("@/lib/conditions");
      const result = await evaluateConditions(characterId, id);
      return NextResponse.json({
        ...progress,
        xpAwarded: xpReward,
        autoUnlocked: result.unlockedGrimoire,
        autoGranted: result.grantedAchievements,
      });
    } catch (e) {
      // Conditions engine failure must not break quest completion
      console.error("conditions engine error:", e);
    }
  }

  // On a fresh assignment (OPEN -> ASSIGNED), also evaluate conditions so that
  // QUEST_ASSIGNED / QUEST_ASSIGNED_COUNT achievements (e.g. "Первый Шаг во Тьму")
  // fire immediately when the player accepts their first quest — not only on completion.
  if (status === "ASSIGNED" && quest.status === "OPEN") {
    try {
      const { evaluateConditions } = await import("@/lib/conditions");
      const result = await evaluateConditions(characterId, id);
      return NextResponse.json({
        ...progress,
        autoUnlocked: result.unlockedGrimoire,
        autoGranted: result.grantedAchievements,
      });
    } catch (e) {
      console.error("conditions engine error (assign):", e);
    }
  }

  return NextResponse.json(progress);
}

// Remove assignment (admin only)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Доступ дарован лишь Божеству" }, { status: 403 });
  const { id } = await params;
  const url = new URL(req.url);
  const characterId = url.searchParams.get("characterId");
  if (!characterId) return NextResponse.json({ error: "Укажите characterId" }, { status: 400 });
  await db.questProgress.delete({ where: { questId_characterId: { questId: id, characterId } } }).catch(() => {});
  // Recompute global quest status based on remaining progress (don't blindly reset to OPEN)
  const remaining = await db.questProgress.findMany({ where: { questId: id }, select: { status: true } });
  let nextStatus = "OPEN";
  if (remaining.some((p) => p.status === "COMPLETED")) nextStatus = "COMPLETED";
  else if (remaining.some((p) => p.status === "ASSIGNED")) nextStatus = "ASSIGNED";
  await db.quest.update({ where: { id }, data: { status: nextStatus } });
  return NextResponse.json({ ok: true });
}
