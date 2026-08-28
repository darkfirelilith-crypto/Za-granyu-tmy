import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

// Toggle unlocked state of a grimoire entry
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Лишь Божество снимает печати" }, { status: 403 });
  const { id } = await params;
  const entry = await db.grimoireEntry.findUnique({ where: { id } });
  if (!entry) return NextResponse.json({ error: "Страница не найдена" }, { status: 404 });
  const updated = await db.grimoireEntry.update({
    where: { id },
    data: { unlocked: !entry.unlocked },
  });
  return NextResponse.json(updated);
}
