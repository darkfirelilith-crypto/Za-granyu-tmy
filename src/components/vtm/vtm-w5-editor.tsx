"use client";

// ============================================================
// ЛИСТ ГАРОУ (W5) — редактор Оборотня в разделе «Маскарад».
// Отдельная ветка листа (kind: "werewolf") в том же VtmSheet.
// Изоляция сохранена: только vtm- префиксы стилей и свой API-флоу.
// ============================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { VtmReturnPortal } from "@/components/vtm/portal-transition";
import { vtmFetch } from "@/lib/vtm-api";
import { SKILL_LIBRARY } from "@/lib/vtm-data";
import {
  W5SheetData,
  W5GiftEntry,
  W5_TRIBES,
  W5_TRIBE_BY_ID,
  W5_AUSPICES,
  W5_AUSPICE_BY_ID,
  W5_BREEDS,
  W5_FORMS,
  W5_GIFT_LIBRARY,
  W5_RITE_LIBRARY,
  emptyW5Sheet,
  normalizeW5,
  w5WillpowerMax,
  w5HealthMax,
  w5Rank,
} from "@/lib/vtm-w5data";

type W5Tab = "identity" | "nature" | "skills" | "gifts" | "tracks" | "gear" | "notes" | "codex";

const TABS: { id: W5Tab; label: string; icon: string }[] = [
  { id: "identity", label: "Личность", icon: "🐺" },
  { id: "nature", label: "Характеристики", icon: "☾" },
  { id: "skills", label: "Навыки", icon: "✦" },
  { id: "gifts", label: "Дары и Обряды", icon: "◈" },
  { id: "tracks", label: "Треки", icon: "🩸" },
  { id: "gear", label: "Снаряжение", icon: "🎒" },
  { id: "notes", label: "Заметки", icon: "🖋" },
  { id: "codex", label: "База знаний", icon: "📖" },
];

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function W5Editor({ sheetId, onBack }: { sheetId: string; onBack: () => void }) {
  const qc = useQueryClient();
  const { data: raw, isLoading, isError } = useQuery<any>({
    queryKey: ["vtm-sheet", sheetId],
    queryFn: () => vtmFetch(`/api/vtm/sheets/${sheetId}`).then(async (r) => {
      if (!r.ok) throw new Error("Лист не найден");
      return r.json();
    }),
  });

  const [data, setData] = useState<W5SheetData | null>(null);
  const [tab, setTab] = useState<W5Tab>("identity");
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [conflict, setConflict] = useState<{ serverData: W5SheetData; serverUpdatedAt: string } | null>(null);
  const syncedAtRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);
  const pendingRef = useRef<{ payload: W5SheetData; name: string; force?: boolean } | null>(null);
  const loadedRef = useRef(false);

  // Загрузка листа
  useEffect(() => {
    if (raw && !loadedRef.current) {
      setData(normalizeW5(raw.data));
      if (raw.updatedAt) syncedAtRef.current = raw.updatedAt;
      loadedRef.current = true;
    }
  }, [raw]);

  const doSave = useCallback(async (payload: W5SheetData, name: string, force?: boolean) => {
    const body = {
      name,
      data: payload,
      baseUpdatedAt: syncedAtRef.current || undefined,
      force: force || undefined,
    };
    const res = await vtmFetch(`/api/vtm/sheets/${sheetId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.status === 409) {
      const j = await res.json().catch(() => ({}));
      setConflict({ serverData: normalizeW5(j.serverData || {}), serverUpdatedAt: j.serverUpdatedAt || new Date().toISOString() });
      setStatus("error");
      return;
    }
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.error || "Ошибка сохранения");
    }
    const saved = await res.json().catch(() => ({}));
    if (saved.updatedAt) syncedAtRef.current = saved.updatedAt;
  }, [sheetId]);

  // Автосейв с debounce
  useEffect(() => {
    if (!data || !loadedRef.current) return;
    setStatus("saving");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const payload = data;
      const name = data.info.name || "Безымянный Гароу";
      if (inFlightRef.current) {
        pendingRef.current = { payload, name };
        return;
      }
      inFlightRef.current = true;
      try {
        await doSave(payload, name);
        setStatus("saved");
      } catch (e) {
        setStatus("error");
        toast.error(e instanceof Error ? e.message : "Ошибка сохранения");
      } finally {
        inFlightRef.current = false;
        if (pendingRef.current) {
          const next = pendingRef.current;
          pendingRef.current = null;
          doSave(next.payload, next.name, next.force).then(() => setStatus("saved")).catch(() => setStatus("error"));
        }
      }
    }, 900);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [data, doSave]);

  /** Изменение данных через структурную копию. */
  const mutate = useCallback((fn: (draft: W5SheetData) => void) => {
    setData((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      fn(next);
      return next;
    });
  }, []);

  // Прогрев кэша архива после закрытия
  const back = () => {
    qc.invalidateQueries({ queryKey: ["vtm-sheets"] });
    onBack();
  };

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="vtm-label text-sm tracking-[0.4em] uppercase text-[#9c8072] vtm-flicker">Волк просыпается…</p>
      </main>
    );
  }
  if (isError || !data) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <p className="vtm-hint">Лист не найден — возможно, он предан земле.</p>
        <button className="vtm-btn" onClick={back}>← В архив</button>
      </main>
    );
  }

  const clanless = !data.info.tribe;
  const tribe = W5_TRIBE_BY_ID.get(data.info.tribe);
  const auspice = W5_AUSPICE_BY_ID.get(data.info.auspice);
  const healthMax = w5HealthMax(data);
  const wpMax = w5WillpowerMax(data);
  const rank = w5Rank(data.trackers.glory, data.trackers.honor, data.trackers.wisdom);
  const renownTotal = data.trackers.glory + data.trackers.honor + data.trackers.wisdom;
  const attrTotal = Object.values(data.attributes).reduce((s, v) => s + v, 0);

  const copySummary = async () => {
    const lines: string[] = [];
    lines.push(`🐺 ${data.info.name}`);
    if (tribe || auspice) lines.push(`${tribe?.name || "племя не выбрано"} · ${auspice?.name || "ауспиция не выбрана"}${data.info.breed ? ` · ${W5_BREEDS.find((b) => b.id === data.info.breed)?.name}` : ""}`);
    lines.push(`Концепция: ${data.info.concept || "—"}`);
    lines.push(`Ярость ${data.trackers.rage}/5 · Здоровье ${data.trackers.healthSup + data.trackers.healthAgg}/${healthMax} · Воля ${data.trackers.wpSup}/${wpMax}`);
    lines.push(`Слава: Гордец ${data.trackers.glory} · Честь ${data.trackers.honor} · Мудрость ${data.trackers.wisdom} — ${rank.title}`);
    if (data.gifts.length) lines.push(`Дары: ${data.gifts.map((g) => `${g.name} (${g.level})`).join(", ")}`);
    if (data.rites.length) lines.push(`Обряды: ${data.rites.map((r) => `${r.name} (${r.level})`).join(", ")}`);
    if (data.aspirations.length) lines.push(`Стремления: ${data.aspirations.map((a) => a.text).filter(Boolean).join(" | ")}`);
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      toast.success("Сводка Гароу в буфере");
    } catch {
      toast.error("Браузер не отдал буфер — скопируй вручную");
    }
  };

  const attrPairs: { key: keyof W5SheetData["attributes"]; label: string }[] = [
    { key: "str", label: "Сила" }, { key: "dex", label: "Ловкость" }, { key: "sta", label: "Стойкость" },
    { key: "cha", label: "Обаяние" }, { key: "man", label: "Манипуляция" }, { key: "com", label: "Самообладание" },
    { key: "int", label: "Интеллект" }, { key: "wit", label: "Смекалка" }, { key: "res", label: "Упорство" },
  ];

  return (
    <main className="relative z-10 min-h-screen vtm-root" aria-label="Лист Гароу (W5)">
      <div className="max-w-[96rem] mx-auto px-3 md:px-6 py-6 md:py-8 space-y-4">
        {/* Шапка листа */}
        <motion.header initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="vtm-panel p-3 md:p-4 flex flex-wrap items-center gap-3">
            <button className="vtm-btn vtm-btn-ghost !px-2.5" onClick={back} aria-label="В архив">←</button>
            <span className="vtm-stamp vtm-w5-stamp">🐺 Гароу</span>
            <input
              className="vtm-input !bg-transparent !border-0 !px-0 vtm-display !text-xl md:!text-2xl flex-1 min-w-[200px]"
              value={data.info.name}
              onChange={(e) => mutate((d) => { d.info.name = e.target.value.slice(0, 80); })}
              placeholder="Имя Гароу"
              aria-label="Имя Гароу"
            />
            <span className="vtm-hint !text-[0.75rem]">
              {tribe ? tribe.name : "племя не выбрано"} · {auspice ? auspice.name : "ауспиция не выбрана"}
            </span>
            <span
              className={`vtm-label text-[0.68rem] uppercase tracking-[0.15em] ${status === "saved" ? "text-[#9fd8b3]" : status === "error" ? "text-[#e8636b]" : "text-[#9c8072]"}`}
              role="status"
            >
              {status === "saving" ? "Запись…" : status === "saved" ? "Записано" : status === "error" ? "Сбой" : ""}
            </span>
            <button className="vtm-btn vtm-btn-ghost !py-1.5 !px-3 text-xs" onClick={copySummary}>⧉ Копия</button>
            <button
              className="vtm-btn vtm-btn-ghost !py-1.5 !px-3 text-xs"
              onClick={() => {
                if (confirm(`Предать «${data.info.name}» земле? Лист будет удалён.`)) {
                  vtmFetch(`/api/vtm/sheets/${sheetId}`, { method: "DELETE" })
                    .then(async (r) => {
                      if (!r.ok) throw new Error("Ошибка");
                      toast.success("Волк предан земле");
                      back();
                    })
                    .catch((e) => toast.error(e.message));
                }
              }}
              aria-label="Удалить лист Гароу"
            >
              В ЗЕМЛЮ
            </button>
          </div>

          {/* Витальная строка */}
          <div className="vtm-panel vtm-w5-vitals p-2.5 md:p-3 flex flex-wrap items-center gap-x-5 gap-y-1.5">
            <span className="vtm-hint !text-[0.78rem]">Ярость <b className="text-[#e8636b] not-italic">{data.trackers.rage}</b>/5</span>
            <span className="vtm-hint !text-[0.78rem]">Здоровье <b className="text-[#d9c7b6] not-italic">{data.trackers.healthSup + data.trackers.healthAgg}/{healthMax}</b></span>
            <span className="vtm-hint !text-[0.78rem]">Воля <b className="text-[#d9c7b6] not-italic">{data.trackers.wpSup}/{wpMax}</b></span>
            <span className="vtm-hint !text-[0.78rem]">Слава <b className="text-[#c9d3e8] not-italic">{renownTotal}</b> — {rank.title}</span>
            {data.trackers.wolfLost && <span className="vtm-label text-[0.68rem] text-[#e8636b] uppercase">волк потерян</span>}
            {data.trackers.harano && <span className="vtm-label text-[0.68rem] text-[#8ea6c9] uppercase">харано</span>}
          </div>
        </motion.header>

        {/* Вкладки */}
        <nav className="vtm-panel !rounded-md overflow-hidden" aria-label="Разделы листа Гароу">
          <div className="flex overflow-x-auto vtm-scroll" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`shrink-0 vtm-btn !border-0 !rounded-none !py-2.5 !px-4 !text-[0.82rem] ${tab === t.id ? "vtm-w5-tab-active" : "vtm-btn-ghost"}`}
              >
                <span aria-hidden>{t.icon}</span> {t.label}
              </button>
            ))}
          </div>
        </nav>

        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          {tab === "identity" && (
            <W5IdentityTab data={data} mutate={mutate} />
          )}
          {tab === "nature" && (
            <W5NatureTab data={data} mutate={mutate} attrPairs={attrPairs} attrTotal={attrTotal} />
          )}
          {tab === "skills" && (
            <W5SkillsTab data={data} mutate={mutate} attrPairs={attrPairs} />
          )}
          {tab === "gifts" && (
            <W5GiftsTab data={data} mutate={mutate} />
          )}
          {tab === "tracks" && (
            <W5TracksTab data={data} mutate={mutate} healthMax={healthMax} wpMax={wpMax} />
          )}
          {tab === "gear" && (
            <W5GearTab data={data} mutate={mutate} />
          )}
          {tab === "notes" && (
            <W5NotesTab data={data} mutate={mutate} />
          )}
          {tab === "codex" && (
            <W5CodexTab />
          )}
        </motion.div>

        {clanless && (
          <p className="vtm-hint text-center !text-[0.75rem] pb-4">
            Племя не выбрано — выбери его во вкладке «Личность»: племя задаёт Славу и племенные Дары.
          </p>
        )}

        <footer className="pt-4 pb-8 text-center space-y-3">
          <VtmReturnPortal className="vtm-btn mx-auto">← Вернуться в мир «За гранью тьмы»</VtmReturnPortal>
          <p className="vtm-label text-[0.72rem] tracking-[0.3em] uppercase text-[#4a3230]">The wheel will turn as it must</p>
        </footer>
      </div>

      {/* Конфликт версий */}
      {conflict && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)" }} role="alertdialog" aria-label="Конфликт версий листа">
          <div className="vtm-panel p-6 max-w-md w-full space-y-4">
            <h2 className="vtm-display text-lg text-[#e8636b]">Лист изменён в другом окне</h2>
            <p className="vtm-hint !text-[0.82rem]">
              Серверная копия свежее твоей ({new Date(conflict.serverUpdatedAt).toLocaleString("ru-RU")}). Чья правда?
            </p>
            <div className="flex gap-2 flex-wrap">
              <button
                className="vtm-btn flex-1"
                onClick={() => {
                  setData(conflict.serverData);
                  syncedAtRef.current = conflict.serverUpdatedAt;
                  setConflict(null);
                  setStatus("saved");
                }}
              >
                Взять серверную
              </button>
              <button
                className="vtm-btn vtm-btn-blood flex-1"
                onClick={async () => {
                  const c = conflict;
                  setConflict(null);
                  inFlightRef.current = true;
                  try {
                    await doSave(data, data.info.name || "Безымянный Гароу", true);
                    setStatus("saved");
                  } catch (e) {
                    setStatus("error");
                    toast.error(e instanceof Error ? e.message : "Ошибка");
                  } finally {
                    inFlightRef.current = false;
                    void c;
                  }
                }}
              >
                Перезаписать своей
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// ============================================================
// Вкладка ЛИЧНОСТЬ
// ============================================================

function W5IdentityTab({ data, mutate }: { data: W5SheetData; mutate: (fn: (d: W5SheetData) => void) => void }) {
  const tribe = W5_TRIBE_BY_ID.get(data.info.tribe);
  const auspice = W5_AUSPICE_BY_ID.get(data.info.auspice);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <section className="vtm-panel" aria-label="Личность Гароу">
        <div className="vtm-panel-head"><span className="vtm-label text-[0.81rem] text-[#c9d3e8]">Кто ты в Лунном народе</span></div>
        <div className="p-3 md:p-4 space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="vtm-label text-[0.68rem] uppercase text-[#9c8072]">Концепция</span>
              <input className="vtm-input !py-1.5" value={data.info.concept} onChange={(e) => mutate((d) => { d.info.concept = e.target.value.slice(0, 120); })} placeholder="вышибла ночного клуба" aria-label="Концепция" />
            </label>
            <label className="block">
              <span className="vtm-label text-[0.68rem] uppercase text-[#9c8072]">Возраст</span>
              <input className="vtm-input !py-1.5" value={data.info.age} onChange={(e) => mutate((d) => { d.info.age = e.target.value.slice(0, 40); })} placeholder="23" aria-label="Возраст" />
            </label>
          </div>
          <label className="block">
            <span className="vtm-label text-[0.68rem] uppercase text-[#9c8072]">Племя</span>
            <select className="vtm-input" value={data.info.tribe} onChange={(e) => mutate((d) => { d.info.tribe = e.target.value; })} aria-label="Племя">
              <option value="">— не выбрано —</option>
              {!W5_TRIBES.some((t) => t.wayward && t.id === data.info.tribe) && <optgroup label="Народ Гароу">{W5_TRIBES.filter((t) => !t.wayward).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</optgroup>}
              <optgroup label="Выпавшие из народа">{W5_TRIBES.filter((t) => t.wayward).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</optgroup>
            </select>
            {tribe && <span className="vtm-hint !text-[0.75rem] block mt-1">{tribe.short}</span>}
          </label>
          <label className="block">
            <span className="vtm-label text-[0.68rem] uppercase text-[#9c8072]">Ауспиция (фаза луны Первой Смены)</span>
            <select className="vtm-input" value={data.info.auspice} onChange={(e) => mutate((d) => { d.info.auspice = e.target.value; })} aria-label="Ауспиция">
              <option value="">— не выбрано —</option>
              {W5_AUSPICES.map((a) => <option key={a.id} value={a.id}>{a.moon} — {a.name}</option>)}
            </select>
            {auspice && <span className="vtm-hint !text-[0.75rem] block mt-1">{auspice.role}</span>}
          </label>
          <label className="block">
            <span className="vtm-label text-[0.68rem] uppercase text-[#9c8072]">Порода</span>
            <select className="vtm-input" value={data.info.breed} onChange={(e) => mutate((d) => { d.info.breed = e.target.value; })} aria-label="Порода">
              <option value="">— не выбрано —</option>
              {W5_BREEDS.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            {data.info.breed && <span className="vtm-hint !text-[0.75rem] block mt-1">{W5_BREEDS.find((b) => b.id === data.info.breed)?.note}</span>}
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="vtm-label text-[0.68rem] uppercase text-[#9c8072]">Стая</span>
              <input className="vtm-input !py-1.5" value={data.info.pack} onChange={(e) => mutate((d) => { d.info.pack = e.target.value.slice(0, 120); })} placeholder="«Лунный Крюк»" aria-label="Стая" />
            </label>
            <label className="block">
              <span className="vtm-label text-[0.68rem] uppercase text-[#9c8072]">Тотем стаи</span>
              <input className="vtm-input !py-1.5" value={data.info.totem} onChange={(e) => mutate((d) => { d.info.totem = e.target.value.slice(0, 120); })} placeholder="дух совы Гнили?" aria-label="Тотем стаи" />
            </label>
          </div>
          <label className="block">
            <span className="vtm-label text-[0.68rem] uppercase text-[#9c8072]">Хроника</span>
            <input className="vtm-input !py-1.5" value={data.info.chronicle} onChange={(e) => mutate((d) => { d.info.chronicle = e.target.value.slice(0, 120); })} placeholder="название вашей хроники" aria-label="Хроника" />
          </label>
          <label className="block">
            <span className="vtm-label text-[0.68rem] uppercase text-[#9c8072]">Цитата</span>
            <textarea className="vtm-input min-h-[56px]" value={data.info.quote} onChange={(e) => mutate((d) => { d.info.quote = e.target.value.slice(0, 300); })} placeholder="«Когда завою — услышат все»" aria-label="Цитата" />
          </label>
        </div>
      </section>

      <div className="space-y-4">
        <section className="vtm-panel" aria-label="Стремления">
          <div className="vtm-panel-head">
            <span className="vtm-label text-[0.81rem] text-[#c9d3e8]">Стремления</span>
            <span className="vtm-hint !text-[0.7rem] ml-auto">до 3 · опыт идёт через их исполнение</span>
          </div>
          <div className="p-3 space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="vtm-label text-[0.7rem] text-[#8ea6c9] w-5 shrink-0">{i + 1}</span>
                <input
                  className="vtm-input !py-1.5"
                  value={data.aspirations[i]?.text || ""}
                  onChange={(e) => mutate((d) => {
                    const list = [...d.aspirations];
                    if (list[i]) list[i] = { ...list[i], text: e.target.value.slice(0, 200) };
                    else list[i] = { id: `asp-${Date.now().toString(36)}-${i}`, text: e.target.value.slice(0, 200) };
                    d.aspirations = list.filter((x) => x.text);
                  })}
                  placeholder={["отмстить за сожжённую рощу", "защитить сестру-кинфолк", "доказать стае, что город можно спасти"][i]}
                  aria-label={`Стремление ${i + 1}`}
                />
              </div>
            ))}
          </div>
        </section>

        <section className="vtm-panel" aria-label="Касания">
          <div className="vtm-panel-head">
            <span className="vtm-label text-[0.81rem] text-[#c9d3e8]">Касания</span>
            <span className="vtm-hint !text-[0.7rem] ml-auto">до 3 · опоры, что держат тебя людьми</span>
          </div>
          <div className="p-3 space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="vtm-label text-[0.7rem] text-[#8ea6c9] w-5 shrink-0">{i + 1}</span>
                <input
                  className="vtm-input !py-1.5"
                  value={data.touchstones[i]?.text || ""}
                  onChange={(e) => mutate((d) => {
                    const list = [...d.touchstones];
                    if (list[i]) list[i] = { ...list[i], text: e.target.value.slice(0, 200) };
                    else list[i] = { id: `tst-${Date.now().toString(36)}-${i}`, text: e.target.value.slice(0, 200) };
                    d.touchstones = list.filter((x) => x.text);
                  })}
                  placeholder={["младшая сестра", "старый учитель в лесу", "бар на окраине"][i]}
                  aria-label={`Касание ${i + 1}`}
                />
              </div>
            ))}
          </div>
        </section>

        <section className="vtm-panel" aria-label="Пять обликов — памятка">
          <div className="vtm-panel-head"><span className="vtm-label text-[0.81rem] text-[#c9d3e8]">Пять обликов</span></div>
          <div className="p-3 space-y-1.5">
            {W5_FORMS.map((f) => (
              <p key={f.id} className="vtm-hint !text-[0.79rem]">
                <b className="text-[#c9d3e8] not-italic">{f.name} ({f.ru}):</b> {f.note}
              </p>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

// ============================================================
// Вкладка ХАРАКТЕРИСТИКИ
// ============================================================

function W5NatureTab({
  data,
  mutate,
  attrPairs,
  attrTotal,
}: {
  data: W5SheetData;
  mutate: (fn: (d: W5SheetData) => void) => void;
  attrPairs: { key: keyof W5SheetData["attributes"]; label: string }[];
  attrTotal: number;
}) {
  const delta = attrTotal - 22;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <section className="vtm-panel" aria-label="Характеристики Гароу">
        <div className="vtm-panel-head">
          <span className="vtm-label text-[0.81rem] text-[#c9d3e8]">Девять лун</span>
          <span className={`vtm-hint !text-[0.72rem] ml-auto ${delta === 0 ? "!text-[#9fd8b3]" : delta > 0 ? "!text-[#e8636b]" : "!text-[#d6a840]"}`}>
            бюджет 22: {attrTotal}/22 {delta === 0 ? "✓" : delta > 0 ? `перебор +${delta}` : `остаток ${-delta}`}
          </span>
        </div>
        <div className="p-3 md:p-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {attrPairs.map(({ key, label }) => (
            <div key={key} className="vtm-frame rounded-md p-2.5 flex flex-col items-center gap-2" style={{ background: "rgba(0,0,0,0.2)" }}>
              <span className="vtm-label text-[0.72rem] text-[#c4ac9d]">{label}</span>
              <Dots value={data.attributes[key]} color="moon" onChange={(n) => mutate((d) => { d.attributes[key] = n; })} ariaLabel={`${label}: уровень ${data.attributes[key]}`} />
            </div>
          ))}
        </div>
        <p className="vtm-hint !text-[0.75rem] px-4 pb-3">
          Распределение по правилам: одна 4, три по 3, четыре по 2, одна 1. Смена облика требует проверки Ярости.
        </p>
      </section>

      <section className="vtm-panel" aria-label="Как работает Ярость">
        <div className="vtm-panel-head"><span className="vtm-label text-[0.81rem] text-[#c9d3e8]">Как работает Ярость (W5)</span></div>
        <div className="p-3 md:p-4 space-y-2">
          {[
            "Ярость 0–5: даёт кости ярости в пулы и питает смену облика, регенерацию и Дары.",
            "Проверка Ярости — бросок одной кости: провал снижает Ярость на 1.",
            "Ярость 0 — волк потерян: шкура не меняется, вернуть Ярость можно воем на луну.",
            "Безумие живёт в Криносе: каждый ход безубийства стоит 1 Воли; сдался — Ярость 5, Дары закрыты, волк потерян по выходе.",
            "Регенерация: проверка Ярости заживляет поверхностную рану; тяжёлые — дольше и дороже.",
          ].map((line, i) => (
            <p key={i} className="vtm-hint !text-[0.8rem] flex gap-2">
              <span className="text-[#8ea6c9] not-italic shrink-0" aria-hidden>☾</span>{line}
            </p>
          ))}
        </div>
      </section>
    </div>
  );
}

// ============================================================
// Вкладка НАВЫКИ
// ============================================================

const GROUP_LABELS: Record<string, string> = { physical: "Физические", social: "Социальные", mental: "Ментальные" };

function W5SkillsTab({
  data,
  mutate,
  attrPairs,
}: {
  data: W5SheetData;
  mutate: (fn: (d: W5SheetData) => void) => void;
  attrPairs: { key: keyof W5SheetData["attributes"]; label: string }[];
}) {
  const skillValue = (id: string) => data.skills.find((s) => s.id === id);
  const setSkill = (id: string, patch: Partial<{ value: number; spec: string }>) => {
    mutate((d) => {
      const existing = d.skills.find((s) => s.id === id);
      if (existing) Object.assign(existing, patch);
      else d.skills.push({ id, value: 0, spec: "", ...patch });
    });
  };
  // Пара по умолчанию для проверки (упрощённо: ментальные от Интеллекта и т.д.)
  const defaultAttr: Record<string, string> = { physical: "ЛОВ", social: "ОБА", mental: "ИНТ" };
  const attrShort: Record<string, string> = { Сила: "СИЛ", Ловкость: "ЛОВ", Стойкость: "СТО", Обаяние: "ОБА", Манипуляция: "МАН", Самообладание: "САМ", Интеллект: "ИНТ", Смекалка: "СМК", Упорство: "УПР" };

  const groups: ("physical" | "social" | "mental")[] = ["physical", "social", "mental"];
  return (
    <div className="space-y-4">
      <p className="vtm-hint !text-[0.78rem] vtm-panel p-3">
        Клик по точке — уровень (0–5). Пара для проверки подписана чипом: характеристика + навык, успех на 6+. Специализация появляется с уровнем 1+.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {groups.map((g) => (
          <section key={g} className="vtm-panel" aria-label={`Навыки: ${GROUP_LABELS[g]}`}>
            <div className="vtm-panel-head"><span className="vtm-label text-[0.8rem] text-[#c9d3e8]">{GROUP_LABELS[g]}</span></div>
            <div className="p-3 space-y-1.5 max-h-[560px] overflow-y-auto overflow-x-hidden vtm-scroll">
              {SKILL_LIBRARY.filter((s) => s.group === g).map((s) => {
                const st = skillValue(s.id);
                const value = st?.value || 0;
                return (
                  <div key={s.id} className="vtm-w5-skill-row">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="vtm-label text-[0.84rem] text-[#d9c7b6] flex-1 min-w-[100px]" title={s.hint}>{s.name}</span>
                      <span className="vtm-hint !text-[0.64rem] not-italic text-[#8ea6c9]">{defaultAttr[g]}</span>
                      <Dots value={value} color="moon" onChange={(n) => setSkill(s.id, { value: n })} ariaLabel={`${s.name}: уровень ${value}`} />
                    </div>
                    {value > 0 && (
                      <input
                        className="vtm-input !py-0.5 !text-[0.78rem] mt-1"
                        value={st?.spec || ""}
                        onChange={(e) => setSkill(s.id, { spec: e.target.value.slice(0, 80) })}
                        placeholder={`специализация: ${s.specExamples.slice(0, 2).join(", ")}`}
                        aria-label={`Специализация ${s.name}`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      <p className="vtm-hint !text-[0.72rem] text-center">
        Пулы по умолчанию: физика — Ловкость {attrShort["Ловкость"] ? "" : ""}или Сила, социалка — Обаяние или Манипуляция, ментал — Интеллект или Смекалка. Точную пару на проверку называет Рассказчик.
      </p>
    </div>
  );
}

// ============================================================
// Вкладка ДАРЫ И ОБРЯДЫ
// ============================================================

function W5GiftsTab({ data, mutate }: { data: W5SheetData; mutate: (fn: (d: W5SheetData) => void) => void }) {
  const [source, setSource] = useState<"all" | "native" | "moon" | "tribe">("all");
  const [query, setQuery] = useState("");
  const [customGiftName, setCustomGiftName] = useState("");
  const [customGiftLvl, setCustomGiftLvl] = useState(1);
  const [customRiteName, setCustomRiteName] = useState("");
  const [customRiteLvl, setCustomRiteLvl] = useState(1);
  const q = query.trim().toLowerCase();

  const auspiceId = data.info.auspice;
  const tribeId = data.info.tribe;

  const pool = W5_GIFT_LIBRARY.filter((g) => {
    if (source === "native" && g.source !== "native") return false;
    if (source === "moon" && !g.source.startsWith("moon:")) return false;
    if (source === "tribe" && !g.source.startsWith("tribe:")) return false;
    if (!q) return true;
    return `${g.name} ${g.desc}`.toLowerCase().includes(q);
  }).filter((g) => {
    // при выборе «Луна»/«Племя» показываем свою ауспицию/племя, если выбраны
    if (source === "moon" && auspiceId) return g.source === `moon:${auspiceId}`;
    if (source === "tribe" && tribeId) return g.source === `tribe:${tribeId}`;
    return true;
  });

  const sourceLabel = (src: string) => {
    if (src === "native") return "общий";
    if (src.startsWith("moon:")) return `луна: ${W5_AUSPICE_BY_ID.get(src.slice(5))?.name || ""}`;
    if (src.startsWith("tribe:")) return `племя: ${W5_TRIBE_BY_ID.get(src.slice(6))?.name || ""}`;
    return src;
  };

  const hasGift = (id: string) => data.gifts.some((g) => g.id.startsWith("g-lib-") && g.id.includes(id));

  const addGift = (defId: string) => {
    const def = W5_GIFT_LIBRARY.find((g) => g.id === defId);
    if (!def) return;
    if (data.gifts.some((g) => g.name === def.name)) {
      toast.error("Этот Дар уже на листе");
      return;
    }
    mutate((d) => {
      d.gifts.push({ id: `g-lib-${Date.now().toString(36)}-${def.id}`, name: def.name, level: def.level, note: def.desc });
    });
    toast(`Дар «${def.name}» вырван у духов`);
  };

  const addCustomGift = () => {
    const name = customGiftName.trim();
    if (!name) return;
    if (data.gifts.some((g) => g.name.toLowerCase() === name.toLowerCase())) {
      toast.error("Такой Дар уже есть");
      return;
    }
    mutate((d) => {
      d.gifts.push({ id: `g-custom-${Date.now().toString(36)}`, name, level: Math.max(1, Math.min(5, customGiftLvl)), note: "" });
    });
    setCustomGiftName("");
    setCustomGiftLvl(1);
  };

  const addRite = (defId: string) => {
    const def = W5_RITE_LIBRARY.find((r) => r.id === defId);
    if (!def) return;
    if (data.rites.some((r) => r.name === def.name)) {
      toast.error("Этот Обряд уже на листе");
      return;
    }
    mutate((d) => {
      d.rites.push({ id: `r-lib-${Date.now().toString(36)}-${def.id}`, name: def.name, level: def.level, note: def.desc });
    });
  };

  return (
    <div className="space-y-4">
      {/* Мои дары */}
      <section className="vtm-panel" aria-label="Дары на листе">
        <div className="vtm-panel-head">
          <span className="vtm-label text-[0.81rem] text-[#c9d3e8]">Мои Дары</span>
          <span className="vtm-hint !text-[0.72rem] ml-auto">{data.gifts.length} даров</span>
        </div>
        <div className="p-3 space-y-2 max-h-[420px] overflow-y-auto overflow-x-hidden vtm-scroll">
          {data.gifts.length === 0 && (
            <p className="vtm-hint text-center py-3">Духов ещё не задобрил. Возьми из каталога ниже — или впиши свой.</p>
          )}
          {data.gifts.map((g) => (
            <div key={g.id} className="vtm-frame rounded-md p-2.5 space-y-1.5" style={{ background: "rgba(0,0,0,0.22)" }}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="vtm-label text-[0.66rem] text-[#8ea6c9] shrink-0">{g.level} ур.</span>
                <span className="text-[0.9rem] text-[#d9c7b6] flex-1 min-w-[120px]">{g.name}</span>
                <Dots value={g.level} max={5} color="moon" onChange={(n) => mutate((d) => { const x = d.gifts.find((y) => y.id === g.id); if (x) x.level = n; })} ariaLabel={`${g.name}: уровень ${g.level}`} />
                <button className="vtm-btn vtm-btn-ghost !p-1 !text-[0.72rem] vtm-confirm-del" onClick={() => mutate((d) => { d.gifts = d.gifts.filter((y) => y.id !== g.id); })} aria-label={`Убрать дар ${g.name}`}>✕</button>
              </div>
              <input
                className="vtm-input !py-1 !text-[0.8rem]"
                value={g.note}
                onChange={(e) => mutate((d) => { const x = d.gifts.find((y) => y.id === g.id); if (x) x.note = e.target.value.slice(0, 400); })}
                placeholder="как работает / у кого выучен"
                aria-label={`Заметка к дару ${g.name}`}
              />
            </div>
          ))}
        </div>
        <div className="p-3 border-t border-[#2b1116] flex gap-2 flex-wrap items-center">
          <input
            className="vtm-input flex-1 min-w-[160px]"
            value={customGiftName}
            onChange={(e) => setCustomGiftName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCustomGift()}
            placeholder="свой дар: Например, «Шёпот камней»"
            aria-label="Название своего дара"
          />
          <span className="vtm-hint !text-[0.7rem] flex items-center gap-1.5">
            ур.:
            <Dots value={customGiftLvl} color="moon" onChange={setCustomGiftLvl} ariaLabel="Уровень своего дара" />
          </span>
          <button className="vtm-btn shrink-0" onClick={addCustomGift} disabled={!customGiftName.trim()}>+ Дар</button>
        </div>
      </section>

      {/* Каталог даров */}
      <section className="vtm-panel" aria-label="Каталог даров">
        <div className="vtm-panel-head flex-wrap">
          <span className="vtm-label text-[0.81rem] text-[#c9d3e8]">Каталог Даров</span>
          <div className="flex flex-wrap gap-1 ml-auto">
            {([
              { id: "all", label: "Все" },
              { id: "native", label: "Общие" },
              { id: "moon", label: "Луна" },
              { id: "tribe", label: "Племя" },
            ] as const).map((s) => (
              <button key={s.id} className={`vtm-btn !py-1 !px-2 !text-[0.72rem] ${source === s.id ? "vtm-w5-tab-active" : "vtm-btn-ghost"}`} onClick={() => setSource(s.id)} aria-pressed={source === s.id}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div className="p-3 space-y-2 max-h-[460px] overflow-y-auto overflow-x-hidden vtm-scroll">
          <input
            className="vtm-input !py-1.5 !text-[0.86rem]"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="поиск: клыки, дух, тень…"
            aria-label="Поиск по каталогу даров"
          />
          {pool.map((g) => {
            const taken = hasGift(g.id) || data.gifts.some((x) => x.name === g.name);
            return (
              <div key={g.id} className={`vtm-disc-cat ${taken ? "taken" : ""}`}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="vtm-label text-[0.66rem] text-[#8ea6c9] shrink-0">{g.level} ур.</span>
                  <span className="vtm-label text-[0.8rem] flex-1 min-w-[120px]">{g.name}</span>
                  <span className="vtm-hint !text-[0.64rem] not-italic">{sourceLabel(g.source)}</span>
                  {taken ? (
                    <span className="vtm-stamp !text-[0.62rem] !py-0.5 shrink-0">на листе</span>
                  ) : (
                    <button className="vtm-btn !py-1 !px-2.5 !text-[0.74rem] shrink-0" onClick={() => addGift(g.id)} aria-label={`Взять дар ${g.name}`}>+ взять</button>
                  )}
                </div>
                <p className="vtm-hint !text-[0.75rem] leading-relaxed">{g.desc}</p>
              </div>
            );
          })}
          {pool.length === 0 && (
            <p className="vtm-hint text-center py-3">
              {source === "moon" && !auspiceId ? "Выбери ауспицию на вкладке «Личность» — лунные Дары придут с ней." :
               source === "tribe" && !tribeId ? "Выбери племя — племенные Дары идут с ним." :
               "Духи молчат по этому запросу."}
            </p>
          )}
        </div>
      </section>

      {/* Обряды */}
      <section className="vtm-panel" aria-label="Обряды">
        <div className="vtm-panel-head">
          <span className="vtm-label text-[0.81rem] text-[#c9d3e8]">Обряды</span>
          <span className="vtm-hint !text-[0.72rem] ml-auto">{data.rites.length} обрядов</span>
        </div>
        <div className="p-3 space-y-2">
          {data.rites.length === 0 && <p className="vtm-hint text-center py-1">Обрядов нет. Без них даже в Умбре не сходить.</p>}
          {data.rites.map((r) => (
            <div key={r.id} className="vtm-frame rounded-md p-2.5 space-y-1.5" style={{ background: "rgba(0,0,0,0.22)" }}>
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  className="vtm-input !py-1 !text-[0.84rem] flex-1 min-w-[140px]"
                  value={r.name}
                  onChange={(e) => mutate((d) => { const x = d.rites.find((y) => y.id === r.id); if (x) x.name = e.target.value.slice(0, 80); })}
                  aria-label={`Название обряда ${r.name}`}
                />
                <span className="vtm-hint !text-[0.7rem] flex items-center gap-1.5">
                  ур.:
                  <Dots value={r.level} max={4} color="moon" onChange={(n) => mutate((d) => { const x = d.rites.find((y) => y.id === r.id); if (x) x.level = n; })} ariaLabel={`Уровень обряда ${r.name}`} />
                </span>
                <button className="vtm-btn vtm-btn-ghost !p-1 !text-[0.72rem] vtm-confirm-del" onClick={() => mutate((d) => { d.rites = d.rites.filter((y) => y.id !== r.id); })} aria-label={`Убрать обряд ${r.name}`}>✕</button>
              </div>
              <input
                className="vtm-input !py-1 !text-[0.8rem]"
                value={r.note}
                onChange={(e) => mutate((d) => { const x = d.rites.find((y) => y.id === r.id); if (x) x.note = e.target.value.slice(0, 400); })}
                placeholder="что нужно для обряда / кто научил"
                aria-label={`Заметка к обряду ${r.name}`}
              />
            </div>
          ))}
          {/* Каталог обрядов — компактно */}
          <div className="flex gap-1.5 flex-wrap pt-1">
            {W5_RITE_LIBRARY.map((r) => {
              const taken = data.rites.some((x) => x.name === r.name);
              return (
                <button
                  key={r.id}
                  className={`vtm-btn !py-1 !px-2 !text-[0.7rem] ${taken ? "vtm-w5-tab-active" : "vtm-btn-ghost"}`}
                  onClick={() => !taken && addRite(r.id)}
                  disabled={taken}
                  title={`${r.level} ур. — ${r.desc}`}
                >
                  {taken ? "✓ " : "+ "}{r.name}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2 flex-wrap items-center pt-1">
            <input
              className="vtm-input flex-1 min-w-[160px]"
              value={customRiteName}
              onChange={(e) => setCustomRiteName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && customRiteName.trim()) {
                  mutate((d) => { d.rites.push({ id: `r-custom-${Date.now().toString(36)}`, name: customRiteName.trim(), level: customRiteLvl, note: "" }); });
                  setCustomRiteName("");
                  setCustomRiteLvl(1);
                }
              }}
              placeholder="свой обряд — впиши название"
              aria-label="Название своего обряда"
            />
            <span className="vtm-hint !text-[0.7rem] flex items-center gap-1.5">
              ур.:
              <Dots value={customRiteLvl} max={4} color="moon" onChange={setCustomRiteLvl} ariaLabel="Уровень своего обряда" />
            </span>
            <button
              className="vtm-btn shrink-0"
              disabled={!customRiteName.trim()}
              onClick={() => {
                mutate((d) => { d.rites.push({ id: `r-custom-${Date.now().toString(36)}`, name: customRiteName.trim(), level: customRiteLvl, note: "" }); });
                setCustomRiteName("");
                setCustomRiteLvl(1);
              }}
            >
              + Обряд
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

// ============================================================
// Вкладка ТРЕКИ
// ============================================================

function W5TracksTab({
  data,
  mutate,
  healthMax,
  wpMax,
}: {
  data: W5SheetData;
  mutate: (fn: (d: W5SheetData) => void) => void;
  healthMax: number;
  wpMax: number;
}) {
  const rank = w5Rank(data.trackers.glory, data.trackers.honor, data.trackers.wisdom);
  const renownTotal = data.trackers.glory + data.trackers.honor + data.trackers.wisdom;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <section className="vtm-panel" aria-label="Тело и дух">
        <div className="vtm-panel-head"><span className="vtm-label text-[0.81rem] text-[#e8636b]">Тело и дух</span></div>
        <div className="p-3 md:p-4 space-y-3">
          <div className="vtm-frame rounded-md p-3 space-y-2" style={{ background: "rgba(0,0,0,0.22)" }}>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="vtm-label text-[0.78rem] text-[#e8636b]">Ярость</span>
              <Dots value={data.trackers.rage} color="blood" onChange={(n) => mutate((d) => {
                d.trackers.rage = n;
                if (n === 0) d.trackers.wolfLost = true;
                if (n > 0) d.trackers.wolfLost = false;
              })} ariaLabel={`Ярость: ${data.trackers.rage}`} />
              <span className="vtm-hint !text-[0.72rem]">0 — волк потерян</span>
            </div>
            <label className="flex items-center gap-2 vtm-hint !text-[0.76rem]">
              <input type="checkbox" checked={data.trackers.wolfLost} onChange={(e) => mutate((d) => { d.trackers.wolfLost = e.target.checked; })} aria-label="Волк потерян" />
              волк потерян (вернуть — выть на луну)
            </label>
            <label className="flex items-center gap-2 vtm-hint !text-[0.76rem]">
              <input type="checkbox" checked={data.trackers.harano} onChange={(e) => mutate((d) => { d.trackers.harano = e.target.checked; })} aria-label="Харано" />
              харано — лунная тоска гложет
            </label>
          </div>

          <div className="vtm-frame rounded-md p-3 space-y-2" style={{ background: "rgba(0,0,0,0.22)" }}>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="vtm-label text-[0.78rem] text-[#d9c7b6]">Здоровье</span>
              <span className="vtm-hint !text-[0.7rem]">макс {healthMax} (Стойкость + 3)</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="vtm-hint !text-[0.72rem] not-italic">поверхностные:</span>
              <HealthBoxes max={healthMax} value={data.trackers.healthSup} color="#e8636b" onChange={(n) => mutate((d) => { d.trackers.healthSup = Math.min(n, healthMax - d.trackers.healthAgg); })} ariaLabel="Поверхностный урон" />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="vtm-hint !text-[0.72rem] not-italic">тяжёлые:</span>
              <HealthBoxes max={healthMax} value={data.trackers.healthAgg} color="#8a1a1d" onChange={(n) => mutate((d) => { d.trackers.healthAgg = Math.min(n, healthMax - d.trackers.healthSup); })} ariaLabel="Тяжёлый урон" />
            </div>
          </div>

          <div className="vtm-frame rounded-md p-3 space-y-2" style={{ background: "rgba(0,0,0,0.22)" }}>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="vtm-label text-[0.78rem] text-[#d9c7b6]">Воля</span>
              <span className="vtm-hint !text-[0.7rem]">макс {wpMax} (Самообладание + Упорство)</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="vtm-hint !text-[0.72rem] not-italic">потрачено:</span>
              <HealthBoxes max={wpMax} value={data.trackers.wpSup} color="#c9d3e8" onChange={(n) => mutate((d) => { d.trackers.wpSup = n; })} ariaLabel="Потраченная воля" />
            </div>
            <p className="vtm-hint !text-[0.73rem]">Воля платит за безумие в Криносе и держит Зверя на привязи.</p>
          </div>
        </div>
      </section>

      <div className="space-y-4">
        <section className="vtm-panel" aria-label="Слава">
          <div className="vtm-panel-head">
            <span className="vtm-label text-[0.81rem] text-[#c9d3e8]">Слава</span>
            <span className="vtm-hint !text-[0.72rem] ml-auto">итого {renownTotal} — {rank.title}</span>
          </div>
          <div className="p-3 md:p-4 space-y-2.5">
            {([
              { key: "glory" as const, label: "Гордец (Glory)", hint: "подвиги, охота, боевые деяния" },
              { key: "honor" as const, label: "Честь (Honor)", hint: "слово, долг, справедливость" },
              { key: "wisdom" as const, label: "Мудрость (Wisdom)", hint: "духи, сдержанность, знание" },
            ]).map(({ key, label, hint }) => (
              <div key={key} className="vtm-frame rounded-md p-2.5 flex items-center gap-3 flex-wrap" style={{ background: "rgba(0,0,0,0.22)" }}>
                <span className="vtm-label text-[0.76rem] text-[#c9d3e8] w-36 shrink-0">{label}</span>
                <Dots value={data.trackers[key]} color="moon" onChange={(n) => mutate((d) => { d.trackers[key] = n; })} ariaLabel={`${label}: ${data.trackers[key]}`} />
                <span className="vtm-hint !text-[0.7rem] flex-1">{hint}</span>
              </div>
            ))}
            <p className="vtm-hint !text-[0.75rem]">
              Ранг растёт со Славой: 1 — Клиаит, 2 — Фостерн, 3 — Адурен, 4 — Старейшина, 5 — Старейшина вождей. Высокая Слава — и мишень тоже.
            </p>
          </div>
        </section>

        <section className="vtm-panel" aria-label="Опыт">
          <div className="vtm-panel-head"><span className="vtm-label text-[0.81rem] text-[#c9d3e8]">Опыт</span></div>
          <div className="p-3 grid grid-cols-2 gap-3">
            <label className="block">
              <span className="vtm-label text-[0.68rem] uppercase text-[#9c8072]">Свободный</span>
              <input type="number" min={0} max={999} className="vtm-input !py-1.5" value={data.trackers.xp} onChange={(e) => mutate((d) => { d.trackers.xp = Math.max(0, Math.min(999, Math.floor(Number(e.target.value) || 0))); })} aria-label="Свободный опыт" />
            </label>
            <label className="block">
              <span className="vtm-label text-[0.68rem] uppercase text-[#9c8072]">Вложено всего</span>
              <input type="number" min={0} max={999} className="vtm-input !py-1.5" value={data.trackers.xpSpent} onChange={(e) => mutate((d) => { d.trackers.xpSpent = Math.max(0, Math.min(999, Math.floor(Number(e.target.value) || 0))); })} aria-label="Вложенный опыт" />
            </label>
          </div>
        </section>
      </div>
    </div>
  );
}

// ============================================================
// Вкладка СНАРЯЖЕНИЕ
// ============================================================

function W5GearTab({ data, mutate }: { data: W5SheetData; mutate: (fn: (d: W5SheetData) => void) => void }) {
  const [name, setName] = useState("");
  const add = () => {
    const n = name.trim();
    if (!n) return;
    mutate((d) => { d.gear.push({ id: `gear-${Date.now().toString(36)}`, name: n, count: "1", note: "" }); });
    setName("");
  };
  return (
    <section className="vtm-panel max-w-3xl mx-auto w-full" aria-label="Снаряжение">
      <div className="vtm-panel-head">
        <span className="vtm-label text-[0.81rem] text-[#c9d3e8]">Снаряжение</span>
        <span className="vtm-hint !text-[0.72rem] ml-auto">{data.gear.length} позиций</span>
      </div>
      <div className="p-3 space-y-2">
        {data.gear.length === 0 && <p className="vtm-hint text-center py-2">Рюкзак пуст. Даже волки носят ножи.</p>}
        {data.gear.map((item) => (
          <div key={item.id} className="flex items-center gap-2 flex-wrap">
            <input
              className="vtm-input !py-1.5 !text-[0.86rem] flex-1 min-w-[140px]"
              value={item.name}
              onChange={(e) => mutate((d) => { const x = d.gear.find((y) => y.id === item.id); if (x) x.name = e.target.value.slice(0, 80); })}
              aria-label={`Название вещи ${item.name}`}
            />
            <input
              className="vtm-input !py-1.5 !text-[0.84rem] !w-16 text-center"
              value={item.count}
              onChange={(e) => mutate((d) => { const x = d.gear.find((y) => y.id === item.id); if (x) x.count = e.target.value.slice(0, 40); })}
              aria-label={`Количество ${item.name}`}
            />
            <input
              className="vtm-input !py-1.5 !text-[0.8rem] flex-1 min-w-[140px]"
              value={item.note}
              onChange={(e) => mutate((d) => { const x = d.gear.find((y) => y.id === item.id); if (x) x.note = e.target.value.slice(0, 200); })}
              placeholder="примечание"
              aria-label={`Примечание к ${item.name}`}
            />
            <button className="vtm-btn vtm-btn-ghost !p-1.5 !text-[0.78rem] vtm-confirm-del" onClick={() => mutate((d) => { d.gear = d.gear.filter((y) => y.id !== item.id); })} aria-label={`Выбросить ${item.name}`}>✕</button>
          </div>
        ))}
        <div className="flex gap-2 pt-1">
          <input
            className="vtm-input flex-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="что положить в рюкзак"
            aria-label="Новая вещь"
          />
          <button className="vtm-btn shrink-0" onClick={add} disabled={!name.trim()}>+ Добавить</button>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// Вкладка ЗАМЕТКИ
// ============================================================

function W5NotesTab({ data, mutate }: { data: W5SheetData; mutate: (fn: (d: W5SheetData) => void) => void }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const add = () => {
    if (!content.trim()) return;
    mutate((d) => {
      d.notes.unshift({
        id: `note-${Date.now().toString(36)}`,
        title: title.trim() || "Запись",
        content: content.trim().slice(0, 4000),
        date: new Date().toLocaleDateString("ru-RU"),
      });
    });
    setTitle("");
    setContent("");
    toast("Запись внесена в лунный дневник");
  };
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <section className="vtm-panel" aria-label="Новая запись">
        <div className="vtm-panel-head"><span className="vtm-label text-[0.81rem] text-[#c9d3e8]">Новая запись</span></div>
        <div className="p-3 space-y-2">
          <input className="vtm-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="заголовок (необязательно)" aria-label="Заголовок записи" />
          <textarea className="vtm-input min-h-[140px]" value={content} onChange={(e) => setContent(e.target.value)} placeholder="что случилось этой ночью: духи, погони, сделки…" aria-label="Текст записи" maxLength={4000} />
          <div className="flex justify-between items-center">
            <span className="vtm-hint !text-[0.7rem]">{content.length}/4000</span>
            <button className="vtm-btn" onClick={add} disabled={!content.trim()}>🖋 Записать</button>
          </div>
        </div>
      </section>
      <section className="vtm-panel" aria-label="Лунный дневник">
        <div className="vtm-panel-head">
          <span className="vtm-label text-[0.81rem] text-[#c9d3e8]">Лунный дневник</span>
          <span className="vtm-hint !text-[0.72rem] ml-auto">{data.notes.length} записей</span>
        </div>
        <div className="p-3 space-y-2 max-h-[560px] overflow-y-auto overflow-x-hidden vtm-scroll">
          {data.notes.length === 0 && <p className="vtm-hint text-center py-2">Ночь ещё ничего не написала.</p>}
          {data.notes.map((n) => (
            <div key={n.id} className="vtm-frame rounded-md p-2.5 space-y-1" style={{ background: "rgba(0,0,0,0.22)" }}>
              <div className="flex items-center gap-2">
                <span className="vtm-label text-[0.7rem] text-[#8ea6c9]">{n.date}</span>
                <span className="text-[0.86rem] text-[#d9c7b6] flex-1">{n.title}</span>
                <button className="vtm-btn vtm-btn-ghost !p-1 !text-[0.72rem] vtm-confirm-del" onClick={() => mutate((d) => { d.notes = d.notes.filter((y) => y.id !== n.id); })} aria-label={`Удалить запись ${n.title}`}>✕</button>
              </div>
              <p className="vtm-hint !text-[0.8rem] whitespace-pre-wrap">{n.content}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ============================================================
// Вкладка БАЗА ЗНАНИЙ (справочник по Гароу из кодекса)
// ============================================================

function W5CodexTab() {
  const [WerewolfCodex, setCodex] = useState<React.ComponentType<{ q: string }> | null>(null);
  useEffect(() => {
    let alive = true;
    import("@/components/vtm/vtm-codex").then((m) => {
      if (alive) setCodex(() => m.WerewolfCodex);
    });
    return () => { alive = false; };
  }, []);
  if (!WerewolfCodex) {
    return <p className="vtm-hint text-center py-8">Духи листают страницы…</p>;
  }
  return <WerewolfCodex q="" />;
}

// ============================================================
// Утилиты: точки и ячейки
// ============================================================

function Dots({
  value,
  max = 5,
  color = "moon",
  onChange,
  ariaLabel,
}: {
  value: number;
  max?: number;
  color?: "blood" | "moon";
  onChange?: (n: number) => void;
  ariaLabel?: string;
}) {
  return (
    <span className="vtm-dots" role="group" aria-label={ariaLabel}>
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          className={`vtm-dot ${color === "moon" ? "moon" : ""} ${n <= value ? "filled" : ""}`}
          onClick={() => {
            if (!onChange) return;
            if (n === value) onChange(value - 1);
            else if (n === value + 1) onChange(value + 1);
            else onChange(n);
          }}
          onContextMenu={(e) => {
            if (!onChange) return;
            e.preventDefault();
            onChange(Math.max(0, value - 1));
          }}
          disabled={!onChange}
          aria-label={`Уровень ${n}`}
        />
      ))}
    </span>
  );
}

function HealthBoxes({
  max,
  value,
  color,
  onChange,
  ariaLabel,
}: {
  max: number;
  value: number;
  color: string;
  onChange?: (n: number) => void;
  ariaLabel?: string;
}) {
  return (
    <span className="flex gap-1 flex-wrap" role="group" aria-label={ariaLabel}>
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          className="vtm-w5-box"
          style={n <= value ? { background: color, borderColor: color, boxShadow: `0 0 8px ${color}66` } : undefined}
          onClick={() => onChange?.(n === value ? value - 1 : n)}
          onContextMenu={(e) => { e.preventDefault(); onChange?.(Math.max(0, value - 1)); }}
          aria-label={`Отметка ${n} из ${max}`}
        />
      ))}
    </span>
  );
}
