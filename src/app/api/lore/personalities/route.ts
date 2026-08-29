import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/session";

// GET — list personalities visible to the caller.
// Admin sees all. Player sees: personalities with visibleGroupId null OR
// where their character is a member of the personality's group.
export async function GET() {
  const session = await requireUser();
  if (!session) return NextResponse.json({ error: "Войдите" }, { status: 401 });

  const isAdmin = session.user.role === "ADMIN";
  let items: any[];
  if (isAdmin) {
    items = await db.personality.findMany({ orderBy: { name: "asc" } });
  } else {
    const char = await db.character.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    const memberships = await db.groupMember.findMany({
      where: { characterId: char?.id ?? "none" },
      select: { groupId: true },
    });
    const groupIds = memberships.map((m) => m.groupId);
    items = await db.personality.findMany({
      where: {
        OR: [
          { visibleGroupId: null },
          { visibleGroupId: { in: groupIds } },
        ],
      },
      orderBy: { name: "asc" },
    });
  }
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Доступ дарован лишь Божеству" }, { status: 403 });
  const body = await req.json();
  const created = await db.personality.create({ data: body });
  return NextResponse.json(created, { status: 201 });
}
