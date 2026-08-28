import { db } from '../src/lib/db';

async function main() {
  // Reset hero character: clear completed quests & achievements, set xp back, re-lock auto-unlocked grimoire
  const hero = await db.user.findUnique({ where: { email: "hero@eldrin.world" } });
  if (!hero) { console.log("no hero"); return; }
  const char = await db.character.findUnique({ where: { userId: hero.id } });
  if (!char) { console.log("no char"); return; }

  // Delete all quest progress
  await db.questProgress.deleteMany({ where: { characterId: char.id } });
  // Delete all achievements
  await db.characterAchievement.deleteMany({ where: { characterId: char.id } });
  // Reset XP and rank
  const iron = await db.guildRank.findFirst({ where: { level: 1 } });
  await db.character.update({ where: { id: char.id }, data: { xp: 0, level: 1, guildRankId: iron?.id ?? null } });
  // Re-lock all grimoire pages
  await db.grimoireEntry.updateMany({ where: {}, data: { unlocked: false, autoUnlocked: false } });
  // Reset all quests to OPEN
  await db.quest.updateMany({ where: {}, data: { status: "OPEN" } });
  console.log("Hero reset: XP=0, rank=Iron, quests cleared, achievements cleared, grimoire re-locked.");
}
main().catch(e=>{console.error(e);process.exit(1);}).finally(()=>db.$disconnect());
