"use client";

import { cn } from "@/lib/utils";

interface OrnamentTitleProps {
  children: React.ReactNode;
  className?: string;
  flourish?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

/** Decorative title with gold flourishes on each side */
export function OrnamentTitle({
  children,
  className,
  flourish = "❦",
  size = "md",
}: OrnamentTitleProps) {
  const sizes = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-4xl",
    xl: "text-5xl md:text-6xl",
  };
  return (
    <div className={cn("flex items-center justify-center gap-4", className)}>
      <span
        className="text-gold opacity-70 text-xl md:text-2xl animate-flicker"
        aria-hidden
      >
        {flourish}
      </span>
      <h2
        className={cn(
          "font-[family-name:var(--font-cinzel)] text-gold text-center tracking-wide",
          sizes[size]
        )}
      >
        {children}
      </h2>
      <span
        className="text-gold opacity-70 text-xl md:text-2xl animate-flicker"
        aria-hidden
      >
        {flourish}
      </span>
    </div>
  );
}
