import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { MAX_SHEETS } from "@/lib/coc-data";

/** GET /api/coc/sheets — список листов «Зова Ктулху» текущего пользователя
 *  (с миниатюрой портрета и профессией для карточек архива). */
export async function GET() {
  const session = await requireUser();
  if (!session) return NextResponse.json({ error: "Войдите" }, { status: 401 });
  const rows = await db.cocSheet.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, createdAt: true, updatedAt: true, data: true },
  });
  const sheets = rows.map((r) => {
    let portraitThumb: string | null = null;
    let occupation: string | null = null;
    try {
      const d = JSON.parse(r.data || "{}");
      portraitThumb = d?.info?.portraitThumb || null;
      occupation = d?.info?.occupation || null;
    } catch {
      // битые данные не должны ломать список
    }
    return {
      id: r.id,
      name: r.name,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      portraitThumb,
      occupation,
    };
  });
  return NextResponse.json(sheets);
}

/** POST — создать новый лист (не более 5 на пользователя). */
export async function POST(req: NextRequest) {
  const session = await requireUser();
  if (!session) return NextResponse.json({ error: "Войдите" }, { status: 401 });
  let body: { name?: string } = {};
  try {
    body = await req.json();
  } catch {
    // пустое тело допустимо
  }
  const count = await db.cocSheet.count({ where: { userId: session.user.id } });
  if (count >= MAX_SHEETS) {
    return NextResponse.json(
      { error: `Максимум ${MAX_SHEETS} листов. Удалите один из старых, чтобы создать новый.` },
      { status: 400 }
    );
  }
  const name = (body.name || "").trim() || "Новый сыщик";
  const sheet = await db.cocSheet.create({
    data: { userId: session.user.id, name, data: "{}" },
    select: { id: true, name: true, createdAt: true, updatedAt: true },
  });
  return NextResponse.json(sheet, { status: 201 });
}
