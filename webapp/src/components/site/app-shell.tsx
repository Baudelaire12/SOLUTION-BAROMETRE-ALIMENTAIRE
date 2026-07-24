"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Navbar } from "@/components/site/navbar";

const AUTH_PAGES = ["/login", "/register"];
const PUBLIC_PAGES = ["/login", "/register", "/presentation"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const path = usePathname();
  const router = useRouter();
  const isAuthPage = AUTH_PAGES.includes(path);
  const isPublic = PUBLIC_PAGES.includes(path);

  useEffect(() => {
    if (!ready) return;
    if (!user && !isPublic) router.replace("/login");
    if (user && isAuthPage) router.replace("/");
  }, [ready, user, isPublic, isAuthPage, router]);

  // Écran d'attente pendant la vérification / redirection (évite le flash de contenu protégé)
  if (!ready || (!user && !isPublic) || (user && isAuthPage)) {
    return (
      <div className="grid min-h-dvh place-items-center bg-editorial text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  if (isPublic) return <div className="min-h-dvh">{children}</div>;

  return (
    <div className="relative min-h-dvh bg-editorial">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-24 md:px-6">{children}</main>
      <footer className="no-print border-t border-border/60">
        <div className="mx-auto max-w-6xl px-6 py-6 text-center text-xs text-muted-foreground">
          Baromètre Alimentaire · Solution d&apos;aide à la décision · Conçue par Pinel Baudelaire DAHOUI ·
          Modèle prédictif calibré sur les données AGVSAN 2017 ·
          Aide à la décision, ne remplace pas le jugement de terrain.
        </div>
      </footer>
    </div>
  );
}
