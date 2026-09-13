"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  CocSheetData,
  normalizeSheet,
} from "@/lib/coc-data";
import { deriveStats, setSkillContext } from "@/lib/coc-calc";
import { DossierSection, SkillsSection } from "@/components/coc/section-dossier-skills";
import { CombatSection, BioSection, GearSection, NotesSection } from "@/components/coc/section-misc";
import { CocDicePanel, setLuckProvider } from "@/components/coc/coc-dice";
import { ReturnPortal } from "@/components/coc/portal-transition";
import { CocPrintSheet } from "@/components/coc/coc-print-sheet";
import { OCCUPATIONS } from "@/lib/coc-data";
import { cocFetch } from "@/lib/coc-api";

type SaveStatus = "idle" | "saving" | "saved" | "error" | "conflict";

interface ConflictInfo {
  serverUpdatedAt: string;
  serverData: CocSheetData;
}

const TABS = [
  { id: "dossier", label: "Досье" },
  { id: "skills", label: "Навыки" },
  { id: "combat", label: "Бой" },
  { id: "bio", label: "Биография" },
  { id: "gear", label: "Имущество" },
  { id: "notes", label: "Заметки" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function CocEditor({ sheetId, onBack }: { sheetId: string; onBack: () => void }) {
  const qc = useQueryClient();
  const { data: raw, isLoading, isError } = useQuery<any>({
    queryKey: ["coc-sheet", sheetId],
    queryFn: () => cocFetch(`/api/coc/sheets/${sheetId}`).then(async (r) => {
      if (!r.ok) throw new Error("Лист не найден");
      return r.json();
    }),
  });

  const [data, setData] = useState<CocSheetData | null>(null);
  const [tab, setTab] = useState<TabId>("dossier");
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [conflict, setConflict] = useState<ConflictInfo | null>(null);
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
    async (payload: CocSheetData, name: string, opts?: { force?: boolean }) => {
      // Пока открыт диалог конфликта — автосохранение молчит (решает игрок)
      if (conflictRef.current && !opts?.force) return;
      setStatus("saving");
      try {
        const res = await cocFetch(`/api/coc/sheets/${sheetId}`, {
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
        qc.invalidateQueries({ queryKey: ["coc-sheets"] });
      } catch (e: any) {
        setStatus("error");
        toast.error("Тьма не приняла запись", { description: e.message });
      }
    },
    [sheetId, qc]
  );

  // Разрешение конфликта: взять версию из архива (локальные правки исчезнут)
  const resolveConflictTakeServer = () => {
    if (!conflict) return;
    const normalized = normalizeSheet(conflict.serverData);
    setData(normalized);
    snapshotRef.current = JSON.stringify(normalized);
    syncedAtRef.current = conflict.serverUpdatedAt;
    setConflict(null);
    setStatus("saved");
    toast.success("Версия из архива загружена", { description: "Ваши несохранённые правки исчезли." });
  };

  // Разрешение конфликта: всё равно записать свою версию (перезапись чужой)
  const resolveConflictForce = () => {
    if (!conflict || !data) return;
    syncedAtRef.current = conflict.serverUpdatedAt; // база теперь серверная версия
    const name = data.info.name || "Безымянный сыщик";
    setConflict(null);
    save(data, name, { force: true });
  };

  // Автосохранение с дебаунсом
  const scheduleSave = useCallback(
    (next: CocSheetData) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        save(next, next.info.name || "Безымянный сыщик");
      }, 900);
    },
    [save]
  );

  const mutate = useCallback(
    (fn: (draft: CocSheetData) => void) => {
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

  // Поставщик удачи: панель бросков знает, сколько удачи на руках и как её списать
  useEffect(() => {
    setLuckProvider({
      available: () => (data ? Math.max(0, data.trackers.luckCurrent ?? data.characteristics.luck) : 0),
      spend: (n) =>
        mutate((d) => {
          d.trackers.luckCurrent = Math.max(0, (d.trackers.luckCurrent ?? d.characteristics.luck) - n);
        }),
    });
    return () => setLuckProvider(null);
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
    // Динамика баз навыков (½ ЛВК, родной язык = ОБР) — до любых расчётов рендера
    setSkillContext(data.characteristics.dex, data.characteristics.edu);
    return deriveStats(data);
  }, [data]);

  // ===== Экспорт / Импорт досье =====
  const exportSheet = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dosye-${(data.info.name || "sishchik").replace(/[^\wа-яА-ЯёЁ]+/g, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Досье скопировано в личный архив (JSON)");
  };

  const importSheet = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (!parsed || typeof parsed !== "object" || !parsed.info || !parsed.characteristics) {
          throw new Error("это не похоже на досье сыщика");
        }
        const normalized = normalizeSheet(parsed);
        setData(normalized);
        save(normalized, normalized.info.name || "Безымянный сыщик");
        toast.success("Досье восстановлено из архива", { description: "Не забудьте проверить данные." });
      } catch (e: any) {
        toast.error("Свиток повреждён", { description: e.message });
      }
    };
    reader.readAsText(file);
  };

  if (isLoading || !data || !derived) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4">
        <svg viewBox="0 0 120 60" className="w-32 coc-breath" aria-hidden="true">
          <path d="M6 30 Q60 -6 114 30 Q60 66 6 30 Z" fill="none" stroke="#5f8f6e" strokeWidth="1.2" opacity="0.7" />
          <circle cx="60" cy="30" r="10" fill="none" stroke="#5f8f6e" strokeWidth="1" opacity="0.8" />
          <circle cx="60" cy="30" r="4" fill="#5f8f6e" />
        </svg>
        <p className="coc-display text-sm tracking-[0.4em] uppercase text-[#6e6350] coc-flicker">
          Разворачиваем досье…
        </p>
      </main>
    );
  }

  if (isError) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <p className="coc-display text-xl text-[#a83232]">Дело утеряно в архиве</p>
        <button onClick={onBack} className="coc-btn">← Назад к делам</button>
      </main>
    );
  }

  const deleteSheet = async () => {
    const res = await cocFetch(`/api/coc/sheets/${sheetId}`, { method: "DELETE" });
    if (res.ok) {
      qc.invalidateQueries({ queryKey: ["coc-sheets"] });
      toast.success("Дело уничтожено");
      onBack();
    } else {
      toast.error("Не удалось уничтожить дело");
    }
  };

  const occName = OCCUPATIONS.find((o) => o.id === data.info.occupation)?.name;

  return (
    <main className="relative z-10 min-h-screen pb-24">
      {conflict && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.82)" }} role="alertdialog" aria-label="Конфликт версий досье">
          <div className="coc-panel max-w-md w-full p-6 space-y-4 coc-conflict-pop">
            <span className="coc-stamp">Конфликт версий</span>
            <h2 className="coc-display text-lg text-[#d8cbb0]">Дело изменено в другом окне</h2>
            <p className="text-sm leading-relaxed text-[#a4977c]">
              Пока вы заполняли лист, копия в архиве была обновлена — возможно, это открыта вторая вкладка.
              Что сделать с вашей версией?
            </p>
            <div className="space-y-2 pt-1">
              <button onClick={resolveConflictTakeServer} className="coc-btn coc-btn-verdigris w-full justify-center py-2.5">
                Взять версию из архива
              </button>
              <button onClick={resolveConflictForce} className="coc-btn w-full justify-center py-2.5">
                Записать мою версию (перезапишет архив)
              </button>
            </div>
            <p className="coc-hint">Архивная версия сохранена от {new Date(conflict.serverUpdatedAt).toLocaleString("ru-RU")}.</p>
          </div>
        </div>
      )}
      <div className="coc-screen">
      <div className="max-w-7xl mx-auto px-3 md:px-6 py-6 md:py-8 space-y-4">
        {/* Шапка досье */}
        <motion.header
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="coc-panel p-3 md:p-4 flex flex-wrap items-center gap-3"
        >
          <ReturnPortal className="coc-btn coc-btn-ghost shrink-0 !px-2.5" >
            <span aria-hidden>←</span>
          </ReturnPortal>
          <button onClick={onBack} className="coc-btn coc-btn-ghost shrink-0 !px-2.5 hidden md:inline-flex">
            Архив
          </button>
          <div className="flex-1 min-w-[180px]">
            <input
              value={data.info.name}
              onChange={(e) => mutate((d) => { d.info.name = e.target.value; })}
              className="coc-input !text-base md:!text-xl !border-transparent !bg-transparent coc-display w-full"
              style={{ letterSpacing: "0.08em" }}
              placeholder="Имя сыщика"
              aria-label="Имя сыщика"
            />
            {occName && (
              <p className="coc-mono text-[0.62rem] text-[#9a7d3e] mt-0.5 ml-1">
                ◈ {occName}{data.info.age ? ` · ${data.info.age} лет` : ""}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-1.5 min-w-0 sm:flex-nowrap">
            <button
              onClick={() => window.print()}
              className="coc-btn coc-btn-ghost !py-1.5 !px-2 text-xs"
              title="Распечатать досье или сохранить в PDF (Ctrl+P)"
              aria-label="Печать досье"
            >
              🖨<span className="hidden min-[480px]:inline"> Печать</span>
            </button>
            <button
              onClick={exportSheet}
              className="coc-btn coc-btn-ghost !py-1.5 !px-2 text-xs"
              title="Скачать досье файлом (JSON)"
              aria-label="Экспорт досье"
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
              className="coc-btn coc-btn-ghost !py-1.5 !px-2 text-xs"
              title="Восстановить досье из файла (текущие данные будут заменены)"
              aria-label="Импорт досье"
            >
              ⇧<span className="hidden min-[480px]:inline"> Восстановить</span>
            </button>
            <span
              className={`coc-save-dot ml-1 ${status === "saved" ? "saved" : status === "saving" ? "saving" : status === "error" || status === "conflict" ? "error" : ""}`}
              title={status}
            />
            <span
              key={status}
              className={`coc-save-stamp hidden sm:inline ${status === "saved" ? "is-saved" : status === "error" || status === "conflict" ? "is-error" : ""}`}
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
        <nav className="coc-panel !rounded-md overflow-hidden" aria-label="Разделы досье">
          <div className="flex overflow-x-auto coc-scroll" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`coc-tab ${tab === t.id ? "active" : ""}`}
              >
                {t.label}
                {tab === t.id && (
                  <motion.span
                    layoutId="coc-tab-underline"
                    className="absolute bottom-0 left-0 right-0 h-[2px]"
                    style={{ background: "linear-gradient(to right, transparent, #5f8f6e, transparent)", boxShadow: "0 0 10px rgba(95,143,110,0.6)" }}
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
          {tab === "skills" && <SkillsSection data={data} mutate={mutate} derived={derived} />}
          {tab === "combat" && <CombatSection data={data} mutate={mutate} derived={derived} />}
          {tab === "bio" && <BioSection data={data} mutate={mutate} />}
          {tab === "gear" && <GearSection data={data} mutate={mutate} derived={derived} />}
          {tab === "notes" && <NotesSection data={data} mutate={mutate} />}
        </motion.div>
      </div>

      <CocDicePanel />
      </div>

      {/* Печатная версия досье — видна только при печати / сохранении в PDF */}
      <div className="coc-print-only" aria-hidden="true">
        <CocPrintSheet data={data} derived={derived} />
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
      className={`coc-btn !py-1.5 !px-2.5 text-xs ${confirming ? "coc-btn-danger" : "coc-btn-ghost"}`}
      title="Уничтожить дело"
    >
      {confirming ? "Сжечь?!" : "Сжечь"}
    </button>
  );
}
