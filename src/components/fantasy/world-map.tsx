"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ParchmentCard, RuneSeal } from "@/components/fantasy/ui";
import { Badge } from "@/components/ui/badge";
import type { Country, MapRegion, MapCity } from "@/lib/types";
import { MapPin, X, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

/**
 * Stylized interactive world map of «За гранью тьмы».
 *
 * Regions are loaded from /api/lore/map-regions (admin-created via Чертог Божества).
 * Each region is a polygon defined by a "x,y x,y ..." points string (used directly
 * as the SVG <polygon points="..."> attribute). Optional countryName links the
 * region to a Country in the Knowledge Base for click→KB navigation.
 *
 * Pure SVG/CSS — no external map library. Responsive via 1000×680 viewBox.
 */

// Auto-palette for regions without an explicit fill/stroke. Cycles by index.
// Preserves the original oklch hues for visual continuity with the old map.
const REGION_COLORS: { fill: string; stroke: string }[] = [
  { fill: "oklch(0.55 0.12 75 / 0.35)", stroke: "oklch(0.78 0.13 85)" },
  { fill: "oklch(0.45 0.08 250 / 0.35)", stroke: "oklch(0.65 0.10 240)" },
  { fill: "oklch(0.45 0.12 150 / 0.35)", stroke: "oklch(0.65 0.14 145)" },
  { fill: "oklch(0.50 0.10 70 / 0.35)", stroke: "oklch(0.70 0.12 65)" },
  { fill: "oklch(0.50 0.14 30 / 0.35)", stroke: "oklch(0.65 0.15 25)" },
  { fill: "oklch(0.20 0.02 270 / 0.6)", stroke: "oklch(0.35 0.05 270)" },
];

// Parse a points string "x1,y1 x2,y2 ..." into a list of [x, y] number pairs.
function parsePoints(points: string): Array<[number, number]> {
  const result: Array<[number, number]> = [];
  for (const token of points.trim().split(/\s+/)) {
    if (!token) continue;
    const [xs, ys] = token.split(",");
    const x = Number(xs);
    const y = Number(ys);
    if (Number.isFinite(x) && Number.isFinite(y)) result.push([x, y]);
  }
  return result;
}

// Parse a cities JSON string into an array of { name, x, y, icon }. Guarded.
function parseCities(raw: string | null): MapCity[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (c): c is MapCity =>
          c &&
          typeof c === "object" &&
          typeof c.name === "string" &&
          typeof c.x === "number" &&
          typeof c.y === "number"
      )
      .map((c) => ({
        name: c.name,
        x: c.x,
        y: c.y,
        icon: typeof c.icon === "string" ? c.icon : "📍",
      }));
  } catch {
    return [];
  }
}

// Centroid of a polygon (simple average of all x and y). Used as a label fallback.
function centroid(pts: Array<[number, number]>): { x: number; y: number } | null {
  if (pts.length === 0) return null;
  let sx = 0;
  let sy = 0;
  for (const [x, y] of pts) {
    sx += x;
    sy += y;
  }
  return { x: sx / pts.length, y: sy / pts.length };
}

interface ParsedRegion {
  id: string;
  name: string;
  countryName: string | null;
  points: string; // raw "x,y x,y" for <polygon points="">
  labelX: number;
  labelY: number;
  fill: string;
  stroke: string;
  cities: MapCity[];
}

export function WorldMap({ onNavigateToCountry }: { onNavigateToCountry?: () => void } = {}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [hoveredCity, setHoveredCity] = useState<{ name: string; x: number; y: number } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  // Display settings — persisted in localStorage (client-only lazy init to avoid hydration mismatch).
  const [settings, setSettings] = useState<{ cities: boolean; labels: boolean; compass: boolean; legend: boolean; waves: boolean }>(() => {
    if (typeof window === "undefined") return { cities: true, labels: true, compass: true, legend: true, waves: true };
    try {
      const raw = localStorage.getItem("worldmap-settings");
      return raw ? JSON.parse(raw) : { cities: true, labels: true, compass: true, legend: true, waves: true };
    } catch { return { cities: true, labels: true, compass: true, legend: true, waves: true }; }
  });
  const updateSetting = (key: keyof typeof settings, val: boolean) => {
    const next = { ...settings, [key]: val };
    setSettings(next);
    try { localStorage.setItem("worldmap-settings", JSON.stringify(next)); } catch { /* ignore */ }
  };
  const setSelectedCountryName = useAppStore((s) => s.setSelectedCountryName);

  // Fetch countries (for detail panel lookup by region.countryName).
  const { data: countries, isLoading: countriesLoading } = useQuery<Country[]>({
    queryKey: ["countries"],
    queryFn: () => fetch("/api/lore/countries").then((r) => r.json()),
  });

  // Fetch map regions from DB (admin-created, sorted by order asc).
  const { data: rawRegions, isLoading: regionsLoading } = useQuery<MapRegion[]>({
    queryKey: ["map-regions"],
    queryFn: () => fetch("/api/lore/map-regions").then((r) => r.json()),
  });

  // Parse each region: points string, cities JSON, fill/stroke auto-palette, label centroid fallback.
  const regions: ParsedRegion[] = (rawRegions ?? []).map((r, idx) => {
    const pts = parsePoints(r.points);
    const c =
      r.labelX != null && r.labelY != null
        ? { x: r.labelX, y: r.labelY }
        : (centroid(pts) ?? { x: 500, y: 340 });
    const palette = REGION_COLORS[idx % REGION_COLORS.length];
    return {
      id: r.id,
      name: r.name,
      countryName: r.countryName,
      points: r.points,
      labelX: c.x,
      labelY: c.y,
      fill: r.fill ?? palette.fill,
      stroke: r.stroke ?? palette.stroke,
      cities: parseCities(r.cities),
    };
  });

  const countryMap = new Map<string, Country>();
  (countries ?? []).forEach((c) => countryMap.set(c.name, c));

  const selRegion = regions.find((r) => r.name === selected) ?? null;
  const selCountry = selRegion?.countryName ? countryMap.get(selRegion.countryName) ?? null : null;

  const isEmpty = !regionsLoading && regions.length === 0;

  // Centralized click handler for regions and cities.
  const handleRegionActivate = (region: ParsedRegion) => {
    setSelected(region.name);
    if (region.countryName) {
      setSelectedCountryName(region.countryName);
      onNavigateToCountry?.();
    }
  };

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-6">
      {/* ===== MAP ===== */}
      <ParchmentCard className="parchment-map p-2 md:p-4 relative">
        {/* Settings gear button — hidden when empty */}
        {!isEmpty && (
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-parchment-dark/30 border border-gold/30 text-gold/70 hover:text-gold hover:border-gold/60 transition-all flex items-center justify-center"
            aria-label="Настройки карты"
            title="Настройки карты"
          >
            <Settings className="w-4 h-4" />
          </button>
        )}
        {/* Settings panel */}
        {showSettings && !isEmpty && (
          <div className="absolute top-12 right-3 z-20 w-56 p-3 rounded-lg bg-parchment border border-gold/30 shadow-xl space-y-2">
            <p className="font-[family-name:var(--font-cinzel)] text-xs parchment-heading uppercase tracking-wider border-b border-parchment-dark/20 pb-1 mb-1">Настройки карты</p>
            {([
              { key: "cities" as const, label: "🏙️ Города и локации" },
              { key: "labels" as const, label: "🏷️ Названия стран" },
              { key: "compass" as const, label: "🧭 Компас" },
              { key: "legend" as const, label: "📜 Легенда снизу" },
              { key: "waves" as const, label: "🌊 Волны моря" },
            ]).map((opt) => (
              <label key={opt.key} className="flex items-center gap-2 cursor-pointer text-sm parchment-text hover:text-wine transition-colors">
                <input
                  type="checkbox"
                  checked={settings[opt.key]}
                  onChange={(e) => updateSetting(opt.key, e.target.checked)}
                  className="accent-wine"
                />
                {opt.label}
              </label>
            ))}
          </div>
        )}

        {/* Loading state */}
        {regionsLoading ? (
          <div className="h-[420px] flex items-center justify-center parchment-muted italic">
            ✦ Разворачиваем карту... ✦
          </div>
        ) : isEmpty ? (
          /* Empty state — no regions in DB yet */
          <div className="h-[420px] flex items-center justify-center">
            <div className="text-center max-w-md px-4">
              <MapPin className="w-10 h-10 text-gold/40 mx-auto mb-3" />
              <p className="font-[family-name:var(--font-cinzel)] text-xl parchment-heading mb-2">Карта мира пуста</p>
              <p className="text-sm text-foreground/60">
                Создайте регионы в Чертоге Божества → Карта мира.
              </p>
            </div>
          </div>
        ) : (
          <svg
            viewBox="0 0 1000 680"
            className="w-full h-auto"
            role="img"
            aria-label="Карта мира За гранью тьмы"
          >
            {/* Decorative gradients + filter definitions */}
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

            {/* Decorative wave lines (sea) — toggleable */}
            {settings.waves && [60, 620, 640, 660].map((y) => (
              <path
                key={y}
                d={`M 20 ${y} Q 60 ${y - 4} 100 ${y} T 200 ${y} T 300 ${y} T 400 ${y} T 500 ${y} T 600 ${y} T 700 ${y} T 800 ${y} T 900 ${y}`}
                fill="none"
                stroke="oklch(0.50 0.05 240 / 0.12)"
                strokeWidth="0.8"
              />
            ))}

            {/* Regions — rendered as <polygon> from DB points string */}
            {regions.map((r) => {
              const isSel = selected === r.name;
              return (
                <g
                  key={r.id}
                  onClick={() => handleRegionActivate(r)}
                  className="cursor-pointer"
                  role="button"
                  aria-label={`Регион: ${r.name}`}
                >
                  <polygon
                    points={r.points}
                    fill={r.fill}
                    stroke={r.stroke}
                    strokeWidth={isSel ? 3 : 1.5}
                    filter={isSel ? "url(#region-glow)" : undefined}
                    className="transition-all duration-300 hover:opacity-90"
                  />
                  {/* Label — toggleable */}
                  {settings.labels && (
                    <text
                      x={r.labelX}
                      y={r.labelY}
                      textAnchor="middle"
                      className="font-[family-name:var(--font-cinzel)] pointer-events-none select-none"
                      fill="oklch(0.25 0.03 50)"
                      fontSize={isSel ? "20" : "16"}
                      fontWeight="600"
                      style={{ textShadow: "0 1px 2px oklch(0.95 0.04 75 / 0.6)" }}
                    >
                      {r.name}
                    </text>
                  )}
                </g>
              );
            })}

            {/* City markers — SVG pins on top of regions, with hover tooltip (toggleable) */}
            {settings.cities && regions.flatMap((r) =>
              r.cities.map((city) => {
                const pin = "oklch(0.55 0.17 30)";
                const pinStroke = "oklch(0.30 0.10 25)";
                return (
                  <g
                    key={`${r.id}-${city.name}`}
                    className="cursor-pointer"
                    role="button"
                    aria-label={`Город: ${city.name}`}
                    onMouseEnter={() => setHoveredCity({ name: city.name, x: city.x, y: city.y })}
                    onMouseLeave={() => setHoveredCity(null)}
                    onClick={() => handleRegionActivate(r)}
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

            {/* Compass rose — decorative, bottom right (toggleable) */}
            {settings.compass && (
              <g transform="translate(900 600)" opacity="0.5">
                <circle cx="0" cy="0" r="28" fill="none" stroke="oklch(0.40 0.05 60 / 0.4)" strokeWidth="1" />
                <path d="M 0 -28 L 4 0 L 0 28 L -4 0 Z" fill="oklch(0.40 0.05 60 / 0.5)" />
                <path d="M -28 0 L 0 4 L 28 0 L 0 -4 Z" fill="oklch(0.40 0.05 60 / 0.3)" />
                <text x="0" y="-32" textAnchor="middle" fontSize="9" fill="oklch(0.40 0.05 60)" className="font-[family-name:var(--font-cinzel)]">N</text>
              </g>
            )}

            {/* Title cartouche */}
            <g transform="translate(40 40)" opacity="0.8">
              <rect x="-6" y="-18" width="220" height="36" rx="4" fill="oklch(0.93 0.045 75 / 0.7)" stroke="oklch(0.65 0.13 75 / 0.5)" />
              <text x="104" y="6" textAnchor="middle" fontSize="18" fontWeight="700" fill="oklch(0.30 0.10 25)" className="font-[family-name:var(--font-cinzel-decorative)]">
                ✦ Мир За гранью тьмы ✦
              </text>
            </g>
          </svg>
        )}

        {/* Legend — toggleable; hidden when empty/loading */}
        {settings.legend && !isEmpty && !regionsLoading && (
        <div className="mt-3 flex flex-wrap gap-2 justify-center text-xs">
          {regions.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelected(r.name)}
              className={cn(
                "px-2 py-1 rounded border transition-all flex items-center gap-1.5",
                selected === r.name
                  ? "border-gold bg-gold/10 text-gold"
                  : "border-foreground/20 text-foreground/60 hover:border-gold/40 hover:text-gold"
              )}
            >
              <span
                className="inline-block w-2.5 h-2.5 rounded-sm border"
                style={{ background: r.fill, borderColor: r.stroke }}
              />
              {r.name}
            </button>
          ))}
        </div>
        )}
      </ParchmentCard>

      {/* ===== DETAIL PANEL ===== */}
      <div className="min-h-[400px]">
        {regions.length === 0 ? (
          <ParchmentCard className="text-center parchment-muted italic py-12">
            ✦ Карта мира пуста ✦
          </ParchmentCard>
        ) : countriesLoading ? (
          <ParchmentCard className="text-center parchment-muted italic py-12">
            ✦ Разворачиваем карту... ✦
          </ParchmentCard>
        ) : selRegion && selCountry ? (
          /* Full country detail card (banner, description, facts, cities from region) */
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
            {/* Cities & locations — from the selected region */}
            {selRegion.cities.length > 0 && (
              <div className="mt-3 pt-3 border-t border-parchment-dark/20">
                <p className="parchment-heading text-xs uppercase tracking-wider mb-2">📍 Города и локации</p>
                <div className="space-y-1">
                  {selRegion.cities.map((c, i) => (
                    <div key={c.name} className="flex items-center gap-2 text-xs">
                      <span className="text-base">{c.icon}</span>
                      <span className="parchment-text flex-1">{c.name}</span>
                      {i === 0 && <Badge variant="outline" className="border-gold/30 text-gold/70 text-[9px] px-1 py-0">столица</Badge>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </ParchmentCard>
        ) : selRegion ? (
          /* Simple region card — no country link (or no matching country) */
          <ParchmentCard key={selRegion.id} className="animate-reveal overflow-hidden">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <RuneSeal icon={<span className="text-2xl">🗺️</span>} size="sm" />
                <h3 className="font-[family-name:var(--font-cinzel)] text-xl parchment-heading">{selRegion.name}</h3>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-foreground/40 hover:text-wine transition-colors"
                aria-label="Закрыть карточку"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {selRegion.cities.length > 0 ? (
              <div className="pt-3 border-t border-parchment-dark/20">
                <p className="parchment-heading text-xs uppercase tracking-wider mb-2">📍 Города и локации</p>
                <div className="space-y-1">
                  {selRegion.cities.map((c, i) => (
                    <div key={c.name} className="flex items-center gap-2 text-xs">
                      <span className="text-base">{c.icon}</span>
                      <span className="parchment-text flex-1">{c.name}</span>
                      {i === 0 && <Badge variant="outline" className="border-gold/30 text-gold/70 text-[9px] px-1 py-0">столица</Badge>}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="parchment-muted text-sm italic pt-3 border-t border-parchment-dark/20">
                У этого региона пока нет городов.
              </p>
            )}
          </ParchmentCard>
        ) : (
          /* No region selected — generic empty state */
          <ParchmentCard className="empty-portal text-center">
            <MapPin className="w-10 h-10 text-gold/40 mx-auto mb-3" />
            <p className="font-[family-name:var(--font-garamond)] italic text-lg mb-1">Кликни по земле на карте</p>
            <p className="text-sm text-foreground/60">
              Царства мира за гранью тьмы ждут. Найди то, что ищешь, — или то, что найдёт тебя.
            </p>
          </ParchmentCard>
        )}
      </div>
    </div>
  );
}
