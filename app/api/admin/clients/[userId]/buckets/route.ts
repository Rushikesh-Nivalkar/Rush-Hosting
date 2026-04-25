import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/supabase-server";

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

// ── PATCH — set time bucket totals for an existing subscriber ─────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const { userId } = await params;
  const body = await req.json().catch(() => ({}));
  const { lumpsum_minutes_total, weekly_minutes_total } = body as {
    lumpsum_minutes_total?: number;
    weekly_minutes_total?: number;
  };

  if (lumpsum_minutes_total === undefined && weekly_minutes_total === undefined) {
    return NextResponse.json({ ok: false, error: "Nothing to update." }, { status: 400 });
  }
  if (lumpsum_minutes_total !== undefined && lumpsum_minutes_total < 0) {
    return NextResponse.json({ ok: false, error: "lumpsum_minutes_total cannot be negative." }, { status: 400 });
  }
  if (weekly_minutes_total !== undefined && weekly_minutes_total < 0) {
    return NextResponse.json({ ok: false, error: "weekly_minutes_total cannot be negative." }, { status: 400 });
  }

  const db: DB = createSupabaseAdminClient();

  // Verify subscription exists for this user
  const { data: sub } = await db
    .from("subscriptions")
    .select("id, status")
    .eq("owner_id", userId)
    .single();

  if (!sub) {
    return NextResponse.json({ ok: false, error: "No subscription found for this user." }, { status: 404 });
  }

  const update: Record<string, number> = {};
  if (lumpsum_minutes_total !== undefined) update.lumpsum_minutes_total = lumpsum_minutes_total;
  if (weekly_minutes_total  !== undefined) update.weekly_minutes_total  = weekly_minutes_total;

  const { data: updated, error } = await db
    .from("subscriptions")
    .update(update)
    .eq("owner_id", userId)
    .select("lumpsum_minutes_total, lumpsum_minutes_used, weekly_minutes_total, weekly_minutes_used")
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, data: updated });
}
