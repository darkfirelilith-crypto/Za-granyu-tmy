// ============================================================
// «Зов Ктулху» — генератор случайного сыщика «Пусть тьма решит».
// Броски по правилам 7e: 3d6×5 / (2d6+6)×5, возрастные правки,
// случайная профессия со случайной веткой формулы и случайным
// распределением очков. Модуль чистый (без React) — только сервер.
// ============================================================

import {
  CocSheetData,
  OCCUPATIONS,
  SKILL_LIBRARY,
  createEmptySheet,
  uid,
} from "@/lib/coc-data";
import { occupationPoints } from "@/lib/coc-calc";

// ===== Случайности =====

const d = (n: number) => 1 + Math.floor(Math.random() * n);
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
const int = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));

const roll3d6x5 = () => (d(6) + d(6) + d(6)) * 5;
const roll2d6p6x5 = () => (d(6) + d(6) + 6) * 5;

// ===== Имена (Америка 1920-х) =====

const NAMES_M = [
  "Джонатан", "Уолтер", "Фрэнсис", "Рэймонд", "Честер", "Эдгар", "Сайлас",
  "Гарри", "Оскар", "Лоуренс", "Вернон", "Кларенс", "Эммет", "Руперт",
  "Тобиас", "Мартин", "Сайрус", "Алберто", "Дуайт", "Элмор",
];
const NAMES_F = [
  "Аделаида", "Элеанор", "Виолетта", "Дороти", "Хелен", "Маргарет", "Лилиан",
  "Беатрис", "Флоренс", "Эвелин", "Джозефина", "Кора", "Агнесс", "Мэйбел",
  "Розалинда", "Селеста", "Ирма", "Люсиль", "Офелия", "Хэтти",
];
const NICKNAMES = [
  "Тихий", "Книжный червь", "Гвоздь", "Фонарь", "Пепел", "Довольный",
  "Сорока", "Кобольд", "Ржавый", "Полночь", "Профессор", "Куля",
];
const SURNAMES = [
  "Уитлок", "Мерривезер", "Кабот", "Эшворт", "Пирс", "Данвич", "Хоуг",
  "Гилман", "Орн", "Бишоп", "Уэйт", "Армитейдж", "Уиллет", "Ли",
  "Корь", "Ходжкинс", "Слейтер", "Марш", "Гарднер", "Пибоди",
];

const RESIDENCES = [
  "Аркхэм, Массачусетс", "Бостон, Массачусетс", "Инсмут, Массачусетс",
  "Кингспорт, Массачусетс", "Данвич, Массачусетс", "Провиденс, Род-Айленд",
  "Сейлем, Массачусетс", "Новый Орлеан, Луизиана", "Нью-Йорк, Нью-Йорк (Ред-Хук)",
  "Атланта, Джорджия", "Чарлстон, Южная Каролина", "Вермонт, у подножия гор",
];
const BIRTHPLACES = [
  "Бостон, Массачусетс", "Аркхэм, Массачусетс", "Провиденс, Род-Айленд",
  "Сейлем, Массачусетс", "Инсмут, Массачусетс", "Кингспорт, Массачусетс",
  "Дублин, Ирландия", "Лондон, Англия", "Краков, Польша",
  "Прага, Чехословакия", "Неизвестно — вырос в приюте",
];

// ===== Биография =====

const BIO_DESC_1 = [
  "Худой, с вечно озябшими пальцами",
  "Крепко сбит, движется неспешно",
  "Тщательно выбрит, взгляд из-под полей шляпы",
  "Одутловатое лицо, усталые глаза",
  "Щеголеват, ни пылинки на пиджаке",
  "Сгорблен, будто несёт невидимый груз",
];
const BIO_DESC_2 = [
  "пахнет табаком и старой бумагой",
  "левая рука всегда в кармане — там что-то лежит",
  "говорит тихо, но переспрашивать не приходится",
  "шрам, о котором рассказывать не любит",
  "постоянно что-то пишет в потрёпанном блокноте",
  "оглядывается на каждый подозрительный звук",
];
const BIO_TRAITS = [
  "Молчалив, но если уж говорит — по существу.",
  "Ирония как броня: смеётся там, где другие бегут.",
  "Педант: каждая вещь знает своё место.",
  "Сентиментален к мелочам — хранит билетики и записки.",
  "Боится темноты и стыдится этого страха.",
  "Доверяет чутью чаще, чем фактам.",
  "Не выносит запертых дверей.",
];
const BIO_IDEALS = [
  "«Знание — единственный свет в этой тьме».",
  "«Долг важнее страха».",
  "«Каждая тайна должна быть записана».",
  "«Выживу — значит, был не зря».",
  "«Никто не должен умереть, не узнав правды».",
  "«Порядок — единственная защита от хаоса».",
];
const BIO_SIGNIFICANT = [
  "Сестра — пишет письма, которые пахнут морем.",
  "Старый друг — пропал в экспедиции три года назад.",
  "Наставник — оставил ключ и запрет открывать сейф.",
  "Мать — в доме слышны шаги над потолком.",
  "Бывший напарник — теперь не здоровается.",
  "Незнакомец из сна — просит передать, что «они уже рядом».",
];

// ===== Снаряжение =====

const GEAR_UNIVERSAL = [
  { name: "Спички", qty: "1 коробок", note: "" },
  { name: "Фонарик электрический", qty: "1", note: "батареек на час" },
  { name: "Записная книжка", qty: "1", note: "в половину исписана" },
  { name: "Перочинный нож", qty: "1", note: "" },
  { name: "Фляжка", qty: "1", note: "кофе. Точно кофе." },
  { name: "Газетная вырезка", qty: "1", note: "статья без даты" },
  { name: "Часы на цепочке", qty: "1", note: "отстают на семь минут" },
  { name: "Пачка аспирина", qty: "1", note: "" },
];
const GEAR_STREET = [
  { name: "Отмычки", qty: "набор", note: "не спрашивайте" },
  { name: "Кремневый пистон", qty: "1", note: "" },
  { name: "Брелок с кубарем", qty: "1", note: "счастливый" },
  { name: "Кисет с табаком", qty: "1", note: "" },
];
const GEAR_SCHOLAR = [
  { name: "Толстый фолиант", qty: "1", note: "на латыни, страницы склеены" },
  { name: "Лупа", qty: "1", note: "" },
  { name: "Фотопластинки", qty: "3", note: "проявить не решаются" },
  { name: "Письмо от коллеги", qty: "1", note: "текст обрывается" },
];
const GEAR_WILD = [
  { name: "Полевая фляга", qty: "1", note: "почти полная" },
  { name: "Компас", qty: "1", note: "стрелка дрожит у старых стен" },
  { name: "Веревка", qty: "15 м", note: "" },
  { name: "Медкисет", qty: "1", note: "бинты, йод" },
  { name: "Спальник", qty: "1", note: "свернут в скатку" },
];

const MELEE_WEAPONS = [
  { name: "Тростник с набалдашником", damage: "1d6+БкУ" },
  { name: "Бейсбольная бита", damage: "1d6+БкУ" },
  { name: "Нож в голенище", damage: "1d4+БкУ" },
  { name: "Сапёрная лопатка", damage: "1d6+БкУ" },
  { name: "Гаечный ключ", damage: "1d6+БкУ" },
  { name: "Тяжёлая трость", damage: "1d6+БкУ" },
];

// ===== Возрастные правки (упрощённо по 7e) =====

function applyAgeMods(
  age: number,
  c: CocSheetData["characteristics"]
): void {
  if (age >= 40 && age <= 49) {
    c.str = Math.max(15, c.str - 5);
    c.con = Math.max(15, c.con - 5);
    c.dex = Math.max(15, c.dex - 5);
    c.edu += 5;
  } else if (age >= 50 && age <= 59) {
    c.str = Math.max(15, c.str - 10);
    c.con = Math.max(15, c.con - 10);
    c.dex = Math.max(15, c.dex - 10);
    c.edu += 10;
  } else if (age >= 60) {
    c.str = Math.max(15, c.str - 20);
    c.con = Math.max(15, c.con - 20);
    c.dex = Math.max(15, c.dex - 20);
    c.edu += 20;
  } else if (age <= 19) {
    c.str = Math.max(15, c.str - 5);
    c.siz = Math.max(15, c.siz - 5);
    c.edu = Math.max(15, c.edu - 5);
    c.luck += 5;
  }
  // Характеристика не может превышать 99 (правила 7e)
  for (const k of ["str", "con", "siz", "dex", "app", "int", "pow", "edu", "luck"] as const) {
    c[k] = Math.min(99, c[k]);
  }
}

// ===== Распределение очков =====

/** Разложить бюджет случайными порциями по списку навыков (в пределах бюджета). */
function spendBudgetRandom(
  sheet: CocSheetData,
  keys: string[],
  budget: number,
  kind: "occ" | "pers",
  minPortion: number,
  maxPortion: number
): number {
  const pool = [...keys];
  let left = budget;
  while (pool.length > 0 && left > 0) {
    // берём случайный навык из пула
    const idx = Math.floor(Math.random() * pool.length);
    const key = pool.splice(idx, 1)[0];
    const st = sheet.skills.find((s) => s.key === key);
    if (!st) continue;
    const portion = Math.min(left, int(minPortion, maxPortion));
    st[kind] = (st[kind] || 0) + portion;
    left -= portion;
  }
  return left;
}

// ===== Главный генератор =====

/** Собрать цельного случайного сыщика по правилам 7e. */
export function buildRandomSheet(): CocSheetData {
  const male = Math.random() < 0.5;
  const first = male ? pick(NAMES_M) : pick(NAMES_F);
  const nick = Math.random() < 0.55 ? ` «${pick(NICKNAMES)}»` : "";
  const surname = pick(SURNAMES);
  const name = `${first}${nick} ${surname}`;

  const age = int(19, 57);
  const sex = male ? "М" : "Ж";

  const sheet = createEmptySheet(name);

  // Характеристики бросками
  const c = sheet.characteristics;
  c.str = roll3d6x5();
  c.con = roll3d6x5();
  c.siz = roll2d6p6x5();
  c.dex = roll3d6x5();
  c.app = roll3d6x5();
  c.int = roll2d6p6x5();
  c.pow = roll3d6x5();
  c.edu = roll2d6p6x5();
  c.luck = roll3d6x5();
  applyAgeMods(age, c);

  sheet.info = {
    ...sheet.info,
    age: String(age),
    sex,
    residence: pick(RESIDENCES),
    birthplace: pick(BIRTHPLACES),
  };

  // Профессия: ~35% лавкрафтовская, иначе любая
  const lovecraft = OCCUPATIONS.filter((o) => o.lovecraft);
  const occ = Math.random() < 0.35 ? pick(lovecraft) : pick(OCCUPATIONS);
  sheet.info.occupation = occ.id;

  // Случайная ветка формулы, если есть выбор
  const choiceMatch = occ.formula.match(/\(([A-Z|]+)\)/);
  sheet.occupationChoice = choiceMatch
    ? pick(choiceMatch[1].split("|"))
    : "";

  // Отметить профессиональные навыки
  for (const s of sheet.skills) {
    if (occ.skills.includes(s.key || "")) s.isOccupation = true;
  }

  // Очки профессии: случайно порциями; если списка профессии не хватило —
  // остаток уходит случайным навыкам личной специализации (правила 7e это позволяют)
  const occBudget = occupationPoints(sheet);
  const occLeft = spendBudgetRandom(sheet, [...occ.skills], occBudget, "occ", 25, 70);
  if (occLeft > 0) {
    const fallback = SKILL_LIBRARY.map((s) => s.id).filter(
      (id) => !occ.skills.includes(id) &&
        !["cthulhuMythos", "creditRating"].includes(id)
    );
    spendBudgetRandom(sheet, fallback, occLeft, "occ", 20, 45);
  }

  // Личные очки (ИНТ×2): из «авантюристского» пула, тоже до конца
  const persPool = [
    "spotHidden", "listen", "psychology", "stealth", "firstAid",
    "driveAuto", "climb", "dodge", "firearmHandgun", "libraryUse",
    "creditRating", "swim", "jump", "track", "orientate", "sleight",
  ];
  const persBudget = Math.max(0, c.int * 2);
  spendBudgetRandom(sheet, persPool, persBudget, "pers", 20, 50);

  // Оружие: по навыкам профессии
  const weapons: CocSheetData["weapons"] = [];
  if (occ.skills.includes("firearmRifle")) {
    weapons.push({
      id: uid(),
      name: pick(["Винтовка Спрингфилд M1903", "Винтовка Ли-Энфилд", "Карабин Винчестер"]),
      skillKey: "firearmRifle",
      customRegular: "", autoRegular: true,
      damage: "2d6+БкУ", range: "100 м", attacks: "1/2", ammo: "50", malfunction: "100",
    });
  }
  if (occ.skills.includes("firearmHandgun") || Math.random() < 0.5) {
    weapons.push({
      id: uid(),
      name: pick(["Револьвер 38-го калибра", "Кольт M1911", "Револьвер 32-го калибра", "Смит-Вессон .38"]),
      skillKey: "firearmHandgun",
      customRegular: "", autoRegular: true,
      damage: "1d10+БкУ", range: "15 м", attacks: "1/3", ammo: String(pick([6, 7, 8])), malfunction: "100",
    });
  }
  const melee = pick(MELEE_WEAPONS);
  weapons.push({
    id: uid(),
    name: melee.name,
    skillKey: "fighting",
    customRegular: "", autoRegular: true,
    damage: melee.damage, range: "—", attacks: "1", ammo: "-", malfunction: "—",
  });
  sheet.weapons = weapons;

  // Снаряжение: 2 универсальных + 2 тематических
  const theme =
    occ.skills.includes("libraryUse") || occ.skills.includes("occult")
      ? GEAR_SCHOLAR
      : occ.skills.includes("firearmRifle") || occ.skills.includes("survival")
        ? GEAR_WILD
        : GEAR_STREET;
  const gearPool = [...GEAR_UNIVERSAL];
  const gearPicks: typeof GEAR_UNIVERSAL = [];
  for (let i = 0; i < 2; i++) {
    gearPicks.push(...gearPool.splice(Math.floor(Math.random() * gearPool.length), 1));
  }
  const themeCopy = [...theme];
  for (let i = 0; i < 2; i++) {
    gearPicks.push(...themeCopy.splice(Math.floor(Math.random() * themeCopy.length), 1));
  }
  sheet.gear = gearPicks.map((g) => ({ id: uid(), ...g }));

  // Финансы: из диапазона Средств профессии («9–30» → карман $2–20)
  const creditMatch = occ.credit.match(/(\d+)[–-](\d+)/);
  const creditLow = creditMatch ? parseInt(creditMatch[1], 10) : 9;
  const creditHigh = creditMatch ? parseInt(creditMatch[2], 10) : 40;
  const cash = int(creditLow, creditHigh);
  sheet.finance = {
    pocket: `$${int(1, Math.max(3, Math.floor(creditHigh / 10)))}`,
    cash: `$${cash}`,
    assets: `$${cash * int(4, 12)}`,
  };

  // Биография
  sheet.bio = {
    ...sheet.bio,
    description: `${pick(BIO_DESC_1)}; ${pick(BIO_DESC_2)}.`,
    traits: pick(BIO_TRAITS),
    ideals: pick(BIO_IDEALS),
    significant: pick(BIO_SIGNIFICANT),
  };

  return sheet;
}
