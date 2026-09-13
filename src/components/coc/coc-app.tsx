"use client";

import { useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ReturnPortal } from "@/components/coc/portal-transition";
import { CocEditor } from "@/components/coc/coc-editor";
import { MAX_SHEETS, OCCUPATIONS, CocSheetData } from "@/lib/coc-data";
import { COC_TEMPLATES } from "@/lib/coc-templates";
import { deriveStats } from "@/lib/coc-calc";
import { cocFetch } from "@/lib/coc-api";

interface SheetMeta {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  portraitThumb?: string | null;
  occupation?: string | null;
}

export function CocApp() {
  const { status } = useSession();
  const [openId, setOpenId] = useState<string | null>(null);

  if (status === "loading") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4">
        <svg viewBox="0 0 120 60" className="w-32 coc-breath">
          <path d="M6 30 Q60 -6 114 30 Q60 66 6 30 Z" fill="none" stroke="#5f8f6e" strokeWidth="1.2" opacity="0.7" />
          <circle cx="60" cy="30" r="10" fill="none" stroke="#5f8f6e" strokeWidth="1" opacity="0.8" />
          <circle cx="60" cy="30" r="4" fill="#5f8f6e" />
        </svg>
        <p className="coc-display text-sm tracking-[0.4em] uppercase text-[#6e6350] coc-flicker">
          Тьма собирается…
        </p>
      </main>
    );
  }

  if (status === "unauthenticated") {
    return <CocGate />;
  }

  return <CocHome openId={openId} onOpen={(id) => setOpenId(id)} onClose={() => setOpenId(null)} />;
}

/** Врата запечатаны — доступ только для авторизованных. */
function CocGate() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-16 relative">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: "easeOut" }}
        className="coc-panel max-w-lg w-full overflow-hidden"
      >
        <div className="relative h-56 md:h-64">
          <img
            src="/coc/gate.jpg"
            alt="Зловещие врата со щупальцами и зелёными глазами во тьме"
            className="w-full h-full object-cover"
            style={{ filter: "brightness(0.85)" }}
          />
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(to top, var(--coc-panel), transparent 65%)" }}
          />
          <span className="coc-stamp absolute top-3 right-3">Не для посторонних</span>
        </div>
        <div className="p-6 md:p-8 text-center space-y-4">
          <h1 className="coc-display text-2xl md:text-3xl text-[#d8cbb0]">
            Дела сыщиков <span className="text-[#7fc39a] coc-flicker">1920-х</span>
          </h1>
          <p className="text-sm leading-relaxed text-[#a4977c]">
            Врата запечатаны. Архив Хранителя открыт лишь тем, кто уже внесён в списки
            основного мира. Войдите там — и печать спадёт.
          </p>
          <ReturnPortal className="coc-btn coc-btn-verdigris w-full justify-center py-3">
            Вернуться и войти в основной мир
          </ReturnPortal>
          <p className="coc-hint">
            «Любопытство — дверь, которую не всегда удается закрыть.»
          </p>
        </div>
      </motion.div>
    </main>
  );
}

/** Архив дел: до 5 листов на игрока, ручной порядок (перетаскивание). */
function CocHome({ openId, onOpen, onClose }: { openId: string | null; onOpen: (id: string) => void; onClose: () => void }) {
  const qc = useQueryClient();
  const [showHelp, setShowHelp] = useState(false);
  const { data: sheets, isLoading } = useQuery<SheetMeta[]>({
    queryKey: ["coc-sheets"],
    queryFn: async () => {
      const res = await cocFetch("/api/coc/sheets");
      return res.json();
    },
  });

  const [showChooser, setShowChooser] = useState(false);
  const startCreation = () => setShowChooser(true);

  const createMutation = useMutation({
    mutationFn: ({ templateId, preset }: { templateId: string | null; preset?: unknown }) =>
      cocFetch("/api/coc/sheets", {
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
      qc.invalidateQueries({ queryKey: ["coc-sheets"] });
      toast.success("Новое дело заведено", { description: `«${sheet.name}» ждёт своего сыщика.` });
      setShowChooser(false);
      onOpen(sheet.id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ===== Ручной порядок дел (drag-and-drop + кнопки ↑↓) =====
  const dragIdRef = useRef<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const reorderMutation = useMutation({
    mutationFn: (ids: string[]) =>
      cocFetch("/api/coc/sheets/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      }).then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error || "Ошибка");
        return r.json();
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["coc-sheets"] }),
    onError: (e: Error) => {
      toast.error("Порядок не сохранился", { description: e.message });
      qc.invalidateQueries({ queryKey: ["coc-sheets"] });
    },
  });

  const move = (ids: string[], from: number, to: number): string[] => {
    const next = [...ids];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    return next;
  };

  const applyOrder = (ids: string[]) => {
    // оптимистично переставляем локально, затем сохраняем
    qc.setQueryData<SheetMeta[]>(["coc-sheets"], (prev) => {
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

  if (openId) return <CocEditor key={openId} sheetId={openId} onBack={onClose} />;

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
          <p className="coc-mono text-[0.65rem] tracking-[0.45em] uppercase text-[#6e6350]">
            Архив Хранителя · Отдел особых дел
          </p>
          <h1 className="coc-display text-3xl md:text-5xl text-[#d8cbb0] tracking-[0.12em]">
            Зов <span className="text-[#7fc39a] coc-flicker">Ктулху</span>
          </h1>
          <div className="flex items-center justify-center gap-3">
            <span className="h-px w-16 bg-[#322a1c]" />
            <span className="text-[#9a7d3e] text-sm">𓂀</span>
            <span className="h-px w-16 bg-[#322a1c]" />
          </div>
          <p className="text-sm italic text-[#a4977c] max-w-xl mx-auto">
            Досье сыщиков. Заполняйте лист — тьма запомнит каждое слово.
            В архиве помещается до {MAX_SHEETS} дел.
          </p>
          <button
            onClick={() => setShowHelp((v) => !v)}
            aria-expanded={showHelp}
            aria-controls="coc-help-panel"
            className="coc-btn coc-btn-ghost !py-1.5 !px-3 text-xs mx-auto"
          >
            {showHelp ? "▲ Скрыть наставления" : "◈ Как заполнить дело?"}
          </button>
          {showHelp && <CocHelpPanel />}
        </motion.header>

        {/* Кассы с делами */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="coc-panel h-40 animate-pulse" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="coc-panel p-10 text-center space-y-4 max-w-md mx-auto"
          >
            <img
              src="/coc/eye-emblem.png"
              alt="Око бездны"
              className="w-24 h-24 mx-auto opacity-70 coc-breath"
              style={{ filter: "invert(0.85) sepia(0.3)" }}
            />
            <h2 className="coc-display text-lg text-[#a4977c] tracking-[0.15em] uppercase">Архив пуст</h2>
            <p className="coc-hint">
              Ни одного дела не заведено. Тьма терпелива — она подождёт, пока вы подпишете первый лист.
            </p>
            <button
              onClick={startCreation}
              disabled={createMutation.isPending}
              className="coc-btn coc-btn-verdigris w-full justify-center py-3 mt-2"
            >
              {createMutation.isPending ? "Заводим дело…" : "+ Завести первое дело"}
            </button>
            <p className="coc-hint !text-[0.62rem]">
              Чистый лист или готовый сыщик из архива — выбор за вами.
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
                <CaseCard
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
                className="coc-case min-h-40 flex flex-col items-center justify-center gap-3 border-dashed"
                style={{ borderStyle: "dashed" }}
                aria-label="Завести новое дело"
              >
                <span className="coc-display text-4xl text-[#5f8f6e] coc-breath">+</span>
                <span className="coc-display text-sm tracking-[0.2em] uppercase text-[#a4977c]">
                  {createMutation.isPending ? "Заводим дело…" : "Новое дело"}
                </span>
                <span className="coc-hint text-center px-4">
                  Чистый лист или готовый сыщик
                </span>
              </motion.button>
            )}
          </div>
        )}

        {full && (
          <p className="text-center coc-hint">
            Архив полон: {list.length} из {MAX_SHEETS} дел. Чтобы завести новое — закройте одно из старых.
          </p>
        )}
        {list.length > 1 && !full && (
          <p className="text-center coc-hint">
            Дела можно перетаскивать — порядок сохранится в архиве.
          </p>
        )}

        {showChooser && (
          <TemplateChooser
            onClose={() => setShowChooser(false)}
            onPick={(tplId, preset) => createMutation.mutate({ templateId: tplId, preset })}
            pending={createMutation.isPending}
          />
        )}

        <footer className="pt-6 text-center space-y-3">
          <ReturnPortal className="coc-btn mx-auto">
            ← Вернуться в мир «За гранью тьмы»
          </ReturnPortal>
          <p className="coc-mono text-[0.6rem] tracking-[0.3em] uppercase text-[#4a4234]">
            That is not dead which can eternal lie
          </p>
        </footer>
      </div>
    </main>
  );
}

/** Краткие наставления для нового сыщика — как заполнить лист по правилам 7e. */
function CocHelpPanel() {
  const steps: { n: string; title: string; text: string }[] = [
    {
      n: "I",
      title: "Заведите дело",
      text: "Кнопка «Новое дело» — всего до 5 досье на игрока. Лист сохраняется сам после каждой правки.",
    },
    {
      n: "II",
      title: "Досье: характеристики и профессия",
      text: "Впишите СИЛ, ВЫН, ТЕЛ, ЛВК, НАР, ИНТ, МОЩ, ОБР (классика: 3d6×5) и Удачу (3d6×5). ПЗ, ПМ, Рассудок, Скорость, Бонус к урону и Комплекция посчитаются сами. Затем выберите род занятий — очки профессии и нужные навыки отметятся автоматически.",
    },
    {
      n: "III",
      title: "Навыки: вложите очки",
      text: "Очки профессии — только в отмеченные ☐ навыки; личные (ИНТ×2) — в любые. Клик по итогу = проверка d100 с уровнями ½ и ⅕. Провал можно исправить удачей: −1/−5/−10 прямо в печати результата.",
    },
    {
      n: "IV",
      title: "Остальные вкладки",
      text: "«Бой» — оружие с авторасчётом уровней и броском 🎲; «Биография» — 10 полей предыстории; «Имущество» — деньги и рюкзак (автозаполнение по Средствам); «Заметки» — журнал расследования.",
    },
    {
      n: "V",
      title: "Портрет и печать",
      text: "Вклейте портрет в «Досье» (до 5 дел — фото сожмётся само). Перед игрой жмите «🖨 Печать» — Хранитель получит машинописный бланк 1920-х. Журнал бросков прячется за 🕘.",
    },
  ];
  return (
    <motion.div
      id="coc-help-panel"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="coc-panel p-5 md:p-6 max-w-2xl mx-auto text-left space-y-3"
    >
      <h2 className="coc-display text-sm tracking-[0.25em] uppercase text-[#a4977c] text-center">
        Наставления архива
      </h2>
      <ol className="space-y-3">
        {steps.map((s) => (
          <li key={s.n} className="flex gap-3 items-start">
            <span
              className="coc-display shrink-0 w-8 h-8 flex items-center justify-center rounded-full border text-[#9a7d3e] text-xs"
              style={{ borderColor: "#322a1c", background: "rgba(0,0,0,0.3)" }}
              aria-hidden
            >
              {s.n}
            </span>
            <div>
              <p className="coc-display text-xs tracking-[0.15em] uppercase text-[#c0a05a]">{s.title}</p>
              <p className="text-xs leading-relaxed text-[#a4977c] mt-0.5">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="coc-hint text-center pt-1">
        Проверки Рассудка и Удачи не улучшаются удачей — таков закон.
      </p>
    </motion.div>
  );
}

/** Карточка дела (перетаскиваемая, с номером и кнопками порядка). */
function CaseCard({
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
    mutationFn: () => cocFetch(`/api/coc/sheets/${sheet.id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coc-sheets"] });
      toast.success("Дело уничтожено", { description: `«${sheet.name}» предано огню.` });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const date = new Date(sheet.updatedAt).toLocaleString("ru-RU", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
  const openedDate = new Date(sheet.createdAt).toLocaleDateString("ru-RU", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
  const occDef = sheet.occupation
    ? OCCUPATION_NAME[sheet.occupation] || sheet.occupation
    : null;

  return (
    <div
      className={`coc-case group ${isOver ? "coc-case-over" : ""}`}
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
          <div className="shrink-0 w-14 h-16 rounded border border-[#322a1c] overflow-hidden bg-black flex items-center justify-center">
            {sheet.portraitThumb ? (
              <img src={sheet.portraitThumb} alt="" className="w-full h-full object-cover" style={{ filter: "sepia(0.3)" }} />
            ) : (
              <span className="text-xl text-[#322a1c] select-none">☾</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <span className="coc-stamp">Дело № {index}</span>
              <div className="flex items-center gap-1">
                {onMove && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); onMove(-1); }}
                      className="coc-move-btn"
                      title="Поднять дело выше"
                      aria-label={`Поднять дело ${sheet.name} выше`}
                    >
                      ↑
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onMove(1); }}
                      className="coc-move-btn"
                      title="Опустить дело ниже"
                      aria-label={`Опустить дело ${sheet.name} ниже`}
                    >
                      ↓
                    </button>
                  </>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); del.mutate(); }}
                  disabled={del.isPending}
                  className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity text-[#a83232] hover:text-[#cf6a6a] text-xs coc-mono px-1.5 py-0.5 border border-transparent hover:border-[#7c1d1d] rounded"
                  title="Уничтожить дело"
                  aria-label={`Удалить дело ${sheet.name}`}
                >
                  {del.isPending ? "…" : "✕ сжечь"}
                </button>
              </div>
            </div>
            <h2 className="coc-display text-lg text-[#d8cbb0] leading-snug line-clamp-2 mt-1.5">
              {sheet.name}
            </h2>
            {occDef && (
              <p className="coc-mono text-[0.62rem] text-[#9a7d3e] truncate mt-0.5" title={occDef}>
                ◈ {occDef}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between coc-mono text-[0.62rem] text-[#6e6350]">
          <span>открыто {openedDate}</span>
          <span>изм. {date.slice(0, 6)}</span>
        </div>
        <p className="coc-display text-[0.7rem] tracking-[0.25em] uppercase text-[#5f8f6e] opacity-0 group-hover:opacity-100 transition-opacity">
          Открыть досье →
        </p>
      </div>
    </div>
  );
}

/** Выбор заготовки при заведении дела: чистый лист, готовый сыщик или судьба
 *  с предпросмотром («Пусть тьма решит» — можно перебросить до записи в архив). */
function TemplateChooser({
  onClose,
  onPick,
  pending,
}: {
  onClose: () => void;
  onPick: (templateId: string | null, preset?: unknown) => void;
  pending: boolean;
}) {
  const occName = (id: string) => OCCUPATIONS.find((o) => o.id === id)?.name || "";
  // undefined — предпросмотр не запрашивался; null — кости катятся; object — решение тьмы
  const [fate, setFate] = useState<CocSheetData | null | undefined>(undefined);
  const [fateError, setFateError] = useState<string | null>(null);

  const castFate = async () => {
    setFate(null);
    setFateError(null);
    try {
      const res = await cocFetch("/api/coc/random", { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error || "Кости упали ребром");
      const json = await res.json();
      setFate(json.data as CocSheetData);
    } catch (e) {
      setFate(undefined);
      setFateError(e instanceof Error ? e.message : "Кости упали ребром");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start md:items-center justify-center p-3 md:p-6 overflow-y-auto coc-scroll"
      style={{ background: "rgba(0,0,0,0.82)" }}
      role="dialog"
      aria-modal="true"
      aria-label="Выбор заготовки сыщика"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="coc-panel max-w-3xl w-full p-5 md:p-6 space-y-4 coc-conflict-pop my-4">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <span className="coc-stamp">Выбор сыщика</span>
            <h2 className="coc-display text-lg text-[#d8cbb0] mt-2 tracking-[0.1em]">
              Кого впустить во тьму?
            </h2>
            <p className="coc-hint mt-1">
              Готовые сыщики приходят с профессией, вложенными очками, оружием и прошлым.
              Всё потом можно переписать — это лишь первый лист.
            </p>
          </div>
          <button onClick={onClose} className="coc-btn coc-btn-ghost !px-2.5 !py-1.5 shrink-0" aria-label="Закрыть выбор">
            ✕
          </button>
        </div>

        {fate === undefined && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Пусть тьма решит — случайный сыщик с предпросмотром */}
            <button
              onClick={castFate}
              disabled={pending}
              className="coc-template-card coc-template-random sm:col-span-2 lg:col-span-3"
              aria-label="Случайный сыщик — пусть тьма решит"
            >
              <span className="coc-template-stamp coc-stamp-ruby">Судьба бросает кости</span>
              <span className="coc-random-dice" aria-hidden="true">
                <i className="die die-a">⚄</i>
                <i className="die die-b">⚅</i>
                <i className="eye">𓂀</i>
              </span>
              <span className="coc-template-title">Пусть тьма решит</span>
              <span className="coc-template-tagline">
                Тьма бросит 3d6×5 за каждую характеристику, выберет профессию, вложит очки,
                выдаст оружие и прошлое. Вы увидите её решение до записи в архив.
              </span>
            </button>

            {/* Чистый лист */}
            <button
              onClick={() => onPick(null)}
              disabled={pending}
              className="coc-template-card coc-template-blank"
              aria-label="Чистый лист сыщика"
            >
              <span className="coc-template-stamp">Без прошлого</span>
              <svg viewBox="0 0 44 52" className="w-9 h-11 coc-breath" aria-hidden="true">
                <path
                  d="M6 4 H30 L38 12 V48 H6 Z"
                  fill="rgba(0,0,0,0.35)" stroke="#5f8f6e" strokeWidth="1.4" strokeLinejoin="round"
                />
                <path d="M30 4 L30 12 L38 12" fill="none" stroke="#5f8f6e" strokeWidth="1.2" />
                <line x1="11" y1="20" x2="33" y2="20" stroke="#3d5c48" strokeWidth="1.4" />
                <line x1="11" y1="27" x2="33" y2="27" stroke="#3d5c48" strokeWidth="1.4" />
                <line x1="11" y1="34" x2="26" y2="34" stroke="#3d5c48" strokeWidth="1.4" />
              </svg>
              <span className="coc-template-title">Чистый лист</span>
              <span className="coc-template-tagline">Судьба ещё не написана. Всё с нуля — от характеристик до кошелька.</span>
            </button>

            {COC_TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => onPick(t.id)}
                disabled={pending}
                className="coc-template-card"
                aria-label={`Готовый сыщик: ${t.title}`}
              >
                <span className="coc-template-stamp">{occName(t.occupation)}</span>
                <span className="coc-template-title">{t.title}</span>
                <span className="coc-template-tagline">{t.tagline}</span>
                <span className="coc-template-stats">
                  <i>возраст {t.age}</i>
                  <i>ОБР {t.characteristics.edu}</i>
                  <i>МОЩ {t.characteristics.pow}</i>
                </span>
                <span className="coc-template-name">«{t.name}»</span>
              </button>
            ))}
          </div>
        )}

        {fate === null && (
          <div className="py-14 text-center space-y-4" role="status" aria-live="polite">
            <span className="coc-random-dice" aria-hidden="true">
              <i className="die die-a">⚄</i>
              <i className="die die-b">⚅</i>
              <i className="eye">𓂀</i>
            </span>
            <p className="coc-display text-sm tracking-[0.35em] uppercase text-[#7fc39a] coc-flicker">
              Кости катятся во тьме…
            </p>
          </div>
        )}

        {fateError && (
          <p className="coc-mono text-xs text-[#a83232] text-center" role="alert">{fateError}</p>
        )}

        {fate && <FatePreview
          data={fate}
          occName={occName(fate.info.occupation || "")}
          pending={pending}
          onReroll={castFate}
          onAccept={() => onPick("random", fate)}
          onBack={() => { setFate(undefined); setFateError(null); }}
        />}

        {pending && (
          <p className="coc-display text-xs tracking-[0.3em] uppercase text-[#7fc39a] text-center coc-flicker">
            Заводим дело…
          </p>
        )}
      </div>
    </div>
  );
}

/** Предпросмотр решения судьбы: увидеть сыщика до записи в архив —
 *  принять, перебросить или отпустить. */
function FatePreview({
  data,
  occName,
  pending,
  onReroll,
  onAccept,
  onBack,
}: {
  data: CocSheetData;
  occName: string;
  pending: boolean;
  onReroll: () => void;
  onAccept: () => void;
  onBack: () => void;
}) {
  const c = data.characteristics;
  const d = deriveStats(data);
  const stats: { label: string; value: number; hint: string }[] = [
    { label: "СИЛ", value: c.str, hint: "Сила" },
    { label: "ВЫН", value: c.con, hint: "Выносливость" },
    { label: "ТЕЛ", value: c.siz, hint: "Телосложение" },
    { label: "ЛВК", value: c.dex, hint: "Ловкость" },
    { label: "НАР", value: c.app, hint: "Внешность" },
    { label: "ИНТ", value: c.int, hint: "Интеллект" },
    { label: "МОЩ", value: c.pow, hint: "Сила воли" },
    { label: "ОБР", value: c.edu, hint: "Образование" },
    { label: "Удача", value: c.luck, hint: "Удача" },
  ];
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="coc-fate-panel space-y-4"
      aria-live="polite"
    >
      <div className="text-center space-y-1.5">
        <span className="coc-stamp coc-stamp-ruby">Решение судьбы</span>
        <h3 className="coc-display text-2xl text-[#d8cbb0] tracking-[0.08em]">{data.info.name}</h3>
        <p className="coc-mono text-[0.68rem] text-[#9a7d3e]">
          ◈ {occName}
          {data.info.age ? ` · ${data.info.age} лет` : ""}
          {data.info.sex ? ` · ${data.info.sex}` : ""}
          {data.info.residence ? ` · ${data.info.residence}` : ""}
        </p>
      </div>

      <div className="grid grid-cols-5 sm:grid-cols-9 gap-1.5">
        {stats.map((s) => (
          <div key={s.label} className="coc-fate-stat" title={s.hint}>
            <span className="coc-label !text-[0.52rem]">{s.label}</span>
            <span className="coc-mono text-base font-bold text-[#d8cbb0]">{s.value}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 coc-mono text-[0.62rem] text-[#a4977c]">
        <span>ПЗ <b className="text-[#7fc39a]">{d.hpMax}</b></span>
        <span>ПМ <b className="text-[#7fc39a]">{d.mpMax}</b></span>
        <span>Рассудок <b className="text-[#c98f6a]">{d.sanStart}</b></span>
        <span>Скорость <b className="text-[#d8cbb0]">{d.mov}</b></span>
        <span>БкУ <b className="text-[#d8cbb0]">{d.db}</b></span>
        <span>Комплекция <b className="text-[#d8cbb0]">{d.build}</b></span>
      </div>

      {data.weapons.length > 0 && (
        <div className="coc-fate-row">
          <span className="coc-label shrink-0">Арсенал</span>
          <span className="coc-mono text-[0.65rem] text-[#a4977c]">
            {data.weapons.map((w) => `${w.name} (${w.damage})`).join(" · ")}
          </span>
        </div>
      )}

      {data.bio?.description && (
        <div className="coc-fate-row">
          <span className="coc-label shrink-0">Прошлое</span>
          <span className="text-[0.68rem] italic leading-relaxed text-[#a4977c]">
            {data.bio.description}
          </span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 pt-1">
        <button
          onClick={onReroll}
          disabled={pending}
          className="coc-btn coc-btn-ghost !py-2 !px-4 justify-center"
          title="Тьма бросит кости заново"
        >
          ⟲ Перебросить судьбу
        </button>
        <button
          onClick={onAccept}
          disabled={pending}
          className="coc-btn coc-btn-verdigris !py-2 !px-5 justify-center"
          title="Записать этого сыщика в архив"
        >
          ✓ Принять судьбу
        </button>
        <button
          onClick={onBack}
          disabled={pending}
          className="coc-btn coc-btn-ghost !py-2 !px-4 justify-center"
          title="Вернуться к выбору"
        >
          ✕ Отпустить
        </button>
      </div>
      <p className="coc-hint text-center !text-[0.6rem]">
        Переброс не записывается в архив — судьбу можно трогать, пока не сказано «да».
      </p>
    </motion.div>
  );
}

// Краткая карта id → название профессии (без импорта полного списка с формулами)
const OCCUPATION_NAME: Record<string, string> = {
  acrobat: "Акробат", "actor-movie": "Актёр (кинозвезда)", "actor-theatre": "Актёр (театр)",
  alienist: "Алиенист", alpinist: "Альпинист", antiquarian: "Антиквар", artist: "Артист",
  archaeologist: "Археолог", architect: "Архитектор", athlete: "Атлет", bartender: "Бармен",
  librarian: "Библиотекарь", boxer: "Боксёр / борец", drifter: "Бродяга", accountant: "Бухгалтер",
  "driver-general": "Водитель", "driver-taxi": "Таксист", "driver-chauffeur": "Шофёр",
  diver: "Водолаз", doctor: "Врач", "gangster-boss": "Гангстер: босс",
  "gangster-soldier": "Гангстер: боец", "cult-leader": "Глава культа", undertaker: "Гробовщик",
  butler: "Дворецкий", "detective-agency": "Детектив (агентство)", "detective-private": "Частный сыщик",
  gentleman: "Джентльмен", designer: "Дизайнер", savage: "Дикарь", dilettante: "Дилетант",
  trainer: "Дрессировщик", "journalist-invest": "Журналист-расследователь", "journalist-reporter": "Репортёр",
  "foreign-correspondent": "Загранкорреспондент", gambler: "Игрок", engineer: "Инженер",
  explorer: "Исследователь", stuntman: "Каскадёр", bookseller: "Книготорговец", cowboy: "Ковбой",
  salesman: "Коммивояжер", "lab-assistant": "Лаборант", shopkeeper: "Лавочник",
  "gangster-mistress": "Любовница гангстера", nurse: "Медсестра", mechanic: "Механик",
  missionary: "Миссионер", "sailor-navy": "Моряк (флот)", "sailor-merchant": "Моряк (торговый)",
  "museum-worker": "Музейный работник", musician: "Музыкант", occultist: "Оккультист",
  clerk: "Клерк", manager: "Менеджер", officer: "Офицер", waitress: "Официантка",
  "bounty-hunter": "Охотник за наградами", "big-game-hunter": "Охотник на крупную дичь",
  parapsychologist: "Парапсихолог", "pilot-private": "Пилот (частный)", "pilot-aviation": "Пилот (авиация)",
  author: "Писатель", firefighter: "Пожарный", politician: "Политик",
  "police-detective": "Полицейский: следователь", "police-officer": "Полицейский: офицер",
  "criminal-bootlegger": "Бутлеггер", "criminal-burglar": "Вор-взломщик", "criminal-bankrobber": "Грабитель банков",
  "criminal-smuggler": "Контрабандист", "criminal-conman": "Мошенник", "criminal-hitman": "Наёмный убийца",
  "criminal-fence": "Скупщик краденого", "criminal-counterfeiter": "Фальшивомонетчик", "criminal-goon": "Шпана",
  prostitute: "Проститутка", professor: "Профессор", "union-activist": "Профсоюзный активист",
  psychiatrist: "Психиатр", psychologist: "Психолог", "zoo-worker": "Работник зоопарка",
  lumberjack: "Лесоруб", laborer: "Чернорабочий", miner: "Шахтёр", editor: "Редактор",
  craftsman: "Ремесленник", orderly: "Санитар", "asylum-orderly": "Санитар лечебницы",
  clergy: "Священнослужитель", secretary: "Секретарь", soldier: "Солдат/матрос",
  prospector: "Старатель", student: "Студент", forensic: "Судмедэксперт", judge: "Судья",
  "antique-dealer": "Торговец антиквариатом", tourist: "Турист", scientist: "Учёный",
  fanatic: "Фанатик", pharmacist: "Фармацевт", "federal-agent": "Федеральный агент",
  farmer: "Фермер", flapper: "Флэппер", photographer: "Фотограф", photojournalist: "Фотожурналист",
  hobo: "Хобо", painter: "Художник", spy: "Шпион", lawyer: "Юрист",
};
