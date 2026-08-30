import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { hashPassword } from "@/lib/password";

/** PUT — update user role and/or reset password. */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Доступ дарован лишь Божеству" }, { status: 403 });
  const { id } = await params;
  let body: { role?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Неверное тело запроса" }, { status: 400 });
  }
  const { role, password } = body;

  // Validate role if provided
  if (role !== undefined && role !== "ADMIN" && role !== "PLAYER") {
    return NextResponse.json({ error: "Неверная роль" }, { status: 400 });
  }

  // Last-admin guard: prevent demoting the only remaining admin
  if (role === "PLAYER") {
    const target = await db.user.findUnique({ where: { id }, select: { role: true } });
    if (!target) return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
    if (target.role === "ADMIN") {
      const adminCount = await db.user.count({ where: { role: "ADMIN" } });
      if (adminCount <= 1) {
        return NextResponse.json({ error: "Нельзя понизить последнее Божество — иначе некому править миром" }, { status: 400 });
      }
    }
  }

  const data: { role?: string; password?: string } = {};
  if (role === "ADMIN" || role === "PLAYER") data.role = role;
  if (password && password.length >= 6) data.password = hashPassword(password);

  try {
    const updated = await db.user.update({
      where: { id },
      data,
      select: { id: true, email: true, name: true, role: true },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  }
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
  try {
    await db.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  }
}
