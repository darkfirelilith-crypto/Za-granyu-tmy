"use client";

import { cn } from "@/lib/utils";
import { ScrollText } from "lucide-react";

/** Wraps a view with a fade+rise enter animation keyed on the view name. */
export function PageTransition({
  viewKey,
  children,
  className,
}: {
  viewKey: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div key={viewKey} className={cn("animate-page-enter", className)}>
      {children}
    </div>
  );
}

/** A themed empty-state for sections with no content. */
export function EmptyPortal({
  message,
  icon,
  hint,
}: {
  message: string;
  icon?: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="empty-portal">
      <div className="empty-portal-glow flex justify-center mb-3">
        {icon ?? <ScrollText className="w-10 h-10 text-gold/50" />}
      </div>
      <p className="font-[family-name:var(--font-garamond)] italic text-lg">{message}</p>
      {hint && <p className="text-sm mt-1 opacity-70">{hint}</p>}
    </div>
  );
}
