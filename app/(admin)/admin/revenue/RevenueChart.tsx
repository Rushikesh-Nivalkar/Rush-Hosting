"use client";

import { useState } from "react";
import { GlassCard } from "@/components/shared/GlassCard";
import { formatAUDCompact, formatAUD } from "@/lib/format";

export interface MonthlyPoint {
  month: string;   // e.g. "Jul 2025"
  amount: number;  // cents
}

export function RevenueChart({ data, fyLabel }: { data: MonthlyPoint[]; fyLabel: string }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.amount), 1);
  const total = data.reduce((s, d) => s + d.amount, 0);

  return (
    <GlassCard padding="md">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-[var(--text-primary)]">Monthly Revenue — {fyLabel}</p>
        <p className="text-xs text-[var(--text-tertiary)]">Total: {formatAUD(total)}</p>
      </div>

      <div className="flex items-end gap-[3px] h-36">
        {data.map(({ month, amount }, i) => {
          const pct = max > 0 ? (amount / max) * 100 : 0;
          const isHovered = hovered === i;
          const shortMonth = month.split(" ")[0];

          return (
            <div
              key={month}
              className="flex-1 flex flex-col items-center justify-end gap-1 group cursor-default"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              {/* Tooltip above bar */}
              <span
                className="text-[10px] font-medium text-[var(--text-primary)] whitespace-nowrap transition-opacity"
                style={{ opacity: isHovered && amount > 0 ? 1 : 0 }}
              >
                {formatAUDCompact(amount)}
              </span>

              {/* Bar */}
              <div
                className="w-full rounded-t-[3px] transition-all duration-150"
                style={{
                  height: `${Math.max(pct, amount > 0 ? 3 : 0)}%`,
                  backgroundColor: isHovered
                    ? "var(--brand-primary)"
                    : amount > 0
                    ? "var(--brand-primary-muted)"
                    : "var(--border-subtle)",
                }}
              />

              {/* Month label */}
              <span className="text-[9px] text-[var(--text-tertiary)] leading-none">{shortMonth}</span>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}
