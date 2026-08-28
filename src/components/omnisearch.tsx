"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { MapPin, Crown, Sun, BookMarked, Scale, Sparkles, Link2, Sword, User } from "lucide-react";
import type { View } from "@/lib/types";

interface SearchHit {
  id: string;
  label: string;
  sub: string;
  icon: React.ReactNode;
  view: View;
  tab?: string;
}

export function Omnisearch({
  open,
  onOpenChange,
  onNavigate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onNavigate: (v: View) => void;
}) {
  const { data } = useQuery({
    queryKey: ["omnisearch-all"],
    queryFn: async () => {
      const [countries, personalities, gods, legends, systems, grimoire, quests, characters] = await Promise.all([
        fetch("/api/lore/countries").then((r) => r.json()).catch(() => []),
        fetch("/api/lore/personalities").then((r) => r.json()).catch(() => []),
        fetch("/api/lore/gods").then((r) => r.json()).catch(() => []),
        fetch("/api/lore/legends").then((r) => r.json()).catch(() => []),
        fetch("/api/lore/systems").then((r) => r.json()).catch(() => []),
        fetch("/api/grimoire").then((r) => r.json()).catch(() => []),
        fetch("/api/guild/quests").then((r) => r.json()).catch(() => []),
        fetch("/api/characters").then((r) => (r.ok ? r.json() : [])).catch(() => []),
      ]);
      return { countries, personalities, gods, legends, systems, grimoire, quests, characters };
    },
    enabled: open,
  });

  // Build searchable index
  const hits: SearchHit[] = [];
  if (data) {
    data.countries?.forEach((c: any) =>
      hits.push({
        id: c.id, label: c.name, sub: c.capital || "Страна",
        icon: <MapPin className="w-4 h-4 text-wine" />, view: "knowledge", tab: "countries",
      })
    );
    data.personalities?.forEach((p: any) =>
      hits.push({
        id: p.id, label: p.name, sub: p.title || p.role || "Личность",
        icon: <Crown className="w-4 h-4 text-wine" />, view: "knowledge", tab: "personalities",
      })
    );
    data.gods?.forEach((g: any) =>
      hits.push({
        id: g.id, label: g.name, sub: g.domain || "Бог",
        icon: <Sun className="w-4 h-4 text-gold" />, view: "knowledge", tab: "pantheon",
      })
    );
    data.legends?.forEach((l: any) =>
      hits.push({
        id: l.id, label: l.title, sub: l.era || "Легенда",
        icon: <BookMarked className="w-4 h-4 text-wine" />, view: "knowledge", tab: "legends",
      })
    );
    data.systems?.forEach((s: any) =>
      hits.push({
        id: s.id, label: s.title, sub: s.category || "Система",
        icon: <Scale className="w-4 h-4 text-wine" />, view: "knowledge", tab: "systems",
      })
    );
    data.grimoire?.forEach((g: any) =>
      hits.push({
        id: g.id, label: g.title, sub: g.unlocked ? "Открыто" : "Запечатано",
        icon: <Sparkles className="w-4 h-4 text-magic-glow" />, view: "grimoire",
      })
    );
    data.quests?.forEach((q: any) =>
      hits.push({
        id: q.id, label: q.title, sub: `Задание · ${q.difficulty}`,
        icon: <Sword className="w-4 h-4 text-wine" />, view: "guild",
      })
    );
    data.characters?.forEach((c: any) =>
      hits.push({
        id: c.id, label: c.name, sub: `${c.race ?? "—"} · ${c.charClass ?? "—"} · Ур.${c.level}`,
        icon: <User className="w-4 h-4 text-gold" />, view: "guild",
      })
    );
  }

  // Keyboard shortcut Ctrl/Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onOpenChange]);

  const handleSelect = (hit: SearchHit) => {
    onNavigate(hit.view);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="parchment gold-frame p-0 overflow-hidden max-w-xl">
        <DialogTitle className="sr-only">Поиск по миру за гранью тьмы</DialogTitle>
        <Command className="bg-transparent" loop>
          <div className="flex items-center gap-2 px-4 py-3 border-b border-parchment-dark/30">
            <Sparkles className="w-4 h-4 text-gold animate-flicker shrink-0" />
            <CommandInput
              placeholder="Веди слово — и я укажу путь в летописях..."
              className="font-[family-name:var(--font-garamond)] text-base"
            />
          </div>
          <CommandList className="max-h-[50vh] fantasy-scroll">
            <CommandEmpty className="py-8 text-center parchment-muted italic font-[family-name:var(--font-garamond)]">
              ✦ Ничего не найдено в свитках ✦
            </CommandEmpty>
            {hits.length > 0 && (
              <CommandGroup heading="Свитки мира" className="font-[family-name:var(--font-cinzel)] text-xs uppercase tracking-wider parchment-heading">
                {hits.map((hit) => (
                  <CommandItem
                    key={`${hit.view}-${hit.id}`}
                    value={`${hit.label} ${hit.sub}`}
                    onSelect={() => handleSelect(hit)}
                    className="aria-selected:bg-gold/10 aria-selected:text-wine cursor-pointer gap-3 px-4 py-2"
                  >
                    {hit.icon}
                    <div className="flex-1 min-w-0">
                      <p className="font-[family-name:var(--font-cinzel)] text-sm parchment-text truncate">{hit.label}</p>
                      <p className="text-xs parchment-muted truncate">{hit.sub}</p>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
          <div className="px-4 py-2 border-t border-parchment-dark/30 flex items-center justify-between text-xs parchment-muted">
            <span className="flex items-center gap-1"><Link2 className="w-3 h-3" /> {hits.length} записей</span>
            <span className="font-[family-name:var(--font-garamond)] italic">Ctrl+K чтобы призать</span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
