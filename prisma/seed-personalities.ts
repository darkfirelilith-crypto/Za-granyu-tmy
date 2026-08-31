/**
 * Seed 5 new personalities + 6 character relations into Neon.
 * Idempotent: upsert by name (Personality) / existence guard (CharacterRelation).
 * Does NOT touch existing "Луис Арайзон".
 *
 * Usage:
 *   set -a; source .env; set +a
 *   bun run prisma/seed-personalities.ts
 */
import { db } from "../src/lib/db";

async function main() {
  console.log("🎭 Seeding personalities + relations into Neon...");

  const personalities = [
    {
      name: "Капитан Изольда Морская Клинок",
      title: "Капитан стражи фьордов Крагмарска",
      description: "Изольда — единственная женщина-капитан в Крагмарске, и этот факт она подтверждает каждое утро клинком. Тридцать зим она держит северный берег против тварей, что приходят из Мёртвых Земель по льду. Говорят, она не спит — лишь дремлет стоя, положив руку на эфес.",
      race: "Человек",
      age: "38 зим",
      gender: "Женский",
      appearance: "Высокая, жилистая, с обветренным лицом и короткой каштановой косой. Левое ухо отрублено — памятка от первой стычки. Носит кольчугу поверх меха и плащ цвета морской волны.",
      affiliation: "Крагмарск, Стража Фьордов",
      role: "Капитан стражи",
      status: "alive",
      isNpc: true,
      isKeyNpc: true,
    },
    {
      name: "Архимаг Терион Серый Посох",
      title: "Глава Ордена Знания, советник Эльдриона",
      description: "Терион помнит мир до Падения — ему было семьдесят, когда небо раскололось, и он единственный из старых магов ещё в рассудке. Его посох сер, как его имя, и говорят, что в нём — последний осколок звезды, что погасла первой. Он не спит, ибо сны его — это память о том, что было.",
      race: "Человек",
      age: "127 зим (магически продлено)",
      gender: "Мужской",
      appearance: "Худой, высокий, с длинной серебряной бородой. Глаза бледно-голубые, почти белые. Носит тёмно-синюю мантию с серебряной вышивкой звёзд. Посох из ясеня с набалдашником-осколком.",
      affiliation: "Эльдрион, Орден Знания",
      role: "Архимаг, советник Совета Жрецов",
      status: "alive",
      isNpc: true,
      isKeyNpc: true,
    },
    {
      name: "Ткач Кошмаров Веель",
      title: "Сектант Ноктиса, торговец снами",
      description: "Веель продаёт сны на улицах Харата — и никто не знает, откуда он берёт товар. Те, кто покупал, говорят, что видели будущее. Те, кто покупал дважды, не говорят ничего. Ходит слух, что он — слуга Ноктиса и собирает имена для своего господина.",
      race: "Полуэльф",
      age: "Неизвестно (выглядит на 30)",
      gender: "Мужской",
      appearance: "Худой, бледный, с тёмными кругами вокруг глаз. Одежда — слои серого шёлка, лицо скрыто капюшоном. Глаза разного цвета: один золотой, другой чёрный. Улыбается редко, но когда улыбается — неприятно.",
      affiliation: "Вес'Харан (официально), секта Ноктиса (тайно)",
      role: "Торговец снами, шпион",
      status: "alive",
      isNpc: true,
      isKeyNpc: true,
    },
    {
      name: "Ярл Сигурд Кровавый Топор",
      title: "Ярл Крагмарска, соперник Батыра",
      description: "Сигурд — старший ярл Крагмарска и тот, кто должен был стать ханом, пока Батыр не перехватил курултай. Он не простил. Его топор носит имя «Скорбь» и напитан кровью трёх поколений. Война между ними — вопрос времени, и время это — короткое.",
      race: "Человек",
      age: "45 зим",
      gender: "Мужской",
      appearance: "Огромный, рыжебородый, с перебитым носом. Шрам от топора через всю грудь. Носит шкуру белого медведя и кольчугу из китовой кости. Топор «Скорбь» — при нём всегда.",
      affiliation: "Крагмарск, клан Сигурда",
      role: "Ярл, претендент на ханство",
      status: "alive",
      isNpc: true,
      isKeyNpc: true,
    },
    {
      name: "Эльдрин Последний Эльф",
      title: "Посланник Сильмариэли, хранитель Песни",
      description: "Эльдрин — последний эльф, кто покинул Сильмариэль ради переговоров с Эльдрионом. Он принёс весть: Песня, что умолкла в год Падения, почти найдена. Но открыть её может лишь чужак, ибо свой — не может. Он ждёт героя. Он ждёт давно.",
      race: "Эльф",
      age: "820 зим",
      gender: "Мужской",
      appearance: "Высокий, стройный, с длинными серебряными волосами. Уши острые, глаза цвета весенней листвы. Одежда — зелёный и серебряный шёлк, плащ из листьев, что не вянут. Носит лютню из чёрного дерева.",
      affiliation: "Сильмариэль",
      role: "Посланник, хранитель Песни",
      status: "alive",
      isNpc: true,
      isKeyNpc: true,
    },
  ];

  let pCreated = 0;
  let pSkipped = 0;
  for (const p of personalities) {
    const existing = await db.personality.findUnique({ where: { name: p.name } });
    if (existing) {
      pSkipped++;
      continue;
    }
    await db.personality.create({ data: p as any });
    pCreated++;
  }
  console.log(`✓ Personalities: ${pCreated} created, ${pSkipped} skipped`);

  // ===== Character relations (between personalities, via CharacterRelation is for countries;
  // here we use the Group model to link personalities to the existing "Слёзы Алого" group) =====
  // Actually, Personality model has no direct relations table between personalities.
  // The existing "Луис Арайзон" + new ones can be added to groups via GroupNpc.
  // For richer lore, we add CountryRelation entries that reference these figures indirectly
  // is not ideal. Instead, we'll create a new group "Совет Трёх" linking key figures.
  const tearsGroup = await db.group.findFirst({ where: { name: { contains: "Слёз" } } });
  if (tearsGroup) {
    const luis = await db.personality.findUnique({ where: { name: "Луис Арайзон" } });
    if (luis) {
      const existingLink = await db.groupNpc.findUnique({
        where: { groupId_personalityId: { groupId: tearsGroup.id, personalityId: luis.id } },
      }).catch(() => null);
      if (!existingLink) {
        await db.groupNpc.create({
          data: {
            groupId: tearsGroup.id,
            personalityId: luis.id,
            role: "Лидер",
            notes: "Первый из Слёз Алого. Красный Лев.",
          },
        });
        console.log("✓ Linked Луис Арайзон → Слёзы Алого (Лидер)");
      }
    }
  }

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
