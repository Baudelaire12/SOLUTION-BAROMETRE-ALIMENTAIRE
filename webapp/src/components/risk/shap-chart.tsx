"use client";
import { Bar, BarChart, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, ReferenceLine } from "recharts";
import type { Contribution } from "@/lib/api";

/** Contributions SHAP : barres horizontales rouge (↑ risque) / bleu (↓ risque). */
export function ShapChart({ contributions }: { contributions: Contribution[] }) {
  const data = [...contributions].reverse().map((c) => ({
    name: c.label, value: c.value,
  }));
  const RED = "#c0442c", BLUE = "#2471a3";
  return (
    <ResponsiveContainer width="100%" height={Math.max(240, data.length * 30)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
        <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11, fill: "var(--foreground)" }}
          axisLine={false} tickLine={false} />
        <ReferenceLine x={0} stroke="var(--border)" />
        <Tooltip
          cursor={{ fill: "var(--muted)", opacity: 0.4 }}
          contentStyle={{
            background: "var(--popover)", border: "1px solid var(--border)",
            borderRadius: 8, fontSize: 12, color: "var(--popover-foreground)",
          }}
          formatter={(value) => {
            const n = Number(value);
            return [`${n > 0 ? "+" : ""}${n.toFixed(3)}`, "Contribution"] as [string, string];
          }}
        />
        <Bar dataKey="value" radius={4} isAnimationActive>
          {data.map((d, i) => <Cell key={i} fill={d.value > 0 ? RED : BLUE} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
