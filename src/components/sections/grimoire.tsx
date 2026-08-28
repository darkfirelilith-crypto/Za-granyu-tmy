"use client";

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
  const qc = useQueryClient();
  const { toast } = useToast();

  const unlockMut = useMutation({
    mutationFn: async (id: string) =>
      fetch(`/api/grimoire/${id}/unlock`, { method: "POST" }).then((r) => r.json()),
    onSuccess: (entry) => {
      toast({
        title: entry.unlocked ? "Печать снята!" : "Печать наложена",
        description: entry.unlocked
          ? "Слова Гримуара открылись твоему взору."
          : "Страница вновь сокрыта туманом.",
      });
      qc.invalidateQueries({ queryKey: ["grimoire"] });
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
          Древний кодекс, написанный на языке, которого больше не существует.
          Страницы его покрыты шифром и запечатаны магией. Лишь исполнив условия
          сюжета, удостоишься снять печать и прочесть то, что сокрыто от
          непосвящённых.
        </p>
        <div className="flex justify-center gap-2">
          <Badge variant="outline" className="border-gold/30 text-gold/70 font-[family-name:var(--font-cinzel)]">
            <Unlock className="w-3 h-3 mr-1" /> {unlockedCount} открыто
          </Badge>
          <Badge variant="outline" className="border-gold/30 text-gold/70 font-[family-name:var(--font-cinzel)]">
            <Lock className="w-3 h-3 mr-1" /> {entries.length - unlockedCount} запечатано
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
  return (
    <ParchmentCard
      className={`relative overflow-hidden ${entry.unlocked ? "animate-reveal" : ""}`}
      frame={entry.unlocked}
    >
      {/* Locked veil overlay */}
      {!entry.unlocked && (
        <div className="absolute inset-0 locked-veil z-0 rounded-lg" />
      )}
      <div className="relative z-10 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            {entry.unlocked ? (
              <RuneSeal icon={<Unlock className="w-6 h-6 text-gold" />} size="sm" glow />
            ) : (
              <RuneSeal icon={<Lock className="w-6 h-6 text-foreground/50" />} size="sm" className="opacity-70" />
            )}
            <div>
              <h3 className={`font-[family-name:var(--font-cinzel)] text-xl ${entry.unlocked ? "parchment-heading" : "text-foreground/60"}`}>
                {entry.title}
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={`text-xs ${entry.unlocked ? "border-gold/30 text-gold/70" : "border-foreground/20 text-foreground/40"}`}>
                  {CAT_LABEL[entry.category] ?? entry.category}
                </Badge>
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
              </div>
            </div>
          </div>
          {isAdmin && (
            <Button
              size="sm"
              variant="outline"
              onClick={onUnlock}
              disabled={pending}
              className={`btn-rune ${entry.unlocked ? "border-wine/40 text-wine hover:bg-wine/10" : "border-gold/40 text-gold hover:bg-gold/10"}`}
            >
              <Crown className="w-3.5 h-3.5 mr-1" />
              {entry.unlocked ? "Наложить печать" : "Снять печать"}
            </Button>
          )}
        </div>

        {entry.unlocked ? (
          <div className="lore-prose drop-cap border-l-2 border-gold/40 pl-4">
            <p className="animate-reveal">{entry.realContent}</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="cipher-strong text-base leading-relaxed">
              {entry.encodedContent}
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
              ✦ Страница запечатана. Исполни условия, чтобы открыть её. ✦
            </p>
          </div>
        )}
      </div>
    </ParchmentCard>
  );
}
