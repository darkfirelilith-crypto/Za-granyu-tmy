import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

// Public read (it's world lore); only admin can create
export async function GET() {
  const items = await db.labEntry.findMany({ orderBy: [{ kind: "asc" }, { order: "asc" }] });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Доступ дарован лишь Божеству" }, { status: 403 });
  const body = await req.json();
  const created = await db.labEntry.create({ data: body });
  return NextResponse.json(created, { status: 201 });
}
