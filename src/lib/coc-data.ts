// ============================================================
// «Зов Ктулху» — данные правил (7-я редакция, русское издание)
// Отдельная вселенная: никак не связана с D&D-логикой сайта.
// ============================================================

export interface CocInfo {
  name: string;
  player: string;
  occupation: string; // id профессии из OCCUPATIONS или "" 
  age: string;
  sex: string;
  residence: string;
  birthplace: string;
  portrait: string;      // dataURL (до 480px)
  portraitThumb: string; // dataURL (96px) — для карточек архива
}

export interface CocCharacteristics {
  str: number; // СИЛ
  con: number; // ВЫН (телосложение-выносливость)
  siz: number; // ТЕЛ (габариты)
  dex: number; // ЛВК
  app: number; // НАР
  int: number; // ИНТ
  pow: number; // МОЩ
  edu: number; // ОБР
  luck: number; // Удача
}

export interface CocSkillState {
  key: string | null; // id из SKILL_LIBRARY или null для кастомного
  name: string;
  spec?: string;  // конкретика группового навыка: «рисование», «немецкий»…
  base?: number; // база кастомного навыка (для библиотечных считается из правил)
  occ: number;    // очки профессии
  pers: number;   // личные очки (ИНТ×2)
  improv: number; // развитие (проверки развития / стаж)
  isOccupation: boolean; // специализация: очки профессии вкладываются только в такие навыки
  upgraded?: boolean;    // пометка прокачки: навык пройден — на следующей арке будет прокачан
}

export interface CocWeapon {
  id: string;
  name: string;
  skillKey: string | null; // связь с навыком для авторасчёта
  customRegular: string;   // если задано — перекрывает авторасчёт (число или формул типа "1d3+БкУ")
  autoRegular: boolean;    // считать Обычн/Трудн/Чрезвыч из навыка
  damage: string;
  range: string;
  attacks: string;
  ammo: string;
  malfunction: string;
}

export interface CocGearItem {
  id: string;
  name: string;
  qty: string;
  note: string;
}

export interface CocNote {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

/** Запись в журнале потерь рассудка. */
export interface CocSanLogEntry {
  id: string;
  date: string;   // ISO-строка
  loss: number;   // сколько потеряно
  context: string; // источник (например "0/1" или заметка)
}

export interface CocFinance {
  pocket: string;
  cash: string;
  assets: string;
}

export interface CocBio {
  description: string;
  traits: string;
  ideals: string;
  scars: string;      // травмы и шрамы
  significant: string; // значимые люди
  phobias: string;    // фобии и мании
  places: string;     // важные места
  tomes: string;      // магические книги, заклинания, артефакты
  valuables: string;  // ценное имущество
  encounters: string; // встречи со сверхъестественным
}

export interface CocTrackers {
  hpCurrent: number | null;
  hpBonus: number;    // ручная правка максимума (+1/-1)
  mpCurrent: number | null;
  mpBonus: number;
  sanCurrent: number | null;
  luckCurrent: number | null;
  lastSanLoss: number; // последняя единовременная потеря рассудка (для безумия)
  inspiration?: number; // счётчик Вдохновений — ведёт сам сыщик (крит. успех 01 даёт ✦)
}

export interface CocSheetData {
  version: 1;
  info: CocInfo;
  characteristics: CocCharacteristics;
  occupationChoice: string; // выбранная ветка формулы профессии (если есть выбор)
  skills: CocSkillState[];
  weapons: CocWeapon[];
  gear: CocGearItem[];
  finance: CocFinance;
  bio: CocBio;
  trackers: CocTrackers;
  notes: CocNote[];
  sanLog?: CocSanLogEntry[]; // журнал потерь рассудка (опционально — старые листы без него)
}

export const MAX_SHEETS = 5;

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function createEmptySkills(): CocSkillState[] {
  return SKILL_LIBRARY.map((s) => ({
    key: s.id,
    name: s.name,
    occ: 0,
    pers: 0,
    improv: 0,
    isOccupation: false,
  }));
}

export function createEmptySheet(name = "Новый сыщик"): CocSheetData {
  return {
    version: 1,
    info: {
      name,
      player: "",
      occupation: "",
      age: "",
      sex: "",
      residence: "",
      birthplace: "",
      portrait: "",
      portraitThumb: "",
    },
    characteristics: {
      str: 0, con: 0, siz: 0, dex: 0, app: 0, int: 0, pow: 0, edu: 0, luck: 0,
    },
    occupationChoice: "",
    skills: createEmptySkills(),
    weapons: [
      {
        id: uid(),
        name: "Без оружия",
        skillKey: "fighting",
        customRegular: "",
        autoRegular: true,
        damage: "1d3 + БкУ",
        range: "-",
        attacks: "1",
        ammo: "-",
        malfunction: "-",
      },
    ],
    gear: [],
    finance: { pocket: "", cash: "", assets: "" },
    bio: {
      description: "", traits: "", ideals: "", scars: "", significant: "",
      phobias: "", places: "", tomes: "", valuables: "", encounters: "",
    },
    trackers: {
      hpCurrent: null, hpBonus: 0,
      mpCurrent: null, mpBonus: 0,
      sanCurrent: null, luckCurrent: null,
      lastSanLoss: 0,
      inspiration: 0,
    },
    notes: [],
    sanLog: [],
  };
}

/** Мягкая нормализация данных из БД (обратная совместимость). */
export function normalizeSheet(raw: any): CocSheetData {
  const base = createEmptySheet();
  if (!raw || typeof raw !== "object") return base;
  const skills: CocSkillState[] = Array.isArray(raw.skills) ? raw.skills : base.skills;
  // гарантируем наличие всех библиотечных навыков
  for (const lib of SKILL_LIBRARY) {
    const owned = skills.find((s) => s.key === lib.id);
    if (!owned) {
      skills.push({ key: lib.id, name: lib.name, occ: 0, pers: 0, improv: 0, isOccupation: false });
    } else if (owned.name !== lib.name) {
      // имя подтягиваем из библиотеки (ключ — личность; имя — только отображение),
      // чтобы переименования вроде «Ис-во/ремесло» → «Искусство/ремесло» доезжали до старых дел
      owned.name = lib.name;
    }
  }
  return {
    version: 1,
    info: { ...base.info, ...(raw.info || {}) },
    characteristics: { ...base.characteristics, ...(raw.characteristics || {}) },
    occupationChoice: raw.occupationChoice ?? "",
    skills,
    weapons: Array.isArray(raw.weapons) ? raw.weapons : base.weapons,
    gear: Array.isArray(raw.gear) ? raw.gear : [],
    finance: { ...base.finance, ...(raw.finance || {}) },
    bio: { ...base.bio, ...(raw.bio || {}) },
    trackers: { ...base.trackers, ...(raw.trackers || {}) },
    notes: Array.isArray(raw.notes) ? raw.notes : [],
    sanLog: Array.isArray(raw.sanLog) ? raw.sanLog : [],
  };
}

// ===== Характеристики =====

export interface CharMeta {
  id: keyof CocCharacteristics;
  label: string;   // русское название
  short: string;   // аббревиатура листа
  hint: string;    // формула генерации (3d6×5 и т.п.)
}

export const CHARACTERISTICS: CharMeta[] = [
  { id: "str", label: "Сила", short: "СИЛ", hint: "3d6×5" },
  { id: "con", label: "Выносливость", short: "ВЫН", hint: "3d6×5" },
  { id: "siz", label: "Телосложение", short: "ТЕЛ", hint: "(2d6+6)×5" },
  { id: "dex", label: "Ловкость", short: "ЛВК", hint: "3d6×5" },
  { id: "app", label: "Внешность", short: "НАР", hint: "3d6×5" },
  { id: "int", label: "Интеллект", short: "ИНТ", hint: "(2d6+6)×5" },
  { id: "pow", label: "Мощь", short: "МОЩ", hint: "3d6×5" },
  { id: "edu", label: "Образование", short: "ОБР", hint: "(2d6+6)×5" },
];

export const LUCK_META: CharMeta = { id: "luck", label: "Удача", short: "УДЧ", hint: "3d6×5" };

// ===== Навыки (базовые значения из листа сыщика 1920-х) =====

export interface SkillDef {
  id: string;
  name: string;
  base: number | "dodge" | "langOwn" | "credit"; // динамика: ½ ЛВК, ОБР, 0
  column: 1 | 2 | 3 | 4; // колонка листа (для порядка вывода)
}

export const SKILL_LIBRARY: SkillDef[] = [
  { id: "anthropology", name: "Антропология", base: 1, column: 1 },
  { id: "archaeology", name: "Археология", base: 1, column: 1 },
  { id: "fighting", name: "Ближний бой (драка)", base: 25, column: 1 },
  { id: "accounting", name: "Бухгалтерское дело", base: 5, column: 1 },
  { id: "ride", name: "Верховая езда", base: 5, column: 1 },
  { id: "locksmith", name: "Взлом", base: 1, column: 1 },
  { id: "spotHidden", name: "Внимание", base: 25, column: 1 },
  { id: "driveAuto", name: "Вождение", base: 20, column: 1 },
  { id: "survival", name: "Выживание", base: 10, column: 1 },
  { id: "naturalWorld", name: "Естествознание", base: 10, column: 1 },
  { id: "intimidate", name: "Запугивание", base: 15, column: 1 },
  { id: "artCraft", name: "Искусство/ремесло", base: 5, column: 1 },

  { id: "history", name: "История", base: 5, column: 2 },
  { id: "fastTalk", name: "Красноречие", base: 5, column: 2 },
  { id: "climb", name: "Лазание", base: 20, column: 2 },
  { id: "sleight", name: "Ловкость рук", base: 10, column: 2 },
  { id: "disguise", name: "Маскировка", base: 5, column: 2 },
  { id: "medicine", name: "Медицина", base: 1, column: 2 },
  { id: "throw", name: "Метание", base: 20, column: 2 },
  { id: "mechRepair", name: "Механика", base: 10, column: 2 },
  { id: "cthulhuMythos", name: "Мифы Ктулху", base: 0, column: 2 },
  { id: "science", name: "Наука", base: 1, column: 2 },
  { id: "charm", name: "Обаяние", base: 15, column: 2 },
  { id: "occult", name: "Оккультизм", base: 5, column: 2 },
  { id: "orientate", name: "Ориентирование", base: 10, column: 2 },

  { id: "appraise", name: "Оценка", base: 5, column: 3 },
  { id: "firstAid", name: "Перв. помощь", base: 30, column: 3 },
  { id: "pilot", name: "Пилотирование", base: 1, column: 3 },
  { id: "swim", name: "Плавание", base: 20, column: 3 },
  { id: "jump", name: "Прыжки", base: 20, column: 3 },
  { id: "psychoanalysis", name: "Психоанализ", base: 1, column: 3 },
  { id: "psychology", name: "Психология", base: 10, column: 3 },
  { id: "libraryUse", name: "Работа в библиотеке", base: 20, column: 3 },
  { id: "stealth", name: "Скрытность", base: 20, column: 3 },
  { id: "listen", name: "Слух", base: 20, column: 3 },
  { id: "creditRating", name: "Средства", base: "credit", column: 3 },
  { id: "firearmHandgun", name: "Стрельба (пистолет)", base: 20, column: 3 },
  { id: "firearmRifle", name: "Стрельба (винт./дроб.)", base: 25, column: 3 },
  { id: "persuade", name: "Убеждение", base: 10, column: 3 },

  { id: "dodge", name: "Уклонение (½ ЛВК)", base: "dodge", column: 4 },
  { id: "heavyMachines", name: "Упр. тяжёлыми машинами", base: 1, column: 4 },
  { id: "track", name: "Чтение следов", base: 10, column: 4 },
  { id: "electrical", name: "Электрика", base: 10, column: 4 },
  { id: "law", name: "Юриспруденция", base: 5, column: 4 },
  { id: "langForeign", name: "Язык иностранный", base: 1, column: 4 },
  { id: "langOwn", name: "Язык родной (ОБР)", base: "langOwn", column: 4 },
];

/** Групповые навыки, у которых в режиме прокачки можно уточнить конкретику
 *  («Искусство/ремесло — рисование», «Язык родной — немецкий»). */
export const SPEC_SKILL_HINTS: Record<string, string> = {
  artCraft: "рисование, шитьё, столярное дело…",
  langOwn: "немецкий, английский…",
  langForeign: "латынь, французский…",
};

/** Полное имя навыка для отображения и печати результата броска. */
export function skillDisplayName(s: Pick<CocSkillState, "name" | "spec">): string {
  const spec = s.spec?.trim();
  return spec ? `${s.name} · ${spec}` : s.name;
}

// ===== Профессии (род занятий) из «Краткого руководства по созданию персонажа» =====
// Формула: сегменты через « + », выбор через «(A|B)», множитель «*N».
// skills — предлагаемые профессиональные навыки (id библиотеки).

export interface OccupationDef {
  id: string;
  name: string;
  lovecraft?: boolean; // «лавкрафтовская» профессия
  formula: string;
  credit: string;      // диапазон Средств
  skills: string[];    // предлагаемые навыки
  specHint?: string;   // подсказка про навыки личной специализации
}

export const OCCUPATIONS: OccupationDef[] = [
  { id: "acrobat", name: "Акробат", formula: "EDU*2+DEX*2", credit: "9–20", skills: ["climb", "dodge", "jump", "throw", "spotHidden", "swim"], specHint: "+ любые 2 навыка личной специализации" },
  { id: "actor-movie", name: "Актёр (кинозвезда)", formula: "EDU*2+APP*2", credit: "20–90", skills: ["artCraft", "disguise", "driveAuto", "fastTalk", "charm", "intimidate", "persuade", "psychology"], specHint: "+ любые 2 навыка личной специализации" },
  { id: "actor-theatre", name: "Актёр (театр)", formula: "EDU*2+APP*2", credit: "9–40", skills: ["artCraft", "disguise", "fighting", "history", "fastTalk", "charm", "intimidate", "persuade", "psychology"], specHint: "+ любой навык личной специализации" },
  { id: "alienist", name: "Алиенист", formula: "EDU*4", credit: "10–60", skills: ["law", "listen", "medicine", "langForeign", "psychology", "psychoanalysis", "science"] },
  { id: "alpinist", name: "Альпинист", formula: "EDU*2+(STR|DEX)*2", credit: "30–60", skills: ["climb", "firstAid", "jump", "listen", "orientate", "langForeign", "survival", "track"] },
  { id: "antiquarian", name: "Антиквар", lovecraft: true, formula: "EDU*4", credit: "30–70", skills: ["appraise", "artCraft", "history", "libraryUse", "langForeign", "fastTalk", "charm", "intimidate", "persuade", "spotHidden"], specHint: "+ любой навык личной специализации" },
  { id: "artist", name: "Артист", formula: "EDU*2+APP*2", credit: "9–70", skills: ["artCraft", "disguise", "fastTalk", "charm", "intimidate", "persuade", "listen", "psychology"], specHint: "+ любые 2 навыка личной специализации" },
  { id: "archaeologist", name: "Археолог", formula: "EDU*4", credit: "10–40", skills: ["appraise", "archaeology", "history", "langForeign", "libraryUse", "spotHidden", "mechRepair", "orientate", "science"] },
  { id: "architect", name: "Архитектор", formula: "EDU*4", credit: "30–70", skills: ["accounting", "artCraft", "law", "langForeign", "libraryUse", "persuade", "psychology", "science"] },
  { id: "athlete", name: "Атлет", formula: "EDU*2+(STR|DEX)*2", credit: "9–70", skills: ["climb", "jump", "fighting", "ride", "fastTalk", "charm", "intimidate", "persuade", "swim", "throw"], specHint: "+ любой навык личной специализации" },
  { id: "bartender", name: "Бармен", formula: "EDU*2+APP*2", credit: "8–25", skills: ["accounting", "fastTalk", "charm", "intimidate", "persuade", "fighting", "listen", "psychology", "spotHidden"], specHint: "+ любой навык личной специализации" },
  { id: "librarian", name: "Библиотекарь", lovecraft: true, formula: "EDU*4", credit: "9–35", skills: ["accounting", "libraryUse", "langForeign", "langOwn"], specHint: "+ четыре любых навыка личной специализации" },
  { id: "boxer", name: "Боксёр / борец", formula: "EDU*2+STR*2", credit: "9–60", skills: ["dodge", "fighting", "intimidate", "jump", "psychology", "spotHidden"], specHint: "+ любые 2 навыка личной специализации" },
  { id: "drifter", name: "Бродяга (дрифтер)", formula: "EDU*2+(STR|APP|DEX)*2", credit: "0–5", skills: ["climb", "jump", "listen", "orientate", "fastTalk", "charm", "intimidate", "persuade", "stealth"], specHint: "+ любые 2 навыка личной специализации" },
  { id: "accountant", name: "Бухгалтер", formula: "EDU*4", credit: "30–70", skills: ["accounting", "law", "libraryUse", "listen", "persuade", "spotHidden"], specHint: "+ любые 2 навыка личной специализации" },
  { id: "driver-general", name: "Водитель (общ.)", formula: "EDU*2+(STR|DEX)*2", credit: "9–20", skills: ["accounting", "driveAuto", "listen", "fastTalk", "charm", "intimidate", "persuade", "mechRepair", "orientate", "psychology"], specHint: "+ любой навык личной специализации" },
  { id: "driver-taxi", name: "Водитель: таксист", formula: "EDU*2+DEX*2", credit: "9–30", skills: ["accounting", "driveAuto", "electrical", "fastTalk", "mechRepair", "orientate", "spotHidden"], specHint: "+ любой навык личной специализации" },
  { id: "driver-chauffeur", name: "Водитель: шофёр", formula: "EDU*2+DEX*2", credit: "10–40", skills: ["driveAuto", "listen", "fastTalk", "charm", "intimidate", "persuade", "mechRepair", "orientate", "spotHidden"], specHint: "+ любой навык личной специализации" },
  { id: "diver", name: "Водолаз/ныряльщик", formula: "EDU*2+DEX*2", credit: "9–30", skills: ["swim", "firstAid", "mechRepair", "pilot", "science", "spotHidden"], specHint: "+ любой навык личной специализации" },
  { id: "doctor", name: "Врач", lovecraft: true, formula: "EDU*4", credit: "30–80", skills: ["firstAid", "medicine", "langForeign", "psychology", "science"], specHint: "+ любые 2 навыка личной специализации" },
  { id: "gangster-boss", name: "Гангстер: босс", formula: "EDU*2+APP*2", credit: "60–95", skills: ["fighting", "firearmHandgun", "law", "listen", "fastTalk", "charm", "intimidate", "persuade", "psychology", "stealth"] },
  { id: "gangster-soldier", name: "Гангстер: рядовой боец", formula: "EDU*2+(STR|DEX)*2", credit: "1–20", skills: ["driveAuto", "fighting", "firearmHandgun", "firearmRifle", "fastTalk", "charm", "intimidate", "persuade", "psychology"], specHint: "+ любые 2 навыка личной специализации" },
  { id: "cult-leader", name: "Глава культа", formula: "EDU*2+APP*2", credit: "30–60", skills: ["accounting", "fastTalk", "charm", "intimidate", "persuade", "occult", "psychology", "spotHidden"], specHint: "+ любые 2 навыка личной специализации" },
  { id: "undertaker", name: "Гробовщик", formula: "EDU*4", credit: "20–40", skills: ["accounting", "driveAuto", "fastTalk", "charm", "intimidate", "persuade", "history", "occult", "psychology", "science"] },
  { id: "butler", name: "Дворецкий / камердинер", formula: "EDU*4", credit: "9–40", skills: ["accounting", "appraise", "artCraft", "firstAid", "listen", "langForeign", "psychology", "spotHidden"], specHint: "+ любые 2 навыка личной специализации" },
  { id: "detective-agency", name: "Детектив: сотрудник агентства", formula: "EDU*2+(STR|DEX)*2", credit: "20–45", skills: ["fastTalk", "charm", "intimidate", "persuade", "fighting", "firearmHandgun", "law", "libraryUse", "psychology", "stealth", "track"] },
  { id: "detective-private", name: "Детектив: частный сыщик", formula: "EDU*2+(STR|DEX)*2", credit: "9–30", skills: ["artCraft", "disguise", "law", "libraryUse", "fastTalk", "charm", "intimidate", "persuade", "psychology", "spotHidden"], specHint: "+ любой навык личной специализации (напр. Взлом, Ближний бой, Стрельба)" },
  { id: "gentleman", name: "Джентльмен", formula: "EDU*2+APP*2", credit: "40–90", skills: ["artCraft", "fastTalk", "charm", "intimidate", "persuade", "firearmRifle", "history", "langForeign", "orientate", "ride"] },
  { id: "designer", name: "Дизайнер", formula: "EDU*4", credit: "20–60", skills: ["accounting", "artCraft", "libraryUse", "mechRepair", "psychology", "spotHidden"], specHint: "+ любой навык личной специализации" },
  { id: "savage", name: "Дикарь, член племени", formula: "EDU*2+(STR|DEX)*2", credit: "0–15", skills: ["climb", "fighting", "throw", "listen", "naturalWorld", "occult", "spotHidden", "swim", "survival"] },
  { id: "dilettante", name: "Дилетант", lovecraft: true, formula: "EDU*2+APP*2", credit: "50–99", skills: ["artCraft", "firearmHandgun", "firearmRifle", "langForeign", "ride", "fastTalk", "charm", "intimidate", "persuade"], specHint: "+ любые 3 навыка личной специализации" },
  { id: "trainer", name: "Дрессировщик", formula: "EDU*2+(APP|POW)*2", credit: "10–40", skills: ["jump", "listen", "naturalWorld", "psychology", "science", "stealth", "track"], specHint: "+ любой навык личной специализации" },
  { id: "journalist-invest", name: "Журналист (расследования)", lovecraft: true, formula: "EDU*4", credit: "9–30", skills: ["artCraft", "fastTalk", "charm", "intimidate", "persuade", "history", "libraryUse", "langOwn", "psychology"], specHint: "+ любые 2 навыка личной специализации" },
  { id: "journalist-reporter", name: "Журналист (репортёр)", formula: "EDU*4", credit: "9–30", skills: ["artCraft", "history", "listen", "langOwn", "fastTalk", "charm", "intimidate", "persuade", "psychology", "stealth", "spotHidden"] },
  { id: "foreign-correspondent", name: "Заграничный корреспондент", formula: "EDU*4", credit: "10–40", skills: ["history", "langForeign", "listen", "fastTalk", "charm", "intimidate", "persuade", "psychology"], specHint: "+ любой навык личной специализации" },
  { id: "gambler", name: "Игрок", formula: "EDU*2+(APP|DEX)*2", credit: "8–50", skills: ["accounting", "artCraft", "fastTalk", "charm", "intimidate", "persuade", "listen", "psychology", "sleight", "spotHidden"] },
  { id: "engineer", name: "Инженер", formula: "EDU*4", credit: "30–60", skills: ["artCraft", "electrical", "libraryUse", "mechRepair", "heavyMachines", "science"], specHint: "+ любой навык личной специализации" },
  { id: "explorer", name: "Исследователь-путешественник", formula: "EDU*2+(STR|APP|DEX)*2", credit: "55–80", skills: ["climb", "swim", "firearmHandgun", "firearmRifle", "history", "jump", "naturalWorld", "orientate", "langForeign", "survival"] },
  { id: "stuntman", name: "Каскадёр", formula: "EDU*2+(STR|DEX)*2", credit: "10–50", skills: ["climb", "dodge", "electrical", "mechRepair", "fighting", "firstAid", "jump", "swim", "driveAuto", "pilot", "ride"] },
  { id: "bookseller", name: "Книготорговец", formula: "EDU*4", credit: "20–40", skills: ["accounting", "appraise", "driveAuto", "history", "libraryUse", "langOwn", "langForeign", "fastTalk", "charm", "intimidate", "persuade"] },
  { id: "cowboy", name: "Ковбой", formula: "EDU*2+(STR|DEX)*2", credit: "9–20", skills: ["dodge", "fighting", "firearmHandgun", "firearmRifle", "firstAid", "naturalWorld", "jump", "ride", "survival", "throw", "track"] },
  { id: "salesman", name: "Коммивояжер", formula: "EDU*2+APP*2", credit: "9–40", skills: ["accounting", "fastTalk", "charm", "intimidate", "persuade", "driveAuto", "listen", "psychology", "stealth", "sleight"] },
  { id: "lab-assistant", name: "Лаборант", formula: "EDU*4", credit: "10–30", skills: ["libraryUse", "electrical", "langForeign", "science", "spotHidden"], specHint: "+ любой навык личной специализации" },
  { id: "shopkeeper", name: "Лавочник", formula: "EDU*2+(APP|DEX)*2", credit: "20–40", skills: ["accounting", "fastTalk", "charm", "intimidate", "persuade", "electrical", "listen", "mechRepair", "psychology", "spotHidden"] },
  { id: "gangster-mistress", name: "Любовница гангстера", formula: "EDU*2+APP*2", credit: "10–80", skills: ["artCraft", "fastTalk", "charm", "intimidate", "persuade", "fighting", "firearmHandgun", "driveAuto", "listen", "stealth"], specHint: "+ любой навык личной специализации" },
  { id: "nurse", name: "Медсестра / сиделка", formula: "EDU*4", credit: "9–30", skills: ["firstAid", "listen", "medicine", "fastTalk", "charm", "intimidate", "persuade", "psychology", "science", "spotHidden"] },
  { id: "mechanic", name: "Механик", formula: "EDU*4", credit: "9–40", skills: ["artCraft", "climb", "driveAuto", "electrical", "mechRepair", "heavyMachines"], specHint: "+ любые 2 навыка личной специализации" },
  { id: "missionary", name: "Миссионер", formula: "EDU*2+APP*2", credit: "0–30", skills: ["artCraft", "firstAid", "mechRepair", "medicine", "naturalWorld", "fastTalk", "charm", "intimidate", "persuade"], specHint: "+ любые 2 навыка личной специализации" },
  { id: "sailor-navy", name: "Моряк: военный флот", formula: "EDU*2+(STR|DEX)*2", credit: "9–30", skills: ["electrical", "mechRepair", "fighting", "firearmHandgun", "firearmRifle", "firstAid", "orientate", "pilot", "survival", "swim"] },
  { id: "sailor-merchant", name: "Моряк: торговый флот", formula: "EDU*2+(STR|DEX)*2", credit: "20–40", skills: ["firstAid", "mechRepair", "naturalWorld", "orientate", "fastTalk", "charm", "intimidate", "persuade", "pilot", "spotHidden", "swim"] },
  { id: "museum-worker", name: "Музейный работник", formula: "EDU*4", credit: "10–30", skills: ["accounting", "appraise", "archaeology", "history", "libraryUse", "occult", "langForeign", "spotHidden"] },
  { id: "musician", name: "Музыкант", formula: "EDU*2+(APP|DEX)*2", credit: "9–30", skills: ["artCraft", "fastTalk", "charm", "intimidate", "persuade", "listen", "psychology"], specHint: "+ любые четыре других навыка" },
  { id: "occultist", name: "Оккультист", lovecraft: true, formula: "EDU*4", credit: "9–65", skills: ["anthropology", "history", "libraryUse", "fastTalk", "charm", "intimidate", "persuade", "occult", "langForeign", "science"], specHint: "+ любой навык личной специализации (по согласованию с Хранителем — не более 10% Мифов Ктулху)" },
  { id: "clerk", name: "Офисный работник: клерк", formula: "EDU*4", credit: "9–20", skills: ["accounting", "langForeign", "libraryUse", "listen", "fastTalk", "charm", "intimidate", "persuade"], specHint: "+ любые 2 навыка личной специализации" },
  { id: "manager", name: "Офисный работник: менеджер", formula: "EDU*4", credit: "20–80", skills: ["accounting", "langForeign", "fastTalk", "charm", "intimidate", "persuade", "psychology"], specHint: "+ любые 2 навыка личной специализации" },
  { id: "officer", name: "Офицер", formula: "EDU*2+(STR|DEX)*2", credit: "20–70", skills: ["accounting", "firearmHandgun", "firearmRifle", "orientate", "firstAid", "fastTalk", "charm", "intimidate", "persuade", "psychology"], specHint: "+ любой другой навык личной специализации" },
  { id: "waitress", name: "Официантка", formula: "EDU*2+(APP|DEX)*2", credit: "9–30", skills: ["accounting", "artCraft", "dodge", "listen", "fastTalk", "charm", "intimidate", "persuade", "psychology"], specHint: "+ любой навык личной специализации" },
  { id: "bounty-hunter", name: "Охотник за наградами", formula: "EDU*2+(STR|DEX)*2", credit: "9–30", skills: ["driveAuto", "electrical", "fighting", "firearmHandgun", "firearmRifle", "fastTalk", "charm", "intimidate", "persuade", "law", "psychology", "track", "stealth"] },
  { id: "big-game-hunter", name: "Охотник на крупную дичь", formula: "EDU*2+(STR|DEX)*2", credit: "20–50", skills: ["firearmHandgun", "firearmRifle", "listen", "spotHidden", "naturalWorld", "orientate", "langForeign", "survival", "science", "stealth", "track"] },
  { id: "parapsychologist", name: "Парапсихолог", formula: "EDU*4", credit: "9–30", skills: ["anthropology", "artCraft", "history", "libraryUse", "occult", "langForeign", "psychology"], specHint: "+ любой навык личной специализации" },
  { id: "pilot-private", name: "Пилот (частный)", formula: "EDU*2+DEX*2", credit: "20–70", skills: ["electrical", "mechRepair", "orientate", "heavyMachines", "pilot", "science"], specHint: "+ любые 2 навыка личной специализации" },
  { id: "pilot-aviation", name: "Пилот (авиация)", formula: "EDU*4", credit: "30–60", skills: ["accounting", "electrical", "listen", "mechRepair", "orientate", "pilot", "spotHidden"], specHint: "+ один навык личной специализации" },
  { id: "author", name: "Писатель", lovecraft: true, formula: "EDU*4", credit: "9–30", skills: ["artCraft", "history", "libraryUse", "naturalWorld", "occult", "langForeign", "langOwn", "psychology"], specHint: "+ любой навык личной специализации" },
  { id: "firefighter", name: "Пожарный", formula: "EDU*2+(STR|DEX)*2", credit: "9–30", skills: ["climb", "dodge", "driveAuto", "firstAid", "jump", "mechRepair", "heavyMachines", "throw"] },
  { id: "politician", name: "Политик", formula: "EDU*2+APP*2", credit: "50–90", skills: ["charm", "history", "intimidate", "fastTalk", "listen", "langOwn", "persuade", "psychology"] },
  { id: "police-detective", name: "Полицейский: следователь", lovecraft: true, formula: "EDU*2+(STR|DEX)*2", credit: "20–50", skills: ["artCraft", "disguise", "firearmHandgun", "firearmRifle", "law", "listen", "fastTalk", "charm", "intimidate", "persuade", "psychology", "spotHidden"], specHint: "+ один любой навык" },
  { id: "police-officer", name: "Полицейский: офицер полиции", formula: "EDU*2+(STR|DEX)*2", credit: "9–30", skills: ["fighting", "firearmHandgun", "firearmRifle", "firstAid", "fastTalk", "charm", "intimidate", "persuade", "law", "psychology", "spotHidden", "driveAuto", "ride"] },
  { id: "criminal-bootlegger", name: "Преступник: бутлеггер", formula: "EDU*2+STR*2", credit: "5–30", skills: ["driveAuto", "fighting", "firearmHandgun", "firearmRifle", "fastTalk", "charm", "intimidate", "persuade", "psychology", "stealth", "spotHidden"] },
  { id: "criminal-burglar", name: "Преступник: вор-взломщик", formula: "EDU*2+STR*2", credit: "5–40", skills: ["appraise", "climb", "electrical", "mechRepair", "listen", "locksmith", "sleight", "stealth", "spotHidden"] },
  { id: "criminal-bankrobber", name: "Преступник: грабитель банков", formula: "EDU*2+(STR|DEX)*2", credit: "5–75", skills: ["driveAuto", "electrical", "mechRepair", "fighting", "firearmHandgun", "firearmRifle", "intimidate", "locksmith", "heavyMachines"], specHint: "+ любой навык личной специализации" },
  { id: "criminal-smuggler", name: "Преступник: контрабандист", formula: "EDU*2+(APP|DEX)*2", credit: "20–40", skills: ["firearmHandgun", "firearmRifle", "listen", "orientate", "fastTalk", "charm", "intimidate", "persuade", "driveAuto", "pilot", "psychology", "sleight", "stealth"] },
  { id: "criminal-conman", name: "Преступник: мошенник/аферист", formula: "EDU*2+APP*2", credit: "10–65", skills: ["appraise", "artCraft", "law", "langForeign", "listen", "fastTalk", "charm", "intimidate", "persuade", "psychology", "sleight"] },
  { id: "criminal-hitman", name: "Преступник: наёмный убийца", formula: "EDU*2+(STR|DEX)*2", credit: "30–60", skills: ["disguise", "electrical", "fighting", "firearmHandgun", "firearmRifle", "locksmith", "mechRepair", "stealth", "psychology"] },
  { id: "criminal-fence", name: "Преступник: скупщик краденого", formula: "EDU*2+APP*2", credit: "20–40", skills: ["accounting", "appraise", "artCraft", "history", "fastTalk", "charm", "intimidate", "persuade", "libraryUse", "spotHidden"], specHint: "+ любой навык личной специализации" },
  { id: "criminal-counterfeiter", name: "Преступник: фальшивомонетчик", formula: "EDU*4", credit: "20–60", skills: ["accounting", "appraise", "artCraft", "history", "libraryUse", "spotHidden", "sleight"], specHint: "+ любой навык личной специализации" },
  { id: "criminal-goon", name: "Преступник: шпана", formula: "EDU*2+(STR|DEX)*2", credit: "3–10", skills: ["climb", "fastTalk", "charm", "intimidate", "persuade", "fighting", "firearmHandgun", "firearmRifle", "jump", "sleight", "stealth", "throw"] },
  { id: "prostitute", name: "Проститутка", formula: "EDU*2+APP*2", credit: "5–50", skills: ["artCraft", "fastTalk", "charm", "intimidate", "persuade", "dodge", "psychology", "sleight", "stealth"], specHint: "+ любой навык личной специализации" },
  { id: "professor", name: "Профессор", lovecraft: true, formula: "EDU*4", credit: "20–70", skills: ["libraryUse", "langForeign", "langOwn", "psychology"], specHint: "+ любые четыре навыка академической или личной специализации" },
  { id: "union-activist", name: "Профсоюзный активист", formula: "EDU*4", credit: "5–30", skills: ["accounting", "fastTalk", "charm", "intimidate", "persuade", "fighting", "law", "listen", "heavyMachines", "psychology"] },
  { id: "psychiatrist", name: "Психиатр", formula: "EDU*4", credit: "30–80", skills: ["langForeign", "listen", "medicine", "persuade", "psychoanalysis", "psychology", "science"] },
  { id: "psychologist", name: "Психолог/психоаналитик", formula: "EDU*4", credit: "10–40", skills: ["accounting", "libraryUse", "listen", "persuade", "psychoanalysis", "psychology"], specHint: "+ любые 2 навыка личной специализации" },
  { id: "zoo-worker", name: "Работник зоопарка", formula: "EDU*4", credit: "9–35", skills: ["artCraft", "accounting", "dodge", "firstAid", "naturalWorld", "medicine", "science"] },
  { id: "lumberjack", name: "Рабочий: лесоруб", formula: "EDU*2+(STR|DEX)*2", credit: "9–30", skills: ["climb", "dodge", "fighting", "firstAid", "jump", "mechRepair", "naturalWorld", "science", "throw"] },
  { id: "laborer", name: "Рабочий: неквалифицированный", formula: "EDU*2+(STR|DEX)*2", credit: "9–30", skills: ["driveAuto", "electrical", "fighting", "firstAid", "mechRepair", "heavyMachines", "throw"], specHint: "+ любой навык личной специализации" },
  { id: "miner", name: "Рабочий: шахтёр", formula: "EDU*2+(STR|DEX)*2", credit: "9–30", skills: ["climb", "science", "jump", "mechRepair", "heavyMachines", "stealth", "spotHidden"], specHint: "+ любой навык личной специализации" },
  { id: "editor", name: "Редактор", formula: "EDU*4", credit: "10–30", skills: ["accounting", "history", "langOwn", "fastTalk", "charm", "intimidate", "persuade", "psychology", "spotHidden"], specHint: "+ любой навык личной специализации" },
  { id: "craftsman", name: "Ремесленник", formula: "EDU*2+DEX*2", credit: "10–40", skills: ["accounting", "artCraft", "mechRepair", "naturalWorld", "spotHidden"], specHint: "+ любые 2 навыка личной специализации" },
  { id: "orderly", name: "Санитар", formula: "EDU*2+STR*2", credit: "6–15", skills: ["electrical", "fastTalk", "charm", "intimidate", "persuade", "fighting", "firstAid", "listen", "mechRepair", "psychology", "stealth"] },
  { id: "asylum-orderly", name: "Санитар псих.лечебницы", formula: "EDU*2+(STR|DEX)*2", credit: "8–20", skills: ["dodge", "fighting", "firstAid", "fastTalk", "charm", "intimidate", "persuade", "listen", "psychology", "stealth"] },
  { id: "clergy", name: "Священнослужитель", formula: "EDU*4", credit: "9–60", skills: ["accounting", "history", "libraryUse", "listen", "langForeign", "fastTalk", "charm", "intimidate", "persuade", "psychology"], specHint: "+ любой другой навык" },
  { id: "secretary", name: "Секретарь", formula: "EDU*2+(STR|DEX)*2", credit: "9–30", skills: ["accounting", "artCraft", "fastTalk", "charm", "intimidate", "persuade", "langOwn", "langForeign", "libraryUse", "psychology"], specHint: "+ любой навык личной специализации" },
  { id: "soldier", name: "Солдат/матрос", formula: "EDU*2+(STR|DEX)*2", credit: "9–30", skills: ["climb", "swim", "dodge", "fighting", "firearmHandgun", "firearmRifle", "stealth", "firstAid", "mechRepair", "langForeign"] },
  { id: "prospector", name: "Старатель", formula: "EDU*2+(STR|DEX)*2", credit: "0–10", skills: ["climb", "firstAid", "history", "mechRepair", "orientate", "science", "spotHidden"], specHint: "+ любой навык личной специализации" },
  { id: "student", name: "Студент", formula: "EDU*4", credit: "5–10", skills: ["langForeign", "libraryUse", "listen"], specHint: "+ три навыка направления обучения и два любых навыка личной специализации" },
  { id: "forensic", name: "Судмедэксперт", formula: "EDU*4", credit: "40–60", skills: ["langForeign", "libraryUse", "medicine", "persuade", "science", "spotHidden"] },
  { id: "judge", name: "Судья", formula: "EDU*4", credit: "50–80", skills: ["history", "intimidate", "law", "libraryUse", "listen", "langOwn", "persuade", "psychology"] },
  { id: "antique-dealer", name: "Торговец антиквариатом", formula: "EDU*4", credit: "30–50", skills: ["accounting", "appraise", "driveAuto", "fastTalk", "charm", "intimidate", "persuade", "history", "libraryUse", "orientate"] },
  { id: "tourist", name: "Турист", formula: "EDU*2+(STR|DEX)*2", credit: "5–20", skills: ["firearmHandgun", "firearmRifle", "firstAid", "listen", "naturalWorld", "orientate", "spotHidden", "survival", "track"] },
  { id: "scientist", name: "Учёный", formula: "EDU*4", credit: "9–50", skills: ["science", "libraryUse", "langForeign", "langOwn", "fastTalk", "charm", "intimidate", "persuade", "spotHidden"], specHint: "+ любые три навыка научной специализации" },
  { id: "fanatic", name: "Фанатик", formula: "EDU*2+(APP|POW)*2", credit: "0–30", skills: ["history", "fastTalk", "charm", "intimidate", "persuade", "psychology", "stealth"], specHint: "+ любые три навыка личной специализации" },
  { id: "pharmacist", name: "Фармацевт", formula: "EDU*4", credit: "20–35", skills: ["accounting", "firstAid", "langForeign", "libraryUse", "fastTalk", "charm", "intimidate", "persuade", "psychology", "science"] },
  { id: "federal-agent", name: "Федеральный агент", formula: "EDU*4", credit: "20–40", skills: ["driveAuto", "fighting", "firearmHandgun", "firearmRifle", "law", "persuade", "stealth", "spotHidden"], specHint: "+ любой навык личной специализации" },
  { id: "farmer", name: "Фермер", formula: "EDU*2+(STR|DEX)*2", credit: "9–30", skills: ["artCraft", "driveAuto", "fastTalk", "charm", "intimidate", "persuade", "mechRepair", "naturalWorld", "heavyMachines", "track"], specHint: "+ один навык личной специализации" },
  { id: "flapper", name: "Флэппер", formula: "EDU*2+APP*2", credit: "10–30", skills: ["artCraft", "driveAuto", "fastTalk", "charm", "intimidate", "persuade", "psychology"], specHint: "+ любые три навыка личной специализации" },
  { id: "photographer", name: "Фотограф", formula: "EDU*4", credit: "9–30", skills: ["artCraft", "fastTalk", "charm", "intimidate", "persuade", "psychology", "science", "stealth", "spotHidden"], specHint: "+ любые 2 навыка личной специализации" },
  { id: "photojournalist", name: "Фотограф: фотожурналист", formula: "EDU*4", credit: "10–30", skills: ["artCraft", "climb", "fastTalk", "charm", "intimidate", "persuade", "langForeign", "psychology", "science"], specHint: "+ любые 2 навыка личной специализации" },
  { id: "hobo", name: "Хобо", formula: "EDU*2+(APP|DEX)*2", credit: "0–5", skills: ["artCraft", "climb", "jump", "listen", "locksmith", "sleight", "orientate", "stealth"], specHint: "+ любой навык личной специализации" },
  { id: "painter", name: "Художник", formula: "EDU*2+(DEX|POW)*2", credit: "9–50", skills: ["artCraft", "history", "naturalWorld", "fastTalk", "charm", "intimidate", "persuade", "langForeign", "psychology", "spotHidden"], specHint: "+ два любых навыка личной специализации" },
  { id: "spy", name: "Шпион", formula: "EDU*2+(APP|DEX)*2", credit: "20–60", skills: ["artCraft", "disguise", "firearmHandgun", "firearmRifle", "listen", "langForeign", "fastTalk", "charm", "intimidate", "persuade", "psychology", "sleight", "stealth"] },
  { id: "lawyer", name: "Юрист", formula: "EDU*4", credit: "30–80", skills: ["accounting", "law", "libraryUse", "fastTalk", "charm", "intimidate", "persuade", "psychology"], specHint: "+ любые 2 навыка личной специализации" },
];

// ===== Таблица Бонуса урона / Комплекции (СИЛ + ТЕЛ) =====

export function damageBonus(str: number, siz: number): { db: string; build: number } {
  const sum = (str || 0) + (siz || 0);
  if (sum <= 64) return { db: "-2", build: -2 };
  if (sum <= 84) return { db: "-1", build: -1 };
  if (sum <= 124) return { db: "0", build: 0 };
  if (sum <= 164) return { db: "+1d4", build: 1 };
  if (sum <= 204) return { db: "+1d6", build: 2 };
  return { db: "+2d6", build: 3 };
}

// ===== Финансы (по Средствам) =====

export function financeByCredit(credit: number): { level: string; pocket: string; cash: string; assets: string } {
  const c = credit || 0;
  if (c === 0) return { level: "Без гроша", pocket: "$0.50", cash: "$0.50", assets: "Нет" };
  if (c <= 9) return { level: "Бедный", pocket: "$2", cash: "$(Средства)", assets: "$(Средства)×10" };
  if (c <= 49) return { level: "Среднего достатка", pocket: "$10", cash: "$(Средства)×2", assets: "$(Средства)×50" };
  if (c <= 89) return { level: "Состоятельный", pocket: "$50", cash: "$(Средства)×5", assets: "$(Средства)×500" };
  if (c <= 98) return { level: "Богатый", pocket: "$250", cash: "$(Средства)×20", assets: "$(Средства)×2000" };
  return { level: "Сверхбогатый", pocket: "$5000", cash: "$50.000", assets: "$5.000.000+" };
}
