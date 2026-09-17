import { NextResponse } from "next/server";
import { requireLiveUser } from "@/lib/session";
import { buildRandomSheet } from "@/lib/vtm-random";

const UNAUTHORIZED = { error: "Сессия недействительна — войдите заново" };

/** POST /api/vtm/random — предпросмотр случайного Сородича («Пусть Кровь решит»).
 *  Не сохраняет ничего: игрок видит решение Крови и может перебросить или принять
 *  (принятие идёт через POST /api/vtm/sheets с { template: "random", preset }). */
export async function POST() {
  const session = await requireLiveUser();
  if (!session) return NextResponse.json(UNAUTHORIZED, { status: 401 });
  const data = buildRandomSheet();
  return NextResponse.json({ data });
}
