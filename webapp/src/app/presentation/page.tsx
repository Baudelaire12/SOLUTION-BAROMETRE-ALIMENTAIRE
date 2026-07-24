"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Wheat, Gauge, Map as MapIcon, FileText, Target, ArrowRight, ShieldCheck, Building2 } from "lucide-react";
import { api, type Metadata } from "@/lib/api";
import { BRAND } from "@/lib/brand";
import { ModeToggle } from "@/components/site/mode-toggle";
import { KpiCard } from "@/components/kpi-card";
import { Reveal } from "@/components/reveal";

const FEATURES = [
  { icon: Gauge, t: "Prédiction du risque", d: "Estimez la probabilité qu'un ménage soit en insécurité alimentaire à partir des déterminants clés." },
  { icon: MapIcon, t: "Cartographie communale", d: "Visualisez les 77 communes et repérez instantanément les poches de vulnérabilité." },
  { icon: Target, t: "Ciblage & simulation", d: "Calibrez un seuil de ciblage et simulez l'impact d'une intervention." },
  { icon: FileText, t: "Rapports décideurs", d: "Générez des rapports prêts à soumettre au PAM, à la FAO ou aux ONG (PDF, export SIG)." },
];

export default function PresentationPage() {
  const [meta, setMeta] = useState<Metadata | null>(null);
  useEffect(() => { api.metadata().then(setMeta).catch(() => {}); }, []);

  return (
    <div className="min-h-dvh bg-editorial">
      {/* En-tête public */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <Link href="/presentation" className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground"><Wheat className="size-4" /></span>
            <span className="font-heading font-semibold">{BRAND.solution}</span>
          </Link>
          <div className="flex items-center gap-2">
            <ModeToggle />
            <Link href="/login" className="rounded-full px-4 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Se connecter</Link>
            <Link href="/register" className="rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground transition-all hover:brightness-105">Créer un compte</Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-[2rem] border border-border/60 px-6 py-20 md:px-14 md:py-28">
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-secondary/40" />
            <div className="absolute -left-1/4 top-[-30%] size-[55%] rounded-full opacity-50 blur-3xl"
              style={{ background: "radial-gradient(circle, var(--primary), transparent 65%)", animation: "aurora 24s ease-in-out infinite" }} />
            <div className="absolute right-[-15%] top-[10%] size-[45%] rounded-full opacity-40 blur-3xl"
              style={{ background: "radial-gradient(circle, var(--chart-2), transparent 65%)", animation: "aurora 30s ease-in-out infinite reverse" }} />
          </div>
          <Reveal>
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
                <span className="size-1.5 rounded-full bg-primary" /> Aide à la décision · Sécurité alimentaire · Bénin
              </span>
              <h1 className="mt-6 font-heading text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
                Cibler l&apos;insécurité alimentaire,{" "}<span className="text-primary">avec précision.</span>
              </h1>
              <p className="mx-auto mt-6 max-w-xl text-[15px] leading-relaxed text-muted-foreground md:text-base">
                {BRAND.solution} transforme les données d&apos;enquête en prédictions, cartes et rapports
                opérationnels — pour aider le PAM, la FAO et les ONG à orienter leurs interventions.
              </p>
              <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                <Link href="/register" className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-[15px] font-semibold text-primary-foreground transition-all hover:brightness-105">
                  Commencer <ArrowRight className="size-4" />
                </Link>
                <Link href="/login" className="inline-flex h-11 items-center gap-2 rounded-full border border-border/70 bg-background/60 px-6 text-[15px] font-medium backdrop-blur transition-colors hover:bg-accent">
                  J&apos;ai déjà un compte
                </Link>
              </div>
            </div>
          </Reveal>
        </section>

        {/* Chiffres */}
        <section className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard label="Ménages analysés" value={meta?.n_analytique ?? 14952} />
          <KpiCard label="Fiabilité (AUROC)" value={meta?.auroc ?? 0.794} decimals={3} accent />
          <KpiCard label="Communes couvertes" value={77} />
          <KpiCard label="Ménages détectés" value={(meta?.recall ?? 0.681) * 100} decimals={0} suffix=" %" />
        </section>

        {/* Fonctionnalités */}
        <section className="mt-16">
          <Reveal><h2 className="mb-6 text-center font-heading text-2xl font-semibold">Une plateforme, quatre leviers</h2></Reveal>
          <div className="grid gap-4 md:grid-cols-2">
            {FEATURES.map((f, i) => (
              <Reveal key={f.t} delay={i * 0.05}>
                <div className="flex gap-4 rounded-2xl border border-border/70 bg-card/70 p-6">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><f.icon className="size-5" /></span>
                  <div>
                    <h3 className="font-heading text-lg font-semibold">{f.t}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{f.d}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Confiance */}
        <section className="mt-16 grid gap-4 rounded-2xl border border-border/70 bg-card/60 p-8 sm:grid-cols-3">
          <Trust icon={ShieldCheck} t="Rigueur méthodologique" d="Modèle d'apprentissage automatique calibré et validé hors échantillon." />
          <Trust icon={Building2} t="Pensé pour les institutions" d="Comptes par organisation, rôles, partage et rapports exportables." />
          <Trust icon={Target} t="Orienté action" d="Des priorités de ciblage concrètes, commune par commune." />
        </section>

        {/* CTA final */}
        <section className="my-16 overflow-hidden rounded-[2rem] border border-border/60 bg-primary px-6 py-14 text-center text-primary-foreground">
          <h2 className="font-heading text-3xl font-semibold">Prêt à cibler mieux ?</h2>
          <p className="mx-auto mt-2 max-w-md text-primary-foreground/85">Créez votre compte et lancez votre première analyse en quelques minutes.</p>
          <Link href="/register" className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-white px-7 font-heading font-semibold text-primary transition-transform hover:scale-[1.02]">
            Créer un compte <ArrowRight className="size-4" />
          </Link>
        </section>
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto max-w-6xl px-6 py-8 text-center text-xs text-muted-foreground">
          {BRAND.solution} · Conçue par {BRAND.author} — {BRAND.role} ·{" "}
          <a href={`mailto:${BRAND.email}`} className="text-primary hover:underline">{BRAND.email}</a>
        </div>
      </footer>
    </div>
  );
}

function Trust({ icon: Icon, t, d }: { icon: typeof ShieldCheck; t: string; d: string }) {
  return (
    <div className="text-center sm:text-left">
      <Icon className="mx-auto size-6 text-primary sm:mx-0" />
      <h3 className="mt-2 font-semibold">{t}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{d}</p>
    </div>
  );
}
