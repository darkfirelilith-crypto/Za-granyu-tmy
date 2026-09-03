"use client";

import { useQuery } from "@tanstack/react-query";
import { OrnamentTitle } from "@/components/fantasy/ornament-title";
import { ParchmentCard } from "@/components/fantasy/ui";
import { MapImage } from "@/components/fantasy/map-image";
import { useQuery as useRQ } from "@tanstack/react-query";
import type { View } from "@/lib/types";
import { useEffect, useRef, useState } from "react";
import { BookOpen, Sword, Sparkles, FlaskConical, ChevronLeft, ChevronRight } from "lucide-react";
import { useAppStore } from "@/store/app-store";

export function HallView({ onNavigate }: { onNavigate: (v: View) => void }) {
  // Gather all DB elements with image + name
  const { data } = useQuery<any[]>({
    queryKey: ["hall-carousel"],
    queryFn: async () => {
      const [countries, personalities, gods, legends, grimoire, lab] = await Promise.all([
        fetch("/api/lore/countries").then((r) => r.json()).catch(() => []),
        fetch("/api/lore/personalities").then((r) => r.json()).catch(() => []),
        fetch("/api/lore/gods").then((r) => r.json()).catch(() => []),
        fetch("/api/lore/legends").then((r) => r.json()).catch(() => []),
        fetch("/api/grimoire").then((r) => r.json()).catch(() => []),
        fetch("/api/lab").then((r) => r.json()).catch(() => []),
      ]);
      const cards: HallCard[] = [];
      (Array.isArray(countries) ? countries : []).forEach((c: any) => cards.push({ id: c.id, name: c.name, image: c.banner || null, emoji: c.emblem || "🗺️", kind: "country" as const, category: "Страна" }));
      (Array.isArray(personalities) ? personalities : []).forEach((p: any) => cards.push({ id: p.id, name: p.name, image: p.portrait || null, emoji: "👤", kind: "personality" as const, category: "Персонаж" }));
      (Array.isArray(gods) ? gods : []).forEach((g: any) => cards.push({ id: g.id, name: g.name, image: g.image || null, emoji: g.symbol || "✨", kind: "god" as const, category: "Божество" }));
      (Array.isArray(legends) ? legends : []).forEach((l: any) => cards.push({ id: l.id, name: l.title, image: l.image || null, emoji: l.icon || "📖", kind: "legend" as const, category: "Легенда" }));
      (Array.isArray(grimoire) ? grimoire : []).forEach((g: any) => cards.push({ id: g.id, name: g.unlocked ? g.title : (g.encodedTitle || "◈ Глава ◈"), image: null, emoji: g.unlocked ? "📖" : "🔒", kind: "grimoire" as const, category: "Гримуар" }));
      (Array.isArray(lab) ? lab : []).forEach((l: any) => cards.push({ id: l.id, name: l.name, image: l.image || null, emoji: l.icon || "🜂", kind: "lab" as const, category: "Лаборатория" }));
      return cards;
    },
  });

  const cards = data ?? [];
  const content = useContent();

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-10 md:py-14 space-y-10">
      {/* Hero — minimal intro */}
      <section className="text-center space-y-4 animate-reveal">
        <OrnamentTitle size="xl" flourish="✦">За гранью тьмы</OrnamentTitle>
        <p className="max-w-2xl mx-auto text-foreground font-[family-name:var(--font-garamond)] text-lg md:text-xl leading-relaxed italic drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
          {content?.hall_intro || "Перед тобой — врата в мир, что за гранью тьмы. Листай свитки и найди свой путь."}
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <NavBtn icon={BookOpen} label="База Знаний" onClick={() => onNavigate("knowledge")} />
          <NavBtn icon={Sword} label="Гильдия" onClick={() => onNavigate("guild")} />
          <NavBtn icon={Sparkles} label="Гримуар" onClick={() => onNavigate("grimoire")} />
          <NavBtn icon={FlaskConical} label="Лаборатория Алого" onClick={() => onNavigate("lab")} />
        </div>
      </section>

      {/* Interactive world map */}
      <section className="space-y-4">
        <OrnamentTitle size="md" flourish="🗺️" className="mb-2">Карта мира</OrnamentTitle>
        <MapImage />
      </section>

      {/* Auto-scrolling carousel of DB element cards */}
      <section>
        <OrnamentTitle size="md" flourish="❦" className="mb-6">Свитки мира</OrnamentTitle>
        {cards.length === 0 ? (
          <ParchmentCard className="text-center parchment-muted italic py-8">
            Мир пока пуст. Божество наполнит его свитками — и они появятся здесь.
          </ParchmentCard>
        ) : (
          <Carousel cards={cards} onNavigate={onNavigate} />
        )}
      </section>
    </div>
  );
}

interface HallCard {
  id: string;
  name: string;
  image: string | null;
  emoji: string;
  kind: "country" | "personality" | "god" | "legend" | "grimoire" | "lab";
  category: string;
}

function NavBtn({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="btn-gold px-5 py-2.5 rounded-md flex items-center gap-2 text-sm"
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

function useContent() {
  const { data } = useRQ<any[]>({
    queryKey: ["site-content"],
    queryFn: () => fetch("/api/content").then((r) => r.json()).catch(() => []),
  });
  const map: Record<string, any> = {};
  (Array.isArray(data) ? data : []).forEach((c: any) => { map[c.key] = c; });
  return { hall_intro: map.hall_intro?.body };
}

function Carousel({ cards, onNavigate }: { cards: HallCard[]; onNavigate: (v: View) => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);

  // auto-scroll
  useEffect(() => {
    if (paused) return;
    const el = scrollRef.current;
    if (!el) return;
    const id = setInterval(() => {
      if (!el) return;
      // if at end, jump back to start
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 4) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollBy({ left: 280, behavior: "smooth" });
      }
    }, 3500);
    return () => clearInterval(id);
  }, [paused]);

  const scrollBy = (dir: number) => {
    const el = scrollRef.current;
    if (el) el.scrollBy({ left: dir * 320, behavior: "smooth" });
  };

  const setKnowledgeTab = useAppStore((s) => s.setKnowledgeTab);

  // Map card kind → target view + knowledge tab (if applicable)
  const navTarget: Record<HallCard["kind"], View> = {
    country: "knowledge", personality: "knowledge", god: "knowledge", legend: "knowledge",
    grimoire: "grimoire", lab: "lab",
  };
  const kindToKnowledgeTab: Record<string, string> = {
    country: "countries", personality: "personalities", god: "pantheon", legend: "legends",
  };

  const handleCardClick = (kind: HallCard["kind"]) => {
    if (kindToKnowledgeTab[kind]) {
      setKnowledgeTab(kindToKnowledgeTab[kind] as any);
    }
    onNavigate(navTarget[kind]);
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* arrows */}
      <button onClick={() => scrollBy(-1)} className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-background/80 border border-gold/30 text-gold hover:bg-gold/10 flex items-center justify-center" aria-label="Назад">
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button onClick={() => scrollBy(1)} className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-background/80 border border-gold/30 text-gold hover:bg-gold/10 flex items-center justify-center" aria-label="Вперёд">
        <ChevronRight className="w-5 h-5" />
      </button>

      <div
        ref={scrollRef}
        className={`flex gap-4 overflow-x-auto scroll-smooth pb-2 fantasy-scroll ${cards.length <= 3 ? "justify-center" : ""}`}
        style={{ scrollbarWidth: "thin" }}
      >
        {cards.map((c) => (
          <button
            key={`${c.kind}-${c.id}`}
            onClick={() => handleCardClick(c.kind)}
            className="shrink-0 w-64 text-left group"
          >
            <div className="h-44 w-64 rounded-lg overflow-hidden gold-frame bg-parchment-dark/20 flex items-center justify-center transition-all group-hover:gold-frame-hover relative">
              {c.image ? (
                <img src={c.image} alt={c.name} className="w-full h-full object-cover object-top" />
              ) : (
                <span className="text-6xl">{c.emoji}</span>
              )}
              {/* Category badge — top left, always visible */}
              <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-background/70 border border-gold/30 text-gold/80 text-[10px] font-[family-name:var(--font-cinzel)] uppercase tracking-wider backdrop-blur-sm">
                {c.category}
              </span>
            </div>
            <div className="mt-2 text-center">
              <p className="font-[family-name:var(--font-cinzel)] text-sm text-gold truncate">{c.name}</p>
            </div>
          </button>
        ))}
      </div>
      <p className="text-center text-xs parchment-muted/70 italic mt-3">
        {paused ? "Прокрутка на паузе — наведи, чтобы листать вручную" : "✦ Свитки сменяются сами · наведи курсор, чтобы остановить · кликни, чтобы открыть ✦"}
      </p>
    </div>
  );
}
