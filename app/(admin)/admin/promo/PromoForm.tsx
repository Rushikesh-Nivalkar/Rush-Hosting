"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { GlassCard } from "@/components/shared/GlassCard";

interface Client {
  id: string;
  full_name: string | null;
  email: string;
  stripe_customer_id: string | null;
}

export function PromoForm({ clients }: { clients: Client[] }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "amount">("percent");
  const [discountValue, setDiscountValue] = useState("");
  const [duration, setDuration] = useState<"once" | "repeating" | "forever">("forever");
  const [durationMonths, setDurationMonths] = useState("3");
  const [restriction, setRestriction] = useState<"all" | "customer">("all");
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [maxRedemptions, setMaxRedemptions] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const customer = clients.find((c) => c.id === selectedCustomer);
    if (restriction === "customer" && !customer?.stripe_customer_id) {
      setError("Selected customer has no Stripe account yet. They need to initiate checkout first.");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/admin/promo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        discountType,
        discountValue: Number(discountValue),
        duration,
        durationMonths: duration === "repeating" ? Number(durationMonths) : undefined,
        stripeCustomerId: restriction === "customer" ? customer?.stripe_customer_id : null,
        maxRedemptions: maxRedemptions ? Number(maxRedemptions) : null,
      }),
    });

    const json = await res.json();
    setLoading(false);

    if (json.ok) {
      setSuccess(`Code "${json.data.promoCode.code}" created successfully.`);
      setCode("");
      setDiscountValue("");
      setMaxRedemptions("");
      setSelectedCustomer("");
    } else {
      setError(json.error?.message ?? "Failed to create promo code.");
    }
  }

  const inputClass =
    "w-full px-3 py-2 rounded-[var(--radius-md)] bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)] transition-colors";
  const labelClass = "block text-xs font-medium text-[var(--text-secondary)] mb-1";
  const selectClass = inputClass;

  return (
    <GlassCard padding="lg">
      <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-5">Create promo code</h2>

      {error && (
        <div className="mb-4 p-3 rounded-[var(--radius-md)] bg-[var(--status-error-bg)] border border-[var(--status-error)]/20 text-[var(--status-error)] text-xs">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 rounded-[var(--radius-md)] bg-[var(--status-active-bg)] border border-[var(--status-active)]/20 text-[var(--status-active)] text-xs">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Code */}
        <div>
          <label className={labelClass}>Promo code</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. FAMILY2025"
            required
            className={inputClass}
          />
          <p className="text-[10px] text-[var(--text-tertiary)] mt-1">Will be uppercased automatically.</p>
        </div>

        {/* Discount */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Discount type</label>
            <select value={discountType} onChange={(e) => setDiscountType(e.target.value as "percent" | "amount")} className={selectClass}>
              <option value="percent">Percentage off (%)</option>
              <option value="amount">Fixed amount off (AUD $)</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>
              {discountType === "percent" ? "Percentage (0–100)" : "Amount (AUD $)"}
            </label>
            <input
              type="number"
              min="1"
              max={discountType === "percent" ? "100" : undefined}
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              placeholder={discountType === "percent" ? "100" : "49"}
              required
              className={inputClass}
            />
          </div>
        </div>

        {/* Duration */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Duration</label>
            <select value={duration} onChange={(e) => setDuration(e.target.value as "once" | "repeating" | "forever")} className={selectClass}>
              <option value="once">Once (first payment only)</option>
              <option value="repeating">Repeating (N months)</option>
              <option value="forever">Forever</option>
            </select>
          </div>
          {duration === "repeating" && (
            <div>
              <label className={labelClass}>Months</label>
              <input
                type="number"
                min="1"
                value={durationMonths}
                onChange={(e) => setDurationMonths(e.target.value)}
                className={inputClass}
              />
            </div>
          )}
        </div>

        {/* Customer restriction */}
        <div>
          <label className={labelClass}>Restrict to</label>
          <select value={restriction} onChange={(e) => setRestriction(e.target.value as "all" | "customer")} className={selectClass}>
            <option value="all">Any customer (general code)</option>
            <option value="customer">Specific customer only</option>
          </select>
        </div>

        {restriction === "customer" && (
          <div>
            <label className={labelClass}>Customer</label>
            <select value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)} required className={selectClass}>
              <option value="">— Select a client —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name ?? c.email} {!c.stripe_customer_id ? "(no Stripe account yet)" : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Max redemptions */}
        <div>
          <label className={labelClass}>Max redemptions (leave blank for unlimited)</label>
          <input
            type="number"
            min="1"
            value={maxRedemptions}
            onChange={(e) => setMaxRedemptions(e.target.value)}
            placeholder="e.g. 1 for single-use"
            className={inputClass}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-md)] bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-sm font-medium transition-colors disabled:opacity-60"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          {loading ? "Creating…" : "Create code"}
        </button>
      </form>
    </GlassCard>
  );
}
