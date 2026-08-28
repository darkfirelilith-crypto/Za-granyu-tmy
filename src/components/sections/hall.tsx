"use client";

import { useQuery } from "@tanstack/react-query";
import { OrnamentTitle } from "@/components/fantasy/ornament-title";
import { ParchmentCard, RuneSeal } from "@/components/fantasy/ui";
import { Button } from "@/components/ui/button";
import { BookOpen, Sword, Sparkles, ScrollText, MapPin, Users, Crown, Flame } from "lucide-react";
import type { View } from "@/lib/types";

export function HallView({ onNavigate }: { onNavigate: (v: View) => void }) {
  const { data: counts } = useQuery({
    queryKey: ["counts"],
    queryFn: async () => {
      const [c, p, g, l, q] = await Promise.all([
        fetch("/api/lore/countries").then((r) => r.json()),
        fetch("/api/lore/personalities").then((r) => r.json()),
        fetch("/api/lore/gods").then((r) => r.json()),
        fetch("/api/lore/legends").then((r) => r.json()),
        fetch("/api/guild/quests").then((r) => r.json()),
      ]);
      return {
        countries: (c as any[]).length,
        personalities: (p as any[]).length,
        gods: (g as any[]).length,
        legends: (l as any[]).length,
        quests: (q as any[]).length,
      };
    },
  });

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-10 md:py-16 space-y-12">
      {/* Hero */}
      <section className="text-center space-y-6 animate-reveal">
        <div className="flex justify-center mb-4">
          <div className="relative">
            <RuneSeal icon={<Flame className="w-8 h-8 text-gold" />} size="lg" glow />
          </div>
        </div>
        <OrnamentTitle size="xl" flourish="✦">
          Добро пожаловать, странник
        </OrnamentTitle>
        <p className="max-w-2xl mx-auto text-foreground/80 font-[family-name:var(--font-garamond)] text-lg md:text-xl leading-relaxed italic">
          Перед тобой — врата в мир Эльдрион. Здесь, среди пыльных свитков и мерцающих
          рун, хранятся предания шести народов, деяния героев и тайны, что дремлют
          за печатью Гримуара. Войди, и пусть перо летописца запишет и твоё имя.
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Button
            onClick={() => onNavigate("knowledge")}
            className="btn-rune bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Открыть Базу Знаний
          </Button>
          <Button
            onClick={() => onNavigate("guild")}
            variant="outline"
            className="btn-rune border-gold/40 text-gold hover:bg-gold/10"
          >
            <Sword className="w-4 h-4 mr-2" />
            Войти в Гильдию
          </Button>
          <Button
            onClick={() => onNavigate("grimoire")}
            variant="ghost"
            className="btn-rune text-foreground/70 hover:text-gold"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Тайный Гримуар
          </Button>
        </div>
      </section>

      {/* Three sections cards */}
      <section>
        <OrnamentTitle size="lg" className="mb-8">
          Три Чертога Знания
        </OrnamentTitle>
        <div className="grid md:grid-cols-3 gap-6">
          <ParchmentCard hover className="cursor-pointer text-center space-y-3" >
            <div onClick={() => onNavigate("knowledge")} className="space-y-3">
              <RuneSeal icon={<BookOpen className="w-7 h-7 text-wine" />} size="md" className="mx-auto" />
              <h3 className="font-[family-name:var(--font-cinzel)] text-xl parchment-heading">
                База Знаний
              </h3>
              <p className="parchment-muted text-sm leading-relaxed">
                Древняя библиотека мира: страны и их нравы, личности, чьё имя вписано
                в историю, союзы и распри, политические устои, пантеон богов и
                легенды былых эпох.
              </p>
              <div className="flex flex-wrap justify-center gap-2 pt-2 text-xs parchment-muted">
                <span className="px-2 py-0.5 rounded-full bg-parchment-dark/20">🗺️ {counts?.countries ?? "…"} стран</span>
                <span className="px-2 py-0.5 rounded-full bg-parchment-dark/20">👑 {counts?.personalities ?? "…"} личностей</span>
                <span className="px-2 py-0.5 rounded-full bg-parchment-dark/20">✨ {counts?.gods ?? "…"} богов</span>
                <span className="px-2 py-0.5 rounded-full bg-parchment-dark/20">📖 {counts?.legends ?? "…"} легенд</span>
              </div>
            </div>
          </ParchmentCard>

          <ParchmentCard hover className="cursor-pointer text-center space-y-3" >
            <div onClick={() => onNavigate("guild")} className="space-y-3">
              <RuneSeal icon={<Sword className="w-7 h-7 text-wine" />} size="md" className="mx-auto" />
              <h3 className="font-[family-name:var(--font-cinzel)] text-xl parchment-heading">
                Гильдия Авантюристов
              </h3>
              <p className="parchment-muted text-sm leading-relaxed">
                Сводный дом искателей приключений. Ранги от Железного Искателя до
                Мифического Чемпиона, задания разной опасности и реестр всех героев,
                ступивших на путь.
              </p>
              <div className="flex flex-wrap justify-center gap-2 pt-2 text-xs parchment-muted">
                <span className="px-2 py-0.5 rounded-full bg-parchment-dark/20">📜 {counts?.quests ?? "…"} заданий</span>
                <span className="px-2 py-0.5 rounded-full bg-parchment-dark/20">🛡️ 5 рангов</span>
              </div>
            </div>
          </ParchmentCard>

          <ParchmentCard hover className="cursor-pointer text-center space-y-3">
            <div onClick={() => onNavigate("grimoire")} className="space-y-3">
              <RuneSeal icon={<Sparkles className="w-7 h-7 text-magic-glow" />} size="md" className="mx-auto animate-magic" />
              <h3 className="font-[family-name:var(--font-cinzel)] text-xl parchment-heading">
                Тайный Гримуар
              </h3>
              <p className="parchment-muted text-sm leading-relaxed">
                Запечатанный кодекс, страницы которого покрыты шифром. Лишь
                исполнив условия сюжета, удостоишься снять печать и прочитать тайны,
                что скрыты от непосвящённых.
              </p>
              <div className="flex flex-wrap justify-center gap-2 pt-2 text-xs parchment-muted">
                <span className="px-2 py-0.5 rounded-full bg-parchment-dark/20">🔒 Зашифрован</span>
              </div>
            </div>
          </ParchmentCard>
        </div>
      </section>

      {/* World intro */}
      <section className="max-w-3xl mx-auto">
        <OrnamentTitle size="lg" className="mb-6">
          О мире Эльдрион
        </OrnamentTitle>
        <ParchmentCard className="lore-prose drop-cap space-y-3">
          <p>
            <strong>Эльдрион</strong> — древний мир, сотканный из шести свободных
            народов: людей королевства Эльдрион, эльфов Сильваниэля, гномов
            подгорной твердыни Каз-Думар, вольных островитян и проклятых душ Тёмных
            Пустошей. Триста лет назад мир едва не поглотил Лич-Владыка Моргант, и
            хотя тьма была отбита, она не мертва — лишь спит.
          </p>
          <p>
            Над землями возвышается пантеон Шестерых богов, а седьмой — изгнанный
            Ноктюрис — шепчет из тени. Гильдия Авантюристов собирает под свои знамёна
            всех, кто готов рискнуть жизнью ради чести, золота или истины. А в
            глубинах тайного Гримуара покоятся пророчества, способные перевернуть
            судьбу всего сущего.
          </p>
          <p className="text-center italic pt-2 parchment-muted">
            Какую роль в этой саге сыграешь ты?
          </p>
        </ParchmentCard>
      </section>

      {/* Feature row */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Users, title: "Профиль героя", desc: "Имя, лор, достижения" },
          { icon: Crown, title: "Божество-Мастер", desc: "Управляй миром и игроками" },
          { icon: MapPin, title: "Живой мир", desc: "Лор, страны, персонажи" },
          { icon: ScrollText, title: "Достижения", desc: "Вручаются за деяния" },
        ].map((f) => {
          const Icon = f.icon;
          return (
            <ParchmentCard key={f.title} className="text-center space-y-2">
              <Icon className="w-6 h-6 text-gold mx-auto" />
              <h4 className="font-[family-name:var(--font-cinzel)] text-sm parchment-heading">
                {f.title}
              </h4>
              <p className="parchment-muted text-xs">{f.desc}</p>
            </ParchmentCard>
          );
        })}
      </section>
    </div>
  );
}
