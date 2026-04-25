import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/stripe-helpers";
import { createSupabaseAdminClient } from "@/lib/supabase/supabase-server";
import type Stripe from "stripe";

export const runtime = "nodejs";

// ── Status mapping ────────────────────────────────────────────────────────────

const STATUS_MAP: Partial<Record<string, string>> = {
  active:   "active",
  past_due: "past_due",
  canceled: "cancelled",   // Stripe uses "canceled", our DB uses "cancelled"
  trialing: "trialing",
  incomplete: "incomplete",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function subRow(sub: Stripe.Subscription, db: any, userId?: string) {
  const priceItem = sub.items.data[0];
  const priceId = priceItem?.price.id ?? null;
  // In Stripe API ≥2026-03-25.dahlia, current_period_end lives on the item, not the subscription root
  const periodEnd = priceItem?.current_period_end ?? sub.billing_cycle_anchor;
  const nextBilling = new Date(periodEnd * 1000).toISOString();

  let planName = "Unknown Plan";
  if (priceId) {
    const { data } = await db
      .from("standard_plan_stripe")
      .select("plan_id")
      .eq("stripe_price_id", priceId)
      .maybeSingle();
    if (data?.plan_id) {
      const { PLANS } = await import("@/constants/plans");
      const match = Object.values(PLANS).find((p) => p.id === data.plan_id);
      if (match) planName = match.name;
    }
  }

  return {
    ...(userId ? { owner_id: userId } : {}),
    stripe_customer_id:     typeof sub.customer === "string" ? sub.customer : sub.customer.id,
    stripe_subscription_id: sub.id,
    stripe_price_id:        priceId,
    plan_name:              planName,
    status:                 STATUS_MAP[sub.status] ?? sub.status,
    current_period_end:     nextBilling,
    cancel_at_period_end:   sub.cancel_at_period_end,
    amount_aud:             priceItem?.price.unit_amount ?? null,
  };
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig  = req.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown";
    console.error(`Webhook sig failed: ${msg}`);
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createSupabaseAdminClient() as any;

  try {
    switch (event.type) {

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription" || !session.subscription) break;

        const userId = session.metadata?.supabase_user_id;
        if (!userId) break;

        const sub = await stripe.subscriptions.retrieve(session.subscription as string);
        const { error: upsertError } = await db.from("subscriptions").upsert(await subRow(sub, db, userId), { onConflict: "owner_id" });
        if (upsertError) throw new Error(`Subscription upsert failed: ${upsertError.message}`);
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        await db.from("subscriptions").update(await subRow(sub, db)).eq("stripe_subscription_id", sub.id);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await db.from("subscriptions")
          .update({ status: "cancelled", cancel_at_period_end: false })
          .eq("stripe_subscription_id", sub.id);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subRef = invoice.parent?.subscription_details?.subscription;
        if (!subRef) break;
        const subId = typeof subRef === "string" ? subRef : subRef.id;
        await db.from("subscriptions").update({ status: "past_due" }).eq("stripe_subscription_id", subId);
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
