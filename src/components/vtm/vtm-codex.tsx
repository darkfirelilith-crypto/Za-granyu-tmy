"use client";

// ============================================================
// БАЗА ЗНАНИЙ — справочник по «Вампирам: Маскарад» (5 ред.):
// кланы, Дисциплины и их силы, механики костей и Крови, стили охоты,
// секты, поколения, преимущества. Только чтение — подсказки при создании.
// ============================================================

import { useMemo, useState } from "react";
import {
  CLANS,
  DISCIPLINES,
  DISCIPLINE_BY_ID,
  PREDATOR_TYPES,
  SECTS,
  GENERATIONS,
  BLOOD_POTENCY_TABLE,
  ADVANTAGE_LIBRARY,
  THINBLOOD_FORMULAS,
  THINBLOOD_RULES,
  ELYSIUM_RULES,
  COURT_TITLES,
} from "@/lib/vtm-data";
import { LORESHEETS, LORESHEET_RULES, DIABLERIE_BLOCKS } from "@/lib/vtm-histories";
import { POWER_SYSTEMS, DISCIPLINE_RULES } from "@/lib/vtm-discipline-systems";
import { V20_BLOCKS } from "@/lib/vtm-v20";
import { BLOOD_SORCERY_RITUALS, OBLIVION_CEREMONIES, RITUAL_RULES, RitualDef } from "@/lib/vtm-rituals";
import { CHRONICLE_TENETS, CONVICTION_EXAMPLES, FRENZY_TYPES, COMPULSIONS, FRENZY_RULES } from "@/lib/vtm-chronicle";
import { WEREWOLF_INTRO, WEREWOLF_FORMS, WEREWOLF_AUSPICES, WEREWOLF_TRIBES, WEREWOLF_WAYWARD, WEREWOLF_COEXIST } from "@/lib/vtm-werewolf";

type CodexTab = "clans" | "disciplines" | "rituals" | "chronicle" | "thinblood" | "mechanics" | "predators" | "advantages" | "histories" | "sects" | "v20" | "werewolf";

const TABS: { id: CodexTab; label: string; icon: string }[] = [
  { id: "clans", label: "Кланы", icon: "⛧" },
  { id: "disciplines", label: "Дисциплины", icon: "✦" },
  { id: "rituals", label: "Ритуалы", icon: "🔮" },
  { id: "chronicle", label: "Хроника", icon: "⚖" },
  { id: "thinblood", label: "Слабокровные", icon: "⚗" },
  { id: "mechanics", label: "Механики", icon: "🎲" },
  { id: "predators", label: "Стили охоты", icon: "🩸" },
  { id: "advantages", label: "Преимущества", icon: "◈" },
  { id: "histories", label: "Истории", icon: "📜" },
  { id: "sects", label: "Секты и эпохи", icon: "👑" },
  { id: "v20", label: "4-я ред. (V20)", icon: "🕰" },
  { id: "werewolf", label: "Оборотни", icon: "🐺" },
];

export function CodexSection() {
  const [tab, setTab] = useState<CodexTab>("clans");
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  return (
    <div className="space-y-4">
      {/* Навигация + поиск */}
      <div className="vtm-panel p-3 md:p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`vtm-btn !py-1.5 !px-3 !text-[0.77rem] ${tab === t.id ? "vtm-btn-blood" : "vtm-btn-ghost"}`}
              aria-pressed={tab === t.id}
            >
              <span aria-hidden>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>
        <input
          className="vtm-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="поиск по справочнику: клан, сила, изъян, Голод…"
          aria-label="Поиск по Базе знаний"
        />
        <p className="vtm-hint !text-[0.75rem]">
          Справочник по книге правил 5-й редакции (официальное русское издание). Читается при создании персонажа — сворачивай вкладку «База знаний», когда всё выписал.
        </p>
      </div>

      {tab === "clans" && <ClansCodex q={q} />}
      {tab === "disciplines" && <DisciplinesCodex q={q} />}
      {tab === "rituals" && <RitualsCodex q={q} />}
      {tab === "chronicle" && <ChronicleCodex q={q} />}
      {tab === "thinblood" && <ThinbloodCodex q={q} />}
      {tab === "mechanics" && <MechanicsCodex q={q} />}
      {tab === "predators" && <PredatorsCodex q={q} />}
      {tab === "advantages" && <AdvantagesCodex q={q} />}
      {tab === "histories" && <HistoriesCodex q={q} />}
      {tab === "sects" && <SectsCodex q={q} />}
      {tab === "v20" && <V20Codex q={q} />}
      {tab === "werewolf" && <WerewolfCodex q={q} />}
    </div>
  );
}

// ---------- Кланы ----------

function ClansCodex({ q }: { q: string }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const clans = useMemo(
    () => CLANS.filter((c) => !q || `${c.name} ${c.nick} ${c.description} ${c.bane} ${c.compulsion}`.toLowerCase().includes(q)),
    [q]
  );
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {clans.map((clan) => {
        const open = openId === clan.id;
        const discs = clan.disciplines.map((id) => DISCIPLINE_BY_ID.get(id)?.name || id).join(", ");
        return (
          <article key={clan.id} className="vtm-panel">
            <button
              className="w-full vtm-panel-head text-left cursor-pointer"
              onClick={() => setOpenId(open ? null : clan.id)}
              aria-expanded={open}
              aria-controls={`clan-${clan.id}`}
            >
              <span className="vtm-display text-[1.01rem] text-[#d9c7b6]">{clan.name}</span>
              <span className="vtm-hint !text-[0.73rem] ml-1">«{clan.nick}»</span>
              <span className="ml-auto vtm-label text-[0.73rem] text-[#a8863d]">{open ? "▲" : "▼"}</span>
            </button>
            <div id={`clan-${clan.id}`} className="p-4 space-y-2.5">
              <p className="text-[0.9rem] leading-relaxed text-[#c4ac9d]">{clan.description}</p>
              <p className="text-[0.83rem] italic leading-relaxed text-[#9c8072] border-l-2 border-[#3d1a20] pl-3">{clan.quote}</p>
              <div className="flex flex-wrap gap-1.5">
                <span className="vtm-stamp !text-[0.67rem]">Дисциплины: {discs}</span>
              </div>
              {open && (
                <>
                  <div className="vtm-frame rounded-md p-3 space-y-1" style={{ background: "rgba(194,43,48,0.05)" }}>
                    <span className="vtm-label text-[0.72rem] text-[#e8636b]">Изъян</span>
                    <p className="text-[0.84rem] leading-relaxed text-[#c4ac9d]">{clan.bane}</p>
                  </div>
                  <div className="vtm-frame rounded-md p-3 space-y-1" style={{ background: "rgba(168,134,61,0.05)" }}>
                    <span className="vtm-label text-[0.72rem] text-[#d6a840]">Принуждение клана</span>
                    <p className="text-[0.84rem] leading-relaxed text-[#c4ac9d]">{clan.compulsion}</p>
                  </div>
                </>
              )}
            </div>
          </article>
        );
      })}
      {clans.length === 0 && <p className="vtm-hint text-center py-6">Ни один клан не откликнулся.</p>}
    </div>
  );
}

// ---------- Дисциплины ----------

function DisciplinesCodex({ q }: { q: string }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const list = useMemo(
    () => DISCIPLINES.filter((d) => {
      if (!q) return true;
      if (`${d.name} ${d.description}`.toLowerCase().includes(q)) return true;
      return Object.values(d.powers).some((ps) => ps.some((p) => p.name.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q)));
    }),
    [q]
  );
  return (
    <div className="space-y-3">
      {list.map((disc) => {
        const open = openId === disc.id;
        return (
          <article key={disc.id} className="vtm-panel">
            <button
              className="w-full vtm-panel-head text-left cursor-pointer"
              onClick={() => setOpenId(open ? null : disc.id)}
              aria-expanded={open}
              aria-controls={`disc-${disc.id}`}
            >
              <span className="vtm-display text-[1.01rem] text-[#a877c0]">{disc.rare ? "✧ " : ""}{disc.name}</span>
              {disc.rare && <span className="vtm-hint !text-[0.68rem] uppercase ml-1">редкая</span>}
              <span className="ml-auto vtm-label text-[0.73rem] text-[#a8863d]">{open ? "▲" : "▼"}</span>
            </button>
            <div id={`disc-${disc.id}`} className="p-4 space-y-3">
              <p className="text-[0.9rem] leading-relaxed text-[#c4ac9d]">{disc.description}</p>
              {DISCIPLINE_RULES[disc.id] && (
                <div className="vtm-frame rounded-md p-3 space-y-1" style={{ background: "rgba(122,74,140,0.06)" }}>
                  <span className="vtm-label text-[0.72rem] text-[#a877c0]">Как работает {disc.name}</span>
                  {DISCIPLINE_RULES[disc.id].map((rule, i) => (
                    <p key={i} className="text-[0.84rem] leading-relaxed text-[#c4ac9d] flex gap-1.5">
                      <span className="text-[#a877c0] shrink-0 not-italic" aria-hidden>◈</span>{rule}
                    </p>
                  ))}
                </div>
              )}
              {open && (
                <div className="space-y-2.5">
                  {([1, 2, 3, 4, 5] as const).map((lvl) => (
                    <div key={lvl}>
                      <p className="vtm-label text-[0.73rem] text-[#a877c0] mb-1">Уровень {lvl}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {(disc.powers[lvl] || []).map((p) => {
                          const system = POWER_SYSTEMS[`${disc.id}:${p.name}`];
                          return (
                            <div key={p.name} className="vtm-frame rounded-md p-2.5 space-y-1" style={{ background: "rgba(0,0,0,0.22)" }}>
                              <p className="text-[0.9rem] text-[#d9c7b6]">
                                {p.name}
                                {p.amalgam && <span className="vtm-label text-[0.67rem] text-[#c4ac9d] ml-1.5">амальгама · {p.amalgam}</span>}
                              </p>
                              <p className="vtm-hint !text-[0.79rem] mt-0.5">{p.desc}</p>
                              {system && (
                                <p className="vtm-hint !text-[0.83rem] leading-relaxed rounded-md p-2 mt-1" style={{ background: "rgba(122,74,140,0.08)", border: "1px dashed rgba(122,74,140,0.3)" }}>
                                  <span className="vtm-label text-[0.68rem] text-[#a877c0] mr-1.5">МЕХАНИКА</span>
                                  {system}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </article>
        );
      })}
      {list.length === 0 && <p className="vtm-hint text-center py-6">Тьма молчит по этому запросу.</p>}
    </div>
  );
}

// ---------- Ритуалы и Церемонии ----------

function RitualCard({ r }: { r: RitualDef }) {
  const [open, setOpen] = useState(false);
  const isOblivion = r.kind === "oblivion";
  return (
    <article className={`vtm-panel vtm-ritual-card ${isOblivion ? "is-oblivion" : "is-blood"}`}>
      <button
        className="w-full vtm-panel-head text-left cursor-pointer"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={`ritual-${r.id}`}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`vtm-ritual-lvl ${isOblivion ? "oblivion" : "blood"}`}>{"•".repeat(r.level)}</span>
          <span className={`vtm-display text-[1rem] ${isOblivion ? "text-[#a877c0]" : "text-[#c22b30]"}`}>
            {isOblivion ? "🌑 " : "🩸 "}{r.name}
          </span>
          {r.school && <span className="vtm-hint !text-[0.68rem] uppercase ml-1">{r.school}</span>}
        </div>
        <span className="vtm-hint !text-[0.75rem] block mt-1 not-italic">{r.brief}</span>
      </button>
      {open && (
        <div id={`ritual-${r.id}`} className="p-4 space-y-2 vtm-ritual-body">
          <p className="text-[0.88rem] text-[#d9c7b6] leading-relaxed">{r.effect}</p>
          <div className="vtm-ritual-grid">
            <div><span className="vtm-mini-label">Цена</span><p className="text-[0.82rem] text-[#c4ac9d]">{r.cost}</p></div>
            <div><span className="vtm-mini-label">Длительность</span><p className="text-[0.82rem] text-[#c4ac9d]">{r.duration}</p></div>
            {r.dicepool && <div><span className="vtm-mini-label">Пул</span><p className="text-[0.82rem] text-[#c4ac9d]">{r.dicepool}</p></div>}
            {r.ingredients && <div><span className="vtm-mini-label">Ингредиенты</span><p className="text-[0.82rem] text-[#c4ac9d]">{r.ingredients}</p></div>}
          </div>
          <p className="vtm-hint !text-[0.72rem] italic mt-2">📜 {r.source}</p>
        </div>
      )}
    </article>
  );
}

function RitualsCodex({ q }: { q: string }) {
  const [filter, setFilter] = useState<"all" | "blood_sorcery" | "oblivion">("all");
  const [levelFilter, setLevelFilter] = useState<number>(0);

  const filtered = useMemo(() => {
    const pool = [
      ...(filter === "all" || filter === "blood_sorcery" ? BLOOD_SORCERY_RITUALS : []),
      ...(filter === "all" || filter === "oblivion" ? OBLIVION_CEREMONIES : []),
    ];
    return pool.filter((r) => {
      if (levelFilter && r.level !== levelFilter) return false;
      if (!q) return true;
      return `${r.name} ${r.school ?? ""} ${r.brief} ${r.effect}`.toLowerCase().includes(q);
    });
  }, [filter, levelFilter, q]);

  return (
    <div className="space-y-4">
      <section className="vtm-panel p-3 md:p-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="vtm-label text-[0.85rem] text-[#d6a840]">🔮 Ритуалы Кровавой магии и Церемонии Забвения</span>
          <span className="vtm-hint !text-[0.72rem]">{filtered.length} из {BLOOD_SORCERY_RITUALS.length + OBLIVION_CEREMONIES.length}</span>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {(["all", "blood_sorcery", "oblivion"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`vtm-btn !py-1 !px-2.5 !text-[0.74rem] ${filter === f ? (f === "oblivion" ? "vtm-btn-violet" : f === "blood_sorcery" ? "vtm-btn-blood" : "vtm-btn-blood") : "vtm-btn-ghost"}`}
              aria-pressed={filter === f}
            >
              {f === "all" ? "Все" : f === "blood_sorcery" ? "🩸 Кровавая магия" : "🌑 Забвение"}
            </button>
          ))}
          {[0, 1, 2, 3, 4, 5].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setLevelFilter(lvl)}
              className={`vtm-btn !py-1 !px-2 !text-[0.72rem] ${levelFilter === lvl ? "vtm-btn-blood" : "vtm-btn-ghost"}`}
              aria-pressed={levelFilter === lvl}
            >
              {lvl === 0 ? "Все ур." : `Ур. ${lvl}`}
            </button>
          ))}
        </div>
      </section>

      {/* Сводные правила */}
      <section className="vtm-panel">
        <div className="vtm-panel-head">
          <span className="vtm-label text-[0.81rem] text-[#d6a840]">Правила ритуалистики</span>
        </div>
        <div className="p-4 space-y-3">
          {RITUAL_RULES.map((block) => (
            <div key={block.title} className="vtm-ritual-rule-block">
              <p className="vtm-display text-[0.92rem] text-[#d6a840] mb-1">{block.title}</p>
              {block.body.map((line, i) => (
                <p key={i} className="text-[0.85rem] leading-relaxed text-[#c4ac9d] flex gap-2 mb-1">
                  <span className="text-[#8a1a1d] shrink-0" aria-hidden>❧</span>
                  <span>{line}</span>
                </p>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* Каталог ритуалов */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map((r) => (
          <RitualCard key={r.id} r={r} />
        ))}
      </div>
      {filtered.length === 0 && (
        <p className="vtm-hint text-center py-6">Кодекс молчит по этому запросу.</p>
      )}
    </div>
  );
}

// ---------- Хроника: Запреты, Убеждения, Френзия, Принуждения ----------

function ChronicleCodex({ q }: { q: string }) {
  const tenets = CHRONICLE_TENETS.filter((t) => !q || `${t.name} ${t.desc} ${t.stains}`.toLowerCase().includes(q));
  const convictions = CONVICTION_EXAMPLES.filter((c) => !q || `${c.text} ${c.aligns}`.toLowerCase().includes(q));
  const frenzies = FRENZY_TYPES.filter((f) => !q || `${f.name} ${f.en} ${f.trigger} ${f.effect}`.toLowerCase().includes(q));
  const compulsions = COMPULSIONS.filter((c) => !q || `${c.name} ${c.clan} ${c.effect}`.toLowerCase().includes(q));
  const rules = FRENZY_RULES.filter((b) => !q || `${b.title} ${b.body.join(" ")}`.toLowerCase().includes(q));

  return (
    <div className="space-y-4">
      {/* Запреты хроники */}
      <section className="vtm-panel">
        <div className="vtm-panel-head">
          <span className="vtm-label text-[0.81rem] text-[#d6a840]">⚖ Запреты хроники (Chronicle Tenets)</span>
          <span className="vtm-hint !text-[0.68rem] uppercase ml-auto">общие для всей хроники</span>
        </div>
        <div className="p-3 md:p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {tenets.map((t) => (
            <article key={t.id} className="vtm-tenet-card">
              <div className="flex items-baseline justify-between gap-2 flex-wrap">
                <span className="vtm-display text-[0.95rem] text-[#c22b30]">{t.name}</span>
                <span className="vtm-tenet-severity">{t.severity}</span>
              </div>
              <p className="text-[0.84rem] text-[#c4ac9d] leading-relaxed mt-1">{t.desc}</p>
              <p className="vtm-tenet-stains mt-2">
                <span className="vtm-mini-label">Пятна: </span>{t.stains}
              </p>
              <p className="vtm-hint !text-[0.68rem] italic mt-1">📜 {t.source}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Примеры Убеждений */}
      <section className="vtm-panel">
        <div className="vtm-panel-head">
          <span className="vtm-label text-[0.81rem] text-[#d6a840]">🕯 Примеры Убеждений (Convictions)</span>
          <span className="vtm-hint !text-[0.68rem] uppercase ml-auto">личный код Сородича</span>
        </div>
        <div className="p-3 md:p-4">
          <p className="vtm-hint !text-[0.78rem] mb-3">
            Убеждения — 1–3 на лист. Не обязаны быть добрыми: это просто правило, по которому вампир хочет жить. Убеждение снимает 1+ Пятно, когда Запрет нарушен в согласии с ним; нарушенное Убеждение насылает Пятно сверху.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {convictions.map((c, i) => (
              <div key={i} className="vtm-conviction-example">
                <span className="text-[#d6a840] mr-1.5" aria-hidden>❦</span>
                <div>
                  <p className="text-[0.85rem] text-[#d9c7b6] italic">«{c.text}»</p>
                  <p className="vtm-hint !text-[0.7rem] mt-0.5">{c.aligns}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Френзия */}
      <section className="vtm-panel">
        <div className="vtm-panel-head">
          <span className="vtm-label text-[0.81rem] text-[#d6a840]">🔥 Френзия и Принуждения</span>
        </div>
        <div className="p-3 md:p-4 space-y-3">
          {rules.map((b) => (
            <div key={b.title} className="vtm-ritual-rule-block">
              <p className="vtm-display text-[0.9rem] text-[#d6a840] mb-1">{b.title}</p>
              {b.body.map((line, i) => (
                <p key={i} className="text-[0.82rem] leading-relaxed text-[#c4ac9d] flex gap-2 mb-1">
                  <span className="text-[#8a1a1d] shrink-0" aria-hidden>❧</span>
                  <span>{line}</span>
                </p>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* Типы Френзии */}
      <section className="vtm-panel">
        <div className="vtm-panel-head">
          <span className="vtm-label text-[0.81rem] text-[#c22b30]">Три вида Френзии</span>
        </div>
        <div className="p-3 md:p-4 grid grid-cols-1 gap-3">
          {frenzies.map((f) => (
            <article key={f.id} className="vtm-frenzy-card">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="vtm-display text-[0.98rem] text-[#c22b30]">{f.name}</span>
                <span className="vtm-hint !text-[0.72rem] italic">({f.en})</span>
              </div>
              <div className="vtm-frenzy-grid mt-2">
                <div><span className="vtm-mini-label">Триггер</span><p className="text-[0.8rem] text-[#c4ac9d]">{f.trigger}</p></div>
                <div><span className="vtm-mini-label">Пул</span><p className="text-[0.8rem] text-[#c4ac9d]">{f.dicepool}</p></div>
                <div><span className="vtm-mini-label">Сложность</span><p className="text-[0.8rem] text-[#c4ac9d]">{f.difficulty}</p></div>
                <div><span className="vtm-mini-label">Длительность</span><p className="text-[0.8rem] text-[#c4ac9d]">{f.duration}</p></div>
              </div>
              <p className="text-[0.83rem] text-[#d9c7b6] leading-relaxed mt-2">{f.effect}</p>
              <p className="vtm-hint !text-[0.68rem] italic mt-1">📜 {f.source}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Принуждения клана */}
      <section className="vtm-panel">
        <div className="vtm-panel-head">
          <span className="vtm-label text-[0.81rem] text-[#a877c0]">⚡ Принуждения клана (Compulsions)</span>
          <span className="vtm-hint !text-[0.68rem] uppercase ml-auto">при критическом провале с костями Голода</span>
        </div>
        <div className="p-3 md:p-4 grid grid-cols-1 md:grid-cols-2 gap-2">
          {compulsions.map((c) => (
            <article key={c.id} className="vtm-compulsion-card">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="vtm-display text-[0.9rem] text-[#a877c0]">{c.name}</span>
                <span className="vtm-hint !text-[0.68rem] uppercase">{c.clan === "any" ? "общее" : c.clan}</span>
              </div>
              <p className="text-[0.82rem] text-[#c4ac9d] leading-relaxed mt-1">{c.effect}</p>
              <p className="vtm-hint !text-[0.66rem] italic mt-1">⏱ {c.duration} · 📜 {c.source}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

// ---------- Слабокровные и Алхимия ----------

function ThinbloodCodex({ q }: { q: string }) {
  const rules = useMemo(
    () => THINBLOOD_RULES.filter((b) => !q || `${b.title} ${b.body.join(" ")}`.toLowerCase().includes(q)),
    [q]
  );
  const formulas = useMemo(
    () => THINBLOOD_FORMULAS.filter((f) => !q || `${f.name} ${f.effect} ${f.brew}`.toLowerCase().includes(q)),
    [q]
  );
  const traits = useMemo(
    () => ADVANTAGE_LIBRARY.filter((a) => a.kind === "thinblood" && (!q || `${a.name} ${a.desc}`.toLowerCase().includes(q))),
    [q]
  );

  return (
    <div className="space-y-4">
      {/* Правила слабокровных */}
      {rules.map((b) => (
        <section key={b.title} className="vtm-panel">
          <div className="vtm-panel-head">
            <span className="vtm-label text-[0.81rem] text-[#d6a840]">{b.title}</span>
          </div>
          <div className="p-4 space-y-2">
            {b.body.map((line, i) => (
              <p key={i} className="text-[0.9rem] leading-relaxed text-[#c4ac9d] flex gap-2">
                <span className="text-[#8a1a1d] shrink-0" aria-hidden>❧</span>
                <span>{line}</span>
              </p>
            ))}
          </div>
        </section>
      ))}

      {/* Алхимия: формулы-коктейли */}
      <div className="vtm-tb-divider" aria-hidden>
        <span>⚗</span>
        <i />
        <span className="vtm-label text-[0.75rem] text-[#a8863d]">формулы алхимии слабокровных</span>
        <i />
        <span>⚗</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {formulas.map((f) => (
          <article key={f.name} className="vtm-formula-card" style={{ background: "rgba(0,0,0,0.24)" }}>
            <div className="flex items-center gap-2.5">
              <span className="vtm-formula-vial" aria-hidden>⚗</span>
              <div className="min-w-0 flex-1">
                <p className="text-[0.92rem] text-[#d9c7b6] leading-tight">
                  {f.name}
                  <span className="vtm-label text-[0.67rem] text-[#a877c0] ml-1.5">ур. {f.level}</span>
                </p>
                <p className="vtm-label text-[0.66rem] text-[#9c8072] mt-0.5" aria-label={`Уровень ${f.level}`}>
                  {"◆".repeat(f.level)}{"◇".repeat(5 - f.level)}
                </p>
              </div>
              <span className="vtm-stamp !text-[0.66rem] shrink-0">XP {f.level * 3}</span>
            </div>
            <p className="text-[0.84rem] leading-relaxed text-[#c4ac9d] mt-2">{f.effect}</p>
            <p className="vtm-formula-brew mt-1.5">{f.brew}</p>
          </article>
        ))}
        {formulas.length === 0 && <p className="vtm-hint text-center py-4 md:col-span-2">Котёл пуст по этому запросу.</p>}
      </div>

      {/* Достоинства и недостатки слабокровных */}
      <section className="vtm-panel">
        <div className="vtm-panel-head">
          <span className="vtm-label text-[0.81rem] text-[#d6a840]">Слабокровные достоинства и недостатки</span>
        </div>
        <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-2">
          {traits.map((a) => (
            <div key={a.id} className="vtm-frame rounded-md p-2.5" style={{ background: "rgba(0,0,0,0.22)" }}>
              <p className="text-[0.9rem] text-[#d9c7b6]">{a.name}</p>
              <p className="vtm-hint !text-[0.76rem] mt-0.5">{a.desc}</p>
            </div>
          ))}
          {traits.length === 0 && <p className="vtm-hint text-center py-3 md:col-span-2">Кровь молчит по этому запросу.</p>}
        </div>
      </section>
    </div>
  );
}

// ---------- Механики ----------

function MechanicsCodex({ q }: { q: string }) {
  const blocks: { title: string; body: string[] }[] = [
    {
      title: "Пулы и кости",
      body: [
        "Почти всё решает пул из d10: характеристика + навык (+ модификаторы). Кость даёт успех на 6+, десятка — критическая.",
        "Каждая пара десяток = критический успех: все успехи удваиваются (2 пары — 4+ успеха). Одинокая десятка считается как один успех.",
        "Провал без успехов — просто неудача. Но не для пулов с костями Голода…",
      ],
    },
    {
      title: "Голод и кости Голода",
      body: [
        "Уровень Голода (0–5) — это количество красных костей в правой части каждого твоего пула: последние N костей — кости Голода.",
        "Критическая 10 на кости Голода = БЕСПРЕДЕЛЬНЫЙ УСПЕХ: цель достигнута, но Зверь распорядился сам — ужин, ярость, свидетели.",
        "Ноль успехов при наличии кости Голода = ЗВЕРСКИЙ ПРОВАЛ: рассказчик описывает, как Зверь взял своё. (Дополнительно возможна одержимость.)",
      ],
    },
    {
      title: "Испытания Крови и Голод",
      body: [
        "Использование силы Дисциплины требует испытания Крови: 1 кость, успех на 6+. Успех — Голод не меняется, провал — Голод +1.",
        "Сила Крови определяет, сколько урона заживляется за испытание Крови (см. таблицу ниже).",
        "Пустой Голод (0) — редкая роскошь; Голод 5 — все кости пула красны, Зверь ведёт.",
      ],
    },
    {
      title: "Здоровье, Воля, Человечность",
      body: [
        "Здоровье = Выносливость + 3. Поверхностный урон заживает, тяжёлый — нет. Заполненная шкала тяжёлым уроном = торпор.",
        "Воля = Самообладание + Упорство. Пункт воли тратится на +1 успех или переброс трёх костей. Заполненная шкала воли — изнурение (−2d10 к социальным и ментальным пулам).",
        "Человечность (0–10) и Пятна: грешки дают пятна; проверка Человечности смывает пятно или превращает его в потерянное звено. Ноль — конец персонажа: Зверь пожирает личность.",
      ],
    },
    {
      title: "Одержимости (Принуждения)",
      body: [
        "При Голоде 4+ (или по решению рассказчика) включается одержимость: клановое Принуждение навязывает поведение до конца сцены.",
        "Игрок обязан вплетать принуждение в действия персонажа — это не потеря контроля, а обострение характера под властью Зверя.",
      ],
    },
    {
      title: "Опыт и прокачка",
      body: [
        "Характеристика: 5 × новый уровень (2→3 = 15). Навык: 3 × новый уровень. Специализация: 3.",
        "Дисциплина: 6 × новый уровень (вне клана — дороже по решению рассказчика). Новая сила Дисциплины: 3 × её уровень.",
        "Человечность: 2 × новое звено. Факты биографии после создания: 3 опыта за точку. Листоги («Истории») — 3–7 опыта за ступень.",
        "Опыт записывай в трекерах (Досье) — вкладывай с Рассказчиком.",
      ],
    },
  ];
  // Диаблери и ауры — из раздела «Истории» (vtm-histories.ts)
  const blocksAll = [...blocks, ...DIABLERIE_BLOCKS];
  const filtered = blocksAll.filter((b) => !q || `${b.title} ${b.body.join(" ")}`.toLowerCase().includes(q));
  return (
    <div className="space-y-4">
      {filtered.map((b) => (
        <section key={b.title} className="vtm-panel">
          <div className="vtm-panel-head">
            <span className="vtm-label text-[0.81rem] text-[#d6a840]">{b.title}</span>
          </div>
          <div className="p-4 space-y-2">
            {b.body.map((line, i) => (
              <p key={i} className="text-[0.9rem] leading-relaxed text-[#c4ac9d] flex gap-2">
                <span className="text-[#8a1a1d] shrink-0" aria-hidden>❧</span>
                <span>{line}</span>
              </p>
            ))}
          </div>
        </section>
      ))}

      {/* Таблица Силы Крови */}
      <section className="vtm-panel">
        <div className="vtm-panel-head">
          <span className="vtm-label text-[0.81rem] text-[#d6a840]">Сила Крови: таблица</span>
        </div>
        <div className="p-3 overflow-x-auto vtm-scroll">
          <table className="w-full text-[0.83rem] text-[#c4ac9d]" role="table">
            <thead>
              <tr className="vtm-label text-[0.70rem] text-[#a8863d] text-left">
                <th className="py-1.5 pr-3">СК</th>
                <th className="py-1.5 pr-3">Бонусные кости</th>
                <th className="py-1.5 pr-3">Заживление</th>
                <th className="py-1.5 pr-3">Бонус силы</th>
                <th className="py-1.5 pr-3">Тяжесть изъяна</th>
                <th className="py-1.5">Издержки кормления</th>
              </tr>
            </thead>
            <tbody>
              {BLOOD_POTENCY_TABLE.map((row) => (
                <tr key={row.level} className="border-t border-[#2b1116]">
                  <td className="py-1.5 pr-3 text-[#a877c0] font-bold">{row.level}</td>
                  <td className="py-1.5 pr-3">{row.bonusDice ? `+${row.bonusDice}` : "—"}</td>
                  <td className="py-1.5 pr-3">{row.mend}</td>
                  <td className="py-1.5 pr-3">{row.disciplineBonus ? `+${row.disciplineBonus}` : "—"}</td>
                  <td className="py-1.5 pr-3">{row.baneSeverity}</td>
                  <td className="py-1.5">{row.feedingPenalty}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="vtm-hint mt-2 !text-[0.75rem]">
            Сила Крови растёт со временем (у старейшин — сама по себе) и снижается голоданием до торпора. Бонусные кости добавляются к физическим пулам и пулам Дисциплин; «бонус силы» усиливает выбранные силы.
          </p>
        </div>
      </section>

      {/* Поколения */}
      <section className="vtm-panel">
        <div className="vtm-panel-head">
          <span className="vtm-label text-[0.81rem] text-[#d6a840]">Поколения</span>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
          {GENERATIONS.map((g) => (
            <div key={g.value} className="flex items-baseline gap-2 text-[0.84rem] text-[#c4ac9d]">
              <span className="vtm-label text-[0.77rem] text-[#a877c0] w-10 shrink-0">{g.label}</span>
              <span>{g.note || "—"}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ---------- Стили охоты ----------

function PredatorsCodex({ q }: { q: string }) {
  const list = PREDATOR_TYPES.filter((p) => !q || `${p.name} ${p.description} ${p.skills.join(" ")}`.toLowerCase().includes(q));
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {list.map((p) => (
        <article key={p.id} className="vtm-panel p-4 space-y-2">
          <div className="flex items-center gap-2">
            <span className="vtm-display text-[0.98rem] text-[#e8636b]">{p.name}</span>
          </div>
          <p className="text-[0.86rem] leading-relaxed text-[#c4ac9d]">{p.description}</p>
          <div className="flex flex-wrap gap-1.5">
            <span className="vtm-stamp !text-[0.67rem] vtm-stamp-gold">
              Навыки +1: {p.skills.map((s) => s).join(", ")}
            </span>
            {p.discipline && <span className="vtm-stamp !text-[0.67rem]">Дисциплина +1</span>}
          </div>
          {p.merit && <p className="vtm-hint !text-[0.76rem]">{p.merit}</p>}
          {p.extra && <p className="vtm-hint !text-[0.76rem]">{p.extra}</p>}
        </article>
      ))}
    </div>
  );
}

// ---------- Преимущества (каталог) ----------

function AdvantagesCodex({ q }: { q: string }) {
  const list = ADVANTAGE_LIBRARY.filter((a) => !q || `${a.name} ${a.desc} ${a.group || ""}`.toLowerCase().includes(q));
  const groups: { kind: string; label: string }[] = [
    { kind: "background", label: "Факты биографии (7 пунктов на старте)" },
    { kind: "merit", label: "Достоинства" },
    { kind: "flaw", label: "Недостатки" },
    { kind: "thinblood", label: "Слабокровные" },
  ];
  return (
    <div className="space-y-4">
      {groups.map((g) => {
        const items = list.filter((a) => a.kind === g.kind);
        if (items.length === 0) return null;
        // подгруппы книги внутри типа
        const sub = new Map<string, typeof items>();
        for (const a of items) {
          const key = a.group || "";
          if (!sub.has(key)) sub.set(key, []);
          sub.get(key)!.push(a);
        }
        return (
          <section key={g.kind} className="vtm-panel">
            <div className="vtm-panel-head">
              <span className="vtm-label text-[0.81rem] text-[#d6a840]">{g.label}</span>
              <span className="vtm-hint !text-[0.7rem] ml-auto">{items.length} записей</span>
            </div>
            <div className="p-3 space-y-3">
              {[...sub.entries()].map(([groupName, entries]) => (
                <div key={groupName || "base"}>
                  {groupName && <p className="vtm-cat-head vtm-label">{groupName}</p>}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1.5">
                    {entries.map((a) => (
                      <div key={a.id} className="vtm-frame rounded-md p-2.5" style={{ background: "rgba(0,0,0,0.22)" }}>
                        <p className="text-[0.9rem] text-[#d9c7b6]">
                          {a.name}
                          {a.cost !== undefined && a.cost > 0 ? (
                            <span className="vtm-label text-[0.67rem] text-[#a8863d] ml-1.5">
                              {a.max > 1 ? `1–${a.max} ур. · ${a.cost} пт/ур.` : `${a.cost} пт`}
                            </span>
                          ) : a.cost === 0 ? (
                            <span className="vtm-label text-[0.67rem] text-[#a8863d] ml-1.5">договорная</span>
                          ) : null}
                          {a.stackable && <span className="vtm-label text-[0.64rem] text-[#b0565e] ml-1.5">можно несколько</span>}
                          {a.req && <span className="vtm-req vtm-label ml-1.5">{a.req}</span>}
                        </p>
                        <p className="vtm-hint !text-[0.76rem] mt-0.5">{a.desc}</p>
                        {a.tiers && a.tiers.length > 1 && (
                          <div className="mt-1 space-y-0.5">
                            {a.tiers.map((t, i) => (
                              <p key={i} className="vtm-hint !text-[0.73rem] pl-1 border-l border-[#3d1a20]">
                                <span className="text-[#a8863d] not-italic">{"●".repeat(i + 1)}</span> {t}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// ---------- Секты ----------

function SectsCodex({ q }: { q: string }) {
  const list = SECTS.filter((s) => !q || `${s.name} ${s.description}`.toLowerCase().includes(q));
  const elysiumRules = ELYSIUM_RULES.filter((b) => !q || `${b.title} ${b.body.join(" ")}`.toLowerCase().includes(q));
  const titles = COURT_TITLES.filter((t) => !q || `${t.name} ${t.en} ${t.holder} ${t.duty} ${t.power}`.toLowerCase().includes(q));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {list.map((s) => (
          <article key={s.id} className="vtm-panel p-4 space-y-2">
            <span className="vtm-display text-[1.01rem] text-[#d6a840]">{s.name}</span>
            <p className="text-[0.86rem] leading-relaxed text-[#c4ac9d]">{s.description}</p>
          </article>
        ))}
      </div>

      {/* Элизиум */}
      {elysiumRules.map((b) => (
        <section key={b.title} className="vtm-panel">
          <div className="vtm-panel-head">
            <span className="vtm-label text-[0.81rem] text-[#d6a840]">🏛 {b.title}</span>
          </div>
          <div className="p-4 space-y-2">
            {b.body.map((line, i) => (
              <p key={i} className="text-[0.88rem] leading-relaxed text-[#c4ac9d] flex gap-2">
                <span className="text-[#8a1a1d] shrink-0" aria-hidden>❦</span>
                <span>{line}</span>
              </p>
            ))}
          </div>
        </section>
      ))}

      {/* Титулы двора Принца */}
      <section className="vtm-panel">
        <div className="vtm-panel-head">
          <span className="vtm-label text-[0.81rem] text-[#d6a840]">👑 Титулы двора Принца</span>
          <span className="vtm-hint !text-[0.68rem] uppercase ml-auto">Camarilla court positions</span>
        </div>
        <div className="p-3 md:p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {titles.map((t) => (
            <article key={t.id} className="vtm-elysium-card">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="vtm-display text-[0.98rem] text-[#d6a840]">{t.name}</span>
                <span className="vtm-hint !text-[0.7rem] italic">({t.en})</span>
              </div>
              <p className="text-[0.78rem] text-[#9c8072] mt-1">{t.holder}</p>
              <p className="text-[0.85rem] text-[#d9c7b6] mt-2 leading-relaxed">
                <span className="text-[#c22b30] font-semibold">Долг: </span>{t.duty}
              </p>
              <p className="text-[0.85rem] text-[#c4ac9d] mt-1 leading-relaxed">
                <span className="text-[#a8863d] font-semibold">Власть: </span>{t.power}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="vtm-panel">
        <div className="vtm-panel-head">
          <span className="vtm-label text-[0.81rem] text-[#d6a840]">Памятка Маскарада</span>
        </div>
        <div className="p-4 space-y-2 text-[0.86rem] leading-relaxed text-[#c4ac9d]">
          <p><b className="text-[#d9c7b6]">Маскарад:</b> не выдай своё существование смертным. Нарушение — суд Элизиума.</p>
          <p><b className="text-[#d9c7b6]">Домен:</b> право кормления принадлежит правителю города. Охота — по его законам.</p>
          <p><b className="text-[#d9c7b6]">Потомство:</b> новое Становление — только с дозволением старших. «Слишком много челюстей — мало крови».</p>
          <p><b className="text-[#d9c7b6]">Ответственность:</b> за своих подручных и гулей отвечаешь ты. Учись выбирать свиту.</p>
          <p><b className="text-[#d9c7b6]">Гостеприимство:</b> в чужом городе — представься правителю. Если успеешь.</p>
        </div>
      </section>
    </div>
  );
}

// ---------- Истории: листоги (стр. 384+) ----------

function HistoriesCodex({ q }: { q: string }) {
  const rules = useMemo(
    () => LORESHEET_RULES.filter((b) => !q || `${b.title} ${b.body.join(" ")}`.toLowerCase().includes(q)),
    [q]
  );
  const sheets = useMemo(
    () => LORESHEETS.filter((ls) =>
      !q || `${ls.name} ${ls.tagline} ${ls.desc} ${ls.levels.map((l) => `${l.name} ${l.effect}`).join(" ")}`.toLowerCase().includes(q)
    ),
    [q]
  );
  return (
    <div className="space-y-4">
      {rules.map((b) => (
        <section key={b.title} className="vtm-panel">
          <div className="vtm-panel-head">
            <span className="vtm-label text-[0.81rem] text-[#d6a840]">{b.title}</span>
          </div>
          <div className="p-4 space-y-2">
            {b.body.map((line, i) => (
              <p key={i} className="text-[0.9rem] leading-relaxed text-[#c4ac9d] flex gap-2">
                <span className="text-[#8a1a1d] shrink-0" aria-hidden>❧</span>
                <span>{line}</span>
              </p>
            ))}
          </div>
        </section>
      ))}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sheets.map((ls) => (
          <article key={ls.id} className="vtm-panel">
            <div className="vtm-panel-head">
              <span className="vtm-display text-[1.01rem] text-[#d9c7b6]">{ls.name}</span>
              <span className="vtm-hint !text-[0.73rem] ml-1">{ls.tagline}</span>
            </div>
            <div className="p-4 space-y-2.5">
              <p className="text-[0.9rem] leading-relaxed text-[#c4ac9d]">{ls.desc}</p>
              <div className="space-y-1.5">
                {ls.levels.map((lv, i) => (
                  <div key={i} className="rounded-md p-2 border border-[#2b1116]" style={{ background: "rgba(0,0,0,0.2)" }}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[#a8863d] not-italic text-[0.88rem]" aria-hidden>{"●".repeat(i + 1)}{"○".repeat(4 - i)}</span>
                      <b className="text-[0.88rem] text-[#d9c7b6] not-italic">{lv.name}</b>
                      <span className="vtm-label text-[0.70rem] text-[#a8863d] ml-auto">{lv.xp} опыта</span>
                    </div>
                    <p className="vtm-hint !text-[0.81rem] mt-1 leading-relaxed">{lv.effect}</p>
                  </div>
                ))}
              </div>
            </div>
          </article>
        ))}
        {sheets.length === 0 && <p className="vtm-hint text-center py-6 md:col-span-2">Истории молчат по этому запросу.</p>}
      </div>
    </div>
  );
}

// ---------- 4-я редакция (V20): классические механики ----------

function V20Codex({ q }: { q: string }) {
  const blocks = useMemo(
    () => V20_BLOCKS.filter((b) => !q || `${b.title} ${b.body.join(" ")} ${b.tag || ""}`.toLowerCase().includes(q)),
    [q]
  );
  return (
    <div className="space-y-4">
      <p className="vtm-hint !text-[0.79rem] vtm-panel p-3">
        Механики четвёртой редакции («20th Anniversary Edition») — для хроник прошлого, флешбеков и Сородичей старого закала. Переносить лист между системами стоит только через Рассказчика.
      </p>
      {blocks.map((b) => (
        <section key={b.title} className="vtm-panel">
          <div className="vtm-panel-head">
            <span className="vtm-label text-[0.81rem] text-[#d6a840]">🕰 {b.title}</span>
            {b.tag && <span className="vtm-hint !text-[0.68rem] uppercase ml-auto">{b.tag}</span>}
          </div>
          <div className="p-4 space-y-2">
            {b.body.map((line, i) => (
              <p key={i} className="text-[0.9rem] leading-relaxed text-[#c4ac9d] flex gap-2">
                <span className="text-[#a8863d] shrink-0 not-italic" aria-hidden>❧</span>
                <span>{line}</span>
              </p>
            ))}
          </div>
        </section>
      ))}
      {blocks.length === 0 && <p className="vtm-hint text-center py-6">По этому запросу V20 молчит.</p>}
    </div>
  );
}

// ---------- Оборотни (W5): Гароу рядом с Маскарадом ----------

export function WerewolfCodex({ q }: { q: string }) {
  const match = (...parts: string[]) => !q || parts.join(" ").toLowerCase().includes(q);
  const intro = WEREWOLF_INTRO.filter((b) => match(b.title, b.body.join(" ")));
  const forms = WEREWOLF_FORMS.filter((f) => match(f.name, f.ru, f.desc));
  const auspices = WEREWOLF_AUSPICES.filter((a) => match(a.name, a.moon, a.desc));
  const tribes = WEREWOLF_TRIBES.filter((t) => match(t.name, t.desc));
  const wayward = WEREWOLF_WAYWARD.filter((t) => match(t.name, t.desc));
  const coexist = WEREWOLF_COEXIST.filter((s) => match(s));
  return (
    <div className="space-y-4">
      {intro.map((b) => (
        <section key={b.title} className="vtm-panel">
          <div className="vtm-panel-head">
            <span className="vtm-label text-[0.81rem] text-[#d6a840]">🐺 {b.title}</span>
            {b.tag && <span className="vtm-hint !text-[0.68rem] uppercase ml-auto">{b.tag}</span>}
          </div>
          <div className="p-4 space-y-2">
            {b.body.map((line, i) => (
              <p key={i} className="text-[0.9rem] leading-relaxed text-[#c4ac9d] flex gap-2">
                <span className="text-[#a8863d] shrink-0 not-italic" aria-hidden>❧</span>
                <span>{line}</span>
              </p>
            ))}
          </div>
        </section>
      ))}

      <section className="vtm-panel">
        <div className="vtm-panel-head">
          <span className="vtm-label text-[0.81rem] text-[#d6a840]">Пять обликов</span>
          <span className="vtm-hint !text-[0.68rem] uppercase ml-auto">смена облика — проверка Ярости</span>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-2">
          {forms.map((f) => (
            <div key={f.name} className="vtm-frame rounded-md p-2.5" style={{ background: "rgba(0,0,0,0.2)" }}>
              <p className="text-[0.88rem] text-[#d9c7b6]"><b className="not-italic">{f.name}</b> — {f.ru}</p>
              <p className="vtm-hint !text-[0.79rem] mt-1 leading-relaxed">{f.desc}</p>
            </div>
          ))}
          {forms.length === 0 && <p className="vtm-hint md:col-span-2 text-center py-2">Облики молчат по этому запросу.</p>}
        </div>
      </section>

      <section className="vtm-panel">
        <div className="vtm-panel-head">
          <span className="vtm-label text-[0.81rem] text-[#d6a840]">Ауспиции: пять лун</span>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-2">
          {auspices.map((a) => (
            <div key={a.name} className="vtm-frame rounded-md p-2.5" style={{ background: "rgba(0,0,0,0.2)" }}>
              <p className="text-[0.88rem] text-[#d9c7b6]"><b className="not-italic">{a.name}</b> <span className="vtm-hint !text-[0.72rem] ml-1">{a.moon}</span></p>
              <p className="vtm-hint !text-[0.79rem] mt-1 leading-relaxed">{a.desc}</p>
            </div>
          ))}
          {auspices.length === 0 && <p className="vtm-hint md:col-span-2 text-center py-2">Луны молчат по этому запросу.</p>}
        </div>
      </section>

      <section className="vtm-panel">
        <div className="vtm-panel-head">
          <span className="vtm-label text-[0.81rem] text-[#d6a840]">Племена Гароу</span>
          <span className="vtm-hint !text-[0.68rem] uppercase ml-auto">W5: племена — идеологии, а не кровь</span>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-2">
          {tribes.map((t) => (
            <div key={t.name} className="vtm-frame rounded-md p-2.5" style={{ background: "rgba(0,0,0,0.2)" }}>
              <p className="text-[0.88rem] text-[#d9c7b6]"><b className="not-italic">{t.name}</b></p>
              <p className="vtm-hint !text-[0.79rem] mt-1 leading-relaxed">{t.desc}</p>
            </div>
          ))}
          {tribes.length === 0 && <p className="vtm-hint md:col-span-2 text-center py-2">Племена молчат по этому запросу.</p>}
        </div>
      </section>

      <section className="vtm-panel">
        <div className="vtm-panel-head">
          <span className="vtm-label text-[0.81rem] text-[#e8636b]">Выпавшие из народа (wayward)</span>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-2">
          {wayward.map((t) => (
            <div key={t.name} className="vtm-frame rounded-md p-2.5" style={{ background: "rgba(138,26,29,0.12)", borderColor: "rgba(138,26,29,0.35)" }}>
              <p className="text-[0.88rem] text-[#e8a4a8]"><b className="not-italic">{t.name}</b></p>
              <p className="vtm-hint !text-[0.79rem] mt-1 leading-relaxed">{t.desc}</p>
            </div>
          ))}
          {wayward.length === 0 && <p className="vtm-hint md:col-span-2 text-center py-2">Тени молчат по этому запросу.</p>}
        </div>
      </section>

      <section className="vtm-panel">
        <div className="vtm-panel-head">
          <span className="vtm-label text-[0.81rem] text-[#d6a840]">Сородичам о соседстве с Гароу</span>
          <span className="vtm-hint !text-[0.68rem] uppercase ml-auto">памятка Маскарада</span>
        </div>
        <div className="p-4 space-y-2">
          {coexist.map((line, i) => (
            <p key={i} className="text-[0.9rem] leading-relaxed text-[#c4ac9d] flex gap-2">
              <span className="text-[#8a1a1d] shrink-0" aria-hidden>❧</span>
              <span>{line}</span>
            </p>
          ))}
          {coexist.length === 0 && <p className="vtm-hint text-center py-2">Памятка молчит по этому запросу.</p>}
        </div>
      </section>
    </div>
  );
}
