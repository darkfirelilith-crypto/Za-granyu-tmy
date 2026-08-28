"use client";

import { cn } from "@/lib/utils";

/** An ornate SVG flourish divider — golden filigree with a central gem. */
export function FlourishDivider({
  className,
  gem = "diamond",
}: {
  className?: string;
  gem?: "diamond" | "circle" | "star" | "none";
}) {
  return (
    <div className={cn("flex items-center justify-center gap-2 py-1", className)} aria-hidden>
      <svg width="120" height="20" viewBox="0 0 120 20" className="flourish-stroke overflow-visible">
        <path
          d="M2 10 Q 20 4, 40 10 T 78 10"
          strokeWidth="1"
          className="ink-draw"
          style={{ animationDuration: "1.8s" }}
        />
        <circle cx="2" cy="10" r="1.5" fill="oklch(0.72 0.13 75 / 0.5)" stroke="none" />
      </svg>
      <span className="text-gold animate-flicker text-base leading-none">
        {gem === "diamond" && "◆"}
        {gem === "circle" && "●"}
        {gem === "star" && "✦"}
        {gem === "none" && "·"}
      </span>
      <svg width="120" height="20" viewBox="0 0 120 20" className="flourish-stroke overflow-visible">
        <path
          d="M118 10 Q 100 4, 80 10 T 42 10"
          strokeWidth="1"
          className="ink-draw"
          style={{ animationDuration: "1.8s" }}
        />
        <circle cx="118" cy="10" r="1.5" fill="oklch(0.72 0.13 75 / 0.5)" stroke="none" />
      </svg>
    </div>
  );
}

/** A small decorative corner ornament for cards. */
export function CornerFlourish({ position = "all" }: { position?: "tl" | "br" | "all" }) {
  return (
    <>
      {(position === "tl" || position === "all") && (
        <svg
          className="absolute top-1 left-1 opacity-50 pointer-events-none"
          width="28" height="28" viewBox="0 0 28 28" fill="none"
          aria-hidden
        >
          <path d="M2 2 L2 12 M2 2 L12 2" stroke="oklch(0.65 0.13 75 / 0.5)" strokeWidth="1" />
          <path d="M2 2 Q 8 4, 10 10" stroke="oklch(0.65 0.13 75 / 0.35)" strokeWidth="0.7" fill="none" />
        </svg>
      )}
      {(position === "br" || position === "all") && (
        <svg
          className="absolute bottom-1 right-1 opacity-50 pointer-events-none rotate-180"
          width="28" height="28" viewBox="0 0 28 28" fill="none"
          aria-hidden
        >
          <path d="M2 2 L2 12 M2 2 L12 2" stroke="oklch(0.65 0.13 75 / 0.5)" strokeWidth="1" />
          <path d="M2 2 Q 8 4, 10 10" stroke="oklch(0.65 0.13 75 / 0.35)" strokeWidth="0.7" fill="none" />
        </svg>
      )}
    </>
  );
}
