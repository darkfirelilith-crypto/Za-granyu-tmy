import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function getSession() {
  return getServerSession(authOptions);
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session?.user || session.user.role !== "ADMIN") return null;
  return session;
}

export async function requireUser() {
  const session = await getSession();
  if (!session?.user) return null;
  return session;
}

/** Сессия, подтверждённая наличием пользователя в БД.
 *  Защита от «устаревших» JWT: NextAuth stateless — сессия может остаться
 *  валидной после удаления пользователя. Такие запросы должны получать 401,
 *  чтобы клиент перелогинился, а не падал с FK-ошибкой 500. */
export async function requireLiveUser() {
  const session = await getSession();
  if (!session?.user) return null;
  const exists = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true },
  });
  if (!exists) return null;
  return session;
}

export async function getCurrentCharacter(userId: string) {
  return db.character.findUnique({
    where: { userId },
    include: {
      guildRank: true,
      achievements: { include: { achievement: true } },
      questProgress: { include: { quest: true } },
      notes: { orderBy: { createdAt: "desc" } },
      groupMemberships: { include: { group: { select: { id: true, name: true } } } },
    },
  });
}
