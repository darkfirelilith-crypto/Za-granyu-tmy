import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/session";

// GET — list all characters (members of the guild). Admin sees all users too.
export async function GET() {
  const session = await requireUser();
  if (!session) return NextResponse.json({ error: "Войдите" }, { status: 401 });

  const characters = await db.character.findMany({
    include: {
      guildRank: true,
      user: { select: { name: true, role: true } },
      achievements: { include: { achievement: true } },
      _count: { select: { questProgress: true } },
    },
    orderBy: { xp: "desc" },
  });
  return NextResponse.json(characters);
}

// PUT — update own character (player) or any character (admin)
export async function PUT(req: NextRequest) {
  const session = await requireUser();
  if (!session) return NextResponse.json({ error: "Войдите" }, { status: 401 });
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Неверное тело запроса" }, { status: 400 });
  }
  const id = body.id as string | undefined;
  if (!id) return NextResponse.json({ error: "Укажите id" }, { status: 400 });

  const target = await db.character.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "Персонаж не найден" }, { status: 404 });

  const admin = await requireAdmin();
  if (!admin && target.userId !== session.user.id) {
    return NextResponse.json({ error: "Чужой свиток не переписать" }, { status: 403 });
  }

  // Players can only edit a strict allow-list of fields (no xp/level/rank/ownership).
  const playerSafe: Record<string, unknown> = {};
  const playerFields = ["name", "race", "charClass", "alignment", "bio", "traits", "ideals", "motives", "portrait"] as const;
  for (const f of playerFields) {
    if (f in body) playerSafe[f] = body[f];
  }

  // Admin can additionally edit xp/level/guildRankId/isAdventurer — also a strict allow-list.
  const adminSafe: Record<string, unknown> = { ...playerSafe };
  if (admin) {
    const adminFields = ["xp", "level", "guildRankId", "isAdventurer"] as const;
    for (const f of adminFields) {
      if (f in body) {
        const v = body[f];
        if (f === "xp" || f === "level") adminSafe[f] = v === undefined ? undefined : Number(v);
        else if (f === "isAdventurer") adminSafe[f] = v === undefined ? undefined : Boolean(v);
        else adminSafe[f] = v;
      }
    }
  }

  try {
    const updated = await db.character.update({
      where: { id },
      data: admin ? adminSafe : playerSafe,
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error("character update failed:", e);
    return NextResponse.json({ error: "Не удалось сохранить" }, { status: 500 });
  }
}
