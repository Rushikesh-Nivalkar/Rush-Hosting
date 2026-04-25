import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/supabase-server";
import { stripe } from "@/lib/stripe/stripe-helpers";
import { PLANS, type PlanId } from "@/constants/plans";
import { sendEmail, planChangedEmail, ADMIN_EMAIL } from "@/lib/services/email.service";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: "UNAUTHORISED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const newPlanId: PlanId = body.plan_id;
  const newPlan = Object.values(PLANS).find((p) => p.id === newPlanId);
  if (!newPlan) {
    return NextResponse.json(
      { ok: false, error: { code: "INVALID_PLAN", message: "Invalid plan_id" } },
      { status: 400 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createSupabaseAdminClient() as any;

  const { data: syncedPlan } = await db
    .from("standard_plan_stripe")
    .select("stripe_price_id")
    .eq("plan_id", newPlanId)
    .single();
  const newPriceId: string | undefined = syncedPlan?.stripe_price_id;

  if (!newPriceId) {
    return NextResponse.json(
      { ok: false, error: { code: "PRICE_NOT_CONFIGURED", message: "Stripe price not configured for this plan. Sync plans in the admin panel." } },
      { status: 500 }
    );
  }

  // Get current subscription
  const { data: currentSub } = await db
    .from("subscriptions")
    .select("stripe_subscription_id, plan_name, amount_aud, current_period_end")
    .eq("owner_id", user.id)
    .single();

  if (!currentSub?.stripe_subscription_id) {
    return NextResponse.json(
      { ok: false, error: { code: "NO_SUBSCRIPTION", message: "No active subscription found" } },
      { status: 400 }
    );
  }

  // Retrieve subscription from Stripe to get item ID
  const stripeSub = await stripe.subscriptions.retrieve(currentSub.stripe_subscription_id);
  const itemId = stripeSub.items.data[0]?.id;

  if (!itemId) {
    return NextResponse.json(
      { ok: false, error: { code: "STRIPE_ERROR", message: "Could not find subscription item" } },
      { status: 500 }
    );
  }

  // Update subscription in Stripe with proration (default behavior)
  const updated = await stripe.subscriptions.update(currentSub.stripe_subscription_id, {
    items: [{ id: itemId, price: newPriceId }],
    proration_behavior: "create_prorations",
  });

  const nextBilling = new Date(updated.billing_cycle_anchor * 1000).toISOString();

  // Update DB
  await db.from("subscriptions").update({
    stripe_price_id: newPriceId,
    plan_name: newPlan.name,
    amount_aud: newPlan.price,
    current_period_end: nextBilling,
    status: updated.status,
  }).eq("owner_id", user.id);

  // Send confirmation email
  const nextBillingFormatted = new Date(nextBilling).toLocaleDateString("en-AU", {
    day: "numeric", month: "long", year: "numeric",
  });

  const emailContent = planChangedEmail({
    userName: user.email?.split("@")[0] ?? "there",
    oldPlan: currentSub.plan_name ?? "Previous Plan",
    oldPrice: currentSub.amount_aud ?? 0,
    newPlan: newPlan.name,
    newPrice: newPlan.price,
    nextBillingDate: nextBillingFormatted,
  });

  await sendEmail({
    to: user.email!,
    subject: emailContent.subject,
    html: emailContent.html,
    cc: ADMIN_EMAIL ? [ADMIN_EMAIL] : [],
  });

  return NextResponse.json({
    ok: true,
    data: {
      plan_name: newPlan.name,
      amount_aud: newPlan.price,
      status: updated.status,
      current_period_end: nextBilling,
    },
  });
}
