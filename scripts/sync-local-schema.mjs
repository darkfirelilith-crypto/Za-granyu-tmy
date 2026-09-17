#!/usr/bin/env node
/**
 * Regenerates prisma/schema.local.prisma from prisma/schema.prisma, swapping the
 * Postgres datasource for SQLite.
 *
 * The two files had drifted badly — the local schema was missing the whole
 * CharacterItem model and every spell/item field on LabEntry, so `dev:local`
 * could not compile the inventory routes. Keeping one source of truth removes
 * that failure mode; `db:generate:local` and `db:push:local` run this first.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "prisma", "schema.prisma");
const dest = join(root, "prisma", "schema.local.prisma");

const schema = readFileSync(src, "utf8");

const datasource = /datasource\s+db\s*\{[^}]*\}/;
if (!datasource.test(schema)) {
  console.error("sync-local-schema: no datasource block found in schema.prisma");
  process.exit(1);
}

const local =
  "// GENERATED FILE — do not edit by hand.\n" +
  "// Run `node scripts/sync-local-schema.mjs` (or any db:*:local script) to refresh\n" +
  "// it from prisma/schema.prisma. Only the datasource differs.\n" +
  schema.replace(
    datasource,
    'datasource db {\n  provider = "sqlite"\n  url      = env("DATABASE_URL")\n}'
  );

writeFileSync(dest, local);
console.log("sync-local-schema: prisma/schema.local.prisma regenerated from schema.prisma");
