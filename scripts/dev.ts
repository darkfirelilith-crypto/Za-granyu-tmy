/**
 * Дев-запуск «За гранью тьмы» с корректным окружением.
 *
 * Зачем: в песочнице/локальных машинах глобальный DATABASE_URL может указывать
 * на SQLite-пескочницу (file:...), а Prisma-схема проекта рассчитана на Postgres.
 * Этот скрипт подхватывает .env.local (в репозиторий НЕ входит и не коммитится),
 * восстанавливает DATABASE_URL / DIRECT_URL / NEXTAUTH_* и запускает `next dev`
 * с журналом dev.log — как раньше. На Vercel скрипт не используется (там build/start).
 *
 * Секреты не хранятся в коде: только в .env.local.
 */
import { spawn } from "node:child_process";
import { existsSync, openSync, appendFileSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const envLocal = join(root, ".env.local");

// 1. Разбираем .env.local (KEY="value" / KEY=value, # — комментарии)
if (existsSync(envLocal)) {
  const text = readFileSync(envLocal, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    // .env.local сильнее глобального окружения песочницы (file:...SQLite),
    // но слабее явно переданных переменных запуска (env VAR=... bun run dev)
    if (!process.env[key] || process.env[key]?.startsWith("file:")) {
      process.env[key] = value;
    }
  }
} else if (!process.env.DATABASE_URL || process.env.DATABASE_URL.startsWith("file:")) {
  console.error(
    "[dev.ts] Нет .env.local, а DATABASE_URL указывает на SQLite — дев-сервер не сможет работать с Postgres-схемой.\n" +
      "[dev.ts] Создайте .env.local по образцу .env.example (DATABASE_URL, DIRECT_URL, NEXTAUTH_SECRET, NEXTAUTH_URL)."
  );
  process.exit(1);
}

// 2. Журнал dev.log (аналог прежнего `| tee dev.log`)
const logPath = join(root, "dev.log");
const logFd = openSync(logPath, "a");
const stamp = `\n=== dev start ${new Date().toISOString()} ===\n`;
appendFileSync(logFd, stamp);

const child = spawn("bunx", ["next", "dev", "-p", "3000"], {
  cwd: root,
  env: process.env,
  stdio: ["inherit", "pipe", "pipe"],
});

const pipe = (chunk: Buffer) => {
  process.stdout.write(chunk);
  appendFileSync(logFd, chunk);
};
child.stdout.on("data", pipe);
child.stderr.on("data", pipe);
child.on("exit", (code) => {
  appendFileSync(logFd, `\n=== dev exit ${code} ===\n`);
  process.exit(code ?? 0);
});

for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, () => child.kill(sig));
}
