"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ParchmentCard, RuneSeal } from "@/components/fantasy/ui";
import { Badge } from "@/components/ui/badge";
import type { Country } from "@/lib/types";
import { MapPin, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Stylized interactive world map of «За гранью тьмы».
 * 6 countries are hand-laid SVG polygons positioned to evoke a fantasy continent.
 * Clicking a region opens a detail popover (banner + description + facts).
 * Pure SVG/CSS — no external map library. Responsive via viewBox.
 */

// Region definitions: name must match Country.name in DB.
// Coordinates are in a 1000×680 viewBox.
const REGIONS: {
  name: string;
  emoji: string;
  d: string; // SVG path
  labelX: number;
  labelY: number;
  cities: { name: string; x: number; y: number; icon: string }[];
}[] = [
  {
    name: "Эльдрион",
    emoji: "☀️",
    // Central bastion of light — heart of the map
    d: "M 380 240 L 470 220 L 520 250 L 540 310 L 510 360 L 440 380 L 380 350 L 360 290 Z",
    labelX: 450,
    labelY: 300,
    cities: [
      { name: "Эльдрион-Ситэ", x: 450, y: 320, icon: "🏛️" },
      { name: "Храм Аэтериуса", x: 420, y: 260, icon: "✨" },
    ],
  },
  {
    name: "Крагмарск",
    emoji: "🪓",
    // North — cold fjords
    d: "M 250 80 L 420 60 L 560 90 L 540 180 L 470 220 L 380 240 L 300 200 L 240 140 Z",
    labelX: 400,
    labelY: 150,
    cities: [
      { name: "Крагмар", x: 400, y: 160, icon: "🏰" },
      { name: "Фьорд Сигурда", x: 300, y: 130, icon: "⚓" },
    ],
  },
  {
    name: "Сильмариэль",
    emoji: "🌿",
    // West — enchanted forest
    d: "M 120 200 L 250 80 L 300 200 L 360 290 L 300 360 L 180 380 L 100 320 L 80 250 Z",
    labelX: 200,
    labelY: 270,
    cities: [
      { name: "Сильмар", x: 200, y: 290, icon: "🌳" },
    ],
  },
  {
    name: "Удунголь",
    emoji: "🏹",
    // East — vast steppe
    d: "M 560 90 L 760 110 L 880 180 L 920 300 L 860 400 L 720 420 L 620 380 L 540 310 L 520 250 L 540 180 Z",
    labelX: 720,
    labelY: 260,
    cities: [
      { name: "Удун (кочует)", x: 740, y: 280, icon: "⛺" },
      { name: "Ставка хана Батыра", x: 700, y: 230, icon: "🏹" },
    ],
  },
  {
    name: "Вес'Харан",
    emoji: "⚖️",
    // South — river delta trade
    d: "M 300 360 L 440 380 L 510 360 L 560 420 L 540 500 L 460 540 L 360 530 L 300 480 L 280 420 Z",
    labelX: 420,
    labelY: 460,
    cities: [
      { name: "Харан", x: 440, y: 470, icon: "🕌" },
      { name: "Гавань Вес'Харан", x: 480, y: 520, icon: "⛵" },
    ],
  },
  {
    name: "Мёртвые Земли",
    emoji: "☠️",
    // Center-south — the wound (glassy, dark)
    d: "M 540 310 L 620 380 L 720 420 L 700 500 L 620 560 L 540 540 L 460 540 L 540 500 L 560 420 L 510 360 Z",
    labelX: 620,
    labelY: 470,
    cities: [
      { name: "Разлом Падения", x: 620, y: 480, icon: "💀" },
      { name: "Чертог Слёз Алого", x: 580, y: 420, icon: "🔥" },
    ],
  },
];

const REGION_COLORS: Record<string, { fill: string; stroke: string }> = {
  Эльдрион: { fill: "oklch(0.55 0.12 75 / 0.35)", stroke: "oklch(0.78 0.13 85)" },
  Крагмарск: { fill: "oklch(0.45 0.08 250 / 0.35)", stroke: "oklch(0.65 0.10 240)" },
  Сильмариэль: { fill: "oklch(0.45 0.12 150 / 0.35)", stroke: "oklch(0.65 0.14 145)" },
  Удунголь: { fill: "oklch(0.50 0.10 70 / 0.35)", stroke: "oklch(0.70 0.12 65)" },
  "Вес'Харан": { fill: "oklch(0.50 0.14 30 / 0.35)", stroke: "oklch(0.65 0.15 25)" },
  "Мёртвые Земли": { fill: "oklch(0.20 0.02 270 / 0.6)", stroke: "oklch(0.35 0.05 270)" },
};

export function WorldMap({ onNavigateToCountry }: { onNavigateToCountry?: () => void } = {}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [hoveredCity, setHoveredCity] = useState<{ name: string; x: number; y: number } | null>(null);
  const { data: countries, isLoading } = useQuery<Country[]>({
    queryKey: ["countries"],
    queryFn: () => fetch("/api/lore/countries").then((r) => r.json()),
  });

  const countryMap = new Map<string, Country>();
  (countries ?? []).forEach((c) => countryMap.set(c.name, c));
  const selCountry = selected ? countryMap.get(selected) : null;

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-6">
      {/* ===== MAP ===== */}
      <ParchmentCard className="parchment-map p-2 md:p-4 relative">
        <svg
          viewBox="0 0 1000 680"
          className="w-full h-auto"
          role="img"
          aria-label="Карта мира За гранью тьмы"
        >
          {/* Decorative compass + border flourishes */}
          <defs>
            <radialGradient id="sea-grad" cx="50%" cy="50%" r="70%">
              <stop offset="0%" stopColor="oklch(0.30 0.04 240 / 0.15)" />
              <stop offset="100%" stopColor="oklch(0.20 0.02 260 / 0.05)" />
            </radialGradient>
            <pattern id="parchment-tex" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="10" cy="10" r="0.5" fill="oklch(0.40 0.05 60 / 0.08)" />
              <circle cx="30" cy="25" r="0.5" fill="oklch(0.40 0.05 60 / 0.06)" />
            </pattern>
            <filter id="region-glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Sea background */}
          <rect x="0" y="0" width="1000" height="680" fill="url(#sea-grad)" />
          <rect x="0" y="0" width="1000" height="680" fill="url(#parchment-tex)" />

          {/* Decorative wave lines (sea) */}
          {[60, 620, 640, 660].map((y) => (
            <path
              key={y}
              d={`M 20 ${y} Q 60 ${y - 4} 100 ${y} T 200 ${y} T 300 ${y} T 400 ${y} T 500 ${y} T 600 ${y} T 700 ${y} T 800 ${y} T 900 ${y}`}
              fill="none"
              stroke="oklch(0.50 0.05 240 / 0.12)"
              strokeWidth="0.8"
            />
          ))}

          {/* Regions */}
          {REGIONS.map((r) => {
            const colors = REGION_COLORS[r.name] ?? REGION_COLORS["Эльдрион"];
            const isSel = selected === r.name;
            const isDead = r.name === "Мёртвые Земли";
            return (
              <g
                key={r.name}
                onClick={() => setSelected(r.name)}
                className="cursor-pointer"
                role="button"
                aria-label={`Регион: ${r.name}`}
              >
                <path
                  d={r.d}
                  fill={colors.fill}
                  stroke={colors.stroke}
                  strokeWidth={isSel ? 3 : 1.5}
                  filter={isSel ? "url(#region-glow)" : undefined}
                  className="transition-all duration-300 hover:opacity-90"
                  style={isDead ? { filter: "url(#region-glow)" } : undefined}
                />
                {/* Dead lands — ominous cracks */}
                {isDead && (
                  <>
                    <path d="M 580 400 L 620 460 L 660 520" stroke="oklch(0.15 0 0 / 0.5)" strokeWidth="1.5" fill="none" />
                    <path d="M 600 380 L 650 440 L 700 500" stroke="oklch(0.15 0 0 / 0.4)" strokeWidth="1" fill="none" />
                  </>
                )}
                {/* Label */}
                <text
                  x={r.labelX}
                  y={r.labelY}
                  textAnchor="middle"
                  className="font-[family-name:var(--font-cinzel)] pointer-events-none select-none"
                  fill={isDead ? "oklch(0.70 0.02 270)" : "oklch(0.25 0.03 50)"}
                  fontSize={isSel ? "20" : "16"}
                  fontWeight="600"
                  style={{ textShadow: "0 1px 2px oklch(0.95 0.04 75 / 0.6)" }}
                >
                  {r.emoji} {r.name}
                </text>
              </g>
            );
          })}

          {/* City markers — SVG pins on top of regions, with hover tooltip */}
          {REGIONS.flatMap((r) =>
            r.cities.map((city) => {
              const isDead = r.name === "Мёртвые Земли";
              const pin = isDead ? "oklch(0.80 0.10 15)" : "oklch(0.55 0.17 30)";
              const pinStroke = isDead ? "oklch(0.30 0 0)" : "oklch(0.30 0.10 25)";
              return (
                <g
                  key={`${r.name}-${city.name}`}
                  className="cursor-pointer"
                  role="button"
                  aria-label={`Город: ${city.name}`}
                  onMouseEnter={() => setHoveredCity({ name: city.name, x: city.x, y: city.y })}
                  onMouseLeave={() => setHoveredCity(null)}
                  onClick={() => { setSelected(r.name); onNavigateToCountry?.(); }}
                >
                  {/* Invisible larger hit area for easier hover */}
                  <circle cx={city.x} cy={city.y - 2} r="12" fill="transparent" />
                  {/* Pin: a drop shape */}
                  <circle
                    cx={city.x}
                    cy={city.y - 2}
                    r="6"
                    fill={pin}
                    stroke={pinStroke}
                    strokeWidth="1.5"
                    className="transition-all duration-200"
                    style={{ filter: "drop-shadow(0 1px 2px oklch(0 0 0 / 0.4))" }}
                  />
                  {/* Pin stem */}
                  <line
                    x1={city.x}
                    y1={city.y + 2}
                    x2={city.x}
                    y2={city.y + 10}
                    stroke={pinStroke}
                    strokeWidth="1.5"
                  />
                  {/* City icon (small, above pin) */}
                  <text
                    x={city.x}
                    y={city.y - 10}
                    textAnchor="middle"
                    fontSize="12"
                    className="pointer-events-none select-none"
                  >
                    {city.icon}
                  </text>
                  {/* Always-visible small label for capital cities (first city in list) */}
                  {city === r.cities[0] && (
                    <text
                      x={city.x}
                      y={city.y + 22}
                      textAnchor="middle"
                      fontSize="9"
                      fill="oklch(0.25 0.05 50)"
                      className="font-[family-name:var(--font-cinzel)] pointer-events-none select-none font-semibold"
                      style={{ textShadow: "0 1px 2px oklch(0.95 0.04 75 / 0.8)" }}
                    >
                      {city.name}
                    </text>
                  )}
                </g>
              );
            })
          )}

          {/* Hover tooltip for city — rendered last so it's on top */}
          {hoveredCity && (
            <g pointerEvents="none">
              {/* Tooltip background box */}
              {(() => {
                const tw = hoveredCity.name.length * 6.5 + 16;
                const th = 22;
                const tx = hoveredCity.x - tw / 2;
                const ty = hoveredCity.y - 38;
                return (
                  <>
                    <rect
                      x={tx}
                      y={ty}
                      width={tw}
                      height={th}
                      rx={4}
                      fill="oklch(0.25 0.04 45 / 0.95)"
                      stroke="oklch(0.65 0.13 75 / 0.6)"
                      strokeWidth="1"
                    />
                    {/* Tooltip stem (little arrow pointing down) */}
                    <path
                      d={`M ${hoveredCity.x - 5} ${ty + th} L ${hoveredCity.x} ${ty + th + 6} L ${hoveredCity.x + 5} ${ty + th} Z`}
                      fill="oklch(0.25 0.04 45 / 0.95)"
                      stroke="oklch(0.65 0.13 75 / 0.6)"
                      strokeWidth="1"
                    />
                    <text
                      x={hoveredCity.x}
                      y={ty + 15}
                      textAnchor="middle"
                      fontSize="11"
                      fontWeight="600"
                      fill="oklch(0.88 0.13 85)"
                      className="font-[family-name:var(--font-cinzel)] select-none"
                    >
                      {hoveredCity.name}
                    </text>
                  </>
                );
              })()}
            </g>
          )}

          {/* Compass rose — decorative, bottom right */}
          <g transform="translate(900 600)" opacity="0.5">
            <circle cx="0" cy="0" r="28" fill="none" stroke="oklch(0.40 0.05 60 / 0.4)" strokeWidth="1" />
            <path d="M 0 -28 L 4 0 L 0 28 L -4 0 Z" fill="oklch(0.40 0.05 60 / 0.5)" />
            <path d="M -28 0 L 0 4 L 28 0 L 0 -4 Z" fill="oklch(0.40 0.05 60 / 0.3)" />
            <text x="0" y="-32" textAnchor="middle" fontSize="9" fill="oklch(0.40 0.05 60)" className="font-[family-name:var(--font-cinzel)]">N</text>
          </g>

          {/* Title cartouche */}
          <g transform="translate(40 40)" opacity="0.8">
            <rect x="-6" y="-18" width="220" height="36" rx="4" fill="oklch(0.93 0.045 75 / 0.7)" stroke="oklch(0.65 0.13 75 / 0.5)" />
            <text x="104" y="6" textAnchor="middle" fontSize="18" fontWeight="700" fill="oklch(0.30 0.10 25)" className="font-[family-name:var(--font-cinzel-decorative)]">
              ✦ Мир За гранью тьмы ✦
            </text>
          </g>
        </svg>

        {/* Legend */}
        <div className="mt-3 flex flex-wrap gap-2 justify-center text-xs">
          {REGIONS.map((r) => (
            <button
              key={r.name}
              onClick={() => setSelected(r.name)}
              className={cn(
                "px-2 py-1 rounded border transition-all",
                selected === r.name
                  ? "border-gold bg-gold/10 text-gold"
                  : "border-foreground/20 text-foreground/60 hover:border-gold/40 hover:text-gold"
              )}
            >
              <span className="mr-1">{r.emoji}</span>
              {r.name}
            </button>
          ))}
        </div>
      </ParchmentCard>

      {/* ===== DETAIL PANEL ===== */}
      <div className="min-h-[400px]">
        {isLoading ? (
          <ParchmentCard className="text-center parchment-muted italic py-12">
            ✦ Разворачиваем карту... ✦
          </ParchmentCard>
        ) : selCountry ? (
          <ParchmentCard key={selCountry.id} className="animate-reveal overflow-hidden">
            {/* Banner */}
            {selCountry.banner && (
              <div className="w-full h-32 overflow-hidden mb-3 rounded-lg gold-frame">
                <img src={selCountry.banner} alt={selCountry.name} className="w-full h-full object-cover object-top" />
              </div>
            )}
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <RuneSeal icon={<span className="text-2xl">{selCountry.emblem ?? "🗺️"}</span>} size="sm" />
                <div>
                  <h3 className="font-[family-name:var(--font-cinzel)] text-xl parchment-heading">{selCountry.name}</h3>
                  {selCountry.capital && <p className="parchment-muted text-xs">🏰 {selCountry.capital}</p>}
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-foreground/40 hover:text-wine transition-colors"
                aria-label="Закрыть карточку"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Description */}
            <p className="parchment-muted text-sm leading-relaxed mb-3 line-clamp-6">{selCountry.description}</p>
            {/* Facts */}
            <div className="space-y-1.5 pt-3 border-t border-parchment-dark/20 text-xs">
              {selCountry.government && <div className="flex gap-2"><span className="parchment-heading shrink-0">Правление:</span><span className="parchment-muted">{selCountry.government}</span></div>}
              {selCountry.population && <div className="flex gap-2"><span className="parchment-heading shrink-0">Народ:</span><span className="parchment-muted">{selCountry.population}</span></div>}
              {selCountry.climate && <div className="flex gap-2"><span className="parchment-heading shrink-0">Климат:</span><span className="parchment-muted">{selCountry.climate}</span></div>}
            </div>
            {/* Cities & locations */}
            {(() => {
              const region = REGIONS.find((r) => r.name === selCountry.name);
              if (!region || region.cities.length === 0) return null;
              return (
                <div className="mt-3 pt-3 border-t border-parchment-dark/20">
                  <p className="parchment-heading text-xs uppercase tracking-wider mb-2">📍 Города и локации</p>
                  <div className="space-y-1">
                    {region.cities.map((c, i) => (
                      <div key={c.name} className="flex items-center gap-2 text-xs">
                        <span className="text-base">{c.icon}</span>
                        <span className="parchment-text flex-1">{c.name}</span>
                        {i === 0 && <Badge variant="outline" className="border-gold/30 text-gold/70 text-[9px] px-1 py-0">столица</Badge>}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </ParchmentCard>
        ) : (
          <ParchmentCard className="empty-portal text-center">
            <MapPin className="w-10 h-10 text-gold/40 mx-auto mb-3" />
            <p className="font-[family-name:var(--font-garamond)] italic text-lg mb-1">Кликни по земле на карте</p>
            <p className="text-sm text-foreground/60">
              Шесть царств мира за гранью тьмы ждут. Найди то, что ищешь, — или то, что найдёт тебя.
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5 justify-center">
              <Badge variant="outline" className="border-gold/30 text-gold/70 text-[10px]">☀️ Свет</Badge>
              <Badge variant="outline" className="border-blue-400/30 text-blue-500/70 text-[10px]">🪓 Север</Badge>
              <Badge variant="outline" className="border-green-600/30 text-green-700/70 text-[10px]">🌿 Лес</Badge>
              <Badge variant="outline" className="border-amber-600/30 text-amber-700/70 text-[10px]">🏹 Степь</Badge>
              <Badge variant="outline" className="border-wine/30 text-wine/70 text-[10px]">⚖️ Торговля</Badge>
              <Badge variant="outline" className="border-purple-600/30 text-purple-600/70 text-[10px]">☠️ Тьма</Badge>
            </div>
          </ParchmentCard>
        )}
      </div>
    </div>
  );
}
