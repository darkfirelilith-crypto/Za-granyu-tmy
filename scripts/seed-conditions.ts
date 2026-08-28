import { db } from '../src/lib/db';

async function main() {
  const p1 = await db.grimoireEntry.findUnique({ where: { title: "Страница I: О Первородном Молчании" } });
  if (p1 && !p1.conditionType) {
    await db.grimoireEntry.update({ where: { id: p1.id }, data: { conditionType: "QUEST_COUNT", conditionValue: "1", unlockHint: "Заверши первое задание гильдии." } });
    console.log("Page I condition set: QUEST_COUNT=1");
  }
  const p2 = await db.grimoireEntry.findUnique({ where: { title: "Страница II: Об истинном имени Морганта" } });
  if (p2 && !p2.conditionType) {
    await db.grimoireEntry.update({ where: { id: p2.id }, data: { conditionType: "QUEST_COUNT", conditionValue: "3", unlockHint: "Заверши три задания гильдии." } });
    console.log("Page II condition set: QUEST_COUNT=3");
  }
  const p3 = await db.grimoireEntry.findUnique({ where: { title: "Страница III: Ритуал Разрыва" } });
  if (p3 && !p3.conditionType) {
    await db.grimoireEntry.update({ where: { id: p3.id }, data: { conditionType: "RANK_REACHED", conditionValue: "4", unlockHint: "Достигни ранга Золотой Защитник (уровень 4)." } });
    console.log("Page III condition set: RANK_REACHED=4");
  }
  const p4 = await db.grimoireEntry.findUnique({ where: { title: "Страница IV: Пророчество Седьмой Эры" } });
  if (p4 && !p4.conditionType) {
    await db.grimoireEntry.update({ where: { id: p4.id }, data: { conditionType: "XP_THRESHOLD", conditionValue: "1500", unlockHint: "Накопи 1500 опыта." } });
    console.log("Page IV condition set: XP_THRESHOLD=1500");
  }

  const a1 = await db.achievement.findUnique({ where: { name: "Первый Кровавый" } });
  if (a1 && !a1.conditionType) {
    await db.achievement.update({ where: { id: a1.id }, data: { conditionType: "QUEST_COUNT", conditionValue: "1" } });
    console.log("Ach 'Первый Кровавый': QUEST_COUNT=1");
  }
  const a2 = await db.achievement.findUnique({ where: { name: "Покоритель Подземелий" } });
  if (a2 && !a2.conditionType) {
    await db.achievement.update({ where: { id: a2.id }, data: { conditionType: "QUEST_COUNT", conditionValue: "2" } });
    console.log("Ach 'Покоритель Подземелий': QUEST_COUNT=2");
  }
  const a3 = await db.achievement.findUnique({ where: { name: "Мастер Гильдии" } });
  if (a3 && !a3.conditionType) {
    await db.achievement.update({ where: { id: a3.id }, data: { conditionType: "RANK_REACHED", conditionValue: "4" } });
    console.log("Ach 'Мастер Гильдии': RANK_REACHED=4");
  }
  const a4 = await db.achievement.findUnique({ where: { name: "Знаток Лора" } });
  if (a4 && !a4.conditionType) {
    await db.achievement.update({ where: { id: a4.id }, data: { conditionType: "XP_THRESHOLD", conditionValue: "1000" } });
    console.log("Ach 'Знаток Лора': XP_THRESHOLD=1000");
  }
  console.log("Conditions seeded.");
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
