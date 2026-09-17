"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  CocSheetData,
  CocWeapon,
  SKILL_LIBRARY,
  financeByCredit,
  uid,
} from "@/lib/coc-data";
import { DerivedStats, skillTotal, skillBase } from "@/lib/coc-calc";
import { rollSkillCheck } from "@/components/coc/coc-dice";

interface SectionProps {
  data: CocSheetData;
  mutate: (fn: (draft: CocSheetData) => void) => void;
  derived: DerivedStats;
}

/* ============================================================
   Авторасширяющаяся textarea: текст растягивает поле,
   а не прокручивается внутри него.
   ============================================================ */

export function AutoTextarea({
  value,
  onChange,
  className = "",
  placeholder,
  ariaLabel,
  minHeight = 96,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
  ariaLabel?: string;
  minHeight?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px"; // сброс — чтобы scrollHeight пересчитался от содержимого
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
      className={`coc-input coc-autogrow ${className}`}
      style={{ height: minHeight }}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={ariaLabel}
      rows={1}
    />
  );
}

/* ============================================================
   ВКЛАДКА «БОЙ»: оружие + сводные боевые + памятка по ранам
   ============================================================ */

export function CombatSection({ data, mutate, derived }: SectionProps) {
  const dodgeSkill = data.skills.find((s) => s.key === "dodge");
  const dodgeValue = dodgeSkill ? skillTotal(dodgeSkill) : derived.dodgeBase;

  const skillOptions = data.skills
    .filter((s) => {
      if (s.key === null) return true;
      const def = SKILL_LIBRARY.find((l) => l.id === s.key);
      return def && (def.id.startsWith("firearm") || ["fighting", "throw", "dodge"].includes(def.id) || s.key === null);
    });

  const weaponRegular = (w: CocWeapon): number => {
    if (!w.autoRegular) {
      const n = parseInt(w.customRegular, 10);
      return isNaN(n) ? 0 : n;
    }
    const sk = data.skills.find((s) => (s.key || "") === (w.skillKey || ""));
    return sk ? skillTotal(sk) : 0;
  };

  /** Патроны как число (или null, если поле не числовое — ближний бой, «—» и т.п.) */
  const ammoNum = (w: CocWeapon): number | null => {
    const t = (w.ammo || "").trim();
    if (!t || !/^\d+$/.test(t)) return null;
    return parseInt(t, 10);
  };

  /** Выстрел: проверка навыка + расход патрона по правилам (бросок = выстрел). */
  const shoot = (w: CocWeapon) => {
    const reg = weaponRegular(w);
    if (reg <= 0) return;
    rollSkillCheck(w.name || "Оружие", reg);
    const left = ammoNum(w);
    if (left !== null && left > 0) {
      const remaining = left - 1;
      mutate((d) => {
        const t = d.weapons.find((x) => x.id === w.id);
        if (t) t.ammo = String(remaining);
      });
      if (remaining === 0) {
        toast.warning("Обойма пуста!", {
          description: `${w.name || "Оружие"}: последний патрон израсходован.`,
          duration: 6000,
        });
      } else {
        toast("−1 патрон", {
          description: `${w.name || "Оружие"}: осталось ${remaining}.`,
          duration: 3600,
        });
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Сводка */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="coc-panel p-3 text-center">
          <p className="coc-label mb-1">Бонус к урону</p>
          <p className="coc-mono text-xl font-bold text-[#c0a05a]">{derived.db}</p>
          <p className="coc-hint !text-[0.6rem]">СИЛ + ТЕЛ = {(data.characteristics.str || 0) + (data.characteristics.siz || 0)}</p>
        </div>
        <div className="coc-panel p-3 text-center">
          <p className="coc-label mb-1">Комплекция</p>
          <p className="coc-mono text-xl font-bold text-[#c0a05a]">{derived.build}</p>
          <p className="coc-hint !text-[0.6rem]">по таблице СИЛ+ТЕЛ</p>
        </div>
        <div className="coc-panel p-3 text-center">
          <p className="coc-label mb-1">Уклонение</p>
          <button
            className="coc-mono text-xl font-bold text-[#7fc39a] hover:text-[#a8dcc0] transition-colors"
            onClick={() => rollSkillCheck("Уклонение", dodgeValue)}
            title="Проверка Уклонения"
          >
            {dodgeValue}
          </button>
          <p className="coc-hint !text-[0.6rem]">база ½ ЛВК ({derived.dodgeBase})</p>
        </div>
        <div className="coc-panel p-3 text-center">
          <p className="coc-label mb-1">Скорость</p>
          <p className="coc-mono text-xl font-bold text-[#d8cbb0]">{derived.mov}</p>
          <p className="coc-hint !text-[0.6rem]">{derived.movPenalty ? `штраф возраста −${derived.movPenalty}` : "без штрафа возраста"}</p>
        </div>
      </div>

      {/* Оружие */}
      <div className="coc-panel">
        <div className="coc-panel-head">
          <h2 className="coc-display text-sm tracking-[0.2em] uppercase text-[#a4977c]">Арсенал</h2>
          <button
            onClick={() =>
              mutate((d) => {
                d.weapons.push({
                  id: uid(), name: "", skillKey: "firearmHandgun", customRegular: "", autoRegular: true,
                  damage: "", range: "", attacks: "1", ammo: "", malfunction: "—",
                });
              })
            }
            className="coc-btn coc-btn-verdigris !py-1 !px-2.5 text-xs ml-auto"
          >
            + Оружие
          </button>
        </div>
        <div className="p-3 overflow-x-auto coc-scroll">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="text-left">
                {["Оружие", "Навык", "Обычн.", "Трудн.", "Чрезв.", "Урон", "Дальн.", "Атаки", "Патроны", "Неиспр.", "Бросок"].map((h) => (
                  <th key={h} className="coc-label !text-[0.58rem] pb-2 px-1 font-normal">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.weapons.map((w) => {
                const reg = weaponRegular(w);
                const hard = Math.floor(reg / 2);
                const extreme = Math.floor(reg / 5);
                const upd = (fn: (x: CocWeapon) => void) =>
                  mutate((d) => {
                    const t = d.weapons.find((x) => x.id === w.id);
                    if (t) fn(t);
                  });
                return (
                  <tr key={w.id} className="border-t border-[#262015]">
                    <td className="px-1 py-1.5 min-w-[130px]">
                      <input className="coc-input !py-1 text-xs" value={w.name} onChange={(e) => upd((x) => { x.name = e.target.value; })} placeholder="Револьвер…" aria-label="Название оружия" />
                    </td>
                    <td className="px-1 py-1.5 min-w-[140px]">
                      <select className="coc-input !py-1 text-xs" value={w.skillKey || ""} onChange={(e) => upd((x) => { x.skillKey = e.target.value || null; })} aria-label="Связанный навык">
                        <option value="">— вручную —</option>
                        {skillOptions.map((s) => (
                          <option key={s.key || s.name} value={s.key || ""}>{s.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-1 py-1.5 w-20">
                      <div className="flex items-center gap-1">
                        <input
                          className="coc-mini-input"
                          value={w.autoRegular ? reg || "" : w.customRegular}
                          onChange={(e) => upd((x) => { x.customRegular = e.target.value; x.autoRegular = false; })}
                          placeholder={w.autoRegular ? String(reg) : "—"}
                          aria-label="Обычный уровень"
                        />
                        <button
                          onClick={() => upd((x) => { x.autoRegular = !x.autoRegular; })}
                          className={`coc-mono text-[0.6rem] px-1 py-1 rounded border transition-colors ${w.autoRegular ? "text-[#7fc39a] border-[#2e4a3a]" : "text-[#6e6350] border-[#262015]"}`}
                          title={w.autoRegular ? "Считается из навыка (нажмите — задать вручную)" : "Задано вручную (нажмите — считать из навыка)"}
                          aria-label="Переключить авторасчёт уровня"
                        >
                          {w.autoRegular ? "авто" : "рук"}
                        </button>
                      </div>
                    </td>
                    <td className="px-1 py-1.5 w-14 text-center coc-mono text-xs text-[#b9cfa4]">{hard || "—"}</td>
                    <td className="px-1 py-1.5 w-14 text-center coc-mono text-xs text-[#9fc9ae]">{extreme || "—"}</td>
                    <td className="px-1 py-1.5 min-w-[100px]">
                      <input className="coc-input !py-1 text-xs" value={w.damage} onChange={(e) => upd((x) => { x.damage = e.target.value; })} placeholder="1d10+БкУ" aria-label="Урон" />
                    </td>
                    <td className="px-1 py-1.5 w-20">
                      <input className="coc-input !py-1 text-xs" value={w.range} onChange={(e) => upd((x) => { x.range = e.target.value; })} placeholder="15 м" aria-label="Дальность" />
                    </td>
                    <td className="px-1 py-1.5 w-16">
                      <input className="coc-input !py-1 text-xs" value={w.attacks} onChange={(e) => upd((x) => { x.attacks = e.target.value; })} placeholder="1" aria-label="Атаки за раунд" />
                    </td>
                    <td className="px-1 py-1.5 w-16">
                      {(() => {
                        const a = ammoNum(w);
                        const cls =
                          a === 0
                            ? "coc-ammo-empty"
                            : a !== null && a <= 3
                              ? "coc-ammo-low"
                              : "";
                        return (
                          <input
                            className={`coc-input !py-1 text-xs ${cls}`}
                            value={w.ammo}
                            onChange={(e) => upd((x) => { x.ammo = e.target.value; })}
                            placeholder="6"
                            aria-label={`Патроны: ${w.name || "оружие"}`}
                            title={
                              a === 0
                                ? "Патронов нет — оружие не стреляет"
                                : a !== null && a <= 3
                                  ? `Патроны на исходе: ${a}`
                                  : "Число — при выстреле (🎲) списывается автоматически"
                            }
                          />
                        );
                      })()}
                    </td>
                    <td className="px-1 py-1.5 w-16">
                      <input className="coc-input !py-1 text-xs" value={w.malfunction} onChange={(e) => upd((x) => { x.malfunction = e.target.value; })} placeholder="—" aria-label="Неисправность" />
                    </td>
                    <td className="px-1 py-1.5">
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => shoot(w)}
                          disabled={reg <= 0}
                          className="coc-mono text-[0.7rem] px-1 py-0.5 rounded border border-transparent hover:border-[#2e4a3a] text-[#5f8f6e] hover:text-[#7fc39a] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title={reg > 0 ? `Проверка навыка (${reg})${ammoNum(w) !== null ? " · расход патрона" : ""}` : "Сначала задайте навык или уровень"}
                          aria-label={`Проверка навыка для ${w.name || "оружия"}`}
                        >
                          🎲
                        </button>
                        <button onClick={() => mutate((d) => { d.weapons = d.weapons.filter((x) => x.id !== w.id); })} className="text-[#a83232] hover:text-[#cf6a6a] px-1" title="Убрать оружие" aria-label={`Убрать ${w.name || "оружие"}`}>✕</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="coc-hint mt-2">
            Уровни Обычн/Трудн/Чрезвыч считаются из связанного навыка автоматически; впишите число вручную, чтобы задать своё.
            Выстрел по 🎲 списывает патрон, если он указан числом — следите за обоймой.
          </p>
        </div>
      </div>

      {/* Памятка по ранам */}
      <div className="coc-panel p-4 space-y-2">
        <h3 className="coc-display text-xs tracking-[0.2em] uppercase text-[#a4977c] mb-1">Раны и лечение</h3>
        <ul className="text-xs leading-relaxed text-[#a4977c] space-y-1 list-disc list-inside">
          <li><b className="text-[#d8cbb0]">Первая помощь</b> вылечивает 1 ПЗ; <b className="text-[#d8cbb0]">Медицина</b> — 1d3 ПЗ.</li>
          <li><b className="text-[#cf8a8a]">Серьёзная рана</b> = потеря ≥ ½ макс. ПЗ от одной атаки.</li>
          <li>0 ПЗ без серьёзной раны = <i>без сознания</i>; 0 ПЗ с серьёзной раной = <i className="text-[#a83232]">при смерти</i>.</li>
          <li>При смерти: Первая помощь = временная стабилизация, затем нужна Медицина.</li>
          <li>Естественное лечение: 1 ПЗ в день (без серьёзной раны); иначе — еженедельная проверка лечения.</li>
        </ul>
      </div>
    </div>
  );
}

/* ============================================================
   ВКЛАДКА «БИОГРАФИЯ»
   ============================================================ */

const BIO_FIELDS: { key: keyof CocSheetData["bio"]; label: string; hint?: string }[] = [
  { key: "description", label: "Описание", hint: "внешность, манеры, одежда" },
  { key: "traits", label: "Черты", hint: "щедрость, азарт, верность…" },
  { key: "ideals", label: "Идеалы и принципы" },
  { key: "scars", label: "Травмы и шрамы" },
  { key: "significant", label: "Значимые люди", hint: "и почему они важны" },
  { key: "phobias", label: "Фобии и мании" },
  { key: "places", label: "Важные места" },
  { key: "tomes", label: "Магические книги, заклинания, артефакты" },
  { key: "valuables", label: "Ценное имущество" },
  { key: "encounters", label: "Встречи со сверхъестественным" },
];

export function BioSection({ data, mutate }: Omit<SectionProps, "derived">) {
  return (
    <div className="coc-panel">
      <div className="coc-panel-head">
        <h2 className="coc-display text-sm tracking-[0.2em] uppercase text-[#a4977c]">Биография</h2>
        <span className="coc-hint ml-auto hidden sm:inline">предыстория, что делает сыщика живым · поля растут под текст</span>
      </div>
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {BIO_FIELDS.map((f) => (
          <div key={f.key} className="space-y-1">
            <label className="coc-label">{f.label}</label>
            <AutoTextarea
              value={data.bio[f.key]}
              onChange={(v) => mutate((d) => { d.bio[f.key] = v; })}
              placeholder={f.hint}
              ariaLabel={f.label}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   ВКЛАДКА «ИМУЩЕСТВО»: финансы + снаряжение
   ============================================================ */

export function GearSection({ data, mutate, derived }: SectionProps) {
  const creditSkill = data.skills.find((s) => s.key === "creditRating");
  const creditValue = creditSkill ? skillTotal(creditSkill) : skillBase({ key: "creditRating", name: "", occ: 0, pers: 0, improv: 0, isOccupation: false });
  const fin = financeByCredit(creditValue);
  const [newItem, setNewItem] = useState({ name: "", qty: "1", note: "" });
  // какие карточки развернуты (заметка видна) — состояние только интерфейса
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggleExpanded = (id: string) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  const addItem = () => {
    const name = newItem.name.trim();
    if (!name) return;
    mutate((d) => {
      d.gear.push({ id: uid(), name, qty: newItem.qty, note: newItem.note });
    });
    setNewItem({ name: "", qty: "1", note: "" });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Финансы */}
      <div className="coc-panel space-y-0 h-fit">
        <div className="coc-panel-head">
          <h2 className="coc-display text-sm tracking-[0.2em] uppercase text-[#a4977c]">Наличные и активы</h2>
        </div>
        <div className="p-4 space-y-3">
          <div className="rounded border border-[#9a7d3e]/30 bg-[#9a7d3e]/5 p-2.5 text-center">
            <p className="coc-label !text-[0.58rem] mb-1">Средства (навык)</p>
            <p className="coc-mono text-xl font-bold text-[#c0a05a]">{creditValue}%</p>
            <p className="coc-hint !text-[0.62rem]">уровень: {fin.level}</p>
          </div>
          <button
            onClick={() => mutate((d) => {
              const c = d.skills.find((s) => s.key === "creditRating");
              const v = c ? skillTotal(c) : 0;
              const sug = financeByCredit(v);
              const num = v <= 9 ? v : v <= 49 ? v * 2 : v <= 89 ? v * 5 : v <= 98 ? v * 20 : 50000;
              d.finance.pocket = sug.pocket;
              d.finance.cash = v === 0 ? "$0.50" : v >= 99 ? "$50.000" : `$${num}`;
              d.finance.assets = sug.assets === "Нет" ? "Нет" : v >= 99 ? "$5.000.000+" : sug.assets.replace("$(Средства)", String(num));
            })}
            className="coc-btn coc-btn-verdigris w-full text-xs"
          >
            Заполнить по уровню Средств
          </button>
          {(
            [
              ["pocket", "Карманные деньги"],
              ["cash", "Наличные"],
              ["assets", "Активы"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="space-y-1">
              <label className="coc-label">{label}</label>
              <input
                className="coc-input"
                value={data.finance[key]}
                onChange={(e) => mutate((d) => { d.finance[key] = e.target.value; })}
                aria-label={label}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Снаряжение */}
      <div className="coc-panel lg:col-span-2">
        <div className="coc-panel-head">
          <h2 className="coc-display text-sm tracking-[0.2em] uppercase text-[#a4977c]">Имущество и снаряжение</h2>
          <span className="coc-mono text-[0.62rem] text-[#6e6350] ml-auto">{data.gear.length} позиций</span>
        </div>

        <div className="p-3">
          {data.gear.length === 0 ? (
            <p className="text-center py-6 coc-hint">Рюкзак пуст. Даже фонаря нет. Мрачное начало.</p>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-96 overflow-y-auto coc-scroll pr-1 items-start">
              {data.gear.map((g) => {
                const hasNote = !!(g.note && g.note.trim());
                const isOpen = !!expanded[g.id];
                return (
                  <li
                    key={g.id}
                    className={`rounded border p-2 transition-colors ${
                      isOpen
                        ? "border-[#5f8f6e]/40 bg-[#5f8f6e]/[0.04]"
                        : hasNote
                          ? "border-[#9a7d3e]/35 bg-black/20"
                          : "border-[#262015] bg-black/20"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#5f8f6e] text-xs select-none shrink-0" title="Предмет">◈</span>
                      <input
                        className="coc-mini-input !text-left !w-11 shrink-0"
                        value={g.qty}
                        onChange={(e) => mutate((d) => { const t = d.gear.find((x) => x.id === g.id); if (t) t.qty = e.target.value; })}
                        aria-label={`Количество: ${g.name}`}
                        title="Количество"
                      />
                      <input
                        className="coc-input !py-1 !border-transparent !bg-transparent text-sm min-w-0 flex-1"
                        value={g.name}
                        onChange={(e) => mutate((d) => { const t = d.gear.find((x) => x.id === g.id); if (t) t.name = e.target.value; })}
                        aria-label="Название предмета"
                        placeholder="Название…"
                      />
                      <button
                        onClick={() => toggleExpanded(g.id)}
                        className={`shrink-0 coc-mono text-[0.68rem] px-1.5 py-1 rounded border transition-colors ${
                          hasNote
                            ? isOpen
                              ? "text-[#7fc39a] border-[#2e4a3a] bg-[#5f8f6e]/10"
                              : "text-[#c0a05a] border-[#9a7d3e]/40 hover:border-[#9a7d3e] hover:text-[#d8b46a]"
                            : "text-[#4a4234] border-[#262015] hover:text-[#5f8f6e] hover:border-[#2e4a3a]"
                        }`}
                        title={hasNote ? (isOpen ? "Свернуть заметку" : `Развернуть заметку: ${g.note}`) : "Добавить заметку"}
                        aria-label={hasNote ? (isOpen ? `Свернуть заметку: ${g.name}` : `Развернуть заметку: ${g.name}`) : `Добавить заметку: ${g.name}`}
                        aria-expanded={hasNote ? isOpen : undefined}
                      >
                        {hasNote ? (isOpen ? "✎ ▴" : "✎ ▾") : "+ ✎"}
                      </button>
                      <button
                        onClick={() => mutate((d) => { d.gear = d.gear.filter((x) => x.id !== g.id); })}
                        className="text-[#a83232] hover:text-[#cf6a6a] px-1 shrink-0"
                        title="Выбросить"
                        aria-label={`Убрать ${g.name}`}
                      >
                        ✕
                      </button>
                    </div>
                    {isOpen && (
                      <div className="mt-1.5 pl-5">
                        <AutoTextarea
                          value={g.note || ""}
                          onChange={(v) => mutate((d) => { const t = d.gear.find((x) => x.id === g.id); if (t) t.note = v; })}
                          placeholder="заметка: где лежит, зачем нужно, сколько зарядов…"
                          ariaLabel={`Заметка: ${g.name}`}
                          minHeight={44}
                          className="!text-xs !py-1.5 italic"
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <p className="coc-hint mt-2">
            ✎ — заметка: разверните карточку, чтобы прочитать или дописать · на широком экране карточки стоят в две колонки.
          </p>
        </div>

        <div className="p-3 border-t border-[#262015] flex flex-wrap items-center gap-2">
          <input
            className="coc-input flex-1 min-w-[140px]"
            placeholder="Предмет (например, Электрический фонарь)"
            value={newItem.name}
            onChange={(e) => setNewItem((p) => ({ ...p, name: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && addItem()}
            aria-label="Новый предмет"
          />
          <input
            className="coc-input !w-16"
            placeholder="кол-во"
            value={newItem.qty}
            onChange={(e) => setNewItem((p) => ({ ...p, qty: e.target.value }))}
            aria-label="Количество"
          />
          <input
            className="coc-input !w-44"
            placeholder="заметка"
            value={newItem.note}
            onChange={(e) => setNewItem((p) => ({ ...p, note: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && addItem()}
            aria-label="Заметка к предмету"
          />
          <button onClick={addItem} className="coc-btn coc-btn-verdigris !py-2">+ Положить в рюкзак</button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   ВКЛАДКА «ЗАМЕТКИ»: журнал расследования
   ============================================================ */

export function NotesSection({ data, mutate }: Omit<SectionProps, "derived">) {
  const [draft, setDraft] = useState({ title: "", content: "" });

  const addNote = () => {
    const content = draft.content.trim();
    if (!content) return;
    mutate((d) => {
      d.notes.unshift({
        id: uid(),
        title: draft.title.trim() || "Без названия",
        content,
        createdAt: new Date().toISOString(),
      });
    });
    setDraft({ title: "", content: "" });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Новая запись */}
      <div className="coc-panel h-fit lg:sticky lg:top-4">
        <div className="coc-panel-head">
          <h2 className="coc-display text-sm tracking-[0.2em] uppercase text-[#a4977c]">Новая запись</h2>
        </div>
        <div className="p-4 space-y-3">
          <input
            className="coc-input"
            placeholder="Заголовок (Культ в гавани…)"
            value={draft.title}
            onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
            aria-label="Заголовок заметки"
          />
          <AutoTextarea
            value={draft.content}
            onChange={(v) => setDraft((p) => ({ ...p, content: v }))}
            placeholder="Что выяснилось этой ночью…"
            ariaLabel="Текст заметки"
            minHeight={140}
          />
          <button onClick={addNote} className="coc-btn coc-btn-verdigris w-full">
            Сделать запись в журнале
          </button>
          <p className="coc-hint">Записи хранятся внутри дела и пишутся от руки сыщиком — для памяти по сюжету.</p>
        </div>
      </div>

      {/* Журнал */}
      <div className="lg:col-span-2 space-y-3">
        {data.notes.length === 0 ? (
          <div className="coc-panel p-8 text-center">
            <p className="coc-display text-lg text-[#a4977c]">Журнал пуст</p>
            <p className="coc-hint mt-2">Первые страницы расследования ещё не написаны.</p>
          </div>
        ) : (
          data.notes.map((n) => (
            <article key={n.id} className="coc-panel p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[#a83232] text-xs select-none" title="Запись журнала">✒</span>
                <input
                  className="coc-input !border-transparent !bg-transparent coc-display !text-base flex-1"
                  value={n.title}
                  onChange={(e) => mutate((d) => { const t = d.notes.find((x) => x.id === n.id); if (t) t.title = e.target.value; })}
                  aria-label="Заголовок записи"
                />
                <span className="coc-mono text-[0.6rem] text-[#4a4234] shrink-0">
                  {new Date(n.createdAt).toLocaleDateString("ru-RU", { day: "2-digit", month: "short" })}
                </span>
                <button
                  onClick={() => mutate((d) => { d.notes = d.notes.filter((x) => x.id !== n.id); })}
                  className="text-[#a83232] hover:text-[#cf6a6a] px-1 shrink-0"
                  title="Вырвать страницу"
                  aria-label={`Удалить заметку ${n.title}`}
                >
                  ✕
                </button>
              </div>
              <AutoTextarea
                value={n.content}
                onChange={(v) => mutate((d) => { const t = d.notes.find((x) => x.id === n.id); if (t) t.content = v; })}
                ariaLabel="Текст записи"
                minHeight={110}
                className="!border-[#262015] leading-relaxed"
              />
            </article>
          ))
        )}
      </div>
    </div>
  );
}
