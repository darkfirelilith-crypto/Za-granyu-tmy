import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireLiveUser } from "@/lib/session";
import { MAX_SHEETS, normalizeSheet } from "@/lib/vtm-data";
import { VTM_TEMPLATES, buildTemplateSheet } from "@/lib/vtm-templates";
import { buildRandomSheet } from "@/lib/vtm-random";

const UNAUTHORIZED = { error: "Сессия недействительна — войдите заново" };

/** GET /api/vtm/sheets — список листов «Вампиров: Маскарад» текущего пользователя
 *  (с миниатюрой портрета, кланом и ручным порядком сортировки для карточек архива). */
export async function GET() {
  const session = await requireLiveUser();
  if (!session) return NextResponse.json(UNAUTHORIZED, { status: 401 });
  const rows = await db.vtmSheet.findMany({
    where: { userId: session.user.id },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    select: { id: true, name: true, createdAt: true, updatedAt: true, data: true },
  });
  const sheets = rows.map((r) => {
    let portraitThumb: string | null = null;
    let clan: string | null = null;
    try {
      const d = JSON.parse(r.data || "{}");
      portraitThumb = d?.info?.portraitThumb || null;
      clan = d?.info?.clan || null;
    } catch {
      // битые данные не должны ломать список
    }
    return {
      id: r.id,
      name: r.name,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      portraitThumb,
      clan,
    };
  });
  return NextResponse.json(sheets);
}

/** POST — создать новый лист (не более 5 на пользователя).
 *  Тело: { name?: string, template?: string, preset?: unknown } — template это id
 *  заготовки из VTM_TEMPLATES или "random" (случайный Сородич). Для "random"
 *  можно передать preset — ранее сгенерированный на /api/vtm/random предпросмотр,
 *  который игрок принял («Принять кровь»). */
export async function POST(req: NextRequest) {
  const session = await requireLiveUser();
  if (!session) return NextResponse.json(UNAUTHORIZED, { status: 401 });
  let body: { name?: string; template?: string; preset?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const count = await db.vtmSheet.count({ where: { userId: session.user.id } });
  if (count >= MAX_SHEETS) {
    return NextResponse.json(
      { error: `У тебя уже ${MAX_SHEETS} ночей — предай одну земле, прежде чем пробудить новую` },
      { status: 409 }
    );
  }

  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : undefined;
  let data: unknown = undefined;
  let tplName: string | undefined = undefined;
  if (body.template === "random") {
    // принимаем решение Крови: либо присланный preset (предпросмотр), либо свежий бросок
    const parsed = body.preset ? normalizeSheet(body.preset) : buildRandomSheet();
    data = parsed;
    tplName = parsed.info.name || "Случайный Сородич";
  } else if (body.template) {
    const tpl = VTM_TEMPLATES.find((t) => t.id === body.template);
    if (!tpl) return NextResponse.json({ error: "Неизвестная заготовка" }, { status: 400 });
    data = buildTemplateSheet(tpl.id);
    tplName = tpl.sheet.info.name || tpl.title;
  }

  const minSort = await db.vtmSheet.aggregate({
    where: { userId: session.user.id },
    _min: { sortOrder: true },
  });
  const created = await db.vtmSheet.create({
    data: {
      userId: session.user.id,
      name: name ?? tplName ?? "Новая ночь",
      data: JSON.stringify(data ?? {}),
      sortOrder: (minSort._min.sortOrder ?? 0) - 1,
    },
    select: { id: true, name: true, updatedAt: true },
  });
  return NextResponse.json(created, { status: 201 });
}
