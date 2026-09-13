import { NextRequest, NextResponse } from "next/server";
import { requireLiveUser } from "@/lib/session";
import { buildRandomSheet } from "@/lib/coc-random";

const UNAUTHORIZED = { error: "Сессия недействительна — войдите заново" };

/** POST /api/coc/random — бросить судьбу: сгенерировать случайного сыщика
 *  «на предпросмотр». Ничего не записывается в архив — клиент показывает
 *  решение тьмы, и игрок либо принимает его (POST /api/coc/sheets с preset),
 *  либо перебрасывает кости. */
export async function POST(_req: NextRequest) {
  const session = await requireLiveUser();
  if (!session) return NextResponse.json(UNAUTHORIZED, { status: 401 });
  try {
    const data = buildRandomSheet();
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json(
      { error: "Судьба дрогнула — кости упали ребром. Попробуйте ещё раз." },
      { status: 500 }
    );
  }
}
