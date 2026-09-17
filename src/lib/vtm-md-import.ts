// ============================================================
// «ВЕРНУТЬ ИЗ ОБСИДИАНА» — обратный разбор «Сводки Сородича».
// Парсер GFM-разметки, которую выдаёт buildSummaryMarkdown (vtm-summary-md.ts).
// Изолированный модуль VtM-вселенной: ничего общего с D&D и «Зовом Ктулху».
//
// Правила вливания в лист (простые и предсказуемые):
//  · скалярные поля — перезаписываются, только если найдены в сводке;
//  · списки навыков / Дисциплин / достоинств — заменяются целиком,
//    если секция присутствует и в ней есть хотя бы одна строка;
//  · записи журнала — ДОБАВЛЯЮТСЯ сверху с дедупликацией по (заголовок+дата+текст);
//  · портрет и предыстория из Markdown не приходят — они вне формата сводки.
// ============================================================

import {
  VtmSheetData,
  VtmAttributes,
  VtmSkillState,
  VtmDisciplineState,
  VtmAdvantageEntry,
  VtmGearItem,
  VtmNote,
  SKILL_LIBRARY,
  CLANS,
  SECTS,
  PREDATOR_TYPES,
  DISCIPLINE_BY_ID,
  ADVANTAGE_LIBRARY,
  RESONANCES,
  RESONANCE_INTENSITY_LABELS,
} from "./vtm-data";
import { LORESHEET_BY_ID } from "./vtm-histories";

// ---------- Типы результата ----------

export interface ParsedMdSheet {
  name?: string;
  concept?: string;
  chronicle?: string;
  sire?: string;
  clan?: string;
  sect?: string;
  predator?: string;
  generation?: number;
  ambition?: string;
  desire?: string;
  principle1?: string;
  principle2?: string;
  principle3?: string;
  anchor1?: string;
  anchor2?: string;
  anchor3?: string;
  attributes?: Partial<VtmAttributes>;
  skills?: VtmSkillState[];
  disciplines?: VtmDisciplineState[];
  advantages?: VtmAdvantageEntry[];
  trackers?: {
    hunger?: number;
    healthSup?: number;
    healthAgg?: number;
    wpSup?: number;
    wpAgg?: number;
    humanity?: number;
    stains?: number;
    xp?: number;
    xpSpent?: number;
    huntCount?: number;
    lastHunt?: string;
  };
  resonance?: { kind: string; intensity: number };
  loresheets?: { sheetId: string; level: number; note: string }[];
  diablerie?: { count: number; notes: string };
  gear?: { haven?: string; resources?: string; items?: VtmGearItem[] };
  notes?: VtmNote[];
  xpLog?: { text: string; ts: string }[];
}

export interface MdParseResult {
  fields: ParsedMdSheet;
  /** Найденные группы полей — для превью в диалоге. */
  found: string[];
  /** Имена, не опознанные в справочниках (уйдут в лист как кастомные). */
  unknown: string[];
  /** Нестрогие предупреждения (пропуски, нераспознанные строки). */
  warnings: string[];
  /** Редкие Дисциплины (кровные линии) — опознаны, но подсвечиваются в превью. */
  rareDisciplines: string[];
}

// ---------- Мелкие помощники ----------

/** Число заполненных точек ● в строке. */
const dotsFilled = (s: string): number => (s.match(/●/g) || []).length;

const stripBold = (s: string): string => s.replace(/\*\*/g, "").trim();
const stripItalic = (s: string): string => s.replace(/\*([^*]+)\*/g, "$1").trim();

/** Разбор значения вида «Имя 3 ●●●○○» или «Имя 3» → { name, value }. */
function parseNameValue(raw: string): { name: string; value: number } | null {
  const m = raw.match(/^(.+?)\s+(\d+)\s*(?:●+)?\s*$/);
  if (!m) return null;
  const value = parseInt(m[2], 10);
  if (!Number.isFinite(value)) return null;
  return { name: stripBold(m[1]), value: Math.max(0, Math.min(5, value)) };
}

const clamp = (n: unknown, min: number, max: number): number =>
  Math.max(min, Math.min(max, Math.floor(Number(n) || 0)));

// ---------- Основной парсер ----------

export function parseSummaryMarkdown(md: string): MdParseResult {
  const fields: ParsedMdSheet = {};
  const found: string[] = [];
  const unknown: string[] = [];
  const warnings: string[] = [];
  const rareDisciplines: string[] = [];

  const lines = md.replace(/\r\n?/g, "\n").split("\n");

  // Контекстные индикаторы: внутри какой секции мы находимся
  let section = "";
  // Для разбора таблиц: строки с |...|
  const tableRows: Record<string, string[]> = {}; // section → массив ячеек-строк

  // Дисциплины: текущая дисциплина для вложенных «N ур. — Сила»
  let currentDiscipline: VtmDisciplineState | null = null;
  // Хроника ночей: текущая запись для строк «> содержание»
  let currentNote: VtmNote | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    // ── Заголовки секций ──
    const h2 = line.match(/^##\s+(.+)$/);
    if (h2) {
      const t = h2[1].trim();
      if (t.startsWith("Кровь и тело")) section = "tracks";
      else if (t.startsWith("Характеристики")) section = "attrs";
      else if (t.startsWith("Навыки")) section = "skills";
      else if (t.startsWith("Дисциплины")) section = "discs";
      else if (t.startsWith("Достоинства")) section = "adv";
      else if (t.startsWith("Истории")) section = "loresheets";
      else if (t.startsWith("Столкновения")) section = "conv";
      else if (t.startsWith("Убежище")) section = "gear";
      else if (t.includes("Журнал опыта") || t.includes("Журнал")) section = "xplog";
      else if (t.startsWith("Хроника ночей")) section = "notes";
      else section = "";
      continue;
    }

    // ── Шапка: H1 «# 🩸 Имя» ──
    const h1 = line.match(/^#\s+(?:🩸\s*)?(.*)$/);
    if (h1 && !fields.name && !line.startsWith("##")) {
      const nm = stripBold(h1[1]).trim();
      if (nm && nm !== "Безымянный Сородич") {
        fields.name = nm;
        found.push("имя");
      }
      continue;
    }

    // ── Callout «> [!info] …» ──
    if (line.includes("[!info]")) {
      const identity = line.split("[!info]")[1] || "";
      const parts = identity.split("·").map((p) => p.trim()).filter(Boolean);
      for (const p of parts) {
        if (p.includes("Слабокровн")) {
          fields.clan = "thinblood";
          found.push("клан");
          continue;
        }
        const clanM = p.match(/⛧\s*(.+)/);
        if (clanM) {
          const cn = clanM[1].trim();
          const clan = CLANS.find((c) => c.name.toLowerCase() === cn.toLowerCase());
          if (clan) {
            fields.clan = clan.id;
            found.push("клан");
          } else {
            warnings.push(`Клан «${cn}» не опознан — оставлен текущий.`);
          }
          continue;
        }
        const genM = p.match(/(\d+)-е\s+поколение/);
        if (genM) {
          fields.generation = clamp(genM[1], 5, 16);
          found.push("поколение");
          continue;
        }
        const predM = p.match(/Стиль охоты:\s*(.+)/);
        if (predM) {
          const pn = predM[1].trim();
          const pred = PREDATOR_TYPES.find((x) => x.name.toLowerCase() === pn.toLowerCase());
          if (pred) {
            fields.predator = pred.id;
            found.push("стиль охоты");
          } else {
            warnings.push(`Стиль охоты «${pn}» не опознан.`);
          }
          continue;
        }
        const sect = SECTS.find((s) => p.toLowerCase().includes(s.name.toLowerCase()));
        if (sect) {
          fields.sect = sect.id;
          found.push("секта");
        }
      }
      continue;
    }

    // ── Концепция: «> «…»» ──
    const conceptM = line.match(/^>\s*«(.+)»\s*$/);
    if (conceptM && !fields.concept) {
      fields.concept = conceptM[1].trim();
      found.push("концепция");
      continue;
    }

    // ── Хроника / сир: «> Хроника: **X** · Сир: Y» ──
    const chronM = line.match(/^>\s*Хроника:\s*(.+)$/);
    if (chronM) {
      const segs = chronM[1].split("·").map((s) => s.trim());
      for (const seg of segs) {
        const cM = seg.match(/^\*\*(.+)\*\*$/);
        if (cM) {
          fields.chronicle = cM[1].trim();
          found.push("хроника");
        } else if (/^Сир:/i.test(seg)) {
          fields.sire = seg.replace(/^Сир:\s*/i, "").trim();
          if (fields.sire) found.push("сир");
        }
      }
      continue;
    }

    // ── Таблицы: соберём строки секции треков ──
    if (section === "tracks" && /^\|/.test(line)) {
      const clean = line.split("|").slice(1, -1).map((c) => c.trim());
      if (clean.length >= 2 && !clean.every((c) => /^-{2,}$/.test(c) || c === "")) {
        tableRows[clean[0]] = clean.slice(1);
      }
      continue;
    }

    // ── Характеристики: таблица «| Сила ●●●○○ | … |» ──
    if (section === "attrs" && /^\|/.test(line)) {
      const cells = line.split("|").slice(1, -1).map((c) => c.trim());
      for (const c of cells) {
        const m = c.match(/^([А-Яа-яЁё\s]+?)\s*(●+)$/);
        if (!m) continue;
        const nm = m[1].trim();
        const val = dotsFilled(m[2]);
        const map: Record<string, keyof VtmAttributes> = {
          "Сила": "str", "Ловкость": "dex", "Выносливость": "sta",
          "Обаяние": "cha", "Манипуляция": "man", "Самообладание": "com",
          "Интеллект": "int", "Смекалка": "wit", "Упорство": "res",
        };
        const key = map[nm];
        if (key) {
          if (!fields.attributes) fields.attributes = {};
          fields.attributes[key] = clamp(val, 0, 5);
          if (!found.includes("характеристики")) found.push("характеристики");
        }
      }
      continue;
    }

    // ── Навыки ──
    if (section === "skills") {
      const m = line.match(/^-\s+(.+)$/);
      if (m && !m[1].includes("ни одного навыка")) {
        const body = m[1];
        const specM = body.match(/—\s*специализация:\s*\*(.+)\*/);
        const spec = specM ? specM[1].trim() : "";
        const head = stripBold(body.split("—")[0]).replace(/\s*●+.*$/, "");
        const nv = parseNameValue(head) || (head ? { name: head, value: 1 } : null);
        if (nv) {
          const lib = SKILL_LIBRARY.find((s) => s.name.toLowerCase() === nv.name.toLowerCase());
          if (!fields.skills) fields.skills = [];
          if (lib) {
            fields.skills.push({ key: lib.id, name: lib.name, value: nv.value, spec, xp: 0 });
          } else {
            // незнакомое имя — зайдёт как кастомный навык (key: null)
            fields.skills.push({ key: null, name: nv.name, value: nv.value, spec, xp: 0 });
            unknown.push(`${nv.name} (навык)`);
          }
          if (!found.includes("навыки")) found.push("навыки");
        }
      }
      continue;
    }

    // ── Дисциплины ──
    if (section === "discs") {
      const nested = line.match(/^\s{2,}-\s+(\d+)\s*ур\.\s*—\s*(.+)$/);
      if (nested && currentDiscipline) {
        const lvl = clamp(nested[1], 1, 5);
        if (!currentDiscipline.powers) currentDiscipline.powers = {};
        currentDiscipline.powers[lvl] = nested[2].trim();
        continue;
      }
      const m = line.match(/^\s*-\s+(.+)$/);
      if (m && !m[1].includes("Кровь ещё не открыла")) {
        const nv = parseNameValue(stripBold(m[1]).replace(/\s*●+.*$/, ""));
        if (nv) {
          // id ищем по имени в справочнике Дисциплин
          const def = [...DISCIPLINE_BY_ID.values()].find(
            (d) => d.name.toLowerCase() === nv.name.toLowerCase()
          );
          currentDiscipline = {
            key: def?.id || null,
            name: def?.name || nv.name,
            value: nv.value,
            powers: {},
            xp: 0,
          };
          if (!def) unknown.push(`${nv.name} (Дисциплина)`);
          else if (def.rare && !rareDisciplines.includes(def.name)) rareDisciplines.push(def.name);
          if (!fields.disciplines) fields.disciplines = [];
          fields.disciplines.push(currentDiscipline);
          if (!found.includes("Дисциплины")) found.push("Дисциплины");
        }
      }
      continue;
    }

    // ── Достоинства и недостатки ──
    if (section === "adv") {
      const m = line.match(/^-\s+`([^`]+)`\s+(.+)$/);
      if (m && !m[2].includes("ничего примечательного")) {
        const kindLabel = m[1].trim();
        const kindMap: Record<string, VtmAdvantageEntry["kind"]> = {
          "факт": "background",
          "дост.": "merit",
          "недост.": "flaw",
          "сл.": "thinblood",
        };
        const kind = kindMap[kindLabel];
        const rest = m[2];
        const noteM = rest.match(/—\s*(.+)$/);
        const note = noteM ? noteM[1].trim() : "";
        const head = stripBold(rest.split("—")[0]);
        // рейтинг 1 в экспорте не печатается — значит «имя без цифры» это рейтинг 1
        const nv = parseNameValue(head) || (head ? { name: head, value: 1 } : null);
        if (nv && kind) {
          const lib = ADVANTAGE_LIBRARY.find((a) => a.name.toLowerCase() === nv.name.toLowerCase());
          if (!fields.advantages) fields.advantages = [];
          fields.advantages.push({
            id: lib?.id || `custom-${Date.now().toString(36)}-${fields.advantages.length}`,
            name: lib?.name || nv.name,
            kind,
            rating: clamp(nv.value, 0, 5),
            note,
          });
          if (!lib) unknown.push(`${nv.name} (${kindLabel})`);
          if (!found.includes("достоинства и недостатки")) found.push("достоинства и недостатки");
        }
      }
      continue;
    }

    // ── Листоги («Истории») ──
    if (section === "loresheets") {
      const m = line.match(/^\s*-\s+\*\*(.+?)\*\*\s*([●○]+)(?:\s*\((\d+) опыта\))?/);
      if (m) {
        const lsName = stripBold(m[1]).trim();
        const level = clamp(dotsFilled(m[2]), 0, 4);
        const def = [...LORESHEET_BY_ID.values()].find((d) => d.name.toLowerCase() === lsName.toLowerCase());
        if (def && level > 0 && !fields.loresheets?.some((l) => l.sheetId === def.id)) {
          if (!fields.loresheets) fields.loresheets = [];
          fields.loresheets.push({ sheetId: def.id, level, note: "" });
          if (!found.includes("листоги")) found.push("листоги");
        }
      }
      // заметка «  > Заметка: ...» относится к последнему листогу
      const noteM = line.match(/^\s{2,}>\s*Заметка:\s*(.+)$/);
      if (noteM && fields.loresheets && fields.loresheets.length > 0) {
        fields.loresheets[fields.loresheets.length - 1].note = noteM[1].trim();
      }
      continue;
    }

    // ── Столкновения и опоры ──
    if (section === "conv") {
      const m = line.match(/^-\s+\*\*(.+?):?\*\*\s*(.*)$/);
      if (m) {
        const label = m[1].replace(/:$/, "").trim().toLowerCase();
        const val = m[2].trim();
        if (!val) continue;
        if (label === "амбиция") { fields.ambition = val; found.push("Цель"); }
        else if (label === "желание") { fields.desire = val; found.push("Желание"); }
        else if (label === "принципы") {
          const prs = val.split("·").map((s) => s.trim()).filter(Boolean);
          if (prs[0]) fields.principle1 = prs[0];
          if (prs[1]) fields.principle2 = prs[1];
          if (prs[2]) fields.principle3 = prs[2];
          found.push("принципы");
        } else if (label === "опоры") {
          const an = val.split("·").map((s) => s.trim()).filter(Boolean);
          if (an[0]) fields.anchor1 = an[0];
          if (an[1]) fields.anchor2 = an[1];
          if (an[2]) fields.anchor3 = an[2];
          found.push("опоры");
        }
      }
      continue;
    }

    // ── Убежище и имущество ──
    if (section === "gear") {
      const havenM = line.match(/^>\s*Убежище:\s*(.+)$/);
      if (havenM) {
        fields.gear = fields.gear || {};
        fields.gear.haven = stripBold(havenM[1]);
        found.push("убежище");
        continue;
      }
      const resM = line.match(/^>\s*Средства:\s*(.+)$/);
      if (resM) {
        fields.gear = fields.gear || {};
        fields.gear.resources = stripBold(resM[1]);
        found.push("средства");
        continue;
      }
      const itemM = line.match(/^-\s+(.+)$/);
      if (itemM && !itemM[1].startsWith("*…и ещё")) {
        const body = itemM[1];
        const noteM = body.match(/—\s*\*(.+)\*$/);
        const note = noteM ? noteM[1].trim() : "";
        const head = body.split("—")[0];
        const cntM = head.match(/^(.+?)\s*×\s*(\S+)\s*$/);
        const name = stripBold(cntM ? cntM[1] : head).trim();
        const count = cntM ? cntM[2].trim() : "";
        if (name) {
          if (!fields.gear) fields.gear = {};
          if (!fields.gear.items) fields.gear.items = [];
          fields.gear.items.push({
            id: `md-item-${Date.now().toString(36)}-${fields.gear.items.length}`,
            name,
            count,
            note,
          });
          if (!found.includes("имущество")) found.push("имущество");
        }
      }
      continue;
    }

    // ── Журнал опыта: «- **дата** — текст» (обратная вливалка xpLog-строк) ──
    if (section === "xplog") {
      const m = line.match(/^-(?:\s+)(.+)$/);
      if (m) {
        const body = m[1];
        if (/ещё \d+ запис/.test(body)) continue; // хвост «…и ещё N записей в архиве Крови»
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

    // ── Хроника ночей ──
    if (section === "notes") {
      if (line === "") continue;
      const entryM = line.match(/^-(?:\s+)(🌙|🖋️?)\s*\*\*(.+?)\*\*\s*—\s*\*(.+)\*\s*$/);
      if (entryM) {
        currentNote = {
          id: `md-note-${Date.now().toString(36)}-${(fields.notes?.length || 0)}`,
          title: stripItalic(stripBold(entryM[2])),
          content: "",
          date: stripItalic(entryM[3]),
        };
        if (!fields.notes) fields.notes = [];
        fields.notes.push(currentNote);
        if (!found.includes("записи журнала")) found.push("записи журнала");
        continue;
      }
      if (currentNote) {
        const contM = line.match(/^\s{2,}>\s?(.*)$/);
        if (contM) {
          currentNote.content = currentNote.content
            ? `${currentNote.content}\n${contM[1]}`
            : contM[1];
          continue;
        }
      }
      if (/^\s*-\s*\*…и ещё/.test(line)) {
        warnings.push("В сводке только последние 5 записей журнала — старые остались в Obsidian.");
      }
      continue;
    }
  }

  // ── Разбор таблицы треков (после прохода) ──
  const tracks: ParsedMdSheet["trackers"] = {};

  const hungerRow = tableRows["Голод"];
  if (hungerRow && hungerRow[0]) {
    const m = hungerRow[0].match(/\((\d+)\/5\)/) || hungerRow[0].match(/(\d+)\/5/);
    if (m) {
      tracks.hunger = clamp(m[1], 0, 5);
      found.push("Голод");
    }
  }

  const healthRow = tableRows["Здоровье"];
  if (healthRow && healthRow[0]) {
    tracks.healthAgg = (healthRow[0].match(/☒/g) || []).length;
    tracks.healthSup = (healthRow[0].match(/▣/g) || []).length;
    found.push("уроны Здоровья");
  }

  const wpRow = tableRows["Воля"];
  if (wpRow && wpRow[0]) {
    tracks.wpAgg = (wpRow[0].match(/☒/g) || []).length;
    tracks.wpSup = (wpRow[0].match(/▣/g) || []).length;
    found.push("уроны Воли");
  }

  const humRow = tableRows["Человечность"];
  if (humRow && humRow[0]) {
    const m = humRow[0].match(/(\d+)\/10/);
    if (m) {
      const stainsM = humRow[0].match(/пятна:\s*(\d+)/);
      const stains = stainsM ? clamp(stainsM[1], 0, 10) : 0;
      tracks.stains = stains;
      tracks.humanity = clamp(parseInt(m[1], 10) + stains, 0, 10);
      found.push("Человечность");
    }
  }

  const resRow = tableRows["Резонанс крови"];
  if (resRow && resRow[0]) {
    const parts = resRow[0].split(",").map((s) => s.trim());
    const rn = parts[0] || "";
    const res = RESONANCES.find((r) => rn.toLowerCase().includes(r.name.toLowerCase()));
    if (res) {
      const label = (parts[1] || "").toLowerCase();
      const intensity = Object.entries(RESONANCE_INTENSITY_LABELS).find(
        ([, v]) => v.toLowerCase() === label
      )?.[0];
      fields.resonance = { kind: res.id, intensity: intensity ? clamp(intensity, 0, 5) : 2 };
      found.push("резонанс");
    } else {
      warnings.push(`Резонанс «${rn}» не опознан.`);
    }
  }

  const xpRow = tableRows["Опыт"];
  if (xpRow && xpRow[0]) {
    const freeM = xpRow[0].match(/свободно\s+(\d+)/);
    const spentM = xpRow[0].match(/вложено\s+(\d+)/);
    if (freeM) tracks.xp = clamp(freeM[1], 0, 9999);
    if (spentM) tracks.xpSpent = clamp(spentM[1], 0, 9999);
    if (freeM || spentM) found.push("опыт");
  }

  const huntRow = tableRows["Ночи в хронике"];
  if (huntRow && huntRow[0]) {
    const m = huntRow[0].match(/(\d+)/);
    if (m) tracks.huntCount = clamp(m[1], 0, 9999);
    const lastM = huntRow[0].match(/последняя охота:\s*([^|]+)/);
    if (lastM) tracks.lastHunt = lastM[1].trim();
    if (m) found.push("счётчик ночей");
  }

  // Диаблери: «| Диаблери | 2 × — в ауре чёрные прожилки |» или «| Диаблери | чисто |»
  const diabRow = tableRows["Диаблери"];
  if (diabRow && diabRow[0]) {
    const m = diabRow[0].match(/(\d+)\s*×/);
    if (m) {
      fields.diablerie = { count: clamp(m[1], 0, 99), notes: "" };
      found.push("Диаблери");
    }
  }

  if (Object.keys(tracks).length > 0) fields.trackers = tracks;

  // Финальные проверки
  if (found.length === 0) {
    warnings.push("В свитке не найдено ни одного знакомого поля. Это точно «Сводка Сородича» (Ⓜ МД)?");
  }

  return { fields, found, unknown, warnings, rareDisciplines };
}

// ---------- Вливание в лист ----------

/**
 * Вливает разобранные поля в черновик листа (мутирует draft — вызывать внутри mutate).
 * Правила: скаляры перезаписываются только найденные; списки заменяются;
 * записи журнала добавляются сверху с дедупликацией.
 */
export function applyParsedMd(draft: VtmSheetData, p: ParsedMdSheet): void {
  // Инфо
  if (p.name) draft.info.name = p.name;
  if (p.concept) draft.info.concept = p.concept;
  if (p.chronicle) draft.info.chronicle = p.chronicle;
  if (p.sire) draft.info.sire = p.sire;
  if (p.clan) draft.info.clan = p.clan;
  if (p.sect) draft.info.sect = p.sect;
  if (p.predator) draft.info.predator = p.predator;
  if (typeof p.generation === "number" && p.generation > 0) draft.info.generation = p.generation;

  if (p.ambition) draft.info.ambition = p.ambition;
  if (p.desire) draft.info.desire = p.desire;
  if (p.principle1) draft.info.principle1 = p.principle1;
  if (p.principle2) draft.info.principle2 = p.principle2;
  if (p.principle3) draft.info.principle3 = p.principle3;
  if (p.anchor1) draft.info.anchor1 = p.anchor1;
  if (p.anchor2) draft.info.anchor2 = p.anchor2;
  if (p.anchor3) draft.info.anchor3 = p.anchor3;

  // Характеристики
  if (p.attributes) {
    for (const [k, v] of Object.entries(p.attributes)) {
      if (typeof v === "number") {
        (draft.attributes as unknown as Record<string, number>)[k] = Math.max(0, Math.min(5, v));
      }
    }
  }

  // Списки — замена целиком
  if (p.skills && p.skills.length > 0) draft.skills = p.skills;
  if (p.disciplines && p.disciplines.length > 0) draft.disciplines = p.disciplines;
  if (p.advantages && p.advantages.length > 0) draft.advantages = p.advantages;

  // Трекеры
  if (p.trackers) {
    const t = p.trackers;
    if (typeof t.hunger === "number") draft.trackers.hunger = t.hunger;
    if (typeof t.healthSup === "number") draft.trackers.healthSup = t.healthSup;
    if (typeof t.healthAgg === "number") draft.trackers.healthAgg = t.healthAgg;
    if (typeof t.wpSup === "number") draft.trackers.wpSup = t.wpSup;
    if (typeof t.wpAgg === "number") draft.trackers.wpAgg = t.wpAgg;
    if (typeof t.humanity === "number") draft.trackers.humanity = t.humanity;
    if (typeof t.stains === "number") draft.trackers.stains = t.stains;
    if (typeof t.xp === "number") draft.trackers.xp = t.xp;
    if (typeof t.xpSpent === "number") draft.trackers.xpSpent = t.xpSpent;
    if (typeof t.huntCount === "number") draft.trackers.huntCount = t.huntCount;
    if (t.lastHunt && t.lastHunt !== "—") draft.trackers.lastHunt = t.lastHunt;
  }

  // Резонанс
  if (p.resonance && p.resonance.kind) draft.resonance = p.resonance;

  // Листоги — замена целиком (только валидные)
  if (p.loresheets && p.loresheets.length > 0) draft.loresheets = p.loresheets;

  // Диаблери — перезапись счётчика, если найден в сводке
  if (p.diablerie && typeof p.diablerie.count === "number") {
    draft.diablerie = { count: p.diablerie.count, notes: draft.diablerie?.notes || "" };
  }

  // Убежище и имущество
  if (p.gear) {
    if (p.gear.haven) draft.gear.haven = p.gear.haven;
    if (p.gear.resources) draft.gear.resources = p.gear.resources;
    if (p.gear.items && p.gear.items.length > 0) draft.gear.items = p.gear.items;
  }

  // Записи журнала — добавить сверху, пропустив дубликаты
  if (p.notes && p.notes.length > 0) {
    const key = (n: VtmNote) => `${n.title}::${n.date}::${n.content}`;
    const existing = new Set(draft.notes.entries.map(key));
    const fresh = p.notes.filter((n) => !existing.has(key(n)));
    draft.notes.entries = [...fresh, ...draft.notes.entries];
  }

  // Журнал опыта — добавить сверху, пропустив записи, что уже есть на листе (по тексту)
  if (p.xpLog && p.xpLog.length > 0) {
    const existingTexts = new Set((draft.xpLog || []).map((e) => e.text));
    const fresh = p.xpLog
      .filter((e) => !existingTexts.has(e.text))
      .slice(0, 20)
      .map((e, i) => ({
        id: `xp-md-${Date.now().toString(36)}-${i}`,
        text: e.text.slice(0, 300),
        ts: e.ts,
      }));
    draft.xpLog = [...fresh, ...(draft.xpLog || [])].slice(0, 40);
  }
}
