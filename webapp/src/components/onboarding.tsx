"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { X, Gauge, Map as MapIcon, FileText, Sparkles, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth";

const STEPS = [
  { href: "/prediction", icon: Gauge, n: "1", t: "Évaluer un ménage" },
  { href: "/carte", icon: MapIcon, n: "2", t: "Explorer la carte" },
  { href: "/rapport", icon: FileText, n: "3", t: "Générer un rapport" },
];

export function Onboarding() {
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  useEffect(() => { try { if (!localStorage.getItem("ba:onboarded")) setShow(true); } catch {} }, []);
  if (!show) return null;
  const dismiss = () => { try { localStorage.setItem("ba:onboarded", "1"); } catch {} setShow(false); };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-primary/5 p-6">
      <button onClick={dismiss} aria-label="Fermer"
        className="absolute right-3 top-3 cursor-pointer rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
        <X className="size-4" />
      </button>
      <div className="flex items-center gap-2 font-heading text-lg font-semibold text-primary">
        <Sparkles className="size-5" /> Bienvenue{user ? `, ${user.name.split(" ")[0]}` : ""} !
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Trois étapes pour prendre la solution en main :</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {STEPS.map((s) => (
          <Link key={s.href} href={s.href}
            className="group flex items-center gap-3 rounded-xl border border-border/70 bg-card/70 p-4 transition-colors hover:border-primary/40">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><s.icon className="size-4" /></span>
            <div className="flex-1">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Étape {s.n}</div>
              <div className="text-sm font-medium">{s.t}</div>
            </div>
            <ArrowRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>
        ))}
      </div>
    </div>
  );
}
