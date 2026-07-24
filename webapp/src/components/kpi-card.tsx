"use client";
import { NumberTicker } from "@/components/ui/number-ticker";
import { cn } from "@/lib/utils";

export function KpiCard({
  value, label, suffix = "", prefix = "", decimals = 0, hint, className, accent,
}: {
  value: number; label: string; suffix?: string; prefix?: string; decimals?: number;
  hint?: string; className?: string; accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border/70 bg-card/80 p-5 backdrop-blur",
        "transition-colors hover:border-primary/40",
        className,
      )}
    >
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("mt-2 font-heading text-3xl font-semibold tabular tracking-tight",
        accent ? "text-primary" : "text-foreground")}>
        {prefix}
        <NumberTicker value={value} decimalPlaces={decimals} className="tabular" />
        {suffix}
      </div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
      <div className="pointer-events-none absolute -right-6 -top-6 size-16 rounded-full bg-primary/5 blur-2xl transition-all group-hover:bg-primary/10" />
    </div>
  );
}
