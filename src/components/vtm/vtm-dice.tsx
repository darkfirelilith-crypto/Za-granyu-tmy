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

export interface VtmDie {
  value: number;      // 1..10
  hunger: boolean;    // кость Голода
  success: boolean;   // >= 6
  crit: boolean;      // == 10
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

// ---------- Глобальное состояние панели костей ----------

interface DiceState {
  open: boolean;
  last: VtmRollResult | null;
  rouse: { ok: boolean; value: number; label: string; ts: number } | null;
  toggle: () => void;
  setOpen: (v: boolean) => void;
  pushRoll: (r: VtmRollResult) => void;
  pushRouse: (r: { ok: boolean; value: number; label: string }) => void;
}

export const useVtmDice = create<DiceState>((set) => ({
  open: false,
  last: null,
  rouse: null,
  toggle: () => set((s) => ({ open: !s.open })),
  setOpen: (v) => set({ open: v }),
  pushRoll: (r) => set({ last: r, open: true }),
  pushRouse: (r) => set({ rouse: { ...r, ts: Date.now() } }),
}));

// ---------- Поставщики колбэков листа (устанавливаются редактором) ----------

interface SheetHooks {
  logRoll: (text: string) => void;
  addHunger: (n?: number) => void;
  spendWillpower: () => boolean;
  willpowerLeft: () => number;
  hungerLeft: () => number;
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

// ---------- Плавающая панель ----------

export function VtmDicePanel() {
  const { open, last, rouse, toggle, setOpen } = useVtmDice();
  const [rollBtnArmed, setRollBtnArmed] = useState(false);

  // Горячий бросок: последние параметры не храним — панель только показывает результат
  // и журнал. Реальные броски делаются из контекстных кнопок (клик по точкам/строкам).

  return (
    <div className="vtm-dice-panel" aria-live="polite">
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
            aria-label="Кости Ночи"
          >
            <div className="flex items-center justify-between">
              <span className="vtm-label text-[0.68rem] text-[#a68d80]">Кости Ночи</span>
              <button onClick={() => setOpen(false)} className="vtm-btn vtm-btn-ghost !px-2 !py-1 !text-[0.7rem]" aria-label="Закрыть кости">
                ✕
              </button>
            </div>

            {last && (
              <div className="space-y-2">
                <p className="vtm-label text-[0.62rem] text-[#a8863d]">{last.label}</p>
                <div className="flex flex-wrap gap-1.5" role="img" aria-label={describe(last)}>
                  {last.dice.map((d, i) => (
                    <span
                      key={i}
                      className={`vtm-die ${d.success ? "success" : ""} ${d.crit ? "crit" : ""} ${d.hunger ? "hunger" : ""}`}
                      title={d.hunger ? "Кость Голода" : undefined}
                    >
                      {d.value}
                    </span>
                  ))}
                </div>
                <p className={`vtm-label text-[0.72rem] ${last.bestial || last.messy ? "text-[#e8636b]" : last.totalSuccesses > 0 ? "text-[#9fd8b3]" : "text-[#a68d80]"}`}>
                  {describe(last)}
                </p>
                {last.bestial && (
                  <p className="vtm-hint">Зверский провал: рассказчик вправе усложнить ситуацию — Голод берёт верх. (Испытание Крови не требуется, но последствия могут быть кровавыми.)</p>
                )}
                {last.messy && (
                  <p className="vtm-hint">Беспредельный успех: успех засчитан, но кость Голода выпала на 10 — Зверь испачкал триумф. Возможны осложнения с Маскарадом.</p>
                )}
              </div>
            )}

            {rouse && (
              <div className="space-y-1 border-t border-[#2b1116] pt-2">
                <p className="vtm-label text-[0.62rem] text-[#a68d80]">Испытание Крови · {rouse.label}</p>
                <p className={`vtm-label text-[0.72rem] ${rouse.ok ? "text-[#9fd8b3]" : "text-[#e8636b]"}`}>
                  d10 = {rouse.value} — {rouse.ok ? "УСПЕХ, Голод не растёт" : "ПРОВАЛ, Голод +1"}
                </p>
              </div>
            )}

            {!last && !rouse && (
              <p className="vtm-hint">
                Кости бросаются прямо с листа: клик по точкам характеристики, строке навыка, Дисциплине или треку. Здесь появятся их результаты.
              </p>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                className="vtm-btn vtm-btn-ghost !py-1.5 !px-3 text-[0.7rem]"
                onClick={() => {
                  // быстрое испытание Крови
                  const r = rollRouse("вручную");
                  useVtmDice.getState().pushRouse({ ...r, label: "вручную" });
                  hooks?.logRoll(`Испытание Крови: d10=${r.value} — ${r.ok ? "успех" : "провал, Голод +1"}`);
                  if (!r.ok) hooks?.addHunger(1);
                }}
              >
                🩸 Испытание Крови
              </button>
              <button
                className="vtm-btn vtm-btn-ghost !py-1.5 !px-3 text-[0.7rem]"
                onClick={() => {
                  if (hooks?.spendWillpower()) {
                    toast.success("Воля −1", { description: "Пункт воли потрачен — перебрось три кости или +1 успех." });
                  } else {
                    toast.error("Воля иссякла", { description: "Пункт воли не потратить: шкала пуста или искалечена." });
                  }
                }}
              >
                ⚡ Тратить волю
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={toggle}
        className="vtm-dice-toggle"
        aria-label={open ? "Скрыть кости" : "Открыть кости"}
        title="Кости Ночи"
        onMouseEnter={() => setRollBtnArmed(true)}
        onMouseLeave={() => setRollBtnArmed(false)}
      >
        {rollBtnArmed ? "🎲" : "🩸"}
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
