"use client";

import { toast } from "sonner";
import { checkLevel, CHECK_LEVEL_RU, rollD100, CheckLevel } from "@/lib/coc-calc";

/** Бросок d100 с уровнями успеха — результат всплывает печатью судьбы. */
export function rollSkillCheck(name: string, value: number) {
  const roll = rollD100();
  const level = checkLevel(roll, value);
  showCheckResult(name, roll, value, level);
  return { roll, level };
}

export function showCheckResult(name: string, roll: number, value: number, level: CheckLevel) {
  const cls =
    level === "critical" || level === "extreme"
      ? "#7fc39a"
      : level === "hard"
        ? "#b9cfa4"
        : level === "regular"
          ? "#d8cbb0"
          : level === "fail"
            ? "#c98f6a"
            : "#a83232";
  toast.custom(
    () => (
      <div
        className="coc-panel px-4 py-3 flex items-center gap-4"
        style={{ minWidth: 260, boxShadow: "0 14px 40px rgba(0,0,0,0.7)" }}
      >
        <div className="text-center">
          <div className="coc-mono text-2xl font-bold" style={{ color: cls }}>
            {roll}
          </div>
          <div className="coc-label" style={{ fontSize: "0.55rem" }}>
            из {value}
          </div>
        </div>
        <div className="w-px self-stretch" style={{ background: "var(--coc-line)" }} />
        <div>
          <div className="coc-display text-sm" style={{ color: cls }}>
            {CHECK_LEVEL_RU[level]}
          </div>
          <div className="coc-hint">{name}</div>
        </div>
      </div>
    ),
    { duration: 4200 }
  );
}

const DICE = [100, 20, 12, 10, 8, 6, 4, 3];

/** Плавающая панель костей — тень прошлого всегда рядом. */
export function CocDicePanel() {
  const roll = (sides: number) => {
    const value = 1 + Math.floor(Math.random() * sides);
    toast.custom(
      () => (
        <div className="coc-panel px-4 py-3 flex items-center gap-3" style={{ boxShadow: "0 14px 40px rgba(0,0,0,0.7)" }}>
          <span className="coc-display text-xs tracking-[0.2em] uppercase text-[#a4977c]">Кость</span>
          <span className="coc-mono text-lg font-bold text-[#7fc39a]">d{sides}</span>
          <span className="coc-mono text-xl font-bold text-[#d8cbb0]">{value}</span>
        </div>
      ),
      { duration: 3200 }
    );
  };

  return (
    <div
      className="fixed bottom-4 right-4 z-40 flex flex-col gap-1.5 items-end"
      aria-label="Игральные кости"
    >
      <div className="coc-panel px-3 py-2 flex gap-1.5 flex-wrap justify-end max-w-[240px]">
        {DICE.map((s) => (
          <button
            key={s}
            onClick={() => roll(s)}
            className="coc-mono text-xs px-2 py-1 rounded border transition-all hover:scale-105"
            style={{
              borderColor: "var(--coc-line)",
              color: "var(--coc-bone-dim)",
              background: "rgba(0,0,0,0.3)",
            }}
            title={`Бросить d${s}`}
          >
            d{s}
          </button>
        ))}
      </div>
    </div>
  );
}
