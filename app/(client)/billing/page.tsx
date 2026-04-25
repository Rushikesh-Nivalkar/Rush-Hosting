import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/supabase-server";
import { GlassCard } from "@/components/shared/GlassCard";
import { BillingActions } from "./BillingActions";
import { OnboardingTokenGate } from "./OnboardingTokenGate";
import { CheckCircle, AlertCircle, CreditCard, Sparkles, Globe } from "lucide-react";
import { formatAUD, stripe } from "@/lib/stripe/stripe-helpers";
import { PLANS, PLAN_ORDER, getPlanRank, type PlanId } from "@/constants/plans";
import type { SubscriptionStatus } from "@/lib/supabase/database.types";
import type Stripe from "stripe";

type Subscription = {
  plan_name: string | null;
  status: SubscriptionStatus;
  amount_aud: number | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  stripe_customer_id: string | null;
  backup_addon_stripe_item_id: string | null;
};

type CustomPlanData = {
  id: string;
  name: string;
  price_aud: number;
  features: string[];
};

const STATUS_MAP: Record<SubscriptionStatus, { label: string; icon: typeof CheckCircle; color: string }> = {
  active:     { label: "Active",     icon: CheckCircle, color: "text-[var(--status-active)]" },
  trialing:   { label: "Trial",      icon: CheckCircle, color: "text-[var(--status-info)]" },
  past_due:   { label: "Past due",   icon: AlertCircle, color: "text-[var(--status-error)]" },
  cancelled:  { label: "Cancelled",  icon: AlertCircle, color: "text-[var(--text-tertiary)]" },
  incomplete: { label: "Incomplete", icon: AlertCircle, color: "text-[var(--status-warning)]" },
};

type OnboardingContext = {
  token: string;
  minimum_plan: PlanId | null;
  promo_code: string | null;
  custom_plan_id: string | null;
};

function applyDiscount(priceCents: number, coupon: Stripe.Coupon): number {
  if (coupon.percent_off) return Math.round(priceCents * (1 - coupon.percent_off / 100));
  if (coupon.amount_off) return Math.max(0, priceCents - coupon.amount_off);
  return priceCents;
}

function promoNote(coupon: Stripe.Coupon, originalPriceCents: number): string | null {
  const full = `${formatAUD(originalPriceCents)}/month`;
  if (coupon.duration === "repeating" && coupon.duration_in_months) {
    return `Discounted for ${coupon.duration_in_months} month${coupon.duration_in_months > 1 ? "s" : ""}, then ${full}`;
  }
  if (coupon.duration === "once") {
    return `First month only, then ${full}`;
  }
  return null; // "forever" — no note needed
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; cancelled?: string; token?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const params = await searchParams;
  const { data: { user } } = await supabase.auth.getUser();

  // Onboarding links go to signup (new customer); normal unauthenticated visits go to login
  if (!user) {
    const destination = params.token
      ? `/signup?redirect=/billing?token=${params.token}`
      : "/login";
    redirect(destination);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createSupabaseAdminClient() as any;

  // Validate onboarding token if present (server-side only — not trusted from client)
  let onboarding: OnboardingContext | null = null;
  if (params.token) {
    const { data: link } = await db
      .from("onboarding_links")
      .select("token, minimum_plan, promo_code, custom_plan_id, expires_at, used")
      .eq("token", params.token)
      .single();

    if (link && !link.used && new Date(link.expires_at) >= new Date()) {
      onboarding = {
        token: link.token,
        minimum_plan: link.minimum_plan as PlanId | null,
        promo_code: link.promo_code ?? null,
        custom_plan_id: link.custom_plan_id ?? null,
      };
    }
  }

  // Fetch custom plan details if the token points to one
  let customPlan: CustomPlanData | null = null;
  if (onboarding?.custom_plan_id) {
    const { data } = await db
      .from("custom_plans")
      .select("id, name, price_aud, features")
      .eq("id", onboarding.custom_plan_id)
      .single() as { data: CustomPlanData | null };
    customPlan = data;
  }

  // Fetch Stripe coupon for discounted pricing display
  let promoCoupon: Stripe.Coupon | null = null;
  if (onboarding?.promo_code) {
    try {
      const codes = await stripe.promotionCodes.list({
        code: onboarding.promo_code,
        active: true,
        limit: 1,
        expand: ["data.promotion.coupon"],
      });
      if (codes.data[0]) {
        promoCoupon = codes.data[0].promotion.coupon as Stripe.Coupon;
      }
    } catch { /* Stripe not configured or invalid code — show normal pricing */ }
  }

  // Use service-role client so RLS doesn't block subscription read
  const { data: subscription } = await db
    .from("subscriptions")
    .select("plan_name, status, amount_aud, current_period_end, cancel_at_period_end, stripe_customer_id, backup_addon_stripe_item_id")
    .eq("owner_id", user.id)
    .single() as { data: Subscription | null };

  const hasActiveSub = subscription?.status === "active" || subscription?.status === "trialing";

  // Always fetch site for paid users so we can show the "Set up domain" CTA.
  // Also needed to decide whether to redirect after a successful checkout.
  let hasSite = false;
  if (hasActiveSub || params.success) {
    const { data: existingSite } = await db
      .from("sites")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();
    hasSite = !!existingSite;
  }

  // After a successful checkout, send new subscribers to domain setup.
  // Don't gate on hasActiveSub — the webhook may not have fired yet when Stripe
  // redirects back, so the subscription row won't exist in the DB yet.
  if (params.success && !hasSite) redirect("/setup/domain");

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Persist valid onboarding token to localStorage; restore it after login redirects */}
      <OnboardingTokenGate serverToken={onboarding?.token} />

      <div>
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Billing</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">Manage your hosting subscription.</p>
      </div>

      {/* Banners */}
      {params.success && (
        <div className="flex items-center gap-2 p-3 rounded-[var(--radius-md)] bg-[var(--status-active-bg)] border border-[var(--status-active)]/20 text-[var(--status-active)] text-sm">
          <CheckCircle size={15} />
          Payment successful — your subscription is now active.
        </div>
      )}
      {params.cancelled && (
        <div className="flex items-center gap-2 p-3 rounded-[var(--radius-md)] bg-[var(--status-warning-bg)] border border-[var(--status-warning)]/20 text-[var(--status-warning)] text-sm">
          <AlertCircle size={15} />
          Checkout was cancelled. No charge was made.
        </div>
      )}

      {subscription ? (
        /* ── Active subscription ── */
        <GlassCard padding="lg">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs text-[var(--text-secondary)] mb-0.5">Current plan</p>
              <p className="text-base font-semibold text-[var(--text-primary)]">
                {subscription.plan_name ?? "—"}
              </p>
              {subscription.amount_aud && (
                <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                  {formatAUD(subscription.amount_aud)}/month
                </p>
              )}
            </div>
            {(() => {
              const cfg = STATUS_MAP[subscription.status];
              const Icon = cfg.icon;
              return (
                <div className={`flex items-center gap-1.5 text-sm font-medium ${cfg.color}`}>
                  <Icon size={15} />
                  {cfg.label}
                </div>
              );
            })()}
          </div>

          {subscription.cancel_at_period_end && subscription.current_period_end && (
            <p className="text-xs text-[var(--status-warning)] mb-4">
              Cancels on {new Date(subscription.current_period_end).toLocaleDateString("en-AU", {
                day: "numeric", month: "long", year: "numeric",
              })}
            </p>
          )}
          {subscription.current_period_end && !subscription.cancel_at_period_end && (
            <p className="text-xs text-[var(--text-tertiary)] mb-4">
              Next billing date:{" "}
              {new Date(subscription.current_period_end).toLocaleDateString("en-AU", {
                day: "numeric", month: "long", year: "numeric",
              })}
            </p>
          )}

          {hasActiveSub && !hasSite && (
            <div className="flex items-center justify-between gap-4 mb-4 p-3 rounded-[var(--radius-md)] bg-[var(--brand-primary-muted)] border border-[var(--brand-primary)]/20">
              <div className="flex items-center gap-2 text-sm text-[var(--brand-primary)]">
                <Globe size={14} className="shrink-0" />
                Domain not set up yet
              </div>
              <Link
                href="/setup/domain"
                className="shrink-0 text-xs font-medium text-[var(--brand-primary)] hover:underline"
              >
                Set up now →
              </Link>
            </div>
          )}
          <BillingActions
            hasActiveSub={hasActiveSub}
            hasBackupAddon={!!subscription.backup_addon_stripe_item_id}
          />
        </GlassCard>
      ) : (
        /* ── Plan selection ── */
        <div className="space-y-3">
          {/* Onboarding banner */}
          {onboarding && (
            <div className="flex items-center gap-2 p-3 rounded-[var(--radius-md)] bg-[var(--brand-primary-muted)] border border-[var(--brand-primary)]/20 text-[var(--brand-primary)] text-sm">
              <Sparkles size={14} className="shrink-0" />
              <span>
                {customPlan
                  ? onboarding.promo_code
                    ? "Your exclusive package with a special discount is ready — subscribe below."
                    : "Your exclusive package is ready — subscribe below to get started."
                  : onboarding.promo_code
                  ? "Your exclusive offer has been applied — select a plan below to get started."
                  : "Plans available for your account — select one below to get started."}
              </span>
            </div>
          )}

          {!onboarding && (
            <p className="text-sm text-[var(--text-secondary)]">Choose a plan to get started.</p>
          )}

          {/* Custom plan — show only this one */}
          {customPlan ? (
            (() => {
              const discountedPrice = promoCoupon ? applyDiscount(customPlan.price_aud, promoCoupon) : null;
              return (
                <GlassCard padding="lg">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-base font-semibold text-[var(--text-primary)]">{customPlan.name}</p>
                      {discountedPrice !== null ? (
                        <div className="mt-0.5">
                          <div className="flex items-baseline gap-2">
                            <span className="text-sm text-[var(--text-tertiary)] line-through">
                              {formatAUD(customPlan.price_aud)}/month
                            </span>
                            <span className="text-sm font-semibold text-[var(--status-active)]">
                              {formatAUD(discountedPrice)}/month
                            </span>
                            <span className="text-xs text-[var(--text-secondary)]">· billed in AUD</span>
                          </div>
                          {promoCoupon && promoNote(promoCoupon, customPlan.price_aud) && (
                            <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                              {promoNote(promoCoupon, customPlan.price_aud)}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                          {formatAUD(customPlan.price_aud)}/month · billed in AUD
                        </p>
                      )}
                    </div>
                  </div>
                  {customPlan.features.length > 0 && (
                    <ul className="mb-5 space-y-1.5">
                      {customPlan.features.map((f) => (
                        <li key={f} className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                          <CheckCircle size={12} className="text-[var(--status-active)] shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  )}
                  <BillingActions
                    hasActiveSub={false}
                    planId={customPlan.id}
                    planPrice={discountedPrice ?? customPlan.price_aud}
                    onboardingToken={onboarding!.token}
                    promoApplied={!!onboarding!.promo_code}
                  />
                </GlassCard>
              );
            })()
          ) : (
            /* Standard plans — filtered by minimum_plan rank (or all if no onboarding) */
            PLAN_ORDER
              .filter((id) => {
                const minPlan = onboarding?.minimum_plan;
                return minPlan ? getPlanRank(id) >= getPlanRank(minPlan) : true;
              })
              .map((id) => {
                const plan = Object.values(PLANS).find((p) => p.id === id)!;
                const discountedPrice = promoCoupon ? applyDiscount(plan.price, promoCoupon) : null;
                return (
                  <GlassCard key={plan.id} padding="lg">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-base font-semibold text-[var(--text-primary)]">{plan.name}</p>
                        {discountedPrice !== null ? (
                          <div className="mt-0.5">
                            <div className="flex items-baseline gap-2">
                              <span className="text-sm text-[var(--text-tertiary)] line-through">
                                {formatAUD(plan.price)}/month
                              </span>
                              <span className="text-sm font-semibold text-[var(--status-active)]">
                                {formatAUD(discountedPrice)}/month
                              </span>
                              <span className="text-xs text-[var(--text-secondary)]">· billed in AUD</span>
                            </div>
                            {promoCoupon && promoNote(promoCoupon, plan.price) && (
                              <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                                {promoNote(promoCoupon, plan.price)}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                            {formatAUD(plan.price)}/month · billed in AUD
                          </p>
                        )}
                      </div>
                    </div>
                    <ul className="mb-5 space-y-1.5">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                          <CheckCircle size={12} className="text-[var(--status-active)] shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <BillingActions
                      hasActiveSub={false}
                      planId={plan.id}
                      planPrice={discountedPrice ?? plan.price}
                      onboardingToken={onboarding?.token}
                      promoApplied={!!onboarding?.promo_code}
                    />
                  </GlassCard>
                );
              })
          )}
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
        <CreditCard size={12} />
        Payments are processed securely via Stripe in Australian Dollars (AUD).
      </div>
    </div>
  );
}
