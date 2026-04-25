import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/supabase-server";
import { stripe } from "@/lib/stripe/stripe-helpers";

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

// ── GET — list all custom plans ───────────────────────────────────────────────

export async function GET() {
  const user = await requireAdmin();
  if (!user) {
    return NextResponse.json({ ok: false, error: { code: "FORBIDDEN" } }, { status: 403 });
  }

  const db: DB = createSupabaseAdminClient();
  const { data: plans } = await db
    .from("custom_plans")
    .select("id, name, description, price_aud, features, stripe_price_id, stripe_product_id, created_for, created_at")
    .order("created_at", { ascending: false });

  return NextResponse.json({ ok: true, data: plans ?? [] });
}

// ── POST — create a custom plan (Stripe product + price + DB record) ──────────

export async function POST(req: NextRequest) {
  const user = await requireAdmin();
  if (!user) {
    return NextResponse.json({ ok: false, error: { code: "FORBIDDEN" } }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, description, price_aud, features, created_for, lumpsum_minutes, weekly_minutes } = body as {
      name?: string;
      description?: string;
      price_aud?: number;         // AUD cents
      features?: string[];
      created_for?: string;       // profile UUID
      lumpsum_minutes?: number;   // initial support bucket in minutes
      weekly_minutes?: number;    // weekly recurring minutes
    };

    if (!name?.trim()) {
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION_ERROR", message: "Package name is required" } },
        { status: 400 }
      );
    }
    if (!price_aud || price_aud < 100) {
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION_ERROR", message: "Price must be at least A$1" } },
        { status: 400 }
      );
    }

    // Create Stripe product
    const product = await stripe.products.create({
      name: name.trim(),
      ...(description ? { description: description.trim() } : {}),
      metadata: { source: "rushhosting_custom" },
    });

    // Create recurring monthly price in AUD
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: price_aud,
      currency: "aud",
      recurring: { interval: "month" },
    });

    // Save to DB
    const db: DB = createSupabaseAdminClient();
    const { data: plan, error } = await db
      .from("custom_plans")
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        price_aud,
        features: features ?? [],
        stripe_product_id: product.id,
        stripe_price_id: price.id,
        created_for: created_for || null,
        created_by: user.id,
        lumpsum_minutes: lumpsum_minutes ?? 0,
        weekly_minutes:  weekly_minutes  ?? 0,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: { code: "DB_ERROR", message: error.message } },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, data: plan });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json(
      { ok: false, error: { code: "STRIPE_ERROR", message } },
      { status: 500 }
    );
  }
}
