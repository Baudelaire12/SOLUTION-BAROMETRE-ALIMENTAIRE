"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Gauge, FileSpreadsheet, Map as MapIcon, Target, ArrowRight, TriangleAlert, FileText } from "lucide-react";
import { api, type Metadata } from "@/lib/api";
import { KpiCard } from "@/components/kpi-card";
import { Reveal } from "@/components/reveal";
import { Onboarding } from "@/components/onboarding";
import { MagicCard } from "@/components/ui/magic-card";
import { ShimmerButton } from "@/components/ui/shimmer-button";

const MODULES = [
  { href: "/prediction", icon: Gauge, title: "Prédiction individuelle",
    desc: "Saisir les déterminants (OS1) d'un ménage → probabilité, classe de risque et explication SHAP.", span: "md:col-span-2" },
  { href: "/carte", icon: MapIcon, title: "Cartographie communale",
    desc: "Carte interactive du risque prédit sur les 77 communes (OS3).", span: "" },
  { href: "/lot", icon: FileSpreadsheet, title: "Prédiction par lot",
    desc: "Scorer un fichier CSV de ménages et exporter pour le ciblage terrain.", span: "" },
  { href: "/ciblage", icon: Target, title: "Ciblage & simulation",
    desc: "Seuil de ciblage et simulation « what-if » d'une intervention.", span: "md:col-span-2" },
  { href: "/rapport", icon: FileText, title: "Rapport d'analyse",
    desc: "Générer un rapport prêt à soumettre aux partenaires (PAM, FAO, ONG) — export PDF.", span: "md:col-span-3" },
];

export default function Home() {
  const [meta, setMeta] = useState<Metadata | null>(null);
  const [offline, setOffline] = useState(false);
  useEffect(() => { api.metadata().then(setMeta).catch(() => setOffline(true)); }, []);

  return (
    <div className="space-y-16">
      <Onboarding />
      <section className="relative overflow-hidden rounded-[2rem] border border-border/60 px-6 py-16 md:px-14 md:py-24">
        <AuroraWarm />
        <Reveal>
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
              <span className="size-1.5 rounded-full bg-primary" /> Ciblage humanitaire · Données AGVSAN 2017
            </span>
            <h1 className="mt-6 font-heading text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
              Anticiper l&apos;insécurité<br /> alimentaire,{" "}
              <span className="text-primary">commune par commune.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-pretty text-[15px] leading-relaxed text-muted-foreground md:text-base">
              Une solution d&apos;aide à la décision qui prédit le risque d&apos;un ménage, cartographie les
              zones vulnérables du Bénin et produit des rapports pour les acteurs humanitaires.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link href="/prediction">
                <ShimmerButton className="h-11 px-6 font-heading text-[15px] font-semibold" background="var(--primary)">
                  Évaluer un ménage <ArrowRight className="ml-1 size-4" />
                </ShimmerButton>
              </Link>
              <Link href="/carte"
                className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-border/70 bg-background/60 px-6 text-[15px] font-medium backdrop-blur transition-colors hover:bg-accent">
                Explorer la carte <MapIcon className="size-4" />
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      {offline && (
        <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
          <TriangleAlert className="size-4 shrink-0 text-primary" />
          <span>API non joignable. Démarrez le backend : <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[12px]">python app/run.py</code></span>
        </div>
      )}

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Ménages analysés" value={meta?.n_analytique ?? 14952} />
        <KpiCard label="AUROC (hors échantillon)" value={meta?.auroc ?? 0.794} decimals={3} accent />
        <KpiCard label="Ménages détectés (rappel)" value={(meta?.recall ?? 0.681) * 100} decimals={0} suffix=" %" />
        <KpiCard label="Prévalence nationale" value={meta?.prevalence_pct ?? 10.05} decimals={1} suffix=" %" />
      </section>

      <section>
        <Reveal>
          <div className="mb-6 flex items-end justify-between">
            <h2 className="font-heading text-2xl font-semibold tracking-tight">Modules</h2>
            <span className="text-sm text-muted-foreground">Quatre outils, un modèle</span>
          </div>
        </Reveal>
        <div className="grid gap-4 md:grid-cols-3">
          {MODULES.map((m, i) => (
            <Reveal key={m.href} delay={i * 0.06} className={m.span}>
              <Link href={m.href} className="group block h-full cursor-pointer">
                <MagicCard className="h-full rounded-2xl border border-border/70 p-6"
                  gradientFrom="var(--primary)" gradientTo="var(--chart-2)" gradientOpacity={0.14}>
                  <div className="flex h-full flex-col">
                    <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                      <m.icon className="size-5" />
                    </span>
                    <h3 className="mt-4 font-heading text-lg font-semibold">{m.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{m.desc}</p>
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                      Ouvrir <ArrowRight className="size-4" />
                    </span>
                  </div>
                </MagicCard>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      <Reveal>
        <p className="rounded-xl border border-border/60 bg-card/60 px-5 py-4 text-sm text-muted-foreground">
          <strong className="text-foreground">Aide à la décision.</strong> Les prédictions appuient le
          jugement des acteurs de terrain, elles ne s&apos;y substituent pas. Modèle fondé sur des données de 2017.
        </p>
      </Reveal>
    </div>
  );
}

function AuroraWarm() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-secondary/40" />
      <div className="absolute -left-1/4 top-[-30%] size-[55%] rounded-full opacity-60 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--primary), transparent 65%)", animation: "aurora 24s ease-in-out infinite" }} />
      <div className="absolute right-[-15%] top-[10%] size-[45%] rounded-full opacity-50 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--chart-2), transparent 65%)", animation: "aurora 30s ease-in-out infinite reverse" }} />
      <div className="absolute bottom-[-25%] left-[30%] size-[45%] rounded-full opacity-40 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--chart-5), transparent 70%)", animation: "aurora 28s ease-in-out infinite" }} />
    </div>
  );
}
