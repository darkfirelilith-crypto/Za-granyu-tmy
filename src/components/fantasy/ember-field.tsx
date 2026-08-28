"use client";

import { useState } from "react";

/** Floating ember/dust particles for atmospheric background */
export function EmberField({ count = 14 }: { count?: number }) {
  const [embers] = useState(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 14,
      duration: 10 + Math.random() * 10,
      size: 2 + Math.random() * 3,
      hue: Math.random() > 0.5 ? 70 : 40,
    }))
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
