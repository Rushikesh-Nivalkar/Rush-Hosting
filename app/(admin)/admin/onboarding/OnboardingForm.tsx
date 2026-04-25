"use client";

import { useState } from "react";
import { Loader2, Link2, Copy, CheckCircle, AlertCircle } from "lucide-react";
import { GlassCard } from "@/components/shared/GlassCard";
import { PLANS, PLAN_ORDER } from "@/constants/plans";

interface CustomPlan {
  id: string;
  name: string;
  price_aud: number;
}

interface OnboardingFormProps {
  customPlans: CustomPlan[];
}

const inputClass =
  "w-full px-3 py-2 rounded-[var(--radius-md)] bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--brand-primary)] transition-colors";
const labelClass = "block text-xs font-medium text-[var(--text-secondary)] mb-1";

type PackageType = "standard" | "custom";

export function OnboardingForm({ customPlans }: OnboardingFormProps) {
  const [email, setEmail] = useState("");
  const [packageType, setPackageType] = useState<PackageType>("standard");
  const [minimumPlan, setMinimumPlan] = useState(PLAN_ORDER[0]);
  const [customPlanId, setCustomPlanId] = useState(customPlans[0]?.id ?? "");
  const [promoCode, setPromoCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ url: string; expires_at: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    const body: Record<string, unknown> = {
      email: email.trim(),
      promo_code: promoCode.trim() || undefined,
    };

    if (packageType === "custom") {
      body.custom_plan_id = customPlanId;
    } else {
      body.minimum_plan = minimumPlan;
    }

    const res = await fetch("/api/admin/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const json = await res.json();
    setLoading(false);

    if (json.ok) {
      setResult({ url: json.data.onboarding_url, expires_at: json.data.expires_at });
      setEmail("");
      setPromoCode("");
    } else {
      setError(json.error?.message ?? "Failed to generate link.");
    }
  }

  function handleCopy() {
    if (!result) return;
    navigator.clipboard.writeText(result.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <GlassCard padding="md">
      <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Generate onboarding link</h2>

      <form onSubmit={handleGenerate} className="space-y-4">
        {/* Email */}
        <div>
          <label className={labelClass}>Customer email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="customer@example.com"
            className={inputClass}
          />
        </div>

        {/* Package type toggle */}
        <div>
          <label className={labelClass}>Package type</label>
          <div className="flex rounded-[var(--radius-md)] border border-[var(--border-default)] overflow-hidden">
            {(["standard", "custom"] as PackageType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setPackageType(type)}
                className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                  packageType === type
                    ? "bg-[var(--brand-primary)] text-white"
                    : "bg-[var(--bg-input)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {type === "standard" ? "Standard plans" : "Custom package"}
              </button>
            ))}
          </div>
        </div>

        {/* Standard: minimum plan dropdown */}
        {packageType === "standard" && (
          <div>
            <label className={labelClass}>Minimum plan visible</label>
            <select
              value={minimumPlan}
              onChange={(e) => setMinimumPlan(e.target.value as typeof minimumPlan)}
              className={inputClass}
            >
              {PLAN_ORDER.map((id) => {
                const plan = Object.values(PLANS).find((p) => p.id === id)!;
                return (
                  <option key={id} value={id}>
                    {plan.name} — A${(plan.price / 100).toFixed(0)}/mo
                  </option>
                );
              })}
            </select>
            <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">
              Customer will only see this plan and above.
            </p>
          </div>
        )}

        {/* Custom: package dropdown */}
        {packageType === "custom" && (
          <div>
            <label className={labelClass}>Custom package</label>
            {customPlans.length === 0 ? (
              <p className="text-xs text-[var(--status-warning)] py-1">
                No custom packages yet — create one under Custom Plans first.
              </p>
            ) : (
              <>
                <select
                  value={customPlanId}
                  onChange={(e) => setCustomPlanId(e.target.value)}
                  required
                  className={inputClass}
                >
                  {customPlans.map((cp) => (
                    <option key={cp.id} value={cp.id}>
                      {cp.name} — A${(cp.price_aud / 100).toFixed(0)}/mo
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">
                  Customer will only see this package — no other plans shown.
                </p>
              </>
            )}
          </div>
        )}

        {/* Promo code */}
        <div>
          <label className={labelClass}>Promo code (optional)</label>
          <input
            type="text"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
            placeholder="e.g. FRIENDS50"
            className={inputClass}
          />
          <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">
            Auto-applied at checkout — customer won&apos;t need to type it.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-[var(--radius-md)] bg-[var(--status-error-bg)] border border-[var(--status-error)]/20 text-[var(--status-error)] text-xs">
            <AlertCircle size={13} /> {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || (packageType === "custom" && customPlans.length === 0)}
          className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-sm font-medium transition-colors disabled:opacity-60"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
          {loading ? "Generating…" : "Generate link"}
        </button>
      </form>

      {result && (
        <div className="mt-5 pt-4 border-t border-[var(--border-subtle)] space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-[var(--status-active)] flex items-center gap-1.5">
              <CheckCircle size={13} /> Link created
            </p>
            <p className="text-[11px] text-[var(--text-tertiary)]">
              Expires {new Date(result.expires_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-[var(--radius-md)] bg-[var(--bg-base)] border border-[var(--border-default)]">
            <p className="flex-1 text-xs font-mono text-[var(--text-secondary)] truncate">{result.url}</p>
            <button
              onClick={handleCopy}
              className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-sm)] bg-[var(--bg-elevated)] border border-[var(--border-default)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              {copied ? <CheckCircle size={12} className="text-[var(--status-active)]" /> : <Copy size={12} />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      )}
    </GlassCard>
  );
}
