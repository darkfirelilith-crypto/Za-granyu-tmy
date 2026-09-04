"use client";

import { useState } from "react";

/**
 * Expandable image — wide banner/illustration that opens a full-size
 * lightbox overlay on click. Unlike ExpandablePortrait (small thumbnail),
 * this renders at full width and is used for country banners, god images, etc.
 */
export function ExpandableImage({
  src,
  alt,
  className,
  height = "h-48 md:h-64",
}: {
  src: string;
  alt: string;
  className?: string;
  height?: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className={`group relative w-full ${height} overflow-hidden rounded-lg gold-frame bg-parchment-dark/20 cursor-zoom-in transition-all hover:shadow-lg ${className ?? ""}`}
        title="Нажми, чтобы увеличить"
      >
        <img src={src} alt={alt} className="w-full h-full object-cover object-top" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-2xl">🔍</span>
        </div>
      </button>

      {expanded && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-reveal"
          onClick={() => setExpanded(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
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
