// ============================================================
// «ВЕРНУТЬ ИЗ ОБСИДИАНА» для Гароу — обратный разбор «Сводки Гароу» (W5).
// Парсер GFM-разметки, которую выдаёт buildW5SummaryMarkdown (vtm-w5-summary-md.ts).
// Изолированный модуль VtM-вселенной: ничего общего с D&D и «Зовом Ктулху».
//
// Правила вливания в лист (зеркало вампирского импорта):
//  · скалярные поля — перезаписываются, только если найдены в сводке;
//  · списки навыков / Даров / Обрядов / снаряжения / стремлений / касаний —
//    заменяются целиком, если секция присутствует и в ней есть хотя бы одна строка;
//  · записи лунного дневника — ДОБАВЛЯЮТСЯ сверху с дедупликацией по (дата+текст);
//  · портрет и предыстория из Markdown не приходят — они вне формата сводки.
// ============================================================

import {
  W5SheetData,
  W5Attributes,
  W5_TRIBES,
  W5_AUSPICES,
  W5_BREEDS,
  W5_FORMS,
  W5_FORM_BY_ID,
} from "./vtm-w5data";
import { SKILL_LIBRARY } from "./vtm-data";
import { vtmUid } from "./vtm-id";

// ---------- Типы результата ----------

export interface ParsedW5MdSheet {
  name?: string;
  concept?: string;
  chronicle?: string;
  pack?: string;
  totem?: string;
  tribe?: string;      // id племени
  auspice?: string;    // id ауспиции
  breed?: string;      // id породы
  activeForm?: string; // id облика («Облик дня»)
  quote?: string;
  attributes?: Partial<W5Attributes>;
  skills?: { id: string; value: number; spec: string }[];
  trackers?: {
    rage?: number;
    wolfLost?: boolean;
    harano?: boolean;
    healthSup?: number;
    healthAgg?: number;
    wpSup?: number;
    xp?: number;
    xpSpent?: number;
    glory?: number;
    honor?: number;
    wisdom?: number;
  };
  gifts?: { name: string; level: number; note: string }[];
  rites?: { name: string; level: number; note: string }[];
  aspirations?: string[];
  touchstones?: string[];
  gear?: { name: string; count: string; note: string }[];
  notes?: { title: string; content: string; date: string }[];
  xpLog?: { text: string; ts: string }[];
}

export interface W5MdParseResult {
  fields: ParsedW5MdSheet;
  /** Найденные группы полей — для превью в диалоге. */
  found: string[];
  /** Имена, не опознанные в справочниках (уйдут в лист как есть). */
  unknown: string[];
  /** Нестрогие предупреждения (пропуски, нераспознанные строки). */
  warnings: string[];
}

// ---------- Мелкие помощники ----------

const clamp05 = (n: unknown): number => Math.max(0, Math.min(5, Math.floor(Number(n) || 0)));

const stripBold = (s: string): string => s.replace(/\*\*/g, "").trim();
const stripItalic = (s: string): string => s.replace(/\*([^*]+)\*/g, "$1").trim();

/** Число заполненных точек ● в строке. */
const dotsFilled = (s: string): number => (s.match(/●/g) || []).length;

const ATTR_MAP: Record<string, keyof W5Attributes> = {
  "сила": "str", "ловкость": "dex", "стойкость": "sta",
  "обаяние": "cha", "манипуляция": "man", "самообладание": "com",
  "интеллект": "int", "смекалка": "wit", "упорство": "res",
};

const ATTR_LABELS: Record<keyof W5Attributes, string> = {
  str: "Сила", dex: "Ловкость", sta: "Стойкость",
  cha: "Обаяние", man: "Манипуляция", com: "Самообладание",
  int: "Интеллект", wit: "Смекалка", res: "Упорство",
};

// ---------- Основной парсер ----------

export function parseW5SummaryMarkdown(md: string): W5MdParseResult {
  const fields: ParsedW5MdSheet = {};
  const found: string[] = [];
  const unknown: string[] = [];
  const warnings: string[] = [];

  const lines = md.replace(/\r\n?/g, "\n").split("\n");

  // Контекст: внутри какой секции мы находимся
  let section = "";
  // Подсекция «Стремления/Касания» внутри секции огня
  let listKind: "" | "asp" | "tst" = "";
  // Текущая строка таблицы витальных шкал: имя шкалы → ячейки
  let sawHeading = false; // встретился ли хоть один заголовок ##

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const t = line.trim();

    // ── Заголовки секций ──
    const h2 = t.match(/^##\s+(.+)$/);
    if (h2) {
      sawHeading = true;
      const title = h2[1].trim();
      if (title.includes("Витальные")) section = "tracks";
      else if (title.includes("лун") || title.includes("Девять")) section = "attrs";
      else if (title.includes("Навыки")) section = "skills";
      else if (title.includes("Дары")) section = "gifts";
      else if (title.includes("Обряды")) section = "rites";
      else if (title.includes("Стремления")) { section = "fire"; listKind = ""; }
      else if (title.includes("Пять обликов")) section = "forms";
      else if (title.includes("Снаряжение")) section = "gear";
      else if (title.includes("Журнал")) section = "xplog";
      else if (title.includes("дневник")) section = "notes";
      else section = "";
      continue;
    }

    // ── Шапка: H1 «# 🐺 Имя» ──
    const h1 = t.match(/^#\s+(?:🐺\s*)?(.*)$/);
    if (h1 && !sawHeading) {
      const nm = stripBold(h1[1]).trim();
      if (nm && nm !== "Безымянный Гароу") {
        fields.name = nm;
        found.push("имя");
      }
      continue;
    }

    // ── Callout «> [!info] …» — племя/ауспиция/порода/стая ──
    if (t.includes("[!info]")) {
      const identity = t.split("[!info]")[1] || "";
      const parts = identity.split("·").map((p) => p.trim()).filter(Boolean);
      for (const p of parts) {
        const packM = p.match(/^Стая:\s*(.+)$/);
        if (packM) {
          fields.pack = stripBold(packM[1]).trim();
          if (fields.pack) found.push("стая");
          continue;
        }
        // племя: «🐺 Имя» / «☠ Имя (wayward)»
        const nameCand = stripBold(p.replace(/^[🐺☠🌙]\s*/u, "").replace(/\s*\(wayward\)$/i, "").trim());
        if (!nameCand) continue;
        const tribe = W5_TRIBES.find((x) => x.name.toLowerCase() === nameCand.toLowerCase());
        if (tribe) {
          fields.tribe = tribe.id;
          found.push("племя");
          continue;
        }
        const auspice = W5_AUSPICES.find((x) => x.name.toLowerCase() === nameCand.toLowerCase());
        if (auspice) {
          fields.auspice = auspice.id;
          found.push("ауспиция");
          continue;
        }
        const breed = W5_BREEDS.find((x) => x.name.toLowerCase() === nameCand.toLowerCase());
        if (breed) {
          fields.breed = breed.id;
          found.push("порода");
          continue;
        }
        // нераспознанная часть шапки — не беда, но упомянем
        unknown.push(nameCand);
      }
      continue;
    }

    // ── «Облик дня: **Кринос**» ──
    const formM = t.match(/^>\s*Облик(?:\s*дня)?:\s*\*\*(.+?)\*\*\s*$/i);
    if (formM) {
      const fn = stripBold(formM[1]).trim();
      const form = W5_FORMS.find((f) => f.name.toLowerCase() === fn.toLowerCase());
      if (form) {
        fields.activeForm = form.id;
        found.push("облик дня");
      } else {
        warnings.push(`Облик «${fn}» не опознан — оставлен текущий.`);
      }
      continue;
    }

    // ── Концепция: первая «> «…»» до заголовков ──
    const conceptM = t.match(/^>\s*«(.+)»\s*[.!?…]*$/);
    if (conceptM && !sawHeading && !fields.concept) {
      fields.concept = conceptM[1].trim();
      found.push("концепция");
      continue;
    }

    // ── Тотем / хроника ──
    const totemM = t.match(/^>\s*Тотем стаи:\s*\*\*(.+?)\*\*\s*$/);
    if (totemM) {
      fields.totem = stripBold(totemM[1]).trim();
      if (fields.totem) found.push("тотем");
      continue;
    }
    const chronM = t.match(/^>\s*Хроника:\s*\*\*(.+?)\*\*\s*$/);
    if (chronM) {
      fields.chronicle = stripBold(chronM[1]).trim();
      if (fields.chronicle) found.push("хроника");
      continue;
    }

    // ── Цитата: «> «…»» ПОСЛЕ заголовков (в хвосте сводки) ──
    if (conceptM && sawHeading && !fields.quote) {
      fields.quote = `«${conceptM[1].trim()}»`;
      found.push("цитата");
      continue;
    }

    // ── Слава: «> [!quote] Слава **N** — Ранг» ──
    if (t.includes("[!quote]")) {
      continue; // ранг вычисляется сам — читаем чипы следующей строкой
    }
    const renownM = t.match(/^>\s*`Гордец\s*(\d+)`\s*·\s*`Честь\s*(\d+)`\s*·\s*`Мудрость\s*(\d+)`\s*$/);
    if (renownM) {
      fields.trackers = fields.trackers || {};
      fields.trackers.glory = clamp05(renownM[1]);
      fields.trackers.honor = clamp05(renownM[2]);
      fields.trackers.wisdom = clamp05(renownM[3]);
      found.push("Слава");
      continue;
    }

    // ── Таблицы витальных шкал ──
    if (section === "tracks" && t.startsWith("|")) {
      const cells = t.split("|").slice(1, -1).map((c) => c.trim());
      if (cells.length >= 2 && !cells.every((c) => /^-{2,}$/.test(c) || c === "")) {
        const label = stripBold(cells[0]).toLowerCase();
        const valueCell = stripBold(cells[1] || "");
        const trackCell = stripItalic(stripBold(cells[2] || ""));
        fields.trackers = fields.trackers || {};

        if (label.startsWith("ярост")) {
          const mM = valueCell.match(/(\d+)\s*\/\s*5/);
          if (mM) fields.trackers.rage = clamp05(mM[1]);
          if (/волк потерян/i.test(valueCell)) fields.trackers.wolfLost = true;
          if (/харано/i.test(valueCell)) fields.trackers.harano = true;
          found.push("Ярость");
        } else if (label.startsWith("здоров")) {
          const agg = (trackCell.match(/☒/g) || []).length;
          const sup = (trackCell.match(/▣/g) || []).length;
          fields.trackers.healthAgg = agg;
          fields.trackers.healthSup = sup;
          found.push("раны Здоровья");
        } else if (label.startsWith("воля")) {
          const sup = (trackCell.match(/▣/g) || []).length;
          fields.trackers.wpSup = sup;
          found.push("урон Воли");
        } else if (label.startsWith("опыт")) {
          const numM = valueCell.match(/(\d+)/);
          if (numM) fields.trackers.xp = clamp05(numM[1]);
          const spentM = valueCell.match(/потрачено\s*(\d+)/i);
          if (spentM) fields.trackers.xpSpent = clamp05(spentM[1]);
          found.push("опыт");
        }
      }
      continue;
    }

    // ── Таблица характеристик: «| Сила ●●○○○ | Обаяние … | Интеллект … |» ──
    if (section === "attrs" && t.startsWith("|")) {
      const cells = t.split("|").slice(1, -1).map((c) => c.trim());
      for (const c of cells) {
        const m = c.match(/^([А-Яа-яЁё\s]+?)\s*(●[●○]*)$/);
        if (!m) continue;
        const key = ATTR_MAP[m[1].trim().toLowerCase()];
        if (key) {
          if (!fields.attributes) fields.attributes = {};
          fields.attributes[key] = clamp05(dotsFilled(m[2]));
          if (!found.includes("характеристики")) found.push("характеристики");
        }
      }
      continue;
    }

    // ── Таблица навыков: «| Навык | ●●○○○ | специализация |» ──
    if (section === "skills" && t.startsWith("|")) {
      const cells = t.split("|").slice(1, -1).map((c) => c.trim());
      if (cells.length >= 2 && !cells.every((c) => /^-{2,}$/.test(c) || c === "")) {
        const nm = stripBold(cells[0]).trim();
        if (nm && nm.toLowerCase() !== "навык") {
          const lib = SKILL_LIBRARY.find((s) => s.name.toLowerCase() === nm.toLowerCase());
          if (lib) {
            fields.skills = fields.skills || [];
            fields.skills.push({
              id: lib.id,
              value: clamp05(dotsFilled(cells[1] || "")),
              spec: stripBold(cells[2] || "").replace(/^—$/, "").trim(),
            });
            if (!found.includes("навыки")) found.push("навыки");
          } else {
            warnings.push(`Навык «${nm}» не из библиотеки — пропущен.`);
          }
        }
      }
      continue;
    }

    // ── Список Даров: «- **Имя** — ●●○○○ · заметка» ──
    if (section === "gifts") {
      const m = t.match(/^-\s+(.+)$/);
      if (m) {
        const body = m[1];
        const nm = stripBold(body.match(/^\*\*(.+?)\*\*/)?.[1] || "");
        if (!nm) continue;
        const lvlM = body.match(/—\s*(●+)/);
        const level = Math.max(1, Math.min(5, lvlM ? dotsFilled(lvlM[1]) : 1));
        // заметка — всё после точек/дефисов
        const noteM = body.match(/(?:●+○*|—)\s*·\s*(.+)$/);
        const note = noteM ? stripBold(noteM[1]).trim() : "";
        fields.gifts = fields.gifts || [];
        fields.gifts.push({ name: nm, level, note });
        if (!found.includes("Дары")) found.push("Дары");
      }
      continue;
    }

    // ── Список Обрядов: «- **Имя** (N ур.) · заметка» ──
    if (section === "rites") {
      const m = t.match(/^-\s+(.+)$/);
      if (m) {
        const body = m[1];
        const nm = stripBold(body.match(/^\*\*(.+?)\*\*/)?.[1] || "");
        if (!nm) continue;
        const lvlM = body.match(/\((\d)\s*ур\.\)/);
        const level = lvlM ? Math.max(0, Math.min(4, parseInt(lvlM[1], 10))) : 1;
        const noteM = body.match(/\)\s*·\s*(.+)$/);
        const note = noteM ? stripBold(noteM[1]).trim() : "";
        fields.rites = fields.rites || [];
        fields.rites.push({ name: nm, level, note });
        if (!found.includes("Обряды")) found.push("Обряды");
      }
      continue;
    }

    // ── Стремления и касания ──
    if (section === "fire") {
      if (/^\*\*Стремления/i.test(t)) { listKind = "asp"; continue; }
      if (/^\*\*Касания/i.test(t)) { listKind = "tst"; continue; }
      const m = t.match(/^-\s+(.+)$/);
      if (m && listKind) {
        const txt = stripBold(m[1]).trim();
        if (txt) {
          if (listKind === "asp") {
            fields.aspirations = fields.aspirations || [];
            if (fields.aspirations.length < 3) fields.aspirations.push(txt);
            if (!found.includes("стремления")) found.push("стремления");
          } else {
            fields.touchstones = fields.touchstones || [];
            if (fields.touchstones.length < 3) fields.touchstones.push(txt);
            if (!found.includes("касания")) found.push("касания");
          }
        }
      }
      continue;
    }

    // ── Пять обликов: строка-памятка — активный облик может быть выделен ──
    if (section === "forms") {
      // формат: `Хишу` · `Глабро` · ... — активный не помечается, читаем из callout выше
      continue;
    }

    // ── Снаряжение: «- Имя ×N — заметка» ──
    if (section === "gear") {
      const m = t.match(/^-\s+(.+)$/);
      if (m) {
        const body = m[1];
        const countM = body.match(/×\s*([^—]+?)(?:\s*—|\s*$)/);
        const noteM = body.match(/—\s*(.+)$/);
        const name = stripBold(stripItalic(body.split(/×|—/)[0])).trim();
        if (name) {
          fields.gear = fields.gear || [];
          fields.gear.push({ name, count: countM ? countM[1].trim() : "", note: noteM ? stripBold(noteM[1]).trim() : "" });
          if (!found.includes("снаряжение")) found.push("снаряжение");
        }
      }
      continue;
    }

    // ── Журнал опыта: «- **дата** — текст» (обратная вливалка xpLog-строк) ──
    if (section === "xplog") {
      const m = t.match(/^-\s+(.+)$/);
      if (m) {
        const body = m[1];
        if (/ещё \d+ запис/.test(body)) continue; // хвост «…и ещё N записей в журнале листа»
        const dateM = body.match(/^\*\*(.+?)\*\*\s*—\s*(.+)$/);
        const stamp = dateM ? stripBold(dateM[1]).trim() : "";
        const text = dateM ? stripBold(dateM[2]).trim() : stripBold(body).trim();
        if (text) {
          const ts = stamp ? (Date.parse(stamp) || 0) : 0;
          fields.xpLog = fields.xpLog || [];
          fields.xpLog.push({ text, ts: ts ? new Date(ts).toISOString() : new Date().toISOString() });
          if (!found.includes("журнал опыта")) found.push("журнал опыта");
        }
      }
      continue;
    }

    // ── Лунный дневник: «- **дата** — текст» ──
    if (section === "notes") {
      const m = t.match(/^-\s+(.+)$/);
      if (m) {
        const body = m[1];
        if (/ещё \d+ запис/.test(body)) continue; // хвост «…и ещё N записей в онлайн-архиве»
        const dateM = body.match(/^\*\*(.+?)\*\*\s*—\s*(.+)$/);
        const date = dateM ? stripBold(dateM[1]).trim() : "";
        const content = dateM ? stripBold(dateM[2]).trim() : stripBold(body).trim();
        if (content) {
          fields.notes = fields.notes || [];
          fields.notes.push({ title: date || "Запись", content, date });
          if (!found.includes("лунный дневник")) found.push("лунный дневник");
        }
      }
      continue;
    }
  }

  // Финальные проверки
  if (found.length === 0) {
    warnings.push("В свитке не найдено ни одного знакомого поля. Это точно «Сводка Гароу» (Ⓜ МД из листа Гароу)?");
  }

  return { fields, found, unknown, warnings };
}

// ---------- Вливание в лист ----------

/**
 * Вливает разобранные поля в черновик листа Гароу (мутирует draft — вызывать внутри mutate).
 * Правила: скаляры перезаписываются только найденные; списки заменяются;
 * записи дневника добавляются сверху с дедупликацией.
 */
export function applyParsedW5Md(draft: W5SheetData, p: ParsedW5MdSheet): void {
  // Инфо
  if (p.name) draft.info.name = p.name.slice(0, 80);
  if (p.concept) draft.info.concept = p.concept.slice(0, 120);
  if (p.chronicle) draft.info.chronicle = p.chronicle.slice(0, 120);
  if (p.pack) draft.info.pack = p.pack.slice(0, 120);
  if (p.totem) draft.info.totem = p.totem.slice(0, 120);
  if (p.quote) draft.info.quote = p.quote.slice(0, 300);
  if (p.tribe && W5_TRIBES.some((x) => x.id === p.tribe)) draft.info.tribe = p.tribe;
  if (p.auspice && W5_AUSPICES.some((x) => x.id === p.auspice)) draft.info.auspice = p.auspice;
  if (p.breed && W5_BREEDS.some((x) => x.id === p.breed)) draft.info.breed = p.breed;
  if (p.activeForm && W5_FORM_BY_ID.has(p.activeForm)) draft.info.activeForm = p.activeForm;

  // Характеристики
  if (p.attributes) {
    for (const [k, v] of Object.entries(p.attributes)) {
      if (typeof v === "number") {
        (draft.attributes as unknown as Record<string, number>)[k] = clamp05(v);
      }
    }
  }

  // Навыки — замена целиком (только валидные id)
  if (p.skills && p.skills.length > 0) {
    draft.skills = p.skills
      .filter((s) => SKILL_LIBRARY.some((lib) => lib.id === s.id))
      .map((s) => ({ id: s.id, value: clamp05(s.value), spec: (s.spec || "").slice(0, 80) }));
  }

  // Трекеры
  if (p.trackers) {
    const t = p.trackers;
    if (typeof t.rage === "number") draft.trackers.rage = clamp05(t.rage);
    if (t.wolfLost !== undefined) draft.trackers.wolfLost = t.wolfLost;
    if (t.harano !== undefined) draft.trackers.harano = t.harano;
    if (typeof t.healthSup === "number") draft.trackers.healthSup = clamp05(t.healthSup);
    if (typeof t.healthAgg === "number") draft.trackers.healthAgg = clamp05(t.healthAgg);
    if (typeof t.wpSup === "number") draft.trackers.wpSup = clamp05(t.wpSup);
    if (typeof t.xp === "number") draft.trackers.xp = clamp05(t.xp);
    if (typeof t.xpSpent === "number") draft.trackers.xpSpent = clamp05(t.xpSpent);
    if (typeof t.glory === "number") draft.trackers.glory = clamp05(t.glory);
    if (typeof t.honor === "number") draft.trackers.honor = clamp05(t.honor);
    if (typeof t.wisdom === "number") draft.trackers.wisdom = clamp05(t.wisdom);
    // волк потерян согласуем с Яростью (0 = потерян)
    if (typeof t.rage === "number") {
      if (draft.trackers.rage === 0) draft.trackers.wolfLost = true;
      else if (typeof t.rage === "number" && t.wolfLost === undefined) draft.trackers.wolfLost = false;
    }
  }

  // Дары — замена целиком
  if (p.gifts && p.gifts.length > 0) {
    draft.gifts = p.gifts.slice(0, 40).map((g, i) => ({
      id: vtmUid("g-md"),
      name: g.name.slice(0, 80) || "Дар",
      level: clamp05(g.level) || 1,
      note: (g.note || "").slice(0, 400),
    }));
  }

  // Обряды — замена целиком
  if (p.rites && p.rites.length > 0) {
    draft.rites = p.rites.slice(0, 30).map((r, i) => ({
      id: vtmUid("r-md"),
      name: r.name.slice(0, 80) || "Обряд",
      level: Math.max(0, Math.min(4, Math.floor(Number(r.level) || 0))),
      note: (r.note || "").slice(0, 400),
    }));
  }

  // Стремления и касания — замена целиком (до 3)
  if (p.aspirations && p.aspirations.length > 0) {
    draft.aspirations = p.aspirations.slice(0, 3).map((txt, i) => ({ id: `asp-md-${i}`, text: txt.slice(0, 200) }));
  }
  if (p.touchstones && p.touchstones.length > 0) {
    draft.touchstones = p.touchstones.slice(0, 3).map((txt, i) => ({ id: `tst-md-${i}`, text: txt.slice(0, 200) }));
  }

  // Снаряжение — замена целиком
  if (p.gear && p.gear.length > 0) {
    draft.gear = p.gear.slice(0, 60).map((g, i) => ({
      id: `gear-md-${i}`,
      name: g.name.slice(0, 80) || "Вещь",
      count: (g.count || "").slice(0, 40),
      note: (g.note || "").slice(0, 200),
    }));
  }

  // Лунный дневник — добавить сверху, пропустив дубликаты (дата+текст)
  if (p.notes && p.notes.length > 0) {
    const key = (n: { content: string; date: string }) => `${n.date}::${n.content}`;
    const existing = new Set(draft.notes.map(key));
    const fresh = p.notes
      .filter((n) => !existing.has(key(n)))
      .slice(0, 12)
      .map((n, i) => ({
        id: vtmUid("note-md"),
        title: n.title.slice(0, 120) || "Запись",
        content: n.content.slice(0, 4000),
        date: n.date.slice(0, 40),
      }));
    draft.notes = [...fresh, ...draft.notes].slice(0, 100);
  }

  // Журнал опыта — добавить сверху, пропустив записи, что уже есть на листе (по тексту)
  if (p.xpLog && p.xpLog.length > 0) {
    const existingTexts = new Set((draft.xpLog || []).map((e) => e.text));
    const fresh = p.xpLog
      .filter((e) => !existingTexts.has(e.text))
      .slice(0, 20)
      .map((e, i) => ({
        id: vtmUid("wxp-md"),
        text: e.text.slice(0, 300),
        ts: e.ts,
      }));
    draft.xpLog = [...fresh, ...(draft.xpLog || [])].slice(0, 40);
  }
}
