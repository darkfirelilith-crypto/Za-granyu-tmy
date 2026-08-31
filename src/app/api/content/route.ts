import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

// Public read (anyone, even logged-out — it's page content)
export async function GET() {
  const items = await db.siteContent.findMany();
  return NextResponse.json(items);
}

// Admin-only create/upsert (used internally; editing is via [key] PUT)
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Доступ дарован лишь Божеству" }, { status: 403 });
  let body: { key?: string; title?: string | null; body?: string | null; image?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Неверное тело запроса" }, { status: 400 });
  }
  const { key, title, body: text, image } = body;
  if (!key) return NextResponse.json({ error: "Укажите key" }, { status: 400 });
  const item = await db.siteContent.upsert({
    where: { key },
    update: { title, body: text, image },
    create: { key, title, body: text, image },
  });
  return NextResponse.json(item, { status: 201 });
}
