import { Forum, PT_Serif, PT_Mono } from "next/font/google";

// Шрифты «Зова Ктулху» — отдельная вселенная, не те, что в основном мире:
// Forum — ар-деко заголовки 1920-х, PT Serif — книжный текст, PT Mono — машинопись досье.
export const cocDisplay = Forum({
  variable: "--coc-font-display",
  subsets: ["latin", "cyrillic"],
  weight: "400",
  display: "swap",
});

export const cocBody = PT_Serif({
  variable: "--coc-font-body",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

export const cocMono = PT_Mono({
  variable: "--coc-font-mono",
  subsets: ["latin", "cyrillic"],
  weight: "400",
  display: "swap",
});
