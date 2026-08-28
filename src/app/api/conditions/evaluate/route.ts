import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { evaluateConditions } from "@/lib/conditions";

/** POST /api/conditions/evaluate?characterId=...
 *  Admin-only: manually evaluate all conditions for a character (e.g. after
 *  setting up new conditions). Returns the unlocked/granted items. */
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Доступ дарован лишь Божеству" }, { status: 403 });
  const url = new URL(req.url);
  const characterId = url.searchParams.get("characterId");
  if (!characterId) return NextResponse.json({ error: "Укажите characterId" }, { status: 400 });
  const result = await evaluateConditions(characterId);
  return NextResponse.json(result);
}
