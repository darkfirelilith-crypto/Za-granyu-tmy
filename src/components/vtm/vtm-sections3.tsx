"use client";

// ============================================================
// Секции: Имущество (убежище, деньги, рюкзак) и Заметки (журнал ночи).
// ============================================================

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { VtmSheetData, VtmGearItem, VtmNote } from "@/lib/vtm-data";
import { DerivedStats } from "@/lib/vtm-calc";
import { buildChronicleMarkdown, chronicleFileName } from "@/lib/vtm-chronicle-md";

/** Авторасширяющаяся textarea: текст растягивает поле. */
export function AutoTextarea({
  value,
  onChange,
  className = "",
  placeholder,
  ariaLabel,
  minHeight = 60,
  maxLength,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
  ariaLabel?: string;
  minHeight?: number;
  maxLength?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.max(minHeight, el.scrollHeight)}px`;
  };

  useLayoutEffect(resize, [value]);

  useEffect(() => {
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={ariaLabel}
      maxLength={maxLength}
      className={`vtm-input vtm-autogrow ${className}`}
      style={{ minHeight: 0 }}
      rows={1}
    />
  );
}

// ============================================================
// ИМУЩЕСТВО
// ============================================================

export function GearSection({
  data,
  mutate,
  derived,
}: {
  data: VtmSheetData;
  mutate: (fn: (draft: VtmSheetData) => void) => void;
  derived: DerivedStats;
}) {
  const [newItem, setNewItem] = useState("");
  const [openNotes, setOpenNotes] = useState<Record<string, boolean>>({});

  const addItem = () => {
    const name = newItem.trim();
    if (!name) return;
    const item: VtmGearItem = {
      id: `item-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e5).toString(36)}`,
      name,
      count: "",
      note: "",
    };
    mutate((d) => { d.gear.items.push(item); });
    setNewItem("");
  };

  const removeItem = (id: string) => {
    mutate((d) => { d.gear.items = d.gear.items.filter((it) => it.id !== id); });
  };

  const patchItem = (id: string, patch: Partial<VtmGearItem>) => {
    mutate((d) => {
      const it = d.gear.items.find((x) => x.id === id);
      if (it) Object.assign(it, patch);
    });
  };

  return (
    <div className="space-y-4">
      {/* Убежище и деньги */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section className="vtm-panel" aria-label="Убежище">
          <div className="vtm-panel-head">
            <span className="vtm-label text-[0.81rem] text-[#d6a840]">Убежище</span>
          </div>
          <div className="p-4">
            <AutoTextarea
              value={data.gear.haven}
              onChange={(v) => mutate((d) => { d.gear.haven = v; })}
              placeholder="где ты спишь днём: безопасно ли, кто знает адрес, что припрятано"
              ariaLabel="Убежище"
            />
            <p className="vtm-hint mt-2 !text-[0.75rem]">
              За надёжное убежище отвечает факт биографии «Убежище» (вкладка Преимущества).
            </p>
          </div>
        </section>

        <section className="vtm-panel" aria-label="Средства">
          <div className="vtm-panel-head">
            <span className="vtm-label text-[0.81rem] text-[#d6a840]">Деньги и источники</span>
          </div>
          <div className="p-4">
            <AutoTextarea
              value={data.gear.resources}
              onChange={(v) => mutate((d) => { d.gear.resources = v; })}
              placeholder="наличные, счета, кто платит, чем объясняешь доход"
              ariaLabel="Деньги и источники"
            />
            <p className="vtm-hint mt-2 !text-[0.75rem]">
              Масштаб богатства ведёт факт биографии «Богатство» (0–5).
            </p>
          </div>
        </section>
      </div>

      {/* Рюкзак */}
      <section className="vtm-panel" aria-label="Рюкзак">
        <div className="vtm-panel-head">
          <span className="vtm-label text-[0.81rem] text-[#d6a840]">Рюкзак</span>
          <span className="vtm-hint !text-[0.73rem] ml-auto">{data.gear.items.length} предметов · на широком экране карточки в две колонки</span>
        </div>
        <div className="p-3 md:p-4 space-y-3">
          {data.gear.items.length === 0 ? (
            <p className="vtm-hint text-center py-4">Пусто. Даже Сородичу нужно что-то, кроме клыков.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-96 overflow-y-auto vtm-scroll">
              {data.gear.items.map((item) => {
                const hasNote = item.note.trim().length > 0;
                const opened = openNotes[item.id];
                return (
                  <div
                    key={item.id}
                    className="vtm-frame rounded-md p-2.5 space-y-1.5"
                    style={opened ? { borderColor: "rgba(168,134,61,0.5)", background: "rgba(168,134,61,0.04)" } : undefined}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[#a8863d] select-none" aria-hidden>◈</span>
                      <input
                        className="vtm-input !border-transparent !bg-transparent !py-0.5 !text-[0.88rem] flex-1 min-w-0"
                        value={item.name}
                        onChange={(e) => patchItem(item.id, { name: e.target.value })}
                        aria-label="Название предмета"
                      />
                      <input
                        className="vtm-input !border-transparent !bg-transparent !py-0.5 !text-[0.84rem] w-12 text-center shrink-0"
                        value={item.count}
                        onChange={(e) => patchItem(item.id, { count: e.target.value })}
                        placeholder="кол-во"
                        aria-label="Количество"
                        title="Количество"
                      />
                      <button
                        className={`vtm-btn vtm-btn-ghost !p-1 !text-[0.75rem] shrink-0 ${hasNote ? "!text-[#a8863d]" : ""} ${opened ? "!text-[#d6a840]" : ""}`}
                        onClick={() => setOpenNotes((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                        aria-label={hasNote ? (opened ? "Свернуть заметку" : "Развернуть заметку") : "Добавить заметку"}
                        title={hasNote ? (opened ? "Свернуть заметку" : "Развернуть заметку") : "Добавить заметку"}
                      >
                        ✎ {hasNote ? (opened ? "▴" : "▾") : ""}
                      </button>
                      <button
                        className="vtm-btn vtm-btn-ghost !p-1 !text-[0.75rem] shrink-0"
                        onClick={() => removeItem(item.id)}
                        aria-label={`Убрать ${item.name}`}
                      >
                        ✕
                      </button>
                    </div>
                    {opened && (
                      <AutoTextarea
                        value={item.note}
                        onChange={(v) => patchItem(item.id, { note: v })}
                        placeholder="заметка: что это, где спрятано, чья кровь на рукояти…"
                        ariaLabel={`Заметка к предмету ${item.name}`}
                        minHeight={44}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex gap-2">
            <input
              className="vtm-input flex-1"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addItem()}
              placeholder="новый предмет: кровяной мешок, пассатижи, ключ от морга…"
              aria-label="Название нового предмета"
            />
            <button className="vtm-btn shrink-0" onClick={addItem} disabled={!newItem.trim()}>+ Добавить</button>
          </div>
        </div>
      </section>
    </div>
  );
}

// ============================================================
// ЗАМЕТКИ
// ============================================================

const DRAFT_LIMIT = 2000;
const ENTRY_TITLE_LIMIT = 120;
const ENTRY_CONTENT_LIMIT = 3000;

/** Счётчик символов: меркнет в норме, занимается янтарём у предела, краснеет на нём. */
export function CharCount({ value, limit, className = "" }: { value: string; limit: number; className?: string }) {
  const len = value.length;
  const near = len >= Math.round(limit * 0.9);
  const full = len >= limit;
  return (
    <span
      className={`vtm-char-count ${near ? "near" : ""} ${full ? "full" : ""} ${className}`}
      aria-live="polite"
    >
      {len}/{limit}{near && !full ? ` · осталось ${limit - len}` : full ? " · предел" : ""}
    </span>
  );
}

/** Лента «Хроника ночей» в редакторе: последние события одной строкой-нитью. */
function ChronicleDigest({ entries }: { entries: VtmNote[] }) {
  const recent = entries.slice(0, 4);
  return (
    <section className="vtm-ed-feed" aria-label="Хроника ночей — последние события">
      <span className="vtm-ed-feed-head">Хроника ночей</span>
      {recent.length === 0 ? (
        <span className="vtm-ed-feed-empty">Ночь первая — на нити ещё пусто</span>
      ) : (
        <ol className="vtm-ed-feed-list">
          {recent.map((n, i) => {
            const hunt = n.title === "Новая охота";
            return (
              <li key={n.id} className="vtm-edf-item" style={{ animationDelay: `${i * 70}ms` }}>
                <span className={`vtm-edf-icon ${hunt ? "hunt" : ""}`} aria-hidden>
                  {hunt ? "🌙" : "🖋"}
                </span>
                <span className="vtm-edf-body">
                  <span className="vtm-edf-title">{n.title || "Без заголовка"}</span>
                  <span className="vtm-edf-date">{n.date}</span>
                </span>
              </li>
            );
          })}
          {entries.length > 4 && (
            <li className="vtm-edf-more">…и ещё {entries.length - 4} записей ниже</li>
          )}
        </ol>
      )}
    </section>
  );
}

/** Склонение «запись/записи/записей» для тостов экспорта. */
function pluralEntries(n: number): string {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "запись";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "записи";
  return "записей";
}

export function NotesSection({
  data,
  mutate,
}: {
  data: VtmSheetData;
  mutate: (fn: (draft: VtmSheetData) => void) => void;
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  // Поиск и фильтр по журналу (записей становится много — Кровь требует порядка)
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "hunt" | "note">("all");

  const entries = data.notes.entries;
  const q = query.trim().toLowerCase();
  const filtered = entries.filter((n) => {
    if (filter === "hunt" && n.title !== "Новая охота") return false;
    if (filter === "note" && n.title === "Новая охота") return false;
    if (!q) return true;
    return (
      (n.title || "").toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q)
    );
  });

  const addNote = () => {
    const c = content.trim();
    if (!c) return;
    const note: VtmNote = {
      id: `note-${Date.now().toString(36)}`,
      title: title.trim(),
      content: c,
      date: new Date().toLocaleString("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }),
    };
    mutate((d) => { d.notes.entries = [note, ...d.notes.entries]; });
    setTitle("");
    setContent("");
    toast.success("Запись внесена в журнал");
  };

  const removeNote = (id: string) => {
    mutate((d) => { d.notes.entries = d.notes.entries.filter((n) => n.id !== id); });
  };

  // Экспорт всей хроники в .md файл (Obsidian / печать / архив стола)
  const [chronoBusy, setChronoBusy] = useState(false);
  const exportChronicle = () => {
    if (data.notes.entries.length === 0) {
      toast.error("Хроника пуста", { description: "Сначала внеси хотя бы одну ночь в журнал — Кровь не печатает белые страницы." });
      return;
    }
    setChronoBusy(true);
    try {
      const md = buildChronicleMarkdown(data);
      const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = chronicleFileName(data.info.name);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      toast.success("Хроника ушла в файл", { description: `${data.notes.entries.length} ${pluralEntries(data.notes.entries.length)} · ${a.download}` });
    } catch {
      toast.error("Перо дрогнуло", { description: "Не удалось собрать файл хроники." });
    } finally {
      setChronoBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Лента последних событий — сводка без прокрутки */}
      <ChronicleDigest entries={data.notes.entries} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Черновик + создание записи */}
        <section className="vtm-panel" aria-label="Журнал ночи">
          <div className="vtm-panel-head">
            <span className="vtm-label text-[0.81rem] text-[#d6a840]">Журнал ночи</span>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="vtm-label text-[0.73rem] text-[#c4ac9d]">Черновик (автосохраняется)</span>
                <CharCount value={data.notes.draft} limit={DRAFT_LIMIT} />
              </div>
              <div className="mt-1">
                <AutoTextarea
                  value={data.notes.draft}
                  onChange={(v) => mutate((d) => { d.notes.draft = v.slice(0, DRAFT_LIMIT); })}
                  placeholder="наброски: имена, догадки, спойлеры для себя — всё живёт до перезагрузки"
                  ariaLabel="Черновик заметок"
                  maxLength={DRAFT_LIMIT}
                />
              </div>
            </div>
            <div className="vtm-divider text-[0.73rem]"><span>🖋</span></div>
            <div className="space-y-2">
              <input
                className="vtm-input"
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, ENTRY_TITLE_LIMIT))}
                placeholder="заголовок записи: Ночь первая, Дело Савельевых…"
                aria-label="Заголовок новой записи"
                maxLength={ENTRY_TITLE_LIMIT}
              />
              <AutoTextarea
                value={content}
                onChange={setContent}
                placeholder="что случилось, кто кому должен, кого стоит бояться"
                ariaLabel="Текст новой записи"
                minHeight={90}
              />
              <div className="flex items-center justify-between gap-2">
                <CharCount value={content} limit={ENTRY_CONTENT_LIMIT} />
                <button className="vtm-btn vtm-btn-blood shrink-0" onClick={addNote} disabled={!content.trim() || content.length >= ENTRY_CONTENT_LIMIT}>
                  + Внести в журнал
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Список записей */}
        <section className="vtm-panel" aria-label="Записи журнала">
          <div className="vtm-panel-head">
            <span className="vtm-label text-[0.81rem] text-[#d6a840]">Записи</span>
            <span className="vtm-hint !text-[0.73rem] ml-auto">
              {(query.trim() || filter !== "all")
                ? `${filtered.length} из ${entries.length}`
                : entries.length}
            </span>
            <button
              className="vtm-btn-chrono"
              onClick={exportChronicle}
              disabled={chronoBusy}
              title="Скачать всю хронику ночей одним Markdown-файлом"
            >
              ⇩ Хроника в файл
            </button>
          </div>
          {/* Поиск + фильтр */}
          <div className="vtm-jsearch-bar">
            <div className="vtm-jsearch-wrap">
              <span className="vtm-jsearch-icon" aria-hidden>⌕</span>
              <input
                className="vtm-jsearch"
                value={query}
                onChange={(e) => setQuery(e.target.value.slice(0, 80))}
                placeholder="найти ночь: имя, догадка, долг…"
                aria-label="Поиск по журналу ночи"
              />
              {query && (
                <button className="vtm-jsearch-clear" onClick={() => setQuery("")} aria-label="Очистить поиск">
                  ✕
                </button>
              )}
            </div>
            <div className="vtm-jchips" role="group" aria-label="Фильтр записей">
              <button
                className={`vtm-jchip ${filter === "all" ? "active" : ""}`}
                onClick={() => setFilter("all")}
                aria-pressed={filter === "all"}
              >
                все
              </button>
              <button
                className={`vtm-jchip ${filter === "hunt" ? "active" : ""}`}
                onClick={() => setFilter("hunt")}
                aria-pressed={filter === "hunt"}
                title="Только охоты"
              >
                🌙 охоты
              </button>
              <button
                className={`vtm-jchip ${filter === "note" ? "active" : ""}`}
                onClick={() => setFilter("note")}
                aria-pressed={filter === "note"}
                title="Только записи"
              >
                🖋 записи
              </button>
            </div>
          </div>
          <div className="p-3 space-y-2 max-h-[620px] overflow-y-auto vtm-scroll">
            {entries.length === 0 && (
              <p className="vtm-hint text-center py-6">Журнал чист. Ночь только началась.</p>
            )}
            {entries.length > 0 && filtered.length === 0 && (
              <p className="vtm-hint text-center py-6">
                На эту нить не намотано ничего. Кровь подсказывает: попробуй другой запрос.
              </p>
            )}
            {filtered.map((note) => (
              <article key={note.id} className="vtm-frame rounded-md p-3 space-y-1.5">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    {note.title ? (
                      <h3 className="vtm-display text-sm text-[#d9c7b6] leading-snug">{note.title}</h3>
                    ) : (
                      <h3 className="vtm-display text-sm text-[#c4ac9d] italic leading-snug">Без заголовка</h3>
                    )}
                    <p className="vtm-label text-[0.68rem] text-[#9c8072] mt-0.5">{note.date}</p>
                  </div>
                  <button
                    className="vtm-btn vtm-btn-ghost !p-1 !text-[0.73rem]"
                    onClick={() => removeNote(note.id)}
                    aria-label="Удалить запись"
                    title="Удалить запись"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-[0.9rem] leading-relaxed text-[#c4ac9d] whitespace-pre-wrap">{note.content}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
