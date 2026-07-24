"use client";
import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { FormGroup, FormField } from "@/lib/api";

function OrBadge({ f }: { f: FormField }) {
  if (f.or !== undefined) {
    const agg = f.or > 1;
    return (
      <span
        title={`Odds ratio (OS1) — p = ${f.p}`}
        className="cursor-help rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular"
        style={agg
          ? { background: "color-mix(in oklab, var(--risk-tres) 14%, transparent)", color: "var(--risk-tres)" }
          : { background: "color-mix(in oklab, var(--positive) 14%, transparent)", color: "var(--positive)" }}>
        OR {f.or.toFixed(2)} {agg ? "↑" : "↓"}
      </span>
    );
  }
  if (f.or_note) return <span className="text-[10px] text-muted-foreground">{f.or_note}</span>;
  return null;
}

export function DeterminantForm({
  groups, onSubmit, submitting,
}: { groups: FormGroup[]; onSubmit: (fields: Record<string, number | string>) => void; submitting?: boolean }) {
  const init = useMemo(() => {
    const v: Record<string, number | string> = {};
    groups.forEach((g) => g.fields.forEach((f) => {
      v[f.key] = f.type === "select_cat" ? String(f.default) : Number(f.default);
    }));
    return v;
  }, [groups]);
  const [values, setValues] = useState<Record<string, number | string>>(init);
  const set = (k: string, v: number | string) => setValues((s) => ({ ...s, [k]: v }));

  const renderField = (f: FormField) => {
    const id = `f_${f.key}`;
    return (
      <div key={f.key} className="space-y-1.5">
        <Label htmlFor={id} className="flex items-center justify-between gap-2 text-[13px]">
          <span>{f.label}{f.unit ? <span className="text-muted-foreground"> ({f.unit})</span> : null}</span>
          <OrBadge f={f} />
        </Label>
        {f.type === "number" && (
          <Input id={id} type="number" min={f.min} max={f.max} step={f.step ?? 1}
            value={values[f.key] as number}
            onChange={(e) => set(f.key, e.target.value === "" ? 0 : Number(e.target.value))} />
        )}
        {f.type === "slider" && (
          <div className="flex items-center gap-3">
            <Slider id={id} min={f.min} max={f.max} step={f.step}
              value={[values[f.key] as number]} onValueChange={(v) => set(f.key, Array.isArray(v) ? v[0] : v)} className="flex-1" />
            <span className="w-8 text-right text-sm tabular text-muted-foreground">{values[f.key]}</span>
          </div>
        )}
        {f.type === "binary" && (
          <Select items={{ "0": "Non", "1": "Oui" }} value={String(values[f.key])}
            onValueChange={(v) => v != null && set(f.key, Number(v))}>
            <SelectTrigger id={id}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Non</SelectItem>
              <SelectItem value="1">Oui</SelectItem>
            </SelectContent>
          </Select>
        )}
        {(f.type === "select" || f.type === "select_cat") && (
          <Select
            items={Object.fromEntries((f.options ?? []).map((o) => [String(o[0]), o[1]]))}
            value={String(values[f.key])}
            onValueChange={(v) => { if (v != null) set(f.key, f.type === "select_cat" ? String(v) : Number(v)); }}>
            <SelectTrigger id={id}><SelectValue /></SelectTrigger>
            <SelectContent>
              {f.options?.map((o) => (
                <SelectItem key={String(o[0])} value={String(o[0])}>{o[1]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue={groups[0]?.capital}>
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-transparent p-0">
          {groups.map((g) => (
            <TabsTrigger key={g.capital} value={g.capital}
              className="rounded-full border border-border/70 px-3 py-1.5 text-xs data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              {g.capital}
            </TabsTrigger>
          ))}
        </TabsList>
        {groups.map((g) => (
          <TabsContent key={g.capital} value={g.capital} className="mt-4">
            <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">{g.fields.map(renderField)}</div>
          </TabsContent>
        ))}
      </Tabs>
      <button
        onClick={() => onSubmit(values)} disabled={submitting}
        className="w-full cursor-pointer rounded-xl bg-primary py-3 font-heading font-semibold text-primary-foreground
        shadow-sm transition-all hover:brightness-105 disabled:opacity-60"
      >
        {submitting ? "Analyse en cours…" : "Évaluer le risque du ménage"}
      </button>
    </div>
  );
}
