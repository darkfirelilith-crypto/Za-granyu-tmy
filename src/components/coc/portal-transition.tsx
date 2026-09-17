"use client";

import { useState, useEffect, useLayoutEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export const FLAG_TO_CTHULHU = "coc-travel:to";
export const FLAG_FROM_CTHULHU = "coc-travel:from";

/**
 * Портал между вселенными: чёрная пучина поглощает экран,
 * глаз моргает — и путешественник уже в другом мире.
 */
export function CthulhuPortalButton({
  className,
  label = "Зов Ктулху",
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
      sessionStorage.setItem(FLAG_TO_CTHULHU, "1");
    } catch {}
    window.setTimeout(() => router.push("/cthulhu"), 1150);
  };

  return (
    <>
      <button
        onClick={travel}
        className={className}
        title="Открыть врата в другую вселенную"
        aria-label={`Переход: ${label}`}
      >
        {compact ? (
          <span className="relative inline-flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" />
              <circle cx="12" cy="12" r="2.6" className="coc-eye-pupil" fill="currentColor" stroke="none" />
            </svg>
            <span className={labelClassName}>{label}</span>
          </span>
        ) : (
          <>
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" />
              <circle cx="12" cy="12" r="2.6" className="coc-eye-pupil" fill="currentColor" stroke="none" />
            </svg>
            <span>{label}</span>
          </>
        )}
      </button>

      <AnimatePresence>
        {traveling && (
          <motion.div
            key="portal"
            className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            {/* расползающаяся тьма */}
            <motion.div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(circle at 50% 50%, #000 0%, #000 62%, rgba(6,5,4,0.96) 78%, rgba(6,5,4,0) 100%)",
              }}
              initial={{ scale: 0.02, opacity: 0.9 }}
              animate={{ scale: 3.2, opacity: 1 }}
              transition={{ duration: 1.05, ease: [0.65, 0, 0.35, 1] }}
            />
            {/* глаз во тьме */}
            <motion.svg
              viewBox="0 0 120 60"
              className="relative w-40 md:w-56"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: [0, 1, 1, 0], scale: [0.8, 1, 1.05, 1.15] }}
              transition={{ duration: 1.15, times: [0, 0.35, 0.8, 1] }}
            >
              <path
                d="M6 30 Q60 -6 114 30 Q60 66 6 30 Z"
                fill="none"
                stroke="#7fc39a"
                strokeWidth="1.4"
                opacity="0.9"
              />
              <circle cx="60" cy="30" r="11" fill="none" stroke="#7fc39a" strokeWidth="1.2" />
              <circle cx="60" cy="30" r="4.5" fill="#7fc39a" className="coc-eye-pupil" />
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
                const a = (Math.PI * 2 * i) / 8 + 0.4;
                const x1 = 60 + Math.cos(a) * 20;
                const y1 = 30 + Math.sin(a) * 14;
                const x2 = 60 + Math.cos(a) * (30 + (i % 2) * 6);
                const y2 = 30 + Math.sin(a) * (22 + (i % 2) * 5);
                return (
                  <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#5f8f6e" strokeWidth="0.8" opacity="0.7" />
                );
              })}
            </motion.svg>
            <motion.p
              className="absolute bottom-24 coc-display text-xs tracking-[0.5em] uppercase text-[#5f8f6e]"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.9, 0] }}
              transition={{ duration: 1.15, times: [0.2, 0.55, 1] }}
            >
              Врата открываются
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/**
 * Встречающая тьма: если флаг перехода установлен — экран рождается из чёрного.
 * Монтируется в обоих мирах (гл. сайт и /cthulhu).
 */
export function UniverseFade() {
  const [fading, setFading] = useState(false);

  useIsoLayoutEffect(() => {
    try {
      const has = window.sessionStorage.getItem(FLAG_TO_CTHULHU) || window.sessionStorage.getItem(FLAG_FROM_CTHULHU);
      if (has) {
        window.sessionStorage.removeItem(FLAG_TO_CTHULHU);
        window.sessionStorage.removeItem(FLAG_FROM_CTHULHU);
        setFading(true);
      }
    } catch {}
  }, []);

  return (
    <AnimatePresence>
      {fading && (
        <motion.div
          className="fixed inset-0 z-[9998] bg-black pointer-events-none"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          onAnimationComplete={() => setFading(false)}
        />
      )}
    </AnimatePresence>
  );
}

/** Обратный путь: из «Зова Ктулху» в основной мир. */
export function ReturnPortal({ children, className }: { children: React.ReactNode; className?: string }) {
  const router = useRouter();
  const [traveling, setTraveling] = useState(false);

  const travel = () => {
    if (traveling) return;
    setTraveling(true);
    try {
      sessionStorage.setItem(FLAG_FROM_CTHULHU, "1");
    } catch {}
    window.setTimeout(() => router.push("/"), 1150);
  };

  return (
    <>
      <button onClick={travel} className={className}>
        {children}
      </button>
      <AnimatePresence>
        {traveling && (
          <motion.div
            key="return-portal"
            className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(circle at 50% 50%, #000 0%, #000 62%, rgba(6,5,4,0.96) 78%, rgba(6,5,4,0) 100%)",
              }}
              initial={{ scale: 0.02 }}
              animate={{ scale: 3.2 }}
              transition={{ duration: 1.05, ease: [0.65, 0, 0.35, 1] }}
            />
            <motion.p
              className="relative coc-display text-xs tracking-[0.5em] uppercase text-[#9a7d3e]"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.9, 0] }}
              transition={{ duration: 1.15, times: [0.2, 0.55, 1] }}
            >
              Возвращение в сагу
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
