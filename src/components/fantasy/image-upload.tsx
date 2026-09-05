"use client";

import { useId, useRef, useState } from "react";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Image upload field. Reads the chosen file, resizes it client-side to fit
 * within `maxDim` (default 800px), and exports a JPEG base64 string — which
 * is stored directly in the DB (works on Vercel's read-only filesystem).
 */
export function ImageUpload({
  value,
  onChange,
  label,
  className,
  maxDim = 2400,
  aspect = "aspect-square",
  rounded = "rounded-lg",
  previewWidth = "w-28",
}: {
  value: string | null;
  onChange: (base64: string | null) => void;
  label?: string;
  className?: string;
  maxDim?: number;
  aspect?: string;
  rounded?: string;
  /** width of the preview tile — pass "w-full" in narrow columns */
  previewWidth?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  // useId guarantees a unique, stable HTML id even when multiple ImageUpload instances
  // have no label and the same maxDim (prevents duplicate-id collisions where clicking
  // the second label opens the first input).
  const fieldId = `img-${useId()}`;

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    // Reject very large files (>20MB) to avoid crashing the tab on mobile / OOM
    if (file.size > 20 * 1024 * 1024) {
      alert("Файл слишком большой (максимум 20 МБ).");
      return;
    }
    setBusy(true);
    try {
      const base64 = await resizeImage(file, maxDim);
      onChange(base64);
    } catch (e) {
      console.error("image resize failed", e);
      alert("Не удалось обработать изображение. Попробуйте другой файл.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <label className="parchment-heading text-sm block">{label}</label>
      )}
      {/* flex-wrap so the controls drop below the preview in narrow columns
          instead of spilling over whatever sits to the right of the field. */}
      <div className="flex flex-wrap items-start gap-3">
        <div
          className={cn(
            "relative shrink-0 overflow-hidden gold-frame bg-parchment-dark/20",
            aspect,
            previewWidth,
            rounded
          )}
        >
          {value ? (
            <>
              <img src={value} alt="preview" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => onChange(null)}
                className="absolute top-1 right-1 p-1 rounded-full bg-background/80 text-destructive hover:bg-destructive hover:text-white transition-colors"
                aria-label="Убрать изображение"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center parchment-muted opacity-60 gap-1">
              {busy ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <ImagePlus className="w-5 h-5" />
              )}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-[7.5rem] space-y-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
            className="hidden"
            id={fieldId}
          />
          <label
            htmlFor={fieldId}
            className="btn-parchment inline-flex items-center gap-1.5 px-3 py-1.5 cursor-pointer text-xs"
          >
            <ImagePlus className="w-3.5 h-3.5" />
            {value ? "Заменить" : "Загрузить"}
          </label>
          <p className="parchment-muted text-xs italic">
            JPG/PNG, до {maxDim}px. Хранится в свитке.
          </p>
        </div>
      </div>
    </div>
  );
}

/** Resize an image file to fit within maxDim and return a JPEG base64 string. */
function resizeImage(file: File, maxDim: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("no canvas ctx"));
        ctx.drawImage(img, 0, 0, width, height);
        // JPEG quality 0.92 — high quality for readable text on maps
        resolve(canvas.toDataURL("image/jpeg", 0.92));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
