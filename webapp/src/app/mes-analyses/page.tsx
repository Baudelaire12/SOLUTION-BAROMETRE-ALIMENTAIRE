"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText, Gauge, FileSpreadsheet, Trash2, ExternalLink, Users, FolderClock } from "lucide-react";
import { analysesApi, type SavedAnalysis } from "@/lib/authed";
import { PageHeader } from "@/components/page-header";
import { Reveal } from "@/components/reveal";

const ICONS: Record<string, typeof FileText> = { report: FileText, prediction: Gauge, batch: FileSpreadsheet };
const TYPE_LABEL: Record<string, string> = { report: "Rapport", prediction: "Prédiction", batch: "Par lot" };

export default function MesAnalysesPage() {
  const [items, setItems] = useState<SavedAnalysis[] | null>(null);
  const router = useRouter();

  const reload = () => analysesApi.list().then(setItems).catch(() => setItems([]));
  useEffect(() => { reload(); }, []);

  const open = async (a: SavedAnalysis) => {
    if (a.type !== "report") { toast.info("Aperçu disponible pour les rapports."); return; }
    try {
      const full = await analysesApi.get(a.id);
      const p = full.payload || {};
      const q = new URLSearchParams({ title: full.title || "", seuil: String(p.seuil ?? 14), recipient: p.recipient || "" });
      router.push(`/rapport?${q.toString()}`);
    } catch { toast.error("Ouverture impossible."); }
  };

  const remove = async (a: SavedAnalysis) => {
    try { await analysesApi.remove(a.id); toast.success("Analyse supprimée."); reload(); }
    catch { toast.error("Suppression impossible."); }
  };

  return (
    <div>
      <PageHeader eyebrow="Historique" title="Mes analyses">
        Retrouvez, rouvrez et gérez les analyses et rapports que vous avez enregistrés. Les éléments
        partagés par votre organisation apparaissent également ici.
      </PageHeader>

      {items === null ? (
        <div className="grid gap-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />)}</div>
      ) : items.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-border/70 bg-card/40 p-12 text-center text-muted-foreground">
          <FolderClock className="mb-3 size-7 text-primary/60" />
          <p className="max-w-sm text-sm">Aucune analyse enregistrée pour l&apos;instant. Générez un rapport puis
            cliquez sur « Enregistrer » pour le retrouver ici.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {items.map((a, i) => {
            const Icon = ICONS[a.type] ?? FileText;
            return (
              <Reveal key={a.id} delay={i * 0.04}>
                <div className="flex items-center gap-4 rounded-xl border border-border/70 bg-card/70 p-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="size-5" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{a.title}</span>
                      {a.shared && <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-1.5 py-0.5 text-[10px] text-secondary-foreground"><Users className="size-3" /> Organisation</span>}
                      {!a.own && <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">Partagé avec vous</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {TYPE_LABEL[a.type] ?? a.type} · {new Date(a.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                    </div>
                  </div>
                  {a.type === "report" && (
                    <button onClick={() => open(a)} title="Ouvrir"
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border/70 px-3 py-1.5 text-sm transition-colors hover:bg-accent">
                      <ExternalLink className="size-4" /> Ouvrir
                    </button>
                  )}
                  {a.own && (
                    <button onClick={() => remove(a)} title="Supprimer" aria-label="Supprimer"
                      className="cursor-pointer rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
              </Reveal>
            );
          })}
        </div>
      )}
    </div>
  );
}
