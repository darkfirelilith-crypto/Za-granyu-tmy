"use client";

// ============================================================
// СЛОВАРЬ — глоссарий «Вампиров: Маскарад» по официальной
// русской локализации. Каждый термин: значение по правилам
// + «для обывателя» — что это значило бы для смертного.
// Поиск, группы, счётчики. Используется вкладкой «Словарь».
// ============================================================

import { useMemo, useState } from "react";
import { GLOSSARY_GROUPS, GLOSSARY_TERMS } from "@/lib/vtm-glossary";

export function GlossarySection() {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<string>("all");
  const q = query.trim().toLowerCase();

  const groups = useMemo(() => {
    return GLOSSARY_GROUPS.map((g) => ({
      ...g,
      terms: GLOSSARY_TERMS.filter(
        (t) =>
          t.group === g.id &&
          (group === "all" || group === g.id) &&
          (!q ||
            `${t.term} ${t.en} ${t.def} ${t.mortal}`.toLowerCase().includes(q))
      ),
    })).filter((g) => g.terms.length > 0);
  }, [q, group]);

  const total = groups.reduce((s, g) => s + g.terms.length, 0);

  return (
    <div className="space-y-4">
      {/* Шапка */}
      <div className="vtm-panel p-4 space-y-2.5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="vtm-stamp">Словарь</span>
          <span className="vtm-hint !text-[0.75rem]">
            терминов: <b className="not-italic text-[#d9c7b6]">{total}</b>
          </span>
          <p className="vtm-hint !text-[0.77rem] flex-1 min-w-[240px]">
            Глоссарий книги правил: ночной жаргон Сородичей в официальной русской локализации. Каждое слово — с пометкой «для обывателя»: что увидел бы смертный.
          </p>
        </div>
        <input
          className="vtm-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="поиск: витэ, Сородичи, Маскарад, Зверь…"
          aria-label="Поиск по Словарю"
        />
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Группы терминов">
          <button
            type="button"
            className={`vtm-glos-filter ${group === "all" ? "active" : ""}`}
            onClick={() => setGroup("all")}
            aria-pressed={group === "all"}
          >
            все слова
          </button>
          {GLOSSARY_GROUPS.map((g) => (
            <button
              key={g.id}
              type="button"
              className={`vtm-glos-filter ${group === g.id ? "active" : ""}`}
              onClick={() => setGroup(g.id)}
              aria-pressed={group === g.id}
            >
              <span aria-hidden>{g.icon}</span> {g.name}
            </button>
          ))}
        </div>
      </div>

      {/* Группы и термины */}
      {total === 0 && (
        <div className="vtm-hist-empty" role="status">
          <span className="vtm-hist-empty-scroll" aria-hidden>📖</span>
          <p className="vtm-disc-empty-title">Слово не найдено</p>
          <p className="vtm-hint !text-[0.79rem] text-center max-w-[440px]">
            Ночь молчит — попробуй иначе: «Витэ», «Сородичи», «Маскарад», «Зверь»…
          </p>
        </div>
      )}

      {groups.map((g) => (
        <section key={g.id} className="space-y-2.5" aria-label={g.name}>
          <div className="flex items-baseline gap-2 flex-wrap vtm-glos-group-head">
            <span aria-hidden className="vtm-glos-group-icon">{g.icon}</span>
            <h3 className="vtm-display text-[1.02rem] text-[#d9c7b6]">{g.name}</h3>
            <span className="vtm-hint !text-[0.73rem] flex-1 min-w-[200px]">{g.hint}</span>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {g.terms.map((t) => (
              <article key={t.term} className="vtm-panel vtm-glos-card">
                <header className="flex items-baseline gap-2 flex-wrap">
                  <b className="vtm-glos-term">{t.term}</b>
                  <span className="vtm-glos-en">{t.en}</span>
                </header>
                <p className="vtm-glos-def">{t.def}</p>
                <p className="vtm-glos-mortal">
                  <span className="vtm-glos-mortal-label" aria-hidden>👁 для обывателя</span>
                  {t.mortal}
                </p>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
