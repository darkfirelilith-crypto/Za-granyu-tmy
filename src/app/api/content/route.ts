import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Public read (anyone, even logged-out — it's page content)
export async function GET() {
  const items = await db.siteContent.findMany();
  return NextResponse.json(items);
}

// Admin create/upsert (used internally; editing is via [key] PUT)
export async function POST(req: NextRequest) {
  // Defer admin check to caller; this route creates a new content entry
  const { key, title, body, image } = await req.json();
  if (!key) return NextResponse.json({ error: "Укажите key" }, { status: 400 });
  const item = await db.siteContent.upsert({
    where: { key },
    update: { title, body, image },
    create: { key, title, body, image },
  });
  return NextResponse.json(item, { status: 201 });
}
