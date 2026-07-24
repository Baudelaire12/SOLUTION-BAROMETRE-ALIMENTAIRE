"use client";
/* Authentification réelle : appelle l'API backend (comptes en base, mots de passe hachés,
   jeton signé conservé côté client). */
import { createContext, useContext, useEffect, useState } from "react";
import { API_BASE } from "@/lib/api";

export type User = { name: string; email: string; org: string; role: string };
const KEY_TOKEN = "ba:token";

type AuthCtx = {
  user: User | null; ready: boolean;
  register: (name: string, email: string, org: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};
const Ctx = createContext<AuthCtx | null>(null);

async function call(path: string, body: unknown): Promise<{ token: string; user: User }> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.detail || "Une erreur est survenue.");
  return data;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem(KEY_TOKEN);
    if (!token) { setReady(true); return; }
    fetch(`${API_BASE}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setUser(d.user))
      .catch(() => localStorage.removeItem(KEY_TOKEN))
      .finally(() => setReady(true));
  }, []);

  const register = async (name: string, email: string, org: string, password: string) => {
    const { token, user } = await call("/api/auth/register", { name, org, email, password });
    localStorage.setItem(KEY_TOKEN, token); setUser(user);
  };
  const login = async (email: string, password: string) => {
    const { token, user } = await call("/api/auth/login", { email, password });
    localStorage.setItem(KEY_TOKEN, token); setUser(user);
  };
  const logout = () => { localStorage.removeItem(KEY_TOKEN); setUser(null); };

  return <Ctx.Provider value={{ user, ready, register, login, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth doit être utilisé dans AuthProvider");
  return c;
}
