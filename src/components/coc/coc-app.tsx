"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ReturnPortal } from "@/components/coc/portal-transition";
import { CocEditor } from "@/components/coc/coc-editor";
import { MAX_SHEETS } from "@/lib/coc-data";

interface SheetMeta {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
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

/** Архив дел: до 5 листов на игрока. */
function CocHome({ openId, onOpen, onClose }: { openId: string | null; onOpen: (id: string) => void; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: sheets, isLoading } = useQuery<SheetMeta[]>({
    queryKey: ["coc-sheets"],
    queryFn: () => fetch("/api/coc/sheets").then((r) => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      fetch("/api/coc/sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }).then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error || "Ошибка");
        return r.json();
      }),
    onSuccess: (sheet: SheetMeta) => {
      qc.invalidateQueries({ queryKey: ["coc-sheets"] });
      toast.success("Новое дело заведено", { description: `«${sheet.name}» ждёт своего сыщика.` });
      onOpen(sheet.id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const list = Array.isArray(sheets) ? sheets : [];
  const full = list.length >= MAX_SHEETS;

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
        </motion.header>

        {/* Кассы с делами */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="coc-panel h-40 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {list.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.07 }}
              >
                <CaseCard sheet={s} onOpen={() => onOpen(s.id)} />
              </motion.div>
            ))}
            {!full && (
              <motion.button
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: list.length * 0.07 }}
                onClick={() => createMutation.mutate()}
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
                  Чистый лист сыщика — судьба ещё не написана
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

/** Карточка дела. */
function CaseCard({ sheet, onOpen }: { sheet: SheetMeta; onOpen: () => void }) {
  const qc = useQueryClient();
  const del = useMutation({
    mutationFn: () => fetch(`/api/coc/sheets/${sheet.id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coc-sheets"] });
      toast.success("Дело уничтожено", { description: `«${sheet.name}» предано огню.` });
    },
    onError: () => toast.error("Не удалось уничтожить дело"),
  });

  const date = new Date(sheet.updatedAt).toLocaleString("ru-RU", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className="coc-case group" onClick={onOpen} role="button" tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpen()}>
      <div className="p-4 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <span className="coc-stamp">Дело</span>
          <button
            onClick={(e) => { e.stopPropagation(); del.mutate(); }}
            disabled={del.isPending}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-[#a83232] hover:text-[#cf6a6a] text-xs coc-mono px-1.5 py-0.5 border border-transparent hover:border-[#7c1d1d] rounded"
            title="Уничтожить дело"
            aria-label={`Удалить дело ${sheet.name}`}
          >
            {del.isPending ? "…" : "✕ сжечь"}
          </button>
        </div>
        <h2 className="coc-display text-lg text-[#d8cbb0] leading-snug line-clamp-2 min-h-[3rem]">
          {sheet.name}
        </h2>
        <p className="coc-mono text-[0.65rem] text-[#6e6350]">
          изм. {date}
        </p>
        <p className="coc-display text-[0.7rem] tracking-[0.25em] uppercase text-[#5f8f6e] opacity-0 group-hover:opacity-100 transition-opacity">
          Открыть досье →
        </p>
      </div>
    </div>
  );
}
