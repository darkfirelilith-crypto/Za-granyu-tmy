// ============================================================
// «ДОСЬЕ ДЛЯ СТОЛА» — ПЕЧАТНАЯ ТЕМА (раунд 47)
// Карточка Сородича для стола Рассказчика, переведённая на общий
// печатный стан iframe (раньше — window.print() с print-CSS сайта).
// Стиль — единый с печатной темой «Кровавой нити»: пергамент,
// кровавые акценты, серифы, @page A4. Самодостаточный HTML.
// Изолированный модуль VtM-вселенной.
// ============================================================

import {
  VtmSheetData,
  CLAN_BY_ID,
  SECT_BY_ID,
  PREDATOR_BY_ID,
  RESONANCE_BY_ID,
  RESONANCE_INTENSITY_LABELS,
  bloodPotencyByGeneration,
} from "./vtm-data";
import { DerivedStats } from "./vtm-calc";

const escHtml = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const dots = (n: number, max = 5): string =>
  "●".repeat(Math.max(0, Math.min(max, n))) + "○".repeat(Math.max(0, max - Math.max(0, Math.min(max, n))));

/** Трек здоровья/воли: □ пусто · ▣ поверхностный · ☒ тяжёлый */
const trackBoxes = (total: number, sup: number, agg: number): string =>
  Array.from({ length: total }, (_, i) => {
    const n = i + 1;
    if (n <= agg) return "☒";
    if (n <= agg + sup) return "▣";
    return "□";
  }).join(" ");

const ATTR_ROWS: { label: string; get: (a: VtmSheetData["attributes"]) => number }[] = [
  { label: "Сила", get: (a) => a.str },
  { label: "Ловкость", get: (a) => a.dex },
  { label: "Выносливость", get: (a) => a.sta },
  { label: "Обаяние", get: (a) => a.cha },
  { label: "Манипуляция", get: (a) => a.man },
  { label: "Самообладание", get: (a) => a.com },
  { label: "Интеллект", get: (a) => a.int },
  { label: "Смекалка", get: (a) => a.wit },
  { label: "Упорство", get: (a) => a.res },
];

/** Самодостаточный HTML-документ «Досье для стола» для window.print() → PDF. */
export function buildDossierPrintHtml(data: VtmSheetData, derived: DerivedStats): string {
  const info = data.info;
  const clan = info.clan === "thinblood" ? undefined : CLAN_BY_ID.get(info.clan);
  const sect = SECT_BY_ID.get(info.sect);
  const predator = PREDATOR_BY_ID.get(info.predator);
  const resDef = data.resonance.kind ? RESONANCE_BY_ID.get(data.resonance.kind) : undefined;
  const name = info.name || "Безымянный Сородич";
  const now = new Date().toLocaleString("ru-RU", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const identity = [
    info.clan === "thinblood" ? "⚱ Слабокровная" : clan ? `⛧ ${clan.name}` : null,
    sect?.name,
    info.generation ? `${info.generation}-е поколение` : null,
    predator ? predator.name : null,
    info.concept,
  ].filter(Boolean) as string[];

  const disciplines = data.disciplines.filter((d) => d.value > 0);
  const principles = [info.principle1, info.principle2, info.principle3].filter(Boolean);
  const anchors = [info.anchor1, info.anchor2, info.anchor3].filter(Boolean);
  const bane =
    info.clan === "thinblood"
      ? "Слабая Кровь: Сила Крови 0, полноценные Дисциплины недоступны — взамен Алхимия слабокровных."
      : clan?.bane;

  const attrsHtml = ATTR_ROWS.map(
    (r) => `<span class="ds-attr"><i>${r.label}</i> ${dots(r.get(data.attributes))}</span>`,
  ).join("");

  const discHtml = disciplines.length
    ? `<ul class="ds-discs">${disciplines
        .map((d) => {
          const powers = d.powers
            ? Object.entries(d.powers)
                .filter(([, nm]) => nm)
                .sort(([a], [b]) => parseInt(a, 10) - parseInt(b, 10))
            : [];
          return `<li><b>${escHtml(d.name)} ${dots(d.value)}</b>${
            powers.length ? `<span class="ds-powers"> ${powers.map(([lvl, nm]) => `${lvl} ур. — ${escHtml(nm)}`).join(" · ")}</span>` : ""
          }</li>`;
        })
        .join("")}</ul>`
    : `<p class="ds-empty">Кровь ещё не открыла тайн</p>`;

  const advHtml = data.advantages.length
    ? `<ul class="ds-adv">${data.advantages
        .map(
          (a) =>
            `<li><i>${
              a.kind === "background" ? "факт" : a.kind === "merit" ? "дост." : a.kind === "flaw" ? "недост." : "сл."
            }</i> ${escHtml(a.name)}${a.rating > 1 && a.kind !== "flaw" ? ` ${a.rating}` : ""}${
              a.note ? ` — ${escHtml(a.note)}` : ""
            }</li>`,
        )
        .join("")}</ul>`
    : `<p class="ds-empty">Ничего примечательного</p>`;

  const vitals = [
    `<span><b>Голод</b> ${"◔".repeat(data.trackers.hunger)}${"○".repeat(Math.max(0, 5 - data.trackers.hunger))} (${data.trackers.hunger}/5)</span>`,
    `<span><b>Здоровье</b> ${trackBoxes(derived.healthMax, data.trackers.healthSup, data.trackers.healthAgg)}</span>`,
    `<span><b>Воля</b> ${trackBoxes(derived.wpMax, data.trackers.wpSup, data.trackers.wpAgg)}</span>`,
    `<span><b>Человечность</b> ${derived.humanityTotal}/10${data.trackers.stains ? ` · пятна ${data.trackers.stains}` : ""}</span>`,
    `<span><b>СК</b> ${derived.bp}${derived.bp > bloodPotencyByGeneration(info.generation || 13) ? "↑" : ""}</span>`,
    resDef && data.resonance.intensity > 0
      ? `<span><b>Резонанс</b> ${resDef.name}, ${RESONANCE_INTENSITY_LABELS[data.resonance.intensity] || data.resonance.intensity}</span>`
      : "",
  ]
    .filter(Boolean)
    .join("");

  const drivesHtml =
    info.ambition || info.desire || principles.length || anchors.length
      ? `<section class="ds-block"><h2><span class="ds-ico" aria-hidden="true">⚑</span>Столкновения и опоры</h2>
  ${info.ambition ? `<p class="ds-line"><i>Амбиция</i> ${escHtml(info.ambition)}</p>` : ""}
  ${info.desire ? `<p class="ds-line"><i>Желание</i> ${escHtml(info.desire)}</p>` : ""}
  ${principles.length ? `<p class="ds-line"><i>Принципы</i> ${principles.map(escHtml).join(" · ")}</p>` : ""}
  ${anchors.length ? `<p class="ds-line"><i>Опоры</i> ${anchors.map(escHtml).join(" · ")}</p>` : ""}
</section>`
      : "";

  const portraitHtml = info.portrait
    ? `<img src="${info.portrait}" alt="" class="ds-portrait" />`
    : `<span class="ds-crest" aria-hidden="true">🩸</span>`;

  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Досье Сородича — ${escHtml(name)}</title>
<style>
  @page { size: A4; margin: 15mm 14mm 17mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body {
    font-family: "EB Garamond", "Georgia", "Times New Roman", serif;
    background: #f6efe1;
    color: #2c2117;
    font-size: 10.5pt;
    line-height: 1.5;
    padding: 12mm 11mm;
    max-width: 210mm;
    margin: 0 auto;
  }
  .ds-head { display: flex; align-items: center; gap: 6mm; border-bottom: 2px solid #6d1622; padding-bottom: 4mm; margin-bottom: 4.5mm; }
  .ds-portrait { width: 30mm; height: 39mm; object-fit: cover; border: 1px solid #7a1f2b; border-radius: 1.5mm; }
  .ds-crest { width: 30mm; height: 39mm; display: flex; align-items: center; justify-content: center; font-size: 26pt; border: 1px solid #7a1f2b; border-radius: 1.5mm; background: #efe4cd; }
  .ds-head-main { flex: 1; }
  .ds-kicker { font-size: 8pt; letter-spacing: 0.32em; color: #8a7355; text-transform: uppercase; margin-bottom: 1.6mm; }
  h1 { font-size: 20pt; font-weight: 600; color: #6d1622; line-height: 1.15; }
  .ds-identity { margin-top: 1.6mm; font-size: 10pt; color: #5a4633; }
  .ds-identity b { color: #6d1622; }
  .ds-vitals { display: flex; flex-wrap: wrap; gap: 1.4mm 5mm; font-size: 9pt; color: #4a3826; border: 1px solid #b08d5f; border-radius: 1.5mm; padding: 2.4mm 3.5mm; margin-bottom: 4.5mm; background: #f1e7d2; }
  .ds-vitals b { color: #6d1622; font-variant: small-caps; letter-spacing: 0.04em; }
  .ds-cols { display: flex; gap: 6mm; }
  .ds-col { flex: 1; min-width: 0; }
  .ds-block { break-inside: avoid; margin-bottom: 4mm; }
  .ds-cols h2, .ds-block h2 { font-size: 11.5pt; color: #6d1622; border-bottom: 1px solid #c9b28f; padding-bottom: 1mm; margin-bottom: 1.8mm; letter-spacing: 0.03em; }
  .ds-ico { margin-right: 1.8mm; }
  .ds-attrs { display: grid; grid-template-columns: 1fr; gap: 0.8mm; font-size: 9.5pt; }
  .ds-attr i, .ds-line i { font-style: normal; color: #8a7355; font-variant: small-caps; letter-spacing: 0.04em; }
  .ds-discs, .ds-adv { list-style: none; font-size: 9.5pt; }
  .ds-discs li, .ds-adv li { margin-bottom: 1mm; break-inside: avoid; }
  .ds-adv i { font-style: normal; color: #8a7355; font-variant: small-caps; }
  .ds-powers { color: #4a3826; font-size: 9pt; }
  .ds-empty { font-style: italic; color: #8a7355; font-size: 9.5pt; }
  .ds-line { margin-bottom: 1mm; font-size: 9.5pt; }
  .ds-blood { break-inside: avoid; border: 1px solid #7a1f2b; border-radius: 1.5mm; padding: 2.6mm 3.5mm; margin-bottom: 4mm; background: #f3e3d2; }
  .ds-blood p { font-size: 9pt; margin-bottom: 1mm; }
  .ds-blood b { color: #6d1622; }
  .ds-blood em { color: #8a7355; }
  .ds-st { break-inside: avoid; margin: 4mm 0; }
  .ds-st h2 { font-size: 10pt; color: #5a4633; margin-bottom: 1.6mm; }
  .ds-st-line { display: block; height: 0; border-bottom: 1px dotted #b08d5f; margin-bottom: 4.2mm; }
  .ds-foot { border-top: 1px solid #7a1f2b; padding-top: 2.4mm; font-size: 8.5pt; color: #5a4633; display: flex; justify-content: space-between; gap: 5mm; }
  .ds-foot em { color: #7a1f2b; }
  .ds-stamp { margin-top: 2mm; text-align: center; font-size: 8pt; color: #8a7355; font-style: italic; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
<header class="ds-head">
  ${portraitHtml}
  <div class="ds-head-main">
    <p class="ds-kicker">Архив крови · досье для стола Рассказчика</p>
    <h1>${escHtml(name)}</h1>
    <p class="ds-identity">${identity.map((s) => `<b>${escHtml(s)}</b>`).join(' <span aria-hidden="true">·</span> ')}</p>
  </div>
</header>

<div class="ds-vitals">${vitals}</div>

<div class="ds-cols">
  <div class="ds-col">
    <section class="ds-block">
      <h2><span class="ds-ico" aria-hidden="true">✦</span>Характеристики</h2>
      <div class="ds-attrs">${attrsHtml}</div>
    </section>
    ${disciplines.length ? `<section class="ds-block"><h2><span class="ds-ico" aria-hidden="true">⸸</span>Дисциплины</h2>${discHtml}</section>` : ""}
  </div>
  <div class="ds-col">
    <section class="ds-block">
      <h2><span class="ds-ico" aria-hidden="true">☙</span>Достоинства и недостатки</h2>
      ${advHtml}
    </section>
  </div>
</div>

${bane || data.trackers.hunger >= 4 ? `<section class="ds-blood">
  ${bane ? `<p><i style="font-style:normal;color:#8a7355;font-variant:small-caps;">Изъян клана</i> — ${escHtml(bane)}</p>` : ""}
  ${data.trackers.hunger >= 4 ? `<p><b>Зверь близко:</b> Голод ${data.trackers.hunger} — при ${data.trackers.hunger === 5 ? "предела проверь Ярость голода (сл. 4)" : "четырёх костей Голода любой провал грозит стать Бестиальным"}. Принуждение клана — на стр. 258 Книги правил.</p>` : ""}
</section>` : ""}

${drivesHtml}

<section class="ds-st">
  <h2>Поле рассказчика · пометки пером</h2>
  <i class="ds-st-line"></i>
  <i class="ds-st-line"></i>
  <i class="ds-st-line"></i>
</section>

<footer class="ds-foot">
  <span>Памятка: успех на кости Голода в паре десяток — Беспредельный успех; провал при кости Голода — Зверский провал. Опыт: свободно ${data.trackers.xp}, вложено ${data.trackers.xpSpent}.</span>
  <em>«Кровь — это жизнь, а жизнь — это долг.»</em>
</footer>
<p class="ds-stamp">сверстано ${escHtml(now)} · «Вампиры: Маскарад» · 5-я редакция</p>
</body>
</html>`;
}
