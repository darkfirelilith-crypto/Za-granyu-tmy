"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { ParchmentCard } from "@/components/fantasy/ui";
import { ZoomIn, ZoomOut, Maximize, Move } from "lucide-react";

/**
 * World map image viewer with zoom/pan.
 * The image is loaded from SiteContent (key: "world_map_image") — admin uploads
 * a JPG/PNG via Чертог Божества → Контент страниц → Карта мира.
 * Supports: mouse-wheel zoom, drag-to-pan, zoom in/out/reset buttons.
 */

export function MapImage({ className }: { className?: string } = {}) {
  const { data } = useQuery<any>({
    queryKey: ["site-content"],
    queryFn: () => fetch("/api/content").then((r) => r.json()).catch(() => []),
  });
  const mapContent = (Array.isArray(data) ? data : []).find((c: any) => c.key === "world_map_image");
  const imageSrc = mapContent?.image || null;

  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const MIN_ZOOM = 1;
  const MAX_ZOOM = 6;
  const clampZoom = (z: number) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Wheel zoom (toward cursor)
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.2 : 0.2;
    const newZoom = clampZoom(zoom + delta * zoom);
    if (newZoom === zoom) return;
    // Zoom toward cursor: adjust pan so the point under cursor stays fixed
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const ratio = newZoom / zoom;
      setPan({
        x: cx - (cx - pan.x) * ratio,
        y: cy - (cy - pan.y) * ratio,
      });
    }
    setZoom(newZoom);
  }, [zoom, pan]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  }, [zoom, pan]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: dragStart.current.panX + (e.clientX - dragStart.current.x),
      y: dragStart.current.panY + (e.clientY - dragStart.current.y),
    });
  }, [isDragging]);

  const onMouseUp = useCallback(() => setIsDragging(false), []);

  // Touch support (pinch-zoom + drag)
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

  return (
    <ParchmentCard className={`p-2 md:p-3 ${className ?? ""}`}>
      <div
        ref={containerRef}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="relative w-full overflow-hidden rounded-lg bg-parchment-dark/20 select-none"
        style={{
          aspectRatio: "4 / 3",
          cursor: zoom > 1 ? (isDragging ? "grabbing" : "grab") : "default",
          touchAction: "none",
        }}
      >
        <img
          src={imageSrc}
          alt="Карта мира"
          draggable={false}
          className="absolute top-1/2 left-1/2 max-w-none origin-center"
          style={{
            transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "center",
            transition: isDragging ? "none" : "transform 0.15s ease-out",
            maxWidth: "100%",
            maxHeight: "100%",
            width: "100%",
            height: "100%",
            objectFit: "contain",
          }}
        />

        {/* Zoom controls — bottom right */}
        <div className="absolute bottom-3 right-3 flex flex-col gap-1.5 z-10">
          <button
            onClick={() => setZoom(z => clampZoom(z + 0.5))}
            className="w-9 h-9 rounded-md bg-parchment-dark/70 border border-gold/30 text-gold hover:bg-gold/10 hover:border-gold/60 transition-all flex items-center justify-center backdrop-blur-sm"
            aria-label="Приблизить"
            title="Приблизить"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom(z => clampZoom(z - 0.5))}
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
        {zoom > 1 && (
          <div className="absolute top-3 left-3 px-2 py-1 rounded-md bg-parchment-dark/70 border border-gold/30 text-gold/80 text-xs font-[family-name:var(--font-cinzel)] backdrop-blur-sm">
            {Math.round(zoom * 100)}%
          </div>
        )}

        {/* Drag hint — shows once at zoom > 1 */}
        {zoom > 1 && !isDragging && (
          <div className="absolute top-3 right-3 px-2 py-1 rounded-md bg-parchment-dark/70 border border-gold/20 text-foreground/50 text-[10px] italic backdrop-blur-sm pointer-events-none">
            Тяни, чтобы двигать
          </div>
        )}
      </div>
    </ParchmentCard>
  );
}
