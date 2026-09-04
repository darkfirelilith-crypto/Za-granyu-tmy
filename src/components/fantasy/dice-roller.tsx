"use client";

import { useState, useEffect, useCallback } from "react";
import { Dices, X, RotateCcw, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/* ===== Standard dice ===== */
const STD_DICE = [
  { sides: 4, label: "d4", icon: "🔺" },
  { sides: 6, label: "d6", icon: "🎲" },
  { sides: 8, label: "d8", icon: "🛡️" },
  { sides: 10, label: "d10", icon: "⬛" },
  { sides: 12, label: "d12", icon: "🔷" },
  { sides: 20, label: "d20", icon: "🐉" },
  { sides: 100, label: "d100", icon: "💯" },
] as const;

interface RollResult {
  id: string;
  notation: string; // e.g. "2d6+3"
  rolls: number[]; // individual dice
  modifier: number;
  total: number;
  at: number; // timestamp
}

/** Parse a dice notation like "2d6+3", "1d20", "d20-1", "3d8" */
function parseNotation(input: string): { count: number; sides: number; modifier: number } | null {
  const m = input.trim().toLowerCase().match(/^(\d*)d(\d+)(?:([+-])(\d+))?$/);
  if (!m) return null;
  const count = m[1] ? parseInt(m[1], 10) : 1;
  const sides = parseInt(m[2], 10);
  const sign = m[3] === "-" ? -1 : 1;
  const modifier = m[4] ? sign * parseInt(m[4], 10) : 0;
  if (count < 1 || count > 100) return null;
  if (sides < 2 || sides > 1000) return null;
  return { count, sides, modifier };
}

function rollDice(count: number, sides: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    out.push(1 + Math.floor(Math.random() * sides));
  }
  return out;
}

/** Result formatting: highlight natural 20 (d20) and natural 1 (crit fail).
 *  Chips live on a parchment (light) background, so use ink/dark colors that
 *  are readable regardless of the page theme (text-foreground would be light in dark mode). */
function dieColor(roll: number, sides: number): string {
  if (sides === 20) {
    if (roll === 20) return "text-ink bg-gold/50 border-gold font-extrabold";
    if (roll === 1) return "text-red-800 border-red-700/50 bg-red-200/40";
  }
  return "text-ink";
}

export function DiceRoller() {
  const [open, setOpen] = useState(false);
  const [notation, setNotation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [last, setLast] = useState<RollResult | null>(null);
  const [rolling, setRolling] = useState(false);

  // Hydrate history from localStorage via lazy initializer (client-only).
  // Safe from hydration mismatch: history is not rendered until the dialog opens
  // (post-mount user interaction), so server renders [] and client's stored value
  // never appears in the initial DOM.
  const [history, setHistory] = useState<RollResult[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem("dice-history");
      return raw ? (JSON.parse(raw) as RollResult[]) : [];
    } catch {
      return [];
    }
  });

  // Persist history to localStorage on change (external-system write, no setState).
  useEffect(() => {
    try {
      localStorage.setItem("dice-history", JSON.stringify(history.slice(0, 50)));
    } catch {
      /* ignore */
    }
  }, [history]);

  const doRoll = useCallback(
    (count: number, sides: number, modifier: number, notationStr: string) => {
      setRolling(true);
      setError(null);
      // tiny delay for tactile feel
      setTimeout(() => {
        const rolls = rollDice(count, sides);
        const sum = rolls.reduce((a, b) => a + b, 0);
        const total = sum + modifier;
        const result: RollResult = {
          id: Math.random().toString(36).slice(2),
          notation: notationStr,
          rolls,
          modifier,
          total,
          at: Date.now(),
        };
        setLast(result);
        setHistory((h) => [result, ...h].slice(0, 50));
        setRolling(false);
      }, 180);
    },
    []
  );

  const rollStandard = (sides: number) => {
    doRoll(1, sides, 0, `1d${sides}`);
  };

  const rollNotation = () => {
    const parsed = parseNotation(notation);
    if (!parsed) {
      setError("Формат: NdX±M (напр. 2d6+3, 1d20, d100-1)");
      return;
    }
    const sign = parsed.modifier >= 0 ? "+" : "-";
    const mod = parsed.modifier !== 0 ? `${sign}${Math.abs(parsed.modifier)}` : "";
    doRoll(parsed.count, parsed.sides, parsed.modifier, `${parsed.count}d${parsed.sides}${mod}`);
  };

  const clearHistory = () => {
    setHistory([]);
    setLast(null);
  };

  // Keyboard shortcut: press "d" to open (when not typing in a field)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "d" && !open) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA" && !(e.target as HTMLElement)?.isContentEditable) {
          e.preventDefault();
          setOpen(true);
        }
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <>
      {/* Floating action button — bottom right, above footer */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-16 h-16 rounded-full bg-gradient-to-b from-[oklch(0.55_0.17_30)] to-[oklch(0.38_0.15_25)] border-2 border-gold/50 text-gold shadow-lg hover:scale-105 hover:border-gold transition-all flex items-center justify-center group"
        aria-label="Открыть кости судьбы (клавиша D)"
        title="Кости судьбы (D)"
      >
        <Dices className="w-8 h-8 group-hover:rotate-12 transition-transform" />
        <span className="absolute -top-1 -right-1 text-xs bg-gold text-ink rounded-full w-5 h-5 flex items-center justify-center font-bold opacity-0 group-hover:opacity-100 transition-opacity">D</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="parchment gold-frame max-w-md">
          <DialogTitle className="sr-only">Кости судьбы</DialogTitle>
          <DialogDescription className="sr-only">
            Бросок кубиков для D&D: стандартные d4–d100 и кастомные нотации вида NdX±M.
          </DialogDescription>

          {/* Header — visible title is decorative (h2); semantic heading is DialogTitle above */}
          <div className="flex items-center justify-between mb-3">
            <div className="font-[family-name:var(--font-cinzel)] text-xl text-wine tracking-wide flex items-center gap-2">
              <Dices className="w-6 h-6" /> Кости судьбы
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-wine/60 hover:text-wine transition-colors"
              aria-label="Закрыть"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Last result — big display */}
          <div className="mb-4 p-4 rounded-lg bg-parchment-dark/20 border border-wine/20 text-center min-h-[88px] flex flex-col items-center justify-center">
            {last ? (
              <>
                <div className="text-xs font-[family-name:var(--font-cinzel)] text-wine/70 uppercase tracking-wider">
                  {last.notation}
                </div>
                <div
                  className={cn(
                    "font-[family-name:var(--font-cinzel)] text-5xl font-bold leading-tight",
                    rolling ? "opacity-30" : "text-wine"
                  )}
                >
                  {rolling ? "🎲" : last.total}
                </div>
                <div className="text-xs text-ink/60 mt-1">
                  {last.rolls.join(" + ")}
                  {last.modifier !== 0 && (
                    <span className="text-wine">
                      {" "}
                      {last.modifier > 0 ? "+" : "−"} {Math.abs(last.modifier)}
                    </span>
                  )}
                  {" = "}
                </div>
                {/* individual dice as chips */}
                <div className="flex flex-wrap gap-1 justify-center mt-2">
                  {last.rolls.map((r, i) => (
                    <span
                      key={i}
                      className={cn(
                        "inline-flex items-center justify-center w-7 h-7 rounded border text-xs font-bold",
                        "border-wine/30 bg-parchment/60",
                        dieColor(r, last.rolls.length === 1 ? parseInt(last.notation.match(/d(\d+)/)?.[1] ?? "0") : 0)
                      )}
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <p className="font-[family-name:var(--font-garamond)] italic text-ink/50">
                Брось кость, авантюрист — судьба ждёт.
              </p>
            )}
          </div>

          {/* Standard dice row */}
          <div className="grid grid-cols-7 gap-1.5 mb-3">
            {STD_DICE.map((d) => (
              <button
                key={d.sides}
                onClick={() => rollStandard(d.sides)}
                disabled={rolling}
                className="btn-parchment flex flex-col items-center gap-0.5 py-1.5 px-0.5 disabled:opacity-50"
                aria-label={`Бросить ${d.label}`}
              >
                <span className="text-lg leading-none">{d.icon}</span>
                <span className="text-[10px]">{d.label}</span>
              </button>
            ))}
          </div>

          {/* Custom notation */}
          <div className="flex gap-2 mb-2">
            <Input
              value={notation}
              onChange={(e) => setNotation(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && rollNotation()}
              placeholder="2d6+3, d20, 3d8-1…"
              className="bg-parchment/60 border-wine/30 text-ink placeholder:text-ink/40 font-mono text-sm"
              aria-label="Кастомная нотация броска"
            />
            <Button
              onClick={rollNotation}
              disabled={rolling}
              className="btn-wine-solid shrink-0"
            >
              <RotateCcw className={cn("w-4 h-4 mr-1", rolling && "animate-spin")} />
              Бросок
            </Button>
          </div>
          {error && (
            <p className="text-xs text-red-700 mb-2 font-[family-name:var(--font-garamond)] italic">{error}</p>
          )}

          {/* History */}
          {history.length > 0 && (
            <div className="mt-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-[family-name:var(--font-cinzel)] text-wine/70 uppercase tracking-wider">
                  Хроника бросков
                </span>
                <button
                  onClick={clearHistory}
                  className="text-xs text-wine/50 hover:text-red-700 flex items-center gap-1 transition-colors"
                  aria-label="Очистить хронику"
                >
                  <Trash2 className="w-3 h-3" /> Очистить
                </button>
              </div>
              <div className="max-h-36 overflow-y-auto fantasy-scroll space-y-1 pr-1">
                {history.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between text-sm px-2 py-1 rounded bg-parchment-dark/10 hover:bg-parchment-dark/20 transition-colors"
                  >
                    <span className="font-mono text-ink/70 text-xs">{r.notation}</span>
                    <span className="text-ink/50 text-xs">
                      {r.rolls.join(",")}
                      {r.modifier !== 0 && (
                        <span className="text-wine"> {r.modifier > 0 ? "+" : "−"}{Math.abs(r.modifier)}</span>
                      )}
                    </span>
                    <span className="font-[family-name:var(--font-cinzel)] font-bold text-wine">{r.total}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-center text-[11px] text-ink/40 mt-3 font-[family-name:var(--font-garamond)] italic">
            Клавиша «D» открывает кости · Esc закрывает · история хранится в браузере
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
