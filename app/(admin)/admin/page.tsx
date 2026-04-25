import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import { GlassCard } from "@/components/shared/GlassCard";
import { Users, Globe, AlertCircle } from "lucide-react";

export default async function AdminOverviewPage() {
  const supabase = await createSupabaseServerClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = supabase as any;

  const [
    { count: totalClients },
    { count: activeSites },
  ] = await Promise.all([
    s.from("profiles").select("id", { count: "exact", head: true }).eq("role", "client"),
    s.from("sites").select("id", { count: "exact", head: true }).eq("status", "active"),
  ]);

  if (totalClients === null && activeSites === null) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-[var(--radius-lg)] bg-[var(--status-error-bg)] border border-[var(--status-error)]/20 text-[var(--status-error)]">
        <AlertCircle size={16} />
        <p className="text-sm">Could not load overview data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Overview</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">RushHosting admin dashboard.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <GlassCard padding="md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-[var(--text-secondary)] mb-1">Total clients</p>
              <p className="text-2xl font-semibold text-[var(--text-primary)]">{totalClients ?? 0}</p>
            </div>
            <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--brand-primary-muted)] flex items-center justify-center">
              <Users size={15} className="text-[var(--brand-primary)]" />
            </div>
          </div>
        </GlassCard>

        <GlassCard padding="md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-[var(--text-secondary)] mb-1">Active sites</p>
              <p className="text-2xl font-semibold text-[var(--text-primary)]">{activeSites ?? 0}</p>
            </div>
            <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--status-active-bg)] flex items-center justify-center">
              <Globe size={15} className="text-[var(--status-active)]" />
            </div>
          </div>
        </GlassCard>

        <GlassCard padding="md">
          <div>
            <p className="text-xs text-[var(--text-secondary)] mb-1">Capacity</p>
            <p className="text-2xl font-semibold text-[var(--text-primary)]">—</p>
            <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">Phase 2</p>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
