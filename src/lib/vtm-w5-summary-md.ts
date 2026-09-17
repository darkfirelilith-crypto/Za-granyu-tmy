// ============================================================
// «СВОДКА ГАРОУ» в Markdown — выжимка листа W5 для Obsidian-столов,
// Notion, любых вики: копируется кнопкой «Ⓜ МД» в шапке редактора Гароу.
// Чистый CommonMark-диалект (таблицы GFM, callouts Obsidian).
// Изолированный модуль VtM-вселенной: знает только W5-лист.
// ============================================================

import {
  W5SheetData,
  W5_TRIBE_BY_ID,
  W5_AUSPICE_BY_ID,
  W5_BREEDS,
  W5_FORMS,
  w5WillpowerMax,
  w5HealthMax,
  w5Rank,
} from "./vtm-w5data";
import { SKILL_LIBRARY } from "./vtm-data";

const dots = (n: number, max = 5): string =>
  "●".repeat(Math.max(0, Math.min(max, n))) + "○".repeat(Math.max(0, max - Math.max(0, Math.min(max, n))));

/** Трек здоровья/воли: □ цело · ▣ поверхностный · ☒ тяжёлый */
const trackLine = (total: number, sup: number, agg: number): string =>
  Array.from({ length: total }, (_, i) => {
    const n = i + 1;
    if (n <= agg) return "☒";
    if (n <= agg + sup) return "▣";
    return "□";
  }).join(" ");

/** Эскейп первой трубы в ячейке таблицы. */
const cell = (s: string): string => s.replace(/\|/g, "\\|");

/** Полная Markdown-сводка листа Гароу (W5) — для Obsidian-столов и вики. */
export function buildW5SummaryMarkdown(data: W5SheetData): string {
  const info = data.info;
  const tribe = W5_TRIBE_BY_ID.get(info.tribe);
  const auspice = W5_AUSPICE_BY_ID.get(info.auspice);
  const breed = W5_BREEDS.find((b) => b.id === info.breed);
  const rank = w5Rank(data.trackers.glory, data.trackers.honor, data.trackers.wisdom);
  const healthMax = w5HealthMax(data);
  const wpMax = w5WillpowerMax(data);

  const out: string[] = [];

  // ── Шапка ──
  out.push(`# 🐺 ${info.name || "Безымянный Гароу"}`);
  const identity = [
    tribe ? (tribe.wayward ? `☠ ${tribe.name} (wayward)` : `🐺 ${tribe.name}`) : null,
    auspice ? `🌙 ${auspice.name}` : null,
    breed ? breed.name : null,
    info.pack ? `Стая: **${info.pack}**` : null,
  ].filter(Boolean).join(" · ");
  out.push("");
  out.push(`> [!info] ${identity || "Лунный Народ"}`);
  if (info.concept) out.push(`> «${info.concept}»`);
  if (info.totem) out.push(`> Тотем стаи: **${info.totem}**`);
  if (info.chronicle) out.push(`> Хроника: **${info.chronicle}**`);

  // ── Витальные треки ──
  out.push("");
  out.push("## 🌗 Витальные шкалы");
  out.push("");
  out.push("| Шкала | Значение | Трек |");
  out.push("| --- | --- | --- |");
  out.push(`| Ярость | **${data.trackers.rage}/5**${data.trackers.wolfLost ? " ⚠️ волк потерян" : ""}${data.trackers.harano ? " · харано" : ""} | ${trackLine(5, data.trackers.rage, 0)} |`);
  out.push(`| Здоровье | **${data.trackers.healthSup + data.trackers.healthAgg}/${healthMax}** | ${trackLine(healthMax, data.trackers.healthSup, data.trackers.healthAgg)} |`);
  out.push(`| Воля | **${data.trackers.wpSup}/${wpMax}** | ${trackLine(wpMax, data.trackers.wpSup, 0)} |`);
  out.push(`| Опыт | ${data.trackers.xp} (потрачено ${data.trackers.xpSpent}) | — |`);

  // ── Слава: три чипа с рангом ──
  out.push("");
  out.push(`> [!quote] Слава **${data.trackers.glory + data.trackers.honor + data.trackers.wisdom}** — ${rank.title}`);
  out.push(`> \`Гордец ${data.trackers.glory}\` · \`Честь ${data.trackers.honor}\` · \`Мудрость ${data.trackers.wisdom}\``);

  // ── Характеристики ──
  out.push("");
  out.push("## ☾ Девять лун");
  out.push("");
  out.push("| Физические | Социальные | Ментальные |");
  out.push("| --- | --- | --- |");
  const attrs = data.attributes;
  out.push(`| Сила ${dots(attrs.str)} | Обаяние ${dots(attrs.cha)} | Интеллект ${dots(attrs.int)} |`);
  out.push(`| Ловкость ${dots(attrs.dex)} | Манипуляция ${dots(attrs.man)} | Смекалка ${dots(attrs.wit)} |`);
  out.push(`| Стойкость ${dots(attrs.sta)} | Самообладание ${dots(attrs.com)} | Упорство ${dots(attrs.res)} |`);

  // ── Навыки (только изученные) ──
  const learned = data.skills.filter((s) => s.value > 0);
  if (learned.length) {
    out.push("");
    out.push("## ✦ Навыки");
    out.push("");
    out.push("| Навык | Уровень | Специализация |");
    out.push("| --- | --- | --- |");
    for (const s of learned) {
      const lib = SKILL_LIBRARY.find((l) => l.id === s.id);
      out.push(`| ${lib?.name || s.id} | ${dots(s.value)} | ${s.spec ? cell(s.spec) : "—"} |`);
    }
  }

  // ── Дары ──
  if (data.gifts.length) {
    out.push("");
    out.push("## ◈ Дары");
    out.push("");
    for (const g of data.gifts) {
      out.push(`- **${g.name}** — ${dots(g.level)}${g.note ? ` · ${cell(g.note)}` : ""}`);
    }
  }

  // ── Обряды ──
  if (data.rites.length) {
    out.push("");
    out.push("## ⚱ Обряды");
    out.push("");
    for (const r of data.rites) {
      out.push(`- **${r.name}** (${r.level} ур.)${r.note ? ` · ${cell(r.note)}` : ""}`);
    }
  }

  // ── Стремления и касания ──
  const aspirations = data.aspirations.map((a) => a.text).filter(Boolean);
  const touches = data.touchstones.map((t) => t.text).filter(Boolean);
  if (aspirations.length || touches.length) {
    out.push("");
    out.push("## 🔥 Стремления и касания");
    if (aspirations.length) {
      out.push("");
      out.push("**Стремления:**");
      for (const a of aspirations) out.push(`- ${cell(a)}`);
    }
    if (touches.length) {
      out.push("");
      out.push("**Касания (опоры):**");
      for (const t of touches) out.push(`- ${cell(t)}`);
    }
  }

  // ── Пять обликов (памятка) ──
  out.push("");
  out.push("## 🐾 Пять обликов");
  out.push("");
  out.push(W5_FORMS.map((f) => `\`${f.name}\``).join(" · "));
  out.push("");
  out.push("> [!warning] Кринос: каждый ход без убитого — 1 Воля, иначе безумие. Серебро ранит Гароу больнее всего.");

  // ── Снаряжение ──
  if (data.gear.length) {
    out.push("");
    out.push("## 🎒 Снаряжение");
    out.push("");
    for (const g of data.gear) {
      out.push(`- ${cell(g.name)}${g.count ? ` ×${cell(g.count)}` : ""}${g.note ? ` — ${cell(g.note)}` : ""}`);
    }
  }

  // ── Лунный дневник ──
  const notes = data.notes.filter((n) => n.content.trim());
  if (notes.length) {
    out.push("");
    out.push("## 🖋 Лунный дневник");
    out.push("");
    for (const n of notes.slice(0, 12)) {
      out.push(`- **${n.date || n.title || "без даты"}** — ${cell(n.content).slice(0, 300)}`);
    }
    if (notes.length > 12) out.push(`- …и ещё ${notes.length - 12} записей в онлайн-архиве`);
  }

  // ── Цитата ──
  const quote = info.quote.trim();
  if (quote) {
    out.push("");
    // не оборачиваем в «», если кавычки уже есть внутри
    out.push(quote.startsWith("«") || quote.startsWith('"') ? `> ${quote}` : `> «${quote}»`);
  }
  out.push("");
  out.push("*Лист Гароу (W5) · раздел «Маскарад» · В5-стиль костей: успех на 6+, кости Ярости красные, Жестокие (1–2) успеха не дают.*");

  return out.join("\n");
}
