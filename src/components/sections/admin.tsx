"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { OrnamentTitle } from "@/components/fantasy/ornament-title";
import { ParchmentCard, RuneSeal, RarityBadge, DifficultyBadge } from "@/components/fantasy/ui";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Crown, Lock, Unlock, Award, BookOpen, MapPin, Users, Sword, Sparkles, Scale, Sun, BookMarked, Link2, Trophy, Star, FlaskConical } from "lucide-react";

const ENTITIES = {
  countries: { label: "Страны", icon: MapPin, api: "/api/lore/countries", fields: ["name","description","emblem","capital","government","population","culture","climate"] },
  personalities: { label: "Личности", icon: Users, api: "/api/lore/personalities", fields: ["name","title","description","affiliation","role","status"] },
  relations: { label: "Отношения", icon: Link2, api: "/api/lore/relations", fields: ["countryAName","countryBName","relationType","description"] },
  systems: { label: "Мир. Система", icon: Scale, api: "/api/lore/systems", fields: ["title","category","description","icon"] },
  gods: { label: "Пантеон", icon: Sun, api: "/api/lore/gods", fields: ["name","title","domain","description","symbol","alignment","pantheon"] },
  legends: { label: "Легенды", icon: BookMarked, api: "/api/lore/legends", fields: ["title","content","era","icon"] },
} as const;

type EntityKey = keyof typeof ENTITIES;

export function AdminView() {
  const [tab, setTab] = useState("overview");
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-10 space-y-8">
      <div className="text-center space-y-2">
        <div className="flex justify-center">
          <RuneSeal icon={<Crown className="w-8 h-8 text-gold" />} size="lg" glow />
        </div>
        <OrnamentTitle size="lg" flourish="✦">
          Чертог Божества
        </OrnamentTitle>
        <p className="text-foreground/70 font-[family-name:var(--font-garamond)] italic max-w-2xl mx-auto">
          Здесь ты властвуешь над миром за гранью тьмы. Твори страны, изрекай легенды,
          раздавай достижения и приподнимай печати Гримуара для своих героев.
        </p>
        <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-md border border-gold/30 bg-gold/5 text-gold/80 text-xs font-[family-name:var(--font-cinzel)] tracking-wide animate-fade-rise">
          ✦ Всё, что видишь в этом мире, ты можешь изменить — добавляй, редактируй и удаляй записи во всех разделах ниже.
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <div className="flex justify-center overflow-x-auto pb-2">
          <TabsList className="bg-background/40 border border-gold/20 flex flex-wrap h-auto">
            <TabsTrigger value="overview" className="font-[family-name:var(--font-cinzel)] data-[state=active]:text-gold">Обзор</TabsTrigger>
            {(Object.keys(ENTITIES) as EntityKey[]).map((k) => {
              const E = ENTITIES[k];
              const Icon = E.icon;
              return (
                <TabsTrigger key={k} value={k} className="font-[family-name:var(--font-cinzel)] data-[state=active]:text-gold">
                  <Icon className="w-3.5 h-3.5 mr-1" /> {E.label}
                </TabsTrigger>
              );
            })}
            <TabsTrigger value="ranks" className="font-[family-name:var(--font-cinzel)] data-[state=active]:text-gold"><Trophy className="w-3.5 h-3.5 mr-1" /> Ранги</TabsTrigger>
            <TabsTrigger value="quests" className="font-[family-name:var(--font-cinzel)] data-[state=active]:text-gold"><Sword className="w-3.5 h-3.5 mr-1" /> Задания</TabsTrigger>
            <TabsTrigger value="grimoire" className="font-[family-name:var(--font-cinzel)] data-[state=active]:text-gold"><Sparkles className="w-3.5 h-3.5 mr-1" /> Гримуар</TabsTrigger>
            <TabsTrigger value="achievements" className="font-[family-name:var(--font-cinzel)] data-[state=active]:text-gold"><Award className="w-3.5 h-3.5 mr-1" /> Достижения</TabsTrigger>
            <TabsTrigger value="lab" className="font-[family-name:var(--font-cinzel)] data-[state=active]:text-gold"><FlaskConical className="w-3.5 h-3.5 mr-1" /> Лаборатория</TabsTrigger>
            <TabsTrigger value="characters" className="font-[family-name:var(--font-cinzel)] data-[state=active]:text-gold"><Users className="w-3.5 h-3.5 mr-1" /> Герои</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-6"><Overview /></TabsContent>
        {(Object.keys(ENTITIES) as EntityKey[]).map((k) => (
          <TabsContent key={k} value={k} className="mt-6">
            <EntityEditor entityKey={k} />
          </TabsContent>
        ))}
        <TabsContent value="ranks" className="mt-6"><RanksEditor /></TabsContent>
        <TabsContent value="quests" className="mt-6"><QuestsEditor /></TabsContent>
        <TabsContent value="grimoire" className="mt-6"><GrimoireEditor /></TabsContent>
        <TabsContent value="achievements" className="mt-6"><AchievementsEditor /></TabsContent>
        <TabsContent value="lab" className="mt-6"><LabEditor /></TabsContent>
        <TabsContent value="characters" className="mt-6"><CharactersEditor /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ===== OVERVIEW ===== */
function Overview() {
  const { data } = useQuery<any>({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const [c,p,r,s,g,l,ks,qs,gr,ach,ch] = await Promise.all([
        fetch("/api/lore/countries").then(r=>r.json()),
        fetch("/api/lore/personalities").then(r=>r.json()),
        fetch("/api/lore/relations").then(r=>r.json()),
        fetch("/api/lore/systems").then(r=>r.json()),
        fetch("/api/lore/gods").then(r=>r.json()),
        fetch("/api/lore/legends").then(r=>r.json()),
        fetch("/api/guild/ranks").then(r=>r.json()),
        fetch("/api/guild/quests").then(r=>r.json()),
        fetch("/api/grimoire").then(r=>r.json()),
        fetch("/api/achievements").then(r=>r.json()),
        fetch("/api/characters").then(r=>r.json()),
      ]);
      return {
        countries: c.length, personalities: p.length, relations: r.length,
        systems: s.length, gods: g.length, legends: l.length,
        ranks: ks.length, quests: qs.length, grimoire: gr.length,
        achievements: ach.length, characters: ch.length,
        grimoireUnlocked: gr.filter((x:any)=>x.unlocked).length,
      };
    },
  });
  const stats = [
    { label: "Страны", value: data?.countries, icon: MapPin },
    { label: "Личности", value: data?.personalities, icon: Users },
    { label: "Отношения", value: data?.relations, icon: Link2 },
    { label: "Мир. системы", value: data?.systems, icon: Scale },
    { label: "Боги", value: data?.gods, icon: Sun },
    { label: "Легенды", value: data?.legends, icon: BookMarked },
    { label: "Ранги", value: data?.ranks, icon: Trophy },
    { label: "Задания", value: data?.quests, icon: Sword },
    { label: "Гримуар", value: data?.grimoire ? `${data.grimoireUnlocked}/${data.grimoire}` : null, icon: Sparkles },
    { label: "Достижения", value: data?.achievements, icon: Award },
    { label: "Герои", value: data?.characters, icon: Users },
  ];
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <ParchmentCard key={s.label} className="flex items-center gap-3">
            <Icon className="w-8 h-8 text-gold" />
            <div>
              <p className="font-[family-name:var(--font-cinzel)] text-2xl parchment-heading">{s.value ?? "…"}</p>
              <p className="parchment-muted text-sm">{s.label}</p>
            </div>
          </ParchmentCard>
        );
      })}
    </div>
  );
}

/* ===== GENERIC ENTITY EDITOR ===== */
const FIELD_META: Record<string, { type: "text"|"textarea"|"select"; options?: string[]; label: string }> = {
  name: { type: "text", label: "Название" },
  title: { type: "text", label: "Титул" },
  description: { type: "textarea", label: "Описание" },
  emblem: { type: "text", label: "Символ (эмодзи)" },
  capital: { type: "text", label: "Столица" },
  government: { type: "text", label: "Правление" },
  population: { type: "text", label: "Население" },
  culture: { type: "textarea", label: "Культура" },
  climate: { type: "textarea", label: "Климат" },
  affiliation: { type: "text", label: "Принадлежность" },
  role: { type: "text", label: "Должность" },
  status: { type: "select", label: "Статус", options: ["alive","deceased","missing"] },
  countryAName: { type: "text", label: "Страна A" },
  countryBName: { type: "text", label: "Страна B" },
  relationType: { type: "select", label: "Тип связи", options: ["ally","enemy","neutral","trade","vassal"] },
  category: { type: "select", label: "Категория", options: ["POLITICS","ECONOMY","MILITARY","MAGIC","RELIGION","LAW"] },
  domain: { type: "text", label: "Домен" },
  symbol: { type: "text", label: "Символ (эмодзи)" },
  alignment: { type: "select", label: "Мировоззрение", options: ["good","neutral","evil"] },
  pantheon: { type: "text", label: "Пантеон" },
  content: { type: "textarea", label: "Текст" },
  era: { type: "text", label: "Эра" },
  icon: { type: "text", label: "Иконка (эмодзи)" },
};

function EntityEditor({ entityKey }: { entityKey: EntityKey }) {
  const meta = ENTITIES[entityKey];
  const { data, isLoading } = useQuery<any[]>({
    queryKey: [entityKey],
    queryFn: () => fetch(meta.api).then((r) => r.json()),
  });
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState<any | null>(null);
  const [open, setOpen] = useState(false);

  const saveMut = useMutation({
    mutationFn: async (item: any) => {
      const { id, ...rest } = item;
      if (id) {
        return fetch(`${meta.api}/${id}`, { method: "PUT", headers: {"Content-Type":"application/json"}, body: JSON.stringify(rest) }).then(r=>r.json());
      }
      return fetch(meta.api, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(rest) }).then(r=>r.json());
    },
    onSuccess: () => {
      toast({ title: "Свиток переписан", description: "Изменения внесены в летопись." });
      setOpen(false);
      qc.invalidateQueries({ queryKey: [entityKey] });
    },
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => fetch(`${meta.api}/${id}`, { method: "DELETE" }).then(r=>r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [entityKey] }); toast({ title: "Удалено из летописи" }); },
  });

  const items = data ?? [];
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-[family-name:var(--font-cinzel)] text-lg text-gold">{meta.label}</h3>
        <Button onClick={() => { setEditing({}); setOpen(true); }} className="btn-rune bg-primary hover:bg-primary/90 text-primary-foreground">
          <Plus className="w-4 h-4 mr-1" /> Создать
        </Button>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {items.map((it) => (
          <ParchmentCard key={it.id} className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h4 className="font-[family-name:var(--font-cinzel)] parchment-heading truncate">
                {it.emblem || it.symbol || it.icon ? <span className="mr-1">{it.emblem ?? it.symbol ?? it.icon}</span> : null}
                {it.name ?? it.title}
              </h4>
              <p className="parchment-muted text-sm line-clamp-2">{it.description ?? it.content}</p>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button size="icon" variant="ghost" onClick={() => { setEditing(it); setOpen(true); }} className="text-wine hover:bg-wine/10">
                <Pencil className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => delMut.mutate(it.id)} className="text-destructive hover:bg-destructive/10">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </ParchmentCard>
        ))}
        {items.length === 0 && <p className="col-span-full text-center parchment-muted italic py-8">Пока пусто.</p>}
      </div>

      <EntityFormDialog
        open={open}
        onOpenChange={setOpen}
        fields={meta.fields}
        item={editing}
        onSave={(item) => saveMut.mutate(item)}
        pending={saveMut.isPending}
        title={editing?.id ? "Редактировать" : "Создать"}
      />
    </div>
  );
}

function EntityFormDialog({
  open, onOpenChange, fields, item, onSave, pending, title,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  fields: readonly string[];
  item: any;
  onSave: (item: any) => void;
  pending: boolean;
  title: string;
}) {
  const [form, setForm] = useState<any>(item ?? {});
  // reset form when item changes
  if (item && form && item.id !== form.id && Object.keys(form).length > 0 && item.id) {
    // handle in effect-like way
  }
  const current = item ?? {};
  const getVal = (f: string) => (form[f] !== undefined ? form[f] : current[f] ?? "");
  const setVal = (f: string, v: any) => setForm({ ...form, [f]: v });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="parchment gold-frame max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-[family-name:var(--font-cinzel)] text-xl parchment-heading">{title}</DialogTitle>
          <DialogDescription className="parchment-muted">Внеси изменения в свиток</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {fields.map((f) => {
            const meta = FIELD_META[f];
            if (!meta) return null;
            return (
              <div key={f} className="space-y-1">
                <Label className="parchment-heading text-sm">{meta.label}</Label>
                {meta.type === "textarea" ? (
                  <Textarea value={getVal(f)} onChange={(e) => setVal(f, e.target.value)} rows={3} className="bg-parchment/60 border-parchment-dark/40" />
                ) : meta.type === "select" ? (
                  <Select value={getVal(f)} onValueChange={(v) => setVal(f, v)}>
                    <SelectTrigger className="bg-parchment/60 border-parchment-dark/40"><SelectValue placeholder="Выбери..." /></SelectTrigger>
                    <SelectContent className="parchment">
                      {meta.options!.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={getVal(f)} onChange={(e) => setVal(f, e.target.value)} className="bg-parchment/60 border-parchment-dark/40" />
                )}
              </div>
            );
          })}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="parchment-muted">Отмена</Button>
          <Button onClick={() => onSave({ ...current, ...form })} disabled={pending} className="bg-primary text-primary-foreground btn-rune">
            {pending ? "Пишем..." : "Сохранить"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ===== RANKS EDITOR ===== */
function RanksEditor() {
  const { data, isLoading } = useQuery<any[]>({ queryKey: ["ranks"], queryFn: () => fetch("/api/guild/ranks").then(r=>r.json()) });
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const save = useMutation({
    mutationFn: async (item: any) => {
      const { id, ...rest } = item;
      rest.level = Number(rest.level);
      rest.minXp = Number(rest.minXp);
      if (id) return fetch(`/api/guild/ranks/${id}`, { method: "PUT", headers:{"Content-Type":"application/json"}, body: JSON.stringify(rest) }).then(r=>r.json());
      return fetch("/api/guild/ranks", { method: "POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(rest) }).then(r=>r.json());
    },
    onSuccess: () => { setOpen(false); qc.invalidateQueries({queryKey:["ranks"]}); toast({title:"Ранг обновлён"}); },
  });
  const del = useMutation({ mutationFn: (id:string)=>fetch(`/api/guild/ranks/${id}`,{method:"DELETE"}).then(r=>r.json()), onSuccess:()=>{qc.invalidateQueries({queryKey:["ranks"]});toast({title:"Ранг удалён"});} });
  const ranks = (data ?? []).sort((a,b)=>a.level-b.level);
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-[family-name:var(--font-cinzel)] text-lg text-gold">Ранги гильдии</h3>
        <Button onClick={()=>{setEditing({});setOpen(true);}} className="btn-rune bg-primary text-primary-foreground"><Plus className="w-4 h-4 mr-1"/> Создать</Button>
      </div>
      <div className="space-y-2">
        {ranks.map((r)=>(
          <ParchmentCard key={r.id} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{r.icon ?? "🏅"}</span>
              <div>
                <p className="font-[family-name:var(--font-cinzel)] parchment-heading">{r.name} <span className="text-gold/50 text-sm">(Ур. {r.level})</span></p>
                <p className="parchment-muted text-sm">{r.description ?? ""} · {r.minXp} XP</p>
              </div>
            </div>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" onClick={()=>{setEditing(r);setOpen(true);}} className="text-wine"><Pencil className="w-4 h-4"/></Button>
              <Button size="icon" variant="ghost" onClick={()=>del.mutate(r.id)} className="text-destructive"><Trash2 className="w-4 h-4"/></Button>
            </div>
          </ParchmentCard>
        ))}
      </div>
      <EntityFormDialog open={open} onOpenChange={setOpen} fields={["name","level","description","icon","minXp"]} item={editing}
        onSave={(it)=>save.mutate(it)} pending={save.isPending} title={editing?.id?"Редактировать ранг":"Создать ранг"} />
    </div>
  );
}

/* ===== QUESTS EDITOR ===== */
function QuestsEditor() {
  const { data } = useQuery<any[]>({ queryKey: ["quests"], queryFn: () => fetch("/api/guild/quests").then(r=>r.json()) });
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const save = useMutation({
    mutationFn: async (item:any) => {
      const { id, ...rest } = item;
      if (id) return fetch(`/api/guild/quests/${id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(rest)}).then(r=>r.json());
      return fetch("/api/guild/quests",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:"OPEN",...rest})}).then(r=>r.json());
    },
    onSuccess:()=>{setOpen(false);qc.invalidateQueries({queryKey:["quests"]});toast({title:"Задание сохранено"});},
  });
  const del = useMutation({ mutationFn:(id:string)=>fetch(`/api/guild/quests/${id}`,{method:"DELETE"}).then(r=>r.json()), onSuccess:()=>{qc.invalidateQueries({queryKey:["quests"]});toast({title:"Задание удалено"});} });
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-[family-name:var(--font-cinzel)] text-lg text-gold">Задания гильдии</h3>
        <Button onClick={()=>{setEditing({});setOpen(true);}} className="btn-rune bg-primary text-primary-foreground"><Plus className="w-4 h-4 mr-1"/> Создать</Button>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {(data ?? []).map((q)=>(
          <ParchmentCard key={q.id} className="space-y-1">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-[family-name:var(--font-cinzel)] parchment-heading">{q.title}</h4>
              <DifficultyBadge difficulty={q.difficulty} />
            </div>
            <p className="parchment-muted text-sm line-clamp-2">{q.description}</p>
            <div className="flex justify-between items-center pt-2">
              <span className="text-xs parchment-muted">{q.status}</span>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={()=>{setEditing(q);setOpen(true);}} className="text-wine"><Pencil className="w-4 h-4"/></Button>
                <Button size="icon" variant="ghost" onClick={()=>del.mutate(q.id)} className="text-destructive"><Trash2 className="w-4 h-4"/></Button>
              </div>
            </div>
          </ParchmentCard>
        ))}
      </div>
      <QuestFormDialog open={open} onOpenChange={setOpen} item={editing} onSave={(it)=>save.mutate(it)} pending={save.isPending} />
    </div>
  );
}

function QuestFormDialog({ open,onOpenChange,item,onSave,pending }:{open:boolean;onOpenChange:(v:boolean)=>void;item:any;onSave:(i:any)=>void;pending:boolean}) {
  const current = item ?? {};
  const [form, setForm] = useState<any>({});
  const getVal = (f:string) => (form[f] !== undefined ? form[f] : current[f] ?? "");
  const setVal = (f:string,v:any) => setForm({...form,[f]:v});
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="parchment gold-frame max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-[family-name:var(--font-cinzel)] text-xl parchment-heading">{item?.id?"Редактировать":"Создать"} задание</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label className="parchment-heading text-sm">Название</Label><Input value={getVal("title")} onChange={e=>setVal("title",e.target.value)} className="bg-parchment/60 border-parchment-dark/40"/></div>
          <div><Label className="parchment-heading text-sm">Описание</Label><Textarea value={getVal("description")} onChange={e=>setVal("description",e.target.value)} rows={3} className="bg-parchment/60 border-parchment-dark/40"/></div>
          <div><Label className="parchment-heading text-sm">Сложность</Label>
            <Select value={getVal("difficulty")} onValueChange={v=>setVal("difficulty",v)}>
              <SelectTrigger className="bg-parchment/60 border-parchment-dark/40"><SelectValue/></SelectTrigger>
              <SelectContent className="parchment">{["TRIVIAL","EASY","MEDIUM","HARD","DEADLY"].map(o=><SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label className="parchment-heading text-sm">Локация</Label><Input value={getVal("location")??""} onChange={e=>setVal("location",e.target.value)} className="bg-parchment/60 border-parchment-dark/40"/></div>
          <div><Label className="parchment-heading text-sm">Награда</Label><Input value={getVal("reward")??""} onChange={e=>setVal("reward",e.target.value)} className="bg-parchment/60 border-parchment-dark/40"/></div>
          {item?.id && <div><Label className="parchment-heading text-sm">Статус</Label>
            <Select value={getVal("status")} onValueChange={v=>setVal("status",v)}>
              <SelectTrigger className="bg-parchment/60 border-parchment-dark/40"><SelectValue/></SelectTrigger>
              <SelectContent className="parchment">{["OPEN","ASSIGNED","COMPLETED","FAILED"].map(o=><SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
            </Select>
          </div>}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={()=>onOpenChange(false)} className="parchment-muted">Отмена</Button>
          <Button onClick={()=>onSave({...current,...form})} disabled={pending} className="bg-primary text-primary-foreground btn-rune">{pending?"Пишем...":"Сохранить"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ===== GRIMOIRE EDITOR ===== */
function GrimoireEditor() {
  const { data } = useQuery<any[]>({ queryKey:["grimoire"], queryFn:()=>fetch("/api/grimoire").then(r=>r.json()) });
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const save = useMutation({
    mutationFn: async (item:any) => {
      const { id, ...rest } = item;
      if (id) return fetch(`/api/grimoire/${id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(rest)}).then(r=>r.json());
      return fetch("/api/grimoire",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({order:0,...rest})}).then(r=>r.json());
    },
    onSuccess:()=>{setOpen(false);qc.invalidateQueries({queryKey:["grimoire"]});toast({title:"Глава переписана"});},
  });
  const del = useMutation({ mutationFn:(id:string)=>fetch(`/api/grimoire/${id}`,{method:"DELETE"}).then(r=>r.json()), onSuccess:()=>{qc.invalidateQueries({queryKey:["grimoire"]});toast({title:"Глава стёрта"});} });
  const unlock = useMutation({ mutationFn:(id:string)=>fetch(`/api/grimoire/${id}/unlock`,{method:"POST"}).then(r=>r.json()), onSuccess:()=>{qc.invalidateQueries({queryKey:["grimoire"]});} });
  const items = (data ?? []).sort((a,b)=>a.order-b.order);
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-[family-name:var(--font-cinzel)] text-lg text-gold">Главы Гримуара</h3>
        <Button onClick={()=>{setEditing({});setOpen(true);}} className="btn-rune bg-primary text-primary-foreground"><Plus className="w-4 h-4 mr-1"/> Создать</Button>
      </div>
      <div className="space-y-2">
        {items.map((g)=>(
          <ParchmentCard key={g.id} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {g.unlocked ? <Unlock className="w-5 h-5 text-gold shrink-0"/> : <Lock className="w-5 h-5 text-foreground/50 shrink-0"/>}
              <div className="min-w-0">
                <p className="font-[family-name:var(--font-cinzel)] parchment-heading truncate">
                  {g.unlocked ? g.title : (g.encodedTitle || "◈ Запечатанная глава ◈")}
                </p>
                <p className="parchment-muted text-xs">{g.category} · {g.unlocked?"открыто":"запечатано"}</p>
              </div>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button size="icon" variant="ghost" onClick={()=>unlock.mutate(g.id)} className={g.unlocked?"text-wine":"text-gold"} title={g.unlocked?"Наложить печать":"Снять печать"}>
                {g.unlocked?<Lock className="w-4 h-4"/>:<Unlock className="w-4 h-4"/>}
              </Button>
              <Button size="icon" variant="ghost" onClick={()=>{setEditing(g);setOpen(true);}} className="text-wine"><Pencil className="w-4 h-4"/></Button>
              <Button size="icon" variant="ghost" onClick={()=>del.mutate(g.id)} className="text-destructive"><Trash2 className="w-4 h-4"/></Button>
            </div>
          </ParchmentCard>
        ))}
      </div>
      <GrimoireFormDialog open={open} onOpenChange={setOpen} item={editing} onSave={(it)=>save.mutate(it)} pending={save.isPending} />
    </div>
  );
}

function GrimoireFormDialog({ open,onOpenChange,item,onSave,pending }:{open:boolean;onOpenChange:(v:boolean)=>void;item:any;onSave:(i:any)=>void;pending:boolean}) {
  const current = item ?? {};
  const [form, setForm] = useState<any>({});
  const getVal = (f:string) => (form[f] !== undefined ? form[f] : current[f] ?? "");
  const setVal = (f:string,v:any) => setForm({...form,[f]:v});
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="parchment gold-frame max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-[family-name:var(--font-cinzel)] text-xl parchment-heading">{item?.id?"Редактировать":"Создать"} главу</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label className="parchment-heading text-sm">Истинное название главы (видно когда открыто)</Label><Input value={getVal("title")} onChange={e=>setVal("title",e.target.value)} className="bg-parchment/60 border-parchment-dark/40"/></div>
          <div><Label className="parchment-heading text-sm">Зашифрованное название (видно когда запечатано)</Label><Input value={getVal("encodedTitle") ?? ""} onChange={e=>setVal("encodedTitle",e.target.value)} placeholder="напр. ◈ Гл. III — Драконьи Шёпоты ◈" className="bg-parchment/60 border-parchment-dark/40"/></div>
          <div><Label className="parchment-heading text-sm">Категория</Label>
            <Select value={getVal("category")} onValueChange={v=>setVal("category",v)}>
              <SelectTrigger className="bg-parchment/60 border-parchment-dark/40"><SelectValue/></SelectTrigger>
              <SelectContent className="parchment">{["SECRETS","RITUALS","PROPHECY","HISTORY","BEASTIARY"].map(o=><SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label className="parchment-heading text-sm">Зашифрованный текст (виден когда запечатано)</Label><Textarea value={getVal("encodedContent")} onChange={e=>setVal("encodedContent",e.target.value)} rows={3} className="bg-parchment/60 border-parchment-dark/40"/></div>
          <div><Label className="parchment-heading text-sm">Истинный текст (виден когда открыто)</Label><Textarea value={getVal("realContent")} onChange={e=>setVal("realContent",e.target.value)} rows={4} className="bg-parchment/60 border-parchment-dark/40"/></div>
          <div><Label className="parchment-heading text-sm">Подсказка для разблокировки</Label><Input value={getVal("unlockHint")??""} onChange={e=>setVal("unlockHint",e.target.value)} className="bg-parchment/60 border-parchment-dark/40"/></div>
          <div><Label className="parchment-heading text-sm">Порядок</Label><Input type="number" value={getVal("order")??0} onChange={e=>setVal("order",Number(e.target.value))} className="bg-parchment/60 border-parchment-dark/40"/></div>
          {item?.id && <div className="flex items-center gap-2"><input type="checkbox" id="unl" checked={!!getVal("unlocked")} onChange={e=>setVal("unlocked",e.target.checked)} /><Label htmlFor="unl" className="parchment-heading text-sm">Открыто</Label></div>}
          <div className="pt-3 border-t border-parchment-dark/30">
            <p className="parchment-heading text-sm mb-2">⚗ Условие авто-снятия печати</p>
            <div className="grid grid-cols-2 gap-2">
              <Select value={getVal("conditionType") || "MANUAL"} onValueChange={(v) => setVal("conditionType", v === "MANUAL" ? null : v)}>
                <SelectTrigger className="bg-parchment/60 border-parchment-dark/40"><SelectValue/></SelectTrigger>
                <SelectContent className="parchment">
                  <SelectItem value="MANUAL">Вручную</SelectItem>
                  <SelectItem value="QUEST_COMPLETED">Задание завершено</SelectItem>
                  <SelectItem value="QUEST_COUNT">Число заданий</SelectItem>
                  <SelectItem value="XP_THRESHOLD">Порог опыта</SelectItem>
                  <SelectItem value="RANK_REACHED">Достигнут ранг</SelectItem>
                  <SelectItem value="ACHIEVEMENT_EARNED">Получено достижение</SelectItem>
                </SelectContent>
              </Select>
              <Input value={getVal("conditionValue")??""} onChange={e=>setVal("conditionValue",e.target.value)} placeholder="значение (ID/число)" className="bg-parchment/60 border-parchment-dark/40" disabled={!getVal("conditionType")||getVal("conditionType")==="MANUAL"}/>
            </div>
            <p className="parchment-muted text-xs mt-1 italic">При исполнении условия печать снимется автоматически для всех героев.</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={()=>onOpenChange(false)} className="parchment-muted">Отмена</Button>
          <Button onClick={()=>onSave({...current,...form})} disabled={pending} className="bg-primary text-primary-foreground btn-rune">{pending?"Пишем...":"Сохранить"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ===== ACHIEVEMENTS EDITOR ===== */
function AchievementsEditor() {
  const { data: achs } = useQuery<any[]>({ queryKey:["achievements"], queryFn:()=>fetch("/api/achievements").then(r=>r.json()) });
  const { data: chars } = useQuery<any[]>({ queryKey:["characters"], queryFn:()=>fetch("/api/characters").then(r=>r.json()) });
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [grant, setGrant] = useState<{achId:string;charId:string}|null>(null);

  const save = useMutation({
    mutationFn: async (item:any) => {
      const { id, ...rest } = item;
      if (id) return fetch(`/api/achievements/${id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(rest)}).then(r=>r.json());
      return fetch("/api/achievements",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(rest)}).then(r=>r.json());
    },
    onSuccess:()=>{setOpen(false);qc.invalidateQueries({queryKey:["achievements"]});toast({title:"Достижение сохранено"});},
  });
  const del = useMutation({ mutationFn:(id:string)=>fetch(`/api/achievements/${id}`,{method:"DELETE"}).then(r=>r.json()), onSuccess:()=>{qc.invalidateQueries({queryKey:["achievements"]});toast({title:"Достижение удалено"});} });
  const grantMut = useMutation({
    mutationFn: async ({achId,charId,action}:{achId:string;charId:string;action:"grant"|"revoke"}) =>
      fetch("/api/achievements/grant",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({achievementId:achId,characterId:charId,action})}).then(r=>r.json()),
    onSuccess:()=>{setGrant(null);qc.invalidateQueries({queryKey:["characters"]});qc.invalidateQueries({queryKey:["me"]});toast({title:"Деяние даровано"});},
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-[family-name:var(--font-cinzel)] text-lg text-gold">Достижения</h3>
        <Button onClick={()=>{setEditing({});setOpen(true);}} className="btn-rune bg-primary text-primary-foreground"><Plus className="w-4 h-4 mr-1"/> Создать</Button>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {(achs ?? []).map((a)=>(
          <ParchmentCard key={a.id} className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{a.icon ?? "🏅"}</span>
                <div>
                  <h4 className="font-[family-name:var(--font-cinzel)] parchment-heading">{a.name}</h4>
                  <RarityBadge rarity={a.rarity}/>
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={()=>{setEditing(a);setOpen(true);}} className="text-wine"><Pencil className="w-4 h-4"/></Button>
                <Button size="icon" variant="ghost" onClick={()=>del.mutate(a.id)} className="text-destructive"><Trash2 className="w-4 h-4"/></Button>
              </div>
            </div>
            <p className="parchment-muted text-sm">{a.description}</p>
            <Button size="sm" variant="outline" onClick={()=>setGrant({achId:a.id,charId:chars?.[0]?.id ?? ""})} className="border-gold/30 text-gold hover:bg-gold/10 btn-rune w-full">
              <Award className="w-3.5 h-3.5 mr-1"/> Даровать герою
            </Button>
          </ParchmentCard>
        ))}
      </div>

      <AchFormDialog open={open} onOpenChange={setOpen} item={editing} onSave={(it)=>save.mutate(it)} pending={save.isPending} />

      {/* Grant dialog */}
      <Dialog open={!!grant} onOpenChange={(v)=>!v && setGrant(null)}>
        <DialogContent className="parchment gold-frame max-w-sm">
          <DialogHeader><DialogTitle className="font-[family-name:var(--font-cinzel)] parchment-heading">Даровать достижение</DialogTitle></DialogHeader>
          {grant && (
            <div className="space-y-3">
              <Select value={grant.charId} onValueChange={(v)=>setGrant({...grant,charId:v})}>
                <SelectTrigger className="bg-parchment/60 border-parchment-dark/40"><SelectValue placeholder="Герой..."/></SelectTrigger>
                <SelectContent className="parchment">
                  {(chars ?? []).map((c)=>(<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                </SelectContent>
              </Select>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={()=>setGrant(null)} className="parchment-muted">Отмена</Button>
                <Button onClick={()=>grantMut.mutate({achId:grant.achId,charId:grant.charId,action:"grant"})} disabled={grantMut.isPending||!grant.charId} className="bg-primary text-primary-foreground btn-rune">Даровать</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AchFormDialog({ open,onOpenChange,item,onSave,pending }:{open:boolean;onOpenChange:(v:boolean)=>void;item:any;onSave:(i:any)=>void;pending:boolean}) {
  const current = item ?? {};
  const [form, setForm] = useState<any>({});
  const getVal = (f:string) => (form[f] !== undefined ? form[f] : current[f] ?? "");
  const setVal = (f:string,v:any) => setForm({...form,[f]:v});
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="parchment gold-frame max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-[family-name:var(--font-cinzel)] text-xl parchment-heading">{item?.id?"Редактировать":"Создать"} достижение</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label className="parchment-heading text-sm">Название</Label><Input value={getVal("name")} onChange={e=>setVal("name",e.target.value)} className="bg-parchment/60 border-parchment-dark/40"/></div>
          <div><Label className="parchment-heading text-sm">Описание</Label><Textarea value={getVal("description")} onChange={e=>setVal("description",e.target.value)} rows={2} className="bg-parchment/60 border-parchment-dark/40"/></div>
          <div><Label className="parchment-heading text-sm">Иконка (эмодзи)</Label><Input value={getVal("icon")??""} onChange={e=>setVal("icon",e.target.value)} className="bg-parchment/60 border-parchment-dark/40"/></div>
          <div><Label className="parchment-heading text-sm">Редкость</Label>
            <Select value={getVal("rarity")??"COMMON"} onValueChange={v=>setVal("rarity",v)}>
              <SelectTrigger className="bg-parchment/60 border-parchment-dark/40"><SelectValue/></SelectTrigger>
              <SelectContent className="parchment">{["COMMON","RARE","EPIC","LEGENDARY","MYTHIC"].map(o=><SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label className="parchment-heading text-sm">Категория</Label><Input value={getVal("category")??""} onChange={e=>setVal("category",e.target.value)} className="bg-parchment/60 border-parchment-dark/40"/></div>
          <div className="pt-3 border-t border-parchment-dark/30">
            <p className="parchment-heading text-sm mb-2">⚗ Условие авто-выдачи</p>
            <div className="grid grid-cols-2 gap-2">
              <Select value={getVal("conditionType") || "MANUAL"} onValueChange={(v) => setVal("conditionType", v === "MANUAL" ? null : v)}>
                <SelectTrigger className="bg-parchment/60 border-parchment-dark/40"><SelectValue/></SelectTrigger>
                <SelectContent className="parchment">
                  <SelectItem value="MANUAL">Вручную</SelectItem>
                  <SelectItem value="QUEST_COMPLETED">Задание завершено</SelectItem>
                  <SelectItem value="QUEST_COUNT">Число заданий</SelectItem>
                  <SelectItem value="XP_THRESHOLD">Порог опыта</SelectItem>
                  <SelectItem value="RANK_REACHED">Достигнут ранг</SelectItem>
                </SelectContent>
              </Select>
              <Input value={getVal("conditionValue") || ""} onChange={(e) => setVal("conditionValue", e.target.value)} placeholder="значение (ID/число)" className="bg-parchment/60 border-parchment-dark/40" disabled={!getVal("conditionType") || getVal("conditionType") === "MANUAL"} />
            </div>
            <p className="parchment-muted text-xs mt-1 italic">Достижение вручится само, когда условие исполнится.</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={()=>onOpenChange(false)} className="parchment-muted">Отмена</Button>
          <Button onClick={()=>onSave({...current,...form})} disabled={pending} className="bg-primary text-primary-foreground btn-rune">{pending?"Пишем...":"Сохранить"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ===== CHARACTERS EDITOR ===== */
function CharactersEditor() {
  const { data } = useQuery<any[]>({ queryKey:["characters"], queryFn:()=>fetch("/api/characters").then(r=>r.json()) });
  const { data: ranks } = useQuery<any[]>({ queryKey:["ranks"], queryFn:()=>fetch("/api/guild/ranks").then(r=>r.json()) });
  const { data: achs } = useQuery<any[]>({ queryKey:["achievements"], queryFn:()=>fetch("/api/achievements").then(r=>r.json()) });
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState<any>(null);

  const update = useMutation({
    mutationFn: async (item:any) => fetch("/api/characters",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:item.id,xp:Number(item.xp),level:Number(item.level),guildRankId:item.guildRankId})}).then(r=>r.json()),
    onSuccess:()=>{setEditing(null);qc.invalidateQueries({queryKey:["characters"]});qc.invalidateQueries({queryKey:["me"]});toast({title:"Герой обновлён"});},
  });
  const grant = useMutation({
    mutationFn: async ({achId,charId,action}:{achId:string;charId:string;action:"grant"|"revoke"})=>
      fetch("/api/achievements/grant",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({achievementId:achId,characterId:charId,action})}).then(r=>r.json()),
    onSuccess:()=>{qc.invalidateQueries({queryKey:["characters"]});toast({title:"Готово"});},
  });

  return (
    <div className="space-y-4">
      <h3 className="font-[family-name:var(--font-cinzel)] text-lg text-gold">Управление героями</h3>
      <div className="grid md:grid-cols-2 gap-4">
        {(data ?? []).map((c)=>(
          <ParchmentCard key={c.id} className="space-y-3">
            <div className="flex items-center gap-3">
              <RuneSeal icon={<span className="text-xl">{c.guildRank?.icon ?? "🛡️"}</span>} size="sm"/>
              <div className="flex-1">
                <h4 className="font-[family-name:var(--font-cinzel)] parchment-heading">{c.name}</h4>
                <p className="parchment-muted text-xs">{c.race ?? "—"} · {c.charClass ?? "—"} · Ур.{c.level} · {c.xp} XP · {c.guildRank?.name ?? "Без ранга"}</p>
              </div>
            </div>
            {editing?.id === c.id ? (
              <div className="space-y-2 pt-2 border-t border-parchment-dark/20">
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="parchment-heading text-xs">Опыт</Label><Input type="number" value={editing.xp} onChange={e=>setEditing({...editing,xp:e.target.value})} className="bg-parchment/60 border-parchment-dark/40"/></div>
                  <div><Label className="parchment-heading text-xs">Уровень</Label><Input type="number" value={editing.level} onChange={e=>setEditing({...editing,level:e.target.value})} className="bg-parchment/60 border-parchment-dark/40"/></div>
                </div>
                <div><Label className="parchment-heading text-xs">Ранг</Label>
                  <Select value={editing.guildRankId ?? ""} onValueChange={v=>setEditing({...editing,guildRankId:v})}>
                    <SelectTrigger className="bg-parchment/60 border-parchment-dark/40"><SelectValue placeholder="Ранг..."/></SelectTrigger>
                    <SelectContent className="parchment">{(ranks ?? []).map(r=><SelectItem key={r.id} value={r.id}>{r.icon} {r.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={()=>update.mutate(editing)} disabled={update.isPending} className="bg-primary text-primary-foreground btn-rune">Сохранить</Button>
                  <Button size="sm" variant="ghost" onClick={()=>setEditing(null)} className="parchment-muted">Отмена</Button>
                </div>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={()=>setEditing(c)} className="border-wine/30 text-wine hover:bg-wine/10 btn-rune w-full"><Pencil className="w-3.5 h-3.5 mr-1"/>Изменить опыт/ранг</Button>
            )}

            {/* Achievements */}
            <div className="pt-2 border-t border-parchment-dark/20">
              <p className="parchment-heading text-xs uppercase tracking-wider mb-1.5">Достижения ({c.achievements?.length ?? 0})</p>
              <div className="flex flex-wrap gap-1.5">
                {(achs ?? []).map((a)=>{
                  const has = c.achievements?.some((ca:any)=>ca.achievementId===a.id);
                  return (
                    <button key={a.id} onClick={()=>grant.mutate({achId:a.id,charId:c.id,action:has?"revoke":"grant"})}
                      className={`text-lg px-1.5 py-0.5 rounded border transition-all ${has?"border-gold/40 bg-gold/10":"border-foreground/15 opacity-40 hover:opacity-80"}`}
                      title={a.name}>
                      {a.icon ?? "🏅"}
                    </button>
                  );
                })}
              </div>
            </div>
          </ParchmentCard>
        ))}
        {(data ?? []).length === 0 && <p className="col-span-full text-center parchment-muted italic py-8">Героев пока нет.</p>}
      </div>
    </div>
  );
}

/* ===== LAB EDITOR (Лаборатория Алого) ===== */
const LAB_KIND_LABEL: Record<string, string> = {
  RACE: "Раса", CLASS: "Класс", SUBCLASS: "Подкласс", SPELL: "Заклинание", ITEM: "Предмет",
};

function LabEditor() {
  const { data } = useQuery<any[]>({ queryKey: ["lab"], queryFn: () => fetch("/api/lab").then((r) => r.json()) });
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState<any>(null);
  const [open, setOpen] = useState(false);

  const save = useMutation({
    mutationFn: async (item: any) => {
      const { id, ...rest } = item;
      if (id) return fetch(`/api/lab/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(rest) }).then((r) => r.json());
      return fetch("/api/lab", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order: 0, kind: "RACE", ...rest }) }).then((r) => r.json());
    },
    onSuccess: () => { setOpen(false); qc.invalidateQueries({ queryKey: ["lab"] }); toast({ title: "Свиток Алого записан" }); },
  });
  const del = useMutation({ mutationFn: (id: string) => fetch(`/api/lab/${id}`, { method: "DELETE" }).then((r) => r.json()), onSuccess: () => { qc.invalidateQueries({ queryKey: ["lab"] }); toast({ title: "Свиток стёрт" }); } });

  const items = (data ?? []).sort((a, b) => (a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : a.order - b.order));

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-[family-name:var(--font-cinzel)] text-lg text-gold">Лаборатория Алого</h3>
        <Button onClick={() => { setEditing({}); setOpen(true); }} className="btn-rune bg-primary text-primary-foreground"><Plus className="w-4 h-4 mr-1" /> Создать</Button>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {items.map((e) => (
          <ParchmentCard key={e.id} className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="border-wine/30 text-wine text-[10px]">{LAB_KIND_LABEL[e.kind] ?? e.kind}</Badge>
                <span className="text-lg">{e.icon ?? "🜂"}</span>
                <h4 className="font-[family-name:var(--font-cinzel)] parchment-heading truncate">{e.name}</h4>
              </div>
              {e.subtitle && <p className="parchment-heading text-xs uppercase tracking-wider">{e.subtitle}</p>}
              <p className="parchment-muted text-sm line-clamp-2 mt-1">{e.description}</p>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button size="icon" variant="ghost" onClick={() => { setEditing(e); setOpen(true); }} className="text-wine"><Pencil className="w-4 h-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => del.mutate(e.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
            </div>
          </ParchmentCard>
        ))}
        {items.length === 0 && <p className="col-span-full text-center parchment-muted italic py-8">Свиток Алого пока пуст. Создай первую запись.</p>}
      </div>
      <LabFormDialog open={open} onOpenChange={setOpen} item={editing} onSave={(it) => save.mutate(it)} pending={save.isPending} />
    </div>
  );
}

function LabFormDialog({ open, onOpenChange, item, onSave, pending }: { open: boolean; onOpenChange: (v: boolean) => void; item: any; onSave: (i: any) => void; pending: boolean }) {
  const current = item ?? {};
  const [form, setForm] = useState<any>({});
  const getVal = (f: string) => (form[f] !== undefined ? form[f] : current[f] ?? "");
  const setVal = (f: string, v: any) => setForm({ ...form, [f]: v });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="parchment gold-frame max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-[family-name:var(--font-cinzel)] text-xl parchment-heading">{item?.id ? "Редактировать" : "Создать"} запись Лаборатории</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="parchment-heading text-sm">Тип</Label>
            <Select value={getVal("kind") || "RACE"} onValueChange={(v) => setVal("kind", v)}>
              <SelectTrigger className="bg-parchment/60 border-parchment-dark/40"><SelectValue /></SelectTrigger>
              <SelectContent className="parchment">
                <SelectItem value="RACE">🧬 Раса</SelectItem>
                <SelectItem value="CLASS">⚔️ Класс</SelectItem>
                <SelectItem value="SUBCLASS">🔱 Подкласс</SelectItem>
                <SelectItem value="SPELL">✨ Заклинание</SelectItem>
                <SelectItem value="ITEM">💎 Магический предмет</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label className="parchment-heading text-sm">Название</Label><Input value={getVal("name")} onChange={(e) => setVal("name", e.target.value)} className="bg-parchment/60 border-parchment-dark/40" /></div>
          <div><Label className="parchment-heading text-sm">Подзаголовок (напр. «Подкласс Паладина», «Заклинание 3 круга»)</Label><Input value={getVal("subtitle") || ""} onChange={(e) => setVal("subtitle", e.target.value)} className="bg-parchment/60 border-parchment-dark/40" /></div>
          <div><Label className="parchment-heading text-sm">Иконка (эмодзи)</Label><Input value={getVal("icon") || ""} onChange={(e) => setVal("icon", e.target.value)} placeholder="🜂" className="bg-parchment/60 border-parchment-dark/40" /></div>
          <div>
            <Label className="parchment-heading text-sm">Редкость / уровень (для предметов и заклинаний)</Label>
            <Select value={getVal("rarity") || ""} onValueChange={(v) => setVal("rarity", v)}>
              <SelectTrigger className="bg-parchment/60 border-parchment-dark/40"><SelectValue placeholder="(необязательно)" /></SelectTrigger>
              <SelectContent className="parchment">
                <SelectItem value="COMMON">Common</SelectItem>
                <SelectItem value="RARE">Rare</SelectItem>
                <SelectItem value="EPIC">Epic</SelectItem>
                <SelectItem value="LEGENDARY">Legendary</SelectItem>
                <SelectItem value="MYTHIC">Mythic</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label className="parchment-heading text-sm">Описание</Label><Textarea value={getVal("description")} onChange={(e) => setVal("description", e.target.value)} rows={3} className="bg-parchment/60 border-parchment-dark/40" /></div>
          <div><Label className="parchment-heading text-sm">Подробности (черты, параметры, компоненты — каждое с новой строки)</Label><Textarea value={getVal("details") || ""} onChange={(e) => setVal("details", e.target.value)} rows={5} className="bg-parchment/60 border-parchment-dark/40" /></div>
          <div><Label className="parchment-heading text-sm">Порядок</Label><Input type="number" value={getVal("order") || 0} onChange={(e) => setVal("order", Number(e.target.value))} className="bg-parchment/60 border-parchment-dark/40" /></div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="parchment-muted">Отмена</Button>
          <Button onClick={() => onSave({ ...current, ...form })} disabled={pending} className="bg-primary text-primary-foreground btn-rune">{pending ? "Пишем..." : "Сохранить"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
