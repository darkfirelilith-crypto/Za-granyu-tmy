// ============================================================
// «СВОДКА СОРОДИЧА» текстом — выжимка листа для мессенджеров
// стола (Telegram/Discord): копируется в буфер обмена кнопкой
// «⧉ Текст» в шапке редактора. Unicode-графика, без markdown —
// читается везде. Изолированный модуль VtM-вселенной.
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

/** Метка недуга здоровья/воли для числовой подписи. */
const damageLabel = (total: number, sup: number, agg: number): string => {
  const left = Math.max(0, total - sup - agg);
  return `${left}/${total}`;
};

const W = 38; // ширина текстовой линейки

const rule = (char = "─"): string => char.repeat(W);
const section = (title: string): string => `\n${title.toUpperCase()}\n${rule("·")}`;

/** Полная текстовая сводка листа — для мессенджеров стола рассказчика. */
export function buildSummaryText(data: VtmSheetData, derived: DerivedStats): string {
  const info = data.info;
  const clan = CLAN_BY_ID.get(info.clan);
  const sect = SECT_BY_ID.get(info.sect);
  const predator = PREDATOR_BY_ID.get(info.predator);
  const res = data.resonance.kind ? RESONANCE_BY_ID.get(data.resonance.kind) : undefined;

  const out: string[] = [];

  // ── Шапка ──
  out.push(`🩸 ${rule()}`);
  out.push((info.name || "Безымянный Сородич").toUpperCase());
  out.push(
    [
      info.clan === "thinblood" ? "⚱ Слабокровная" : clan ? `⛧ ${clan.name}` : null,
      sect?.name || null,
      info.generation ? `${info.generation}-е пок.` : null,
      predator?.name || null,
      `Сила Крови ${derived.bp}`,
    ]
      .filter(Boolean)
      .join(" · ")
  );
  if (info.concept) out.push(`«${info.concept}»`);

  // ── Треки ──
  out.push(section("Треки"));
  out.push(`Голод: ${"◔".repeat(data.trackers.hunger)}${"○".repeat(Math.max(0, 5 - data.trackers.hunger))} (${data.trackers.hunger}/5)`);
  out.push(`Здоровье: ${trackLine(derived.healthMax, data.trackers.healthSup, data.trackers.healthAgg)} — целых ${damageLabel(derived.healthMax, data.trackers.healthSup, data.trackers.healthAgg)}`);
  out.push(`Воля: ${trackLine(derived.wpMax, data.trackers.wpSup, data.trackers.wpAgg)} — целых ${damageLabel(derived.wpMax, data.trackers.wpSup, data.trackers.wpAgg)}`);
  out.push(`Человечность: ${derived.humanityTotal}/10${data.trackers.stains ? ` (пятна: ${data.trackers.stains})` : ""}`);
  if (res && data.resonance.intensity > 0) {
    out.push(`Резонанс крови: ${res.name}, ${RESONANCE_INTENSITY_LABELS[data.resonance.intensity] || data.resonance.intensity}`);
  }
  out.push(`Опыт: свободно ${data.trackers.xp}, вложено ${data.trackers.xpSpent}`);
  // Журнал опыта — последние 3 записи (покупки падают сами)
  for (const e of (data.xpLog || []).slice(0, 3)) {
    out.push(`  ↳ ${e.text}`);
  }
  const xpRest = (data.xpLog || []).length - Math.min(3, (data.xpLog || []).length);
  if (xpRest > 0) out.push(`  …и ещё ${xpRest} записей в архиве Крови`);
  if (data.trackers.huntCount > 0) {
    out.push(`Ночей в хронике: ${data.trackers.huntCount} · последняя охота: ${data.trackers.lastHunt || "—"}`);
  }

  // ── Характеристики ──
  out.push(section("Характеристики"));
  const attrs: [string, number][] = [
    ["Сила", data.attributes.str],
    ["Ловкость", data.attributes.dex],
    ["Выносливость", data.attributes.sta],
    ["Обаяние", data.attributes.cha],
    ["Манипуляция", data.attributes.man],
    ["Самообладание", data.attributes.com],
    ["Интеллект", data.attributes.int],
    ["Смекалка", data.attributes.wit],
    ["Упорство", data.attributes.res],
  ];
  for (const [label, v] of attrs) out.push(`${label.padEnd(14, " ")} ${dots(v)}`);

  // ── Навыки (только ненулевые, со специализациями) ──
  const skills = SKILL_LIBRARY.map((lib) => {
    const st = data.skills.find((s) => s.key === lib.id);
    return st && st.value > 0 ? { name: lib.name, value: st.value, spec: st.spec } : null;
  }).filter(Boolean) as { name: string; value: number; spec: string }[];
  const custom = data.skills
    .filter((s) => s.key === null && s.value > 0)
    .map((s) => ({ name: s.name, value: s.value, spec: s.spec }));

  out.push(section("Навыки"));
  const allSkills = [...skills, ...custom];
  if (allSkills.length === 0) {
    out.push("— ни одного навыка —");
  } else {
    for (const s of allSkills) {
      out.push(`${s.name.padEnd(14, " ")} ${dots(s.value)}${s.spec ? ` (${s.spec})` : ""}`);
    }
  }

  // ── Дисциплины ──
  out.push(section("Дисциплины"));
  const discs = data.disciplines.filter((d) => d.value > 0);
  if (discs.length === 0) {
    out.push("— Кровь ещё не открыла тайн —");
  } else {
    for (const d of discs) {
      const powers = d.powers
        ? Object.entries(d.powers)
            .filter(([, name]) => name)
            .sort(([a], [b]) => parseInt(a, 10) - parseInt(b, 10))
            .map(([lvl, name]) => `\n   · ${lvl} ур.: ${name}`)
            .join("")
        : "";
      out.push(`${d.name} ${dots(d.value)}${powers}`);
    }
  }

  // ── Достоинства и недостатки ──
  out.push(section("Достоинства и недостатки"));
  if (data.advantages.length === 0) {
    out.push("— ничего примечательного —");
  } else {
    const kindLabel: Record<string, string> = {
      background: "факт",
      merit: "дост.",
      flaw: "недост.",
      thinblood: "сл.",
    };
    for (const a of data.advantages) {
      out.push(
        `[${kindLabel[a.kind] || a.kind}] ${a.name}${a.rating > 1 && a.kind !== "flaw" ? ` ${a.rating}` : ""}${a.note ? ` — ${a.note}` : ""}`
      );
    }
  }

  // ── Листоги («Истории») ──
  if (data.loresheets && data.loresheets.length > 0) {
    const lsLines: string[] = [];
    for (const l of data.loresheets) {
      const def = LORESHEET_BY_ID.get(l.sheetId);
      if (!def || l.level <= 0) continue;
      lsLines.push(`${def.name} ${dots(l.level, 4)}${l.note ? ` — ${l.note}` : ""}`);
    }
    if (lsLines.length) {
      out.push(section("Истории (листоги)"));
      out.push(...lsLines);
    }
  }

  // ── Столкновения и опоры ──
  const principles = [info.principle1, info.principle2, info.principle3].filter(Boolean);
  const anchors = [info.anchor1, info.anchor2, info.anchor3].filter(Boolean);
  if (info.ambition || info.desire || principles.length || anchors.length) {
    out.push(section("Столкновения и опоры"));
    if (info.ambition) out.push(`Амбиция: ${info.ambition}`);
    if (info.desire) out.push(`Желание: ${info.desire}`);
    if (principles.length) out.push(`Принципы: ${principles.join(" · ")}`);
    if (anchors.length) out.push(`Опоры: ${anchors.join(" · ")}`);
  }

  // ── Убежище и имущество ──
  if (data.gear.haven || data.gear.items.length > 0 || data.gear.resources) {
    out.push(section("Убежище и имущество"));
    if (data.gear.haven) out.push(`Убежище: ${data.gear.haven}`);
    if (data.gear.resources) out.push(`Средства: ${data.gear.resources}`);
    if (data.gear.items.length > 0) {
      out.push(`При себе: ${data.gear.items.map((it) => it.name + (it.count ? ` ×${it.count}` : "")).join("; ")}`);
    }
  }

  // ── Хроника / сир ──
  if (info.chronicle || info.sire) {
    const parts: string[] = [];
    if (info.chronicle) parts.push(`Хроника: ${info.chronicle}`);
    if (info.sire) parts.push(`Сир: ${info.sire}`);
    out.push(parts.join(" · "));
  }

  // ── Футер ──
  out.push(`🩸 ${rule()}`);
  out.push("Сводка из листа «Вампиры: Маскарад», 5 ред. Полные записи — в архиве Крови.");

  return out.join("\n");
}
