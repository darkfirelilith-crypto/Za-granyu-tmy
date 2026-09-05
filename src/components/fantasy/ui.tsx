"use client";

import { cn } from "@/lib/utils";
import { Handshake, Swords, Scale, Coins, Link2, Circle } from "lucide-react";

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

/** World-system categories — stored in English, shown in Russian. */
export const SYSTEM_CAT_LABEL: Record<string, string> = {
  POLITICS: "Политика",
  ECONOMY: "Экономика",
  MILITARY: "Военное дело",
  MAGIC: "Магия",
  RELIGION: "Религия",
  LAW: "Закон",
};

/** Country-to-country relation types. */
export const RELATION_TYPE_LABEL: Record<string, string> = {
  ally: "Союз",
  enemy: "Вражда",
  neutral: "Нейтралитет",
  trade: "Торговля",
  vassal: "Вассал",
};

/** Deity alignment. */
export const ALIGNMENT_LABEL: Record<string, string> = {
  good: "Добро",
  neutral: "Нейтралитет",
  evil: "Зло",
};

/** Grimoire chapter categories — stored in English, shown in Russian. */
export const GRIMOIRE_CAT_LABEL: Record<string, string> = {
  SECRETS: "Тайны",
  RITUALS: "Ритуалы",
  PROPHECY: "Пророчества",
  HISTORY: "История",
  BEASTIARY: "Бестиарий",
};

/** The database stores the enum in English; the interface speaks Russian. */
export const RARITY_LABEL: Record<string, string> = {
  COMMON: "Обычное",
  RARE: "Редкое",
  EPIC: "Эпическое",
  LEGENDARY: "Легендарное",
  MYTHIC: "Мифическое",
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
      {RARITY_LABEL[rarity] ?? rarity}
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

export const DIFF_LABEL: Record<string, string> = {
  TRIVIAL: "Пустяковое",
  EASY: "Лёгкое",
  MEDIUM: "Обычное",
  HARD: "Трудное",
  DEADLY: "Смертельное",
};

export function DifficultyBadge({ difficulty }: { difficulty: string }) {
  return (
    <span
      className={cn(
        "inline-block px-2 py-0.5 rounded border border-current/30 text-xs font-[family-name:var(--font-cinzel)] uppercase tracking-wider",
        DIFF_CLASS[difficulty] ?? "diff-medium"
      )}
    >
      {DIFF_LABEL[difficulty] ?? difficulty}
    </span>
  );
}

/* Relation tones are picked for parchment: the old `text-*-400` shades were
   chosen for a dark backdrop and washed out on the light cards. */
const RELATION_META: Record<string, { color: string; icon: typeof Handshake }> = {
  ally: { color: "text-emerald-800", icon: Handshake },
  enemy: { color: "text-red-800", icon: Swords },
  neutral: { color: "text-stone-700", icon: Scale },
  trade: { color: "text-amber-800", icon: Coins },
  vassal: { color: "text-violet-800", icon: Link2 },
};

export function RelationBadge({ type }: { type: string }) {
  const meta = RELATION_META[type] ?? { color: "text-stone-700", icon: Circle };
  const label = RELATION_TYPE_LABEL[type] ?? type;
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-current/25 bg-current/5",
        "text-sm font-[family-name:var(--font-cinzel)]",
        meta.color
      )}
    >
      <Icon className="w-4 h-4 shrink-0" aria-hidden />
      {label}
    </span>
  );
}
