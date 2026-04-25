import { createSupabaseAdminClient } from "@/lib/supabase/supabase-server";
import { GlassCard } from "@/components/shared/GlassCard";
import { OnboardingForm } from "./OnboardingForm";
import { Link2, CheckCircle, Clock, Tag, Package } from "lucide-react";
import { PLANS } from "@/constants/plans";
import type { PlanId } from "@/constants/plans";

type OnboardingLink = {
  id: string;
  token: string;
  email: string;
  minimum_plan: PlanId | null;
  promo_code: string | null;
  custom_plan_id: string | null;
  expires_at: string;
  used: boolean;
  created_at: string;
};

type CustomPlan = {
  id: string;
  name: string;
  price_aud: number;
};

export default async function OnboardingPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createSupabaseAdminClient() as any;

  const [{ data: links }, { data: customPlans }] = await Promise.all([
    db
      .from("onboarding_links")
      .select("id, token, email, minimum_plan, promo_code, custom_plan_id, expires_at, used, created_at")
      .order("created_at", { ascending: false })
      .limit(50) as Promise<{ data: OnboardingLink[] | null }>,
    db
      .from("custom_plans")
      .select("id, name, price_aud")
      .order("created_at", { ascending: false }) as Promise<{ data: CustomPlan[] | null }>,
  ]);

  const customPlanMap = new Map((customPlans ?? []).map((cp) => [cp.id, cp]));
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Onboarding Links</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Generate personalised links for new customers with optional plan restrictions and promo codes.
        </p>
      </div>

      <OnboardingForm customPlans={customPlans ?? []} />

      {/* Existing links */}
      <div>
        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Recent links</h2>
        {!links || links.length === 0 ? (
          <GlassCard padding="md">
            <p className="text-sm text-[var(--text-secondary)] text-center py-4">No links generated yet.</p>
          </GlassCard>
        ) : (
          <div className="space-y-2">
            {links.map((link) => {
              const expired = new Date(link.expires_at) < new Date();
              const statusColor = link.used
                ? "text-[var(--text-tertiary)]"
                : expired
                ? "text-[var(--status-warning)]"
                : "text-[var(--status-active)]";
              const statusLabel = link.used ? "Used" : expired ? "Expired" : "Active";

              const customPlan = link.custom_plan_id ? customPlanMap.get(link.custom_plan_id) : null;
              const stdPlan = link.minimum_plan ? Object.values(PLANS).find((p) => p.id === link.minimum_plan) : null;

              return (
                <GlassCard key={link.id} padding="md">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--brand-primary-muted)] flex items-center justify-center shrink-0">
                        <Link2 size={14} className="text-[var(--brand-primary)]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{link.email}</p>
                        <p className="text-[11px] text-[var(--text-tertiary)] font-mono truncate">
                          {appUrl}/onboard?token={link.token.slice(0, 12)}…
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 text-xs text-[var(--text-secondary)]">
                      {/* Plan badge */}
                      {customPlan ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[11px] font-semibold text-[var(--text-primary)]">
                          <Package size={10} />
                          {customPlan.name}
                        </span>
                      ) : stdPlan ? (
                        <span className="px-2 py-0.5 rounded bg-[var(--brand-primary-muted)] text-[var(--brand-primary)] text-[11px] font-semibold">
                          {stdPlan.name}+
                        </span>
                      ) : null}

                      {/* Promo */}
                      {link.promo_code && (
                        <div className="flex items-center gap-1 text-[var(--text-secondary)]">
                          <Tag size={11} />
                          <span className="font-mono">{link.promo_code}</span>
                        </div>
                      )}

                      {/* Expiry */}
                      <div className="flex items-center gap-1 text-[var(--text-tertiary)]">
                        <Clock size={11} />
                        {new Date(link.expires_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                      </div>

                      {/* Status */}
                      <div className={`flex items-center gap-1 font-medium ${statusColor}`}>
                        <CheckCircle size={11} />
                        {statusLabel}
                      </div>
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
