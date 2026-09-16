"use client";

// ============================================================
// Секции листа: Досье (личность + треки Крови), Характеристики, Навыки.
// ============================================================

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  VtmSheetData,
  VtmAttributes,
  ATTRIBUTE_GROUPS,
  SKILL_LIBRARY,
  CLANS,
  CLAN_BY_ID,
  SECTS,
  SECT_BY_ID,
  PREDATOR_TYPES,
  PREDATOR_BY_ID,
  GENERATIONS,
  RESONANCES,
  RESONANCE_BY_ID,
  RESONANCE_INTENSITY_LABELS,
} from "@/lib/vtm-data";
import { DerivedStats, bpHint } from "@/lib/vtm-calc";
import { rollRouse, useVtmDice } from "@/components/vtm/vtm-dice";
import { VtmPortraitStudio } from "@/components/vtm/vtm-portrait-studio";
import { CharCount } from "@/components/vtm/vtm-sections3";

export function AutoTextarea({
  value,
  onChange,
  className = "",
  placeholder,
  ariaLabel,
  minHeight = 80,
  maxLength,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
  ariaLabel?: string;
  minHeight?: number;
  maxLength?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.max(minHeight, el.scrollHeight)}px`;
  };

  useLayoutEffect(resize, [value]);

  useEffect(() => {
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={ariaLabel}
      maxLength={maxLength}
      className={`vtm-input vtm-autogrow ${className}`}
      style={{ minHeight: 0 }}
      rows={1}
    />
  );
}

/** Контрол точек ●●●○○ */
function Dots({
  value,
  max = 5,
  color = "blood",
  onChange,
  onRoll,
  ariaLabel,
}: {
  value: number;
  max?: number;
  color?: "blood" | "gold" | "violet";
  onChange?: (n: number) => void;
  onRoll?: () => void;
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
            if (n === value) {
              // клик по заполненной крайней точке — снять одну
              onChange(value - 1);
            } else if (n === value + 1) {
              onChange(value + 1);
            } else {
              onChange(n);
            }
          }}
          onContextMenu={(e) => {
            if (!onChange) return;
            e.preventDefault();
            onChange(Math.max(0, value - 1));
          }}
          disabled={!onChange}
          aria-label={`Уровень ${n}`}
          title={onRoll ? `${ariaLabel}: клик по строке — бросок` : `Уровень ${n}`}
        />
      ))}
    </span>
  );
}

// ============================================================
// ДОСЬЕ
// ============================================================

// Лимиты полей биографии (счётчики единообразны с журналом ночи)
const BIO_DESC_LIMIT = 700;
const BIO_HISTORY_LIMIT = 2000;

export function DossierSection({
  data,
  mutate,
  derived,
}: {
  data: VtmSheetData;
  mutate: (fn: (draft: VtmSheetData) => void) => void;
  derived: DerivedStats;
}) {
  const info = data.info;
  const clan = CLAN_BY_ID.get(info.clan);
  const predator = PREDATOR_BY_ID.get(info.predator);

  // Портрет: файл → Портретная студия (зум/кадрирование) → оклад 7:9 + миниатюра
  const fileRef = useRef<HTMLInputElement>(null);
  const [studioImage, setStudioImage] = useState<string | null>(null);
  const onPortrait = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Это не изображение");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      toast.error("Слишком тяжёлый негатив", { description: "До 12 МБ — Кровь хранит бережно, но не бесконечно." });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setStudioImage(reader.result as string);
    reader.onerror = () => toast.error("Не удалось прочитать файл");
    reader.readAsDataURL(file);
  };

  const usedWp = data.trackers.wpSup + data.trackers.wpAgg;
  const healthLeft = derived.healthMax - data.trackers.healthSup - data.trackers.healthAgg;

  const doRouse = (label: string) => {
    const r = rollRouse(label);
    useVtmDice.getState().pushRouse({ ...r, label });
    if (!r.ok) {
      mutate((d) => {
        d.trackers.hunger = Math.min(5, d.trackers.hunger + 1);
      });
    }
    return r;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* ===== Личность ===== */}
      <section className="vtm-panel lg:col-span-2" aria-label="Личность Сородича">
        <div className="vtm-panel-head">
          <span className="vtm-label text-[0.81rem] text-[#d6a840]">Личность</span>
        </div>
        <div className="p-4 md:p-5 space-y-4">
          {/* Портрет + базовые поля */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="shrink-0 w-28 h-36 rounded-md overflow-hidden border border-[#3d1a20] bg-black relative group">
              {info.portrait ? (
                <img src={info.portrait} alt="Портрет Сородича" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl opacity-30" aria-hidden>🩸</div>
              )}
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute inset-0 flex items-end justify-center pb-1.5 bg-gradient-to-t from-black/80 via-transparent opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                aria-label="Вклеить портрет"
              >
                <span className="vtm-label text-[0.69rem] text-[#d9c7b6]">
                  {info.portrait ? "Переснять" : "Вклеить фото"}
                </span>
              </button>
              {info.portrait && (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="absolute top-1 left-1 vtm-btn vtm-btn-ghost !p-1 !text-[0.73rem] opacity-0 group-hover:opacity-100"
                  aria-label="Кадрировать заново"
                  title="Кадрировать заново"
                >
                  ⛶
                </button>
              )}
              {info.portrait && (
                <button
                  onClick={() => mutate((d) => { d.info.portrait = ""; d.info.portraitThumb = ""; })}
                  className="absolute top-1 right-1 vtm-btn vtm-btn-danger !p-1 !text-[0.73rem] opacity-0 group-hover:opacity-100"
                  aria-label="Убрать портрет"
                >
                  ✕
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  onPortrait(e.target.files?.[0]);
                  // сброс значения: тот же файл можно выбрать повторно (пересъёмка кадра)
                  e.target.value = "";
                }}
              />
            </div>
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="vtm-label text-[0.73rem] text-[#c4ac9d]">Концепция</span>
                <input
                  className="vtm-input mt-1"
                  value={info.concept}
                  onChange={(e) => mutate((d) => { d.info.concept = e.target.value; })}
                  placeholder="бывший хирург, ныне доктор без диплома"
                />
              </label>
              <label className="block">
                <span className="vtm-label text-[0.73rem] text-[#c4ac9d]">Хроника</span>
                <input
                  className="vtm-input mt-1"
                  value={info.chronicle}
                  onChange={(e) => mutate((d) => { d.info.chronicle = e.target.value; })}
                  placeholder="Ночь над Невой"
                />
              </label>
              <label className="block">
                <span className="vtm-label text-[0.73rem] text-[#c4ac9d]">Сир</span>
                <input
                  className="vtm-input mt-1"
                  value={info.sire}
                  onChange={(e) => mutate((d) => { d.info.sire = e.target.value; })}
                  placeholder="кто и зачем даровал Становление"
                />
              </label>
              <label className="block">
                <span className="vtm-label text-[0.73rem] text-[#c4ac9d]">Род деятельности</span>
                <input
                  className="vtm-input mt-1"
                  value={info.occupation}
                  onChange={(e) => mutate((d) => { d.info.occupation = e.target.value; })}
                  placeholder="профессия смертной жизни / нынешнее занятие"
                />
              </label>
            </div>
          </div>

          {/* Клан / секта / поколение / охота */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="vtm-label text-[0.73rem] text-[#c4ac9d]">Клан</span>
              <select
                className="vtm-input mt-1"
                value={info.clan}
                onChange={(e) => mutate((d) => { d.info.clan = e.target.value; })}
              >
                <option value="">— не выбран —</option>
                {CLANS.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.nick})</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="vtm-label text-[0.73rem] text-[#c4ac9d]">Принадлежность (секта)</span>
              <select
                className="vtm-input mt-1"
                value={info.sect}
                onChange={(e) => mutate((d) => { d.info.sect = e.target.value; })}
              >
                {SECTS.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="vtm-label text-[0.73rem] text-[#c4ac9d]">Поколение · {bpHint(info.generation)}</span>
              <select
                className="vtm-input mt-1"
                value={info.generation || ""}
                onChange={(e) => mutate((d) => { d.info.generation = parseInt(e.target.value, 10) || 0; })}
              >
                <option value="">— не выбрано —</option>
                {GENERATIONS.map((g) => (
                  <option key={g.value} value={g.value}>{g.label} {g.note ? `— ${g.note}` : ""}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="vtm-label text-[0.73rem] text-[#c4ac9d]">Стиль охоты</span>
              <select
                className="vtm-input mt-1"
                value={info.predator}
                onChange={(e) => mutate((d) => { d.info.predator = e.target.value; })}
              >
                <option value="">— не выбран —</option>
                {PREDATOR_TYPES.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>
          </div>

          {/* Изъян и принуждение клана */}
          {clan && (
            <div className="vtm-frame rounded-md p-3 space-y-2" style={{ background: "rgba(194,43,48,0.04)" }}>
              <div className="flex items-center gap-2">
                <span className="vtm-stamp">Изъян клана</span>
                <span className="vtm-label text-[0.72rem] text-[#c4ac9d]">
                  {derived.baneSeverity > 0 ? `тяжесть по Силе Крови: ${derived.baneSeverity}` : "Сила Крови 0 — изъян не тянет"}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-[#c4ac9d]">{clan.bane}</p>
              <div className="flex items-center gap-2 pt-1">
                <span className="vtm-stamp vtm-stamp-gold">Принуждение</span>
              </div>
              <p className="text-xs leading-relaxed text-[#c4ac9d]">{clan.compulsion}</p>
            </div>
          )}

          {predator && (
            <div className="vtm-frame rounded-md p-3 space-y-1.5" style={{ background: "rgba(168,134,61,0.04)" }}>
              <span className="vtm-stamp vtm-stamp-gold">Стиль охоты: {predator.name}</span>
              <p className="text-xs leading-relaxed text-[#c4ac9d]">{predator.description}</p>
              <p className="vtm-hint !text-[0.77rem]">
                Бонусные навыки: {predator.skills.map((k) => SKILL_LIBRARY.find((s) => s.id === k)?.name || k).join(", ")}
                {predator.discipline ? ` · Дисциплина: +1` : ""}
              </p>
            </div>
          )}

          {/* Цель / Желание / принципы / опоры */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="block md:col-span-2">
              <span className="vtm-label text-[0.73rem] text-[#d6a840]">Цель — к чему идёт вся хроника</span>
              <input
                className="vtm-input mt-1"
                value={info.ambition}
                onChange={(e) => mutate((d) => { d.info.ambition = e.target.value; })}
                placeholder="великая цель, ради которой стоит вечность"
              />
            </label>
            <label className="block md:col-span-2">
              <span className="vtm-label text-[0.73rem] text-[#d6a840]">Желание — цель этой арки</span>
              <input
                className="vtm-input mt-1"
                value={info.desire}
                onChange={(e) => mutate((d) => { d.info.desire = e.target.value; })}
                placeholder="ближний шаг к великой цели"
              />
            </label>
            {(["principle1", "principle2", "principle3"] as const).map((key, i) => (
              <label key={key} className="block">
                <span className="vtm-label text-[0.73rem] text-[#c4ac9d]">Принцип {i + 1}</span>
                <input
                  className="vtm-input mt-1"
                  value={info[key]}
                  onChange={(e) => mutate((d) => { d.info[key] = e.target.value; })}
                  placeholder={`«${i === 0 ? "никогда не…" : i === 1 ? "всегда…" : "никогда не предаю…"}»`}
                />
              </label>
            ))}
            {(["anchor1", "anchor2", "anchor3"] as const).map((key, i) => (
              <label key={key} className="block">
                <span className="vtm-label text-[0.73rem] text-[#c4ac9d]">Опора {i + 1}</span>
                <input
                  className="vtm-input mt-1"
                  value={info[key]}
                  onChange={(e) => mutate((d) => { d.info[key] = e.target.value; })}
                  placeholder="кто держит твою Человечность"
                />
              </label>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Кровь: треки ===== */}
      <section className={`space-y-4 ${data.trackers.hunger >= 5 ? "vtm-beast-panel" : ""}`} aria-label="Состояние Крови">
        <div className="vtm-panel">
          <div className="vtm-panel-head">
            <span className="vtm-label text-[0.81rem] text-[#e8636b]">Кровь</span>
            <NewHuntButton data={data} mutate={mutate} />
          </div>
          <div className="p-4 space-y-4">
            {/* Голод */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="vtm-label text-[0.77rem] text-[#d9c7b6]">Голод</span>
                <div className="flex items-center gap-1">
                  <button
                    className="vtm-btn vtm-btn-ghost !py-0.5 !px-1.5 !text-[0.72rem]"
                    onClick={() => doRouse("испытание Крови")}
                    title="Испытание Крови: 1 кость, успех на 6+ — иначе Голод +1"
                  >
                    🩸 испытание
                  </button>
                  <button
                    className="vtm-btn vtm-btn-ghost !py-0.5 !px-2 !text-[0.75rem]"
                    onClick={() => mutate((d) => { d.trackers.hunger = Math.max(0, d.trackers.hunger - 1); })}
                    aria-label="Утолить Голод на 1"
                    title="Утолить Голод"
                  >
                    −
                  </button>
                  <span className="vtm-label text-[0.83rem] text-[#e8636b] w-4 text-center">{data.trackers.hunger}</span>
                  <button
                    className="vtm-btn vtm-btn-ghost !py-0.5 !px-2 !text-[0.75rem]"
                    onClick={() => mutate((d) => { d.trackers.hunger = Math.min(5, d.trackers.hunger + 1); })}
                    aria-label="Повысить Голод на 1"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    className={`vtm-hunger-cell ${n <= data.trackers.hunger ? "filled" : ""} ${data.trackers.hunger >= 4 && n === data.trackers.hunger ? "low" : ""}`}
                    onClick={() => mutate((d) => { d.trackers.hunger = n === d.trackers.hunger ? n - 1 : n; })}
                    aria-label={`Голод ${n}`}
                    title={n <= data.trackers.hunger ? "кость Голода" : ""}
                  >
                    <span aria-hidden>{n}</span>
                  </button>
                ))}
              </div>
              <p className="vtm-hint mt-1.5 !text-[0.75rem]">
                {data.trackers.hunger >= 5
                  ? "Голод 5: все кости пула красны. Зверь у руля — Compulsion в каждой сцене."
                  : data.trackers.hunger >= 4
                    ? "Голод высок: последние кости пула — кости Голода."
                    : `${data.trackers.hunger} из последних костей каждого пула — кости Голода.`}
              </p>
            </div>

            <div className="vtm-divider text-[0.73rem]"><span>🩸</span></div>

            {/* Здоровье */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="vtm-label text-[0.77rem] text-[#d9c7b6]">Здоровье</span>
                <span className="vtm-hint !text-[0.73rem]">Выносливость + 3 = {derived.healthMax}</span>
              </div>
              <div className="vtm-track">
                {Array.from({ length: derived.healthMax }, (_, i) => {
                  const n = i + 1;
                  const isAgg = n <= data.trackers.healthAgg;
                  const isSup = !isAgg && n <= data.trackers.healthAgg + data.trackers.healthSup;
                  return (
                    <button
                      key={n}
                      className={`vtm-cell ${isAgg ? "agg" : isSup ? "sup" : ""}`}
                      onClick={(e) => {
                        mutate((d) => {
                          // цикл: пусто → поверхностный → тяжёлый → пусто
                          if (isAgg) { d.trackers.healthAgg -= 1; }
                          else if (isSup) { d.trackers.healthSup -= 1; d.trackers.healthAgg += 1; }
                          else {
                            if (e.shiftKey) d.trackers.healthAgg += 1;
                            else d.trackers.healthSup += 1;
                          }
                        });
                      }}
                      aria-label={`Здоровье ${n}: ${isAgg ? "тяжёлая рана" : isSup ? "поверхностная рана" : "цел"}`}
                      title="клик — поверхностная рана · Shift+клик — тяжёлая · клик по заполненной — усилить"
                    />
                  );
                })}
              </div>
              <p className="vtm-hint mt-1.5 !text-[0.75rem]">
                {healthLeft <= 0 ? "Искалечен: торпор близок." : `Целых клеток: ${healthLeft}/${derived.healthMax}. Пустая клетка при новом тяжёлом уроне = торпор.`}
              </p>
            </div>

            {/* Воля */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="vtm-label text-[0.77rem] text-[#d9c7b6]">Воля</span>
                <span className="vtm-hint !text-[0.73rem]">Самообладание + Упорство = {derived.wpMax}</span>
              </div>
              <div className="vtm-track">
                {Array.from({ length: derived.wpMax }, (_, i) => {
                  const n = i + 1;
                  const isAgg = n <= data.trackers.wpAgg;
                  const isSup = !isAgg && n <= data.trackers.wpAgg + data.trackers.wpSup;
                  return (
                    <button
                      key={n}
                      className={`vtm-cell ${isAgg ? "agg" : isSup ? "sup" : ""}`}
                      onClick={(e) => {
                        mutate((d) => {
                          if (isAgg) { d.trackers.wpAgg -= 1; }
                          else if (isSup) { d.trackers.wpSup -= 1; d.trackers.wpAgg += 1; }
                          else {
                            if (e.shiftKey) d.trackers.wpAgg += 1;
                            else d.trackers.wpSup += 1;
                          }
                        });
                      }}
                      aria-label={`Воля ${n}: ${isAgg ? "тяжёлый стресс" : isSup ? "поверхностный стресс" : "цел"}`}
                      title="клик — поверхностный стресс · Shift+клик — тяжёлый"
                    />
                  );
                })}
              </div>
              <p className="vtm-hint mt-1.5 !text-[0.75rem]">
                Осталось воли: {Math.max(0, derived.wpMax - usedWp)}/{derived.wpMax}. Заполненная шкала — изнурение (−2d10 к соц/мент пулам).
              </p>
            </div>

            {/* Человечность */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="vtm-label text-[0.77rem] text-[#d9c7b6]">Человечность</span>
                <span className="vtm-label text-[0.83rem] text-[#d6a840]">{derived.humanityTotal}/10</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => {
                  const isStain = n > data.trackers.humanity && n <= data.trackers.humanity + data.trackers.stains;
                  const filled = n <= data.trackers.humanity;
                  return (
                    <button
                      key={n}
                      className={`vtm-humanity-cell ${filled ? "filled" : ""} ${isStain ? "stain" : ""}`}
                      onClick={() => {
                        mutate((d) => { d.trackers.humanity = n === d.trackers.humanity ? n - 1 : n; if (d.trackers.stains > 10 - d.trackers.humanity) d.trackers.stains = 10 - d.trackers.humanity; });
                      }}
                      aria-label={`Человечность ${n}`}
                      title={filled ? "звено Человечности" : isStain ? "пятно" : ""}
                    />
                  );
                })}
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <span className="vtm-hint !text-[0.75rem]">Пятна: {data.trackers.stains}</span>
                <div className="flex gap-1">
                  <button className="vtm-btn vtm-btn-ghost !py-0.5 !px-2 !text-[0.73rem]" onClick={() => mutate((d) => { d.trackers.stains = Math.max(0, d.trackers.stains - 1); })} aria-label="Смыть пятно">−</button>
                  <button className="vtm-btn vtm-btn-ghost !py-0.5 !px-2 !text-[0.73rem]" onClick={() => mutate((d) => { d.trackers.stains = Math.min(10 - d.trackers.humanity, d.trackers.stains + 1); })} aria-label="Поставить пятно">+</button>
                </div>
              </div>
              <p className="vtm-hint mt-1 !text-[0.75rem]">
                Пятна (дashed) исчезают при успешной проверке Человечности, иначе превращаются в потерянные звенья. При 0 — Зверь пожирает тебя.
              </p>
            </div>

            {/* Сила Крови */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="vtm-label text-[0.77rem] text-[#d9c7b6]">Сила Крови</span>
                <span className="vtm-label text-[0.83rem] text-[#a877c0]">{derived.bp}</span>
              </div>
              <Dots value={derived.bp} max={5} color="violet" ariaLabel="Сила Крови" />
              <p className="vtm-hint mt-1.5 !text-[0.75rem]">
                По поколению: бонус +{derived.bpRow.bonusDice} к физике и Дисциплинам · заживление: {derived.bpRow.mend} · изъян: тяжесть {derived.bpRow.baneSeverity}
                {derived.bpRow.feedingPenalty !== "—" ? ` · кормление: ${derived.bpRow.feedingPenalty}` : ""}
              </p>
            </div>

            <div className="vtm-divider text-[0.73rem]"><span>☾</span></div>

            {/* Резонанс крови */}
            <ResonanceBlock data={data} mutate={mutate} />

            <div className="vtm-divider text-[0.73rem]"><span>🦇</span></div>

            {/* Диаблери и след в ауре */}
            <DiablerieBlock data={data} mutate={mutate} />

            <div className="vtm-divider text-[0.73rem]"><span>🖋</span></div>

            {/* Опыт и журнал */}
            <XpBlock data={data} mutate={mutate} />
          </div>
        </div>

        {/* Описание и предыстория */}
        <div className="vtm-panel">
          <div className="vtm-panel-head">
            <span className="vtm-label text-[0.81rem] text-[#d6a840]">Облик и прошлое</span>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="vtm-label text-[0.73rem] text-[#c4ac9d]">Внешность</span>
                <CharCount value={info.description} limit={BIO_DESC_LIMIT} />
              </div>
              <div className="mt-1">
                <AutoTextarea
                  value={info.description}
                  onChange={(v) => mutate((d) => { d.info.description = v.slice(0, BIO_DESC_LIMIT); })}
                  placeholder="что видят смертные, когда ты позволяешь себя рассмотреть"
                  ariaLabel="Внешность"
                  maxLength={BIO_DESC_LIMIT}
                />
              </div>
            </div>
            <div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="vtm-label text-[0.73rem] text-[#c4ac9d]">Предыстория</span>
                <CharCount value={info.history} limit={BIO_HISTORY_LIMIT} />
              </div>
              <div className="mt-1">
                <AutoTextarea
                  value={info.history}
                  onChange={(v) => mutate((d) => { d.info.history = v.slice(0, BIO_HISTORY_LIMIT); })}
                  placeholder="смертная жизнь, Становление и всё, что после"
                  ariaLabel="Предыстория"
                  maxLength={BIO_HISTORY_LIMIT}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Портретная студия: зум, перетаскивание, повороты, виньетка */}
      <VtmPortraitStudio
        imageDataUrl={studioImage}
        characterName={info.name}
        currentPortrait={info.portrait || undefined}
        onApply={(portrait, thumb) => {
          mutate((d) => {
            d.info.portrait = portrait;
            d.info.portraitThumb = thumb;
          });
          setStudioImage(null);
          toast.success("Портрет вклеен в досье", { description: "Оклад вырезан, миниатюра для архива готова." });
        }}
        onClose={() => setStudioImage(null)}
      />
    </div>
  );
}

// ============================================================
// ХАРАКТЕРИСТИКИ
// ============================================================

const ATTR_RU: Record<keyof VtmAttributes, string> = {
  str: "Сила", dex: "Ловкость", sta: "Выносливость",
  cha: "Обаяние", man: "Манипуляция", com: "Самообладание",
  int: "Интеллект", wit: "Смекалка", res: "Упорство",
};

export function AttributesSection({
  data,
  mutate,
  derived,
  onRoll,
}: {
  data: VtmSheetData;
  mutate: (fn: (draft: VtmSheetData) => void) => void;
  derived: DerivedStats;
  onRoll: (pool: number, label: string) => void;
}) {
  const delta = derived.attrDelta;
  const attrKeyToSkill = (key: keyof VtmAttributes) => {
    const map: Partial<Record<keyof VtmAttributes, string>> = {
      str: "brawl", dex: "larceny", sta: "survival",
      cha: "persuasion", man: "subterfuge", com: "insight",
      int: "academics", wit: "awareness", res: "leadership",
    };
    const skillKey = map[key]!;
    const skill = data.skills.find((s) => s.key === skillKey);
    return skill;
  };

  return (
    <div className="space-y-4">
      {/* Бюджет */}
      <div className="vtm-panel p-4 flex flex-wrap items-center gap-3">
        <span className="vtm-stamp vtm-stamp-gold">Одна 4 · три 3 · четыре 2 · одна 1</span>
        <p className="vtm-hint !text-[0.77rem] flex-1 min-w-[220px]">
          По правилам (стр. 137): одна характеристика 4 пункта, ещё три — по 3, ещё четыре — по 2, ещё одна — 1. Клик по точке — поставить, клик по крайней заполненной — снять. Правый клик — снять одну.
        </p>
        <span
          className={`vtm-label text-xs ${delta === 0 ? "text-[#9fd8b3]" : delta > 0 ? "text-[#e8636b]" : "text-[#d6a840]"}`}
          title={delta === 0 ? "Бюджет распределён точно" : delta > 0 ? "Превышение бюджета правил" : "Остались нераспределённые очки"}
        >
          {delta === 0 ? "бюджет сходится ✓" : delta > 0 ? `перебор +${delta}` : `осталось ${-delta}`}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {ATTRIBUTE_GROUPS.map((group) => (
          <section key={group.id} className="vtm-panel" aria-label={group.name}>
            <div className="vtm-panel-head">
              <span className="vtm-label text-[0.81rem] text-[#d6a840]">{group.name}</span>
            </div>
            <div className="p-3 space-y-1">
              {group.attrs.map((attr) => {
                const value = data.attributes[attr.key];
                const skill = attrKeyToSkill(attr.key);
                const pool = value + (skill?.value || 0);
                return (
                  <div
                    key={attr.key}
                    className="vtm-skill-row !grid-cols-[1fr_auto] cursor-pointer"
                    role="button"
                    tabIndex={0}
                    onClick={() => onRoll(pool, `${ATTR_RU[attr.key]}${skill ? ` + ${skill.name}` : " (голая)"}`)}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onRoll(pool, `${ATTR_RU[attr.key]}${skill ? ` + ${skill.name}` : " (голая)"}`)}
                    title={`Клик — проверка ${ATTR_RU[attr.key]}${skill ? ` + ${skill.name}` : ""} (${pool} костей)`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-sm text-[#d9c7b6] font-medium">{attr.name}</span>
                        {skill && skill.value > 0 && (
                          <span className="vtm-pool-chip" title={`Пул быстрого броска: ${attr.name} ${value} + ${skill.name} ${skill.value} = ${pool} костей`}>
                            ⚄ пул {pool}
                          </span>
                        )}
                      </div>
                      <p className="vtm-hint !text-[0.73rem] truncate">
                        {attr.hint}
                        {skill && (
                          <span className="vtm-pair-name">
                            {" · "}пара: {skill.name}{skill.spec ? ` (${skill.spec})` : ""}
                          </span>
                        )}
                      </p>
                    </div>
                    <Dots
                      value={value}
                      ariaLabel={`${attr.name}: уровень ${value}`}
                      onChange={(n) => mutate((d) => { d.attributes[attr.key] = n; })}
                      onRoll={() => {}}
                    />
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <p className="vtm-hint text-center">
        Чип «⚄ пул N» — пул быстрого броска: характеристика с парной навыковой проверкой (пара выбрана для быстрого броска).
      </p>
    </div>
  );
}

// ============================================================
// НАВЫКИ
// ============================================================

export function SkillsSection({
  data,
  mutate,
  derived,
  onRoll,
}: {
  data: VtmSheetData;
  mutate: (fn: (draft: VtmSheetData) => void) => void;
  derived: DerivedStats;
  onRoll: (pool: number, label: string) => void;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const skillsByGroup = (group: "physical" | "social" | "mental") =>
    SKILL_LIBRARY.filter((s) => s.group === group).filter(
      (s) => !q || s.name.toLowerCase().includes(q) || (s.specExamples.some((e) => e.includes(q)))
    );

  const getSkill = (key: string): VtmSheetData["skills"][number] | undefined =>
    data.skills.find((s) => s.key === key);

  const setSkill = (key: string, name: string, patch: Partial<VtmSheetData["skills"][number]>) => {
    mutate((d) => {
      const existing = d.skills.find((s) => s.key === key);
      if (existing) {
        Object.assign(existing, patch);
      } else {
        d.skills.push({ key, name, value: 0, spec: "", xp: 0, ...patch });
      }
    });
  };

  // Пары характеристика + навык по умолчанию (для быстрых бросков)
  const DEFAULT_PAIR: Record<string, keyof VtmAttributes> = {
    athletics: "dex", brawl: "str", craft: "int", drive: "dex", firearms: "dex",
    larceny: "dex", melee: "dex", stealth: "dex", survival: "wit",
    animal_ken: "cha", etiquette: "com", insight: "int", intimidation: "man",
    leadership: "cha", performance: "cha", persuasion: "man", streetwise: "man", subterfuge: "man",
    academics: "int", awareness: "wit", finance: "int", investigation: "int",
    medicine: "int", occult: "int", politics: "int", science: "int", technology: "int",
  };

  const ATTR_ABBR: Record<keyof VtmAttributes, string> = {
    str: "СИЛ", dex: "ЛОВ", sta: "ВЫН", cha: "ОБА", man: "МАН",
    com: "САМ", int: "ИНТ", wit: "СМК", res: "УПР",
  };

  const rollSkill = (key: string, name: string) => {
    const attrKey = DEFAULT_PAIR[key] || "wit";
    const attrValue = data.attributes[attrKey];
    const skill = getSkill(key);
    const pool = attrValue + (skill?.value || 0);
    const specHint = skill?.spec ? ` · ${skill.spec}` : "";
    onRoll(pool, `${name}${specHint} (${ATTR_RU[attrKey]} + ${skill?.value || 0})`);
  };

  const groups: { id: "physical" | "social" | "mental"; name: string; icon: string }[] = [
    { id: "physical", name: "Физические", icon: "⚔" },
    { id: "social", name: "Социальные", icon: "🎭" },
    { id: "mental", name: "Ментальные", icon: "🕯" },
  ];

  return (
    <div className="space-y-4">
      <div className="vtm-panel p-4 flex flex-wrap items-center gap-3">
        <span className="vtm-stamp">27 навыков</span>
        <p className="vtm-hint !text-[0.77rem] flex-1 min-w-[220px]">
          Клик по точке — уровень (0–5). Клик по строке — проверка: характеристика по умолчанию + навык, кости Голода краснеют. Специализация углубляет конкретное применение навыка.
        </p>
        <input
          className="vtm-input !w-48"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="поиск: ножи, ложь, взлом…"
          aria-label="Поиск навыка"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {groups.map((group) => (
          <section key={group.id} className="vtm-panel" aria-label={group.name}>
            <div className="vtm-panel-head">
              <span className="vtm-label text-[0.81rem] text-[#d6a840]">{group.icon} {group.name}</span>
            </div>
            <div className="p-2 md:p-3 space-y-0.5 max-h-[560px] overflow-y-auto overflow-x-hidden vtm-scroll">
              {skillsByGroup(group.id).map((def) => {
                const state = getSkill(def.id);
                const value = state?.value || 0;
                const attrKey = DEFAULT_PAIR[def.id] || "wit";
                const pool = data.attributes[attrKey] + value;
                return (
                  <div key={def.id}>
                    <div
                      className="vtm-skill-row cursor-pointer"
                      role="button"
                      tabIndex={0}
                      onClick={() => rollSkill(def.id, def.name)}
                      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && rollSkill(def.id, def.name)}
                      title={`Клик — проверка (${pool} костей · ${ATTR_RU[attrKey]} + ${value})`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className={`text-[0.92rem] leading-snug ${value > 0 ? "text-[#d9c7b6]" : "text-[#c4ac9d]"}`}>{def.name}</span>
                          <span
                            className="vtm-pair-chip"
                            title={`Пара по умолчанию: ${ATTR_RU[attrKey]}. Клик по строке — бросок ${ATTR_ABBR[attrKey]} + навык`}
                          >
                            +{ATTR_ABBR[attrKey]}
                          </span>
                          <span className="vtm-pool-chip" title={`Пул быстрого броска: ${ATTR_RU[attrKey]} ${data.attributes[attrKey]} + ${def.name} ${value} = ${pool} костей`}>
                            ⚄ пул {pool}
                          </span>
                        </div>
                        {state?.spec && <p className="vtm-hint !text-[0.75rem] italic">«{state.spec}»</p>}
                      </div>
                      <Dots
                        value={value}
                        color="gold"
                        ariaLabel={`${def.name}: уровень ${value}`}
                        onChange={(n) => setSkill(def.id, def.name, { value: n })}
                        onRoll={() => {}}
                      />
                    </div>
                    {value > 0 && (
                      <div className="px-2 pb-1.5">
                        <input
                          className="vtm-input !py-1 !text-[0.83rem] border-dashed"
                          value={state?.spec || ""}
                          onChange={(e) => setSkill(def.id, def.name, { spec: e.target.value.slice(0, 40) })}
                          placeholder={`специализация: ${def.specExamples.slice(0, 2).join(", ")}…`}
                          aria-label={`Специализация навыка ${def.name}`}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
              {skillsByGroup(group.id).length === 0 && (
                <p className="vtm-hint text-center py-3">Ничего не нашлось — попробуй иначе.</p>
              )}
            </div>
          </section>
        ))}
      </div>

      {/* Кастомные навыки */}
      <CustomSkills data={data} mutate={mutate} onRoll={onRoll} />
    </div>
  );
}

/** Пользовательские навыки (для редких умений: «Пилотирование дирижабля» и т.п.) */
function CustomSkills({
  data,
  mutate,
  onRoll,
}: {
  data: VtmSheetData;
  mutate: (fn: (draft: VtmSheetData) => void) => void;
  onRoll: (pool: number, label: string) => void;
}) {
  const [name, setName] = useState("");
  const customs = data.skills.filter((s) => s.key === null);
  const add = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (data.skills.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("Такой навык уже есть");
      return;
    }
    mutate((d) => {
      d.skills.push({ key: null, name: trimmed, value: 0, spec: "", xp: 0 });
    });
    setName("");
  };

  return (
    <div className="vtm-panel p-4 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="vtm-label text-[0.77rem] text-[#d6a840]">Свои навыки</span>
        <span className="vtm-hint !text-[0.75rem] flex-1">для умений вне списка — клик по строке тоже бросает пул (Смекалка + навык)</span>
      </div>
      {customs.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
          {customs.map((s, i) => (
            <div
              key={i}
              className="vtm-skill-row cursor-pointer"
              role="button"
              tabIndex={0}
              onClick={() => onRoll(data.attributes.wit + s.value, `${s.name} (СМК + ${s.value})`)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onRoll(data.attributes.wit + s.value, `${s.name}`)}
              title={`Клик — проверка (${data.attributes.wit + s.value} костей)`}
            >
              <div className="flex items-baseline gap-2 min-w-0">
                <span className="text-[0.92rem] text-[#d9c7b6] truncate">{s.name}</span>
                <span className="vtm-label text-[0.73rem] text-[#9c8072]">{data.attributes.wit + s.value}🞄</span>
              </div>
              <div className="flex items-center gap-1">
                <Dots value={s.value} color="gold" ariaLabel={`${s.name}: уровень`} onChange={(n) => mutate((d) => { const cs = d.skills.filter((x) => x.key === null); cs[i].value = n; })} onRoll={() => {}} />
                <button
                  className="vtm-btn vtm-btn-ghost !p-1 !text-[0.73rem]"
                  onClick={(e) => { e.stopPropagation(); mutate((d) => { d.skills = d.skills.filter((x) => !(x.key === null && x.name === s.name)); }); }}
                  aria-label={`Удалить навык ${s.name}`}
                  title="Удалить"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          className="vtm-input flex-1"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="например: Пилотирование дирижабля"
          aria-label="Название нового навыка"
        />
        <button className="vtm-btn shrink-0" onClick={add} disabled={!name.trim()}>+ Добавить</button>
      </div>
    </div>
  );
}

// ============================================================
// НОВАЯ ОХОТА: сброс трекеров перед новой ночью + запись в журнал
// ============================================================

const newHuntSummary = (data: VtmSheetData): string => {
  const parts: string[] = [];
  if (data.trackers.hunger > 0) parts.push(`Голод ${data.trackers.hunger} → 0 (утолён)`);
  if (data.trackers.healthSup > 0) parts.push(`поверхностные раны ${data.trackers.healthSup} → 0 (зажили)`);
  if (data.trackers.wpSup > 0) parts.push(`поверхностный стресс ${data.trackers.wpSup} → 0 (отдых)`);
  return parts.length ? parts.join("; ") : "следы прошлой ночи уже смыты — тишина в трекерах";
};

/** Кнопка «Новая охота»: одной ночью заживает поверхностное, Голод утоляется, тяжёлое остаётся. */
function NewHuntButton({
  data,
  mutate,
}: {
  data: VtmSheetData;
  mutate: (fn: (draft: VtmSheetData) => void) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(false), 6000);
    return () => clearTimeout(t);
  }, [confirming]);

  const dirty =
    data.trackers.hunger > 0 || data.trackers.healthSup > 0 || data.trackers.wpSup > 0;

  const doReset = () => {
    const summary = newHuntSummary(data);
    mutate((d) => {
      d.trackers.hunger = 0;
      d.trackers.healthSup = 0;
      d.trackers.wpSup = 0;
      d.trackers.huntCount = (d.trackers.huntCount || 0) + 1;
      const now = new Date();
      const date = now.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
      d.trackers.lastHunt = date;
      d.notes.entries = [
        {
          id: `hunt-${now.getTime().toString(36)}`,
          title: "Новая охота",
          date,
          content: `Солнце село — Сородич проснулся. ${summary}. Тяжёлые раны и пятна Человечности не тронуты: ночь не стирает всё.`,
        },
        ...d.notes.entries,
      ].slice(0, 40);
    });
    setConfirming(false);
    toast.success("Новая охота началась", { description: "Голод утолён, поверхностное зажило. Запись в журнале ночи." });
  };

  return (
    <span className="ml-auto flex items-center gap-1.5">
      {confirming ? (
        <>
          <span className="vtm-hint !text-[0.72rem] hidden sm:inline text-[#d9c7b6]">Голод и поверхностное обнулятся, тяжёлое останется</span>
          <button className="vtm-btn vtm-btn-dawn is-confirm" onClick={doReset} aria-label="Подтвердить новую охоту">
            ✦ начала этой ночи
          </button>
          <button className="vtm-btn vtm-btn-ghost !py-0.5 !px-1.5 !text-[0.72rem]" onClick={() => setConfirming(false)} aria-label="Отменить">
            ✕
          </button>
        </>
      ) : (
        <button
          className={`vtm-btn vtm-btn-dawn ${dirty ? "" : "is-clean"}`}
          onClick={() => setConfirming(true)}
          title="Начало новой охоты: Голод утолён, поверхностные раны и стресс зажили за день. Тяжёлое остаётся. В журнал ночи добавится запись."
          aria-label="Начать новую охоту"
        >
          🌙 новая охота{dirty ? "" : " · чисто"}
        </button>
      )}
    </span>
  );
}

// ============================================================
// ДИАБЛЕРИ: счётчик выпитых душ и след в ауре
// ============================================================

function DiablerieBlock({
  data,
  mutate,
}: {
  data: VtmSheetData;
  mutate: (fn: (draft: VtmSheetData) => void) => void;
}) {
  const count = data.diablerie?.count || 0;
  const notes = data.diablerie?.notes || "";

  return (
    <div className="vtm-diab-block">
      <div className="flex items-center justify-between mb-1.5 gap-2 flex-wrap">
        <span className="vtm-label text-[0.77rem] text-[#d9c7b6]">Диаблери</span>
        <div className="flex items-center gap-1">
          <button
            className="vtm-btn vtm-btn-ghost !py-0.5 !px-2 !text-[0.75rem]"
            onClick={() => mutate((d) => { d.diablerie = d.diablerie || { count: 0, notes: "" }; d.diablerie.count = Math.max(0, d.diablerie.count - 1); })}
            aria-label="Убрать одно Диаблери"
            title="Снять одно Диаблери (если записали зря)"
          >
            −
          </button>
          <span className={`vtm-label text-[0.9rem] w-5 text-center ${count > 0 ? "text-[#e8636b]" : "text-[#9c8072]"}`}>{count}</span>
          <button
            className="vtm-btn vtm-btn-danger !py-0.5 !px-2 !text-[0.75rem]"
            onClick={() => mutate((d) => { d.diablerie = d.diablerie || { count: 0, notes: "" }; d.diablerie.count = d.diablerie.count + 1; })}
            aria-label="Записать совершённое Диаблери"
            title="Выпил душу — запиши. Это не забывается."
          >
            +
          </button>
        </div>
      </div>

      {/* Аура: меняется с каждым Диаблери */}
      <div className={`vtm-diab-aura ${count > 0 ? "stained" : ""}`} role="status" aria-label={`След в ауре: ${count > 0 ? "чёрные прожилки диаблери" : "чистая аура"}`}>
        <span className="vtm-diab-aura-icon" aria-hidden>{count > 0 ? "🩸" : "🫧"}</span>
        <div className="flex-1 min-w-0">
          <p className="vtm-diab-aura-title">
            {count === 0
              ? "Аура чиста — пока только бледный свет Сородича"
              : count === 1
                ? "В ауре появились чёрные прожилки — первое Диаблери"
                : count <= 3
                  ? `Чёрные прожилки вьются гроздьями — выпито душ: ${count}`
                  : "Аура изрыта чёрными венами: тень демона видна даже смертным с чутьём"}
          </p>
          <p className="vtm-hint !text-[0.76rem] mt-0.5">
            {count > 0
              ? "Ясновидение (Познание души) выдаёт след десятилетиями. Свежее Диаблери чуют даже Обострение чувств. В землях Камарильи — Кровавая Охота."
              : "Каждое Диаблери (выпитая душа Сородича) оставляет в ауре чёрные прожилки. След тускнеет за десятилетия, но не исчезает."}
          </p>
        </div>
      </div>

      <input
        className="vtm-input !py-1 !text-[0.84rem] mt-1.5 border-dashed"
        value={notes}
        onChange={(e) => mutate((d) => { d.diablerie = d.diablerie || { count: 0, notes: "" }; d.diablerie.notes = e.target.value.slice(0, 300); })}
        placeholder="кто, когда и почему — след в ауре дополняет предысторию"
        aria-label="Заметки о Диаблери"
        maxLength={300}
      />
      <p className="vtm-hint !text-[0.75rem] mt-1">
        Механика: каждое Диаблери — 2 пятна Человечности, снижение поколения на ступень (по решению Рассказчика) и след в ауре. Полные правила — «База знаний → Механики → Диаблери».
      </p>
    </div>
  );
}

// ============================================================
// РЕЗОНАНС КРОВИ: привкус эмоций в крови жертвы
// ============================================================

function ResonanceBlock({
  data,
  mutate,
}: {
  data: VtmSheetData;
  mutate: (fn: (draft: VtmSheetData) => void) => void;
}) {
  const res = data.resonance;
  const def = res.kind ? RESONANCE_BY_ID.get(res.kind) : undefined;
  const intensity = res.intensity || 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="vtm-label text-[0.77rem] text-[#d9c7b6]">Резонанс крови</span>
        <span className="vtm-hint !text-[0.73rem]">{def ? RESONANCE_INTENSITY_LABELS[intensity] || "—" : "не отслеживается"}</span>
      </div>

      <div className="flex items-center gap-3">
        {/* Капля с жидкостью нужного цвета и уровня */}
        <span
          className={`vtm-resonance-drop ${def ? "active" : ""}`}
          style={
            def
              ? ({ "--res-color": def.color, "--res-glow": def.glow, "--res-fill": `${Math.max(8, Math.round((intensity / 5) * 100))}%` } as React.CSSProperties)
              : undefined
          }
          aria-hidden
        >
          <span className="vtm-resonance-liquid" />
        </span>
        <div className="flex-1 min-w-0">
          {/* Вид резонанса — чипы */}
          <div className="flex flex-wrap gap-1" role="group" aria-label="Вид резонанса">
            {RESONANCES.map((r) => (
              <button
                key={r.id}
                type="button"
                className={`vtm-res-chip ${res.kind === r.id ? "active" : ""}`}
                style={res.kind === r.id ? { borderColor: r.color, color: r.color, boxShadow: `0 0 8px ${r.glow}` } : undefined}
                title={r.emotion}
                aria-label={`Резонанс: ${r.name}`}
                aria-pressed={res.kind === r.id}
                onClick={() =>
                  mutate((d) => {
                    d.resonance.kind = d.resonance.kind === r.id ? "" : r.id;
                    if (!d.resonance.kind) d.resonance.intensity = 0;
                    else if (d.resonance.intensity === 0) d.resonance.intensity = 3;
                  })
                }
              >
                {r.name}
              </button>
            ))}
          </div>
          {/* Интенсивность — точки */}
          <div className="flex items-center gap-1 mt-1.5" role="group" aria-label="Интенсивность резонанса">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className={`vtm-res-dot ${n <= intensity ? "filled" : ""}`}
                style={n <= intensity && def ? { background: def.color, boxShadow: `0 0 6px ${def.glow}` } : undefined}
                disabled={!res.kind}
                aria-label={`Интенсивность ${n}`}
                title={RESONANCE_INTENSITY_LABELS[n]}
                onClick={() => mutate((d) => { d.resonance.intensity = d.resonance.intensity === n ? n - 1 : n; })}
              />
            ))}
            {res.kind && (
              <button
                type="button"
                className="vtm-btn vtm-btn-ghost !py-0 !px-1.5 !text-[0.70rem] ml-1"
                onClick={() => mutate((d) => { d.resonance.kind = ""; d.resonance.intensity = 0; })}
                aria-label="Сбросить резонанс"
              >
                сброс
              </button>
            )}
          </div>
        </div>
      </div>
      <p className="vtm-hint mt-1.5 !text-[0.75rem]">
        {def
          ? `${def.name}: ${def.emotion}. Глубокие резонансы (4–5) утоляют Голод надёжнее и ценятся Кровавым чародейством.`
          : "Привкус эмоций в крови жертвы. Отмечай, чью кровь ты пьёшь — от резонанса зависит насыщение и сила ритуалов."}
      </p>
    </div>
  );
}

// ============================================================
// ОПЫТ: свободный/вложенный + журнал изменений
// ============================================================

/** Маленькая кнопка управления опытом (вне рендера — по правилам хуков). */
function XpBtn({ children, onClick, title, disabled }: { children: React.ReactNode; onClick: () => void; title: string; disabled?: boolean }) {
  return (
    <button
      className="vtm-btn vtm-btn-ghost !py-0.5 !px-1.5 !text-[0.73rem] font-bold"
      onClick={onClick}
      title={title}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

function XpBlock({
  data,
  mutate,
}: {
  data: VtmSheetData;
  mutate: (fn: (draft: VtmSheetData) => void) => void;
}) {
  const logXp = (d: VtmSheetData, text: string) => {
    d.xpLog = [
      { id: `xp-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e5).toString(36)}`, text, ts: new Date().toISOString() },
      ...d.xpLog,
    ].slice(0, 40);
  };

  const gain = (n: number) =>
    mutate((d) => {
      d.trackers.xp = Math.max(0, d.trackers.xp + n);
      logXp(d, `+${n} опыт — свободно ${d.trackers.xp}`);
    });

  const refund = (n: number) =>
    mutate((d) => {
      d.trackers.xp = Math.max(0, d.trackers.xp - n);
      logXp(d, `−${n} свободного опыта (возврат/ошибка) — свободно ${d.trackers.xp}`);
    });

  const spend = (n: number) =>
    mutate((d) => {
      if (d.trackers.xp < n) return;
      d.trackers.xp -= n;
      d.trackers.xpSpent += n;
      logXp(d, `потрачено ${n} опыта — впишите покупку в Заметки · свободно ${d.trackers.xp}, вложено ${d.trackers.xpSpent}`);
    });

  const unspend = (n: number) =>
    mutate((d) => {
      d.trackers.xpSpent = Math.max(0, d.trackers.xpSpent - n);
      d.trackers.xp += n;
      logXp(d, `возврат ${n} опыта из вложенного — свободно ${d.trackers.xp}, вложено ${d.trackers.xpSpent}`);
    });

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
        <span className="vtm-label text-[0.77rem] text-[#d9c7b6]">Опыт</span>
        <span className="vtm-hint !text-[0.73rem]">
          свободно <b className="text-[#d6a840]">{data.trackers.xp}</b> · вложено <b className="text-[#c4ac9d]">{data.trackers.xpSpent}</b>
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <XpBtn onClick={() => gain(1)} title="Получен 1 опыт">+1</XpBtn>
        <XpBtn onClick={() => gain(3)} title="Получено 3 опыта">+3</XpBtn>
        <XpBtn onClick={() => gain(5)} title="Получено 5 опыта">+5</XpBtn>
        <span className="text-[#3d1a20] select-none" aria-hidden>|</span>
        <XpBtn onClick={() => spend(1)} title="Потратить 1 опыта" disabled={data.trackers.xp < 1}>−1</XpBtn>
        <XpBtn onClick={() => spend(5)} title="Потратить 5 опыта" disabled={data.trackers.xp < 5}>−5</XpBtn>
        <XpBtn onClick={() => spend(10)} title="Потратить 10 опыта" disabled={data.trackers.xp < 10}>−10</XpBtn>
        <span className="text-[#3d1a20] select-none" aria-hidden>|</span>
        <XpBtn onClick={() => refund(1)} title="Откатить 1 свободного" disabled={data.trackers.xp < 1}>↺1</XpBtn>
        <XpBtn onClick={() => unspend(5)} title="Вернуть 5 вложенных в свободные" disabled={data.trackers.xpSpent < 5}>⌂5</XpBtn>
      </div>
      {data.xpLog.length > 0 && (
        <div className="mt-2 max-h-24 overflow-y-auto vtm-scroll pr-1" aria-label="Журнал опыта">
          {data.xpLog.slice(0, 8).map((e) => (
            <p key={e.id} className="vtm-roll-row !text-[0.73rem]">
              {new Date(e.ts).toLocaleString("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })} · {e.text}
            </p>
          ))}
        </div>
      )}
      <p className="vtm-hint mt-1.5 !text-[0.73rem]">
        Цены: характеристика 5×ур · навык 3×ур · специализация 3 · Дисциплина 6×ур · сила Дисциплины 3×ур · Человечность 2×ур.
      </p>
    </div>
  );
}
