"use client";
import { useState } from "react";
import Link from "next/link";
import { LogOut, ChevronDown, FolderClock, ShieldCheck, UserCog } from "lucide-react";
import { useAuth } from "@/lib/auth";

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrateur", analyst: "Analyste", viewer: "Lecteur",
};

export function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  if (!user) return null;
  const close = () => setOpen(false);

  return (
    <div className="relative border-l border-border/60 pl-2">
      <button onClick={() => setOpen((o) => !o)} aria-label="Menu du compte"
        className="flex cursor-pointer items-center gap-1 rounded-full p-0.5 pr-1.5 transition-colors hover:bg-accent">
        <span className="grid size-7 place-items-center rounded-full bg-primary/12 text-[11px] font-semibold text-primary">
          {user.name.slice(0, 1).toUpperCase()}
        </span>
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={close} />
          <div className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border border-border/70 bg-card p-1.5 shadow-lg">
            <div className="px-3 py-2">
              <div className="truncate text-sm font-medium">{user.name}</div>
              <div className="truncate text-xs text-muted-foreground">{user.email}</div>
              <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                <ShieldCheck className="size-3" /> {ROLE_LABEL[user.role] ?? user.role}
                {user.org ? ` · ${user.org}` : ""}
              </div>
            </div>
            <div className="my-1 border-t border-border/60" />
            <Link href="/mes-analyses" onClick={close}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent">
              <FolderClock className="size-4 text-muted-foreground" /> Mes analyses
            </Link>
            <Link href="/compte" onClick={close}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent">
              <UserCog className="size-4 text-muted-foreground" /> Compte &amp; sécurité
            </Link>
            <button onClick={() => { close(); logout(); }}
              className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10">
              <LogOut className="size-4" /> Déconnexion
            </button>
          </div>
        </>
      )}
    </div>
  );
}
