"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, Loader2, CheckCircle2, ArrowRight, Mail } from "lucide-react";
import { GlassCard } from "@/components/shared/GlassCard";

export function DomainSetupForm() {
  const router = useRouter();
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/setup/domain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain: domain.trim() }),
    });

    const json = await res.json();
    setLoading(false);

    if (!json.ok) {
      setError(json.error?.message ?? "Something went wrong. Please try again.");
      return;
    }

    setSubmitted(json.data.domain);
  }

  if (submitted) {
    return (
      <div className="space-y-4">
        <GlassCard padding="lg">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 size={18} className="text-[var(--status-active)]" />
            <p className="text-sm font-semibold text-[var(--text-primary)]">Domain received!</p>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mb-4">
            We&apos;ve saved <strong>{submitted}</strong> and will get it connected shortly.
            You&apos;ll hear from us once everything is live.
          </p>
          <div className="flex items-center gap-2 p-3 rounded-[var(--radius-md)] bg-[var(--brand-primary-muted)] border border-[var(--brand-primary)]/20 text-[var(--brand-primary)] text-xs">
            <Mail size={13} className="shrink-0" />
            Keep an eye on your inbox — we&apos;ll email you when your site is ready.
          </div>
        </GlassCard>

        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-md)] bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-sm font-medium transition-colors"
        >
          Go to dashboard
          <ArrowRight size={14} />
        </button>
      </div>
    );
  }

  return (
    <GlassCard padding="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1.5">
            Domain name
          </label>
          <div className="relative">
            <Globe
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none"
            />
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="example.com.au"
              autoFocus
              required
              className="w-full pl-9 pr-3 py-2.5 rounded-[var(--radius-md)] bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--brand-primary)] transition-colors"
            />
          </div>
          <p className="text-xs text-[var(--text-tertiary)] mt-1.5">
            Enter without www — e.g. <span className="font-mono">mybusiness.com.au</span>
          </p>
        </div>

        {error && (
          <p className="text-xs text-[var(--status-error)]">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || !domain.trim()}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-[var(--radius-md)] bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-sm font-medium transition-colors disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Submitting…
            </>
          ) : (
            <>
              Submit domain
              <ArrowRight size={14} />
            </>
          )}
        </button>
      </form>
    </GlassCard>
  );
}
