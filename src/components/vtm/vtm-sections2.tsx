"use client";

// ============================================================
// Секции: Дисциплины (уровни + силы) и Преимущества
// (факты биографии, достоинства/недостатки — покупки через Кошелёк Крови).
// ============================================================

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  VtmSheetData,
  VtmDisciplineState,
  DisciplineDef,
  DISCIPLINES,
  DISCIPLINE_BY_ID,
  CLAN_BY_ID,
  ADVANTAGE_LIBRARY,
  ADVANTAGE_BY_ID,
  THINBLOOD_FORMULAS,
  CLAN_FLAW_PRESETS,
  INCOMPATIBLE_ADVANTAGES,
  XP_COSTS,
  pushXpLog,
  spendEconomy,
  refundEconomy,
  creationLeft,
} from "@/lib/vtm-data";
import { LORESHEETS, LORESHEET_BY_ID, LORESHEET_RULES } from "@/lib/vtm-histories";
import { DISCIPLINE_RULES } from "@/lib/vtm-discipline-systems";
import { DerivedStats } from "@/lib/vtm-calc";
import { vtmUid } from "@/lib/vtm-id";
import { VtmPowerModal, VtmDiscInfoModal } from "@/components/vtm/vtm-power-modal";

// ============================================================
// ДИСЦИПЛИНЫ
// ============================================================

/** Разбор строки амальгамы «Сокрытие 2» или «Сокрытие 2 + Величие 1» → требования. */
function parseAmalgam(amalgam: string): { name: string; level: number }[] {
  return amalgam
    .split("+")
    .map((part) => part.trim())
    .map((part) => {
      const m = part.match(/^(.+?)\s+(\d+)$/);
      return m ? { name: m[1].trim(), level: parseInt(m[2], 10) } : null;
    })
    .filter((x): x is { name: string; level: number } => !!x);
}

/** Проверка требований амальгамы: что уже есть на листе, а чего не хватает. */
function amalgamGaps(data: VtmSheetData, amalgam: string): string[] {
  return parseAmalgam(amalgam)
    .map((req) => {
      const owned = data.disciplines.find((x) => x.name.toLowerCase() === req.name.toLowerCase());
      if (!owned || owned.value < req.level) return `${req.name} ${req.level}`;
      return null;
    })
    .filter((x): x is string => !!x);
}

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
  const clanDiscIds = clan?.disciplines || [];
  const [addMode, setAddMode] = useState<"catalog" | "custom" | null>(null);
  const [catQuery, setCatQuery] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null); // двухшаговое удаление
  const [customName, setCustomName] = useState("");
  const [customDesc, setCustomDesc] = useState("");
  const [customLvl, setCustomLvl] = useState(1);
  // Модальные окна: подробности силы + правила Дисциплины
  const [powerModal, setPowerModal] = useState<{ discId: string; lvl: number; name: string } | null>(null);
  const [infoModalId, setInfoModalId] = useState<string | null>(null);
  const cq = catQuery.trim().toLowerCase();

  const setDisc = (key: string, name: string, patch: Partial<VtmDisciplineState>) => {
    mutate((d) => {
      const existing = d.disciplines.find((x) => x.key === key);
      if (existing) Object.assign(existing, patch);
      else d.disciplines.push({ key, name, value: 0, powers: {}, xp: 0, ...patch });
    });
  };

  const setAt = (idx: number, patch: Partial<VtmDisciplineState>) => {
    mutate((d) => { Object.assign(d.disciplines[idx], patch); });
  };

  /** Авто-запись в журнал опыта: покупка/подъём не списывает очки — цену сверяет Рассказчик. */
  const logXp = (text: string) => {
    mutate((d) => pushXpLog(d, text));
  };

  /** Подъём уровня Дисциплины (каталожной или своей) + авто-списание из Кошелька Крови (стартовый лимит → опыт). */
  const raiseDisc = (key: string | null, name: string, n: number, idx: number) => {
    const prev = key
      ? data.disciplines.find((x) => x.key === key)?.value || 0
      : data.disciplines[idx]?.value || 0;
    if (key) setDisc(key, name, { value: n });
    else setAt(idx, { value: n });
    if (n > prev) spendEconomyPrice(XP_COSTS.discipline(n), `«${name}» ↑ до ${n} (цена ${XP_COSTS.discipline(n)})`);
    else if (n < prev) refundEconomyPrice(XP_COSTS.discipline(prev) - XP_COSTS.discipline(n), `«${name}» ↓ до ${n}`);
  };

  /** Списать цену через mutate-черновик (без тоста — журнал всё помнит). */
  const spendEconomyPrice = (cost: number, label: string) => {
    mutate((d) => spendEconomy(d, cost, label));
  };
  /** Вернуть очки через mutate-черновик. */
  const refundEconomyPrice = (amount: number, label: string) => {
    mutate((d) => refundEconomy(d, amount, label));
  };

  /** Удалить запись листа по индексу — работает и для библиотечных, и для своих. */
  const removeAt = (idx: number, name: string) => {
    mutate((d) => { d.disciplines.splice(idx, 1); });
    setConfirmId(null);
    toast(`«${name}» стёрта с листа`);
  };

  const addFromCatalog = (def: DisciplineDef) => {
    if (data.disciplines.some((x) => x.key === def.id)) {
      toast.error("Эта Дисциплина уже на листе");
      return;
    }
    const cost = XP_COSTS.discipline(1);
    mutate((d) => {
      spendEconomy(d, cost, `новая Дисциплина «${def.name}» (цена ${cost})`);
      d.disciplines.push({ key: def.id, name: def.name, value: 1, powers: {}, xp: 0 });
    });
    toast(`«${def.name}» внесена в лист за ${cost} пт — подними уровень точками и выбери силу`);
  };

  const addCustom = () => {
    const trimmed = customName.trim();
    if (!trimmed) return;
    if (data.disciplines.some((x) => x.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("Такая Дисциплина уже есть");
      return;
    }
    mutate((d) => {
      d.disciplines.push({
        key: null,
        name: trimmed,
        value: Math.max(1, Math.min(5, customLvl)),
        powers: {},
        xp: 0,
        description: customDesc.trim() || undefined,
      });
    });
    setCustomName("");
    setCustomDesc("");
    setCustomLvl(1);
    toast(`Своя Дисциплина «${trimmed}» создана — впиши силы по уровням`);
  };

  // Каталог: клановые первыми, затем ядро книги, затем редкие линии; поиск по силам
  const catalog = useMemo(() => {
    const rank = (x: DisciplineDef) => (clanDiscIds.includes(x.id) ? 0 : x.rare ? 2 : 1);
    const list = [...DISCIPLINES].sort((a, b) => rank(a) - rank(b));
    if (!cq) return list;
    return list.filter((d) => {
      const powers = Object.values(d.powers).flat().map((p) => p.name).join(" ");
      return `${d.name} ${d.description} ${powers}`.toLowerCase().includes(cq);
    });
  }, [cq, clanDiscIds]);

  const onSheet = (id: string) => data.disciplines.some((x) => x.key === id);

  return (
    <div className="space-y-4">
      {/* Шапка */}
      <div className="vtm-panel p-4 flex flex-wrap items-center gap-3">
        <span className="vtm-stamp">Дисциплины</span>
        <span className="vtm-hint !text-[0.75rem]">на листе: <b className="not-italic text-[#d9c7b6]">{data.disciplines.length}</b></span>
        <p className="vtm-hint !text-[0.77rem] flex-1 min-w-[240px]">
          Клик по точке — уровень (0–5); клик по силе — подробности и механика в отдельном окне.
          {clan && ` Клановые: ${clanDiscIds.map((id) => DISCIPLINE_BY_ID.get(id)?.name).join(", ")}.`}
        </p>
        <button
          className={`vtm-btn vtm-btn-ghost !py-1.5 !px-3 text-xs ${addMode === "catalog" ? "!text-[#e8636b] !border-[#e8636b]" : ""}`}
          onClick={() => setAddMode(addMode === "catalog" ? null : "catalog")}
          aria-expanded={addMode === "catalog"}
        >
          ◈ Из каталога
        </button>
        <button
          className={`vtm-btn vtm-btn-ghost !py-1.5 !px-3 text-xs ${addMode === "custom" ? "!text-[#a877c0] !border-[#a877c0]" : ""}`}
          onClick={() => setAddMode(addMode === "custom" ? null : "custom")}
          aria-expanded={addMode === "custom"}
        >
          ✍ Своя
        </button>
      </div>

      {/* Добавление из каталога */}
      {addMode === "catalog" && (
        <section className="vtm-panel p-4 space-y-3" aria-label="Каталог Дисциплин">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="vtm-label text-[0.79rem] text-[#d6a840]">Каталог Дисциплин</span>
            <span className="vtm-hint !text-[0.73rem] flex-1">⛧ — клановые, ✧ — редкие линии. Уже изученные не предлагаются дважды.</span>
          </div>
          <input
            className="vtm-input"
            value={catQuery}
            onChange={(e) => setCatQuery(e.target.value)}
            placeholder="поиск: название, сила, эффект…"
            aria-label="Поиск по каталогу Дисциплин"
          />
          <div className="max-h-[440px] overflow-y-auto overflow-x-hidden vtm-scroll space-y-1.5 pr-1">
            {catalog.map((def) => {
              const taken = onSheet(def.id);
              const clanMark = clanDiscIds.includes(def.id);
              return (
                <div key={def.id} className={`vtm-disc-cat ${taken ? "taken" : ""} ${clanMark ? "clan" : ""} ${def.rare && !clanMark ? "rare" : ""}`}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="vtm-label text-[0.80rem] flex-1 min-w-[120px]">
                      {clanMark ? "⛧ " : def.rare ? "✧ " : ""}{def.name}
                    </span>
                    {clanMark && <span className="vtm-hint !text-[0.66rem] uppercase">клановая</span>}
                    {def.rare && !clanMark && <span className="vtm-hint !text-[0.66rem] uppercase">редкая</span>}
                    {taken ? (
                      <span className="vtm-stamp !text-[0.64rem] !py-0.5 shrink-0">на листе</span>
                    ) : (
                      <button
                        className="vtm-btn !py-1 !px-2.5 !text-[0.74rem] shrink-0"
                        onClick={() => addFromCatalog(def)}
                        aria-label={`Добавить Дисциплину ${def.name} на лист`}
                      >
                        + взять
                      </button>
                    )}
                  </div>
                  <p className="vtm-hint !text-[0.75rem] leading-relaxed">{def.description}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Конструктор своей Дисциплины */}
      {addMode === "custom" && (
        <section className="vtm-panel p-4 space-y-2.5" aria-label="Своя Дисциплина — конструктор">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="vtm-label text-[0.79rem] text-[#a877c0]">Своя Дисциплина</span>
            <span className="vtm-hint !text-[0.73rem] flex-1">
              Редкая кровь, слияние Дисциплин, домашняя механика — называй, описывай и расписывай силы по уровням сам.
            </span>
          </div>
          <div className="flex gap-3 flex-wrap items-center">
            <input
              className="vtm-input flex-1 min-w-[200px]"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCustom()}
              placeholder="название: например, Эхо Ночи"
              aria-label="Название своей Дисциплины"
            />
            <span className="vtm-hint !text-[0.72rem] not-italic flex items-center gap-1.5">
              стартовый уровень:
              <Dots value={customLvl} color="violet" onChange={setCustomLvl} ariaLabel="Стартовый уровень своей Дисциплины" />
            </span>
          </div>
          <textarea
            className="vtm-input min-h-[64px]"
            value={customDesc}
            onChange={(e) => setCustomDesc(e.target.value)}
            placeholder="описание: как проявляется, откуда взялась, чего стоит… (необязательно)"
            aria-label="Описание своей Дисциплины"
            maxLength={600}
          />
          <div className="flex justify-end">
            <button className="vtm-btn" onClick={addCustom} disabled={!customName.trim()}>+ Создать</button>
          </div>
        </section>
      )}

      {/* Пустое состояние: Кровь ещё молчит */}
      {data.disciplines.length === 0 && (
        <div className="vtm-disc-empty" role="status">
          <span className="vtm-disc-empty-moon" aria-hidden>☾</span>
          <p className="vtm-disc-empty-title">Кровь ещё молчит</p>
          <p className="vtm-hint !text-[0.79rem] text-center max-w-[460px]">
            Ни одной Дисциплины. Возьми клановые из каталога — или, если твоя кровь странная, создай свою и опиши её сам.
          </p>
          <div className="flex gap-2 flex-wrap justify-center">
            <button className="vtm-btn !py-2 !px-4" onClick={() => setAddMode("catalog")}>◈ Открыть каталог</button>
            <button className="vtm-btn vtm-btn-ghost !py-2 !px-4" onClick={() => setAddMode("custom")}>✍ Создать свою</button>
          </div>
        </div>
      )}

      {/* ТОЛЬКО Дисциплины игрока — как на листе */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {data.disciplines.map((state, idx) => {
          const def = state.key ? DISCIPLINE_BY_ID.get(state.key) : undefined;
          const value = state.value || 0;
          const clanMark = !!state.key && clanDiscIds.includes(state.key);
          const confirmKey = state.key || `i:${idx}`;
          return (
            <section
              key={state.key || `c:${idx}`}
              className="vtm-panel"
              style={clanMark ? { borderColor: "rgba(194,43,48,0.4)" } : def?.rare ? { borderColor: "rgba(122,74,140,0.4)" } : undefined}
              aria-label={state.name}
            >
              <div className="vtm-panel-head">
                <span className={`vtm-label text-[0.81rem] ${clanMark ? "text-[#e8636b]" : def?.rare ? "text-[#a877c0]" : "text-[#d6a840]"}`}>
                  {clanMark ? "⛧ " : def?.rare ? "✧ " : ""}{state.name}
                </span>
                {clanMark && <span className="vtm-hint !text-[0.70rem] uppercase">клановая</span>}
                {def?.rare && !clanMark && <span className="vtm-hint !text-[0.70rem] uppercase">редкая</span>}
                {!def && <span className="vtm-hint !text-[0.70rem] uppercase">своя</span>}
                {def && (
                  <button
                    className="vtm-disc-info-btn"
                    onClick={() => setInfoModalId(def.id)}
                    aria-label={`Правила и все силы Дисциплины ${state.name}`}
                    title="Правила и все силы — подробно в отдельном окне"
                  >
                    ◈ подробнее
                  </button>
                )}
                <button
                  className="vtm-btn vtm-btn-ghost !p-1 !text-[0.72rem] ml-auto vtm-confirm-del"
                  onClick={() => (confirmId === confirmKey ? removeAt(idx, state.name) : setConfirmId(confirmKey))}
                  onBlur={() => confirmId === confirmKey && setConfirmId(null)}
                  aria-label={`Удалить ${state.name} с листа`}
                  title="Удалить Дисциплину с листа"
                >
                  {confirmId === confirmKey ? "точно?" : "✕"}
                </button>
              </div>
              <div className="p-3 md:p-4 space-y-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <Dots
                    value={value}
                    color="violet"
                    onChange={(n) => (def ? raiseDisc(def.id, def.name, n, idx) : raiseDisc(null, state.name, n, idx))}
                    ariaLabel={`${state.name}: уровень ${value}`}
                  />
                  {def && value > 0 && value < 5 && (
                    <span className="vtm-hint !text-[0.66rem] not-italic whitespace-nowrap" title="Цена опыта за следующий уровень">
                      ↑ опыт: {XP_COSTS.discipline(value + 1)}
                    </span>
                  )}
                  <span className="vtm-hint !text-[0.75rem] flex-1">
                    {def ? def.description : state.description || "Своя Дисциплина — опиши её в конструкторе."}
                  </span>
                </div>

                {/* Силы по уровням: компактные чипы, клик — модалка с подробностями */}
                {value > 0 && def && (
                  <div className="space-y-2 pt-1">
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
                          if (name && name !== (state?.powers?.[lvl] || "")) {
                            spendEconomyPrice(XP_COSTS.disciplinePower(lvl), `формула: «${name}» (${lvl} ур. · Алхимия) (цена ${XP_COSTS.disciplinePower(lvl)})`);
                          }
                        }}
                      />
                    ) : (
                      Array.from({ length: value }, (_, i) => i + 1).map((lvl) => {
                        const powers = def.powers[lvl] || [];
                        const chosen = state?.powers?.[lvl] || "";
                        return (
                          <div key={lvl} className="vtm-disc-lvl-row">
                            <span className="vtm-disc-lvl-num">
                              <b>{lvl} ур.</b>
                              <i className="vtm-disc-lvl-xp">сила · {XP_COSTS.disciplinePower(lvl)} опыта</i>
                            </span>
                            {powers.length > 0 ? (
                              <span className="vtm-disc-lvl-chips">
                                {powers.map((p) => {
                                  const isChosen = chosen === p.name;
                                  const gaps = p.amalgam ? amalgamGaps(data, p.amalgam) : [];
                                  return (
                                    <button
                                      key={p.name}
                                      type="button"
                                      className={`vtm-power-chip ${isChosen ? "chosen" : ""} ${p.amalgam ? "amalgam" : ""} ${gaps.length > 0 && !isChosen ? "gapped" : ""}`}
                                      onClick={() => setPowerModal({ discId: def.id, lvl, name: p.name })}
                                      aria-pressed={isChosen}
                                      aria-label={`${p.name}, ${lvl} уровень${isChosen ? " — выбрана" : ""} — открыть подробности`}
                                      title={gaps.length > 0 && !isChosen ? `амальгама: нужна ${gaps.join(" + ")}` : "Подробности и механика"}
                                    >
                                      {p.amalgam && <span className="vtm-power-chip-mark" aria-hidden>⚭</span>}
                                      <b>{p.name}</b>
                                      {isChosen && <span className="vtm-power-chip-check" aria-hidden>✓</span>}
                                    </button>
                                  );
                                })}
                              </span>
                            ) : (
                              <span className="vtm-hint !text-[0.73rem]">Силы этого уровня пока не описаны — впиши свою через «✍ Своя» или спроси Рассказчика.</span>
                            )}
                            {chosen && (
                              <span className="vtm-disc-chosen-note">
                                <b>{chosen}</b>
                                {(() => {
                                  const p = powers.find((x) => x.name === chosen);
                                  return p?.amalgam ? <i> · амальгама: {p.amalgam}</i> : null;
                                })()}
                              </span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* Своя Дисциплина: редактор сил по уровням — название + описание */}
                {value > 0 && !def && (
                  <div className="space-y-1.5 pt-1">
                    {Array.from({ length: value }, (_, i) => i + 1).map((lvl) => (
                      <div key={lvl} className="vtm-custom-power">
                        <span className="vtm-label text-[0.70rem] text-[#9c8072] w-8 shrink-0">{lvl} ур.</span>
                        <div className="flex-1 min-w-0 space-y-1">
                          <input
                            className="vtm-input !py-1 !text-[0.84rem]"
                            value={state.powers?.[lvl] || ""}
                            onChange={(e) => setAt(idx, { powers: { ...state.powers, [lvl]: e.target.value.slice(0, 60) } })}
                            placeholder={`сила ${lvl} уровня — впиши название`}
                            aria-label={`Название силы ${lvl} уровня — ${state.name}`}
                          />
                          <textarea
                            className="vtm-input !py-1 !text-[0.78rem] min-h-[40px]"
                            value={state.powerNotes?.[lvl] || ""}
                            onChange={(e) => setAt(idx, { powerNotes: { ...state.powerNotes, [lvl]: e.target.value.slice(0, 600) } })}
                            placeholder="как работает: пул, цена, эффект — необязательно"
                            aria-label={`Описание силы ${lvl} уровня — ${state.name}`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {/* Модальное окно: подробности и механика силы */}
      {(() => {
        if (!powerModal) return null;
        const def = DISCIPLINE_BY_ID.get(powerModal.discId);
        if (!def) return null;
        const power = (def.powers[powerModal.lvl] || []).find((p) => p.name === powerModal.name);
        if (!power) return null;
        const state = data.disciplines.find((x) => x.key === def.id);
        const value = state?.value || 0;
        const chosen = state?.powers?.[powerModal.lvl] || "";
        const gaps = power.amalgam ? amalgamGaps(data, power.amalgam) : [];
        const pickPower = (name: string) => {
          mutate((d) => {
            const disc = d.disciplines.find((x) => x.key === def.id);
            if (!disc) return;
            if (!disc.powers) disc.powers = {};
            disc.powers[powerModal.lvl] = name;
          });
          if (name && name !== (state?.powers?.[powerModal.lvl] || "")) {
            spendEconomyPrice(XP_COSTS.disciplinePower(powerModal.lvl), `сила: «${name}» (${powerModal.lvl} ур. · «${def.name}») (цена ${XP_COSTS.disciplinePower(powerModal.lvl)})`);
          }
        };
        return (
          <VtmPowerModal
            disc={def}
            level={powerModal.lvl}
            power={power}
            chosen={!!chosen && chosen === power.name}
            canPick={powerModal.lvl <= value}
            xpCost={XP_COSTS.disciplinePower(powerModal.lvl)}
            warning={gaps.length > 0 ? `амальгама: нужна ${gaps.join(" + ")} — на листе их пока нет` : undefined}
            onPick={() => pickPower(power.name)}
            onRemove={() => pickPower("")}
            onClose={() => setPowerModal(null)}
          />
        );
      })()}

      {/* Модальное окно: правила Дисциплины и все силы по уровням */}
      {(() => {
        if (!infoModalId) return null;
        const def = DISCIPLINE_BY_ID.get(infoModalId);
        if (!def) return null;
        return (
          <VtmDiscInfoModal
            disc={def}
            rules={DISCIPLINE_RULES[def.id]}
            onOpenPower={(lvl, name) => setPowerModal({ discId: def.id, lvl, name })}
            onClose={() => setInfoModalId(null)}
          />
        );
      })()}
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
      <p className="vtm-hint !text-[0.73rem] flex items-center gap-1.5 flex-wrap">
        <span className="vtm-label text-[0.68rem] text-[#a877c0] uppercase tracking-[0.18em]">⚗ Книга формул</span>
        Клик по колбе — сварить формулу этого уровня. Повторный клик — вылить.
      </p>
      {levels.map((lvl) => {
        const formulas = THINBLOOD_FORMULAS.filter((f) => f.level === lvl);
        if (!formulas.length) {
          return (
            <div key={lvl} className="flex items-center gap-2">
              <span className="vtm-label text-[0.70rem] text-[#9c8072] w-8 shrink-0">{lvl} ур.</span>
              <span className="vtm-hint !text-[0.75rem]">Формулы этого уровня откроются, когда Алхимия поднимется до {lvl}.</span>
            </div>
          );
        }
        return (
          <div key={lvl} className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="vtm-label text-[0.70rem] text-[#9c8072] w-8 shrink-0">{lvl} ур.</span>
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
                        <span className="vtm-label text-[0.67rem] text-[#a877c0]" aria-hidden>
                          {"◆".repeat(f.level)}{"◇".repeat(5 - f.level)}
                        </span>
                        {active && <span className="vtm-stamp !text-[0.62rem] !py-0.5">сварена</span>}
                      </span>
                      <span className="block vtm-hint !text-[0.75rem] mt-0.5">{f.effect}</span>
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

/** Итоговая цена в пунктах: уровень × цена за уровень (каталог или своя цена записи). */
function advPoints(kind: string, name: string, rating: number, ownCost?: number): number | null {
  if (kind === "background") return null; // факты биографии считаются отдельно
  const def = findDefByName(name);
  const cost = def?.cost ?? (typeof ownCost === "number" ? ownCost : undefined);
  return cost ? rating * cost : rating; // без цены — по уровню (договорная)
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
  const [customLvl, setCustomLvl] = useState(1);
  const [customCost, setCustomCost] = useState(1);
  const [catQuery, setCatQuery] = useState("");
  const [clanOnly, setClanOnly] = useState(false); // фильтр «подходит клану»
  const cq = catQuery.trim().toLowerCase();

  const clan = CLAN_BY_ID.get(data.info.clan);
  const presetIds = useMemo(() => (clan ? CLAN_FLAW_PRESETS[clan.id] || [] : []), [clan]);

  const bgPoints = derived.backgroundPoints;
  const bgOver = Math.max(0, bgPoints - 7); // сверх стартового лимита — не запрещено, просто оплачено опытом

  /** Приход очков от недостатка уровня n (недостаток — источник очков, не расход). */
  const flawIncome = (n: number) => XP_COSTS.meritRaise(Math.max(1, n));

  const addBackground = (defId: string, defName: string) => {
    if (data.advantages.some((a) => a.kind === "background" && a.name === defName)) {
      toast.error("Этот факт биографии уже есть");
      return;
    }
    mutate((d) => {
      spendEconomy(d, XP_COSTS.background, `факт биографии «${defName}» 1 ур. (цена ${XP_COSTS.background} пт)`);
      d.advantages.push({
        id: vtmUid(`bg-${defId}`),
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
    // Несовместимые пары: предупреждаем, но не запрещаем — лист игрока, а не книга законов
    const conflicts = INCOMPATIBLE_ADVANTAGES[def.id] || [];
    if (conflicts.length) {
      const conflictNames = data.advantages
        .map((a) => findDefByName(a.name))
        .filter((d) => d && conflicts.includes(d.id))
        .map((d) => `«${d!.name}»`);
      if (conflictNames.length) {
        toast.warning(`Не сходится: на листе уже есть ${conflictNames.join(", ")}. Вместе они не работают — снимаешь лишнее?`);
      }
    }
    mutate((d) => {
      if (def.kind === "flaw") {
        // Недостаток — источник очков: Рассказчик возвращает цену в Кошелёк Крови
        refundEconomy(d, flawIncome(1), `недостаток «${def.name}» взят (приход +${flawIncome(1)} пт)`);
      } else {
        spendEconomy(d, XP_COSTS.meritRaise(1), `«${def.name}» 1 ур. (цена ${XP_COSTS.meritRaise(1)})`);
      }
      d.advantages.push({
        id: vtmUid(`adv-${defId}`),
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
      if (customKind === "flaw") {
        refundEconomy(d, flawIncome(customLvl), `свой недостаток «${trimmed}» ур. ${customLvl} (приход +${flawIncome(customLvl)} пт)`);
      } else {
        spendEconomy(d, XP_COSTS.meritRaise(customLvl), `своё «${trimmed}» ур. ${customLvl} (цена ${XP_COSTS.meritRaise(customLvl)})`);
      }
      d.advantages.push({
        id: vtmUid("custom"),
        name: trimmed,
        kind: customKind,
        rating: Math.max(1, Math.min(5, customLvl)),
        note: "",
        cost: Math.max(0, Math.min(9, customCost)),
      });
    });
    setCustomName("");
    setCustomLvl(1);
    setCustomCost(1);
  };

  const removeAdv = (id: string) => {
    const entry = data.advantages.find((a) => a.id === id);
    mutate((d) => {
      if (entry) {
        if (entry.kind === "flaw") {
          // снял недостаток — вернул Рассказчику его цену
          spendEconomy(d, flawIncome(entry.rating), `недостаток «${entry.name}» снят (расплата ${flawIncome(entry.rating)} пт)`);
        } else if (entry.kind === "background") {
          refundEconomy(d, XP_COSTS.background * entry.rating, `факт биографии «${entry.name}» снят`);
        } else if (entry.rating > 0) {
          refundEconomy(d, XP_COSTS.meritRaise(entry.rating), `«${entry.name}» снят с листа`);
        }
      }
      d.advantages = d.advantages.filter((a) => a.id !== id);
    });
  };

  const kinds: { id: FilterKind; label: string }[] = [
    { id: "background", label: "Факты биографии" },
    { id: "merit", label: "Достоинства" },
    { id: "flaw", label: "Недостатки" },
    { id: "thinblood", label: "Слабокровные" },
    { id: "all", label: "Всё" },
  ];

  // Каталог: фильтр по типу + поиск + «подходит клану», с подгруппами книги
  const pool = ADVANTAGE_LIBRARY.filter((a) =>
    filter === "all" ? true : filter === "background" ? a.kind === "background" : a.kind === filter
  )
    .filter((a) => !clanOnly || presetIds.includes(a.id))
    .filter((a) => !cq || `${a.name} ${a.desc} ${a.group || ""}`.toLowerCase().includes(cq));

  // Групповой порядок внутри выбранного типа
  const GROUP_ORDER: Record<string, string[]> = {
    merit: ["Языки", "Внешность", "Вещества", "Архаичные", "Узы", "Охота", "Мифические", "Психологические", "Кровные узы", "Прочее", "Каитифы", "Гули", "Культы"],
    flaw: ["Языки", "Внешность", "Вещества", "Архаичные", "Узы", "Охота", "Мифические", "Изъяны Дисциплин", "Психологические", "Заражение", "Кровные узы", "Диаблери", "Прочее", "Каитифы", "Гули", "Культы"],
  };
  const groupedEntries = (() => {
    if (filter === "background") return [{ group: "", items: pool }];
    const order = GROUP_ORDER[filter] || [];
    const known = order.map((g) => ({ group: g, items: pool.filter((a) => (a.group || "Прочее") === g) })).filter((g) => g.items.length > 0);
    if (filter !== "all" && filter !== "thinblood") return known;
    // для «Всё» и «Слабокровные» — просто по алфавиту групп
    const rest = pool
      .filter((a) => !known.some((k) => k.items.includes(a)))
      .reduce<{ group: string; items: typeof pool }[]>((acc, a) => {
        const g = a.group || "Прочее";
        const bucket = acc.find((x) => x.group === g);
        if (bucket) bucket.items.push(a); else acc.push({ group: g, items: [a] });
        return acc;
      }, []);
    return [...known, ...rest];
  })();

  return (
    <div className="space-y-4">
      {/* Сводка очков */}
      <div className="vtm-panel p-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="vtm-stamp vtm-stamp-gold">Преимущества</span>
        <span className="vtm-label text-xs text-[#d9c7b6]">
          Факты биографии: <b className={bgOver === 0 ? "text-[#d6a840]" : "text-[#a8863d]"}>{bgPoints}</b>
          <i className="vtm-hint !text-[0.70rem] not-italic"> · старт 7 пт{bgOver > 0 ? ` · сверх лимита: ${bgOver} пт за опыт` : " · дальше за опыт, без лимита"}</i>
        </span>
        <span className="vtm-label text-xs text-[#c4ac9d]">Достоинства: <b className="text-[#d9c7b6]">{derived.meritPoints}</b></span>
        <span className="vtm-label text-xs text-[#c4ac9d]">Недостатки: <b className="text-[#e8636b]">+{derived.flawPoints}</b></span>
        <p className="vtm-hint !text-[0.75rem] flex-1 min-w-[200px]">
          Без лимитов — есть только цена: списывается из стартового лимита, потом из опыта. Недостатки наоборот ПРИНОСЯТ очки в Кошелёк Крови. Снятие записи возвращает потраченное.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Мои преимущества */}
        <section className="vtm-panel" aria-label="Мои преимущества">
          <div className="vtm-panel-head">
            <span className="vtm-label text-[0.81rem] text-[#d6a840]">У меня есть</span>
            <span className="vtm-hint !text-[0.73rem] ml-auto">{data.advantages.length} записей</span>
          </div>
          <div className="p-3 space-y-2 max-h-[620px] overflow-y-auto overflow-x-hidden vtm-scroll">
            {data.advantages.length === 0 && (
              <p className="vtm-hint text-center py-4">Пока ничего. Выбирай из каталога справа — или вписывай своё.</p>
            )}
            {data.advantages.map((a) => {
              const isBg = a.kind === "background";
              const kindLabel = isBg ? "факт" : a.kind === "merit" ? "достоинство" : a.kind === "flaw" ? "недостаток" : "слабокровное";
              const def = findDefByName(a.name);
              const isCustom = !def;
              const maxLvl = isBg ? 5 : def?.max ?? 5; // свои записи — до 5 уровней
              const pts = advPoints(a.kind, a.name, a.rating, a.cost);
              const tierText = def?.tiers?.[a.rating - 1];
              const conflictNames = def && INCOMPATIBLE_ADVANTAGES[def.id]
                ? data.advantages
                    .map((x) => findDefByName(x.name))
                    .filter((d) => d && INCOMPATIBLE_ADVANTAGES[def.id].includes(d.id))
                    .map((d) => d!.name)
                : [];
              return (
                <div key={a.id} className="vtm-frame rounded-md p-2.5 space-y-1.5" style={a.kind === "flaw" ? { borderColor: "rgba(138,26,29,0.4)" } : undefined}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`vtm-stamp !text-[0.66rem] ${a.kind === "flaw" ? "" : "vtm-stamp-gold"}`}>{kindLabel}</span>
                    {def?.group && <span className="vtm-hint !text-[0.67rem] not-italic">{def.group}</span>}
                    <span className="text-sm text-[#d9c7b6] flex-1 min-w-[120px]">{a.name}</span>
                    <div className="flex items-center gap-1.5">
                      <Dots
                        value={a.rating}
                        max={maxLvl}
                        color={isBg ? "gold" : a.kind === "flaw" ? "blood" : "gold"}
                        onChange={(n) => mutate((d) => {
                          const x = d.advantages.find((y) => y.id === a.id);
                          if (!x) return;
                          // авто-списание/возврат через Кошелёк Крови: недостатки дают очки, остальное — тратит
                          if (a.kind === "flaw") {
                            if (n > x.rating) refundEconomy(d, flawIncome(n) - flawIncome(x.rating), `недостаток «${a.name}» ↑ до ${n} (приход +${flawIncome(n) - flawIncome(x.rating)} пт)`);
                            else if (n < x.rating) spendEconomy(d, flawIncome(x.rating) - flawIncome(n), `недостаток «${a.name}» ↓ до ${n} (расплата ${flawIncome(x.rating) - flawIncome(n)} пт)`);
                          } else if (n > x.rating) {
                            const cost = isBg ? XP_COSTS.background * (n - x.rating) : XP_COSTS.meritRaise(n);
                            spendEconomy(d, cost, `«${a.name}» ↑ до ${n} (цена ${cost})`);
                          } else if (n < x.rating) {
                            const back = isBg ? XP_COSTS.background * (x.rating - n) : XP_COSTS.meritRaise(x.rating) - XP_COSTS.meritRaise(n);
                            refundEconomy(d, back, `«${a.name}» ↓ до ${n}`);
                          }
                          x.rating = n;
                        })}
                        ariaLabel={`${a.name}: уровень ${a.rating}`}
                      />
                      {pts !== null && (
                        <span className="vtm-label text-[0.77rem] text-[#a8863d] whitespace-nowrap">{pts} пт</span>
                      )}
                      <button className="vtm-btn vtm-btn-ghost !p-1 !text-[0.73rem]" onClick={() => removeAdv(a.id)} aria-label={`Убрать ${a.name}`}>✕</button>
                    </div>
                  </div>
                  {tierText && (
                    <p className="vtm-hint !text-[0.77rem] border-l-2 border-[#3d1a20] pl-2">Уровень {a.rating}: {tierText}</p>
                  )}
                  {conflictNames.length > 0 && (
                    <p className="vtm-hint !text-[0.74rem] vtm-req">
                      ⚠ Конфликт: с «{conflictNames.join("», «")}» вместе не работают
                    </p>
                  )}
                  <input
                    className="vtm-input !py-1 !text-[0.84rem]"
                    value={a.note}
                    onChange={(e) => mutate((d) => { const x = d.advantages.find((y) => y.id === a.id); if (x) x.note = e.target.value; })}
                    placeholder="конкретика: кто, где и чем платит"
                    aria-label={`Заметка к ${a.name}`}
                  />
                  {isCustom && a.kind !== "thinblood" && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <label className="vtm-hint !text-[0.7rem] not-italic flex items-center gap-1">
                        цена/ур.:
                        <input
                          type="number"
                          min={0}
                          max={9}
                          className="vtm-input !w-14 !py-0.5 !text-[0.76rem] text-center"
                          value={a.cost ?? 0}
                          onChange={(e) => {
                            const v = Math.max(0, Math.min(9, Math.floor(Number(e.target.value) || 0)));
                            mutate((d) => { const x = d.advantages.find((y) => y.id === a.id); if (x) x.cost = v; });
                          }}
                          aria-label={`Цена за уровень своей записи ${a.name}`}
                        />
                      </label>
                      <span className="vtm-hint !text-[0.67rem]">0 = договорная (считается по уровню)</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {/* Своё: расширенный конструктор */}
          <div className="p-3 border-t border-[#2b1116] space-y-2">
            <div className="flex gap-2">
              <select className="vtm-input !w-36" value={customKind} onChange={(e) => setCustomKind(e.target.value as "merit" | "flaw")} aria-label="Тип своей записи">
                <option value="merit">достоинство</option>
                <option value="flaw">недостаток</option>
              </select>
              <input
                className="vtm-input flex-1 min-w-0"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCustom()}
                placeholder="своё: прозвище, тайна, враг, фольклорный страх…"
                aria-label="Название своей записи"
              />
              <button className="vtm-btn shrink-0" onClick={addCustom} disabled={!customName.trim()}>+</button>
            </div>
            <div className="flex items-center gap-x-4 gap-y-1 flex-wrap">
              <span className="vtm-hint !text-[0.7rem] not-italic flex items-center gap-1.5">
                уровень:
                <Dots value={customLvl} max={5} color={customKind === "flaw" ? "blood" : "gold"} onChange={setCustomLvl} ariaLabel="Уровень своей записи" />
              </span>
              <label className="vtm-hint !text-[0.7rem] not-italic flex items-center gap-1">
                цена/ур.:
                <input
                  type="number"
                  min={0}
                  max={9}
                  className="vtm-input !w-14 !py-0.5 !text-[0.76rem] text-center"
                  value={customCost}
                  onChange={(e) => setCustomCost(Math.max(0, Math.min(9, Math.floor(Number(e.target.value) || 0))))}
                  aria-label="Цена за уровень своей записи"
                />
              </label>
              <span className="vtm-hint !text-[0.67rem]">0 = договорная (считается по уровню); итог = уровень × цена</span>
            </div>
          </div>
        </section>

        {/* Каталог */}
        <section className="vtm-panel" aria-label="Каталог преимуществ">
          <div className="vtm-panel-head flex-wrap">
            <span className="vtm-label text-[0.81rem] text-[#d6a840]">Каталог</span>
            <div className="flex flex-wrap gap-1 ml-auto">
              {kinds.map((k) => (
                <button
                  key={k.id}
                  className={`vtm-btn !py-1 !px-2 !text-[0.72rem] ${filter === k.id ? "vtm-btn-blood" : "vtm-btn-ghost"}`}
                  onClick={() => {
                    setFilter(k.id);
                    // «для клана» имеет смысл только у Недостатков и «Всё» — не даём фильтру молча висеть
                    if (k.id !== "flaw" && k.id !== "all") setClanOnly(false);
                  }}
                >
                  {k.label}
                </button>
              ))}
              {presetIds.length > 0 && (filter === "flaw" || filter === "all") && (
                <button
                  className={`vtm-btn !py-1 !px-2 !text-[0.72rem] ${clanOnly ? "vtm-btn-blood" : "vtm-btn-ghost"}`}
                  onClick={() => setClanOnly((v) => !v)}
                  aria-pressed={clanOnly}
                  title={`Недостатки, что подходят клану «${clan?.name}»`}
                >
                  ⛧ для клана
                </button>
              )}
            </div>
          </div>
          <div className="p-3 space-y-2 max-h-[680px] overflow-y-auto overflow-x-hidden vtm-scroll">
            {filter !== "background" && (
              <input
                className="vtm-input !py-1.5 !text-[0.86rem]"
                value={catQuery}
                onChange={(e) => setCatQuery(e.target.value)}
                placeholder="поиск: чеснок, стигматы, узы, предпочтение…"
                aria-label="Поиск по каталогу преимуществ"
              />
            )}
            {filter === "background" ? (
              <>
                {ADVANTAGE_LIBRARY.filter((a) => a.kind === "background").map((def) => {
                  const owned = data.advantages.some((a) => a.kind === "background" && a.name === def.name);
                  return (
                    <div key={def.id} className="flex items-start gap-2 p-2 rounded-md border border-[#2b1116]" style={{ background: "rgba(0,0,0,0.2)" }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-[0.88rem] text-[#d9c7b6]">
                          {def.name}
                          <span className="vtm-label text-[0.70rem] text-[#a8863d] ml-1.5">3 пт/точка · до 5 ур.</span>
                        </p>
                        <p className="vtm-hint !text-[0.75rem]">{def.desc}</p>
                      </div>
                      <button
                        className={`vtm-btn shrink-0 !py-1 !px-2 !text-[0.73rem] ${owned ? "" : "vtm-btn-gold"}`}
                        onClick={() => addBackground(def.id, def.name)}
                        disabled={owned}
                        title={owned ? "уже есть — поднимай уровень точками в списке слева" : `взять за ${XP_COSTS.background} пт (стартовый лимит → опыт)`}
                      >
                        {owned ? "✓" : `+${XP_COSTS.background} пт`}
                      </button>
                    </div>
                  );
                })}
                <p className="vtm-hint text-center !text-[0.75rem] pt-1">
                  Лимитов нет: первая точка — 3 пт, каждая следующая — ещё 3 (списывается из стартового лимита, затем из опыта).
                </p>
              </>
            ) : (
              groupedEntries.map(({ group, items }) => (
                <div key={group || "base"} className="space-y-1.5">
                  {group && <p className="vtm-cat-head vtm-label">{group}</p>}
                  {items.map((def) => {
                    const alreadyOwned = data.advantages.some((a) => a.name === def.name);
                    const canAdd = !alreadyOwned || def.stackable;
                    return (
                      <div key={def.id} className="p-2 rounded-md border border-[#2b1116] space-y-1" style={{ background: "rgba(0,0,0,0.2)", opacity: alreadyOwned && !def.stackable ? 0.55 : 1 }}>
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-[0.88rem] text-[#d9c7b6]">
                              {def.name}
                              {def.cost !== undefined && def.cost > 0 ? (
                                <span className="vtm-label text-[0.70rem] text-[#a8863d] ml-1.5">
                                  {def.max > 1 ? `1–${def.max} ур. · ${def.cost} пт/ур.` : `${def.cost} пт`}
                                </span>
                              ) : def.cost === 0 ? (
                                <span className="vtm-label text-[0.70rem] text-[#a8863d] ml-1.5">цена договорная</span>
                              ) : null}
                              {def.stackable && <span className="vtm-label text-[0.66rem] text-[#b0565e] ml-1.5">можно несколько</span>}
                              {def.req && <span className="vtm-req vtm-label ml-1.5">{def.req}</span>}
                            </p>
                            <p className="vtm-hint !text-[0.77rem]">{def.desc}</p>
                            {def.tiers && def.tiers.length > 1 && (
                              <div className="mt-1 space-y-0.5">
                                {def.tiers.map((t, i) => (
                                  <p key={i} className="vtm-hint !text-[0.75rem] pl-1 border-l border-[#3d1a20]">
                                    <span className="text-[#a8863d] not-italic">{"●".repeat(i + 1)}</span> {t}
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                          <button
                            className="vtm-btn shrink-0 !py-1 !px-2 !text-[0.73rem] vtm-btn-gold"
                            onClick={() => addFromCatalog(def.id)}
                            disabled={!canAdd}
                            title={alreadyOwned && !def.stackable ? "уже на листе" : def.stackable ? "Добавить ещё одну" : "Добавить к листу (1 уровень)"}
                          >
                            {alreadyOwned && !def.stackable ? "✓" : "+"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
            {filter !== "background" && pool.length === 0 && (
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [catQuery, setCatQuery] = useState("");
  const [onlyOwned, setOnlyOwned] = useState(false);

  const setLevel = (sheetId: string, level: number) => {
    mutate((d) => {
      const existing = d.loresheets.find((l) => l.sheetId === sheetId);
      const prev = existing?.level || 0;
      let next = prev;
      if (!existing) {
        if (level > 0) {
          d.loresheets.push({ sheetId, level, note: "" });
          next = level;
        }
      } else if (level === existing.level) {
        // клик по текущей ступени — снять одну
        existing.level = level - 1;
        next = level - 1;
        if (existing.level <= 0) {
          d.loresheets = d.loresheets.filter((l) => l.sheetId !== sheetId);
          next = 0;
        }
      } else if (level === 0) {
        d.loresheets = d.loresheets.filter((l) => l.sheetId !== sheetId);
        next = 0;
      } else {
        existing.level = level;
        next = level;
      }
      // Авто-списание через Кошелёк Крови: стартовый лимит → опыт; цена известна из данных листога
      const def = LORESHEET_BY_ID.get(sheetId);
      if (!def || next === prev) return;
      if (next > prev) {
        const gained = def.levels.slice(prev, next).reduce((s, lv) => s + lv.xp, 0);
        const top = def.levels[next - 1];
        spendEconomy(d, gained, `листог «${def.name}» → ступень ${next} «${top.name}» (цена ${gained})`);
      } else {
        const released = def.levels.slice(next, prev).reduce((s, lv) => s + lv.xp, 0);
        refundEconomy(
          d,
          released,
          next === 0
            ? `листог «${def.name}» снят (была ступень ${prev})`
            : `листог «${def.name}» ↓ откат к ступени ${next}`
        );
      }
    });
  };

  const totalXp = data.loresheets.reduce((sum, l) => {
    const def = LORESHEET_BY_ID.get(l.sheetId);
    if (!def) return sum;
    return sum + def.levels.slice(0, l.level).reduce((s, lv) => s + lv.xp, 0);
  }, 0);

  // Каталог: взятые сверху, затем по алфавиту; фильтр «только взятые» + поиск
  const catalogList = useMemo(() => {
    const q = catQuery.trim().toLowerCase();
    let list = [...LORESHEETS];
    if (onlyOwned) list = list.filter((ls) => data.loresheets.some((l) => l.sheetId === ls.id));
    if (q) {
      list = list.filter((ls) =>
        `${ls.name} ${ls.tagline} ${ls.desc}`.toLowerCase().includes(q) ||
        ls.levels.some((lv) => `${lv.name} ${lv.effect}`.toLowerCase().includes(q))
      );
    }
    list.sort((a, b) => {
      const aOwned = data.loresheets.some((l) => l.sheetId === a.id) ? 0 : 1;
      const bOwned = data.loresheets.some((l) => l.sheetId === b.id) ? 0 : 1;
      if (aOwned !== bOwned) return aOwned - bOwned;
      return a.name.localeCompare(b.name, "ru");
    });
    return list;
  }, [catQuery, onlyOwned, data.loresheets]);

  // Выбранный листог: явный выбор или первый взятый
  const selected =
    (selectedId && LORESHEETS.find((ls) => ls.id === selectedId)) ||
    LORESHEETS.find((ls) => data.loresheets.some((l) => l.sheetId === ls.id)) ||
    null;

  return (
    <div className="space-y-4">
      {/* Правила листогов */}
      <div className="vtm-panel p-4 space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <span className="vtm-stamp">Истории</span>
          <span className="vtm-label text-xs text-[#c4ac9d]">Листогов взято: <b className="text-[#d9c7b6]">{data.loresheets.length}</b></span>
          <span className="vtm-label text-xs text-[#c4ac9d]">Опыта вложено: <b className="text-[#d6a840]">{totalXp}</b></span>
          <p className="vtm-hint !text-[0.77rem] flex-1 min-w-[220px]">
            Раздел «Истории» книги (стр. 384+) и дополнений: связи с культами, сектами и легендами Маскарада — Бахари, Тео Белл, Беккет, Книга Нода и другие. Ступени покупаются по очереди; клик по точке — ступень, повторный — снять одну. Цена списывается из Кошелька Крови (стартовый лимит → опыт) — без лимитов на количество.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 pt-1">
          {LORESHEET_RULES.map((r) => (
            <div key={r.title} className="space-y-0.5">
              <span className="vtm-label text-[0.73rem] text-[#d6a840]">{r.title}</span>
              {r.body.map((line, i) => (
                <p key={i} className="vtm-hint !text-[0.79rem] leading-relaxed">{line}</p>
              ))}
            </div>
          ))}
        </div>
        <p className="vtm-hint !text-[0.77rem] pt-1 vtm-hist-bonus-note">
          <span className="text-[#d6a840] not-italic">★</span> — механический баф ступени: держи его на виду за столом (кости к проверкам, услуги, перебросы). Покупка ступени списывает цену из Кошелька Крови автоматически.
        </p>
      </div>

      {/* Каталог слева + выбранный листог в основном блоке */}
      <div className="vtm-hist-layout grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4 items-start">
        {/* КАТАЛОГ */}
        <aside className="vtm-panel p-3 md:p-4 space-y-2.5 vtm-hist-catalog" aria-label="Каталог историй">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="vtm-label text-[0.79rem] text-[#d6a840]">Каталог историй</span>
            <span className="vtm-label text-[0.70rem] text-[#9c8072] ml-auto">{catalogList.length} из {LORESHEETS.length}</span>
          </div>
          <input
            className="vtm-input !py-1.5 !text-[0.84rem]"
            value={catQuery}
            onChange={(e) => setCatQuery(e.target.value)}
            placeholder="поиск: культ, секта, имя…"
            aria-label="Поиск по каталогу историй"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={`vtm-hist-filter ${onlyOwned ? "active" : ""}`}
              onClick={() => setOnlyOwned(!onlyOwned)}
              aria-pressed={onlyOwned}
            >
              {onlyOwned ? "✓ только взятые" : "только взятые"}
            </button>
            {selectedId && (
              <button type="button" className="vtm-hint !text-[0.72rem] underline decoration-dotted" onClick={() => setSelectedId(null)}>
                сбросить выбор
              </button>
            )}
          </div>
          <div className="max-h-[480px] overflow-y-auto overflow-x-hidden vtm-scroll space-y-1.5 pr-1">
            {catalogList.map((ls) => {
              const state = data.loresheets.find((l) => l.sheetId === ls.id);
              const level = state?.level || 0;
              const xpSpent = ls.levels.slice(0, level).reduce((s, lv) => s + lv.xp, 0);
              const active = selected?.id === ls.id;
              return (
                <button
                  key={ls.id}
                  type="button"
                  className={`vtm-hist-item ${active ? "active" : ""} ${level > 0 ? "owned" : ""}`}
                  onClick={() => setSelectedId(ls.id)}
                  aria-pressed={active}
                  aria-label={`История «${ls.name}»${level > 0 ? `, ступень ${level}` : ""}`}
                >
                  <span className="vtm-hist-item-name">{ls.name}</span>
                  <span className="vtm-hist-item-tag">{ls.tagline}</span>
                  {level > 0 ? (
                    <span className="vtm-hist-item-badge">ур. {level} · {xpSpent} оп.</span>
                  ) : (
                    <span className="vtm-hist-item-badge muted">не взята</span>
                  )}
                </button>
              );
            })}
            {catalogList.length === 0 && (
              <p className="vtm-hint text-center py-3">Ни одна история не откликнулась — попробуй иначе.</p>
            )}
          </div>
        </aside>

        {/* ОСНОВНОЙ БЛОК: выбранный листог */}
        <div className="min-w-0 space-y-4">
          {!selected && (
            <div className="vtm-hist-empty" role="status">
              <span className="vtm-hist-empty-scroll" aria-hidden>📜</span>
              <p className="vtm-disc-empty-title">Выбери историю из каталога</p>
              <p className="vtm-hint !text-[0.79rem] text-center max-w-[460px]">
                Слева — все истории Маскарада: культы, секты и легендарные Сородичи. Клик по названию — и история раскроется здесь: описание, ступени и цена опыта.
              </p>
            </div>
          )}

          {selected && (() => {
            const ls = selected;
            const state = data.loresheets.find((l) => l.sheetId === ls.id);
            const level = state?.level || 0;
            const xpSpent = ls.levels.slice(0, level).reduce((s, lv) => s + lv.xp, 0);
            return (
              <section className="vtm-panel" aria-label={`История: ${ls.name}`}>
                <div className="vtm-panel-head">
                  <span className="vtm-display text-[1.05rem] text-[#d9c7b6]">{ls.name}</span>
                  <span className="vtm-hint !text-[0.73rem] ml-1">{ls.tagline}</span>
                  <span className="ml-auto flex items-center gap-2">
                    {level > 0 && (
                      <span className="vtm-label text-[0.73rem] text-[#d6a840]">ур. {level} · {xpSpent} оп.</span>
                    )}
                  </span>
                </div>
                <div className="p-3 md:p-4 space-y-2.5">
                  <p className="text-[0.9rem] leading-relaxed text-[#c4ac9d]">{ls.desc}</p>
                  {/* Точки ступеней */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="vtm-label text-[0.72rem] text-[#9c8072]">СТУПЕНИ</span>
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
                        className="vtm-btn vtm-btn-gold !py-1 !px-2 !text-[0.73rem]"
                        onClick={() => setLevel(ls.id, 1)}
                      >
                        + Взять листог ({ls.levels[0].xp} оп.)
                      </button>
                    )}
                  </div>
                  {/* Все ступени — в основном блоке видны сразу */}
                  <div className="space-y-1.5">
                    {ls.levels.map((lv, i) => {
                      const lvl = i + 1;
                      const owned = lvl <= level;
                      const next = lvl === level + 1;
                      if (!owned && !next) return null;
                      return (
                        <div
                          key={lvl}
                          className={`rounded-md p-2 border ${owned ? "border-[#5c1014]" : "border-[#2b1116]"}`}
                          style={{ background: owned ? "rgba(138,26,29,0.09)" : "rgba(0,0,0,0.2)" }}
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[#a8863d] not-italic text-[0.88rem]" aria-hidden>{"●".repeat(lvl)}{"○".repeat(4 - lvl)}</span>
                            <b className="text-[0.88rem] text-[#d9c7b6] not-italic">{lv.name}</b>
                            <span className="vtm-label text-[0.70rem] text-[#a8863d] ml-auto">{lv.xp} опыта</span>
                          </div>
                          <p className="vtm-hint !text-[0.81rem] mt-1 leading-relaxed">{lv.effect}</p>
                          {lv.bonus && (
                            <p className={`vtm-hist-bonus-chip ${owned ? "owned" : ""}`} title="Механический баф ступени — держи на виду за столом">
                              <span aria-hidden>★</span> {lv.bonus}
                            </p>
                          )}
                        </div>
                      );
                    })}
                    {level < 4 && (
                      <button
                        className="vtm-hint !text-[0.77rem] underline decoration-dotted cursor-pointer"
                        onClick={() => setLevel(ls.id, Math.min(4, level + 2))}
                      >
                        открыть следующую ступень…
                      </button>
                    )}
                  </div>
                  {/* Заметка к листогу */}
                  {level > 0 && (
                    <input
                      className="vtm-input !py-1 !text-[0.84rem] border-dashed"
                      value={state?.note || ""}
                      onChange={(e) => mutate((d) => { const l = d.loresheets.find((x) => x.sheetId === ls.id); if (l) l.note = e.target.value; })}
                      placeholder="конкретика: кто твой контакт, где схема, чем платит"
                      aria-label={`Заметка к листогу ${ls.name}`}
                    />
                  )}
                </div>
              </section>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
