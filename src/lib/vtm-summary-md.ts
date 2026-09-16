// ============================================================
// «СВОДКА СОРОДИЧА» в Markdown — выжимка листа для Obsidian-столов,
// Notion, любых вики: копируется кнопкой «Ⓜ МД» в шапке редактора.
// Чистый CommonMark-диалект (таблицы GFM): рендерится в Obsidian,
// Obsidian Publish, Discord (с включёнными таблицами) и на GitHub.
// Изолированный модуль VtM-вселенной.
// ============================================================

import { VtmSheetData, SKILL_LIBRARY, CLAN_BY_ID, SECT_BY_ID, PREDATOR_BY_ID, RESONANCE_BY_ID, RESONANCE_INTENSITY_LABELS } from "./vtm-data";
import { LORESHEET_BY_ID } from "./vtm-histories";
import { DerivedStats } from "./vtm-calc";

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

/** Полная Markdown-сводка листа — для Obsidian-столов и вики. */
export function buildSummaryMarkdown(data: VtmSheetData, derived: DerivedStats): string {
  const info = data.info;
  const clan = CLAN_BY_ID.get(info.clan);
  const sect = SECT_BY_ID.get(info.sect);
  const predator = PREDATOR_BY_ID.get(info.predator);
  const res = data.resonance.kind ? RESONANCE_BY_ID.get(data.resonance.kind) : undefined;

  const out: string[] = [];

  // ── Шапка ──
  out.push(`# 🩸 ${info.name || "Безымянный Сородич"}`);
  const identity = [
    info.clan === "thinblood" ? "⚱ Слабокровная" : clan ? `⛧ ${clan.name}` : null,
    sect?.name || null,
    info.generation ? `${info.generation}-е поколение` : null,
    predator ? `Стиль охоты: ${predator.name}` : null,
    `Сила Крови ${derived.bp}`,
  ]
    .filter(Boolean)
    .join(" · ");
  out.push("");
  out.push(`> [!info] ${identity}`);
  if (info.concept) out.push(`> «${info.concept}»`);
  if (info.chronicle || info.sire) {
    const parts: string[] = [];
    if (info.chronicle) parts.push(`Хроника: **${info.chronicle}**`);
    if (info.sire) parts.push(`Сир: ${info.sire}`);
    out.push(`> ${parts.join(" · ")}`);
  }

  // ── Треки ──
  out.push("");
  out.push("## Кровь и тело");
  out.push("");
  out.push("| Трек | Состояние |");
  out.push("| --- | --- |");
  out.push(`| Голод | ${"◔".repeat(data.trackers.hunger)}${"○".repeat(Math.max(0, 5 - data.trackers.hunger))} (${data.trackers.hunger}/5) |`);
  out.push(
    `| Здоровье | ${trackLine(derived.healthMax, data.trackers.healthSup, data.trackers.healthAgg)} — целых ${Math.max(0, derived.healthMax - data.trackers.healthSup - data.trackers.healthAgg)}/${derived.healthMax} |`
  );
  out.push(
    `| Воля | ${trackLine(derived.wpMax, data.trackers.wpSup, data.trackers.wpAgg)} — целых ${Math.max(0, derived.wpMax - data.trackers.wpSup - data.trackers.wpAgg)}/${derived.wpMax} |`
  );
  out.push(`| Человечность | ${derived.humanityTotal}/10${data.trackers.stains ? ` (пятна: ${data.trackers.stains})` : ""} |`);
  if (res && data.resonance.intensity > 0) {
    out.push(`| Резонанс крови | ${res.name}, ${RESONANCE_INTENSITY_LABELS[data.resonance.intensity] || data.resonance.intensity} |`);
  }
  out.push(`| Опыт | свободно ${data.trackers.xp} · вложено ${data.trackers.xpSpent} |`);
  if (data.trackers.huntCount > 0) {
    out.push(`| Ночи в хронике | ${data.trackers.huntCount} · последняя охота: ${data.trackers.lastHunt || "—"} |`);
  }
  const diab = data.diablerie?.count || 0;
  out.push(`| Диаблери | ${diab > 0 ? `${diab} × — в ауре чёрные прожилки` : "чисто"} |`);

  // ── Характеристики ──
  out.push("");
  out.push("## Характеристики");
  out.push("");
  const attrGroups: [string, [string, number][]][] = [
    ["Физические", [["Сила", data.attributes.str], ["Ловкость", data.attributes.dex], ["Выносливость", data.attributes.sta]]],
    ["Социальные", [["Обаяние", data.attributes.cha], ["Манипуляция", data.attributes.man], ["Самообладание", data.attributes.com]]],
    ["Ментальные", [["Интеллект", data.attributes.int], ["Смекалка", data.attributes.wit], ["Упорство", data.attributes.res]]],
  ];
  out.push("| Физические | Социальные | Ментальные |");
  out.push("| --- | --- | --- |");
  const rows = Math.max(...attrGroups.map(([, list]) => list.length));
  for (let i = 0; i < rows; i++) {
    const cells = attrGroups.map(([, list]) => {
      const [label, v] = list[i] || ["", 0];
      return label ? `${cell(label)} ${dots(v)}` : "";
    });
    out.push(`| ${cells.join(" | ")} |`);
  }

  // ── Навыки (только ненулевые, со специализациями) ──
  const skills = SKILL_LIBRARY.map((lib) => {
    const st = data.skills.find((s) => s.key === lib.id);
    return st && st.value > 0 ? { name: lib.name, value: st.value, spec: st.spec } : null;
  }).filter(Boolean) as { name: string; value: number; spec: string }[];
  const custom = data.skills
    .filter((s) => s.key === null && s.value > 0)
    .map((s) => ({ name: s.name, value: s.value, spec: s.spec }));

  out.push("");
  out.push("## Навыки");
  out.push("");
  const allSkills = [...skills, ...custom];
  if (allSkills.length === 0) {
    out.push("*— ни одного навыка —*");
  } else {
    for (const s of allSkills) {
      out.push(`- **${s.name} ${s.value}** ${dots(s.value)}${s.spec ? ` — специализация: *${s.spec}*` : ""}`);
    }
  }

  // ── Дисциплины ──
  out.push("");
  out.push("## Дисциплины");
  out.push("");
  const discs = data.disciplines.filter((d) => d.value > 0);
  if (discs.length === 0) {
    out.push("*— Кровь ещё не открыла тайн —*");
  } else {
    for (const d of discs) {
      out.push(`- **${d.name} ${d.value}** ${dots(d.value)}`);
      if (d.powers) {
        const powers = Object.entries(d.powers)
          .filter(([, name]) => name)
          .sort(([a], [b]) => parseInt(a, 10) - parseInt(b, 10));
        for (const [lvl, name] of powers) {
          out.push(`  - ${lvl} ур. — ${name}`);
        }
      }
    }
  }

  // ── Достоинства и недостатки ──
  out.push("");
  out.push("## Достоинства и недостатки");
  out.push("");
  if (data.advantages.length === 0) {
    out.push("*— ничего примечательного —*");
  } else {
    const kindLabel: Record<string, string> = {
      background: "факт",
      merit: "дост.",
      flaw: "недост.",
      thinblood: "сл.",
    };
    for (const a of data.advantages) {
      const rating = a.rating > 1 && a.kind !== "flaw" ? ` ${a.rating}` : "";
      const note = a.note ? ` — ${a.note}` : "";
      out.push(`- \`${kindLabel[a.kind] || a.kind}\` **${a.name}${rating}**${note}`);
    }
  }

  // ── Листоги («Истории», стр. 384+) ──
  if (data.loresheets && data.loresheets.length > 0) {
    out.push("");
    out.push("## Истории (листоги)");
    out.push("");
    for (const l of data.loresheets) {
      const def = LORESHEET_BY_ID.get(l.sheetId);
      if (!def || l.level <= 0) continue;
      const taken = def.levels.slice(0, l.level);
      out.push(`- **${def.name}** ${dots(l.level, 4)} (${def.levels.slice(0, l.level).reduce((s, x) => s + x.xp, 0)} опыта)`);
      for (const lv of taken) {
        out.push(`  - *${lv.name}* — ${lv.effect}`);
      }
      if (l.note) out.push(`  > Заметка: ${l.note}`);
    }
  }

  // ── Столкновения и опоры ──
  const principles = [info.principle1, info.principle2, info.principle3].filter(Boolean);
  const anchors = [info.anchor1, info.anchor2, info.anchor3].filter(Boolean);
  if (info.ambition || info.desire || principles.length || anchors.length) {
    out.push("");
    out.push("## Столкновения и опоры");
    out.push("");
    if (info.ambition) out.push(`- **Амбиция:** ${info.ambition}`);
    if (info.desire) out.push(`- **Желание:** ${info.desire}`);
    if (principles.length) out.push(`- **Принципы:** ${principles.join(" · ")}`);
    if (anchors.length) out.push(`- **Опоры:** ${anchors.join(" · ")}`);
  }

  // ── Убежище и имущество ──
  if (data.gear.haven || data.gear.items.length > 0 || data.gear.resources) {
    out.push("");
    out.push("## Убежище и имущество");
    out.push("");
    if (data.gear.haven) out.push(`> Убежище: ${data.gear.haven}`);
    if (data.gear.resources) out.push(`> Средства: ${data.gear.resources}`);
    if (data.gear.items.length > 0) {
      if (data.gear.haven || data.gear.resources) out.push("");
      for (const it of data.gear.items) {
        out.push(`- ${it.name}${it.count ? ` ×${it.count}` : ""}${it.note ? ` — *${it.note}*` : ""}`);
      }
    }
  }

  // ── Хроника ночей (последние 5 записей) ──
  if (data.notes.entries.length > 0) {
    out.push("");
    out.push("## Хроника ночей");
    out.push("");
    for (const n of data.notes.entries.slice(0, 5)) {
      const icon = n.title === "Новая охота" ? "🌙" : "🖋";
      out.push(`- ${icon} **${n.title || "Без заголовка"}** — *${n.date}*`);
      if (n.content) out.push(`  > ${n.content.replace(/\n/g, "\n  > ")}`);
    }
    if (data.notes.entries.length > 5) {
      out.push(`- *…и ещё ${data.notes.entries.length - 5} записей в архиве Крови*`);
    }
  }

  // ── Футер ──
  out.push("");
  out.push("---");
  out.push("*Сводка из листа «Вампиры: Маскарад», 5 ред. Полные записи — в архиве Крови.*");

  return out.join("\n");
}
