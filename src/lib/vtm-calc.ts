// ============================================================
// «ВАМПИРЫ: МАСКАРАД» (5 ред.) — автоматические подсчёты листа.
// ============================================================

import { VtmSheetData, VtmSkillState, bloodPotencyByGeneration, BLOOD_POTENCY_TABLE, CLAN_BY_ID, ADVANTAGE_LIBRARY, ADVANTAGE_BY_ID } from "./vtm-data";

export interface DerivedStats {
  healthMax: number;    // Здоровье = Выносливость + 3
  wpMax: number;        // Воля = Самообладание + Упорство
  bp: number;           // Сила Крови по поколению
  bpRow: (typeof BLOOD_POTENCY_TABLE)[number]; // строка таблицы Силы Крови
  attrTotal: number;    // всего очков характеристик
  attrBudget: number;   // бюджет характеристик по правилам (4/3/2 + 9 базовых)
  attrDelta: number;    // превышение/недобор бюджета
  skillTotal: number;   // всего очков навыков
  clanName: string;     // имя клана
  clanDisciplines: string[]; // клановые Дисциплины
  backgroundPoints: number;  // очки фактов биографии
  meritPoints: number;  // очки достоинств
  flawPoints: number;   // очки недостатков
  humanityTotal: number; // Человечность с учётом пятен
  baneSeverity: number; // тяжесть изъяна (по Силе Крови)
}

const clampAttr = (n: unknown) => Math.max(0, Math.min(5, Math.floor(Number(n) || 0)));

/** Сила Крови листа: по поколению, но если игрок уже повысил её вручную (трек в tracker-поле bpOverride) — берём большее. */
export function deriveStats(sheet: VtmSheetData): DerivedStats {
  const a = sheet.attributes;
  const str = clampAttr(a.str), dex = clampAttr(a.dex), sta = clampAttr(a.sta);
  const cha = clampAttr(a.cha), man = clampAttr(a.man), com = clampAttr(a.com);
  const int = clampAttr(a.int), wit = clampAttr(a.wit), res = clampAttr(a.res);

  const healthMax = sta + 3;
  const wpMax = com + res;

  const bp = bloodPotencyByGeneration(sheet.info.generation || 13);
  const bpRow = BLOOD_POTENCY_TABLE[Math.min(bp, BLOOD_POTENCY_TABLE.length - 1)];

  const attrTotal = str + dex + sta + cha + man + com + int + wit + res;
  // Бюджет по правилам (стр. 137 русского издания): одна 4, три по 3, четыре по 2, одна 1 → 22 очка
  const attrBudget = 22;

  const skillTotal = sheet.skills.reduce((sum, s) => sum + clampAttr(s.value), 0);

  const clan = CLAN_BY_ID.get(sheet.info.clan);

  const backgroundPoints = sheet.advantages
    .filter((x) => x.kind === "background")
    .reduce((sum, x) => sum + x.rating, 0);
  // Достоинства/недостатки: цена = уровень × цену за уровень (из каталога);
  // свои записи без цены считаются по уровню.
  const advPoints = (kind: "merit" | "flaw") =>
    sheet.advantages
      .filter((x) => x.kind === kind)
      .reduce((sum, x) => {
        const byName = ADVANTAGE_LIBRARY.find((d) => d.name === x.name);
        const def = byName || (ADVANTAGE_BY_ID.get(x.name) as typeof byName);
        const cost = def?.cost;
        return sum + (cost ? x.rating * cost : x.rating);
      }, 0);
  const meritPoints = advPoints("merit");
  const flawPoints = advPoints("flaw");

  const humanityTotal = Math.max(0, sheet.trackers.humanity - sheet.trackers.stains);

  return {
    healthMax,
    wpMax,
    bp,
    bpRow,
    attrTotal,
    attrBudget,
    attrDelta: attrTotal - attrBudget,
    skillTotal,
    clanName: clan?.name || "—",
    clanDisciplines: clan?.disciplines || [],
    backgroundPoints,
    meritPoints,
    flawPoints,
    humanityTotal,
    baneSeverity: bpRow.baneSeverity,
  };
}

/** Итог навыка с учётом специализации (для печати пулов в подсказках). */
export function skillPool(sheet: VtmSheetData, attrKey: keyof VtmSheetData["attributes"], skill: VtmSkillState | undefined): number {
  if (!skill) return clampAttr(sheet.attributes[attrKey]);
  return clampAttr(sheet.attributes[attrKey]) + clampAttr(skill.value);
}

/** Поиск состояния навыка по id библиотеки или имени. */
export function findSkill(sheet: VtmSheetData, keyOrName: string): VtmSkillState | undefined {
  return (
    sheet.skills.find((s) => s.key === keyOrName) ||
    sheet.skills.find((s) => s.name.toLowerCase() === keyOrName.toLowerCase())
  );
}

/** Краткий журнал: добавить бросок (максимум 60 записей). */
export function pushRoll(sheet: VtmSheetData, text: string): void {
  sheet.rollLog = [
    { id: `roll-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`, text, ts: new Date().toISOString() },
    ...sheet.rollLog,
  ].slice(0, 60);
}

/** Формула уровня Силы Крови — автоподсказка при выборе поколения. */
export function bpHint(generation: number): string {
  const bp = bloodPotencyByGeneration(generation || 13);
  if (bp === 0) return "Сила Крови 0 — слабокровный";
  return `Сила Крови ${bp}`;
}
