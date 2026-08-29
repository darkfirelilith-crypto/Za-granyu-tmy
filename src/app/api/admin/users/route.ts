import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { hashPassword } from "@/lib/password";

/** GET — list all users with their character summary. */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Доступ дарован лишь Божеству" }, { status: 403 });
  const users = await db.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      character: { select: { id: true, name: true, level: true, xp: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(users);
}

/** POST — create a new user (admin-created, with chosen role + password). */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Доступ дарован лишь Божеству" }, { status: 403 });
  const { email, name, password, role, characterName } = await req.json();
  if (!email || !name || !password || !role) {
    return NextResponse.json({ error: "Укажите email, name, password, role" }, { status: 400 });
  }
  if (role !== "ADMIN" && role !== "PLAYER") {
    return NextResponse.json({ error: "role должен быть ADMIN или PLAYER" }, { status: 400 });
  }
  const exists = await db.user.findUnique({ where: { email: String(email).toLowerCase() } });
  if (exists) return NextResponse.json({ error: "Этот свиток уже занят" }, { status: 409 });

  const user = await db.user.create({
    data: {
      email: String(email).toLowerCase(),
      name,
      password: hashPassword(password),
      role,
    },
  });

  // Optionally create a character profile
  if (characterName) {
    const iron = await db.guildRank.findFirst({ where: { level: 1 } });
    await db.character.create({
      data: {
        userId: user.id,
        name: characterName,
        guildRankId: iron?.id ?? null,
      },
    });
  }
  return NextResponse.json({ ok: true, userId: user.id }, { status: 201 });
}
