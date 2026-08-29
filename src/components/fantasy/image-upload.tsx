"use client";

import { useRef, useState } from "react";
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
  maxDim = 800,
  aspect = "aspect-square",
  rounded = "rounded-lg",
}: {
  value: string | null;
  onChange: (base64: string | null) => void;
  label?: string;
  className?: string;
  maxDim?: number;
  aspect?: string;
  rounded?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setBusy(true);
    try {
      const base64 = await resizeImage(file, maxDim);
      onChange(base64);
    } catch (e) {
      console.error("image resize failed", e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <label className="parchment-heading text-sm block">{label}</label>
      )}
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "relative shrink-0 overflow-hidden gold-frame bg-parchment-dark/20",
            aspect,
            "w-28",
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
            <div className="w-full h-full flex flex-col items-center justify-center text-parchment-muted/60 gap-1">
              {busy ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <ImagePlus className="w-5 h-5" />
              )}
            </div>
          )}
        </div>
        <div className="flex-1 space-y-2">
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
            id={`img-${label?.replace(/\s/g, "-") ?? "img"}-${maxDim}`}
          />
          <label
            htmlFor={`img-${label?.replace(/\s/g, "-") ?? "img"}-${maxDim}`}
            className="btn-parchment inline-flex items-center gap-1.5 px-3 py-1.5 cursor-pointer text-xs"
          >
            <ImagePlus className="w-3.5 h-3.5" />
            {value ? "Заменить" : "Загрузить"}
          </label>
          <p className="parchment-muted text-xs italic">
            JPG/PNG, будет сжато до {maxDim}px. Хранится в свитке.
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
        // JPEG quality 0.82 keeps file size modest for DB storage
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
