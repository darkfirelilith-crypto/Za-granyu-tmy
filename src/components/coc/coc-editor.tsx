"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  CocSheetData,
  normalizeSheet,
  createEmptySheet,
} from "@/lib/coc-data";
import { deriveStats, setSkillContext } from "@/lib/coc-calc";
import { DossierSection, SkillsSection } from "@/components/coc/section-dossier-skills";
import { CombatSection, BioSection, GearSection, NotesSection } from "@/components/coc/section-misc";
import { CocDicePanel } from "@/components/coc/coc-dice";
import { ReturnPortal } from "@/components/coc/portal-transition";

type SaveStatus = "idle" | "saving" | "saved" | "error";

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
    queryFn: () => fetch(`/api/coc/sheets/${sheetId}`).then(async (r) => {
      if (!r.ok) throw new Error("Лист не найден");
      return r.json();
    }),
  });

  const [data, setData] = useState<CocSheetData | null>(null);
  const [tab, setTab] = useState<TabId>("dossier");
  const [status, setStatus] = useState<SaveStatus>("idle");
  const snapshotRef = useRef<string>("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusRef = useRef<SaveStatus>("idle");
  statusRef.current = status;

  // Инициализация данных после загрузки
  useEffect(() => {
    if (raw && !data) {
      const normalized = normalizeSheet(raw.data);
      setData(normalized);
      snapshotRef.current = JSON.stringify(normalized);
      setStatus("idle");
    }
  }, [raw, data]);

  const save = useCallback(
    async (payload: CocSheetData, name: string) => {
      setStatus("saving");
      try {
        const res = await fetch(`/api/coc/sheets/${sheetId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, data: payload }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || "Ошибка сохранения");
        }
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

  if (isLoading || !data || !derived) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-3">
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
    const res = await fetch(`/api/coc/sheets/${sheetId}`, { method: "DELETE" });
    if (res.ok) {
      qc.invalidateQueries({ queryKey: ["coc-sheets"] });
      toast.success("Дело уничтожено");
      onBack();
    } else {
      toast.error("Не удалось уничтожить дело");
    }
  };

  return (
    <main className="relative z-10 min-h-screen pb-24">
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
          <input
            value={data.info.name}
            onChange={(e) => mutate((d) => { d.info.name = e.target.value; })}
            className="coc-input !text-base md:!text-xl !border-transparent !bg-transparent coc-display flex-1 min-w-[180px]"
            style={{ letterSpacing: "0.08em" }}
            placeholder="Имя сыщика"
            aria-label="Имя сыщика"
          />
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`coc-save-dot ${status === "saved" ? "saved" : status === "saving" ? "saving" : status === "error" ? "error" : ""}`}
              title={status}
            />
            <span className="coc-mono text-[0.65rem] text-[#6e6350] hidden sm:inline">
              {status === "saving" ? "запись…" : status === "saved" ? "записано" : status === "error" ? "ошибка!" : "архив"}
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
