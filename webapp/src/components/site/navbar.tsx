"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wheat } from "lucide-react";
import { cn } from "@/lib/utils";
import { ModeToggle } from "./mode-toggle";
import { UserMenu } from "./user-menu";

const LINKS = [
  { href: "/", label: "Accueil" },
  { href: "/prediction", label: "Prédiction" },
  { href: "/lot", label: "Par lot" },
  { href: "/carte", label: "Cartographie" },
  { href: "/ciblage", label: "Ciblage" },
  { href: "/rapport", label: "Rapport" },
  { href: "/a-propos", label: "À propos" },
];

export function Navbar() {
  const path = usePathname();
  return (
    <header className="no-print fixed inset-x-0 top-0 z-50 px-3 pt-3 md:px-4 md:pt-4">
      <nav
        className="mx-auto flex max-w-6xl items-center justify-between gap-2 rounded-full border border-border/70
        bg-background/70 px-3 py-2 shadow-sm backdrop-blur-xl supports-[backdrop-filter]:bg-background/60"
      >
        <Link href="/" className="flex items-center gap-2.5 pl-1 cursor-pointer">
          <span className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground">
            <Wheat className="size-4" />
          </span>
          <span className="hidden font-heading text-[15px] font-semibold tracking-tight sm:block">
            Baromètre&nbsp;Alimentaire<span className="text-primary">.</span>
          </span>
        </Link>
        <div className="flex items-center gap-0.5">
          {LINKS.map((l) => {
            const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
            return (
              <Link
                key={l.href} href={l.href}
                className={cn(
                  "relative cursor-pointer rounded-full px-3 py-1.5 text-sm transition-colors",
                  active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {active && (
                  <span className="absolute inset-0 -z-10 rounded-full bg-primary" aria-hidden />
                )}
                <span className="hidden md:inline">{l.label}</span>
                <span className="md:hidden">{l.label.slice(0, 3)}</span>
              </Link>
            );
          })}
          <div className="ml-1 border-l border-border/60 pl-1">
            <ModeToggle />
          </div>
          <UserMenu />
        </div>
      </nav>
    </header>
  );
}
