"use client";
import { motion } from "motion/react";
import { riskColorVar } from "@/lib/api";

/** Jauge semi-circulaire animée de la probabilité de risque. */
export function RiskGauge({ proba, classe }: { proba: number; classe: string }) {
  const pct = Math.max(0, Math.min(1, proba));
  const R = 80, C = Math.PI * R; // demi-cercle
  const color = riskColorVar(classe);
  return (
    <div className="relative mx-auto w-[220px]">
      <svg viewBox="0 0 200 118" className="w-full">
        <path d="M20 108 A80 80 0 0 1 180 108" fill="none"
          stroke="var(--muted)" strokeWidth="16" strokeLinecap="round" />
        <motion.path
          d="M20 108 A80 80 0 0 1 180 108" fill="none" stroke={color} strokeWidth="16"
          strokeLinecap="round" strokeDasharray={C}
          initial={{ strokeDashoffset: C }}
          animate={{ strokeDashoffset: C * (1 - pct) }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-x-0 bottom-1 text-center">
        <motion.div
          className="font-heading text-4xl font-semibold tabular"
          style={{ color }}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        >
          {(pct * 100).toFixed(1)}%
        </motion.div>
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Risque {classe}
        </div>
      </div>
    </div>
  );
}
