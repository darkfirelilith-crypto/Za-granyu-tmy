import { Prata, Alegreya, Oswald } from "next/font/google";

// Шрифты «Вампиров: Маскарад» — отдельная вселенная, не те, что в основном мире
// и не те, что в архиве Ктулху. Prata — готическая display-антиква, Alegreya —
// книжный текст с характером, Oswald — узкие надписи на этикетках и треках.
export const vtmDisplay = Prata({
  variable: "--vtm-font-display",
  subsets: ["latin", "cyrillic"],
  weight: "400",
  display: "swap",
});

export const vtmBody = Alegreya({
  variable: "--vtm-font-body",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

export const vtmLabels = Oswald({
  variable: "--vtm-font-labels",
  subsets: ["latin", "cyrillic"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});
