"use client";

import { cn } from "@/lib/utils";

/** A parchment-styled card with optional ornamental gold frame */
export function ParchmentCard({
  children,
  className,
  frame = true,
  hover = false,
  as: Comp = "div",
}: {
  children: React.ReactNode;
  className?: string;
  frame?: boolean;
  hover?: boolean;
  as?: React.ElementType;
}) {
  return (
    <Comp
      className={cn(
        "parchment rounded-lg p-5 md:p-6 shadow-xl",
        frame && "gold-frame",
        hover && "gold-frame-hover",
        className
      )}
    >
      {children}
    </Comp>
  );
}

/** Small rune-ring seal containing an icon/emoji */
export function RuneSeal({
  icon,
  size = "md",
  className,
  glow = false,
}: {
  icon: React.ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
  glow?: boolean;
}) {
  const sizes = {
    sm: "w-10 h-10 text-xl",
    md: "w-14 h-14 text-2xl",
    lg: "w-20 h-20 text-4xl",
  };
  return (
    <div
      className={cn(
        "rune-ring flex items-center justify-center shrink-0",
        glow && "animate-magic",
        sizes[size],
        className
      )}
    >
      {icon}
    </div>
  );
}

const RARITY_CLASS: Record<string, string> = {
  COMMON: "rarity-bg-common rarity-common",
  RARE: "rarity-bg-rare rarity-rare",
  EPIC: "rarity-bg-epic rarity-epic",
  LEGENDARY: "rarity-bg-legendary rarity-legendary",
  MYTHIC: "rarity-bg-mythic rarity-mythic",
};

export function RarityBadge({ rarity }: { rarity: string }) {
  const cls = RARITY_CLASS[rarity] ?? RARITY_CLASS.COMMON;
  return (
    <span
      className={cn(
        "inline-block px-2 py-0.5 rounded border text-xs font-[family-name:var(--font-cinzel)] uppercase tracking-wider",
        cls
      )}
    >
      {rarity}
    </span>
  );
}

const DIFF_CLASS: Record<string, string> = {
  TRIVIAL: "diff-trivial",
  EASY: "diff-easy",
  MEDIUM: "diff-medium",
  HARD: "diff-hard",
  DEADLY: "diff-deadly",
};

export function DifficultyBadge({ difficulty }: { difficulty: string }) {
  return (
    <span
      className={cn(
        "inline-block px-2 py-0.5 rounded border border-current/30 text-xs font-[family-name:var(--font-cinzel)] uppercase tracking-wider",
        DIFF_CLASS[difficulty] ?? "diff-medium"
      )}
    >
      {difficulty}
    </span>
  );
}

const RELATION_META: Record<string, { label: string; color: string; icon: string }> = {
  ally: { label: "Союз", color: "text-green-400", icon: "🤝" },
  enemy: { label: "Вражда", color: "text-red-400", icon: "⚔️" },
  neutral: { label: "Нейтралитет", color: "text-zinc-300", icon: "⚖️" },
  trade: { label: "Торговля", color: "text-amber-400", icon: "🪙" },
  vassal: { label: "Вассал", color: "text-purple-400", icon: "🔗" },
};

export function RelationBadge({ type }: { type: string }) {
  const meta = RELATION_META[type] ?? { label: type, color: "text-zinc-300", icon: "•" };
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm font-[family-name:var(--font-cinzel)]", meta.color)}>
      <span>{meta.icon}</span>
      {meta.label}
    </span>
  );
}
