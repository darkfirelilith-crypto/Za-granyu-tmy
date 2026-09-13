"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { checkLevel, CHECK_LEVEL_RU, rollD100, CheckLevel } from "@/lib/coc-calc";

const ROLL_EVENT = "coc-roll-made";
const HISTORY_KEY = "coc-roll-history";

/* ===== Поставщик удачи =====
 * Редактор листа регистрирует, сколько удачи на руках и как её списать.
 * Панель бросков читает это при провале — правила 7e позволяют улучшать
 * проваленный бросок, тратя удачу (кроме проверок Рассудка и самой Удачи). */
interface LuckProvider {
  available: () => number;
  spend: (n: number) => void;
}
let luckProvider: LuckProvider | null = null;
export function setLuckProvider(p: LuckProvider | null) {
  luckProvider = p;
}

function luckUsable(label: string): boolean {
  const t = label.toLowerCase();
  return !t.includes("рассудк") && !t.includes("удач");
}

export interface RollRecord {
  id: number;
  label: string;
  roll: number;
  value: number;
  level?: CheckLevel;
  kind: "check" | "dice";
  sides?: number;
}

function loadHistory(): RollRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, 12) : [];
  } catch {
    return [];
  }
}

function saveHistory(list: RollRecord[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 12)));
  } catch {}
}

/** Публикация броска в общую историю (слушает панель костей). */
export function publishRoll(rec: Omit<RollRecord, "id">) {
  try {
    window.dispatchEvent(new CustomEvent(ROLL_EVENT, { detail: rec }));
  } catch {}
}

/** Бросок d100 с уровнями успеха — результат всплывает печатью судьбы.
 *  При провале можно утрясти удачу: списываем очки, бросок улучшается. */
export function rollSkillCheck(name: string, value: number) {
  const roll = rollD100();
  const level = checkLevel(roll, value);
  publishRoll({ label: name, roll, value, level, kind: "check" });
  const luck = luckProvider?.available() || 0;
  if ((level === "fail" || level === "fumble") && luck > 0 && luckUsable(name) && luckProvider) {
    toast.custom(
      () => (
        <LuckSpendToast
          name={name}
          roll={roll}
          value={value}
          maxLuck={luck}
          onSpend={luckProvider!.spend}
        />
      ),
      { duration: 15000 }
    );
  } else {
    showCheckResult(name, roll, value, level);
  }
  return { roll, level };
}

const LUCK_STEPS = [1, 5, 10];

/** Интерактивная печать провала: потратьте удачу — и судьба взглянет иначе. */
function LuckSpendToast({
  name,
  roll,
  value,
  maxLuck,
  onSpend,
}: {
  name: string;
  roll: number;
  value: number;
  maxLuck: number;
  onSpend: (n: number) => void;
}) {
  const [spent, setSpent] = useState(0);
  const [done, setDone] = useState(false);
  const effective = roll - spent;
  const level = checkLevel(effective, value);
  const success = level !== "fail" && level !== "fumble";
  const remaining = maxLuck - spent;

  const spend = (n: number) => {
    const newSpent = spent + n;
    const newLevel = checkLevel(roll - newSpent, value);
    setSpent(newSpent);
    onSpend(n);
    if (newLevel !== "fail" && newLevel !== "fumble") {
      setDone(true);
      publishRoll({
        label: `${name} · удача −${newSpent}`,
        roll: roll - newSpent,
        value,
        level: newLevel,
        kind: "check",
      });
      toast.success(`Удача потрачена: −${newSpent} → ${CHECK_LEVEL_RU[newLevel]}`, {
        description: `${name}: ${roll} → ${roll - newSpent} из ${value}`,
        duration: 6000,
      });
    }
  };

  const color =
    level === "critical" || level === "extreme"
      ? "#7fc39a"
      : level === "hard"
        ? "#b9cfa4"
        : level === "regular"
          ? "#d8cbb0"
          : level === "fail"
            ? "#c98f6a"
            : "#a83232";

  return (
    <div
      className="coc-panel px-4 py-3 space-y-2.5"
      style={{ minWidth: 300, boxShadow: "0 14px 40px rgba(0,0,0,0.75)" }}
      aria-label="Проверка с попыткой потратить удачу"
    >
      <div className="flex items-center gap-4">
        <div className="text-center">
          <div className="coc-mono text-2xl font-bold" style={{ color }}>
            {effective}
          </div>
          <div className="coc-label" style={{ fontSize: "0.55rem" }}>
            из {value}
          </div>
        </div>
        <div className="w-px self-stretch" style={{ background: "var(--coc-line)" }} />
        <div className="flex-1">
          <div className="coc-display text-sm" style={{ color }}>
            {CHECK_LEVEL_RU[level]}
          </div>
          <div className="coc-hint">{name}{spent > 0 ? ` · бросок был ${roll}` : ""}</div>
        </div>
      </div>
      {!success && !done && (
        <div className="flex items-center gap-1.5 pt-0.5">
          <span className="coc-mono text-[0.6rem] text-[#7fc39a] uppercase tracking-widest shrink-0">
            Удача ({remaining}):
          </span>
          {LUCK_STEPS.filter((n) => n <= remaining).map((n) => (
            <button
              key={n}
              onClick={() => spend(n)}
              className="coc-luck-btn text-[0.62rem] px-1.5 py-1 rounded border transition-all hover:scale-105"
              style={{
                borderColor: "#2e4a3a",
                color: "#7fc39a",
                background: "rgba(0,0,0,0.35)",
              }}
              title={`Потратить ${n} удачи: бросок ${roll - spent} → ${roll - spent - n}`}
            >
              −{n}
            </button>
          ))}
          <span className="coc-hint !text-[0.58rem] ml-auto">успех за удачу</span>
        </div>
      )}
      {(success || done) && (
        <p className="coc-hint !text-[0.6rem]">
          {spent > 0 ? `Списано удачи: ${spent}. Записано в журнал бросков.` : ""}
        </p>
      )}
    </div>
  );
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
          <RollingNumber final={roll} className="coc-mono text-2xl font-bold" style={{ color: cls }} />
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

/** Число, «катящееся» коротким мельканием перед тем, как пасть на итог.
 *  Уважает prefers-reduced-motion — там показывается сразу. */
function RollingNumber({
  final,
  className,
  style,
  duration = 560,
}: {
  final: number;
  className?: string;
  style?: React.CSSProperties;
  duration?: number;
}) {
  const prefersReduced =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [display, setDisplay] = useState(() => (prefersReduced ? final : 0));

  useEffect(() => {
    if (prefersReduced) return;
    const start = Date.now();
    const iv = setInterval(() => {
      if (Date.now() - start >= duration) {
        setDisplay(final);
        clearInterval(iv);
      } else {
        setDisplay(1 + Math.floor(Math.random() * 100));
      }
    }, 55);
    return () => clearInterval(iv);
  }, [final, duration, prefersReduced]);

  return (
    <span className={className} style={style} aria-label={String(final)}>
      {display}
    </span>
  );
}

/** Плавающая панель костей с историей бросков — тень прошлого всегда рядом.
 *  Журнал переживает перезагрузку страницы (localStorage). */
export function CocDicePanel() {
  const [history, setHistory] = useState<RollRecord[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setHistory(loadHistory());
    const handler = (e: Event) => {
      const rec = (e as CustomEvent).detail as Omit<RollRecord, "id">;
      setHistory((prev) => {
        const next = [{ ...rec, id: Date.now() + Math.random() }, ...prev].slice(0, 12);
        saveHistory(next);
        return next;
      });
    };
    window.addEventListener(ROLL_EVENT, handler);
    return () => window.removeEventListener(ROLL_EVENT, handler);
  }, []);

  const roll = (sides: number) => {
    const value = 1 + Math.floor(Math.random() * sides);
    publishRoll({ label: `Кость d${sides}`, roll: value, value: sides, kind: "dice", sides });
    toast.custom(
      () => (
        <div className="coc-panel px-4 py-3 flex items-center gap-3" style={{ boxShadow: "0 14px 40px rgba(0,0,0,0.7)" }}>
          <span className="coc-display text-xs tracking-[0.2em] uppercase text-[#a4977c]">Кость</span>
          <span className="coc-mono text-lg font-bold text-[#7fc39a]">d{sides}</span>
          <RollingNumber final={value} className="coc-mono text-xl font-bold text-[#d8cbb0]" />
        </div>
      ),
      { duration: 3200 }
    );
  };

  const levelColor = (level?: CheckLevel) => {
    switch (level) {
      case "critical": case "extreme": return "#7fc39a";
      case "hard": return "#b9cfa4";
      case "regular": return "#d8cbb0";
      case "fail": return "#c98f6a";
      case "fumble": return "#a83232";
      default: return "#a4977c";
    }
  };

  return (
    <div
      className="coc-dice-panel fixed bottom-4 right-4 z-40 flex flex-col gap-1.5 items-end"
      aria-label="Игральные кости"
    >
      {open && history.length > 0 && (
        <div className="coc-panel px-3 py-2 w-64 max-h-72 overflow-y-auto coc-scroll" style={{ boxShadow: "0 14px 40px rgba(0,0,0,0.7)" }}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="coc-label">Журнал бросков</span>
            <button
              onClick={() => {
                setHistory([]);
                saveHistory([]);
              }}
              className="coc-mono text-[0.6rem] text-[#6e6350] hover:text-[#a83232]"
              title="Очистить журнал"
            >
              очистить
            </button>
          </div>
          <ul className="space-y-1">
            {history.map((r) => (
              <li key={r.id} className="flex items-center gap-2 text-[0.7rem] border-b border-[#1d1810] pb-1 last:border-0">
                <span className="coc-mono font-bold w-8 text-right" style={{ color: levelColor(r.level) }}>
                  {r.roll}
                </span>
                <span className="coc-mono text-[0.6rem] text-[#4a4234]">
                  {r.kind === "check" ? `/ ${r.value}` : `d${r.sides}`}
                </span>
                <span className="truncate flex-1 text-[#a4977c]" title={r.label}>{r.label}</span>
                {r.level && (
                  <span className="coc-mono text-[0.58rem] shrink-0" style={{ color: levelColor(r.level) }}>
                    {r.level === "critical" ? "КРИТ" : r.level === "fumble" ? "КРАХ" : CHECK_LEVEL_RU[r.level].split(" ")[0].toUpperCase()}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-end gap-1.5">
        <button
          onClick={() => setOpen((o) => !o)}
          className="coc-btn !p-2 !px-2.5"
          style={{ background: "linear-gradient(to bottom, rgba(20,17,9,0.95), rgba(10,8,5,0.95))" }}
          title={open ? "Скрыть журнал бросков" : `Журнал бросков (${history.length})`}
          aria-label="Журнал бросков"
        >
          <span className="coc-mono text-xs text-[#7fc39a]">{open ? "▾" : "🕘"}</span>
        </button>
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
    </div>
  );
}
