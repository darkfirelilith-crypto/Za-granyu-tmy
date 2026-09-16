"use client";

// ============================================================
// ДИАЛОГ «ВОССТАНОВИТЬ» — два пути в прошлое:
//  1) JSON-файл листа (полная замена);
//  2) Markdown-«Сводка Сородича» из Obsidian — разбор и вливание
//     найденных полей в текущий лист (с превью и предупреждениями).
// Изолированный компонент VtM-вселенной.
// ============================================================

import { useRef, useState } from "react";
import { toast } from "sonner";
import { MdParseResult, parseSummaryMarkdown } from "@/lib/vtm-md-import";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Полная замена листа из JSON-файла (старый путь «⇧ Восстановить»). */
  onJsonFile: (file: File) => void;
  /** Вливание разобранных полей Markdown в текущий лист. */
  onApplyMarkdown: (result: MdParseResult) => void;
}

type Mode = "json" | "md";

export function VtmImportDialog({ open, onClose, onJsonFile, onApplyMarkdown }: Props) {
  const [mode, setMode] = useState<Mode>("json");
  const [mdText, setMdText] = useState("");
  const [parsed, setParsed] = useState<MdParseResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const foundLabel: Record<string, string> = {
    "имя": "имя",
    "клан": "клан",
    "секта": "секта",
    "поколение": "поколение",
    "стиль охоты": "стиль охоты",
    "концепция": "концепция",
    "хроника": "хроника",
    "сир": "сир",
    "Голод": "Голод",
    "уроны Здоровья": "раны Здоровья",
    "уроны Воли": "раны Воли",
    "Человечность": "Человечность",
    "резонанс": "резонанс",
    "опыт": "опыт",
    "счётчик ночей": "счётчик ночей",
    "характеристики": "характеристики",
    "навыки": "навыки",
    "Дисциплины": "Дисциплины",
    "достоинства и недостатки": "достоинства и недостатки",
    "листоги": "листоги (Истории)",
    "Диаблери": "Диаблери",
    "Цель": "Цель",
    "Желание": "Желание",
    "принципы": "принципы",
    "опоры": "опоры",
    "убежище": "убежище",
    "средства": "средства",
    "имущество": "имущество",
    "записи журнала": "записи журнала",
  };

  if (!open) return null;

  const doParse = () => {
    const text = mdText.trim();
    if (!text) {
      toast.error("Свиток пуст", { description: "Вставь Markdown-сводку между пунктирами." });
      return;
    }
    const result = parseSummaryMarkdown(text);
    setParsed(result);
    if (result.found.length === 0) {
      toast.error("Кровь не узнала свиток", { description: "Ни одно поле не опознано." });
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

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (!/\.json$/i.test(file.name) && file.type !== "application/json") {
      toast.error("Это не JSON-лист", { description: "Нужен файл «vtm-*.json» из кнопки «Копия»." });
      return;
    }
    onJsonFile(file);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-3 md:p-6 overflow-y-auto vtm-scroll"
      style={{ background: "rgba(0,0,0,0.85)" }}
      role="dialog"
      aria-modal="true"
      aria-label="Восстановить лист"
    >
      <div className="vtm-import-dlg w-full max-w-xl my-4">
        <div className="vtm-import-head">
          <span className="vtm-stamp">Обратный путь</span>
          <h2 className="vtm-display text-lg text-[#d9c7b6] mt-2">Восстановить Сородича</h2>
          <p className="vtm-hint mt-1">Из файла-архива — полностью; из Markdown — влить найденное поверх текущего листа.</p>
          <button onClick={onClose} className="vtm-pstudio-close" aria-label="Закрыть диалог">✕</button>
        </div>

        {/* Переключатель путей */}
        <div className="vtm-import-tabs" role="tablist" aria-label="Способ восстановления">
          <button
            role="tab"
            aria-selected={mode === "json"}
            className={`vtm-import-tab ${mode === "json" ? "active" : ""}`}
            onClick={() => setMode("json")}
          >
            ⇧ Файл (JSON)
          </button>
          <button
            role="tab"
            aria-selected={mode === "md"}
            className={`vtm-import-tab ${mode === "md" ? "active" : ""}`}
            onClick={() => { setMode("md"); setParsed(null); }}
          >
            Ⓜ Markdown (Obsidian)
          </button>
        </div>

        <div className="p-4 md:p-5">
          {mode === "json" ? (
            <div
              className={`vtm-import-drop ${dragOver ? "over" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                handleFile(e.dataTransfer.files?.[0]);
              }}
            >
              <span className="text-3xl opacity-50" aria-hidden>📜</span>
              <p className="vtm-hint text-center max-w-xs">
                Перетащи сюда файл листа или выбери вручную. <strong>Текущие данные будут заменены целиком.</strong>
              </p>
              <button className="vtm-btn vtm-btn-blood" onClick={() => fileRef.current?.click()}>
                Выбрать файл
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </div>
          ) : (
            <div className="space-y-3">
              <p className="vtm-hint">
                Вставь «Сводку Сородича» (кнопка <span className="vtm-btn-md-chip">Ⓜ МД</span> копирует её в буфер).
                Лист примет: имя, клан, секту, поколение, охоту, характеристики, навыки, Дисциплины, достоинства,
                треки, убежище, имущество и до 5 записей журнала. Портрет и предыстория остаются при Сородиче.
              </p>
              <textarea
                value={mdText}
                onChange={(e) => { setMdText(e.target.value.slice(0, 30000)); setParsed(null); }}
                className="vtm-import-md"
                placeholder="# 🩸 Имя Сородича&#10;> [!info] ⛧ Клан · Камарилья · 12-е поколение · Сила Крови 1&#10;## Кровь и тело&#10;| Голод | ◔○○○○ (1/5) |&#10;…"
                aria-label="Markdown-сводка Сородича"
                rows={9}
                spellCheck={false}
              />
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="vtm-hint !text-[0.66rem]">{mdText.length}/30000</span>
                <div className="flex gap-2">
                  {parsed && (
                    <button className="vtm-btn vtm-btn-ghost" onClick={() => setParsed(null)}>
                      ← Другой свиток
                    </button>
                  )}
                  <button className="vtm-btn vtm-btn-blood" onClick={doParse} disabled={!mdText.trim()}>
                    🔍 Прочесть кровь свитка
                  </button>
                </div>
              </div>

              {/* Превью разбора */}
              {parsed && (
                <div className="vtm-import-preview">
                  {parsed.found.length > 0 ? (
                    <>
                      <p className="vtm-import-preview-head">Кровь узнала в свитке:</p>
                      <div className="vtm-import-chips">
                        {parsed.found.map((f) => (
                          <span key={f} className="vtm-import-chip">{foundLabel[f] || f}</span>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="vtm-import-warn">Ни одно поле не опознано — вливать нечего.</p>
                  )}

                  {parsed.unknown.length > 0 && (
                    <>
                      <p className="vtm-import-preview-head mt-3">Не из справочников (войдут как «редкие»):</p>
                      <div className="vtm-import-chips">
                        {parsed.unknown.map((u) => (
                          <span key={u} className="vtm-import-chip unknown">{u}</span>
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
                    ✓ Влить в лист ({parsed.found.length})
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
