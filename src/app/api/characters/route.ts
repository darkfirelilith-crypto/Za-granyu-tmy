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
  const body = await req.json();
  const { id, ...data } = body;

  const target = await db.character.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "Персонаж не найден" }, { status: 404 });

  const admin = await requireAdmin();
  if (!admin && target.userId !== session.user.id) {
    return NextResponse.json({ error: "Чужой свиток не переписать" }, { status: 403 });
  }

  // Players cannot change xp / level / rank directly
  const safeData = admin
    ? data
    : {
        name: data.name,
        race: data.race,
        charClass: data.charClass,
        alignment: data.alignment,
        bio: data.bio,
        traits: data.traits,
        ideals: data.ideals,
        motives: data.motives,
        portrait: data.portrait,
      };

  const updated = await db.character.update({ where: { id }, data: safeData });
  return NextResponse.json(updated);
}
