"use client";

// ============================================================
// ВКЛАДКА «ХРОНИКА» (раунд 42): единая кровавая нить ночей.
// Журнал ночи + церемонии Диаблери + журнал опыта — одной
// лентой, с фильтрами, поиском и счётчиками ночи.
// ============================================================

import { useMemo, useState } from "react";
import { VtmSheetData } from "@/lib/vtm-data";
import { DerivedStats } from "@/lib/vtm-calc";

type Kind = "hunt" | "note" | "diab" | "xp";

interface ChronItem {
  id: string;
  kind: Kind;
  title: string;
  dateLabel: string;
  tsMs: number;   // время для сортировки (0 — не разобрать)
  text: string;
  tags?: { label: string; tone: "gift" | "stain" | "check" | "hunt" }[];
}

// ---------- Терпимый парсер дат: ISO, «21.09.2026», «21 сент., 13:35» ----------

const RU_MONTHS: Record<string, number> = {
  "янв": 0, "фев": 1, "мар": 2, "апр": 3, "мая": 4, "май": 4, "июн": 5, "июл": 6, "авг": 7, "сен": 8, "окт": 9, "ноя": 10, "дек": 11,
};

function parseRuDateMs(s: string): number {
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
    const month = RU_MONTHS[ru[2].toLowerCase().slice(0, 3)];
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

// ---------- Сборка единой ленты ----------

function buildTimeline(data: VtmSheetData): ChronItem[] {
  const items: ChronItem[] = [];

  for (const n of data.notes.entries) {
    const hunt = n.title === "Новая охота";
    items.push({
      id: n.id,
      kind: hunt ? "hunt" : "note",
      title: n.title || "Без заголовка",
      dateLabel: n.date,
      tsMs: parseRuDateMs(n.date),
      text: n.content,
      tags: hunt ? [{ label: "охота", tone: "hunt" }] : undefined,
    });
  }

  for (const e of data.diablerie?.entries || []) {
    items.push({
      id: e.id,
      kind: "diab",
      title: `Диаблери: ${e.victim}`,
      dateLabel: e.ts
        ? new Date(e.ts).toLocaleDateString("ru-RU", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" })
        : "—",
      tsMs: parseRuDateMs(e.ts),
      text:
        `Выпита душа Сородича${e.gen ? ` (${e.gen}-е поколение)` : " (поколение неизвестно)"}.` +
        (e.bpGift ? " Душа была сильнее — дарована Сила Крови." : "") +
        (e.extraStain ? " Воля дрогнула — третье пятно Человечности." : ""),
      tags: [
        ...(e.bpGift ? [{ label: "↑СК", tone: "gift" as const }] : []),
        ...(e.extraStain ? [{ label: "+пятно", tone: "stain" as const }] : []),
        ...(e.check ? [{ label: `воля ${e.check.successes}/${e.check.diff}`, tone: "check" as const }] : []),
      ],
    });
  }

  for (const x of data.xpLog || []) {
    items.push({
      id: x.id,
      kind: "xp",
      title: "Журнал опыта",
      dateLabel: x.ts
        ? new Date(x.ts).toLocaleString("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
        : "—",
      tsMs: parseRuDateMs(x.ts),
      text: x.text,
    });
  }

  // сортировка: по времени (свежие сверху); неразобранные даты — по позиции источника
  items.sort((a, b) => {
    if (a.tsMs && b.tsMs) return b.tsMs - a.tsMs;
    if (a.tsMs) return -1;
    if (b.tsMs) return 1;
    return 0;
  });
  return items;
}

// ---------- Вкладка ----------

const KIND_META: Record<Kind, { icon: string; label: string; cls: string }> = {
  hunt: { icon: "🌙", label: "охоты", cls: "hunt" },
  note: { icon: "🖋", label: "записи", cls: "note" },
  diab: { icon: "⚷", label: "церемонии", cls: "diab" },
  xp: { icon: "✦", label: "опыт", cls: "xp" },
};

type Filter = "all" | Kind;

export function ChronicleSection({
  data,
  derived,
}: {
  data: VtmSheetData;
  derived: DerivedStats;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const timeline = useMemo(() => buildTimeline(data), [data]);
  const q = query.trim().toLowerCase();
  const filtered = timeline.filter((it) => {
    if (filter !== "all" && it.kind !== filter) return false;
    if (!q) return true;
    return it.title.toLowerCase().includes(q) || it.text.toLowerCase().includes(q);
  });

  const stats = [
    { icon: "🌙", label: "ночей прожито", value: data.trackers.huntCount || 0, title: "«Новых охот» в хронике" },
    { icon: "🖋", label: "записей в журнале", value: data.notes.entries.length, title: "Все записи журнала ночи" },
    { icon: "⚷", label: "церемоний", value: data.diablerie?.count || 0, title: "Выпито душ — след в ауре" },
    { icon: "✦", label: "строк опыта", value: (data.xpLog || []).length, title: "Записи журнала опыта (последние 40)" },
  ];

  return (
    <div className="space-y-4">
      {/* Счётчики ночи */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5" role="group" aria-label="Счётчики хроники">
        {stats.map((s) => (
          <div key={s.label} className="vtm-chron-stat" title={s.title}>
            <span className="vtm-chron-stat-icon" aria-hidden>{s.icon}</span>
            <span className="vtm-chron-stat-value">{s.value}</span>
            <span className="vtm-chron-stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Поиск + фильтры */}
      <div className="vtm-jsearch-bar">
        <div className="vtm-jsearch-wrap">
          <span className="vtm-jsearch-icon" aria-hidden>⌕</span>
          <input
            className="vtm-jsearch"
            value={query}
            onChange={(e) => setQuery(e.target.value.slice(0, 80))}
            placeholder="найти ночь: имя, долг, церемония, покупка…"
            aria-label="Поиск по хронике"
          />
          {query && (
            <button className="vtm-jsearch-clear" onClick={() => setQuery("")} aria-label="Очистить поиск">
              ✕
            </button>
          )}
        </div>
        <div className="vtm-jchips" role="group" aria-label="Фильтр хроники">
          <button className={`vtm-jchip ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")} aria-pressed={filter === "all"}>
            все
          </button>
          {(Object.keys(KIND_META) as Kind[]).map((k) => (
            <button
              key={k}
              className={`vtm-jchip ${filter === k ? "active" : ""}`}
              onClick={() => setFilter(k)}
              aria-pressed={filter === k}
              title={`Только ${KIND_META[k].label}`}
            >
              {KIND_META[k].icon} {KIND_META[k].label}
            </button>
          ))}
        </div>
      </div>

      {/* Кровавая нить */}
      <section className="vtm-panel" aria-label="Кровавая нить хроники">
        <div className="vtm-panel-head">
          <span className="vtm-label text-[0.81rem] text-[#d6a840]">Кровавая нить</span>
          <span className="vtm-hint !text-[0.73rem] ml-auto">
            {(query.trim() || filter !== "all")
              ? `${filtered.length} из ${timeline.length}`
              : timeline.length}
            {" "}· СК {derived.bp} · Голод {data.trackers.hunger} · Чел. {data.trackers.humanity}/10
          </span>
        </div>
        <div className="p-3 md:p-4 max-h-[640px] overflow-y-auto vtm-scroll vtm-chron-wrap">
          {filtered.length === 0 ? (
            <p className="vtm-hint text-center py-8">
              {timeline.length === 0
                ? "Нить пуста. Пробуди нового Сородича — или живи первую ночь."
                : "На этой нити ничего не намотано. Кровь шепчет: смени фильтр или запрос."}
            </p>
          ) : (
            <ol className="vtm-chron-list">
              {filtered.map((it, i) => {
                const meta = KIND_META[it.kind];
                return (
                  <li key={`${it.id}-${i}`} className={`vtm-chron-item ${meta.cls}`} style={{ animationDelay: `${Math.min(i, 12) * 45}ms` }}>
                    <span className="vtm-chron-bullet" aria-hidden>{meta.icon}</span>
                    <article className="vtm-chron-card">
                      <header className="flex items-baseline gap-2 flex-wrap">
                        <h3 className="vtm-chron-title">{it.title}</h3>
                        {it.tags?.map((t) => (
                          <span key={t.label} className={`vtm-chron-tag ${t.tone}`}>{t.label}</span>
                        ))}
                        <time className="vtm-chron-date">{it.dateLabel}</time>
                      </header>
                      <p className="vtm-chron-text">{it.text}</p>
                    </article>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </section>

      <p className="vtm-hint !text-[0.75rem]">
        Хроника собирает всё, что лист помнит: охоты и записи из «Заметок», церемонии Диаблери и строки журнала опыта из Кошелька Крови. Выгрузка журнала ночей в файл — на вкладке «Заметки».
      </p>
    </div>
  );
}
