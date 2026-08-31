/**
 * Upload generated portrait images to Neon ImportantBeing.portrait (base64).
 * Idempotent: only updates beings whose portrait is null.
 *
 * Usage:
 *   set -a; source .env; set +a
 *   bun run scripts/upload-portraits.ts
 */
import { db } from "../src/lib/db";
import fs from "fs";
import path from "path";

const PORTRAIT_DIR = path.join(process.cwd(), "download", "portraits");

const BEING_PORTRAITS: Record<string, string> = {
  "Великая Жрица Серафина": "serafina.png",
  "Хан Батыр Стальной Ветер": "batyr.png",
  "Молчаливая": "silent-one.png",
};

async function main() {
  console.log("🖼 Uploading being portraits to Neon...");
  let updated = 0;
  let skipped = 0;
  for (const [name, file] of Object.entries(BEING_PORTRAITS)) {
    const being = await db.importantBeing.findUnique({ where: { name } });
    if (!being) {
      console.log(`✗ Being not found: ${name}`);
      continue;
    }
    if (being.portrait) {
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
    await db.importantBeing.update({
      where: { id: being.id },
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
