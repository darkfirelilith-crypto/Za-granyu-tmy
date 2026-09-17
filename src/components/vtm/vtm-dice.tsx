"use client";

// ============================================================
// Кости «Вампиров: Маскарад» (5 ред.): пул d10, успех на 6+,
// парные 10-ки — критический успех; кости Голода окрашивают исход:
// крит на кости Голода = БЕСПРЕДЕЛЬНЫЙ УСПЕХ, провал при кости
// Голода = ЗВЕРСКИЙ ПРОВАЛ. Плюс испытания Крови (1 кость, успех 6+).
// ============================================================

import { useEffect, useState } from "react";
import { create } from "zustand";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";

// ---------- Кости Гароу (W5): Ярость заменяет кости пула ----------
// По правилам W5: успех на 6+, пара десяток — критический; кость Ярости
// с 1–2 — ЖЕСТОКАЯ: сама не даёт успеха; две и более ЖЕСТОКИХ в одном
// испытании — ЖЕСТОКИЙ ИСХОД (провал с разрушениями; на уроне — наоборот
// +4 успеха). Жестокую кость нельзя перебросить волей.

export interface W5Die {
  value: number;      // 1..10
  rage: boolean;      // кость Ярости
  success: boolean;   // >= 6
  crit: boolean;      // == 10
  brutal: boolean;    // кость Ярости с 1–2
  rerolled?: boolean; // кость уже переброшена волей — второй раз нельзя
}

export interface W5RollResult {
  dice: W5Die[];
  successes: number;      // без Жестоких костей и без бонуса урона
  critPairs: number;
  totalSuccesses: number; // итог (на уроне при Жестоком исходе — с +4)
  brutalCount: number;    // сколько костей 1–2 среди Ярости
  brutalOutcome: boolean; // 2+ Жестоких — испытание провалено/разрушено
  brutalDamage: boolean;  // Жестокий исход на броске урона (+4 успеха)
  pool: number;
  rageDice: number;
  label: string;
  difficulty?: number;
  /** Личность броска: перебросы волей сохраняют uid — по нему серия урона
   *  подхватывает свежий итог из панели костей (каждая кость — один раз). */
  uid?: string;
}

/** Бросок пула Гароу: rage — сколько костей пула являются костями Ярости. */
export function rollW5Pool(pool: number, rage: number, label: string, opts?: { damage?: boolean; difficulty?: number }): W5RollResult {
  const p = Math.max(1, Math.min(40, Math.floor(pool)));
  const r = Math.max(0, Math.min(p, Math.min(5, Math.floor(rage))));
  const uid = `w5-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const dice: W5Die[] = [];
  for (let i = 0; i < p; i++) {
    const value = 1 + Math.floor(Math.random() * 10);
    const isRage = i < r;
    const brutal = isRage && value <= 2;
    dice.push({ value, rage: isRage, success: value >= 6 && !brutal, crit: value === 10, brutal });
  }
  const tens = dice.filter((d) => d.crit).length;
  const critPairs = Math.floor(tens / 2);
  const plain = dice.filter((d) => d.success && !d.crit).length;
  const oddTens = tens % 2;
  const successes = plain + critPairs * 2 + oddTens;
  const brutalCount = dice.filter((d) => d.brutal).length;
  const brutalOutcome = brutalCount >= 2;
  const brutalDamage = brutalOutcome && !!opts?.damage;
  const totalSuccesses = brutalOutcome ? (brutalDamage ? successes + 4 : 0) : successes;
  return {
    dice,
    successes,
    critPairs,
    totalSuccesses,
    brutalCount,
    brutalOutcome,
    brutalDamage,
    pool: p,
    rageDice: r,
    label,
    difficulty: opts?.difficulty,
    uid,
  };
}

/** Проверка Ярости (W5): одна кость — успех 6+ сохраняет Ярость, провал — Ярость −1. */
export function rollW5RageCheck(label: string): { ok: boolean; value: number } {
  const value = 1 + Math.floor(Math.random() * 10);
  return { ok: value >= 6, value };
}

export function describeW5(r: W5RollResult): string {
  const diff = r.difficulty ? ` · порог ≤ ${r.difficulty}` : "";
  if (r.brutalOutcome && r.brutalDamage) return `ЖЕСТОКИЙ УСПЕХ · ${r.totalSuccesses} успехов${diff} — удар разнёс цель в щепки`;
  if (r.brutalOutcome) return `ЖЕСТОКИЙ ИСХОД${diff} — провал, и что-то разрушено`;
  if (r.totalSuccesses > 0 && r.critPairs) return `КРИТИЧЕСКИЙ УСПЕХ · ${r.totalSuccesses}${diff}`;
  if (r.totalSuccesses > 0) return `УСПЕХ · ${r.totalSuccesses}${diff}`;
  return `ПРОВАЛ · 0 успехов${diff}`;
}

export interface VtmDie {
  value: number;      // 1..10
  hunger: boolean;    // кость Голода
  success: boolean;   // >= 6
  crit: boolean;      // == 10
  rerolled?: boolean; // кость уже переброшена волей — второй раз нельзя
}

export interface VtmRollResult {
  dice: VtmDie[];
  successes: number;      // всего успехов
  critPairs: number;      // количество пар десяток
  totalSuccesses: number; // с учётом удвоения пар
  messy: boolean;         // критическая десятка на кости Голода
  bestial: boolean;       // провал при наличии кости Голода
  pool: number;
  hungerDice: number;
  label: string;
  difficulty?: number;    // порог для «достаточно/недостаточно»
}

/** Бросок пула: pool — общий размер, hunger — сколько костей из пула являются костями Голода. */
export function rollPool(pool: number, hunger: number, label: string, difficulty?: number): VtmRollResult {
  const p = Math.max(1, Math.min(40, Math.floor(pool)));
  const h = Math.max(0, Math.min(p, Math.min(5, Math.floor(hunger))));
  const dice: VtmDie[] = [];
  for (let i = 0; i < p; i++) {
    const value = 1 + Math.floor(Math.random() * 10);
    const isHunger = i < h;
    dice.push({ value, hunger: isHunger, success: value >= 6, crit: value === 10 });
  }
  const tens = dice.filter((d) => d.crit).length;
  const critPairs = Math.floor(tens / 2);
  const plain = dice.filter((d) => d.success && !d.crit).length;
  const oddTens = tens % 2;
  const successes = plain + critPairs * 2 + oddTens;
  const messy = dice.some((d) => d.hunger && d.crit);
  const bestial = successes === 0 && dice.some((d) => d.hunger);
  const hungerDice = h;
  return {
    dice,
    successes,
    critPairs,
    totalSuccesses: successes,
    messy,
    bestial,
    pool: p,
    hungerDice: h,
    label,
    difficulty,
  };
}

/** Испытание Крови: одна кость, успех 6+ (иначе Голод +1). */
export function rollRouse(label: string): { ok: boolean; value: number } {
  const value = 1 + Math.floor(Math.random() * 10);
  return { ok: value >= 6, value };
}

// ---------- Переброс волей (до 3 костей за пункт) ----------

/**
 * Вампирский переброс волей: заменяет значения выбранных костей,
 * помечает их «переброшена» и пересчитывает успехи/криты/Беспредельный/Зверский.
 * Каждую кость можно перебросить только один раз.
 */
export function rerollVtmWillpower(r: VtmRollResult, indices: number[]): VtmRollResult {
  const set = new Set(indices.map((i) => Math.floor(i)));
  const dice: VtmDie[] = r.dice.map((d, i) =>
    set.has(i)
      ? { ...d, value: 1 + Math.floor(Math.random() * 10), rerolled: true }
      : d,
  ).map((d) => ({ ...d, success: d.value >= 6, crit: d.value === 10 }));
  const tens = dice.filter((d) => d.crit).length;
  const critPairs = Math.floor(tens / 2);
  const plain = dice.filter((d) => d.success && !d.crit).length;
  const oddTens = tens % 2;
  const successes = plain + critPairs * 2 + oddTens;
  return {
    ...r,
    dice,
    successes,
    critPairs,
    totalSuccesses: successes,
    messy: dice.some((d) => d.hunger && d.crit),
    bestial: successes === 0 && dice.some((d) => d.hunger),
  };
}

/**
 * Гароу-переброс волей: правила W5 — кости Ярости (включая Жестокие)
 * перебрасывать волей НЕЛЬЗЯ; обычные кости — до трёх за пункт, каждая один раз.
 */
export function rerollW5Willpower(r: W5RollResult, indices: number[]): W5RollResult {
  const set = new Set(indices.map((i) => Math.floor(i)));
  const dice: W5Die[] = r.dice.map((d, i) =>
    set.has(i) && !d.rage
      ? { ...d, value: 1 + Math.floor(Math.random() * 10), rerolled: true }
      : d,
  ).map((d) => ({
    ...d,
    success: d.value >= 6 && !d.brutal,
    crit: d.value === 10,
  }));
  const tens = dice.filter((d) => d.crit).length;
  const critPairs = Math.floor(tens / 2);
  const plain = dice.filter((d) => d.success && !d.crit).length;
  const oddTens = tens % 2;
  const successes = plain + critPairs * 2 + oddTens;
  const brutalCount = dice.filter((d) => d.brutal).length;
  const brutalOutcome = brutalCount >= 2;
  const totalSuccesses = brutalOutcome ? (r.brutalDamage ? successes + 4 : 0) : successes;
  return { ...r, dice, successes, critPairs, totalSuccesses, brutalCount, brutalOutcome };
}

// ---------- Глобальное состояние панели костей ----------

const HISTORY_CAP = 12; // Хроника бросков помнит последнюю дюжину ночей

export interface RollHistoryItem {
  id: string;
  label: string;
  ts: number;
  kind: "pool" | "rouse" | "w5pool" | "wrage";
  roll?: VtmRollResult;
  rouse?: { ok: boolean; value: number };
  w5roll?: W5RollResult;
  wrage?: { ok: boolean; value: number };
}

interface DiceState {
  mode: "vampire" | "werewolf";   // какой лист открыт — какая терминология у панели
  open: boolean;
  last: VtmRollResult | null;
  rouse: { ok: boolean; value: number; label: string; ts: number } | null;
  w5last: W5RollResult | null;
  wrage: { ok: boolean; value: number; label: string; ts: number } | null;
  history: RollHistoryItem[];
  setMode: (m: "vampire" | "werewolf") => void;
  toggle: () => void;
  setOpen: (v: boolean) => void;
  pushRoll: (r: VtmRollResult) => void;
  pushRouse: (r: { ok: boolean; value: number; label: string }) => void;
  pushW5Roll: (r: W5RollResult) => void;
  pushRageCheck: (r: { ok: boolean; value: number; label: string }) => void;
  clearHistory: () => void;
}

export const useVtmDice = create<DiceState>((set) => ({
  mode: "vampire",
  open: false,
  last: null,
  rouse: null,
  w5last: null,
  wrage: null,
  history: [],
  setMode: (m) => set({ mode: m, last: null, rouse: null, w5last: null, wrage: null }),
  toggle: () => set((s) => ({ open: !s.open })),
  setOpen: (v) => set({ open: v }),
  pushRoll: (r) =>
    set((s) => ({
      last: r,
      open: true,
      history: [
        { id: `roll-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, label: r.label, ts: Date.now(), kind: "pool", roll: r } as RollHistoryItem,
        ...s.history,
      ].slice(0, HISTORY_CAP),
    })),
  pushRouse: (r) =>
    set((s) => ({
      rouse: { ...r, ts: Date.now() },
      history: [
        { id: `rouse-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, label: r.label, ts: Date.now(), kind: "rouse", rouse: r } as RollHistoryItem,
        ...s.history,
      ].slice(0, HISTORY_CAP),
    })),
  pushW5Roll: (r) =>
    set((s) => ({
      w5last: r,
      open: true,
      history: [
        { id: `w5-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, label: r.label, ts: Date.now(), kind: "w5pool", w5roll: r } as RollHistoryItem,
        ...s.history,
      ].slice(0, HISTORY_CAP),
    })),
  pushRageCheck: (r) =>
    set((s) => ({
      wrage: { ...r, ts: Date.now() },
      history: [
        { id: `wrage-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, label: r.label, ts: Date.now(), kind: "wrage", wrage: { ok: r.ok, value: r.value } } as RollHistoryItem,
        ...s.history,
      ].slice(0, HISTORY_CAP),
    })),
  clearHistory: () => set({ history: [] }),
}));

// ---------- Поставщики колбэков листа (устанавливаются редактором) ----------

interface SheetHooks {
  logRoll: (text: string) => void;
  addHunger?: (n?: number) => void;      // вампирский лист
  addRage?: (n: number) => void;         // лист Гароу: +/- Ярость (отрицательное — потеря)
  spendWillpower: () => boolean;
  willpowerLeft: () => number;
  hungerLeft?: () => number;
}

let hooks: SheetHooks | null = null;
export function setVtmSheetHooks(h: SheetHooks | null) {
  hooks = h;
}

function describe(r: VtmRollResult): string {
  const diff = r.difficulty ? ` · порог ≤ ${r.difficulty}` : "";
  if (r.totalSuccesses > 0 && r.messy) return `БЕСПРЕДЕЛЬНЫЙ УСПЕХ · ${r.totalSuccesses} успехов${diff} — Зверь распорядился по-своему`;
  if (r.totalSuccesses > 0) return `УСПЕХ · ${r.totalSuccesses} ${r.critPairs ? "(критический!)" : ""}${diff}`;
  if (r.bestial) return `ЗВЕРСКИЙ ПРОВАЛ${diff} — Зверь взял своё`;
  return `ПРОВАЛ · 0 успехов${diff}`;
}

/** Короткий вердикт для «Хроники бросков» — значок + слово. */
function verdictShort(r: VtmRollResult): { word: string; tone: "crit" | "win" | "messy" | "fail" | "beast" } {
  if (r.totalSuccesses > 0 && r.critPairs && !r.messy) return { word: `КРИТ · ${r.totalSuccesses}`, tone: "crit" };
  if (r.totalSuccesses > 0 && r.messy) return { word: `БЕСПРЕД. · ${r.totalSuccesses}`, tone: "messy" };
  if (r.totalSuccesses > 0) return { word: `УСПЕХ · ${r.totalSuccesses}`, tone: "win" };
  if (r.bestial) return { word: "ЗВЕРСКИЙ", tone: "beast" };
  return { word: "ПРОВАЛ", tone: "fail" };
}

/** Компактная запись броска для истории: кости через пробел, голодные — в скобках. */
function diceCompact(r: VtmRollResult): string {
  const main = r.dice.filter((d) => !d.hunger).map((d) => d.value);
  const hung = r.dice.filter((d) => d.hunger).map((d) => d.value);
  const mainStr = main.join("·");
  return hung.length ? `${mainStr} ⁄ голод ${hung.join("·")}` : mainStr;
}

/** Короткий вердикт броска Гароу для «Хроники бросков». */
function verdictW5Short(r: W5RollResult): { word: string; tone: "crit" | "win" | "brutal" | "brutaldmg" | "fail" } {
  if (r.brutalOutcome && r.brutalDamage) return { word: `ЖЕСТОК. · ${r.totalSuccesses}`, tone: "brutaldmg" };
  if (r.brutalOutcome) return { word: "ЖЕСТОКИЙ", tone: "brutal" };
  if (r.totalSuccesses > 0 && r.critPairs) return { word: `КРИТ · ${r.totalSuccesses}`, tone: "crit" };
  if (r.totalSuccesses > 0) return { word: `УСПЕХ · ${r.totalSuccesses}`, tone: "win" };
  return { word: "ПРОВАЛ", tone: "fail" };
}

/** Компактная запись броска Гароу: обычные кости · ярость в скобках. */
function diceCompactW5(r: W5RollResult): string {
  const main = r.dice.filter((d) => !d.rage).map((d) => d.value);
  const rage = r.dice.filter((d) => d.rage).map((d) => d.value);
  const mainStr = main.join("·");
  return rage.length ? `${mainStr} ⁄ ярость ${rage.join("·")}` : mainStr;
}

// ---------- Плавающая панель ----------

export function VtmDicePanel() {
  const { open, last, rouse, w5last, wrage, mode, history, toggle, setOpen, clearHistory } = useVtmDice();
  const [rollBtnArmed, setRollBtnArmed] = useState(false);
  const [histOpen, setHistOpen] = useState(true);
  const isW5 = mode === "werewolf";

  // Переброс волей: выбор костей (до 3) привязан к конкретному броску —
  // новый бросок автоматически сбрасывает выбор (сравнение по ссылке, без эффектов).
  const currentRoll: VtmRollResult | W5RollResult | null = isW5 ? w5last : last;
  const [wpState, setWpState] = useState<{ for: VtmRollResult | W5RollResult | null; sel: number[] } | null>(null);
  const wpActive = wpState !== null && wpState.for === currentRoll;
  const wpSel = wpActive ? wpState.sel : [];
  const enterWpMode = () => setWpState({ for: currentRoll, sel: [] });
  const cancelWpMode = () => setWpState(null);
  const toggleWpSel = (i: number) =>
    setWpState((s) =>
      s && s.for === currentRoll
        ? { ...s, sel: s.sel.includes(i) ? s.sel.filter((x) => x !== i) : s.sel.length < 3 ? [...s.sel, i] : s.sel }
        : s,
    );

  /** Вампирский переброс: тратим волю, перебрасываем выбранные, показываем и пишем в хронику. */
  const doVtmReroll = () => {
    if (!last || !wpSel.length) return;
    if (!hooks?.spendWillpower()) {
      toast.error("Воля иссякла", { description: "Пункт воли не потратить: шкала пуста или искалечена." });
      return;
    }
    const oldVals = wpSel.map((i) => last.dice[i].value);
    const rerolled = rerollVtmWillpower(last, wpSel);
    const newVals = wpSel.map((i) => rerolled.dice[i].value);
    useVtmDice.getState().pushRoll({ ...rerolled, label: `${last.label} ⟲волей` });
    hooks?.logRoll(`${last.label} ⟲ переброс волей (${oldVals.join("·")} → ${newVals.join("·")}): ${describe(rerolled)}`);
    toast.success("Воля −1 — кости переброшены", { description: "Каждая кость перебрасывается один раз за хронику." });
    setWpState(null);
  };

  /** Гароу-переброс: кости Ярости волей не перебрасываются (W5). */
  const doW5Reroll = () => {
    if (!w5last || !wpSel.length) return;
    if (!hooks?.spendWillpower()) {
      toast.error("Воля иссякла", { description: "Пункт воли не потратить: шкала пуста или искалечена." });
      return;
    }
    const oldVals = wpSel.map((i) => w5last.dice[i].value);
    const rerolled = rerollW5Willpower(w5last, wpSel);
    const newVals = wpSel.map((i) => rerolled.dice[i].value);
    useVtmDice.getState().pushW5Roll({ ...rerolled, label: `${w5last.label} ⟲волей` });
    hooks?.logRoll(`${w5last.label} ⟲ переброс волей (${oldVals.join("·")} → ${newVals.join("·")}): ${describeW5(rerolled)}`);
    toast.success("Воля −1 — кости переброшены", { description: "Кости Ярости волей не перебрасываются." });
    setWpState(null);
  };

  /** Кости переброса для последнего результата: обычные и непереброшенные. */
  const vtmRerollable = last?.dice.some((d) => !d.rerolled) ?? false;
  const w5Rerollable = w5last?.dice.some((d) => !d.rage && !d.rerolled) ?? false;

  // Горячий бросок: последние параметры не храним — панель только показывает результат
  // и журнал. Реальные броски делаются из контекстных кнопок (клик по точкам/строкам).

  return (
    <div className={`vtm-dice-panel ${isW5 ? "vtm-dice-panel-w5" : ""}`} aria-live="polite">
      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.22 }}
            className="vtm-panel vtm-dice-body mb-2 p-4 space-y-3"
            role="dialog"
            aria-label={isW5 ? "Кости Луны" : "Кости Ночи"}
          >
            <div className="flex items-center justify-between">
              <span className={`vtm-label text-[0.79rem] ${isW5 ? "text-[#c9d3e8]" : "text-[#c4ac9d]"}`}>{isW5 ? "Кости Луны" : "Кости Ночи"}</span>
              <button onClick={() => setOpen(false)} className="vtm-btn vtm-btn-ghost !px-2 !py-1 !text-[0.81rem]" aria-label="Закрыть кости">
                ✕
              </button>
            </div>

            {isW5 && w5last && (
              <div className="space-y-2">
                <p className="vtm-label text-[0.75rem] text-[#8ea6c9]">{w5last.label}{wpActive ? " · выбери до 3 обычных костей" : ""}</p>
                <div className="flex flex-wrap gap-1.5" role="img" aria-label={describeW5(w5last)}>
                  {w5last.dice.map((d, i) => {
                    const sel = wpSel.includes(i);
                    const clickable = wpActive && !d.rage && !d.rerolled;
                    return clickable ? (
                      <button
                        key={i}
                        onClick={() => toggleWpSel(i)}
                        aria-pressed={sel}
                        aria-label={`Кость ${d.value}${sel ? " — выбрана" : ""}`}
                        className={`vtm-die ${d.success ? "success" : ""} ${d.crit ? "crit" : ""} ${d.rage ? "hunger rage" : ""} ${d.brutal ? "brutal" : ""} vtm-die-selectable ${sel ? "selected" : ""}`}
                        title="Клик — выбрать для переброса волей"
                      >
                        {d.value}
                      </button>
                    ) : (
                      <span
                        key={i}
                        className={`vtm-die ${d.success ? "success" : ""} ${d.crit ? "crit" : ""} ${d.rage ? "hunger rage" : ""} ${d.brutal ? "brutal" : ""} ${d.rerolled ? "rerolled" : ""}`}
                        title={d.brutal ? "Жестокая кость Ярости (1–2)" : d.rage ? "Кость Ярости — волей не перебрасывается" : d.rerolled ? "Уже переброшена волей" : undefined}
                      >
                        {d.value}
                      </span>
                    );
                  })}
                </div>
                <p className={`vtm-label text-[0.83rem] ${w5last.brutalOutcome ? (w5last.brutalDamage ? "text-[#d6a840]" : "text-[#e8636b]") : w5last.totalSuccesses > 0 ? "text-[#9fd8b3]" : "text-[#c4ac9d]"}`}>
                  {describeW5(w5last)}
                </p>
                {w5last.brutalOutcome && !w5last.brutalDamage && (
                  <p className="vtm-hint">Жестокий исход: две и более кости Ярости выпали на 1–2 — испытание провалено, и что-то вокруг разрушено: дверь, схватка, хрупкая тайна. Жестокие кости нельзя перебросить волей.</p>
                )}
                {w5last.brutalOutcome && w5last.brutalDamage && (
                  <p className="vtm-hint">Жестокий успех на уроне: удар вышел разрушительным — к числу успехов добавлено +4, но и ущерб вокруг случился немалый.</p>
                )}
                {w5last.brutalCount === 1 && !w5last.brutalOutcome && (
                  <p className="vtm-hint">Жестокая кость: одна кость Ярости выпала на 1–2 — сама она успеха не дала (но перебросить её волей нельзя).</p>
                )}
                {wpActive ? (
                  <div className="vtm-wp-bar">
                    <span className="vtm-hint !text-[0.78rem]">Выбрано {wpSel.length}/3 · кости Ярости не выбрать</span>
                    <div className="flex gap-2 flex-wrap">
                      <button
                        className="vtm-btn vtm-w5-gift-roll !py-1.5 !px-3 text-[0.81rem]"
                        disabled={!wpSel.length}
                        onClick={doW5Reroll}
                      >
                        ⟲ Перебросить ({wpSel.length})
                      </button>
                      <button className="vtm-btn vtm-btn-ghost !py-1.5 !px-3 text-[0.81rem]" onClick={cancelWpMode}>
                        Отмена
                      </button>
                    </div>
                  </div>
                ) : (
                  w5Rerollable && (
                    <button
                      className="vtm-btn vtm-btn-ghost !py-1.5 !px-3 text-[0.81rem] vtm-wp-trigger"
                      onClick={enterWpMode}
                      title="Пункт воли: переброс до трёх обычных костей (кости Ярости не перебрасываются)"
                    >
                      ⟲ Перебросить волей
                    </button>
                  )
                )}
              </div>
            )}

            {isW5 && wrage && (
              <div className="space-y-1 border-t border-[#2b1116] pt-2">
                <p className="vtm-label text-[0.75rem] text-[#c9d3e8]">Проверка Ярости · {wrage.label}</p>
                <p className={`vtm-label text-[0.83rem] ${wrage.ok ? "text-[#9fd8b3]" : "text-[#e8636b]"}`}>
                  d10 = {wrage.value} — {wrage.ok ? "УСПЕХ, Ярость не меняется" : "ПРОВАЛ, Ярость −1"}
                </p>
              </div>
            )}

            {!isW5 && last && (
              <div className="space-y-2">
                <p className="vtm-label text-[0.75rem] text-[#a8863d]">{last.label}{wpActive ? " · выбери до 3 костей" : ""}</p>
                <div className="flex flex-wrap gap-1.5" role="img" aria-label={describe(last)}>
                  {last.dice.map((d, i) => {
                    const sel = wpSel.includes(i);
                    const clickable = wpActive && !d.rerolled;
                    return clickable ? (
                      <button
                        key={i}
                        onClick={() => toggleWpSel(i)}
                        aria-pressed={sel}
                        aria-label={`Кость ${d.value}${sel ? " — выбрана" : ""}`}
                        className={`vtm-die ${d.success ? "success" : ""} ${d.crit ? "crit" : ""} ${d.hunger ? "hunger" : ""} vtm-die-selectable ${sel ? "selected" : ""}`}
                        title="Клик — выбрать для переброса волей"
                      >
                        {d.value}
                      </button>
                    ) : (
                      <span
                        key={i}
                        className={`vtm-die ${d.success ? "success" : ""} ${d.crit ? "crit" : ""} ${d.hunger ? "hunger" : ""} ${d.rerolled ? "rerolled" : ""}`}
                        title={d.hunger ? "Кость Голода" : d.rerolled ? "Уже переброшена волей" : undefined}
                      >
                        {d.value}
                      </span>
                    );
                  })}
                </div>
                <p className={`vtm-label text-[0.83rem] ${last.bestial || last.messy ? "text-[#e8636b]" : last.totalSuccesses > 0 ? "text-[#9fd8b3]" : "text-[#c4ac9d]"}`}>
                  {describe(last)}
                </p>
                {last.bestial && (
                  <p className="vtm-hint">Зверский провал: рассказчик вправе усложнить ситуацию — Голод берёт верх. (Испытание Крови не требуется, но последствия могут быть кровавыми.)</p>
                )}
                {last.messy && (
                  <p className="vtm-hint">Беспредельный успех: успех засчитан, но кость Голода выпала на 10 — Зверь испачкал триумф. Возможны осложнения с Маскарадом.</p>
                )}
                {wpActive ? (
                  <div className="vtm-wp-bar">
                    <span className="vtm-hint !text-[0.78rem]">Выбрано {wpSel.length}/3 · пункт воли будет потрачен</span>
                    <div className="flex gap-2 flex-wrap">
                      <button
                        className="vtm-btn !py-1.5 !px-3 text-[0.81rem]"
                        disabled={!wpSel.length}
                        onClick={doVtmReroll}
                      >
                        ⟲ Перебросить ({wpSel.length})
                      </button>
                      <button className="vtm-btn vtm-btn-ghost !py-1.5 !px-3 text-[0.81rem]" onClick={cancelWpMode}>
                        Отмена
                      </button>
                    </div>
                  </div>
                ) : (
                  vtmRerollable && (
                    <button
                      className="vtm-btn vtm-btn-ghost !py-1.5 !px-3 text-[0.81rem] vtm-wp-trigger"
                      onClick={enterWpMode}
                      title="Пункт воли: переброс до трёх костей (каждая кость — один раз)"
                    >
                      ⟲ Перебросить волей
                    </button>
                  )
                )}
              </div>
            )}

            {!isW5 && rouse && (
              <div className="space-y-1 border-t border-[#2b1116] pt-2">
                <p className="vtm-label text-[0.75rem] text-[#c4ac9d]">Испытание Крови · {rouse.label}</p>
                <p className={`vtm-label text-[0.83rem] ${rouse.ok ? "text-[#9fd8b3]" : "text-[#e8636b]"}`}>
                  d10 = {rouse.value} — {rouse.ok ? "УСПЕХ, Голод не растёт" : "ПРОВАЛ, Голод +1"}
                </p>
              </div>
            )}

            {!last && !rouse && !w5last && !wrage && (
              <p className="vtm-hint">
                {isW5
                  ? "Кости бросаются прямо с листа: клик по названию характеристики или по строке навыка. Ярость даёт красные кости в пуле. Здесь появятся результаты."
                  : "Кости бросаются прямо с листа: клик по точкам характеристики, строке навыка, Дисциплине или треку. Здесь появятся их результаты."}
              </p>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              {isW5 ? (
                <button
                  className="vtm-btn vtm-btn-ghost !py-1.5 !px-3 text-[0.81rem]"
                  onClick={() => {
                    // проверка Ярости: успех 6+ — Ярость на месте, провал — Ярость −1
                    const r = rollW5RageCheck("вручную");
                    useVtmDice.getState().pushRageCheck({ ...r, label: "вручную" });
                    hooks?.logRoll(`Проверка Ярости: d10=${r.value} — ${r.ok ? "успех, Ярость не изменилась" : "провал, Ярость −1"}`);
                    if (!r.ok) hooks?.addRage?.(-1);
                  }}
                >
                  🌕 Проверка Ярости
                </button>
              ) : (
                <button
                  className="vtm-btn vtm-btn-ghost !py-1.5 !px-3 text-[0.81rem]"
                  onClick={() => {
                    // быстрое испытание Крови
                    const r = rollRouse("вручную");
                    useVtmDice.getState().pushRouse({ ...r, label: "вручную" });
                    hooks?.logRoll(`Испытание Крови: d10=${r.value} — ${r.ok ? "успех" : "провал, Голод +1"}`);
                    if (!r.ok) hooks?.addHunger?.(1);
                  }}
                >
                  🩸 Испытание Крови
                </button>
              )}
              <button
                className="vtm-btn vtm-btn-ghost !py-1.5 !px-3 text-[0.81rem]"
                onClick={() => {
                  if (hooks?.spendWillpower()) {
                    toast.success("Воля −1", { description: isW5 ? "Пункт воли потрачен — удержи облик, вспомни сцену или перебрось до трёх обычных костей кнопкой «⟲ Перебросить волей»." : "Пункт воли потрачен — перебрось до трёх костей кнопкой «⟲ Перебросить волей» (или удержи Зверя)." });
                  } else {
                    toast.error("Воля иссякла", { description: "Пункт воли не потратить: шкала пуста или искалечена." });
                  }
                }}
              >
                ⚡ Тратить волю
              </button>
            </div>

            {/* Хроника бросков: последняя дюжина ночей за этим столом */}
            {history.length > 0 && (
              <div className="vtm-roll-hist">
                <button
                  className="vtm-roll-hist-head"
                  onClick={() => setHistOpen((v) => !v)}
                  aria-expanded={histOpen}
                  title={histOpen ? "Свернуть хронику" : "Развернуть хронику"}
                >
                  <span className="vtm-roll-hist-thread" aria-hidden />
                  <span className="vtm-roll-hist-title">Хроника бросков · {history.length}</span>
                  <span className="vtm-roll-hist-caret" aria-hidden>{histOpen ? "▼" : "▶"}</span>
                </button>
                {histOpen && (
                  <>
                    <ol className="vtm-roll-hist-list">
                      {history.map((h, i) => (
                        <li
                          key={h.id}
                          className="vtm-rh-item"
                          style={{ animationDelay: `${Math.min(i, 6) * 45}ms` }}
                        >
                          {h.kind === "pool" && h.roll ? (
                            <>
                              <span className={`vtm-rh-badge ${verdictShort(h.roll).tone}`}>{verdictShort(h.roll).word}</span>
                              <span className="vtm-rh-body">
                                <span className="vtm-rh-label">{h.label}</span>
                                <span className="vtm-rh-dice">{diceCompact(h.roll)}</span>
                              </span>
                            </>
                          ) : h.kind === "w5pool" && h.w5roll ? (
                            <>
                              <span className={`vtm-rh-badge ${verdictW5Short(h.w5roll).tone}`}>{verdictW5Short(h.w5roll).word}</span>
                              <span className="vtm-rh-body">
                                <span className="vtm-rh-label">{h.label}</span>
                                <span className="vtm-rh-dice">{diceCompactW5(h.w5roll)}</span>
                              </span>
                            </>
                          ) : h.kind === "wrage" ? (
                            <>
                              <span className={`vtm-rh-badge ${h.wrage?.ok ? "win" : "beast"}`}>
                                {h.wrage?.ok ? "ЯРОСТЬ · ОК" : "ЯРОСТЬ · −1"}
                              </span>
                              <span className="vtm-rh-body">
                                <span className="vtm-rh-label">Проверка Ярости · {h.label}</span>
                                <span className="vtm-rh-dice">d10 = {h.wrage?.value}</span>
                              </span>
                            </>
                          ) : (
                            <>
                              <span className={`vtm-rh-badge ${h.rouse?.ok ? "win" : "beast"}`}>
                                {h.rouse?.ok ? "КРОВЬ · ОК" : "КРОВЬ · +1"}
                              </span>
                              <span className="vtm-rh-body">
                                <span className="vtm-rh-label">Испытание Крови · {h.label}</span>
                                <span className="vtm-rh-dice">d10 = {h.rouse?.value}</span>
                              </span>
                            </>
                          )}
                        </li>
                      ))}
                    </ol>
                    <button
                      className="vtm-roll-hist-clear"
                      onClick={clearHistory}
                      title="Смыть хронику бросков"
                    >
                      ✕ смыть хронику
                    </button>
                  </>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={toggle}
        className={`vtm-dice-toggle ${isW5 ? "vtm-dice-toggle-w5" : ""}`}
        aria-label={open ? "Скрыть кости" : "Открыть кости"}
        title={isW5 ? "Кости Луны" : "Кости Ночи"}
        onMouseEnter={() => setRollBtnArmed(true)}
        onMouseLeave={() => setRollBtnArmed(false)}
      >
        {rollBtnArmed ? "🎲" : isW5 ? "🌕" : "🩸"}
      </button>
    </div>
  );
}

/** Вспомогательная функция для вызова броска из компонентов листа. */
export function vtmRollAndShow(pool: number, hunger: number, label: string, difficulty?: number) {
  const result = rollPool(pool, hunger, label, difficulty);
  useVtmDice.getState().pushRoll(result);
  hooks?.logRoll(`${label}: ${result.dice.map((d) => d.value).join(" ")} → ${describe(result)}`);
  return result;
}

/** Бросок пула Гароу с показом на панели и записью в хронику листа. */
export function vtmW5RollAndShow(pool: number, rage: number, label: string, opts?: { damage?: boolean; difficulty?: number }) {
  const result = rollW5Pool(pool, rage, label, opts);
  useVtmDice.getState().pushW5Roll(result);
  hooks?.logRoll(`${label}: ${result.dice.map((d) => d.value).join(" ")} → ${describeW5(result)}`);
  return result;
}

/** Проверка Ярости с показом на панели и потерей Ярости при провале. */
export function vtmW5RageCheckAndShow(label: string) {
  const r = rollW5RageCheck(label);
  useVtmDice.getState().pushRageCheck({ ...r, label });
  hooks?.logRoll(`Проверка Ярости (${label}): d10=${r.value} — ${r.ok ? "успех, Ярость не изменилась" : "провал, Ярость −1"}`);
  if (!r.ok) hooks?.addRage?.(-1);
  return r;
}
