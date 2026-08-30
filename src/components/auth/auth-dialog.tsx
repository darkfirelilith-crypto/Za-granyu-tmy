"use client";

import { useState } from "react";
import { signIn, signOut } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { OrnamentTitle } from "@/components/fantasy/ornament-title";

export function AuthDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [characterName, setCharacterName] = useState("");
  const { toast } = useToast();
  const qc = useQueryClient();

  const loginMut = useMutation({
    mutationFn: async () => {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (!res?.ok) throw new Error(res?.error || "Ошибка входа");
      return res;
    },
    onSuccess: () => {
      toast({ title: "Добро пожаловать, авантюрист", description: "Свиток открыт для вас." });
      onOpenChange(false);
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["characters"] });
      setEmail("");
      setPassword("");
    },
    onError: (e: Error) =>
      toast({ title: "Печать не сломлена", description: e.message, variant: "destructive" }),
  });

  const registerMut = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, characterName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка");
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Новый герой рождён",
        description: "Профиль создан. Теперь войдите под своими знаками.",
      });
      setMode("login");
      setName("");
      setCharacterName("");
    },
    onError: (e: Error) =>
      toast({ title: "Знамение не принято", description: e.message, variant: "destructive" }),
  });

  const submit = () => {
    if (mode === "login") loginMut.mutate();
    else registerMut.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="parchment gold-frame max-w-lg">
        <DialogHeader>
          <OrnamentTitle size="md" className="mb-2">
            {mode === "login" ? "Вход в Хроникаль" : "Рождение Героя"}
          </OrnamentTitle>
          <DialogDescription className="parchment-muted text-center font-[family-name:var(--font-garamond)]">
            {mode === "login"
              ? "Предъявите свои знаки стражу врат"
              : "Запишите имя своё в Книгу Героев"}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
          <TabsList className="grid grid-cols-2 w-full bg-parchment-dark/30">
            <TabsTrigger value="login" className="font-[family-name:var(--font-cinzel)]">
              Вход
            </TabsTrigger>
            <TabsTrigger value="register" className="font-[family-name:var(--font-cinzel)]">
              Регистрация
            </TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label className="parchment-heading text-sm">Знак (Email)</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="герой@эльдрион.мир"
                className="bg-parchment/60 border-parchment-dark/40"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="parchment-heading text-sm">Тайное слово</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-parchment/60 border-parchment-dark/40"
                onKeyDown={(e) => e.key === "Enter" && submit()}
              />
            </div>
          </TabsContent>

          <TabsContent value="register" className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label className="parchment-heading text-sm">Имя игрока</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Сэр Игрок"
                className="bg-parchment/60 border-parchment-dark/40"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="parchment-heading text-sm">Имя персонажа</Label>
              <Input
                value={characterName}
                onChange={(e) => setCharacterName(e.target.value)}
                placeholder="Тэодрик Зорестрелец"
                className="bg-parchment/60 border-parchment-dark/40"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="parchment-heading text-sm">Знак (Email)</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="герой@эльдрион.мир"
                className="bg-parchment/60 border-parchment-dark/40"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="parchment-heading text-sm">Тайное слово</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="минимум 6 знаков"
                className="bg-parchment/60 border-parchment-dark/40"
                onKeyDown={(e) => e.key === "Enter" && submit()}
              />
            </div>
          </TabsContent>
        </Tabs>

        <Button
          onClick={submit}
          disabled={loginMut.isPending || registerMut.isPending}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-[family-name:var(--font-cinzel)] tracking-wide"
        >
          {(loginMut.isPending || registerMut.isPending)
            ? "Сверяются свитки..."
            : mode === "login"
            ? "Войти в Хроники"
            : "Записать в Книгу"}
        </Button>

        <p className="text-center text-xs parchment-muted italic">
          Подсказка для испытателя: Божество — deity@eldrin.world / divine123
        </p>
      </DialogContent>
    </Dialog>
  );
}
