import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/session";

// GET — list items in a character's inventory.
// Allowed for: the character's owner OR an admin.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireUser();
  if (!session) return NextResponse.json({ error: "Войдите" }, { status: 401 });
  const { id } = await params;

  const character = await db.character.findUnique({
    where: { id },
    select: { id: true, userId: true },
  });
  if (!character) return NextResponse.json({ error: "Персонаж не найден" }, { status: 404 });

  const admin = await requireAdmin();
  if (!admin && character.userId !== session.user.id) {
    return NextResponse.json({ error: "Чужой свиток не читается" }, { status: 403 });
  }

  const items = await db.characterItem.findMany({
    where: { characterId: id },
    include: {
      labEntry: {
        select: {
          id: true,
          name: true,
          icon: true,
          kind: true,
          rarity: true,
          subtitle: true,
          description: true,
          details: true,
          image: true,
          itemType: true,
          attunement: true,
          spellLevel: true,
          school: true,
          concentration: true,
          ritual: true,
          components: true,
          castingTime: true,
          spellRange: true,
          spellClasses: true,
        },
      },
    },
    orderBy: { grantedAt: "desc" },
  });
  return NextResponse.json(items);
}

// POST — grant an item to a character (admin only).
// Body: { labEntryId: string, note?: string }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Лишь Божество раздаёт предметы" }, { status: 403 });
  const { id } = await params;

  let body: { labEntryId?: string; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Неверное тело запроса" }, { status: 400 });
  }
  const { labEntryId, note } = body;
  if (!labEntryId) {
    return NextResponse.json({ error: "Укажите labEntryId" }, { status: 400 });
  }

  // Validate FK existence
  const [character, labEntry] = await Promise.all([
    db.character.findUnique({ where: { id }, select: { id: true } }),
    db.labEntry.findUnique({ where: { id: labEntryId }, select: { id: true } }),
  ]);
  if (!character) return NextResponse.json({ error: "Персонаж не найден" }, { status: 404 });
  if (!labEntry) return NextResponse.json({ error: "Запись Лаборатории не найдена" }, { status: 404 });

  try {
    const item = await db.characterItem.upsert({
      where: { characterId_labEntryId: { characterId: id, labEntryId } },
      update: { note: note ?? null, grantedBy: admin.user.id },
      create: {
        characterId: id,
        labEntryId,
        note: note ?? null,
        grantedBy: admin.user.id,
      },
      include: {
        labEntry: {
          select: {
            id: true,
            name: true,
            icon: true,
            kind: true,
            rarity: true,
            subtitle: true,
            description: true,
            details: true,
            image: true,
            itemType: true,
            attunement: true,
            spellLevel: true,
            school: true,
            concentration: true,
            ritual: true,
            components: true,
            castingTime: true,
            spellRange: true,
            spellClasses: true,
          },
        },
      },
    });
    return NextResponse.json(item, { status: 201 });
  } catch (e) {
    console.error("grant item failed:", e);
    return NextResponse.json({ error: "Не удалось выдать предмет" }, { status: 500 });
  }
}
