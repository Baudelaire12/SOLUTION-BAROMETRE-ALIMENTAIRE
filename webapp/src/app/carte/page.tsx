"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { FileSpreadsheet, MapPin, Package } from "lucide-react";
import { api, type CommunesResponse } from "@/lib/api";
import { exportUrl } from "@/lib/authed";
import { PageHeader } from "@/components/page-header";
import { Reveal } from "@/components/reveal";

const RiskMap = dynamic(() => import("@/components/carte/risk-map"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-muted-foreground">Chargement de la carte…</div>,
});

export default function CartePage() {
  const [data, setData] = useState<CommunesResponse | null>(null);
  const [offline, setOffline] = useState(false);
  useEffect(() => { api.communes().then(setData).catch(() => setOffline(true)); }, []);

  const bands = data?.bands ?? [0.08, 0.14, 0.23];
  const legend = [
    { c: "#f0e3c4", t: `< ${(bands[0] * 100).toFixed(0)} %` },
    { c: "var(--risk-modere)", t: `${(bands[0] * 100).toFixed(0)}–${(bands[1] * 100).toFixed(0)} %` },
    { c: "var(--risk-eleve)", t: `${(bands[1] * 100).toFixed(0)}–${(bands[2] * 100).toFixed(0)} %` },
    { c: "var(--risk-tres)", t: `> ${(bands[2] * 100).toFixed(0)} %` },
  ];

  return (
    <div>
      <PageHeader eyebrow="Cartographie du risque" title="Cartographie communale du risque">
        Risque d&apos;insécurité alimentaire prédit et agrégé à l&apos;échelle des 77 communes. Les poches de
        vulnérabilité se concentrent dans le nord-ouest (Atacora).
      </PageHeader>

      {offline && <p className="mb-4 text-sm text-primary">API non joignable — démarrez le backend (python app/run.py).</p>}

      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">Exporter pour un SIG :</span>
        <a href={exportUrl("xlsx")} className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-card px-3 py-1.5 transition-colors hover:bg-accent"><FileSpreadsheet className="size-4 text-primary" /> Excel</a>
        <a href={exportUrl("geojson")} className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-card px-3 py-1.5 transition-colors hover:bg-accent"><MapPin className="size-4 text-primary" /> GeoJSON</a>
        <a href={exportUrl("shp.zip")} className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-card px-3 py-1.5 transition-colors hover:bg-accent"><Package className="size-4 text-primary" /> Shapefile</a>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.9fr_1fr]">
        <div className="relative h-[560px] overflow-hidden rounded-2xl border border-border/70 bg-card/40">
          {data ? <RiskMap data={data} /> : <div className="grid h-full place-items-center text-sm text-muted-foreground">Chargement…</div>}
          <div className="absolute bottom-4 right-4 z-[1000] rounded-xl border border-border/70 bg-background/85 p-3 text-xs shadow-sm backdrop-blur">
            <div className="mb-1.5 font-semibold">Risque prédit</div>
            {legend.map((l) => (
              <div key={l.t} className="flex items-center gap-2">
                <span className="size-3 rounded-sm" style={{ background: l.c }} /> {l.t}
              </div>
            ))}
          </div>
        </div>

        <Reveal>
          <div className="rounded-2xl border border-border/70 bg-card/70 p-5">
            <h3 className="mb-3 font-heading text-lg font-semibold">Communes prioritaires</h3>
            <ol className="space-y-1">
              {(data?.top ?? []).slice(0, 15).map((c, i) => (
                <li key={c.nom_commune} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-accent/50">
                  <span className="w-5 text-right text-xs tabular text-muted-foreground">{i + 1}</span>
                  <span className="flex-1 text-sm">{c.nom_commune}</span>
                  <span className="tabular text-sm font-semibold" style={{ color: riskColor(c.risk_pct, bands) }}>
                    {c.risk_pct} %
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </Reveal>
      </div>
    </div>
  );
}

function riskColor(pct: number, bands: number[]) {
  const r = pct / 100;
  if (r > bands[2]) return "var(--risk-tres)";
  if (r > bands[1]) return "var(--risk-eleve)";
  if (r > bands[0]) return "var(--risk-modere)";
  return "var(--positive)";
}
