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
import { vtmUid } from "@/lib/vtm-id";
import { SKILL_LIBRARY } from "@/lib/vtm-data";
import { buildW5SummaryMarkdown } from "@/lib/vtm-w5-summary-md";
import { applyParsedW5Md, W5MdParseResult } from "@/lib/vtm-w5-md-import";
import { W5ImportDialog } from "@/components/vtm/vtm-w5-import-dialog";
import { VtmDicePanel, setVtmSheetHooks, useVtmDice, vtmW5RollAndShow, vtmW5RageCheckAndShow, W5RollResult } from "@/components/vtm/vtm-dice";
import { W5PrintDoc, W5PrintSummary, W5PrintDossier } from "@/components/vtm/vtm-w5-print";
import { W5HelpDialog } from "@/components/vtm/vtm-help";
import {
  W5SheetData,
  W5GiftEntry,
  W5_TRIBES,
  W5_TRIBE_BY_ID,
  W5_AUSPICES,
  W5_AUSPICE_BY_ID,
  W5_BREEDS,
  W5_FORMS,
  W5_FORM_BY_ID,
  w5FormMods,
  w5EffAttr,
  W5_GIFT_LIBRARY,
  W5_RITE_LIBRARY,
  emptyW5Sheet,
  normalizeW5,
  w5WillpowerMax,
  w5HealthMax,
  w5Rank,
  w5GiftLevelCap,
  pushW5XpLog,
  W5_XP_COSTS,
} from "@/lib/vtm-w5data";

type W5Tab = "identity" | "nature" | "skills" | "gifts" | "tracks" | "gear" | "notes" | "codex";

/** Короткие подписи характеристик для чипов модификаторов облика. */
const ATTR_SHORT: Record<keyof W5SheetData["attributes"], string> = {
  str: "СИЛ", dex: "ЛОВ", sta: "СТК",
  cha: "ОБА", man: "МАН", com: "САМ",
  int: "ИНТ", wit: "СМК", res: "УПР",
};

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
  const [helpOpen, setHelpOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  // Досье Гароу: карточка-поповер из витальной строки (Слава/Дары/Ранг — без ухода со вкладки)
  const [dossierOpen, setDossierOpen] = useState(false);
  const dossierRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!dossierOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setDossierOpen(false); };
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (dossierRef.current && !dossierRef.current.contains(e.target as Node)) setDossierOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [dossierOpen]);
  const restoreInputRef = useRef<HTMLInputElement | null>(null);
  // Режим печати: «лист» — полный бланк; «сводка» — одна страница для стола;
  // «досье» — карточка из поповера Досье (витальное/Слава/Дары) — раунд 23.
  const [printMode, setPrintMode] = useState<"sheet" | "summary" | "dossier">("sheet");
  const printDoc = useCallback((mode: "sheet" | "summary" | "dossier") => {
    setPrintMode(mode);
    setTimeout(() => window.print(), 60);
  }, []);
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

  // Кости Луны: режим панели и хуки листа Гароу (хроника, Ярость, Воля).
  // Сцена (счётчики воли/ярости) живёт per-sheet: bindSheet прячет её в карту
  // по id листа и достаёт сцену этого листа при возврате.
  useEffect(() => {
    useVtmDice.getState().setMode("werewolf");
    useVtmDice.getState().bindSheet(sheetId);
    return () => {
      useVtmDice.getState().bindSheet(null);
      useVtmDice.getState().setMode("vampire");
    };
  }, [sheetId]);
  useEffect(() => {
    setVtmSheetHooks({
      logRoll: (text) => mutate((d) => { d.rollLog = [{ id: vtmUid("roll"), text, ts: new Date().toISOString() }, ...d.rollLog].slice(0, 60); }),
      addRage: (n) => mutate((d) => {
        const next = Math.max(0, Math.min(5, d.trackers.rage + n));
        d.trackers.rage = next;
        if (next === 0) d.trackers.wolfLost = true;
        if (next > 0) d.trackers.wolfLost = false;
      }),
      spendWillpower: () => {
        if (!data) return false;
        const max = w5WillpowerMax(data);
        if (data.trackers.wpSup >= max) return false;
        mutate((draft) => { draft.trackers.wpSup = Math.min(draft.trackers.wpSup + 1, w5WillpowerMax(draft)); });
        return true;
      },
      willpowerLeft: () => (data ? Math.max(0, w5WillpowerMax(data) - data.trackers.wpSup) : 0),
    });
    return () => setVtmSheetHooks(null);
  }, [data, mutate]);

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
  const activeForm = data.info.activeForm ? W5_FORM_BY_ID.get(data.info.activeForm) || undefined : undefined;
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
    // Слава чипами с рангом: Гордец 2 · Честь 1 · Мудрость 1 — Клиаит
    lines.push(`Слава [Гордец ${data.trackers.glory}] [Честь ${data.trackers.honor}] [Мудрость ${data.trackers.wisdom}] — ${rank.title}${data.trackers.wolfLost ? " ⚠ волк потерян" : ""}${data.trackers.harano ? " · харано" : ""}`);
    lines.push(`Опыт: свободно ${data.trackers.xp} · вложено ${data.trackers.xpSpent}`);
    if (data.gifts.length) lines.push(`Дары: ${data.gifts.map((g) => `${g.name} (${g.level})`).join(", ")}`);
    if (data.rites.length) lines.push(`Обряды: ${data.rites.map((r) => `${r.name} (${r.level})`).join(", ")}`);
    // Навыки: только ненулевые, специализации — в скобках (зеркало вампирской сводки)
    const trained = data.skills
      .filter((s) => s.value > 0 || s.spec.trim())
      .map((s) => {
        const lib = SKILL_LIBRARY.find((l) => l.id === s.id);
        const spec = s.spec.trim() ? ` (${s.spec.trim()})` : "";
        return `${lib?.name || s.id} ${s.value}${spec}`;
      });
    if (trained.length) lines.push(`Навыки: ${trained.join(", ")}`);
    if (data.aspirations.length) lines.push(`Стремления: ${data.aspirations.map((a) => a.text).filter(Boolean).join(" | ")}`);
    // Журнал опыта — последние 3 записи (покупки падают сами)
    const xpTail = (data.xpLog || []).slice(0, 3);
    if (xpTail.length) {
      lines.push("Журнал опыта:");
      for (const e of xpTail) lines.push(`  · ${e.text}`);
      const rest = (data.xpLog || []).length - xpTail.length;
      if (rest > 0) lines.push(`  …и ещё ${rest} записей на листе`);
    }
    try {
      await copyText(lines.join("\n"));
      toast.success("Сводка Гароу в буфере");
    } catch {
      toast.error("Браузер не отдал буфер — скопируй вручную");
    }
  };

  // Надёжная запись в буфер: даже если navigator.clipboard есть, но запретил
  // запись (старые вебвью, http, строгие разрешения) — уходим в запасной путь
  const copyText = async (text: string) => {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return;
      } catch {
        // fall through к запасному пути
      }
    }
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  };

  // «Ⓜ МД» — Markdown-сводка Гароу для Obsidian-столов и вики
  const copySummaryMarkdown = async () => {
    try {
      await copyText(buildW5SummaryMarkdown(data));
      toast.success("Сводка Гароу в Markdown", { description: "Вставь в Obsidian или вики стола — таблицы и чипы Славы оживут сами." });
    } catch {
      toast.error("Не удалось скопировать сводку", { description: "Браузер не пустил к буферу обмена." });
    }
  };

  // «⇩ Копия» — полный бэкап листа Гароу в JSON
  const exportSheet = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `w5-${(data.info.name || "garou").replace(/[^\wа-яА-ЯёЁ]+/g, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Лист скопирован в личный архив (JSON)");
  };

  // «⇧ Восстановить» — вернуть лист из JSON-бэкапа (кнопка в шапке, скрытый input)
  const restoreSheet = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!parsed || typeof parsed !== "object") throw new Error("Не лист Гароу");
        if (parsed.kind && parsed.kind !== "werewolf") throw new Error("Это лист вампира, а не Гароу");
        if (confirm("Восстановить лист из файла? Текущие данные Гароу будут заменены.")) {
          setData(normalizeW5(parsed));
          toast.success("Лист восстановлен из архива", { description: "Не забудь дождаться «Записано»." });
        }
      } catch (e) {
        toast.error("Не вышло прочитать файл", { description: e instanceof Error ? e.message : "Нужен JSON-бэкап листа Гароу." });
      }
    };
    reader.readAsText(file);
  };

  // «⇲ МД» — вливание «Сводки Гароу» из Obsidian в текущий лист
  const applyMarkdownW5 = (result: W5MdParseResult) => {
    mutate((draft) => {
      applyParsedW5Md(draft, result.fields);
    });
    setImportOpen(false);
    toast.success("Сводка влилась в лист Гароу", {
      description: `Обновлено полей: ${result.found.length}. Луна помнит оба источника.`,
    });
  };

  const attrPairs: { key: keyof W5SheetData["attributes"]; label: string }[] = [
    { key: "str", label: "Сила" }, { key: "dex", label: "Ловкость" }, { key: "sta", label: "Стойкость" },
    { key: "cha", label: "Обаяние" }, { key: "man", label: "Манипуляция" }, { key: "com", label: "Самообладание" },
    { key: "int", label: "Интеллект" }, { key: "wit", label: "Смекалка" }, { key: "res", label: "Упорство" },
  ];

  // Быстрый бросок пула с костями Ярости — используется вкладками
  const rollCheck = (pool: number, label: string, opts?: { damage?: boolean }) => {
    vtmW5RollAndShow(pool, data.trackers.rage, label, opts);
  };

  // Бросок с учётом облика: эффективная характеристика + подпись облика
  const rollWithForm = (pool: number, label: string, opts?: { damage?: boolean }) => {
    const mod = activeForm && activeForm.id !== "hishu" ? " 🐾" : "";
    rollCheck(pool, `${label}${mod}`, opts);
  };

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
            <button className="vtm-btn vtm-btn-ghost !py-1.5 !px-3 text-xs" onClick={copySummary} title="Текстовая сводка Гароу в буфер">⧉ Копия</button>
            <button className="vtm-btn vtm-btn-ghost !py-1.5 !px-3 text-xs" onClick={copySummaryMarkdown} title="Markdown-сводка для Obsidian и вики">Ⓜ <span className="hidden min-[480px]:inline">МД</span></button>
            <button className="vtm-btn vtm-btn-ghost !py-1.5 !px-3 text-xs" onClick={() => setImportOpen(true)} title="Влить «Сводку Гароу» из Obsidian (Markdown)">⇲ <span className="hidden min-[480px]:inline">МД</span></button>
            <button className="vtm-btn vtm-btn-ghost !py-1.5 !px-3 text-xs" onClick={exportSheet} title="Полный бэкап листа в JSON">⇩ <span className="hidden min-[480px]:inline">Копия</span></button>
            <button className="vtm-btn vtm-btn-ghost !py-1.5 !px-3 text-xs" onClick={() => restoreInputRef.current?.click()} title="Восстановить лист из JSON-бэкапа">⇧ <span className="hidden min-[480px]:inline">Восстановить</span></button>
            <input
              ref={restoreInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => { restoreSheet(e.target.files?.[0]); e.target.value = ""; }}
              aria-hidden="true"
            />
            <button className="vtm-btn vtm-btn-ghost !py-1.5 !px-3 text-xs" onClick={() => printDoc("sheet")} aria-label="Печать листа Гароу" title="Печать полного листа">🖨 Лист</button>
            <button className="vtm-btn vtm-btn-ghost !py-1.5 !px-3 text-xs" onClick={() => printDoc("summary")} aria-label="Печать сводки Гароу" title="Печать сводки на одну страницу">🖨 Сводка</button>
            <button
              className="vtm-btn vtm-btn-ghost !py-1.5 !px-3 text-xs"
              onClick={() => setHelpOpen(true)}
              aria-label="Открыть справку по текущей вкладке"
              title="Справка по текущей вкладке"
            >
              ?
            </button>
            <button
              className="vtm-btn vtm-btn-ghost !py-1.5 !px-3 text-xs"
              onClick={() => {
                // единственный лист в архиве? — предупреждаем (кэш списка архива)
                const cached = qc.getQueryData<{ id: string }[]>(["vtm-sheets"]);
                if (Array.isArray(cached) && cached.length <= 1) {
                  toast.warning("Это последняя ночь в архиве", {
                    description: "После неё архив опустеет: Луна забудет волка. Список можно вернуть импортом «⇧ Восстановить».",
                  });
                }
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

          {/* Витальная строка — клик раскрывает «Досье Гароу» (карточка-поповер) */}
          <div className="relative" ref={dossierRef}>
            <button
              type="button"
              onClick={() => {
                // Досье и панель костей — два нижних листа на мобайле: открываем по одному
                useVtmDice.getState().setOpen(false);
                setDossierOpen((v) => !v);
              }}
              aria-expanded={dossierOpen}
              aria-haspopup="dialog"
              className={`vtm-panel vtm-w5-vitals p-2.5 md:p-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 w-full text-left ${dossierOpen ? "vtm-w5-vitals-open" : ""}`}
              title="Витальная сводка Гароу — клик раскроет Досье: Слава, Ранг, Дары, Опыт"
              aria-label="Витальная сводка Гароу — открыть Досье"
            >
              <span className="vtm-hint !text-[0.78rem]">Ярость <b className="text-[#e8636b] not-italic">{data.trackers.rage}</b>/5</span>
              <span className="vtm-hint !text-[0.78rem]">Здоровье <b className="text-[#d9c7b6] not-italic">{data.trackers.healthSup + data.trackers.healthAgg}/{healthMax}</b></span>
              <span className="vtm-hint !text-[0.78rem]">Воля <b className="text-[#d9c7b6] not-italic">{data.trackers.wpSup}/{wpMax}</b></span>
              <span className="vtm-hint !text-[0.78rem]">Слава <b className="text-[#c9d3e8] not-italic">{renownTotal}</b> — {rank.title}</span>
              {activeForm && activeForm.id !== "hishu" && (
                <span className="vtm-form-badge" title={`Облик дня: ${activeForm.name} — модификаторы применяются к броскам`}>
                  🐾 {activeForm.name}
                </span>
              )}
              {data.trackers.wolfLost && <span className="vtm-label text-[0.68rem] text-[#e8636b] uppercase">волк потерян</span>}
              {data.trackers.harano && <span className="vtm-label text-[0.68rem] text-[#8ea6c9] uppercase">харано</span>}
              <span className="vtm-w5-vitals-go" aria-hidden>{dossierOpen ? "свернуть ▲" : "досье ▼"}</span>
            </button>
            {dossierOpen && (
              <W5DossierPop
                data={data}
                rank={rank}
                renownTotal={renownTotal}
                onClose={() => setDossierOpen(false)}
                onGo={(t) => { setTab(t); setDossierOpen(false); }}
                onPrint={() => { setDossierOpen(false); printDoc("dossier"); }}
              />
            )}
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
            <W5IdentityTab data={data} mutate={mutate} onRoll={rollWithForm} />
          )}
          {tab === "nature" && (
            <W5NatureTab data={data} mutate={mutate} attrPairs={attrPairs} attrTotal={attrTotal} onRoll={rollWithForm} />
          )}
          {tab === "skills" && (
            <W5SkillsTab data={data} mutate={mutate} attrPairs={attrPairs} onRoll={rollWithForm} />
          )}
          {tab === "gifts" && (
            <W5GiftsTab data={data} mutate={mutate} onRoll={rollCheck} />
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

      {/* Печатная версия листа Гароу — видна только при печати / сохранении в PDF */}
      <div className="vtm-print-only" aria-hidden="true">
        {printMode === "summary" ? <W5PrintSummary data={data} /> : printMode === "dossier" ? <W5PrintDossier data={data} /> : <W5PrintDoc data={data} />}
      </div>

      <VtmDicePanel />

      {/* Справка «?» — правила той вкладки, где ты сейчас (лунное серебро) */}
      <W5HelpDialog tabId={tab} open={helpOpen} onClose={() => setHelpOpen(false)} />

      {/* «⇲ МД» — влить «Сводку Гароу» из Obsidian (Markdown) */}
      <W5ImportDialog open={importOpen} onClose={() => setImportOpen(false)} onApplyMarkdown={applyMarkdownW5} />

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
// ДОСЬЕ ГАРОУ — карточка-поповер из витальной строки: Слава/Ранг,
// Дары и Обряды, Опыт — одним взглядом, без ухода со вкладки.
// ============================================================

const W5_RANK_LADDER: { min: number; title: string }[] = [
  { min: 0, title: "Щенок" },
  { min: 1, title: "Клиаит" },
  { min: 3, title: "Фостерн" },
  { min: 6, title: "Адурен" },
  { min: 9, title: "Старейшина" },
  { min: 12, title: "Старейшина вождей" },
];

function W5DossierPop({
  data,
  rank,
  renownTotal,
  onClose,
  onGo,
  onPrint,
}: {
  data: W5SheetData;
  rank: { rank: number; title: string };
  renownTotal: number;
  onClose: () => void;
  onGo: (tab: W5Tab) => void;
  onPrint: () => void;
}) {
  const dots = (n: number) => "●".repeat(Math.max(0, n)) + "○".repeat(Math.max(0, 5 - n));
  const gifts = data.gifts;
  const giftsAbove = gifts.filter((g) => g.level > w5GiftLevelCap(rank.rank)).length;
  const lastXp = (data.xpLog || [])[0];
  const xpLogCount = (data.xpLog || []).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="vtm-dossier-pop"
      role="dialog"
      aria-label="Досье Гароу — сводка Славы, Даров и опыта"
    >
      <div className="vtm-dossier-pop-head">
        <span className="vtm-label !text-[0.7rem] uppercase tracking-[0.24em] text-[#c9d3e8]">🐺 Досье Гароу</span>
        <span className="vtm-w5-rank-chip" title="Ранг растёт со Славой (1+3+…+3)">
          Слава {renownTotal} — {rank.title}
        </span>
        <button className="vtm-btn vtm-btn-ghost !py-0.5 !px-2 !text-[0.72rem]" onClick={onClose} aria-label="Свернуть досье">✕</button>
      </div>

      <div className="vtm-dossier-pop-grid">
        {/* Слава: три линии точками */}
        <div className="vtm-dossier-pop-cell">
          <p className="vtm-dossier-pop-label">Слава</p>
          <p className="vtm-dossier-pop-row" title="Гордец: подвиги, охота, боевые деяния">
            <span>Гордец</span> <b>{dots(data.trackers.glory)}</b>
          </p>
          <p className="vtm-dossier-pop-row" title="Честь: слово, долг, справедливость">
            <span>Честь</span> <b>{dots(data.trackers.honor)}</b>
          </p>
          <p className="vtm-dossier-pop-row" title="Мудрость: духи, сдержанность, знание">
            <span>Мудрость</span> <b>{dots(data.trackers.wisdom)}</b>
          </p>
          <p className="vtm-dossier-pop-ladder">
            {W5_RANK_LADDER.map((s, i) => (
              <span key={s.title} className={i === rank.rank ? "cur" : i < rank.rank ? "past" : ""}>{s.title}</span>
            ))}
          </p>
        </div>

        {/* Дары и Обряды */}
        <div className="vtm-dossier-pop-cell">
          <p className="vtm-dossier-pop-label">Дары и духи</p>
          {gifts.length ? (
            <>
              {gifts.slice(0, 4).map((g) => (
                <p key={g.id} className="vtm-dossier-pop-row" title={g.note || undefined}>
                  <span className="truncate">{g.name}</span> <b>{g.level} ур.</b>
                </p>
              ))}
              {gifts.length > 4 && <p className="vtm-dossier-pop-more">…и ещё {gifts.length - 4} {gifts.length - 4 === 1 ? "дар" : "даров"}</p>}
              {giftsAbove > 0 && <p className="vtm-dossier-pop-warn">⚠ {giftsAbove} {giftsAbove === 1 ? "Дар выше" : "Даров выше"} ранга — духи потребуют Славы</p>}
            </>
          ) : (
            <p className="vtm-dossier-pop-more">духов пока никто не просил</p>
          )}
          {data.rites.length > 0 && <p className="vtm-dossier-pop-more">⚱ Обряды: {data.rites.length}</p>}
        </div>

        {/* Опыт */}
        <div className="vtm-dossier-pop-cell">
          <p className="vtm-dossier-pop-label">Опыт</p>
          <p className="vtm-dossier-pop-row">
            <span>свободно</span> <b>{data.trackers.xp}</b>
          </p>
          <p className="vtm-dossier-pop-row">
            <span>вложено</span> <b>{data.trackers.xpSpent}</b>
          </p>
          {lastXp && (
            <p className="vtm-dossier-pop-more" title={lastXp.text}>
              ↳ {lastXp.text.length > 44 ? `${lastXp.text.slice(0, 44)}…` : lastXp.text}
              {xpLogCount > 1 && ` (в журнале ${xpLogCount})`}
            </p>
          )}
        </div>
      </div>

      <div className="vtm-dossier-pop-foot">
        <button className="vtm-btn vtm-btn-ghost !py-1 !px-2.5 !text-[0.72rem]" onClick={() => onGo("tracks")}>
          🩸 Все треки →
        </button>
        <button className="vtm-btn vtm-btn-ghost !py-1 !px-2.5 !text-[0.72rem]" onClick={() => onGo("gifts")}>
          ◈ Дары и Обряды →
        </button>
        <button
          className="vtm-btn vtm-btn-ghost !py-1 !px-2.5 !text-[0.72rem] vtm-dossier-print"
          onClick={onPrint}
          title="Печать досье на одну страницу — карточку для стола Рассказчика"
          aria-label="Печать досье для стола"
        >
          🖨 Досье для стола
        </button>
      </div>
    </motion.div>
  );
}

// ============================================================
// Вкладка ЛИЧНОСТЬ
// ============================================================

function W5IdentityTab({
  data,
  mutate,
  onRoll,
}: {
  data: W5SheetData;
  mutate: (fn: (d: W5SheetData) => void) => void;
  onRoll: (pool: number, label: string, opts?: { damage?: boolean }) => void;
}) {
  const tribe = W5_TRIBE_BY_ID.get(data.info.tribe);
  const auspice = W5_AUSPICE_BY_ID.get(data.info.auspice);
  const activeFormId = data.info.activeForm || "hishu";
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
                    else list[i] = { id: vtmUid("asp"), text: e.target.value.slice(0, 200) };
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
                    else list[i] = { id: vtmUid("tst"), text: e.target.value.slice(0, 200) };
                    d.touchstones = list.filter((x) => x.text);
                  })}
                  placeholder={["младшая сестра", "старый учитель в лесу", "бар на окраине"][i]}
                  aria-label={`Касание ${i + 1}`}
                />
              </div>
            ))}
          </div>
        </section>

        <section className="vtm-panel" aria-label="Облик дня — пять обликов">
          <div className="vtm-panel-head">
            <span className="vtm-label text-[0.81rem] text-[#c9d3e8]">Облик дня</span>
            <span className="vtm-hint !text-[0.7rem] ml-auto">клик — сменить облик; модификаторы живут в бросках</span>
          </div>
          <div className="p-3 space-y-2">
            {W5_FORMS.map((f) => {
              const active = activeFormId === f.id;
              const mods = w5FormMods(f.id);
              const modChips = Object.entries(mods)
                .map(([k, v]) => `${ATTR_SHORT[k as keyof W5SheetData["attributes"]]} ${v > 0 ? `+${v}` : v}`)
                .join(" · ");
              return (
                <div key={f.id} className={`vtm-form-card ${active ? "active" : ""}`}>
                  <button
                    type="button"
                    className="vtm-form-card-btn"
                    onClick={() => mutate((d) => { d.info.activeForm = active ? undefined : f.id; })}
                    aria-pressed={active}
                    aria-label={`Облик ${f.name} (${f.ru})${active ? " — активен" : ""}`}
                    title={active ? "Активный облик — клик вернёт в Хишу" : "Клик — принять этот облик"}
                  >
                    <span className="vtm-form-card-name">
                      {f.id === "hishu" ? "🚶" : f.id === "crinos" ? "🐺" : f.id === "lupus" ? "🐺" : f.id === "hispo" ? "🐺" : "💪"} {f.name}
                      <span className="vtm-form-card-ru"> · {f.ru}</span>
                    </span>
                    {modChips && <span className="vtm-form-chips">{modChips}</span>}
                    {active && <span className="vtm-form-card-mark" aria-hidden>✦ активен</span>}
                  </button>
                  <p className="vtm-form-card-note">{f.note}</p>
                </div>
              );
            })}
            {activeFormId !== "hishu" && (
              <p className="vtm-form-warn" role="note">
                ⚠ Броски берут модифицированные характеристики (сердечко 🐾 в подписи). {activeFormId === "crinos" && "Кринос: каждый ход без убитого — 1 Воля. Смена облика — проверка Ярости."}
              </p>
            )}
            <p className="vtm-hint !text-[0.72rem]">
              Модификаторы — адаптация классики (W20 → девять лун W5): сверяй таблицу с Рассказчиком. Клик по названию характеристики ниже — бросок с учётом облика.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                className="vtm-btn vtm-btn-ghost !py-1.5 !px-3 !text-[0.76rem]"
                onClick={() => onRoll(w5EffAttr(data, "str") + w5EffAttr(data, "sta"), "Удержать облик (Сила + Стойкость)")}
                title="Проверка смены/удержания облика по решению Рассказчика"
              >
                🐾 Проверка облика (СИЛ + СТК)
              </button>
            </div>
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
  onRoll,
}: {
  data: W5SheetData;
  mutate: (fn: (d: W5SheetData) => void) => void;
  attrPairs: { key: keyof W5SheetData["attributes"]; label: string }[];
  attrTotal: number;
  onRoll: (pool: number, label: string, opts?: { damage?: boolean }) => void;
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
          {attrPairs.map(({ key, label }) => {
            const eff = w5EffAttr(data, key);
            const mod = eff - (data.attributes[key] || 0);
            return (
              <div key={key} className="vtm-frame rounded-md p-2.5 flex flex-col items-center gap-2" style={{ background: "rgba(0,0,0,0.2)" }}>
                <button
                  className="vtm-label text-[0.72rem] text-[#c4ac9d] vtm-w5-roll-name"
                  onClick={() => onRoll(eff, `${label} ${data.attributes[key]}${mod ? ` ${mod > 0 ? "+" : "−"}${Math.abs(mod)}` : ""}`)}
                  title={`Бросить пул: ${label} ${eff} (в облике) + кости Ярости`}
                  aria-label={`Бросок ${label}`}
                >
                  {label}{mod !== 0 && <span className="vtm-form-mod-mark" aria-hidden> {mod > 0 ? `+${mod}` : mod}</span>}
                </button>
                <Dots value={data.attributes[key]} color="moon" onChange={(n) => mutate((d) => {
                  const prev = d.attributes[key];
                  if (n > prev) pushW5XpLog(d, `покупка: «${label}» ↑ до ${n} — цена ${W5_XP_COSTS.attribute(n)} опыта (сверься с Рассказчиком)`);
                  d.attributes[key] = n;
                })} ariaLabel={`${label}: уровень ${data.attributes[key]}`} />
                {mod !== 0 && <span className="vtm-hint !text-[0.66rem] not-italic text-[#8ea6c9]">в облике: {eff}</span>}
              </div>
            );
          })}
        </div>
        <p className="vtm-hint !text-[0.75rem] px-4 pb-3">
          Распределение по правилам: одна 4, три по 3, четыре по 2, одна 1. Клик по названию — бросок пула: характеристика (с учётом облика) + кости Ярости. Смена облика требует проверки Ярости.
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
  onRoll,
}: {
  data: W5SheetData;
  mutate: (fn: (d: W5SheetData) => void) => void;
  attrPairs: { key: keyof W5SheetData["attributes"]; label: string }[];
  onRoll: (pool: number, label: string, opts?: { damage?: boolean }) => void;
}) {
  const [openSpecs, setOpenSpecs] = useState<Record<string, boolean>>({});
  const skillValue = (id: string) => data.skills.find((s) => s.id === id);
  const setSkill = (id: string, patch: Partial<{ value: number; spec: string }>) => {
    mutate((d) => {
      const def = SKILL_LIBRARY.find((s) => s.id === id);
      const skillName = def?.name || id;
      const existing = d.skills.find((s) => s.id === id);
      if (existing) {
        if (patch.value !== undefined && patch.value > existing.value) {
          pushW5XpLog(d, `покупка: «${skillName}» ↑ до ${patch.value} — цена ${W5_XP_COSTS.skill(patch.value)} опыта (сверься с Рассказчиком)`);
        }
        if (patch.spec !== undefined && patch.spec.trim() && !(existing.spec || "").trim()) {
          pushW5XpLog(d, `специализация: «${patch.spec.trim()}» (${skillName}) — цена ${W5_XP_COSTS.specialization} опыта`);
        }
        Object.assign(existing, patch);
      } else {
        if (patch.value !== undefined && patch.value > 0) {
          pushW5XpLog(d, `покупка: «${skillName}» ↑ до ${patch.value} — цена ${W5_XP_COSTS.skill(patch.value)} опыта (сверься с Рассказчиком)`);
        }
        d.skills.push({ id, value: 0, spec: "", ...patch });
      }
    });
  };
  // Пара по умолчанию для проверки (упрощённо: ментальные от Интеллекта и т.д.)
  const defaultAttr: Record<string, string> = { physical: "ЛОВ", social: "ОБА", mental: "ИНТ" };
  const defaultAttrKey: Record<string, keyof W5SheetData["attributes"]> = { physical: "dex", social: "cha", mental: "int" };

  const groups: ("physical" | "social" | "mental")[] = ["physical", "social", "mental"];
  return (
    <div className="space-y-4">
      <p className="vtm-hint !text-[0.78rem] vtm-panel p-3">
        Клик по точке — уровень (0–5). Клик по названию навыка — бросок: характеристика + навык + кости Ярости, успех на 6+. Поле специализации скрыто — раскрой его кнопкой «◈ спец».
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {groups.map((g) => (
          <section key={g} className="vtm-panel" aria-label={`Навыки: ${GROUP_LABELS[g]}`}>
            <div className="vtm-panel-head"><span className="vtm-label text-[0.8rem] text-[#c9d3e8]">{GROUP_LABELS[g]}</span></div>
            <div className="p-3 space-y-1.5 max-h-[560px] overflow-y-auto overflow-x-hidden vtm-scroll">
              {SKILL_LIBRARY.filter((s) => s.group === g).map((s) => {
                const st = skillValue(s.id);
                const value = st?.value || 0;
                const effAttr = w5EffAttr(data, defaultAttrKey[g]);
                return (
                  <div key={s.id} className="vtm-w5-skill-row">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        className="vtm-label text-[0.84rem] text-[#d9c7b6] flex-1 min-w-[100px] text-left vtm-w5-roll-name"
                        title={`Бросить: ${defaultAttr[g]} ${effAttr} + ${s.name} ${value} + кости Ярости`}
                        onClick={() => onRoll(effAttr + value, `${s.name}${st?.spec ? ` (${st.spec})` : ""}`)}
                        aria-label={`Бросок ${s.name}`}
                      >
                        {s.name}
                      </button>
                      <span className="vtm-hint !text-[0.64rem] not-italic text-[#8ea6c9]">{defaultAttr[g]}</span>
                      <Dots value={value} color="moon" onChange={(n) => setSkill(s.id, { value: n })} ariaLabel={`${s.name}: уровень ${value}`} />
                    </div>
                    {value > 0 && (
                      openSpecs[s.id] ? (
                        <div className="flex items-center gap-1.5 mt-1">
                          <input
                            className="vtm-input !py-0.5 !text-[0.78rem] flex-1 min-w-0"
                            value={st?.spec || ""}
                            autoFocus
                            onChange={(e) => setSkill(s.id, { spec: e.target.value.slice(0, 80) })}
                            onKeyDown={(e) => {
                              if (e.key === "Escape" || e.key === "Enter") {
                                e.preventDefault();
                                setOpenSpecs((m) => ({ ...m, [s.id]: false }));
                              }
                            }}
                            placeholder={`специализация: ${s.specExamples.slice(0, 2).join(", ")}`}
                            aria-label={`Специализация ${s.name}`}
                          />
                          <button
                            type="button"
                            className="vtm-btn vtm-btn-ghost !py-0.5 !px-1.5 !text-[0.7rem] shrink-0"
                            onClick={() => setOpenSpecs((m) => ({ ...m, [s.id]: false }))}
                            aria-label="Свернуть поле специализации"
                            title="Свернуть поле специализации"
                          >
                            ▴
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {st?.spec && <p className="vtm-hint !text-[0.72rem] italic">«{st.spec}»</p>}
                          <button
                            type="button"
                            className="vtm-btn vtm-btn-ghost !py-0.5 !px-1.5 !text-[0.68rem]"
                            onClick={() => setOpenSpecs((m) => ({ ...m, [s.id]: true }))}
                            aria-expanded={false}
                            aria-label={`Раскрыть специализацию: ${s.name}`}
                            title={st?.spec ? `Специализация: «${st.spec}» — нажми, чтобы изменить` : "Раскрыть поле специализации"}
                          >
                            {st?.spec ? "✎ спец" : "◈ спец"}
                          </button>
                        </div>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      <p className="vtm-hint !text-[0.72rem] text-center">
        Пулы по умолчанию: физика — Ловкость или Сила, социалка — Обаяние или Манипуляция, ментал — Интеллект или Смекалка. Точную пару на проверку называет Рассказчик.
      </p>
    </div>
  );
}

// ============================================================
// Вкладка ДАРЫ И ОБРЯДЫ
// ============================================================

function W5GiftsTab({ data, mutate, onRoll }: { data: W5SheetData; mutate: (fn: (d: W5SheetData) => void) => void; onRoll: (pool: number, label: string, opts?: { damage?: boolean }) => void }) {
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

  // Ранг по Славе и потолок Даров: уровень Дара ≈ рангу (щенок — только 1-й уровень)
  const rank = w5Rank(data.trackers.glory, data.trackers.honor, data.trackers.wisdom);
  const giftCap = w5GiftLevelCap(rank.rank);

  const addGift = (defId: string) => {
    const def = W5_GIFT_LIBRARY.find((g) => g.id === defId);
    if (!def) return;
    if (data.gifts.some((g) => g.name === def.name)) {
      toast.error("Этот Дар уже на листе");
      return;
    }
    mutate((d) => {
      d.gifts.push({ id: vtmUid(`g-lib-${def.id}`), name: def.name, level: def.level, note: def.desc });
      pushW5XpLog(d, `Дар «${def.name}» (${def.level} ур.) вырван у духов — цена ${W5_XP_COSTS.gift(def.level)} опыта (сверься с Рассказчиком)`);
    });
    if (def.level > giftCap) {
      toast.warning(`Дар ${def.level} ур. выше ранга (${rank.title}) — духи могут не отвечать`, { description: "Обучение таких Даров требует Славы: сверься с Рассказчиком." });
    } else {
      toast(`Дар «${def.name}» вырван у духов`);
    }
  };

  const addCustomGift = () => {
    const name = customGiftName.trim();
    if (!name) return;
    if (data.gifts.some((g) => g.name.toLowerCase() === name.toLowerCase())) {
      toast.error("Такой Дар уже есть");
      return;
    }
    const lvl = Math.max(1, Math.min(5, customGiftLvl));
    mutate((d) => {
      d.gifts.push({ id: vtmUid("g-custom"), name, level: lvl, note: "" });
      pushW5XpLog(d, `свой Дар «${name}» (${lvl} ур.) — цена ${W5_XP_COSTS.gift(lvl)} опыта (сверься с Рассказчиком)`);
    });
    if (lvl > giftCap) {
      toast.warning(`Дар ${lvl} ур. выше ранга (${rank.title}) — сверься с Рассказчиком`);
    }
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
      d.rites.push({ id: vtmUid(`r-lib-${def.id}`), name: def.name, level: def.level, note: def.desc });
      pushW5XpLog(d, `Обряд «${def.name}» (${def.level} ур.) — цена ${W5_XP_COSTS.rite(def.level)} опыта (сверься с Рассказчиком)`);
    });
  };

  return (
    <div className="space-y-4">
      {/* Мои дары */}
      <section className="vtm-panel" aria-label="Дары на листе">
        <div className="vtm-panel-head">
          <span className="vtm-label text-[0.81rem] text-[#c9d3e8]">Мои Дары</span>
          <span className="vtm-hint !text-[0.72rem] ml-auto">
            {data.gifts.length} даров · ранг «{rank.title}» — Дары до {giftCap} ур. · 🎲 — проверка Дара
          </span>
        </div>
        <div className="p-3 space-y-2 max-h-[420px] overflow-y-auto overflow-x-hidden vtm-scroll">
          {data.gifts.length === 0 && (
            <p className="vtm-hint text-center py-3">Духов ещё не задобрил. Возьми из каталога ниже — или впиши свой.</p>
          )}
          {data.gifts.map((g) => (
            <div key={g.id} className={`vtm-frame rounded-md p-2.5 space-y-1.5 ${g.level > giftCap ? "vtm-gift-above-rank" : ""}`} style={{ background: "rgba(0,0,0,0.22)" }}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="vtm-label text-[0.66rem] text-[#8ea6c9] shrink-0">{g.level} ур.</span>
                <span className="text-[0.9rem] text-[#d9c7b6] flex-1 min-w-[120px]">{g.name}</span>
                <button
                  className="vtm-btn vtm-btn-ghost !p-1 !text-[0.72rem] vtm-w5-gift-roll"
                  onClick={() => onRoll(g.level, `Дар: «${g.name}» (${g.level} ур.)`)}
                  aria-label={`Бросок для дара ${g.name}`}
                  title={`Проверка Дара, если Рассказчик запросил: ${g.level} костей + ${data.trackers.rage} костей Ярости`}
                >
                  🎲
                </button>
                <Dots value={g.level} max={5} color="moon" onChange={(n) => mutate((d) => {
                  const x = d.gifts.find((y) => y.id === g.id);
                  if (!x) return;
                  if (n > x.level) pushW5XpLog(d, `Дар «${x.name}» ↑ до ${n} ур. — цена ${W5_XP_COSTS.gift(n)} опыта (сверься с Рассказчиком)`);
                  x.level = n;
                })} ariaLabel={`${g.name}: уровень ${g.level}`} />
                <button className="vtm-btn vtm-btn-ghost !p-1 !text-[0.72rem] vtm-confirm-del" onClick={() => mutate((d) => { d.gifts = d.gifts.filter((y) => y.id !== g.id); })} aria-label={`Убрать дар ${g.name}`}>✕</button>
              </div>
              {g.level > giftCap && (
                <p className="vtm-gift-rank-warn" role="note">
                  ⚠ {g.level} ур. выше ранга «{rank.title}» (Слава {data.trackers.glory + data.trackers.honor + data.trackers.wisdom}): духи требуют Славы — сверься с Рассказчиком.
                </p>
              )}
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
            const aboveRank = g.level > giftCap;
            return (
              <div key={g.id} className={`vtm-disc-cat ${taken ? "taken" : ""} ${aboveRank ? "above-rank" : ""}`}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="vtm-label text-[0.66rem] text-[#8ea6c9] shrink-0">{g.level} ур.</span>
                  <span className="vtm-label text-[0.8rem] flex-1 min-w-[120px]">{g.name}</span>
                  <span className="vtm-hint !text-[0.64rem] not-italic">{sourceLabel(g.source)}</span>
                  {aboveRank && <span className="vtm-w5-rank-chip" title={`Ранг «${rank.title}» положен Дары до ${giftCap} ур.`}>выше ранга</span>}
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
                  <Dots value={r.level} max={4} color="moon" onChange={(n) => mutate((d) => {
                    const x = d.rites.find((y) => y.id === r.id);
                    if (!x) return;
                    if (n > x.level) pushW5XpLog(d, `Обряд «${x.name}» ↑ до ${n} ур. — цена ${W5_XP_COSTS.rite(n)} опыта (сверься с Рассказчиком)`);
                    x.level = n;
                  })} ariaLabel={`Уровень обряда ${r.name}`} />
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
                  const rn = customRiteName.trim();
                  const rl = customRiteLvl;
                  mutate((d) => {
                    d.rites.push({ id: vtmUid("r-custom"), name: rn, level: rl, note: "" });
                    pushW5XpLog(d, `свой Обряд «${rn}» (${rl} ур.) — цена ${W5_XP_COSTS.rite(rl)} опыта`);
                  });
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
                const rn = customRiteName.trim();
                if (!rn) return;
                const rl = customRiteLvl;
                mutate((d) => {
                  d.rites.push({ id: vtmUid("r-custom"), name: rn, level: rl, note: "" });
                  pushW5XpLog(d, `свой Обряд «${rn}» (${rl} ур.) — цена ${W5_XP_COSTS.rite(rl)} опыта`);
                });
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
              <button
                className="vtm-btn vtm-btn-ghost !py-1 !px-2.5 !text-[0.74rem] shrink-0"
                onClick={() => vtmW5RageCheckAndShow("по листу")}
                title="Одна кость: успех 6+ — Ярость не меняется, провал — Ярость −1"
              >
                🌕 Проверка Ярости
              </button>
              <span className="vtm-hint !text-[0.72rem]">0 — волк потерян</span>
            </div>
            {data.trackers.rage >= 5 && (
              <p className="vtm-req vtm-label !text-[0.7rem]" role="note">
                ⚠ Ярость 5 — Смертельная Ярость на волоске: любая провокация может бросить в безумие Криноса.
              </p>
            )}
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
            <W5DamageBar data={data} mutate={mutate} healthMax={healthMax} />
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
                <Dots value={data.trackers[key]} color="moon" onChange={(n) => mutate((d) => {
                  const prev = d.trackers[key];
                  if (n > prev) pushW5XpLog(d, `Слава «${label}» ↑ до ${n} — по решению Рассказчика (Славой не торгуют)`);
                  d.trackers[key] = n;
                })} ariaLabel={`${label}: ${data.trackers[key]}`} />
                <span className="vtm-hint !text-[0.7rem] flex-1">{hint}</span>
              </div>
            ))}
            <p className="vtm-hint !text-[0.75rem]">
              Ранг растёт со Славой: 1 — Клиаит, 2 — Фостерн, 3 — Адурен, 4 — Старейшина, 5 — Старейшина вождей. Высокая Слава — и мишень тоже.
            </p>
          </div>
        </section>

        <section className="vtm-panel" aria-label="Опыт">
          <div className="vtm-panel-head">
            <span className="vtm-label text-[0.81rem] text-[#c9d3e8]">Опыт</span>
            <span className="vtm-hint !text-[0.72rem] ml-auto">свободно {data.trackers.xp} · вложено {data.trackers.xpSpent}</span>
          </div>
          <div className="p-3 md:p-4">
            <W5XpBlock data={data} mutate={mutate} />
          </div>
        </section>
      </div>
    </div>
  );
}

// ============================================================
// ОПЫТ ГАРОУ — счётчики + журнал покупок (pushW5XpLog).
// Покупки характеристик/навыков/Даров/Обрядов падают в журнал сами,
// очки не списываются — цену сверяет Рассказчик.
// ============================================================

function W5XpBtn({ onClick, title, disabled, children }: { onClick: () => void; title: string; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="vtm-btn vtm-btn-ghost !py-1 !px-2 !text-[0.72rem] vtm-xp-btn"
    >
      {children}
    </button>
  );
}

function W5XpBlock({
  data,
  mutate,
}: {
  data: W5SheetData;
  mutate: (fn: (draft: W5SheetData) => void) => void;
}) {
  const gain = (n: number) =>
    mutate((d) => {
      d.trackers.xp = Math.max(0, Math.min(999, d.trackers.xp + n));
      pushW5XpLog(d, `+${n} опыта — свободно ${d.trackers.xp}`);
    });

  const refund = (n: number) =>
    mutate((d) => {
      d.trackers.xp = Math.max(0, d.trackers.xp - n);
      pushW5XpLog(d, `−${n} свободного опыта (возврат/ошибка) — свободно ${d.trackers.xp}`);
    });

  const spend = (n: number) =>
    mutate((d) => {
      if (d.trackers.xp < n) return;
      d.trackers.xp -= n;
      d.trackers.xpSpent = Math.min(999, d.trackers.xpSpent + n);
      pushW5XpLog(d, `потрачено ${n} опыта — впиши покупку в Заметки · свободно ${d.trackers.xp}, вложено ${d.trackers.xpSpent}`);
    });

  const unspend = (n: number) =>
    mutate((d) => {
      d.trackers.xpSpent = Math.max(0, d.trackers.xpSpent - n);
      d.trackers.xp = Math.min(999, d.trackers.xp + n);
      pushW5XpLog(d, `возврат ${n} опыта из вложенного — свободно ${d.trackers.xp}, вложено ${d.trackers.xpSpent}`);
    });

  const log = data.xpLog || [];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1">
        <W5XpBtn onClick={() => gain(1)} title="Получен 1 опыт">+1</W5XpBtn>
        <W5XpBtn onClick={() => gain(3)} title="Получено 3 опыта">+3</W5XpBtn>
        <W5XpBtn onClick={() => gain(5)} title="Получено 5 опыта">+5</W5XpBtn>
        <span className="text-[#23303f] select-none" aria-hidden>|</span>
        <W5XpBtn onClick={() => spend(1)} title="Потратить 1 опыта" disabled={data.trackers.xp < 1}>−1</W5XpBtn>
        <W5XpBtn onClick={() => spend(5)} title="Потратить 5 опыта" disabled={data.trackers.xp < 5}>−5</W5XpBtn>
        <W5XpBtn onClick={() => spend(10)} title="Потратить 10 опыта" disabled={data.trackers.xp < 10}>−10</W5XpBtn>
        <span className="text-[#23303f] select-none" aria-hidden>|</span>
        <W5XpBtn onClick={() => refund(1)} title="Откатить 1 свободного" disabled={data.trackers.xp < 1}>↺1</W5XpBtn>
        <W5XpBtn onClick={() => unspend(5)} title="Вернуть 5 вложенных в свободные" disabled={data.trackers.xpSpent < 5}>⌂5</W5XpBtn>
      </div>
      {log.length > 0 && (
        <div className="vtm-xp-log mt-2.5" aria-label="Журнал опыта">
          <p className="vtm-xp-log-head vtm-label !text-[0.66rem] uppercase tracking-[0.2em]">Журнал опыта</p>
          <div className="max-h-28 overflow-y-auto vtm-scroll pr-1">
            {log.slice(0, 10).map((e) => (
              <p key={e.id} className="vtm-xp-log-row !text-[0.73rem]">
                {new Date(e.ts).toLocaleString("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })} · {e.text}
              </p>
            ))}
          </div>
        </div>
      )}
      <p className="vtm-hint mt-2 !text-[0.73rem]">
        Цены: луна 5×ур · навык 3×ур · специализация 3 · Дар 3×ур · Обряд 2×ур.
        Покупки лун, навыков, специализаций, Даров и Обрядов сами падают в журнал — очки не списываются, цену сверяет Рассказчик.
        Слава опытом не покупается — только подвигами.
      </p>
    </div>
  );
}

// ============================================================
// БАРО УРОНА — серия бросков урона с применением к шкале Здоровья.
// Жестокий исход (+4 на уроне по W5) считает сама кость (rollW5Pool).
// ============================================================

interface W5DamageResult {
  label: string;
  roll: W5RollResult;    // полный бросок: перебросы волей из панели обновляют его по uid
  total: number;         // пул
  ts: number;
}

function W5DamageBar({
  data,
  mutate,
  healthMax,
}: {
  data: W5SheetData;
  mutate: (fn: (d: W5SheetData) => void) => void;
  healthMax: number;
}) {
  const [last, setLast] = useState<W5DamageResult | null>(null);
  const [custom, setCustom] = useState("");
  // Живой итог: если в панели костей перебросили волей именно ЭТОТ бросок
  // (uid сохраняется при перебросе — «каждая кость один раз» по правилам W5),
  // серия урона честно берёт свежий итог. Иначе — свой последний результат.
  const panelRoll = useVtmDice((s) => s.w5last);
  const live = last && panelRoll && last.roll.uid && panelRoll.uid === last.roll.uid ? panelRoll : last?.roll;
  const successes = live?.totalSuccesses ?? 0;
  const brutalDamage = !!live?.brutalDamage;
  const rerollsHappened = !!live?.dice.some((d) => d.rerolled);
  const rerollable = !!live?.dice.some((d) => !d.rage && !d.rerolled);

  const brawlVal = data.skills.find((s) => s.id === "brawl")?.value || 0;
  const meleeVal = data.skills.find((s) => s.id === "melee")?.value || 0;
  const clawsPool = w5EffAttr(data, "str") + brawlVal;
  const weaponPool = w5EffAttr(data, "str") + meleeVal;
  const freeCap = Math.max(0, healthMax - data.trackers.healthSup - data.trackers.healthAgg);

  const doRoll = (pool: number, label: string) => {
    const r = vtmW5RollAndShow(Math.max(1, pool), data.trackers.rage, label, { damage: true });
    setLast({ label, roll: r, total: pool, ts: Date.now() });
  };

  const rollCustom = () => {
    const p = Math.max(1, Math.min(30, Math.floor(Number(custom) || 0)));
    if (!p) return;
    doRoll(p, `Урон (пул ${p})`);
  };

  const applyDamage = (kind: "sup" | "agg") => {
    if (!last || successes <= 0) return;
    const n = successes;
    const freeBefore = Math.max(0, healthMax - data.trackers.healthSup - data.trackers.healthAgg);
    const applied = Math.min(n, freeBefore);
    mutate((d) => {
      const max = w5HealthMax(d);
      if (kind === "sup") {
        d.trackers.healthSup = Math.min(d.trackers.healthSup + n, max - d.trackers.healthAgg);
      } else {
        d.trackers.healthAgg = Math.min(d.trackers.healthAgg + n, max - d.trackers.healthSup);
      }
      d.rollLog = [{
        id: vtmUid("roll"),
        text: `Урон «${last.label}${rerollsHappened ? " ⟲волей" : ""}» → ${applied < n ? `+${applied} из ${n}` : `+${n}`} ${kind === "sup" ? "поверхностных" : "тяжёлых"} ран (свободно клеток было ${freeBefore})`,
        ts: new Date().toISOString(),
      }, ...d.rollLog].slice(0, 60);
    });
    setLast(null);
    toast.success(applied < n ? `+${applied} из ${n} ран (шкала полна)` : kind === "sup" ? `+${n} поверхностных ран` : `+${n} тяжёлых ран`);
  };

  return (
    <div className="vtm-damage-bar">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="vtm-label text-[0.72rem] text-[#e8636b]">⚔ Серия урона</span>
        <button
          className="vtm-btn vtm-btn-ghost !py-1 !px-2.5 !text-[0.72rem]"
          onClick={() => doRoll(clawsPool, `Когти (СИЛ ${w5EffAttr(data, "str")} + Драка ${brawlVal})`)}
          title={`Пул: Сила ${w5EffAttr(data, "str")} + Драка ${brawlVal} + кости Ярости; Жестокий исход на уроне даёт +4 успеха`}
        >
          🎲 Когти ({clawsPool})
        </button>
        <button
          className="vtm-btn vtm-btn-ghost !py-1 !px-2.5 !text-[0.72rem]"
          onClick={() => doRoll(weaponPool, `Оружие (СИЛ ${w5EffAttr(data, "str")} + Холодное ${meleeVal})`)}
          title={`Пул: Сила ${w5EffAttr(data, "str")} + Холодное оружие ${meleeVal} + кости Ярости`}
        >
          🎲 Оружие ({weaponPool})
        </button>
        <span className="flex items-center gap-1">
          <input
            className="vtm-input !py-1 !text-[0.74rem] !w-14 text-center"
            value={custom}
            onChange={(e) => setCustom(e.target.value.replace(/[^\d]/g, "").slice(0, 2))}
            placeholder="пул"
            aria-label="Свой пул урона"
            onKeyDown={(e) => e.key === "Enter" && rollCustom()}
          />
          <button className="vtm-btn vtm-btn-ghost !py-1 !px-2.5 !text-[0.72rem]" onClick={rollCustom} disabled={!custom} aria-label="Бросить свой пул урона">🎲</button>
        </span>
      </div>
      {last && (
        <div className="vtm-damage-result">
          <span className={`vtm-label text-[0.78rem] ${successes > 0 ? "text-[#d6a840]" : "text-[#c4ac9d]"}`}>
            {last.label}{rerollsHappened ? " ⟲волей" : ""}: {brutalDamage ? "ЖЕСТОКИЙ УСПЕХ · " : ""}{successes} успехов
          </span>
          <span className="flex gap-1.5 flex-wrap">
            <button
              className="vtm-btn !py-1 !px-2.5 !text-[0.72rem]"
              onClick={() => applyDamage("sup")}
              disabled={successes <= 0}
              title={`Добавить ${successes} поверхностных ран (свободно ${freeCap})`}
            >
              + поверхностный
            </button>
            <button
              className="vtm-btn vtm-btn-blood !py-1 !px-2.5 !text-[0.72rem]"
              onClick={() => applyDamage("agg")}
              disabled={successes <= 0}
              title={`Добавить ${successes} тяжёлых ран (свободно ${freeCap})`}
            >
              + тяжёлый
            </button>
            {rerollable && (
              <button
                className="vtm-btn vtm-btn-ghost !py-1 !px-2.5 !text-[0.72rem] vtm-damage-reroll"
                onClick={() => useVtmDice.getState().setOpen(true)}
                title="Перебросить кости волей (1 пункт): выбери до 3 обычных костей в панели «Кости Луны» — кости Ярости и уже переброшенные волей не берутся"
              >
                ⟲ волей
              </button>
            )}
            <button className="vtm-btn vtm-btn-ghost !py-1 !px-2 !text-[0.72rem]" onClick={() => setLast(null)} aria-label="Сбросить бросок урона">✕</button>
          </span>
        </div>
      )}
      <p className="vtm-hint !text-[0.7rem]">
        Успех на 6+; две десятки — крит; Жестокий исход (2+ кости Ярости на 1–2) на уроне даёт +4 успеха. «⟲ волей» — до 3 обычных костей за пункт Воли, каждая кость перебрасывается один раз за серию. Пустых клеток: {freeCap}.
      </p>
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
    mutate((d) => { d.gear.push({ id: vtmUid("gear"), name: n, count: "1", note: "" }); });
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
        id: vtmUid("note"),
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
        {/* Хроника бросков — как у Сородичей, живёт в самом листе */}
        {data.rollLog.length > 0 && (
          <div className="p-3 border-t border-[#2b1116]">
            <p className="vtm-label text-[0.74rem] text-[#8ea6c9] mb-1.5">Хроника бросков · {data.rollLog.length}</p>
            <div className="max-h-40 overflow-y-auto vtm-scroll pr-1">
              {data.rollLog.map((e) => (
                <p key={e.id} className="vtm-roll-row !text-[0.73rem]">
                  {new Date(e.ts).toLocaleString("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })} · {e.text}
                </p>
              ))}
            </div>
          </div>
        )}
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
