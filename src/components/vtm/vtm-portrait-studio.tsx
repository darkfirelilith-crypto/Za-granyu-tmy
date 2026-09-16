"use client";

// ============================================================
// ПОРТРЕТНАЯ СТУДИЯ «МАСКАРАДА» — кадрирование своего фото
// перед вклейкой в досье: зум колёсиком и слайдером, перетаскивание,
// повороты на 90°, живой предпросмотр в готическом окладе 7:9.
// Изолированный компонент VtM-вселенной.
// ============================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const FRAME_W = 280;           // ширина предпросмотра (пиксели CSS × dpr учитываем отдельно)
const FRAME_H = 360;           // 7:9 — как оклад портрета в досье
const OUT_W = 480;             // ширина итогового портрета
const OUT_H = 617;             // 480 × 9/7 ≈ 617
const THUMB_W = 96;
const THUMB_H = 123;
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

interface Props {
  /** dataURL выбранного файла — студия открывается поверх досье */
  imageDataUrl: string | null;
  /** Имя Сородича — подпись в шапке студии */
  characterName?: string;
  /** Портрет, уже вклеенный в досье, — показывается мини-окладом «как сейчас» */
  currentPortrait?: string;
  onApply: (portrait: string, thumb: string) => void;
  onClose: () => void;
}

export function VtmPortraitStudio({ imageDataUrl, characterName, currentPortrait, onApply, onClose }: Props) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0); // 0 | 90 | 180 | 270
  const [pan, setPan] = useState({ x: 0, y: 0 }); // пиксели в системе кадра, зажимаем slack'ом
  const [dragging, setDragging] = useState(false);
  const [working, setWorking] = useState(false);
  // Подсказка «протяни фото»: живёт до первого перетаскивания в этой сессии студии
  const [showDragHint, setShowDragHint] = useState(true);

  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imgReady, setImgReady] = useState(false);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const dragStartRef = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);
  const rotCacheRef = useRef<{ key: number; canvas: HTMLCanvasElement } | null>(null);

  // ── Загрузка исходника ──
  useEffect(() => {
    if (!imageDataUrl) return;
    setImgReady(false);
    rotCacheRef.current = null;
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setImgReady(true);
      setZoom(1);
      setRotation(0);
      setPan({ x: 0, y: 0 });
    };
    img.onerror = () => toast.error("Кровь не распознала изображение");
    img.src = imageDataUrl;
  }, [imageDataUrl]);

  // ── Поворот: кэшируем повёрнутую копию ──
  const getRotatedSource = useCallback((): HTMLCanvasElement | HTMLImageElement | null => {
    const img = imgRef.current;
    if (!img) return null;
    if (rotation === 0) return img;
    const key = rotation;
    if (rotCacheRef.current?.key === key) return rotCacheRef.current.canvas;
    const w = img.width, h = img.height;
    const swap = rotation === 90 || rotation === 270;
    const c = document.createElement("canvas");
    c.width = swap ? h : w;
    c.height = swap ? w : h;
    const ctx = c.getContext("2d");
    if (!ctx) return img;
    ctx.translate(c.width / 2, c.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(img, -w / 2, -h / 2);
    rotCacheRef.current = { key, canvas: c };
    return c;
  }, [rotation]);

  // Геометрия: cover-масштаб и допустимый сдвиг
  const geom = useCallback(() => {
    const src = getRotatedSource();
    if (!src) return null;
    const sw = src.width, sh = src.height;
    const s0 = Math.max(FRAME_W / sw, FRAME_H / sh);
    const scale = s0 * zoom;
    const dw = sw * scale, dh = sh * scale;
    const slackX = Math.max(0, (dw - FRAME_W) / 2);
    const slackY = Math.max(0, (dh - FRAME_H) / 2);
    return { src, dw, dh, slackX, slackY };
  }, [getRotatedSource, zoom]);

  // Зеркало геометрии для clampPan (объявлено до колбэка, обновляется эффектом)
  const geomRef = useRef<ReturnType<typeof geom> | null>(null);

  const clampPan = useCallback((x: number, y: number) => {
    const g = geomRef.current;
    if (!g) return { x: 0, y: 0 };
    return {
      x: Math.max(-g.slackX, Math.min(g.slackX, x)),
      y: Math.max(-g.slackY, Math.min(g.slackY, y)),
    };
  }, []);

  useEffect(() => {
    geomRef.current = geom();
    setPan((p) => clampPan(p.x, p.y));
  }, [geom, clampPan]);

  // ── Отрисовка предпросмотра ──
  useEffect(() => {
    const canvas = previewRef.current;
    const g = geom();
    if (!canvas || !g) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = FRAME_W * dpr;
    canvas.height = FRAME_H * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.fillStyle = "#0a0506";
    ctx.fillRect(0, 0, FRAME_W, FRAME_H);
    const dx = (FRAME_W - g.dw) / 2 + pan.x;
    const dy = (FRAME_H - g.dh) / 2 + pan.y;
    ctx.drawImage(g.src, dx, dy, g.dw, g.dh);
    // виньетка поверх — как на портретах заготовок
    const grad = ctx.createRadialGradient(FRAME_W / 2, FRAME_H / 2, FRAME_H * 0.25, FRAME_W / 2, FRAME_H / 2, FRAME_H * 0.72);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, "rgba(10,3,4,0.55)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, FRAME_W, FRAME_H);
  }, [geom, pan, imgReady]);

  // ── Итоговая отрисовка любого размера по той же геометрии ──
  const renderOutput = useCallback(
    (w: number, h: number, quality: number): string | null => {
      const g = geom();
      if (!g) return null;
      const k = w / FRAME_W; // масштаб кадра → выход
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.fillStyle = "#0a0506";
      ctx.fillRect(0, 0, w, h);
      const dx = (w - g.dw * k) / 2 + pan.x * k;
      const dy = (h - g.dh * k) / 2 + pan.y * k;
      ctx.drawImage(g.src, dx, dy, g.dw * k, g.dh * k);
      // виньетка
      const grad = ctx.createRadialGradient(w / 2, h / 2, h * 0.25, w / 2, h / 2, h * 0.72);
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(1, "rgba(10,3,4,0.55)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      return canvas.toDataURL("image/jpeg", quality);
    },
    [geom, pan]
  );

  const apply = () => {
    if (!imgReady) return;
    setWorking(true);
    try {
      const portrait = renderOutput(OUT_W, OUT_H, 0.85);
      const thumb = renderOutput(THUMB_W, THUMB_H, 0.72);
      if (!portrait || !thumb) throw new Error("не удалось отрисовать портрет");
      onApply(portrait, thumb);
    } catch (e: any) {
      toast.error("Студия споткнулась", { description: e.message });
    } finally {
      setWorking(false);
    }
  };

  // ── Перетаскивание ──
  const onPointerDown = (e: React.PointerEvent) => {
    if (!imgReady) return;
    setShowDragHint(false);
    try {
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    } catch {
      // синтетические/завершившиеся указатели не умеют захват — перетаскивание всё равно работает
    }
    dragStartRef.current = { px: e.clientX, py: e.clientY, ox: pan.x, oy: pan.y };
    setDragging(true);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging || !dragStartRef.current) return;
    const { px, py, ox, oy } = dragStartRef.current;
    const next = clampPan(ox + (e.clientX - px), oy + (e.clientY - py));
    setPan(next);
  };
  const onPointerUp = () => {
    setDragging(false);
    dragStartRef.current = null;
  };

  // ── Колёсико: зум к позиции курсора (упрощённо — просто зум) ──
  const onWheel = (e: React.WheelEvent) => {
    if (!imgReady) return;
    e.preventDefault();
    const dir = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((z) => {
      const nz = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.round((z + dir) * 100) / 100));
      return nz;
    });
  };

  // Клавиатура: стрелки двигают, +/- зум
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!imgReady) return;
    const step = 12;
    if (e.key === "ArrowLeft") { e.preventDefault(); setPan((p) => clampPan(p.x - step, p.y)); }
    else if (e.key === "ArrowRight") { e.preventDefault(); setPan((p) => clampPan(p.x + step, p.y)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setPan((p) => clampPan(p.x, p.y - step)); }
    else if (e.key === "ArrowDown") { e.preventDefault(); setPan((p) => clampPan(p.x, p.y + step)); }
    else if (e.key === "+" || e.key === "=") { e.preventDefault(); setZoom((z) => Math.min(MAX_ZOOM, z + 0.1)); }
    else if (e.key === "-") { e.preventDefault(); setZoom((z) => Math.max(MIN_ZOOM, z - 0.1)); }
    else if (e.key === "Escape") { onClose(); }
    else if (e.key === "Enter") { e.preventDefault(); apply(); }
  };

  if (!imageDataUrl) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 overflow-y-auto vtm-scroll"
      style={{ background: "rgba(0,0,0,0.88)" }}
      role="dialog"
      aria-modal="true"
      aria-label="Портретная студия Маскарада"
      onKeyDown={onKeyDown}
    >
      <div className="vtm-pstudio w-full max-w-lg my-auto" tabIndex={-1}>
        <div className="vtm-pstudio-head">
          <span className="vtm-stamp">Портретная студия</span>
          <h2 className="vtm-display text-lg text-[#d9c7b6] mt-2">
            {characterName ? `Лик: ${characterName}` : "Лик Сородича"}
          </h2>
          <p className="vtm-hint mt-1">
            Тащи фото рукой, крути колёсиком и слайдером — Кровь вырежет оклад сам.
          </p>
          <button onClick={onClose} className="vtm-pstudio-close" aria-label="Закрыть студию">✕</button>
        </div>

        <div className="p-4 md:p-5 space-y-4">
          <div className="flex items-start justify-center gap-4">
            {/* Кадр */}
            <div
              className={`vtm-pstudio-frame ${dragging ? "is-drag" : ""}`}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
              onWheel={onWheel}
            >
              <canvas
                ref={previewRef}
                className="vtm-pstudio-canvas"
                style={{ width: FRAME_W, height: FRAME_H }}
                aria-label="Предпросмотр портрета"
              />
              <span className="vtm-pstudio-corner tl" aria-hidden />
              <span className="vtm-pstudio-corner tr" aria-hidden />
              <span className="vtm-pstudio-corner bl" aria-hidden />
              <span className="vtm-pstudio-corner br" aria-hidden />
              {!imgReady && <span className="vtm-pstudio-loading">проявляем…</span>}
              {imgReady && showDragHint && (
                <span className="vtm-pstudio-draghint" aria-hidden>
                  <span className="vtm-pstudio-draghint-hand">✋</span>
                  протяни фото
                </span>
              )}
            </div>

            {/* Управление поворотом — колонкой справа */}
            <div className="flex flex-col gap-2 pt-2">
              <button
                className="vtm-btn vtm-btn-ghost !px-2.5 !py-1.5 text-sm"
                onClick={() => setRotation((r) => (r + 270) % 360)}
                aria-label="Повернуть против часовой"
                title="Повернуть против часовой"
              >
                ⟲
              </button>
              <button
                className="vtm-btn vtm-btn-ghost !px-2.5 !py-1.5 text-sm"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                aria-label="Повернуть по часовой"
                title="Повернуть по часовой"
              >
                ⟳
              </button>
              <button
                className="vtm-btn vtm-btn-ghost !px-2.5 !py-1.5 text-xs"
                onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); setRotation(0); }}
                aria-label="Сбросить кадр"
                title="Сбросить кадр"
              >
                ⌫
              </button>
            </div>
          </div>

          {/* Зум */}
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <span className="vtm-label text-[0.66rem] text-[#a68d80]">Приближение</span>
              <span className="vtm-label text-[0.66rem] text-[#d6a840]">×{zoom.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="vtm-pstudio-zoom w-full"
              aria-label="Масштаб фото"
            />
          </div>

          {/* Мини-оклад «как вклеено сейчас» — ориентир при повторном кадрировании */}
          {currentPortrait && (
            <div className="vtm-pstudio-ref" role="img" aria-label="Портрет, вклеенный в досье сейчас">
              <img src={currentPortrait} alt="" className="vtm-pstudio-ref-img" />
              <span className="vtm-pstudio-ref-cap">как вклеено сейчас</span>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <button onClick={apply} disabled={!imgReady || working} className="vtm-btn vtm-btn-blood flex-1 justify-center py-2.5">
              ✓ Вклеить портрет
            </button>
            <button onClick={onClose} className="vtm-btn vtm-btn-ghost flex-1 justify-center py-2.5">
              ✕ Сжечь негативы
            </button>
          </div>
          <p className="vtm-hint text-center !text-[0.66rem]">
            Итог: оклад 7:9 с виньеткой · портрет 480px + миниатюра для архива
          </p>
        </div>
      </div>
    </div>
  );
}
