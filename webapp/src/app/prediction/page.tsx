"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { api, type FormGroup, type Prediction } from "@/lib/api";
import { saveLastPrediction } from "@/lib/session";
import { PageHeader } from "@/components/page-header";
import { DeterminantForm } from "@/components/prediction/determinant-form";
import { RiskGauge } from "@/components/risk/risk-gauge";
import { ShapChart } from "@/components/risk/shap-chart";
import { Reveal } from "@/components/reveal";

export default function PredictionPage() {
  const [groups, setGroups] = useState<FormGroup[] | null>(null);
  const [result, setResult] = useState<Prediction | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.formSchema().then(setGroups).catch(() => toast.error("API non joignable — démarrez le backend."));
  }, []);

  const submit = async (fields: Record<string, number | string>) => {
    setBusy(true);
    try {
      const r = await api.predict(fields);
      setResult(r);
      saveLastPrediction({ proba_pct: r.proba_pct, classe: r.classe, contributions: r.contributions });
    }
    catch { toast.error("Échec de la prédiction."); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <PageHeader eyebrow="Évaluation ménage" title="Prédiction pour un ménage">
        Les champs de saisie sont les <strong>déterminants significatifs</strong> issus de l&apos;analyse
        (OS1) ; chaque badge indique son odds ratio. Les variables non saisies prennent la médiane.
      </PageHeader>

      <div className="grid gap-8 lg:grid-cols-[1.25fr_1fr]">
        <div className="rounded-2xl border border-border/70 bg-card/70 p-5 md:p-6">
          {groups ? <DeterminantForm groups={groups} onSubmit={submit} submitting={busy} />
            : <FormSkeleton />}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          {result ? (
            <Reveal>
              <div className="space-y-5 rounded-2xl border border-border/70 bg-card/80 p-6">
                <div className="text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Probabilité d&apos;insécurité alimentaire
                </div>
                <RiskGauge proba={result.proba} classe={result.classe} />
                <div>
                  <h3 className="mb-1 font-heading text-base font-semibold">Facteurs déterminants (SHAP)</h3>
                  <p className="mb-3 text-xs text-muted-foreground">
                    Rouge = augmente le risque · Bleu = le réduit, pour ce ménage.
                  </p>
                  <ShapChart contributions={result.contributions} />
                </div>
              </div>
            </Reveal>
          ) : (
            <div className="grid h-full min-h-[420px] place-items-center rounded-2xl border border-dashed border-border/70 bg-card/40 p-8 text-center">
              <div className="max-w-xs text-muted-foreground">
                <Sparkles className="mx-auto mb-3 size-6 text-primary/60" />
                <p className="text-sm">Renseignez les caractéristiques du ménage puis lancez l&apos;évaluation
                pour obtenir sa probabilité de risque et l&apos;explication des facteurs.</p>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-2">{[...Array(5)].map((_, i) => <div key={i} className="h-7 w-24 animate-pulse rounded-full bg-muted" />)}</div>
      <div className="grid gap-4 sm:grid-cols-2">
        {[...Array(6)].map((_, i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />)}
      </div>
    </div>
  );
}
