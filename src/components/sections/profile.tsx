"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { OrnamentTitle } from "@/components/fantasy/ornament-title";
import { ParchmentCard, RuneSeal, RarityBadge } from "@/components/fantasy/ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Award, Sword, Star, Edit3, Save, X, ScrollText, Trophy, Flag, Ban } from "lucide-react";

export function ProfileView() {
  const { data, isLoading } = useQuery<any>({
    queryKey: ["me"],
    queryFn: () => fetch("/api/auth/me").then((r) => r.json()),
  });
  const { data: ranks } = useQuery<any[]>({
    queryKey: ["ranks"],
    queryFn: () => fetch("/api/guild/ranks").then((r) => r.json()),
  });
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>(null);
  const qc = useQueryClient();
  const { toast } = useToast();

  const saveMut = useMutation({
    mutationFn: async () =>
      fetch("/api/characters", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: data.character.id, ...form }),
      }).then((r) => r.json()),
    onSuccess: () => {
      toast({ title: "Свиток обновлён", description: "Изменения вписаны в Книгу." });
      setEditing(false);
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });

  const completeQuestMut = useMutation({
    mutationFn: async ({ questId, status }: { questId: string; status: string }) => {
      const res = await fetch(`/api/guild/quests/${questId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterId: data.character.id, status }),
      });
      return (await res.json()) as {
        xpAwarded?: number;
        autoUnlocked?: { id: string; title: string }[];
        autoGranted?: { id: string; name: string; icon: string | null }[];
      };
    },
    onSuccess: (result, vars) => {
      if (vars.status === "COMPLETED") {
        toast({
          title: "✦ Задание завершено!",
          description: result.xpAwarded
            ? `Слава записана в летопись. Получено ${result.xpAwarded} опыта.`
            : "Слава записана в летопись. Награда получена.",
        });
        // Celebrate auto-unlocked grimoire pages
        result.autoUnlocked?.forEach((g, i) => {
          setTimeout(() => {
            toast({
              title: "🔮 Печать Гримуара снята!",
              description: `Страница открыта: «${g.title}». Тайна ждёт твоего прочтения.`,
            });
          }, 300 + i * 600);
        });
        // Celebrate auto-granted achievements
        result.autoGranted?.forEach((a, i) => {
          setTimeout(() => {
            toast({
              title: `${a.icon ?? "🏅"} Достижение получено!`,
              description: `«${a.name}» — божество отметило твой подвиг.`,
            });
          }, 600 + i * 600);
        });
      } else {
        toast({ title: "Задание оставлено", description: "Путь героя извилист." });
      }
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["quests"] });
      qc.invalidateQueries({ queryKey: ["characters"] });
      if (result.autoUnlocked?.length) qc.invalidateQueries({ queryKey: ["grimoire"] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <p className="text-gold/60 font-[family-name:var(--font-cinzel)] animate-flicker">
          ✦ Ищем твой свиток... ✦
        </p>
      </div>
    );
  }

  const char = data?.character;
  if (!char) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <OrnamentTitle size="md">У тебя пока нет героя</OrnamentTitle>
        <p className="parchment-muted font-[family-name:var(--font-garamond)]">
          Зарегистрируйся вновь и укажи имя персонажа, чтобы ступить на путь авантюриста.
        </p>
      </div>
    );
  }

  const current = form ?? char;
  const rank = char.guildRank;
  const nextRank = (ranks ?? [])
    .filter((r) => r.minXp > char.xp)
    .sort((a, b) => a.minXp - b.minXp)[0];
  const rankProgress = nextRank
    ? Math.min(100, ((char.xp - rank.minXp) / (nextRank.minXp - rank.minXp)) * 100)
    : 100;
  const achievements = char.achievements ?? [];
  const quests = char.questProgress ?? [];

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-10 space-y-8">
      <OrnamentTitle size="lg" flourish="⚔️">
        Свиток Героя
      </OrnamentTitle>

      {/* Hero card */}
      <ParchmentCard className="space-y-5">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <RuneSeal icon={<span className="text-3xl">{rank?.icon ?? "🛡️"}</span>} size="lg" glow />
          <div className="flex-1 w-full space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                {editing ? (
                  <Input
                    value={current.name}
                    onChange={(e) => setForm({ ...current, name: e.target.value })}
                    className="bg-parchment/60 border-parchment-dark/40 text-xl font-[family-name:var(--font-cinzel)]"
                  />
                ) : (
                  <h2 className="font-[family-name:var(--font-cinzel)] text-2xl parchment-heading">
                    {char.name}
                  </h2>
                )}
                <p className="parchment-muted text-sm">
                  {char.race ?? "Неизвестно"} · {char.charClass ?? "Без класса"} · Уровень {char.level}
                </p>
              </div>
              {editing ? (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => saveMut.mutate()} disabled={saveMut.isPending} className="btn-wine-solid h-8 px-3">
                    <Save className="w-3.5 h-3.5 mr-1" /> Сохранить
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setForm(null); }} className="btn-parchment h-8 px-3">
                    <X className="w-3.5 h-3.5 mr-1" /> Отмена
                  </Button>
                </div>
              ) : (
                <Button size="sm" onClick={() => { setForm(char); setEditing(true); }} className="btn-parchment h-8 px-3">
                  <Edit3 className="w-3.5 h-3.5 mr-1" /> Редактировать
                </Button>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label className="parchment-heading text-xs uppercase tracking-wider">Раса</Label>
                {editing ? (
                  <Input value={current.race ?? ""} onChange={(e) => setForm({ ...current, race: e.target.value })} className="bg-parchment/60 border-parchment-dark/40" />
                ) : (
                  <p className="parchment-text">{char.race ?? "—"}</p>
                )}
              </div>
              <div>
                <Label className="parchment-heading text-xs uppercase tracking-wider">Класс</Label>
                {editing ? (
                  <Input value={current.charClass ?? ""} onChange={(e) => setForm({ ...current, charClass: e.target.value })} className="bg-parchment/60 border-parchment-dark/40" />
                ) : (
                  <p className="parchment-text">{char.charClass ?? "—"}</p>
                )}
              </div>
            </div>

            {/* Rank progress */}
            <div className="space-y-1.5 pt-2 border-t border-parchment-dark/20">
              <div className="flex justify-between text-sm">
                <span className="parchment-heading flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-gold" /> {rank?.name ?? "Без ранга"}
                </span>
                <span className="parchment-muted">{char.xp} XP {nextRank && `→ ${nextRank.minXp} XP`}</span>
              </div>
              <Progress value={rankProgress} className="h-2 bg-parchment-dark/30" />
              {nextRank && (
                <p className="text-xs parchment-muted italic">
                  До ранга «{nextRank.name}» осталось {nextRank.minXp - char.xp} XP
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Bio */}
        <div className="pt-3 border-t border-parchment-dark/20">
          <Label className="parchment-heading text-sm">История героя</Label>
          {editing ? (
            <Textarea
              value={current.bio ?? ""}
              onChange={(e) => setForm({ ...current, bio: e.target.value })}
              rows={5}
              className="bg-parchment/60 border-parchment-dark/40 mt-1"
              placeholder="Расскажи о происхождении и цели своего героя..."
            />
          ) : (
            <p className="parchment-text lore-prose drop-cap mt-1">
              {char.bio ?? "История ещё не написана..."}
            </p>
          )}
        </div>
      </ParchmentCard>

      {/* Stats grid */}
      <div className="grid sm:grid-cols-3 gap-4">
        <ParchmentCard className="text-center space-y-1">
          <Award className="w-7 h-7 text-gold mx-auto" />
          <p className="font-[family-name:var(--font-cinzel)] text-2xl parchment-heading">{achievements.length}</p>
          <p className="parchment-muted text-sm">Достижений</p>
        </ParchmentCard>
        <ParchmentCard className="text-center space-y-1">
          <Sword className="w-7 h-7 text-wine mx-auto" />
          <p className="font-[family-name:var(--font-cinzel)] text-2xl parchment-heading">
            {quests.filter((q: any) => q.status === "COMPLETED").length}
          </p>
          <p className="parchment-muted text-sm">Завершено заданий</p>
        </ParchmentCard>
        <ParchmentCard className="text-center space-y-1">
          <Star className="w-7 h-7 text-gold mx-auto" />
          <p className="font-[family-name:var(--font-cinzel)] text-2xl parchment-heading">{char.xp}</p>
          <p className="parchment-muted text-sm">Опыт</p>
        </ParchmentCard>
      </div>

      {/* Achievements */}
      <div className="space-y-4">
        <OrnamentTitle size="md" flourish="✦">
          Достижения
        </OrnamentTitle>
        {achievements.length === 0 ? (
          <ParchmentCard className="text-center parchment-muted italic py-8">
            <ScrollText className="w-8 h-8 mx-auto mb-2 text-gold/40" />
            Достижений пока нет. Божество ещё не отметило твои деяния.
          </ParchmentCard>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {achievements.map((a: any) => (
              <ParchmentCard key={a.achievementId} hover className="flex items-start gap-3">
                <RuneSeal icon={<span className="text-2xl">{a.achievement.icon ?? "🏅"}</span>} size="md" glow={a.achievement.rarity === "LEGENDARY" || a.achievement.rarity === "MYTHIC"} />
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-[family-name:var(--font-cinzel)] parchment-heading">{a.achievement.name}</h4>
                    <RarityBadge rarity={a.achievement.rarity} />
                  </div>
                  <p className="parchment-muted text-sm">{a.achievement.description}</p>
                  <p className="text-xs parchment-muted/70 mt-1 italic">
                    Даровано: {new Date(a.grantedAt).toLocaleDateString("ru-RU")}
                  </p>
                </div>
              </ParchmentCard>
            ))}
          </div>
        )}
      </div>

      {/* Quest progress */}
      {quests.length > 0 && (
        <div className="space-y-4">
          <OrnamentTitle size="md" flourish="⚔️">
            Журнал заданий
          </OrnamentTitle>
          <div className="grid gap-3">
            {quests.map((q: any) => (
              <ParchmentCard key={q.questId} className="space-y-2">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-[family-name:var(--font-cinzel)] parchment-heading">{q.quest.title}</h4>
                    <p className="parchment-muted text-sm">{q.quest.description}</p>
                  </div>
                  <Badge variant="outline" className={
                    q.status === "COMPLETED" ? "border-green-600/30 text-green-700" :
                    q.status === "FAILED" ? "border-red-700/30 text-red-700" :
                    "border-amber-700/30 text-amber-700"
                  }>
                    {q.status === "COMPLETED" ? "✓ Завершено" : q.status === "FAILED" ? "✗ Провалено" : "⚔ В работе"}
                  </Badge>
                </div>
                {q.status === "ASSIGNED" && (
                  <div className="flex gap-2 pt-2 border-t border-parchment-dark/20">
                    <Button
                      size="sm"
                      onClick={() => completeQuestMut.mutate({ questId: q.questId, status: "COMPLETED" })}
                      disabled={completeQuestMut.isPending}
                      className="btn-wine-solid h-8 px-3"
                    >
                      <Flag className="w-3.5 h-3.5 mr-1" /> Завершить подвиг
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => completeQuestMut.mutate({ questId: q.questId, status: "FAILED" })}
                      disabled={completeQuestMut.isPending}
                      className="btn-parchment h-8 px-3"
                    >
                      <Ban className="w-3.5 h-3.5 mr-1" /> Оставить
                    </Button>
                  </div>
                )}
                {q.status === "COMPLETED" && q.completedAt && (
                  <p className="text-xs parchment-muted italic pt-1">
                    Завершено: {new Date(q.completedAt).toLocaleDateString("ru-RU")}
                  </p>
                )}
              </ParchmentCard>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
