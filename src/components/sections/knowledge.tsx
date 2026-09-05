"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/store/app-store";
import { OrnamentTitle } from "@/components/fantasy/ornament-title";
import { ParchmentCard, RuneSeal, RelationBadge } from "@/components/fantasy/ui";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { Country, Personality, CountryRelation, WorldSystem, God, Legend } from "@/lib/types";
import { ExpandablePortrait } from "@/components/fantasy/expandable-portrait";
import { ExpandableImage } from "@/components/fantasy/expandable-image";
import { FormattedText } from "@/components/fantasy/formatted-text";
import { Search, MapPin, Crown, Link2, Scale, Sun, BookMarked, Globe2, Sparkle as SparkleIcon } from "lucide-react";

export function KnowledgeView() {
  const { knowledgeTab, setKnowledgeTab } = useAppStore();
  const [search, setSearch] = useState("");
  const { data: content } = useQuery<any[]>({ queryKey: ["site-content"], queryFn: () => fetch("/api/content").then((r) => r.json()).catch(() => []) });
  const intro = (Array.isArray(content) ? content : []).find((c) => c.key === "knowledge_intro");

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-10 space-y-8">
      <OrnamentTitle size="lg" flourish="📖">
        База Знаний
      </OrnamentTitle>
      <p className="text-center text-foreground/70 font-[family-name:var(--font-garamond)] italic max-w-2xl mx-auto">
        {intro?.body || "Древняя библиотека мира за гранью тьмы."}
      </p>

      <Tabs value={knowledgeTab} onValueChange={(v) => setKnowledgeTab(v as any)} className="w-full">
        <div className="flex justify-center overflow-x-auto pb-2">
          <TabsList className="bg-background/40 border border-gold/20 flex flex-wrap h-auto">
            <TabsTrigger value="countries" className="font-[family-name:var(--font-cinzel)] data-[state=active]:text-gold">
              <MapPin className="w-4 h-4 mr-1" /> Страны
            </TabsTrigger>
            <TabsTrigger value="personalities" className="font-[family-name:var(--font-cinzel)] data-[state=active]:text-gold">
              <Crown className="w-4 h-4 mr-1" /> Персонажи
            </TabsTrigger>
            <TabsTrigger value="relations" className="font-[family-name:var(--font-cinzel)] data-[state=active]:text-gold">
              <Link2 className="w-4 h-4 mr-1" /> Отношения
            </TabsTrigger>
            <TabsTrigger value="systems" className="font-[family-name:var(--font-cinzel)] data-[state=active]:text-gold">
              <Scale className="w-4 h-4 mr-1" /> Мировая Система
            </TabsTrigger>
            <TabsTrigger value="pantheon" className="font-[family-name:var(--font-cinzel)] data-[state=active]:text-gold">
              <Sun className="w-4 h-4 mr-1" /> Пантеон
            </TabsTrigger>
            <TabsTrigger value="legends" className="font-[family-name:var(--font-cinzel)] data-[state=active]:text-gold">
              <BookMarked className="w-4 h-4 mr-1" /> Легенды
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex justify-center pt-2">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gold/50" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по свиткам..."
              className="pl-9 bg-background/40 border-gold/20 text-foreground placeholder:text-foreground/40"
            />
          </div>
        </div>

        <TabsContent value="countries" className="mt-6"><CountriesTab search={search} /></TabsContent>
        <TabsContent value="personalities" className="mt-6"><PersonalitiesTab search={search} /></TabsContent>
        <TabsContent value="relations" className="mt-6"><RelationsTab search={search} /></TabsContent>
        <TabsContent value="systems" className="mt-6"><SystemsTab search={search} /></TabsContent>
        <TabsContent value="pantheon" className="mt-6"><PantheonTab search={search} /></TabsContent>
        <TabsContent value="legends" className="mt-6"><LegendsTab search={search} /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ===== COUNTRIES ===== */
function CountriesTab({ search }: { search: string }) {
  const { data, isLoading } = useQuery<Country[]>({
    queryKey: ["countries"],
    queryFn: () => fetch("/api/lore/countries").then((r) => r.json()),
  });
  const { selectedCountryName, setSelectedCountryName } = useAppStore();
  const [selected, setSelected] = useState<string | null>(null);
  if (isLoading) return <LoadingScroll />;
  const items = (data ?? []).filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));
  if (items.length === 0) {
    return <EmptyState text={search ? "Стран не найдено" : "Свиток стран пока пуст"} sub={search ? "Попробуй иной поиск" : "Божество наполнит его землями мира"} />;
  }
  // If a country was selected from the world map (selectedCountryName), pre-select it
  // and clear the cross-view signal so it doesn't override future manual selections.
  const preSelected = selectedCountryName ? items.find((c) => c.name === selectedCountryName) : undefined;
  const sel = items.find((c) => c.id === selected) ?? preSelected ?? items[0];
  return (
    <div className="grid lg:grid-cols-[260px_1fr] gap-5">
      <div className="space-y-2 max-h-[70vh] overflow-y-auto fantasy-scroll pr-2">
        {items.map((c) => (
          <button
            key={c.id}
            onClick={() => { setSelected(c.id); setSelectedCountryName(null); }}
            className={`w-full text-left px-3 py-2 rounded border transition-all ${
              sel?.id === c.id
                ? "bg-gold/10 border-gold/40 text-gold"
                : "bg-background/30 border-gold/10 text-foreground/70 hover:border-gold/30 hover:text-gold"
            }`}
          >
            <span className="mr-2">{c.emblem ?? "🗺️"}</span>
            <span className="font-[family-name:var(--font-cinzel)] text-sm">{c.name}</span>
          </button>
        ))}
      </div>
      {sel && (
        <div className="space-y-4">
          <ParchmentCard key={sel.id} className="animate-reveal overflow-hidden">
          {/* Banner image — full width, proper aspect ratio, no cropping */}
          {sel.banner && (
            <ExpandableImage src={sel.banner} alt={sel.name} className="mb-4" />
          )}
          {/* Header — emblem + name + capital */}
          <div className="flex items-start gap-4 mb-5">
            {!sel.banner && <RuneSeal icon={<span className="text-3xl">{sel.emblem ?? "🗺️"}</span>} size="lg" />}
            <div className="flex-1 min-w-0">
              <h3 className="font-[family-name:var(--font-cinzel)] text-2xl parchment-heading">{sel.name}</h3>
              {sel.capital && <p className="parchment-muted text-sm mt-0.5">🏰 Столица: {sel.capital}</p>}
              {sel.emblem && <p className="text-2xl mt-1">{sel.emblem}</p>}
            </div>
          </div>
          {/* Description */}
          <FormattedText className="lore-prose text-base leading-relaxed mb-5">{sel.description}</FormattedText>
          {/* Info grid */}
          <div className="grid sm:grid-cols-3 gap-4 pt-4 border-t border-parchment-dark/30">
            {sel.government && <Field label="Правление" value={sel.government} />}
            {sel.population && <Field label="Население" value={sel.population} />}
            {sel.climate && <Field label="Климат" value={sel.climate} />}
          </div>
          {sel.culture && (
            <div className="mt-4 pt-4 border-t border-parchment-dark/30">
              <p className="parchment-heading text-sm uppercase tracking-wider mb-1">Культура</p>
              <p className="parchment-muted text-sm whitespace-pre-line">{sel.culture}</p>
            </div>
          )}
          </ParchmentCard>
        </div>
      )}
    </div>
  );
}

/* ===== PERSONALITIES ===== */
function PersonalitiesTab({ search }: { search: string }) {
  const { data, isLoading } = useQuery<Personality[]>({
    queryKey: ["personalities"],
    queryFn: () => fetch("/api/lore/personalities").then((r) => r.json()),
  });
  const [selected, setSelected] = useState<string | null>(null);
  if (isLoading) return <LoadingScroll />;
  const items = (data ?? []).filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
  if (items.length === 0) {
    return <EmptyState text={search ? "Личностей не найдено" : "Летопись личностей пуста"} sub={search ? "Попробуй иной поиск" : "Божество впишет имена героев и злодеев"} />;
  }
  const sel = items.find((p) => p.id === selected) ?? items[0];
  return (
    <div className="grid lg:grid-cols-[260px_1fr] gap-5">
      <div className="space-y-2 max-h-[70vh] overflow-y-auto fantasy-scroll pr-2">
        {items.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelected(p.id)}
            className={`w-full text-left px-3 py-2 rounded border transition-all ${
              sel?.id === p.id
                ? "bg-gold/10 border-gold/40 text-gold"
                : "bg-background/30 border-gold/10 text-foreground/70 hover:border-gold/30 hover:text-gold"
            }`}
          >
            <span className="font-[family-name:var(--font-cinzel)] text-sm">{p.name}</span>
            {p.title && <p className="text-sm parchment-muted/80">{p.title}</p>}
          </button>
        ))}
      </div>
      {sel && (
        <ParchmentCard key={sel.id} className="animate-reveal overflow-hidden">
          {/* Header with portrait — expandable thumbnail in corner */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h3 className="font-[family-name:var(--font-cinzel)] text-2xl parchment-heading">{sel.name}</h3>
                <StatusBadge status={sel.status} />
                {sel.isNpc && <Badge variant="outline" className="border-wine/30 text-wine text-sm">🎭 НПС</Badge>}
              </div>
              {sel.title && <p className="parchment-heading text-sm mb-2">{sel.title}</p>}
              {/* Race / age / gender info */}
              <div className="flex flex-wrap gap-3 text-sm parchment-muted">
                {sel.race && <span>🧬 {sel.race}</span>}
                {sel.age && <span>📅 {sel.age}</span>}
                {sel.gender && <span>⚧ {sel.gender}</span>}
                {sel.affiliation && <span>🏛️ {sel.affiliation}</span>}
              </div>
            </div>
            {sel.portrait ? (
              <ExpandablePortrait src={sel.portrait} alt={sel.name} size="lg" />
            ) : (
              <div className="shrink-0">
                <RuneSeal icon={<span className="text-3xl">{getPersonIcon(sel)}</span>} size="lg" />
              </div>
            )}
          </div>
          {/* Appearance (if exists) */}
          {sel.appearance && (
            <div className="mb-4 p-3 bg-parchment-dark/10 rounded-lg">
              <p className="parchment-heading text-sm uppercase tracking-wider mb-1">Внешность</p>
              <p className="parchment-muted text-sm whitespace-pre-line">{sel.appearance}</p>
            </div>
          )}
          {/* Description */}
          <FormattedText className="lore-prose text-base leading-relaxed mb-5">{sel.description}</FormattedText>
          {/* Info grid */}
          <div className="flex flex-wrap gap-4 pt-4 border-t border-parchment-dark/30 text-sm">
            {sel.affiliation && <Field label="Принадлежность" value={sel.affiliation} />}
            {sel.role && <Field label="Должность" value={sel.role} />}
          </div>
        </ParchmentCard>
      )}
    </div>
  );
}

/* ===== RELATIONS ===== */
function RelationsTab({ search }: { search: string }) {
  const { data, isLoading } = useQuery<CountryRelation[]>({
    queryKey: ["relations"],
    queryFn: () => fetch("/api/lore/relations").then((r) => r.json()),
  });
  const { data: countries } = useQuery<any[]>({
    queryKey: ["countries"],
    queryFn: () => fetch("/api/lore/countries").then((r) => r.json()),
  });
  const [selected, setSelected] = useState<string | null>(null);
  if (isLoading) return <LoadingScroll />;
  const items = (Array.isArray(data) ? data : []).filter(
    (r) =>
      r.countryAName.toLowerCase().includes(search.toLowerCase()) ||
      r.countryBName.toLowerCase().includes(search.toLowerCase())
  );
  if (items.length === 0) {
    return <EmptyState text={search ? "Связей не найдено" : "Межгосударственные связи ещё не записаны"} sub={search ? "Попробуй иной поиск" : undefined} />;
  }
  const sel = items.find((r) => r.id === selected) ?? items[0];

  // Build relation map data — unique countries + their positions on a circle
  const countryNames = new Set<string>();
  items.forEach((r) => { countryNames.add(r.countryAName); countryNames.add(r.countryBName); });
  const countryList = Array.from(countryNames);
  const angleStep = (2 * Math.PI) / Math.max(countryList.length, 1);
  const radius = 35; // % of viewBox
  const cx = 50, cy = 50;
  const nodePositions: Record<string, { x: number; y: number }> = {};
  countryList.forEach((name, i) => {
    const angle = i * angleStep - Math.PI / 2;
    nodePositions[name] = { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  });

  const relationColors: Record<string, string> = {
    ally: "#22c55e", enemy: "#ef4444", neutral: "#a3a3a3", trade: "#f59e0b", vassal: "#a855f7",
  };
  const relationLabels: Record<string, string> = {
    ally: "Союз", enemy: "Вражда", neutral: "Нейтралитет", trade: "Торговля", vassal: "Вассал",
  };

  return (
    <div className="space-y-5">
      {/* Relation map — SVG with nodes and colored lines */}
      <ParchmentCard className="p-3 overflow-hidden">
        <p className="text-center text-sm parchment-heading uppercase tracking-wider mb-2">Карта взаимоотношений</p>
        <svg viewBox="0 0 100 100" className="w-full" style={{ maxHeight: "50vh" }}>
          {/* Lines between countries */}
          {items.map((r) => {
            const a = nodePositions[r.countryAName];
            const b = nodePositions[r.countryBName];
            if (!a || !b) return null;
            const color = relationColors[r.relationType] ?? "#a3a3a3";
            const isSel = sel?.id === r.id;
            return (
              <g key={r.id} onClick={() => setSelected(r.id)} className="cursor-pointer">
                <line
                  x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke={color}
                  strokeWidth={isSel ? 1.2 : 0.6}
                  opacity={isSel ? 1 : 0.5}
                  strokeDasharray={r.relationType === "neutral" ? "2 1" : undefined}
                />
              </g>
            );
          })}
          {/* Country nodes */}
          {countryList.map((name) => {
            const pos = nodePositions[name];
            if (!pos) return null;
            const c = (Array.isArray(countries) ? countries : []).find((co) => co.name === name);
            return (
              <g key={name}>
                <circle cx={pos.x} cy={pos.y} r="3" fill="oklch(0.55 0.12 75)" stroke="oklch(0.78 0.13 85)" strokeWidth="0.5" />
                <text x={pos.x} y={pos.y - 4.5} textAnchor="middle" fontSize="2.5" fill="oklch(0.25 0.03 50)" className="font-[family-name:var(--font-cinzel)]" style={{ fontWeight: 600 }}>
                  {c?.emblem ?? "📍"} {name.length > 12 ? name.slice(0, 10) + "…" : name}
                </text>
              </g>
            );
          })}
        </svg>
        {/* Legend */}
        <div className="flex flex-wrap gap-3 justify-center mt-2 text-sm">
          {Object.entries(relationLabels).map(([type, label]) => (
            <span key={type} className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 rounded" style={{ background: relationColors[type] }} />
              <span className="parchment-muted">{label}</span>
            </span>
          ))}
        </div>
      </ParchmentCard>

      {/* List + detail */}
      <div className="grid lg:grid-cols-[260px_1fr] gap-5">
        <div className="space-y-2 max-h-[50vh] overflow-y-auto fantasy-scroll pr-2">
          {items.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelected(r.id)}
              className={`w-full text-left px-3 py-2 rounded border transition-all ${
                sel?.id === r.id
                  ? "bg-gold/10 border-gold/40 text-gold"
                  : "bg-background/30 border-gold/10 text-foreground/70 hover:border-gold/30 hover:text-gold"
              }`}
            >
              <p className="font-[family-name:var(--font-cinzel)] text-sm truncate">{r.countryAName}</p>
              <p className="text-sm parchment-muted/80 truncate">↔ {r.countryBName}</p>
            </button>
          ))}
        </div>
        {sel && (
          <ParchmentCard key={sel.id} className="animate-reveal overflow-hidden">
            <div className="flex items-center justify-center gap-4 flex-wrap text-center mb-4">
              <h3 className="font-[family-name:var(--font-cinzel)] text-2xl parchment-heading">{sel.countryAName}</h3>
              <RelationBadge type={sel.relationType} />
              <h3 className="font-[family-name:var(--font-cinzel)] text-2xl parchment-heading">{sel.countryBName}</h3>
            </div>
            {sel.description ? (
              <FormattedText className="lore-prose text-base leading-relaxed">{sel.description}</FormattedText>
            ) : (
              <p className="parchment-muted italic text-center">Описание связи не записано.</p>
            )}
          </ParchmentCard>
        )}
      </div>
    </div>
  );
}

/* ===== WORLD SYSTEMS ===== */
function SystemsTab({ search }: { search: string }) {
  const { data, isLoading } = useQuery<WorldSystem[]>({
    queryKey: ["systems"],
    queryFn: () => fetch("/api/lore/systems").then((r) => r.json()),
  });
  const [selected, setSelected] = useState<string | null>(null);
  if (isLoading) return <LoadingScroll />;
  const items = (data ?? []).filter((s) => s.title.toLowerCase().includes(search.toLowerCase()) || s.category.toLowerCase().includes(search.toLowerCase()));
  const catLabel: Record<string, string> = {
    POLITICS: "Политика", ECONOMY: "Экономика", MILITARY: "Военное дело",
    MAGIC: "Магия", RELIGION: "Религия", LAW: "Закон",
  };
  if (items.length === 0) {
    return <EmptyState text={search ? "Систем не найдено" : "Мировые системы ещё не описаны"} sub={search ? "Попробуй иной поиск" : undefined} />;
  }
  const sel = items.find((s) => s.id === selected) ?? items[0];
  return (
    <div className="grid lg:grid-cols-[260px_1fr] gap-5">
      <div className="space-y-2 max-h-[70vh] overflow-y-auto fantasy-scroll pr-2">
        {items.map((s) => (
          <button
            key={s.id}
            onClick={() => setSelected(s.id)}
            className={`w-full text-left px-3 py-2 rounded border transition-all ${
              sel?.id === s.id
                ? "bg-gold/10 border-gold/40 text-gold"
                : "bg-background/30 border-gold/10 text-foreground/70 hover:border-gold/30 hover:text-gold"
            }`}
          >
            <span className="mr-2">{s.icon ?? "📜"}</span>
            <span className="font-[family-name:var(--font-cinzel)] text-sm">{s.title}</span>
            <p className="text-sm parchment-muted/80">{catLabel[s.category] ?? s.category}</p>
          </button>
        ))}
      </div>
      {sel && (
        <ParchmentCard key={sel.id} className="animate-reveal overflow-hidden">
          {sel.image && (
            <ExpandableImage src={sel.image} alt={sel.title} className="mb-4" />
          )}
          <div className="flex items-start gap-4 mb-4">
            {!sel.image && <RuneSeal icon={<span className="text-3xl">{sel.icon ?? "📜"}</span>} size="md" />}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-[family-name:var(--font-cinzel)] text-2xl parchment-heading">{sel.title}</h3>
                <Badge variant="outline" className="border-gold/30 text-gold/70 text-sm">
                  {catLabel[sel.category] ?? sel.category}
                </Badge>
              </div>
            </div>
          </div>
          <FormattedText className="lore-prose text-base leading-relaxed">{sel.description}</FormattedText>
        </ParchmentCard>
      )}
    </div>
  );
}

/* ===== PANTHEON ===== */
function PantheonTab({ search }: { search: string }) {
  const { data, isLoading } = useQuery<God[]>({
    queryKey: ["gods"],
    queryFn: () => fetch("/api/lore/gods").then((r) => r.json()),
  });
  const [selected, setSelected] = useState<string | null>(null);
  if (isLoading) return <LoadingScroll />;
  const items = (data ?? []).filter((g) => g.name.toLowerCase().includes(search.toLowerCase()) || g.domain.toLowerCase().includes(search.toLowerCase()));
  if (items.length === 0) {
    return <EmptyState text={search ? "Богов не найдено" : "Пантеон ещё не сформирован"} sub={search ? "Попробуй иной поиск" : "Здесь появятся боги и божества вашего мира"} />;
  }
  // Pantheon tier styling: Старшие (gold), Младшие (silver), Алый (wine)
  const pantheonStyle: Record<string, string> = {
    Старшие: "border-gold/50 text-gold/90 bg-gold/10",
    Младшие: "border-zinc-400/50 text-zinc-600 bg-zinc-300/10",
    Алый: "border-wine/50 text-wine/90 bg-wine/10",
  };
  const sel = items.find((g) => g.id === selected) ?? items[0];
  return (
    <div className="grid lg:grid-cols-[260px_1fr] gap-5">
      <div className="space-y-2 max-h-[70vh] overflow-y-auto fantasy-scroll pr-2">
        {items.map((g) => (
          <button
            key={g.id}
            onClick={() => setSelected(g.id)}
            className={`w-full text-left px-3 py-2 rounded border transition-all ${
              sel?.id === g.id
                ? "bg-gold/10 border-gold/40 text-gold"
                : "bg-background/30 border-gold/10 text-foreground/70 hover:border-gold/30 hover:text-gold"
            }`}
          >
            <span className="mr-2">{g.symbol ?? "✨"}</span>
            <span className="font-[family-name:var(--font-cinzel)] text-sm">{g.name}</span>
            <p className="text-sm parchment-muted/80 truncate">{g.domain}{g.pantheon ? ` · ${g.pantheon}` : ""}</p>
          </button>
        ))}
      </div>
      {sel && (
        <ParchmentCard key={sel.id} className="animate-reveal overflow-hidden">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="font-[family-name:var(--font-cinzel)] text-2xl parchment-heading">{sel.name}</h3>
                <Badge variant="outline" className="border-gold/30 text-gold/70 text-sm">
                  {sel.domain}
                </Badge>
                {sel.pantheon && (
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-[family-name:var(--font-cinzel)] uppercase tracking-wider ${pantheonStyle[sel.pantheon] ?? "border-gold/30 text-gold/70"}`}>
                    {sel.pantheon}
                  </span>
                )}
              </div>
              {sel.title && <p className="parchment-heading text-sm uppercase tracking-wider mb-2">{sel.title}</p>}
              {sel.alignment && (
                <span className={`inline-flex items-center gap-1 text-sm font-[family-name:var(--font-cinzel)] uppercase tracking-wider px-2 py-1 rounded ${
                  sel.alignment === "good" ? "text-green-700 bg-green-100/40 border border-green-600/30" :
                  sel.alignment === "evil" ? "text-red-800 bg-red-100/40 border border-red-700/30" :
                  "text-zinc-600 bg-zinc-200/40 border border-zinc-500/30"
                }`}>
                  <span className="text-base leading-none">{sel.alignment === "good" ? "☀" : sel.alignment === "evil" ? "🌑" : "⚖"}</span>
                  {sel.alignment === "good" ? "Добро" : sel.alignment === "evil" ? "Зло" : "Нейтралитет"}
                </span>
              )}
            </div>
            {sel.image ? (
              <ExpandablePortrait src={sel.image} alt={sel.name} size="lg" />
            ) : (
              <div className="shrink-0">
                <RuneSeal
                  icon={<span className="text-3xl">{sel.symbol ?? "✨"}</span>}
                  size="lg"
                  glow={sel.alignment === "evil"}
                />
              </div>
            )}
          </div>
          <FormattedText className="lore-prose text-base leading-relaxed">{sel.description}</FormattedText>
        </ParchmentCard>
      )}
    </div>
  );
}

/* ===== LEGENDS ===== */
function LegendsTab({ search }: { search: string }) {
  const { data, isLoading } = useQuery<Legend[]>({
    queryKey: ["legends"],
    queryFn: () => fetch("/api/lore/legends").then((r) => r.json()),
  });
  const [selected, setSelected] = useState<string | null>(null);
  if (isLoading) return <LoadingScroll />;
  const items = (data ?? []).filter((l) => l.title.toLowerCase().includes(search.toLowerCase()));
  if (items.length === 0) {
    return <EmptyState text={search ? "Легенд не найдено" : "Легенды этого мира ещё не поведаны"} sub={search ? "Попробуй иной поиск" : undefined} />;
  }
  const sel = items.find((l) => l.id === selected) ?? items[0];
  return (
    <div className="grid lg:grid-cols-[260px_1fr] gap-5">
      <div className="space-y-2 max-h-[70vh] overflow-y-auto fantasy-scroll pr-2">
        {items.map((l) => (
          <button
            key={l.id}
            onClick={() => setSelected(l.id)}
            className={`w-full text-left px-3 py-2 rounded border transition-all ${
              sel?.id === l.id
                ? "bg-gold/10 border-gold/40 text-gold"
                : "bg-background/30 border-gold/10 text-foreground/70 hover:border-gold/30 hover:text-gold"
            }`}
          >
            <span className="mr-2">{l.icon ?? "📖"}</span>
            <span className="font-[family-name:var(--font-cinzel)] text-sm">{l.title}</span>
            {l.era && <p className="text-sm parchment-muted/80 italic truncate">{l.era}</p>}
          </button>
        ))}
      </div>
      {sel && (
        <ParchmentCard key={sel.id} className="animate-reveal overflow-hidden">
          {sel.image && (
            <ExpandableImage src={sel.image} alt={sel.title} className="mb-4" />
          )}
          <div className="flex items-start gap-4 mb-4">
            {!sel.image && <RuneSeal icon={<span className="text-3xl">{sel.icon ?? "📖"}</span>} size="md" />}
            <div className="flex-1 min-w-0">
              <h3 className="font-[family-name:var(--font-cinzel)] text-2xl parchment-heading">{sel.title}</h3>
              {sel.era && <p className="parchment-muted text-sm italic mt-0.5">{sel.era}</p>}
            </div>
          </div>
          <FormattedText className="lore-prose text-base leading-relaxed">{sel.content}</FormattedText>
        </ParchmentCard>
      )}
    </div>
  );
}

/* ===== helpers ===== */
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="parchment-heading text-sm uppercase tracking-wider">{label}</p>
      <p className="parchment-text text-sm">{value}</p>
    </div>
  );
}
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    alive: { label: "Жив", cls: "text-green-700 border-green-600/30" },
    deceased: { label: "Погиб", cls: "text-red-700 border-red-700/30" },
    missing: { label: "Пропал", cls: "text-amber-700 border-amber-700/30" },
  };
  const m = map[status] ?? { label: status, cls: "" };
  return (
    <span className={`text-sm px-2 py-0.5 rounded border font-[family-name:var(--font-cinzel)] uppercase ${m.cls}`}>
      {m.label}
    </span>
  );
}
function LoadingScroll() {
  return (
    <div className="flex justify-center py-20">
      <p className="text-gold/60 font-[family-name:var(--font-cinzel)] animate-flicker">
        ✦ Разворачиваем свиток... ✦
      </p>
    </div>
  );
}
function EmptyState({ text, sub }: { text: string; sub?: string }) {
  return (
    <div className="col-span-full text-center py-16 flex flex-col items-center gap-3">
      <span className="text-5xl opacity-40 animate-flicker">❦</span>
      <p className="font-[family-name:var(--font-garamond)] italic text-lg text-foreground/60">{text}</p>
      {sub && <p className="text-sm text-foreground/40 font-[family-name:var(--font-cinzel)] tracking-wide">{sub}</p>}
    </div>
  );
}
function getPersonIcon(p: Personality) {
  const r = (p.role ?? "").toLowerCase();
  if (r.includes("маг") || r.includes("arch")) return "🔮";
  if (r.includes("монарх") || r.includes("корол") || r.includes("влады")) return "👑";
  if (r.includes("адмирал") || r.includes("капитан")) return "⚓";
  if (r.includes("убийц") || r.includes("гильд")) return "🗡️";
  if (r.includes("лич")) return "💀";
  return "🧙";
}
