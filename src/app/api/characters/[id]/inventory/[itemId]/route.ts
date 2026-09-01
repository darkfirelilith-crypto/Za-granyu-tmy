import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

// DELETE — remove an item from a character's inventory (admin only).
// The itemId is the CharacterItem.id (a cuid), not the labEntryId.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Лишь Божество отбирает предметы" }, { status: 403 });
  const { id, itemId } = await params;

  // Ensure the item belongs to the character in the URL — prevents cross-character deletion.
  const item = await db.characterItem.findUnique({
    where: { id: itemId },
    select: { id: true, characterId: true },
  });
  if (!item || item.characterId !== id) {
    return NextResponse.json({ error: "Предмет не найден у этого героя" }, { status: 404 });
  }

  try {
    await db.characterItem.delete({ where: { id: itemId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("revoke item failed:", e);
    return NextResponse.json({ error: "Не удалось забрать предмет" }, { status: 500 });
  }
}
