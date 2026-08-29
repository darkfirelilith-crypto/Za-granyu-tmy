import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

// Add a character to a group
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Доступ дарован лишь Божеству" }, { status: 403 });
  const { id } = await params;
  const { characterId, role } = await req.json();
  if (!characterId) return NextResponse.json({ error: "Укажите characterId" }, { status: 400 });
  const member = await db.groupMember.upsert({
    where: { groupId_characterId: { groupId: id, characterId } },
    update: { role: role ?? null },
    create: { groupId: id, characterId, role: role ?? null },
  });
  return NextResponse.json(member, { status: 201 });
}

// Remove a character from a group
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Доступ дарован лишь Божеству" }, { status: 403 });
  const { id } = await params;
  const url = new URL(req.url);
  const characterId = url.searchParams.get("characterId");
  if (!characterId) return NextResponse.json({ error: "Укажите characterId" }, { status: 400 });
  await db.groupMember.delete({ where: { groupId_characterId: { groupId: id, characterId } } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
