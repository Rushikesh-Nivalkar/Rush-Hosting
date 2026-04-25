import { createSupabaseAdminClient } from "@/lib/supabase/supabase-server";
import { stripe } from "@/lib/stripe/stripe-helpers";
import { formatAUD } from "@/lib/format";
import { GlassCard } from "@/components/shared/GlassCard";
import { TrendingUp, Users, DollarSign, Receipt } from "lucide-react";
import { RevenueChart, type MonthlyPoint } from "./RevenueChart";
import type Stripe from "stripe";

// ── Financial year helpers ────────────────────────────────────────────────────

function currentFY(): { start: Date; end: Date; label: string } {
  const now = new Date();
  // AU financial year starts July 1
  const fyYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return {
    start: new Date(fyYear, 6, 1),
    end:   new Date(fyYear + 1, 5, 30, 23, 59, 59),
    label: `FY${String(fyYear).slice(-2)}/${String(fyYear + 1).slice(-2)}`,
  };
}

function fyMonthSlots(start: Date): string[] {
  const slots: string[] = [];
  const cur = new Date(start.getFullYear(), start.getMonth(), 1);
  const today = new Date();
  const endMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  while (cur <= endMonth) {
    slots.push(cur.toLocaleDateString("en-AU", { month: "short", year: "numeric" }));
    cur.setMonth(cur.getMonth() + 1);
  }
  return slots;
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon, label, value, sub, highlight,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string; value: string; sub?: string; highlight?: boolean;
}) {
  return (
    <GlassCard padding="md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-[var(--text-secondary)] mb-1">{label}</p>
          <p className={`text-xl font-semibold ${highlight ? "text-[var(--status-active)]" : "text-[var(--text-primary)]"}`}>
            {value}
          </p>
          {sub && <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{sub}</p>}
        </div>
        <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--brand-primary-muted)] flex items-center justify-center shrink-0">
          <Icon size={15} className="text-[var(--brand-primary)]" />
        </div>
      </div>
    </GlassCard>
  );
}

// ── Status badge colour ───────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  active:     "text-[var(--status-active)]",
  trialing:   "text-[var(--brand-primary)]",
  past_due:   "text-[var(--status-warning)]",
  cancelled:  "text-[var(--text-tertiary)]",
  incomplete: "text-[var(--text-tertiary)]",
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function RevenuePage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createSupabaseAdminClient() as any;
  const fy = currentFY();
  const fyStartUnix = Math.floor(fy.start.getTime() / 1000);

  // Fetch all paid Stripe invoices for the current financial year (paginated)
  const allInvoices: Stripe.Invoice[] = [];
  let hasMore = true;
  let startingAfter: string | undefined;

  while (hasMore) {
    const batch = await stripe.invoices.list({
      status: "paid",
      created: { gte: fyStartUnix },
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });
    allInvoices.push(...batch.data);
    hasMore = batch.has_more;
    if (batch.data.length > 0) startingAfter = batch.data[batch.data.length - 1].id;
  }

  // YTD totals
  const ytdCents  = allInvoices.reduce((sum, inv) => sum + (inv.amount_paid ?? 0), 0);
  const gstCents  = Math.round(ytdCents / 11); // GST = 1/11 of GST-inclusive total
  const exGstCents = ytdCents - gstCents;

  // Monthly chart data
  const slots = fyMonthSlots(fy.start);
  const monthlyMap: Record<string, number> = Object.fromEntries(slots.map((m) => [m, 0]));
  for (const inv of allInvoices) {
    if (!inv.amount_paid) continue;
    const key = new Date(inv.created * 1000).toLocaleDateString("en-AU", {
      month: "short", year: "numeric",
    });
    if (key in monthlyMap) monthlyMap[key] += inv.amount_paid;
  }
  const chartData: MonthlyPoint[] = slots.map((m) => ({ month: m, amount: monthlyMap[m] }));

  // Active subscriptions from Supabase
  const { data: activeSubs } = await db
    .from("subscriptions")
    .select("amount_aud, plan_name, owner_id, status")
    .neq("status", "cancelled");

  const mrr = (activeSubs ?? [])
    .filter((s: { status: string }) => s.status === "active" || s.status === "trialing")
    .reduce((sum: number, s: { amount_aud: number | null }) => sum + (s.amount_aud ?? 0), 0);

  // Customer email map
  let emailMap = new Map<string, string>();
  try {
    const { data: { users } } = await db.auth.admin.listUsers({ perPage: 1000 });
    emailMap = new Map(
      (users as { id: string; email?: string }[]).map((u) => [u.id, u.email ?? "—"])
    );
  } catch { /* skip */ }

  type SubRow = { amount_aud: number | null; plan_name: string | null; owner_id: string; status: string };
  const customers = ((activeSubs ?? []) as SubRow[])
    .map((s) => ({
      email:   emailMap.get(s.owner_id) ?? "—",
      plan:    s.plan_name ?? "—",
      monthly: s.amount_aud ?? 0,
      status:  s.status,
    }))
    .sort((a, b) => b.monthly - a.monthly);

  const activeCount = customers.filter(
    (c) => c.status === "active" || c.status === "trialing"
  ).length;

  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Revenue</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          {fy.label} · Paid invoices pulled live from Stripe.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={TrendingUp} label="MRR"                  value={formatAUD(mrr)}        sub="active subscriptions" />
        <StatCard icon={DollarSign} label={`YTD (${fy.label})`}  value={formatAUD(ytdCents)}   sub="total paid invoices" highlight />
        <StatCard icon={Receipt}    label="GST Collected"         value={formatAUD(gstCents)}   sub="est. 1/11 of total" />
        <StatCard icon={Users}      label="Paying Customers"      value={String(activeCount)}   sub="active or trialing" />
      </div>

      {/* Monthly bar chart */}
      <RevenueChart data={chartData} fyLabel={fy.label} />

      {/* Tax summary */}
      <GlassCard padding="md">
        <p className="text-sm font-medium text-[var(--text-primary)] mb-4">
          Tax Summary — {fy.label}
        </p>
        <div className="divide-y divide-[var(--border-subtle)]">
          {[
            { label: "Total Revenue (GST-inclusive)", value: formatAUD(ytdCents),  bold: false },
            { label: "GST Collected (1/11 of total)", value: formatAUD(gstCents),  bold: false },
            { label: "Revenue ex. GST",               value: formatAUD(exGstCents), bold: true  },
          ].map(({ label, value, bold }) => (
            <div key={label} className="flex items-center justify-between py-2.5">
              <span className={`text-sm ${bold ? "font-semibold text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}>
                {label}
              </span>
              <span className={`text-sm tabular-nums ${bold ? "font-semibold text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}>
                {value}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[10px] text-[var(--text-tertiary)]">
          GST figures assume all prices are GST-inclusive. Verify with your accountant before lodging.
        </p>
      </GlassCard>

      {/* Per-customer breakdown */}
      <GlassCard padding="md">
        <p className="text-sm font-medium text-[var(--text-primary)] mb-4">
          Monthly Breakdown by Customer
        </p>

        {customers.length === 0 ? (
          <p className="text-sm text-[var(--text-tertiary)]">No subscribers yet.</p>
        ) : (
          <div>
            {/* Column headers */}
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-6 px-2 pb-2 border-b border-[var(--border-subtle)]">
              {["Customer", "Plan", "Monthly", "Status"].map((h) => (
                <span key={h} className="text-[10px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide last:text-right">
                  {h}
                </span>
              ))}
            </div>

            {/* Customer rows */}
            {customers.map((c, i) => (
              <div
                key={i}
                className="grid grid-cols-[1fr_auto_auto_auto] gap-x-6 px-2 py-2.5 border-b border-[var(--border-subtle)] last:border-0 items-center"
              >
                <span className="text-sm text-[var(--text-primary)] truncate">{c.email}</span>
                <span className="text-xs text-[var(--text-secondary)] whitespace-nowrap">{c.plan}</span>
                <span className="text-sm font-medium text-[var(--text-primary)] tabular-nums text-right whitespace-nowrap">
                  {formatAUD(c.monthly)}
                </span>
                <span className={`text-xs font-medium text-right ${STATUS_COLOR[c.status] ?? "text-[var(--text-tertiary)]"}`}>
                  {c.status}
                </span>
              </div>
            ))}

            {/* Total row */}
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-6 px-2 pt-2.5 mt-1 border-t-2 border-[var(--border-subtle)] items-center">
              <span className="text-xs font-semibold text-[var(--text-primary)]">Total MRR</span>
              <span />
              <span className="text-sm font-semibold text-[var(--text-primary)] tabular-nums text-right whitespace-nowrap">
                {formatAUD(mrr)}
              </span>
              <span />
            </div>
          </div>
        )}
      </GlassCard>

    </div>
  );
}
