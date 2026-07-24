/* Client de l'API FastAPI (backend d'aide à la décision). */
export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export type Metadata = {
  auroc: number; recall: number; brier_calibre: number; prevalence_pct: number;
  n_analytique: number; risk_bands: number[]; best_params: Record<string, unknown>;
  top_features: string[]; scale_pos_weight: number; dept_labels: Record<string, string>;
};

export type FormField = {
  key: string; label: string; type: "number" | "slider" | "binary" | "select" | "select_cat";
  feature?: string; cat?: string; default: number | string; min?: number; max?: number;
  step?: number; unit?: string; transform?: string; options?: [string | number, string][];
  or?: number; p?: number; or_note?: string;
};
export type FormGroup = { capital: string; icon: string; fields: FormField[] };

export type Contribution = { label: string; feature: string; value: number };
export type Prediction = {
  proba: number; proba_pct: number; classe: string; couleur: string; contributions: Contribution[];
};

export type Determinant = {
  label: string; feature: string; or: number; ic: [number, number]; p: number;
  sens: "aggravant" | "protecteur";
};

export type CommuneTop = { nom_commune: string; risk_pct: number; n: number };
export type CommunesResponse = {
  geojson: GeoJSON.FeatureCollection; top: CommuneTop[]; bands: number[];
};

export type BatchResponse = {
  summary: { n: number; risque_moyen: number; tres_eleve: number; eleve: number; modere: number; faible: number };
  rows: Record<string, string | number>[];
  csv: string;
};

export type DepartmentRisk = { code: number; departement: string; risk_pct: number; n: number };
export type ReportData = {
  meta: Metadata;
  n_communes: number;
  commune_distribution: Record<string, number>;
  n_communes_prioritaires: number;
  departments: DepartmentRisk[];
  top_communes: CommuneTop[];
  aggravants: Determinant[];
  protecteurs: Determinant[];
  bands: number[];
  generated_at: string;
};

async function j<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init);
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  metadata: () => j<Metadata>("/api/metadata"),
  formSchema: () => j<FormGroup[]>("/api/form-schema"),
  determinants: () => j<Determinant[]>("/api/determinants"),
  communes: () => j<CommunesResponse>("/api/communes"),
  predict: (fields: Record<string, number | string>) =>
    j<Prediction>("/api/predict", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
    }),
  predictBatch: (file: File) => {
    const fd = new FormData(); fd.append("file", file);
    return j<BatchResponse>("/api/predict/batch", { method: "POST", body: fd });
  },
  report: () => j<ReportData>("/api/report"),
  templateUrl: `${API_BASE}/api/template`,
  reportMapUrl: `${API_BASE}/api/report/map.png`,
};

export function riskColorVar(classe: string): string {
  return classe === "Faible" ? "var(--risk-faible)"
    : classe === "Modéré" ? "var(--risk-modere)"
    : classe === "Élevé" ? "var(--risk-eleve)"
    : "var(--risk-tres)";
}
