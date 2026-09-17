"use client";

import { toast } from "sonner";
import { signOut } from "next-auth/react";

/** fetch-обёртка для API «Вампиров: Маскарад»:
 *  401 (устаревшая сессия — пользователь удалён из БД) → тост + принудительный выход.
 *  Полностью независимая от «Зова Ктулху» и основного мира вселенная. */
export async function vtmFetch(url: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, init);
  if (res.status === 401) {
    toast.error("Сессия недействительна", {
      description: "Войдите в основной мир заново — маска обновится.",
    });
    signOut({ callbackUrl: "/" });
    throw new Error("Сессия недействительна — войдите заново");
  }
  return res;
}
