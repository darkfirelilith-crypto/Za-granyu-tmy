"use client";

// ============================================================
// ДИАЛОГ «ВОССТАНОВИТЬ ИЗ OBSIDIAN» для Гароу — разбор «Сводки Гароу»
// (Ⓜ МД) и вливание найденных полей в текущий лист W5.
// Изолированный компонент VtM-вселенной; стили — общие vtm-import-*.
// ============================================================

import { useState } from "react";
import { toast } from "sonner";
import { W5MdParseResult, parseW5SummaryMarkdown } from "@/lib/vtm-w5-md-import";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Вливание разобранных полей Markdown в текущий лист Гароу. */
  onApplyMarkdown: (result: W5MdParseResult) => void;
}

const FOUND_LABELS: Record<string, string> = {
  "имя": "имя",
  "племя": "племя",
  "ауспиция": "ауспиция",
  "порода": "порода",
  "стая": "стая",
  "концепция": "концепция",
  "тотем": "тотем",
  "хроника": "хроника",
  "облик дня": "облик дня",
  "цитата": "цитата",
  "Ярость": "Ярость",
  "раны Здоровья": "раны Здоровья",
  "урон Воли": "урон Воли",
  "опыт": "опыт",
  "Слава": "Слава (3 чипа)",
  "характеристики": "девять лун",
  "навыки": "навыки",
  "Дары": "Дары",
  "Обряды": "Обряды",
  "стремления": "стремления",
  "касания": "касания",
  "снаряжение": "снаряжение",
  "лунный дневник": "лунный дневник",
};

export function W5ImportDialog({ open, onClose, onApplyMarkdown }: Props) {
  const [mdText, setMdText] = useState("");
  const [parsed, setParsed] = useState<W5MdParseResult | null>(null);

  if (!open) return null;

  const doParse = () => {
    const text = mdText.trim();
    if (!text) {
      toast.error("Свиток пуст", { description: "Вставь «Сводку Гароу» — её копирует кнопка Ⓜ МД." });
      return;
    }
    const result = parseW5SummaryMarkdown(text);
    setParsed(result);
    if (result.found.length === 0) {
      toast.error("Луна не узнала свиток", { description: "Ни одно поле не опознано." });
    } else {
      toast.success(`Опознано полей: ${result.found.length}`, {
        description: "Проверь список и вливай — лишнее не тронем.",
      });
    }
  };

  const applyMd = () => {
    if (!parsed || parsed.found.length === 0) return;
    onApplyMarkdown(parsed);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-3 md:p-6 overflow-y-auto vtm-scroll"
      style={{ background: "rgba(0,0,0,0.85)" }}
      role="dialog"
      aria-modal="true"
      aria-label="Восстановить лист Гароу из Markdown"
    >
      <div className="vtm-import-dlg w-full max-w-2xl my-4">
        <div className="vtm-import-head">
          <span className="vtm-stamp vtm-w5-stamp">Обратный путь волка</span>
          <h2 className="vtm-display text-lg text-[#d9c7b6] mt-2">Восстановить Гароу из Markdown</h2>
          <p className="vtm-hint mt-1">
            Вставь «Сводку Гароу» — найденное вольётся поверх текущего листа; остальное не тронется.
          </p>
          <button onClick={onClose} className="vtm-pstudio-close" aria-label="Закрыть диалог">✕</button>
        </div>

        <div className="p-4 md:p-5 space-y-3">
          <p className="vtm-hint">
            Сводку копирует кнопка <span className="vtm-btn-md-chip">Ⓜ МД</span> в шапке листа Гароу.
            Лист примет: имя, племя, ауспицию, породу, стаю, тотем, хронику, концепцию, облик дня,
            цитату, витальные шкалы, Славу, девять лун, навыки, Дары, Обряды, стремления, касания,
            снаряжение, журнал опыта и до 12 записей дневника. Портрет остаётся при Гароу.
          </p>
          <textarea
            value={mdText}
            onChange={(e) => { setMdText(e.target.value.slice(0, 30000)); setParsed(null); }}
            className="vtm-import-md"
            placeholder={"# 🐺 Имя Гароу\n> [!info] 🐺 Племя · 🌙 Ауспиция · Порода · Стая: **«Крюк»**\n> Облик дня: **Кринос**\n## 🌗 Витальные шкалы\n| Ярость | **2/5** | ▣ □ □ □ □ |\n…"}
            aria-label="Markdown-сводка Гароу"
            rows={9}
            spellCheck={false}
          />
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="vtm-hint !text-[0.73rem]">{mdText.length}/30000</span>
            <div className="flex gap-2">
              {parsed && (
                <button className="vtm-btn vtm-btn-ghost" onClick={() => setParsed(null)}>
                  ← Другой свиток
                </button>
              )}
              <button className="vtm-btn vtm-btn-blood" onClick={doParse} disabled={!mdText.trim()}>
                🔍 Прочесть луну свитка
              </button>
            </div>
          </div>

          {/* Превью разбора */}
          {parsed && (
            <div className="vtm-import-preview">
              {parsed.found.length > 0 ? (
                <>
                  <p className="vtm-import-preview-head">Луна узнала в свитке:</p>
                  <div className="vtm-import-chips">
                    {parsed.found.map((f) => (
                      <span key={f} className="vtm-import-chip">{FOUND_LABELS[f] || f}</span>
                    ))}
                  </div>
                </>
              ) : (
                <p className="vtm-import-warn">Ни одно поле не опознано — вливать нечего.</p>
              )}

              {parsed.unknown.length > 0 && (
                <>
                  <p className="vtm-import-preview-head mt-3">Не из справочников (пропущены):</p>
                  <div className="vtm-import-chips">
                    {parsed.unknown.map((u, i) => (
                      <span key={`${u}-${i}`} className="vtm-import-chip unknown">{u}</span>
                    ))}
                  </div>
                </>
              )}

              {parsed.warnings.length > 0 && (
                <ul className="vtm-import-warn mt-3">
                  {parsed.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              )}

              <button
                className="vtm-btn vtm-btn-blood w-full justify-center py-2.5 mt-4"
                onClick={applyMd}
                disabled={parsed.found.length === 0}
              >
                ✓ Влить в лист Гароу ({parsed.found.length})
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
