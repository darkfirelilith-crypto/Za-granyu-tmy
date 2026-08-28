import { NextResponse } from "next/server";
import { requireUser, getCurrentCharacter } from "@/lib/session";

export async function GET() {
  const session = await requireUser();
  if (!session) return NextResponse.json({ user: null, character: null });

  const character = await getCurrentCharacter(session.user.id);
  return NextResponse.json({ user: session.user, character });
}
