import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export async function GET() {
  const items = await db.guildRank.findMany({ orderBy: { level: "asc" } });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Доступ дарован лишь Божеству" }, { status: 403 });
  let body: { name?: string; level?: number; description?: string | null; icon?: string | null; minXp?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Неверное тело запроса" }, { status: 400 });
  }
  if (!body.name || body.level === undefined) {
    return NextResponse.json({ error: "Укажите name и level" }, { status: 400 });
  }
  try {
    const created = await db.guildRank.create({
      data: {
        name: body.name,
        level: Number(body.level),
        description: body.description ?? null,
        icon: body.icon ?? null,
        minXp: body.minXp === undefined ? 0 : Number(body.minXp),
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (e: unknown) {
    // P2002 = unique constraint violation (duplicate level)
    const code = (e as { code?: string })?.code;
    if (code === "P2002") {
      return NextResponse.json({ error: "Ранг с таким уровнем уже существует" }, { status: 409 });
    }
    console.error("guild rank create failed:", e);
    return NextResponse.json({ error: "Не удалось создать ранг" }, { status: 500 });
  }
}
