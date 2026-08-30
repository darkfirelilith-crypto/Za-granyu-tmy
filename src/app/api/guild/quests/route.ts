import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/session";

export async function GET() {
  // Require auth: this endpoint exposes the player roster via progress.character.
  const session = await requireUser();
  if (!session) return NextResponse.json({ error: "Войдите" }, { status: 401 });
  const admin = await requireAdmin();
  // Non-admins don't need to see who else took each quest — drop the character include.
  if (admin) {
    const quests = await db.quest.findMany({
      orderBy: { createdAt: "desc" },
      include: { progress: { include: { character: { select: { name: true, id: true } } } } },
    });
    return NextResponse.json(quests);
  }
  const quests = await db.quest.findMany({
    orderBy: { createdAt: "desc" },
    include: { progress: true },
  });
  return NextResponse.json(quests);
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Доступ дарован лишь Божеству" }, { status: 403 });
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Неверное тело запроса" }, { status: 400 });
  }
  if (!body?.title || !body?.description) {
    return NextResponse.json({ error: "Укажите title и description" }, { status: 400 });
  }
  try {
    const created = await db.quest.create({ data: body });
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Не удалось создать задание" }, { status: 500 });
  }
}
