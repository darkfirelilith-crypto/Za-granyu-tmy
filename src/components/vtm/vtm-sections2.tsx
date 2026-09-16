"use client";

// ============================================================
// Секции: Дисциплины (уровни + силы) и Преимущества
// (факты биографии 7 пунктов + достоинства/недостатки).
// ============================================================

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  VtmSheetData,
  VtmDisciplineState,
  DISCIPLINES,
  DISCIPLINE_BY_ID,
  CLAN_BY_ID,
  ADVANTAGE_LIBRARY,
  ADVANTAGE_BY_ID,
  THINBLOOD_FORMULAS,
} from "@/lib/vtm-data";
import { LORESHEETS, LORESHEET_BY_ID, LORESHEET_RULES } from "@/lib/vtm-histories";
import { POWER_SYSTEMS, DISCIPLINE_RULES } from "@/lib/vtm-discipline-systems";
import { DerivedStats } from "@/lib/vtm-calc";

// ============================================================
// ДИСЦИПЛИНЫ
// ============================================================

export function DisciplinesSection({
  data,
  mutate,
  derived,
}: {
  data: VtmSheetData;
  mutate: (fn: (draft: VtmSheetData) => void) => void;
  derived: DerivedStats;
}) {
  const clan = CLAN_BY_ID.get(data.info.clan);
  const [showCatalog, setShowCatalog] = useState(false);
  const [customName, setCustomName] = useState("");

  const clanDiscIds = clan?.disciplines || [];
  const isClanDisc = (key: string | null) => !!key && clanDiscIds.includes(key);

  const setDisc = (key: string, name: string, patch: Partial<VtmDisciplineState>) => {
    mutate((d) => {
      const existing = d.disciplines.find((x) => x.key === key);
      if (existing) Object.assign(existing, patch);
      else d.disciplines.push({ key, name, value: 0, powers: {}, xp: 0, ...patch });
    });
  };

  const removeDisc = (key: string | null) => {
    mutate((d) => {
      d.disciplines = d.disciplines.filter((x) => x.key !== key);
    });
  };

  const addCustom = () => {
    const trimmed = customName.trim();
    if (!trimmed) return;
    if (data.disciplines.some((x) => x.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("Такая Дисциплина уже есть");
      return;
    }
    mutate((d) => {
      d.disciplines.push({ key: null, name: trimmed, value: 0, powers: {}, xp: 0 });
    });
    setCustomName("");
  };

  // Сортировка: клановые сверху, затем остальные
  const sorted = useMemo(() => {
    return [...DISCIPLINES].sort((a, b) => {
      const aClan = clanDiscIds.includes(a.id) ? 0 : 1;
      const bClan = clanDiscIds.includes(b.id) ? 0 : 1;
      return aClan - bClan;
    });
  }, [clanDiscIds]);

  return (
    <div className="space-y-4">
      <div className="vtm-panel p-4 flex flex-wrap items-center gap-3">
        <span className="vtm-stamp">Дисциплины</span>
        <p className="vtm-hint !text-[0.72rem] flex-1 min-w-[220px]">
          Клик по точке — уровень (0–5). Выбери силу для каждого уровня — из каталога или впиши свою.
          {clan && ` Клановые Дисциплины: ${clanDiscIds.map((id) => DISCIPLINE_BY_ID.get(id)?.name).join(", ")}.`}
        </p>
        <button className="vtm-btn vtm-btn-ghost !py-1.5 !px-3 text-xs" onClick={() => setShowCatalog((v) => !v)}>
          {showCatalog ? "▲ Скрыть каталог" : "◈ Каталог сил"}
        </button>
      </div>

      {/* Клановые и библиотечные */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {sorted.map((def) => {
          const state = data.disciplines.find((x) => x.key === def.id);
          const value = state?.value || 0;
          const clanMark = clanDiscIds.includes(def.id);
          return (
            <section
              key={def.id}
              className="vtm-panel"
              style={clanMark ? { borderColor: "rgba(194,43,48,0.4)" } : undefined}
              aria-label={def.name}
            >
              <div className="vtm-panel-head">
                <span className={`vtm-label text-[0.76rem] ${clanMark ? "text-[#e8636b]" : "text-[#d6a840]"}`}>
                  {clanMark ? "⛧ " : ""}{def.name}
                </span>
                {clanMark && <span className="vtm-hint !text-[0.62rem] ml-auto uppercase">клановая</span>}
              </div>
              <div className="p-3 md:p-4 space-y-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <Dots value={value} color="violet" onChange={(n) => setDisc(def.id, def.name, { value: n })} ariaLabel={`${def.name}: уровень ${value}`} />
                  <span className="vtm-hint !text-[0.68rem] flex-1">{def.description}</span>
                </div>

                {/* Подробные правила Дисциплины — как она работает */}
                {DISCIPLINE_RULES[def.id] && (
                  <div className="vtm-frame rounded-md p-2.5 space-y-1" style={{ background: "rgba(122,74,140,0.06)" }}>
                    <span className="vtm-label text-[0.62rem] text-[#a877c0]">Как работает {def.name}</span>
                    {DISCIPLINE_RULES[def.id].map((rule, i) => (
                      <p key={i} className="vtm-hint !text-[0.74rem] leading-relaxed flex gap-1.5">
                        <span className="text-[#a877c0] not-italic" aria-hidden>◈</span>{rule}
                      </p>
                    ))}
                  </div>
                )}

                {/* Силы по уровням */}
                {value > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {def.id === "thinblood_alchemy" ? (
                      /* Слабокровные: формулы Алхимии карточками — с эффектами и заметками о варке */
                      <ThinbloodFormulaPicker
                        level={value}
                        chosen={state?.powers || {}}
                        onPick={(lvl, name) => {
                          mutate((d) => {
                            const disc = d.disciplines.find((x) => x.key === def.id);
                            if (!disc) return;
                            if (!disc.powers) disc.powers = {};
                            disc.powers[lvl] = name;
                          });
                        }}
                      />
                    ) : (
                      <>
                        {Array.from({ length: value }, (_, i) => i + 1).map((lvl) => {
                          const powers = def.powers[lvl] || [];
                          const chosen = state?.powers?.[lvl] || "";
                          return (
                            <div key={lvl} className="flex items-center gap-2 flex-wrap">
                              <span className="vtm-label text-[0.62rem] text-[#6e5a53] w-8 shrink-0">{lvl} ур.</span>
                              <select
                                className="vtm-input !py-1 !text-[0.8rem] flex-1 min-w-[160px]"
                                value={powers.some((p) => p.name === chosen) ? chosen : ""}
                                onChange={(e) => {
                                  mutate((d) => {
                                    const disc = d.disciplines.find((x) => x.key === def.id);
                                    if (disc) disc.powers[lvl] = e.target.value;
                                  });
                                }}
                                aria-label={`Сила ${lvl} уровня Дисциплины ${def.name}`}
                              >
                                <option value="">— выбери силу —</option>
                                {powers.map((p) => (
                                  <option key={p.name} value={p.name}>{p.name}{p.amalgam ? ` · амальгама: ${p.amalgam}` : ""}</option>
                                ))}
                              </select>
                            </div>
                          );
                        })}
                        {/* Описания выбранных сил — с подробной механикой */}
                        {state?.powers && Object.entries(state.powers).map(([lvlS, name]) => {
                          const lvl = parseInt(lvlS, 10);
                          const p = (def.powers[lvl] || []).find((x) => x.name === name);
                          if (!p) return null;
                          const system = POWER_SYSTEMS[`${def.id}:${name}`];
                          return (
                            <div key={lvlS} className="pl-3 border-l-2 border-[#3d1a20] space-y-1">
                              <p className="vtm-hint !text-[0.74rem]">
                                <b className="text-[#a68d80] not-italic">{lvl} ур. — {name}:</b> {p.desc}
                                {p.amalgam && <span className="text-[#a877c0]"> · амальгама: {p.amalgam}</span>}
                              </p>
                              {system && (
                                <p className="vtm-hint !text-[0.76rem] leading-relaxed rounded-md p-2" style={{ background: "rgba(122,74,140,0.08)", border: "1px dashed rgba(122,74,140,0.3)" }}>
                                  <span className="vtm-label text-[0.6rem] text-[#a877c0] mr-1.5">МЕХАНИКА</span>
                                  {system}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {/* Свои / редкие Дисциплины */}
      <div className="vtm-panel p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="vtm-label text-[0.72rem] text-[#d6a840]">Редкие Дисциплины</span>
          <span className="vtm-hint !text-[0.68rem] flex-1">Химерия, Валерен, Туман Сета, сочетания и домашки — вписывай вручную</span>
        </div>
        {data.disciplines.filter((x) => x.key === null).map((disc, i) => (
          <div key={i} className="vtm-frame rounded-md p-3 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="vtm-display text-sm text-[#d9c7b6] flex-1 min-w-[140px]">{disc.name}</span>
              <Dots value={disc.value} color="violet" onChange={(n) => mutate((d) => { const list = d.disciplines.filter((x) => x.key === null); list[i].value = n; })} ariaLabel={`${disc.name}: уровень`} />
              <button className="vtm-btn vtm-btn-ghost !p-1 !text-[0.68rem]" onClick={() => removeDisc(null)} aria-label={`Удалить ${disc.name}`}>✕</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {Array.from({ length: disc.value }, (_, lvl) => lvl + 1).map((lvl) => (
                <input
                  key={lvl}
                  className="vtm-input !py-1 !text-[0.8rem]"
                  value={disc.powers?.[lvl] || ""}
                  onChange={(e) => mutate((d) => {
                    const list = d.disciplines.filter((x) => x.key === null);
                    if (!list[i].powers) list[i].powers = {};
                    list[i].powers[lvl] = e.target.value.slice(0, 60);
                  })}
                  placeholder={`сила ${lvl} уровня — впиши название`}
                  aria-label={`Сила ${lvl} уровня — ${disc.name}`}
                />
              ))}
            </div>
          </div>
        ))}
        <div className="flex gap-2">
          <input
            className="vtm-input flex-1"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCustom()}
            placeholder="например: Химерия (Равнос)"
            aria-label="Название редкой Дисциплины"
          />
          <button className="vtm-btn shrink-0" onClick={addCustom} disabled={!customName.trim()}>+ Добавить</button>
        </div>
      </div>
    </div>
  );
}

/** Выбор формул Алхимии слабокровных: карточки-рецепты вместо селекта —
 *  каждая с эффектом из книги и заметкой о варке; клик по выбранной снимает её. */
function ThinbloodFormulaPicker({
  level,
  chosen,
  onPick,
}: {
  level: number;
  chosen: Record<number, string>;
  onPick: (lvl: number, name: string) => void;
}) {
  const levels = Array.from({ length: level }, (_, i) => i + 1);
  const picked = Object.entries(chosen)
    .map(([lvlS, name]) => ({ lvl: parseInt(lvlS, 10), name }))
    .filter((x) => x.name);
  return (
    <div className="space-y-2.5">
      <p className="vtm-hint !text-[0.66rem] flex items-center gap-1.5 flex-wrap">
        <span className="vtm-label text-[0.6rem] text-[#a877c0] uppercase tracking-[0.18em]">⚗ Книга формул</span>
        Клик по колбе — сварить формулу этого уровня. Повторный клик — вылить.
      </p>
      {levels.map((lvl) => {
        const formulas = THINBLOOD_FORMULAS.filter((f) => f.level === lvl);
        if (!formulas.length) {
          return (
            <div key={lvl} className="flex items-center gap-2">
              <span className="vtm-label text-[0.62rem] text-[#6e5a53] w-8 shrink-0">{lvl} ур.</span>
              <span className="vtm-hint !text-[0.68rem]">Формулы этого уровня откроются, когда Алхимия поднимется до {lvl}.</span>
            </div>
          );
        }
        return (
          <div key={lvl} className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="vtm-label text-[0.62rem] text-[#6e5a53] w-8 shrink-0">{lvl} ур.</span>
              <span className="flex-1 h-px" style={{ background: "linear-gradient(to right, rgba(168,119,192,0.35), transparent)" }} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-2 sm:pl-4">
              {formulas.map((f) => {
                const active = chosen[lvl] === f.name;
                return (
                  <button
                    key={f.name}
                    type="button"
                    onClick={() => onPick(lvl, active ? "" : f.name)}
                    aria-pressed={active}
                    aria-label={`Формула ${f.name}, уровень ${f.level}`}
                    className={`vtm-formula-pick ${active ? "active" : ""}`}
                  >
                    <span className="vtm-formula-vial" aria-hidden>⚗</span>
                    <span className="flex-1 min-w-0 text-left">
                      <span className="flex items-center gap-1.5 flex-wrap">
                        <b className="text-[0.9rem] text-[#d9c7b6] not-italic">{f.name}</b>
                        <span className="vtm-label text-[0.58rem] text-[#a877c0]" aria-hidden>
                          {"◆".repeat(f.level)}{"◇".repeat(5 - f.level)}
                        </span>
                        {active && <span className="vtm-stamp !text-[0.52rem] !py-0.5">сварена</span>}
                      </span>
                      <span className="block vtm-hint !text-[0.68rem] mt-0.5">{f.effect}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      {/* Заметки о варке выбранных формул — флейвор для отыгрыша */}
      {picked.length > 0 && (
        <div className="space-y-1.5 pt-1">
          {picked.map(({ lvl, name }) => {
            const f = THINBLOOD_FORMULAS.find((x) => x.level === lvl && x.name === name);
            if (!f) return null;
            return (
              <p key={`${lvl}-${name}`} className="vtm-brew-note">
                <b className="not-italic text-[#a877c0]">{name} ({lvl} ур.):</b> {f.brew}
              </p>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Dots({
  value,
  max = 5,
  color = "blood",
  onChange,
  ariaLabel,
}: {
  value: number;
  max?: number;
  color?: "blood" | "gold" | "violet";
  onChange?: (n: number) => void;
  ariaLabel?: string;
}) {
  return (
    <span className="vtm-dots" role="group" aria-label={ariaLabel}>
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          className={`vtm-dot ${color === "gold" ? "gold" : color === "violet" ? "violet" : ""} ${n <= value ? "filled" : ""}`}
          onClick={() => {
            if (!onChange) return;
            if (n === value) onChange(value - 1);
            else if (n === value + 1) onChange(value + 1);
            else onChange(n);
          }}
          onContextMenu={(e) => {
            if (!onChange) return;
            e.preventDefault();
            onChange(Math.max(0, value - 1));
          }}
          disabled={!onChange}
          aria-label={`Уровень ${n}`}
        />
      ))}
    </span>
  );
}

// ============================================================
// ПРЕИМУЩЕСТВА
// ============================================================

type FilterKind = "all" | "background" | "merit" | "flaw" | "thinblood";

/** Найти определение каталога по имени записи (для макс. уровня и цены). */
function findDefByName(name: string) {
  return ADVANTAGE_LIBRARY.find((d) => d.name === name);
}

/** Итоговая цена в пунктах: уровень × цена за уровень. */
function advPoints(kind: string, name: string, rating: number): number | null {
  if (kind === "background") return null; // факты биографии считаются отдельно
  const def = findDefByName(name);
  if (!def || !def.cost) return null; // свои записи — цена договорная
  return rating * def.cost;
}

export function AdvantagesSection({
  data,
  mutate,
  derived,
}: {
  data: VtmSheetData;
  mutate: (fn: (draft: VtmSheetData) => void) => void;
  derived: DerivedStats;
}) {
  const [filter, setFilter] = useState<FilterKind>("background");
  const [customName, setCustomName] = useState("");
  const [customKind, setCustomKind] = useState<"merit" | "flaw">("merit");
  const [catQuery, setCatQuery] = useState("");
  const cq = catQuery.trim().toLowerCase();

  const bgLeft = 7 - derived.backgroundPoints;
  const ownedIds = new Set(data.advantages.filter((a) => a.kind === "background").map((a) => a.name));

  const addBackground = (defId: string, defName: string) => {
    if (data.advantages.some((a) => a.kind === "background" && a.name === defName)) {
      toast.error("Этот факт биографии уже есть");
      return;
    }
    mutate((d) => {
      d.advantages.push({
        id: `bg-${Date.now().toString(36)}-${defId}`,
        name: defName,
        kind: "background",
        rating: 1,
        note: "",
      });
    });
  };

  const addFromCatalog = (defId: string) => {
    const def = ADVANTAGE_BY_ID.get(defId);
    if (!def) return;
    mutate((d) => {
      d.advantages.push({
        id: `adv-${Date.now().toString(36)}-${defId}`,
        name: def.name,
        kind: def.kind,
        rating: 1, // rating = уровень (точки); цена = уровень × def.cost
        note: def.desc,
      });
    });
  };

  const addCustom = () => {
    const trimmed = customName.trim();
    if (!trimmed) return;
    mutate((d) => {
      d.advantages.push({
        id: `custom-${Date.now().toString(36)}`,
        name: trimmed,
        kind: customKind,
        rating: 1,
        note: "",
      });
    });
    setCustomName("");
  };

  const removeAdv = (id: string) => {
    mutate((d) => {
      d.advantages = d.advantages.filter((a) => a.id !== id);
    });
  };

  const list = ADVANTAGE_LIBRARY.filter((a) =>
    filter === "all" ? a.kind !== "background" : a.kind === filter
  ).filter((a) => !cq || `${a.name} ${a.desc}`.toLowerCase().includes(cq));

  const kinds: { id: FilterKind; label: string }[] = [
    { id: "background", label: "Факты биографии" },
    { id: "merit", label: "Достоинства" },
    { id: "flaw", label: "Недостатки" },
    { id: "thinblood", label: "Слабокровные" },
  ];

  return (
    <div className="space-y-4">
      {/* Сводка очков */}
      <div className="vtm-panel p-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="vtm-stamp vtm-stamp-gold">Преимущества</span>
        <span className="vtm-label text-xs text-[#d9c7b6]">
          Факты биографии: <b className={bgLeft === 0 ? "text-[#9fd8b3]" : bgLeft > 0 ? "text-[#d6a840]" : "text-[#e8636b]"}>{derived.backgroundPoints}/7</b>
        </span>
        <span className="vtm-label text-xs text-[#a68d80]">Достоинства: <b className="text-[#d9c7b6]">{derived.meritPoints}</b></span>
        <span className="vtm-label text-xs text-[#a68d80]">Недостатки: <b className="text-[#d9c7b6]">{derived.flawPoints}</b></span>
        <p className="vtm-hint !text-[0.68rem] flex-1 min-w-[200px]">
          7 пунктов — бюджет фактов биографии (затем 3 опыта за точку). Достоинства и недостатки — уровни точками, цена = уровень × цену за уровень.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Мои преимущества */}
        <section className="vtm-panel" aria-label="Мои преимущества">
          <div className="vtm-panel-head">
            <span className="vtm-label text-[0.76rem] text-[#d6a840]">У меня есть</span>
            <span className="vtm-hint !text-[0.66rem] ml-auto">{data.advantages.length} записей</span>
          </div>
          <div className="p-3 space-y-2 max-h-[620px] overflow-y-auto vtm-scroll">
            {data.advantages.length === 0 && (
              <p className="vtm-hint text-center py-4">Пока ничего. Выбирай из каталога справа — или вписывай своё.</p>
            )}
            {data.advantages.map((a) => {
              const isBg = a.kind === "background";
              const kindLabel = isBg ? "факт" : a.kind === "merit" ? "достоинство" : a.kind === "flaw" ? "недостаток" : "слабокровное";
              const def = findDefByName(a.name);
              const maxLvl = isBg ? 5 : def?.max ?? a.rating;
              const pts = advPoints(a.kind, a.name, a.rating);
              const tierText = def?.tiers?.[a.rating - 1];
              return (
                <div key={a.id} className="vtm-frame rounded-md p-2.5 space-y-1.5" style={a.kind === "flaw" ? { borderColor: "rgba(138,26,29,0.4)" } : undefined}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`vtm-stamp !text-[0.56rem] ${a.kind === "flaw" ? "" : "vtm-stamp-gold"}`}>{kindLabel}</span>
                    <span className="text-sm text-[#d9c7b6] flex-1 min-w-[120px]">{a.name}</span>
                    <div className="flex items-center gap-1.5">
                      <Dots
                        value={a.rating}
                        max={maxLvl}
                        color={isBg ? "gold" : a.kind === "flaw" ? "blood" : "gold"}
                        onChange={(n) => mutate((d) => { const x = d.advantages.find((y) => y.id === a.id); if (x) x.rating = n; })}
                        ariaLabel={`${a.name}: уровень ${a.rating}`}
                      />
                      {pts !== null && (
                        <span className="vtm-label text-[0.72rem] text-[#a8863d] whitespace-nowrap">{pts} пт</span>
                      )}
                      <button className="vtm-btn vtm-btn-ghost !p-1 !text-[0.66rem]" onClick={() => removeAdv(a.id)} aria-label={`Убрать ${a.name}`}>✕</button>
                    </div>
                  </div>
                  {tierText && (
                    <p className="vtm-hint !text-[0.72rem] border-l-2 border-[#3d1a20] pl-2">Уровень {a.rating}: {tierText}</p>
                  )}
                  <input
                    className="vtm-input !py-1 !text-[0.8rem]"
                    value={a.note}
                    onChange={(e) => mutate((d) => { const x = d.advantages.find((y) => y.id === a.id); if (x) x.note = e.target.value; })}
                    placeholder="конкретика: кто, где и чем платит"
                    aria-label={`Заметка к ${a.name}`}
                  />
                </div>
              );
            })}
          </div>
          {/* Своё */}
          <div className="p-3 border-t border-[#2b1116] space-y-2">
            <div className="flex gap-2">
              <select className="vtm-input !w-36" value={customKind} onChange={(e) => setCustomKind(e.target.value as "merit" | "flaw")} aria-label="Тип своей записи">
                <option value="merit">достоинство</option>
                <option value="flaw">недостаток</option>
              </select>
              <input
                className="vtm-input flex-1"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCustom()}
                placeholder="своё: прозвище, тайна, враг…"
                aria-label="Название своей записи"
              />
              <button className="vtm-btn shrink-0" onClick={addCustom} disabled={!customName.trim()}>+</button>
            </div>
          </div>
        </section>

        {/* Каталог */}
        <section className="vtm-panel" aria-label="Каталог преимуществ">
          <div className="vtm-panel-head flex-wrap">
            <span className="vtm-label text-[0.76rem] text-[#d6a840]">Каталог</span>
            <div className="flex flex-wrap gap-1 ml-auto">
              {kinds.map((k) => (
                <button
                  key={k.id}
                  className={`vtm-btn !py-1 !px-2 !text-[0.64rem] ${filter === k.id ? "vtm-btn-blood" : "vtm-btn-ghost"}`}
                  onClick={() => setFilter(k.id)}
                >
                  {k.label}
                </button>
              ))}
            </div>
          </div>
          <div className="p-3 space-y-1.5 max-h-[680px] overflow-y-auto vtm-scroll">
            {filter !== "background" && (
              <input
                className="vtm-input !py-1.5 !text-[0.82rem] mb-1"
                value={catQuery}
                onChange={(e) => setCatQuery(e.target.value)}
                placeholder="поиск по каталогу: узлы, враг, пища…"
                aria-label="Поиск по каталогу преимуществ"
              />
            )}
            {filter === "background" ? (
              <>
                {ADVANTAGE_LIBRARY.filter((a) => a.kind === "background").map((def) => {
                  const owned = data.advantages.some((a) => a.kind === "background" && a.name === def.name);
                  const full = derived.backgroundPoints >= 7;
                  return (
                    <div key={def.id} className="flex items-start gap-2 p-2 rounded-md border border-[#2b1116]" style={{ background: "rgba(0,0,0,0.2)" }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-[0.86rem] text-[#d9c7b6]">{def.name}</p>
                        <p className="vtm-hint !text-[0.68rem]">{def.desc}</p>
                      </div>
                      <button
                        className={`vtm-btn shrink-0 !py-1 !px-2 !text-[0.66rem] ${owned ? "" : "vtm-btn-gold"}`}
                        onClick={() => addBackground(def.id, def.name)}
                        disabled={owned || (full && !owned)}
                        title={owned ? "уже есть" : full ? "бюджет 7 пунктов исчерпан" : "взять 1 пункт"}
                      >
                        {owned ? "✓" : "+1"}
                      </button>
                    </div>
                  );
                })}
                <p className="vtm-hint text-center !text-[0.68rem] pt-1">
                  Осталось распределить: {bgLeft >= 0 ? bgLeft : 0} пт. Снимай точки у факта, чтобы вернуть очки.
                </p>
              </>
            ) : (
              list.map((def) => {
                const alreadyOwned = data.advantages.some((a) => a.name === def.name);
                return (
                  <div key={def.id} className="p-2 rounded-md border border-[#2b1116] space-y-1" style={{ background: "rgba(0,0,0,0.2)", opacity: alreadyOwned ? 0.55 : 1 }}>
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[0.86rem] text-[#d9c7b6]">
                          {def.name}
                          {def.cost ? (
                            <span className="vtm-label text-[0.62rem] text-[#a8863d] ml-1.5">
                              {def.max > 1 ? `1–${def.max} ур. · ${def.cost} пт/ур.` : `${def.cost} пт`}
                            </span>
                          ) : null}
                        </p>
                        <p className="vtm-hint !text-[0.72rem]">{def.desc}</p>
                        {def.tiers && def.tiers.length > 1 && (
                          <div className="mt-1 space-y-0.5">
                            {def.tiers.map((t, i) => (
                              <p key={i} className="vtm-hint !text-[0.68rem] pl-1 border-l border-[#3d1a20]">
                                <span className="text-[#a8863d] not-italic">{"●".repeat(i + 1)}</span> {t}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        className="vtm-btn shrink-0 !py-1 !px-2 !text-[0.66rem] vtm-btn-gold"
                        onClick={() => addFromCatalog(def.id)}
                        disabled={alreadyOwned}
                        title={alreadyOwned ? "уже на листе" : "Добавить к листу (1 уровень)"}
                      >
                        {alreadyOwned ? "✓" : "+"}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
            {filter !== "background" && list.length === 0 && (
              <p className="vtm-hint text-center py-3">Ничего не нашлось — попробуй иначе.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

// ============================================================
// ИСТОРИИ (листоги, стр. 384+)
// ============================================================

export function HistoriesSection({
  data,
  mutate,
}: {
  data: VtmSheetData;
  mutate: (fn: (draft: VtmSheetData) => void) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  const setLevel = (sheetId: string, level: number) => {
    mutate((d) => {
      const existing = d.loresheets.find((l) => l.sheetId === sheetId);
      if (!existing) {
        if (level > 0) d.loresheets.push({ sheetId, level, note: "" });
      } else if (level === existing.level) {
        // клик по текущей ступени — снять одну
        existing.level = level - 1;
        if (existing.level <= 0) d.loresheets = d.loresheets.filter((l) => l.sheetId !== sheetId);
      } else if (level === 0) {
        d.loresheets = d.loresheets.filter((l) => l.sheetId !== sheetId);
      } else {
        existing.level = level;
      }
    });
  };

  const totalXp = data.loresheets.reduce((sum, l) => {
    const def = LORESHEET_BY_ID.get(l.sheetId);
    if (!def) return sum;
    return sum + def.levels.slice(0, l.level).reduce((s, lv) => s + lv.xp, 0);
  }, 0);

  return (
    <div className="space-y-4">
      {/* Правила листогов */}
      <div className="vtm-panel p-4 space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <span className="vtm-stamp">Истории</span>
          <span className="vtm-label text-xs text-[#a68d80]">Листогов взято: <b className="text-[#d9c7b6]">{data.loresheets.length}</b></span>
          <span className="vtm-label text-xs text-[#a68d80]">Опыта вложено: <b className="text-[#d6a840]">{totalXp}</b></span>
          <p className="vtm-hint !text-[0.72rem] flex-1 min-w-[220px]">
            Раздел «Истории» книги (стр. 384+): связи с культами, сектами и легендами Маскарада — Бахари, Тео Белл и другие. Ступени покупаются по очереди; клик по точке — ступень, повторный — снять одну.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 pt-1">
          {LORESHEET_RULES.map((r) => (
            <div key={r.title} className="space-y-0.5">
              <span className="vtm-label text-[0.66rem] text-[#d6a840]">{r.title}</span>
              {r.body.map((line, i) => (
                <p key={i} className="vtm-hint !text-[0.74rem] leading-relaxed">{line}</p>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Каталог листогов */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {LORESHEETS.map((ls) => {
          const state = data.loresheets.find((l) => l.sheetId === ls.id);
          const level = state?.level || 0;
          const open = openId === ls.id;
          const xpSpent = ls.levels.slice(0, level).reduce((s, lv) => s + lv.xp, 0);
          return (
            <section key={ls.id} className="vtm-panel" aria-label={ls.name}>
              <button
                className="w-full vtm-panel-head text-left cursor-pointer"
                onClick={() => setOpenId(open ? null : ls.id)}
                aria-expanded={open}
                aria-controls={`ls-${ls.id}`}
              >
                <span className="vtm-display text-[1.01rem] text-[#d9c7b6]">{ls.name}</span>
                <span className="vtm-hint !text-[0.66rem] ml-1 hidden sm:inline">{ls.tagline}</span>
                <span className="ml-auto flex items-center gap-2">
                  {level > 0 && (
                    <span className="vtm-label text-[0.66rem] text-[#d6a840]">ур. {level} · {xpSpent} оп.</span>
                  )}
                  <span className="vtm-label text-[0.66rem] text-[#a8863d]">{open ? "▲" : "▼"}</span>
                </span>
              </button>
              <div id={`ls-${ls.id}`} className="p-3 md:p-4 space-y-2.5">
                <p className="text-[0.9rem] leading-relaxed text-[#a68d80]">{ls.desc}</p>
                {/* Точки ступеней */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="vtm-label text-[0.64rem] text-[#6e5a53]">СТУПЕНИ</span>
                  <span className="vtm-dots" role="group" aria-label={`${ls.name}: уровень ступеней`}>
                    {[1, 2, 3, 4].map((n) => (
                      <button
                        key={n}
                        type="button"
                        className={`vtm-dot gold ${n <= level ? "filled" : ""}`}
                        onClick={() => setLevel(ls.id, n)}
                        aria-label={`Ступень ${n}`}
                        title={n <= level ? `снять до ${n - 1}` : `взять ступень ${n} (${ls.levels[n - 1].xp} опыта)`}
                      />
                    ))}
                  </span>
                  {level === 0 && (
                    <button
                      className="vtm-btn vtm-btn-gold !py-1 !px-2 !text-[0.66rem]"
                      onClick={() => setLevel(ls.id, 1)}
                    >
                      + Взять листог ({ls.levels[0].xp} оп.)
                    </button>
                  )}
                </div>
                {/* Ступени: взятые раскрыты, дальние — свёрнуты */}
                <div className="space-y-1.5">
                  {ls.levels.map((lv, i) => {
                    const lvl = i + 1;
                    const owned = lvl <= level;
                    const locked = lvl > level + 1 && !open; // соседняя всегда видна
                    if (locked) return null;
                    return (
                      <div
                        key={lvl}
                        className={`rounded-md p-2 border ${owned ? "border-[#5c1014]" : "border-[#2b1116]"}`}
                        style={{ background: owned ? "rgba(138,26,29,0.09)" : "rgba(0,0,0,0.2)" }}
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[#a8863d] not-italic text-[0.86rem]" aria-hidden>{"●".repeat(lvl)}{"○".repeat(4 - lvl)}</span>
                          <b className="text-[0.86rem] text-[#d9c7b6] not-italic">{lv.name}</b>
                          <span className="vtm-label text-[0.62rem] text-[#a8863d] ml-auto">{lv.xp} опыта</span>
                        </div>
                        <p className="vtm-hint !text-[0.76rem] mt-1 leading-relaxed">{lv.effect}</p>
                      </div>
                    );
                  })}
                  {!open && level < 4 && (
                    <button className="vtm-hint !text-[0.72rem] underline decoration-dotted cursor-pointer" onClick={() => setOpenId(ls.id)}>
                      показать дальнейшие ступени…
                    </button>
                  )}
                </div>
                {/* Заметка к листогу */}
                {level > 0 && (
                  <input
                    className="vtm-input !py-1 !text-[0.8rem] border-dashed"
                    value={state?.note || ""}
                    onChange={(e) => mutate((d) => { const l = d.loresheets.find((x) => x.sheetId === ls.id); if (l) l.note = e.target.value; })}
                    placeholder="конкретика: кто твой контакт, где схема, чем платит"
                    aria-label={`Заметка к листогу ${ls.name}`}
                  />
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
