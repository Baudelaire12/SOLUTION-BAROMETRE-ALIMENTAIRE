"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { changePassword } from "@/lib/authed";
import { PageHeader } from "@/components/page-header";
import { Reveal } from "@/components/reveal";

const ROLE_LABEL: Record<string, string> = { admin: "Administrateur", analyst: "Analyste", viewer: "Lecteur" };

export default function ComptePage() {
  const { user } = useAuth();
  const [cur, setCur] = useState("");
  const [nw, setNw] = useState("");
  const [conf, setConf] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nw !== conf) { toast.error("La confirmation ne correspond pas."); return; }
    setBusy(true);
    try { await changePassword(cur, nw); toast.success("Mot de passe mis à jour."); setCur(""); setNw(""); setConf(""); }
    catch (x) { toast.error(x instanceof Error ? x.message : "Échec."); }
    finally { setBusy(false); }
  };

  if (!user) return null;
  return (
    <div>
      <PageHeader eyebrow="Compte" title="Compte & sécurité">
        Gérez votre profil et la sécurité de votre accès.
      </PageHeader>
      <div className="grid gap-6 md:grid-cols-2">
        <Reveal>
          <div className="rounded-2xl border border-border/70 bg-card/70 p-6">
            <h3 className="font-heading text-lg font-semibold">Profil</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <Row k="Nom" v={user.name} />
              <Row k="E-mail" v={user.email} />
              <Row k="Organisation" v={user.org || "—"} />
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Rôle</dt>
                <dd className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  <ShieldCheck className="size-3" /> {ROLE_LABEL[user.role] ?? user.role}
                </dd>
              </div>
            </dl>
          </div>
        </Reveal>
        <Reveal delay={0.05}>
          <form onSubmit={submit} className="space-y-4 rounded-2xl border border-border/70 bg-card/70 p-6">
            <h3 className="font-heading text-lg font-semibold">Changer le mot de passe</h3>
            <Input label="Mot de passe actuel" type="password" value={cur} onChange={setCur} autoComplete="current-password" />
            <Input label="Nouveau mot de passe" type="password" value={nw} onChange={setNw} autoComplete="new-password" />
            <Input label="Confirmer le nouveau mot de passe" type="password" value={conf} onChange={setConf} autoComplete="new-password" />
            <button type="submit" disabled={busy}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-5 py-2.5 font-heading font-semibold text-primary-foreground transition-all hover:brightness-105 disabled:opacity-60">
              {busy && <Loader2 className="size-4 animate-spin" />} Mettre à jour
            </button>
          </form>
        </Reveal>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex items-center justify-between"><dt className="text-muted-foreground">{k}</dt><dd className="font-medium">{v}</dd></div>;
}
function Input({ label, value, onChange, ...p }: { label: string; value: string; onChange: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange">) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      <input {...p} value={value} onChange={(e) => onChange(e.target.value)} required
        className="w-full rounded-lg border border-border/70 bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30" />
    </label>
  );
}
