import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Доступ дарован лишь Божеству" }, { status: 403 });
  const { key } = await params;
  const { title, body, image } = await req.json();
  const item = await db.siteContent.upsert({
    where: { key },
    update: { title: title ?? null, body: body ?? null, image: image ?? null },
    create: { key, title: title ?? null, body: body ?? null, image: image ?? null },
  });
  return NextResponse.json(item);
}
