import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

// GET — which characters currently hold this Lab entry (admin only).
// Powers the "выдать героям" dialog in the Lab editor: it needs to know who
// already has the item before offering to grant it. Deliberately admin-gated —
// a player must not be able to enumerate other players' inventories.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Доступ дарован лишь Божеству" }, { status: 403 });
  const { id } = await params;

  const holders = await db.characterItem.findMany({
    where: { labEntryId: id },
    select: {
      id: true,
      characterId: true,
      note: true,
      grantedAt: true,
      character: { select: { id: true, name: true } },
    },
    orderBy: { grantedAt: "desc" },
  });
  return NextResponse.json(holders);
}
