/**
 * Upload generated portrait images to Neon Personality.portrait (base64).
 * Idempotent: only updates personalities whose portrait is null.
 *
 * Usage:
 *   set -a; source .env; set +a
 *   bun run scripts/upload-personalities.ts
 */
import { db } from "../src/lib/db";
import fs from "fs";
import path from "path";

const PORTRAIT_DIR = path.join(process.cwd(), "download", "personalities");

const PERSONALITY_PORTRAITS: Record<string, string> = {
  "Капитан Изольда Морской Клинок": "isolda.png",
  "Архимаг Терион Серый Посох": "therion.png",
  "Ткач Кошмаров Веель": "veel.png",
  "Ярл Сигурд Кровавый Топор": "sigurd.png",
  "Эльдрин Последний Эльф": "eldrin.png",
};

async function main() {
  console.log("🖼 Uploading personality portraits to Neon...");
  let updated = 0;
  let skipped = 0;
  for (const [name, file] of Object.entries(PERSONALITY_PORTRAITS)) {
    const p = await db.personality.findUnique({ where: { name } });
    if (!p) {
      console.log(`✗ Personality not found: ${name}`);
      continue;
    }
    if (p.portrait) {
      skipped++;
      continue;
    }
    const filePath = path.join(PORTRAIT_DIR, file);
    if (!fs.existsSync(filePath)) {
      console.log(`✗ Portrait file missing: ${file}`);
      continue;
    }
    const buf = fs.readFileSync(filePath);
    const base64 = `data:image/png;base64,${buf.toString("base64")}`;
    await db.personality.update({
      where: { id: p.id },
      data: { portrait: base64 },
    });
    updated++;
    console.log(`✓ ${name} ← ${file} (${(buf.length / 1024).toFixed(0)} KB)`);
  }
  console.log(`Done: ${updated} updated, ${skipped} skipped.`);
}

main()
  .catch((e) => {
    console.error("Upload failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
