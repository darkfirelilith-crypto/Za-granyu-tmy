import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/session";

// Public read (any logged-in user)
export async function GET() {
  const session = await requireUser();
  if (!session) return NextResponse.json({ error: "Войдите" }, { status: 401 });
  const groups = await db.group.findMany({
    include: {
      members: { include: { character: { select: { id: true, name: true, portrait: true, race: true, charClass: true, level: true, guildRank: { select: { name: true, icon: true } } } } } },
      npcs: { include: { personality: { select: { id: true, name: true, title: true, portrait: true, status: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(groups);
}

// Admin create
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Доступ дарован лишь Божеству" }, { status: 403 });
  const { name, description, image } = await req.json();
  if (!name) return NextResponse.json({ error: "Укажите имя группы" }, { status: 400 });
  const group = await db.group.create({ data: { name, description, image } });
  return NextResponse.json(group, { status: 201 });
}
