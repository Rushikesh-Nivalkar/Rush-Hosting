"use client";

import { useState, useEffect } from "react";
import { GlassCard } from "@/components/shared/GlassCard";
import { PlanForm } from "./PlanForm";
import { formatAUD } from "@/lib/format";
import { Package, CheckCircle, User, Zap, Loader2, RefreshCw, Copy } from "lucide-react";
import { PLANS, PLAN_ORDER } from "@/constants/plans";

// ── Types ─────────────────────────────────────────────────────────────────────

type StandardPlanStatus = {
  plan_id: string;
  name: string;
  price_aud: number;
  stripe_price_id: string | null;
  stripe_product_id: string | null;
  synced_at: string | null;
};

type CustomPlan = {
  id: string;
  name: string;
  description: string | null;
  price_aud: number;
  features: string[];
  stripe_price_id: string | null;
  stripe_product_id: string | null;
  created_for: string | null;
  created_at: string;
};

type Client = {
  id: string;
  full_name: string | null;
  email: string;
};

// ── Standard Plans section ────────────────────────────────────────────────────

function StandardPlansSection() {
  const [plans, setPlans] = useState<StandardPlanStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/sync-plans")
      .then((r) => r.json())
      .then((res) => {
        if (res.ok) setPlans(res.data);
        setLoading(false);
      });
  }, []);

  async function handleSync() {
    setSyncing(true);
    setError(null);
    const res = await fetch("/api/admin/sync-plans", { method: "POST" });
    const json = await res.json();
    setSyncing(false);
    if (json.ok) {
      // Merge synced data back into state
      setPlans((prev) =>
        prev.map((p) => {
          const synced = json.data.find((s: StandardPlanStatus) => s.plan_id === p.plan_id);
          return synced ? { ...p, ...synced } : p;
        })
      );
    } else {
      setError(json.error?.message ?? "Sync failed.");
    }
  }

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const allSynced = plans.length > 0 && plans.every((p) => p.stripe_price_id);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Standard Plans</h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Built-in plans available to all customers. Sync once to create them in Stripe.
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--bg-elevated)] border border-[var(--border-default)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-60"
        >
          {syncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          {allSynced ? "Re-sync" : "Sync to Stripe"}
        </button>
      </div>

      {error && (
        <p className="text-xs text-[var(--status-error)] px-1">{error}</p>
      )}

      {loading ? (
        <GlassCard padding="md">
          <p className="text-sm text-[var(--text-secondary)] text-center py-2">Loading…</p>
        </GlassCard>
      ) : (
        <div className="space-y-2">
          {plans.map((p) => {
            const plan = Object.values(PLANS).find((pl) => pl.id === p.plan_id)!;
            const synced = !!p.stripe_price_id;
            return (
              <GlassCard key={p.plan_id} padding="md">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--brand-primary-muted)] flex items-center justify-center shrink-0">
                      <Zap size={14} className="text-[var(--brand-primary)]" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-[var(--text-primary)]">{plan.name}</p>
                        <span className="text-sm font-medium text-[var(--brand-primary)]">
                          {formatAUD(plan.price)}/mo
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-3 mt-0.5">
                        {plan.features.map((f) => (
                          <span key={f} className="text-[11px] text-[var(--text-tertiary)]">{f}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <div className={`flex items-center gap-1 text-xs font-medium ${synced ? "text-[var(--status-active)]" : "text-[var(--status-warning)]"}`}>
                      <CheckCircle size={11} />
                      {synced ? "Synced" : "Not synced"}
                    </div>
                    {p.stripe_price_id && (
                      <button
                        onClick={() => copyToClipboard(p.stripe_price_id!, p.plan_id)}
                        className="flex items-center gap-1 text-[11px] font-mono text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                        title="Copy price ID"
                      >
                        <Copy size={10} />
                        {copiedId === p.plan_id ? "Copied!" : p.stripe_price_id.slice(0, 20) + "…"}
                      </button>
                    )}
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {allSynced && (
        <div className="p-3 rounded-[var(--radius-md)] bg-[var(--status-active-bg)] border border-[var(--status-active)]/20 text-xs text-[var(--status-active)] space-y-1">
          <p className="font-medium">All plans synced. Checkout works automatically.</p>
          <p className="text-[var(--text-secondary)]">
            Optionally copy the price IDs above into your <span className="font-mono">.env.local</span> as{" "}
            <span className="font-mono">STRIPE_PRICE_HOSTING</span>,{" "}
            <span className="font-mono">STRIPE_PRICE_BASIC</span>,{" "}
            <span className="font-mono">STRIPE_PRICE_ADVANCED</span> for faster lookups.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PlansPage() {
  const [plans, setPlans] = useState<CustomPlan[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/custom-plans").then((r) => r.json()),
      fetch("/api/admin/clients").then((r) => r.json()),
    ]).then(([plansRes, clientsRes]) => {
      if (plansRes.ok) setPlans(plansRes.data);
      if (clientsRes.ok) setClients(clientsRes.data);
      setLoading(false);
    });
  }, []);

  function handleCreated(plan: CustomPlan) {
    setPlans((prev) => [plan, ...prev]);
  }

  const clientMap = new Map(clients.map((c) => [c.id, c]));

  return (
    <div className="space-y-10 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Plans</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Manage standard and custom packages — all synced to Stripe.
        </p>
      </div>

      {/* ── Standard plans ── */}
      <StandardPlansSection />

      {/* ── Custom packages ── */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Custom Packages</h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Personalised plans for specific clients — shared via onboarding links.
            </p>
          </div>
          <PlanForm clients={clients} onCreated={handleCreated} />
        </div>

        {loading ? (
          <GlassCard padding="md">
            <p className="text-sm text-[var(--text-secondary)] text-center py-4">Loading…</p>
          </GlassCard>
        ) : plans.length === 0 ? (
          <GlassCard padding="md">
            <p className="text-sm text-[var(--text-secondary)] text-center py-4">No custom packages yet.</p>
          </GlassCard>
        ) : (
          <div className="space-y-2">
            {plans.map((plan) => {
              const client = plan.created_for ? clientMap.get(plan.created_for) : null;
              return (
                <GlassCard key={plan.id} padding="md">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--brand-primary-muted)] flex items-center justify-center shrink-0 mt-0.5">
                        <Package size={14} className="text-[var(--brand-primary)]" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-[var(--text-primary)]">{plan.name}</p>
                          <span className="text-sm font-medium text-[var(--brand-primary)]">
                            {formatAUD(plan.price_aud)}/mo
                          </span>
                        </div>
                        {plan.description && (
                          <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{plan.description}</p>
                        )}
                        {plan.features.length > 0 && (
                          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                            {plan.features.map((f) => (
                              <span key={f} className="flex items-center gap-1 text-[11px] text-[var(--text-secondary)]">
                                <CheckCircle size={10} className="text-[var(--status-active)]" />
                                {f}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0 text-xs">
                      {client && (
                        <div className="flex items-center gap-1 text-[var(--text-secondary)]">
                          <User size={11} />
                          <span>{client.full_name ?? client.email}</span>
                        </div>
                      )}
                      <div className={`flex items-center gap-1 ${plan.stripe_price_id ? "text-[var(--status-active)]" : "text-[var(--status-warning)]"}`}>
                        <Zap size={11} />
                        {plan.stripe_price_id ? "Stripe ready" : "No price ID"}
                      </div>
                      <span className="text-[11px] text-[var(--text-tertiary)]">
                        {new Date(plan.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
