import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

// Add a character to a group
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Доступ дарован лишь Божеству" }, { status: 403 });
  const { id } = await params;
  let body: { characterId?: string; role?: string | null };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Неверное тело запроса" }, { status: 400 }); }
  const { characterId, role } = body;
  if (!characterId) return NextResponse.json({ error: "Укажите characterId" }, { status: 400 });
  // Validate FK existence (group + character)
  const [group, character] = await Promise.all([
    db.group.findUnique({ where: { id }, select: { id: true } }),
    db.character.findUnique({ where: { id: characterId }, select: { id: true } }),
  ]);
  if (!group) return NextResponse.json({ error: "Группа не найдена" }, { status: 404 });
  if (!character) return NextResponse.json({ error: "Персонаж не найден" }, { status: 404 });
  try {
    const member = await db.groupMember.upsert({
      where: { groupId_characterId: { groupId: id, characterId } },
      update: { role: role ?? null },
      create: { groupId: id, characterId, role: role ?? null },
    });
    return NextResponse.json(member, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Не удалось добавить" }, { status: 500 });
  }
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
