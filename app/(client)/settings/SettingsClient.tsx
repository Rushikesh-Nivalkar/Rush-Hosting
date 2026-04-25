"use client";

import { useState, useMemo } from "react";
import { Loader2, Save, CheckCircle, AlertCircle, CreditCard } from "lucide-react";
import { GlassCard } from "@/components/shared/GlassCard";
import { PLANS, type PlanId } from "@/constants/plans";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ProfileData {
  full_name: string | null;
  company_name: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  role: string;
}

export interface SubscriptionData {
  stripe_subscription_id: string | null;
  plan_name: string | null;
  status: string;
  amount_aud: number | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

interface Props {
  userId: string;
  email: string;
  profile: ProfileData | null;
  subscription: SubscriptionData | null;
  role: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const AU_STATES = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"];

const inputClass =
  "w-full px-3 py-2 rounded-[var(--radius-md)] bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--brand-primary)] transition-colors";
const labelClass = "block text-xs font-medium text-[var(--text-secondary)] mb-1";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-tertiary)] mb-3">
      {children}
    </p>
  );
}

// ── Pro-rata confirm modal ─────────────────────────────────────────────────────

function PlanChangeModal({
  currentPlan,
  newPlan,
  onConfirm,
  onCancel,
  loading,
}: {
  currentPlan: { name: string; price: number };
  newPlan: { name: string; price: number };
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const fmt = (cents: number) =>
    new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: 0 }).format(
      cents / 100
    );
  const direction = newPlan.price > currentPlan.price ? "upgrade" : "downgrade";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-[var(--radius-xl)] border border-[var(--border-default)] bg-[var(--bg-elevated)] p-6 shadow-2xl">
        <h2 className="text-base font-semibold text-[var(--text-primary)] mb-1">Confirm plan change</h2>
        <p className="text-sm text-[var(--text-secondary)] mb-5">
          You are {direction === "upgrade" ? "upgrading" : "downgrading"} your plan.
        </p>

        <div className="rounded-[var(--radius-lg)] border border-[var(--border-default)] overflow-hidden mb-5">
          <div className="flex items-center justify-between px-4 py-3 bg-[var(--bg-base)] border-b border-[var(--border-subtle)]">
            <span className="text-xs text-[var(--text-tertiary)]">Current plan</span>
            <span className="text-sm font-medium text-[var(--text-primary)]">
              {currentPlan.name} &mdash; {fmt(currentPlan.price)}/mo
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-3 bg-[var(--brand-primary-muted)]">
            <span className="text-xs text-[var(--text-tertiary)]">New plan</span>
            <span className="text-sm font-semibold text-[var(--brand-primary)]">
              {newPlan.name} &mdash; {fmt(newPlan.price)}/mo
            </span>
          </div>
        </div>

        <div className="rounded-[var(--radius-md)] bg-[var(--status-warning-bg)] border border-[var(--status-warning)]/20 p-3 mb-5">
          <p className="text-xs text-[var(--status-warning)] leading-relaxed">
            <strong>Pro-rata adjustment:</strong> A credit or charge for the remainder of your current billing
            period will be automatically calculated and deducted from your next invoice. No extra payment is
            required now.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-elevated)] text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-[var(--radius-md)] bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : null}
            {loading ? "Switching…" : "Confirm switch"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Subscription section ───────────────────────────────────────────────────────

function SubscriptionSection({ subscription }: { subscription: SubscriptionData | null }) {
  const [pendingPlan, setPendingPlan] = useState<(typeof PLANS)[keyof typeof PLANS] | null>(null);
  const [switching, setSwitching] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [switchSuccess, setSwitchSuccess] = useState<string | null>(null);
  const [currentSub, setCurrentSub] = useState(subscription);

  const isActive = currentSub?.status === "active" || currentSub?.status === "trialing";
  const currentPlan = Object.values(PLANS).find((p) => p.name === currentSub?.plan_name) ?? null;

  async function handleConfirmSwitch() {
    if (!pendingPlan) return;
    setSwitching(true);
    setSwitchError(null);

    const res = await fetch("/api/stripe/subscription/change", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan_id: pendingPlan.id }),
    });
    const json = await res.json();
    setSwitching(false);
    setPendingPlan(null);

    if (json.ok) {
      setCurrentSub((prev) =>
        prev ? { ...prev, plan_name: json.data.plan_name, amount_aud: json.data.amount_aud, status: json.data.status } : prev
      );
      setSwitchSuccess(`Plan switched to ${pendingPlan.name}. A confirmation email has been sent.`);
    } else {
      setSwitchError(json.error?.message ?? "Failed to switch plan.");
    }
  }

  const fmt = (cents: number) =>
    new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: 0 }).format(
      cents / 100
    );

  return (
    <>
      <GlassCard padding="md">
        <SectionLabel>Subscription</SectionLabel>

        {switchError && (
          <div className="flex items-center gap-2 mb-4 p-3 rounded-[var(--radius-md)] bg-[var(--status-error-bg)] border border-[var(--status-error)]/20 text-[var(--status-error)] text-xs">
            <AlertCircle size={13} />
            {switchError}
          </div>
        )}
        {switchSuccess && (
          <div className="flex items-center gap-2 mb-4 p-3 rounded-[var(--radius-md)] bg-[var(--status-active-bg)] border border-[var(--status-active)]/20 text-[var(--status-active)] text-xs">
            <CheckCircle size={13} />
            {switchSuccess}
          </div>
        )}

        {currentSub && isActive ? (
          <>
            {/* Current plan summary */}
            <div className="flex items-center justify-between mb-5 p-3 rounded-[var(--radius-md)] bg-[var(--brand-primary-muted)] border border-[var(--brand-primary)]/20">
              <div>
                <p className="text-xs text-[var(--text-secondary)]">Current plan</p>
                <p className="text-sm font-semibold text-[var(--brand-primary)]">
                  {currentSub.plan_name ?? "—"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {currentSub.amount_aud ? fmt(currentSub.amount_aud) : "—"}/mo
                </p>
                {currentSub.current_period_end && (
                  <p className="text-[10px] text-[var(--text-tertiary)]">
                    Renews{" "}
                    {new Date(currentSub.current_period_end).toLocaleDateString("en-AU", {
                      day: "numeric", month: "short",
                    })}
                  </p>
                )}
              </div>
            </div>

            {/* Available plans to switch to */}
            <p className="text-xs text-[var(--text-secondary)] mb-3">Switch to a different plan:</p>
            <div className="space-y-2">
              {Object.values(PLANS).map((plan) => {
                const isCurrent = plan.name === currentSub.plan_name;
                return (
                  <div
                    key={plan.id}
                    className={cn(
                      "flex items-center justify-between px-3 py-2.5 rounded-[var(--radius-md)] border transition-colors",
                      isCurrent
                        ? "border-[var(--brand-primary)]/30 bg-[var(--brand-primary-muted)] opacity-60"
                        : "border-[var(--border-default)] bg-[var(--bg-base)] hover:bg-[var(--bg-card-hover)]"
                    )}
                  >
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{plan.name}</p>
                      <p className="text-xs text-[var(--text-tertiary)]">{fmt(plan.price)}/month</p>
                    </div>
                    {isCurrent ? (
                      <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded bg-[var(--brand-primary)] text-white">
                        Current
                      </span>
                    ) : (
                      <button
                        onClick={() => { setSwitchError(null); setSwitchSuccess(null); setPendingPlan(plan); }}
                        className="text-xs font-medium px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--bg-elevated)] border border-[var(--border-default)] hover:bg-[var(--brand-primary)] hover:text-white hover:border-[var(--brand-primary)] transition-colors"
                      >
                        Switch
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <CreditCard size={24} className="text-[var(--text-tertiary)] mx-auto mb-2" />
            <p className="text-sm text-[var(--text-secondary)] mb-3">
              {currentSub ? `Subscription status: ${currentSub.status}` : "No active subscription"}
            </p>
            <a
              href="/billing"
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-hover)] transition-colors"
            >
              Go to Billing
            </a>
          </div>
        )}
      </GlassCard>

      {pendingPlan && currentPlan && (
        <PlanChangeModal
          currentPlan={{ name: currentPlan.name, price: currentPlan.price }}
          newPlan={{ name: pendingPlan.name, price: pendingPlan.price }}
          onConfirm={handleConfirmSwitch}
          onCancel={() => setPendingPlan(null)}
          loading={switching}
        />
      )}

      {/* Fallback if currentPlan not in PLANS (custom plan set by admin) */}
      {pendingPlan && !currentPlan && (
        <PlanChangeModal
          currentPlan={{ name: currentSub?.plan_name ?? "Current Plan", price: currentSub?.amount_aud ?? 0 }}
          newPlan={{ name: pendingPlan.name, price: pendingPlan.price }}
          onConfirm={handleConfirmSwitch}
          onCancel={() => setPendingPlan(null)}
          loading={switching}
        />
      )}
    </>
  );
}

// ── Main SettingsClient ────────────────────────────────────────────────────────

export function SettingsClient({ userId, email, profile, subscription, role }: Props) {
  const [form, setForm] = useState({
    full_name:    profile?.full_name    ?? "",
    company_name: profile?.company_name ?? "",
    phone:        profile?.phone        ?? "",
    address_line1: profile?.address_line1 ?? "",
    address_line2: profile?.address_line2 ?? "",
    suburb:       profile?.suburb       ?? "",
    state:        profile?.state        ?? "",
    postcode:     profile?.postcode     ?? "",
  });

  const initial = useMemo(() => ({ ...form }), []); // eslint-disable-line react-hooks/exhaustive-deps
  const isDirty = useMemo(() =>
    Object.entries(form).some(([k, v]) => v !== (initial as Record<string, string>)[k]),
    [form, initial]
  );

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setSaveSuccess(false);
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name:    form.full_name    || null,
        company_name: form.company_name || null,
        phone:        form.phone        || null,
        address_line1: form.address_line1 || null,
        address_line2: form.address_line2 || null,
        suburb:       form.suburb       || null,
        state:        form.state        || null,
        postcode:     form.postcode     || null,
      }),
    });

    const json = await res.json();
    setSaving(false);

    if (json.ok) {
      setSaveSuccess(true);
      // Update initial so isDirty resets
      Object.assign(initial, form);
    } else {
      setSaveError(json.error?.message ?? "Failed to save changes.");
    }
  }

  return (
    <div className="space-y-6 max-w-xl">
      {/* ── Profile form ── */}
      <GlassCard padding="md">
        <div className="flex items-center justify-between mb-5">
          <SectionLabel>Profile</SectionLabel>
          {isDirty && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-xs font-medium transition-colors disabled:opacity-60"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              {saving ? "Saving…" : "Save changes"}
            </button>
          )}
        </div>

        {saveError && (
          <div className="flex items-center gap-2 mb-4 p-3 rounded-[var(--radius-md)] bg-[var(--status-error-bg)] border border-[var(--status-error)]/20 text-[var(--status-error)] text-xs">
            <AlertCircle size={13} /> {saveError}
          </div>
        )}
        {saveSuccess && (
          <div className="flex items-center gap-2 mb-4 p-3 rounded-[var(--radius-md)] bg-[var(--status-active-bg)] border border-[var(--status-active)]/20 text-[var(--status-active)] text-xs">
            <CheckCircle size={13} /> Changes saved.
          </div>
        )}

        <div className="space-y-4">
          {/* Account (read-only) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Email</label>
              <input disabled value={email} className={cn(inputClass, "opacity-50 cursor-not-allowed")} />
            </div>
            <div>
              <label className={labelClass}>Role</label>
              <input disabled value={role} className={cn(inputClass, "opacity-50 cursor-not-allowed capitalize")} />
            </div>
          </div>

          {/* Editable fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Full name</label>
              <input type="text" value={form.full_name} onChange={set("full_name")} placeholder="Jane Smith" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Company (optional)</label>
              <input type="text" value={form.company_name} onChange={set("company_name")} placeholder="Acme Pty Ltd" className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Best contact number</label>
            <input type="tel" value={form.phone} onChange={set("phone")} placeholder="04XX XXX XXX" className={inputClass} />
          </div>

          <div className="border-t border-[var(--border-subtle)] pt-4">
            <p className={cn(labelClass, "mb-3")}>Billing address</p>
            <div className="space-y-3">
              <div>
                <label className={labelClass}>Street address</label>
                <input type="text" value={form.address_line1} onChange={set("address_line1")} placeholder="123 Main Street" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Apartment / suite (optional)</label>
                <input type="text" value={form.address_line2} onChange={set("address_line2")} placeholder="Unit 2" className={inputClass} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className={labelClass}>Suburb</label>
                  <input type="text" value={form.suburb} onChange={set("suburb")} placeholder="Sydney" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>State</label>
                  <select value={form.state} onChange={set("state")} className={inputClass}>
                    <option value="">—</option>
                    {AU_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Postcode</label>
                  <input type="text" value={form.postcode} onChange={set("postcode")} placeholder="2000" maxLength={4} className={inputClass} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {isDirty && (
          <div className="mt-5 pt-4 border-t border-[var(--border-subtle)] flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-sm font-medium transition-colors disabled:opacity-60"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        )}
      </GlassCard>

      {/* ── Account meta ── */}
      <GlassCard padding="md">
        <SectionLabel>Account</SectionLabel>
        <div className="flex items-center justify-between py-2">
          <p className="text-sm text-[var(--text-secondary)]">User ID</p>
          <p className="text-xs text-[var(--text-tertiary)] font-mono">{userId.slice(0, 8)}…</p>
        </div>
      </GlassCard>

      {/* ── Subscription (clients only) ── */}
      {role !== "admin" && <SubscriptionSection subscription={subscription} />}
    </div>
  );
}
