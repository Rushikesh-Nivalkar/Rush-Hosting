"use client";

import { useState } from "react";
import { Loader2, ExternalLink, CreditCard, Tag, Sparkles, ShieldCheck, ShieldOff, Plus } from "lucide-react";
import { billingService } from "@/lib/services/billing.service";
import { clearOnboardingToken } from "./OnboardingTokenGate";

interface BillingActionsProps {
  hasActiveSub: boolean;
  planId?: string;
  planPrice?: number;
  onboardingToken?: string;
  promoApplied?: boolean;
  /** Whether the Managed Backup add-on is currently active on this subscription */
  hasBackupAddon?: boolean;
}

export function BillingActions({
  hasActiveSub,
  planId,
  planPrice,
  onboardingToken,
  promoApplied,
  hasBackupAddon = false,
}: BillingActionsProps) {
  const [loading, setLoading] = useState<"checkout" | "portal" | "backup" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [backupEnabled, setBackupEnabled] = useState(hasBackupAddon);

  async function handleCheckout() {
    if (!planId) return;
    setLoading("checkout");
    setError(null);
    const result = await billingService.createCheckoutSession(
      planId,
      onboardingToken ? undefined : promoCode.trim() || undefined,
      onboardingToken,
    );
    if (result.ok) {
      clearOnboardingToken();
      window.location.href = result.data.url!;
    } else {
      setError(result.error.message);
      setLoading(null);
    }
  }

  async function handlePortal() {
    setLoading("portal");
    setError(null);
    const result = await billingService.createPortalSession();
    if (result.ok) {
      window.location.href = result.data.url!;
    } else {
      setError(result.error.message);
      setLoading(null);
    }
  }

  async function handleToggleBackup() {
    setLoading("backup");
    setError(null);
    const action = backupEnabled ? "disable" : "enable";
    const result = await billingService.toggleBackupAddon(action);
    if (result.ok) {
      setBackupEnabled(result.data.enabled);
    } else {
      setError(result.error.message);
    }
    setLoading(null);
  }

  const priceLabel = planPrice ? `A$${(planPrice / 100).toFixed(0)}/month` : "";

  if (hasActiveSub) {
    return (
      <div className="space-y-4">
        {/* Managed Backup add-on */}
        <div className="p-3 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-elevated)]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-2.5">
              <ShieldCheck
                size={15}
                className={backupEnabled ? "text-[var(--status-active)] mt-0.5 shrink-0" : "text-[var(--text-tertiary)] mt-0.5 shrink-0"}
              />
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  Managed Backup
                  {backupEnabled && (
                    <span className="ml-2 text-xs font-medium text-[var(--status-active)]">Active</span>
                  )}
                </p>
                <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                  Daily automated backups · 30-day retention · A$5/month
                </p>
              </div>
            </div>
            <button
              onClick={handleToggleBackup}
              disabled={loading === "backup"}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-medium transition-colors disabled:opacity-60 ${
                backupEnabled
                  ? "bg-[var(--status-error-bg)] text-[var(--status-error)] hover:bg-[var(--status-error-bg)]/80 border border-[var(--status-error)]/20"
                  : "bg-[var(--brand-primary-muted)] text-[var(--brand-primary)] hover:bg-[var(--brand-primary-muted)]/80 border border-[var(--brand-primary)]/20"
              }`}
            >
              {loading === "backup" ? (
                <Loader2 size={11} className="animate-spin" />
              ) : backupEnabled ? (
                <ShieldOff size={11} />
              ) : (
                <Plus size={11} />
              )}
              {loading === "backup" ? "Updating…" : backupEnabled ? "Remove" : "Add"}
            </button>
          </div>
        </div>

        {error && <p className="text-xs text-[var(--status-error)]">{error}</p>}

        <button
          onClick={handlePortal}
          disabled={loading === "portal"}
          className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] font-medium transition-colors disabled:opacity-60"
        >
          {loading === "portal" ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
          {loading === "portal" ? "Loading…" : "Manage billing"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {promoApplied ? (
        <div className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] bg-[var(--brand-primary-muted)] border border-[var(--brand-primary)]/20 text-[var(--brand-primary)] text-xs">
          <Sparkles size={12} className="shrink-0" />
          Your exclusive offer has been applied
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Tag size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
            <input
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              placeholder="Promo code (optional)"
              className="w-full pl-9 pr-3 py-2 rounded-[var(--radius-md)] bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--brand-primary)] transition-colors"
            />
          </div>
        </div>
      )}

      {error && <p className="text-xs text-[var(--status-error)]">{error}</p>}

      <button
        onClick={handleCheckout}
        disabled={loading === "checkout" || !planId}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-[var(--radius-md)] bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-sm font-medium transition-colors disabled:opacity-60"
      >
        {loading === "checkout" ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
        {loading === "checkout" ? "Redirecting to Stripe…" : `Subscribe${priceLabel ? ` — ${priceLabel}` : ""}`}
      </button>
    </div>
  );
}
