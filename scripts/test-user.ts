// Создать временного тестового пользователя (для ручной проверки), затем удалить.
// Usage: bun scripts/test-user.ts create|delete
import { PrismaClient } from "@prisma/client";
import { scryptSync, randomBytes } from "crypto";

const db = new PrismaClient();
const EMAIL = "coc-sandbox-test@local.test";

async function main() {
  const cmd = process.argv[2];
  if (cmd === "create") {
    const salt = randomBytes(16).toString("hex");
    const hash = scryptSync("test-cthulhu-123", salt, 64).toString("hex");
    const user = await db.user.upsert({
      where: { email: EMAIL },
      update: { password: `${salt}:${hash}` },
      create: {
        email: EMAIL,
        name: "Тестовый Сыщица",
        password: `${salt}:${hash}`,
        role: "PLAYER",
      },
    });
    console.log("CREATED", user.id, user.email);
  } else if (cmd === "delete") {
    const user = await db.user.findUnique({ where: { email: EMAIL } });
    if (user) {
      await db.user.delete({ where: { id: user.id } });
      console.log("DELETED", user.id);
    } else {
      console.log("NOT FOUND");
    }
  } else {
    console.log("usage: create|delete");
  }
}

main()
  .catch((e) => { console.error(e.message); process.exit(1); })
  .finally(() => db.$disconnect());
