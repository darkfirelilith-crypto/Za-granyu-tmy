// ============================================================
// «ХРОНИКА НОЧЕЙ» в Markdown-файл — полный журнал Сородича,
// одной рукописью для Obsidian-хроник, печати и архивов стола.
// Отличается от «Ⓜ МД»-сводки: здесь вся история целиком
// (сводка берёт только последние 5 записей), плюс приложения.
// Раунд 46: сбор ленты вынесен в collectThreadItems (общий для
// MD и печатной темы), у длинных нитей — «Содержание»,
// добавлена печатная тема buildBloodThreadPrintHtml (PDF).
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

/** Сбор ленты «Кровавой нити» изо всех источников листа (раунд 46: общий для MD и PDF). */
function collectThreadItems(data: VtmSheetData): ThreadItem[] {
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
  return items;
}

/** Контекст листа — СК с учётом подъёма сверх поколения + identity-строка. */
function threadContext(data: VtmSheetData) {
  const info = data.info;
  const clan = info.clan === "thinblood" ? "Слабокровная" : CLAN_BY_ID.get(info.clan)?.name;
  const sect = SECT_BY_ID.get(info.sect)?.name;
  const name = info.name || "Безымянный Сородич";
  const bp = Math.max(bloodPotencyByGeneration(info.generation || 13), data.trackers.bpOverride || 0);
  return {
    name,
    clan,
    sect,
    bp,
    identity: [
      clan ? `Клан: **${clan}**` : null,
      sect ? `Секта: **${sect}**` : null,
      info.generation ? `Поколение: **${info.generation}-е**` : null,
      info.chronicle ? `Хроника: *${esc(info.chronicle)}*` : null,
    ].filter(Boolean) as string[],
    stats: `СК ${bp} · Голод ${data.trackers.hunger} · Человечность ${data.trackers.humanity}/10 · пятен ${data.trackers.stains} · ночей ${data.trackers.huntCount || 0}`,
  };
}

/** Единая «Кровавая нить» Markdown: журнал ночи + Диаблери + опыт, свежие сверху. */
export function buildBloodThreadMarkdown(data: VtmSheetData): string {
  const ctx = threadContext(data);
  const name = ctx.name;

  const items = collectThreadItems(data);

  // Контекст листа — как в шапке вкладки
  const huntCount = data.trackers.huntCount || 0;
  const noteCount = data.notes.entries.filter((n) => n.title !== "Новая охота").length;
  const diabCount = data.diablerie?.entries?.length || 0;
  const xpCount = (data.xpLog || []).length;

  const out: string[] = [];
  const now = new Date().toLocaleString("ru-RU", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

  // ── Титул ──
  out.push(`# 🩸 Кровавая нить — ${name}`);
  if (ctx.identity.length) out.push(`> ${ctx.identity.join(" · ")}`);
  out.push(
    "",
    `*СК ${ctx.bp} · Голод ${data.trackers.hunger} · Человечность ${data.trackers.humanity}/10 · пятен ${data.trackers.stains} · ночей ${huntCount}*`,
    "",
    `*ночей: ${huntCount} · записей: ${noteCount} · церемоний: ${diabCount} · строк опыта: ${xpCount}*`,
    "",
  );

  // ── Оглавление для длинных нитей (раунд 46) ──
  if (items.length >= 8) {
    out.push("## Содержание", "");
    items.forEach((it, i) => {
      out.push(`${i + 1}. ${THREAD_KIND_MD[it.kind].icon} ${it.title} — *${it.dateLabel}*`);
    });
    out.push("");
  }

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

// ============================================================
// «КРОВАВАЯ НИТЬ» — ПЕЧАТНАЯ ТЕМА (раунд 46)
// Та же лента, но самодостаточный HTML-документ для диалога
// печати браузера: «Сохранить как PDF» — и нить становится книгой.
// Палитра печати: пергамент + кровавые акценты, серифные шрифты,
// @page A4 — без зависимостей от темы сайта.
// ============================================================

/** Экранирование HTML-текста. */
const escHtml = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Абзацы записи: пустая строка = разрыв абзаца. */
const htmlParagraphs = (text: string): string =>
  text
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escHtml(p)}</p>`)
    .join("\n");

/** Самодостаточный HTML-документ «Кровавой нити» для window.print() → PDF. */
export function buildBloodThreadPrintHtml(data: VtmSheetData): string {
  const ctx = threadContext(data);
  const items = collectThreadItems(data);

  const huntCount = data.trackers.huntCount || 0;
  const noteCount = data.notes.entries.filter((n) => n.title !== "Новая охота").length;
  const diabCount = data.diablerie?.entries?.length || 0;
  const xpCount = (data.xpLog || []).length;

  const now = new Date().toLocaleString("ru-RU", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const counters = [
    { icon: "🌙", label: "ночей", value: huntCount },
    { icon: "🖋", label: "записей", value: noteCount },
    { icon: "⚷", label: "церемоний", value: diabCount },
    { icon: "✦", label: "строк опыта", value: xpCount },
  ]
    .map((c) => `<span class="th-count"><i>${c.icon}</i> ${c.value} ${c.label}</span>`)
    .join("");

  // Раунд 47: у каждой статьи есть якорь (#th-a1, #th-a2, …) — оглавление
  // ссылается на них, и в PDF-читалках строка содержания открывает нужную ночь.
  const thread = items.length
    ? items
        .map((it, idx) => {
          const meta = THREAD_KIND_MD[it.kind];
          const tags = it.tags.length
            ? `<div class="th-tags">${it.tags.map((t) => `<span>${escHtml(t)}</span>`).join("")}</div>`
            : "";
          return [
            `<article class="th-item th-${it.kind}" id="th-a${idx + 1}">`,
            `<h2><span class="th-ico" aria-hidden="true">${meta.icon}</span>${escHtml(it.title)}</h2>`,
            `<p class="th-meta">${escHtml(it.dateLabel)} · ${meta.label}</p>`,
            tags,
            htmlParagraphs(it.text || "—"),
            `</article>`,
          ]
            .filter(Boolean)
            .join("\n");
        })
        .join('\n<div class="th-rule" aria-hidden="true"></div>\n')
    : `<p class="th-empty">Нить пуста. Ночь первая — всё ещё впереди.</p>`;

  const draft = data.notes.draft.trim();
  const draftBlock = draft
    ? [
        `<div class="th-rule" aria-hidden="true"></div>`,
        `<section class="th-draft">`,
        `<h2><span class="th-ico" aria-hidden="true">🖇</span>Приложение: черновик пера</h2>`,
        `<p class="th-meta">наброски, не разнесённые по ночам</p>`,
        htmlParagraphs(draft),
        `</section>`,
      ].join("\n")
    : "";

  const identityHtml = ctx.identity.length
    ? `<p class="th-identity">${ctx.identity
        .map((s) =>
          escHtml(s)
            .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
            .replace(/\*(.+?)\*/g, "<i>$1</i>"),
        )
        .join(' <span class="th-sep" aria-hidden="true">·</span> ')}</p>`
    : "";

  const toc =
    items.length >= 8
      ? [
          `<section class="th-toc">`,
          `<h2><span class="th-ico" aria-hidden="true">☰</span>Содержание</h2>`,
          `<ol>`,
          ...items.map(
            (it, idx) =>
              `<li><a href="#th-a${idx + 1}">${escHtml(it.title)}</a> <span class="th-toc-date">— ${escHtml(it.dateLabel)}</span></li>`,
          ),
          `</ol>`,
          `</section>`,
        ].join("\n")
      : "";

  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Кровавая нить — ${escHtml(ctx.name)}</title>
<style>
  @page { size: A4; margin: 17mm 15mm 19mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body {
    font-family: "EB Garamond", "Georgia", "Times New Roman", serif;
    background: #f6efe1;
    color: #2c2117;
    font-size: 11.5pt;
    line-height: 1.55;
    padding: 14mm 12mm;
    max-width: 210mm;
    margin: 0 auto;
  }
  .th-head { text-align: center; margin-bottom: 7mm; }
  .th-crest { font-size: 20pt; letter-spacing: 0.35em; color: #7a1f2b; margin-bottom: 2mm; }
  h1 {
    font-size: 21pt; font-weight: 600; color: #6d1622;
    letter-spacing: 0.02em; line-height: 1.2;
  }
  .th-identity { margin-top: 2.5mm; font-size: 10.5pt; color: #5a4633; }
  .th-identity b { color: #6d1622; }
  .th-sep { color: #a0522d; padding: 0 1mm; }
  .th-context {
    margin: 3.5mm auto 0; display: inline-block;
    border-top: 1px solid #b08d5f; border-bottom: 1px solid #b08d5f;
    padding: 1.2mm 4mm; font-size: 9.5pt; letter-spacing: 0.06em;
    color: #4a3826; font-variant: small-caps;
  }
  .th-counters {
    margin-top: 3.5mm; display: flex; flex-wrap: wrap; justify-content: center;
    gap: 1.5mm 5mm; font-size: 9pt; color: #5a4633;
  }
  .th-count i { font-style: normal; color: #7a1f2b; }
  .th-stamp { margin-top: 2.5mm; font-size: 8.5pt; color: #8a7355; font-style: italic; }
  .th-rule {
    height: 0; border-top: 1px solid #c9b28f; position: relative;
    margin: 5mm 0;
  }
  .th-rule::after {
    content: "❦"; position: absolute; left: 50%; top: 50%;
    transform: translate(-50%, -54%); background: #f6efe1;
    color: #a0522d; font-size: 9pt; padding: 0 2.5mm;
  }
  .th-toc { margin: 0 0 5mm; break-inside: avoid; }
  .th-toc h2, .th-draft h2 { font-size: 13pt; color: #6d1622; margin-bottom: 1.5mm; }
  .th-toc ol { list-style: decimal-leading-zero; margin-left: 7mm; font-size: 10pt; color: #4a3826; columns: 2; column-gap: 8mm; }
  .th-toc li { padding: 0.4mm 0; break-inside: avoid; }
  /* Раунд 47: якорные ссылки содержания — живут и в сохранённом PDF */
  .th-toc a { color: #4a3826; text-decoration: none; border-bottom: 1px dotted #a0522d; }
  .th-toc a:hover { color: #6d1622; border-bottom-color: #6d1622; }
  .th-toc-date { color: #8a7355; font-style: italic; font-size: 9pt; }
  .th-item { break-inside: avoid; scroll-margin: 8mm 0; }
  .th-item h2 {
    font-size: 13.5pt; color: #3a2b1d; line-height: 1.25;
    margin-bottom: 1mm;
  }
  .th-ico { margin-right: 2mm; }
  .th-meta {
    font-size: 9pt; letter-spacing: 0.05em; color: #8a7355;
    font-variant: small-caps; margin-bottom: 1.6mm;
  }
  .th-tags { margin: 0 0 1.6mm; display: flex; flex-wrap: wrap; gap: 1.2mm; }
  .th-tags span {
    border: 1px solid #7a1f2b; color: #7a1f2b;
    font-size: 8pt; letter-spacing: 0.08em; text-transform: uppercase;
    padding: 0.3mm 1.8mm; border-radius: 1mm;
  }
  .th-item p { margin: 0 0 2mm; text-align: justify; hyphens: auto; }
  .th-empty {
    text-align: center; font-style: italic; color: #5a4633;
    padding: 8mm 0; font-size: 11pt;
  }
  .th-draft { break-inside: avoid; }
  .th-draft p { font-style: italic; color: #4a3826; }
  .th-foot {
    margin-top: 7mm; text-align: center; font-size: 8.5pt;
    letter-spacing: 0.14em; text-transform: uppercase; color: #7a1f2b;
  }
  .th-foot::before { content: ""; display: block; width: 30mm; margin: 0 auto 2.5mm; border-top: 1px solid #7a1f2b; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
<header class="th-head">
  <div class="th-crest" aria-hidden="true">🩸</div>
  <h1>Кровавая нить — ${escHtml(ctx.name)}</h1>
  ${identityHtml}
  <div class="th-context">${escHtml(ctx.stats)}</div>
  <div class="th-counters">${counters}</div>
  <p class="th-stamp">сверстано ${escHtml(now)} · «Вампиры: Маскарад» · 5-я редакция</p>
</header>
<div class="th-rule" aria-hidden="true"></div>
${toc}
${thread}
${draftBlock}
<div class="th-rule" aria-hidden="true"></div>
<p class="th-foot">Кровь запомнила каждую ночь</p>
</body>
</html>`;
}
