import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

// Grant an achievement to a character (admin), or revoke it
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Лишь Божество раздаёт достижения" }, { status: 403 });
  const { characterId, achievementId, action } = await req.json();

  if (action === "revoke") {
    await db.characterAchievement
      .delete({ where: { characterId_achievementId: { characterId, achievementId } } })
      .catch(() => {});
    return NextResponse.json({ ok: true, revoked: true });
  }

  const created = await db.characterAchievement
    .upsert({
      where: { characterId_achievementId: { characterId, achievementId } },
      update: {},
      create: { characterId, achievementId, grantedBy: admin.user.id },
    })
    .catch(() => null);

  return NextResponse.json({ ok: true, granted: true });
}
