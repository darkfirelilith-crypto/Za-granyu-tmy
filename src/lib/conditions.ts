import { db } from "@/lib/db";

/**
 * Conditions engine: checks grimoire entries & achievements against a
 * character's current state and auto-unlocks / auto-grants matching items.
 *
 * Condition types:
 *  - QUEST_COMPLETED   value = questId
 *  - QUEST_ASSIGNED    value = questId (fires when a quest is accepted, not completed)
 *  - XP_THRESHOLD      value = xp number string
 *  - RANK_REACHED      value = rank level string
 *  - QUEST_COUNT       value = number of completed quests
 *  - QUEST_ASSIGNED_COUNT value = number of assigned (active) quests
 *  - ACHIEVEMENT_EARNED value = achievementId
 */
export interface ConditionContext {
  characterId: string;
  xp: number;
  rankLevel: number;
  completedQuestIds: string[];
  completedQuestTitles: string[];
  assignedQuestIds: string[];
  assignedQuestTitles: string[];
  earnedAchievementIds: string[];
  /** Optional trigger: the quest that was just assigned or completed (if any) */
  triggerQuestId?: string;
  triggerQuestTitle?: string;
}

export function checkCondition(
  type: string | null,
  value: string | null,
  ctx: ConditionContext
): boolean {
  if (!type || !value) return false;
  switch (type) {
    case "QUEST_COMPLETED":
      // Match by quest id OR quest title (admins may set conditionValue to either).
      // NOTE: do NOT use triggerQuestId/triggerQuestTitle here — that would fire on
      // assign too. Only the completed-quest lists reflect actual completion.
      return (
        ctx.completedQuestIds.includes(value) ||
        ctx.completedQuestTitles.includes(value)
      );
    case "QUEST_ASSIGNED":
      return (
        ctx.assignedQuestIds.includes(value) ||
        ctx.assignedQuestTitles.includes(value)
      );
    case "XP_THRESHOLD":
      return ctx.xp >= Number(value);
    case "RANK_REACHED":
      return ctx.rankLevel >= Number(value);
    case "QUEST_COUNT":
      return ctx.completedQuestIds.length >= Number(value);
    case "QUEST_ASSIGNED_COUNT":
      return ctx.assignedQuestIds.length >= Number(value);
    case "ACHIEVEMENT_EARNED":
      return ctx.earnedAchievementIds.includes(value);
    default:
      return false;
  }
}

/**
 * Build a condition context for a character by reading their current state.
 * Useful for the initial "evaluate everything" pass.
 */
export async function buildContext(characterId: string, triggerQuestId?: string): Promise<ConditionContext> {
  const char = await db.character.findUnique({
    where: { id: characterId },
    include: {
      guildRank: true,
      achievements: { select: { achievementId: true } },
      questProgress: { include: { quest: { select: { id: true, title: true } } } },
    },
  });
  if (!char) throw new Error("Character not found");

  const completedQuestIds = char.questProgress
    .filter((q) => q.status === "COMPLETED")
    .map((q) => q.questId);
  const completedQuestTitles = char.questProgress
    .filter((q) => q.status === "COMPLETED")
    .map((q) => q.quest.title);
  const assignedQuestIds = char.questProgress
    .filter((q) => q.status === "ASSIGNED")
    .map((q) => q.questId);
  const assignedQuestTitles = char.questProgress
    .filter((q) => q.status === "ASSIGNED")
    .map((q) => q.quest.title);
  const earnedAchievementIds = char.achievements.map((a) => a.achievementId);

  // Resolve trigger quest title (if triggerQuestId is set) so conditionValue
  // can match by title too.
  let triggerQuestTitle: string | undefined;
  if (triggerQuestId) {
    const triggerProgress = char.questProgress.find((q) => q.questId === triggerQuestId);
    triggerQuestTitle = triggerProgress?.quest.title;
    // If not in progress (shouldn't happen), fetch directly
    if (!triggerQuestTitle) {
      const q = await db.quest.findUnique({ where: { id: triggerQuestId }, select: { title: true } });
      triggerQuestTitle = q?.title;
    }
  }

  return {
    characterId,
    xp: char.xp,
    rankLevel: char.guildRank?.level ?? 1,
    completedQuestIds,
    completedQuestTitles,
    assignedQuestIds,
    assignedQuestTitles,
    earnedAchievementIds,
    triggerQuestId,
    triggerQuestTitle,
  };
}

/**
 * Evaluate all conditions for a character and auto-unlock / auto-grant
 * any matching items that aren't already unlocked/granted.
 * Returns the lists of newly unlocked/granted items so the caller can
 * show toast notifications.
 */
export async function evaluateConditions(
  characterId: string,
  triggerQuestId?: string
): Promise<{ unlockedGrimoire: { id: string; title: string }[]; grantedAchievements: { id: string; name: string; icon: string | null }[] }> {
  const ctx = await buildContext(characterId, triggerQuestId);

  // --- Grimoire: find locked entries whose condition is satisfied ---
  const grimoireCandidates = await db.grimoireEntry.findMany({
    where: { unlocked: false, conditionType: { not: null }, conditionValue: { not: null } },
    select: { id: true, title: true, conditionType: true, conditionValue: true },
  });
  const unlockedGrimoire: { id: string; title: string }[] = [];
  for (const g of grimoireCandidates) {
    if (checkCondition(g.conditionType, g.conditionValue, ctx)) {
      await db.grimoireEntry.update({
        where: { id: g.id },
        data: { unlocked: true, autoUnlocked: true },
      });
      unlockedGrimoire.push({ id: g.id, title: g.title });
    }
  }

  // --- Achievements: find ungranted achievements whose condition is satisfied ---
  const earnedSet = new Set(ctx.earnedAchievementIds);
  const achCandidates = await db.achievement.findMany({
    where: { conditionType: { not: null }, conditionValue: { not: null } },
    select: { id: true, name: true, icon: true, conditionType: true, conditionValue: true },
  });
  const grantedAchievements: { id: string; name: string; icon: string | null }[] = [];
  for (const a of achCandidates) {
    if (earnedSet.has(a.id)) continue;
    if (checkCondition(a.conditionType, a.conditionValue, ctx)) {
      await db.characterAchievement.upsert({
        where: { characterId_achievementId: { characterId, achievementId: a.id } },
        update: {},
        create: { characterId, achievementId: a.id, grantedBy: "auto" },
      });
      grantedAchievements.push({ id: a.id, name: a.name, icon: a.icon });
    }
  }

  return { unlockedGrimoire, grantedAchievements };
}
