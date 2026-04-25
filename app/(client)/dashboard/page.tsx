import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import { GlassCard } from "@/components/shared/GlassCard";
import { SiteStatusBadge } from "@/components/shared/Badges";
import { Globe, Calendar, CreditCard, AlertCircle } from "lucide-react";
import { formatAUD } from "@/lib/stripe/stripe-helpers";
import type { SiteStatus, SubscriptionStatus } from "@/lib/supabase/database.types";

type SiteRow = {
  id: string; domain: string; status: SiteStatus;
  plan_name: string | null; renewal_date: string | null;
};

type SubscriptionRow = {
  plan_name: string | null; status: SubscriptionStatus;
  amount_aud: number | null; current_period_end: string | null;
  cancel_at_period_end: boolean;
};

function StatCard({
  icon: Icon, label, value, sub,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string; value: string; sub?: string;
}) {
  return (
    <GlassCard padding="md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-[var(--text-secondary)] mb-1">{label}</p>
          <p className="text-xl font-semibold text-[var(--text-primary)]">{value}</p>
          {sub && <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{sub}</p>}
        </div>
        <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--brand-primary-muted)] flex items-center justify-center">
          <Icon size={15} className="text-[var(--brand-primary)]" />
        </div>
      </div>
    </GlassCard>
  );
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Query Supabase directly — no self-referential HTTP fetch needed
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [sitesRes, subRes] = await Promise.all([
    (supabase as any).from("sites")
      .select("id, domain, status, plan_name, renewal_date")
      .eq("owner_id", user.id),
    (supabase as any).from("subscriptions")
      .select("plan_name, status, amount_aud, current_period_end, cancel_at_period_end")
      .eq("owner_id", user.id)
      .single(),
  ]);

  const site: SiteRow | null = sitesRes.data?.[0] ?? null;
  const subscription: SubscriptionRow | null = subRes.data ?? null;

  const renewalDate = site?.renewal_date ?? subscription?.current_period_end ?? null;
  const renewalLabel = renewalDate
    ? new Date(renewalDate).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })
    : "—";
  const planLabel = subscription?.plan_name ?? site?.plan_name ?? "No active plan";
  const amountLabel = subscription?.amount_aud ? `${formatAUD(subscription.amount_aud)}/mo` : "—";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">My Site</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">Overview of your hosting account.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={Globe}      label="Domain"  value={site?.domain ?? "—"} />
        <StatCard icon={CreditCard} label="Plan"    value={planLabel} sub={amountLabel} />
        <StatCard icon={Calendar}   label="Renews"  value={renewalLabel} />
      </div>

      {/* Site card or empty state */}
      {site ? (
        <GlassCard padding="md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--bg-elevated)] flex items-center justify-center">
                <Globe size={15} className="text-[var(--text-tertiary)]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">{site.domain}</p>
                <p className="text-xs text-[var(--text-tertiary)]">{site.plan_name ?? "Standard Hosting"}</p>
              </div>
            </div>
            <SiteStatusBadge status={site.status} />
          </div>
        </GlassCard>
      ) : (
        <GlassCard padding="lg">
          <div className="text-center py-4">
            <Globe size={28} className="text-[var(--text-tertiary)] mx-auto mb-3" />
            <p className="text-sm font-medium text-[var(--text-primary)]">No site yet</p>
            {subscription?.status === "active" || subscription?.status === "trialing" ? (
              <>
                <p className="text-xs text-[var(--text-secondary)] mt-1 mb-4">
                  You have an active subscription — add your domain to get started.
                </p>
                <Link
                  href="/setup/domain"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-sm font-medium transition-colors"
                >
                  <Globe size={13} />
                  Set up your domain
                </Link>
              </>
            ) : (
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Your site will appear here once it&apos;s been provisioned.
              </p>
            )}
          </div>
        </GlassCard>
      )}
    </div>
  );
}
