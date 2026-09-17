import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireLiveUser } from "@/lib/session";

const UNAUTHORIZED = { error: "Сессия недействительна — войдите заново" };

/** GET — получить один лист с полными данными. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireLiveUser();
  if (!session) return NextResponse.json(UNAUTHORIZED, { status: 401 });
  const { id } = await params;
  const sheet = await db.cocSheet.findUnique({ where: { id } });
  if (!sheet) return NextResponse.json({ error: "Лист не найден" }, { status: 404 });
  if (sheet.userId !== session.user.id) {
    return NextResponse.json({ error: "Чужой лист" }, { status: 403 });
  }
  let data: unknown = {};
  try {
    data = JSON.parse(sheet.data || "{}");
  } catch {
    data = {};
  }
  return NextResponse.json({ ...sheet, data });
}

/** PUT — сохранить данные листа (name + data).
 *  Предохранитель от двух вкладок: если клиент прислал baseUpdatedAt,
 *  а в базе лист новее — отдаём 409 с серверной версией, данные не трогаем. */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireLiveUser();
  if (!session) return NextResponse.json(UNAUTHORIZED, { status: 401 });
  const { id } = await params;
  let body: { name?: string; data?: unknown; baseUpdatedAt?: string; force?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Неверное тело запроса" }, { status: 400 });
  }
  const sheet = await db.cocSheet.findUnique({ where: { id } });
  if (!sheet) return NextResponse.json({ error: "Лист не найден" }, { status: 404 });
  if (sheet.userId !== session.user.id) {
    return NextResponse.json({ error: "Чужой лист" }, { status: 403 });
  }
  // Конфликт версий: серверная копия изменилась после того, как клиент её открыл.
  // Допуск 3 сек — на часы и задержки сети; force=true — «всё равно записать».
  if (!body.force && body.baseUpdatedAt) {
    const base = new Date(body.baseUpdatedAt).getTime();
    const serverTs = new Date(sheet.updatedAt).getTime();
    if (!isNaN(base) && serverTs - base > 3000) {
      let serverData: unknown = {};
      try {
        serverData = JSON.parse(sheet.data || "{}");
      } catch {
        serverData = {};
      }
      return NextResponse.json(
        {
          error: "Дело изменено в другом окне",
          serverUpdatedAt: sheet.updatedAt,
          serverData,
        },
        { status: 409 }
      );
    }
  }
  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : sheet.name;
  const dataStr =
    body.data === undefined ? sheet.data : JSON.stringify(body.data);
  // Портреты могут быть большими — грубый предохранитель (~4 МБ JSON)
  if (dataStr.length > 4_000_000) {
    return NextResponse.json({ error: "Лист слишком велик (портрет?) — уменьшите изображение" }, { status: 413 });
  }
  const updated = await db.cocSheet.update({
    where: { id },
    data: { name, data: dataStr },
    select: { id: true, name: true, updatedAt: true },
  });
  return NextResponse.json(updated);
}

/** DELETE — удалить лист. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireLiveUser();
  if (!session) return NextResponse.json(UNAUTHORIZED, { status: 401 });
  const { id } = await params;
  const sheet = await db.cocSheet.findUnique({ where: { id } });
  if (!sheet) return NextResponse.json({ error: "Лист не найден" }, { status: 404 });
  if (sheet.userId !== session.user.id) {
    return NextResponse.json({ error: "Чужой лист" }, { status: 403 });
  }
  await db.cocSheet.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
