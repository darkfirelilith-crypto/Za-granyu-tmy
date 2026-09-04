"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { OrnamentTitle } from "@/components/fantasy/ornament-title";
import { ParchmentCard, RuneSeal, RarityBadge } from "@/components/fantasy/ui";
import { EmptyPortal } from "@/components/fantasy/page-transition";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { LabEntry, LabKind } from "@/lib/types";
import { FormattedText } from "@/components/fantasy/formatted-text";
import { ExpandableImage } from "@/components/fantasy/expandable-image";
import { Search, Dna, Swords, Layers, Wand2, Gem, Star, BookOpen, FlaskConical } from "lucide-react";

const KIND_META: Record<LabKind, { label: string; icon: React.ElementType; emoji: string }> = {
  RACE: { label: "Расы", icon: Dna, emoji: "🧬" },
  SUBRACE: { label: "Подрасы", icon: Dna, emoji: "🧬" },
  CLASS: { label: "Классы", icon: Swords, emoji: "⚔️" },
  SUBCLASS: { label: "Подклассы", icon: Layers, emoji: "🔱" },
  SPELL: { label: "Заклинания", icon: Wand2, emoji: "✨" },
  ITEM: { label: "Магические предметы", icon: Gem, emoji: "💎" },
  TRAIT: { label: "Черты", icon: Star, emoji: "⭐" },
  BACKGROUND: { label: "Предыстории", icon: BookOpen, emoji: "📖" },
};

const KIND_ORDER: LabKind[] = ["RACE", "SUBRACE", "CLASS", "SUBCLASS", "SPELL", "ITEM", "TRAIT", "BACKGROUND"];

export function LabView() {
  const [tab, setTab] = useState<LabKind>("RACE");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<LabEntry | null>(null);

  const { data, isLoading } = useQuery<LabEntry[]>({
    queryKey: ["lab"],
    queryFn: () => fetch("/api/lab").then((r) => r.json()),
  });
  const { data: content } = useQuery<any[]>({ queryKey: ["site-content"], queryFn: () => fetch("/api/content").then((r) => r.json()).catch(() => []) });
  const intro = (Array.isArray(content) ? content : []).find((c: any) => c.key === "lab_intro");

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
    SUBRACE: all.filter((e) => e.kind === "SUBRACE").length,
    CLASS: all.filter((e) => e.kind === "CLASS").length,
    SUBCLASS: all.filter((e) => e.kind === "SUBCLASS").length,
    SPELL: all.filter((e) => e.kind === "SPELL").length,
    ITEM: all.filter((e) => e.kind === "ITEM").length,
    TRAIT: all.filter((e) => e.kind === "TRAIT").length,
    BACKGROUND: all.filter((e) => e.kind === "BACKGROUND").length,
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
          {intro?.body || "Здесь Божество записывает свои авторские механики — кастомные расы, подрасы, классы, подклассы, заклинания, черты, предыстории и магические предметы."}
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as LabKind)} className="w-full">
        <div className="flex justify-center overflow-x-auto pb-2 fantasy-scroll">
          <TabsList className="bg-background/40 border border-gold/20 flex flex-nowrap h-auto gap-0.5">
            {KIND_ORDER.map((k) => {
              const M = KIND_META[k];
              const Icon = M.icon;
              return (
                <TabsTrigger key={k} value={k} className="font-[family-name:var(--font-cinzel)] data-[state=active]:text-gold gap-1 shrink-0 px-2.5 py-1.5">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="hidden md:inline whitespace-nowrap">{M.label}</span>
                  <Badge variant="outline" className="ml-0.5 text-xs px-1 py-0 border-gold/30 text-gold/60">
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
          KIND_ORDER.map((k) => (
            <TabsContent key={k} value={k} className="mt-6">
              <LabGrid
                items={all.filter((e) => e.kind === k).filter((e) =>
                  !search ||
                  e.name.toLowerCase().includes(search.toLowerCase()) ||
                  (e.subtitle ?? "").toLowerCase().includes(search.toLowerCase()) ||
                  e.description.toLowerCase().includes(search.toLowerCase())
                ).sort((a, b) => a.order - b.order)}
                kind={k}
                onSelect={(e) => setSelected(e)}
              />
            </TabsContent>
          ))
        )}
      </Tabs>

      {/* Detail dialog — opens when a card is clicked */}
      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="parchment gold-frame max-w-2xl max-h-[92vh] overflow-y-auto">
          {selected && <LabDetail entry={selected} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ===== Detail dialog content — type-specific rendering ===== */
export function LabDetail({ entry }: { entry: LabEntry }) {
  const M = KIND_META[entry.kind as LabKind];
  const kindBadge = (
    <Badge variant="outline" className="border-wine/30 text-wine/70 text-xs">{M.label}</Badge>
  );
  const header = (
    <div className="flex items-start gap-3">
      <RuneSeal
        icon={<span className="text-3xl">{entry.icon ?? M.emoji}</span>}
        size="lg"
        glow={!!entry.rarity && (entry.rarity === "LEGENDARY" || entry.rarity === "MYTHIC")}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="font-[family-name:var(--font-cinzel)] text-2xl parchment-heading">{entry.name}</h2>
          {entry.rarity && <RarityBadge rarity={entry.rarity} />}
        </div>
        {entry.subtitle && <p className="parchment-heading text-sm uppercase tracking-wider mt-1">{entry.subtitle}</p>}
        <div className="mt-1 flex items-center gap-2 flex-wrap">{kindBadge}</div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <DialogTitle className="sr-only">{entry.name}</DialogTitle>
      <DialogDescription className="sr-only">Детальный просмотр записи Лаборатории Алого.</DialogDescription>
      {header}

      {/* === RACE === */}
      {entry.kind === "RACE" && (
        <>
          {entry.image && (
            <ExpandableImage src={entry.image} alt={entry.name} height="h-56 md:h-72" />
          )}
          <FormattedText className="lore-prose text-base leading-relaxed">{entry.description}</FormattedText>
          {entry.details && (
            <DetailBlock title="✦ Механическая составляющая" body={entry.details} />
          )}
        </>
      )}

      {/* === SUBRACE === */}
      {entry.kind === "SUBRACE" && (
        <>
          {entry.raceParent && (
            <p className="text-sm parchment-muted">
              <span className="parchment-heading">Раса-прародитель: </span>
              <span className="italic">{entry.raceParent}</span>
            </p>
          )}
          {entry.image && (
            <ExpandableImage src={entry.image} alt={entry.name} height="h-56 md:h-72" />
          )}
          <FormattedText className="lore-prose text-base leading-relaxed">{entry.description}</FormattedText>
          {entry.details && (
            <DetailBlock title="✦ Механическая составляющая" body={entry.details} />
          )}
        </>
      )}

      {/* === CLASS === */}
      {entry.kind === "CLASS" && (
        <FormattedText className="lore-prose text-base leading-relaxed">{entry.description}</FormattedText>
      )}

      {/* === SUBCLASS === */}
      {entry.kind === "SUBCLASS" && (
        <>
          {entry.subtitle && (
            <p className="text-sm parchment-muted">
              <span className="parchment-heading">Класс: </span>
              <span className="italic">{entry.subtitle}</span>
            </p>
          )}
          <FormattedText className="lore-prose text-base leading-relaxed">{entry.description}</FormattedText>
        </>
      )}

      {/* === SPELL === */}
      {entry.kind === "SPELL" && (
        <>
          <SpellMetaGrid entry={entry} />
          <FormattedText className="lore-prose text-base leading-relaxed">{entry.description}</FormattedText>
        </>
      )}

      {/* === ITEM === */}
      {entry.kind === "ITEM" && (
        <>
          {entry.image && (
            <ExpandableImage src={entry.image} alt={entry.name} height="h-56 md:h-72" />
          )}
          <ItemMetaGrid entry={entry} />
          <FormattedText className="lore-prose text-base leading-relaxed">{entry.description}</FormattedText>
        </>
      )}

      {/* === TRAIT === */}
      {entry.kind === "TRAIT" && (
        <FormattedText className="lore-prose text-base leading-relaxed">{entry.description}</FormattedText>
      )}

      {/* === BACKGROUND === */}
      {entry.kind === "BACKGROUND" && (
        <>
          <FormattedText className="lore-prose text-base leading-relaxed">{entry.description}</FormattedText>
          {entry.details && (
            <DetailBlock title="✦ Механическая составляющая" body={entry.details} />
          )}
        </>
      )}
    </div>
  );
}

function DetailBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="pt-4 border-t border-parchment-dark/20">
      <p className="font-[family-name:var(--font-cinzel)] text-sm parchment-heading mb-2">{title}</p>
      <FormattedText className="parchment-muted text-sm leading-relaxed">{body}</FormattedText>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-baseline gap-2 text-sm">
      <span className="parchment-heading min-w-[110px] shrink-0">{label}:</span>
      <span className="parchment-muted">{value}</span>
    </div>
  );
}

function SpellMetaGrid({ entry }: { entry: LabEntry }) {
  return (
    <div className="parchment rounded-lg p-4 border border-gold/20 space-y-1.5">
      <MetaRow label="Уровень" value={entry.spellLevel} />
      <MetaRow label="Школа" value={entry.school} />
      <MetaRow label="Концентрация" value={entry.concentration} />
      <MetaRow label="Ритуал" value={entry.ritual} />
      <MetaRow label="Компоненты" value={entry.components} />
      <MetaRow label="Время накладывания" value={entry.castingTime} />
      <MetaRow label="Дистанция" value={entry.spellRange} />
      <MetaRow label="Классы" value={entry.spellClasses} />
    </div>
  );
}

function ItemMetaGrid({ entry }: { entry: LabEntry }) {
  return (
    <div className="parchment rounded-lg p-4 border border-gold/20 space-y-1.5">
      <MetaRow label="Тип предмета" value={entry.itemType} />
      <MetaRow label="Настройка" value={entry.attunement} />
    </div>
  );
}

/* ===== Grid of cards — type-specific card content ===== */
function LabGrid({ items, kind, onSelect }: { items: LabEntry[]; kind: LabKind; onSelect: (e: LabEntry) => void }) {
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
        <ParchmentCard key={e.id} hover className="animate-fade-rise cursor-pointer">
          <button
            onClick={() => onSelect(e)}
            style={{ animationDelay: `${idx * 60}ms` }}
            className="space-y-3 text-left w-full"
            aria-label={`Открыть запись: ${e.name}`}
          >
            {/* === RACE / SUBRACE === */}
            {(e.kind === "RACE" || e.kind === "SUBRACE") && (
              <>
                <div className="flex items-start gap-3">
                  <RuneSeal
                    icon={<span className="text-2xl">{e.icon ?? M.emoji}</span>}
                    size="md"
                    glow={!!e.rarity && (e.rarity === "LEGENDARY" || e.rarity === "MYTHIC")}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-[family-name:var(--font-cinzel)] text-lg parchment-heading">{e.name}</h3>
                    {e.kind === "SUBRACE" && e.raceParent && (
                      <p className="parchment-heading text-sm uppercase tracking-wider mt-0.5 text-wine/70">
                        ⊙ {e.raceParent}
                      </p>
                    )}
                  </div>
                </div>
                {e.image && (
                  <div className="h-40 rounded-lg overflow-hidden gold-frame">
                    <img src={e.image} alt={e.name} className="w-full h-full object-cover object-top" />
                  </div>
                )}
                <p className="parchment-muted text-sm leading-relaxed line-clamp-2">{e.description}</p>
                <p className="text-sm text-wine font-[family-name:var(--font-cinzel)] pt-1">▼ Открыть подробности</p>
              </>
            )}

            {/* === CLASS / SUBCLASS / TRAIT / BACKGROUND === */}
            {(e.kind === "CLASS" || e.kind === "SUBCLASS" || e.kind === "TRAIT" || e.kind === "BACKGROUND") && (
              <>
                <div className="flex items-start gap-3">
                  <RuneSeal
                    icon={<span className="text-2xl">{e.icon ?? M.emoji}</span>}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-[family-name:var(--font-cinzel)] text-lg parchment-heading">{e.name}</h3>
                    {e.subtitle && (
                      <p className="parchment-heading text-sm uppercase tracking-wider mt-0.5 text-wine/70">
                        {e.subtitle}
                      </p>
                    )}
                  </div>
                </div>
                <p className="parchment-muted text-sm leading-relaxed line-clamp-2">{e.description}</p>
                <p className="text-sm text-wine font-[family-name:var(--font-cinzel)] pt-1">▼ Открыть подробности</p>
              </>
            )}

            {/* === SPELL === */}
            {e.kind === "SPELL" && (
              <>
                <div className="flex items-start gap-3">
                  <RuneSeal icon={<span className="text-2xl">{e.icon ?? M.emoji}</span>} size="md" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-[family-name:var(--font-cinzel)] text-lg parchment-heading">{e.name}</h3>
                    <div className="flex items-center gap-1.5 flex-wrap mt-1">
                      {e.spellLevel && (
                        <Badge variant="outline" className="border-gold/30 text-gold/80 text-xs">
                          {e.spellLevel === "Заговор" ? "Заговор" : `${e.spellLevel} круг`}
                        </Badge>
                      )}
                      {e.school && (
                        <Badge variant="outline" className="border-wine/30 text-wine/80 text-xs">
                          {e.school}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <p className="parchment-muted text-sm leading-relaxed line-clamp-2">{e.description}</p>
                <p className="text-sm text-wine font-[family-name:var(--font-cinzel)] pt-1">▼ Открыть подробности</p>
              </>
            )}

            {/* === ITEM === */}
            {e.kind === "ITEM" && (
              <>
                <div className="flex items-start gap-3">
                  <RuneSeal
                    icon={<span className="text-2xl">{e.icon ?? M.emoji}</span>}
                    size="md"
                    glow={!!e.rarity && (e.rarity === "LEGENDARY" || e.rarity === "MYTHIC")}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-[family-name:var(--font-cinzel)] text-lg parchment-heading">{e.name}</h3>
                      {e.rarity && <RarityBadge rarity={e.rarity} />}
                    </div>
                    {e.itemType && (
                      <p className="parchment-heading text-sm uppercase tracking-wider mt-0.5 text-wine/70">
                        {e.itemType}
                      </p>
                    )}
                  </div>
                </div>
                {e.image && (
                  <div className="h-40 rounded-lg overflow-hidden gold-frame">
                    <img src={e.image} alt={e.name} className="w-full h-full object-cover object-top" />
                  </div>
                )}
                <p className="parchment-muted text-sm leading-relaxed line-clamp-2">{e.description}</p>
                <p className="text-sm text-wine font-[family-name:var(--font-cinzel)] pt-1">▼ Открыть подробности</p>
              </>
            )}
          </button>
        </ParchmentCard>
      ))}
    </div>
  );
}
