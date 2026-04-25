import { NextRequest, NextResponse } from "next/server";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/supabase-server";
import { stripe } from "@/lib/stripe/stripe-helpers";

// ── Auth guard ────────────────────────────────────────────────────────────────

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const db = createSupabaseAdminClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).single();
  return profile?.role === "admin" ? user : null;
}

// ── GET — list active promotion codes ─────────────────────────────────────────

export async function GET() {
  const user = await requireAdmin();
  if (!user) {
    return NextResponse.json({ ok: false, error: { code: "FORBIDDEN", message: "Admin only" } }, { status: 403 });
  }

  try {
    const codes = await stripe.promotionCodes.list({ limit: 50, active: true, expand: ["data.coupon"] });
    return NextResponse.json({ ok: true, data: { codes: codes.data } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ ok: false, error: { code: "STRIPE_ERROR", message } }, { status: 500 });
  }
}

// ── POST — create a coupon + promotion code ───────────────────────────────────

export async function POST(req: NextRequest) {
  const user = await requireAdmin();
  if (!user) {
    return NextResponse.json({ ok: false, error: { code: "FORBIDDEN", message: "Admin only" } }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      code,            // string — the code customers type
      discountType,    // "percent" | "amount"
      discountValue,   // number — percent (0-100) or AUD dollars (not cents)
      duration,        // "once" | "repeating" | "forever"
      durationMonths,  // number — only for "repeating"
      stripeCustomerId, // string | null — restrict to one customer
      maxRedemptions,  // number | null
    } = body;

    if (!code || !discountType || !discountValue || !duration) {
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION_ERROR", message: "Missing required fields" } },
        { status: 400 }
      );
    }

    // Build coupon params
    const couponParams: Parameters<typeof stripe.coupons.create>[0] = {
      duration,
      ...(duration === "repeating" ? { duration_in_months: Number(durationMonths) || 1 } : {}),
      ...(discountType === "percent"
        ? { percent_off: Number(discountValue) }
        : { amount_off: Math.round(Number(discountValue) * 100), currency: "aud" }),
      name: `${code} — ${discountType === "percent" ? `${discountValue}% off` : `A$${discountValue} off`}`,
    };

    const coupon = await stripe.coupons.create(couponParams);

    // Build promotion code params
    const promoParams: Parameters<typeof stripe.promotionCodes.create>[0] = {
      promotion: { type: "coupon", coupon: coupon.id },
      code: code.toUpperCase(),
      ...(maxRedemptions ? { max_redemptions: Number(maxRedemptions) } : {}),
      ...(stripeCustomerId ? { customer: stripeCustomerId } : {}),
    };

    const promoCode = await stripe.promotionCodes.create(promoParams);

    return NextResponse.json({ ok: true, data: { promoCode } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ ok: false, error: { code: "STRIPE_ERROR", message } }, { status: 500 });
  }
}

// ── DELETE — permanently delete a promotion code + its coupon ─────────────────

export async function DELETE(req: NextRequest) {
  const user = await requireAdmin();
  if (!user) {
    return NextResponse.json({ ok: false, error: { code: "FORBIDDEN", message: "Admin only" } }, { status: 403 });
  }

  try {
    const { promoId } = await req.json();
    if (!promoId) {
      return NextResponse.json({ ok: false, error: { code: "VALIDATION_ERROR", message: "promoId required" } }, { status: 400 });
    }

    // Retrieve the promo code to get the underlying coupon ID
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pc = await stripe.promotionCodes.retrieve(promoId) as any;
    const rawCoupon = pc.coupon;
    const couponId = typeof rawCoupon === "string" ? rawCoupon : rawCoupon.id;

    // Deleting the coupon permanently removes both the coupon and this promo code from Stripe
    await stripe.coupons.del(couponId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ ok: false, error: { code: "STRIPE_ERROR", message } }, { status: 500 });
  }
}
