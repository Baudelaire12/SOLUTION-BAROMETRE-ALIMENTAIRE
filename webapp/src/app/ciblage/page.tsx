"use client";
import { useEffect, useMemo, useState } from "react";
import { Zap, Droplets, Banknote, GraduationCap } from "lucide-react";
import { api, type CommunesResponse } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { Slider } from "@/components/ui/slider";
import { Reveal } from "@/components/reveal";
import { cn } from "@/lib/utils";

const BASE: Record<string, number | string> = {
  taille_menage: 9, instruction_cm: 0, taux_scolarisation: 0.5, statut_matrimonial: "1",
  departement: "2", electricite: 0, indice_logement: 1, toilette_amelioree: 0,
  log_depenses_alim: 9000, log_revenu: 8000, diversification_revenus: 1,
  activite_principale: "Agriculture", pratique_agriculture: 1, superficie_emblavee: 0,
  tlu: 0, securite_fonciere: 0, vente_actifs_productifs: 1, assistance_recue: 1, capacite_relevement: 2,
};

const INTERVENTIONS = [
  { key: "elec", icon: Zap, label: "Électrification" },
  { key: "eau", icon: Droplets, label: "Eau & assainissement" },
  { key: "revenu", icon: Banknote, label: "Appui au revenu (×2)" },
  { key: "instr", icon: GraduationCap, label: "Scolarisation / formation" },
] as const;

export default function CiblagePage() {
  const [on, setOn] = useState<Record<string, boolean>>({});
  const [p0, setP0] = useState<number | null>(null);
  const [p1, setP1] = useState<number | null>(null);
  const [communes, setCommunes] = useState<CommunesResponse | null>(null);
  const [seuil, setSeuil] = useState(14);

  useEffect(() => { api.communes().then(setCommunes).catch(() => {}); }, []);
  useEffect(() => { api.predict(BASE).then((r) => setP0(r.proba_pct)).catch(() => {}); }, []);
  useEffect(() => {
    const m = { ...BASE };
    if (on.elec) { m.electricite = 1; m.indice_logement = Math.min(3, (m.indice_logement as number) + 1); }
    if (on.eau) { m.toilette_amelioree = 1; }
    if (on.revenu) { m.log_revenu = 16000; m.diversification_revenus = Math.min(3, (m.diversification_revenus as number) + 1); }
    if (on.instr) { m.instruction_cm = 1; m.taux_scolarisation = 1; }
    api.predict(m).then((r) => setP1(r.proba_pct)).catch(() => {});
  }, [on]);

  const cible = useMemo(() => (communes?.top ?? []).filter((c) => c.risk_pct >= seuil), [communes, seuil]);
  const pop = cible.reduce((a, c) => a + c.n, 0);
  const delta = p0 != null && p1 != null ? p1 - p0 : null;

  return (
    <div className="space-y-12">
      <PageHeader eyebrow="Ciblage & simulation" title="Ciblage & simulation d'intervention">
        Simulez l&apos;effet d&apos;interventions sur un ménage vulnérable type, puis calibrez le seuil de
        ciblage géographique.
      </PageHeader>

      <section>
        <h2 className="mb-4 font-heading text-xl font-semibold">Simulation « what-if »</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {INTERVENTIONS.map((it) => {
            const active = !!on[it.key];
            return (
              <button key={it.key} onClick={() => setOn((s) => ({ ...s, [it.key]: !s[it.key] }))}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-xl border p-4 text-left transition-all",
                  active ? "border-primary bg-primary/10" : "border-border/70 bg-card/60 hover:border-primary/40",
                )}>
                <span className={cn("grid size-9 place-items-center rounded-lg",
                  active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                  <it.icon className="size-4" />
                </span>
                <span className="text-sm font-medium">{it.label}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <KpiCard label="Risque initial" value={p0 ?? 0} decimals={1} suffix=" %" />
          <KpiCard label="Après intervention" value={p1 ?? 0} decimals={1} suffix=" %" accent
            hint={delta != null ? `${delta >= 0 ? "+" : ""}${delta.toFixed(1)} points` : undefined} />
          <KpiCard label="Réduction relative"
            value={p0 && p1 != null ? ((p0 - p1) / p0) * 100 : 0} decimals={0} suffix=" %" />
        </div>
      </section>

      <section>
        <h2 className="mb-1 font-heading text-xl font-semibold">Arbitrage du ciblage communal</h2>
        <p className="mb-4 text-sm text-muted-foreground">Combien de communes retenir selon le seuil de risque ?</p>
        <Reveal>
          <div className="rounded-2xl border border-border/70 bg-card/70 p-5">
            <div className="mb-3 text-sm font-medium">Seuil de risque communal : <span className="tabular text-primary">{seuil} %</span></div>
            <Slider min={0} max={40} step={1} value={[seuil]} onValueChange={(v) => setSeuil(Array.isArray(v) ? v[0] : v)} />
            <div className="mt-4 grid grid-cols-2 gap-3">
              <KpiCard label="Communes ciblées" value={cible.length} suffix=" / 77" />
              <KpiCard label="Ménages enquêtés couverts" value={pop} />
            </div>
            <div className="mt-4 max-h-72 overflow-auto rounded-xl border border-border/60">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-secondary/60 backdrop-blur">
                  <tr><th className="px-3 py-2 text-left font-medium text-muted-foreground">Commune</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Risque</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Ménages</th></tr>
                </thead>
                <tbody>
                  {cible.map((c) => (
                    <tr key={c.nom_commune} className="border-t border-border/50 hover:bg-accent/40">
                      <td className="px-3 py-1.5">{c.nom_commune}</td>
                      <td className="px-3 py-1.5 text-right tabular font-semibold text-primary">{c.risk_pct} %</td>
                      <td className="px-3 py-1.5 text-right tabular">{c.n}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
