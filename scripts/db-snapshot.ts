// Snapshot of production DB state: tables + row counts.
// Usage: DATABASE_URL="postgres..." bun scripts/db-snapshot.ts
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const tables: any[] = await db.$queryRawUnsafe(
    `SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`
  );
  console.log("=== TABLES ===");
  for (const t of tables) {
    const name = t.tablename;
    try {
      const cnt: any[] = await db.$queryRawUnsafe(
        `SELECT COUNT(*)::int as c FROM "${name}"`
      );
      console.log(`${name}: ${cnt[0].c} rows`);
    } catch (e: any) {
      console.log(`${name}: ERROR ${e.message}`);
    }
  }
}

main()
  .catch((e) => {
    console.error("SNAPSHOT FAILED:", e.message);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
