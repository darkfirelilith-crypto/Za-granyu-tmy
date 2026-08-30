"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { OrnamentTitle } from "@/components/fantasy/ornament-title";
import { ParchmentCard, RuneSeal } from "@/components/fantasy/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { GrimoireEntry } from "@/lib/types";
import { Lock, Unlock, Sparkles, KeyRound, Crown } from "lucide-react";

const CAT_LABEL: Record<string, string> = {
  SECRETS: "Тайны",
  RITUALS: "Ритуалы",
  PROPHECY: "Пророчества",
  HISTORY: "История",
  BEASTIARY: "Бестиарий",
};

export function GrimoireView() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const { data, isLoading } = useQuery<GrimoireEntry[]>({
    queryKey: ["grimoire"],
    queryFn: () => fetch("/api/grimoire").then((r) => r.json()),
  });
  const { data: content } = useQuery<any[]>({ queryKey: ["site-content"], queryFn: () => fetch("/api/content").then((r) => r.json()).catch(() => []) });
  const intro = (Array.isArray(content) ? content : []).find((c: any) => c.key === "grimoire_intro");
  const qc = useQueryClient();
  const { toast } = useToast();

  const unlockMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/grimoire/${id}/unlock`, { method: "POST" });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || "Не удалось изменить печать");
      return json;
    },
    onSuccess: (entry) => {
      toast({
        title: entry.unlocked ? "Печать снята!" : "Печать наложена",
        description: entry.unlocked
          ? "Слова Гримуара открылись твоему взору."
          : "Страница вновь сокрыта туманом.",
      });
      qc.invalidateQueries({ queryKey: ["grimoire"] });
    },
    onError: (e: Error) => {
      toast({ title: "Ошибка", description: e.message, variant: "destructive" });
    },
  });

  const entries = (data ?? []).sort((a, b) => a.order - b.order);
  const unlockedCount = entries.filter((e) => e.unlocked).length;

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-10 space-y-8">
      <div className="text-center space-y-3">
        <div className="flex justify-center">
          <RuneSeal icon={<Sparkles className="w-8 h-8 text-magic-glow" />} size="lg" glow className="animate-float" />
        </div>
        <OrnamentTitle size="lg" flourish="✦">
          Тайный Гримуар
        </OrnamentTitle>
        <p className="text-foreground/70 font-[family-name:var(--font-garamond)] italic max-w-2xl mx-auto">
          {intro?.body || "Древний кодекс, главы которого запечатаны магией — сокрыты не только слова, но и сами названия."}
        </p>
        <div className="flex justify-center gap-2">
          <Badge variant="outline" className="border-gold/30 text-gold/70 font-[family-name:var(--font-cinzel)]">
            <Unlock className="w-3 h-3 mr-1" /> {unlockedCount} {pluralChapter(unlockedCount)} открыто
          </Badge>
          <Badge variant="outline" className="border-gold/30 text-gold/70 font-[family-name:var(--font-cinzel)]">
            <Lock className="w-3 h-3 mr-1" /> {entries.length - unlockedCount} {pluralChapter(entries.length - unlockedCount)} запечатано
          </Badge>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <p className="text-gold/60 font-[family-name:var(--font-cinzel)] animate-flicker">
            ✦ Раскрываем кодекс... ✦
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {entries.map((entry) => (
            <GrimoirePage
              key={entry.id}
              entry={entry}
              isAdmin={isAdmin}
              onUnlock={() => unlockMut.mutate(entry.id)}
              pending={unlockMut.isPending}
            />
          ))}
          {entries.length === 0 && (
            <div className="text-center py-16 text-foreground/40 italic">
              Страницы Гримуара пусты. Лишь тишина встречает читателя.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const ENTRY_TYPE_LABEL: Record<string, string> = {
  DIARY: "📔 Дневник",
  SPELL_FORMULA: "🔮 Магическая Формула",
  NOTE: "📝 Заметка",
};

function GrimoirePage({
  entry,
  isAdmin,
  onUnlock,
  pending,
}: {
  entry: GrimoireEntry;
  isAdmin: boolean;
  onUnlock: () => void;
  pending: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const paperClass = `paper-${(entry.paperStyle || "PLAIN").toLowerCase()}`;

  return (
    <div className="space-y-2">
      {/* Chapter header (always visible) — click to expand */}
      <ParchmentCard
        className={`relative overflow-hidden cursor-pointer transition-all ${entry.unlocked ? "gold-frame-hover" : ""}`}
        frame={entry.unlocked}
      >
        {!entry.unlocked && <div className="absolute inset-0 locked-veil z-0 rounded-lg" />}
        <div
          className="relative z-10"
          onClick={() => entry.unlocked && setExpanded(!expanded)}
        >
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              {entry.unlocked ? (
                <RuneSeal icon={<Unlock className="w-6 h-6 text-gold" />} size="sm" glow />
              ) : (
                <RuneSeal icon={<Lock className="w-6 h-6 text-foreground/50" />} size="sm" className="opacity-70" />
              )}
              <div>
                {entry.unlocked ? (
                  <h3 className="font-[family-name:var(--font-cinzel)] text-xl parchment-heading">
                    {entry.title}
                  </h3>
                ) : (
                  <h3 className="font-[family-name:var(--font-cinzel)] text-xl cipher-strong font-mono">
                    ◈ {entry.encodedTitle || generateCipher(entry.id + "title", 8)} ◈
                  </h3>
                )}
                <div className="flex items-center gap-2 flex-wrap mt-1">
                  <Badge variant="outline" className={`text-xs ${entry.unlocked ? "border-gold/30 text-gold/70" : "border-foreground/20 text-foreground/40"}`}>
                    {entry.unlocked ? (CAT_LABEL[entry.category] ?? entry.category) : "Запечатано"}
                  </Badge>
                  {entry.unlocked && (
                    <Badge variant="outline" className="text-xs border-wine/30 text-wine/70">
                      {ENTRY_TYPE_LABEL[entry.entryType || "NOTE"] ?? "📝 Заметка"}
                    </Badge>
                  )}
                  {entry.unlocked && entry.autoUnlocked && (
                    <Badge variant="outline" className="text-xs border-magic-glow/40 text-magic-glow/80">
                      ✦ Снято судьбой
                    </Badge>
                  )}
                  {!entry.unlocked && entry.conditionType && (
                    <Badge variant="outline" className="text-xs border-amber-600/40 text-amber-600/80">
                      ⚗ Условие есть
                    </Badge>
                  )}
                  {isAdmin && entry.visibleGroupId && (
                    <Badge variant="outline" className="text-xs border-purple-600/40 text-purple-600/80">
                      👥 Только группа
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isAdmin && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => { e.stopPropagation(); onUnlock(); }}
                  disabled={pending}
                  className={`btn-rune ${entry.unlocked ? "border-wine/40 text-wine hover:bg-wine/10" : "border-gold/40 text-gold hover:bg-gold/10"}`}
                >
                  <Crown className="w-3.5 h-3.5 mr-1" />
                  {entry.unlocked ? "Наложить печать" : "Снять печать"}
                </Button>
              )}
              {entry.unlocked && (
                <span className="text-gold/60 text-sm animate-flicker">
                  {expanded ? "▲" : "▼"}
                </span>
              )}
            </div>
          </div>

          {/* When sealed — show auto-generated hieroglyphs + hint */}
          {!entry.unlocked && (
            <div className="space-y-3 mt-4">
              <p className="cipher-strong text-base leading-relaxed font-mono">
                {entry.encodedContent || generateCipher(entry.id, 120)}
              </p>
              {entry.unlockHint && (
                <div className="flex items-start gap-2 pt-3 border-t border-foreground/10">
                  <KeyRound className="w-4 h-4 text-gold/60 mt-0.5 shrink-0 animate-flicker" />
                  <p className="text-sm text-gold/60 italic font-[family-name:var(--font-garamond)]">
                    Указание для снятия печати: {entry.unlockHint}
                  </p>
                </div>
              )}
              <p className="text-center text-foreground/40 text-xs italic pt-2">
                ✦ Глава запечатана. Исполни условия, чтобы снять печать. ✦
              </p>
            </div>
          )}

          {/* When unlocked and collapsed — show preview */}
          {entry.unlocked && !expanded && (
            <div className="mt-3 pt-3 border-t border-parchment-dark/20">
              <p className="parchment-muted text-sm italic line-clamp-2">
                {entry.realContent || entry.spellReflection || "Нажми, чтобы раскрыть главу..."}
              </p>
              <p className="text-xs text-gold/60 mt-1">▼ Кликни, чтобы раскрыть</p>
            </div>
          )}
        </div>
      </ParchmentCard>

      {/* When unlocked and expanded — show full book page */}
      {entry.unlocked && expanded && (
        <div className={`grimoire-page ${paperClass} animate-reveal`}>
          {/* Margin note top */}
          {entry.marginTop && (
            <div className="margin-note mb-4 ml-12">{entry.marginTop}</div>
          )}

          {/* Title + date */}
          <h2 className="font-[family-name:var(--font-cinzel-decorative)] text-3xl text-wine text-center mb-2">
            {entry.title}
          </h2>
          {entry.loreDate && (
            <p className="text-center parchment-muted text-sm italic mb-6">📅 {entry.loreDate}</p>
          )}
          {!entry.loreDate && <div className="mb-4" />}

          {/* DIARY type: large body + postscript */}
          {entry.entryType === "DIARY" && (
            <div className="space-y-4">
              <div className="lore-prose drop-cap whitespace-pre-line text-base leading-relaxed">
                {entry.realContent}
              </div>
              {entry.postscript && (
                <div className="mt-6 pt-4 border-t border-parchment-dark/20">
                  <p className="font-[family-name:var(--font-cinzel)] text-sm parchment-heading mb-1">P.S.</p>
                  <p className="parchment-muted italic whitespace-pre-line">{entry.postscript}</p>
                </div>
              )}
            </div>
          )}

          {/* SPELL_FORMULA type: reflection + formula + notes */}
          {entry.entryType === "SPELL_FORMULA" && (
            <div className="space-y-4">
              {entry.spellReflection && (
                <div>
                  <p className="font-[family-name:var(--font-cinzel)] text-sm parchment-heading mb-1">Размышления автора</p>
                  <p className="lore-prose whitespace-pre-line">{entry.spellReflection}</p>
                </div>
              )}
              {entry.spellFormula && (
                <div className="my-4 p-4 bg-parchment-dark/20 rounded-lg border border-wine/20">
                  <p className="font-[family-name:var(--font-cinzel)] text-sm parchment-heading mb-2">✦ Формула заклинания ✦</p>
                  <pre className="whitespace-pre-wrap font-mono text-sm parchment-text">{entry.spellFormula}</pre>
                </div>
              )}
              {entry.spellNotes && (
                <div>
                  <p className="font-[family-name:var(--font-cinzel)] text-sm parchment-heading mb-1">Заметки</p>
                  <p className="parchment-muted text-sm whitespace-pre-line">{entry.spellNotes}</p>
                </div>
              )}
            </div>
          )}

          {/* NOTE type: simple text */}
          {entry.entryType === "NOTE" && (
            <div className="lore-prose whitespace-pre-line text-base leading-relaxed">
              {entry.realContent}
            </div>
          )}

          {/* Fallback for entries with no entryType set (old entries) */}
          {!entry.entryType && entry.realContent && (
            <div className="lore-prose drop-cap whitespace-pre-line text-base leading-relaxed">
              {entry.realContent}
            </div>
          )}

          {/* Margin note bottom */}
          {entry.marginBottom && (
            <div className="margin-note mt-4 ml-12">{entry.marginBottom}</div>
          )}

          {/* Collapse button */}
          <div className="text-center mt-6">
            <button
              onClick={() => setExpanded(false)}
              className="btn-parchment text-xs px-3 py-1.5"
            >
              ▲ Свернуть главу
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function pluralChapter(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "глава";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "главы";
  return "глав";
}

// Deterministic pseudo-random cipher generator — produces hieroglyph-like symbols
// based on the entry ID (so the same chapter always shows the same cipher).
const HIEROGLYPHS = "◈◇◆◼◻▼▲▽△⬡⬢✦✧❖☠♾⟁⟆⟐⟡⫷⫸⫹⫺⟢⟣⟤⟥⟨⟩⟪⟫⟰⟱⟲⟳⟴⟵⟶⟷⟸⟹⟺⟻⟼⟽⟾⟿⤀⤁⤂⤃⤄⤅⤆⤇⤈⤉⤊⤋⤌⤍⤎⤏⤐⤑⤒⤓⤔⤕⤖⤗⤘⤙⤚⤛⤜⤝⤞⤟⤠⤡⤢⤣⤤⤥⤦⤧⤨⤩⤪⤫⤬⤭⤮⤯⤰⤱⤲⤳⤴⤵⤶⤷⤸⤹⤺⤻⤼⤽⤾⤿";
function generateCipher(seed: string, length: number): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  const chars = HIEROGLYPHS.split("");
  let result = "";
  for (let i = 0; i < length; i++) {
    hash = ((hash << 5) - hash + i * 37) | 0;
    result += chars[Math.abs(hash) % chars.length];
    if ((i + 1) % 8 === 0) result += " ";
  }
  return result.trim();
}
