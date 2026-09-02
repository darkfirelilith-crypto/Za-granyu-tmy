"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { ParchmentCard } from "@/components/fantasy/ui";
import { ZoomIn, ZoomOut, Maximize, Move } from "lucide-react";

/**
 * World map image viewer with zoom/pan.
 * The image is loaded from SiteContent (key: "world_map_image").
 *
 * KEY: zoom changes the ACTUAL width/height of the <img> element (in pixels),
 * NOT a CSS transform. This forces the browser to re-render from the source
 * image at every zoom level — no bilinear upscaling blur.
 */

export function MapImage({ className }: { className?: string } = {}) {
  const { data } = useQuery<any>({
    queryKey: ["site-content"],
    queryFn: () => fetch("/api/content").then((r) => r.json()).catch(() => []),
  });
  const mapContent = (Array.isArray(data) ? data : []).find((c: any) => c.key === "world_map_image");
  const imageSrc = mapContent?.image || null;

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  const imgSizeRef = useRef(imgSize);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { panRef.current = pan; }, [pan]);
  useEffect(() => { imgSizeRef.current = imgSize; }, [imgSize]);

  const MIN_ZOOM = 0.1;
  const MAX_ZOOM = 4;
  const clampZoom = (z: number) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));

  // When image loads, capture native dimensions and set zoom so it fits container width
  const onImgLoad = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    setImgSize({ w: nw, h: nh });
    // Fit to container width at zoom=1 (image shows at native size, user pans to see all)
    // If image is wider than container, start at zoom that fits width
    const container = containerRef.current;
    if (container && nw > 0) {
      const cw = container.clientWidth;
      const fitZoom = cw / nw;
      setZoom(fitZoom);
      setPan({ x: 0, y: 0 });
    }
  }, []);

  const resetView = useCallback(() => {
    const img = imgRef.current;
    const container = containerRef.current;
    if (img && container && img.naturalWidth > 0) {
      const fitZoom = container.clientWidth / img.naturalWidth;
      setZoom(fitZoom);
    } else {
      setZoom(1);
    }
    setPan({ x: 0, y: 0 });
  }, []);

  // Native wheel listener — preventDefault stops page scroll
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const curZoom = zoomRef.current;
      const curPan = panRef.current;
      const delta = e.deltaY > 0 ? -0.12 : 0.12;
      const newZoom = clampZoom(curZoom + delta * curZoom);
      if (newZoom === curZoom) return;
      // Zoom toward cursor
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const ratio = newZoom / curZoom;
      setPan({
        x: cx - (cx - curPan.x) * ratio,
        y: cy - (cy - curPan.y) * ratio,
      });
      setZoom(newZoom);
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  // Drag to pan — always enabled (even at fit-zoom, since image may be larger)
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  }, [pan]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: dragStart.current.panX + (e.clientX - dragStart.current.x),
      y: dragStart.current.panY + (e.clientY - dragStart.current.y),
    });
  }, [isDragging]);

  const onMouseUp = useCallback(() => setIsDragging(false), []);

  // Touch support
  const touchState = useRef<{ dist: number; x: number; y: number; panX: number; panY: number } | null>(null);
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchState.current = { dist: 0, x: e.touches[0].clientX, y: e.touches[0].clientY, panX: pan.x, panY: pan.y };
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchState.current = { dist: Math.hypot(dx, dy), x: (e.touches[0].clientX + e.touches[1].clientX) / 2, y: (e.touches[0].clientY + e.touches[1].clientY) / 2, panX: pan.x, panY: pan.y };
    }
  }, [pan]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchState.current) return;
    if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const newDist = Math.hypot(dx, dy);
      const ratio = newDist / (touchState.current.dist || 1);
      setZoom(clampZoom(zoom * ratio));
    } else if (e.touches.length === 1) {
      setPan({
        x: touchState.current.panX + (e.touches[0].clientX - touchState.current.x),
        y: touchState.current.panY + (e.touches[0].clientY - touchState.current.y),
      });
    }
  }, [zoom]);

  const onTouchEnd = useCallback(() => { touchState.current = null; }, []);

  if (!imageSrc) {
    return (
      <ParchmentCard className={`text-center py-12 ${className ?? ""}`}>
        <Move className="w-10 h-10 text-gold/40 mx-auto mb-3" />
        <p className="font-[family-name:var(--font-garamond)] italic text-lg mb-1">Карта мира не загружена</p>
        <p className="text-sm text-foreground/60">
          Божество может загрузить карту в Чертоге Божества → Контент страниц → Карта мира.
        </p>
      </ParchmentCard>
    );
  }

  // Calculate actual pixel size: native dimensions × zoom
  // This is the KEY change — we set width/height in px, not transform: scale()
  const renderW = imgSize ? Math.round(imgSize.w * zoom) : undefined;
  const renderH = imgSize ? Math.round(imgSize.h * zoom) : undefined;

  return (
    <ParchmentCard className={`p-2 md:p-3 ${className ?? ""}`}>
      <div
        ref={containerRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="relative w-full overflow-hidden rounded-lg bg-parchment-dark/20 select-none"
        style={{
          height: "70vh",
          cursor: isDragging ? "grabbing" : "grab",
          touchAction: "none",
        }}
      >
        {/*
          Image with ACTUAL pixel dimensions (width/height in px, not transform: scale).
          The browser renders from the source image at every zoom level —
          no bilinear upscaling, text stays sharp.
          Pan via translate (doesn't affect rendering quality).
        */}
        <img
          ref={imgRef}
          src={imageSrc}
          alt="Карта мира"
          draggable={false}
          onLoad={onImgLoad}
          className="absolute top-1/2 left-1/2"
          style={{
            width: renderW ? `${renderW}px` : "auto",
            height: renderH ? `${renderH}px` : "auto",
            maxWidth: "none",
            maxHeight: "none",
            transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px)`,
            transition: isDragging ? "none" : "width 0.15s ease-out, height 0.15s ease-out, transform 0.15s ease-out",
          }}
        />

        {/* Zoom controls — bottom right */}
        <div className="absolute bottom-3 right-3 flex flex-col gap-1.5 z-10">
          <button
            onClick={() => setZoom(z => clampZoom(z * 1.3))}
            className="w-9 h-9 rounded-md bg-parchment-dark/70 border border-gold/30 text-gold hover:bg-gold/10 hover:border-gold/60 transition-all flex items-center justify-center backdrop-blur-sm"
            aria-label="Приблизить"
            title="Приблизить"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom(z => clampZoom(z / 1.3))}
            className="w-9 h-9 rounded-md bg-parchment-dark/70 border border-gold/30 text-gold hover:bg-gold/10 hover:border-gold/60 transition-all flex items-center justify-center backdrop-blur-sm"
            aria-label="Отдалить"
            title="Отдалить"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={resetView}
            className="w-9 h-9 rounded-md bg-parchment-dark/70 border border-gold/30 text-gold hover:bg-gold/10 hover:border-gold/60 transition-all flex items-center justify-center backdrop-blur-sm"
            aria-label="Сбросить вид"
            title="Сбросить вид"
          >
            <Maximize className="w-4 h-4" />
          </button>
        </div>

        {/* Zoom level indicator — top left */}
        {imgSize && (
          <div className="absolute top-3 left-3 px-2 py-1 rounded-md bg-parchment-dark/70 border border-gold/30 text-gold/80 text-xs font-[family-name:var(--font-cinzel)] backdrop-blur-sm">
            {Math.round(zoom * 100)}%
          </div>
        )}

        {/* Drag hint */}
        {!isDragging && (
          <div className="absolute top-3 right-3 px-2 py-1 rounded-md bg-parchment-dark/70 border border-gold/20 text-foreground/50 text-[10px] italic backdrop-blur-sm pointer-events-none">
            Тяни, чтобы двигать · колесо — зум
          </div>
        )}
      </div>
    </ParchmentCard>
  );
}
