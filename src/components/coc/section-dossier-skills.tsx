"use client";

import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  CocSheetData,
  CocSkillState,
  CHARACTERISTICS,
  OCCUPATIONS,
  SKILL_LIBRARY,
  uid,
} from "@/lib/coc-data";
import {
  DerivedStats,
  occupationPoints,
  occupationChoiceStats,
  occupationSpent,
  personalTotal,
  personalSpent,
  skillBase,
  skillTotal,
  rollD100,
  insanityInsight,
  improvementCheck,
} from "@/lib/coc-calc";
import { rollSkillCheck, publishRoll } from "@/components/coc/coc-dice";

interface SectionProps {
  data: CocSheetData;
  mutate: (fn: (draft: CocSheetData) => void) => void;
  derived: DerivedStats;
}

/* ============================================================
   ВКЛАДКА «ДОСЬЕ»: портрет, сведения, характеристики, трекеры
   ============================================================ */

export function DossierSection({ data, mutate, derived }: SectionProps) {
  const { info, characteristics: c, trackers } = data;
  const fileRef = useRef<HTMLInputElement>(null);

  const hpMax = Math.max(0, derived.hpMax + (trackers.hpBonus || 0));
  const mpMax = Math.max(0, derived.mpMax + (trackers.mpBonus || 0));
  const sanCurrent = trackers.sanCurrent ?? derived.sanStart;
  const luckCurrent = trackers.luckCurrent ?? c.luck;
  const hpCurrent = trackers.hpCurrent ?? hpMax;
  const mpCurrent = trackers.mpCurrent ?? mpMax;

  const occ = OCCUPATIONS.find((o) => o.id === info.occupation);
  const occPts = occupationPoints(data);
  const choiceStats = occupationChoiceStats(data);

  const onPortraitFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        // сжимаем до 480px по большей стороне — архив не должен пухнуть
        const draw = (maxSide: number, quality: number): string => {
          const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
          const w = Math.max(1, Math.round(img.width * scale));
          const h = Math.max(1, Math.round(img.height * scale));
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (!ctx) return "";
          ctx.drawImage(img, 0, 0, w, h);
          return canvas.toDataURL("image/jpeg", quality);
        };
        const full = draw(480, 0.85);
        const thumb = draw(96, 0.6);
        mutate((d) => { d.info.portrait = full; d.info.portraitThumb = thumb; });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const statCheck = (label: string, value: number) => {
    if (value <= 0) return;
    rollSkillCheck(`Характеристика: ${label}`, value);
  };

  // Проверка рассудка
  const sanLossSuccess = useRef<HTMLInputElement>(null);
  const sanLossFail = useRef<HTMLInputElement>(null);
  const sanRoll = () => {
    const roll = rollD100();
    const success = roll <= sanCurrent;
    publishRoll({ label: "Проверка Рассудка", roll, value: sanCurrent, kind: "check", level: success ? (roll === 1 ? "critical" : "regular") : roll === 100 ? "fumble" : "fail" });
    showSanityResult(roll, sanCurrent, success);
    const applied = success
      ? parseInt(sanLossSuccess.current?.value || "0", 10) || 0
      : parseInt(sanLossFail.current?.value || "1", 10) || 1;
    if (applied > 0) {
      mutate((d) => {
        d.trackers.sanCurrent = Math.max(0, (d.trackers.sanCurrent ?? derived.sanStart) - applied);
        d.trackers.lastSanLoss = applied;
        // журнал потерь рассудка — тьма запоминает каждый шрам разума
        const entry = {
          id: uid(),
          date: new Date().toISOString(),
          loss: applied,
          context: `${roll} против ${sanCurrent} — ${success ? "успех" : "провал"}`,
        };
        d.sanLog = [entry, ...(d.sanLog || [])].slice(0, 30);
      });
    }
  };

  const insanity = insanityInsight(derived.sanStart, sanCurrent, trackers.lastSanLoss || 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* ===== Левая колонка: портрет и сведения ===== */}
      <motion.section
        initial={{ opacity: 0, x: -14 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.45 }}
        className="coc-panel space-y-0"
      >
        <div className="coc-panel-head">
          <span className="coc-stamp">Сыск 1920-х</span>
          <h2 className="coc-display text-sm tracking-[0.2em] uppercase text-[#a4977c] ml-auto">
            Личные сведения
          </h2>
        </div>

        <div className="p-4 space-y-4">
          {/* Портрет */}
          <div className="flex gap-4">
            <div className="coc-portrait w-28 h-36 shrink-0">
              {info.portrait ? (
                <img src={info.portrait} alt={`Портрет: ${info.name || "сыщик"}`} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl text-[#322a1c] select-none">
                  ☾
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2 justify-end flex-1">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onPortraitFile(e.target.files?.[0])}
              />
              <button onClick={() => fileRef.current?.click()} className="coc-btn !py-1.5 text-xs">
                Вклеить портрет
              </button>
              {info.portrait && (
                <button
                  onClick={() => mutate((d) => { d.info.portrait = ""; })}
                  className="coc-btn coc-btn-danger !py-1.5 text-xs"
                >
                  Снять портрет
                </button>
              )}
              <p className="coc-hint">Фото прикрепляется к делу. Чем мрачнее — тем правдоподобнее.</p>
            </div>
          </div>

          <Field label="Имя" value={info.name} onChange={(v) => mutate((d) => { d.info.name = v; })} placeholder="Джон Силакби" />
          <Field label="Игрок" value={info.player} onChange={(v) => mutate((d) => { d.info.player = v; })} placeholder="—" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Возраст" value={info.age} onChange={(v) => mutate((d) => { d.info.age = v; })} placeholder="32" />
            <Field label="Пол" value={info.sex} onChange={(v) => mutate((d) => { d.info.sex = v; })} placeholder="—" />
          </div>
          <Field label="Местожительство" value={info.residence} onChange={(v) => mutate((d) => { d.info.residence = v; })} placeholder="Арканза, Массачусетс" />
          <Field label="Место рождения" value={info.birthplace} onChange={(v) => mutate((d) => { d.info.birthplace = v; })} placeholder="—" />

          {/* Род занятий */}
          <div className="space-y-1.5 pt-1">
            <label className="coc-label">Род занятий</label>
            <select
              className="coc-input"
              value={info.occupation}
              onChange={(e) =>
                mutate((d) => {
                  d.info.occupation = e.target.value;
                  d.occupationChoice = "";
                  // Сброс и предустановка профессиональных навыков
                  for (const s of d.skills) s.isOccupation = false;
                  const occDef = OCCUPATIONS.find((o) => o.id === e.target.value);
                  if (occDef) {
                    for (const s of d.skills) {
                      if (occDef.skills.includes(s.key || "")) s.isOccupation = true;
                    }
                  }
                })
              }
            >
              <option value="">— не определён —</option>
              {OCCUPATIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.lovecraft ? "☽ " : ""}{o.name}
                </option>
              ))}
            </select>
            {occ && (
              <div className="space-y-1.5 pt-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="coc-mono text-[0.7rem] text-[#9a7d3e]">
                    Очки профессии: <b className="text-[#d8cbb0]">{occPts}</b> · Средства: {occ.credit}
                  </span>
                </div>
                {choiceStats && (
                  <div className="flex items-center gap-2">
                    <span className="coc-label">Ветка формулы</span>
                    <select
                      className="coc-input !w-auto !py-1 text-xs"
                      value={data.occupationChoice || choiceStats[0]}
                      onChange={(e) => mutate((d) => { d.occupationChoice = e.target.value; })}
                    >
                      {choiceStats.map((s) => (
                        <option key={s} value={s}>{CHAR_LABEL[s] || s} ×2</option>
                      ))}
                    </select>
                  </div>
                )}
                {occ.specHint && <p className="coc-hint">Особые: {occ.specHint}</p>}
                <p className="coc-hint">
                  Отметьте профессиональные навыки во вкладке «Навыки» (автоотметка уже сделана) и вложите очки.
                </p>
              </div>
            )}
          </div>

          {derived.ageHint && (
            <div className="rounded border border-[#322a1c] bg-black/30 p-2.5">
              <p className="coc-label mb-1">Возраст: {info.age || "?"} · группа {derived.ageBand}</p>
              <p className="coc-hint">{derived.ageHint}</p>
            </div>
          )}
        </div>
      </motion.section>

      {/* ===== Центр: характеристики ===== */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.08 }}
        className="coc-panel"
      >
        <div className="coc-panel-head">
          <h2 className="coc-display text-sm tracking-[0.2em] uppercase text-[#a4977c]">Характеристики</h2>
          <span className="coc-hint ml-auto hidden sm:inline">клик по числу = проверка d100</span>
        </div>
        <div className="p-4 grid grid-cols-2 gap-3">
          {CHARACTERISTICS.map((meta) => {
            const value = c[meta.id] as number;
            const dynamicHint =
              meta.id === "dex" && occ
                ? ""
                : meta.hint;
            const isEdu = meta.id === "edu";
            return (
              <div key={meta.id} className="rounded border border-[#262015] bg-black/25 p-2.5 space-y-1">
                <div className="flex items-baseline justify-between">
                  <span className="coc-display text-xs tracking-[0.15em] text-[#a4977c]">{meta.label}</span>
                  <span className="coc-mono text-[0.6rem] text-[#4a4234]">{meta.short}</span>
                </div>
                <input
                  type="number"
                  min={0}
                  max={99}
                  value={value || ""}
                  onChange={(e) =>
                    mutate((d) => {
                      (d.characteristics[meta.id] as number) = clamp99(e.target.value);
                    })
                  }
                  onBlur={(e) => { if (e.target.value === "") mutate((d) => { (d.characteristics[meta.id] as number) = 0; }); }}
                  className="coc-stat-input"
                  aria-label={`${meta.label} (${meta.short})`}
                />
                <div className="flex items-center justify-between gap-1">
                  <span className="coc-hint !text-[0.62rem]">{dynamicHint}</span>
                  <div className="flex items-center gap-0.5 shrink-0">
                    {isEdu && (
                      <button
                        onClick={() => {
                          if (value <= 0) return;
                          const res = improvementCheck(value);
                          publishRoll({ label: `Развитие ОБР`, roll: res.roll, value, kind: "check" });
                          if (res.success) {
                            mutate((d) => {
                              d.characteristics.edu = Math.min(99, value + res.gain);
                            });
                            toast.custom(
                              () => (
                                <div className="coc-panel px-4 py-3 flex items-center gap-3" style={{ boxShadow: "0 14px 40px rgba(0,0,0,0.7)" }}>
                                  <span className="coc-mono text-lg font-bold text-[#7fc39a]">{res.roll}</span>
                                  <span className="w-px self-stretch bg-[#322a1c]" />
                                  <span>
                                    <span className="coc-display text-sm text-[#7fc39a]">Образование развито!</span>
                                    <span className="coc-hint block">+{res.gain} к ОБР (d100 &gt; {value})</span>
                                  </span>
                                </div>
                              ),
                              { duration: 4200 }
                            );
                          } else {
                            toast.custom(
                              () => (
                                <div className="coc-panel px-4 py-3 flex items-center gap-3" style={{ boxShadow: "0 14px 40px rgba(0,0,0,0.7)" }}>
                                  <span className="coc-mono text-lg font-bold text-[#c98f6a]">{res.roll}</span>
                                  <span className="w-px self-stretch bg-[#322a1c]" />
                                  <span>
                                    <span className="coc-display text-sm text-[#c98f6a]">Без улучшения</span>
                                    <span className="coc-hint block">нужно выбросить больше {value}</span>
                                  </span>
                                </div>
                              ),
                              { duration: 3600 }
                            );
                          }
                        }}
                        className="coc-mono text-[0.65rem] text-[#9a7d3e] hover:text-[#c0a05a] px-1"
                        title="Проверка развития ОБР: d100 больше значения → +1d10 (по возрастным правилам)"
                      >
                        ⟳развитие
                      </button>
                    )}
                    <button
                      onClick={() => statCheck(meta.label, value)}
                      className="coc-mono text-[0.65rem] text-[#5f8f6e] hover:text-[#7fc39a] px-1"
                      title={`Проверка ${meta.label} (d100 ≤ ${value})`}
                    >
                      ⟳d100
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Удача — особая */}
          <div className="rounded border border-[#5f8f6e]/30 bg-[#5f8f6e]/5 p-2.5 space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="coc-display text-xs tracking-[0.15em] text-[#7fc39a]">Удача</span>
              <span className="coc-mono text-[0.6rem] text-[#4a4234]">УДЧ</span>
            </div>
            <input
              type="number"
              min={0}
              max={99}
              value={c.luck || ""}
              onChange={(e) => mutate((d) => { d.characteristics.luck = clamp99(e.target.value); })}
              onBlur={(e) => { if (e.target.value === "") mutate((d) => { d.characteristics.luck = 0; }); }}
              className="coc-stat-input !text-[#7fc39a]"
              aria-label="Удача"
            />
            <div className="flex items-center justify-between">
              <span className="coc-hint !text-[0.62rem]">3d6×5</span>
              <button
                onClick={() => c.luck > 0 && rollSkillCheck("Удача", c.luck)}
                className="coc-mono text-[0.65rem] text-[#5f8f6e] hover:text-[#7fc39a] px-1"
                title="Проверка Удачи"
              >
                ⟳d100
              </button>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ===== Правая колонка: производные и трекеры ===== */}
      <motion.section
        initial={{ opacity: 0, x: 14 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.45, delay: 0.16 }}
        className="coc-panel space-y-0"
      >
        <div className="coc-panel-head">
          <h2 className="coc-display text-sm tracking-[0.2em] uppercase text-[#a4977c]">
            Производные · Трекеры
          </h2>
        </div>
        <div className="p-4 space-y-4">
          {/* Здоровье */}
          <Tracker
            label="Пункты здоровья (ПЗ)"
            current={hpCurrent}
            max={hpMax}
            color="#7fc39a"
            onCurrent={(v) => mutate((d) => { d.trackers.hpCurrent = v; })}
            bonus={trackers.hpBonus}
            onBonus={(v) => mutate((d) => { d.trackers.hpBonus = v; })}
            hint="(ВЫН + ТЕЛ) / 10"
          />
          {/* Магия */}
          <Tracker
            label="Пункты магии (ПМ)"
            current={mpCurrent}
            max={mpMax}
            color="#9a7d3e"
            onCurrent={(v) => mutate((d) => { d.trackers.mpCurrent = v; })}
            bonus={trackers.mpBonus}
            onBonus={(v) => mutate((d) => { d.trackers.mpBonus = v; })}
            hint="1/5 МОЩ"
          />
          {/* Рассудок */}
          <div className="rounded border border-[#7c1d1d]/50 bg-[#7c1d1d]/10 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="coc-display text-xs tracking-[0.15em] text-[#cf8a8a]">Рассудок</span>
              <span className="coc-mono text-[0.65rem] text-[#6e6350]">старт = МОЩ ({derived.sanStart})</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={99}
                value={sanCurrent}
                onChange={(e) => mutate((d) => { d.trackers.sanCurrent = clamp99(e.target.value); })}
                className="coc-stat-input !text-[#cf8a8a] !w-20"
                aria-label="Текущий рассудок"
              />
              <div className="coc-bar flex-1">
                <div
                  style={{
                    width: `${derived.sanStart > 0 ? Math.round((sanCurrent / Math.max(1, derived.sanStart)) * 100) : 0}%`,
                    background: sanCurrent / Math.max(1, derived.sanStart) > 0.5
                      ? "linear-gradient(to right, #5f8f6e, #7fc39a)"
                      : sanCurrent / Math.max(1, derived.sanStart) > 0.2
                        ? "linear-gradient(to right, #9a7d3e, #c0a05a)"
                        : "linear-gradient(to right, #7c1d1d, #a83232)",
                  }}
                />
              </div>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex-1 min-w-[70px]">
                <label className="coc-label !text-[0.58rem]">потеря при успехе</label>
                <input ref={sanLossSuccess} type="number" min={0} defaultValue={0} className="coc-mini-input !text-left" aria-label="Потеря рассудка при успехе" />
              </div>
              <div className="flex-1 min-w-[70px]">
                <label className="coc-label !text-[0.58rem]">при провале</label>
                <input ref={sanLossFail} type="number" min={0} defaultValue={1} className="coc-mini-input !text-left" aria-label="Потеря рассудка при провале" />
              </div>
              <button onClick={sanRoll} className="coc-btn !py-1.5 !px-2.5 text-xs coc-btn-danger" title="Бросить d100 против Рассудка">
                Проверка
              </button>
            </div>
            {derived.sanStart > 0 && sanCurrent === 0 && (
              <p className="coc-mono text-[0.68rem] text-[#a83232] animate-pulse">СЫЩИК ПОГРУЗИЛСЯ В ВЕЧНОЕ БЕЗУМИЕ</p>
            )}
            {derived.sanStart > 0 && sanCurrent > 0 && insanity.temporary && (
              <p className="coc-mono text-[0.62rem] text-[#c98f6a]">
                ▲ Последняя потеря {trackers.lastSanLoss} ≥ 5 — проверка на <b>временное безумие</b> (1d10 раундов/часов)
              </p>
            )}
            {derived.sanStart > 0 && insanity.indefinite && (
              <p className="coc-mono text-[0.62rem] text-[#a83232]">
                ▲▲ Потеряно {insanity.totalLost} ≥ {insanity.indefiniteThreshold} (⅕ старта) — риск <b>неопределившегося безумия</b>
              </p>
            )}
            <div className="flex items-center justify-between coc-hint !text-[0.6rem] pt-0.5">
              <span>потеряно всего: {insanity.totalLost}</span>
              <span>порог неопределившегося: {insanity.indefiniteThreshold}</span>
            </div>
            {/* Журнал потерь рассудка */}
            {(data.sanLog?.length ?? 0) > 0 && (
              <details className="coc-sanlog mt-1">
                <summary className="coc-mono text-[0.62rem] text-[#cf8a8a] cursor-pointer select-none">
                  журнал потерь ({data.sanLog!.length})
                </summary>
                <ul className="mt-1.5 space-y-1 max-h-40 overflow-y-auto coc-scroll pr-1">
                  {data.sanLog!.slice(0, 12).map((e) => (
                    <li key={e.id} className="flex items-center gap-2 coc-mono text-[0.6rem] border-b border-[#1d1810] pb-1 last:border-0">
                      <span className="text-[#a83232] font-bold">−{e.loss}</span>
                      <span className="text-[#6e6350] shrink-0">
                        {new Date(e.date).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <span className="truncate text-[#a4977c]" title={e.context}>{e.context}</span>
                    </li>
                  ))}
                </ul>
                {data.sanLog!.length > 12 && (
                  <p className="coc-mono text-[0.55rem] text-[#4a4234] mt-1">…и ещё {data.sanLog!.length - 12} записей</p>
                )}
                <button
                  onClick={() => mutate((d) => { d.sanLog = []; })}
                  className="coc-mono text-[0.58rem] text-[#6e6350] hover:text-[#a83232] mt-1.5"
                  title="Очистить журнал потерь"
                >
                  очистить журнал
                </button>
              </details>
            )}
          </div>
          {/* Удача текущая */}
          <div className="rounded border border-[#262015] bg-black/25 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="coc-display text-xs tracking-[0.15em] text-[#a4977c]">Удача сейчас</span>
              <span className="coc-hint">тратится и восстанавливается</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={99}
                value={luckCurrent}
                onChange={(e) => mutate((d) => { d.trackers.luckCurrent = clamp99(e.target.value); })}
                className="coc-stat-input !text-[#7fc39a] !w-20"
                aria-label="Текущая удача"
              />
              <button onClick={() => rollSkillCheck("Проверка Удачи", luckCurrent)} className="coc-btn !py-1.5 text-xs coc-btn-verdigris">
                Проверить d100
              </button>
            </div>
          </div>

          {/* Производные боевые */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Derived label="Бонус к урону" value={derived.db} />
            <Derived label="Комплекция" value={String(derived.build)} />
            <Derived label="Скорость" value={String(derived.mov)} hint={derived.movPenalty ? `−${derived.movPenalty} от возраста` : undefined} />
            <Derived label="СИЛ + ТЕЛ" value={String((c.str || 0) + (c.siz || 0))} />
          </div>
        </div>
      </motion.section>
    </div>
  );
}

const CHAR_LABEL: Record<string, string> = {
  STR: "СИЛ", CON: "ВЫН", SIZ: "ТЕЛ", DEX: "ЛВК", APP: "НАР", INT: "ИНТ", POW: "МОЩ", EDU: "ОБР",
};

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-1">
      <label className="coc-label">{label}</label>
      <input className="coc-input" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function Tracker({
  label, current, max, color, onCurrent, bonus, onBonus, hint,
}: {
  label: string; current: number; max: number; color: string;
  onCurrent: (v: number) => void; bonus: number; onBonus: (v: number) => void; hint: string;
}) {
  const pct = max > 0 ? Math.round((current / max) * 100) : 0;
  return (
    <div className="rounded border border-[#262015] bg-black/25 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="coc-display text-xs tracking-[0.15em] text-[#a4977c]">{label}</span>
        <span className="coc-hint">{hint}</span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          value={current}
          onChange={(e) => onCurrent(clamp99(e.target.value))}
          className="coc-stat-input !w-20"
          style={{ color }}
          aria-label={`Текущее: ${label}`}
        />
        <span className="coc-mono text-xs text-[#6e6350]">/</span>
        <span className="coc-mono text-sm font-bold text-[#d8cbb0] w-8 text-center">{max}</span>
        <div className="coc-bar flex-1">
          <div style={{ width: `${Math.min(100, pct)}%`, background: color }} />
        </div>
        <input
          type="number"
          value={bonus || ""}
          placeholder="+0"
          onChange={(e) => onBonus(parseInt(e.target.value, 10) || 0)}
          className="coc-mini-input !w-12"
          title="Правка максимума (+/−)"
          aria-label={`Правка максимума: ${label}`}
        />
      </div>
    </div>
  );
}

function Derived({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded border border-[#262015] bg-black/25 p-2.5 text-center">
      <p className="coc-label !text-[0.58rem] mb-1">{label}</p>
      <p className="coc-mono text-lg font-bold text-[#d8cbb0]">{value}</p>
      {hint && <p className="coc-hint !text-[0.6rem]">{hint}</p>}
    </div>
  );
}

function clamp99(v: string): number {
  const n = parseInt(v, 10);
  if (isNaN(n)) return 0;
  return Math.max(0, Math.min(99, n));
}

/* Отдельный показ результата рассудка — красная печать */
function showSanityResult(roll: number, san: number, success: boolean) {
  import("sonner").then(({ toast }) => {
    toast.custom(
      () => (
        <div className="coc-panel px-4 py-3 flex items-center gap-4" style={{ boxShadow: "0 14px 40px rgba(0,0,0,0.7)" }}>
          <div className="text-center">
            <div className="coc-mono text-2xl font-bold" style={{ color: success ? "#7fc39a" : "#a83232" }}>{roll}</div>
            <div className="coc-label" style={{ fontSize: "0.55rem" }}>из {san}</div>
          </div>
          <div className="w-px self-stretch" style={{ background: "var(--coc-line)" }} />
          <div>
            <div className="coc-display text-sm" style={{ color: success ? "#7fc39a" : "#a83232" }}>
              {success ? "Рассудок удержан" : "Ужас пробирает до костей"}
            </div>
            <div className="coc-hint">Проверка Рассудка</div>
          </div>
        </div>
      ),
      { duration: 4200 }
    );
  });
}

/* ============================================================
   ВКЛАДКА «НАВЫКИ»
   ============================================================ */

export function SkillsSection({ data, mutate }: SectionProps) {
  const [filter, setFilter] = useState("");
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillBase, setNewSkillBase] = useState("");

  const occPts = occupationPoints(data);
  const occSpent = occupationSpent(data);
  const persTotal = personalTotal(data);
  const persSpent = personalSpent(data);
  const occLeft = occPts - occSpent;
  const persLeft = persTotal - persSpent;

  // порядок: колонки библиотеки, затем кастомные
  const ordered = useMemo(() => {
    const col = (s: CocSkillState) => SKILL_LIBRARY.find((l) => l.id === s.key)?.column ?? 9;
    return [...data.skills].sort((a, b) => col(a) - col(b) || a.name.localeCompare(b.name, "ru"));
  }, [data.skills]);

  const visible = ordered.filter(
    (s) => !filter || s.name.toLowerCase().includes(filter.toLowerCase())
  );

  const addCustom = () => {
    const name = newSkillName.trim();
    if (!name) return;
    const base = Math.max(0, Math.min(99, parseInt(newSkillBase, 10) || 0));
    mutate((d) => {
      d.skills.push({ key: null, name, base, occ: 0, pers: 0, improv: 0, isOccupation: false });
    });
    setNewSkillName("");
    setNewSkillBase("");
  };

  return (
    <div className="space-y-4">
      {/* Счётчики очков */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <PointsBar
          title="Очки профессии"
          spent={occSpent}
          total={occPts}
          color="#9a7d3e"
          hint={data.info.occupation ? "вкладываются только в отмеченные ☐ проф. навыки" : "сначала выберите род занятий во вкладке «Досье»"}
        />
        <PointsBar
          title="Личные очки (ИНТ × 2)"
          spent={persSpent}
          total={persTotal}
          color="#5f8f6e"
          hint="в любые навыки — интересы, хобби, жизненный опыт"
        />
      </div>

      {/* Поиск */}
      <div className="coc-panel p-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <input
          className="coc-input flex-1 min-w-[180px]"
          placeholder="Поиск навыка…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Поиск навыка"
        />
        <span className="coc-mono text-[0.62rem] leading-relaxed text-[#8a7d64] hidden md:inline-block shrink-0">
          <span className="text-[#a4977c]">☐</span> — проф.
          <span className="text-[#4a4234] mx-1.5" aria-hidden="true">·</span>
          клик по названию или итогу = <span className="text-[#a4977c]">проверка d100</span>
          <span className="text-[#4a4234] mx-1.5" aria-hidden="true">·</span>
          ½ и ⅕ считаются сами
        </span>
      </div>

      {/* Список навыков */}
      <div className="coc-panel">
        <div className="coc-panel-head">
          <h2 className="coc-display text-sm tracking-[0.2em] uppercase text-[#a4977c]">Навыки сыщика</h2>
          <span className="coc-mono text-[0.62rem] text-[#6e6350] ml-auto">{visible.length} навыков</span>
        </div>
        <div className="p-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-0.5">
          {visible.map((s) => {
            const base = skillBase(s);
            const total = skillTotal(s);
            const isCustom = s.key === null;
            const occDisabled = !s.isOccupation;
            return (
              <div
                key={s.key || `custom-${s.name}`}
                className={`coc-skill-row ${s.isOccupation ? "is-occ" : ""} ${isCustom ? "is-custom" : ""}`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <button
                    onClick={() => mutate((d) => {
                      const t = d.skills.find((x) => (x.key || `custom-${x.name}`) === (s.key || `custom-${s.name}`));
                      if (t) {
                        t.isOccupation = !t.isOccupation;
                        if (!t.isOccupation) t.occ = 0;
                      }
                    })}
                    className={`text-[0.7rem] leading-none w-4 h-4 shrink-0 rounded-sm border flex items-center justify-center transition-colors ${s.isOccupation ? "border-[#9a7d3e] text-[#9a7d3e]" : "border-[#322a1c] text-transparent hover:border-[#9a7d3e]"}`}
                    title={s.isOccupation ? "Снять отметку профессии" : "Отметить как профессиональный"}
                    aria-label={s.isOccupation ? "Снять отметку профессии" : "Отметить как профессиональный"}
                  >
                    ✕
                  </button>
                  <button
                    className="coc-skill-name"
                    onClick={() => total > 0 && rollSkillCheck(s.name, total)}
                    title={`Проверка: d100 ≤ ${total} (трудн. ${Math.floor(total / 2)}, чрезв. ${Math.floor(total / 5)})`}
                  >
                    {s.name}
                    <span className="text-[#4a4234]"> ({base})</span>
                  </button>
                  {isCustom && (
                    <button
                      onClick={() => mutate((d) => { d.skills = d.skills.filter((x) => x.key !== null || x.name !== s.name); })}
                      className="text-[#a83232] hover:text-[#cf6a6a] text-xs px-1 shrink-0"
                      title="Удалить навык"
                      aria-label={`Удалить ${s.name}`}
                    >
                      ✕
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  min={0}
                  value={s.occ || ""}
                  placeholder="0"
                  disabled={occDisabled}
                  onChange={(e) => mutate((d) => {
                    const t = d.skills.find((x) => (x.key || `custom-${x.name}`) === (s.key || `custom-${s.name}`));
                    if (t) t.occ = Math.max(0, parseInt(e.target.value, 10) || 0);
                  })}
                  className={`coc-mini-input ${occDisabled ? "!opacity-40" : "!text-[#c0a05a]"}`}
                  title={occDisabled ? "Сначала отметьте навык профессиональным" : "Очки профессии"}
                  aria-label={`${s.name}: очки профессии`}
                />
                <input
                  type="number"
                  min={0}
                  value={s.pers || ""}
                  placeholder="0"
                  onChange={(e) => mutate((d) => {
                    const t = d.skills.find((x) => (x.key || `custom-${x.name}`) === (s.key || `custom-${s.name}`));
                    if (t) t.pers = Math.max(0, parseInt(e.target.value, 10) || 0);
                  })}
                  className="coc-mini-input !text-[#7fc39a]"
                  title="Личные очки (ИНТ×2)"
                  aria-label={`${s.name}: личные очки`}
                />
                <input
                  type="number"
                  min={0}
                  value={s.improv || ""}
                  placeholder="0"
                  onChange={(e) => mutate((d) => {
                    const t = d.skills.find((x) => (x.key || `custom-${x.name}`) === (s.key || `custom-${s.name}`));
                    if (t) t.improv = Math.max(0, parseInt(e.target.value, 10) || 0);
                  })}
                  className="coc-mini-input !text-[#d8cbb0]"
                  title="Развитие (проверки развития, стаж игры)"
                  aria-label={`${s.name}: развитие`}
                />
                <button
                  onClick={() => total > 0 && rollSkillCheck(s.name, total)}
                  className={`coc-skill-total ${total <= 0 ? "zero" : ""}`}
                  title={`Итог ${total} · проверка d100`}
                >
                  {total}
                </button>
              </div>
            );
          })}
        </div>

        {/* Добавить кастомный навык */}
        <div className="p-3 border-t border-[#262015] flex flex-wrap items-center gap-2">
          <input
            className="coc-input !w-auto flex-1 min-w-[160px]"
            placeholder="Новый навык (например, Ядовитые зелья)"
            value={newSkillName}
            onChange={(e) => setNewSkillName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCustom()}
            aria-label="Название нового навыка"
          />
          <input
            className="coc-input !w-24"
            placeholder="база %"
            value={newSkillBase}
            onChange={(e) => setNewSkillBase(e.target.value)}
            aria-label="База нового навыка"
          />
          <button onClick={addCustom} className="coc-btn coc-btn-verdigris !py-2">
            + Добавить навык
          </button>
        </div>
      </div>

      {/* Памятка по проверкам */}
      <div className="coc-panel p-4">
        <h3 className="coc-display text-xs tracking-[0.2em] uppercase text-[#a4977c] mb-2">Памятка по проверкам</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-center">
          {[
            { l: "Крит", v: "01", c: "#7fc39a" },
            { l: "Чрезвычайный", v: "≤ ⅕ навыка", c: "#9fc9ae" },
            { l: "Трудный", v: "≤ ½ навыка", c: "#b9cfa4" },
            { l: "Обычный", v: "≤ навыка", c: "#d8cbb0" },
            { l: "Крах", v: "100 · 96+ при навыке <50", c: "#a83232" },
          ].map((x) => (
            <div key={x.l} className="rounded border border-[#262015] bg-black/25 p-2">
              <p className="coc-mono text-xs font-bold" style={{ color: x.c }}>{x.v}</p>
              <p className="coc-label !text-[0.55rem] mt-1">{x.l}</p>
            </div>
          ))}
        </div>
        <p className="coc-hint mt-2">
          Повторная проверка требует обоснования. Нельзя повторять проверки Рассудка и боевые проверки.
        </p>
      </div>
    </div>
  );
}

function PointsBar({ title, spent, total, color, hint }: { title: string; spent: number; total: number; color: string; hint: string }) {
  const pct = total > 0 ? Math.min(100, Math.round((spent / total) * 100)) : 0;
  const over = spent > total;
  return (
    <div className="coc-panel p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="coc-display text-xs tracking-[0.15em] uppercase" style={{ color }}>{title}</span>
        <span className={`coc-mono text-sm font-bold ${over ? "text-[#a83232]" : "text-[#d8cbb0]"}`}>
          {spent} / {total} {over && "· перебор!"}
        </span>
      </div>
      <div className="coc-bar">
        <div style={{ width: `${pct}%`, background: over ? "#a83232" : color }} />
      </div>
      <p className="coc-hint">{hint}</p>
    </div>
  );
}
