"use client";

// ============================================================
// «Сводка Сородича» — одностраничная выжимка листа для стола
// рассказчика: всё важное на одном листе A4, без заметок и журналов.
// Печатается через кнопку «Сводка» в редакторе.
// ============================================================

import { VtmSheetData } from "@/lib/vtm-data";
import { DerivedStats } from "@/lib/vtm-calc";
import {
  SKILL_LIBRARY,
  CLAN_BY_ID,
  SECT_BY_ID,
  PREDATOR_BY_ID,
  RESONANCE_BY_ID,
  RESONANCE_INTENSITY_LABELS,
} from "@/lib/vtm-data";

const dots = (n: number, max = 5): string =>
  "●".repeat(Math.max(0, Math.min(max, n))) + "○".repeat(Math.max(0, max - Math.max(0, Math.min(max, n))));

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

export function VtmPrintSummary({ data, derived }: { data: VtmSheetData; derived: DerivedStats }) {
  const info = data.info;
  const clan = CLAN_BY_ID.get(info.clan);
  const sect = SECT_BY_ID.get(info.sect);
  const predator = PREDATOR_BY_ID.get(info.predator);
  const resDef = data.resonance.kind ? RESONANCE_BY_ID.get(data.resonance.kind) : undefined;

  const usedSkills = SKILL_LIBRARY.map((s) => {
    const st = data.skills.find((x) => x.key === s.id);
    return st && st.value > 0 ? `${s.name}${st.spec ? ` (${st.spec})` : ""} ${dots(st.value)}` : null;
  }).filter(Boolean) as string[];
  const customSkills = data.skills.filter((s) => s.key === null && s.value > 0).map((s) => `${s.name} ${dots(s.value)}`);
  const skillLine = [...usedSkills, ...customSkills];

  const disciplines = data.disciplines.filter((d) => d.value > 0);

  return (
    <div className="vtm-print-doc vtm-print-sum">
      {/* Шапка-сводка */}
      <div className="vtm-sum-head">
        {info.portrait && <img src={info.portrait} alt="" className="vtm-sum-portrait" />}
        <div className="flex-1">
          <p className="vtm-sum-kicker">АРХИВ КРОВИ · СВОДКА СОРОДИЧА ДЛЯ СТОЛА РАССКАЗЧИКА</p>
          <h1 className="vtm-sum-name">{info.name || "Безымянный Сородич"}</h1>
          <p className="vtm-sum-tags">
            {info.clan === "thinblood" ? "⚱ Слабокровная" : clan ? `⛧ ${clan.name}` : "Клан —"}
            {sect ? ` · ${sect.name}` : ""}
            {info.generation ? ` · ${info.generation}-е пок.` : ""}
            {predator ? ` · ${predator.name}` : ""}
            {` · СК ${derived.bp}`}
          </p>
          {info.concept && <p className="vtm-sum-concept">{info.concept}</p>}
        </div>
        <div className="vtm-sum-vitals">
          <span>Голод {"◔".repeat(data.trackers.hunger)}{"○".repeat(Math.max(0, 5 - data.trackers.hunger))}</span>
          <span>Здоровье {trackLine(derived.healthMax, data.trackers.healthAgg, data.trackers.healthSup)}</span>
          <span>Воля {trackLine(derived.wpMax, data.trackers.wpAgg, data.trackers.wpSup)}</span>
          <span>Чел. {data.trackers.humanity}/10{data.trackers.stains ? ` · пятна ${data.trackers.stains}` : ""}</span>
          {resDef && data.resonance.intensity > 0 && (
            <span>Резонанс: {resDef.name}, {RESONANCE_INTENSITY_LABELS[data.resonance.intensity] || data.resonance.intensity}</span>
          )}
        </div>
      </div>

      {/* Две колонки: слева характеристики + навыки, справа Дисциплины + преимущества */}
      <div className="vtm-sum-cols">
        <div>
          <p className="vtm-sum-section">Характеристики</p>
          <div className="vtm-sum-attrs">
            {ATTR_ROWS.map((r) => (
              <span key={r.label} className="vtm-sum-attr"><i>{r.label}</i> {dots(r.get(data.attributes))}</span>
            ))}
          </div>

          <p className="vtm-sum-section">Навыки</p>
          {skillLine.length ? (
            <div className="vtm-sum-skills">
              {skillLine.map((s) => (
                <span key={s} className="vtm-sum-skill">{s}</span>
              ))}
            </div>
          ) : (
            <p className="vtm-sum-empty">— ни одного навыка —</p>
          )}
        </div>

        <div>
          <p className="vtm-sum-section">Дисциплины</p>
          {disciplines.length ? (
            <div className="vtm-sum-discs">
              {disciplines.map((d) => (
                <p key={`${d.key || d.name}`} className="vtm-sum-disc">
                  <b>{d.name} {dots(d.value)}</b>
                  {d.powers && Object.entries(d.powers)
                    .filter(([, name]) => name)
                    .sort(([a], [b]) => parseInt(a, 10) - parseInt(b, 10))
                    .map(([lvlS, name]) => ` · ${lvlS} ур.: ${name}`)
                    .join("")}
                </p>
              ))}
            </div>
          ) : (
            <p className="vtm-sum-empty">— Кровь ещё не открыла тайн —</p>
          )}

          <p className="vtm-sum-section">Достоинства и недостатки</p>
          {data.advantages.length ? (
            <div className="vtm-sum-adv">
              {data.advantages.map((a) => (
                <p key={a.id} className="vtm-sum-adv-item">
                  <i>{a.kind === "background" ? "факт" : a.kind === "merit" ? "дост." : a.kind === "flaw" ? "недост." : "сл."}</i>{" "}
                  {a.name}{a.rating > 1 && a.kind !== "flaw" ? ` ${a.rating}` : ""}{a.note ? ` — ${a.note}` : ""}
                </p>
              ))}
            </div>
          ) : (
            <p className="vtm-sum-empty">— ничего примечательного —</p>
          )}
        </div>
      </div>

      {/* Столкновения и опоры */}
      {(info.ambition || info.desire) && (
        <>
          <p className="vtm-sum-section">Столкновения и опоры</p>
          <div className="vtm-sum-drive">
            {info.ambition && <p><i>Амбиция:</i> {info.ambition}</p>}
            {info.desire && <p><i>Желание:</i> {info.desire}</p>}
            {[info.principle1, info.principle2, info.principle3].filter(Boolean).length > 0 && (
              <p><i>Принципы:</i> {[info.principle1, info.principle2, info.principle3].filter(Boolean).join(" · ")}</p>
            )}
            {[info.anchor1, info.anchor2, info.anchor3].filter(Boolean).length > 0 && (
              <p><i>Опоры:</i> {[info.anchor1, info.anchor2, info.anchor3].filter(Boolean).join(" · ")}</p>
            )}
          </div>
        </>
      )}

      {/* Убежище и имущество одной строкой */}
      {(data.gear.haven || data.gear.items.length > 0) && (
        <>
          <p className="vtm-sum-section">Убежище и имущество</p>
          <div className="vtm-sum-gear">
            {data.gear.haven && <p><i>Убежище:</i> {data.gear.haven}</p>}
            {data.gear.items.length > 0 && (
              <p><i>При себе:</i> {data.gear.items.map((it) => it.name + (it.count ? ` ×${it.count}` : "")).join("; ")}</p>
            )}
          </div>
        </>
      )}

      {/* Сир / прошлое одной строкой */}
      {(info.sire || info.chronicle) && (
        <p className="vtm-sum-sire">
          {info.chronicle ? <><i>Хроника:</i> {info.chronicle}. </> : null}
          {info.sire ? <><i>Сир:</i> {info.sire}</> : null}
        </p>
      )}

      {/* Поле рассказчика: место для рукописных пометок у стола */}
      <div className="vtm-sum-st">
        <p className="vtm-sum-st-head">Поле рассказчика · пометки пером</p>
        <i className="vtm-sum-st-line" />
        <i className="vtm-sum-st-line" />
        <i className="vtm-sum-st-line" />
      </div>

      <p className="vtm-sum-footer">
        Опыт: {data.trackers.xp} ({data.trackers.xpSpent} потрачено)
        {data.trackers.huntCount > 0 ? ` · Ночей в хронике: ${data.trackers.huntCount} · последняя охота: ${data.trackers.lastHunt || "—"}` : ""}
        {" · Сводка составлена из листа «Вампиры: Маскарад», 5 ред. — полные записи в архиве Крови."}
      </p>
    </div>
  );
}

/** Трек здоровья/воли для сводки: □ пусто · ▣ поверхностный · ☒ тяжёлый */
function trackLine(total: number, sup: number, agg: number): string {
  return Array.from({ length: total }, (_, i) => {
    const n = i + 1;
    if (n <= agg) return "☒";
    if (n <= agg + sup) return "▣";
    return "□";
  }).join(" ");
}
