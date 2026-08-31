"use client";

import { useState } from "react";

/**
 * Expandable portrait thumbnail — small in the corner, click to expand
 * into a full-size overlay lightbox. Works for any entity with a portrait image.
 */
export function ExpandablePortrait({
  src,
  alt,
  size = "md",
  className,
}: {
  src: string;
  alt: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);

  const sizes = {
    sm: "w-12 h-12 text-base",
    md: "w-16 h-20 md:w-20 md:h-24",
    lg: "w-20 h-24 md:w-24 md:h-28",
  };

  return (
    <>
      {/* Small thumbnail — click to expand */}
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className={`group relative rounded-lg overflow-hidden gold-frame shrink-0 cursor-zoom-in transition-all hover:shadow-lg ${sizes[size]} ${className ?? ""}`}
        title="Нажми, чтобы увеличить"
      >
        <img src={src} alt={alt} className="w-full h-full object-cover" />
        {/* Zoom indicator on hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-lg">🔍</span>
        </div>
      </button>

      {/* Full-size overlay */}
      {expanded && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-reveal"
          onClick={() => setExpanded(false)}
        >
          <div className="relative max-w-2xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <img
              src={src}
              alt={alt}
              className="max-w-full max-h-[90vh] rounded-lg object-contain shadow-2xl"
            />
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-background border border-gold/40 text-gold hover:bg-gold/10 flex items-center justify-center text-lg"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}
