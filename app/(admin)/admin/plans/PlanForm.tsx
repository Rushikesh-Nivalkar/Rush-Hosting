"use client";

import { useState } from "react";
import { Loader2, Plus, X, Package, CheckCircle, AlertCircle } from "lucide-react";
import { GlassCard } from "@/components/shared/GlassCard";

interface Client {
  id: string;
  full_name: string | null;
  email: string;
}

interface CreatedPlan {
  id: string;
  name: string;
  description: string | null;
  price_aud: number;
  features: string[];
  stripe_price_id: string | null;
  stripe_product_id: string | null;
  created_for: string | null;
  created_at: string;
}

interface PlanFormProps {
  clients: Client[];
  onCreated: (plan: CreatedPlan) => void;
}

const inputClass =
  "w-full px-3 py-2 rounded-[var(--radius-md)] bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--brand-primary)] transition-colors";
const labelClass = "block text-xs font-medium text-[var(--text-secondary)] mb-1";

export function PlanForm({ clients, onCreated }: PlanFormProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priceAud, setPriceAud] = useState("");
  const [features, setFeatures] = useState<string[]>([]);
  const [featureInput, setFeatureInput] = useState("");
  const [createdFor, setCreatedFor] = useState("");
  const [lumpsumHours, setLumpsumHours] = useState("");
  const [weeklyHours, setWeeklyHours] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addFeature() {
    const val = featureInput.trim();
    if (val && !features.includes(val)) {
      setFeatures([...features, val]);
    }
    setFeatureInput("");
  }

  function removeFeature(f: string) {
    setFeatures(features.filter((x) => x !== f));
  }

  function handleFeatureKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      addFeature();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const priceInCents = Math.round(parseFloat(priceAud) * 100);

    const res = await fetch("/api/admin/custom-plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        description: description.trim() || undefined,
        price_aud: priceInCents,
        features,
        created_for: createdFor || undefined,
        lumpsum_minutes: lumpsumHours ? Math.round(parseFloat(lumpsumHours) * 60) : 0,
        weekly_minutes:  weeklyHours  ? Math.round(parseFloat(weeklyHours)  * 60) : 0,
      }),
    });

    const json = await res.json();
    setLoading(false);

    if (json.ok) {
      onCreated(json.data);
      setName("");
      setDescription("");
      setPriceAud("");
      setFeatures([]);
      setFeatureInput("");
      setCreatedFor("");
      setLumpsumHours("");
      setWeeklyHours("");
      setOpen(false);
    } else {
      setError(json.error?.message ?? "Failed to create package.");
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-sm font-medium transition-colors"
      >
        <Plus size={14} />
        New package
      </button>
    );
  }

  return (
    <GlassCard padding="md">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">New custom package</h2>
        <button
          onClick={() => setOpen(false)}
          className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <X size={15} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <label className={labelClass}>Package name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. Starter Website"
            className={inputClass}
          />
        </div>

        {/* Description */}
        <div>
          <label className={labelClass}>Description (optional)</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short description shown in Stripe"
            className={inputClass}
          />
        </div>

        {/* Price */}
        <div>
          <label className={labelClass}>Monthly price (AUD)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--text-tertiary)]">A$</span>
            <input
              type="number"
              value={priceAud}
              onChange={(e) => setPriceAud(e.target.value)}
              required
              min="1"
              step="0.01"
              placeholder="49.00"
              className="w-full pl-9 pr-3 py-2 rounded-[var(--radius-md)] bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--brand-primary)] transition-colors"
            />
          </div>
        </div>

        {/* Features */}
        <div>
          <label className={labelClass}>Features</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={featureInput}
              onChange={(e) => setFeatureInput(e.target.value)}
              onKeyDown={handleFeatureKeyDown}
              placeholder="Add a feature and press Enter"
              className="flex-1 px-3 py-2 rounded-[var(--radius-md)] bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--brand-primary)] transition-colors"
            />
            <button
              type="button"
              onClick={addFeature}
              className="px-3 py-2 rounded-[var(--radius-md)] bg-[var(--bg-elevated)] border border-[var(--border-default)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Add
            </button>
          </div>
          {features.length > 0 && (
            <ul className="space-y-1.5">
              {features.map((f) => (
                <li key={f} className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--bg-base)] border border-[var(--border-subtle)]">
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle size={11} className="text-[var(--status-active)] shrink-0" />
                    <span className="text-xs text-[var(--text-secondary)] truncate">{f}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFeature(f)}
                    className="shrink-0 text-[var(--text-tertiary)] hover:text-[var(--status-error)] transition-colors"
                  >
                    <X size={11} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Assign to customer */}
        {clients.length > 0 && (
          <div>
            <label className={labelClass}>Assign to customer (optional)</label>
            <select
              value={createdFor}
              onChange={(e) => setCreatedFor(e.target.value)}
              className={inputClass}
            >
              <option value="">Any customer</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name ? `${c.full_name} — ${c.email}` : c.email}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">
              For your records only — restriction is enforced via the onboarding link.
            </p>
          </div>
        )}

        {/* Time buckets */}
        <div>
          <label className={labelClass}>Support time — initial bucket (hours)</label>
          <input
            type="number"
            value={lumpsumHours}
            onChange={(e) => setLumpsumHours(e.target.value)}
            min="0"
            step="0.5"
            placeholder="e.g. 40"
            className={inputClass}
          />
          <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">
            One-time setup hours. Does not expire until fully used by admin.
          </p>
        </div>

        <div>
          <label className={labelClass}>Support time — weekly recurring (hours)</label>
          <input
            type="number"
            value={weeklyHours}
            onChange={(e) => setWeeklyHours(e.target.value)}
            min="0"
            step="0.5"
            placeholder="e.g. 1"
            className={inputClass}
          />
          <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">
            Resets every Monday. Unused hours do not carry over.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-[var(--radius-md)] bg-[var(--status-error-bg)] border border-[var(--status-error)]/20 text-[var(--status-error)] text-xs">
            <AlertCircle size={13} /> {error}
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-sm font-medium transition-colors disabled:opacity-60"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Package size={14} />}
            {loading ? "Creating…" : "Create package"}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="px-4 py-2 rounded-[var(--radius-md)] bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </GlassCard>
  );
}
