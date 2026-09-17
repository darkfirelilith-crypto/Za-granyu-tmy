import type { Metadata } from "next";
import "./vtm.css";
import { vtmDisplay, vtmBody, vtmLabels } from "./fonts";
import { VtmUniverseFade } from "@/components/vtm/portal-transition";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Вампиры: Маскарад — Лист персонажа",
  description:
    "Интерактивный лист персонажа для НРИ «Вампиры: Маскарад» (5-я редакция): характеристики, навыки, Дисциплины, Сила Крови, Человечность и Голод. Другая вселенная — другие правила.",
  robots: { index: false },
};

export default function VtmLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`vtm-root ${vtmDisplay.variable} ${vtmBody.variable} ${vtmLabels.variable}`}>
      {children}
      <div className="vtm-grain" aria-hidden="true" />
      <div className="vtm-vignette" aria-hidden="true" />
      <VtmUniverseFade />
      <Toaster position="bottom-center" theme="dark" />
    </div>
  );
}
