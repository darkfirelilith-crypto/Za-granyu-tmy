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
import { Search, MapPin, Crown, Link2, Scale, Sun, BookMarked, Globe2 } from "lucide-react";

export function KnowledgeView() {
  const { knowledgeTab, setKnowledgeTab } = useAppStore();
  const [search, setSearch] = useState("");

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-10 space-y-8">
      <OrnamentTitle size="lg" flourish="📖">
        База Знаний
      </OrnamentTitle>
      <p className="text-center text-foreground/70 font-[family-name:var(--font-garamond)] italic max-w-2xl mx-auto">
        Древняя библиотека мира за гранью тьмы. Каждая страница — осколок истины, сохранённый
        летописцами ордена Серебряного Пламени.
      </p>

      <Tabs value={knowledgeTab} onValueChange={(v) => setKnowledgeTab(v as any)} className="w-full">
        <div className="flex justify-center overflow-x-auto pb-2">
          <TabsList className="bg-background/40 border border-gold/20 flex flex-wrap h-auto">
            <TabsTrigger value="countries" className="font-[family-name:var(--font-cinzel)] data-[state=active]:text-gold">
              <MapPin className="w-4 h-4 mr-1" /> Страны
            </TabsTrigger>
            <TabsTrigger value="personalities" className="font-[family-name:var(--font-cinzel)] data-[state=active]:text-gold">
              <Crown className="w-4 h-4 mr-1" /> Личности
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
  const [selected, setSelected] = useState<string | null>(null);
  if (isLoading) return <LoadingScroll />;
  const items = (data ?? []).filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));
  const sel = items.find((c) => c.id === selected) ?? items[0];
  return (
    <div className="grid lg:grid-cols-[260px_1fr] gap-5">
      <div className="space-y-2 max-h-[70vh] overflow-y-auto fantasy-scroll pr-2">
        {items.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelected(c.id)}
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
        <ParchmentCard key={sel.id} className="animate-reveal">
          {sel.banner && (
            <div className="mb-4 -mx-5 -mt-5 md:-mx-6 md:-mt-6 h-40 md:h-52 overflow-hidden rounded-t-lg gold-frame">
              <img src={sel.banner} alt={sel.name} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex items-start gap-4 mb-4">
            <RuneSeal icon={<span className="text-3xl">{sel.emblem ?? "🗺️"}</span>} size="lg" />
            <div>
              <h3 className="font-[family-name:var(--font-cinzel)] text-2xl parchment-heading">{sel.name}</h3>
              {sel.capital && <p className="parchment-muted text-sm">Столица: {sel.capital}</p>}
            </div>
          </div>
          <p className="lore-prose drop-cap">{sel.description}</p>
          <div className="grid sm:grid-cols-2 gap-3 mt-5 pt-4 border-t border-parchment-dark/30">
            {sel.government && <Field label="Правление" value={sel.government} />}
            {sel.population && <Field label="Население" value={sel.population} />}
            {sel.climate && <Field label="Климат" value={sel.climate} />}
          </div>
          {sel.culture && (
            <div className="mt-4 pt-4 border-t border-parchment-dark/30">
              <p className="parchment-heading text-sm mb-1">Культура</p>
              <p className="parchment-muted text-sm">{sel.culture}</p>
            </div>
          )}
        </ParchmentCard>
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
            {p.title && <p className="text-xs parchment-muted/80">{p.title}</p>}
          </button>
        ))}
      </div>
      {sel && (
        <ParchmentCard key={sel.id} className="animate-reveal">
          <div className="flex items-start gap-4 mb-4">
            {sel.portrait ? (
              <div className="w-24 h-32 rounded-lg overflow-hidden gold-frame shrink-0">
                <img src={sel.portrait} alt={sel.name} className="w-full h-full object-cover" />
              </div>
            ) : (
              <RuneSeal icon={<span className="text-3xl">{getPersonIcon(sel)}</span>} size="lg" />
            )}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-[family-name:var(--font-cinzel)] text-2xl parchment-heading">{sel.name}</h3>
                <StatusBadge status={sel.status} />
              </div>
              {sel.title && <p className="parchment-heading text-sm">{sel.title}</p>}
            </div>
          </div>
          <p className="lore-prose drop-cap">{sel.description}</p>
          <div className="flex flex-wrap gap-3 mt-5 pt-4 border-t border-parchment-dark/30 text-sm">
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
  if (isLoading) return <LoadingScroll />;
  const items = (data ?? []).filter(
    (r) =>
      r.countryAName.toLowerCase().includes(search.toLowerCase()) ||
      r.countryBName.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {items.map((r) => (
        <ParchmentCard key={r.id} hover className="space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="font-[family-name:var(--font-cinzel)] parchment-heading">{r.countryAName}</span>
            <RelationBadge type={r.relationType} />
            <span className="font-[family-name:var(--font-cinzel)] parchment-heading">{r.countryBName}</span>
          </div>
          {r.description && <p className="parchment-muted text-sm">{r.description}</p>}
        </ParchmentCard>
      ))}
      {items.length === 0 && <EmptyState text="Не найдено связей" />}
    </div>
  );
}

/* ===== WORLD SYSTEMS ===== */
function SystemsTab({ search }: { search: string }) {
  const { data, isLoading } = useQuery<WorldSystem[]>({
    queryKey: ["systems"],
    queryFn: () => fetch("/api/lore/systems").then((r) => r.json()),
  });
  if (isLoading) return <LoadingScroll />;
  const items = (data ?? []).filter((s) => s.title.toLowerCase().includes(search.toLowerCase()) || s.category.toLowerCase().includes(search.toLowerCase()));
  const catLabel: Record<string, string> = {
    POLITICS: "Политика", ECONOMY: "Экономика", MILITARY: "Военное дело",
    MAGIC: "Магия", RELIGION: "Религия", LAW: "Закон",
  };
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {items.map((s) => (
        <ParchmentCard key={s.id} hover className="space-y-2">
          <div className="flex items-start gap-3">
            <RuneSeal icon={<span className="text-2xl">{s.icon ?? "📜"}</span>} size="sm" />
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-[family-name:var(--font-cinzel)] parchment-heading">{s.title}</h3>
                <Badge variant="outline" className="border-gold/30 text-gold/70 text-xs">
                  {catLabel[s.category] ?? s.category}
                </Badge>
              </div>
              <p className="parchment-muted text-sm mt-1">{s.description}</p>
            </div>
          </div>
        </ParchmentCard>
      ))}
      {items.length === 0 && <EmptyState text="Не найдено систем" />}
    </div>
  );
}

/* ===== PANTHEON ===== */
function PantheonTab({ search }: { search: string }) {
  const { data, isLoading } = useQuery<God[]>({
    queryKey: ["gods"],
    queryFn: () => fetch("/api/lore/gods").then((r) => r.json()),
  });
  if (isLoading) return <LoadingScroll />;
  const items = (data ?? []).filter((g) => g.name.toLowerCase().includes(search.toLowerCase()) || g.domain.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {items.map((g) => (
        <ParchmentCard key={g.id} hover className="text-center space-y-3">
          <RuneSeal
            icon={<span className="text-3xl">{g.symbol ?? "✨"}</span>}
            size="lg"
            className="mx-auto"
            glow={g.alignment === "evil"}
          />
          <div>
            <h3 className="font-[family-name:var(--font-cinzel)] text-xl parchment-heading">{g.name}</h3>
            {g.title && <p className="parchment-heading text-xs uppercase tracking-wider">{g.title}</p>}
          </div>
          <Badge variant="outline" className="border-gold/30 text-gold/70 text-xs">
            {g.domain}
          </Badge>
          <p className="parchment-muted text-sm text-left">{g.description}</p>
          {g.alignment && (
            <div className="pt-2 border-t border-parchment-dark/20">
              <span className={`text-xs font-[family-name:var(--font-cinzel)] uppercase tracking-wider ${
                g.alignment === "good" ? "text-green-600" : g.alignment === "evil" ? "text-red-700" : "text-zinc-500"
              }`}>
                {g.alignment === "good" ? "✦ Добро" : g.alignment === "evil" ? "✦ Зло" : "✦ Нейтралитет"}
              </span>
            </div>
          )}
        </ParchmentCard>
      ))}
    </div>
  );
}

/* ===== LEGENDS ===== */
function LegendsTab({ search }: { search: string }) {
  const { data, isLoading } = useQuery<Legend[]>({
    queryKey: ["legends"],
    queryFn: () => fetch("/api/lore/legends").then((r) => r.json()),
  });
  const [open, setOpen] = useState<string | null>(null);
  if (isLoading) return <LoadingScroll />;
  const items = (data ?? []).filter((l) => l.title.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {items.map((l) => {
        const isOpen = open === l.id;
        return (
          <ParchmentCard key={l.id} hover className="space-y-2 cursor-pointer" >
            <div onClick={() => setOpen(isOpen ? null : l.id)}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{l.icon ?? "📖"}</span>
                <div className="flex-1">
                  <h3 className="font-[family-name:var(--font-cinzel)] parchment-heading">{l.title}</h3>
                  {l.era && <p className="parchment-muted text-xs italic">{l.era}</p>}
                </div>
              </div>
              <p className={`parchment-muted text-sm mt-2 ${isOpen ? "" : "line-clamp-2"}`}>
                {l.content}
              </p>
              <span className="text-xs text-wine font-[family-name:var(--font-cinzel)]">
                {isOpen ? "▲ Свернуть" : "▼ Читать далее"}
              </span>
            </div>
          </ParchmentCard>
        );
      })}
      {items.length === 0 && <EmptyState text="Не найдено легенд" />}
    </div>
  );
}

/* ===== helpers ===== */
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="parchment-heading text-xs uppercase tracking-wider">{label}</p>
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
    <span className={`text-xs px-2 py-0.5 rounded border font-[family-name:var(--font-cinzel)] uppercase ${m.cls}`}>
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
function EmptyState({ text }: { text: string }) {
  return (
    <div className="col-span-full text-center py-12 text-foreground/40 font-[family-name:var(--font-garamond)] italic">
      {text}
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
