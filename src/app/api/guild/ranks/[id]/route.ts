import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Доступ дарован лишь Божеству" }, { status: 403 });
  const { id } = await params;
  let body: { name?: string; level?: number; description?: string | null; icon?: string | null; minXp?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Неверное тело запроса" }, { status: 400 });
  }
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.level !== undefined) data.level = Number(body.level);
  if (body.description !== undefined) data.description = body.description;
  if (body.icon !== undefined) data.icon = body.icon;
  if (body.minXp !== undefined) data.minXp = Number(body.minXp);
  try {
    const updated = await db.guildRank.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    if (code === "P2002") return NextResponse.json({ error: "Ранг с таким уровнем уже существует" }, { status: 409 });
    if (code === "P2025") return NextResponse.json({ error: "Ранг не найден" }, { status: 404 });
    return NextResponse.json({ error: "Не удалось обновить ранг" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Доступ дарован лишь Божеству" }, { status: 403 });
  const { id } = await params;
  // Prevent deleting a rank still referenced by characters (would 500 on FK)
  const refCount = await db.character.count({ where: { guildRankId: id } });
  if (refCount > 0) {
    return NextResponse.json(
      { error: `Нельзя удалить ранг: ${refCount} персонаж(ев) его используют. Сначала переведите их на другой ранг.` },
      { status: 409 },
    );
  }
  try {
    await db.guildRank.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    if (code === "P2025") return NextResponse.json({ error: "Ранг не найден" }, { status: 404 });
    return NextResponse.json({ error: "Не удалось удалить ранг" }, { status: 500 });
  }
}
