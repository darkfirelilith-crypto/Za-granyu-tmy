"use client";

import { useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { VtmReturnPortal } from "@/components/vtm/portal-transition";
import { VtmEditor } from "@/components/vtm/vtm-editor";
import { MAX_SHEETS, CLAN_BY_ID, SECT_BY_ID, PREDATOR_BY_ID, RESONANCES, VtmSheetData, normalizeSheet } from "@/lib/vtm-data";
import { deriveStats } from "@/lib/vtm-calc";
import { VTM_TEMPLATES } from "@/lib/vtm-templates";
import { vtmFetch } from "@/lib/vtm-api";

interface SheetMeta {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  portraitThumb?: string | null;
  clan?: string | null;
  predator?: string | null;
  generation?: number | null;
  resonanceKind?: string | null;
  resonanceIntensity?: number | null;
  xp?: number | null;
  nights?: number | null;
  lastHunt?: string | null;
  feed?: { title: string; date: string }[] | null;
}

/** Русское склонение: 1 ночь / 2 ночи / 5 ночей. */
function nightsLabel(n: number): string {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} ночь`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} ночи`;
  return `${n} ночей`;
}

export function VtmApp() {
  const { status } = useSession();
  const [openId, setOpenId] = useState<string | null>(null);

  if (status === "loading") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4">
        <svg viewBox="0 0 60 60" className="w-24 vtm-breath" aria-hidden="true">
          <path d="M30 4 C38 18 44 26 46 38 C47.5 45 42 52 38 52 C34 52 29 46 30 38 C31 26 29 16 30 4 Z" fill="none" stroke="#8a1a1d" strokeWidth="1.6" opacity="0.8" />
        </svg>
        <p className="vtm-label text-sm tracking-[0.4em] uppercase text-[#9c8072] vtm-flicker">
          Ночь раскрывает глаза…
        </p>
      </main>
    );
  }

  if (status === "unauthenticated") {
    return <VtmGate />;
  }

  return <VtmHome openId={openId} onOpen={(id) => setOpenId(id)} onClose={() => setOpenId(null)} />;
}

/** Врата запечатаны — доступ только для авторизованных в основном мире. */
function VtmGate() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-16 relative">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: "easeOut" }}
        className="vtm-panel max-w-lg w-full overflow-hidden"
      >
        <div className="relative h-56 md:h-64">
          <img
            src="/vtm/gate.jpg"
            alt="Готические врата особняка с алым светом за приоткрытой дверью"
            className="w-full h-full object-cover"
            style={{ filter: "brightness(0.82) saturate(0.9)" }}
          />
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(to top, var(--vtm-panel), transparent 65%)" }}
          />
          <span className="vtm-stamp absolute top-3 right-3">Только по приглашению</span>
        </div>
        <div className="p-6 md:p-8 text-center space-y-4">
          <h1 className="vtm-display text-2xl md:text-3xl text-[#d9c7b6]">
            Маскарад <span className="text-[#e8636b] vtm-flicker">запечатан</span>
          </h1>
          <p className="text-sm leading-relaxed text-[#c4ac9d]">
            Врата откроются лишь тем, чьё имя уже внесено в списки основного мира.
            Войди там — и чернильная печать спадёт.
          </p>
          <VtmReturnPortal className="vtm-btn vtm-btn-blood w-full justify-center py-3">
            Вернуться и войти в основной мир
          </VtmReturnPortal>
          <p className="vtm-hint">«Некоторые двери лучше не открывать. Остальные — просто ещё не ваши.»</p>
        </div>
      </motion.div>
    </main>
  );
}

/** Архив ночей: до 5 листов на игрока, ручной порядок (перетаскивание). */
function VtmHome({ openId, onOpen, onClose }: { openId: string | null; onOpen: (id: string) => void; onClose: () => void }) {
  const qc = useQueryClient();
  const [showHelp, setShowHelp] = useState(false);
  const { data: sheets, isLoading } = useQuery<SheetMeta[]>({
    queryKey: ["vtm-sheets"],
    queryFn: async () => {
      const res = await vtmFetch("/api/vtm/sheets");
      return res.json();
    },
  });

  const [showChooser, setShowChooser] = useState(false);
  const startCreation = () => setShowChooser(true);

  const createMutation = useMutation({
    mutationFn: ({ templateId, preset }: { templateId: string | null; preset?: unknown }) =>
      vtmFetch("/api/vtm/sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          templateId ? { template: templateId, ...(preset ? { preset } : {}) } : {}
        ),
      }).then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error || "Ошибка");
        return r.json();
      }),
    onSuccess: (sheet: SheetMeta) => {
      qc.invalidateQueries({ queryKey: ["vtm-sheets"] });
      toast.success("Ночь пробуждена", { description: `«${sheet.name}» открывает глаза.` });
      setShowChooser(false);
      onOpen(sheet.id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ===== Ручной порядок листов (drag-and-drop + кнопки ↑↓) =====
  const dragIdRef = useRef<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const reorderMutation = useMutation({
    mutationFn: (ids: string[]) =>
      vtmFetch("/api/vtm/sheets/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      }).then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error || "Ошибка");
        return r.json();
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vtm-sheets"] }),
    onError: (e: Error) => {
      toast.error("Порядок не сохранился", { description: e.message });
      qc.invalidateQueries({ queryKey: ["vtm-sheets"] });
    },
  });

  const move = (ids: string[], from: number, to: number): string[] => {
    const next = [...ids];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    return next;
  };

  const applyOrder = (ids: string[]) => {
    qc.setQueryData<SheetMeta[]>(["vtm-sheets"], (prev) => {
      if (!prev) return prev;
      const map = new Map(prev.map((s) => [s.id, s]));
      return ids.map((id) => map.get(id)).filter(Boolean) as SheetMeta[];
    });
    reorderMutation.mutate(ids);
  };

  const list = Array.isArray(sheets) ? sheets : [];
  const full = list.length >= MAX_SHEETS;
  const ids = list.map((s) => s.id);

  const handleDrop = (targetId: string) => {
    const from = ids.indexOf(dragIdRef.current || "");
    const to = ids.indexOf(targetId);
    setOverId(null);
    dragIdRef.current = null;
    if (from < 0 || to < 0 || from === to) return;
    applyOrder(move(ids, from, to));
  };

  if (openId) return <VtmEditor key={openId} sheetId={openId} onBack={onClose} />;

  return (
    <main className="relative z-10 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-10 md:py-14 space-y-8">
        {/* Шапка архива */}
        <motion.header
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-center space-y-3"
        >
          <p className="vtm-label text-[0.75rem] tracking-[0.45em] uppercase text-[#9c8072]">
            Архив Крови · Отдел незарегистрированных особ
          </p>
          <h1 className="vtm-display text-3xl md:text-5xl text-[#d9c7b6] tracking-[0.1em]">
            Вампиры: <span className="text-[#e8636b] vtm-flicker">Маскарад</span>
          </h1>
          <div className="flex items-center justify-center gap-3 vtm-divider max-w-xs mx-auto">
            <span className="vtm-blood-drop text-[#c22b30]">🩸</span>
          </div>
          <p className="text-sm italic text-[#c4ac9d] max-w-xl mx-auto">
            Листы персонажей по правилам 5-й редакции. Заполняй — Кровь запомнит каждое слово.
            В архиве помещается до {MAX_SHEETS} ночей.
          </p>
          <button
            onClick={() => setShowHelp((v) => !v)}
            aria-expanded={showHelp}
            aria-controls="vtm-help-panel"
            className="vtm-btn vtm-btn-ghost !py-1.5 !px-3 text-xs mx-auto"
          >
            {showHelp ? "▲ Скрыть наставления" : "◈ Как пробудить персонажа?"}
          </button>
          {showHelp && <VtmHelpPanel />}
        </motion.header>

        {/* Карточки листов */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="vtm-panel h-44 animate-pulse" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="vtm-panel p-10 text-center space-y-4 max-w-md mx-auto"
          >
            <svg viewBox="0 0 60 60" className="w-24 h-24 mx-auto opacity-70 vtm-breath" aria-hidden="true">
              <path d="M30 4 C38 18 44 26 46 38 C47.5 45 42 52 38 52 C34 52 29 46 30 38 C31 26 29 16 30 4 Z" fill="none" stroke="#8a1a1d" strokeWidth="1.6" />
              <circle cx="30" cy="40" r="3" fill="#8a1a1d" />
            </svg>
            <h2 className="vtm-display text-lg text-[#c4ac9d] tracking-[0.15em] uppercase">Архив пуст</h2>
            <p className="vtm-hint">
              Ни одной ночи не записано. Кровь терпелива — она подождёт, пока ты пробудишь первого Сородича.
            </p>
            <button
              onClick={startCreation}
              disabled={createMutation.isPending}
              className="vtm-btn vtm-btn-blood w-full justify-center py-3 mt-2"
            >
              {createMutation.isPending ? "Пробуждаем…" : "+ Пробудить первого Сородича"}
            </button>
            <p className="vtm-hint !text-[0.75rem]">
              Чистый лист или готовый вампир из архива — выбор за тобой.
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {list.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.07 }}
              >
                <SheetCard
                  sheet={s}
                  index={i + 1}
                  onOpen={() => onOpen(s.id)}
                  draggable
                  isOver={overId === s.id}
                  onDragStart={() => {
                    dragIdRef.current = s.id;
                  }}
                  onDragEnd={() => {
                    dragIdRef.current = null;
                    setOverId(null);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setOverId((prev) => (prev === s.id ? prev : s.id));
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleDrop(s.id);
                  }}
                  onMove={(dir) => {
                    const from = ids.indexOf(s.id);
                    const to = from + dir;
                    if (from < 0 || to < 0 || to >= ids.length) return;
                    applyOrder(move(ids, from, to));
                  }}
                />
              </motion.div>
            ))}
            {!full && (
              <motion.button
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: list.length * 0.07 }}
                onClick={startCreation}
                disabled={createMutation.isPending}
                className="vtm-card min-h-44 flex flex-col items-center justify-center gap-3"
                style={{ borderStyle: "dashed" }}
                aria-label="Пробудить нового Сородича"
              >
                <span className="vtm-display text-4xl text-[#8a1a1d] vtm-breath">+</span>
                <span className="vtm-label text-sm tracking-[0.2em] uppercase text-[#c4ac9d]">
                  {createMutation.isPending ? "Пробуждаем…" : "Новая ночь"}
                </span>
                <span className="vtm-hint text-center px-4">
                  Чистый лист или готовый вампир
                </span>
              </motion.button>
            )}
          </div>
        )}

        {full && (
          <p className="text-center vtm-hint">
            Архив полон: {list.length} из {MAX_SHEETS} ночей. Чтобы пробудить нового — предай земле одного из старых.
          </p>
        )}
        {list.length > 1 && !full && (
          <p className="text-center vtm-hint">
            Листы можно перетаскивать — порядок сохранится в архиве.
          </p>
        )}

        {showChooser && (
          <TemplateChooser
            onClose={() => setShowChooser(false)}
            onPick={(templateId, preset) => createMutation.mutate({ templateId, preset })}
            pending={createMutation.isPending}
          />
        )}

        <footer className="pt-6 text-center space-y-3">
          <VtmReturnPortal className="vtm-btn mx-auto">
            ← Вернуться в мир «За гранью тьмы»
          </VtmReturnPortal>
          <p className="vtm-label text-[0.72rem] tracking-[0.3em] uppercase text-[#4a3230]">
            Nobody expects the beast until it knocks
          </p>
        </footer>
      </div>
    </main>
  );
}

/** Краткие наставления — как собрать Сородича по правилам 5-й редакции. */
function VtmHelpPanel() {
  const steps: { n: string; title: string; text: string }[] = [
    {
      n: "I",
      title: "Пробудите Сородича",
      text: "Кнопка «Новая ночь» — до 5 листов на игрока. Готовые вампиры приходят с кланом, Дисциплинами и прошлым; всё потом можно переписать. Лист сохраняется сам после каждой правки.",
    },
    {
      n: "II",
      title: "Досье: клан, поколение, охота",
      text: "Выбери клан (он задаст Изъян и клановые Дисциплины), поколение (Сила Крови посчитается сама), секту, стиль охоты и род деятельности. Впиши Цель, Желание, принципы и опоры — это то, на чём держится Человечность.",
    },
    {
      n: "III",
      title: "Характеристики и навыки",
      text: "9 характеристик: одна на 4, три по 3, четыре по 2, одна на 1 (бюджет 22 следит сам). Навыки — по одному из трёх наборов правил («мастер на все руки» и др.). Клик по точке ставит её, клик по строке навыка = проверка: пул из характеристики + навыка, успех на 6+, десятки дают критические пары.",
    },
    {
      n: "IV",
      title: "Кровь: Голод и треки",
      text: "Здоровье = Выносливость + 3, Воля = Самообладание + Упорство — считаются сами. Голод (0–5) растёт от неудачных Испытаний Крови: кости Голода краснеют и могут испортить успех (Беспредельный) или провалить дело (Зверский провал).",
    },
    {
      n: "V",
      title: "Дисциплины и Преимущества",
      text: "Две клановые Дисциплины: одна на 2, другая на 1; у стиля охоты — своя. В «Преимуществах» — 7 пунктов фактов биографии и каталог достоинств/недостатков. «База знаний» хранит справочник по кланам, Дисциплинам и механикам.",
    },
  ];
  return (
    <motion.div
      id="vtm-help-panel"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="vtm-panel p-5 md:p-6 max-w-2xl mx-auto text-left space-y-3"
    >
      <h2 className="vtm-display text-sm tracking-[0.25em] uppercase text-[#c4ac9d] text-center">
        Наставления Крови
      </h2>
      <ol className="space-y-3">
        {steps.map((s) => (
          <li key={s.n} className="flex gap-3 items-start">
            <span
              className="vtm-display shrink-0 w-8 h-8 flex items-center justify-center rounded-full border text-[#a8863d] text-xs"
              style={{ borderColor: "#3d1a20", background: "rgba(0,0,0,0.3)" }}
              aria-hidden
            >
              {s.n}
            </span>
            <div>
              <p className="vtm-label text-xs tracking-[0.15em] uppercase text-[#d6a840]">{s.title}</p>
              <p className="text-xs leading-relaxed text-[#c4ac9d] mt-0.5">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="vtm-hint text-center pt-1">
        Проверки Человечности костями удачи не исправляются — таков закон Зверя.
      </p>
    </motion.div>
  );
}

/** Карточка листа (перетаскиваемая, с номером и кнопками порядка). */
function SheetCard({
  sheet,
  index,
  onOpen,
  draggable,
  isOver,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onMove,
}: {
  sheet: SheetMeta;
  index: number;
  onOpen: () => void;
  draggable?: boolean;
  isOver?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onMove?: (dir: -1 | 1) => void;
}) {
  const qc = useQueryClient();
  const del = useMutation({
    mutationFn: () => vtmFetch(`/api/vtm/sheets/${sheet.id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vtm-sheets"] });
      toast.success("Ночь предана земле", { description: `«${sheet.name}» покоится. Пока что.` });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const date = new Date(sheet.updatedAt).toLocaleString("ru-RU", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
  const openedDate = new Date(sheet.createdAt).toLocaleDateString("ru-RU", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
  const clanName = sheet.clan ? CLAN_BY_ID.get(sheet.clan)?.name : null;
  const predatorName = sheet.predator ? PREDATOR_BY_ID.get(sheet.predator)?.name : null;
  const resonance = sheet.resonanceKind ? RESONANCES.find((r) => r.id === sheet.resonanceKind) : null;
  const nights = sheet.nights || 0;
  const feed = (sheet.feed || []).slice(0, 3);
  // «Новая охота» в ленте выглядит как ритуал: особая стрелка
  const feedIcon = (t: string) => (t === "Новая охота" ? "🌙" : "🖋");

  return (
    <div
      className={`vtm-card group ${isOver ? "vtm-card-over" : ""}`}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", sheet.id);
        onDragStart?.();
      }}
      onDragEnd={() => onDragEnd?.()}
      onDragOver={(e) => onDragOver?.(e)}
      onDrop={(e) => onDrop?.(e)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpen()}
    >
      <div className="p-4 space-y-2.5">
        <div className="flex items-start gap-3">
          {/* Миниатюра портрета */}
          <div className="shrink-0 w-14 h-16 rounded border border-[#3d1a20] overflow-hidden bg-black flex items-center justify-center">
            {sheet.portraitThumb ? (
              <img src={sheet.portraitThumb} alt="" className="w-full h-full object-cover" style={{ filter: "saturate(0.85)" }} />
            ) : (
              <span className="text-xl text-[#3d1a20] select-none">🩸</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <span className="vtm-stamp">Ночь № {index}</span>
              <div className="flex items-center gap-1">
                {onMove && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); onMove(-1); }}
                      className="vtm-move-btn"
                      title="Поднять лист выше"
                      aria-label={`Поднять лист ${sheet.name} выше`}
                    >
                      ↑
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onMove(1); }}
                      className="vtm-move-btn"
                      title="Опустить лист ниже"
                      aria-label={`Опустить лист ${sheet.name} ниже`}
                    >
                      ↓
                    </button>
                  </>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); del.mutate(); }}
                  disabled={del.isPending}
                  className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity text-[#c22b30] hover:text-[#e8636b] text-xs vtm-label px-1.5 py-0.5 border border-transparent hover:border-[#8a1a1d] rounded"
                  title="Предать лист земле"
                  aria-label={`Удалить лист ${sheet.name}`}
                >
                  {del.isPending ? "…" : "✕ в землю"}
                </button>
              </div>
            </div>
            <h2 className="vtm-display text-lg text-[#d9c7b6] leading-snug line-clamp-2 mt-1.5">
              {sheet.name}
            </h2>
            {clanName && (
              <p className="vtm-label text-[0.73rem] text-[#a8863d] truncate mt-0.5" title={clanName}>
                ⛧ {clanName}
                {typeof sheet.generation === "number" && sheet.generation > 0 ? ` · ${sheet.generation}-е пок.` : ""}
                {predatorName ? ` · ${predatorName}` : ""}
              </p>
            )}
          </div>
        </div>
        {(resonance || nights > 0 || (sheet.xp || 0) > 0 || sheet.lastHunt) && (
          <div className="vtm-card-vitals" aria-label="Сводка ночи">
            {resonance && (
              <span
                className="vtm-cv-res"
                style={{
                  ["--res-c" as string]: resonance.color,
                  ["--res-glow" as string]: resonance.glow,
                }}
                title={`Резонанс крови: ${resonance.name} (${resonance.emotion})`}
              >
                <i className="vtm-cv-drop" aria-hidden="true" />
                {resonance.name}{sheet.resonanceIntensity ? ` ${sheet.resonanceIntensity}` : ""}
              </span>
            )}
            {nights > 0 && <span title="Прожито «новых охот»">🌙 {nightsLabel(nights)}</span>}
            {sheet.lastHunt && <span title="Последняя новая охота">Последняя: {sheet.lastHunt}</span>}
            {(sheet.xp || 0) > 0 && <span title="Свободный опыт">опыт {sheet.xp}</span>}
          </div>
        )}
        {feed.length > 0 && (
          <div className="vtm-card-feed" aria-label="Хроника ночей — последние записи журнала">
            <span className="vtm-cf-head" aria-hidden>
              ХРОНИКА НОЧЕЙ
              <i className="vtm-cf-thread" />
            </span>
            <ul>
              {feed.map((f, fi) => (
                <li key={`${fi}-${f.date}`} className="vtm-cf-item" title={f.title}>
                  <i className="vtm-cf-bullet" aria-hidden>
                    {feedIcon(f.title)}
                  </i>
                  <span className="vtm-cf-title">{f.title}</span>
                  {f.date && <span className="vtm-cf-date">{f.date}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex items-center justify-between vtm-label text-[0.73rem] text-[#9c8072]">
          <span>пробуждён {openedDate}</span>
          <span>изм. {date.slice(0, 6)}</span>
        </div>
        <p className="vtm-label text-[0.77rem] tracking-[0.25em] uppercase text-[#c22b30] opacity-0 group-hover:opacity-100 transition-opacity">
          Открыть лист →
        </p>
      </div>
    </div>
  );
}

/** Выбор заготовки при пробуждении: чистый лист, готовый вампир
 *  или решение Крови с предпросмотром («Пусть Кровь решит»). */
function TemplateChooser({
  onClose,
  onPick,
  pending,
}: {
  onClose: () => void;
  onPick: (templateId: string | null, preset?: unknown) => void;
  pending: boolean;
}) {
  const clanName = (id: string) => CLAN_BY_ID.get(id)?.name || "";
  // undefined — предпросмотр не запрашивался; null — Кровь решает; object — решение Крови
  const [fate, setFate] = useState<VtmSheetData | null | undefined>(undefined);
  const [fateError, setFateError] = useState<string | null>(null);

  const castFate = async () => {
    setFate(null);
    setFateError(null);
    try {
      const res = await vtmFetch("/api/vtm/random", { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error || "Кровь запнулась");
      const json = await res.json();
      setFate(normalizeSheet(json.data));
    } catch (e) {
      setFate(undefined);
      setFateError(e instanceof Error ? e.message : "Кровь запнулась");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-3 md:p-6 overflow-y-auto vtm-scroll"
      style={{ background: "rgba(0,0,0,0.85)" }}
      role="dialog"
      aria-modal="true"
      aria-label="Выбор заготовки Сородича"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="vtm-panel max-w-3xl w-full p-5 md:p-6 space-y-4 vtm-conflict-pop m-auto">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <span className="vtm-stamp">Выбор Сородича</span>
            <h2 className="vtm-display text-lg text-[#d9c7b6] mt-2 tracking-[0.1em]">
              Кого выпустить из могилы?
            </h2>
            <p className="vtm-hint mt-1">
              Готовые вампиры приходят с кланом, Дисциплинами, стилем охоты, портретом и прошлым.
              Всё потом можно переписать — это лишь первая ночь.
            </p>
          </div>
          <button onClick={onClose} className="vtm-btn vtm-btn-ghost !px-2.5 !py-1.5 shrink-0" aria-label="Закрыть выбор">
            ✕
          </button>
        </div>

        {fate === undefined && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Пусть Кровь решит — случайный Сородич с предпросмотром */}
            <button
              onClick={castFate}
              disabled={pending}
              className="vtm-template-card vtm-template-random sm:col-span-2 lg:col-span-3"
              aria-label="Случайный Сородич — пусть Кровь решит"
            >
              <span className="vtm-template-stamp vtm-stamp">Решает Кровь</span>
              <span className="vtm-random-dice" aria-hidden="true">
                <i className="die die-a">⚄</i>
                <i className="die die-b">⚅</i>
                <i className="drop">🩸</i>
              </span>
              <span className="vtm-template-title">Пусть Кровь решит</span>
              <span className="vtm-template-tagline">
                Кровь бросит кости за каждую характеристику, выберет клан, стиль охоты,
                вложит навыки, Дисциплины и прошлое. Ты увидишь её решение до записи в архив.
              </span>
            </button>

            {/* Чистый лист */}
            <button
              onClick={() => onPick(null)}
              disabled={pending}
              className="vtm-template-card"
              aria-label="Чистый лист Сородича"
            >
              <span className="vtm-stamp vtm-stamp-gold">Без прошлого</span>
              <svg viewBox="0 0 44 52" className="w-9 h-11 vtm-breath" aria-hidden="true">
                <path d="M8 4 H30 L36 10 V48 H8 Z" fill="rgba(0,0,0,0.35)" stroke="#8a1a1d" strokeWidth="1.4" strokeLinejoin="round" />
                <path d="M30 4 L30 10 L36 10" fill="none" stroke="#8a1a1d" strokeWidth="1.2" />
                <circle cx="22" cy="24" r="7" fill="none" stroke="#a8863d" strokeWidth="1.2" />
                <path d="M18 20 L20 26 M22 18 L23 26 M26 20 L24 26" stroke="#a8863d" strokeWidth="1.1" fill="none" />
                <line x1="12" y1="38" x2="32" y2="38" stroke="#3d1a20" strokeWidth="1.4" />
                <line x1="12" y1="43" x2="26" y2="43" stroke="#3d1a20" strokeWidth="1.4" />
              </svg>
              <span className="vtm-template-title">Чистый лист</span>
              <span className="vtm-template-tagline">Кровь ещё не выбрала имя. Всё с нуля — от клана до убежища.</span>
            </button>

            {VTM_TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => onPick(t.id)}
                disabled={pending}
                className="vtm-template-card"
                aria-label={`Готовый вампир: ${t.title}`}
              >
                <span className="vtm-stamp">{clanName(t.sheet.info.clan)}</span>
                <span className="vtm-tpl-face" aria-hidden>
                  <img src={t.portrait} alt="" loading="lazy" />
                </span>
                <span className="vtm-template-title">{t.title}</span>
                <span className="vtm-template-tagline">{t.tagline}</span>
                <span className="flex items-center justify-center gap-3 vtm-label text-[0.70rem] text-[#9c8072]">
                  <i>поколение {t.sheet.info.generation}</i>
                  <i>Сила Крови {t.sheet.info.generation >= 14 ? 0 : t.sheet.info.generation >= 12 ? 1 : 2}</i>
                  <i>Чел. {t.sheet.trackers.humanity}</i>
                </span>
                <span className="vtm-label text-[0.75rem] text-[#d6a840]">«{t.sheet.info.name}»</span>
              </button>
            ))}
          </div>
        )}

        {fate === null && (
          <div className="py-14 text-center space-y-4" role="status" aria-live="polite">
            <span className="vtm-random-dice" aria-hidden="true">
              <i className="die die-a">⚄</i>
              <i className="die die-b">⚅</i>
              <i className="drop">🩸</i>
            </span>
            <p className="vtm-display text-sm tracking-[0.35em] uppercase text-[#e8636b] vtm-flicker">
              Кровь решает…
            </p>
          </div>
        )}

        {fateError && (
          <p className="vtm-label text-xs text-[#e8636b] text-center" role="alert">{fateError}</p>
        )}

        {fate && (
          <FatePreview
            data={fate}
            pending={pending}
            onReroll={castFate}
            onAccept={() => onPick("random", fate)}
            onBack={() => { setFate(undefined); setFateError(null); }}
          />
        )}

        {pending && (
          <p className="vtm-display text-xs tracking-[0.3em] uppercase text-[#e8636b] text-center vtm-flicker">
            Пробуждаем…
          </p>
        )}
      </div>
    </div>
  );
}

/** Предпросмотр решения Крови: увидеть Сородича до записи в архив —
 *  принять, перебросить или отпустить. */
function FatePreview({
  data,
  pending,
  onReroll,
  onAccept,
  onBack,
}: {
  data: VtmSheetData;
  pending: boolean;
  onReroll: () => void;
  onAccept: () => void;
  onBack: () => void;
}) {
  const c = data.attributes;
  const d = deriveStats(data);
  const clan = CLAN_BY_ID.get(data.info.clan);
  const sect = SECT_BY_ID.get(data.info.sect);
  const predator = PREDATOR_BY_ID.get(data.info.predator);
  const stats: { label: string; value: number; hint: string }[] = [
    { label: "СИЛ", value: c.str, hint: "Сила" },
    { label: "ЛОВ", value: c.dex, hint: "Ловкость" },
    { label: "ВЫН", value: c.sta, hint: "Выносливость" },
    { label: "ОБА", value: c.cha, hint: "Обаяние" },
    { label: "МАН", value: c.man, hint: "Манипуляция" },
    { label: "САМ", value: c.com, hint: "Самообладание" },
    { label: "ИНТ", value: c.int, hint: "Интеллект" },
    { label: "СМК", value: c.wit, hint: "Смекалка" },
    { label: "УПР", value: c.res, hint: "Упорство" },
  ];
  const discLine = data.disciplines
    .map((x) => `${x.name} ${x.value}`)
    .join(" · ");
  const bgLine = data.advantages
    .filter((a) => a.kind === "background")
    .map((a) => `${a.name} ${a.rating}`)
    .join(" · ");
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="vtm-fate-panel space-y-4"
      aria-live="polite"
    >
      <div className="vtm-fate-head">
        {data.info.portrait && (
          <span className="vtm-tpl-face vtm-fate-face" aria-hidden>
            <img src={data.info.portrait} alt="" />
          </span>
        )}
        <div className="text-center space-y-1.5 flex-1 min-w-[200px]">
          <span className="vtm-stamp">Решение Крови</span>
          <h3 className="vtm-display text-2xl text-[#d9c7b6] tracking-[0.08em]">{data.info.name}</h3>
          <p className="vtm-label text-[0.77rem] text-[#d6a840] flex flex-wrap items-center justify-center gap-x-2">
            {data.info.clan === "thinblood" ? (
              <span title="Кровь сира разбавлена: Сила Крови 0, из клановых Дисциплин — только Алхимия слабокровных">
                ⚱ Слабокровная
              </span>
            ) : (
              <span>⛧ {clan?.name || "—"}</span>
            )}
            {sect && <span>· {sect.name}</span>}
            <span>· {data.info.generation}-е пок.</span>
            {predator && <span>· {predator.name}</span>}
            <span>· СК {d.bp}</span>
          </p>
          <p className="vtm-hint !text-[0.79rem]">{data.info.concept}</p>
          {data.info.portrait && (
            <p className="vtm-label text-[0.68rem] text-[#9c8072] uppercase tracking-[0.22em]">
              тень Крови · лицо выберет первая ночь
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-5 sm:grid-cols-9 gap-1.5">
        {stats.map((s) => (
          <div key={s.label} className="vtm-fate-stat" title={s.hint}>
            <span className="vtm-label !text-[0.67rem]">{s.label}</span>
            <span className="vtm-label text-base font-bold text-[#d9c7b6]">{s.value}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 vtm-label text-[0.75rem] text-[#c4ac9d]">
        <span>Здоровье <b className="text-[#e8636b]">{d.healthMax}</b></span>
        <span>Воля <b className="text-[#e8636b]">{d.wpMax}</b></span>
        <span>Сила Крови <b className="text-[#a877c0]">{d.bp}</b></span>
        <span>Человечность <b className="text-[#d6a840]">{data.trackers.humanity}/10</b></span>
        <span>Факты <b className="text-[#d9c7b6]">{d.backgroundPoints}/7</b></span>
      </div>

      <div className="vtm-fate-row">
        <span className="vtm-label shrink-0">Дисциплины</span>
        <span className="vtm-label text-[0.76rem] text-[#a877c0]">{discLine}</span>
      </div>
      <div className="vtm-fate-row">
        <span className="vtm-label shrink-0">Биография</span>
        <span className="vtm-label text-[0.76rem] text-[#c4ac9d]">{bgLine}</span>
      </div>
      <div className="vtm-fate-row">
        <span className="vtm-label shrink-0">Убежище</span>
        <span className="text-[0.79rem] italic leading-relaxed text-[#c4ac9d]">{data.gear.haven}</span>
      </div>
      {data.info.history && (
        <div className="vtm-fate-row">
          <span className="vtm-label shrink-0">Прошлое</span>
          <span className="text-[0.79rem] italic leading-relaxed text-[#c4ac9d]">{data.info.history}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 pt-1">
        <button
          onClick={onReroll}
          disabled={pending}
          className="vtm-btn vtm-btn-ghost !py-2 !px-4 justify-center"
          title="Кровь решит заново"
        >
          ⟲ Перебросить кровь
        </button>
        <button
          onClick={onAccept}
          disabled={pending}
          className="vtm-btn vtm-btn-blood !py-2 !px-5 justify-center"
          title="Записать этого Сородича в архив"
        >
          ✓ Принять кровь
        </button>
        <button
          onClick={onBack}
          disabled={pending}
          className="vtm-btn vtm-btn-ghost !py-2 !px-4 justify-center"
          title="Вернуться к выбору"
        >
          ✕ Отпустить
        </button>
      </div>
      <p className="vtm-hint text-center !text-[0.73rem]">
        Переброс не записывается в архив — Кровь можно трогать, пока не сказано «да».
      </p>
    </motion.div>
  );
}
