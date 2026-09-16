"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export const FLAG_TO_VTM = "vtm-travel:to";
export const FLAG_FROM_VTM = "vtm-travel:from";

/** Клыки: два острых треугольника, между ними — капля. */
function Fangs({ size }: { size: string }) {
  return (
    <svg viewBox="0 0 24 24" className={size} fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M5 4 C7 10 8.5 13 9 16 C9.5 18 8 20 7 20 C6 20 4.8 18 5 16 C5.2 13 5 9 5 4 Z" fill="currentColor" stroke="none" opacity="0.9" />
      <path d="M19 4 C17 10 15.5 13 15 16 C14.5 18 16 20 17 20 C18 20 19.2 18 19 16 C18.8 13 19 9 19 4 Z" fill="currentColor" stroke="none" opacity="0.9" />
      <circle cx="12" cy="13" r="2.1" fill="currentColor" stroke="none" opacity="0.55" />
    </svg>
  );
}

/**
 * Кровавый портал между вселенными: алая мгла заливает экран,
 * клыки смыкаются — и путешественник уже в другом мире.
 * Отдельная вселенная «Вампиров: Маскарад» — свои флаги, своя анимация.
 */
export function VtmPortalButton({
  className,
  label = "Маскарад",
  labelClassName = "",
  compact = false,
}: {
  className?: string;
  label?: string;
  labelClassName?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [traveling, setTraveling] = useState(false);

  const travel = () => {
    if (traveling) return;
    setTraveling(true);
    try {
      sessionStorage.setItem(FLAG_TO_VTM, "1");
    } catch {}
    window.setTimeout(() => router.push("/vtm"), 1150);
  };

  return (
    <>
      <button
        onClick={travel}
        className={className}
        title="Спуститься в Маскарад — другую вселенную"
        aria-label={`Переход: ${label}`}
      >
        {compact ? (
          <span className="relative inline-flex items-center justify-center">
            <Fangs size="w-4 h-4" />
            <span className={labelClassName}>{label}</span>
          </span>
        ) : (
          <>
            <Fangs size="w-5 h-5" />
            <span>{label}</span>
          </>
        )}
      </button>

      <AnimatePresence>
        {traveling && (
          <motion.div
            key="vtm-portal"
            className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            {/* расползающаяся кровавая мгла */}
            <motion.div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(circle at 50% 50%, #2a0508 0%, #170307 55%, rgba(10,2,4,0.97) 76%, rgba(10,2,4,0) 100%)",
              }}
              initial={{ scale: 0.02, opacity: 0.9 }}
              animate={{ scale: 3.4, opacity: 1 }}
              transition={{ duration: 1.05, ease: [0.65, 0, 0.35, 1] }}
            />
            {/* клыки и капля во тьме */}
            <motion.svg
              viewBox="0 0 140 60"
              className="relative w-44 md:w-60"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: [0, 1, 1, 0], scale: [0.8, 1, 1.06, 1.16] }}
              transition={{ duration: 1.15, times: [0, 0.35, 0.8, 1] }}
            >
              <path d="M28 6 C32 22 36 32 39 44 C40.5 49 37 55 34.5 55 C32 55 28 50 29 44 C30 33 27 20 28 6 Z" fill="#c22b30" opacity="0.95" />
              <path d="M112 6 C108 22 104 32 101 44 C99.5 49 103 55 105.5 55 C108 55 112 50 111 44 C110 33 113 20 112 6 Z" fill="#c22b30" opacity="0.95" />
              <motion.circle
                cx="70" cy="30" r="4"
                fill="#8a1a1d"
                animate={{ cy: [30, 34, 40], opacity: [1, 1, 0], r: [4, 3.4, 2.2] }}
                transition={{ duration: 1.0, times: [0, 0.6, 1], repeat: Infinity }}
              />
              <ellipse cx="70" cy="47" rx="16" ry="3.2" fill="none" stroke="#7a1f24" strokeWidth="1" opacity="0.7" />
            </motion.svg>
            <motion.p
              className="absolute bottom-24 vtm-display text-xs tracking-[0.5em] uppercase text-[#a0454a]"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.9, 0] }}
              transition={{ duration: 1.15, times: [0.2, 0.55, 1] }}
            >
              Спустись в Маскарад
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/** Обратный портал: возврат из Маскарада в мир «За гранью тьмы». */
export function VtmReturnPortal({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const [traveling, setTraveling] = useState(false);

  useEffect(() => {
    // если вернулись сюда из основного мира — флаг чистится
    try {
      sessionStorage.removeItem(FLAG_TO_VTM);
    } catch {}
  }, []);

  const travel = () => {
    if (traveling) return;
    setTraveling(true);
    try {
      sessionStorage.setItem(FLAG_FROM_VTM, "1");
    } catch {}
    window.setTimeout(() => router.push("/"), 1050);
  };

  return (
    <>
      <button onClick={travel} className={className} type="button">
        {children}
      </button>
      <AnimatePresence>
        {traveling && (
          <motion.div
            key="vtm-return"
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(circle at 50% 45%, rgba(214,168,64,0.12) 0%, #0a0203 45%, #050203 100%)",
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1] }}
              transition={{ duration: 1.0 }}
            />
            <motion.p
              className="vtm-display relative text-sm tracking-[0.45em] uppercase text-[#8a5a3f]"
              animate={{ opacity: [0, 1, 0.6, 1] }}
              transition={{ duration: 1.05 }}
            >
              Ночь отпускает…
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/** Вспышка при выходе из портала (вызывается на страницах-приёмниках). */
export function VtmUniverseFade() {
  // useSyncExternalStore — безопасный способ отличить SSR-рендер от клиентского
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  // Флаги читаем и гасим ОДИН раз — ленивый инициализатор (без setState в эффекте)
  const [show] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const v = sessionStorage.getItem(FLAG_TO_VTM) || sessionStorage.getItem(FLAG_FROM_VTM);
      sessionStorage.removeItem(FLAG_TO_VTM);
      sessionStorage.removeItem(FLAG_FROM_VTM);
      return !!v;
    } catch {
      return false;
    }
  });
  if (!mounted || !show) return null;
  return (
    <motion.div
      key="vtm-fade"
      className="fixed inset-0 z-[9998] pointer-events-none"
      style={{ background: "#0a0203" }}
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.1, ease: "easeOut" }}
    />
  );
}
