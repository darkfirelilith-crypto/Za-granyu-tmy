"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useAppStore } from "@/store/app-store";
import { OrnamentTitle } from "@/components/fantasy/ornament-title";
import { ParchmentCard, RuneSeal, DifficultyBadge } from "@/components/fantasy/ui";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import type { GuildRank, Quest, Character } from "@/lib/types";
import { Shield, Trophy, MapPin, Sword, Crown, Star, Award, Users } from "lucide-react";

const DIFF_REWARD: Record<string, string> = {
  TRIVIAL: "20", EASY: "50", MEDIUM: "120", HARD: "250", DEADLY: "500",
};

export function GuildView() {
  const { data: content } = useQuery<any[]>({ queryKey: ["site-content"], queryFn: () => fetch("/api/content").then((r) => r.json()).catch(() => []) });
  const intro = (Array.isArray(content) ? content : []).find((c) => c.key === "guild_intro");
  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-10 space-y-8">
      <OrnamentTitle size="lg" flourish="⚔️">
        Гильдия Авантюристов
      </OrnamentTitle>
      <p className="text-center text-foreground/70 font-[family-name:var(--font-garamond)] italic max-w-2xl mx-auto">
        {intro?.body || "Обитель всех, кто избрал путь искателя приключений."}
      </p>

      <Tabs defaultValue="info" className="w-full">
        <div className="flex justify-center overflow-x-auto pb-2">
          <TabsList className="bg-background/40 border border-gold/20 flex flex-wrap h-auto">
            <TabsTrigger value="info" className="font-[family-name:var(--font-cinzel)] data-[state=active]:text-gold">
              <Shield className="w-4 h-4 mr-1" /> О гильдии
            </TabsTrigger>
            <TabsTrigger value="ranks" className="font-[family-name:var(--font-cinzel)] data-[state=active]:text-gold">
              <Trophy className="w-4 h-4 mr-1" /> Ранги
            </TabsTrigger>
            <TabsTrigger value="members" className="font-[family-name:var(--font-cinzel)] data-[state=active]:text-gold">
              <Users className="w-4 h-4 mr-1" /> Братья по оружию
            </TabsTrigger>
            <TabsTrigger value="quests" className="font-[family-name:var(--font-cinzel)] data-[state=active]:text-gold">
              <Sword className="w-4 h-4 mr-1" /> Задания
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="info" className="mt-6"><GuildInfo /></TabsContent>
        <TabsContent value="ranks" className="mt-6"><RanksTab /></TabsContent>
        <TabsContent value="members" className="mt-6"><MembersTab /></TabsContent>
        <TabsContent value="quests" className="mt-6"><QuestsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function GuildInfo() {
  const { data } = useQuery<any[]>({
    queryKey: ["site-content"],
    queryFn: () => fetch("/api/content").then((r) => r.json()).catch(() => []),
  });
  const map: Record<string, any> = {};
  (Array.isArray(data) ? data : []).forEach((c: any) => { map[c.key] = c; });
  return (
    <div className="grid md:grid-cols-2 gap-5">
      <ParchmentCard className="lore-prose drop-cap space-y-3">
        <h3 className="font-[family-name:var(--font-cinzel)] text-xl parchment-heading">История Гильдии</h3>
        <div className="whitespace-pre-line">{map.guild_history?.body || "История ещё не записана Божеством."}</div>
      </ParchmentCard>
      <div className="space-y-4">
        <ParchmentCard className="space-y-2">
          <h3 className="font-[family-name:var(--font-cinzel)] text-lg parchment-heading">Девиз Гильдии</h3>
          <p className="text-center font-[family-name:var(--font-cinzel-decorative)] text-lg text-wine italic">
            {map.guild_motto?.body || "—"}
          </p>
        </ParchmentCard>
        <ParchmentCard className="space-y-2">
          <h3 className="font-[family-name:var(--font-cinzel)] text-lg parchment-heading">Залы Гильдии</h3>
          <div className="parchment-muted text-sm whitespace-pre-line">{map.guild_halls?.body || "Залы ещё не описаны."}</div>
        </ParchmentCard>
      </div>
    </div>
  );
}

function RanksTab() {
  const { data, isLoading } = useQuery<GuildRank[]>({
    queryKey: ["ranks"],
    queryFn: () => fetch("/api/guild/ranks").then((r) => r.json()),
  });
  if (isLoading) return <LoadingScroll />;
  const ranks = data ?? [];
  return (
    <div className="space-y-4">
      <p className="text-center parchment-muted text-sm italic font-[family-name:var(--font-garamond)]">
        Каждый герой начинает с низов и поднимается по рангам, набирая опыт в заданиях.
      </p>
      <div className="grid gap-4">
        {ranks.map((r, i) => (
          <ParchmentCard key={r.id} hover className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="text-gold/40 font-[family-name:var(--font-cinzel)] text-2xl">{i + 1}</span>
              <RuneSeal icon={<span className="text-2xl">{r.icon ?? "🏅"}</span>} size="md" />
            </div>
            <div className="flex-1">
              <h3 className="font-[family-name:var(--font-cinzel)] text-lg parchment-heading">{r.name}</h3>
              {r.description && <p className="parchment-muted text-sm">{r.description}</p>}
              <p className="text-xs parchment-muted/80 mt-1">Минимальный опыт: {r.minXp} XP</p>
            </div>
            <div className="hidden sm:flex items-center gap-1 text-gold">
              {Array.from({ length: r.level }).map((_, idx) => (
                <Star key={idx} className="w-4 h-4 fill-gold text-gold" />
              ))}
            </div>
          </ParchmentCard>
        ))}
      </div>
    </div>
  );
}

function MembersTab() {
  const { setView, setKnowledgeTab } = useAppStore();
  const { data: charsData, isLoading } = useQuery<any[]>({
    queryKey: ["characters"],
    queryFn: () => fetch("/api/characters").then((r) => r.json()),
  });
  const { data: personalData } = useQuery<any[]>({
    queryKey: ["personalities"],
    queryFn: () => fetch("/api/lore/personalities").then((r) => r.json()),
  });
  const { data: ranksData } = useQuery<any[]>({
    queryKey: ["ranks"],
    queryFn: () => fetch("/api/guild/ranks").then((r) => r.json()).catch(() => []),
  });
  if (isLoading) return <LoadingScroll />;

  const ranks = (Array.isArray(ranksData) ? ranksData : []).slice().sort((a, b) => a.minXp - b.minXp);

  // Compute rank progress: (xp - currentRank.minXp) / (nextRank.minXp - currentRank.minXp) * 100.
  // Falls back to 100 if at max rank, or 0 if no rank assigned yet.
  const progressFor = (xp: number, rankId: string | null): number => {
    const idx = rankId ? ranks.findIndex((r) => r.id === rankId) : -1;
    if (idx === -1) return 0;
    const cur = ranks[idx];
    const next = ranks[idx + 1];
    if (!next) return 100; // max rank
    const span = next.minXp - cur.minXp;
    if (span <= 0) return 100;
    return Math.min(100, Math.max(0, ((xp - cur.minXp) / span) * 100));
  };

  // Player characters that are adventurers
  const chars = (Array.isArray(charsData) ? charsData : [])
    .filter((c) => c.isAdventurer !== false)
    .sort((a, b) => (b.xp ?? 0) - (a.xp ?? 0));

  // NPC personalities that are marked as adventurers
  const npcAdventurers = (Array.isArray(personalData) ? personalData : [])
    .filter((p) => p.isAdventurer === true);

  // Go to Knowledge → Personalities for this NPC
  const goToNpc = () => {
    setKnowledgeTab("personalities");
    setView("knowledge");
  };

  return (
    <div className="space-y-6">
      {/* Player characters */}
      <div>
        <h3 className="font-[family-name:var(--font-cinzel)] text-sm parchment-heading uppercase tracking-wider text-wine mb-3">
          ⚔️ Герои-авантюристы ({chars.length})
        </h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {chars.map((c, idx) => (
            <ParchmentCard key={c.id} hover className="space-y-3">
              <div className="flex items-center gap-3">
                {idx === 0 && chars.length > 1 && <Crown className="w-5 h-5 text-gold fill-gold animate-flicker" />}
                <RuneSeal icon={<span className="text-xl">{c.guildRank?.icon ?? "🛡️"}</span>} size="sm" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-[family-name:var(--font-cinzel)] text-base parchment-heading truncate">{c.name}</h3>
                  <p className="text-xs parchment-muted truncate">
                    {c.race ?? "—"} · {c.charClass ?? "—"} · Ур. {c.level}
                  </p>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs parchment-muted">
                  <span>{c.guildRank?.name ?? "Без ранга"}</span>
                  <span>{c.xp ?? 0} XP</span>
                </div>
                <Progress value={progressFor(c.xp ?? 0, c.guildRankId ?? null)} className="h-1.5 bg-parchment-dark/30" />
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-parchment-dark/20 text-xs">
                <span className="flex items-center gap-1 parchment-muted">
                  <Award className="w-3.5 h-3.5 text-gold" />
                  {c.achievements?.length ?? 0} достижений
                </span>
                <span className="flex items-center gap-1 parchment-muted">
                  <Sword className="w-3.5 h-3.5 text-wine" />
                  {c._count?.questProgress ?? 0} заданий
                </span>
              </div>
              {c.user?.role === "ADMIN" && (
                <Badge variant="outline" className="border-gold/40 text-gold text-[10px]">✦ Божество</Badge>
              )}
            </ParchmentCard>
          ))}
        </div>
      </div>

      {/* NPC Adventurers — clickable → Knowledge */}
      {npcAdventurers.length > 0 && (
        <div>
          <h3 className="font-[family-name:var(--font-cinzel)] text-sm parchment-heading uppercase tracking-wider text-wine mb-3">
            🎭 НПС-авантюристы ({npcAdventurers.length})
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {npcAdventurers.map((p) => (
              <ParchmentCard
                key={p.id}
                hover
                className="space-y-3 cursor-pointer"
              >
                <div onClick={goToNpc} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg overflow-hidden gold-frame shrink-0 bg-parchment-dark/20 flex items-center justify-center">
                      {p.portrait ? (
                        <img src={p.portrait} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <RuneSeal icon={<span className="text-xl">🎭</span>} size="sm" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-[family-name:var(--font-cinzel)] text-base parchment-heading truncate">{p.name}</h3>
                      <p className="text-xs parchment-muted truncate">
                        {p.race ?? "—"} · {p.role ?? p.title ?? "—"}
                      </p>
                    </div>
                    <Badge variant="outline" className="border-wine/30 text-wine text-[10px] shrink-0">🎭 НПС</Badge>
                  </div>
                  {p.description && (
                    <p className="text-xs parchment-muted line-clamp-2">{p.description}</p>
                  )}
                  <div className="flex items-center gap-2 pt-2 border-t border-parchment-dark/20 text-xs">
                    {p.affiliation && <span className="parchment-muted">🏛️ {p.affiliation}</span>}
                    {p.status && (
                      <span className={`parchment-muted ${p.status === "alive" ? "text-green-700" : p.status === "deceased" ? "text-red-700" : "text-amber-700"}`}>
                        {p.status === "alive" ? "✓ Жив" : p.status === "deceased" ? "✗ Погиб" : "? Пропал"}
                      </span>
                    )}
                    <span className="ml-auto text-gold/60 text-xs">📖 Открыть →</span>
                  </div>
                </div>
              </ParchmentCard>
            ))}
          </div>
        </div>
      )}

      {chars.length === 0 && npcAdventurers.length === 0 && (
        <div className="col-span-full text-center py-12 text-foreground/40 italic">
          Пока ни один герой не вписал своё имя в Книгу Гильдии.
        </div>
      )}
    </div>
  );
}

function QuestsTab() {
  const { data: session } = useSession();
  const { data: me } = useQuery<any>({
    queryKey: ["me"],
    queryFn: () => fetch("/api/auth/me").then((r) => r.json()),
  });
  const { data, isLoading } = useQuery<any[]>({
    queryKey: ["quests"],
    queryFn: () => fetch("/api/guild/quests").then((r) => r.json()),
  });
  const qc = useQueryClient();
  const { toast } = useToast();

  const acceptMut = useMutation({
    mutationFn: async ({ questId, characterId }: { questId: string; characterId: string }) => {
      const res = await fetch(`/api/guild/quests/${questId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterId, status: "ASSIGNED" }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || "Не удалось принять задание");
      return json;
    },
    onSuccess: () => {
      toast({ title: "Задание принято", description: "Да хранят тебя боги." });
      qc.invalidateQueries({ queryKey: ["quests"] });
      qc.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (e: Error) => {
      toast({ title: "Печать не сломлена", description: e.message, variant: "destructive" });
    },
  });

  if (isLoading) return <LoadingScroll />;
  const quests = data ?? [];
  const myCharacter = me?.character;

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {quests.map((q) => {
        const myProgress = myCharacter
          ? q.progress?.find((p: any) => p.characterId === myCharacter.id)
          : null;
        return (
          <ParchmentCard key={q.id} hover className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-[family-name:var(--font-cinzel)] text-lg parchment-heading">{q.title}</h3>
              <DifficultyBadge difficulty={q.difficulty} />
            </div>
            <p className="parchment-muted text-sm">{q.description}</p>
            <div className="flex flex-wrap gap-3 text-xs parchment-muted">
              {q.location && (
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-wine" /> {q.location}</span>
              )}
              <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-gold" /> {DIFF_REWARD[q.difficulty] ?? "?"} XP</span>
              <QuestStatusBadge status={myProgress?.status ?? q.status} />
            </div>
            {q.reward && (
              <div className="pt-2 border-t border-parchment-dark/20">
                <p className="text-xs parchment-heading uppercase tracking-wider">Награда</p>
                <p className="parchment-muted text-sm">{q.reward}</p>
              </div>
            )}
            {session?.user?.role === "PLAYER" && myCharacter && (
              <div className="pt-2">
                {myProgress?.status === "ASSIGNED" ? (
                  <Button variant="outline" disabled className="btn-rune w-full border-gold/30 text-gold/60">
                    ⚔ Задание принято — ждём исхода
                  </Button>
                ) : myProgress?.status === "COMPLETED" ? (
                  <Button variant="outline" disabled className="btn-rune w-full border-green-600/30 text-green-700">
                    ✓ Задание завершено
                  </Button>
                ) : (
                  <Button
                    onClick={() => acceptMut.mutate({ questId: q.id, characterId: myCharacter.id })}
                    disabled={acceptMut.isPending}
                    className="btn-rune w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    <Sword className="w-4 h-4 mr-1" /> Принять задание
                  </Button>
                )}
              </div>
            )}
            {!session?.user && (
              <p className="text-xs parchment-muted italic text-center pt-2">
                Войдите как авантюрист, чтобы принять задание
              </p>
            )}
          </ParchmentCard>
        );
      })}
      {quests.length === 0 && (
        <div className="col-span-full text-center py-12 text-foreground/40 italic">
          Заданий пока нет. Божество ещё не изложило их.
        </div>
      )}
    </div>
  );
}

function QuestStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    OPEN: { label: "Открыто", cls: "text-green-700 border-green-600/30" },
    ASSIGNED: { label: "Назначено", cls: "text-amber-700 border-amber-700/30" },
    COMPLETED: { label: "Завершено", cls: "text-blue-700 border-blue-700/30" },
    FAILED: { label: "Провалено", cls: "text-red-700 border-red-700/30" },
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
