"use client";

import { useSyncExternalStore } from "react";

/** Floating ember/dust particles for atmospheric background.
 *  Positions are generated only on the client (via useSyncExternalStore's
 *  client snapshot) to avoid SSR hydration mismatch with Math.random. */
export function EmberField({ count = 14 }: { count?: number }) {
  const embers = useSyncExternalStore(
    subscribeNoop,
    () => getEmbers(count),
    () => EMPTY
  );

  return (
    <div className="ember-field" aria-hidden>
      {embers.map((e) => (
        <span
          key={e.id}
          style={{
            left: `${e.left}%`,
            width: e.size,
            height: e.size,
            animationDelay: `${e.delay}s`,
            animationDuration: `${e.duration}s`,
            background: `oklch(0.78 0.16 ${e.hue} / 0.8)`,
            boxShadow: `0 0 8px oklch(0.78 0.16 ${e.hue} / 0.7)`,
          }}
        />
      ))}
    </div>
  );
}

interface Ember {
  id: number;
  left: number;
  delay: number;
  duration: number;
  size: number;
  hue: number;
}

const EMPTY: Ember[] = [];
const cacheByCount = new Map<number, Ember[]>();

function getEmbers(count: number): Ember[] {
  let cached = cacheByCount.get(count);
  if (!cached) {
    cached = generateEmbers(count);
    cacheByCount.set(count, cached);
  }
  return cached;
}

function generateEmbers(count: number): Ember[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 14,
    duration: 10 + Math.random() * 10,
    size: 2 + Math.random() * 3,
    hue: Math.random() > 0.5 ? 70 : 40,
  }));
}

function subscribeNoop() {
  // Embers are static after first generation; no subscription needed.
  return () => {};
}
