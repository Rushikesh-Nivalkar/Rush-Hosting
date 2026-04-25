"use client";

import { useState } from "react";
import { Globe, CheckCircle, Loader2 } from "lucide-react";
import { GlassCard } from "@/components/shared/GlassCard";

export interface SiteRow {
  id: string;
  domain: string;
  status: string;
  plan_name: string | null;
  customer_email: string;
  created_at: string;
}

const STATUS_STYLES: Record<string, { label: string; color: string }> = {
  active:    { label: "Active",    color: "text-[var(--status-active)]" },
  pending:   { label: "Pending",   color: "text-[var(--status-warning)]" },
  suspended: { label: "Suspended", color: "text-[var(--status-error)]" },
  cancelled: { label: "Cancelled", color: "text-[var(--text-tertiary)]" },
};

function SiteCard({ site }: { site: SiteRow }) {
  const [status, setStatus] = useState(site.status);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const statusCfg = STATUS_STYLES[status] ?? { label: status, color: "text-[var(--text-tertiary)]" };

  async function markActive() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/admin/sites/${site.id}`, { method: "PATCH" });
    const json = await res.json();
    setLoading(false);
    if (!json.ok) {
      setError(json.error?.message ?? "Failed to update.");
    } else {
      setStatus("active");
    }
  }

  return (
    <GlassCard padding="md">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <Globe size={14} className="text-[var(--brand-primary)] shrink-0" />
            <span className="text-sm font-semibold text-[var(--text-primary)] truncate font-mono">
              {site.domain}
            </span>
          </div>
          <span className={`text-xs font-medium shrink-0 ${statusCfg.color}`}>
            {statusCfg.label}
          </span>
        </div>

        {/* Meta */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-tertiary)]">
          <span>{site.customer_email}</span>
          {site.plan_name && <span>{site.plan_name}</span>}
          <span>
            {new Date(site.created_at).toLocaleDateString("en-AU", {
              day: "numeric", month: "short", year: "numeric",
            })}
          </span>
        </div>

        {/* Actions */}
        {status === "pending" && (
          <div className="pt-2 border-t border-[var(--border-subtle)]">
            <p className="text-xs text-[var(--text-tertiary)] mb-2">
              Add <span className="font-mono">{site.domain}</span> to Vercel, then mark as active to notify the customer.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={markActive}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--status-active-bg)] hover:bg-[var(--status-active)]/20 text-[var(--status-active)] text-xs font-medium border border-[var(--status-active)]/30 transition-colors disabled:opacity-60"
              >
                {loading
                  ? <Loader2 size={12} className="animate-spin" />
                  : <CheckCircle size={12} />}
                Mark as active
              </button>
              {error && <p className="text-xs text-[var(--status-error)]">{error}</p>}
            </div>
          </div>
        )}

        {status === "active" && (
          <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center gap-2 text-xs text-[var(--status-active)]">
            <CheckCircle size={12} />
            Live — customer has been notified.
          </div>
        )}
      </div>
    </GlassCard>
  );
}

export function SitesView({ sites }: { sites: SiteRow[] }) {
  if (sites.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-[var(--text-tertiary)]">
        No sites yet. Customers will appear here after completing domain setup.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sites.map((site) => (
        <SiteCard key={site.id} site={site} />
      ))}
    </div>
  );
}
