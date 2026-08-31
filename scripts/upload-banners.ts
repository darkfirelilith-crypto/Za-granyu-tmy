/**
 * Upload generated banner images to Neon Country.banner field (base64).
 * Idempotent: only updates countries whose banner is null.
 *
 * Usage:
 *   set -a; source .env; set +a
 *   bun run scripts/upload-banners.ts
 */
import { db } from "../src/lib/db";
import fs from "fs";
import path from "path";

const BANNER_DIR = path.join(process.cwd(), "download", "banners");

const COUNTRY_BANNERS: Record<string, string> = {
  Эльдрион: "eldrinion.png",
  Крагмарск: "kragmarsk.png",
  Сильмариэль: "silmarieth.png",
  Удунголь: "udungol.png",
  "Вес'Харан": "vesharan.png",
  "Мёртвые Земли": "dead-lands.png",
};

async function main() {
  console.log("🖼 Uploading country banners to Neon...");
  let updated = 0;
  let skipped = 0;
  for (const [countryName, file] of Object.entries(COUNTRY_BANNERS)) {
    const country = await db.country.findUnique({ where: { name: countryName } });
    if (!country) {
      console.log(`✗ Country not found: ${countryName}`);
      continue;
    }
    if (country.banner) {
      skipped++;
      continue;
    }
    const filePath = path.join(BANNER_DIR, file);
    if (!fs.existsSync(filePath)) {
      console.log(`✗ Banner file missing: ${file}`);
      continue;
    }
    const buf = fs.readFileSync(filePath);
    const base64 = `data:image/png;base64,${buf.toString("base64")}`;
    await db.country.update({
      where: { id: country.id },
      data: { banner: base64 },
    });
    updated++;
    console.log(`✓ ${countryName} ← ${file} (${(buf.length / 1024).toFixed(0)} KB)`);
  }
  console.log(`Done: ${updated} updated, ${skipped} skipped (already had banner).`);
}

main()
  .catch((e) => {
    console.error("Upload failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
