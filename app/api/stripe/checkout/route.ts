import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/supabase-server";
import { stripe } from "@/lib/stripe/stripe-helpers";
import { PLANS, getPlanRank, type PlanId } from "@/constants/plans";

const VALID_PLAN_IDS = Object.values(PLANS).map((p) => p.id);

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHORISED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const planId: string = body.plan_id;
    const onboardingToken: string | undefined = body.onboarding_token || undefined;
    const manualPromoCode: string | undefined = onboardingToken ? undefined : (body.promo_code || undefined);

    const isStandardPlan = VALID_PLAN_IDS.includes(planId as PlanId);

    // Custom plans must come with a token — we resolve the price server-side
    if (!isStandardPlan && !onboardingToken) {
      return NextResponse.json(
        { ok: false, error: { code: "INVALID_PLAN", message: "Invalid plan_id" } },
        { status: 400 }
      );
    }

    // Standard plan: look up Stripe price ID from DB (populated via admin Sync)
    let priceId: string | undefined;
    if (isStandardPlan) {
      const { data: syncedPlan } = await (createSupabaseAdminClient() as any)
        .from("standard_plan_stripe")
        .select("stripe_price_id")
        .eq("plan_id", planId)
        .single();
      priceId = syncedPlan?.stripe_price_id;

      if (!priceId) {
        return NextResponse.json(
          { ok: false, error: { code: "PRICE_NOT_CONFIGURED", message: `Stripe price not configured for plan: ${planId}. Sync plans in the admin panel.` } },
          { status: 500 }
        );
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createSupabaseAdminClient() as any;

    // ── Onboarding token validation ───────────────────────────────────────────
    let resolvedPromoCode: string | undefined;

    if (onboardingToken) {
      const { data: link } = await db
        .from("onboarding_links")
        .select("token, minimum_plan, promo_code, custom_plan_id, expires_at, used")
        .eq("token", onboardingToken)
        .single();

      if (!link) {
        return NextResponse.json(
          { ok: false, error: { code: "INVALID_TOKEN", message: "Onboarding link is invalid." } },
          { status: 400 }
        );
      }
      if (link.used) {
        return NextResponse.json(
          { ok: false, error: { code: "TOKEN_USED", message: "This onboarding link has already been used." } },
          { status: 400 }
        );
      }
      if (new Date(link.expires_at) < new Date()) {
        return NextResponse.json(
          { ok: false, error: { code: "TOKEN_EXPIRED", message: "This onboarding link has expired." } },
          { status: 400 }
        );
      }

      if (link.custom_plan_id) {
        // ── Custom plan path ───────────────────────────────────────────────────
        // Verify the client is subscribing to the exact plan the token allows
        if (planId !== link.custom_plan_id) {
          return NextResponse.json(
            { ok: false, error: { code: "PLAN_MISMATCH", message: "The selected plan does not match this onboarding link." } },
            { status: 400 }
          );
        }
        // Resolve price ID from the custom plan record
        const { data: cp } = await db
          .from("custom_plans")
          .select("stripe_price_id, name")
          .eq("id", link.custom_plan_id)
          .single();

        if (!cp?.stripe_price_id) {
          return NextResponse.json(
            { ok: false, error: { code: "PRICE_NOT_CONFIGURED", message: "This package has not been configured in Stripe yet." } },
            { status: 500 }
          );
        }
        priceId = cp.stripe_price_id;
      } else {
        // ── Standard plan path with token ──────────────────────────────────────
        if (!isStandardPlan) {
          return NextResponse.json(
            { ok: false, error: { code: "INVALID_PLAN", message: "Invalid plan_id" } },
            { status: 400 }
          );
        }
        // Enforce minimum plan rank
        const selectedRank = getPlanRank(planId as PlanId);
        const minimumRank = getPlanRank(link.minimum_plan as PlanId);
        if (selectedRank < minimumRank) {
          const minPlanName = Object.values(PLANS).find((p) => p.id === link.minimum_plan)?.name ?? link.minimum_plan;
          return NextResponse.json(
            {
              ok: false,
              error: {
                code: "PLAN_BELOW_MINIMUM",
                message: `Your account requires at least the ${minPlanName} plan.`,
              },
            },
            { status: 400 }
          );
        }
      }

      // Promo code from DB (never from client)
      resolvedPromoCode = link.promo_code ?? undefined;
    } else {
      // Public self-serve — use manually typed promo if provided
      resolvedPromoCode = manualPromoCode;
    }

    // ── Resolve Stripe promotion code ─────────────────────────────────────────
    let discountConfig: { discounts: { promotion_code: string }[] } | { allow_promotion_codes: boolean };

    if (resolvedPromoCode) {
      const codes = await stripe.promotionCodes.list({ code: resolvedPromoCode, active: true, limit: 1 });
      if (!codes.data.length) {
        throw Object.assign(
          new Error(`Promo code "${resolvedPromoCode}" is invalid or expired.`),
          { code: "INVALID_PROMO" }
        );
      }
      discountConfig = { discounts: [{ promotion_code: codes.data[0].id }] };
    } else {
      discountConfig = { allow_promotion_codes: true };
    }

    // ── Fetch or create Stripe customer ───────────────────────────────────────
    const { data: sub } = await db
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("owner_id", user.id)
      .single();

    let customerId: string | undefined = sub?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
    }

    // ── Create Stripe Checkout session ────────────────────────────────────────
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId!,
          quantity: 1,
          ...(process.env.STRIPE_GST_TAX_RATE_ID
            ? { tax_rates: [process.env.STRIPE_GST_TAX_RATE_ID] }
            : {}),
        },
      ],
      success_url: `${appUrl}/billing?success=1`,
      cancel_url: `${appUrl}/billing?cancelled=1`,
      metadata: { supabase_user_id: user.id, plan_id: planId },
      subscription_data: { metadata: { supabase_user_id: user.id, plan_id: planId } },
      currency: "aud",
      locale: "en",
      ...discountConfig,
    });

    // Mark onboarding token as used now that a session has been created
    if (onboardingToken) {
      await db.from("onboarding_links").update({ used: true }).eq("token", onboardingToken);
    }

    return NextResponse.json({ ok: true, data: { url: session.url } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    const code = (err as { code?: string }).code === "INVALID_PROMO" ? "INVALID_PROMO" : "STRIPE_ERROR";
    return NextResponse.json(
      { ok: false, error: { code, message } },
      { status: code === "INVALID_PROMO" ? 400 : 500 }
    );
  }
}
