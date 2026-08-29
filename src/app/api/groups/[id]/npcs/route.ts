import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

// Attach an NPC to a group
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Доступ дарован лишь Божеству" }, { status: 403 });
  const { id } = await params;
  const { personalityId, role, notes } = await req.json();
  if (!personalityId) return NextResponse.json({ error: "Укажите personalityId" }, { status: 400 });
  const npc = await db.groupNpc.upsert({
    where: { groupId_personalityId: { groupId: id, personalityId } },
    update: { role: role ?? null, notes: notes ?? null },
    create: { groupId: id, personalityId, role: role ?? null, notes: notes ?? null },
  });
  return NextResponse.json(npc, { status: 201 });
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
