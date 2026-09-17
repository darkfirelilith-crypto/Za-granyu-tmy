"use client";

// ============================================================
// Печатная версия листа — видна только при печати / сохранении в PDF.
// Готическая машинопись на белом: имя, клан, характеристики точками,
// навыки, Дисциплины, преимущества, треки и заметки.
// ============================================================

import { VtmSheetData } from "@/lib/vtm-data";
import { LORESHEET_BY_ID } from "@/lib/vtm-histories";
import { DerivedStats } from "@/lib/vtm-calc";
import { SKILL_LIBRARY, CLAN_BY_ID, SECT_BY_ID, PREDATOR_BY_ID, RESONANCE_BY_ID, RESONANCE_INTENSITY_LABELS } from "@/lib/vtm-data";

const dots = (n: number, max = 5): string => "●".repeat(Math.max(0, Math.min(max, n))) + "○".repeat(Math.max(0, max - Math.max(0, Math.min(max, n))));

function trackBoxes(total: number, sup: number, agg: number): string {
  // □ пусто · ▣ поверхностный · ☒ тяжёлый
  return Array.from({ length: total }, (_, i) => {
    const n = i + 1;
    if (n <= agg) return "☒";
    if (n <= agg + sup) return "▣";
    return "□";
  }).join(" ");
}

export function VtmPrintSheet({ data, derived }: { data: VtmSheetData; derived: DerivedStats }) {
  const info = data.info;
  const clan = CLAN_BY_ID.get(info.clan);
  const sect = SECT_BY_ID.get(info.sect);
  const predator = PREDATOR_BY_ID.get(info.predator);

  const groupSkills = (group: string) =>
    SKILL_LIBRARY.filter((s) => s.group === group)
      .map((s) => {
        const state = data.skills.find((x) => x.key === s.id);
        const v = state?.value || 0;
        const spec = state?.spec ? ` (${state.spec})` : "";
        return `${s.name}${spec} ${dots(v)}`;
      });

  const customs = data.skills.filter((s) => s.key === null).map((s) => `${s.name} ${dots(s.value)}`);

  const resDef = data.resonance.kind ? RESONANCE_BY_ID.get(data.resonance.kind) : undefined;

  return (
    <div className="vtm-print-doc">
      {/* Шапка */}
      <div className="vtm-print-head">
        {info.portrait && (
          <img src={info.portrait} alt="" className="vtm-print-portrait" />
        )}
        <div>
          <p style={{ fontSize: "7.5pt", letterSpacing: "0.35em", margin: "0 0 4px" }}>АРХИВ КРОВИ · ОТДЕЛ НЕЗАРЕГИСТРИРОВАННЫХ ОСОБ</p>
          <h1 className="vtm-print-title">Вампиры: Маскарад</h1>
          <p className="vtm-print-name">{info.name || "Безымянный Сородич"}</p>
          <p className="vtm-print-line">
            {clan ? `Клан: ${clan.name}` : "Клан: —"}
            {sect ? ` · Секта: ${sect.name}` : ""}
            {info.generation ? ` · ${info.generation}-е поколение` : ""}
          </p>
          <p className="vtm-print-line">
            Сила Крови: {derived.bp} · Здоровье: {trackBoxes(derived.healthMax, data.trackers.healthSup, data.trackers.healthAgg)} · Воля: {trackBoxes(derived.wpMax, data.trackers.wpSup, data.trackers.wpAgg)}
          </p>
          <p className="vtm-print-line">
            Голод: {"◔".repeat(data.trackers.hunger)}{"○".repeat(5 - data.trackers.hunger)} · Человечность: {data.trackers.humanity}/10
            {data.trackers.stains ? ` · Пятна: ${data.trackers.stains}` : ""}
          </p>
          {resDef && data.resonance.intensity > 0 && (
            <p className="vtm-print-line">
              Резонанс крови: {resDef.name}, {RESONANCE_INTENSITY_LABELS[data.resonance.intensity] || data.resonance.intensity}
            </p>
          )}
          <p className="vtm-print-line">
            {info.concept ? `Концепция: ${info.concept}` : ""}
            {info.occupation ? ` · Род деятельности: ${info.occupation}` : ""}
            {info.chronicle ? ` · Хроника: ${info.chronicle}` : ""}
          </p>
          {info.sire && <p className="vtm-print-line">Сир: {info.sire}</p>}
          {predator && <p className="vtm-print-line">Стиль охоты: {predator.name}</p>}
          {data.trackers.huntCount > 0 && (
            <p className="vtm-print-line">
              Ночей в хронике: {data.trackers.huntCount}
              {data.trackers.lastHunt ? ` · последняя охота: ${data.trackers.lastHunt}` : ""}
            </p>
          )}
        </div>
      </div>

      {/* Характеристики */}
      <p className="vtm-print-section">Характеристики</p>
      <div className="vtm-print-grid">
        <span className="vtm-print-item"><b>Сила</b> {dots(data.attributes.str)}</span>
        <span className="vtm-print-item"><b>Ловкость</b> {dots(data.attributes.dex)}</span>
        <span className="vtm-print-item"><b>Выносливость</b> {dots(data.attributes.sta)}</span>
        <span className="vtm-print-item"><b>Обаяние</b> {dots(data.attributes.cha)}</span>
        <span className="vtm-print-item"><b>Манипуляция</b> {dots(data.attributes.man)}</span>
        <span className="vtm-print-item"><b>Самообладание</b> {dots(data.attributes.com)}</span>
        <span className="vtm-print-item"><b>Интеллект</b> {dots(data.attributes.int)}</span>
        <span className="vtm-print-item"><b>Смекалка</b> {dots(data.attributes.wit)}</span>
        <span className="vtm-print-item"><b>Упорство</b> {dots(data.attributes.res)}</span>
      </div>

      {/* Навыки */}
      <p className="vtm-print-section">Навыки</p>
      <div className="vtm-print-grid">
        {groupSkills("physical").map((line) => <span key={line} className="vtm-print-item">{line}</span>)}
        {groupSkills("social").map((line) => <span key={line} className="vtm-print-item">{line}</span>)}
        {groupSkills("mental").map((line) => <span key={line} className="vtm-print-item">{line}</span>)}
        {customs.map((line) => <span key={line} className="vtm-print-item">{line} (свой)</span>)}
      </div>

      {/* Дисциплины */}
      {data.disciplines.length > 0 && (
        <>
          <p className="vtm-print-section">Дисциплины</p>
          {data.disciplines.map((d) => (
            <p className="vtm-print-line" key={d.name}>
              <b>{d.name}</b> {dots(d.value)}
              {d.powers && Object.entries(d.powers).length > 0 && (
                <> — {Object.entries(d.powers).sort((a, b) => Number(a[0]) - Number(b[0])).map(([lvl, name]) => `${lvl}: ${name}`).join("; ")}</>
              )}
            </p>
          ))}
        </>
      )}

      {/* Преимущества */}
      {data.advantages.length > 0 && (
        <>
          <p className="vtm-print-section">Преимущества и недостатки</p>
          {data.advantages.map((a) => (
            <p className="vtm-print-line" key={a.id}>
              {a.kind === "background" ? (
                <><b>{a.name}</b> {dots(a.rating)}{a.note ? ` — ${a.note}` : ""}</>
              ) : (
                <><b>{a.name}</b> ({a.kind === "flaw" ? "недостаток" : a.kind === "merit" ? "достоинство" : "слабокровное"}, {a.rating} пт){a.note ? ` — ${a.note}` : ""}</>
              )}
            </p>
          ))}
        </>
      )}

      {/* Листоги («Истории», стр. 384+) */}
      {data.loresheets && data.loresheets.some((l) => l.level > 0) && (
        <>
          <p className="vtm-print-section">Истории (листоги)</p>
          {data.loresheets.map((l) => {
            const def = LORESHEET_BY_ID.get(l.sheetId);
            if (!def || l.level <= 0) return null;
            return (
              <p className="vtm-print-line" key={l.sheetId}>
                <b>{def.name}</b> {dots(l.level, 4)}{l.note ? ` — ${l.note}` : ""}
              </p>
            );
          })}
        </>
      )}

      {/* Диаблери */}
      {(data.diablerie?.count || 0) > 0 && (
        <>
          <p className="vtm-print-section">Диаблери</p>
          <p className="vtm-print-line">
            <b>Выпито душ:</b> {data.diablerie.count} — в ауре чёрные прожилки{data.diablerie.notes ? `. ${data.diablerie.notes}` : ""}
          </p>
        </>
      )}

      {/* Цели и принципы */}
      <p className="vtm-print-section">Побуждения</p>
      {info.ambition && <p className="vtm-print-line"><b>Цель:</b> {info.ambition}</p>}
      {info.desire && <p className="vtm-print-line"><b>Желание:</b> {info.desire}</p>}
      {(["principle1", "principle2", "principle3"] as const).filter((k) => info[k]).map((k) => (
        <p className="vtm-print-line" key={k}><b>Принцип:</b> {info[k]}</p>
      ))}
      {(["anchor1", "anchor2", "anchor3"] as const).filter((k) => info[k]).map((k) => (
        <p className="vtm-print-line" key={k}><b>Опора:</b> {info[k]}</p>
      ))}

      {/* Облик и прошлое */}
      {(info.description || info.history) && (
        <>
          <p className="vtm-print-section">Облик и прошлое</p>
          {info.description && <p className="vtm-print-line" style={{ whiteSpace: "pre-wrap" }}>{info.description}</p>}
          {info.history && <p className="vtm-print-line" style={{ whiteSpace: "pre-wrap" }}>{info.history}</p>}
        </>
      )}

      {/* Имущество */}
      {(data.gear.haven || data.gear.resources || data.gear.items.length > 0) && (
        <>
          <p className="vtm-print-section">Убежище и имущество</p>
          {data.gear.haven && <p className="vtm-print-line"><b>Убежище:</b> {data.gear.haven}</p>}
          {data.gear.resources && <p className="vtm-print-line"><b>Средства:</b> {data.gear.resources}</p>}
          {data.gear.items.length > 0 && (
            <p className="vtm-print-line">
              <b>Рюкзак:</b>{" "}
              {data.gear.items.map((it) => `${it.name}${it.count ? ` ×${it.count}` : ""}${it.note ? ` (${it.note})` : ""}`).join("; ")}
            </p>
          )}
        </>
      )}

      {/* Заметки */}
      {data.notes.entries.length > 0 && (
        <>
          <p className="vtm-print-section">Журнал ночи</p>
          {data.notes.entries.map((n) => (
            <p className="vtm-print-line" key={n.id} style={{ whiteSpace: "pre-wrap" }}>
              {n.date}{n.title ? ` · ${n.title}` : ""}: {n.content}
            </p>
          ))}
        </>
      )}

      {/* Журнал опыта */}
      {data.xpLog.length > 0 && (
        <>
          <p className="vtm-print-section">Журнал опыта</p>
          {data.xpLog.slice(0, 10).map((x) => (
            <p className="vtm-print-line" key={x.id}>
              {new Date(x.ts).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit" })} · {x.text}
            </p>
          ))}
          {data.xpLog.length > 10 && <p className="vtm-print-line">…и ещё {data.xpLog.length - 10} записей в онлайн-архиве.</p>}
        </>
      )}

      <div className="vtm-print-footer">
        <span>Опыт: свободно {data.trackers.xp} · вложено {data.trackers.xpSpent} · </span>
        <span>«Кровь — это жизнь, а жизнь — это долг.»</span>
      </div>
    </div>
  );
}

/**
 * «Досье для стола» (раунд 24) — печатная карточка Сородича на одну страницу,
 * зеркало «Досье Гароу» (раунд 23): витальные треки и Человечность, Сила Крови
 * с резонансом, Дисциплины и преимущества одной строкой, столкновения и опоры,
 * цитата и памятка костей Голода. Печатается из вкладки «Досье».
 */
export function VtmPrintDossier({ data, derived }: { data: VtmSheetData; derived: DerivedStats }) {
  const info = data.info;
  const clan = info.clan === "thinblood" ? undefined : CLAN_BY_ID.get(info.clan);
  const sect = SECT_BY_ID.get(info.sect);
  const predator = PREDATOR_BY_ID.get(info.predator);
  const resDef = data.resonance.kind ? RESONANCE_BY_ID.get(data.resonance.kind) : undefined;
  const humanity = derived.humanityTotal;

  const disciplines = data.disciplines.filter((d) => d.value > 0);
  const advantages = data.advantages;
  const principles = [info.principle1, info.principle2, info.principle3].filter(Boolean);
  const anchors = [info.anchor1, info.anchor2, info.anchor3].filter(Boolean);

  return (
    <div className="vtm-print-doc vtm-print-sum">
      <div className="vtm-print-head">
        {info.portrait && <img src={info.portrait} alt="" className="vtm-print-portrait" />}
        <div>
          <p style={{ fontSize: "7.5pt", letterSpacing: "0.35em", margin: "0 0 4px" }}>АРХИВ КРОВИ · ДОСЬЕ ДЛЯ СТОЛА</p>
          <h1 className="vtm-print-title">Досье Сородича</h1>
          <p className="vtm-print-name">{info.name || "Безымянный Сородич"}</p>
          <p className="vtm-print-line">
            {info.clan === "thinblood" ? "⚱ Слабокровная" : clan ? `⛧ ${clan.name}` : "клан —"}
            {sect ? ` · ${sect.name}` : ""}
            {info.generation ? ` · ${info.generation}-е пок.` : ""}
            {predator ? ` · ${predator.name}` : ""}
            {info.concept ? ` · ${info.concept}` : ""}
          </p>
        </div>
      </div>

      <p className="vtm-print-section">Витальное</p>
      <p className="vtm-print-line">
        <b>Голод:</b> {"◔".repeat(data.trackers.hunger)}{"○".repeat(Math.max(0, 5 - data.trackers.hunger))} ({data.trackers.hunger}/5)
      </p>
      <p className="vtm-print-line">
        <b>Здоровье:</b> {trackBoxes(derived.healthMax, data.trackers.healthSup, data.trackers.healthAgg)}
      </p>
      <p className="vtm-print-line">
        <b>Воля:</b> {trackBoxes(derived.wpMax, data.trackers.wpSup, data.trackers.wpAgg)}
      </p>
      <p className="vtm-print-line">
        <b>Человечность:</b> {humanity}/10{data.trackers.stains ? ` · пятна: ${data.trackers.stains}` : ""}
        {" · "}
        <b>Сила Крови:</b> {derived.bp}
        {resDef && data.resonance.intensity > 0 ? ` · резонанс: ${resDef.name}, ${RESONANCE_INTENSITY_LABELS[data.resonance.intensity] || data.resonance.intensity}` : ""}
      </p>

      {disciplines.length > 0 && (
        <>
          <p className="vtm-print-section">Дисциплины</p>
          <p className="vtm-print-line">
            {disciplines.map((d) => {
              const powers = d.powers
                ? Object.entries(d.powers).filter(([, name]) => name).sort(([a], [b]) => parseInt(a, 10) - parseInt(b, 10))
                : [];
              return `${d.name} ${dots(d.value)}${powers.length ? ` (${powers.map(([lvl, name]) => `${lvl}: ${name}`).join(", ")})` : ""}`;
            }).join(" · ")}
          </p>
        </>
      )}

      {advantages.length > 0 && (
        <>
          <p className="vtm-print-section">Достоинства и недостатки</p>
          <p className="vtm-print-line">
            {advantages.map((a) =>
              `${a.name}${a.rating > 1 && a.kind !== "flaw" ? ` ${a.rating}` : ""}${a.note ? ` — ${a.note}` : ""}`,
            ).join(" · ")}
          </p>
        </>
      )}

      {(info.ambition || info.desire || principles.length > 0 || anchors.length > 0) && (
        <>
          <p className="vtm-print-section">Столкновения и опоры</p>
          {info.ambition && <p className="vtm-print-line"><b>Цель:</b> {info.ambition}</p>}
          {info.desire && <p className="vtm-print-line"><b>Желание:</b> {info.desire}</p>}
          {principles.length > 0 && <p className="vtm-print-line"><b>Принципы:</b> {principles.join(" · ")}</p>}
          {anchors.length > 0 && <p className="vtm-print-line"><b>Опоры:</b> {anchors.join(" · ")}</p>}
        </>
      )}

      <div className="vtm-print-footer">
        <span>Памятка костей Голода: успех на кости Голода в паре десяток — Беспредельный успех (Зверь вмешивается в дело); провал при костях Голода — Зверский провал, Зверь берёт своё. · Опыт: свободно {data.trackers.xp}, вложено {data.trackers.xpSpent} · </span>
        <span>«Кровь — это жизнь, а жизнь — это долг.»</span>
      </div>
    </div>
  );
}
