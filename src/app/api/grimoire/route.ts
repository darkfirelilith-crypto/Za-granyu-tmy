import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export async function GET() {
  const entries = await db.grimoireEntry.findMany({ orderBy: { order: "asc" } });
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Доступ дарован лишь Божеству" }, { status: 403 });
  const body = await req.json();
  const created = await db.grimoireEntry.create({ data: body });
  return NextResponse.json(created, { status: 201 });
}
