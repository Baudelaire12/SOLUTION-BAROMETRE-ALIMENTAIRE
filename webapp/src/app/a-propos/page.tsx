"use client";
import { useEffect, useState } from "react";
import { Mail, Link2, Globe } from "lucide-react";
import { api, type Determinant, type Metadata } from "@/lib/api";
import { BRAND } from "@/lib/brand";
import { PageHeader } from "@/components/page-header";
import { Reveal } from "@/components/reveal";
import { cn } from "@/lib/utils";

export default function AProposPage() {
  const [meta, setMeta] = useState<Metadata | null>(null);
  const [det, setDet] = useState<Determinant[]>([]);
  useEffect(() => {
    api.metadata().then(setMeta).catch(() => {});
    api.determinants().then(setDet).catch(() => {});
  }, []);

  return (
    <div className="space-y-10">
      <PageHeader eyebrow="La solution" title="À propos du Baromètre Alimentaire">
        <strong>Baromètre Alimentaire</strong> est une solution d&apos;aide à la décision destinée aux
        acteurs humanitaires (PAM, FAO, ONG) et aux institutions publiques, pour le ciblage de
        l&apos;insécurité alimentaire des ménages au Bénin. Elle encapsule un modèle prédictif calibré et
        transforme les données d&apos;enquête en prédictions, cartes et rapports opérationnels.
      </PageHeader>

      <Reveal>
        <div className="grid gap-4 rounded-2xl border border-border/70 bg-card/70 p-6 md:grid-cols-2">
          <div>
            <h3 className="font-heading text-lg font-semibold">Modèle servi</h3>
            <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
              <li><strong className="text-foreground">Algorithme :</strong> XGBoost recalibré (régression isotonique)</li>
              <li><strong className="text-foreground">Données :</strong> enquête AGVSAN Bénin 2017 ({(meta?.n_analytique ?? 14952).toLocaleString("fr-FR")} ménages)</li>
              <li><strong className="text-foreground">Variable prédite :</strong> insécurité alimentaire modérée ou sévère (CARI, PAM)</li>
            </ul>
          </div>
          <div className="grid grid-cols-3 gap-3 self-center">
            <Stat label="AUROC" value={(meta?.auroc ?? 0.794).toFixed(3)} />
            <Stat label="Rappel" value={`${((meta?.recall ?? 0.681) * 100).toFixed(0)} %`} />
            <Stat label="Brier" value={(meta?.brier_calibre ?? 0.077).toFixed(3)} />
          </div>
        </div>
      </Reveal>

      <section>
        <Reveal>
          <h2 className="mb-1 font-heading text-2xl font-semibold">Déterminants du risque (OS1)</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Les {det.length || 22} facteurs significatifs (p &lt; 0,05) qui alimentent le formulaire de prédiction.
          </p>
        </Reveal>
        <div className="overflow-auto rounded-2xl border border-border/70">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Déterminant</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Odds ratio</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">IC 95 %</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">p</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Sens</th>
              </tr>
            </thead>
            <tbody>
              {det.map((d) => (
                <tr key={d.feature} className="border-t border-border/50 hover:bg-accent/40">
                  <td className="px-4 py-2">{d.label}</td>
                  <td className="px-4 py-2 text-right tabular font-semibold">{d.or.toFixed(3)}</td>
                  <td className="px-4 py-2 text-right tabular text-muted-foreground">[{d.ic[0].toFixed(3)} ; {d.ic[1].toFixed(3)}]</td>
                  <td className="px-4 py-2 text-right tabular text-muted-foreground">{d.p}</td>
                  <td className="px-4 py-2">
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold text-white")}
                      style={{ background: d.sens === "aggravant" ? "var(--risk-tres)" : "var(--positive)" }}>
                      {d.sens}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Reveal>
        <div className="grid gap-6 rounded-2xl border border-border/70 bg-card/70 p-6 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h3 className="font-heading text-lg font-semibold">Conception &amp; contact</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Solution conçue par <strong className="text-foreground">{BRAND.author}</strong> — {BRAND.role}.
              Pour une démonstration, un déploiement ou une actualisation des données, contactez :
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a href={`mailto:${BRAND.email}`}
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border/70 bg-background/60 px-3 py-1.5 text-sm transition-colors hover:bg-accent">
                <Mail className="size-4 text-primary" /> {BRAND.email}
              </a>
              <a href={BRAND.linkedin} target="_blank" rel="noopener noreferrer"
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border/70 bg-background/60 px-3 py-1.5 text-sm transition-colors hover:bg-accent">
                <Link2 className="size-4 text-primary" /> LinkedIn
              </a>
              <a href={BRAND.portfolio} target="_blank" rel="noopener noreferrer"
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border/70 bg-background/60 px-3 py-1.5 text-sm transition-colors hover:bg-accent">
                <Globe className="size-4 text-primary" /> Portfolio
              </a>
            </div>
          </div>
          <div className="grid size-20 place-items-center rounded-2xl bg-primary/10 font-heading text-2xl font-semibold text-primary">
            PBD
          </div>
        </div>
      </Reveal>

      <p className="rounded-xl border border-border/60 bg-card/60 px-5 py-4 text-sm text-muted-foreground">
        <strong className="text-foreground">Limites &amp; gouvernance.</strong> Modèle fondé sur les données
        d&apos;enquête AGVSAN 2017 ; une actualisation avec des données récentes est recommandée avant tout
        déploiement opérationnel. Solution d&apos;aide à la décision qui appuie, sans le remplacer, le jugement
        des équipes de terrain.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/50 p-3 text-center">
      <div className="font-heading text-xl font-semibold tabular text-primary">{value}</div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}
