import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2).max(40),
  email: z.string().email(),
  password: z.string().min(6).max(100),
  characterName: z.string().min(2).max(60).optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Неверные данные" }, { status: 400 });
  }
  const { name, email, password, characterName } = parsed.data;

  const exists = await db.user.findUnique({ where: { email: email.toLowerCase() } });
  if (exists) {
    return NextResponse.json({ error: "Этот свиток уже занят другим героем" }, { status: 409 });
  }

  const user = await db.user.create({
    data: {
      name,
      email: email.toLowerCase(),
      password: hashPassword(password),
      role: "PLAYER",
    },
  });

  // Create character profile if requested
  if (characterName) {
    const ironRank = await db.guildRank.findFirst({ where: { level: 1 } });
    await db.character.create({
      data: {
        userId: user.id,
        name: characterName,
        guildRankId: ironRank?.id ?? null,
        bio: "Новый авантюрист, только вступивший на путь.",
      },
    });
  }

  return NextResponse.json({ ok: true, userId: user.id });
}
