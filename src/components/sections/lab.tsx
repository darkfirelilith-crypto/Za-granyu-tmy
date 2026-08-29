"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { OrnamentTitle } from "@/components/fantasy/ornament-title";
import { ParchmentCard, RuneSeal, RarityBadge } from "@/components/fantasy/ui";
import { EmptyPortal } from "@/components/fantasy/page-transition";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { LabEntry, LabKind } from "@/lib/types";
import { Search, Dna, Swords, Layers, Wand2, Gem, FlaskConical } from "lucide-react";

const KIND_META: Record<LabKind, { label: string; icon: React.ElementType; emoji: string }> = {
  RACE: { label: "Расы", icon: Dna, emoji: "🧬" },
  CLASS: { label: "Классы", icon: Swords, emoji: "⚔️" },
  SUBCLASS: { label: "Подклассы", icon: Layers, emoji: "🔱" },
  SPELL: { label: "Заклинания", icon: Wand2, emoji: "✨" },
  ITEM: { label: "Магические предметы", icon: Gem, emoji: "💎" },
};

export function LabView() {
  const [tab, setTab] = useState<LabKind>("RACE");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery<LabEntry[]>({
    queryKey: ["lab"],
    queryFn: () => fetch("/api/lab").then((r) => r.json()),
  });

  const all = Array.isArray(data) ? data : [];
  const items = all
    .filter((e) => e.kind === tab)
    .filter((e) =>
      !search ||
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      (e.subtitle ?? "").toLowerCase().includes(search.toLowerCase()) ||
      e.description.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => a.order - b.order);

  const counts: Record<LabKind, number> = {
    RACE: all.filter((e) => e.kind === "RACE").length,
    CLASS: all.filter((e) => e.kind === "CLASS").length,
    SUBCLASS: all.filter((e) => e.kind === "SUBCLASS").length,
    SPELL: all.filter((e) => e.kind === "SPELL").length,
    ITEM: all.filter((e) => e.kind === "ITEM").length,
  };

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-10 space-y-8">
      <div className="text-center space-y-3">
        <div className="flex justify-center">
          <RuneSeal icon={<FlaskConical className="w-8 h-8 text-gold" />} size="lg" glow className="animate-float-slow" />
        </div>
        <OrnamentTitle size="lg" flourish="🜂">
          Лаборатория Алого
        </OrnamentTitle>
        <p className="text-foreground/70 font-[family-name:var(--font-garamond)] italic max-w-2xl mx-auto">
          Здесь Божество записывает свои авторские механики — кастомные расы,
          классы и подклассы, оригинальные заклинания и магические предметы, что
          существуют лишь в этом мире. Всё, что рождено фантазией Мастера, обретает
          плоть в этих свитках.
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as LabKind)} className="w-full">
        <div className="flex justify-center overflow-x-auto pb-2">
          <TabsList className="bg-background/40 border border-gold/20 flex flex-wrap h-auto">
            {(Object.keys(KIND_META) as LabKind[]).map((k) => {
              const M = KIND_META[k];
              const Icon = M.icon;
              return (
                <TabsTrigger key={k} value={k} className="font-[family-name:var(--font-cinzel)] data-[state=active]:text-gold gap-1.5">
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{M.label}</span>
                  <Badge variant="outline" className="ml-1 text-[10px] px-1.5 py-0 border-gold/30 text-gold/60">
                    {counts[k]}
                  </Badge>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        <div className="flex justify-center pt-2">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gold/50" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по алхимическим свиткам..."
              className="pl-9 bg-background/40 border-gold/20 text-foreground placeholder:text-foreground/40"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <p className="text-gold/60 font-[family-name:var(--font-cinzel)] animate-flicker">
              ✦ Открываем реторты... ✦
            </p>
          </div>
        ) : (
          (Object.keys(KIND_META) as LabKind[]).map((k) => (
            <TabsContent key={k} value={k} className="mt-6">
              <LabGrid items={all.filter((e) => e.kind === k).filter((e) =>
                !search ||
                e.name.toLowerCase().includes(search.toLowerCase()) ||
                (e.subtitle ?? "").toLowerCase().includes(search.toLowerCase()) ||
                e.description.toLowerCase().includes(search.toLowerCase())
              ).sort((a, b) => a.order - b.order)} kind={k} />
            </TabsContent>
          ))
        )}
      </Tabs>
    </div>
  );
}

function LabGrid({ items, kind }: { items: LabEntry[]; kind: LabKind }) {
  const M = KIND_META[kind];
  if (items.length === 0) {
    return (
      <ParchmentCard>
        <EmptyPortal
          icon={<M.icon className="w-10 h-10 text-gold/40" />}
          message="Пока пусто — Божество ещё не записало ни одной записи."
          hint="Загляните в Чертог Божества → Лаборатория Алого, чтобы добавить."
        />
      </ParchmentCard>
    );
  }
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {items.map((e, idx) => (
        <ParchmentCard key={e.id} hover className="space-y-3 animate-fade-rise" >
          <div style={{ animationDelay: `${idx * 60}ms` }} className="space-y-3">
            <div className="flex items-start gap-3">
              <RuneSeal icon={<span className="text-2xl">{e.icon ?? M.emoji}</span>} size="md" glow={!!e.rarity && (e.rarity === "LEGENDARY" || e.rarity === "MYTHIC")} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-[family-name:var(--font-cinzel)] text-lg parchment-heading">{e.name}</h3>
                  {e.rarity && <RarityBadge rarity={e.rarity} />}
                </div>
                {e.subtitle && <p className="parchment-heading text-xs uppercase tracking-wider mt-0.5">{e.subtitle}</p>}
              </div>
            </div>
            {e.image && (
              <div className="h-40 rounded-lg overflow-hidden gold-frame">
                <img src={e.image} alt={e.name} className="w-full h-full object-cover" />
              </div>
            )}
            <p className="parchment-muted text-sm leading-relaxed">{e.description}</p>
            {e.details && (
              <div className="pt-3 border-t border-parchment-dark/20">
                <p className="parchment-heading text-xs uppercase tracking-wider mb-1">Подробности</p>
                <p className="parchment-muted text-sm whitespace-pre-line">{e.details}</p>
              </div>
            )}
          </div>
        </ParchmentCard>
      ))}
    </div>
  );
}
