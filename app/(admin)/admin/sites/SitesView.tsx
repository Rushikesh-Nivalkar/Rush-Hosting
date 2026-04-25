"use client";

import { useState } from "react";
import { Globe, Send, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { GlassCard } from "@/components/shared/GlassCard";

export interface SiteRow {
  id: string;
  domain: string;
  status: string;
  hosting_username: string | null;
  hosting_password: string | null;
  plan_name: string | null;
  customer_email: string;
  created_at: string;
}

const STATUS_STYLES: Record<string, { label: string; color: string }> = {
  active:  { label: "Active",  color: "text-[var(--status-active)]" },
  pending: { label: "Pending", color: "text-[var(--status-warning)]" },
};

function SendCredentialsForm({ site }: { site: SiteRow }) {
  const [password, setPassword] = useState(site.hosting_password ?? "");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/admin/sites/${site.id}/send-credentials`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const json = await res.json();
    setLoading(false);
    if (!json.ok) {
      setError(json.error?.message ?? "Failed to send.");
    } else {
      setSent(true);
    }
  }

  if (sent) {
    return (
      <div className="flex items-center gap-2 text-xs text-[var(--status-active)]">
        <CheckCircle size={13} />
        Credentials sent to {site.customer_email}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Temp password"
          className="flex-1 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--brand-primary)] font-mono transition-colors"
        />
        <button
          onClick={handleSend}
          disabled={loading || !password.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-xs font-medium transition-colors disabled:opacity-60 shrink-0"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
          Send credentials
        </button>
      </div>
      {error && <p className="text-xs text-[var(--status-error)]">{error}</p>}
    </div>
  );
}

function SiteCard({ site }: { site: SiteRow }) {
  const statusCfg = STATUS_STYLES[site.status] ?? { label: site.status, color: "text-[var(--text-tertiary)]" };

  return (
    <GlassCard padding="md">
      <div className="space-y-3">
        {/* Header row */}
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
          {site.hosting_username && (
            <span className="font-mono">user: {site.hosting_username}</span>
          )}
          <span>
            {new Date(site.created_at).toLocaleDateString("en-AU", {
              day: "numeric", month: "short", year: "numeric",
            })}
          </span>
        </div>

        {/* Send credentials — only for sites with a DirectAdmin account */}
        {site.hosting_username ? (
          <div className="pt-1 border-t border-[var(--border-subtle)]">
            <p className="text-xs text-[var(--text-tertiary)] mb-2">Send login credentials to customer</p>
            <SendCredentialsForm site={site} />
          </div>
        ) : (
          <div className="pt-1 border-t border-[var(--border-subtle)] flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
            <AlertCircle size={12} />
            No DirectAdmin account yet — create one manually then update here.
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
