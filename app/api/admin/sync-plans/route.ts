import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/supabase-server";
import { stripe } from "@/lib/stripe/stripe-helpers";
import { PLANS, PLAN_ORDER, type PlanId } from "@/constants/plans";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = any;

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const db: DB = createSupabaseAdminClient();
  const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).single();
  return profile?.role === "admin" ? user : null;
}

// ── GET — current sync status for all standard plans ─────────────────────────

export async function GET() {
  const user = await requireAdmin();
  if (!user) {
    return NextResponse.json({ ok: false, error: { code: "FORBIDDEN" } }, { status: 403 });
  }

  const db: DB = createSupabaseAdminClient();
  const { data: rows } = await db
    .from("standard_plan_stripe")
    .select("plan_id, stripe_product_id, stripe_price_id, synced_at");

  const syncMap = new Map((rows ?? []).map((r: { plan_id: string; stripe_product_id: string; stripe_price_id: string; synced_at: string }) => [r.plan_id, r]));

  const status = PLAN_ORDER.map((id) => {
    const plan = Object.values(PLANS).find((p) => p.id === id)!;
    const synced = syncMap.get(id) as { stripe_price_id: string; stripe_product_id: string; synced_at: string } | undefined;
    return {
      plan_id: id,
      name: plan.name,
      price_aud: plan.price,
      stripe_price_id: synced?.stripe_price_id ?? null,
      stripe_product_id: synced?.stripe_product_id ?? null,
      synced_at: synced?.synced_at ?? null,
    };
  });

  return NextResponse.json({ ok: true, data: status });
}

// ── POST — create / re-sync standard plans in Stripe ─────────────────────────

export async function POST() {
  const user = await requireAdmin();
  if (!user) {
    return NextResponse.json({ ok: false, error: { code: "FORBIDDEN" } }, { status: 403 });
  }

  try {
    const db: DB = createSupabaseAdminClient();

    // Load existing synced records so we can update rather than duplicate
    const { data: existing } = await db
      .from("standard_plan_stripe")
      .select("plan_id, stripe_product_id, stripe_price_id");

    const syncMap = new Map(
      (existing ?? []).map((r: { plan_id: string; stripe_product_id: string; stripe_price_id: string }) => [r.plan_id, r])
    );

    const results = [];

    for (const planId of PLAN_ORDER) {
      const plan = Object.values(PLANS).find((p) => p.id === planId)!;
      const synced = syncMap.get(planId) as { stripe_product_id: string; stripe_price_id: string } | undefined;

      let productId: string;
      let priceId: string;

      if (synced) {
        // ── Product: update name in Stripe (in case it changed) ───────────────
        try {
          await stripe.products.update(synced.stripe_product_id, {
            name: plan.name,
            metadata: { rushhosting_plan_id: planId },
          });
          productId = synced.stripe_product_id;
        } catch {
          // Product was deleted in Stripe — create a fresh one
          const product = await stripe.products.create({
            name: plan.name,
            metadata: { rushhosting_plan_id: planId },
          });
          productId = product.id;
        }

        // ── Price: Stripe prices are immutable — check if amount changed ──────
        let existingPrice: { unit_amount: number | null } | null = null;
        try {
          existingPrice = await stripe.prices.retrieve(synced.stripe_price_id);
        } catch { /* price deleted in Stripe */ }

        if (existingPrice && existingPrice.unit_amount === plan.price) {
          // Price unchanged — reuse it
          priceId = synced.stripe_price_id;
        } else {
          // Price changed (or deleted) — archive old one and create new
          if (existingPrice) {
            await stripe.prices.update(synced.stripe_price_id, { active: false });
          }
          const newPrice = await stripe.prices.create({
            product: productId,
            unit_amount: plan.price,
            currency: "aud",
            recurring: { interval: "month" },
            metadata: { rushhosting_plan_id: planId },
          });
          priceId = newPrice.id;
        }
      } else {
        // ── No existing record — create product and price from scratch ─────────
        const product = await stripe.products.create({
          name: plan.name,
          metadata: { rushhosting_plan_id: planId },
        });
        productId = product.id;

        const price = await stripe.prices.create({
          product: productId,
          unit_amount: plan.price,
          currency: "aud",
          recurring: { interval: "month" },
          metadata: { rushhosting_plan_id: planId },
        });
        priceId = price.id;
      }

      const syncedAt = new Date().toISOString();
      await db.from("standard_plan_stripe").upsert(
        { plan_id: planId, stripe_product_id: productId, stripe_price_id: priceId, synced_at: syncedAt },
        { onConflict: "plan_id" }
      );

      results.push({ plan_id: planId as PlanId, name: plan.name, stripe_product_id: productId, stripe_price_id: priceId, synced_at: syncedAt });
    }

    return NextResponse.json({ ok: true, data: results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json(
      { ok: false, error: { code: "STRIPE_ERROR", message } },
      { status: 500 }
    );
  }
}
