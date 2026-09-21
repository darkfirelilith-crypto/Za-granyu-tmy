import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { slimImages, wantsFull } from "@/lib/lore-images";
import { requireAdmin } from "@/lib/session";

export async function GET(req: NextRequest) {
const _full = wantsFull(req);
const countries = _full
  ? slimImages("country", await db.country.findMany({ orderBy: { name: "asc" } }), true)
  : slimImages("country", await db.country.findMany({ orderBy: { name: "asc" }, omit: { banner: true } }), false);
  return NextResponse.json(countries);
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Доступ дарован лишь Божеству" }, { status: 403 });
  const body = await req.json();
  const created = await db.country.create({ data: body });
  return NextResponse.json(created, { status: 201 });
}
