// ============================================================
// «Зов Ктулху» — автоматические подсчёты по правилам 7-й редакции
// ============================================================

import {
  CocSheetData,
  CocSkillState,
  OCCUPATIONS,
  SKILL_LIBRARY,
  damageBonus,
} from "./coc-data";

export interface DerivedStats {
  hpMax: number;        // ПЗ = (ВЫН + ТЕЛ) / 10
  mpMax: number;        // ПМ = 1/5 МОЩ
  sanStart: number;     // Рассудок стартовый = МОЩ
  sanMax: number;       // 99
  mov: number;          // Скорость
  db: string;           // Бонус к урону
  build: number;        // Комплекция
  dodgeBase: number;    // Уклонение базовое = ½ ЛВК
  langOwnBase: number; // Родной язык = ОБР
  ageBand: string;      // возрастная группа (для подсказок)
  eduChecks: number;    // сколько проверок улучшения ОБР положено
  movPenalty: number;   // штраф скорости от возраста
  ageHint: string;      // текстовая подсказка по возрастным поправкам
}

const clampStat = (n: unknown) => Math.max(0, Math.min(99, Math.floor(Number(n) || 0)));

export function deriveStats(sheet: CocSheetData): DerivedStats {
  const c = sheet.characteristics;
  const str = clampStat(c.str), con = clampStat(c.con), siz = clampStat(c.siz);
  const dex = clampStat(c.dex), pow = clampStat(c.pow), edu = clampStat(c.edu);

  const hpMax = Math.floor((con + siz) / 10);
  const mpMax = Math.floor(pow / 5);
  const sanStart = pow;

  // Скорость по правилам + возрастной штраф
  let base = 8;
  if (dex < siz && str < siz) base = 7;
  else if (dex > siz && str > siz) base = 9;

  const age = parseInt(sheet.info.age, 10) || 0;
  let movPenalty = 0;
  let eduChecks = 0;
  let ageBand = "20–39";
  let ageHint = "";
  if (age > 0 && age < 15) { ageBand = "<15"; ageHint = "Слишком юн для сыщика — уточните возраст."; }
  if (age >= 15 && age <= 19) {
    ageBand = "15–19"; movPenalty = 0; eduChecks = 0;
    ageHint = "−5 к СИЛ, ЛВК, ОБР (внесите вручную). Сделайте второй бросок Удачи и выберите лучшее значение.";
  } else if (age >= 20 && age <= 39) {
    ageBand = "20–39"; eduChecks = 1;
    ageHint = "Сделайте 1 проверку улучшения ОБР (кнопка d100 рядом с ОБР).";
  } else if (age >= 40 && age <= 49) {
    ageBand = "40–49"; movPenalty = 1; eduChecks = 2;
    ageHint = "−5 суммарно к СИЛ/ЛВК/ВЫН; −5 к НАР (вручную). 2 проверки улучшения ОБР.";
  } else if (age >= 50 && age <= 59) {
    ageBand = "50–59"; movPenalty = 2; eduChecks = 3;
    ageHint = "−10 суммарно к СИЛ/ЛВК/ВЫН; −10 к НАР (вручную). 3 проверки улучшения ОБР.";
  } else if (age >= 60 && age <= 69) {
    ageBand = "60–69"; movPenalty = 3; eduChecks = 4;
    ageHint = "−20 суммарно к СИЛ/ЛВК/ВЫН; −15 к НАР (вручную). 4 проверки улучшения ОБР.";
  } else if (age >= 70 && age <= 79) {
    ageBand = "70–79"; movPenalty = 4; eduChecks = 4;
    ageHint = "−40 суммарно к СИЛ/ЛВК/ВЫН; −20 к НАР (вручную). 4 проверки улучшения ОБР.";
  } else if (age >= 80) {
    ageBand = "80+"; movPenalty = 5; eduChecks = 4;
    ageHint = "−80 суммарно к СИЛ/ЛВК/ВЫН; −25 к НАР (вручную). 4 проверки улучшения ОБР.";
  }

  const { db, build } = damageBonus(str, siz);

  return {
    hpMax,
    mpMax,
    sanStart,
    sanMax: 99,
    mov: Math.max(1, base - movPenalty),
    db,
    build,
    dodgeBase: Math.floor(dex / 2),
    langOwnBase: edu,
    ageBand,
    eduChecks,
    movPenalty,
    ageHint,
  };
}

/** Базовое значение навыка (с учётом динамики ½ ЛВК, ОБР; кастомные — своё поле base). */
export function skillBase(state: CocSkillState): number {
  if (state.key === null) return Math.max(0, Math.min(99, Math.floor(state.base || 0)));
  const def = SKILL_LIBRARY.find((s) => s.id === state.key);
  if (!def) return Math.max(0, Math.min(99, Math.floor(state.base || 0)));
  if (def.base === "dodge") return Math.floor(clampStatCache.dex / 2);
  if (def.base === "langOwn") return clampStatCache.edu;
  if (def.base === "credit") return 0;
  return def.base as number;
}

// Мостик для динамики баз (заполняется setSkillContext перед рендером)
let clampStatCache = { dex: 0, edu: 0 };
export function setSkillContext(dex: number, edu: number) {
  clampStatCache = { dex: clampStat(dex), edu: clampStat(edu) };
}

/** Итоговое значение навыка: база + проф. + личные + развитие. */
export function skillTotal(state: CocSkillState): number {
  return skillBase(state) + (state.occ || 0) + (state.pers || 0) + (state.improv || 0);
}

/** Значение для проверки: cap 99 для навыков, кроме Мифов Ктулху (cap 99 тоже). */
export function skillCheckValue(state: CocSkillState): number {
  return Math.min(99, skillTotal(state));
}

// ===== Очки профессии и личные очки =====

/** Разбор формулы профессии с учётом выбранной ветки. */
export function occupationPoints(sheet: CocSheetData): number {
  const occ = OCCUPATIONS.find((o) => o.id === sheet.info.occupation);
  if (!occ) return 0;
  let formula = occ.formula;
  // Подстановка выбора (STR|DEX) → выбранная характеристика
  formula = formula.replace(/\(([A-Z|]+)\)/g, (_m, group: string) => {
    const opts = group.split("|");
    const chosen = sheet.occupationChoice && opts.includes(sheet.occupationChoice)
      ? sheet.occupationChoice
      : opts[0];
    return chosen;
  });
  const c = sheet.characteristics;
  const statMap: Record<string, number> = {
    STR: clampStat(c.str), CON: clampStat(c.con), SIZ: clampStat(c.siz),
    DEX: clampStat(c.dex), APP: clampStat(c.app), INT: clampStat(c.int),
    POW: clampStat(c.pow), EDU: clampStat(c.edu),
  };
  let total = 0;
  for (const seg of formula.split("+")) {
    const m = seg.trim().match(/^([A-Z]+)\*(\d+)$/);
    if (!m) continue;
    total += (statMap[m[1]] || 0) * parseInt(m[2], 10);
  }
  return total;
}

/** Есть ли в формуле выбор характеристики. */
export function occupationChoiceStats(sheet: CocSheetData): string[] | null {
  const occ = OCCUPATIONS.find((o) => o.id === sheet.info.occupation);
  if (!occ) return null;
  const m = occ.formula.match(/\(([A-Z|]+)\)/);
  return m ? m[1].split("|") : null;
}

/** Потрачено профессиональных очков. */
export function occupationSpent(sheet: CocSheetData): number {
  return sheet.skills
    .filter((s) => s.isOccupation && s.key !== "creditRating")
    .reduce((sum, s) => sum + (s.occ || 0), 0);
}

/** Личные очки = ИНТ × 2; потрачено — по полю pers. */
export function personalTotal(sheet: CocSheetData): number {
  return clampStat(sheet.characteristics.int) * 2;
}

export function personalSpent(sheet: CocSheetData): number {
  return sheet.skills.reduce((sum, s) => sum + (s.pers || 0), 0);
}

// ===== Броски =====

export function rollD100(): number {
  return 1 + Math.floor(Math.random() * 100);
}

export type CheckLevel = "critical" | "extreme" | "hard" | "regular" | "fail" | "fumble";

/** Уровень успеха проверки d100 по правилам CoC 7e. */
export function checkLevel(roll: number, skill: number): CheckLevel {
  if (roll === 1) return "critical";
  if (roll === 100) return "fumble";
  if (roll <= Math.floor(skill / 5)) return "extreme";
  if (roll <= Math.floor(skill / 2)) return "hard";
  if (roll <= skill) return "regular";
  if (skill < 50 && roll >= 96) return "fumble";
  return "fail";
}

export const CHECK_LEVEL_RU: Record<CheckLevel, string> = {
  critical: "Критический успех!",
  extreme: "Чрезвычайный успех",
  hard: "Трудный успех",
  regular: "Обычный успех",
  fail: "Провал",
  fumble: "Крах!",
};

/** Автозаполнение денег по Средствам. */
export function financeSuggestion(credit: number) {
  const c = credit || 0;
  if (c === 0) return { pocket: "$0.50", cash: "$0.50", assets: "Нет" };
  if (c <= 9) return { pocket: "$2", cash: `$${c}`, assets: `$${c * 10}` };
  if (c <= 49) return { pocket: "$10", cash: `$${c * 2}`, assets: `$${c * 50}` };
  if (c <= 89) return { pocket: "$50", cash: `$${c * 5}`, assets: `$${c * 500}` };
  if (c <= 98) return { pocket: "$250", cash: `$${c * 20}`, assets: `$${c * 2000}` };
  return { pocket: "$5000", cash: "$50.000", assets: "$5.000.000+" };
}

// ===== Безумие (по правилам) =====

export interface InsanityInsight {
  indefinite: boolean;   // суммарные потери ≥ 1/5 стартового рассудка
  temporary: boolean;    // последняя единовременная потеря ≥ 5
  indefiniteThreshold: number;
  totalLost: number;
}

export function insanityInsight(sanStart: number, sanCurrent: number, lastSanLoss: number): InsanityInsight {
  const start = Math.max(0, sanStart);
  const totalLost = Math.max(0, start - Math.max(0, sanCurrent));
  const indefiniteThreshold = Math.floor(start / 5);
  return {
    indefinite: start > 0 && totalLost >= indefiniteThreshold && indefiniteThreshold > 0,
    temporary: lastSanLoss >= 5,
    indefiniteThreshold,
    totalLost,
  };
}

/** Проверка развития навыка/ОБР: успех, если d100 > текущее значение. Возвращает прибавку 1d10. */
export function improvementCheck(current: number): { roll: number; success: boolean; gain: number } {
  const roll = rollD100();
  const success = roll > current;
  const gain = success ? 1 + Math.floor(Math.random() * 10) : 0;
  return { roll, success, gain };
}
