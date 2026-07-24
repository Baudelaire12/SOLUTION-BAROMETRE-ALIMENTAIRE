"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Printer, Download, Loader2, Save, FileSpreadsheet, MapPin, Package, ImageUp } from "lucide-react";
import { api, riskColorVar, type ReportData } from "@/lib/api";
import { BRAND } from "@/lib/brand";
import { loadLastPrediction, loadLastBatch, type SessionPrediction, type SessionBatch } from "@/lib/session";
import { analysesApi, exportUrl } from "@/lib/authed";
import { PageHeader } from "@/components/page-header";
import { Slider } from "@/components/ui/slider";

const RECIPIENTS = [
  "Programme Alimentaire Mondial (PAM)",
  "Organisation des Nations Unies pour l'alimentation et l'agriculture (FAO)",
  "Organisation non gouvernementale (ONG)",
  "Autorité nationale / Gouvernement",
  "Autre",
];
const RISK_COLORS: Record<string, string> = {
  "Très élevé": "var(--risk-tres)", "Élevé": "var(--risk-eleve)",
  "Modéré": "var(--risk-modere)", "Faible": "var(--positive)",
};

export default function RapportPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [recipient, setRecipient] = useState(RECIPIENTS[0]);
  const [custom, setCustom] = useState("");
  const [title, setTitle] = useState("Rapport d'analyse du risque d'insécurité alimentaire des ménages");
  const [seuil, setSeuil] = useState(14);
  const [pred, setPred] = useState<SessionPrediction | null>(null);
  const [batch, setBatch] = useState<SessionBatch | null>(null);
  const [mapData, setMapData] = useState("");
  const [pdfBusy, setPdfBusy] = useState(false);
  const [logo, setLogo] = useState("");
  const [shared, setShared] = useState(false);
  const [saving, setSaving] = useState(false);
  const reportRef = useRef<HTMLElement | null>(null);

  useEffect(() => { api.report().then(setData).catch(() => {}); }, []);
  useEffect(() => { setPred(loadLastPrediction()); setBatch(loadLastBatch()); }, []);
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search);
      if (q.get("title")) setTitle(q.get("title")!);
      if (q.get("seuil")) setSeuil(Number(q.get("seuil")));
      const r = q.get("recipient");
      if (r) { if (RECIPIENTS.includes(r)) setRecipient(r); else { setRecipient("Autre"); setCustom(r); } }
      const l = localStorage.getItem("ba:logo"); if (l) setLogo(l);
    } catch {}
  }, []);
  useEffect(() => {
    fetch(api.reportMapUrl).then((r) => r.blob()).then((b) => {
      const fr = new FileReader();
      fr.onloadend = () => setMapData(fr.result as string);
      fr.readAsDataURL(b);
    }).catch(() => {});
  }, []);

  const dest = recipient === "Autre" ? (custom || "—") : recipient;
  const cible = useMemo(() => (data?.top_communes ?? []).filter((c) => c.risk_pct >= seuil), [data, seuil]);
  const caseload = cible.reduce((a, c) => a + c.n, 0);

  if (!data) {
    return (
      <div className="grid min-h-[50vh] place-items-center text-muted-foreground">
        <div className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> Chargement des données du rapport…</div>
      </div>
    );
  }

  const m = data.meta;
  const dateFr = new Date(data.generated_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const ref = `BA-${data.generated_at}`;
  const topDept = data.departments[0];
  const topCom = data.top_communes[0];
  const dist = data.commune_distribution;
  const distMax = Math.max(...Object.values(dist), 1);
  const deptMax = Math.max(...data.departments.map((d) => d.risk_pct), 1);

  const downloadPdf = async () => {
    const el = reportRef.current;
    if (!el) return;
    setPdfBusy(true);
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import("jspdf"), import("html2canvas-pro"),
      ]);
      const pdf = new jsPDF("p", "mm", "a4");
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      const M = 10;                       // marge (mm)
      const usableW = pw - M * 2;
      const usableH = ph - M * 2;
      // On rend CHAQUE section séparément : aucune n'est coupée entre deux pages.
      const blocks = Array.from(el.querySelectorAll<HTMLElement>(":scope > .report-section"));
      let y = M;
      for (const block of blocks) {
        const canvas = await html2canvas(block, { scale: 2, backgroundColor: "#ffffff" });
        let w = usableW;
        let h = (canvas.height * w) / canvas.width;
        if (h > usableH) { h = usableH; w = (canvas.width * h) / canvas.height; } // tient sur une page
        if (y + h > ph - M && y > M) { pdf.addPage(); y = M; }                     // sinon, page suivante
        const x = M + (usableW - w) / 2;
        pdf.addImage(canvas.toDataURL("image/png"), "PNG", x, y, w, h);
        y += h + 6;                       // espacement entre sections
      }
      pdf.save(`Rapport_Barometre_Alimentaire_${data.generated_at}.pdf`);
    } finally {
      setPdfBusy(false);
    }
  };

  const saveReport = async () => {
    setSaving(true);
    try {
      await analysesApi.save({
        type: "report", title, shared,
        payload: { recipient: dest, seuil, generated_at: data.generated_at,
                   prevalence: m.prevalence_pct, n_prioritaires: data.n_communes_prioritaires },
      });
      toast.success(shared ? "Rapport enregistré et partagé à votre organisation."
                           : "Rapport enregistré dans « Mes analyses ».");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally { setSaving(false); }
  };

  const onLogo = (f?: File) => {
    if (!f) return;
    const fr = new FileReader();
    fr.onloadend = () => { const d = fr.result as string; setLogo(d); try { localStorage.setItem("ba:logo", d); } catch {} };
    fr.readAsDataURL(f);
  };

  return (
    <div>
      {/* ------- Barre de configuration (non imprimée) ------- */}
      <div className="no-print">
        <PageHeader eyebrow="Livrable" title="Rapport d'analyse">
          Générez un rapport professionnel prêt à soumettre à vos partenaires. Configurez le destinataire
          et le seuil de ciblage, puis exportez en PDF (bouton ci-dessous → « Enregistrer au format PDF »).
        </PageHeader>
        <div className="mb-8 grid gap-4 rounded-2xl border border-border/70 bg-card/70 p-5 md:grid-cols-2">
          <label className="space-y-1.5 text-sm">
            <span className="font-medium">Destinataire</span>
            <select value={recipient} onChange={(e) => setRecipient(e.target.value)}
              className="w-full rounded-lg border border-border/70 bg-background px-3 py-2">
              {RECIPIENTS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
          {recipient === "Autre" ? (
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">Nom du destinataire</span>
              <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Ex. : Direction de l'Alimentation…"
                className="w-full rounded-lg border border-border/70 bg-background px-3 py-2" />
            </label>
          ) : <div />}
          <label className="space-y-1.5 text-sm md:col-span-2">
            <span className="font-medium">Titre du rapport</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-border/70 bg-background px-3 py-2" />
          </label>
          <label className="space-y-2 text-sm md:col-span-2">
            <span className="font-medium">Seuil de ciblage communal : <span className="tabular text-primary">{seuil} %</span></span>
            <Slider min={0} max={40} step={1} value={[seuil]} onValueChange={(v) => setSeuil(Array.isArray(v) ? v[0] : v)} />
          </label>
          <div className="flex flex-wrap gap-3 md:col-span-2">
            <button onClick={downloadPdf} disabled={pdfBusy}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-heading font-semibold text-primary-foreground transition-all hover:brightness-105 disabled:opacity-60">
              {pdfBusy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              {pdfBusy ? "Génération du PDF…" : "Télécharger le PDF"}
            </button>
            <button onClick={() => window.print()}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border/70 bg-background px-5 py-2.5 font-medium transition-colors hover:bg-accent">
              <Printer className="size-4" /> Imprimer
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3 border-t border-border/60 pt-4 md:col-span-2">
            <button onClick={saveReport} disabled={saving}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border/70 bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-60">
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Enregistrer
            </button>
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} className="size-4 accent-[var(--primary)]" />
              Partager à mon organisation
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border/70 bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-accent">
              <ImageUp className="size-4" /> {logo ? "Changer le logo" : "Ajouter un logo"}
              <input type="file" accept="image/*" hidden onChange={(e) => onLogo(e.target.files?.[0])} />
            </label>
            <span className="ml-auto flex flex-wrap items-center gap-2 text-sm text-muted-foreground">Export SIG :
              <a href={exportUrl("xlsx", seuil)} className="inline-flex items-center gap-1 rounded-md border border-border/70 px-2 py-1 text-xs transition-colors hover:bg-accent"><FileSpreadsheet className="size-3.5" /> Excel</a>
              <a href={exportUrl("geojson", seuil)} className="inline-flex items-center gap-1 rounded-md border border-border/70 px-2 py-1 text-xs transition-colors hover:bg-accent"><MapPin className="size-3.5" /> GeoJSON</a>
              <a href={exportUrl("shp.zip", seuil)} className="inline-flex items-center gap-1 rounded-md border border-border/70 px-2 py-1 text-xs transition-colors hover:bg-accent"><Package className="size-3.5" /> Shapefile</a>
            </span>
          </div>
        </div>
      </div>

      {/* ------- Document du rapport ------- */}
      <article ref={reportRef} className="report mx-auto max-w-[820px] rounded-2xl border border-border/70 bg-white p-8 text-[13.5px] leading-relaxed text-[#241e18] shadow-sm md:p-12 dark:bg-white">
        {/* COUVERTURE */}
        <section className="report-section">
          <div className="flex items-center justify-between border-b-2 border-[#b23a1e] pb-4">
            <div className="flex items-center gap-2 font-heading text-lg font-semibold text-[#b23a1e]">
              {logo
                ? <img src={logo} alt="Logo de l'organisation" className="h-9 w-auto max-w-[160px] object-contain" />
                : <span className="grid size-8 place-items-center rounded-full bg-[#b23a1e] text-sm text-white">BA</span>}
              {BRAND.solution}
            </div>
            <div className="text-right text-[11px] text-[#6e6357]">
              Réf. {ref}<br />{dateFr}
            </div>
          </div>
          <div className="py-16">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#b23a1e]">Rapport d&apos;analyse · Confidentiel</div>
            <h1 className="mt-4 font-heading text-4xl font-semibold leading-tight text-[#241e18]">{title}</h1>
            <p className="mt-3 max-w-xl text-[#4a3f35]">
              Ciblage géographique et déterminants de l&apos;insécurité alimentaire des ménages au Bénin,
              issus d&apos;un modèle prédictif calibré sur les données d&apos;enquête nationale.
            </p>
            <div className="mt-10 grid grid-cols-3 gap-4">
              <Callout v={`${m.prevalence_pct.toFixed(1)} %`} l="Prévalence nationale" />
              <Callout v={`${data.n_communes_prioritaires}`} l="Communes prioritaires" />
              <Callout v={`${(m.auroc * 100).toFixed(0)} %`} l="Fiabilité du modèle (AUROC)" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6 border-t border-[#e7dfd3] pt-5 text-[12px]">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[#6e6357]">À l&apos;attention de</div>
              <div className="mt-0.5 font-medium">{dest}</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[#6e6357]">Préparé par</div>
              <div className="mt-0.5 font-medium">{BRAND.author}</div>
              <div className="text-[#6e6357]">{BRAND.role} · {BRAND.email}</div>
            </div>
          </div>
        </section>

        {/* 1. RÉSUMÉ EXÉCUTIF */}
        <Section n="1" title="Résumé exécutif" pageBreak>
          <p>
            À l&apos;échelle nationale, <strong>{m.prevalence_pct.toFixed(1)} %</strong> des ménages béninois
            sont en insécurité alimentaire (modérée ou sévère). L&apos;analyse prédictive identifie{" "}
            <strong>{data.n_communes_prioritaires} communes prioritaires</strong> (risque élevé ou très élevé)
            sur les {data.n_communes} que compte le pays, avec une concentration marquée dans le
            département de <strong>{topDept?.departement}</strong> ({topDept?.risk_pct} % de risque moyen).
          </p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5">
            <li>La commune la plus exposée est <strong>{topCom?.nom_commune}</strong> ({topCom?.risk_pct} % de risque prédit).</li>
            <li>Les principaux facteurs de vulnérabilité sont la faiblesse des dépenses alimentaires et du revenu, l&apos;absence d&apos;électricité et le recours à la vente d&apos;actifs productifs.</li>
            <li>Le modèle atteint une fiabilité de <strong>{(m.auroc * 100).toFixed(0)} % (AUROC)</strong> et détecte <strong>{(m.recall * 100).toFixed(0)} %</strong> des ménages réellement en insécurité.</li>
            <li>Au seuil de ciblage retenu ({seuil} %), <strong>{cible.length} communes</strong> seraient prioritaires, couvrant environ <strong>{caseload.toLocaleString("fr-FR")}</strong> ménages enquêtés.</li>
          </ul>
        </Section>

        {/* 2. CONTEXTE & APPROCHE */}
        <Section n="2" title="Contexte et approche méthodologique">
          <p>
            Ce rapport s&apos;appuie sur l&apos;{BRAND.dataSource}, couvrant {m.n_analytique.toLocaleString("fr-FR")}{" "}
            ménages. Un modèle d&apos;apprentissage automatique (gradient boosting) a été entraîné pour estimer,
            pour chaque ménage, la probabilité d&apos;être en insécurité alimentaire, puis <em>calibré</em> afin
            que les probabilités produites soient directement interprétables comme des niveaux de risque.
          </p>
          <p className="mt-2">
            La performance est évaluée hors échantillon (AUROC = {m.auroc.toFixed(3)} ; score de Brier ={" "}
            {m.brier_calibre.toFixed(3)}). Les probabilités individuelles sont ensuite agrégées à l&apos;échelle
            communale pour produire la cartographie du risque et les priorités de ciblage présentées ci-après.
          </p>
        </Section>

        {/* 3. SITUATION NATIONALE */}
        <Section n="3" title="Situation nationale">
          <p>Répartition des {data.n_communes} communes selon leur niveau de risque prédit :</p>
          <div className="mt-3 space-y-2">
            {(["Très élevé", "Élevé", "Modéré", "Faible"] as const).map((c) => (
              <div key={c} className="flex items-center gap-3">
                <span className="w-24 text-[12px]">{c}</span>
                <div className="h-5 flex-1 overflow-hidden rounded bg-[#f1ebe2]">
                  <div className="h-full rounded" style={{ width: `${(dist[c] / distMax) * 100}%`, background: RISK_COLORS[c] }} />
                </div>
                <span className="w-8 text-right text-[12px] tabular font-semibold">{dist[c]}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* 4. DÉTERMINANTS */}
        <Section n="4" title="Déterminants du risque">
          <p>Facteurs statistiquement associés au risque (odds ratio &gt; 1 = aggravant ; &lt; 1 = protecteur) :</p>
          <div className="mt-3 grid grid-cols-2 gap-5">
            <DetTable title="Principaux facteurs aggravants" rows={data.aggravants.slice(0, 6)} color="var(--risk-tres)" />
            <DetTable title="Principaux facteurs protecteurs" rows={data.protecteurs.slice(0, 6)} color="var(--positive)" />
          </div>
          <p className="mt-3 text-[12px] text-[#6e6357]">
            Lecture opérationnelle : renforcer le pouvoir d&apos;achat alimentaire, l&apos;accès à l&apos;électricité et
            à un logement décent, la diversification des revenus et la scolarisation réduit sensiblement le risque.
          </p>
        </Section>

        {/* 5. CARTOGRAPHIE & ZONES PRIORITAIRES */}
        <Section n="5" title="Cartographie et zones prioritaires" pageBreak>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <img src={mapData || api.reportMapUrl} alt="Carte communale du risque prédit d'insécurité alimentaire au Bénin"
                className="w-full rounded-lg border border-[#e7dfd3]" />
              <p className="mt-1 text-[11px] text-[#6e6357]">Risque prédit par commune (plus foncé = risque plus élevé).</p>
            </div>
            <div>
              <div className="mb-1 text-[12px] font-semibold">Risque moyen par département</div>
              <div className="space-y-1">
                {data.departments.map((d) => (
                  <div key={d.code} className="flex items-center gap-2">
                    <span className="w-20 truncate text-[11px]">{d.departement}</span>
                    <div className="h-3.5 flex-1 overflow-hidden rounded bg-[#f1ebe2]">
                      <div className="h-full rounded bg-[#cb5a2c]" style={{ width: `${(d.risk_pct / deptMax) * 100}%` }} />
                    </div>
                    <span className="w-9 text-right text-[11px] tabular font-semibold">{d.risk_pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-5">
            <div className="mb-1 text-[12px] font-semibold">Communes au risque prédit le plus élevé</div>
            <table className="w-full text-[12px]">
              <thead><tr className="border-b border-[#e7dfd3] text-left text-[#6e6357]">
                <th className="py-1">#</th><th className="py-1">Commune</th>
                <th className="py-1 text-right">Risque prédit</th><th className="py-1 text-right">Ménages enquêtés</th></tr></thead>
              <tbody>
                {data.top_communes.slice(0, 10).map((c, i) => (
                  <tr key={c.nom_commune} className="border-b border-[#f0ebe2]">
                    <td className="py-1 tabular text-[#6e6357]">{i + 1}</td>
                    <td className="py-1">{c.nom_commune}</td>
                    <td className="py-1 text-right tabular font-semibold text-[#b23a1e]">{c.risk_pct} %</td>
                    <td className="py-1 text-right tabular">{c.n}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* 6. RECOMMANDATIONS */}
        <Section n="6" title="Recommandations et plan de ciblage" pageBreak>
          <div className="mb-3 grid grid-cols-3 gap-4">
            <Callout v={`${cible.length}`} l="Communes à cibler" small />
            <Callout v={caseload.toLocaleString("fr-FR")} l="Ménages enquêtés couverts" small />
            <Callout v={`${seuil} %`} l="Seuil de risque retenu" small />
          </div>
          <p className="font-medium">Priorités d&apos;intervention recommandées :</p>
          <ol className="mt-1.5 list-decimal space-y-1 pl-5">
            <li><strong>Cibler en priorité</strong> les {cible.length} communes au-delà du seuil de {seuil} %,
              à commencer par {data.top_communes.slice(0, 3).map((c) => c.nom_commune).join(", ")}.</li>
            <li><strong>Actionner les leviers</strong> à plus fort effet protecteur : appui au revenu et à la
              diversification des activités, électrification, eau et assainissement, appui à la scolarisation.</li>
            <li><strong>Suivre &amp; réévaluer</strong> : actualiser les prédictions à chaque nouvelle enquête et
              ajuster le seuil de ciblage selon l&apos;enveloppe budgétaire disponible.</li>
          </ol>
        </Section>

        {/* 7. MÉNAGES ÉVALUÉS (session) */}
        <Section n="7" title="Ménages évalués dans cette session">
          {(pred || batch) ? (
            <div className="grid grid-cols-2 gap-6">
              {pred && (
                <div>
                  <div className="text-[12px] font-semibold">Évaluation individuelle</div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="font-heading text-3xl font-semibold tabular" style={{ color: riskColorVar(pred.classe) }}>
                      {pred.proba_pct.toFixed(1)} %
                    </span>
                    <span className="text-[12px] font-medium" style={{ color: riskColorVar(pred.classe) }}>Risque {pred.classe}</span>
                  </div>
                  <div className="mt-2 text-[11px] text-[#6e6357]">Facteurs déterminants pour ce ménage :</div>
                  <table className="w-full text-[12px]">
                    <tbody>
                      {pred.contributions.slice(0, 5).map((c) => (
                        <tr key={c.label} className="border-b border-[#f0ebe2]">
                          <td className="py-1">{c.label}</td>
                          <td className="py-1 text-right tabular font-semibold"
                            style={{ color: c.value > 0 ? "var(--risk-tres)" : "var(--positive)" }}>
                            {c.value > 0 ? "+" : ""}{c.value.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {batch && (
                <div>
                  <div className="text-[12px] font-semibold">Évaluation par lot</div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="font-heading text-3xl font-semibold tabular text-[#b23a1e]">{batch.n.toLocaleString("fr-FR")}</span>
                    <span className="text-[12px]">ménages · risque moyen {batch.risque_moyen} %</span>
                  </div>
                  <div className="mt-2 space-y-1">
                    {([["Très élevé", batch.tres_eleve, "var(--risk-tres)"],
                       ["Élevé", batch.eleve, "var(--risk-eleve)"],
                       ["Modéré", batch.modere, "var(--risk-modere)"],
                       ["Faible", batch.faible, "var(--positive)"]] as const).map(([l, v, col]) => (
                      <div key={l} className="flex items-center justify-between border-b border-[#f0ebe2] py-0.5 text-[12px]">
                        <span>{l}</span><span className="tabular font-semibold" style={{ color: col }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-[#6e6357]">
              Aucune évaluation individuelle ou par lot n&apos;a été réalisée dans cette session. Utilisez les
              modules « Prédiction » ou « Prédiction par lot », puis revenez générer le rapport pour y intégrer
              ces résultats.
            </p>
          )}
        </Section>

        {/* 8. LIMITES */}
        <Section n="8" title="Limites et gouvernance des données">
          <p>
            Les résultats reposent sur les données d&apos;enquête AGVSAN 2017 ; une actualisation avec des
            données récentes est recommandée avant tout déploiement à grande échelle. Les prédictions
            constituent une <strong>aide à la décision</strong> et n&apos;ont pas vocation à se substituer à
            l&apos;évaluation des équipes de terrain. Aucune donnée personnelle identifiante n&apos;est mobilisée.
          </p>
        </Section>

        {/* SIGNATURE */}
        <div className="report-section mt-10 flex items-end justify-between border-t-2 border-[#b23a1e] pt-4 text-[12px]">
          <div>
            <div className="font-heading font-semibold text-[#241e18]">{BRAND.author}</div>
            <div className="text-[#6e6357]">{BRAND.role}</div>
            <div className="text-[#6e6357]">{BRAND.email}</div>
          </div>
          <div className="text-right text-[#6e6357]">
            {BRAND.solution} · {dateFr}<br />Réf. {ref}
          </div>
        </div>
      </article>
    </div>
  );
}

function Callout({ v, l, small }: { v: string; l: string; small?: boolean }) {
  return (
    <div className="rounded-xl border border-[#e7dfd3] bg-[#faf7f3] p-3">
      <div className={`font-heading font-semibold text-[#b23a1e] tabular ${small ? "text-xl" : "text-3xl"}`}>{v}</div>
      <div className="text-[10px] uppercase tracking-wider text-[#6e6357]">{l}</div>
    </div>
  );
}

function Section({ n, title, children, pageBreak }: { n: string; title: string; children: React.ReactNode; pageBreak?: boolean }) {
  return (
    <section className={`report-section mt-8 ${pageBreak ? "page-break pt-2" : ""}`}>
      <h2 className="mb-2 flex items-center gap-2 font-heading text-xl font-semibold text-[#241e18]">
        <span className="grid size-6 place-items-center rounded bg-[#b23a1e] text-[13px] text-white">{n}</span>
        {title}
      </h2>
      <div className="text-[#3a3128]">{children}</div>
    </section>
  );
}

function DetTable({ title, rows, color }: { title: string; rows: { label: string; or: number }[]; color: string }) {
  return (
    <div>
      <div className="mb-1 text-[12px] font-semibold" style={{ color }}>{title}</div>
      <table className="w-full text-[12px]">
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-b border-[#f0ebe2]">
              <td className="py-1">{r.label}</td>
              <td className="py-1 text-right tabular font-semibold" style={{ color }}>{r.or.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
