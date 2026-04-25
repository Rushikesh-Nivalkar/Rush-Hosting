import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/supabase-server";
import { PLAN_ORDER, type PlanId } from "@/constants/plans";
import { randomUUID } from "crypto";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = any;

// ── POST /api/admin/onboarding — create an onboarding link ────────────────────

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: "UNAUTHORISED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const db: DB = createSupabaseAdminClient();
  const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") {
    return NextResponse.json(
      { ok: false, error: { code: "FORBIDDEN", message: "Admin access required" } },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const { email, minimum_plan, promo_code, custom_plan_id } = body as {
    email?: string;
    minimum_plan?: string;
    promo_code?: string;
    custom_plan_id?: string;
  };

  if (!email || !email.includes("@")) {
    return NextResponse.json(
      { ok: false, error: { code: "INVALID_EMAIL", message: "Valid email is required" } },
      { status: 400 }
    );
  }

  // Either a custom plan or a valid standard minimum_plan is required
  if (!custom_plan_id) {
    if (!minimum_plan || !PLAN_ORDER.includes(minimum_plan as PlanId)) {
      return NextResponse.json(
        { ok: false, error: { code: "INVALID_PLAN", message: "A minimum plan or custom package is required" } },
        { status: 400 }
      );
    }
  } else {
    // Validate custom plan exists
    const { data: cp } = await db.from("custom_plans").select("id").eq("id", custom_plan_id).single();
    if (!cp) {
      return NextResponse.json(
        { ok: false, error: { code: "INVALID_CUSTOM_PLAN", message: "Custom plan not found" } },
        { status: 400 }
      );
    }
  }

  const token = randomUUID().replace(/-/g, "");
  const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await db.from("onboarding_links").insert({
    token,
    email: email.toLowerCase().trim(),
    minimum_plan: custom_plan_id ? null : minimum_plan,
    promo_code: promo_code?.trim() || null,
    custom_plan_id: custom_plan_id || null,
    expires_at,
    created_by: user.id,
  });

  if (error) {
    return NextResponse.json(
      { ok: false, error: { code: "DB_ERROR", message: error.message } },
      { status: 500 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const onboarding_url = `${appUrl}/onboard?token=${token}`;

  return NextResponse.json({ ok: true, data: { onboarding_url, token, expires_at } });
}

// ── GET /api/admin/onboarding — list recent links ─────────────────────────────

export async function GET(_req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: { code: "UNAUTHORISED" } }, { status: 401 });
  }

  const db: DB = createSupabaseAdminClient();
  const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ ok: false, error: { code: "FORBIDDEN" } }, { status: 403 });
  }

  const { data: links } = await db
    .from("onboarding_links")
    .select("id, token, email, minimum_plan, promo_code, custom_plan_id, expires_at, used, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  return NextResponse.json({ ok: true, data: links ?? [] });
}
