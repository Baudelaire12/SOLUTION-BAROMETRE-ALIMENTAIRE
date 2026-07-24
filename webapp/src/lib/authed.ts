/* Appels API authentifiés (jeton Bearer) : historique des analyses, mot de passe, exports SIG. */
import { API_BASE } from "@/lib/api";

function token(): string {
  try { return localStorage.getItem("ba:token") || ""; } catch { return ""; }
}

async function authed(path: string, init: RequestInit = {}) {
  const isForm = init.body instanceof FormData;
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${token()}`,
      ...(init.body && !isForm ? { "Content-Type": "application/json" } : {}),
    },
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d?.detail || "Une erreur est survenue.");
  }
  return res;
}

export type SavedAnalysis = {
  id: number; type: string; title: string; shared: boolean; own: boolean; created_at: string;
};

export const analysesApi = {
  save: (a: { type: string; title: string; payload: Record<string, unknown>; shared: boolean }) =>
    authed("/api/analyses", { method: "POST", body: JSON.stringify(a) }).then((r) => r.json()),
  list: (): Promise<SavedAnalysis[]> => authed("/api/analyses").then((r) => r.json()),
  get: (id: number) => authed(`/api/analyses/${id}`).then((r) => r.json()),
  remove: (id: number) => authed(`/api/analyses/${id}`, { method: "DELETE" }).then((r) => r.json()),
};

export const changePassword = (current: string, next: string) =>
  authed("/api/auth/change-password", { method: "POST", body: JSON.stringify({ current, new: next }) })
    .then((r) => r.json());

export const exportUrl = (fmt: "xlsx" | "geojson" | "shp.zip", seuil = 0) =>
  `${API_BASE}/api/export/communes.${fmt}?seuil=${seuil}`;
