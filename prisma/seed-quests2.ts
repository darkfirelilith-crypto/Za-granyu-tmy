/**
 * Seed 5 additional quests into Neon — diverse difficulties & locations
 * tied to the seeded world (Эльдрион, Крагмарск, Сильмариэль, Удунголь, Вес'Харан, Мёртвые Земли).
 * Idempotent: existence guard by title.
 *
 * Usage:
 *   set -a; source .env; set +a
 *   bun run prisma/seed-quests2.ts
 */
import { db } from "../src/lib/db";

async function main() {
  console.log("⚔️ Seeding 5 more quests into Neon...");

  const quests = [
    {
      title: "Кровь на Снегу",
      difficulty: "HARD",
      reward: "Клинок ярла + 350 XP",
      location: "Фьорд Сигурда, Крагмарск",
      status: "OPEN",
      description: "Ярл Сигурд Кровавый Топор готовит нападение на ставку хана Батыра. Капитан Изольда просит предотвратить резню — не ради Батыра, но ради детей в обеих ставках. Найди способ остановить Сигурда без войны. Либо словом, либо клинком.",
    },
    {
      title: "Сон Торговца",
      difficulty: "MEDIUM",
      reward: "300 золотых + 120 XP",
      location: "Харан, Вес'Харан",
      status: "OPEN",
      description: "Князь Харата купил сон у Ткача Кошмаров Вееля — и теперь не может проснуться. Каждый день его богатство тает, а город идёт вразнос. Найди Вееля в лабиринте базаров и заставь снять чары. Осторожно: Веель не торгует задаром.",
    },
    {
      title: "Песня, что Умолкла",
      difficulty: "DEADLY",
      reward: "Эльфийский лук + 800 XP + открытие главы Гримуара",
      location: "Глубины Сильмариэли",
      status: "OPEN",
      description: "Эльдрин Последний Эльф провожает тебя в самое сердце леса, где спит Песня, умолкшая в год Падения. Дорога ведёт через три древних капища. На каждом — испытание памяти. Пройдёшь — услышишь Песню. Не пройдёшь — забудешь своё имя.",
    },
    {
      title: "Степь Помнит",
      difficulty: "MEDIUM",
      reward: "Конь Батыра + 200 XP",
      location: "Удунголь, ставка хана",
      status: "OPEN",
      description: "Хан Батыр ищет того, кто украдёт его любимого коня — чёрного, как ночь Падения. Не из жадости: конь нёс его отца в день Падения, и Батыр верит, что конь помнит дорогу к разлому. Доставь коня к Чертогу Слёз Алого — но не садись в седло, иначе не вернёшься.",
    },
    {
      title: "Тень у Стен",
      difficulty: "DEADLY",
      reward: "Амулет Серафины + 1000 XP + звание Защитника Эльдриона",
      location: "Стены Эльдриона",
      status: "OPEN",
      description: "Великая Жрица Серафина видит: тень из Мёртвых Земель снова идёт к стенам Эльдриона, как в день, когда погиб брат Селах. В этот раз тень сильнее. Нужны трое героев, что встанут у алтаря с пламенем, что не гаснет. Цена — год жизни каждого. Награда — город будет стоять.",
    },
  ];

  let created = 0;
  let skipped = 0;
  for (const q of quests) {
    const existing = await db.quest.findFirst({ where: { title: q.title } });
    if (existing) {
      skipped++;
      continue;
    }
    await db.quest.create({ data: q });
    created++;
  }
  console.log(`✓ Quests: ${created} created, ${skipped} skipped`);
  console.log("✅ Seed complete.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
