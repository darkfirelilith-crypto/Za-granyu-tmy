import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { slimImages, wantsFull } from "@/lib/lore-images";
import { requireAdmin } from "@/lib/session";

// Public read (it's world lore); only admin can create
export async function GET(req: NextRequest) {
  const _full = wantsFull(req);
const items = _full
  ? slimImages("labEntry", await db.labEntry.findMany({ orderBy: [{ kind: "asc" }, { order: "asc" }] }), true)
  : slimImages("labEntry", await db.labEntry.findMany({ orderBy: [{ kind: "asc" }, { order: "asc" }], omit: { image: true } }), false);
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Доступ дарован лишь Божеству" }, { status: 403 });
  const body = await req.json();
  const created = await db.labEntry.create({ data: body });
  return NextResponse.json(created, { status: 201 });
}
