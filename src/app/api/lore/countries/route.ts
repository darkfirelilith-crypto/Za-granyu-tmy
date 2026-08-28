import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export async function GET() {
  const countries = await db.country.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(countries);
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Доступ дарован лишь Божеству" }, { status: 403 });
  const body = await req.json();
  const created = await db.country.create({ data: body });
  return NextResponse.json(created, { status: 201 });
}
