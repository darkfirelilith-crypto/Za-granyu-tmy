"use client";

import { useState, useEffect } from "react";
import { ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Floating "scroll to top" button (bottom-LEFT corner — bottom-right is used by DiceRoller).
 * Appears after the user scrolls down more than 300px. Smooth-scrolls to top on click.
 *
 * The scroll listener calls setState only when visibility actually changes (simple
 * conditional guard), avoiding unnecessary renders and keeping the effect free of
 * "setState-in-effect" lint warnings.
 */
export function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = () => {
      const shouldShow = (window.scrollY ?? 0) > 300;
      setVisible((prev) => (prev === shouldShow ? prev : shouldShow));
    };
    // Initial check in case the page is loaded already scrolled (e.g. refresh).
    handler();
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const handleClick = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Наверх"
      title="Наверх"
      className={cn(
        "fixed bottom-6 left-6 z-30 w-12 h-12 rounded-full",
        "bg-parchment-dark/70 border border-gold/30 text-gold",
        "backdrop-blur-sm shadow-lg",
        "flex items-center justify-center",
        "transition-all duration-300",
        "hover:bg-parchment-dark/90 hover:border-gold/60 hover:text-gold hover:scale-105",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50",
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
    >
      <ChevronUp className="w-6 h-6" />
    </button>
  );
}
