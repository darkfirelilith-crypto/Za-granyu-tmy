"use client";

import { cn } from "@/lib/utils";

interface OrnamentTitleProps {
  children: React.ReactNode;
  className?: string;
  flourish?: string;
  size?: "sm" | "md" | "lg" | "xl";
  /** When true, renders a non-heading <div> instead of <h2>. Use this when a
   *  semantic heading is already provided elsewhere (e.g. DialogTitle) to
   *  avoid duplicate h2s in the a11y tree. */
  decorative?: boolean;
}

/** Decorative title with gold flourishes on each side.
 *  Renders an <h2> by default; pass `decorative` to render a styled <div> instead. */
export function OrnamentTitle({
  children,
  className,
  flourish = "❦",
  size = "md",
  decorative = false,
}: OrnamentTitleProps) {
  const sizes = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-4xl",
    xl: "text-5xl md:text-6xl",
  };
  const innerCls = cn(
    "font-[family-name:var(--font-cinzel)] text-gold text-center tracking-wide",
    sizes[size]
  );
  return (
    <div className={cn("flex items-center justify-center gap-4", className)}>
      <span
        className="text-gold opacity-70 text-xl md:text-2xl animate-flicker"
        aria-hidden
      >
        {flourish}
      </span>
      {decorative ? (
        <div className={innerCls}>{children}</div>
      ) : (
        <h2 className={innerCls}>{children}</h2>
      )}
      <span
        className="text-gold opacity-70 text-xl md:text-2xl animate-flicker"
        aria-hidden
      >
        {flourish}
      </span>
    </div>
  );
}
