"use client";

/**
 * SVG-based paper effect overlays for Grimoire pages.
 * Each effect renders a set of semi-transparent SVG shapes (blobs, drops,
 * crystals, scorch marks, gold leaf) scattered across the page in natural
 * random-looking positions. Shapes use organic paths for ink blots and
 * tears, geometric for frost, radial for burns, ornate for gold.
 *
 * Rendered as an absolutely-positioned overlay inside .grimoire-page.
 */

const INK_BLOTS = [
  // Organic blob paths — irregular closed curves like real ink stains
  "M 0 10 C 5 2, 18 0, 25 8 C 32 15, 30 28, 20 32 C 8 36, -2 28, 0 10 Z",
  "M 0 5 C 8 0, 22 2, 28 12 C 34 22, 28 34, 15 36 C 2 38, -4 20, 0 5 Z",
  "M 2 8 C 10 2, 20 4, 26 14 C 32 24, 24 34, 12 32 C 0 30, -2 16, 2 8 Z",
  "M 0 15 C 3 5, 15 0, 22 6 C 30 12, 32 24, 22 30 C 12 36, -2 28, 0 15 Z",
  // Smaller roundish blots
  "M 5 5 C 12 2, 18 6, 18 12 C 18 18, 10 20, 5 16 C 0 12, 0 8, 5 5 Z",
  "M 3 8 C 8 4, 14 6, 14 12 C 14 16, 8 18, 4 15 C 0 12, 0 10, 3 8 Z",
];

const TEAR_DROPS = [
  "M 5 0 C 8 5, 10 12, 5 18 C 0 12, 2 5, 5 0 Z",
  "M 4 0 C 7 6, 9 14, 4 20 C -1 14, 1 6, 4 0 Z",
  "M 6 0 C 10 4, 12 10, 6 16 C 0 10, 2 4, 6 0 Z",
];

const FROST_CRYSTALS = [
  "M 10 0 L 12 8 L 20 10 L 12 12 L 10 20 L 8 12 L 0 10 L 8 8 Z",
  "M 8 0 L 10 6 L 16 8 L 10 10 L 8 16 L 6 10 L 0 8 L 6 6 Z",
  "M 12 0 L 14 6 L 20 8 L 14 10 L 12 16 L 10 10 L 4 8 L 10 6 Z",
];

// Deterministic pseudo-random based on index (so shapes don't jump on re-render)
function rng(seed: number) {
  let h = seed * 9301 + 49297;
  return () => {
    h = (h * 9301 + 49297) % 233280;
    return h / 233280;
  };
}

interface EffectConfig {
  count: number;
  color: string;
  opacity: number;
  paths: string[];
  scaleRange: [number, number];
  seed: number;
}

const EFFECTS: Record<string, EffectConfig> = {
  blood: {
    count: 14,
    color: "oklch(0.32 0.24 25)",
    opacity: 0.65,
    paths: INK_BLOTS,
    scaleRange: [0.6, 2.2],
    seed: 42,
  },
  tears: {
    count: 18,
    color: "oklch(0.50 0.06 200)",
    opacity: 0.45,
    paths: TEAR_DROPS,
    scaleRange: [0.5, 1.8],
    seed: 77,
  },
  frost: {
    count: 16,
    color: "oklch(0.88 0.04 220)",
    opacity: 0.55,
    paths: FROST_CRYSTALS,
    scaleRange: [0.5, 1.5],
    seed: 131,
  },
  ink: {
    count: 16,
    color: "oklch(0.12 0.02 45)",
    opacity: 0.55,
    paths: INK_BLOTS,
    scaleRange: [0.5, 2.0],
    seed: 256,
  },
  burned: {
    count: 10,
    color: "oklch(0.10 0.02 35)",
    opacity: 0.7,
    paths: INK_BLOTS,
    scaleRange: [1.0, 2.5],
    seed: 333,
  },
  gold: {
    count: 20,
    color: "oklch(0.82 0.15 88)",
    opacity: 0.6,
    paths: FROST_CRYSTALS,
    scaleRange: [0.4, 1.2],
    seed: 512,
  },
};

export function PaperEffectSVG({ style }: { style: string }) {
  const styleKey = style.toLowerCase();
  const cfg = EFFECTS[styleKey];
  if (!cfg) return null;

  const rand = rng(cfg.seed);
  const shapes: { x: number; y: number; scale: number; rotate: number; pathIdx: number }[] = [];

  for (let i = 0; i < cfg.count; i++) {
    // Position — bias toward edges for blood/burned, spread for others
    let x: number, y: number;
    if (styleKey === "blood" || styleKey === "burned") {
      // More near top (drips) and corners (burns)
      const edge = rand();
      if (edge < 0.4) { x = rand() * 100; y = rand() * 15; } // top
      else if (edge < 0.6) { x = rand() * 100; y = 85 + rand() * 15; } // bottom
      else { x = rand() * 100; y = rand() * 100; } // scattered
    } else {
      x = rand() * 92 + 4; // 4-96%
      y = rand() * 92 + 4;
    }

    shapes.push({
      x,
      y,
      scale: cfg.scaleRange[0] + rand() * (cfg.scaleRange[1] - cfg.scaleRange[0]),
      rotate: rand() * 360,
      pathIdx: Math.floor(rand() * cfg.paths.length),
    });
  }

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{ zIndex: 0, overflow: "visible" }}
      aria-hidden
    >
      {shapes.map((s, i) => (
        <g
          key={i}
          transform={`translate(${s.x} ${s.y}) rotate(${s.rotate}) scale(${s.scale * 0.4})`}
          style={{ transformOrigin: "center" }}
        >
          <path
            d={cfg.paths[s.pathIdx]}
            fill={cfg.color}
            opacity={cfg.opacity * (0.7 + rand() * 0.3)}
          />
        </g>
      ))}

      {/* Special: gold border frame */}
      {styleKey === "gold" && (
        <>
          <rect x="0" y="0" width="100" height="2" fill="oklch(0.75 0.15 85)" opacity="0.35" />
          <rect x="0" y="98" width="100" height="2" fill="oklch(0.75 0.15 85)" opacity="0.35" />
          <rect x="0" y="0" width="1.5" height="100" fill="oklch(0.75 0.15 85)" opacity="0.35" />
          <rect x="98.5" y="0" width="1.5" height="100" fill="oklch(0.75 0.15 85)" opacity="0.35" />
        </>
      )}

      {/* Special: frost inner glow */}
      {styleKey === "frost" && (
        <rect x="0" y="0" width="100" height="100" fill="oklch(0.80 0.06 220)" opacity="0.08" />
      )}

      {/* Special: burned corner emphasis */}
      {styleKey === "burned" && (
        <>
          <ellipse cx="0" cy="0" rx="20" ry="18" fill="oklch(0.08 0.01 35)" opacity="0.5" />
          <ellipse cx="100" cy="0" rx="18" ry="16" fill="oklch(0.08 0.01 35)" opacity="0.45" />
          <ellipse cx="0" cy="100" rx="22" ry="20" fill="oklch(0.08 0.01 35)" opacity="0.55" />
          <ellipse cx="100" cy="100" rx="20" ry="18" fill="oklch(0.08 0.01 35)" opacity="0.5" />
        </>
      )}
    </svg>
  );
}
