import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { slimImages, wantsFull } from "@/lib/lore-images";
import { requireAdmin } from "@/lib/session";

export async function GET(req: NextRequest) {
const _full = wantsFull(req);
const items = _full
  ? slimImages("worldSystem", await db.worldSystem.findMany({ orderBy: { title: "asc" } }), true)
  : slimImages("worldSystem", await db.worldSystem.findMany({ orderBy: { title: "asc" }, omit: { image: true } }), false);
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Доступ дарован лишь Божеству" }, { status: 403 });
  const body = await req.json();
  const created = await db.worldSystem.create({ data: body });
  return NextResponse.json(created, { status: 201 });
}
