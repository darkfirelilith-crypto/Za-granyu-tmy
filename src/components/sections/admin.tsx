"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { OrnamentTitle } from "@/components/fantasy/ornament-title";
import { ParchmentCard, RuneSeal, RarityBadge, DifficultyBadge } from "@/components/fantasy/ui";
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
import { ImageUpload } from "@/components/fantasy/image-upload";
import { Plus, Pencil, Trash2, Crown, Lock, Unlock, Award, BookOpen, MapPin, Users as UsersIcon, Sword, Sparkles, Scale, Sun, BookMarked, Link2, Trophy, Star, FlaskConical, ShieldCheck, UserPlus, KeyRound, Users, FileText, X, Gem } from "lucide-react";

const ENTITIES = {
  countries: { label: "Страны", icon: MapPin, api: "/api/lore/countries", fields: ["name","description","emblem","banner","capital","government","population","culture","climate"] },
  personalities: { label: "Персонажи", icon: UsersIcon, api: "/api/lore/personalities", fields: ["name","title","race","age","gender","appearance","description","portrait","affiliation","role","status","isNpc","isKeyNpc","isAdventurer"] },
  relations: { label: "Отношения", icon: Link2, api: "/api/lore/relations", fields: ["countryAName","countryBName","relationType","description"] },
  systems: { label: "Мир. Система", icon: Scale, api: "/api/lore/systems", fields: ["title","category","description","icon","image"] },
  gods: { label: "Пантеон", icon: Sun, api: "/api/lore/gods", fields: ["name","title","domain","description","symbol","image","alignment","pantheon"] },
  legends: { label: "Легенды", icon: BookMarked, api: "/api/lore/legends", fields: ["title","content","era","icon","image"] },
} as const;

type EntityKey = keyof typeof ENTITIES;

// Sections in the admin sidebar — grouped by site section.
const SECTIONS = [
  { key: "overview", label: "Обзор", icon: Crown },
  { key: "knowledge", label: "База Знаний", icon: BookOpen, sub: [
    { key: "countries", label: "Страны" },
    { key: "personalities", label: "Персонажи" },
    { key: "relations", label: "Отношения" },
    { key: "systems", label: "Мир. Система" },
    { key: "gods", label: "Пантеон" },
    { key: "legends", label: "Легенды" },
  ]},
  { key: "guild", label: "Гильдия", icon: Sword, sub: [
    { key: "ranks", label: "Ранги" },
    { key: "quests", label: "Задания" },
    { key: "characters", label: "Герои" },
  ]},
  { key: "grimoire", label: "Гримуар", icon: Sparkles },
  { key: "lab", label: "Лаборатория Алого", icon: FlaskConical },
  { key: "achievements", label: "Достижения", icon: Award },
  { key: "groups", label: "Группы игроков", icon: Users },
  { key: "content", label: "Контент страниц", icon: FileText },
  { key: "users", label: "Пользователи", icon: ShieldCheck },
] as const;

export function AdminView() {
  const [section, setSection] = useState<string>("overview");
  const [sub, setSub] = useState<string>("countries");

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-10 space-y-6">
      <div className="text-center space-y-2">
        <div className="flex justify-center">
          <RuneSeal icon={<Crown className="w-8 h-8 text-gold" />} size="lg" glow />
        </div>
        <OrnamentTitle size="lg" flourish="✦">
          Чертог Божества
        </OrnamentTitle>
        <p className="text-foreground/70 font-[family-name:var(--font-garamond)] italic max-w-2xl mx-auto">
          Здесь ты властвуешь над миром за гранью тьмы. Выбери раздел слева — затем подраздел — и твори.
        </p>
        <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-md border border-gold/30 bg-gold/5 text-gold/80 text-sm font-[family-name:var(--font-cinzel)] tracking-wide animate-fade-rise">
          ✦ Всё, что видишь в этом мире, ты можешь изменить — добавляй, редактируй и удаляй записи.
        </div>
      </div>

      <div className="grid lg:grid-cols-[220px_1fr] gap-6">
        {/* Sidebar — разделы */}
        <aside className="lg:sticky lg:top-4 lg:self-start space-y-1">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const active = section === s.key;
            return (
              <div key={s.key}>
                <button
                  onClick={() => setSection(s.key)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-md font-[family-name:var(--font-cinzel)] text-sm tracking-wide transition-all ${
                    active ? "text-gold bg-gold/10 magic-glow" : "text-foreground/70 hover:text-gold hover:bg-gold/5"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {s.label}
                </button>
                {/* Sub-items */}
                {active && "sub" in s && s.sub && (
                  <div className="ml-4 mt-1 space-y-0.5 border-l border-gold/20 pl-2">
                    {s.sub.map((subItem) => (
                      <button
                        key={subItem.key}
                        onClick={() => setSub(subItem.key)}
                        className={`w-full text-left px-3 py-1.5 rounded text-sm font-[family-name:var(--font-garamond)] transition-all ${
                          sub === subItem.key ? "text-gold bg-gold/5" : "text-foreground/60 hover:text-gold"
                        }`}
                      >
                        {subItem.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </aside>

        {/* Content */}
        <div className="min-h-[400px]">
          {section === "overview" && <Overview />}
          {section === "knowledge" && (ENTITIES[sub as EntityKey] ? <EntityEditor entityKey={sub as EntityKey} /> : <Overview />)}
          {section === "guild" && (
            sub === "ranks" ? <RanksEditor /> :
            sub === "quests" ? <QuestsEditor /> :
            sub === "characters" ? <CharactersEditor /> : <RanksEditor />
          )}
          {section === "grimoire" && <GrimoireEditor />}
          {section === "lab" && <LabEditor />}
          {section === "achievements" && <AchievementsEditor />}
          {section === "groups" && <GroupsEditor />}
          {section === "content" && <ContentEditor />}
          {section === "users" && <UsersEditor />}
        </div>
      </div>
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
    { label: "Личности", value: data?.personalities, icon: UsersIcon },
    { label: "Отношения", value: data?.relations, icon: Link2 },
    { label: "Мир. системы", value: data?.systems, icon: Scale },
    { label: "Боги", value: data?.gods, icon: Sun },
    { label: "Легенды", value: data?.legends, icon: BookMarked },
    { label: "Ранги", value: data?.ranks, icon: Trophy },
    { label: "Задания", value: data?.quests, icon: Sword },
    { label: "Гримуар", value: data?.grimoire ? `${data.grimoireUnlocked}/${data.grimoire}` : null, icon: Sparkles },
    { label: "Достижения", value: data?.achievements, icon: Award },
    { label: "Герои", value: data?.characters, icon: UsersIcon },
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
const FIELD_META: Record<string, { type: "text"|"textarea"|"select"|"image"|"checkbox"|"country-select"; options?: string[]; label: string }> = {
  name: { type: "text", label: "Название" },
  title: { type: "text", label: "Титул" },
  description: { type: "textarea", label: "Описание" },
  emblem: { type: "text", label: "Символ (эмодзи)" },
  banner: { type: "image", label: "Знамя / карта (изображение)" },
  capital: { type: "text", label: "Столица" },
  government: { type: "text", label: "Правление" },
  population: { type: "text", label: "Население" },
  culture: { type: "textarea", label: "Культура" },
  climate: { type: "textarea", label: "Климат" },
  affiliation: { type: "text", label: "Принадлежность" },
  role: { type: "text", label: "Должность" },
  race: { type: "text", label: "Раса" },
  age: { type: "text", label: "Возраст" },
  gender: { type: "text", label: "Пол" },
  appearance: { type: "textarea", label: "Описание внешности" },
  loreDescription: { type: "textarea", label: "Описание лора" },
  characterDescription: { type: "textarea", label: "Описание характера" },
  whereToMeet: { type: "text", label: "Где можно встретить" },
  notes: { type: "textarea", label: "Заметка о персонаже" },
  portrait: { type: "image", label: "Портрет (изображение)" },
  image: { type: "image", label: "Изображение (иллюстрация)" },
  status: { type: "select", label: "Статус", options: ["alive","deceased","missing"] },
  isNpc: { type: "checkbox", label: "Это НПС (встречается в группе)" },
  isKeyNpc: { type: "checkbox", label: "Ключевой НПС" },
  isAdventurer: { type: "checkbox", label: "Авантюрист (показывается в «Братья по оружию»)" },
  countryAName: { type: "country-select", label: "Страна A" },
  countryBName: { type: "country-select", label: "Страна B" },
  relationType: { type: "select", label: "Тип связи", options: ["ally","enemy","neutral","trade","vassal"] },
  category: { type: "select", label: "Категория", options: ["POLITICS","ECONOMY","MILITARY","MAGIC","RELIGION","LAW"] },
  domain: { type: "text", label: "Домен" },
  symbol: { type: "text", label: "Символ (эмодзи)" },
  alignment: { type: "select", label: "Мировоззрение", options: ["good","neutral","evil"] },
  pantheon: { type: "text", label: "Пантеон" },
  content: { type: "textarea", label: "Текст" },
  era: { type: "text", label: "Эра" },
  icon: { type: "text", label: "Иконка (эмодзи)" },
  level: { type: "text", label: "Уровень (число)" },
  minXp: { type: "text", label: "Минимальный опыт (XP)" },
};

/* Country-select dropdown — fetches countries list, used for relations A/B */
function CountrySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { data } = useQuery<any[]>({
    queryKey: ["countries-for-select"],
    queryFn: () => fetch("/api/lore/countries").then((r) => r.json()).catch(() => []),
  });
  const countries = (Array.isArray(data) ? data : []).sort((a, b) => a.name.localeCompare(b.name));
  return (
    <Select value={value || ""} onValueChange={onChange}>
      <SelectTrigger className="bg-parchment/60 border-parchment-dark/40 h-10"><SelectValue placeholder="Выбери страну..." /></SelectTrigger>
      <SelectContent className="parchment max-h-72">
        {countries.map((c) => (
          <SelectItem key={c.id} value={c.name}>
            {c.emblem ? `${c.emblem} ` : ""}{c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

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

  // Required (non-nullable) fields per entity — validated client-side before save
  // to give a clear toast instead of a raw Prisma 500.
  const REQUIRED_FIELDS: Record<string, string[]> = {
    countries: ["name", "description"],
    personalities: ["name", "description"],
    relations: ["countryAName", "countryBName", "relationType"],
    systems: ["title", "category", "description"],
    gods: ["name", "domain", "description"],
    legends: ["title", "content"],
  };

  const saveMut = useMutation({
    mutationFn: async (item: any) => {
      // Client-side validation of required fields
      const required = REQUIRED_FIELDS[entityKey] ?? [];
      const missing = required.filter((f) => !item[f] || String(item[f]).trim() === "");
      if (missing.length > 0) {
        throw new Error(`Заполни обязательные поля: ${missing.join(", ")}`);
      }
      const { id, ...rest } = item;
      // Clean undefined/empty-string values — Prisma chokes on undefined
      const clean: any = {};
      for (const [k, v] of Object.entries(rest)) {
        if (v === undefined) continue;
        if (v === "" && k !== "description" && k !== "name" && k !== "title" && k !== "encodedContent" && k !== "realContent") continue;
        clean[k] = v;
      }
      // Convert booleans if present
      if (clean.isNpc !== undefined) clean.isNpc = Boolean(clean.isNpc);
      if (clean.isKeyNpc !== undefined) clean.isKeyNpc = Boolean(clean.isKeyNpc);
      if (clean.isAdventurer !== undefined) clean.isAdventurer = Boolean(clean.isAdventurer);
      if (clean.visibleGroupId === "") clean.visibleGroupId = null;
      if (clean.order !== undefined) clean.order = Number(clean.order) || 0;

      const res = id
        ? await fetch(`${meta.api}/${id}`, { method: "PUT", headers: {"Content-Type":"application/json"}, body: JSON.stringify(clean) })
        : await fetch(meta.api, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(clean) });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      return json;
    },
    onSuccess: () => {
      toast({ title: "Свиток переписан", description: "Изменения внесены в летопись." });
      setOpen(false);
      qc.invalidateQueries({ queryKey: [entityKey] });
    },
    onError: (e: Error) => {
      toast({ title: "Ошибка сохранения", description: e.message, variant: "destructive" });
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
              <Button size="icon" variant="ghost" onClick={() => { if (confirm(`Удалить «${it.name ?? it.title}»?`)) delMut.mutate(it.id); }} className="text-destructive hover:bg-destructive/10">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </ParchmentCard>
        ))}
        {items.length === 0 && <p className="col-span-full text-center parchment-muted italic py-8">Пока пусто.</p>}
      </div>

      <EntityFormDialog
        key={editing?.id ?? "new"}
        open={open}
        onOpenChange={setOpen}
        fields={meta.fields}
        requiredFields={REQUIRED_FIELDS[entityKey] ?? []}
        item={editing}
        onSave={(item) => saveMut.mutate(item)}
        pending={saveMut.isPending}
        title={editing?.id ? "Редактировать" : "Создать"}
      />
    </div>
  );
}

function EntityFormDialog({
  open, onOpenChange, fields, requiredFields, item, onSave, pending, title,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  fields: readonly string[];
  requiredFields: readonly string[];
  item: any;
  onSave: (item: any) => void;
  pending: boolean;
  title: string;
}) {
  const [form, setForm] = useState<any>(item ?? {});
  // Reset form whenever the dialog opens or the item changes.
  // The parent uses key={item?.id ?? "new"} for remount on item change, but clicking
  // "Создать" twice in a row keeps key="new" → no remount → stale form persists.
  // This useEffect ensures the form reflects the current item every time it opens.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(item ?? {});
  }, [item, open]);
  const current = item ?? {};
  const getVal = (f: string) => (form[f] !== undefined ? form[f] : current[f] ?? "");
  const setVal = (f: string, v: any) => setForm({ ...form, [f]: v });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="parchment gold-frame max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-[family-name:var(--font-cinzel)] text-2xl parchment-heading">{title}</DialogTitle>
          <DialogDescription className="parchment-muted">Внеси изменения в свиток</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Group image fields separately (full width) */}
          {fields.filter((f) => FIELD_META[f]?.type === "image").map((f) => {
            const meta = FIELD_META[f];
            return (
              <div key={f} className="space-y-1">
                <ImageUpload
                  label={meta.label}
                  value={getVal(f) || null}
                  onChange={(v) => setVal(f, v)}
                  aspect="aspect-video"
                />
              </div>
            );
          })}

          {/* Text + select fields — 2-column grid for compact, 1-column for textarea/select */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {fields.filter((f) => FIELD_META[f]?.type === "text").map((f) => {
              const meta = FIELD_META[f];
              const req = requiredFields.includes(f);
              return (
                <div key={f} className="space-y-1">
                  <Label className="parchment-heading text-sm">
                    {meta.label}{req && <span className="text-red-700 ml-0.5">*</span>}
                  </Label>
                  <Input value={getVal(f)} onChange={(e) => setVal(f, e.target.value)} className="bg-parchment/60 border-parchment-dark/40 h-10" />
                </div>
              );
            })}
            {fields.filter((f) => FIELD_META[f]?.type === "select").map((f) => {
              const meta = FIELD_META[f];
              const req = requiredFields.includes(f);
              return (
                <div key={f} className="space-y-1">
                  <Label className="parchment-heading text-sm">
                    {meta.label}{req && <span className="text-red-700 ml-0.5">*</span>}
                  </Label>
                  <Select value={getVal(f)} onValueChange={(v) => setVal(f, v)}>
                    <SelectTrigger className="bg-parchment/60 border-parchment-dark/40 h-10"><SelectValue placeholder="Выбери..." /></SelectTrigger>
                    <SelectContent className="parchment">
                      {meta.options!.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
            {/* Country-select: dropdown populated from /api/lore/countries (for relations) */}
            {fields.filter((f) => FIELD_META[f]?.type === "country-select").map((f) => {
              const meta = FIELD_META[f];
              const req = requiredFields.includes(f);
              return (
                <div key={f} className="space-y-1">
                  <Label className="parchment-heading text-sm">
                    {meta.label}{req && <span className="text-red-700 ml-0.5">*</span>}
                  </Label>
                  <CountrySelect value={getVal(f)} onChange={(v) => setVal(f, v)} />
                </div>
              );
            })}
          </div>

          {/* Textareas — full width */}
          {fields.filter((f) => FIELD_META[f]?.type === "textarea").map((f) => {
            const meta = FIELD_META[f];
            const req = requiredFields.includes(f);
            return (
              <div key={f} className="space-y-1">
                <Label className="parchment-heading text-sm">
                  {meta.label}{req && <span className="text-red-700 ml-0.5">*</span>}
                </Label>
                <Textarea value={getVal(f)} onChange={(e) => setVal(f, e.target.value)} rows={4} className="bg-parchment/60 border-parchment-dark/40" />
              </div>
            );
          })}

          {/* Checkboxes — full width */}
          {fields.filter((f) => FIELD_META[f]?.type === "checkbox").map((f) => {
            const meta = FIELD_META[f];
            return (
              <label key={f} className="flex items-center gap-2 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  checked={!!getVal(f)}
                  onChange={(e) => setVal(f, e.target.checked)}
                  className="w-5 h-5 rounded accent-wine"
                />
                <Label className="parchment-heading text-sm">{meta.label}</Label>
              </label>
            );
          })}

          {/* Visibility selector for personality entity */}
          {fields.includes("status") && (
            <VisibilitySelector
              label="Видимость для группы"
              value={getVal("visibleGroupId") || ""}
              onChange={(v) => setVal("visibleGroupId", v || null)}
            />
          )}
        </div>
        <div className="flex justify-end gap-2 pt-2 sticky bottom-0 bg-parchment/90 backdrop-blur-sm pb-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="btn-parchment">Отмена</Button>
          <Button onClick={() => onSave({ ...current, ...form })} disabled={pending} className="bg-primary text-primary-foreground btn-rune">
            {pending ? "Пишем..." : "Сохранить"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* Visibility selector — picks a group (or "all") for personality/grimoire */
function VisibilitySelector({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const { data: groups } = useQuery<any[]>({ queryKey: ["groups"], queryFn: () => fetch("/api/groups").then((r) => r.json()) });
  return (
    <div className="space-y-1 pt-3 border-t border-parchment-dark/30">
      <Label className="parchment-heading text-sm">{label}</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded border border-parchment-dark/40 bg-parchment/60 parchment-text h-10"
      >
        <option value="">Всем (без ограничения)</option>
        {(Array.isArray(groups) ? groups : []).map((g) => (
          <option key={g.id} value={g.id}>{g.name}</option>
        ))}
      </select>
      <p className="parchment-muted text-sm italic">Если выбрать группу — запись увидят только члены этой группы. Иначе — все.</p>
    </div>
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
              <Button size="icon" variant="ghost" onClick={()=>{ if (confirm(`Удалить ранг «${r.name}»?`)) del.mutate(r.id); }} className="text-destructive"><Trash2 className="w-4 h-4"/></Button>
            </div>
          </ParchmentCard>
        ))}
      </div>
      <EntityFormDialog open={open} onOpenChange={setOpen} fields={["name","level","description","icon","minXp"]} requiredFields={["name","level","minXp"]} item={editing}
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
              <span className="text-sm parchment-muted">{q.status}</span>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={()=>{setEditing(q);setOpen(true);}} className="text-wine"><Pencil className="w-4 h-4"/></Button>
                <Button size="icon" variant="ghost" onClick={()=>{ if (confirm(`Удалить задание «${q.title}»?`)) del.mutate(q.id); }} className="text-destructive"><Trash2 className="w-4 h-4"/></Button>
              </div>
            </div>
          </ParchmentCard>
        ))}
      </div>
      <QuestFormDialog key={editing?.id ?? "new"} open={open} onOpenChange={setOpen} item={editing} onSave={(it)=>save.mutate(it)} pending={save.isPending} />
    </div>
  );
}

function QuestFormDialog({ open,onOpenChange,item,onSave,pending }:{open:boolean;onOpenChange:(v:boolean)=>void;item:any;onSave:(i:any)=>void;pending:boolean}) {
  const current = item ?? {};
  const [form, setForm] = useState<any>({});
  // Reset form whenever the dialog opens or the item changes (prevents stale state on repeated "Создать")
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm({});
  }, [item, open]);
  const getVal = (f:string) => (form[f] !== undefined ? form[f] : current[f] ?? "");
  const setVal = (f:string,v:any) => setForm({...form,[f]:v});
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="parchment gold-frame max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-[family-name:var(--font-cinzel)] text-xl parchment-heading">{item?.id?"Редактировать":"Создать"} задание</DialogTitle>
          <DialogDescription className="sr-only">Форма редактирования задания гильдии</DialogDescription>
        </DialogHeader>
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
      // Pass through all provided values (null, "", numbers). Skip only `undefined`
      // so omitted fields preserve their existing DB value. Previously empty strings
      // were dropped, which meant admin couldn't clear nullable text fields (unlockHint,
      // marginTop, postscript, etc.) — old values silently persisted.
      const clean: any = {};
      for (const [k, v] of Object.entries(rest)) {
        if (v === undefined) continue;
        clean[k] = v;
      }
      // Ensure numeric fields are numbers
      if (clean.order !== undefined) clean.order = Number(clean.order) || 0;
      if (id) return fetch(`/api/grimoire/${id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(clean)}).then(async r => { const j = await r.json(); if (j.error) throw new Error(j.error); return j; });
      if (!clean.title) throw new Error("Укажите название главы");
      return fetch("/api/grimoire",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({order:0,...clean})}).then(async r => { const j = await r.json(); if (j.error) throw new Error(j.error); return j; });
    },
    onSuccess:()=>{setOpen(false);qc.invalidateQueries({queryKey:["grimoire"]});toast({title:"Глава переписана"});},
    onError:(e:Error)=>{toast({title:"Ошибка сохранения",description:e.message,variant:"destructive"});},
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
                <p className="parchment-muted text-sm">{g.category} · {g.unlocked?"открыто":"запечатано"}</p>
              </div>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button size="icon" variant="ghost" onClick={()=>unlock.mutate(g.id)} className={g.unlocked?"text-wine":"text-gold"} title={g.unlocked?"Наложить печать":"Снять печать"}>
                {g.unlocked?<Lock className="w-4 h-4"/>:<Unlock className="w-4 h-4"/>}
              </Button>
              <Button size="icon" variant="ghost" onClick={()=>{setEditing(g);setOpen(true);}} className="text-wine"><Pencil className="w-4 h-4"/></Button>
              <Button size="icon" variant="ghost" onClick={()=>{ if (confirm(`Стёреть главу «${g.unlocked ? g.title : 'запечатанная'}»?`)) del.mutate(g.id); }} className="text-destructive"><Trash2 className="w-4 h-4"/></Button>
            </div>
          </ParchmentCard>
        ))}
      </div>
      <GrimoireFormDialog key={editing?.id ?? "new"} open={open} onOpenChange={setOpen} item={editing} onSave={(it)=>save.mutate(it)} pending={save.isPending} />
    </div>
  );
}

const PAPER_STYLES = [
  { value: "PLAIN", label: "Чистый пергамент", emoji: "📜" },
  { value: "BLOOD", label: "Кровавые пятна", emoji: "🩸" },
  { value: "BURNED", label: "Обгорелые углы", emoji: "🔥" },
  { value: "TEARS", label: "Капли слёз", emoji: "💧" },
  { value: "INK", label: "Чернильные брызги", emoji: "🖋️" },
  { value: "FROST", label: "Морозный иней", emoji: "❄️" },
  { value: "GOLD", label: "Золотое сияние", emoji: "✨" },
];

const ENTRY_TYPES = [
  { value: "NOTE", label: "Заметка", emoji: "📝", desc: "Простой текстовый блок" },
  { value: "DIARY", label: "Дневник", emoji: "📔", desc: "Полотно текста + постскриптум" },
  { value: "SPELL_FORMULA", label: "Магическая Формула", emoji: "🔮", desc: "Размышление + формула заклинания" },
];

function GrimoireFormDialog({ open,onOpenChange,item,onSave,pending }:{open:boolean;onOpenChange:(v:boolean)=>void;item:any;onSave:(i:any)=>void;pending:boolean}) {
  const current = item ?? {};
  const [form, setForm] = useState<any>({});
  // Reset form when dialog opens or item changes (prevents stale state on repeated "Создать")
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm({});
  }, [item, open]);
  const getVal = (f:string) => (form[f] !== undefined ? form[f] : current[f] ?? "");
  const setVal = (f:string,v:any) => setForm({...form,[f]:v});
  const entryType = getVal("entryType") || "NOTE";
  // sealed = !unlocked. New chapters are sealed by default.
  const sealed = item?.id ? !getVal("unlocked") : (getVal("unlocked") === undefined ? true : !getVal("unlocked"));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="parchment gold-frame max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-[family-name:var(--font-cinzel)] text-2xl parchment-heading">{item?.id?"Редактировать":"Создать"} главу</DialogTitle>
          <DialogDescription className="sr-only">Форма редактирования главы гримуара</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Секция 1: Основное */}
          <div className="space-y-3 pb-4 border-b border-parchment-dark/30">
            <p className="parchment-heading text-sm uppercase tracking-wider text-wine">❖ Основное</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <Label className="parchment-heading text-sm">Название главы</Label>
                <Input value={getVal("title")} onChange={e=>setVal("title",e.target.value)} placeholder="напр. Глава 1: Падение с Неба" className="bg-parchment/60 border-parchment-dark/40 h-10" />
              </div>
              <div>
                <Label className="parchment-heading text-sm">Дата (по лору)</Label>
                <Input value={getVal("loreDate") ?? ""} onChange={e=>setVal("loreDate",e.target.value)} placeholder="напр. 3 Эра, 15 день" className="bg-parchment/60 border-parchment-dark/40 h-10" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label className="parchment-heading text-sm">Категория</Label>
                <Select value={getVal("category")} onValueChange={v=>setVal("category",v)}>
                  <SelectTrigger className="bg-parchment/60 border-parchment-dark/40 h-10"><SelectValue/></SelectTrigger>
                  <SelectContent className="parchment">{["SECRETS","RITUALS","PROPHECY","HISTORY","BEASTIARY"].map(o=><SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="parchment-heading text-sm">Порядок</Label>
                <Input type="number" value={getVal("order")??0} onChange={e=>setVal("order",Number(e.target.value))} className="bg-parchment/60 border-parchment-dark/40 h-10" />
              </div>
              {/* Toggle: Запечатана / Открыта */}
              <div>
                <Label className="parchment-heading text-sm">Состояние главы</Label>
                <div className="flex items-center gap-2 h-10">
                  <button
                    type="button"
                    onClick={() => setVal("unlocked", false)}
                    className={`px-4 py-2 rounded-lg border-2 text-sm font-[family-name:var(--font-cinzel)] transition-all ${sealed ? "border-amber-700/50 bg-amber-700/10 text-amber-700" : "border-parchment-dark/30 text-parchment-muted"}`}
                  >
                    🔒 Запечатана
                  </button>
                  <button
                    type="button"
                    onClick={() => setVal("unlocked", true)}
                    className={`px-4 py-2 rounded-lg border-2 text-sm font-[family-name:var(--font-cinzel)] transition-all ${!sealed ? "border-green-600/50 bg-green-600/10 text-green-700" : "border-parchment-dark/30 text-parchment-muted"}`}
                  >
                    🔓 Открыта
                  </button>
                </div>
              </div>
            </div>
            {sealed && (
              <p className="parchment-muted text-sm italic bg-amber-700/5 px-3 py-2 rounded">
                🔒 Когда глава запечатана, игроки видят только рандомные иероглифы вместо текста. Название тоже скрыто. Шифр генерируется автоматически — ничего вводить не нужно.
              </p>
            )}
          </div>

          {/* Секция 2: Тип записи */}
          <div className="space-y-3 pb-4 border-b border-parchment-dark/30">
            <p className="parchment-heading text-sm uppercase tracking-wider text-wine">❖ Тип записи — выбран: {ENTRY_TYPES.find(t=>t.value===entryType)?.label || "Заметка"}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {ENTRY_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setVal("entryType", t.value)}
                  className={`p-4 rounded-lg border-2 text-left transition-all relative ${entryType === t.value
                    ? "border-wine bg-wine/15 shadow-lg ring-2 ring-wine/30"
                    : "border-parchment-dark/30 hover:border-wine/40 opacity-60 hover:opacity-100"
                  }`}
                >
                  {entryType === t.value && (
                    <span className="absolute top-2 right-2 text-wine text-lg">✓</span>
                  )}
                  <div className="text-3xl mb-1">{t.emoji}</div>
                  <p className="font-[family-name:var(--font-cinzel)] text-sm parchment-heading">{t.label}</p>
                  <p className="parchment-muted text-sm italic">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Секция 3: Оформление страницы */}
          <div className="space-y-3 pb-4 border-b border-parchment-dark/30">
            <p className="parchment-heading text-sm uppercase tracking-wider text-wine">❖ Оформление страницы — выбрано: {PAPER_STYLES.find(ps=>ps.value===(getVal("paperStyle") || "PLAIN"))?.label || "Чистый пергамент"}</p>
            <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
              {PAPER_STYLES.map((ps) => (
                <button
                  key={ps.value}
                  type="button"
                  onClick={() => setVal("paperStyle", ps.value)}
                  className={`p-2 rounded-lg border-2 text-center transition-all ${(getVal("paperStyle") || "PLAIN") === ps.value
                    ? "border-wine bg-wine/15 shadow-md ring-2 ring-wine/30"
                    : "border-parchment-dark/30 hover:border-wine/40 opacity-60 hover:opacity-100"
                  }`}
                >
                  <div className="text-2xl mb-0.5">{ps.emoji}</div>
                  <p className="text-xs font-[family-name:var(--font-cinzel)] parchment-heading leading-tight">{ps.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Секция 4: Пометки на полях */}
          <div className="space-y-3 pb-4 border-b border-parchment-dark/30">
            <p className="parchment-heading text-sm uppercase tracking-wider text-wine">❖ Пометки на полях</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="parchment-heading text-sm">Пометка сверху</Label>
                <Textarea value={getVal("marginTop") ?? ""} onChange={e=>setVal("marginTop",e.target.value)} rows={2} placeholder="Заметка на верхнем поле" className="bg-parchment/60 border-parchment-dark/40" />
              </div>
              <div>
                <Label className="parchment-heading text-sm">Пометка снизу</Label>
                <Textarea value={getVal("marginBottom") ?? ""} onChange={e=>setVal("marginBottom",e.target.value)} rows={2} placeholder="Заметка на нижнем поле" className="bg-parchment/60 border-parchment-dark/40" />
              </div>
            </div>
          </div>

          {/* Секция 5: Содержание (зависит от типа) */}
          <div className="space-y-3 pb-4 border-b border-parchment-dark/30">
            <p className="parchment-heading text-sm uppercase tracking-wider text-wine">❖ Содержание — {ENTRY_TYPES.find(t=>t.value===entryType)?.label || "Заметка"}</p>

            {/* ДНЕВНИК: большое полотно текста + постскриптум */}
            {entryType === "DIARY" && (
              <div className="space-y-3">
                <div>
                  <Label className="parchment-heading text-sm">Полотно текста (тело дневника)</Label>
                  <Textarea value={getVal("realContent")} onChange={e=>setVal("realContent",e.target.value)} rows={12} placeholder="Огромное полотно текста — запись из дневника автора" className="bg-parchment/60 border-parchment-dark/40" />
                </div>
                <div>
                  <Label className="parchment-heading text-sm">Постскриптум (P.S.)</Label>
                  <Textarea value={getVal("postscript") ?? ""} onChange={e=>setVal("postscript",e.target.value)} rows={3} placeholder="Постскриптум — дополнение после основной записи" className="bg-parchment/60 border-parchment-dark/40" />
                </div>
              </div>
            )}

            {/* МАГИЧЕСКАЯ ФОРМУЛА: размышление + формула + заметки */}
            {entryType === "SPELL_FORMULA" && (
              <div className="space-y-3">
                <div>
                  <Label className="parchment-heading text-sm">Описание и размышления автора о заклинании</Label>
                  <Textarea value={getVal("spellReflection") ?? ""} onChange={e=>setVal("spellReflection",e.target.value)} rows={6} placeholder="Описание заклинания и размышления автора о нём" className="bg-parchment/60 border-parchment-dark/40" />
                </div>
                <div>
                  <Label className="parchment-heading text-sm">Формула заклинания (характеристики)</Label>
                  <Textarea value={getVal("spellFormula") ?? ""} onChange={e=>setVal("spellFormula",e.target.value)} rows={8} placeholder="Круг, компоненты, время накладывания, дистанция, длительность, урон/эффект..." className="bg-parchment/60 border-parchment-dark/40 font-mono text-sm" />
                </div>
                <div>
                  <Label className="parchment-heading text-sm">Дополнительные заметки о заклинании</Label>
                  <Textarea value={getVal("spellNotes") ?? ""} onChange={e=>setVal("spellNotes",e.target.value)} rows={3} placeholder="Побочные эффекты, ограничения, история создания..." className="bg-parchment/60 border-parchment-dark/40" />
                </div>
              </div>
            )}

            {/* ЗАМЕТКА: просто текст */}
            {entryType === "NOTE" && (
              <div>
                <Label className="parchment-heading text-sm">Текст заметки</Label>
                <Textarea value={getVal("realContent")} onChange={e=>setVal("realContent",e.target.value)} rows={8} placeholder="Текст заметки" className="bg-parchment/60 border-parchment-dark/40" />
              </div>
            )}

            {/* Fallback for old entries with no entryType */}
            {!entryType && (
              <div>
                <Label className="parchment-heading text-sm">Текст главы</Label>
                <Textarea value={getVal("realContent")} onChange={e=>setVal("realContent",e.target.value)} rows={8} className="bg-parchment/60 border-parchment-dark/40" />
              </div>
            )}

            <div>
              <Label className="parchment-heading text-sm">Подсказка для разблокировки</Label>
              <Input value={getVal("unlockHint")??""} onChange={e=>setVal("unlockHint",e.target.value)} placeholder="напр. Заверши три задания гильдии" className="bg-parchment/60 border-parchment-dark/40 h-10" />
            </div>
          </div>

          {/* Секция 6: Видимость */}
          <div className="space-y-2 pb-4 border-b border-parchment-dark/30">
            <p className="parchment-heading text-sm uppercase tracking-wider text-wine">❖ Видимость для групп</p>
            <VisibilitySelector label="Какая группа видит главу" value={getVal("visibleGroupId") || ""} onChange={(v) => setVal("visibleGroupId", v || null)} />
          </div>

          {/* Секция 7: Условие авто-снятия */}
          <div className="space-y-2">
            <p className="parchment-heading text-sm uppercase tracking-wider text-wine">❖ Условие авто-снятия печати</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select value={getVal("conditionType") || "MANUAL"} onValueChange={(v) => setVal("conditionType", v === "MANUAL" ? null : v)}>
                <SelectTrigger className="bg-parchment/60 border-parchment-dark/40 h-10"><SelectValue/></SelectTrigger>
                <SelectContent className="parchment">
                  <SelectItem value="MANUAL">Вручную</SelectItem>
                  <SelectItem value="QUEST_COMPLETED">Задание завершено</SelectItem>
                  <SelectItem value="QUEST_COUNT">Число заданий</SelectItem>
                  <SelectItem value="XP_THRESHOLD">Порог опыта</SelectItem>
                  <SelectItem value="RANK_REACHED">Достигнут ранг</SelectItem>
                  <SelectItem value="ACHIEVEMENT_EARNED">Получено достижение</SelectItem>
                </SelectContent>
              </Select>
              <Input value={getVal("conditionValue")??""} onChange={e=>setVal("conditionValue",e.target.value)} placeholder="значение (ID/число)" className="bg-parchment/60 border-parchment-dark/40 h-10" disabled={!getVal("conditionType")||getVal("conditionType")==="MANUAL"}/>
            </div>
            <p className="parchment-muted text-sm italic">При исполнении условия печать снимется автоматически для героев, видящих главу.</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 sticky bottom-0 bg-parchment/90 backdrop-blur-sm pb-2">
          <Button variant="ghost" onClick={()=>onOpenChange(false)} className="btn-parchment">Отмена</Button>
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
                <Button size="icon" variant="ghost" onClick={()=>{ if (confirm(`Удалить достижение «${a.name}»?`)) del.mutate(a.id); }} className="text-destructive"><Trash2 className="w-4 h-4"/></Button>
              </div>
            </div>
            <p className="parchment-muted text-sm">{a.description}</p>
            <Button size="sm" variant="outline" onClick={()=>setGrant({achId:a.id,charId:chars?.[0]?.id ?? ""})} className="border-gold/30 text-gold hover:bg-gold/10 btn-rune w-full">
              <Award className="w-3.5 h-3.5 mr-1"/> Даровать герою
            </Button>
          </ParchmentCard>
        ))}
      </div>

      <AchFormDialog key={editing?.id ?? "new"} open={open} onOpenChange={setOpen} item={editing} onSave={(it)=>save.mutate(it)} pending={save.isPending} />

      {/* Grant dialog */}
      <Dialog open={!!grant} onOpenChange={(v)=>!v && setGrant(null)}>
        <DialogContent className="parchment gold-frame max-w-lg">
          <DialogHeader><DialogTitle className="font-[family-name:var(--font-cinzel)] parchment-heading">Даровать достижение</DialogTitle><DialogDescription className="sr-only">Выберите героя для дарования достижения</DialogDescription></DialogHeader>
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
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm({});
  }, [item, open]);
  const getVal = (f:string) => (form[f] !== undefined ? form[f] : current[f] ?? "");
  const setVal = (f:string,v:any) => setForm({...form,[f]:v});
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="parchment gold-frame max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-[family-name:var(--font-cinzel)] text-xl parchment-heading">{item?.id?"Редактировать":"Создать"} достижение</DialogTitle>
          <DialogDescription className="sr-only">Форма редактирования достижения</DialogDescription>
        </DialogHeader>
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
            <p className="parchment-muted text-sm mt-1 italic">Достижение вручится само, когда условие исполнится.</p>
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
  const [itemsChar, setItemsChar] = useState<any>(null);

  const update = useMutation({
    mutationFn: async (item:any) => fetch("/api/characters",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:item.id,xp:Number(item.xp),level:Number(item.level),guildRankId:item.guildRankId,isAdventurer:item.isAdventurer !== undefined ? Boolean(item.isAdventurer) : undefined})}).then(r=>r.json()),
    onSuccess:()=>{setEditing(null);qc.invalidateQueries({queryKey:["characters"]});qc.invalidateQueries({queryKey:["me"]});toast({title:"Герой обновлён"});},
    onError:(e:Error)=>{toast({title:"Ошибка",description:e.message,variant:"destructive"});},
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
                <p className="parchment-muted text-sm">{c.race ?? "—"} · {c.charClass ?? "—"} · Ур.{c.level} · {c.xp} XP · {c.guildRank?.name ?? "Без ранга"}</p>
              </div>
            </div>
            {editing?.id === c.id ? (
              <div className="space-y-2 pt-2 border-t border-parchment-dark/20">
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="parchment-heading text-sm">Опыт</Label><Input type="number" value={editing.xp} onChange={e=>setEditing({...editing,xp:e.target.value})} className="bg-parchment/60 border-parchment-dark/40"/></div>
                  <div><Label className="parchment-heading text-sm">Уровень</Label><Input type="number" value={editing.level} onChange={e=>setEditing({...editing,level:e.target.value})} className="bg-parchment/60 border-parchment-dark/40"/></div>
                </div>
                <div><Label className="parchment-heading text-sm">Ранг</Label>
                  <Select value={editing.guildRankId ?? ""} onValueChange={v=>setEditing({...editing,guildRankId:v})}>
                    <SelectTrigger className="bg-parchment/60 border-parchment-dark/40"><SelectValue placeholder="Ранг..."/></SelectTrigger>
                    <SelectContent className="parchment">{(ranks ?? []).map(r=><SelectItem key={r.id} value={r.id}>{r.icon} {r.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {/* Is Adventurer toggle */}
                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input type="checkbox" checked={editing.isAdventurer !== false} onChange={e=>setEditing({...editing,isAdventurer:e.target.checked})} className="w-5 h-5 rounded accent-wine" />
                  <Label className="parchment-heading text-sm">Авантюрист (показывается в «Братья по оружию»)</Label>
                </label>
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
              <p className="parchment-heading text-sm uppercase tracking-wider mb-1.5">Достижения ({c.achievements?.length ?? 0})</p>
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

            {/* Inventory — open the grant/revoke dialog */}
            <div className="pt-2 border-t border-parchment-dark/20">
              <Button size="sm" variant="outline" onClick={()=>setItemsChar(c)} className="border-gold/30 text-gold hover:bg-gold/10 btn-rune w-full">
                <Gem className="w-3.5 h-3.5 mr-1.5" /> Магические предметы
              </Button>
            </div>
          </ParchmentCard>
        ))}
        {(data ?? []).length === 0 && <p className="col-span-full text-center parchment-muted italic py-8">Героев пока нет.</p>}
      </div>

      {itemsChar && (
        <CharacterInventoryDialog
          key={itemsChar.id}
          character={itemsChar}
          onClose={()=>setItemsChar(null)}
        />
      )}
    </div>
  );
}

/* ===== CHARACTER INVENTORY DIALOG — выдать/забрать предметы ===== */
function CharacterInventoryDialog({ character, onClose }: { character: any; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selectedLabId, setSelectedLabId] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [kindFilter, setKindFilter] = useState<string>("ITEM");

  // Inventory for this character
  const { data: items, isLoading } = useQuery<any[]>({
    queryKey: ["inventory", character.id],
    queryFn: () => fetch(`/api/characters/${character.id}/inventory`).then((r) => r.json()),
  });

  // All lab entries — used for the grant dropdown
  const { data: labEntries } = useQuery<any[]>({
    queryKey: ["lab-for-grant"],
    queryFn: () => fetch("/api/lab").then((r) => r.json()),
  });

  const grant = useMutation({
    mutationFn: async ({ labEntryId, note: noteText }: { labEntryId: string; note?: string }) =>
      fetch(`/api/characters/${character.id}/inventory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labEntryId, note: noteText || undefined }),
      }).then((r) => {
        if (!r.ok) throw new Error("Не удалось выдать");
        return r.json();
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory", character.id] });
      qc.invalidateQueries({ queryKey: ["me"] });
      setSelectedLabId("");
      setNote("");
      toast({ title: "Предмет выдан" });
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const revoke = useMutation({
    mutationFn: async (itemId: string) =>
      fetch(`/api/characters/${character.id}/inventory/${itemId}`, { method: "DELETE" }).then((r) => {
        if (!r.ok) throw new Error("Не удалось забрать");
        return r.json();
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory", character.id] });
      qc.invalidateQueries({ queryKey: ["me"] });
      toast({ title: "Предмет забран" });
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const labOptions = (labEntries ?? []).filter((e) => kindFilter === "ALL" || e.kind === kindFilter);
  const itemList = items ?? [];

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="parchment gold-frame max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-[family-name:var(--font-cinzel)] text-xl parchment-heading flex items-center gap-2">
            <Gem className="w-5 h-5 text-gold" />
            Магические предметы: {character.name}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Управление инвентарём магических предметов героя
          </DialogDescription>
        </DialogHeader>

        {/* Current inventory */}
        <div className="space-y-2">
          <p className="parchment-heading text-sm uppercase tracking-wider">Текущие предметы ({itemList.length})</p>
          {isLoading ? (
            <p className="parchment-muted italic text-sm">Читаем опись...</p>
          ) : itemList.length === 0 ? (
            <p className="parchment-muted italic text-sm">У героя пока нет магических предметов.</p>
          ) : (
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {itemList.map((it: any) => {
                const lab = it.labEntry ?? {};
                return (
                  <div key={it.id} className="flex items-center gap-2 p-2 rounded border border-parchment-dark/30 bg-parchment/40">
                    <span className="text-lg shrink-0">{lab.icon ?? "💎"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-[family-name:var(--font-cinzel)] parchment-heading text-sm truncate">{lab.name ?? "—"}</span>
                        {lab.rarity && <RarityBadge rarity={lab.rarity} />}
                      </div>
                      {it.note && <p className="text-sm italic parchment-muted/80 truncate">“{it.note}”</p>}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => revoke.mutate(it.id)}
                      disabled={revoke.isPending}
                      className="text-destructive hover:bg-destructive/10 h-8 px-2 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Забрать
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Grant a new item */}
        <div className="space-y-2 pt-3 border-t border-parchment-dark/30">
          <p className="parchment-heading text-sm uppercase tracking-wider">Выдать новый предмет</p>
          <div>
            <Label className="parchment-heading text-sm">Тип записи</Label>
            <Select value={kindFilter} onValueChange={(v) => { setKindFilter(v); setSelectedLabId(""); }}>
              <SelectTrigger className="bg-parchment/60 border-parchment-dark/40 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent className="parchment">
                <SelectItem value="ITEM">💎 Предметы</SelectItem>
                <SelectItem value="SPELL">✨ Заклинания</SelectItem>
                <SelectItem value="RACE">🧬 Расы</SelectItem>
                <SelectItem value="CLASS">⚔️ Классы</SelectItem>
                <SelectItem value="SUBCLASS">🔱 Подклассы</SelectItem>
                <SelectItem value="ALL">⛓ Все записи</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="parchment-heading text-sm">Запись из Лаборатории Алого</Label>
            <Select value={selectedLabId} onValueChange={setSelectedLabId}>
              <SelectTrigger className="bg-parchment/60 border-parchment-dark/40 mt-1"><SelectValue placeholder="Выбери запись..." /></SelectTrigger>
              <SelectContent className="parchment max-h-60">
                {labOptions.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.icon ?? "🜂"} {e.name}{e.subtitle ? ` — ${e.subtitle}` : ""}
                  </SelectItem>
                ))}
                {labOptions.length === 0 && <SelectItem value="__none" disabled>Записей нет</SelectItem>}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="parchment-heading text-sm">Заметка (необязательно)</Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Как и за что предмет был дарован..."
              className="bg-parchment/60 border-parchment-dark/40 mt-1"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={onClose} className="parchment-muted">Закрыть</Button>
            <Button
              onClick={() => grant.mutate({ labEntryId: selectedLabId, note })}
              disabled={!selectedLabId || selectedLabId === "__none" || grant.isPending}
              className="bg-primary text-primary-foreground btn-rune"
            >
              <Gem className="w-3.5 h-3.5 mr-1" /> {grant.isPending ? "Выдаём..." : "Выдать"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ===== LAB EDITOR (Лаборатория Алого) — типоспецифичные формы ===== */
type LabKind = "RACE" | "SUBRACE" | "CLASS" | "SUBCLASS" | "SPELL" | "ITEM" | "TRAIT" | "BACKGROUND";

const LAB_KIND_LABEL: Record<LabKind, string> = {
  RACE: "🧬 Раса",
  SUBRACE: "🧬 Подраса",
  CLASS: "⚔️ Класс",
  SUBCLASS: "🔱 Подкласс (архетип)",
  SPELL: "✨ Заклинание",
  ITEM: "💎 Магический предмет",
  TRAIT: "⭐ Черта",
  BACKGROUND: "📖 Предыстория",
};

const LAB_KIND_ORDER: LabKind[] = ["RACE", "SUBRACE", "CLASS", "SUBCLASS", "SPELL", "ITEM", "TRAIT", "BACKGROUND"];

const SELECT_NONE = "__none";

const SPELL_LEVELS = ["Заговор", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
const SPELL_SCHOOLS = ["Ограждение", "Вызов", "Прорицание", "Очарование", "Преобразование", "Иллюзия", "Некромантия", "Порча"];
const RARITIES = ["COMMON", "RARE", "EPIC", "LEGENDARY", "MYTHIC"];

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

  const all = (data ?? []) as any[];
  const byKind = (k: LabKind) => all.filter((e) => e.kind === k).sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-[family-name:var(--font-cinzel)] text-lg text-gold">Лаборатория Алого</h3>
        <Button onClick={() => { setEditing({ kind: "RACE" }); setOpen(true); }} className="btn-rune bg-primary text-primary-foreground"><Plus className="w-4 h-4 mr-1" /> Создать</Button>
      </div>

      {all.length === 0 && <p className="text-center parchment-muted italic py-8">Свиток Алого пока пуст. Создай первую запись.</p>}

      {LAB_KIND_ORDER.map((k) => {
        const items = byKind(k);
        if (items.length === 0) return null;
        return (
          <div key={k} className="space-y-2">
            <div className="flex items-center gap-2 pt-2">
              <h4 className="font-[family-name:var(--font-cinzel)] text-sm text-gold/90 tracking-wide">{LAB_KIND_LABEL[k]}</h4>
              <Badge variant="outline" className="border-gold/30 text-gold/70 text-xs">{items.length}</Badge>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {items.map((e) => (
                <ParchmentCard key={e.id} className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-lg">{e.icon ?? "🜂"}</span>
                      <h4 className="font-[family-name:var(--font-cinzel)] parchment-heading truncate">{e.name}</h4>
                      {e.rarity && <RarityBadge rarity={e.rarity} />}
                    </div>
                    {e.subtitle && <p className="parchment-heading text-sm uppercase tracking-wider">{e.subtitle}</p>}
                    {e.kind === "SUBRACE" && e.raceParent && <p className="text-sm parchment-muted">⊙ {e.raceParent}</p>}
                    {e.kind === "SPELL" && (e.spellLevel || e.school) && (
                      <p className="text-sm parchment-muted">
                        {[e.spellLevel && (e.spellLevel === "Заговор" ? "Заговор" : `${e.spellLevel} круг`), e.school].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    {e.kind === "ITEM" && e.itemType && <p className="text-sm parchment-muted">{e.itemType}</p>}
                    <p className="parchment-muted text-sm line-clamp-2 mt-1">{e.description}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(e); setOpen(true); }} className="text-wine"><Pencil className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => { if (confirm(`Стёреть запись «${e.name}»?`)) del.mutate(e.id); }} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </ParchmentCard>
              ))}
            </div>
          </div>
        );
      })}

      <LabFormDialog key={editing?.id ?? "new"} open={open} onOpenChange={setOpen} item={editing} onSave={(it) => save.mutate(it)} pending={save.isPending} />
    </div>
  );
}

/* ---- Reusable field primitives for the Lab form ---- */
function LabField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="parchment-heading text-sm">{label}</Label>
      {children}
    </div>
  );
}

function LabInput({ value, onChange, placeholder, type }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="bg-parchment/60 border-parchment-dark/40" />;
}

function LabTextarea({ value, onChange, rows = 3, placeholder }: { value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) {
  return <Textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} placeholder={placeholder} className="bg-parchment/60 border-parchment-dark/40" />;
}

function LabSelect({ value, onChange, options, placeholder, allowNone }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] | string[]; placeholder?: string; allowNone?: boolean }) {
  const opts = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  const val = value || (allowNone ? SELECT_NONE : opts[0]?.value ?? "");
  return (
    <Select value={val} onValueChange={(v) => onChange(v === SELECT_NONE ? "" : v)}>
      <SelectTrigger className="bg-parchment/60 border-parchment-dark/40"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent className="parchment">
        {allowNone && <SelectItem value={SELECT_NONE}>{placeholder ?? "(не выбрано)"}</SelectItem>}
        {opts.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function LabFormDialog({ open, onOpenChange, item, onSave, pending }: { open: boolean; onOpenChange: (v: boolean) => void; item: any; onSave: (i: any) => void; pending: boolean }) {
  const current = item ?? {};
  const [form, setForm] = useState<any>({});
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm({});
  }, [item, open]);
  const getVal = (f: string) => (form[f] !== undefined ? form[f] : current[f] ?? "");
  const setVal = (f: string, v: any) => setForm({ ...form, [f]: v });

  const kind: LabKind = (getVal("kind") || "RACE") as LabKind;
  const isExisting = !!item?.id;

  const handleSave = () => {
    const clean = { ...current, ...form };
    // Convert SELECT_NONE back to empty string for select-based optional fields.
    for (const k of ["rarity", "ritual", "school", "spellLevel"]) {
      if (clean[k] === SELECT_NONE) clean[k] = "";
    }
    // Ensure kind is set for new entries.
    if (!clean.kind) clean.kind = "RACE";
    if (!clean.order && clean.order !== 0) clean.order = 0;
    onSave(clean);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="parchment gold-frame max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-[family-name:var(--font-cinzel)] text-xl parchment-heading">{isExisting ? "Редактировать" : "Создать"} запись Лаборатории</DialogTitle>
          <DialogDescription className="sr-only">Форма редактирования записи Лаборатории Алого</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {/* Kind selector — fixed for existing entries */}
          <LabField label="Тип записи">
            <Select value={kind} onValueChange={(v) => setVal("kind", v)} disabled={isExisting}>
              <SelectTrigger className="bg-parchment/60 border-parchment-dark/40"><SelectValue /></SelectTrigger>
              <SelectContent className="parchment">
                {LAB_KIND_ORDER.map((k) => <SelectItem key={k} value={k}>{LAB_KIND_LABEL[k]}</SelectItem>)}
              </SelectContent>
            </Select>
          </LabField>

          {/* ===== RACE ===== */}
          {kind === "RACE" && (
            <>
              <LabField label="Название"><LabInput value={getVal("name")} onChange={(v) => setVal("name", v)} /></LabField>
              <LabField label="Описание"><LabTextarea value={getVal("description")} onChange={(v) => setVal("description", v)} rows={3} /></LabField>
              <LabField label="Механическая составляющая (details)"><LabTextarea value={getVal("details") || ""} onChange={(v) => setVal("details", v)} rows={5} placeholder="Особенности расы, черты, бонусы — каждое с новой строки" /></LabField>
              <ImageUpload label="Иллюстрация (изображение)" value={getVal("image") || null} onChange={(v) => setVal("image", v)} aspect="aspect-video" />
              <LabField label="Иконка (эмодзи)"><LabInput value={getVal("icon") || ""} onChange={(v) => setVal("icon", v)} placeholder="🧬" /></LabField>
            </>
          )}

          {/* ===== SUBRACE ===== */}
          {kind === "SUBRACE" && (
            <>
              <LabField label="Название"><LabInput value={getVal("name")} onChange={(v) => setVal("name", v)} /></LabField>
              <LabField label="Раса-прародитель"><LabInput value={getVal("raceParent") || ""} onChange={(v) => setVal("raceParent", v)} placeholder="напр. Эльф" /></LabField>
              <LabField label="Описание"><LabTextarea value={getVal("description")} onChange={(v) => setVal("description", v)} rows={3} /></LabField>
              <LabField label="Механическая составляющая (details)"><LabTextarea value={getVal("details") || ""} onChange={(v) => setVal("details", v)} rows={5} placeholder="Особенности подрасы, черты, бонусы — каждое с новой строки" /></LabField>
              <ImageUpload label="Иллюстрация (изображение)" value={getVal("image") || null} onChange={(v) => setVal("image", v)} aspect="aspect-video" />
              <LabField label="Иконка (эмодзи)"><LabInput value={getVal("icon") || ""} onChange={(v) => setVal("icon", v)} placeholder="🧬" /></LabField>
            </>
          )}

          {/* ===== CLASS ===== */}
          {kind === "CLASS" && (
            <>
              <LabField label="Название"><LabInput value={getVal("name")} onChange={(v) => setVal("name", v)} /></LabField>
              <LabField label="Описание"><LabTextarea value={getVal("description")} onChange={(v) => setVal("description", v)} rows={6} /></LabField>
              <LabField label="Иконка (эмодзи)"><LabInput value={getVal("icon") || ""} onChange={(v) => setVal("icon", v)} placeholder="⚔️" /></LabField>
            </>
          )}

          {/* ===== SUBCLASS ===== */}
          {kind === "SUBCLASS" && (
            <>
              <LabField label="Название"><LabInput value={getVal("name")} onChange={(v) => setVal("name", v)} /></LabField>
              <LabField label="Класс (subtitle)"><LabInput value={getVal("subtitle") || ""} onChange={(v) => setVal("subtitle", v)} placeholder="напр. Паладин" /></LabField>
              <LabField label="Описание"><LabTextarea value={getVal("description")} onChange={(v) => setVal("description", v)} rows={6} /></LabField>
              <LabField label="Иконка (эмодзи)"><LabInput value={getVal("icon") || ""} onChange={(v) => setVal("icon", v)} placeholder="🔱" /></LabField>
            </>
          )}

          {/* ===== SPELL ===== */}
          {kind === "SPELL" && (
            <>
              <LabField label="Название"><LabInput value={getVal("name")} onChange={(v) => setVal("name", v)} /></LabField>
              <div className="grid sm:grid-cols-2 gap-3">
                <LabField label="Уровень (spellLevel)">
                  <LabSelect value={getVal("spellLevel") || ""} onChange={(v) => setVal("spellLevel", v)} options={SPELL_LEVELS} allowNone placeholder="(не выбрано)" />
                </LabField>
                <LabField label="Школа (school)">
                  <LabSelect value={getVal("school") || ""} onChange={(v) => setVal("school", v)} options={SPELL_SCHOOLS} allowNone placeholder="(не выбрано)" />
                </LabField>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <LabField label="Концентрация"><LabInput value={getVal("concentration") || ""} onChange={(v) => setVal("concentration", v)} placeholder="напр. Да, до 1 минуты" /></LabField>
                <LabField label="Ритуал">
                  <LabSelect value={getVal("ritual") || ""} onChange={(v) => setVal("ritual", v)} options={["Да", "Нет"]} allowNone placeholder="(не выбрано)" />
                </LabField>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <LabField label="Компоненты"><LabInput value={getVal("components") || ""} onChange={(v) => setVal("components", v)} placeholder="напр. В, С, М (перышко)" /></LabField>
                <LabField label="Время накладывания"><LabInput value={getVal("castingTime") || ""} onChange={(v) => setVal("castingTime", v)} placeholder="напр. 1 действие" /></LabField>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <LabField label="Дистанция"><LabInput value={getVal("spellRange") || ""} onChange={(v) => setVal("spellRange", v)} placeholder="напр. 18 м" /></LabField>
                <LabField label="Классы"><LabInput value={getVal("spellClasses") || ""} onChange={(v) => setVal("spellClasses", v)} placeholder="напр. Жрец, Друид" /></LabField>
              </div>
              <LabField label="Описание"><LabTextarea value={getVal("description")} onChange={(v) => setVal("description", v)} rows={5} /></LabField>
              <LabField label="Иконка (эмодзи)"><LabInput value={getVal("icon") || ""} onChange={(v) => setVal("icon", v)} placeholder="✨" /></LabField>
            </>
          )}

          {/* ===== ITEM ===== */}
          {kind === "ITEM" && (
            <>
              <LabField label="Название"><LabInput value={getVal("name")} onChange={(v) => setVal("name", v)} /></LabField>
              <div className="grid sm:grid-cols-2 gap-3">
                <LabField label="Редкость">
                  <LabSelect value={getVal("rarity") || ""} onChange={(v) => setVal("rarity", v)} options={RARITIES} allowNone placeholder="(не выбрано)" />
                </LabField>
                <LabField label="Тип предмета (itemType)"><LabInput value={getVal("itemType") || ""} onChange={(v) => setVal("itemType", v)} placeholder="напр. Доспех, Кольцо" /></LabField>
              </div>
              <LabField label="Настройка (attunement)"><LabInput value={getVal("attunement") || ""} onChange={(v) => setVal("attunement", v)} placeholder="напр. Да, требует владения магией" /></LabField>
              <LabField label="Описание"><LabTextarea value={getVal("description")} onChange={(v) => setVal("description", v)} rows={5} /></LabField>
              <ImageUpload label="Иллюстрация (изображение)" value={getVal("image") || null} onChange={(v) => setVal("image", v)} aspect="aspect-video" />
              <LabField label="Иконка (эмодзи)"><LabInput value={getVal("icon") || ""} onChange={(v) => setVal("icon", v)} placeholder="💎" /></LabField>
            </>
          )}

          {/* ===== TRAIT ===== */}
          {kind === "TRAIT" && (
            <>
              <LabField label="Название"><LabInput value={getVal("name")} onChange={(v) => setVal("name", v)} /></LabField>
              <LabField label="Описание"><LabTextarea value={getVal("description")} onChange={(v) => setVal("description", v)} rows={6} /></LabField>
            </>
          )}

          {/* ===== BACKGROUND ===== */}
          {kind === "BACKGROUND" && (
            <>
              <LabField label="Название"><LabInput value={getVal("name")} onChange={(v) => setVal("name", v)} /></LabField>
              <LabField label="Описание"><LabTextarea value={getVal("description")} onChange={(v) => setVal("description", v)} rows={4} /></LabField>
              <LabField label="Механическая составляющая (details)"><LabTextarea value={getVal("details") || ""} onChange={(v) => setVal("details", v)} rows={5} placeholder="Навыки, снаряжение, черты — каждое с новой строки" /></LabField>
            </>
          )}

          {/* Common: order */}
          <LabField label="Порядок (сортировка)"><LabInput type="number" value={getVal("order") || 0} onChange={(v) => setVal("order", Number(v))} /></LabField>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="parchment-muted">Отмена</Button>
          <Button onClick={handleSave} disabled={pending} className="bg-primary text-primary-foreground btn-rune">{pending ? "Пишем..." : "Сохранить"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ===== USERS EDITOR (управление пользователями) ===== */
function UsersEditor() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: users } = useQuery<any[]>({
    queryKey: ["admin-users"],
    queryFn: () => fetch("/api/admin/users").then((r) => r.json()),
  });
  const [creating, setCreating] = useState(false);

  const createMut = useMutation({
    mutationFn: async (body: any) =>
      fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json()),
    onSuccess: (res) => {
      if (res.error) { toast({ title: "Ошибка", description: res.error, variant: "destructive" }); return; }
      toast({ title: "Герой рождён", description: "Пользователь создан." });
      setCreating(false);
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, role, password }: { id: string; role?: string; password?: string }) =>
      fetch(`/api/admin/users/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role, password }) }).then((r) => r.json()),
    onSuccess: (res) => {
      if (res.error) { toast({ title: "Ошибка", description: res.error, variant: "destructive" }); return; }
      toast({ title: "Обновлено" });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  const delMut = useMutation({
    mutationFn: (id: string) => fetch(`/api/admin/users/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: (res) => {
      if (res.error) { toast({ title: "Ошибка", description: res.error, variant: "destructive" }); return; }
      toast({ title: "Странник покинул мир" });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-[family-name:var(--font-cinzel)] text-lg text-gold">Пользователи мира</h3>
        <Button onClick={() => setCreating(true)} className="btn-rune bg-primary text-primary-foreground"><UserPlus className="w-4 h-4 mr-1" /> Создать</Button>
      </div>
      <p className="parchment-muted text-sm italic">Здесь ты создаёшь аккаунты героев и Божеств, назначаешь роли и сбрасываешь пароли.</p>
      <div className="grid md:grid-cols-2 gap-3">
        {(users ?? []).map((u) => (
          <ParchmentCard key={u.id} className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h4 className="font-[family-name:var(--font-cinzel)] parchment-heading truncate">{u.name}</h4>
                <p className="parchment-muted text-sm truncate">{u.email}</p>
              </div>
              <Badge variant="outline" className={u.role === "ADMIN" ? "border-gold/40 text-gold" : "border-wine/30 text-wine"}>
                {u.role === "ADMIN" ? "✦ Божество" : "⚔ Авантюрист"}
              </Badge>
            </div>
            {u.character && (
              <p className="text-sm parchment-muted">Герой: {u.character.name} · Ур.{u.character.level} · {u.character.xp} XP</p>
            )}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-parchment-dark/20">
              <Button size="sm" variant="outline" onClick={() => {
                const newRole = u.role === "ADMIN" ? "PLAYER" : "ADMIN";
                updateMut.mutate({ id: u.id, role: newRole });
              }} className="btn-parchment h-8 px-3 text-sm">
                Сделать {u.role === "ADMIN" ? "Авантюристом" : "Божеством"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => {
                const pw = prompt(`Новый пароль для ${u.name} (мин. 6 символов):`);
                if (pw && pw.length >= 6) updateMut.mutate({ id: u.id, password: pw });
                else if (pw) toast({ title: "Слишком короткий", variant: "destructive" });
              }} className="btn-parchment h-8 px-3 text-sm">
                <KeyRound className="w-3.5 h-3.5 mr-1" /> Сбросить пароль
              </Button>
              <Button size="sm" variant="ghost" onClick={() => {
                if (confirm(`Удалить ${u.name}? Все его данные будут стёрты.`)) delMut.mutate(u.id);
              }} className="text-destructive hover:bg-destructive/10 h-8 px-3 text-sm">
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Удалить
              </Button>
            </div>
          </ParchmentCard>
        ))}
        {(users ?? []).length === 0 && <p className="col-span-full text-center parchment-muted italic py-8">Загрузка...</p>}
      </div>

      {/* Create user dialog */}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="parchment gold-frame max-w-md">
          <DialogHeader><DialogTitle className="font-[family-name:var(--font-cinzel)] text-xl parchment-heading">Создать пользователя</DialogTitle></DialogHeader>
          <CreateUserForm onSave={(body) => createMut.mutate(body)} pending={createMut.isPending} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreateUserForm({ onSave, pending }: { onSave: (body: any) => void; pending: boolean }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("PLAYER");
  const [characterName, setCharacterName] = useState("");
  return (
    <div className="space-y-3">
      <div><Label className="parchment-heading text-sm">Имя (игрок или персонаж)</Label><Input value={name} onChange={(e) => setName(e.target.value)} className="bg-parchment/60 border-parchment-dark/40" /></div>
      <div><Label className="parchment-heading text-sm">Email (знак для входа)</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-parchment/60 border-parchment-dark/40" /></div>
      <div><Label className="parchment-heading text-sm">Пароль (мин. 6 символов)</Label><Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-parchment/60 border-parchment-dark/40" /></div>
      <div>
        <Label className="parchment-heading text-sm">Роль</Label>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className="bg-parchment/60 border-parchment-dark/40"><SelectValue /></SelectTrigger>
          <SelectContent className="parchment">
            <SelectItem value="PLAYER">⚔ Авантюрист (игрок)</SelectItem>
            <SelectItem value="ADMIN">✦ Божество (админ)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {role === "PLAYER" && (
        <div><Label className="parchment-heading text-sm">Имя персонажа (необязательно)</Label><Input value={characterName} onChange={(e) => setCharacterName(e.target.value)} placeholder="напр. Тэодрик Зорестрелец" className="bg-parchment/60 border-parchment-dark/40" /></div>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <Button onClick={() => onSave({ name, email, password, role, characterName: characterName || undefined })} disabled={pending || !name || !email || !password} className="bg-primary text-primary-foreground btn-rune">
          {pending ? "Создаём..." : "Создать"}
        </Button>
      </div>
    </div>
  );
}

/* ===== GROUPS EDITOR (группы игроков + НПС) ===== */
function GroupsEditor() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: groups } = useQuery<any[]>({ queryKey: ["groups"], queryFn: () => fetch("/api/groups").then((r) => r.json()) });
  const { data: characters } = useQuery<any[]>({ queryKey: ["characters"], queryFn: () => fetch("/api/characters").then((r) => r.json()) });
  const { data: personalities } = useQuery<any[]>({ queryKey: ["personalities"], queryFn: () => fetch("/api/lore/personalities").then((r) => r.json()) });
  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [addMemberGroup, setAddMemberGroup] = useState<string | null>(null);
  const [addNpcGroup, setAddNpcGroup] = useState<string | null>(null);

  const createMut = useMutation({
    mutationFn: async (b: any) => fetch("/api/groups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }).then((r) => r.json()),
    onSuccess: (res) => { if (res.error) { toast({ title: "Ошибка", description: res.error, variant: "destructive" }); return; } setCreating(false); qc.invalidateQueries({ queryKey: ["groups"] }); toast({ title: "Группа создана" }); },
  });
  const delMut = useMutation({ mutationFn: (id: string) => fetch(`/api/groups/${id}`, { method: "DELETE" }).then((r) => r.json()), onSuccess: () => { qc.invalidateQueries({ queryKey: ["groups"] }); toast({ title: "Группа распущена" }); } });

  const addMemberMut = useMutation({
    mutationFn: async ({ groupId, characterId, role }: any) => fetch(`/api/groups/${groupId}/members`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId, role }) }).then((r) => r.json()),
    onSuccess: () => { setAddMemberGroup(null); qc.invalidateQueries({ queryKey: ["groups"] }); toast({ title: "Игрок добавлен" }); },
  });
  const removeMemberMut = useMutation({
    mutationFn: async ({ groupId, characterId }: any) => fetch(`/api/groups/${groupId}/members?characterId=${characterId}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["groups"] }); toast({ title: "Игрок исключён" }); },
  });
  const addNpcMut = useMutation({
    mutationFn: async ({ groupId, personalityId, role, notes }: any) => fetch(`/api/groups/${groupId}/npcs`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ personalityId, role, notes }) }).then((r) => r.json()),
    onSuccess: () => { setAddNpcGroup(null); qc.invalidateQueries({ queryKey: ["groups"] }); toast({ title: "НПС приписан" }); },
  });
  const removeNpcMut = useMutation({
    mutationFn: async ({ groupId, personalityId }: any) => fetch(`/api/groups/${groupId}/npcs?personalityId=${personalityId}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["groups"] }); toast({ title: "НПС убран" }); },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-[family-name:var(--font-cinzel)] text-lg text-gold">Группы игроков</h3>
        <Button onClick={() => setCreating(true)} className="btn-rune bg-primary text-primary-foreground"><Plus className="w-4 h-4 mr-1" /> Создать группу</Button>
      </div>
      <p className="parchment-muted text-sm italic">Группируй игроков одной кампании. К группе можно приписать НПС, с которыми группа встретилась и контактировала.</p>

      {(groups ?? []).map((g) => (
        <ParchmentCard key={g.id} className="space-y-3">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-lg overflow-hidden gold-frame shrink-0 bg-parchment-dark/20 flex items-center justify-center">
                {g.image ? <img src={g.image} alt={g.name} className="w-full h-full object-cover" /> : <span className="text-2xl">⚔️</span>}
              </div>
              <div>
                <h4 className="font-[family-name:var(--font-cinzel)] parchment-heading text-lg">{g.name}</h4>
                {g.description && <p className="parchment-muted text-sm">{g.description}</p>}
              </div>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => setExpanded(expanded === g.id ? null : g.id)} className="btn-parchment h-8 px-3 text-sm">{expanded === g.id ? "Свернуть" : "Открыть"}</Button>
              <Button size="icon" variant="ghost" onClick={() => { if (confirm("Распустить группу?")) delMut.mutate(g.id); }} className="text-destructive hover:bg-destructive/10 h-8 w-8"><Trash2 className="w-4 h-4" /></Button>
            </div>
          </div>

          {expanded === g.id && (
            <div className="pt-3 border-t border-parchment-dark/20 space-y-4">
              {/* Members */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="parchment-heading text-sm">Игроки ({g.members?.length || 0})</p>
                  <Button size="sm" variant="ghost" onClick={() => setAddMemberGroup(g.id)} className="btn-parchment h-7 px-2 text-sm"><Plus className="w-3 h-3 mr-1" /> Добавить</Button>
                </div>
                <div className="grid sm:grid-cols-2 gap-2">
                  {(g.members ?? []).map((m: any) => (
                    <div key={m.id} className="flex items-center gap-2 p-2 rounded border border-parchment-dark/20 bg-parchment/40">
                      <div className="w-8 h-8 rounded overflow-hidden bg-parchment-dark/20 shrink-0 flex items-center justify-center">
                        {m.character?.portrait ? <img src={m.character.portrait} alt="" className="w-full h-full object-cover" /> : <span className="text-sm">⚔️</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-[family-name:var(--font-cinzel)] text-sm parchment-heading truncate">{m.character?.name}</p>
                        <p className="text-sm parchment-muted">{m.role || "Член"} · {m.character?.race} {m.character?.charClass}</p>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => removeMemberMut.mutate({ groupId: g.id, characterId: m.characterId })} className="text-destructive hover:bg-destructive/10 h-6 w-6 shrink-0"><X className="w-3 h-3" /></Button>
                    </div>
                  ))}
                  {(g.members ?? []).length === 0 && <p className="parchment-muted text-sm italic">Игроков пока нет.</p>}
                </div>
                {addMemberGroup === g.id && (
                  <div className="mt-2 flex gap-2 items-end">
                    <select id={`m-${g.id}`} className="flex-1 px-2 py-1.5 rounded border border-parchment-dark/40 bg-parchment/60 parchment-text text-sm">
                      {(characters ?? []).filter((c) => !(g.members ?? []).some((m: any) => m.characterId === c.id)).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <input id={`r-${g.id}`} placeholder="роль" className="px-2 py-1.5 rounded border border-parchment-dark/40 bg-parchment/60 parchment-text text-sm w-28" />
                    <Button size="sm" onClick={() => { const sel = document.getElementById(`m-${g.id}`) as HTMLSelectElement; const role = (document.getElementById(`r-${g.id}`) as HTMLInputElement).value; addMemberMut.mutate({ groupId: g.id, characterId: sel.value, role: role || undefined }); }} className="btn-wine-solid h-8 px-3 text-sm">Добавить</Button>
                    <Button size="sm" variant="ghost" onClick={() => setAddMemberGroup(null)} className="btn-parchment h-8 px-3 text-sm">Отмена</Button>
                  </div>
                )}
              </div>

              {/* NPCs */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="parchment-heading text-sm">Встреченные НПС ({g.npcs?.length || 0})</p>
                  <Button size="sm" variant="ghost" onClick={() => setAddNpcGroup(g.id)} className="btn-parchment h-7 px-2 text-sm"><Plus className="w-3 h-3 mr-1" /> Приписать</Button>
                </div>
                <div className="grid sm:grid-cols-2 gap-2">
                  {(g.npcs ?? []).map((n: any) => (
                    <div key={n.id} className="flex items-start gap-2 p-2 rounded border border-parchment-dark/20 bg-parchment/40">
                      <div className="w-8 h-8 rounded overflow-hidden bg-parchment-dark/20 shrink-0 flex items-center justify-center">
                        {n.personality?.portrait ? <img src={n.personality.portrait} alt="" className="w-full h-full object-cover" /> : <span className="text-sm">👤</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-[family-name:var(--font-cinzel)] text-sm parchment-heading truncate">{n.personality?.name}</p>
                        <p className="text-sm parchment-muted">{n.role || "Контакт"}{n.notes ? ` · ${n.notes}` : ""}</p>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => removeNpcMut.mutate({ groupId: g.id, personalityId: n.personalityId })} className="text-destructive hover:bg-destructive/10 h-6 w-6 shrink-0"><X className="w-3 h-3" /></Button>
                    </div>
                  ))}
                  {(g.npcs ?? []).length === 0 && <p className="parchment-muted text-sm italic">НПС пока не приписаны.</p>}
                </div>
                {addNpcGroup === g.id && (
                  <div className="mt-2 space-y-2">
                    <select id={`npc-${g.id}`} className="w-full px-2 py-1.5 rounded border border-parchment-dark/40 bg-parchment/60 parchment-text text-sm">
                      <optgroup label="Личности (НПС)">
                      {(personalities ?? []).filter((p) => p.isNpc && !(g.npcs ?? []).some((n: any) => n.personalityId === p.id)).map((p) => <option key={p.id} value={p.id}>{p.name}{p.title ? ` — ${p.title}` : ""}</option>)}
                      </optgroup>
                      <optgroup label="Все личности">
                      {(personalities ?? []).filter((p) => !p.isNpc && !(g.npcs ?? []).some((n: any) => n.personalityId === p.id)).map((p) => <option key={p.id} value={p.id}>{p.name}{p.title ? ` — ${p.title}` : ""}</option>)}
                      </optgroup>
                    </select>
                    <input id={`nrole-${g.id}`} placeholder="роль (Союзник/Контакт/Враг...)" className="w-full px-2 py-1.5 rounded border border-parchment-dark/40 bg-parchment/60 parchment-text text-sm" />
                    <input id={`nnotes-${g.id}`} placeholder="заметки" className="w-full px-2 py-1.5 rounded border border-parchment-dark/40 bg-parchment/60 parchment-text text-sm" />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => { const npc = (document.getElementById(`npc-${g.id}`) as HTMLSelectElement).value; const role = (document.getElementById(`nrole-${g.id}`) as HTMLInputElement).value; const notes = (document.getElementById(`nnotes-${g.id}`) as HTMLInputElement).value; addNpcMut.mutate({ groupId: g.id, personalityId: npc, role: role || undefined, notes: notes || undefined }); }} className="btn-wine-solid h-8 px-3 text-sm">Приписать</Button>
                      <Button size="sm" variant="ghost" onClick={() => setAddNpcGroup(null)} className="btn-parchment h-8 px-3 text-sm">Отмена</Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </ParchmentCard>
      ))}
      {(groups ?? []).length === 0 && <p className="text-center parchment-muted italic py-8">Групп пока нет. Создай первую, чтобы объединить игроков.</p>}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="parchment gold-frame max-w-md">
          <DialogHeader><DialogTitle className="font-[family-name:var(--font-cinzel)] text-xl parchment-heading">Создать группу</DialogTitle></DialogHeader>
          <GroupForm onSave={(b) => createMut.mutate(b)} pending={createMut.isPending} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GroupForm({ onSave, pending }: { onSave: (b: any) => void; pending: boolean }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      <div><Label className="parchment-heading text-sm">Название группы</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="напр. Компания «Серебряное Пламя»" className="bg-parchment/60 border-parchment-dark/40" /></div>
      <div><Label className="parchment-heading text-sm">Описание</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Краткое описание группы" className="bg-parchment/60 border-parchment-dark/40" /></div>
      <ImageUpload label="Герб / эмблема" value={image} onChange={setImage} aspect="aspect-video" />
      <div className="flex justify-end gap-2 pt-2">
        <Button onClick={() => onSave({ name, description, image: image || undefined })} disabled={!name || pending} className="bg-primary text-primary-foreground btn-rune">{pending ? "Создаём..." : "Создать"}</Button>
      </div>
    </div>
  );
}

/* ===== CONTENT EDITOR (редактируемые тексты страниц) ===== */
const CONTENT_KEYS = [
  // Зал (главная)
  { key: "hall_intro", label: "Зал — вступительный текст", section: "Зал" },
  // Карта мира — загружаемое изображение (JPG/PNG, до ~5MB)
  { key: "world_map_image", label: "🗺️ Карта мира — изображение", section: "Карта мира" },
  // Гильдия
  { key: "guild_history", label: "Гильдия — история", section: "Гильдия" },
  { key: "guild_motto", label: "Гильдия — девиз", section: "Гильдия" },
  { key: "guild_halls", label: "Гильдия — залы", section: "Гильдия" },
  { key: "guild_intro", label: "Гильдия — вступление", section: "Гильдия" },
  { key: "guild_ranks_intro", label: "Гильдия — вступление к рангам", section: "Гильдия" },
  // База Знаний
  { key: "knowledge_intro", label: "База Знаний — вступление", section: "База Знаний" },
  // Гримуар
  { key: "grimoire_intro", label: "Гримуар — вступление", section: "Гримуар" },
  // Лаборатория Алого
  { key: "lab_intro", label: "Лаборатория Алого — вступление", section: "Лаборатория Алого" },
];

function ContentEditor() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data } = useQuery<any[]>({ queryKey: ["site-content"], queryFn: () => fetch("/api/content").then((r) => r.json()) });
  const map: Record<string, any> = {};
  (Array.isArray(data) ? data : []).forEach((c: any) => { map[c.key] = c; });
  const [drafts, setDrafts] = useState<Record<string, { title: string; body: string; image: string | null }>>({});

  const saveMut = useMutation({
    mutationFn: async ({ key, title, body, image }: any) => fetch(`/api/content/${key}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, body, image }) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["site-content"] }); toast({ title: "Контент сохранён" }); },
  });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-[family-name:var(--font-cinzel)] text-lg text-gold">Контент страниц</h3>
        <p className="parchment-muted text-sm italic">Здесь ты редактируешь все вступительные тексты на страницах сайта. Изменения видны мгновенно.</p>
      </div>
      {/* Группировка по секциям */}
      {Object.entries(
        CONTENT_KEYS.reduce<Record<string, typeof CONTENT_KEYS>>((acc, ck) => {
          const s = ck.section || "Прочее";
          (acc[s] = acc[s] || []).push(ck);
          return acc;
        }, {})
      ).map(([section, keys]) => (
        <div key={section} className="space-y-3">
          <p className="parchment-heading text-sm uppercase tracking-wider text-wine">❖ {section}</p>
          {keys.map((ck) => {
            const cur = map[ck.key];
            const draft = drafts[ck.key];
            const title = draft ? draft.title : (cur?.title ?? "");
            const body = draft ? draft.body : (cur?.body ?? "");
            const image = draft ? draft.image : (cur?.image ?? null);
            const changed = draft && (draft.title !== (cur?.title ?? "") || draft.body !== (cur?.body ?? "") || draft.image !== (cur?.image ?? null));
            const isImageOnly = ck.key === "world_map_image";
            return (
              <ParchmentCard key={ck.key} className="space-y-3">
                <h4 className="font-[family-name:var(--font-cinzel)] parchment-heading text-base">{ck.label}</h4>
                {isImageOnly ? (
                  <>
                    <p className="text-sm parchment-muted">Загрузи изображение карты (JPG/PNG, до ~5MB). Рекомендуемый размер: 2048×1536 или больше. Карта будет отображаться в Зале и Базе Знаний → Страны с возможностью zoom/pan.</p>
                    <ImageUpload label="Изображение карты" value={image} onChange={(v) => setDrafts({ ...drafts, [ck.key]: { title: title, body: body, image: v } })} aspect="aspect-[4/3]" />
                  </>
                ) : (
                  <>
                    <div>
                      <Label className="parchment-heading text-sm">Заголовок</Label>
                      <Input value={title} onChange={(e) => setDrafts({ ...drafts, [ck.key]: { title: e.target.value, body, image } })} className="bg-parchment/60 border-parchment-dark/40 h-10" />
                    </div>
                    <div>
                      <Label className="parchment-heading text-sm">Текст</Label>
                      <Textarea value={body} onChange={(e) => setDrafts({ ...drafts, [ck.key]: { title, body: e.target.value, image } })} rows={5} className="bg-parchment/60 border-parchment-dark/40" />
                    </div>
                    <ImageUpload label="Изображение (опц.)" value={image} onChange={(v) => setDrafts({ ...drafts, [ck.key]: { title: title, body: body, image: v } })} aspect="aspect-video" />
                  </>
                )}
                <div className="flex justify-end">
                  <Button size="sm" onClick={() => { saveMut.mutate({ key: ck.key, title, body, image }); setDrafts({ ...drafts, [ck.key]: { title, body, image } }); }} disabled={!changed || saveMut.isPending} className="btn-wine-solid h-9 px-3">Сохранить</Button>
                </div>
              </ParchmentCard>
            );
          })}
        </div>
      ))}
    </div>
  );
}

