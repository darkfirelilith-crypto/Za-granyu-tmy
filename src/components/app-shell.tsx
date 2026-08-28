"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import { useSession, signOut } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { useAppStore } from "@/store/app-store";
import { EmberField } from "@/components/fantasy/ember-field";
import { AuthDialog } from "@/components/auth/auth-dialog";
import { HallView } from "@/components/sections/hall";
import { KnowledgeView } from "@/components/sections/knowledge";
import { GuildView } from "@/components/sections/guild";
import { GrimoireView } from "@/components/sections/grimoire";
import { LabView } from "@/components/sections/lab";
import { ProfileView } from "@/components/sections/profile";
import { AdminView } from "@/components/sections/admin";
import { Button } from "@/components/ui/button";
import { ScrollText, BookOpen, Sword, Sparkles, User, Crown, LogOut, Flame, Search, Moon, Sun, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { PageTransition } from "@/components/fantasy/page-transition";
import { Omnisearch } from "@/components/omnisearch";

interface MeResponse {
  user: { id: string; name: string; email: string; role: string } | null;
  character: any | null;
}

const NAV_ITEMS = [
  { key: "hall", label: "Зал", icon: Flame },
  { key: "knowledge", label: "База Знаний", icon: BookOpen },
  { key: "guild", label: "Гильдия", icon: Sword },
  { key: "grimoire", label: "Гримуар", icon: Sparkles },
  { key: "lab", label: "Лаборатория Алого", icon: FlaskConical },
] as const;

export function AppShell() {
  const { view, setView } = useAppStore();
  const { data: session } = useSession();
  const [authOpen, setAuthOpen] = useState(false);
  const { toast } = useToast();

  const { data: me } = useQuery<MeResponse>({
    queryKey: ["me"],
    queryFn: () => fetch("/api/auth/me").then((r) => r.json()),
  });

  const isAdmin = session?.user?.role === "ADMIN";
  const isPlayer = session?.user?.role === "PLAYER";

  const [searchOpen, setSearchOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  // Track hydration without setState-in-effect (React 19 lint): useSyncExternalStore
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  // Guard: redirect unauthorized users away from protected views (no side-effect in render)
  useEffect(() => {
    if (view === "profile" && !isPlayer && session !== undefined) setView("hall");
    if (view === "admin" && !isAdmin && session !== undefined) setView("hall");
  }, [view, isPlayer, isAdmin, session, setView]);

  const handleSignOut = () => {
    signOut({ redirect: false });
    toast({ title: "Свиток закрыт", description: "Странник покинул чертог." });
    setView("hall");
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-grimoire">
      <EmberField />
      <div className="vignette relative z-10 flex flex-col flex-1">
        {/* ===== HEADER ===== */}
        <header className="border-b border-gold/20 backdrop-blur-sm bg-background/40">
          <div className="max-w-7xl mx-auto px-4 md:px-6">
            {/* Title banner */}
            <div className="flex flex-col items-center pt-4 pb-2 text-center">
              <div className="flex items-center gap-3">
                <span className="text-gold text-2xl animate-flicker">❦</span>
                <h1 className="font-[family-name:var(--font-cinzel-decorative)] text-2xl md:text-4xl shimmer-gold tracking-wide">
                  За гранью тьмы
                </h1>
                <span className="text-gold text-2xl animate-flicker">❦</span>
              </div>
              <p className="text-gold/60 text-xs md:text-sm font-[family-name:var(--font-cinzel)] tracking-[0.3em] uppercase mt-1">
                Сага о героях и тайнах мира
              </p>
            </div>

            {/* Nav + auth */}
            <nav className="flex flex-wrap items-center justify-between gap-2 py-2">
              <div className="flex flex-wrap items-center gap-1">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active = view === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => setView(item.key as any)}
                      className={cn(
                        "group flex items-center gap-1.5 px-3 py-1.5 rounded-md font-[family-name:var(--font-cinzel)] text-sm tracking-wide transition-all",
                        active
                          ? "text-gold bg-gold/10 magic-glow"
                          : "text-foreground/70 hover:text-gold hover:bg-gold/5"
                      )}
                    >
                      <Icon className={cn("w-4 h-4", active && "animate-flicker")} />
                      <span className="hidden sm:inline">{item.label}</span>
                      <span className="sm:hidden">{item.label.split(" ")[0]}</span>
                    </button>
                  );
                })}
                {isPlayer && (
                  <button
                    onClick={() => setView("profile")}
                    className={cn(
                      "group flex items-center gap-1.5 px-3 py-1.5 rounded-md font-[family-name:var(--font-cinzel)] text-sm tracking-wide transition-all",
                      view === "profile"
                        ? "text-gold bg-gold/10 magic-glow"
                        : "text-foreground/70 hover:text-gold hover:bg-gold/5"
                    )}
                  >
                    <User className="w-4 h-4" />
                    <span className="hidden sm:inline">Профиль</span>
                  </button>
                )}
                {isAdmin && (
                  <button
                    onClick={() => setView("admin")}
                    className={cn(
                      "group flex items-center gap-1.5 px-3 py-1.5 rounded-md font-[family-name:var(--font-cinzel)] text-sm tracking-wide transition-all",
                      view === "admin"
                        ? "text-gold bg-gold/10 magic-glow"
                        : "text-foreground/70 hover:text-gold hover:bg-gold/5"
                    )}
                  >
                    <Crown className="w-4 h-4" />
                    <span className="hidden sm:inline">Божество</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSearchOpen(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-gold/20 bg-background/30 text-foreground/60 hover:text-gold hover:border-gold/40 transition-all text-sm"
                  aria-label="Поиск по миру"
                >
                  <Search className="w-4 h-4" />
                  <span className="hidden md:inline font-[family-name:var(--font-cinzel)] text-xs tracking-wide">Искать</span>
                </button>
                {mounted && (
                  <button
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className="p-2 rounded-md border border-gold/20 bg-background/30 text-gold/70 hover:text-gold hover:border-gold/40 transition-all"
                    aria-label="Сменить освещение"
                    title={theme === "dark" ? "Зажечь рассвет" : "Задуть свечи"}
                  >
                    {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  </button>
                )}
                {session?.user ? (
                  <div className="flex items-center gap-2">
                    <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded border border-gold/20 bg-background/30">
                      <span className="text-gold/80 text-xs">
                        {isAdmin ? "✦ Божество" : "⚔ Авантюрист"}
                      </span>
                      <span className="text-foreground/60 text-xs">|</span>
                      <span className="text-foreground/80 text-sm font-[family-name:var(--font-cinzel)]">
                        {session.user.name}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSignOut}
                      className="text-foreground/60 hover:text-gold"
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="hidden sm:inline ml-1">Уйти</span>
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => setAuthOpen(true)}
                    className="btn-rune bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    <ScrollText className="w-4 h-4 mr-1" />
                    Войти в сагу
                  </Button>
                )}
              </div>
            </nav>
          </div>
        </header>

        {/* ===== MAIN ===== */}
        <main className="flex-1 relative z-10">
          {view === "hall" && (
            <PageTransition viewKey="hall"><HallView onNavigate={setView} /></PageTransition>
          )}
          {view === "knowledge" && (
            <PageTransition viewKey="knowledge"><KnowledgeView /></PageTransition>
          )}
          {view === "guild" && (
            <PageTransition viewKey="guild"><GuildView /></PageTransition>
          )}
          {view === "grimoire" && (
            <PageTransition viewKey="grimoire"><GrimoireView /></PageTransition>
          )}
          {view === "lab" && (
            <PageTransition viewKey="lab"><LabView /></PageTransition>
          )}
          {view === "profile" && isPlayer && (
            <PageTransition viewKey="profile"><ProfileView /></PageTransition>
          )}
          {view === "admin" && isAdmin && (
            <PageTransition viewKey="admin"><AdminView /></PageTransition>
          )}
        </main>

        {/* ===== FOOTER (sticky) ===== */}
        <footer className="mt-auto border-t border-gold/20 backdrop-blur-sm bg-background/40">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 text-center">
            <div className="divider-flourish mb-2 text-sm">
              <span className="text-gold">❦</span>
            </div>
            <p className="text-gold/60 text-xs font-[family-name:var(--font-cinzel)] tracking-[0.2em] uppercase">
              За гранью тьмы · Сага D&D
            </p>
            <p className="text-foreground/40 text-xs mt-1 font-[family-name:var(--font-garamond)] italic">
              «Что записано — не забыто. Что забыто — найдётся вновь.»
            </p>
          </div>
        </footer>
      </div>

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
      <Omnisearch open={searchOpen} onOpenChange={setSearchOpen} onNavigate={setView} />
    </div>
  );
}
