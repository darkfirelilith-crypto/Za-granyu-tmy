"use client";

// ============================================================
// Печатная версия листа ГАРОУ (W5) — видна только при печати / PDF.
// Машинопись Лунного народа на белом: племя/ауспиция, девять лун,
// навыки, Дары и Обряды, Ярость/Слава, стремления и дневник.
// Полностью повторяет систему классов vtm-print-* вампирской печати.
// ============================================================

import { W5SheetData } from "@/lib/vtm-w5data";
import { W5_TRIBE_BY_ID, W5_AUSPICE_BY_ID, W5_BREEDS, W5_FORM_BY_ID, w5HealthMax, w5WillpowerMax, w5Rank } from "@/lib/vtm-w5data";
import { SKILL_LIBRARY } from "@/lib/vtm-data";

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

function W5PrintHead({ data }: { data: W5SheetData }) {
  const info = data.info;
  const tribe = W5_TRIBE_BY_ID.get(info.tribe);
  const auspice = W5_AUSPICE_BY_ID.get(info.auspice);
  const breed = W5_BREEDS.find((b) => b.id === info.breed);
  const healthMax = w5HealthMax(data);
  const wpMax = w5WillpowerMax(data);
  const rank = w5Rank(data.trackers.glory, data.trackers.honor, data.trackers.wisdom);
  const renown = data.trackers.glory + data.trackers.honor + data.trackers.wisdom;
  return (
    <div className="vtm-print-head">
      {info.portrait && <img src={info.portrait} alt="" className="vtm-print-portrait" />}
      <div>
        <p style={{ fontSize: "7.5pt", letterSpacing: "0.35em", margin: "0 0 4px" }}>ЛУННЫЙ НАРОД · АРХИВ СТАИ</p>
        <h1 className="vtm-print-title">Вервольф: Апокалипсис (W5)</h1>
        <p className="vtm-print-name">{info.name || "Безымянный Гароу"}</p>
        <p className="vtm-print-line">
          {tribe ? `Племя: ${tribe.name}` : "Племя: —"}
          {auspice ? ` · Ауспиция: ${auspice.name}` : ""}
          {breed ? ` · Порода: ${breed.name}` : ""}
        </p>
        <p className="vtm-print-line">
          Ярость: {"🐺".repeat(data.trackers.rage) || "—"}
          {` (${data.trackers.rage}/5)`}
          {data.trackers.wolfLost ? " · ВОЛК ПОТЕРЯН" : ""}
          {data.trackers.harano ? " · харано" : ""}
        </p>
        <p className="vtm-print-line">
          Здоровье: {trackBoxes(healthMax, data.trackers.healthSup, data.trackers.healthAgg)} · Воля: {trackBoxes(wpMax, data.trackers.wpSup, 0)}
        </p>
        <p className="vtm-print-line">
          Слава: Гордец {dots(data.trackers.glory)} · Честь {dots(data.trackers.honor)} · Мудрость {dots(data.trackers.wisdom)} — {rank.title} ({renown})
        </p>
        <p className="vtm-print-line">
          {info.concept ? `Концепция: ${info.concept}` : ""}
          {info.age ? ` · Возраст: ${info.age}` : ""}
          {info.chronicle ? ` · Хроника: ${info.chronicle}` : ""}
        </p>
        {info.pack && <p className="vtm-print-line">Стая: {info.pack}{info.totem ? ` · Тотем: ${info.totem}` : ""}</p>}
        {info.activeForm && info.activeForm !== "hishu" && (
          <p className="vtm-print-line">🐾 Облик дня: {W5_FORM_BY_ID.get(info.activeForm)?.name || info.activeForm}{W5_FORM_BY_ID.get(info.activeForm) ? ` (${W5_FORM_BY_ID.get(info.activeForm)!.ru})` : ""}</p>
        )}
        {info.quote && <p className="vtm-print-line" style={{ fontStyle: "italic" }}>{info.quote}</p>}
      </div>
    </div>
  );
}

function W5PrintBody({ data }: { data: W5SheetData }) {
  const info = data.info;
  const attrPairs: { key: keyof W5SheetData["attributes"]; label: string }[] = [
    { key: "str", label: "Сила" }, { key: "dex", label: "Ловкость" }, { key: "sta", label: "Стойкость" },
    { key: "cha", label: "Обаяние" }, { key: "man", label: "Манипуляция" }, { key: "com", label: "Самообладание" },
    { key: "int", label: "Интеллект" }, { key: "wit", label: "Смекалка" }, { key: "res", label: "Упорство" },
  ];
  const skills = (group: string) =>
    SKILL_LIBRARY.filter((s) => s.group === group)
      .filter((s) => {
        const st = data.skills.find((x) => x.id === s.id);
        return (st?.value || 0) > 0 || st?.spec;
      })
      .map((s) => {
        const st = data.skills.find((x) => x.id === s.id)!;
        const spec = st.spec ? ` (${st.spec})` : "";
        return `${s.name}${spec} ${dots(st.value)}`;
      });
  const aspirations = data.aspirations.filter((a) => a.text);
  const touchstones = data.touchstones.filter((t) => t.text);

  return (
    <>
      {/* Характеристики — печатаются все девять */}
      <p className="vtm-print-section">Девять лун (характеристики)</p>
      <div className="vtm-print-grid">
        {attrPairs.map(({ key, label }) => (
          <span key={key} className="vtm-print-item"><b>{label}</b> {dots(data.attributes[key])}</span>
        ))}
      </div>

      {/* Навыки — только изученные */}
      {(skills("physical").length > 0 || skills("social").length > 0 || skills("mental").length > 0) && (
        <>
          <p className="vtm-print-section">Навыки</p>
          <div className="vtm-print-grid">
            {[...skills("physical"), ...skills("social"), ...skills("mental")].map((line) => (
              <span key={line} className="vtm-print-item">{line}</span>
            ))}
          </div>
        </>
      )}

      {/* Дары */}
      {data.gifts.length > 0 && (
        <>
          <p className="vtm-print-section">Дары</p>
          {data.gifts.map((g) => (
            <p className="vtm-print-line" key={g.id}>
              <b>{g.name}</b> ({g.level} ур.){g.note ? ` — ${g.note}` : ""}
            </p>
          ))}
        </>
      )}

      {/* Обряды */}
      {data.rites.length > 0 && (
        <>
          <p className="vtm-print-section">Обряды</p>
          {data.rites.map((r) => (
            <p className="vtm-print-line" key={r.id}>
              <b>{r.name}</b> ({r.level} ур.){r.note ? ` — ${r.note}` : ""}
            </p>
          ))}
        </>
      )}

      {/* Стремления и касания */}
      {(aspirations.length > 0 || touchstones.length > 0) && (
        <>
          <p className="vtm-print-section">Стремления и опоры</p>
          {aspirations.map((a, i) => (
            <p className="vtm-print-line" key={a.id}><b>Стремление {i + 1}:</b> {a.text}</p>
          ))}
          {touchstones.map((t, i) => (
            <p className="vtm-print-line" key={t.id}><b>Касание {i + 1}:</b> {t.text}</p>
          ))}
        </>
      )}

      {/* Снаряжение */}
      {data.gear.length > 0 && (
        <>
          <p className="vtm-print-section">Снаряжение</p>
          <p className="vtm-print-line">
            {data.gear.map((g) => `${g.name}${g.count ? ` ×${g.count}` : ""}${g.note ? ` (${g.note})` : ""}`).join("; ")}
          </p>
        </>
      )}

      {/* Лунный дневник */}
      {data.notes.length > 0 && (
        <>
          <p className="vtm-print-section">Лунный дневник</p>
          {data.notes.slice(0, 10).map((n) => (
            <p className="vtm-print-line" key={n.id} style={{ whiteSpace: "pre-wrap" }}>
              {n.date}{n.title ? ` · ${n.title}` : ""}: {n.content}
            </p>
          ))}
          {data.notes.length > 10 && <p className="vtm-print-line">…и ещё {data.notes.length - 10} записей в онлайн-архиве.</p>}
        </>
      )}

      {/* Хроника бросков (Кости Луны) — последние 12 на бумаге */}
      {data.rollLog.length > 0 && (
        <>
          <p className="vtm-print-section">Хроника бросков</p>
          {data.rollLog.slice(0, 12).map((r) => (
            <p className="vtm-print-line vtm-print-roll" key={r.id}>
              {r.ts ? new Date(r.ts).toLocaleString("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) + " · " : ""}
              {r.text}
            </p>
          ))}
          {data.rollLog.length > 12 && <p className="vtm-print-line">…и ещё {data.rollLog.length - 12} бросков в онлайн-архиве.</p>}
        </>
      )}

      {/* Журнал опыта — последние 6 на бумаге */}
      {(data.xpLog?.length || 0) > 0 && (
        <>
          <p className="vtm-print-section">Журнал опыта</p>
          {data.xpLog!.slice(0, 6).map((e) => (
            <p className="vtm-print-line vtm-print-roll" key={e.id}>
              {new Date(e.ts).toLocaleString("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })} · {e.text}
            </p>
          ))}
          {data.xpLog!.length > 6 && <p className="vtm-print-line">…и ещё {data.xpLog!.length - 6} записей в онлайн-архиве.</p>}
        </>
      )}
    </>
  );
}

/** Полный печатный лист Гароу. */
export function W5PrintDoc({ data }: { data: W5SheetData }) {
  return (
    <div className="vtm-print-doc">
      <W5PrintHead data={data} />
      <W5PrintBody data={data} />
      <div className="vtm-print-footer">
        <span>Опыт: свободно {data.trackers.xp} · вложено {data.trackers.xpSpent} · </span>
        <span>«Колесо повернётся, как должно.»</span>
      </div>
    </div>
  );
}

/** Сводка Гароу на одну страницу — для стола Рассказчика. */
export function W5PrintSummary({ data }: { data: W5SheetData }) {
  const info = data.info;
  const tribe = W5_TRIBE_BY_ID.get(info.tribe);
  const auspice = W5_AUSPICE_BY_ID.get(info.auspice);
  const healthMax = w5HealthMax(data);
  const wpMax = w5WillpowerMax(data);
  const rank = w5Rank(data.trackers.glory, data.trackers.honor, data.trackers.wisdom);
  const attrPairs: { key: keyof W5SheetData["attributes"]; label: string }[] = [
    { key: "str", label: "Сила" }, { key: "dex", label: "Ловкость" }, { key: "sta", label: "Стойкость" },
    { key: "cha", label: "Обаяние" }, { key: "man", label: "Манипуляция" }, { key: "com", label: "Самообладание" },
    { key: "int", label: "Интеллект" }, { key: "wit", label: "Смекалка" }, { key: "res", label: "Упорство" },
  ];
  const topSkills = data.skills
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)
    .map((s) => {
      const def = SKILL_LIBRARY.find((x) => x.id === s.id);
      return `${def?.name || s.id} ${s.value}`;
    });
  const aspirations = data.aspirations.filter((a) => a.text);

  return (
    <div className="vtm-print-doc vtm-print-sum">
      <W5PrintHead data={data} />

      <p className="vtm-print-section">Кратко</p>
      <div className="vtm-print-grid">
        {attrPairs.map(({ key, label }) => (
          <span key={key} className="vtm-print-item"><b>{label}</b> {data.attributes[key]}</span>
        ))}
      </div>
      {topSkills.length > 0 && (
        <p className="vtm-print-line" style={{ marginTop: 6 }}>
          <b>Лучшие навыки:</b> {topSkills.join(" · ")}
        </p>
      )}
      {data.gifts.length > 0 && (
        <p className="vtm-print-line">
          <b>Дары:</b> {data.gifts.map((g) => `${g.name} (${g.level})`).join(", ")}
        </p>
      )}
      {data.rites.length > 0 && (
        <p className="vtm-print-line">
          <b>Обряды:</b> {data.rites.map((r) => `${r.name} (${r.level})`).join(", ")}
        </p>
      )}
      {aspirations.length > 0 && (
        <p className="vtm-print-line">
          <b>Стремления:</b> {aspirations.map((a) => a.text).join(" | ")}
        </p>
      )}
      {tribe && (
        <p className="vtm-print-line" style={{ marginTop: 6 }}>
          <b>{tribe.name}</b>{auspice ? ` · ${auspice.name}` : ""} · Слава {data.trackers.glory + data.trackers.honor + data.trackers.wisdom} — {rank.title} · Ярость {data.trackers.rage}/5 · Здоровье {healthMax} · Воля {wpMax}
        </p>
      )}
      {info.quote && <p className="vtm-print-line" style={{ fontStyle: "italic", marginTop: 6 }}>{info.quote}</p>}

      <div className="vtm-print-footer">
        <span>Памятка: кость Ярости 1–2 — Жестокая (сама не даёт успеха; две — провал с разрушениями, на уроне +4 успеха) · Ярость 0 — волк потерян · </span>
        <span>«Колесо повернётся, как должно.»</span>
      </div>
    </div>
  );
}
