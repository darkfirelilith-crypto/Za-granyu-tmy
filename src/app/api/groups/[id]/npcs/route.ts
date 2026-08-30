import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

// Attach an NPC to a group
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Доступ дарован лишь Божеству" }, { status: 403 });
  const { id } = await params;
  let body: { personalityId?: string; role?: string | null; notes?: string | null };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Неверное тело запроса" }, { status: 400 }); }
  const { personalityId, role, notes } = body;
  if (!personalityId) return NextResponse.json({ error: "Укажите personalityId" }, { status: 400 });
  // Validate FK existence (group + personality)
  const [group, personality] = await Promise.all([
    db.group.findUnique({ where: { id }, select: { id: true } }),
    db.personality.findUnique({ where: { id: personalityId }, select: { id: true } }),
  ]);
  if (!group) return NextResponse.json({ error: "Группа не найдена" }, { status: 404 });
  if (!personality) return NextResponse.json({ error: "Личность не найдена" }, { status: 404 });
  try {
    const npc = await db.groupNpc.upsert({
      where: { groupId_personalityId: { groupId: id, personalityId } },
      update: { role: role ?? null, notes: notes ?? null },
      create: { groupId: id, personalityId, role: role ?? null, notes: notes ?? null },
    });
    return NextResponse.json(npc, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Не удалось добавить" }, { status: 500 });
  }
}

// Detach an NPC from a group
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Доступ дарован лишь Божеству" }, { status: 403 });
  const { id } = await params;
  const url = new URL(req.url);
  const personalityId = url.searchParams.get("personalityId");
  if (!personalityId) return NextResponse.json({ error: "Укажите personalityId" }, { status: 400 });
  await db.groupNpc.delete({ where: { groupId_personalityId: { groupId: id, personalityId } } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
