import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { slimImages, wantsFull } from "@/lib/lore-images";
import { requireAdmin } from "@/lib/session";

export async function GET(req: NextRequest) {
const _full = wantsFull(req);
const items = _full
  ? slimImages("god", await db.god.findMany({ orderBy: { name: "asc" } }), true)
  : slimImages("god", await db.god.findMany({ orderBy: { name: "asc" }, omit: { image: true } }), false);
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Доступ дарован лишь Божеству" }, { status: 403 });
  const body = await req.json();
  const created = await db.god.create({ data: body });
  return NextResponse.json(created, { status: 201 });
}
