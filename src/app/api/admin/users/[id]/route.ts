import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { hashPassword } from "@/lib/password";

/** PUT — update user role and/or reset password. */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Доступ дарован лишь Божеству" }, { status: 403 });
  const { id } = await params;
  const { role, password } = await req.json();
  const data: { role?: string; password?: string } = {};
  if (role === "ADMIN" || role === "PLAYER") data.role = role;
  if (password && password.length >= 6) data.password = hashPassword(password);
  const updated = await db.user.update({ where: { id }, data, select: { id: true, email: true, name: true, role: true } });
  return NextResponse.json(updated);
}

/** DELETE — delete a user (and cascade their character). */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Доступ дарован лишь Божеству" }, { status: 403 });
  const { id } = await params;
  // Prevent deleting the last admin
  const admins = await db.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  if (admins.length === 1 && admins[0].id === id) {
    return NextResponse.json({ error: "Нельзя удалить последнего Божества" }, { status: 400 });
  }
  await db.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
