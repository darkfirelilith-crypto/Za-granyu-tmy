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
} from "@/lib/vtm-data";
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
        <p className="vtm-hint !text-[0.66rem] flex-1 min-w-[220px]">
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
                <span className={`vtm-label text-[0.7rem] ${clanMark ? "text-[#e8636b]" : "text-[#d6a840]"}`}>
                  {clanMark ? "⛧ " : ""}{def.name}
                </span>
                {clanMark && <span className="vtm-hint !text-[0.56rem] ml-auto uppercase">клановая</span>}
              </div>
              <div className="p-3 md:p-4 space-y-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <Dots value={value} color="violet" onChange={(n) => setDisc(def.id, def.name, { value: n })} ariaLabel={`${def.name}: уровень ${value}`} />
                  <span className="vtm-hint !text-[0.62rem] flex-1">{def.description}</span>
                </div>

                {/* Силы по уровням */}
                {value > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {Array.from({ length: value }, (_, i) => i + 1).map((lvl) => {
                      const powers = def.powers[lvl] || [];
                      const chosen = state?.powers?.[lvl] || "";
                      return (
                        <div key={lvl} className="flex items-center gap-2 flex-wrap">
                          <span className="vtm-label text-[0.56rem] text-[#6e5a53] w-8 shrink-0">{lvl} ур.</span>
                          <select
                            className="vtm-input !py-1 !text-[0.74rem] flex-1 min-w-[160px]"
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
                    {/* Описания выбранных сил */}
                    {state?.powers && Object.entries(state.powers).map(([lvlS, name]) => {
                      const lvl = parseInt(lvlS, 10);
                      const p = (def.powers[lvl] || []).find((x) => x.name === name);
                      if (!p) return null;
                      return (
                        <p key={lvlS} className="vtm-hint !text-[0.64rem] pl-10 border-l border-[#3d1a20]">
                          <b className="text-[#a68d80] not-italic">{name}:</b> {p.desc}
                        </p>
                      );
                    })}
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
          <span className="vtm-label text-[0.66rem] text-[#d6a840]">Редкие Дисциплины</span>
          <span className="vtm-hint !text-[0.62rem] flex-1">Химерия, Валерен, Туман Сета, сочетания и домашки — вписывай вручную</span>
        </div>
        {data.disciplines.filter((x) => x.key === null).map((disc, i) => (
          <div key={i} className="vtm-frame rounded-md p-3 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="vtm-display text-sm text-[#d9c7b6] flex-1 min-w-[140px]">{disc.name}</span>
              <Dots value={disc.value} color="violet" onChange={(n) => mutate((d) => { const list = d.disciplines.filter((x) => x.key === null); list[i].value = n; })} ariaLabel={`${disc.name}: уровень`} />
              <button className="vtm-btn vtm-btn-ghost !p-1 !text-[0.62rem]" onClick={() => removeDisc(null)} aria-label={`Удалить ${disc.name}`}>✕</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {Array.from({ length: disc.value }, (_, lvl) => lvl + 1).map((lvl) => (
                <input
                  key={lvl}
                  className="vtm-input !py-1 !text-[0.74rem]"
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
        rating: def.cost && def.cost > 0 ? def.cost : 1,
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
  );

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
        <p className="vtm-hint !text-[0.62rem] flex-1 min-w-[200px]">
          7 пунктов — бюджет фактов биографии. Достоинства и недостатки — по каталогу (цена в пунктах) или свои.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Мои преимущества */}
        <section className="vtm-panel" aria-label="Мои преимущества">
          <div className="vtm-panel-head">
            <span className="vtm-label text-[0.7rem] text-[#d6a840]">У меня есть</span>
            <span className="vtm-hint !text-[0.6rem] ml-auto">{data.advantages.length} записей</span>
          </div>
          <div className="p-3 space-y-2 max-h-[620px] overflow-y-auto vtm-scroll">
            {data.advantages.length === 0 && (
              <p className="vtm-hint text-center py-4">Пока ничего. Выбирай из каталога справа — или вписывай своё.</p>
            )}
            {data.advantages.map((a) => {
              const isBg = a.kind === "background";
              const kindLabel = isBg ? "факт" : a.kind === "merit" ? "достоинство" : a.kind === "flaw" ? "недостаток" : "слабокровное";
              return (
                <div key={a.id} className="vtm-frame rounded-md p-2.5 space-y-1.5" style={a.kind === "flaw" ? { borderColor: "rgba(138,26,29,0.4)" } : undefined}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`vtm-stamp !text-[0.5rem] ${a.kind === "flaw" ? "" : "vtm-stamp-gold"}`}>{kindLabel}</span>
                    <span className="text-sm text-[#d9c7b6] flex-1 min-w-[120px]">{a.name}</span>
                    <div className="flex items-center gap-1.5">
                      {isBg ? (
                        <Dots value={a.rating} color="gold" onChange={(n) => mutate((d) => { const x = d.advantages.find((y) => y.id === a.id); if (x) x.rating = n; })} ariaLabel={`${a.name}: уровень`} />
                      ) : (
                        <span className="vtm-label text-[0.66rem] text-[#a8863d]">{a.rating} пт</span>
                      )}
                      <button className="vtm-btn vtm-btn-ghost !p-1 !text-[0.6rem]" onClick={() => removeAdv(a.id)} aria-label={`Убрать ${a.name}`}>✕</button>
                    </div>
                  </div>
                  <input
                    className="vtm-input !py-1 !text-[0.74rem]"
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
            <span className="vtm-label text-[0.7rem] text-[#d6a840]">Каталог</span>
            <div className="flex flex-wrap gap-1 ml-auto">
              {kinds.map((k) => (
                <button
                  key={k.id}
                  className={`vtm-btn !py-1 !px-2 !text-[0.58rem] ${filter === k.id ? "vtm-btn-blood" : "vtm-btn-ghost"}`}
                  onClick={() => setFilter(k.id)}
                >
                  {k.label}
                </button>
              ))}
            </div>
          </div>
          <div className="p-3 space-y-1.5 max-h-[680px] overflow-y-auto vtm-scroll">
            {filter === "background" ? (
              <>
                {ADVANTAGE_LIBRARY.filter((a) => a.kind === "background").map((def) => {
                  const owned = data.advantages.some((a) => a.kind === "background" && a.name === def.name);
                  const full = derived.backgroundPoints >= 7;
                  return (
                    <div key={def.id} className="flex items-start gap-2 p-2 rounded-md border border-[#2b1116]" style={{ background: "rgba(0,0,0,0.2)" }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-[0.8rem] text-[#d9c7b6]">{def.name}</p>
                        <p className="vtm-hint !text-[0.62rem]">{def.desc}</p>
                      </div>
                      <button
                        className={`vtm-btn shrink-0 !py-1 !px-2 !text-[0.6rem] ${owned ? "" : "vtm-btn-gold"}`}
                        onClick={() => addBackground(def.id, def.name)}
                        disabled={owned || (full && !owned)}
                        title={owned ? "уже есть" : full ? "бюджет 7 пунктов исчерпан" : "взять 1 пункт"}
                      >
                        {owned ? "✓" : "+1"}
                      </button>
                    </div>
                  );
                })}
                <p className="vtm-hint text-center !text-[0.62rem] pt-1">
                  Осталось распределить: {bgLeft >= 0 ? bgLeft : 0} пт. Снимай точки у факта, чтобы вернуть очки.
                </p>
              </>
            ) : (
              list.map((def) => (
                <div key={def.id} className="flex items-start gap-2 p-2 rounded-md border border-[#2b1116]" style={{ background: "rgba(0,0,0,0.2)" }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-[0.8rem] text-[#d9c7b6]">
                      {def.name}
                      {def.cost ? <span className="vtm-label text-[0.56rem] text-[#a8863d] ml-1.5">{def.cost} пт</span> : null}
                    </p>
                    <p className="vtm-hint !text-[0.62rem]">{def.desc}</p>
                  </div>
                  <button
                    className="vtm-btn shrink-0 !py-1 !px-2 !text-[0.6rem] vtm-btn-gold"
                    onClick={() => addFromCatalog(def.id)}
                    title="Добавить к листу"
                  >
                    +
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
