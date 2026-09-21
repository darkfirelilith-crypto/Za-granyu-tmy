// ============================================================
// «ХРОНИКА НОЧЕЙ» в Markdown-файл — полный журнал Сородича,
// одной рукописью для Obsidian-хроник, печати и архивов стола.
// Отличается от «Ⓜ МД»-сводки: здесь вся история целиком
// (сводка берёт только последние 5 записей), плюс приложения.
// Изолированный модуль VtM-вселенной.
// ============================================================

import { VtmSheetData, CLAN_BY_ID, SECT_BY_ID, bloodPotencyByGeneration } from "./vtm-data";

/** Дата из записи уже отформатирована — эскейпим только трубы. */
const esc = (s: string): string => s.replace(/\|/g, "\\|");

/** Полная Markdown-хроника: все записи журнала + черновик-приложение. */
export function buildChronicleMarkdown(data: VtmSheetData): string {
  const info = data.info;
  const clan = info.clan === "thinblood" ? "Слабокровная" : CLAN_BY_ID.get(info.clan)?.name;
  const sect = SECT_BY_ID.get(info.sect)?.name;
  const name = info.name || "Безымянный Сородич";
  const entries = data.notes.entries;

  const out: string[] = [];
  const now = new Date().toLocaleString("ru-RU", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

  // ── Титул ──
  out.push(`# 🌙 Хроника ночей — ${name}`);
  const identity = [
    clan ? `Клан: **${clan}**` : null,
    sect ? `Секта: **${sect}**` : null,
    info.generation ? `Поколение: **${info.generation}-е**` : null,
    info.chronicle ? `Хроника: *${esc(info.chronicle)}*` : null,
  ].filter(Boolean);
  if (identity.length) out.push(`> ${identity.join(" · ")}`);
  out.push("", `*Сверстано ${now} · записей: ${entries.length}*`, "");

  // ── Оглавление ночей (если записей много) ──
  if (entries.length > 6) {
    out.push("## Содержание", "");
    // Лента идёт от новых к старым; в оглавлении — хронологический порядок
    [...entries].reverse().forEach((n, i) => {
      const hunt = n.title === "Новая охота";
      out.push(`${i + 1}. ${hunt ? "🌙" : "🖋"} ${n.title || "Без заголовка"} — ${n.date}`);
    });
    out.push("");
  }

  // ── Полный журнал: от старых к новым (хроника читается вперёд) ──
  out.push("---", "");
  if (entries.length === 0) {
    out.push("> Журнал чист. Ночь первая — всё ещё впереди.", "");
  } else {
    const chron = [...entries].reverse();
    chron.forEach((n, i) => {
      const hunt = n.title === "Новая охота";
      const title = n.title || "Без заголовка";
      out.push(`## ${hunt ? "🌙" : "🖋"} ${title}`);
      out.push("", `*${n.date} · ночь ${i + 1} из ${chron.length}*`, "");
      out.push(n.content.trim(), "");
    });
  }

  // ── Приложение: черновик (наброски, не вошедшие в журнал) ──
  const draft = data.notes.draft.trim();
  if (draft) {
    out.push("---", "", "## 🖇 Приложение: черновик пера", "");
    out.push("> Наброски, не разнесённые по ночам", "");
    out.push(draft, "");
  }

  // ── Футер ──
  out.push("---", "", "*Кровь запомнила каждое слово. «Вампиры: Маскарад» · 5-я редакция*");

  return out.join("\n");
}

/** Имя файла хроники: транслит не нужен — имя берём как есть, опасные символы режем. */
export function chronicleFileName(name: string): string {
  const safe = (name || "Сородич").replace(/[\\/:*?"<>|]+/g, "").trim().slice(0, 60);
  const d = new Date();
  const stamp = `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
  return `Хроника-ночей-${safe || "Сородич"}-${stamp}.md`;
}

// ============================================================
// «КРОВАВАЯ НИТЬ» (раунд 43) — единая лента вкладки «Хроника»
// одним Markdown-файлом: охоты и записи журнала ночи, церемонии
// Диаблери и строки журнала опыта, свежие сверху.
// ============================================================

type ThreadKind = "hunt" | "note" | "diab" | "xp";

interface ThreadItem {
  kind: ThreadKind;
  title: string;
  dateLabel: string;
  tsMs: number; // время для сортировки (0 — не разобрать)
  text: string;
  tags: string[]; // «↑СК», «+пятно», «воля 2/3»
}

const THREAD_KIND_MD: Record<ThreadKind, { icon: string; label: string }> = {
  hunt: { icon: "🌙", label: "охота" },
  note: { icon: "🖋", label: "запись" },
  diab: { icon: "⚷", label: "церемония" },
  xp: { icon: "✦", label: "опыт" },
};

/** Терпимый парсер дат — та же логика, что и в вкладке «Хроника» (lib не зависит от компонентов). */
const RU_MONTHS_MD: Record<string, number> = {
  "янв": 0, "фев": 1, "мар": 2, "апр": 3, "мая": 4, "май": 4, "июн": 5, "июл": 6, "авг": 7, "сен": 8, "окт": 9, "ноя": 10, "дек": 11,
};

function parseRuDateMsLocal(s: string): number {
  if (!s) return 0;
  const iso = Date.parse(s);
  if (!Number.isNaN(iso)) return iso;
  // «21.09.2026» или «21.09.2026, 13:35»
  const dot = s.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (dot) {
    const time = s.match(/(\d{1,2}):(\d{2})/);
    return new Date(
      Number(dot[3]),
      Number(dot[2]) - 1,
      Number(dot[1]),
      time ? Number(time[1]) : 0,
      time ? Number(time[2]) : 0,
    ).getTime();
  }
  // «21 сент., 13:35»
  const ru = s.match(/(\d{1,2})\s+([а-яё]+)[,.]?\s*(?:(\d{1,2}):(\d{2}))?/i);
  if (ru) {
    const month = RU_MONTHS_MD[ru[2].toLowerCase().slice(0, 3)];
    if (month !== undefined) {
      const now = new Date();
      return new Date(
        now.getFullYear(),
        month,
        Number(ru[1]),
        ru[3] ? Number(ru[3]) : 0,
        ru[4] ? Number(ru[4]) : 0,
      ).getTime();
    }
  }
  return 0;
}

/** Единая «Кровавая нить» Markdown: журнал ночи + Диаблери + опыт, свежие сверху. */
export function buildBloodThreadMarkdown(data: VtmSheetData): string {
  const info = data.info;
  const clan = info.clan === "thinblood" ? "Слабокровная" : CLAN_BY_ID.get(info.clan)?.name;
  const sect = SECT_BY_ID.get(info.sect)?.name;
  const name = info.name || "Безымянный Сородич";

  const items: ThreadItem[] = [];

  // 1) Журнал ночи: охоты и записи
  for (const n of data.notes.entries) {
    const hunt = n.title === "Новая охота";
    items.push({
      kind: hunt ? "hunt" : "note",
      title: n.title || "Без заголовка",
      dateLabel: n.date || "—",
      tsMs: parseRuDateMsLocal(n.date),
      text: n.content.trim(),
      tags: [],
    });
  }

  // 2) Церемонии Диаблери: ⚷ с метками ↑СК / +пятно / воля N/D
  for (const e of data.diablerie?.entries || []) {
    items.push({
      kind: "diab",
      title: `Диаблери: ${e.victim || "безымянный Сородич"}`,
      dateLabel: e.ts
        ? new Date(e.ts).toLocaleDateString("ru-RU", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" })
        : "—",
      tsMs: parseRuDateMsLocal(e.ts),
      text:
        `Выпита душа Сородича${e.gen ? ` (${e.gen}-е поколение)` : " (поколение неизвестно)"}.` +
        (e.bpGift ? " Душа была сильнее — дарована Сила Крови." : "") +
        (e.extraStain ? " Воля дрогнула — третье пятно Человечности." : ""),
      tags: [
        ...(e.bpGift ? ["↑СК"] : []),
        ...(e.extraStain ? ["+пятно"] : []),
        ...(e.check ? [`воля ${e.check.successes}/${e.check.diff}`] : []),
      ],
    });
  }

  // 3) Журнал опыта: ✦-строки Кошелька Крови
  for (const x of data.xpLog || []) {
    items.push({
      kind: "xp",
      title: "Журнал опыта",
      dateLabel: x.ts
        ? new Date(x.ts).toLocaleString("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
        : "—",
      tsMs: parseRuDateMsLocal(x.ts),
      text: x.text,
      tags: [],
    });
  }

  // Сортировка ленты вкладки «Хроника»: свежие сверху; неразобранные даты — на месте источника
  items.sort((a, b) => {
    if (a.tsMs && b.tsMs) return b.tsMs - a.tsMs;
    if (a.tsMs) return -1;
    if (b.tsMs) return 1;
    return 0;
  });

  // Контекст листа — как в шапке вкладки (СК с учётом подъёма сверх поколения)
  const bp = Math.max(bloodPotencyByGeneration(info.generation || 13), data.trackers.bpOverride || 0);
  const huntCount = data.trackers.huntCount || 0;
  const noteCount = data.notes.entries.filter((n) => n.title !== "Новая охота").length;
  const diabCount = data.diablerie?.entries?.length || 0;
  const xpCount = (data.xpLog || []).length;

  const out: string[] = [];
  const now = new Date().toLocaleString("ru-RU", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

  // ── Титул ──
  out.push(`# 🩸 Кровавая нить — ${name}`);
  const identity = [
    clan ? `Клан: **${clan}**` : null,
    sect ? `Секта: **${sect}**` : null,
    info.generation ? `Поколение: **${info.generation}-е**` : null,
    info.chronicle ? `Хроника: *${esc(info.chronicle)}*` : null,
  ].filter(Boolean);
  if (identity.length) out.push(`> ${identity.join(" · ")}`);
  out.push(
    "",
    `*СК ${bp} · Голод ${data.trackers.hunger} · Человечность ${data.trackers.humanity}/10 · пятен ${data.trackers.stains} · ночей ${huntCount}*`,
    "",
    `*ночей: ${huntCount} · записей: ${noteCount} · церемоний: ${diabCount} · строк опыта: ${xpCount}*`,
    "",
  );

  // ── Нить: свежие сверху ──
  out.push("---", "");
  if (items.length === 0) {
    out.push("> Нить пуста. Пробуди нового Сородича — или живи первую ночь.", "");
  } else {
    items.forEach((it, i) => {
      const meta = THREAD_KIND_MD[it.kind];
      out.push(`## ${meta.icon} ${it.title}`);
      out.push("", `*${it.dateLabel} · ${meta.label}*`, "");
      if (it.tags.length) out.push(`*${it.tags.map(esc).join(" · ")}*`, "");
      out.push(it.text.trim() || "—", "");
      if (i < items.length - 1) out.push("---", "");
    });
  }

  // ── Приложение: черновик (наброски, не вошедшие в журнал) ──
  const draft = data.notes.draft.trim();
  if (draft) {
    out.push("---", "", "## 🖇 Приложение: черновик пера", "");
    out.push("> Наброски, не разнесённые по ночам", "");
    out.push(draft, "");
  }

  // ── Футер ──
  out.push("---", "", "*Кровь запомнила каждую ночь. «Вампиры: Маскарад» · 5-я редакция*");

  return out.join("\n");
}

/** Имя файла «Кровавой нити»: Кровавая-нить-{имя}-{ДД-ММ-ГГГГ}.md */
export function bloodThreadFileName(name: string): string {
  const safe = (name || "Сородич").replace(/[\\/:*?"<>|]+/g, "").trim().slice(0, 60);
  const d = new Date();
  const stamp = `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
  return `Кровавая-нить-${safe || "Сородич"}-${stamp}.md`;
}
