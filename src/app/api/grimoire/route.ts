import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/session";

// GET — list grimoire entries visible to the caller.
// Admin sees all. Player sees: entries with visibleGroupId null OR where their
// character is a member of the entry's group.
export async function GET() {
  const session = await requireUser();
  if (!session) return NextResponse.json({ error: "Войдите" }, { status: 401 });

  const isAdmin = session.user.role === "ADMIN";
  let entries: any[];
  if (isAdmin) {
    entries = await db.grimoireEntry.findMany({ orderBy: { order: "asc" } });
  } else {
    // Find groups the caller's character belongs to
    const char = await db.character.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    const memberships = await db.groupMember.findMany({
      where: { characterId: char?.id ?? "none" },
      select: { groupId: true },
    });
    const groupIds = memberships.map((m) => m.groupId);
    entries = await db.grimoireEntry.findMany({
      where: {
        OR: [
          { visibleGroupId: null },
          { visibleGroupId: { in: groupIds } },
        ],
      },
      orderBy: { order: "asc" },
    });
  }
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Доступ дарован лишь Божеству" }, { status: 403 });
  const body = await req.json();
  const created = await db.grimoireEntry.create({ data: body });
  return NextResponse.json(created, { status: 201 });
}
