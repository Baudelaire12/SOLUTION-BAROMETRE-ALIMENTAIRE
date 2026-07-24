"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { AuthShell, Field } from "@/components/auth/auth-shell";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(""); setBusy(true);
    try { await login(email, password); router.replace("/"); }
    catch (x) { setErr(x instanceof Error ? x.message : "Connexion impossible."); setBusy(false); }
  };

  return (
    <AuthShell title="Connexion" subtitle="Accédez à votre espace d'analyse."
      footer={<>Pas encore de compte ? <Link href="/register" className="font-medium text-primary hover:underline">Créer un compte</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <Field id="email" label="Adresse e-mail" type="email" autoComplete="email" required
          value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@organisation.org" />
        <Field id="password" label="Mot de passe" type="password" autoComplete="current-password" required
          value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        {err && <p className="text-sm text-destructive">{err}</p>}
        <button type="submit" disabled={busy}
          className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary py-2.5 font-heading font-semibold text-primary-foreground transition-all hover:brightness-105 disabled:opacity-60">
          {busy && <Loader2 className="size-4 animate-spin" />} Se connecter
        </button>
      </form>
    </AuthShell>
  );
}
