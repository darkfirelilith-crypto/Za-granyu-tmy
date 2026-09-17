"use client";

import { toast } from "sonner";
import { signOut } from "next-auth/react";

/** fetch-обёртка для API «Зова Ктулху»:
 *  401 (устаревшая сессия — пользователь удалён из БД) → тост + принудительный выход. */
export async function cocFetch(url: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, init);
  if (res.status === 401) {
    toast.error("Сессия недействительна", {
      description: "Войдите в основной мир заново — печать на вратах обновится.",
    });
    signOut({ callbackUrl: "/" });
    throw new Error("Сессия недействительна — войдите заново");
  }
  return res;
}
