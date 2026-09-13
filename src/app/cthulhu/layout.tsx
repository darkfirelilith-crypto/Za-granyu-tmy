import type { Metadata } from "next";
import "./coc.css";
import { cocDisplay, cocBody, cocMono } from "./fonts";
import { UniverseFade } from "@/components/coc/portal-transition";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Зов Ктулху — Досье сыщика",
  description:
    "Интерактивный лист персонажа для НРИ «Зов Ктулху»: характеристики, навыки, рассудок, снаряжение и заметки по сюжету. Другая вселенная — другие правила.",
  robots: { index: false },
};

export default function CthulhuLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`coc-root ${cocDisplay.variable} ${cocBody.variable} ${cocMono.variable}`}
    >
      {children}
      <div className="coc-vignette" aria-hidden="true" />
      <UniverseFade />
      <Toaster position="bottom-center" theme="dark" />
    </div>
  );
}
