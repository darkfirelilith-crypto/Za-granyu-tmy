"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { VtmSheetData, normalizeSheet, CLAN_BY_ID, SECT_BY_ID, PREDATOR_BY_ID } from "@/lib/vtm-data";
import { deriveStats } from "@/lib/vtm-calc";
import { DossierSection, AttributesSection, SkillsSection } from "@/components/vtm/vtm-sections";
import { DisciplinesSection, AdvantagesSection } from "@/components/vtm/vtm-sections2";
import { GearSection, NotesSection } from "@/components/vtm/vtm-sections3";
import { CodexSection } from "@/components/vtm/vtm-codex";
import { VtmDicePanel, setVtmSheetHooks, vtmRollAndShow } from "@/components/vtm/vtm-dice";
import { VtmReturnPortal } from "@/components/vtm/portal-transition";
import { VtmPrintSheet } from "@/components/vtm/vtm-print-sheet";
import { vtmFetch } from "@/lib/vtm-api";

type SaveStatus = "idle" | "saving" | "saved" | "error" | "conflict";

interface ConflictInfo {
  serverUpdatedAt: string;
  serverData: VtmSheetData;
}

const TABS = [
  { id: "dossier", label: "Досье" },
  { id: "attributes", label: "Характеристики" },
  { id: "skills", label: "Навыки" },
  { id: "disciplines", label: "Дисциплины" },
  { id: "advantages", label: "Преимущества" },
  { id: "gear", label: "Имущество" },
  { id: "notes", label: "Заметки" },
  { id: "codex", label: "База знаний" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function VtmEditor({ sheetId, onBack }: { sheetId: string; onBack: () => void }) {
  const qc = useQueryClient();
  const { data: raw, isLoading, isError } = useQuery<any>({
    queryKey: ["vtm-sheet", sheetId],
    queryFn: () => vtmFetch(`/api/vtm/sheets/${sheetId}`).then(async (r) => {
      if (!r.ok) throw new Error("Лист не найден");
      return r.json();
    }),
  });

  const [data, setData] = useState<VtmSheetData | null>(null);
  const [tab, setTab] = useState<TabId>("dossier");
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [conflict, setConflict] = useState<ConflictInfo | null>(null);
  // Подсказка прокрутки вкладок на узких экранах
  const tabsBarRef = useRef<HTMLDivElement>(null);
  const [tabFadeLeft, setTabFadeLeft] = useState(false);
  const [tabFadeRight, setTabFadeRight] = useState(false);
  const updateTabFades = useCallback(() => {
    const el = tabsBarRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setTabFadeLeft(el.scrollLeft > 4 && max > 0);
    setTabFadeRight(el.scrollLeft < max - 4 && max > 0);
  }, []);
  useEffect(() => {
    updateTabFades();
    window.addEventListener("resize", updateTabFades);
    const t = setTimeout(updateTabFades, 350);
    return () => {
      window.removeEventListener("resize", updateTabFades);
      clearTimeout(t);
    };
  }, [updateTabFades, tab, data]);
  const snapshotRef = useRef<string>("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusRef = useRef<SaveStatus>("idle");
  const conflictRef = useRef<ConflictInfo | null>(null);
  const syncedAtRef = useRef<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  statusRef.current = status;
  conflictRef.current = conflict;

  // Инициализация данных после загрузки
  useEffect(() => {
    if (raw && !data) {
      const normalized = normalizeSheet(raw.data);
      setData(normalized);
      snapshotRef.current = JSON.stringify(normalized);
      syncedAtRef.current = raw.updatedAt || null;
      setStatus("idle");
    }
  }, [raw, data]);

  const save = useCallback(
    async (payload: VtmSheetData, name: string, opts?: { force?: boolean }) => {
      if (conflictRef.current && !opts?.force) return;
      setStatus("saving");
      try {
        const res = await vtmFetch(`/api/vtm/sheets/${sheetId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            data: payload,
            baseUpdatedAt: syncedAtRef.current || undefined,
            force: opts?.force || undefined,
          }),
        });
        if (res.status === 409) {
          const j = await res.json().catch(() => ({}));
          if (timerRef.current) clearTimeout(timerRef.current);
          setConflict({
            serverUpdatedAt: j.serverUpdatedAt || new Date().toISOString(),
            serverData: normalizeSheet(j.serverData || {}),
          });
          setStatus("conflict");
          return;
        }
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || "Ошибка сохранения");
        }
        const saved = await res.json().catch(() => ({}));
        if (saved.updatedAt) syncedAtRef.current = saved.updatedAt;
        setStatus("saved");
        snapshotRef.current = JSON.stringify(payload);
        qc.invalidateQueries({ queryKey: ["vtm-sheets"] });
      } catch (e: any) {
        setStatus("error");
        toast.error("Кровь не приняла запись", { description: e.message });
      }
    },
    [sheetId, qc]
  );

  const resolveConflictTakeServer = () => {
    if (!conflict) return;
    const normalized = normalizeSheet(conflict.serverData);
    setData(normalized);
    snapshotRef.current = JSON.stringify(normalized);
    syncedAtRef.current = conflict.serverUpdatedAt;
    setConflict(null);
    setStatus("saved");
    toast.success("Версия из архива загружена", { description: "Твои несохранённые правки рассеялись в тумане." });
  };

  const resolveConflictForce = () => {
    if (!conflict || !data) return;
    syncedAtRef.current = conflict.serverUpdatedAt;
    const name = data.info.name || "Безымянный Сородич";
    setConflict(null);
    save(data, name, { force: true });
  };

  // Автосохранение с дебаунсом
  const scheduleSave = useCallback(
    (next: VtmSheetData) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        save(next, next.info.name || "Безымянный Сородич");
      }, 900);
    },
    [save]
  );

  const mutate = useCallback(
    (fn: (draft: VtmSheetData) => void) => {
      setData((prev) => {
        if (!prev) return prev;
        const next = structuredClone(prev);
        fn(next);
        scheduleSave(next);
        return next;
      });
    },
    [scheduleSave]
  );

  // Хуки для панели костей: журнал бросков и Голод
  useEffect(() => {
    setVtmSheetHooks({
      logRoll: (text) => mutate((d) => { d.rollLog = [{ id: `roll-${Date.now().toString(36)}`, text, ts: new Date().toISOString() }, ...d.rollLog].slice(0, 60); }),
      addHunger: (n = 1) => mutate((d) => { d.trackers.hunger = Math.min(5, d.trackers.hunger + n); }),
      spendWillpower: () => {
        if (!data) return false;
        const d = deriveStats(data);
        const used = data.trackers.wpSup + data.trackers.wpAgg;
        if (used >= d.wpMax) return false;
        mutate((draft) => { draft.trackers.wpSup = Math.min(draft.trackers.wpSup + 1, deriveStats(draft).wpMax); });
        return true;
      },
      willpowerLeft: () => (data ? Math.max(0, deriveStats(data).wpMax - data.trackers.wpSup - data.trackers.wpAgg) : 0),
      hungerLeft: () => (data ? Math.max(0, 5 - data.trackers.hunger) : 0),
    });
    return () => setVtmSheetHooks(null);
  }, [data, mutate]);

  // Предупреждение при уходе во время сохранения
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (statusRef.current === "saving") e.preventDefault();
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, []);

  const derived = useMemo(() => {
    if (!data) return null;
    return deriveStats(data);
  }, [data]);

  // ===== Экспорт / Импорт листа =====
  const exportSheet = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vtm-${(data.info.name || "vampire").replace(/[^\wа-яА-ЯёЁ]+/g, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Лист скопирован в личный архив (JSON)");
  };

  const importSheet = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (!parsed || typeof parsed !== "object" || !parsed.info || !parsed.attributes) {
          throw new Error("это не похоже на лист Сородича");
        }
        const normalized = normalizeSheet(parsed);
        setData(normalized);
        save(normalized, normalized.info.name || "Безымянный Сородич");
        toast.success("Лист восстановлен из архива", { description: "Проверь данные — ночь не прощает описок." });
      } catch (e: any) {
        toast.error("Свиток повреждён", { description: e.message });
      }
    };
    reader.readAsText(file);
  };

  if (isLoading || !data || !derived) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4">
        <svg viewBox="0 0 60 60" className="w-24 vtm-breath" aria-hidden="true">
          <path d="M30 4 C38 18 44 26 46 38 C47.5 45 42 52 38 52 C34 52 29 46 30 38 C31 26 29 16 30 4 Z" fill="none" stroke="#8a1a1d" strokeWidth="1.6" opacity="0.8" />
        </svg>
        <p className="vtm-label text-sm tracking-[0.4em] uppercase text-[#6e5a53] vtm-flicker">
          Разворачиваем саван…
        </p>
      </main>
    );
  }

  if (isError) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <p className="vtm-display text-xl text-[#e8636b]">Лист утерян в тумане</p>
        <button onClick={onBack} className="vtm-btn">← Назад к ночам</button>
      </main>
    );
  }

  const deleteSheet = async () => {
    const res = await vtmFetch(`/api/vtm/sheets/${sheetId}`, { method: "DELETE" });
    if (res.ok) {
      qc.invalidateQueries({ queryKey: ["vtm-sheets"] });
      toast.success("Лист предан земле");
      onBack();
    } else {
      toast.error("Не удалось предать лист земле");
    }
  };

  const clanName = CLAN_BY_ID.get(data.info.clan)?.name;
  const sectName = SECT_BY_ID.get(data.info.sect)?.name;
  const predatorName = PREDATOR_BY_ID.get(data.info.predator)?.name;

  // Быстрый бросок проверки по навыку — используется секциями
  const rollCheck = (pool: number, label: string) => {
    vtmRollAndShow(pool, data.trackers.hunger, label);
  };

  return (
    <main className="relative z-10 min-h-screen pb-24">
      {conflict && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)" }} role="alertdialog" aria-label="Конфликт версий листа">
          <div className="vtm-panel max-w-md w-full p-6 space-y-4 vtm-conflict-pop">
            <span className="vtm-stamp">Конфликт версий</span>
            <h2 className="vtm-display text-lg text-[#d9c7b6]">Лист изменён в другом окне</h2>
            <p className="text-sm leading-relaxed text-[#a68d80]">
              Пока ты заполнял лист, копия в архиве обновилась — возможно, открыта вторая вкладка.
              Что сделать с твоей версией?
            </p>
            <div className="space-y-2 pt-1">
              <button onClick={resolveConflictTakeServer} className="vtm-btn vtm-btn-blood w-full justify-center py-2.5">
                Взять версию из архива
              </button>
              <button onClick={resolveConflictForce} className="vtm-btn w-full justify-center py-2.5">
                Записать мою версию (перезапишет архив)
              </button>
            </div>
            <p className="vtm-hint">Архивная версия сохранена от {new Date(conflict.serverUpdatedAt).toLocaleString("ru-RU")}.</p>
          </div>
        </div>
      )}
      <div className="vtm-screen">
      <div className="max-w-7xl mx-auto px-3 md:px-6 py-6 md:py-8 space-y-4">
        {/* Шапка листа */}
        <motion.header
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="vtm-panel p-3 md:p-4 flex flex-wrap items-center gap-3"
        >
          <VtmReturnPortal className="vtm-btn vtm-btn-ghost shrink-0 !px-2.5">
            <span aria-hidden>←</span>
          </VtmReturnPortal>
          <button onClick={onBack} className="vtm-btn vtm-btn-ghost shrink-0 !px-2.5 hidden md:inline-flex">
            Ночи
          </button>
          <div className="flex-1 min-w-[180px]">
            <input
              value={data.info.name}
              onChange={(e) => mutate((d) => { d.info.name = e.target.value; })}
              className="vtm-input !text-base md:!text-xl !border-transparent !bg-transparent vtm-display w-full"
              style={{ letterSpacing: "0.08em" }}
              placeholder="Имя Сородича"
              aria-label="Имя Сородича"
            />
            {(clanName || sectName || predatorName) && (
              <p className="vtm-label text-[0.6rem] text-[#a8863d] mt-0.5 ml-1 flex flex-wrap gap-x-2">
                {clanName && <span>⛧ {clanName}</span>}
                {sectName && <span>· {sectName}</span>}
                {predatorName && <span>· {predatorName}</span>}
                <span>· СК {derived.bp}</span>
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-1.5 min-w-0 sm:flex-nowrap">
            <button
              onClick={() => window.print()}
              className="vtm-btn vtm-btn-ghost !py-1.5 !px-2 text-xs"
              title="Распечатать лист или сохранить в PDF (Ctrl+P)"
              aria-label="Печать листа"
            >
              🖨<span className="hidden min-[480px]:inline"> Печать</span>
            </button>
            <button
              onClick={exportSheet}
              className="vtm-btn vtm-btn-ghost !py-1.5 !px-2 text-xs"
              title="Скачать лист файлом (JSON)"
              aria-label="Экспорт листа"
            >
              ⇩<span className="hidden min-[480px]:inline"> Копия</span>
            </button>
            <input
              ref={importRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => importSheet(e.target.files?.[0])}
            />
            <button
              onClick={() => importRef.current?.click()}
              className="vtm-btn vtm-btn-ghost !py-1.5 !px-2 text-xs"
              title="Восстановить лист из файла (текущие данные будут заменены)"
              aria-label="Импорт листа"
            >
              ⇧<span className="hidden min-[480px]:inline"> Восстановить</span>
            </button>
            <span
              className={`vtm-save-dot ml-1 ${status === "saved" ? "saved" : status === "saving" ? "saving" : status === "error" || status === "conflict" ? "error" : ""}`}
              title={status}
            />
            <span
              key={status}
              className={`vtm-save-stamp hidden sm:inline ${status === "saved" ? "is-saved" : status === "error" || status === "conflict" ? "is-error" : ""}`}
            >
              {status === "saving"
                ? "запись…"
                : status === "saved"
                  ? "ЗАПИСАНО"
                  : status === "conflict"
                    ? "КОНФЛИКТ!"
                    : status === "error"
                      ? "ОШИБКА!"
                      : "АРХИВ"}
            </span>
            <DeleteButton onDelete={deleteSheet} />
          </div>
        </motion.header>

        {/* Вкладки */}
        <nav className="vtm-panel !rounded-md overflow-hidden" aria-label="Разделы листа">
          <div
            ref={tabsBarRef}
            onScroll={updateTabFades}
            className={`flex overflow-x-auto vtm-scroll vtm-tabs-bar ${tabFadeLeft ? "fade-left" : ""} ${tabFadeRight ? "fade-right" : ""}`}
            role="tablist"
          >
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`vtm-tab ${tab === t.id ? "active" : ""}`}
              >
                {t.label}
                {tab === t.id && (
                  <motion.span
                    layoutId="vtm-tab-underline"
                    className="absolute bottom-0 left-0 right-0 h-[2px]"
                    style={{ background: "linear-gradient(to right, transparent, #c22b30, transparent)", boxShadow: "0 0 10px rgba(194,43,48,0.6)" }}
                    transition={{ type: "spring", stiffness: 500, damping: 40 }}
                  />
                )}
              </button>
            ))}
          </div>
        </nav>

        {/* Содержимое вкладки */}
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          {tab === "dossier" && <DossierSection data={data} mutate={mutate} derived={derived} />}
          {tab === "attributes" && <AttributesSection data={data} mutate={mutate} derived={derived} onRoll={rollCheck} />}
          {tab === "skills" && <SkillsSection data={data} mutate={mutate} derived={derived} onRoll={rollCheck} />}
          {tab === "disciplines" && <DisciplinesSection data={data} mutate={mutate} derived={derived} />}
          {tab === "advantages" && <AdvantagesSection data={data} mutate={mutate} derived={derived} />}
          {tab === "gear" && <GearSection data={data} mutate={mutate} derived={derived} />}
          {tab === "notes" && <NotesSection data={data} mutate={mutate} />}
          {tab === "codex" && <CodexSection />}
        </motion.div>
      </div>

      <VtmDicePanel />
      </div>

      {/* Печатная версия листа — видна только при печати / сохранении в PDF */}
      <div className="vtm-print-only" aria-hidden="true">
        <VtmPrintSheet data={data} derived={derived} />
      </div>
    </main>
  );
}

function DeleteButton({ onDelete }: { onDelete: () => void }) {
  const [confirming, setConfirming] = useState(false);
  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(false), 3000);
    return () => clearTimeout(t);
  }, [confirming]);
  return (
    <button
      onClick={() => (confirming ? onDelete() : setConfirming(true))}
      className={`vtm-btn !py-1.5 !px-2.5 text-xs ${confirming ? "vtm-btn-danger" : "vtm-btn-ghost"}`}
      title="Предать лист земле"
    >
      {confirming ? "В землю?!" : "В землю"}
    </button>
  );
}
