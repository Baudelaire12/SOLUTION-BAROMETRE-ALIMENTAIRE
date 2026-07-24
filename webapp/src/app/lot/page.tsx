"use client";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Download, Upload, FileSpreadsheet } from "lucide-react";
import { api, riskColorVar, type BatchResponse } from "@/lib/api";
import { saveLastBatch } from "@/lib/session";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { Slider } from "@/components/ui/slider";
import { Reveal } from "@/components/reveal";

export default function LotPage() {
  const [data, setData] = useState<BatchResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [seuil, setSeuil] = useState(50);
  const inputRef = useRef<HTMLInputElement>(null);

  const onFile = async (file: File) => {
    setBusy(true);
    try {
      const res = await api.predictBatch(file);
      setData(res); saveLastBatch(res.summary); toast.success("Fichier évalué.");
    }
    catch { toast.error("Échec — vérifiez le format du CSV et l'API."); }
    finally { setBusy(false); }
  };

  const nCible = useMemo(() =>
    data ? data.rows.filter((r) => Number(r.proba_insecurite) * 100 >= seuil).length : 0, [data, seuil]);

  const download = () => {
    if (!data) return;
    const b = new Blob([data.csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b); a.download = "menages_scores.csv"; a.click();
  };

  const cols = data?.rows.length
    ? ["proba_insecurite", "classe_risque",
       ...Object.keys(data.rows[0]).filter((k) => !["proba_insecurite", "classe_risque"].includes(k)).slice(0, 5)]
    : [];

  return (
    <div>
      <PageHeader eyebrow="Traitement par lot" title="Prédiction par lot">
        Chargez un fichier CSV de ménages (colonnes = variables du modèle ; les manquantes prennent la
        médiane). Idéal pour scorer et cibler de nombreux ménages d&apos;un coup.
      </PageHeader>

      <div className="flex flex-wrap items-center gap-3">
        <a href={api.templateUrl}
          className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border/70 bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-accent">
          <FileSpreadsheet className="size-4" /> Gabarit CSV
        </a>
        <input ref={inputRef} type="file" accept=".csv" hidden
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        <button onClick={() => inputRef.current?.click()} disabled={busy}
          className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all hover:brightness-105 disabled:opacity-60">
          <Upload className="size-4" /> {busy ? "Analyse…" : "Charger un CSV"}
        </button>
      </div>

      {data && (
        <div className="mt-8 space-y-6">
          <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <KpiCard label="Ménages" value={data.summary.n} />
            <KpiCard label="Risque moyen" value={data.summary.risque_moyen} decimals={1} suffix=" %" accent />
            <KpiCard label="Très élevé" value={data.summary.tres_eleve} />
            <KpiCard label="Élevé" value={data.summary.eleve} />
            <KpiCard label="Modéré + faible" value={data.summary.modere + data.summary.faible} />
          </section>

          <Reveal>
            <div className="rounded-2xl border border-border/70 bg-card/70 p-5">
              <div className="mb-3 flex items-center justify-between text-sm">
                <span className="font-medium">Seuil de ciblage : <span className="tabular text-primary">{seuil} %</span></span>
                <button onClick={download}
                  className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                  <Download className="size-4" /> Exporter les scores
                </button>
              </div>
              <Slider min={0} max={100} step={5} value={[seuil]} onValueChange={(v) => setSeuil(Array.isArray(v) ? v[0] : v)} />
              <p className="mt-3 text-sm text-muted-foreground">
                🎯 Au seuil {seuil} %, <strong className="text-foreground tabular">{nCible} ménages</strong>{" "}
                ({((nCible / data.summary.n) * 100).toFixed(1)} %) seraient ciblés comme prioritaires.
              </p>
            </div>
          </Reveal>

          <div className="overflow-auto rounded-2xl border border-border/70">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-secondary/60 backdrop-blur">
                <tr>{cols.map((c) => <th key={c} className="px-3 py-2 text-left font-medium text-muted-foreground">{c}</th>)}</tr>
              </thead>
              <tbody>
                {data.rows.slice(0, 100).map((r, i) => (
                  <tr key={i} className="border-t border-border/50 hover:bg-accent/40">
                    {cols.map((c) => (
                      <td key={c} className="px-3 py-1.5 tabular">
                        {c === "proba_insecurite" ? `${(Number(r[c]) * 100).toFixed(1)} %`
                          : c === "classe_risque"
                          ? <span className="rounded-full px-2 py-0.5 text-xs font-semibold text-white"
                              style={{ background: riskColorVar(String(r[c])) }}>{r[c]}</span>
                          : String(r[c])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
