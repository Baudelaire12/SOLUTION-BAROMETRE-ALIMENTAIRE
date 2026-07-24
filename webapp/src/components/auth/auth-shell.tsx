"use client";
import Link from "next/link";
import { Wheat, MapPin, Gauge, FileText } from "lucide-react";
import { ModeToggle } from "@/components/site/mode-toggle";
import { BRAND } from "@/lib/brand";

const POINTS = [
  { icon: Gauge, t: "Prédiction du risque", d: "Évaluez la vulnérabilité d'un ménage en quelques clics." },
  { icon: MapPin, t: "Cartographie communale", d: "Visualisez les zones prioritaires sur les 77 communes." },
  { icon: FileText, t: "Rapports décideurs", d: "Générez des rapports prêts à soumettre à vos partenaires." },
];

export function AuthShell({ title, subtitle, children, footer }: {
  title: string; subtitle: string; children: React.ReactNode; footer: React.ReactNode;
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Panneau marque avec photo de contexte (nord Bénin) */}
      <aside className="relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col lg:justify-between">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/portal-bg.jpg" alt="Agriculture dans le nord du Bénin, près de Djougou"
          className="absolute inset-0 size-full object-cover"
          style={{ animation: "kenburns 28s ease-in-out infinite alternate" }} />
        <div aria-hidden className="absolute inset-0 bg-primary/70" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#3a1108]/85 via-[#5c1a0e]/25 to-[#3a1108]/45" />
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-30">
          <div className="absolute -left-20 -top-16 size-96 rounded-full blur-3xl"
            style={{ background: "radial-gradient(circle, var(--chart-2), transparent 65%)", animation: "aurora 26s ease-in-out infinite" }} />
        </div>
        <div className="relative flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-full bg-white/20 backdrop-blur"><Wheat className="size-5" /></span>
          <span className="font-heading text-lg font-semibold drop-shadow">{BRAND.solution}</span>
        </div>
        <div className="relative">
          <h2 className="max-w-md font-heading text-[2rem] font-semibold leading-tight drop-shadow-md">
            L&apos;aide à la décision pour cibler l&apos;insécurité alimentaire au Bénin.
          </h2>
          <ul className="mt-8 space-y-4">
            {POINTS.map((p) => (
              <li key={p.t} className="flex gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/20 backdrop-blur"><p.icon className="size-4" /></span>
                <div>
                  <div className="font-semibold drop-shadow">{p.t}</div>
                  <div className="text-sm text-white/85">{p.d}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="relative flex items-end justify-between text-xs text-white/70">
          <span>Solution conçue par {BRAND.author}</span>
          <span>Photo : Gregor Rom ·{" "}
            <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer" className="underline">CC BY-SA 4.0</a>
          </span>
        </div>
      </aside>

      {/* Formulaire */}
      <div className="relative flex items-center justify-center bg-editorial p-6">
        <div className="absolute right-4 top-4"><ModeToggle /></div>
        <div className="w-full max-w-sm">
          <Link href="/" className="mb-8 inline-flex items-center gap-2 lg:hidden">
            <span className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground"><Wheat className="size-4" /></span>
            <span className="font-heading font-semibold">{BRAND.solution}</span>
          </Link>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-6">{children}</div>
          <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>
        </div>
      </div>
    </div>
  );
}

export function Field({ id, label, ...props }: { id: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      <input id={id} {...props}
        className="w-full rounded-lg border border-border/70 bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30" />
    </div>
  );
}
