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
  SKILL_DEXTRA,
  CLANS,
  CLAN_BY_ID,
  SECTS,
  SECT_BY_ID,
  PREDATOR_TYPES,
  PREDATOR_BY_ID,
  PREDATOR_GRANT_MAP,
  GENERATIONS,
  RESONANCES,
  RESONANCE_BY_ID,
  RESONANCE_INTENSITY_LABELS,
  bloodPotencyByGeneration,
  diablerieDifficulty,
  XP_COSTS,
  pushXpLog,
  spendEconomy,
  refundEconomy,
  DEFAULT_CREATION_POOL,
  parsePredatorMerit,
  type PredatorGrant,
  type VtmDiablerieEntry,
  plural,
} from "@/lib/vtm-data";
import { DISCIPLINE_BY_ID } from "@/lib/vtm-data";
import { clanCompulsionFor } from "@/lib/vtm-chronicle";
import { DerivedStats, bpHint } from "@/lib/vtm-calc";
import { rollPool, rollRouse, useVtmDice, VtmRollResult } from "@/components/vtm/vtm-dice";
import { vtmUid } from "@/lib/vtm-id";
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

/**
 * Текстовый блок Досье: ширина и высота подстраиваются под содержимое
 * («в зависимости от наполнения имеет ширину»).
 * Chromium/свежий Firefox: CSS field-sizing: content.
 * Остальные браузеры: JS-замер ширины по невидимому зеркалу + авто-высота.
 */
export function VtmBlockField({
  value,
  onChange,
  placeholder,
  ariaLabel,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const mirrorRef = useRef<HTMLSpanElement>(null);
  // null — ещё не проверяли; поддержка field-sizing: content выясняется в layout-эффекте (без state — без гидрационных расхождений)
  const fsSupportedRef = useRef<boolean | null>(null);

  // Fallback: ширина по содержимому (замер зеркалом), перенос/перевод строки — вся колонка
  useLayoutEffect(() => {
    if (fsSupportedRef.current === null) {
      fsSupportedRef.current =
        typeof CSS !== "undefined" &&
        typeof CSS.supports === "function" &&
        CSS.supports("field-sizing", "content");
    }
    if (fsSupportedRef.current) return; // field-sizing: content сам подгонит размер
    const el = ref.current;
    const mirror = mirrorRef.current;
    const wrap = wrapRef.current;
    if (!el || !mirror || !wrap) return;
    const cs = window.getComputedStyle(el);
    mirror.style.fontFamily = cs.fontFamily;
    mirror.style.fontSize = cs.fontSize;
    mirror.style.fontWeight = cs.fontWeight;
    mirror.style.fontStyle = cs.fontStyle;
    mirror.style.letterSpacing = cs.letterSpacing;
    mirror.textContent = value || placeholder || "";
    const natural = mirror.offsetWidth + 21; // + горизонтальный padding и рамка поля
    const max = wrap.clientWidth || 320;
    if (natural < max && !value.includes("\n")) {
      el.style.width = `${Math.max(natural, 150)}px`;
      el.style.height = "auto";
    } else {
      el.style.width = "100%";
      el.style.height = "0px";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [value, placeholder]);

  return (
    <div ref={wrapRef} className="relative">
      <span ref={mirrorRef} className="vtm-block-mirror" aria-hidden="true" />
      <textarea
        ref={ref}
        rows={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={`vtm-block-field ${className}`}
      />
    </div>
  );
}

/**
 * Поле Досье (раунд 38): единый вид — иконка-метка, подпись, подсказка,
 * поле на всю ширину ячейки. Используется на вкладке «Досье».
 */
export function DossierField({
  label,
  icon,
  value,
  onChange,
  placeholder,
  ariaLabel,
  hint,
  accent = false,
  maxLength,
}: {
  label: string;
  icon?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  hint?: string;
  accent?: boolean;
  maxLength?: number;
}) {
  return (
    <label className="vtm-dossier-field block">
      <span className={`vtm-dossier-label ${accent ? "accent" : ""}`}>
        {icon && <i className="vtm-dossier-label-icon" aria-hidden>{icon}</i>}
        {label}
        {hint && <em className="vtm-dossier-label-hint">{hint}</em>}
      </span>
      <VtmBlockField
        className="vtm-block-field--full"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        ariaLabel={ariaLabel || label}
        {...(maxLength ? { maxLength } : {})}
      />
    </label>
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
// ДАРЫ ХИЩНИКА: стиль охоты → механика
// Книга правил, стр. 183–186: каждый стиль охоты даёт на создании
// бесплатно +1 уровень Дисциплины и Достоинство (или Недостаток).
// ============================================================

const PREDATOR_GIFT_MARKER = "дар хищника";

function PredatorGiftsCard({
  data,
  mutate,
}: {
  data: VtmSheetData;
  mutate: (fn: (draft: VtmSheetData) => void) => void;
}) {
  const predator = PREDATOR_BY_ID.get(data.info.predator);
  if (!predator) return null;

  const grants: PredatorGrant[] = parsePredatorMerit(predator.merit || "");
  const discDef = predator.discipline ? DISCIPLINE_BY_ID.get(predator.discipline) : undefined;
  const discOwned = discDef ? data.disciplines.find((x) => x.key === discDef.id) : undefined;
  const discGranted = discOwned && discOwned.value >= 1;

  const isGranted = (g: PredatorGrant) =>
    data.advantages.some((a) => a.name === g.name && (a.note || "").includes(PREDATOR_GIFT_MARKER));

  const applyDiscipline = () => {
    if (!discDef) return;
    mutate((d) => {
      const ex = d.disciplines.find((x) => x.key === discDef.id);
      if (ex) ex.value = Math.max(1, ex.value);
      else d.disciplines.push({ key: discDef.id, name: discDef.name, value: 1, powers: {}, xp: 0 });
      pushXpLog(d, `${PREDATOR_GIFT_MARKER} «${predator.name}»: Дисциплина «${discDef.name}» 1 ур. — бесплатно (Книга правил, стр. 183–186)`);
    });
    toast(`Дар Крови принят: «${discDef.name}» 1 ур. — бесплатно`);
  };

  const applyGrant = (g: PredatorGrant) => {
    mutate((d) => {
      d.advantages.push({
        id: vtmUid(g.id ? `pred-${g.id}` : "pred-custom"),
        name: g.name,
        kind: g.kind,
        rating: g.rating,
        note: `${PREDATOR_GIFT_MARKER} «${predator.name}»${g.id ? "" : ` — ${g.raw}`}`,
        free: true,
      });
      pushXpLog(d, `${PREDATOR_GIFT_MARKER} «${predator.name}»: ${g.kind === "flaw" ? "недостаток" : "достоинство"} «${g.name}» ${g.rating} ур. — бесплатно`);
    });
    toast(`${g.kind === "flaw" ? "Расплата" : "Заслуга"} принята: «${g.name}» ${g.rating} ур. — бесплатно`);
  };

  return (
    <div className="vtm-predator-card" role="group" aria-label={`Стиль охоты: ${predator.name}`}>
      <div className="vtm-predator-head">
        <span className="vtm-predator-drop" aria-hidden>🩸</span>
        <span className="vtm-stamp vtm-stamp-gold">Стиль охоты: {predator.name}</span>
        <span className="vtm-predator-raw" title="Дары по Книге правил, стр. 183–186">дары — бесплатно</span>
      </div>
      <p className="text-xs leading-relaxed text-[#c4ac9d]">{predator.description}</p>

      {/* Дар Крови: +1 уровень Дисциплины */}
      {discDef && (
        <div className="vtm-predator-grant">
          <div className="flex flex-wrap items-center gap-2">
            <span className="vtm-predator-grant-tag">Дар Крови</span>
            <span className="vtm-label text-[0.78rem] text-[#d9c7b6]">Дисциплина «{discDef.name}» +1 уровень</span>
            {discGranted ? (
              <span className="vtm-predator-grant-done" title="Дар уже в крови">✓ в крови ({discOwned!.value} ур.)</span>
            ) : (
              <button
                className="vtm-btn vtm-btn-ghost vtm-predator-btn !py-1 !px-2.5 !text-[0.72rem]"
                onClick={applyDiscipline}
                title="Внести Дисциплину 1 ур. бесплатно (Книга правил, стр. 183–186)"
              >
                ✚ принять дар
              </button>
            )}
          </div>
          {discOwned && discOwned.powers && Object.keys(discOwned.powers).length === 0 && (
            <p className="vtm-hint !text-[0.71rem] mt-1">Не забудь выбрать силу 1-го уровня на вкладке «Дисциплины».</p>
          )}
        </div>
      )}

      {/* Заслуги и Расплаты: сопутствующие преимущества */}
      {grants.length > 0 && (
        <div className="vtm-predator-grant">
          <div className="flex flex-wrap items-center gap-2">
            <span className="vtm-predator-grant-tag">{grants.length > 1 ? "Сопутствующее" : grants[0].kind === "flaw" ? "Расплата" : "Заслуга"}</span>
            {grants.map((g) =>
              isGranted(g) ? (
                <span key={g.name} className="vtm-predator-grant-done" title="Уже на листе (Преимущества)">
                  ✓ {g.name} {g.rating}
                </span>
              ) : (
                <button
                  key={g.name}
                  className="vtm-btn vtm-btn-ghost vtm-predator-btn !py-1 !px-2.5 !text-[0.72rem]"
                  onClick={() => applyGrant(g)}
                  title={`Внести «${g.name}» ${g.rating} ур. бесплатно (${g.kind === "flaw" ? "недостаток" : "достоинство"})`}
                >
                  ✚ {g.name} {"●".repeat(g.rating)}
                </button>
              )
            )}
          </div>
          <p className="vtm-hint !text-[0.71rem] mt-1">
            {grants.length > 1 ? "Варианты из книги: бери то, что согласовано с Рассказчиком. " : ""}
            Записи попадают на вкладку «Преимущества» с пометкой «дар хищника» — бесплатно, без возврата очков при снятии.
          </p>
        </div>
      )}

      {/* Бонусные навыки — просто справка */}
      <p className="vtm-predator-skills">
        Бонусные навыки: {predator.skills.map((k) => SKILL_LIBRARY.find((sk) => sk.id === k)?.name || k).join(" · ")}
      </p>
      {predator.extra && <p className="vtm-hint !text-[0.72rem]">{predator.extra}</p>}
    </div>
  );
}

// ============================================================
// ЯРОСТЬ (FRENZY): быстрые проверки Воли против Зверя
// Книга правил, стр. 218–221: пул = Самообладание + Упорство,
// сложность задаёт Рассказчик (обычно 3–4). Провал = Зверь рулит;
// бестиальный провал = Френзия + пятно Человечности.
// ============================================================

const FRENZY_KINDS = [
  { id: "anger", label: "Ярость гнева", hint: "оскорбление, унижение, провокация — сложность обычно 3–4", diff: 3 },
  { id: "roetschreck", label: "Рётшрек", hint: "страх: огонь, солнце, Купание в Крови — сложность обычно 3–4", diff: 3 },
  { id: "hunger", label: "Ярость голода", hint: "Голод 5, провал при Голоде 4+, вид крови — самая опасная", diff: 4 },
] as const;

/** Общая проверка Ярости (раунд 46): один механизм для блока «Ярость»
 *  и для кнопки в карточке «Зверь у поводья». Пул = Самообладание +
 *  Упорство; бестиальный провал сам ставит пятно Человечности.
 *  Раунд 47: возвращает результат броска — карточка «Зверь у поводья»
 *  вписывает Принуждение в журнал сама, когда Зверь победил. */
function performFrenzyTest(
  data: VtmSheetData,
  mutate: (fn: (draft: VtmSheetData) => void) => void,
  kind: { label: string; diff: number },
  difficulty: number,
): VtmRollResult {
  const pool = data.attributes.com + data.attributes.res;
  const r = rollPool(pool, data.trackers.hunger, `Ярость: ${kind.label}`, difficulty);
  useVtmDice.getState().pushRoll(r);
  if (r.bestial) {
    mutate((d) => {
      d.trackers.stains = Math.min(10 - d.trackers.humanity, d.trackers.stains + 1);
    });
    toast.error(`Бестиальный провал — Зверь берёт горло: ${kind.label}! Пятно Человечности поставлено.`, {
      description: `Успехов: 0 · сложность ${difficulty}. Френзия: Зверь решает за тебя, пока кто-то не оттащит или не пройдёт время.`,
    });
  } else if (r.messy) {
    toast.warning(`Десятка на кости Голода — успех с осложнениями (${r.totalSuccesses} усп. против ${difficulty})`, {
      description: "Ты сдержался, но Зверь успел наследить: Рассказчик вправе добавить пятно, шум или Голод +1.",
    });
  } else if (r.totalSuccesses >= difficulty) {
    toast.success(`Зверь отступает: ${r.totalSuccesses} успехов против сложности ${difficulty}`, {
      description: `${kind.label} отбита. Воля держит нить.`,
    });
  } else if (r.totalSuccesses > 0) {
    toast.error(`Провал — Зверь рулит: ${r.totalSuccesses} усп. против сложности ${difficulty}`, {
      description: `${kind.label} захватывает тебя. Френзия длится, пока Рассказчик не скажет «достаточно».`,
    });
  } else {
    toast.error(`Провал без надежды: 0 успехов, но кости Голода не выпали`, {
      description: `${kind.label} захватывает тебя — обычная Френзия, без бестиальных последствий.`,
    });
  }
  return r;
}

/** Вердикт Ярости одной строкой — для журнала ночей (раунд 47). */
function frenzyVerdictLine(r: VtmRollResult, difficulty: number): string {
  if (r.bestial)
    return `бестиальный провал (0 усп. против ${difficulty}) — Френзия и пятно Человечности`;
  if (r.messy)
    return `успех с осложнениями (${r.totalSuccesses} усп. против ${difficulty})`;
  if (r.totalSuccesses >= difficulty)
    return `успех (${r.totalSuccesses} против ${difficulty}) — Зверь отступил`;
  return `провал (${r.totalSuccesses} усп. против ${difficulty}) — Френзия`;
}

function FrenzyBlock({
  data,
  mutate,
}: {
  data: VtmSheetData;
  mutate: (fn: (draft: VtmSheetData) => void) => void;
}) {
  const [difficulty, setDifficulty] = useState(3);
  const pool = data.attributes.com + data.attributes.res;

  const doFrenzy = (kind: (typeof FRENZY_KINDS)[number]) =>
    performFrenzyTest(data, mutate, kind, difficulty);

  return (
    <div className="vtm-frenzy">
      <div className="flex flex-wrap items-center gap-2">
        <span className="vtm-frenzy-title">⚔ Ярость</span>
        <span className="vtm-hint !text-[0.72rem]">пул Воли: Самообладание {data.attributes.com} + Упорство {data.attributes.res} = <b className="not-italic text-[#d9c7b6]">{pool}</b></span>
        <span className="vtm-frenzy-diff" role="group" aria-label="Сложность проверки Ярости">
          сложность:
          {[2, 3, 4, 5].map((d) => (
            <button
              key={d}
              className={`vtm-frenzy-diff-btn ${difficulty === d ? "on" : ""}`}
              onClick={() => setDifficulty(d)}
              aria-pressed={difficulty === d}
            >
              {d}
            </button>
          ))}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {FRENZY_KINDS.map((k) => (
          <button
            key={k.id}
            className="vtm-btn vtm-btn-test !py-1 !px-2.5 !text-[0.72rem]"
            onClick={() => doFrenzy(k)}
            title={`${k.hint}. Провал — Френзия; бестиальный провал — пятно Человечности.`}
          >
            ⚄ {k.label}
          </button>
        ))}
      </div>
      <p className="vtm-hint !text-[0.72rem]">
        Провал — Френзия (Зверь рулит). Бестиальный провал — пятно Человечности автоматически. Во Френзии нельзя тратить Волю на переброс.
      </p>
    </div>
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
  onPrintDossier,
}: {
  data: VtmSheetData;
  mutate: (fn: (draft: VtmSheetData) => void) => void;
  derived: DerivedStats;
  onPrintDossier?: () => void;
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

  // Утоление Голода с учётом резонанса ночи (раунд 42): кровь глубокой
  // добычи (интенсивность 4–5) пьянит — одно утоление снимает 2 Голода.
  const resInt = data.resonance?.intensity || 0;
  const deepSlake = resInt >= 4 && data.trackers.hunger > 0;
  const doSlake = () => {
    const amt = deepSlake ? 2 : 1;
    mutate((d) => {
      d.trackers.hunger = Math.max(0, d.trackers.hunger - amt);
    });
    if (amt === 2) {
      toast.success("Кровь глубокой добычи пьянит", { description: "Резонанс 4–5: одно утоление снимает 2 Голода." });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* ===== Личность ===== */}
      <section className="vtm-panel lg:col-span-2" aria-label="Личность Сородича">
        <div className="vtm-panel-head">
          <span className="vtm-label text-[0.81rem] text-[#d6a840]">Личность</span>
          {onPrintDossier && (
            <button
              onClick={onPrintDossier}
              className="vtm-btn vtm-btn-ghost vtm-dossier-print !py-1 !px-2 !text-[0.7rem] ml-auto"
              title="Досье для стола — пергаментная печатная карточка Рассказчика через общий печатный стан (выбери «Сохранить как PDF»)"
              aria-label="Печать досье для стола"
            >
              🖨<span className="hidden min-[480px]:inline"> Досье для стола</span>
            </button>
          )}
        </div>
        <div className="p-4 md:p-5 space-y-5">
          {/* Портрет + паспорт Сородича */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="shrink-0 w-28 h-36 rounded-md overflow-hidden border border-[#3d1a20] bg-black relative group vtm-portrait-frame">
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
            <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2.5">
              <DossierField
                label="Концепция" icon="🎭"
                value={info.concept}
                onChange={(v) => mutate((d) => { d.info.concept = v; })}
                placeholder="бывший хирург, ныне доктор без диплома"
              />
              <DossierField
                label="Хроника" icon="📜"
                value={info.chronicle}
                onChange={(v) => mutate((d) => { d.info.chronicle = v; })}
                placeholder="Ночь над Невой"
              />
              <DossierField
                label="Сир" icon="🩸"
                hint="кто даровал Становление"
                value={info.sire}
                onChange={(v) => mutate((d) => { d.info.sire = v; })}
                placeholder="имя и мотив Сира"
              />
              <DossierField
                label="Род деятельности" icon="💼"
                hint="жизнь тогда и сейчас"
                value={info.occupation}
                onChange={(v) => mutate((d) => { d.info.occupation = v; })}
                placeholder="профессия смертной жизни / нынешнее занятие"
              />
            </div>
          </div>

          {/* Кровь и принадлежность */}
          <div className="vtm-dossier-sub">
            <span className="vtm-dossier-sub-title">⛧ Кровь и принадлежность</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2.5">
              <label className="vtm-dossier-field block">
                <span className="vtm-dossier-label"><i className="vtm-dossier-label-icon" aria-hidden>🩸</i>Клан<em className="vtm-dossier-label-hint">кровная линия</em></span>
                <select
                  className="vtm-input"
                  value={info.clan}
                  onChange={(e) => mutate((d) => { d.info.clan = e.target.value; })}
                >
                  <option value="">— не выбран —</option>
                  {CLANS.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.nick})</option>
                  ))}
                </select>
              </label>
              <label className="vtm-dossier-field block">
                <span className="vtm-dossier-label"><i className="vtm-dossier-label-icon" aria-hidden>🏛</i>Принадлежность<em className="vtm-dossier-label-hint">секта</em></span>
                <select
                  className="vtm-input"
                  value={info.sect}
                  onChange={(e) => mutate((d) => { d.info.sect = e.target.value; })}
                >
                  {SECTS.map((sect) => (
                    <option key={sect.id} value={sect.id}>{sect.name}</option>
                  ))}
                </select>
              </label>
              <label className="vtm-dossier-field block">
                <span className="vtm-dossier-label"><i className="vtm-dossier-label-icon" aria-hidden>🕰</i>Поколение<em className="vtm-dossier-label-hint">{bpHint(info.generation)}</em></span>
                <select
                  className="vtm-input"
                  value={info.generation || ""}
                  onChange={(e) => mutate((d) => { d.info.generation = parseInt(e.target.value, 10) || 0; })}
                >
                  <option value="">— не выбрано —</option>
                  {GENERATIONS.map((g) => (
                    <option key={g.value} value={g.value}>{g.label} {g.note ? `— ${g.note}` : ""}</option>
                  ))}
                </select>
              </label>
              <label className="vtm-dossier-field block">
                <span className="vtm-dossier-label"><i className="vtm-dossier-label-icon" aria-hidden>🌙</i>Стиль охоты<em className="vtm-dossier-label-hint">как ты питаешься</em></span>
                <select
                  className="vtm-input"
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
            <PredatorGiftsCard data={data} mutate={mutate} />
          )}

          {/* Дух хроники: Цель и Желание */}
          <div className="vtm-dossier-sub">
            <span className="vtm-dossier-sub-title">🕯 Дух хроники</span>
            <div className="space-y-2.5">
              <DossierField
                label="Цель" icon="🎯"
                hint="к чему идёт вся хроника"
                accent
                value={info.ambition}
                onChange={(v) => mutate((d) => { d.info.ambition = v; })}
                placeholder="великая цель, ради которой стоит вечность"
              />
              <DossierField
                label="Желание" icon="✨"
                hint="цель этой арки"
                accent
                value={info.desire}
                onChange={(v) => mutate((d) => { d.info.desire = v; })}
                placeholder="ближний шаг к великой цели"
              />
            </div>
          </div>

          {/* Устав и Опоры */}
          <div className="vtm-dossier-sub">
            <span className="vtm-dossier-sub-title">⚖ Устав и опоры</span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-3 gap-y-2.5">
              {(["principle1", "principle2", "principle3"] as const).map((key, i) => (
                <DossierField
                  key={key}
                  label={`Принцип ${i + 1}`} icon="⚖"
                  hint={i === 0 ? "никогда не…" : i === 1 ? "всегда…" : "не предаю…"}
                  value={info[key]}
                  onChange={(v) => mutate((d) => { d.info[key] = v; })}
                  placeholder={i === 0 ? "«никогда не пью до последней капли»" : i === 1 ? "«всегда прикрываю котерию»" : "«не предаю тех, кто мне верен»"}
                />
              ))}
              {(["anchor1", "anchor2", "anchor3"] as const).map((key, i) => (
                <DossierField
                  key={key}
                  label={`Опора ${i + 1}`} icon="⚓"
                  hint="кто держит Человечность"
                  value={info[key]}
                  onChange={(v) => mutate((d) => { d.info[key] = v; })}
                  placeholder="имя и что вы друг другу значите"
                />
              ))}
            </div>
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
                    ⚄ испытание Крови
                  </button>
                  <button
                    className={`vtm-btn vtm-btn-ghost !py-0.5 !px-2 !text-[0.75rem] vtm-slake-btn ${deepSlake ? "is-deep" : ""}`}
                    onClick={doSlake}
                    disabled={data.trackers.hunger === 0}
                    aria-label={deepSlake ? "Утолить Голод на 2 — глубокий резонанс" : "Утолить Голод на 1"}
                    title={
                      deepSlake
                        ? `Глубокий резонанс (${resInt}): кровь пьянит — утоление снимает 2 Голода`
                        : "Утолить Голод на 1 (охота у воды, глоток из фляги…)"
                    }
                  >
                    {deepSlake ? "✦ 2" : "−"}
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
              <CompulsionWarning data={data} mutate={mutate} />
              <BeastForeboding data={data} mutate={mutate} />
              <p className="vtm-hint mt-1.5 !text-[0.75rem]">
                {data.trackers.hunger >= 5
                  ? "Голод 5: все кости пула красны. Зверь у руля — Compulsion в каждой сцене."
                  : data.trackers.hunger >= 4
                    ? "Голод высок: последние кости пула — кости Голода."
                    : `${data.trackers.hunger} из последних костей каждого пула — кости Голода.`}
                {deepSlake && <span className="vtm-slake-note"> Кровь глубокой добычи (резонанс {resInt}) пьянит: утоление снимает <b>2</b> Голода.</span>}
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

            {/* Ярость: проверки Воли против Зверя */}
            <FrenzyBlock data={data} mutate={mutate} />

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
                        const prev = data.trackers.humanity;
                        mutate((d) => {
                          d.trackers.humanity = n === d.trackers.humanity ? n - 1 : n;
                          if (d.trackers.stains > 10 - d.trackers.humanity) d.trackers.stains = 10 - d.trackers.humanity;
                          // авто-списание: подъём Человечности стоит 2 × новый уровень (возврат при снижении)
                          if (d.trackers.humanity > prev) spendEconomy(d, XP_COSTS.humanity(d.trackers.humanity), `«Человечность» ↑ до ${d.trackers.humanity} (цена ${XP_COSTS.humanity(d.trackers.humanity)})`);
                          else if (d.trackers.humanity < prev) refundEconomy(d, XP_COSTS.humanity(prev) - XP_COSTS.humanity(d.trackers.humanity), `«Человечность» ↓ до ${d.trackers.humanity}`);
                        });
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

            {/* Сила Крови: по поколению + подъём сверх (опыт/Диаблери/торпор) */}
            <BloodPotencyBlock data={data} mutate={mutate} derived={derived} />

            <div className="vtm-divider text-[0.73rem]"><span>☾</span></div>

            {/* Резонанс крови */}
            <ResonanceBlock data={data} mutate={mutate} />

            <div className="vtm-divider text-[0.73rem]"><span>🦇</span></div>

            {/* Диаблери и след в ауре */}
            <DiablerieBlock data={data} mutate={mutate} derived={derived} />

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
  const [openAttr, setOpenAttr] = useState<Partial<Record<keyof VtmAttributes, boolean>>>({});
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
          <b className="not-italic text-[#d9c7b6]">Клик по строке</b> — расширенная механика характеристики (пара, применение).
          <b className="not-italic text-[#d9c7b6]"> Точки</b> — уровень: покупка 5×новый уровень списывается из Кошелька Крови.
          <b className="not-italic text-[#d9c7b6]"> ⚄</b> — испытание: бросок пула с парным навыком.
        </p>
        <span
          className={`vtm-label text-xs ${delta === 0 ? "text-[#9fd8b3]" : delta > 0 ? "text-[#e8636b]" : "text-[#d6a840]"}`}
          title={delta === 0 ? "Стартовый бюджет распределён точно — дальше только за опыт" : delta > 0 ? "Перебор стартового бюджета — оплатится из Кошелька Крови" : "Остались нераспределённые стартовые очки"}
        >
          {delta === 0 ? "стартовый бюджет сходится ✓" : delta > 0 ? `сверх бюджета: +${delta} (за опыт)` : `осталось ${-delta}`}
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
                const open = !!openAttr[attr.key];
                return (
                  <div key={attr.key}>
                    <div
                      className={`vtm-skill-row ${open ? "open" : ""} cursor-pointer`}
                      role="button"
                      tabIndex={0}
                      aria-expanded={open}
                      onClick={() => setOpenAttr((m) => ({ ...m, [attr.key]: !m[attr.key] }))}
                      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setOpenAttr((m) => ({ ...m, [attr.key]: !m[attr.key] })))}
                      title="Клик — описание · точки — уровень · ⚄ — испытание"
                    >
                      <div className="min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="text-sm text-[#d9c7b6] font-medium">{attr.name}</span>
                          {skill && skill.value > 0 && (
                            <span className="vtm-pool-chip" title={`Пул испытания: ${attr.name} ${value} + ${skill.name} ${skill.value} = ${pool} костей`}>
                              ⚄ {pool}
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
                      <div
                        className="flex items-center gap-1.5 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                        role="group"
                        aria-label={`${attr.name}: прокачка и испытание`}
                      >
                        <Dots
                          value={value}
                          ariaLabel={`${attr.name}: уровень ${value}`}
                          onChange={(n) => mutate((d) => {
                            const prev = d.attributes[attr.key];
                            d.attributes[attr.key] = n;
                            // авто-списание: сначала стартовый лимит создания, затем опыт (без лимитов — есть только цена)
                            if (n > prev) spendEconomy(d, XP_COSTS.attribute(n), `«${attr.name}» ↑ до ${n} (цена ${XP_COSTS.attribute(n)})`);
                            else if (n < prev) refundEconomy(d, XP_COSTS.attribute(prev) - XP_COSTS.attribute(n), `«${attr.name}» ↓ до ${n}`);
                          })}
                          onRoll={() => {}}
                        />
                        <button
                          type="button"
                          className="vtm-btn vtm-btn-test !py-1 !px-1.5 !text-[0.83rem] shrink-0"
                          onClick={() => onRoll(pool, `${attr.name}${skill ? ` + ${skill.name}` : " (голая)"}`)}
                          aria-label={`Испытание: ${attr.name} (${pool} костей)`}
                          title={`⚄ Испытание — бросить пул ${pool} костей${skill ? ` (${attr.name} + ${skill.name})` : " (голая характеристика)"}`}
                        >
                          ⚄
                        </button>
                      </div>
                    </div>
                    {open && (
                      <div className="vtm-skill-desc" role="note" aria-label={`Механика характеристики ${attr.name}`}>
                        <p className="vtm-skill-desc-text">
                          {attr.hint}. Испытание бросает пул: {attr.name} {value} {skill ? `+ ${skill.name} ${skill.value}` : "(без навыка — «голая»)"} = {pool} костей.
                          Последние кости пула — кости Голода: они краснеют, а 10 на них — грязный крит, 1 — зверский провал.
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {skill && <span className="vtm-pair-chip">пара: {attr.name} + {skill.name}</span>}
                          {value < 5 && <span className="vtm-xp-chip" title="Цена следующего уровня — списывается из Кошелька Крови">↑ {XP_COSTS.attribute(value + 1)} пт</span>}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <p className="vtm-hint text-center">
        Чип «⚄ N» — пул испытания. Стартовый бюджет — ориентир создания; сверх бюджета покупки идут за опыт из Кошелька Крови.
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
  const [openSpecs, setOpenSpecs] = useState<Record<string, boolean>>({});
  const [openDesc, setOpenDesc] = useState<Record<string, boolean>>({});
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
        // авто-списание из Кошелька Крови: стартовый лимит → опыт (без лимитов — есть только цена)
        if (patch.value !== undefined && patch.value > existing.value) {
          spendEconomy(d, XP_COSTS.skill(patch.value), `«${name}» ↑ до ${patch.value} (цена ${XP_COSTS.skill(patch.value)})`);
        } else if (patch.value !== undefined && patch.value < existing.value) {
          refundEconomy(d, XP_COSTS.skill(existing.value) - XP_COSTS.skill(patch.value), `«${name}» ↓ до ${patch.value}`);
        }
        if (patch.spec !== undefined && !existing.spec && patch.spec.trim()) {
          spendEconomy(d, XP_COSTS.specialization, `специализация «${patch.spec.trim()}» (${name}) (цена ${XP_COSTS.specialization})`);
        }
        if (patch.spec !== undefined && existing.spec && !patch.spec.trim()) {
          refundEconomy(d, XP_COSTS.specialization, `специализация «${existing.spec}» (${name}) снята`);
        }
        Object.assign(existing, patch);
      } else {
        d.skills.push({ key, name, value: 0, spec: "", xp: 0, ...patch });
        if (patch.value && patch.value > 0) {
          spendEconomy(d, XP_COSTS.skill(patch.value), `«${name}» ↑ до ${patch.value} (цена ${XP_COSTS.skill(patch.value)})`);
        }
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
          <b className="not-italic text-[#d9c7b6]">Клик по строке</b> — расширенная механика навыка (пара, противник, спец-эффекты).
          <b className="not-italic text-[#d9c7b6]"> Точки ●●○</b> — уровень (покупка списывает цену автоматически).
          <b className="not-italic text-[#d9c7b6]"> ⚄ Испытание</b> — бросок пула: характеристика по умолчанию + навык, кости Голода краснеют.
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
                const open = !!openDesc[def.id];
                return (
                  <div key={def.id}>
                    <div
                      className={`vtm-skill-row ${open ? "open" : ""} cursor-pointer`}
                      role="button"
                      tabIndex={0}
                      aria-expanded={open}
                      onClick={() => setOpenDesc((m) => ({ ...m, [def.id]: !m[def.id] }))}
                      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setOpenDesc((m) => ({ ...m, [def.id]: !m[def.id] })))}
                      title="Клик — описание и механика · точки — уровень · ⚄ — испытание"
                    >
                      <div className="min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className={`text-[0.92rem] leading-snug ${value > 0 ? "text-[#d9c7b6]" : "text-[#c4ac9d]"}`}>{def.name}</span>
                          <span
                            className="vtm-pair-chip"
                            title={`Пара по умолчанию: ${ATTR_RU[attrKey]}. Испытание — бросок ${ATTR_ABBR[attrKey]} + навык`}
                          >
                            +{ATTR_ABBR[attrKey]}
                          </span>
                          {value > 0 && (
                            <span className="vtm-pool-chip" title={`Пул испытания: ${ATTR_RU[attrKey]} ${data.attributes[attrKey]} + ${def.name} ${value} = ${pool} костей`}>
                              ⚄ {pool}
                            </span>
                          )}
                        </div>
                        {state?.spec && <p className="vtm-hint !text-[0.75rem] italic">«{state.spec}»</p>}
                      </div>
                      <div
                        className="flex items-center gap-1.5 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                        role="group"
                        aria-label={`${def.name}: прокачка и испытание`}
                      >
                        <Dots
                          value={value}
                          color="gold"
                          ariaLabel={`${def.name}: уровень ${value}`}
                          onChange={(n) => setSkill(def.id, def.name, { value: n })}
                          onRoll={() => {}}
                        />
                        <button
                          type="button"
                          className="vtm-btn vtm-btn-test !py-1 !px-1.5 !text-[0.83rem] shrink-0"
                          onClick={() => rollSkill(def.id, def.name)}
                          aria-label={`Испытание: ${def.name} (${pool} костей)`}
                          title={`⚄ Испытание — бросить пул ${pool} костей (${ATTR_ABBR[attrKey]} ${data.attributes[attrKey]} + ${def.name} ${value})`}
                        >
                          ⚄
                        </button>
                      </div>
                    </div>
                    {/* Расширенное описание: открывается кликом по строке */}
                    {open && (
                      <div className="vtm-skill-desc" role="note" aria-label={`Механика навыка ${def.name}`}>
                        <p className="vtm-skill-desc-text">{SKILL_DEXTRA[def.id] || def.hint}</p>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          <span className="vtm-pair-chip" title="Пара по умолчанию для испытания">пара: {ATTR_RU[attrKey]} + {def.name}</span>
                          <span className="vtm-pool-chip" title="Специализации из книги">спец: {def.specExamples.slice(0, 3).join(" · ")}</span>
                          {value < 5 && (
                            <span className="vtm-xp-chip" title="Цена следующего уровня — списывается из Кошелька Крови автоматически">
                              ↑ {XP_COSTS.skill(value + 1)} пт
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    {value > 0 && (
                      <div className="px-2 pb-1.5">
                        {openSpecs[def.id] ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              className="vtm-input !py-1 !text-[0.83rem] border-dashed flex-1 min-w-0"
                              value={state?.spec || ""}
                              autoFocus
                              onChange={(e) => setSkill(def.id, def.name, { spec: e.target.value.slice(0, 40) })}
                              onKeyDown={(e) => {
                                if (e.key === "Escape" || e.key === "Enter") {
                                  e.preventDefault();
                                  setOpenSpecs((m) => ({ ...m, [def.id]: false }));
                                }
                              }}
                              placeholder={`специализация: ${def.specExamples.slice(0, 2).join(", ")}…`}
                              aria-label={`Специализация навыка ${def.name}`}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <button
                              type="button"
                              className="vtm-btn vtm-btn-ghost !py-1 !px-1.5 !text-[0.72rem] shrink-0"
                              onClick={() => setOpenSpecs((m) => ({ ...m, [def.id]: false }))}
                              aria-label="Свернуть поле специализации"
                              title="Свернуть поле специализации"
                            >
                              ▴
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="vtm-btn vtm-btn-ghost !py-0.5 !px-1.5 !text-[0.71rem]"
                            onClick={(e) => { e.stopPropagation(); setOpenSpecs((m) => ({ ...m, [def.id]: true })); }}
                            aria-expanded={false}
                            aria-label={`Раскрыть специализацию: ${def.name}`}
                            title={state?.spec ? `Специализация: «${state.spec}» — нажми, чтобы изменить` : "Раскрыть поле специализации"}
                          >
                            {state?.spec ? "✎ спец" : "◈ спец"}
                          </button>
                        )}
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
                <Dots value={s.value} color="gold" ariaLabel={`${s.name}: уровень`} onChange={(n) => mutate((d) => { const cs = d.skills.filter((x) => x.key === null); if (n > cs[i].value) spendEconomy(d, XP_COSTS.skill(n), `«${cs[i].name}» ↑ до ${n} (цена ${XP_COSTS.skill(n)})`); else if (n < cs[i].value) refundEconomy(d, XP_COSTS.skill(cs[i].value) - XP_COSTS.skill(n), `«${cs[i].name}» ↓ до ${n}`); cs[i].value = n; })} onRoll={() => {}} />
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
// «ЗВЕРЬ У ПОВОДЬЯ» (раунд 43): при Голоде 5 Зверь неотступен —
// панель-тревога с Принуждением клана (Книга правил, стр. 258).
// Принуждение берётся из clanCompulsionFor() в lib/vtm-chronicle.
// Раунд 46: карточка получила руки — ⚄ проверка Ярости голода
// (общий performFrenzyTest, сложность 4) и ✎ запись Принуждения
// в журнал ночей, чтобы след Зверя остался в Кровавой нити.
// ============================================================

function CompulsionWarning({
  data,
  mutate,
}: {
  data: VtmSheetData;
  mutate: (fn: (draft: VtmSheetData) => void) => void;
}) {
  const [jotted, setJotted] = useState(false);
  // Раунд 47: авто-запись — когда Зверь победил (провал/бестиальный),
  // Принуждение вписывается в журнал само, без второго клика.
  const [autoNote, setAutoNote] = useState(false);
  if (data.trackers.hunger !== 5) return null;
  const comp = clanCompulsionFor(data.info.clan);
  const pool = data.attributes.com + data.attributes.res;
  const hungerKind = FRENZY_KINDS.find((k) => k.id === "hunger")!;

  const writeEntry = (verdict?: string) => {
    const nid = `comp-${Date.now().toString(36)}`;
    mutate((d) => {
      d.notes.entries = [
        {
          id: nid,
          title: "Принуждение",
          date: new Date().toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" }),
          content: `Зверь у поводья (Голод 5): Принуждение клана «${comp.name}» — ${comp.effect} Длительность: ${comp.duration}.${verdict ? ` ⚄ Ярость голода: ${verdict}.` : ""}`,
        },
        ...d.notes.entries,
      ].slice(0, 40);
    });
    setJotted(true);
  };

  const doFrenzy = () => {
    const r = performFrenzyTest(data, mutate, hungerKind, 4);
    const failed = !r.messy && r.totalSuccesses < 4; // провал и бестиальный провал
    if (failed && !jotted) {
      writeEntry(frenzyVerdictLine(r, 4));
      setAutoNote(true);
      toast.info("Принуждение вписано само", {
        description: `Провал — след Зверя ушёл в Кровавую нить: «${comp.name}» на сцену.`,
      });
    }
  };

  const jot = () => {
    writeEntry();
    toast.success("Принуждение в журнале", { description: `«${comp.name}» вписано в Кровавую нить — Рассказчик увидит след Зверя.` });
  };

  return (
    <div className="vtm-compulsion-card" role="alert">
      <span className="vtm-compulsion-title" aria-hidden>☠ Зверь у поводья</span>
      <span className="vtm-compulsion-sub">Ярость голода неизбежна — Голод достиг предела</span>
      <p className="vtm-compulsion-effect">
        <b>{comp.name}.</b> {comp.effect}
      </p>
      <div className="vtm-compulsion-meta">
        <span className="vtm-compulsion-dur">⏳ {comp.duration}</span>
        <span className="vtm-compulsion-src">{comp.source}</span>
      </div>
      <div className="vtm-compulsion-act">
        <button
          className="vtm-compulsion-roll"
          onClick={doFrenzy}
          title={`Проверка Ярости голода: пул Воли ${pool} (Самообладание + Упорство), сложность 4. Провал — Френзия, бестиальный провал — пятно Человечности.`}
          aria-label="Бросить проверку Ярости голода"
        >
          ⚄ проверка Ярости голода · сл. 4
        </button>
        <button
          className={`vtm-compulsion-jot ${jotted ? (autoNote ? "is-done is-auto" : "is-done") : ""}`}
          onClick={jot}
          disabled={jotted}
          title={autoNote ? "Провал записан в журнал автоматически — Зверь оставил след сам" : "Вписать Принуждение в журнал ночей — след Зверя останется в Кровавой нити"}
          aria-label="Записать Принуждение в журнал ночей"
        >
          {jotted ? (autoNote ? "✓ вписано само" : "✓ в журнале") : "✎ в журнал ночей"}
        </button>
        <span className="vtm-compulsion-poolhint">
          пул: Самообладание {data.attributes.com} + Упорство {data.attributes.res} = <b>{pool}</b>
        </span>
      </div>
      {autoNote && (
        <p className="vtm-compulsion-autonote" role="status">
          провал — Зверь сам оставил след в Кровавой нити; последующие провалы этой сцены просто рулят
        </p>
      )}
      <p className="vtm-compulsion-note">
        Критический провал с костью Голода — Зверь диктует поведение (Книга правил, стр. 258).
      </p>
    </div>
  );
}

// ============================================================
// «ПРЕДВЕСТИЕ ЗВЕРЯ» (раунд 44): при Голоде 4 Зверь уже точит когти —
// янтарная карточка-предостережение за ступень до «Зверя у поводья».
// Раунд 45: кнопка «🌙 новая охота» прямо в карточке — утоли Голод,
// пока кровь ещё держит, не тянись к шапке панели.
// ============================================================

function BeastForeboding({
  data,
  mutate,
}: {
  data: VtmSheetData;
  mutate: (fn: (draft: VtmSheetData) => void) => void;
}) {
  // мини-подтверждение: охота заживляет раны и меняет резонанс — случайный клик недопустим
  const [confirming, setConfirming] = useState(false);
  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(false), 8000);
    return () => clearTimeout(t);
  }, [confirming]);

  if (data.trackers.hunger !== 4) return null;
  const comp = clanCompulsionFor(data.info.clan);
  const doHunt = () => {
    performHunt(data, mutate);
    setConfirming(false);
  };
  return (
    <div className="vtm-forewarn-card" role="status">
      <span className="vtm-forewarn-title" aria-hidden>⚡ Предвестие Зверя</span>
      <span className="vtm-forewarn-sub">Голод на исходной черте — осталась одна ступень до повода</span>
      <p className="vtm-forewarn-effect">
        Последние <b>4 кости</b> каждого пула — кости Голода: любой провал при них грозит стать <b>Бестиальным</b>. Ещё один голодный удар — и Принуждение «<b>{comp.name}</b>» станет приговором на целую сцену.
      </p>
      <div className="vtm-forewarn-meta">
        <span className="vtm-forewarn-next">↓ ещё +1 Голод → ☠ Зверь у поводья</span>
        <span className="vtm-forewarn-tip">утоли Голод, пока кровь ещё держит</span>
      </div>
      <div className="vtm-forewarn-act">
        {confirming ? (
          <>
            <button className="vtm-forewarn-hunt is-confirm" onClick={doHunt} aria-label="Подтвердить новую охоту из предвестия">
              ✦ утолить сейчас
            </button>
            <button className="vtm-forewarn-hunt-cancel" onClick={() => setConfirming(false)} aria-label="Отменить охоту">✕</button>
            <span className="vtm-forewarn-act-note">Голод обнулится, поверхностное заживёт</span>
          </>
        ) : (
          <button
            className="vtm-forewarn-hunt"
            onClick={() => setConfirming(true)}
            title="Начать новую охоту прямо из предвестия: Голод утолится, поверхностные раны и стресс заживут, тяжёлое останется."
            aria-label="Начать новую охоту из предвестия"
          >
            🌙 новая охота
          </button>
        )}
      </div>
      <p className="vtm-forewarn-note">Ярость голода на грани: при Голоде 5 её сложность — 4 (Книга правил, стр. 218).</p>
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

/** Общая механика «новой охоты» (раунд 45): извлечена из NewHuntButton, чтобы
 *  карточка «Предвестие Зверя» могла утолить Голод прямо из себя. Возвращает
 *  true, если ночь оказалась «глубокой кровью» (резонанс 5). */
function performHunt(
  data: VtmSheetData,
  mutate: (fn: (draft: VtmSheetData) => void) => void,
): boolean {
  const summary = newHuntSummary(data);
  // Резонанс ночи: какой привкус эмоций несёт кровь сегодняшней добычи.
  // Обычная охота даёт слабые резонансы (1–2), удачная — насыщенные (3), редкая ночь — глубокие (4–5).
  const res = RESONANCES[Math.floor(Math.random() * RESONANCES.length)];
  const roll = Math.random();
  const intensity = roll < 0.42 ? 1 : roll < 0.74 ? 2 : roll < 0.92 ? 3 : roll < 0.98 ? 4 : 5;
  // «Глубокая кровь» (раунд 43): интенсивность 5 — редкий исход (2%). Механика ×2
  // уже живёт в утолении (resInt >= 4); здесь — только отличительные приметы ночи.
  const deepBlood = intensity === 5;
  mutate((d) => {
    d.trackers.hunger = 0;
    d.trackers.healthSup = 0;
    d.trackers.wpSup = 0;
    d.trackers.huntCount = (d.trackers.huntCount || 0) + 1;
    const now = new Date();
    const date = now.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
    d.trackers.lastHunt = date;
    d.resonance = { kind: res.id, intensity };
    const resText = `${res.name} (${intensity} — ${RESONANCE_INTENSITY_LABELS[intensity] || "—"})`;
    d.notes.entries = [
      {
        id: `hunt-${now.getTime().toString(36)}`,
        title: "Новая охота",
        date,
        content: `${deepBlood ? "Эта ночь — из редких: кровь добычи животно чиста. ": ""}Солнце село — Сородич проснулся. ${summary}. Резонанс добычи: ${resText}. Тяжёлые раны и пятна Человечности не тронуты: ночь не стирает всё.`,
      },
      ...d.notes.entries,
    ].slice(0, 40);
  });
  if (deepBlood) {
    toast.success("Животная, чистая кровь", {
      description: "Редкая ночь: резонанс 5 — одно утоление снимает 2 Голода, и кровь вдвойне ценна для Кровавого чародейства.",
      duration: 9000,
    });
  } else {
    toast.success("Новая охота началась", {
      description: `Голод утолён, поверхностное зажило. Кровь этой ночи — ${res.name.toLowerCase()} (${intensity}). Запись в журнале ночи.`,
    });
  }
  return deepBlood;
}

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
    // 8 c: подсказка подтверждения живёт дольше, чтобы её успели прочитать и с телефона
    const t = setTimeout(() => setConfirming(false), 8000);
    return () => clearTimeout(t);
  }, [confirming]);

  const dirty =
    data.trackers.hunger > 0 || data.trackers.healthSup > 0 || data.trackers.wpSup > 0;

  const doReset = () => {
    performHunt(data, mutate);
    setConfirming(false);
  };

  return (
    <span className="ml-auto flex items-center gap-1.5">
      {confirming ? (
        <>
          {/* Подтверждение: короткая подсказка видна и на телефоне, полная — на широких экранах */}
          <span className="vtm-hint !text-[0.72rem] sm:hidden text-[#d9c7b6]">Голод обнулится</span>
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
// СИЛА КРОВИ: база по поколению, подъём сверх — опыт/Диаблери/торпор
// (Книга правил, стр. 217: цена подъёма — 10 × новый уровень опыта)
// ============================================================

function BloodPotencyBlock({
  data,
  mutate,
  derived,
}: {
  data: VtmSheetData;
  mutate: (fn: (draft: VtmSheetData) => void) => void;
  derived: DerivedStats;
}) {
  const bp = derived.bp;
  const genBp = bloodPotencyByGeneration(data.info.generation || 13);
  const raised = bp > genBp;
  // цена следующей ступени: каждая ступень стоит 10 × её уровень, ступень = дельта
  const nextCost = XP_COSTS.bloodPotency(bp + 1) - XP_COSTS.bloodPotency(bp);

  // Клик по точке выше текущей — подъём за опыт (только сверх поколения).
  const raise = (n: number) => {
    if (n <= bp || n > 5) return;
    const cost = XP_COSTS.bloodPotency(n) - XP_COSTS.bloodPotency(bp);
    mutate((d) => {
      d.trackers.bpOverride = n;
      spendEconomy(d, cost, `«Сила Крови» ↑ ${bp} → ${n} (цена ${cost}, подъём сверх поколения)`);
    });
    toast.success(`Сила Крови ${n}`, { description: `Кровь густеет. Цена: ${cost} (${plural(cost, "очко", "очка", "очков")} из Кошелька). Эффекты таблицы уже применяются к листу.` });
  };

  // Клик по точке ниже текущей (но выше поколенческой) — снижение: торпор/решение Рассказчика, возврат дельты.
  const lower = (n: number) => {
    if (n < genBp || n >= bp) return;
    const refund = XP_COSTS.bloodPotency(bp) - XP_COSTS.bloodPotency(n);
    mutate((d) => {
      d.trackers.bpOverride = n > genBp ? n : 0;
      if (refund > 0) refundEconomy(d, refund, `«Сила Крови» ↓ ${bp} → ${n} (торпор/решение Рассказчика)`);
    });
    toast.info(`Сила Крови ${n}`, { description: "Кровь жидеет — торпор или решение Рассказчика. Возврат в Кошелёк оформлен." });
  };

  return (
    <div className="vtm-bp-block">
      <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
        <span className="vtm-label text-[0.77rem] text-[#d9c7b6]">Сила Крови</span>
        <span className="flex items-center gap-1.5">
          {raised && <span className="vtm-bp-above">↑ сверх поколения</span>}
          <span className="vtm-label text-[0.83rem] text-[#a877c0]">{bp}</span>
        </span>
      </div>
      <div className="vtm-bp-dots" role="group" aria-label="Сила Крови">
        {[1, 2, 3, 4, 5].map((n) => {
          const base = n <= genBp; // поколенческий фундамент — не продаётся
          const filled = n <= bp;
          const canRaise = !base && n === bp + 1 && n <= 5;
          // снижение: и на базу поколения тоже (если СК поднята — возврат в кровь предков разрешён)
          const canLower = n === bp - 1 && n >= genBp;
          const clickable = canRaise || canLower;
          return (
            <button
              key={n}
              type="button"
              className={`vtm-dot vtm-bp-dot violet ${filled ? "filled" : ""} ${base ? "is-base" : ""}`}
              disabled={!clickable}
              aria-label={`Сила Крови ${n}${base ? " (по поколению)" : canRaise ? ` — поднять за ${XP_COSTS.bloodPotency(n) - XP_COSTS.bloodPotency(bp)} опыта` : canLower ? " — снизить (торпор)" : ""}`}
              title={
                base
                  ? n === bp - 1 && bp > genBp
                    ? `Снизить до ${n} (торпор/рассказчик)`
                    : `По поколению (${data.info.generation || 13}-е)`
                  : canRaise
                    ? `Поднять до ${n} — ${XP_COSTS.bloodPotency(n) - XP_COSTS.bloodPotency(bp)} опыта`
                    : canLower
                      ? `Снизить до ${n} (торпор/рассказчик)`
                      : `Текущая Сила Крови ${n}`
              }
              onClick={() => (n > bp ? raise(n) : lower(n))}
            />
          );
        })}
        {bp < 5 && (
          <span className="vtm-bp-cost">
            ↑ {bp + 1} — {nextCost} опыта
          </span>
        )}
      </div>
      <p className="vtm-hint mt-1.5 !text-[0.75rem]">
        По поколению ({genBp}): бонус +{derived.bpRow.bonusDice} к физике и Дисциплинам · заживление: {derived.bpRow.mend} · изъян: тяжесть {derived.bpRow.baneSeverity}
        {derived.bpRow.feedingPenalty !== "—" ? ` · кормление: ${derived.bpRow.feedingPenalty}` : ""}
        {raised ? " · подъём выше крови предков — редкая награда Диаблери или долгая ночь опыта." : " Подъём сверх поколения — каждая ступень стоит 10 × её уровень опыта либо милость Диаблери (по решению Рассказчика)."}
      </p>
    </div>
  );
}

// ============================================================
// ДИАБЛЕРИ: церемонии, счётчик выпитых душ и след в ауре
// ============================================================

function DiablerieBlock({
  data,
  mutate,
  derived,
}: {
  data: VtmSheetData;
  mutate: (fn: (draft: VtmSheetData) => void) => void;
  derived: DerivedStats;
}) {
  const [ceremony, setCeremony] = useState(false);
  const [victim, setVictim] = useState("");
  const [victimGen, setVictimGen] = useState(0);
  // последняя проверка Воли в открытой форме: показывает вердикт и влияет на пятна
  const [lastCheck, setLastCheck] = useState<{ successes: number; diff: number; bestial: boolean; messy: boolean; failed: boolean } | null>(null);
  const count = data.diablerie?.count || 0;
  const notes = data.diablerie?.notes || "";
  const entries = data.diablerie?.entries || [];
  const ownBp = bloodPotencyByGeneration(data.info.generation || 13);
  // сложность проверки Воли по поколению жертвы (раунд 42)
  const checkDiff = diablerieDifficulty(victimGen);

  // Проверка Воли против Зверя: пул = текущая Воля (Самообладание + Упорство),
  // кости Голода — по текущему Голоду. Результат уходит в панель костей листа.
  const rollWill = () => {
    const result = rollPool(derived.wpMax, data.trackers.hunger, `Диаблери: воля против Зверя (сложность ${checkDiff})`, checkDiff);
    useVtmDice.getState().pushRoll(result);
    const failed = !result.bestial && result.successes < checkDiff;
    setLastCheck({
      successes: result.successes,
      diff: checkDiff,
      bestial: result.bestial,
      messy: result.messy,
      failed,
    });
    if (result.bestial) {
      toast.error("Бестиальный провал", { description: "Зверь пил вместе с тобой. Церемония будет стоить третье пятно." });
    } else if (failed) {
      toast.warning("Воля дрогнула", { description: `Успехов ${result.successes} из ${checkDiff}. Жертва билась — пятое пятно лишнее не будет. Третье пятно за провал.` });
    } else if (result.messy) {
      toast.warning("Беспредельный успех", { description: "Кровь бьёт в голову: церемония удалась, но безупречной её не назовут." });
    } else {
      toast.success("Сердце остановлено железной волей", { description: `Успехов ${result.successes} при сложности ${checkDiff}. Зверь отступил.` });
    }
  };

  // Подтверждение церемонии: душа выпита. Два пятна Человечности — автоматически,
  // три — если Воля дрогнула (провал или бестиальный провал проверки).
  const commit = (bpGift: boolean) => {
    const name = victim.trim() || "безымянный Сородич";
    const chk = lastCheck;
    const stainCount = chk?.failed || chk?.bestial ? 3 : 2;
    mutate((d) => {
      d.diablerie = d.diablerie || { count: 0, notes: "", entries: [] };
      const entry: VtmDiablerieEntry = {
        id: vtmUid("diab"),
        victim: name,
        gen: victimGen,
        ts: new Date().toISOString(),
        bpGift,
        extraStain: stainCount > 2,
        check: chk ? { successes: chk.successes, diff: chk.diff, bestial: chk.bestial, messy: chk.messy } : undefined,
      };
      d.diablerie.count = (d.diablerie.count || 0) + 1;
      d.diablerie.entries = [entry, ...(d.diablerie.entries || [])].slice(0, 30);
      // Диаблери — стигма Зверя: два пятна (три при проваленной Воле).
      const free = Math.max(0, 10 - d.trackers.humanity - d.trackers.stains);
      d.trackers.stains = Math.min(d.trackers.stains + stainCount, 10 - d.trackers.humanity);
      const checkText = chk
        ? chk.bestial
          ? " бестиальный провал — Зверь пил вместе с тобой"
          : chk.failed
            ? ` воля дрогнула (${chk.successes}/${chk.diff}) — третье пятно`
            : chk.messy
              ? " беспредельный успех — кровь бьёт в голову"
              : ` проверка Воли пройдена (${chk.successes}/${chk.diff})`
        : "";
      if (free < stainCount) pushXpLog(d, `Диаблери: душа «${name}» — пятна не поместились (Человечность ${d.trackers.humanity})`);
      else pushXpLog(d, `Диаблери: душа «${name}»${victimGen ? ` (${victimGen}-е поколение)` : ""} — ${plural(stainCount, "пятно", "пятна", "пятен")} Человечности.${checkText}`);
      if (bpGift) {
        const newBp = Math.min(5, Math.max(ownBp, d.trackers.bpOverride || 0) + 1);
        d.trackers.bpOverride = newBp;
        pushXpLog(d, `Диаблери: душа сильнее твоей — Сила Крови поднята до ${newBp} (дар, без опыта)`);
      }
      d.notes.entries = [
        {
          id: `diab-${Date.now().toString(36)}`,
          title: "Диаблери",
          date: new Date().toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" }),
          content: `Выпита душа: ${name}${victimGen ? `, ${victimGen}-е поколение` : ""}.${bpGift ? " Душа была сильнее — Сила Крови выросла на 1." : ""}${chk ? (chk.bestial ? " Проверка Воли: бестиальный провал — Зверь участвовал в пире." : chk.failed ? " Проверка Воли провалена — жертва билась, третье пятно." : chk.messy ? " Проверка Воли: беспредельный успех — кровь до сих пор стучит в висках." : " Проверка Воли пройдена: сердце остановлено железной волей.") : ""} В ауре — новые чёрные прожилки.`,
        },
        ...d.notes.entries,
      ].slice(0, 40);
    });
    setCeremony(false);
    setVictim("");
    setVictimGen(0);
    setLastCheck(null);
    toast.error("Церемония завершена", { description: `Душа «${name}» выпита. ${plural(stainCount, "Пятно", "Пятна", "Пятен")} Человечности поставлено. Ясновидение выдаст след на десятилетия.` });
  };

  // Отмена последней церемонии (если записали зря): убираем запись и одно Диаблери,
  // плюс снятие всех пятен, что она ставила (2 или 3 при проваленной Воле).
  const undoLast = () => {
    const last = entries[0];
    mutate((d) => {
      d.diablerie = d.diablerie || { count: 0, notes: "", entries: [] };
      d.diablerie.count = Math.max(0, (d.diablerie.count || 0) - 1);
      const removed = (d.diablerie.entries || []).shift();
      d.diablerie.entries = d.diablerie.entries || [];
      // снимаем пятна (2 + 1 за провал, если отмечено) и дар, если они ещё на листе
      const stainsToRemove = 2 + (removed?.extraStain ? 1 : 0);
      d.trackers.stains = Math.max(0, d.trackers.stains - stainsToRemove);
      if (removed?.bpGift && d.trackers.bpOverride) {
        d.trackers.bpOverride = Math.max(0, d.trackers.bpOverride - 1);
        pushXpLog(d, `отмена Диаблери («${removed.victim}»): дар Силы Крови снят`);
      } else {
        pushXpLog(d, `отмена Диаблери («${removed?.victim || "?"}») — запись стёрта`);
      }
    });
    toast.info("Церемония отменена", { description: last ? `Запись о душе «${last.victim}» стёрта, пятна сняты.` : "Запись стёрта." });
  };

  return (
    <div className="vtm-diab-block">
      <div className="flex items-center justify-between mb-1.5 gap-2 flex-wrap">
        <span className="vtm-label text-[0.77rem] text-[#d9c7b6]">Диаблери</span>
        <div className="flex items-center gap-1">
          {count > 0 && (
            <button
              className="vtm-btn vtm-btn-ghost !py-0.5 !px-2 !text-[0.75rem]"
              onClick={undoLast}
              aria-label="Отменить последнюю церемонию"
              title="Отменить последнюю запись (если записали зря): снимает и пятна"
            >
              ↺
            </button>
          )}
          <span className={`vtm-label text-[0.9rem] w-5 text-center ${count > 0 ? "text-[#e8636b]" : "text-[#9c8072]"}`}>{count}</span>
          <button
            className="vtm-btn vtm-btn-danger !py-0.5 !px-2 !text-[0.75rem]"
            onClick={() => setCeremony((v) => !v)}
            aria-expanded={ceremony}
            aria-label={ceremony ? "Закрыть форму церемонии" : "Совершить Диаблери"}
            title="Выпил душу — запиши. Это не забывается."
          >
            {ceremony ? "×" : "+"}
          </button>
        </div>
      </div>

      {/* Форма церемонии */}
      {ceremony && (
        <div className="vtm-diab-form" role="form" aria-label="Церемония Диаблери">
          <p className="vtm-diab-form-title">⚓ Церемония: сердце останавливается навсегда</p>
          <input
            className="vtm-input !py-1 !text-[0.84rem]"
            value={victim}
            onChange={(e) => setVictim(e.target.value.slice(0, 80))}
            placeholder="имя жертвы — Кровь запомнит"
            aria-label="Имя жертвы Диаблери"
            maxLength={80}
          />
          <div className="flex items-center gap-1 flex-wrap mt-1.5" role="group" aria-label="Поколение жертвы">
            <span className="vtm-hint !text-[0.72rem] mr-0.5">поколение жертвы:</span>
            {[0, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5].map((g) => (
              <button
                key={g}
                type="button"
                className={`vtm-diab-gen ${victimGen === g ? "active" : ""}`}
                onClick={() => { setVictimGen(g); setLastCheck(null); }}
                aria-pressed={victimGen === g}
                title={g === 0 ? "неизвестно" : `${g}-е поколение · сложность проверки ${diablerieDifficulty(g)}`}
              >
                {g === 0 ? "?" : g}
              </button>
            ))}
          </div>

          {/* Проверка Воли против Зверя (упрощённая механика, раунд 42):
              пул = текущая Воля, сложность — по поколению жертвы.
              Провал/бестиальный провал = третье пятно Человечности. */}
          <div className="vtm-diab-check" role="group" aria-label="Проверка Воли">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="vtm-diab-check-title">⚄ Воля против Зверя</span>
              <span className="vtm-diab-check-diff" title="Чем старше кровь жертвы, тем яростнее её Зверь">
                сложность {checkDiff}{victimGen > 0 ? ` · ${victimGen}-е пок.` : " · поколение ?"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap mt-1">
              <button type="button" className="vtm-diab-check-roll" onClick={rollWill} aria-label="Бросить проверку Воли">
                ⚄ {plural(derived.wpMax, "кость", "кости", "костей")} · бросить
              </button>
              {lastCheck && (
                <button
                  type="button"
                  className="vtm-btn vtm-btn-ghost !py-0.5 !px-1.5 !text-[0.72rem]"
                  onClick={() => setLastCheck(null)}
                  aria-label="Сбросить результат проверки"
                >
                  ↺
                </button>
              )}
            </div>
            {lastCheck && (
              <p className={`vtm-diab-check-verdict ${lastCheck.bestial ? "bestial" : lastCheck.failed ? "fail" : lastCheck.messy ? "messy" : "ok"}`} role="status">
                {lastCheck.bestial
                  ? "🐾 БЕСТИАЛЬНЫЙ ПРОВАЛ — Зверь пил вместе с тобой · 3 пятна"
                  : lastCheck.failed
                    ? `✖ ВОЛЯ ДРОГНУЛА — успехов ${lastCheck.successes} из ${lastCheck.diff} · 3 пятна`
                    : lastCheck.messy
                      ? `🩸 БЕСПРЕДЕЛЬНЫЙ УСПЕХ — ${lastCheck.successes} успехов, кость Голода кританула · 2 пятна, вкус крови в висках`
                      : `✔ УСПЕХ — успехов ${lastCheck.successes} при сложности ${lastCheck.diff} · 2 пятна`}
              </p>
            )}
            <p className="vtm-hint !text-[0.72rem] mt-1">
              Пул: текущая Воля ({derived.wpMax}){data.trackers.hunger > 0 ? `, ${plural(data.trackers.hunger, "кость", "кости", "костей")} Голода` : ""}. Провал или бестиальный провал — третье пятно: жертва билась, Зверь допил последним.
            </p>
          </div>

          {victimGen > 0 && victimGen < (data.info.generation || 13) && (
            <button
              type="button"
              className="vtm-diab-gift"
              onClick={() => commit(true)}
              title="Душа старшего Сородича крепче: Рассказчик может даровать +1 Силы Крови вместо опыта"
            >
              🩸 выпить душу и принять дар Силы Крови (+1, милость Рассказчика)
            </button>
          )}
          <button
            type="button"
            className="vtm-diab-commit"
            onClick={() => commit(false)}
          >
            ⚓ записать церемонию — {lastCheck?.failed || lastCheck?.bestial ? 3 : 2} пятна Человечности
          </button>
        </div>
      )}

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

      {/* Журнал церемоний */}
      {entries.length > 0 && (
        <ul className="vtm-diab-entries" aria-label="Журнал церемоний Диаблери">
          {entries.slice(0, 5).map((e) => (
            <li key={e.id} className="vtm-diab-entry">
              <span className="vtm-diab-entry-name" title={e.victim}>
                {e.victim}
                {e.gen > 0 ? <span className="vtm-diab-entry-gen"> · {e.gen}-е</span> : null}
                {e.bpGift ? <span className="vtm-diab-entry-gift" title="за это Диаблери дарована Сила Крови">↑СК</span> : null}
                {e.extraStain ? <span className="vtm-diab-entry-extra" title="воля дрогнула: третье пятно за проваленную проверку">+пятно</span> : null}
                {e.check ? (
                  <span className={`vtm-diab-entry-check ${e.check.bestial ? "bestial" : e.check.successes < e.check.diff ? "fail" : e.check.messy ? "messy" : "ok"}`} title={`Проверка Воли: ${e.check.successes} успехов при сложности ${e.check.diff}`}>
                    {e.check.successes}/{e.check.diff}
                  </span>
                ) : null}
              </span>
              <span className="vtm-diab-entry-date">
                {e.ts ? new Date(e.ts).toLocaleDateString("ru-RU", { day: "2-digit", month: "short" }) : "—"}
              </span>
            </li>
          ))}
          {entries.length > 5 && <li className="vtm-diab-entry vtm-diab-entry-more">…и ещё {plural(entries.length - 5, "церемония", "церемонии", "церемоний")} в тени</li>}
        </ul>
      )}

      <input
        className="vtm-input !py-1 !text-[0.84rem] mt-1.5 border-dashed"
        value={notes}
        onChange={(e) => mutate((d) => { d.diablerie = d.diablerie || { count: 0, notes: "", entries: [] }; d.diablerie.notes = e.target.value.slice(0, 300); })}
        placeholder="кто, когда и почему — след в ауре дополняет предысторию"
        aria-label="Заметки о Диаблери"
        maxLength={300}
      />
      <p className="vtm-hint !text-[0.75rem] mt-1">
        Механика: каждое Диаблери — 2 пятна Человечности (3 — если Воля дрогнула в проверке против Зверя), след в ауре и шанс на милость Крови (душа старшего — +1 Силы Крови по решению Рассказчика). Полные правила — «База знаний → Механики → Диаблери».
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
      <div className="flex items-center justify-between mb-1.5 gap-2">
        <span className="vtm-label text-[0.77rem] text-[#d9c7b6]">
          Резонанс крови
          {/* «Глубокая кровь» (раунд 43): интенсивность 5 — редкая ночь, кровь вдвойне ценна */}
          {def && intensity === 5 && (
            <span className="vtm-res-deep-badge" title="Редкая ночь: утоление снимает 2 Голода">
              ✦ глубокая кровь
            </span>
          )}
        </span>
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
          ? intensity >= 4
            ? `${def.name}: ${def.emotion}. Резонанс глубокий (${intensity}) — утоление снимает 2 Голода, и такая кровь вдвойне ценна для Кровавого чародейства.`
            : `${def.name}: ${def.emotion}. Глубокие резонансы (4–5) утоляют Голод надёжнее и ценятся Кровавым чародейством.`
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
  // журнал опыта общий: pushXpLog из vtm-data (без дублей подряд)
  const logXp = pushXpLog;
  const pool = data.trackers.creationPool ?? 0;
  const spent = data.trackers.creationSpent ?? 0;
  const left = Math.max(0, pool - spent);
  const pct = pool > 0 ? Math.min(100, Math.round((spent / pool) * 100)) : 0;
  const debt = Math.min(0, data.trackers.xp);

  const gain = (n: number) =>
    mutate((d) => {
      d.trackers.xp += n;
      logXp(d, `+${n} опыт — свободно ${d.trackers.xp}`);
    });

  const refund = (n: number) =>
    mutate((d) => {
      d.trackers.xp = Math.max(0, d.trackers.xp - n);
      logXp(d, `−${n} свободного опыта (возврат/ошибка) — свободно ${d.trackers.xp}`);
    });

  const tunePool = (n: number) =>
    mutate((d) => {
      d.trackers.creationPool = Math.max(0, (d.trackers.creationPool ?? 0) + n);
      logXp(d, `стартовый лимит ${n > 0 ? "+" : ""}${n} → ${d.trackers.creationPool} пт (решение Рассказчика)`);
    });

  return (
    <div className="vtm-economy">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
        <span className="vtm-label text-[0.77rem] text-[#d9c7b6]">Кошелёк Крови</span>
        <span className="vtm-hint !text-[0.71rem]">лимит создания → потом опыт · без лимитов, только цена</span>
      </div>

      {/* Стартовый лимит: прогресс-полоса + счёт */}
      <div className="vtm-economy-pool" role="status" aria-label={`Стартовый лимит создания: осталось ${left} из ${pool}`}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="vtm-label text-[0.72rem] text-[#d6a840]">Стартовый лимит</span>
          <b className="vtm-economy-pool-num">
            <span className={left === 0 ? "text-[#e8636b]" : "text-[#d6a840]"}>{left}</span>
            <span className="text-[#9c8072]"> / {pool} пт</span>
          </b>
        </div>
        <div className="vtm-economy-bar" aria-hidden>
          <span style={{ width: `${pct}%` }} />
        </div>
        <div className="flex items-center gap-1 mt-1.5 flex-wrap">
          <XpBtn onClick={() => tunePool(-25)} title="Расширить/сузить стартовый лимит (решение Рассказчика)">−25</XpBtn>
          <XpBtn onClick={() => tunePool(25)} title="Расширить стартовый лимит (решение Рассказчика)">+25</XpBtn>
          {spent > 0 && (
            <XpBtn
              onClick={() => mutate((d) => { d.trackers.creationSpent = 0; logXp(d, `стартовый лимит восстановлен: потраченное сброшено (${spent} пт вернулись в лимит)`); })}
              title="Сбросить потраченное (новая хроника / по решению Рассказчика)"
            >
              ↺ сброс
            </XpBtn>
          )}
          <span className="vtm-hint !text-[0.68rem]">потрачено {spent} пт</span>
        </div>
      </div>

      {/* Свободный опыт */}
      <div className="flex items-center justify-between mt-2.5 flex-wrap gap-1">
        <span className="vtm-label text-[0.72rem]">Свободный опыт</span>
        <b className={`vtm-label text-[0.95rem] ${data.trackers.xp < 0 ? "text-[#e8636b]" : "text-[#d6a840]"}`}>{data.trackers.xp}</b>
      </div>
      <div className="flex flex-wrap items-center gap-1 mt-1">
        <XpBtn onClick={() => gain(1)} title="Получен 1 опыт">+1</XpBtn>
        <XpBtn onClick={() => gain(3)} title="Получено 3 опыта">+3</XpBtn>
        <XpBtn onClick={() => gain(5)} title="Получено 5 опыта">+5</XpBtn>
        <XpBtn onClick={() => gain(10)} title="Получено 10 опыта">+10</XpBtn>
        <span className="text-[#3d1a20] select-none" aria-hidden>|</span>
        <XpBtn onClick={() => refund(1)} title="Откатить 1 свободного" disabled={data.trackers.xp < 1}>↺1</XpBtn>
        <XpBtn onClick={() => refund(5)} title="Откатить 5 свободного" disabled={data.trackers.xp < 5}>↺5</XpBtn>
        <XpBtn
          onClick={() => mutate((d) => { logXp(d, `долг погашен: ${-d.trackers.xp} опыта от Рассказчика`); d.trackers.xp = 0; })}
          disabled={debt === 0}
          title="Рассказчик простил долг — обнулить"
        >
          ✝ долг
        </XpBtn>
        {data.trackers.xpSpent > 0 && <span className="vtm-hint !text-[0.68rem]">вложено за хронику: {data.trackers.xpSpent}</span>}
      </div>
      {debt < 0 && (
        <p className="vtm-economy-debt" role="status">
          Долг перед Рассказчиком: <b>{Math.abs(debt)}</b> опыта — Кровь помнит каждую копейку.
        </p>
      )}
      {data.xpLog.length > 0 && (
        <div className="mt-2 max-h-28 overflow-y-auto vtm-scroll pr-1" aria-label="Журнал опыта">
          {data.xpLog.slice(0, 10).map((e) => (
            <p key={e.id} className="vtm-roll-row !text-[0.73rem]">
              {new Date(e.ts).toLocaleString("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })} · {e.text}
            </p>
          ))}
        </div>
      )}
      <p className="vtm-hint mt-1.5 !text-[0.73rem]">
        Цены: хар-ка 5×ур · навык 3×ур · спец. 3 · факт биографии 3 пт/точка · Дисциплина 6×ур · сила 3×ур · Человечность 2×ур · достоинство 3×ур · Сила Крови сверх поколения 10×ур.
        Все покупки списываются автоматически: сначала стартовый лимит ({DEFAULT_CREATION_POOL}+ пт, расширяется Рассказчиком), затем опыт — и без лимитов: хочешь десять Дисциплин — плати.
      </p>
    </div>
  );
}
