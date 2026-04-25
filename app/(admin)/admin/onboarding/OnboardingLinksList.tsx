"use client";

import { useState } from "react";
import { Link2, Clock, CheckCircle, Tag, Package, Trash2, Loader2 } from "lucide-react";
import { GlassCard } from "@/components/shared/GlassCard";
import { PLANS } from "@/constants/plans";
import type { PlanId } from "@/constants/plans";

export interface OnboardingLink {
  id: string;
  token: string;
  email: string;
  minimum_plan: PlanId | null;
  promo_code: string | null;
  custom_plan_id: string | null;
  expires_at: string;
  used: boolean;
  created_at: string;
}

interface CustomPlan {
  id: string;
  name: string;
  price_aud: number;
}

export function OnboardingLinksList({
  initialLinks,
  customPlanMap,
  appUrl,
}: {
  initialLinks: OnboardingLink[];
  customPlanMap: Record<string, CustomPlan>;
  appUrl: string;
}) {
  const [links, setLinks] = useState(initialLinks);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setDeleting(id);
    const res = await fetch(`/api/admin/onboarding/${id}`, { method: "DELETE" });
    const json = await res.json();
    setDeleting(null);
    if (json.ok) {
      setLinks((prev) => prev.filter((l) => l.id !== id));
    }
  }

  if (links.length === 0) {
    return (
      <GlassCard padding="md">
        <p className="text-sm text-[var(--text-secondary)] text-center py-4">No links generated yet.</p>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-2">
      {links.map((link) => {
        const expired = new Date(link.expires_at) < new Date();
        const statusColor = link.used
          ? "text-[var(--text-tertiary)]"
          : expired
          ? "text-[var(--status-warning)]"
          : "text-[var(--status-active)]";
        const statusLabel = link.used ? "Used" : expired ? "Expired" : "Active";

        const customPlan = link.custom_plan_id ? customPlanMap[link.custom_plan_id] : null;
        const stdPlan = link.minimum_plan
          ? Object.values(PLANS).find((p) => p.id === link.minimum_plan)
          : null;

        const isDeleting = deleting === link.id;

        return (
          <GlassCard key={link.id} padding="md">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--brand-primary-muted)] flex items-center justify-center shrink-0">
                  <Link2 size={14} className="text-[var(--brand-primary)]" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">{link.email}</p>
                  <p className="text-[11px] text-[var(--text-tertiary)] font-mono truncate">
                    {appUrl}/onboard?token={link.token.slice(0, 12)}…
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 text-xs text-[var(--text-secondary)]">
                {/* Plan badge */}
                {customPlan ? (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[11px] font-semibold text-[var(--text-primary)]">
                    <Package size={10} />
                    {customPlan.name}
                  </span>
                ) : stdPlan ? (
                  <span className="px-2 py-0.5 rounded bg-[var(--brand-primary-muted)] text-[var(--brand-primary)] text-[11px] font-semibold">
                    {stdPlan.name}+
                  </span>
                ) : null}

                {/* Promo */}
                {link.promo_code && (
                  <div className="flex items-center gap-1 text-[var(--text-secondary)]">
                    <Tag size={11} />
                    <span className="font-mono">{link.promo_code}</span>
                  </div>
                )}

                {/* Expiry */}
                <div className="flex items-center gap-1 text-[var(--text-tertiary)]">
                  <Clock size={11} />
                  {new Date(link.expires_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                </div>

                {/* Status */}
                <div className={`flex items-center gap-1 font-medium ${statusColor}`}>
                  <CheckCircle size={11} />
                  {statusLabel}
                </div>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(link.id)}
                  disabled={isDeleting}
                  title="Delete link"
                  className="flex items-center justify-center w-6 h-6 rounded-[var(--radius-sm)] text-[var(--text-tertiary)] hover:text-[var(--status-error)] hover:bg-[var(--status-error-bg)] transition-colors disabled:opacity-40"
                >
                  {isDeleting
                    ? <Loader2 size={12} className="animate-spin" />
                    : <Trash2 size={12} />}
                </button>
              </div>
            </div>
          </GlassCard>
        );
      })}
    </div>
  );
}
