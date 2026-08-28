"use client";

import { cn } from "@/lib/utils";

/** An ornate section crest: SVG shield/diamond with flanking filigree,
 *  used as a decorative heading ornament. */
export function SectionCrest({
  icon,
  className,
  variant = "diamond",
}: {
  icon?: React.ReactNode;
  className?: string;
  variant?: "diamond" | "shield" | "circle";
}) {
  return (
    <div className={cn("flex items-center justify-center gap-3", className)} aria-hidden>
      <FiligreeSide flip={false} />
      <div className="relative">
        {variant === "diamond" && (
          <svg width="44" height="44" viewBox="0 0 44 44" className="overflow-visible">
            <path
              d="M22 4 L40 22 L22 40 L4 22 Z"
              fill="none"
              stroke="oklch(0.72 0.13 75 / 0.55)"
              strokeWidth="1"
              className="ink-draw"
              style={{ animationDuration: "1.6s" }}
            />
            <path
              d="M22 10 L34 22 L22 34 L10 22 Z"
              fill="none"
              stroke="oklch(0.72 0.13 75 / 0.3)"
              strokeWidth="0.7"
            />
            <circle cx="22" cy="22" r="2" fill="oklch(0.78 0.13 85 / 0.6)" />
          </svg>
        )}
        {variant === "shield" && (
          <svg width="40" height="48" viewBox="0 0 40 48" className="overflow-visible">
            <path
              d="M20 4 L34 10 L34 26 Q34 38 20 44 Q6 38 6 26 L6 10 Z"
              fill="none"
              stroke="oklch(0.72 0.13 75 / 0.55)"
              strokeWidth="1"
              className="ink-draw"
              style={{ animationDuration: "1.6s" }}
            />
            <path d="M20 14 L20 34 M12 24 L28 24" stroke="oklch(0.72 0.13 75 / 0.3)" strokeWidth="0.7" />
          </svg>
        )}
        {variant === "circle" && (
          <svg width="44" height="44" viewBox="0 0 44 44" className="overflow-visible">
            <circle cx="22" cy="22" r="18" fill="none" stroke="oklch(0.72 0.13 75 / 0.55)" strokeWidth="1" className="ink-draw" style={{ animationDuration: "1.6s" }} />
            <circle cx="22" cy="22" r="12" fill="none" stroke="oklch(0.72 0.13 75 / 0.3)" strokeWidth="0.7" />
          </svg>
        )}
        {icon && (
          <div className="absolute inset-0 flex items-center justify-center text-gold">
            {icon}
          </div>
        )}
      </div>
      <FiligreeSide flip />
    </div>
  );
}

function FiligreeSide({ flip }: { flip: boolean }) {
  return (
    <svg
      width="100"
      height="20"
      viewBox="0 0 100 20"
      className={cn("flourish-stroke", flip && "scale-x-[-1]")}
    >
      <path
        d="M2 10 Q 25 2, 50 10 Q 70 16, 95 10"
        strokeWidth="1"
        className="ink-draw"
        style={{ animationDuration: "1.8s" }}
      />
      <circle cx="2" cy="10" r="1.5" fill="oklch(0.72 0.13 75 / 0.5)" stroke="none" />
      <circle cx="50" cy="10" r="1.2" fill="oklch(0.72 0.13 75 / 0.4)" stroke="none" />
    </svg>
  );
}
