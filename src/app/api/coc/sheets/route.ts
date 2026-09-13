import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireLiveUser } from "@/lib/session";
import { MAX_SHEETS } from "@/lib/coc-data";
import { COC_TEMPLATES, buildTemplateSheet } from "@/lib/coc-templates";
import { buildRandomSheet } from "@/lib/coc-random";

const UNAUTHORIZED = { error: "Сессия недействительна — войдите заново" };

/** GET /api/coc/sheets — список листов «Зова Ктулху» текущего пользователя
 *  (с миниатюрой портрета, профессией и ручным порядком сортировки для карточек архива). */
export async function GET() {
  const session = await requireLiveUser();
  if (!session) return NextResponse.json(UNAUTHORIZED, { status: 401 });
  const rows = await db.cocSheet.findMany({
    where: { userId: session.user.id },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
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

/** POST — создать новый лист (не более 5 на пользователя).
 *  Тело: { name?: string, template?: string } — template это id готового
 *  сыщика из COC_TEMPLATES (лист создаётся сразу заполненным). */
export async function POST(req: NextRequest) {
  const session = await requireLiveUser();
  if (!session) return NextResponse.json(UNAUTHORIZED, { status: 401 });
  let body: { name?: string; template?: string } = {};
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
  const tpl = body.template ? COC_TEMPLATES.find((t) => t.id === body.template) : null;
  if (body.template && body.template !== "random" && !tpl) {
    return NextResponse.json({ error: "Неизвестный шаблон сыщика" }, { status: 400 });
  }
  let sheetData: object = {};
  if (body.template === "random") {
    sheetData = buildRandomSheet();
  } else if (tpl) {
    sheetData = buildTemplateSheet(tpl.id) || {};
  }
  const generatedName =
    body.template === "random"
      ? (sheetData as { info?: { name?: string } })?.info?.name
      : tpl?.name;
  const name = (body.name || generatedName || "").trim() || "Новый сыщик";
  const dataStr = JSON.stringify(sheetData);
  // новое дело кладём в конец архива
  const maxOrder = await db.cocSheet.aggregate({
    where: { userId: session.user.id },
    _max: { sortOrder: true },
  });
  const sheet = await db.cocSheet.create({
    data: {
      userId: session.user.id,
      name,
      data: dataStr,
      sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
    },
    select: { id: true, name: true, createdAt: true, updatedAt: true },
  });
  return NextResponse.json(sheet, { status: 201 });
}
