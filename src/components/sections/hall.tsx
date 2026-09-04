"use client";

import { useQuery } from "@tanstack/react-query";
import { OrnamentTitle } from "@/components/fantasy/ornament-title";
import { ParchmentCard } from "@/components/fantasy/ui";
import { MapImage } from "@/components/fantasy/map-image";
import { useQuery as useRQ } from "@tanstack/react-query";
import { FormattedText } from "@/components/fantasy/formatted-text";
import { ExpandableImage } from "@/components/fantasy/expandable-image";
import type { View } from "@/lib/types";
import { useEffect, useRef, useState } from "react";
import { BookOpen, Sword, Sparkles, FlaskConical, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export function HallView({ onNavigate }: { onNavigate: (v: View) => void }) {
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
      (Array.isArray(countries) ? countries : []).forEach((c: any) => cards.push({ id: c.id, name: c.name, image: c.banner || null, emoji: c.emblem || "🗺️", kind: "country", category: "Страна", raw: c }));
      (Array.isArray(personalities) ? personalities : []).forEach((p: any) => cards.push({ id: p.id, name: p.name, image: p.portrait || null, emoji: "👤", kind: "personality", category: "Персонаж", raw: p }));
      (Array.isArray(gods) ? gods : []).forEach((g: any) => cards.push({ id: g.id, name: g.name, image: g.image || null, emoji: g.symbol || "✨", kind: "god", category: "Божество", raw: g }));
      (Array.isArray(legends) ? legends : []).forEach((l: any) => cards.push({ id: l.id, name: l.title, image: l.image || null, emoji: l.icon || "📖", kind: "legend", category: "Легенда", raw: l }));
      (Array.isArray(grimoire) ? grimoire : []).forEach((g: any) => cards.push({ id: g.id, name: g.unlocked ? g.title : (g.encodedTitle || "◈ Глава ◈"), image: null, emoji: g.unlocked ? "📖" : "🔒", kind: "grimoire", category: "Гримуар", raw: g }));
      (Array.isArray(lab) ? lab : []).forEach((l: any) => cards.push({ id: l.id, name: l.name, image: l.image || null, emoji: l.icon || "🜂", kind: "lab", category: "Лаборатория", raw: l }));
      return cards;
    },
  });

  const cards = data ?? [];
  const content = useContent();
  const [selected, setSelected] = useState<HallCard | null>(null);

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-10 md:py-14 space-y-10">
      {/* Hero */}
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

      {/* Map */}
      <section className="space-y-4">
        <OrnamentTitle size="md" flourish="🗺️" className="mb-2">Карта мира</OrnamentTitle>
        <MapImage />
      </section>

      {/* Carousel */}
      <section>
        <OrnamentTitle size="md" flourish="❦" className="mb-6">Свитки мира</OrnamentTitle>
        {cards.length === 0 ? (
          <ParchmentCard className="text-center parchment-muted italic py-8">
            Мир пока пуст. Божество наполнит его свитками — и они появятся здесь.
          </ParchmentCard>
        ) : (
          <Carousel cards={cards} onSelect={setSelected} />
        )}
      </section>

      {/* Detail modal */}
      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="parchment gold-frame max-w-2xl max-h-[92vh] overflow-y-auto">
          {selected && <CardDetail card={selected} />}
        </DialogContent>
      </Dialog>
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
  raw: any;
}

function NavBtn({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="btn-gold px-5 py-2.5 rounded-md flex items-center gap-2 text-sm">
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

function Carousel({ cards, onSelect }: { cards: HallCard[]; onSelect: (c: HallCard) => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const el = scrollRef.current;
    if (!el) return;
    const id = setInterval(() => {
      if (!el) return;
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 4) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollBy({ left: 280, behavior: "smooth" });
      }
    }, 3500);
    return () => clearInterval(id);
  }, [paused]);

  const scrollByFn = (dir: number) => {
    const el = scrollRef.current;
    if (el) el.scrollBy({ left: dir * 320, behavior: "smooth" });
  };

  return (
    <div className="relative" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <button onClick={() => scrollByFn(-1)} className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-background/80 border border-gold/30 text-gold hover:bg-gold/10 flex items-center justify-center" aria-label="Назад">
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button onClick={() => scrollByFn(1)} className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-background/80 border border-gold/30 text-gold hover:bg-gold/10 flex items-center justify-center" aria-label="Вперёд">
        <ChevronRight className="w-6 h-6" />
      </button>

      <div ref={scrollRef} className={`flex gap-4 overflow-x-auto scroll-smooth pb-2 fantasy-scroll ${cards.length <= 3 ? "justify-center" : ""}`} style={{ scrollbarWidth: "thin" }}>
        {cards.map((c) => (
          <button key={`${c.kind}-${c.id}`} onClick={() => onSelect(c)} className="shrink-0 w-64 text-left group">
            <div className="h-44 w-64 rounded-lg overflow-hidden gold-frame bg-parchment-dark/20 flex items-center justify-center transition-all group-hover:gold-frame-hover relative">
              {c.image ? (
                <img src={c.image} alt={c.name} className="w-full h-full object-cover object-top" />
              ) : (
                <span className="text-6xl">{c.emoji}</span>
              )}
              <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-background/70 border border-gold/30 text-gold/80 text-xs font-[family-name:var(--font-cinzel)] uppercase tracking-wider backdrop-blur-sm">
                {c.category}
              </span>
            </div>
            <div className="mt-2 text-center">
              <p className="font-[family-name:var(--font-cinzel)] text-sm text-gold truncate">{c.name}</p>
            </div>
          </button>
        ))}
      </div>
      <p className="text-center text-sm parchment-muted/70 italic mt-3">
        {paused ? "Прокрутка на паузе — наведи, чтобы листать вручную" : "✦ Свитки сменяются сами · наведи курсор, чтобы остановить · кликни, чтобы открыть ✦"}
      </p>
    </div>
  );
}

/* ===== Detail modal — renders type-specific content from raw entity data ===== */
function CardDetail({ card }: { card: HallCard }) {
  const r = card.raw;
  return (
    <div className="space-y-4">
      <DialogTitle className="sr-only">{card.name}</DialogTitle>
      <DialogDescription className="sr-only">Просмотр записи из свитков мира.</DialogDescription>

      {/* Image — full width, expandable on click */}
      {card.image && (
        <ExpandableImage src={card.image} alt={card.name} height="h-56 md:h-72" />
      )}

      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <h2 className="font-[family-name:var(--font-cinzel)] text-2xl parchment-heading">{card.name}</h2>
        <Badge variant="outline" className="border-gold/30 text-gold/70 text-sm">{card.category}</Badge>
      </div>

      {/* Type-specific fields */}
      {card.kind === "country" && (
        <>
          {r.capital && <p className="parchment-muted text-sm">🏰 Столица: {r.capital}</p>}
          <FormattedText className="lore-prose text-base leading-relaxed">{r.description}</FormattedText>
          <div className="flex flex-wrap gap-4 pt-3 border-t border-parchment-dark/20 text-sm">
            {r.government && <span><span className="parchment-heading">Правление:</span> {r.government}</span>}
            {r.population && <span><span className="parchment-heading">Народ:</span> {r.population}</span>}
            {r.climate && <span><span className="parchment-heading">Климат:</span> {r.climate}</span>}
          </div>
        </>
      )}

      {card.kind === "personality" && (
        <>
          {r.title && <p className="parchment-heading text-sm uppercase tracking-wider">{r.title}</p>}
          <div className="flex flex-wrap gap-3 text-sm parchment-muted">
            {r.race && <span>🧬 {r.race}</span>}
            {r.age && <span>📅 {r.age}</span>}
            {r.affiliation && <span>🏛️ {r.affiliation}</span>}
          </div>
          <FormattedText className="lore-prose text-base leading-relaxed">{r.description}</FormattedText>
        </>
      )}

      {card.kind === "god" && (
        <>
          {r.title && <p className="parchment-heading text-sm uppercase tracking-wider">{r.title}</p>}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="border-gold/30 text-gold/70 text-sm">{r.domain}</Badge>
            {r.pantheon && <Badge variant="outline" className="border-gold/30 text-gold/70 text-sm">{r.pantheon}</Badge>}
            {r.alignment && (
              <span className={`text-sm px-2 py-0.5 rounded ${r.alignment === "good" ? "text-green-700 bg-green-100/40" : r.alignment === "evil" ? "text-red-800 bg-red-100/40" : "text-zinc-600 bg-zinc-200/40"}`}>
                {r.alignment === "good" ? "☀ Добро" : r.alignment === "evil" ? "🌑 Зло" : "⚖ Нейтралитет"}
              </span>
            )}
          </div>
          <FormattedText className="lore-prose text-base leading-relaxed">{r.description}</FormattedText>
        </>
      )}

      {card.kind === "legend" && (
        <>
          {r.era && <p className="parchment-muted text-sm italic">{r.era}</p>}
          <FormattedText className="lore-prose text-base leading-relaxed">{r.content}</FormattedText>
        </>
      )}

      {card.kind === "grimoire" && (
        <>
          {r.unlocked ? (
            <>
              <Badge variant="outline" className="border-gold/30 text-gold/70 text-sm">📖 Открыто</Badge>
              {r.loreDate && <p className="parchment-muted text-sm italic">{r.loreDate}</p>}
              <FormattedText className="lore-prose text-base leading-relaxed">{r.realContent}</FormattedText>
            </>
          ) : (
            <>
              <Badge variant="outline" className="border-foreground/20 text-foreground/60 text-sm">🔒 Запечатано</Badge>
              <p className="cipher-strong font-mono text-base leading-relaxed">{r.encodedContent || "◈ ◈ ◈"}</p>
              {r.unlockHint && (
                <p className="text-sm text-gold/60 italic font-[family-name:var(--font-garamond)]">🔑 {r.unlockHint}</p>
              )}
            </>
          )}
        </>
      )}

      {card.kind === "lab" && (
        <>
          {r.subtitle && <p className="parchment-heading text-sm uppercase tracking-wider">{r.subtitle}</p>}
          <FormattedText className="lore-prose text-base leading-relaxed">{r.description}</FormattedText>
          {r.details && (
            <div className="pt-3 border-t border-parchment-dark/20">
              <p className="font-[family-name:var(--font-cinzel)] text-sm parchment-heading mb-1">✦ Подробности</p>
              <FormattedText className="parchment-muted text-sm leading-relaxed">{r.details}</FormattedText>
            </div>
          )}
        </>
      )}
    </div>
  );
}
