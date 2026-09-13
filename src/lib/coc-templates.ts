// ============================================================
// «Зов Ктулху» — готовые сыщики для быстрого старта.
// Каждая заготовка — цельный лист по правилам 7e: характеристики,
// профессия с предвложенными очками, оружие, снаряжение и биография.
// Модуль чистый (без React) — используется и на сервере (API), и на клиенте.
// ============================================================

import {
  CocSheetData,
  CocWeapon,
  OCCUPATIONS,
  createEmptySheet,
  uid,
} from "@/lib/coc-data";
import { occupationPoints } from "@/lib/coc-calc";

export interface CocTemplateSkillSpend {
  key: string;   // id из SKILL_LIBRARY
  occ?: number;  // предвложенные очки профессии
  pers?: number; // предвложенные личные очки (ИНТ×2)
}

export interface CocTemplateDef {
  id: string;
  name: string;        // имя сыщика по умолчанию (название дела)
  title: string;       // короткое имя шаблона для карточки
  tagline: string;     // одна строка атмосферы для карточки
  occupation: string;  // id профессии из OCCUPATIONS
  occupationChoice: string; // ветка формулы (если есть выбор: STR|DEX и т.п.)
  age: string;
  sex: string;
  residence: string;
  birthplace: string;
  characteristics: {
    str: number; con: number; siz: number; dex: number;
    app: number; int: number; pow: number; edu: number; luck: number;
  };
  skills: CocTemplateSkillSpend[];
  weapons: Omit<CocWeapon, "id">[];
  gear: { name: string; qty: string; note: string }[];
  finance: { pocket: string; cash: string; assets: string };
  bio: {
    description: string;
    traits: string;
    ideals: string;
    significant: string;
  };
}

export const COC_TEMPLATES: CocTemplateDef[] = [
  {
    id: "veteran",
    name: "Джеймс «Сержант» Коллинз",
    title: "Ветеран войны",
    tagline: "Аргон-Форест научил его молчать и целиться.",
    occupation: "soldier",
    occupationChoice: "STR",
    age: "38",
    sex: "М",
    residence: "Аркхэм, Массачусетс",
    birthplace: "Бостон, Массачусетс",
    characteristics: { str: 70, con: 65, siz: 70, dex: 55, app: 45, int: 65, pow: 60, edu: 50, luck: 50 },
    skills: [
      { key: "firearmRifle", occ: 45 },
      { key: "firearmHandgun", occ: 40 },
      { key: "fighting", occ: 30 },
      { key: "firstAid", occ: 30 },
      { key: "stealth", occ: 25 },
      { key: "dodge", occ: 20 },
      { key: "mechRepair", occ: 20 },
      { key: "climb", occ: 15 },
      { key: "swim", occ: 10 },
      { key: "langForeign", occ: 5 },
      { key: "spotHidden", pers: 30 },
      { key: "psychology", pers: 20 },
      { key: "driveAuto", pers: 20 },
      { key: "listen", pers: 20 },
      { key: "intimidate", pers: 15 },
      { key: "creditRating", pers: 15 },
      { key: "ride", pers: 10 },
    ],
    weapons: [
      { name: "Винтовка Спрингфилд M1903", skillKey: "firearmRifle", customRegular: "", autoRegular: true, damage: "2d6+БкУ", range: "100 м", attacks: "1/2", ammo: "50", malfunction: "100" },
      { name: "Кольт M1911", skillKey: "firearmHandgun", customRegular: "", autoRegular: true, damage: "1d10+БкУ", range: "15 м", attacks: "1/3", ammo: "7", malfunction: "100" },
      { name: "Окопная лопата", skillKey: "fighting", customRegular: "", autoRegular: true, damage: "1d6+БкУ", range: "—", attacks: "1", ammo: "-", malfunction: "—" },
    ],
    gear: [
      { name: "Полевая фляга", qty: "1", note: "почти полная" },
      { name: "Компас", qty: "1", note: "" },
      { name: "Спички", qty: "1 коробок", note: "" },
      { name: "Медкисет", qty: "1", note: "бинты, йод" },
    ],
    finance: { pocket: "$5", cash: "$100", assets: "$500" },
    bio: {
      description: "Крепко сбит, шрам через левую бровь. Говорит тихо и по делу; военная выправка не покидает его и в гражданском пальто.",
      traits: "Верен слову, не терпит паники, прячет кошмары за скупой усмешкой.",
      ideals: "«Мы выжили не для того, чтобы молчать».",
      significant: "Сержант Дэниел Хейз — не вернулся из Франции; снился каждую ночь первый год.",
    },
  },
  {
    id: "professor",
    name: "Гарольд Уэйкрофт",
    title: "Профессор",
    tagline: "Университет Мискатоник. Кафедра древних языков.",
    occupation: "professor",
    occupationChoice: "",
    age: "54",
    sex: "М",
    residence: "Арканза, Массачусетс",
    birthplace: "Кембридж, Массачусетс",
    characteristics: { str: 45, con: 50, siz: 60, dex: 50, app: 55, int: 75, pow: 70, edu: 85, luck: 45 },
    skills: [
      { key: "libraryUse", occ: 60 },
      { key: "langForeign", occ: 40 },
      { key: "langOwn", occ: 30 },
      { key: "psychology", occ: 30 },
      { key: "history", occ: 40 },
      { key: "science", occ: 40 },
      { key: "archaeology", occ: 40 },
      { key: "occult", occ: 30 },
      { key: "anthropology", occ: 20 },
      { key: "law", occ: 10 },
      { key: "spotHidden", pers: 30 },
      { key: "listen", pers: 25 },
      { key: "creditRating", pers: 30 },
      { key: "firstAid", pers: 15 },
      { key: "artCraft", pers: 20 },
      { key: "persuade", pers: 30 },
    ],
    weapons: [
      { name: "Тростник с набалдашником", skillKey: "fighting", customRegular: "", autoRegular: true, damage: "1d6+БкУ", range: "—", attacks: "1", ammo: "-", malfunction: "—" },
      { name: "Револьвер 38-го калибра", skillKey: "firearmHandgun", customRegular: "", autoRegular: true, damage: "1d10+БкУ", range: "15 м", attacks: "1/3", ammo: "6", malfunction: "100" },
    ],
    gear: [
      { name: "Записная книжка в кожаной обложке", qty: "1", note: "шифрованные заметки" },
      { name: "Лупа", qty: "1", note: "" },
      { name: "Словарь латыни", qty: "1", note: "потрёпан" },
      { name: "Фонарик электрический", qty: "1", note: "батареек на час" },
    ],
    finance: { pocket: "$50", cash: "$170", assets: "$1.700" },
    bio: {
      description: "Седеющие виски, очки в роговой оправе, пиджак с вкраплениями мела. Пальцы в чернильных пятнах.",
      traits: "Непримирим к невежеству; забывает есть, увлёкшись рукописью.",
      ideals: "«Истина страшнее незнания — и всё же предпочтительнее».",
      significant: "Сноха? Нет — ассистентка Элиза Пибоди; единственная, кто верит его письмам.",
    },
  },
  {
    id: "journalist",
    name: "Эвелин «Эйс» Морган",
    title: "Журналист",
    tagline: "Её пишущая машинка не боится ни банд, ни культа.",
    occupation: "journalist-invest",
    occupationChoice: "",
    age: "29",
    sex: "Ж",
    residence: "Бостон, Массачусетс",
    birthplace: "Нью-Йорк, Нью-Йорк",
    characteristics: { str: 50, con: 55, siz: 55, dex: 70, app: 70, int: 75, pow: 60, edu: 70, luck: 55 },
    skills: [
      { key: "fastTalk", occ: 40 },
      { key: "persuade", occ: 30 },
      { key: "intimidate", occ: 20 },
      { key: "history", occ: 20 },
      { key: "libraryUse", occ: 40 },
      { key: "langOwn", occ: 30 },
      { key: "psychology", occ: 30 },
      { key: "artCraft", occ: 20 },
      { key: "charm", occ: 30 },
      { key: "spotHidden", occ: 20 },
      { key: "stealth", pers: 20 },
      { key: "driveAuto", pers: 25 },
      { key: "sleight", pers: 10 },
      { key: "listen", pers: 20 },
      { key: "creditRating", pers: 15 },
      { key: "firearmHandgun", pers: 30 },
      { key: "appraise", pers: 15 },
      { key: "disguise", pers: 15 },
    ],
    weapons: [
      { name: "Револьвер 38-го калибра", skillKey: "firearmHandgun", customRegular: "", autoRegular: true, damage: "1d10+БкУ", range: "15 м", attacks: "1/3", ammo: "6", malfunction: "100" },
      { name: "Бейсбольная бита", skillKey: "fighting", customRegular: "", autoRegular: true, damage: "1d6+БкУ", range: "—", attacks: "1", ammo: "-", malfunction: "—" },
    ],
    gear: [
      { name: "Камера «Кодак»", qty: "1", note: "3 пластинки" },
      { name: "Блокнот репортёра", qty: "2", note: "половина исписана" },
      { name: "Прессовое удостоверение", qty: "1", note: "«Бостон Глоуб» — просрочено" },
      { name: "Фляжка кофе", qty: "1", note: "" },
    ],
    finance: { pocket: "$10", cash: "$140", assets: "$700" },
    bio: {
      description: "Стрижка «под мальчика», красная помада, плащ с капюшоном. Всегда с блокнотом в кармане пальто.",
      traits: "Любопытство сильнее страха; цинична на словах, на деле — первая бежит на помощь.",
      ideals: "«Правда на первой полосе или никак».",
      significant: "Редактор Сэм Голдман — прикрывает её перед полицией. Пока прикрывает.",
    },
  },
  {
    id: "doctor",
    name: "Д-р Элизабет Крейн",
    title: "Врач",
    tagline: "Она видела, что вытаскивали из пациентов санитарии Аркхэма.",
    occupation: "doctor",
    occupationChoice: "",
    age: "41",
    sex: "Ж",
    residence: "Бостон, Массачусетс",
    birthplace: "Провиденс, Род-Айленд",
    characteristics: { str: 50, con: 60, siz: 60, dex: 60, app: 60, int: 70, pow: 65, edu: 90, luck: 50 },
    skills: [
      { key: "medicine", occ: 60 },
      { key: "firstAid", occ: 40 },
      { key: "science", occ: 40 },
      { key: "psychology", occ: 30 },
      { key: "psychoanalysis", occ: 30 },
      { key: "langForeign", occ: 30 },
      { key: "law", occ: 20 },
      { key: "libraryUse", occ: 40 },
      { key: "spotHidden", occ: 30 },
      { key: "listen", occ: 40 },
      { key: "driveAuto", pers: 20 },
      { key: "creditRating", pers: 30 },
      { key: "firearmHandgun", pers: 25 },
      { key: "persuade", pers: 25 },
      { key: "occult", pers: 10 },
      { key: "appraise", pers: 10 },
      { key: "charm", pers: 20 },
    ],
    weapons: [
      { name: "Скальпель", skillKey: "fighting", customRegular: "", autoRegular: true, damage: "1d4+БкУ", range: "—", attacks: "1", ammo: "-", malfunction: "—" },
      { name: "Револьвер 32-го калибра", skillKey: "firearmHandgun", customRegular: "", autoRegular: true, damage: "1d8+БкУ", range: "15 м", attacks: "1/3", ammo: "6", malfunction: "100" },
    ],
    gear: [
      { name: "Докторский саквояж", qty: "1", note: "стетоскоп, шприц, морфин" },
      { name: "Медицинский справочник", qty: "1", note: "" },
      { name: "Фонарик электрический", qty: "1", note: "" },
      { name: "Спирт медицинский", qty: "1 фл.", note: "" },
    ],
    finance: { pocket: "$50", cash: "$450", assets: "$4.500" },
    bio: {
      description: "Строгий пучок, круглые очки, рукава неизменно закатаны. Запах эфира и лаванды.",
      traits: "Спокойна там, где другие кричат; винит себя за смерть брата в пандемию.",
      ideals: "«Клятву дают один раз — соблюдают всю жизнь».",
      significant: "Кузен Ричард — пациент санатория; его «бредни» звучат слишком складно.",
    },
  },
  {
    id: "painter",
    name: "Себастьян Вэйл",
    title: "Художник",
    tagline: "Его последние пейзажи кто-то дорисовывал ночью.",
    occupation: "painter",
    occupationChoice: "POW",
    age: "27",
    sex: "М",
    residence: "Провиденс, Род-Айленд",
    birthplace: "Ньюпорт, Род-Айленд",
    characteristics: { str: 50, con: 55, siz: 55, dex: 65, app: 75, int: 75, pow: 75, edu: 60, luck: 60 },
    skills: [
      { key: "artCraft", occ: 75 },
      { key: "history", occ: 15 },
      { key: "naturalWorld", occ: 25 },
      { key: "fastTalk", occ: 25 },
      { key: "charm", occ: 30 },
      { key: "psychology", occ: 30 },
      { key: "spotHidden", occ: 30 },
      { key: "persuade", occ: 20 },
      { key: "langForeign", occ: 20 },
      { key: "occult", pers: 20 },
      { key: "stealth", pers: 25 },
      { key: "listen", pers: 25 },
      { key: "appraise", pers: 20 },
      { key: "creditRating", pers: 20 },
      { key: "firstAid", pers: 15 },
      { key: "psychoanalysis", pers: 10 },
      { key: "climb", pers: 15 },
    ],
    weapons: [
      { name: "Живописный резак", skillKey: "fighting", customRegular: "", autoRegular: true, damage: "1d4+БкУ", range: "—", attacks: "1", ammo: "-", malfunction: "—" },
    ],
    gear: [
      { name: "Складной мольберт", qty: "1", note: "" },
      { name: "Коробка красок", qty: "1", note: "свинцовые белила кончились" },
      { name: "Эскизный альбом", qty: "1", note: "последние страницы — не его рука" },
      { name: "Пропуск в музей", qty: "1", note: "" },
    ],
    finance: { pocket: "$10", cash: "$120", assets: "$600" },
    bio: {
      description: "Длинные пальцы в брызгах кадмия, шейный платок, рассеянный взгляд, что цепляется за тени.",
      traits: "Мечтателен, вспыльчив во имя красоты; записи ведёт стихами.",
      ideals: "«Красота — единственное, что стоит изображать. Даже если она такая».",
      significant: "Наставник Эдвард Пикман Делл — исчез, оставив ключ от мастерской.",
    },
  },
  {
    id: "occultist",
    name: "Альфред Трент",
    title: "Оккультист",
    tagline: "Знает, зачем в гримуарах нужны поля. Читал на них.",
    occupation: "occultist",
    occupationChoice: "",
    age: "47",
    sex: "М",
    residence: "Новый Орлеан, Луизиана",
    birthplace: "Сейлем, Массачусетс",
    characteristics: { str: 40, con: 55, siz: 60, dex: 50, app: 50, int: 85, pow: 80, edu: 80, luck: 40 },
    skills: [
      { key: "occult", occ: 70 },
      { key: "libraryUse", occ: 60 },
      { key: "langForeign", occ: 40 },
      { key: "history", occ: 30 },
      { key: "anthropology", occ: 20 },
      { key: "fastTalk", occ: 20 },
      { key: "charm", occ: 20 },
      { key: "intimidate", occ: 20 },
      { key: "persuade", occ: 20 },
      { key: "science", occ: 20 },
      { key: "psychology", pers: 30 },
      { key: "spotHidden", pers: 30 },
      { key: "listen", pers: 25 },
      { key: "cthulhuMythos", pers: 5 },
      { key: "creditRating", pers: 15 },
      { key: "stealth", pers: 20 },
      { key: "firstAid", pers: 15 },
      { key: "psychoanalysis", pers: 20 },
      { key: "driveAuto", pers: 10 },
    ],
    weapons: [
      { name: "Посох-шест", skillKey: "fighting", customRegular: "", autoRegular: true, damage: "1d6+БкУ", range: "—", attacks: "1", ammo: "-", malfunction: "—" },
    ],
    gear: [
      { name: "Гримуар в свиной коже", qty: "1", note: "без названия, страницы 77–88 вырезаны" },
      { name: "Мешочек с солью и травами", qty: "1", note: "" },
      { name: "Меловой круг (переносной)", qty: "1", note: "всё ещё пахнет гарью" },
      { name: "Таро", qty: "1 колода", note: "одна карта — не из колоды" },
    ],
    finance: { pocket: "$25", cash: "$160", assets: "$800" },
    bio: {
      description: "Сгорбленный, в длинном пальто не по погоде. Перстень с выцветшей гравировкой на левой руке.",
      traits: "Говорит загадками даже в очереди; боится полнолуния и признаётся в этом шуткой.",
      ideals: "«Знать — значит уже наполовину выжить».",
      significant: "Сестра Мэри — погибла в Сейлеме; её дневник до сих пор пишет письма почерком сестры.",
    },
  },
];

/** Собрать полный лист сыщика из шаблона (с безопасным распределением очков). */
export function buildTemplateSheet(templateId: string): CocSheetData | null {
  const t = COC_TEMPLATES.find((x) => x.id === templateId);
  if (!t) return null;

  const sheet = createEmptySheet(t.name);

  sheet.info = {
    ...sheet.info,
    occupation: t.occupation,
    age: t.age,
    sex: t.sex,
    residence: t.residence,
    birthplace: t.birthplace,
  };
  sheet.characteristics = { ...t.characteristics };
  sheet.occupationChoice = t.occupationChoice;

  // Автоотметка профессиональных навыков выбранной профессии
  const occDef = OCCUPATIONS.find((o) => o.id === t.occupation);
  if (occDef) {
    for (const s of sheet.skills) {
      if (occDef.skills.includes(s.key || "")) s.isOccupation = true;
    }
  }

  // Предвложенные очки — строго в рамках бюджетов (перебор невозможен)
  let occBudget = occupationPoints(sheet);
  let persBudget = Math.max(0, Math.floor(t.characteristics.int * 2));
  for (const sp of t.skills) {
    const st = sheet.skills.find((s) => s.key === sp.key);
    if (!st) continue;
    const occ = Math.min(Math.max(0, Math.floor(sp.occ || 0)), occBudget);
    const pers = Math.min(Math.max(0, Math.floor(sp.pers || 0)), persBudget);
    st.occ = occ;
    st.pers = pers;
    occBudget -= occ;
    persBudget -= pers;
  }

  sheet.weapons = t.weapons.map((w) => ({ id: uid(), ...w }));
  sheet.gear = t.gear.map((g) => ({ id: uid(), name: g.name, qty: g.qty, note: g.note }));
  sheet.finance = { ...t.finance };
  sheet.bio = { ...sheet.bio, ...t.bio };

  // Треки стартуют с максимумов (null = «показывай максимум»)
  return sheet;
}
