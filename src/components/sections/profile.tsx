"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { OrnamentTitle } from "@/components/fantasy/ornament-title";
import { ParchmentCard, RuneSeal, RarityBadge } from "@/components/fantasy/ui";
import { ImageUpload } from "@/components/fantasy/image-upload";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Award, Sword, BookOpen, Edit3, Save, X, Trophy, Flag, Ban, Plus, Trash2, Pencil, Users, Link2, Heart } from "lucide-react";

export function ProfileView() {
  const { data, isLoading } = useQuery<any>({
    queryKey: ["me"],
    queryFn: () => fetch("/api/auth/me").then((r) => r.json()),
  });
  const { data: ranks } = useQuery<any[]>({
    queryKey: ["ranks"],
    queryFn: () => fetch("/api/guild/ranks").then((r) => r.json()),
  });
  const [tab, setTab] = useState("profile");
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
      return (await res.json()) as { xpAwarded?: number; autoUnlocked?: { id: string; title: string }[]; autoGranted?: { id: string; name: string; icon: string | null }[] };
    },
    onSuccess: (result, vars) => {
      if (vars.status === "COMPLETED") {
        toast({ title: "✦ Задание завершено!", description: result.xpAwarded ? `Получено ${result.xpAwarded} опыта.` : "Награда получена." });
        result.autoUnlocked?.forEach((g, i) => setTimeout(() => toast({ title: "🔮 Печать Гримуара снята!", description: `Глава открыта: «${g.title}».` }), 300 + i * 600));
        result.autoGranted?.forEach((a, i) => setTimeout(() => toast({ title: `${a.icon ?? "🏅"} Достижение получено!`, description: `«${a.name}».` }), 600 + i * 600));
      } else {
        toast({ title: "Задание оставлено" });
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
        <p className="text-gold/60 font-[family-name:var(--font-cinzel)] animate-flicker">✦ Ищем твой свиток... ✦</p>
      </div>
    );
  }

  const char = data?.character;
  if (!char) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <OrnamentTitle size="md">У тебя пока нет героя</OrnamentTitle>
        <p className="parchment-muted font-[family-name:var(--font-garamond)]">
          Зарегистрируйся и укажи имя персонажа, чтобы ступить на путь авантюриста.
        </p>
      </div>
    );
  }

  const current = form ?? char;
  const rank = char.guildRank;
  const nextRank = (ranks ?? []).filter((r) => r.minXp > char.xp).sort((a, b) => a.minXp - b.minXp)[0];
  const rankProgress = nextRank ? Math.min(100, ((char.xp - rank.minXp) / (nextRank.minXp - rank.minXp)) * 100) : 100;
  const achievements = char.achievements ?? [];
  const quests = char.questProgress ?? [];
  const notes = char.notes ?? [];

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-10 space-y-8">
      <OrnamentTitle size="lg" flourish="⚔️">Свиток Героя</OrnamentTitle>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <div className="flex justify-center pb-2">
          <TabsList className="bg-background/40 border border-gold/20 flex flex-wrap h-auto">
            <TabsTrigger value="profile" className="font-[family-name:var(--font-cinzel)] data-[state=active]:text-gold gap-1.5">
              <Users className="w-4 h-4" /> Профиль
            </TabsTrigger>
            <TabsTrigger value="characteristics" className="font-[family-name:var(--font-cinzel)] data-[state=active]:text-gold gap-1.5">
              <BookOpen className="w-4 h-4" /> Характеристики
            </TabsTrigger>
            <TabsTrigger value="relations" className="font-[family-name:var(--font-cinzel)] data-[state=active]:text-gold gap-1.5">
              <Link2 className="w-4 h-4" /> Связи и отношения
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ===== TAB 1: ПРОФИЛЬ ===== */}
        <TabsContent value="profile" className="mt-6 space-y-6">
          <ParchmentCard className="space-y-6">
            {/* Header: portrait + name + edit buttons — wider, no overlap */}
            <div className="flex flex-col md:flex-row gap-6">
              <div className="shrink-0 mx-auto md:mx-0">
                {editing ? (
                  <div className="w-36 md:w-40">
                    <ImageUpload
                      value={current.portrait || null}
                      onChange={(v) => setForm({ ...current, portrait: v })}
                      aspect="aspect-[3/4]"
                      rounded="rounded-lg"
                      maxDim={600}
                    />
                  </div>
                ) : (
                  <div className="w-36 h-48 md:w-40 md:h-52 rounded-lg overflow-hidden gold-frame bg-parchment-dark/20 flex items-center justify-center">
                    {char.portrait ? (
                      <img src={char.portrait} alt={char.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-5xl">{rank?.icon ?? "🛡️"}</span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-4 min-w-0">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    {editing ? (
                      <Input
                        value={current.name}
                        onChange={(e) => setForm({ ...current, name: e.target.value })}
                        className="bg-parchment/60 border-parchment-dark/40 text-xl font-[family-name:var(--font-cinzel)] h-12"
                      />
                    ) : (
                      <h2 className="font-[family-name:var(--font-cinzel)] text-2xl parchment-heading break-words">{char.name}</h2>
                    )}
                  </div>
                  <div className="shrink-0">
                    {editing ? (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => saveMut.mutate()} disabled={saveMut.isPending} className="btn-wine-solid h-9 px-3">
                          <Save className="w-3.5 h-3.5 mr-1" /> Сохранить
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setForm(null); }} className="btn-parchment h-9 px-3">
                          <X className="w-3.5 h-3.5 mr-1" /> Отмена
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" onClick={() => { setForm(char); setEditing(true); }} className="btn-parchment h-9 px-3">
                        <Edit3 className="w-3.5 h-3.5 mr-1" /> Редактировать
                      </Button>
                    )}
                  </div>
                </div>

                {/* Race / Class / Alignment — full width grid, no overlap */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field label="Раса" editing={editing} value={current.race} onChange={(v) => setForm({ ...current, race: v })} display={char.race} />
                  <Field label="Класс" editing={editing} value={current.charClass} onChange={(v) => setForm({ ...current, charClass: v })} display={char.charClass} />
                  <div>
                    <Label className="parchment-heading text-xs uppercase tracking-wider">Мировоззрение</Label>
                    {editing ? (
                      <Input value={current.alignment ?? ""} onChange={(e) => setForm({ ...current, alignment: e.target.value })} placeholder="Законопослушный Добрый" className="bg-parchment/60 border-parchment-dark/40 h-9" />
                    ) : (
                      <p className="parchment-text">{char.alignment ?? "—"}</p>
                    )}
                  </div>
                </div>

                {/* Rank progress */}
                <div className="space-y-1.5 pt-2 border-t border-parchment-dark/20">
                  <div className="flex justify-between text-sm flex-wrap gap-1">
                    <span className="parchment-heading flex items-center gap-1.5">
                      <Trophy className="w-4 h-4 text-gold" /> {rank?.name ?? "Без ранга"} · Ур.{char.level}
                    </span>
                    <span className="parchment-muted">{char.xp} XP {nextRank && `→ ${nextRank.minXp} XP`}</span>
                  </div>
                  <Progress value={rankProgress} className="h-2 bg-parchment-dark/30" />
                  {nextRank && <p className="text-xs parchment-muted italic">До ранга «{nextRank.name}» осталось {nextRank.minXp - char.xp} XP</p>}
                </div>
              </div>
            </div>

            {/* Backstory — full width */}
            <SectionField
              label="Предыстория"
              editing={editing}
              value={current.bio}
              onChange={(v) => setForm({ ...current, bio: v })}
              display={char.bio}
              placeholder="Расскажи о происхождении и цели своего героя..."
              dropCap
              rows={5}
            />
          </ParchmentCard>

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <ParchmentCard className="text-center space-y-1">
              <Award className="w-7 h-7 text-gold mx-auto" />
              <p className="font-[family-name:var(--font-cinzel)] text-2xl parchment-heading">{achievements.length}</p>
              <p className="parchment-muted text-sm">Достижений</p>
            </ParchmentCard>
            <ParchmentCard className="text-center space-y-1">
              <Sword className="w-7 h-7 text-wine mx-auto" />
              <p className="font-[family-name:var(--font-cinzel)] text-2xl parchment-heading">{quests.filter((q: any) => q.status === "COMPLETED").length}</p>
              <p className="parchment-muted text-sm">Завершено заданий</p>
            </ParchmentCard>
            <ParchmentCard className="text-center space-y-1 col-span-2 sm:col-span-1">
              <BookOpen className="w-7 h-7 text-gold mx-auto" />
              <p className="font-[family-name:var(--font-cinzel)] text-2xl parchment-heading">{notes.length}</p>
              <p className="parchment-muted text-sm">Заметок в журнале</p>
            </ParchmentCard>
          </div>

          {/* Achievements */}
          <div className="space-y-4">
            <OrnamentTitle size="md" flourish="✦">Достижения</OrnamentTitle>
            {achievements.length === 0 ? (
              <ParchmentCard className="empty-portal">
                <Award className="w-10 h-10 text-gold/40 mx-auto mb-2" />
                <p className="font-[family-name:var(--font-garamond)] italic text-lg">Достижений пока нет.</p>
                <p className="text-sm mt-1 opacity-70">Божество ещё не отметило твои деяния.</p>
              </ParchmentCard>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {achievements.map((a: any) => (
                  <ParchmentCard key={a.achievementId} hover className="flex items-start gap-3">
                    <RuneSeal icon={<span className="text-2xl">{a.achievement.icon ?? "🏅"}</span>} size="md" glow={a.achievement.rarity === "LEGENDARY" || a.achievement.rarity === "MYTHIC"} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <h4 className="font-[family-name:var(--font-cinzel)] parchment-heading">{a.achievement.name}</h4>
                        <RarityBadge rarity={a.achievement.rarity} />
                      </div>
                      <p className="parchment-muted text-sm">{a.achievement.description}</p>
                      <p className="text-xs parchment-muted/70 mt-1 italic">Даровано: {new Date(a.grantedAt).toLocaleDateString("ru-RU")}</p>
                    </div>
                  </ParchmentCard>
                ))}
              </div>
            )}
          </div>

          {/* Quest journal */}
          {quests.length > 0 && (
            <div className="space-y-4">
              <OrnamentTitle size="md" flourish="⚔️">Журнал заданий</OrnamentTitle>
              <div className="grid gap-3">
                {quests.map((q: any) => (
                  <ParchmentCard key={q.questId} className="space-y-2">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-[family-name:var(--font-cinzel)] parchment-heading">{q.quest.title}</h4>
                        <p className="parchment-muted text-sm">{q.quest.description}</p>
                      </div>
                      <Badge variant="outline" className={q.status === "COMPLETED" ? "border-green-600/30 text-green-700" : q.status === "FAILED" ? "border-red-700/30 text-red-700" : "border-amber-700/30 text-amber-700"}>
                        {q.status === "COMPLETED" ? "✓ Завершено" : q.status === "FAILED" ? "✗ Провалено" : "⚔ В работе"}
                      </Badge>
                    </div>
                    {q.status === "ASSIGNED" && (
                      <div className="flex gap-2 pt-2 border-t border-parchment-dark/20">
                        <Button size="sm" onClick={() => completeQuestMut.mutate({ questId: q.questId, status: "COMPLETED" })} disabled={completeQuestMut.isPending} className="btn-wine-solid h-8 px-3">
                          <Flag className="w-3.5 h-3.5 mr-1" /> Завершить подвиг
                        </Button>
                        <Button size="sm" onClick={() => completeQuestMut.mutate({ questId: q.questId, status: "FAILED" })} disabled={completeQuestMut.isPending} className="btn-parchment h-8 px-3">
                          <Ban className="w-3.5 h-3.5 mr-1" /> Оставить
                        </Button>
                      </div>
                    )}
                  </ParchmentCard>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ===== TAB 2: ХАРАКТЕРИСТИКИ ===== */}
        <TabsContent value="characteristics" className="mt-6 space-y-6">
          <ParchmentCard className="space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-[family-name:var(--font-cinzel)] text-lg parchment-heading">Черты, идеалы и мотивы</h3>
              {editing ? (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => saveMut.mutate()} disabled={saveMut.isPending} className="btn-wine-solid h-9 px-3"><Save className="w-3.5 h-3.5 mr-1" /> Сохранить</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setForm(null); }} className="btn-parchment h-9 px-3"><X className="w-3.5 h-3.5 mr-1" /> Отмена</Button>
                </div>
              ) : (
                <Button size="sm" onClick={() => { setForm(char); setEditing(true); }} className="btn-parchment h-9 px-3"><Edit3 className="w-3.5 h-3.5 mr-1" /> Редактировать</Button>
              )}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <SectionField label="Черты характера" editing={editing} value={current.traits} onChange={(v) => setForm({ ...current, traits: v })} display={char.traits} placeholder="Что отличает героя? Привычки, манеры..." rows={4} />
              <SectionField label="Идеалы" editing={editing} value={current.ideals} onChange={(v) => setForm({ ...current, ideals: v })} display={char.ideals} placeholder="Во что герой верит свыше всего?" rows={4} />
              <SectionField label="Мотивы" editing={editing} value={current.motives} onChange={(v) => setForm({ ...current, motives: v })} display={char.motives} placeholder="Что движет героем вперёд?" rows={4} />
            </div>
          </ParchmentCard>

          <NotesSection characterId={char.id} notes={notes} />
        </TabsContent>

        {/* ===== TAB 3: СВЯЗИ И ОТНОШЕНИЯ ===== */}
        <TabsContent value="relations" className="mt-6">
          <RelationsSection characterId={char.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ===== helpers ===== */
function Field({ label, editing, value, onChange, display }: { label: string; editing: boolean; value: any; onChange: (v: string) => void; display: any }) {
  return (
    <div>
      <Label className="parchment-heading text-xs uppercase tracking-wider">{label}</Label>
      {editing ? (
        <Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} className="bg-parchment/60 border-parchment-dark/40 h-9" />
      ) : (
        <p className="parchment-text">{display ?? "—"}</p>
      )}
    </div>
  );
}

function SectionField({ label, editing, value, onChange, display, placeholder, rows = 3, dropCap }: {
  label: string; editing: boolean; value: any; onChange: (v: string) => void; display: any; placeholder?: string; rows?: number; dropCap?: boolean;
}) {
  return (
    <div>
      <Label className="parchment-heading text-sm">{label}</Label>
      {editing ? (
        <Textarea value={value ?? ""} onChange={(e) => onChange(e.target.value)} rows={rows} placeholder={placeholder} className="bg-parchment/60 border-parchment-dark/40 mt-1" />
      ) : display ? (
        <p className={`parchment-text mt-1 whitespace-pre-line ${dropCap ? "lore-prose drop-cap" : ""}`}>{display}</p>
      ) : (
        <p className="parchment-muted italic mt-1 text-sm">Не записано...</p>
      )}
    </div>
  );
}

/* ===== Notes section (journal) ===== */
function NotesSection({ characterId, notes }: { characterId: string; notes: any[] }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [draft, setDraft] = useState<{ title: string; content: string } | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  const createMut = useMutation({
    mutationFn: async (body: { title: string; content: string }) =>
      fetch("/api/notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId, ...body }) }).then((r) => r.json()),
    onSuccess: () => { setDraft(null); qc.invalidateQueries({ queryKey: ["me"] }); toast({ title: "Заметка записана" }); },
  });
  const updateMut = useMutation({
    mutationFn: async (body: { id: string; title: string; content: string }) =>
      fetch(`/api/notes/${body.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: body.title, content: body.content }) }).then((r) => r.json()),
    onSuccess: () => { setEditId(null); qc.invalidateQueries({ queryKey: ["me"] }); toast({ title: "Заметка обновлена" }); },
  });
  const delMut = useMutation({
    mutationFn: (id: string) => fetch(`/api/notes/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["me"] }); toast({ title: "Заметка стёрта" }); },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <OrnamentTitle size="md" flourish="📖">Журнал героя</OrnamentTitle>
        {!draft && (
          <Button size="sm" onClick={() => setDraft({ title: "", content: "" })} className="btn-parchment h-9 px-3">
            <Plus className="w-3.5 h-3.5 mr-1" /> Новая заметка
          </Button>
        )}
      </div>
      <p className="parchment-muted text-sm italic -mt-2">Здесь ты записываешь наблюдения и догадки — то, что важно сохранить между сессиями.</p>

      {draft && (
        <ParchmentCard className="space-y-2 border-t-2 border-gold/40">
          <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Заголовок (необязательно)" className="bg-parchment/60 border-parchment-dark/40" />
          <Textarea value={draft.content} onChange={(e) => setDraft({ ...draft, content: e.target.value })} rows={4} placeholder="Что ты хочешь запомнить?" className="bg-parchment/60 border-parchment-dark/40" />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => createMut.mutate(draft)} disabled={!draft.content.trim() || createMut.isPending} className="btn-wine-solid h-8 px-3"><Save className="w-3.5 h-3.5 mr-1" /> Записать</Button>
            <Button size="sm" variant="ghost" onClick={() => setDraft(null)} className="btn-parchment h-8 px-3"><X className="w-3.5 h-3.5 mr-1" /> Отмена</Button>
          </div>
        </ParchmentCard>
      )}

      <div className="grid gap-3">
        {notes.map((n) => (
          <ParchmentCard key={n.id} className="space-y-1">
            {editId === n.id ? (
              <NoteEditForm note={n} onSave={(body) => updateMut.mutate(body)} onCancel={() => setEditId(null)} pending={updateMut.isPending} />
            ) : (
              <>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {n.title && <h4 className="font-[family-name:var(--font-cinzel)] parchment-heading">{n.title}</h4>}
                    <p className="parchment-text text-sm whitespace-pre-line">{n.content}</p>
                    <p className="text-xs parchment-muted/60 italic mt-1">{new Date(n.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" onClick={() => setEditId(n.id)} className="text-wine hover:bg-wine/10 h-7 w-7"><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => { if (confirm("Стереть заметку?")) delMut.mutate(n.id); }} className="text-destructive hover:bg-destructive/10 h-7 w-7"><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
              </>
            )}
          </ParchmentCard>
        ))}
        {notes.length === 0 && !draft && (
          <ParchmentCard className="empty-portal">
            <BookOpen className="w-10 h-10 text-gold/40 mx-auto mb-2" />
            <p className="font-[family-name:var(--font-garamond)] italic text-lg">Журнал пуст.</p>
            <p className="text-sm mt-1 opacity-70">Нажми «Новая заметка», чтобы записать первое наблюдение.</p>
          </ParchmentCard>
        )}
      </div>
    </div>
  );
}

function NoteEditForm({ note, onSave, onCancel, pending }: { note: any; onSave: (b: any) => void; onCancel: () => void; pending: boolean }) {
  const [title, setTitle] = useState(note.title ?? "");
  const [content, setContent] = useState(note.content);
  return (
    <div className="space-y-2">
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Заголовок" className="bg-parchment/60 border-parchment-dark/40" />
      <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} className="bg-parchment/60 border-parchment-dark/40" />
      <div className="flex gap-2">
        <Button size="sm" onClick={() => onSave({ id: note.id, title, content })} disabled={pending || !content.trim()} className="btn-wine-solid h-8 px-3"><Save className="w-3.5 h-3.5 mr-1" /> Сохранить</Button>
        <Button size="sm" variant="ghost" onClick={onCancel} className="btn-parchment h-8 px-3"><X className="w-3.5 h-3.5 mr-1" /> Отмена</Button>
      </div>
    </div>
  );
}

/* ===== Relations section (связи и отношения) ===== */
function RelationsSection({ characterId }: { characterId: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: relations } = useQuery<any[]>({
    queryKey: ["relations", characterId],
    queryFn: () => fetch(`/api/relations?ownerId=${characterId}`).then((r) => r.json()),
  });
  const { data: personalities } = useQuery<any[]>({
    queryKey: ["personalities"],
    queryFn: () => fetch("/api/lore/personalities").then((r) => r.json()),
  });
  const { data: characters } = useQuery<any[]>({
    queryKey: ["characters"],
    queryFn: () => fetch("/api/characters").then((r) => r.json()),
  });
  const [adding, setAdding] = useState(false);

  const createMut = useMutation({
    mutationFn: async (body: any) => fetch("/api/relations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ownerId: characterId, ...body }) }).then((r) => r.json()),
    onSuccess: (res) => { if (res.error) { toast({ title: "Ошибка", description: res.error, variant: "destructive" }); return; } setAdding(false); qc.invalidateQueries({ queryKey: ["relations", characterId] }); toast({ title: "Связь записана" }); },
  });
  const delMut = useMutation({
    mutationFn: (id: string) => fetch(`/api/relations/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["relations", characterId] }); toast({ title: "Связь разорвана" }); },
  });

  const rels = relations ?? [];
  const npcRelations = rels.filter((r: any) => r.targetPersonalityId);
  const charRelations = rels.filter((r: any) => r.targetCharacterId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <OrnamentTitle size="md" flourish="🔗">Связи и отношения</OrnamentTitle>
        {!adding && (
          <Button size="sm" onClick={() => setAdding(true)} className="btn-parchment h-9 px-3">
            <Plus className="w-3.5 h-3.5 mr-1" /> Добавить связь
          </Button>
        )}
      </div>
      <p className="parchment-muted text-sm italic -mt-3">
        Здесь ты видишь всех, с кем встретился и кому прописал отношение — НПС и других персонажей.
      </p>

      {adding && (
        <ParchmentCard className="space-y-3 border-t-2 border-gold/40">
          <h4 className="font-[family-name:var(--font-cinzel)] parchment-heading">Новая связь</h4>
          <RelationForm
            personalities={personalities ?? []}
            characters={(characters ?? []).filter((c: any) => c.id !== characterId)}
            onSave={(body) => createMut.mutate(body)}
            onCancel={() => setAdding(false)}
            pending={createMut.isPending}
          />
        </ParchmentCard>
      )}

      {/* NPC relations */}
      <div className="space-y-3">
        <h4 className="font-[family-name:var(--font-cinzel)] text-lg parchment-heading flex items-center gap-2">
          <Users className="w-5 h-5 text-wine" /> Встреченные НПС ({npcRelations.length})
        </h4>
        {npcRelations.length === 0 ? (
          <ParchmentCard className="empty-portal">
            <p className="font-[family-name:var(--font-garamond)] italic">Список НПС пуст. Добавь связь с НПС, с которым встретился.</p>
          </ParchmentCard>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {npcRelations.map((r: any) => (
              <ParchmentCard key={r.id} className="flex items-start gap-3">
                <div className="w-14 h-14 rounded-lg overflow-hidden gold-frame shrink-0 bg-parchment-dark/20 flex items-center justify-center">
                  {r.targetPersonality?.portrait ? (
                    <img src={r.targetPersonality.portrait} alt={r.targetPersonality.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl">👤</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h5 className="font-[family-name:var(--font-cinzel)] parchment-heading truncate">{r.targetPersonality?.name}</h5>
                    <Badge variant="outline" className="border-wine/30 text-wine text-xs shrink-0">{r.relationLabel}</Badge>
                  </div>
                  {r.targetPersonality?.title && <p className="parchment-heading text-xs">{r.targetPersonality.title}</p>}
                  {r.description && <p className="parchment-muted text-sm mt-1">{r.description}</p>}
                </div>
                <Button size="icon" variant="ghost" onClick={() => delMut.mutate(r.id)} className="text-destructive hover:bg-destructive/10 h-7 w-7 shrink-0"><Trash2 className="w-3.5 h-3.5" /></Button>
              </ParchmentCard>
            ))}
          </div>
        )}
      </div>

      {/* Character relations */}
      <div className="space-y-3">
        <h4 className="font-[family-name:var(--font-cinzel)] text-lg parchment-heading flex items-center gap-2">
          <Heart className="w-5 h-5 text-wine" /> Отношения с персонажами ({charRelations.length})
        </h4>
        {charRelations.length === 0 ? (
          <ParchmentCard className="empty-portal">
            <p className="font-[family-name:var(--font-garamond)] italic">Пока нет связей с другими персонажами.</p>
          </ParchmentCard>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {charRelations.map((r: any) => (
              <ParchmentCard key={r.id} className="flex items-start gap-3">
                <div className="w-14 h-14 rounded-lg overflow-hidden gold-frame shrink-0 bg-parchment-dark/20 flex items-center justify-center">
                  {r.targetCharacter?.portrait ? (
                    <img src={r.targetCharacter.portrait} alt={r.targetCharacter.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl">⚔️</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h5 className="font-[family-name:var(--font-cinzel)] parchment-heading truncate">{r.targetCharacter?.name}</h5>
                    <Badge variant="outline" className="border-wine/30 text-wine text-xs shrink-0">{r.relationLabel}</Badge>
                  </div>
                  {r.description && <p className="parchment-muted text-sm mt-1">{r.description}</p>}
                </div>
                <Button size="icon" variant="ghost" onClick={() => delMut.mutate(r.id)} className="text-destructive hover:bg-destructive/10 h-7 w-7 shrink-0"><Trash2 className="w-3.5 h-3.5" /></Button>
              </ParchmentCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RelationForm({ personalities, characters, onSave, onCancel, pending }: {
  personalities: any[]; characters: any[]; onSave: (b: any) => void; onCancel: () => void; pending: boolean;
}) {
  const [targetType, setTargetType] = useState<"personality" | "character">("personality");
  const [targetId, setTargetId] = useState("");
  const [label, setLabel] = useState("Знакомый");
  const [description, setDescription] = useState("");
  const labels = ["Знакомый", "Друг", "Союзник", "Родственник", "Любим", "Враг", "Ненависть", "Наставник", "Ученик", "Соперник"];

  return (
    <div className="space-y-3">
      <div>
        <Label className="parchment-heading text-sm">К кому отношение</Label>
        <div className="grid grid-cols-2 gap-2 mt-1">
          <button type="button" onClick={() => { setTargetType("personality"); setTargetId(""); }} className={`px-3 py-2 rounded border text-sm font-[family-name:var(--font-cinzel)] ${targetType === "personality" ? "border-gold/40 bg-gold/10 text-gold" : "border-parchment-dark/30 text-parchment-muted"}`}>НПС (личность)</button>
          <button type="button" onClick={() => { setTargetType("character"); setTargetId(""); }} className={`px-3 py-2 rounded border text-sm font-[family-name:var(--font-cinzel)] ${targetType === "character" ? "border-gold/40 bg-gold/10 text-gold" : "border-parchment-dark/30 text-parchment-muted"}`}>Другой персонаж</button>
        </div>
      </div>
      <div>
        <Label className="parchment-heading text-sm">Выбери {targetType === "personality" ? "НПС" : "персонажа"}</Label>
        <select value={targetId} onChange={(e) => setTargetId(e.target.value)} className="w-full mt-1 px-3 py-2 rounded border border-parchment-dark/40 bg-parchment/60 parchment-text h-9">
          <option value="">— выбери —</option>
          {targetType === "personality"
            ? personalities.map((p) => <option key={p.id} value={p.id}>{p.name}{p.title ? ` — ${p.title}` : ""}</option>)
            : characters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div>
        <Label className="parchment-heading text-sm">Тип отношения</Label>
        <select value={label} onChange={(e) => setLabel(e.target.value)} className="w-full mt-1 px-3 py-2 rounded border border-parchment-dark/40 bg-parchment/60 parchment-text h-9">
          {labels.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>
      <div>
        <Label className="parchment-heading text-sm">Описание (необязательно)</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Как твой герой относится к этому персонажу?" className="bg-parchment/60 border-parchment-dark/40 mt-1" />
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => onSave({ [targetType === "personality" ? "targetPersonalityId" : "targetCharacterId"]: targetId, relationLabel: label, description: description || undefined })} disabled={!targetId || pending} className="btn-wine-solid h-9 px-3"><Save className="w-3.5 h-3.5 mr-1" /> Записать</Button>
        <Button size="sm" variant="ghost" onClick={onCancel} className="btn-parchment h-9 px-3"><X className="w-3.5 h-3.5 mr-1" /> Отмена</Button>
      </div>
    </div>
  );
}
