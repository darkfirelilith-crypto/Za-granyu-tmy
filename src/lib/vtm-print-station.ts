// ============================================================
// ОБЩИЙ ПЕЧАТНЫЙ СТАН (раунд 47)
// Самодостаточный HTML-документ уходит в скрытый iframe, браузер
// открывает диалог печати («Сохранить как PDF»). Один механизм для
// «Кровавой нити» (раунд 46) и «Досье для стола» (раунд 47) —
// единый стиль печатной книги без зависимостей от темы сайта.
// Клиентская утилита: зовётся только из обработчиков клика.
// ============================================================

import { toast } from "sonner";

export interface PrintStationOptions {
  /** Что встаёт на стан — для тостов: «нить», «досье»… */
  subject?: string;
  /** Подсказка в тосте (по умолчанию — «Сохранить как PDF»). */
  hint?: string;
}

/** Верстает html в скрытом iframe и открывает диалог печати. False — стан заклинило. */
export function printHtmlViaIframe(html: string, opts: PrintStationOptions = {}): boolean {
  const subject = opts.subject || "документ";
  try {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.opacity = "0";
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) {
      iframe.remove();
      toast.error("Перо дрогнуло", { description: "Браузер не пустил печатный стан — попробуй ещё раз." });
      return false;
    }
    doc.open();
    doc.write(html);
    doc.close();
    const win = iframe.contentWindow!;
    win.addEventListener(
      "afterprint",
      () => window.setTimeout(() => iframe.remove(), 500),
      { once: true },
    );
    window.setTimeout(() => {
      try {
        win.focus();
        win.print();
      } catch {
        iframe.remove();
        toast.error("Перо дрогнуло", { description: "Печатный стан заклинило — попробуй ещё раз." });
      } finally {
        // страховка: даже без afterprint iframe не переживёт минуту
        window.setTimeout(() => iframe.remove(), 60000);
      }
    }, 250);
    toast.info(`${subject[0]?.toUpperCase() || "Д"}${subject.slice(1)} на печатном стане`, {
      description: opts.hint || "В диалоге печати выбери «Сохранить как PDF» — бумага запомнит ночь.",
    });
    return true;
  } catch {
    toast.error("Перо дрогнуло", { description: `Не удалось сверстать печатный ${subject}.` });
    return false;
  }
}
