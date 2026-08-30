"use client";

import { cn } from "@/lib/utils";

/**
 * Compact read-only mini world map for embedding inside the Knowledge Base
 * Countries tab. Highlights the currently selected country.
 * Uses the same region polygons as the main WorldMap (hand-laid SVG),
 * but smaller and without city markers / hover tooltips.
 */

const REGIONS: { name: string; d: string; labelX: number; labelY: number }[] = [
  { name: "Эльдрион", d: "M 380 240 L 470 220 L 520 250 L 540 310 L 510 360 L 440 380 L 380 350 L 360 290 Z", labelX: 450, labelY: 300 },
  { name: "Крагмарск", d: "M 250 80 L 420 60 L 560 90 L 540 180 L 470 220 L 380 240 L 300 200 L 240 140 Z", labelX: 400, labelY: 150 },
  { name: "Сильмариэль", d: "M 120 200 L 250 80 L 300 200 L 360 290 L 300 360 L 180 380 L 100 320 L 80 250 Z", labelX: 200, labelY: 270 },
  { name: "Удунголь", d: "M 560 90 L 760 110 L 880 180 L 920 300 L 860 400 L 720 420 L 620 380 L 540 310 L 520 250 L 540 180 Z", labelX: 720, labelY: 260 },
  { name: "Вес'Харан", d: "M 300 360 L 440 380 L 510 360 L 560 420 L 540 500 L 460 540 L 360 530 L 300 480 L 280 420 Z", labelX: 420, labelY: 460 },
  { name: "Мёртвые Земли", d: "M 540 310 L 620 380 L 720 420 L 700 500 L 620 560 L 540 540 L 460 540 L 540 500 L 560 420 L 510 360 Z", labelX: 620, labelY: 470 },
];

const REGION_FILL: Record<string, string> = {
  Эльдрион: "oklch(0.55 0.12 75 / 0.35)",
  Крагмарск: "oklch(0.45 0.08 250 / 0.35)",
  Сильмариэль: "oklch(0.45 0.12 150 / 0.35)",
  Удунголь: "oklch(0.50 0.10 70 / 0.35)",
  "Вес'Харан": "oklch(0.50 0.14 30 / 0.35)",
  "Мёртвые Земли": "oklch(0.20 0.02 270 / 0.6)",
};

export function MiniWorldMap({
  selected,
  onSelect,
}: {
  selected: string | null;
  onSelect: (name: string) => void;
}) {
  return (
    <svg viewBox="0 0 1000 680" className="w-full h-auto" role="img" aria-label="Мини-карта мира">
      {/* Sea background */}
      <rect x="0" y="0" width="1000" height="680" fill="oklch(0.30 0.04 240 / 0.08)" />

      {/* Regions */}
      {REGIONS.map((r) => {
        const isSel = selected === r.name;
        const isDead = r.name === "Мёртвые Земли";
        return (
          <g
            key={r.name}
            onClick={() => onSelect(r.name)}
            className="cursor-pointer"
            role="button"
            aria-label={`Регион: ${r.name}`}
          >
            <path
              d={r.d}
              fill={REGION_FILL[r.name] ?? REGION_FILL["Эльдрион"]}
              stroke={isSel ? "oklch(0.85 0.15 88)" : isDead ? "oklch(0.35 0.05 270)" : "oklch(0.65 0.11 75 / 0.5)"}
              strokeWidth={isSel ? 4 : 1.5}
              className="transition-all duration-200 hover:opacity-90"
              style={isSel ? { filter: "drop-shadow(0 0 6px oklch(0.78 0.13 85 / 0.5))" } : undefined}
            />
            {/* Country name label */}
            <text
              x={r.labelX}
              y={r.labelY}
              textAnchor="middle"
              className="font-[family-name:var(--font-cinzel)] pointer-events-none select-none"
              fill={isDead ? "oklch(0.70 0.02 270)" : "oklch(0.25 0.03 50)"}
              fontSize={isSel ? "18" : "13"}
              fontWeight={isSel ? "700" : "500"}
              style={{ textShadow: "0 1px 2px oklch(0.95 0.04 75 / 0.7)" }}
            >
              {r.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
