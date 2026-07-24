"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { AuthShell, Field } from "@/components/auth/auth-shell";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [org, setOrg] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(""); setBusy(true);
    try { await register(name, email, org, password); router.replace("/"); }
    catch (x) { setErr(x instanceof Error ? x.message : "Inscription impossible."); setBusy(false); }
  };

  return (
    <AuthShell title="Créer un compte" subtitle="Rejoignez la plateforme et lancez vos premières analyses."
      footer={<>Déjà inscrit ? <Link href="/login" className="font-medium text-primary hover:underline">Se connecter</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <Field id="name" label="Nom complet" required autoComplete="name"
          value={name} onChange={(e) => setName(e.target.value)} placeholder="Prénom Nom" />
        <Field id="org" label="Organisation" autoComplete="organization"
          value={org} onChange={(e) => setOrg(e.target.value)} placeholder="PAM, FAO, ONG, ministère…" />
        <Field id="email" label="Adresse e-mail" type="email" required autoComplete="email"
          value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@organisation.org" />
        <Field id="password" label="Mot de passe" type="password" required autoComplete="new-password"
          value={password} onChange={(e) => setPassword(e.target.value)} placeholder="6 caractères minimum" />
        {err && <p className="text-sm text-destructive">{err}</p>}
        <button type="submit" disabled={busy}
          className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary py-2.5 font-heading font-semibold text-primary-foreground transition-all hover:brightness-105 disabled:opacity-60">
          {busy && <Loader2 className="size-4 animate-spin" />} Créer mon compte
        </button>
        <p className="text-center text-xs text-muted-foreground">
          En créant un compte, vous accédez à la démonstration de la solution.
        </p>
      </form>
    </AuthShell>
  );
}
