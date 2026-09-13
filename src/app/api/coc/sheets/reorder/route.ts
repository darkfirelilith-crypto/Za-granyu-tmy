import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireLiveUser } from "@/lib/session";

const UNAUTHORIZED = { error: "Сессия недействительна — войдите заново" };

/** POST /api/coc/sheets/reorder — сохранить ручной порядок дел архива.
 *  Тело: { ids: string[] } — порядок карточек сверху вниз.
 *  Все id должны принадлежать текущему пользователю. */
export async function POST(req: NextRequest) {
  const session = await requireLiveUser();
  if (!session) return NextResponse.json(UNAUTHORIZED, { status: 401 });

  let body: { ids?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Неверное тело запроса" }, { status: 400 });
  }
  const ids = Array.isArray(body.ids)
    ? body.ids.filter((i): i is string => typeof i === "string")
    : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: "Пустой порядок" }, { status: 400 });
  }

  // проверяем владение всеми делами
  const owned = await db.cocSheet.findMany({
    where: { userId: session.user.id, id: { in: ids } },
    select: { id: true },
  });
  if (owned.length !== ids.length) {
    return NextResponse.json({ error: "Чужой лист в порядке сортировки" }, { status: 403 });
  }

  await db.$transaction(
    ids.map((id, i) =>
      db.cocSheet.update({ where: { id }, data: { sortOrder: i + 1 }, select: { id: true } })
    )
  );
  return NextResponse.json({ ok: true });
}
