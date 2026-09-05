"use client";

/**
 * PaperEffect — decorative "state of the paper" overlay for Grimoire pages.
 *
 * Every entry can carry a `paperStyle` (BLOOD / TEARS / INK / BURNED / FROST /
 * GOLD / PLAIN). This component turns that value into a set of hand-generated
 * SVG marks scattered over the page:
 *
 *   • an UNDER layer — stains that soaked into the parchment, drawn behind the
 *     text so it stays perfectly readable;
 *   • an OVER layer — crusted drops, splatter, frost and gold leaf that sit
 *     ON TOP of the writing, exactly like something spilled on a finished page.
 *
 * Marks are generated from a seeded RNG (the entry id), so a chapter always
 * looks identical between renders and reloads, but two chapters never share
 * the same pattern. Blob outlines come from a smoothed random polygon and are
 * roughened with an feTurbulence displacement filter, which is what gives the
 * blood and ink their crusty, non-vector edges.
 */

type Rand = () => number;

interface Mark {
  /** horizontal centre, % of page width */
  x: number;
  /** vertical centre, % of page height */
  y: number;
  /** rendered width in px (height follows the viewBox ratio) */
  size: number;
  rotate: number;
  opacity: number;
  vb: [number, number];
  node: React.ReactNode;
  /** stretch across the whole page instead of being placed as a stamp */
  full?: boolean;
}

/* ===== seeded randomness ===== */

function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function mulberry32(a: number): Rand {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = (r: Rand, a: number, b: number) => a + r() * (b - a);
const pick = <T,>(r: Rand, xs: readonly T[]): T => xs[Math.floor(r() * xs.length) % xs.length];

/* ===== organic blob geometry ===== */

/** Random closed polygon smoothed with Catmull-Rom → cubic beziers. */
function blobPath(r: Rand, cx: number, cy: number, radius: number, wobble = 0.42, points = 9): string {
  const pts: [number, number][] = [];
  const start = r() * Math.PI * 2;
  for (let i = 0; i < points; i++) {
    const a = start + (i / points) * Math.PI * 2;
    const rad = radius * (1 - wobble / 2 + r() * wobble);
    pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad * rng(r, 0.85, 1.15)]);
  }
  const n = pts.length;
  let d = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }
  return `${d} Z`;
}

/** Tiny satellite droplets around a splash. */
function specks(r: Rand, count: number, cx: number, cy: number, spread: number, fill: string, maxR = 1.6) {
  return Array.from({ length: count }, (_, i) => {
    const a = r() * Math.PI * 2;
    const dist = rng(r, spread * 0.45, spread);
    const rad = rng(r, 0.35, maxR);
    return (
      <ellipse
        key={`sp${i}`}
        cx={(cx + Math.cos(a) * dist).toFixed(2)}
        cy={(cy + Math.sin(a) * dist).toFixed(2)}
        rx={rad.toFixed(2)}
        ry={(rad * rng(r, 0.7, 1.3)).toFixed(2)}
        fill={fill}
        opacity={rng(r, 0.45, 0.95).toFixed(2)}
      />
    );
  });
}

/** A ragged edge running along one side of the page, in a 0..100 box. */
function charredEdge(r: Rand, side: "top" | "bottom", depth: number): string {
  const step = 6.25;
  const pts: string[] = [];
  for (let x = 0; x <= 100.001; x += step) {
    const y = depth * rng(r, 0.3, 1.25);
    pts.push(`${x.toFixed(1)} ${(side === "top" ? y : 100 - y).toFixed(2)}`);
  }
  const line = pts.map((p, i) => (i === 0 ? `M ${p}` : `L ${p}`)).join(" ");
  return side === "top" ? `${line} L 100 0 L 0 0 Z` : `${line} L 100 100 L 0 100 Z`;
}

/* ===== palettes ===== */

const C = {
  blood: {
    core: "oklch(0.36 0.19 26)",
    deep: "oklch(0.25 0.14 24)",
    rim: "oklch(0.18 0.10 23)",
    wash: "oklch(0.44 0.17 28)",
  },
  ink: {
    core: "oklch(0.24 0.06 262)",
    deep: "oklch(0.15 0.05 265)",
    rim: "oklch(0.11 0.04 265)",
    wash: "oklch(0.30 0.06 262)",
  },
  tears: {
    ring: "oklch(0.56 0.06 236)",
    fill: "oklch(0.80 0.03 233)",
    glare: "oklch(0.99 0.01 230)",
    wash: "oklch(0.64 0.06 232)",
  },
  burned: {
    char: "oklch(0.14 0.02 40)",
    singe: "oklch(0.36 0.09 55)",
    ember: "oklch(0.58 0.16 55)",
    wash: "oklch(0.28 0.07 45)",
  },
  frost: {
    crystal: "oklch(0.99 0.015 225)",
    edge: "oklch(0.78 0.07 230)",
    wash: "oklch(0.86 0.06 228)",
  },
  gold: {
    leaf: "oklch(0.80 0.14 88)",
    deep: "oklch(0.60 0.13 74)",
    shine: "oklch(0.96 0.08 95)",
    wash: "oklch(0.84 0.13 88)",
  },
} as const;

/* ===== per-style mark builders =====
   Each builder returns { under, over }: stains soaked into the paper, and
   marks lying on top of the writing. */

type Layers = { under: Mark[]; over: Mark[] };
type Builder = (r: Rand, uid: string, k: number) => Layers;

/** A soft soaked-in stain: heavily blurred blob, sits behind the text. */
function soak(r: Rand, fill: string, opacity: number, uid: string): Omit<Mark, "x" | "y" | "size" | "rotate"> {
  return {
    opacity,
    vb: [60, 60],
    node: (
      <g filter={`url(#pfx-soft-${uid})`}>
        <path d={blobPath(r, 30, 30, 20, 0.55, 10)} fill={fill} />
      </g>
    ),
  };
}

const BUILD: Record<string, Builder> = {
  /* ---------- BLOOD: crusted drops, splatter and a couple of runs ---------- */
  BLOOD: (r, uid, k) => {
    const under: Mark[] = [];
    const over: Mark[] = [];

    for (let i = 0; i < Math.round(4 * k); i++) {
      under.push({
        x: rng(r, 8, 92),
        y: rng(r, 6, 94),
        size: rng(r, 90, 190),
        rotate: rng(r, 0, 360),
        ...soak(r, C.blood.wash, rng(r, 0.07, 0.14), uid),
      });
    }

    // Big drops near the top edge — as if blood dripped onto the open book.
    const dropCount = Math.round(9 * k);
    for (let i = 0; i < dropCount; i++) {
      const topHalf = i < dropCount * 0.5;
      const drip = i % 3 === 0;
      const path = blobPath(r, 20, drip ? 16 : 20, rng(r, 11, 15), 0.5, 10);
      const tailLen = drip ? rng(r, 20, 46) : 0;
      const tailW = rng(r, 2.4, 4.6);
      over.push({
        x: rng(r, 4, 96),
        y: topHalf ? rng(r, 2, 34) : rng(r, 34, 97),
        size: rng(r, 26, 62),
        rotate: drip ? rng(r, -6, 6) : rng(r, 0, 360),
        opacity: rng(r, 0.62, 0.88),
        vb: [40, drip ? 72 : 40],
        node: (
          <>
            {drip && (
              <path
                d={`M ${20 - tailW} ${18} Q ${20 - tailW * 0.4} ${18 + tailLen * 0.7}, 20 ${18 + tailLen} Q ${20 + tailW * 0.4} ${18 + tailLen * 0.7}, ${20 + tailW} 18 Z`}
                fill={C.blood.deep}
                opacity="0.85"
              />
            )}
            <g filter={`url(#pfx-rough-${uid})`}>
              <path d={path} fill={`url(#pfx-blood-${uid})`} />
              <path d={path} fill="none" stroke={C.blood.rim} strokeWidth="1.3" opacity="0.65" />
            </g>
            {specks(r, 5, 20, 20, 17, C.blood.deep, 1.5)}
          </>
        ),
      });
    }

    // Fine spray — small dark flecks straight over the writing.
    for (let i = 0; i < Math.round(14 * k); i++) {
      over.push({
        x: rng(r, 2, 98),
        y: rng(r, 2, 98),
        size: rng(r, 4, 11),
        rotate: rng(r, 0, 360),
        opacity: rng(r, 0.4, 0.75),
        vb: [40, 40],
        node: (
          <g filter={`url(#pfx-rough-${uid})`}>
            <path d={blobPath(r, 20, 20, 15, 0.6, 8)} fill={C.blood.deep} />
          </g>
        ),
      });
    }
    return { under, over };
  },

  /* ---------- TEARS: water rings, running ink, fresh droplets ---------- */
  TEARS: (r, uid, k) => {
    const under: Mark[] = [];
    const over: Mark[] = [];

    // Dried water rings — pale centre, darker wavy rim (coffee-ring effect).
    for (let i = 0; i < Math.round(4 * k); i++) {
      const ring = blobPath(r, 30, 30, 21, 0.3, 12);
      under.push({
        x: rng(r, 8, 92),
        y: rng(r, 6, 94),
        size: rng(r, 70, 160),
        rotate: rng(r, 0, 360),
        opacity: rng(r, 0.22, 0.38),
        vb: [60, 60],
        node: (
          <g filter={`url(#pfx-wave-${uid})`}>
            <path d={ring} fill={C.tears.fill} opacity="0.35" />
            <path d={ring} fill="none" stroke={C.tears.ring} strokeWidth="1.6" opacity="0.75" />
            <path d={blobPath(r, 30, 30, 13, 0.35, 10)} fill="none" stroke={C.tears.ring} strokeWidth="0.9" opacity="0.4" />
          </g>
        ),
      });
    }

    // Fresh droplets sitting on the page — glassy, with a highlight.
    for (let i = 0; i < Math.round(10 * k); i++) {
      over.push({
        x: rng(r, 5, 95),
        y: rng(r, 4, 96),
        size: rng(r, 12, 30),
        rotate: rng(r, -14, 14),
        opacity: rng(r, 0.55, 0.85),
        vb: [24, 34],
        node: (
          <>
            <path
              d="M 12 2 C 17 11, 21 18, 21 23 C 21 29.5, 17 33, 12 33 C 7 33, 3 29.5, 3 23 C 3 18, 7 11, 12 2 Z"
              fill={`url(#pfx-tear-${uid})`}
              stroke={C.tears.ring}
              strokeWidth="0.7"
              strokeOpacity="0.5"
            />
            <ellipse cx="8.5" cy="22" rx="2.6" ry="4" fill={C.tears.glare} opacity="0.75" />
            <ellipse cx="15" cy="27.5" rx="1.3" ry="1.8" fill={C.tears.glare} opacity="0.45" />
          </>
        ),
      });
    }

    // Vertical streaks where the writing ran.
    for (let i = 0; i < Math.round(5 * k); i++) {
      const w = rng(r, 2, 5);
      over.push({
        x: rng(r, 10, 90),
        y: rng(r, 20, 80),
        size: rng(r, 16, 34),
        rotate: rng(r, -4, 4),
        opacity: rng(r, 0.18, 0.34),
        vb: [20, 90],
        node: (
          <path
            d={`M ${10 - w} 4 Q ${10 - w * 1.5} 45, ${10 - w * 0.3} 84 L ${10 + w * 0.3} 86 Q ${10 + w * 1.5} 45, ${10 + w} 4 Z`}
            fill={C.tears.wash}
            filter={`url(#pfx-soft-${uid})`}
          />
        ),
      });
    }
    return { under, over };
  },

  /* ---------- INK: a knocked-over inkwell ---------- */
  INK: (r, uid, k) => {
    const under: Mark[] = [];
    const over: Mark[] = [];

    for (let i = 0; i < Math.round(3 * k); i++) {
      under.push({
        x: rng(r, 10, 90),
        y: rng(r, 8, 92),
        size: rng(r, 80, 170),
        rotate: rng(r, 0, 360),
        ...soak(r, C.ink.wash, rng(r, 0.1, 0.18), uid),
      });
    }

    // Main blots.
    for (let i = 0; i < Math.round(6 * k); i++) {
      const path = blobPath(r, 20, 20, rng(r, 12, 16), 0.6, 11);
      over.push({
        x: rng(r, 6, 94),
        y: rng(r, 5, 95),
        size: rng(r, 30, 78),
        rotate: rng(r, 0, 360),
        opacity: rng(r, 0.5, 0.78),
        vb: [40, 40],
        node: (
          <>
            <g filter={`url(#pfx-rough-${uid})`}>
              <path d={path} fill={`url(#pfx-ink-${uid})`} />
            </g>
            {specks(r, 7, 20, 20, 18, C.ink.deep, 1.7)}
          </>
        ),
      });
    }

    // Directional spray — a flicked pen.
    const ax = rng(r, 15, 85);
    const ay = rng(r, 15, 85);
    const dir = r() * Math.PI * 2;
    for (let i = 0; i < Math.round(22 * k); i++) {
      const t = r();
      over.push({
        x: Math.max(1, Math.min(99, ax + Math.cos(dir) * t * 55 + rng(r, -9, 9))),
        y: Math.max(1, Math.min(99, ay + Math.sin(dir) * t * 40 + rng(r, -7, 7))),
        size: rng(r, 3, 10) * (1 - t * 0.5),
        rotate: rng(r, 0, 360),
        opacity: rng(r, 0.35, 0.7),
        vb: [40, 40],
        node: <path d={blobPath(r, 20, 20, 15, 0.65, 7)} fill={C.ink.deep} />,
      });
    }
    return { under, over };
  },

  /* ---------- BURNED: charred edges and burn-through holes ---------- */
  BURNED: (r, uid, k) => {
    const under: Mark[] = [];
    const over: Mark[] = [];

    // One full-bleed layer for the scorched border — a stamp would leave a
    // visible seam where the sprite ends.
    under.push({
      full: true,
      x: 50,
      y: 50,
      size: 0,
      rotate: 0,
      opacity: 1,
      vb: [100, 100],
      node: (
        <>
          <rect x="0" y="0" width="100" height="100" fill={`url(#pfx-char-t-${uid})`} />
          <rect x="0" y="0" width="100" height="100" fill={`url(#pfx-char-b-${uid})`} />
          <rect x="0" y="0" width="100" height="100" fill={`url(#pfx-char-l-${uid})`} />
          <rect x="0" y="0" width="100" height="100" fill={`url(#pfx-char-r-${uid})`} />
          <path d={charredEdge(r, "top", 3.2)} fill={C.burned.char} opacity="0.75" />
          <path d={charredEdge(r, "bottom", 2.6)} fill={C.burned.char} opacity="0.7" />
          <ellipse cx="0" cy="0" rx="26" ry="24" fill={`url(#pfx-corner-${uid})`} />
          <ellipse cx="100" cy="0" rx="22" ry="21" fill={`url(#pfx-corner-${uid})`} />
          <ellipse cx="0" cy="100" rx="24" ry="22" fill={`url(#pfx-corner-${uid})`} />
          <ellipse cx="100" cy="100" rx="27" ry="25" fill={`url(#pfx-corner-${uid})`} />
        </>
      ),
    });

    for (let i = 0; i < Math.round(5 * k); i++) {
      under.push({
        x: pick(r, [rng(r, 2, 22), rng(r, 78, 98)]),
        y: pick(r, [rng(r, 2, 22), rng(r, 78, 98)]),
        size: rng(r, 110, 210),
        rotate: rng(r, 0, 360),
        ...soak(r, C.burned.wash, rng(r, 0.18, 0.32), uid),
      });
    }

    // Burn-through holes: black centre, glowing singe halo.
    for (let i = 0; i < Math.round(4 * k); i++) {
      const hole = blobPath(r, 30, 30, 13, 0.55, 10);
      const halo = blobPath(r, 30, 30, 21, 0.4, 11);
      over.push({
        x: rng(r, 6, 94),
        y: rng(r, 5, 95),
        size: rng(r, 34, 86),
        rotate: rng(r, 0, 360),
        opacity: rng(r, 0.72, 0.95),
        vb: [60, 60],
        node: (
          <g filter={`url(#pfx-rough-${uid})`}>
            <path d={halo} fill={C.burned.singe} opacity="0.5" />
            <path d={halo} fill="none" stroke={C.burned.ember} strokeWidth="1.1" opacity="0.45" />
            <path d={hole} fill={C.burned.char} />
            <path d={hole} fill="none" stroke={C.burned.ember} strokeWidth="1.4" opacity="0.55" />
          </g>
        ),
      });
    }

    // Ash flecks.
    for (let i = 0; i < Math.round(16 * k); i++) {
      over.push({
        x: rng(r, 2, 98),
        y: rng(r, 2, 98),
        size: rng(r, 3, 9),
        rotate: rng(r, 0, 360),
        opacity: rng(r, 0.3, 0.6),
        vb: [40, 40],
        node: <path d={blobPath(r, 20, 20, 15, 0.7, 7)} fill={C.burned.char} />,
      });
    }
    return { under, over };
  },

  /* ---------- FROST: dendritic crystals creeping in from the corners ---------- */
  FROST: (r, uid, k) => {
    const under: Mark[] = [];
    const over: Mark[] = [];

    for (let i = 0; i < Math.round(5 * k); i++) {
      under.push({
        x: pick(r, [rng(r, 0, 20), rng(r, 80, 100)]),
        y: pick(r, [rng(r, 0, 20), rng(r, 80, 100)]),
        size: rng(r, 140, 260),
        rotate: rng(r, 0, 360),
        ...soak(r, C.frost.wash, rng(r, 0.2, 0.34), uid),
      });
    }

    const crystal = (rr: Rand) => {
      const arms = 6;
      const len = rng(rr, 14, 18);
      const parts: React.ReactNode[] = [];
      for (let a = 0; a < arms; a++) {
        const ang = (a / arms) * 360;
        const branches: React.ReactNode[] = [];
        for (let b = 1; b <= 3; b++) {
          const at = (len * b) / 4;
          const bl = rng(rr, 2.6, 5.2) * (1 - b / 5);
          branches.push(
            <path
              key={`b${b}`}
              d={`M 20 ${20 - at} l ${-bl} ${-bl * 0.9} M 20 ${20 - at} l ${bl} ${-bl * 0.9}`}
              stroke="currentColor"
              strokeWidth="0.75"
              strokeLinecap="round"
              fill="none"
            />
          );
        }
        parts.push(
          <g key={`a${a}`} transform={`rotate(${ang} 20 20)`}>
            <path d={`M 20 20 L 20 ${20 - len}`} stroke="currentColor" strokeWidth="1.05" strokeLinecap="round" />
            {branches}
          </g>
        );
      }
      return parts;
    };

    for (let i = 0; i < Math.round(11 * k); i++) {
      const corner = i < 7;
      over.push({
        x: corner ? pick(r, [rng(r, 1, 24), rng(r, 76, 99)]) : rng(r, 20, 80),
        y: corner ? pick(r, [rng(r, 1, 24), rng(r, 76, 99)]) : rng(r, 15, 85),
        size: rng(r, 26, 62),
        rotate: rng(r, 0, 60),
        opacity: rng(r, 0.5, 0.9),
        vb: [40, 40],
        node: (
          <g color={C.frost.crystal} filter={`url(#pfx-glow-${uid})`}>
            <g color={C.frost.edge} opacity="0.6" transform="translate(0.6 0.6)">
              {crystal(r)}
            </g>
            {crystal(r)}
          </g>
        ),
      });
    }

    // Tiny sparkles.
    for (let i = 0; i < Math.round(14 * k); i++) {
      over.push({
        x: rng(r, 2, 98),
        y: rng(r, 2, 98),
        size: rng(r, 4, 10),
        rotate: rng(r, 0, 90),
        opacity: rng(r, 0.35, 0.8),
        vb: [40, 40],
        node: (
          <path
            d="M 20 6 L 22 18 L 34 20 L 22 22 L 20 34 L 18 22 L 6 20 L 18 18 Z"
            fill={C.frost.crystal}
          />
        ),
      });
    }
    return { under, over };
  },

  /* ---------- GOLD: illuminated manuscript — leaf flakes and sparks ---------- */
  GOLD: (r, uid, k) => {
    const under: Mark[] = [];
    const over: Mark[] = [];

    // A gilded rule around the page — the illuminated-manuscript signature.
    over.push({
      full: true,
      x: 50,
      y: 50,
      size: 0,
      rotate: 0,
      opacity: 0.85,
      vb: [100, 100],
      node: (
        <g fill="none" stroke={`url(#pfx-gild-${uid})`} vectorEffect="non-scaling-stroke">
          <rect x="1.4" y="1.4" width="97.2" height="97.2" strokeWidth="2" />
          <rect x="3.2" y="3.2" width="93.6" height="93.6" strokeWidth="0.8" opacity="0.7" />
          {([
            [3.2, 3.2, 1, 1],
            [96.8, 3.2, -1, 1],
            [3.2, 96.8, 1, -1],
            [96.8, 96.8, -1, -1],
          ] as const).map(([cx, cy, sx, sy], i) => (
            <path
              key={i}
              d={`M ${cx + sx * 7} ${cy} q ${-sx * 4} 0, ${-sx * 5.5} ${sy * 2.2} q ${-sx * 1.5} ${sy * 2.2}, ${sx * 1.5} ${sy * 4.8}`}
              strokeWidth="1.1"
              opacity="0.85"
            />
          ))}
        </g>
      ),
    });

    for (let i = 0; i < Math.round(4 * k); i++) {
      under.push({
        x: rng(r, 10, 90),
        y: rng(r, 8, 92),
        size: rng(r, 130, 240),
        rotate: rng(r, 0, 360),
        ...soak(r, C.gold.wash, rng(r, 0.14, 0.26), uid),
      });
    }

    // Gold leaf flakes — angular, with a lit and a shadowed facet.
    for (let i = 0; i < Math.round(14 * k); i++) {
      const pts: string[] = [];
      const n = Math.floor(rng(r, 5, 8));
      for (let p = 0; p < n; p++) {
        const a = (p / n) * Math.PI * 2 + rng(r, -0.2, 0.2);
        const rad = rng(r, 9, 17);
        pts.push(`${(20 + Math.cos(a) * rad).toFixed(1)},${(20 + Math.sin(a) * rad).toFixed(1)}`);
      }
      over.push({
        x: rng(r, 4, 96),
        y: rng(r, 4, 96),
        size: rng(r, 14, 34),
        rotate: rng(r, 0, 360),
        opacity: rng(r, 0.55, 0.9),
        vb: [40, 40],
        node: (
          <>
            <polygon points={pts.join(" ")} fill={`url(#pfx-gold-${uid})`} />
            <polygon points={pts.slice(0, 3).join(" ")} fill={C.gold.shine} opacity="0.55" />
            <polygon points={pts.join(" ")} fill="none" stroke={C.gold.deep} strokeWidth="0.7" opacity="0.6" />
          </>
        ),
      });
    }

    // Sparks with a soft halo.
    for (let i = 0; i < Math.round(12 * k); i++) {
      over.push({
        x: rng(r, 3, 97),
        y: rng(r, 3, 97),
        size: rng(r, 8, 20),
        rotate: rng(r, 0, 90),
        opacity: rng(r, 0.4, 0.85),
        vb: [40, 40],
        node: (
          <g filter={`url(#pfx-glow-${uid})`}>
            <circle cx="20" cy="20" r="3.5" fill={C.gold.shine} opacity="0.35" />
            <path d="M 20 4 L 22 18 L 36 20 L 22 22 L 20 36 L 18 22 L 4 20 L 18 18 Z" fill={C.gold.shine} />
          </g>
        ),
      });
    }
    return { under, over };
  },
};

/* ===== shared filter / gradient definitions ===== */

function Defs({ uid, seed }: { uid: string; seed: number }) {
  return (
    <svg className="paper-fx-defs" aria-hidden focusable="false">
      <defs>
        {/* Crusty, non-vector edges for blood / ink / burns. */}
        <filter id={`pfx-rough-${uid}`} x="-35%" y="-35%" width="170%" height="170%">
          <feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="3" seed={seed % 1000} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="3.4" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        {/* Gentler wobble for water rings. */}
        <filter id={`pfx-wave-${uid}`} x="-30%" y="-30%" width="160%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed={(seed + 7) % 1000} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="4.5" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id={`pfx-soft-${uid}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4.5" />
        </filter>
        <filter id={`pfx-glow-${uid}`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="1.1" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <radialGradient id={`pfx-blood-${uid}`} cx="38%" cy="34%" r="72%">
          <stop offset="0%" stopColor={C.blood.core} />
          <stop offset="62%" stopColor={C.blood.deep} />
          <stop offset="100%" stopColor={C.blood.rim} />
        </radialGradient>
        <radialGradient id={`pfx-ink-${uid}`} cx="40%" cy="36%" r="70%">
          <stop offset="0%" stopColor={C.ink.core} />
          <stop offset="70%" stopColor={C.ink.deep} />
          <stop offset="100%" stopColor={C.ink.rim} />
        </radialGradient>
        <linearGradient id={`pfx-tear-${uid}`} x1="0" y1="0" x2="0.7" y2="1">
          <stop offset="0%" stopColor={C.tears.glare} stopOpacity="0.75" />
          <stop offset="55%" stopColor={C.tears.fill} stopOpacity="0.55" />
          <stop offset="100%" stopColor={C.tears.ring} stopOpacity="0.7" />
        </linearGradient>
        <linearGradient id={`pfx-gold-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={C.gold.shine} />
          <stop offset="45%" stopColor={C.gold.leaf} />
          <stop offset="100%" stopColor={C.gold.deep} />
        </linearGradient>
        {(
          [
            ["t", 0, 0, 0, 1],
            ["b", 0, 1, 0, 0],
            ["l", 0, 0, 1, 0],
            ["r", 1, 0, 0, 0],
          ] as const
        ).map(([dir, x1, y1, x2, y2]) => (
          <linearGradient key={dir} id={`pfx-char-${dir}-${uid}`} x1={x1} y1={y1} x2={x2} y2={y2}>
            <stop offset="0%" stopColor={C.burned.char} stopOpacity="0.8" />
            <stop offset="7%" stopColor={C.burned.singe} stopOpacity="0.5" />
            <stop offset="20%" stopColor={C.burned.singe} stopOpacity="0.16" />
            <stop offset="42%" stopColor={C.burned.singe} stopOpacity="0" />
          </linearGradient>
        ))}
        <radialGradient id={`pfx-corner-${uid}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={C.burned.char} stopOpacity="0.62" />
          <stop offset="55%" stopColor={C.burned.char} stopOpacity="0.22" />
          <stop offset="100%" stopColor={C.burned.char} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`pfx-gild-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={C.gold.deep} stopOpacity="0.55" />
          <stop offset="50%" stopColor={C.gold.shine} stopOpacity="0.9" />
          <stop offset="100%" stopColor={C.gold.deep} stopOpacity="0.55" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/* ===== layer renderer ===== */

function Layer({ marks, className }: { marks: Mark[]; className: string }) {
  if (marks.length === 0) return null;
  return (
    <div className={className} aria-hidden>
      {marks.map((m, i) =>
        m.full ? (
          <svg
            key={i}
            className="paper-fx-mark paper-fx-full"
            viewBox={`0 0 ${m.vb[0]} ${m.vb[1]}`}
            preserveAspectRatio="none"
            style={{ opacity: m.opacity }}
            focusable="false"
          >
            {m.node}
          </svg>
        ) : (
          <svg
            key={i}
            className="paper-fx-mark"
            viewBox={`0 0 ${m.vb[0]} ${m.vb[1]}`}
            width={m.size}
            height={(m.size * m.vb[1]) / m.vb[0]}
            style={{
              left: `${m.x}%`,
              top: `${m.y}%`,
              opacity: m.opacity,
              transform: `translate(-50%, -50%) rotate(${m.rotate.toFixed(1)}deg)`,
            }}
            focusable="false"
          >
            {m.node}
          </svg>
        )
      )}
    </div>
  );
}

export const PAPER_STYLE_KEYS = ["PLAIN", "BLOOD", "BURNED", "TEARS", "INK", "FROST", "GOLD"] as const;

export function PaperEffect({
  style,
  seed = "",
  intensity = 1,
  quiet = false,
}: {
  /** paperStyle value from the entry (case-insensitive) */
  style?: string | null;
  /** anything stable and unique — the entry id — so the pattern never changes */
  seed?: string;
  /** 0…1 multiplier on how many marks are drawn (previews use less) */
  intensity?: number;
  /** dial the whole thing back — used on collapsed chapter headers */
  quiet?: boolean;
}) {
  const key = (style ?? "PLAIN").toUpperCase();
  const build = BUILD[key];
  if (!build) return null;

  const numericSeed = hashString(`${key}:${seed}`);
  const uid = numericSeed.toString(36);
  const { under, over } = build(mulberry32(numericSeed), uid, Math.max(0.15, intensity));

  const tone = `paper-fx-${key.toLowerCase()}${quiet ? " paper-fx-quiet" : ""}`;
  return (
    <>
      <Defs uid={uid} seed={numericSeed} />
      <Layer marks={under} className={`paper-fx paper-fx-under ${tone}`} />
      <Layer marks={over} className={`paper-fx paper-fx-over ${tone}`} />
    </>
  );
}
