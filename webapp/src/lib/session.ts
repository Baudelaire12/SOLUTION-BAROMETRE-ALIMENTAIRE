/* Persistance légère (sessionStorage) des évaluations réalisées, pour les inclure au rapport. */
export type SessionPrediction = {
  proba_pct: number; classe: string;
  contributions: { label: string; value: number }[];
};
export type SessionBatch = {
  n: number; risque_moyen: number; tres_eleve: number; eleve: number; modere: number; faible: number;
};

const PK = "ba:lastPrediction";
const BK = "ba:lastBatch";

export function saveLastPrediction(p: SessionPrediction) {
  try { sessionStorage.setItem(PK, JSON.stringify(p)); } catch {}
}
export function loadLastPrediction(): SessionPrediction | null {
  try { const s = sessionStorage.getItem(PK); return s ? JSON.parse(s) : null; } catch { return null; }
}
export function saveLastBatch(b: SessionBatch) {
  try { sessionStorage.setItem(BK, JSON.stringify(b)); } catch {}
}
export function loadLastBatch(): SessionBatch | null {
  try { const s = sessionStorage.getItem(BK); return s ? JSON.parse(s) : null; } catch { return null; }
}
