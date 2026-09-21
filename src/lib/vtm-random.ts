// ============================================================
// «Пусть Кровь решит» — честный генератор случайного Сородича (5 ред.).
// Правила соблюдаются: характеристики ровно 22 очка (одна 4, три 3,
// четыре 2, одна 1), две клановые Дисциплины (2 и 1), стиль охоты с
// бонусными навыками и +1 к Дисциплине, 7 пунктов фактов биографии,
// недостатки на 2 пункта, Человечность 7.
// ============================================================

import {
  VtmSheetData,
  VtmSkillState,
  VtmDisciplineState,
  VtmAdvantageEntry,
  VtmAttributes,
  SKILL_LIBRARY,
  CLANS,
  ClanDef,
  DISCIPLINE_BY_ID,
  PREDATOR_TYPES,
  ADVANTAGE_BY_ID,
  RESONANCES,
  DEFAULT_CREATION_POOL,
} from "./vtm-data";

// ---------- утилиты ----------

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const pickWeighted = <T,>(items: { item: T; w: number }[]): T => {
  const total = items.reduce((s, x) => s + x.w, 0);
  let roll = Math.random() * total;
  for (const x of items) {
    roll -= x.w;
    if (roll <= 0) return x.item;
  }
  return items[items.length - 1].item;
};
const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// ---------- пулы имён ----------

/** Тени Крови: анонимные силуэты для случайных Сородичей —
 *  Кровь ещё не выбрала лицо, но уже выбрала тень. */
const SHADOW_PORTRAITS = [
  "/vtm/portraits/shadow-veiled.jpg",
  "/vtm/portraits/shadow-fedora.jpg",
  "/vtm/portraits/shadow-hood.jpg",
  "/vtm/portraits/shadow-smoke.jpg",
];

const MALE_NAMES = ["Артём", "Константин", "Родион", "Марк", "Святослав", "Игнат", "Феликс", "Захар", "Лев", "Мирон", "Тимур", "Никодим", "Аристарх", "Вадим", "Глеб", "Демьян"];
const FEMALE_NAMES = ["Вера", "Лада", "Маргарита", "Ника", "Селена", "Аглая", "Ирина", "Ярослава", "Ева", "Серафима", "Полина", "Ксения", "Тамара", "Регина", "Алиса", "Устинья"];
const SURNAMES = ["Волков", "Крамской", "Оболенский", "Штерн", "Черных", "Ветров", "Савельев", "Ланге", "Морозов", "Вельский", "Гронский", "Стрельцов", "Ковач", "Ярцев", "Дюмон", "Заремба"];
const NICKNAMES = ["Шрам", "Тихая", "Секач", "Голоса", "Луноликая", "Гвоздь", "Пепел", "Шёпот", "Прыгун", "Вуаль", "Хрящ", "Сотка", "Кровинка", "Дым", "Клешня", "Меченая"];

const CONCEPTS = [
  "бывший патологоанатом, ныне доктор без диплома",
  "таксист ночной смены — знает каждый двор",
  "тату-мастер закрытого салона",
  "диджей клубов, куда не пускают полицию",
  "охранник VIP-зон и ночных кабинетов",
  "корреспондент криминальной хроники",
  "реставратор икон и старых денег",
  "бариста круглосуточной кофейни у вокзала",
  "риелтор элитной недвижимости с мёртвыми клиентами",
  "смотритель кладбища и его архивов",
  "курьер документов, которые нельзя читать",
  "стилист столичного театра",
  "эксперт аукционного дома по предметам с историей",
  "адвокат, чьи клиенты умирают редко и вовремя",
  "психолог в частной клинике для очень богатых",
  "дальнобойщик междугородних ночных рейсов",
];

const AMBITIONS = [
  "Расплатиться с долгом, что привёл к Становлению",
  "Отыскать сира и услышать правду о той ночи",
  "Занять место в правящем совете города",
  "Разрушить империю того, кто отнял жизнь",
  "Найти способ вернуть себе смертную жизнь",
  "Стать незаменимым для Принца — и неуязвимым",
  "Собрать котерию, которая переживёт века",
  "Выйти из-под чужих уз крови навсегда",
  "Вывезти семью из города до Геенны",
  "Узнать имя древнего, что шепчет в снах",
];

const DESIRES = [
  "Пережить первую встречу с Шерифом",
  "Провернуть дело без единого свидетеля",
  "Отплатить обидчику той же монетой",
  "Заполучить реликвию с частных торгов",
  "Узнать, кто на самом деле правит городом",
  "Найти убежище понадёжнее теперешнего",
  "Уладить долг перед Мавлой",
  "Завербовать первого верного гуля",
  "Достать резонанс, что нужен рассказчику",
  "Заставить инквизитора допустить ошибку",
];

const PRINCIPLES = [
  "Никогда не лгу тому, кому доверяю",
  "Всегда плачу по счетам — кровью или словом",
  "Никогда не касаюсь детей",
  "Всегда защищаю своё имя",
  "Никогда не забываю тех, кто был при жизни",
  "Всегда довожу дело до конца",
  "Никогда не пью из одного сосуда дважды",
  "Всегда отвечаю за своих",
  "Никогда не поднимаю руку на старых",
  "Всегда возвращаюсь за оставшимися",
];

const ANCHORS = [
  "Сестра, которая пишет письма в никуда",
  "Старый друг, который не верит в плохое",
  "Бар на окраине — единственное тихое место",
  "Могила матери на северном кладбище",
  "Ученик, которому я ещё не раскрылся",
  "Кот, появляющийся перед бедой",
  "Бывший напарник, что ищет меня сам",
  "Церковный хор, куда я хожу послушать",
  "Дом престарелых, где доживает мой сирый отец",
  "Речной вокзал и запах воды по утрам",
];

const SIRE_INTENTS: { m: string; f: string }[] = [
  { m: "выбрал меня за талант и не отпустил", f: "выбрала меня за талант и не отпустила" },
  { m: "испортил Становление случайно и сбежал", f: "испортила Становление случайно и сбежала" },
  { m: "проиграл пари и обязан был меня обратить", f: "проиграла пари и обязана была меня обратить" },
  { m: "нуждался в наследнике для грязных дел", f: "нуждалась в наследнике для грязных дел" },
  { m: "полюбил мой смех при жизни", f: "полюбила мой смех при жизни" },
  { m: "мстил моему роду через меня", f: "мстила моему роду через меня" },
  { m: "спас от смерти — как он утверждает", f: "спасла от смерти — как она утверждает" },
  { m: "выкупил меня у другой Крови", f: "выкупила меня у другой Крови" },
];

const DEATHWAYS = [
  "умер в аварии, которую никто не расследовал",
  "не проснулся после долгой болезни",
  "замёрз в снежную ночь на пустыре",
  "утонул в реке за городским мостом",
  "пал от чужой пули в подъезде",
  "не вышел из горящего цеха",
  "умер на операционном столе",
  "ушёл из жизни тихо, во сне, в 4 утра",
];

const AFTERMATHS = [
  "С той ночи город стал другим: громче запахи, острее страхи, ближе Зверь.",
  "С тех пор я считаю ночи, как смертный считал годы.",
  "Теперь у меня есть вечность на то, чтобы доделать начатое.",
  "Первое, что я понял: старая жизнь не отпускает. Второе: что она не нужна.",
  "Кровь изменила всё, кроме привычек — и это пугает сильнее клыков.",
];

const HAVENS = [
  "Подвал старой бани: пар скрывает от чужих глаз, а чугунные двери — от огня",
  "Квартира на последнем этаже панельки: три замка и сторож-пенсионер за шоколад",
  "Гараж у кольцевой: ржавый контейнер, накрытый брезентом и молчанием",
  "Цоколь закрытого магазина: вывеска не горит с 1998 года",
  "Чердак доходного дома XIX века: клумбы голубей как система оповещения",
  "Склад самовоза за рынок: у соседей химчистка — запах перебивает всё",
  "Домик сторожа на закрытом дачном массиве",
  "Ангар лётного клуба: крылья вместо штор",
];

const RESOURCES = [
  "Наличка от подработок, счёт на чужое имя",
  "Дивиденды «умершего» родственника",
  "Копилка в банке из-под кофе и пару долговых расписок",
  "Общий котёл котерии и своя заначка",
  "Доход с аренды двух квартир покойной тёти",
  "Продажа «своего» времени: консультации без вопросов",
];

const ITEMS_POOL = [
  "Телефон с двумя симками",
  "Наличные в конверте",
  "Медкейс с пустыми пакетами",
  "Заточка в рукаве",
  "Пропуск в ночной клуб",
  "Ржавый пистолет без обоймы",
  "Фото семьи, которого не должно существовать",
  "Флакон чужой крови — на всякий случай",
  "Складной нож с костяной рукоятью",
  "Ключ от чужой квартиры",
  "Диктофон с записью, которую страшно слушать",
  "Бинт и шприцы",
  "Кредитка мёртвого человека",
  "Билет на утреннюю электричку — бессрочно",
];

// Характеристические «пары» для быстрых бросков сохраняются из SKILL_LIBRARY

// ---------- генерация ----------

const CORE_CLANS = ["brujah", "ventru", "gangrel", "malkavian", "nosferatu", "toreador", "tremere"];

function randomAttributes(): VtmAttributes {
  // одна 4, три 3, четыре 2, одна 1 → ровно 22
  const values = shuffle([4, 3, 3, 3, 2, 2, 2, 2, 1]);
  const keys: (keyof VtmAttributes)[] = ["str", "dex", "sta", "cha", "man", "com", "int", "wit", "res"];
  const attrs = {} as VtmAttributes;
  keys.forEach((k, i) => { attrs[k] = values[i]; });
  return attrs;
}

function randomSkills(): VtmSkillState[] {
  const chosen = new Map<string, { value: number; spec?: string }>();
  const addSkill = (key: string, value: number) => {
    const cur = chosen.get(key);
    if (cur) {
      cur.value = Math.min(5, cur.value + value);
    } else {
      chosen.set(key, { value });
    }
  };

  const scheme = pickWeighted([
    { item: "jack", w: 3 },   // мастер на все руки: 1×3, 8×2, 10×1
    { item: "balanced", w: 4 }, // гармонично: 3×3, 5×2, 7×1
    { item: "narrow", w: 3 },  // узкий специалист: 1×4, 3×3, 3×2, 3×1
  ]) as "jack" | "balanced" | "narrow";

  const pool = shuffle(SKILL_LIBRARY.map((s) => s.id));
  let idx = 0;
  if (scheme === "jack") {
    addSkill(pool[idx++], 3);
    for (let i = 0; i < 8; i++) addSkill(pool[idx++], 2);
    for (let i = 0; i < 10; i++) addSkill(pool[idx++], 1);
  } else if (scheme === "balanced") {
    for (let i = 0; i < 3; i++) addSkill(pool[idx++], 3);
    for (let i = 0; i < 5; i++) addSkill(pool[idx++], 2);
    for (let i = 0; i < 7; i++) addSkill(pool[idx++], 1);
  } else {
    addSkill(pool[idx++], 4);
    for (let i = 0; i < 3; i++) addSkill(pool[idx++], 3);
    for (let i = 0; i < 3; i++) addSkill(pool[idx++], 2);
    for (let i = 0; i < 3; i++) addSkill(pool[idx++], 1);
  }

  // Специализации: бесплатная для гуманитарных/естественных/исполнения/ремесла (если взяты) + одна любая
  const specSkillIds = ["academics", "science", "performance", "craft"]
    .filter((id) => chosen.has(id));
  const withSpec = new Set<string>();
  for (const id of specSkillIds) {
    withSpec.add(id);
    const def = SKILL_LIBRARY.find((s) => s.id === id)!;
    chosen.get(id)!.spec = pick(def.specExamples);
  }
  // ещё одна любая специализация
  const specCandidate = shuffle(Array.from(chosen.keys()).filter((id) => !withSpec.has(id)))[0];
  if (specCandidate) {
    const def = SKILL_LIBRARY.find((s) => s.id === specCandidate)!;
    chosen.get(specCandidate)!.spec = pick(def.specExamples);
  }

  return Array.from(chosen.entries()).map(([key, v]) => ({
    key,
    name: SKILL_LIBRARY.find((s) => s.id === key)?.name || key,
    value: v.value,
    spec: v.spec || "",
    xp: 0,
  }));
}

function randomDisciplines(clan: ClanDef, predatorDiscId?: string): VtmDisciplineState[] {
  const result: VtmDisciplineState[] = [];
  const used = new Set<string>();

  // две клановые: одна на 2, другая на 1
  const clanDiscs = shuffle(clan.disciplines);
  const [main, secondary] = clanDiscs;
  if (main) {
    used.add(main);
    const def = DISCIPLINE_BY_ID.get(main);
    const powers: Record<number, string> = {};
    const l1 = shuffle(def?.powers[1] || [])[0];
    const l2 = shuffle(def?.powers[2] || [])[0];
    if (l1) powers[1] = l1.name;
    if (l2) powers[2] = l2.name;
    result.push({ key: main, name: def?.name || main, value: 2, powers, xp: 0 });
  }
  if (secondary) {
    used.add(secondary);
    const def = DISCIPLINE_BY_ID.get(secondary);
    const powers: Record<number, string> = {};
    const l1 = shuffle(def?.powers[1] || [])[0];
    if (l1) powers[1] = l1.name;
    result.push({ key: secondary, name: def?.name || secondary, value: 1, powers, xp: 0 });
  }
  // стиль охоты даёт +1 к своей Дисциплине
  if (predatorDiscId && !used.has(predatorDiscId)) {
    const def = DISCIPLINE_BY_ID.get(predatorDiscId);
    const powers: Record<number, string> = {};
    const l1 = shuffle(def?.powers[1] || [])[0];
    if (l1) powers[1] = l1.name;
    result.push({ key: predatorDiscId, name: def?.name || predatorDiscId, value: 1, powers, xp: 0 });
  }
  return result;
}

/** Слабокровные: вместо клановых Дисциплин — Алхимия слабокровных (1 уровень, случайная сила). */
function randomThinDisciplines(): VtmDisciplineState[] {
  const def = DISCIPLINE_BY_ID.get("thinblood_alchemy");
  const powers: Record<number, string> = {};
  const l1 = shuffle(def?.powers[1] || [])[0];
  if (l1) powers[1] = l1.name;
  return [
    {
      key: "thinblood_alchemy",
      name: def?.name || "Алхимия слабокровных",
      value: 1,
      powers,
      xp: 0,
    },
  ];
}

/** Слабокровные: 7 пунктов фактов + 2 достоинства «сл.» (бесплатные) + недостатки на 2 пункта. */
function randomThinAdvantages(): VtmAdvantageEntry[] {
  const result: VtmAdvantageEntry[] = [];
  // 7 пунктов фактов биографии (как у полнокровных)
  const bgPool = shuffle(["allies", "contacts", "herd", "influence", "resources", "mask", "mawla", "retainers", "fame", "status", "haven"]);
  let left = 7;
  const groups = 2 + Math.floor(Math.random() * 3); // 2..4
  for (let i = 0; i < groups && left > 0; i++) {
    const id = bgPool[i];
    const rating = i === groups - 1 ? left : Math.max(1, Math.min(5, Math.min(left, 1 + Math.floor(Math.random() * 3))));
    left -= rating;
    result.push({
      id: `rnd-bg-${id}-${i}`,
      name: ADVANTAGE_BY_ID.get(id)?.name || id,
      kind: "background",
      rating,
      note: "",
    });
  }
  // 2 достоинства слабокровных из каталога (kind "thinblood", cost 0)
  const tbPool = shuffle(Array.from(ADVANTAGE_BY_ID.values()).filter((a) => a.kind === "thinblood" && a.id !== "tb_vitae_dependent" && a.id !== "tb_dead_flesh" && a.id !== "tb_sun_sick" && a.id !== "tb_toothless"));
  for (const def of tbPool.slice(0, 2)) {
    result.push({
      id: `rnd-tb-${def.id}`,
      name: def.name,
      kind: "thinblood",
      rating: 1,
      note: def.desc || "",
    });
  }
  // недостатки на 2 пункта (как у полнокровных)
  const flawPool = shuffle(["methodical", "craving", "prey_exclusion", "anachronism_retro", "bond_junkie", "obvious_predator", "addiction", "organovore", "illiterate", "repulsive"]);
  let flawLeft = 2;
  for (const id of flawPool) {
    if (flawLeft <= 0) break;
    const def = ADVANTAGE_BY_ID.get(id);
    const cost = def?.cost ?? (["methodical", "craving", "anachronism_retro", "bond_junkie", "prey_exclusion"].includes(id) ? 1 : 2);
    if (cost > flawLeft) continue;
    flawLeft -= cost;
    result.push({
      id: `rnd-flaw-${id}`,
      name: def?.name || id,
      kind: "flaw",
      rating: 1, // уровень (точки); цена = уровень × cost
      note: def?.desc || "",
    });
  }
  return result;
}

function randomAdvantages(clan: ClanDef): VtmAdvantageEntry[] {
  const result: VtmAdvantageEntry[] = [];
  // 7 пунктов фактов биографии по 2–4 категориям
  const bgPool = shuffle(["allies", "contacts", "herd", "influence", "resources", "mask", "mawla", "retainers", "fame", "status", "haven"]);
  let left = 7;
  const groups = 2 + Math.floor(Math.random() * 3); // 2..4
  for (let i = 0; i < groups && left > 0; i++) {
    const id = bgPool[i];
    const rating = i === groups - 1 ? left : Math.max(1, Math.min(5, Math.min(left, 1 + Math.floor(Math.random() * 3))));
    left -= rating;
    result.push({
      id: `rnd-bg-${id}-${i}`,
      name: ADVANTAGE_BY_ID.get(id)?.name || id,
      kind: "background",
      rating,
      note: "",
    });
  }
  // недостатки на 2 пункта (плюс клановые — уже в листе)
  const flawPool = shuffle(["methodical", "craving", "prey_exclusion", "anachronism_retro", "bond_junkie", "obvious_predator", "addiction", "organovore", "illiterate", "repulsive"]);
  let flawLeft = 2;
  for (const id of flawPool) {
    if (flawLeft <= 0) break;
    const def = ADVANTAGE_BY_ID.get(id);
    const cost = def?.cost ?? (["methodical", "craving", "anachronism_retro", "bond_junkie", "prey_exclusion"].includes(id) ? 1 : 2);
    if (cost > flawLeft) continue;
    flawLeft -= cost;
    result.push({
      id: `rnd-flaw-${id}`,
      name: def?.name || id,
      kind: "flaw",
      rating: 1, // уровень (точки); цена = уровень × cost
      note: def?.desc || "",
    });
  }
  return result;
}

/** Собрать случайного Сородича целиком (сервер, идемпотентно). */
export function buildRandomSheet(): VtmSheetData {
  const female = Math.random() < 0.5;
  const first = female ? pick(FEMALE_NAMES) : pick(MALE_NAMES);
  const surname = pick(SURNAMES);
  const withNick = Math.random() < 0.45;
  const name = withNick ? `${first} «${pick(NICKNAMES)}» ${surname}` : `${first} ${surname}`;

  // слабокровные — отдельная ветка Крови (≈12%): 14–15-е поколение, без клана,
  // без клановых Дисциплин, вместо них — Алхимия слабокровных и достоинства/недостатки «сл.»
  const isThin = Math.random() < 0.12;

  // клан: ядро семи с весами; для слабокровных — «клан» thinblood
  const clanId = isThin ? "thinblood" : pickWeighted(CORE_CLANS.map((id) => ({ item: id, w: id === "brujah" || id === "nosferatu" ? 1.4 : 1 })));
  const clan = CLANS.find((c) => c.id === clanId)!;

  // поколение: неонаты чаще; слабокровные — 14-е или 15-е
  const generation = isThin
    ? Math.random() < 0.6 ? 14 : 15
    : pickWeighted([
        { item: 13, w: 3.5 },
        { item: 12, w: 3.5 },
        { item: 11, w: 1 },
        { item: 10, w: 0.7 },
      ]);

  // секта: по клану; слабокровных в секты не берут — они вне закона
  const sectId: string = isThin
    ? pickWeighted([{ item: "autarkis", w: 3 }, { item: "anarch", w: 1 }])
    : pickWeighted([
        { item: "camarilla", w: clanId === "brujah" ? 1 : 4 },
        { item: "anarch", w: clanId === "brujah" ? 4 : clanId === "ventru" ? 0.5 : 2 },
        { item: "autarkis", w: 1 },
      ]);

  // стиль охоты: полнокровным — любые, кроме алхимика; слабокровным — без бонусных
  // Дисциплин (их всё равно нет), зато Алхимик — их фирменный стиль
  const predator = isThin
    ? pick(PREDATOR_TYPES.filter((p) => !p.discipline))
    : pick(PREDATOR_TYPES.filter((p) => p.id !== "alchemist"));

  // сир не тёзка и не однофамилец персонажа — иначе «Феликс Заремба… Феликс Морозов нуждался»;
  // пол сира не привязан к полу ребёнка, формы глаголов согласованы с сиром
  const sireFemale = Math.random() < 0.4;
  const sireFirst = pick((sireFemale ? FEMALE_NAMES : MALE_NAMES).filter((n) => n !== first));
  const sireName = `${sireFirst} ${pick(SURNAMES.filter((s) => s !== surname))}`;
  const sireIntent = pick(SIRE_INTENTS)[sireFemale ? "f" : "m"];

  const info = {
    name,
    concept: pick(CONCEPTS),
    chronicle: "",
    sire: `${sireName} — ${sireIntent}`,
    occupation: pick(CONCEPTS).split(",")[0],
    generation: generation as number,
    sect: sectId,
    clan: clanId,
    predator: predator.id,
    ambition: pick(AMBITIONS),
    desire: pick(DESIRES),
    principle1: pick(PRINCIPLES),
    principle2: pick(PRINCIPLES.filter((p) => p !== "")),
    principle3: "",
    anchor1: pick(ANCHORS),
    anchor2: pick(ANCHORS.filter((a) => a !== "")),
    anchor3: "",
    description: "",
    history: "",
    portrait: pick(SHADOW_PORTRAITS),
    portraitThumb: "", // заполнится копией портрета ниже — тень одна на оба поля
  };
  info.portraitThumb = info.portrait;

  // уникализация принципов/опор
  while (info.principle2 === info.principle1) info.principle2 = pick(PRINCIPLES);
  if (Math.random() < 0.5) info.principle3 = pick(PRINCIPLES.filter((p) => p !== info.principle1 && p !== info.principle2));
  while (info.anchor2 === info.anchor1) info.anchor2 = pick(ANCHORS);
  if (Math.random() < 0.5) info.anchor3 = pick(ANCHORS.filter((a) => a !== info.anchor1 && a !== info.anchor2));

  // внешность и предыстория из фрагментов
  const looks = [
    "Держится у стены и первым замечает все выходы.",
    "Одежда на размер больше — чтобы скрыть, что тело больше не дышит.",
    "Улыбается ровно настолько, насколько нужно, и никогда — первой.",
    "Голос тихий, но его слушают с полуслова.",
    "Пахнет дымом и старыми книгами, даже когда никого нет рядом.",
    "Двигается бесшумно; люди расступаются, не понимая почему.",
    "Глаза в темноте ловят свет, как у зверя.",
    "Руки всегда холодные — жмёт в перчатках и ссылается на анемию.",
  ];
  info.description = pick(looks);
  info.history = isThin
    ? `${name} ${pick(DEATHWAYS)}. Кровь сира оказалась разбавленной — Становление оставило ${female ? "её" : "его"} слабокровным. ${sireName} ${sireIntent}. ${pick(AFTERMATHS)}`
    : `${name} ${pick(DEATHWAYS)}. ${sireName} ${sireIntent}. ${pick(AFTERMATHS)}`;

  const skills = randomSkills();
  // стиль охоты: +1 в три его навыка
  for (const key of predator.skills) {
    const st = skills.find((s) => s.key === key);
    if (st) st.value = Math.min(5, st.value + 1);
    else skills.push({ key, name: SKILL_LIBRARY.find((s) => s.id === key)?.name || key, value: 1, spec: "", xp: 0 });
  }

  const disciplines = isThin ? randomThinDisciplines() : randomDisciplines(clan, predator.discipline);
  const advantages = isThin ? randomThinAdvantages() : randomAdvantages(clan);

  // имущество
  const items = shuffle(ITEMS_POOL).slice(0, 3 + Math.floor(Math.random() * 2)).map((n, i) => ({
    id: `rnd-item-${i}`,
    name: n,
    count: "",
    note: "",
  }));

  return {
    info,
    attributes: randomAttributes(),
    skills,
    disciplines,
    advantages,
    loresheets: [],
    diablerie: { count: 0, notes: "" },
    advV2: true,
    gear: {
      haven: pick(HAVENS),
      resources: pick(RESOURCES),
      items,
    },
    notes: { draft: "", entries: [] },
    trackers: {
      humanity: 7,
      stains: 0,
      hunger: 1,
      healthSup: 0,
      healthAgg: 0,
      wpSup: 0,
      wpAgg: 0,
      xp: 0,
      xpSpent: 0,
      creationPool: DEFAULT_CREATION_POOL,
      creationSpent: 0,
      huntCount: 0,
      lastHunt: "",
    },
    rollLog: [],
    xpLog: [],
    // Кровь решает и вкус жертвы: живой резонанс 2–4 глубины (Звериный — реже)
    resonance: (() => {
      const kind = pickWeighted(RESONANCES.filter((r) => r.id !== "animal").map((r) => ({ item: r.id, w: 3 }))
        .concat(RESONANCES.filter((r) => r.id === "animal").map((r) => ({ item: r.id, w: 1 }))));
      return { kind, intensity: 2 + Math.floor(Math.random() * 3) };
    })(),
  };
}
