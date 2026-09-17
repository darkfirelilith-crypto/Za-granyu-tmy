// Round 12: readability pass — single-pass size+color mapping over VtM UI files.
// Explicit map, one regex pass with callback => no double-bump (round 11 lesson).
import { readFileSync, writeFileSync } from "fs";

// font-size mapping: everything below 0.9rem gets one readable step up
const SIZE_MAP: Record<string, string> = {
  "0.52": "0.62", "0.56": "0.66", "0.58": "0.67", "0.59": "0.68",
  "0.60": "0.68", "0.61": "0.69", "0.62": "0.70", "0.64": "0.72",
  "0.66": "0.73", "0.68": "0.75", "0.70": "0.76", "0.72": "0.77",
  "0.74": "0.79", "0.76": "0.81", "0.78": "0.83", "0.80": "0.84",
  "0.82": "0.86", "0.84": "0.87", "0.86": "0.88", "0.88": "0.92",
};

// dim colors -> brighter, still in the gothic palette
const COLOR_MAP: Record<string, string> = {
  "#a68d80": "#c4ac9d", // bone-dim (var + hardcoded)
  "#6e5a53": "#9c8072", // ash (var + hardcoded)
  "#8d7468": "#b39a88", // pair-name idle
  "#b0565e": "#c96d75", // pair-chip base
  "#b99b56": "#cbae6c", // pool-chip base
};

const FILES = [
  "src/app/vtm/vtm.css",
  "src/components/vtm/vtm-app.tsx",
  "src/components/vtm/vtm-codex.tsx",
  "src/components/vtm/vtm-dice.tsx",
  "src/components/vtm/vtm-editor.tsx",
  "src/components/vtm/vtm-help.tsx",
  "src/components/vtm/vtm-import-dialog.tsx",
  "src/components/vtm/vtm-portrait-studio.tsx",
  "src/components/vtm/vtm-sections.tsx",
  "src/components/vtm/vtm-sections2.tsx",
  "src/components/vtm/vtm-sections3.tsx",
];

let totalSizes = 0;
let totalColors = 0;

for (const file of FILES) {
  let src = readFileSync(file, "utf8");
  const before = src;

  // single pass: Tailwind arbitrary text sizes ("!" important prefix optional)
  src = src.replace(/(!?)text-\[(0\.\d+)rem\]/g, (_m, bang, size) => {
    const key = Number(size).toFixed(2);
    const next = SIZE_MAP[key];
    if (!next) return _m;
    totalSizes++;
    return `${bang}text-[${next}rem]`;
  });

  // single pass: css font-size declarations
  src = src.replace(/font-size: (0\.\d+)rem/g, (_m, size) => {
    const key = Number(size).toFixed(2);
    const next = SIZE_MAP[key];
    if (!next) return _m;
    totalSizes++;
    return `font-size: ${next}rem`;
  });

  // colors
  for (const [from, to] of Object.entries(COLOR_MAP)) {
    const parts = src.split(from);
    if (parts.length > 1) {
      totalColors += parts.length - 1;
      src = parts.join(to);
    }
  }

  if (src !== before) {
    writeFileSync(file, src);
    console.log(`updated: ${file}`);
  }
}

console.log(`sizes bumped: ${totalSizes}, colors brightened: ${totalColors}`);
