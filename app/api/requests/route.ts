import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/supabase-server";
import { getSubscriptionBuckets } from "@/lib/time-buckets";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = any;

async function getAuthUser() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// ── GET — list customer's requests + time bucket data ─────────────────────────

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorised" }, { status: 401 });

  const db: DB = createSupabaseAdminClient();

  const [buckets, { data: requests }] = await Promise.all([
    getSubscriptionBuckets(user.id, db),
    db
      .from("update_requests")
      .select("id, title, description, priority, status, admin_notes, quoted_minutes, created_at, quoted_at, accepted_at, done_at")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  return NextResponse.json({ ok: true, data: { buckets, requests: requests ?? [] } });
}

// ── POST — submit a new request ───────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorised" }, { status: 401 });

  const db: DB = createSupabaseAdminClient();

  // Only plans with time buckets can submit requests
  const buckets = await getSubscriptionBuckets(user.id, db);
  if (!buckets || (buckets.lumpsum_minutes_total === 0 && buckets.weekly_minutes_total === 0)) {
    return NextResponse.json(
      { ok: false, error: "Your current plan does not include website change requests." },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const { title, description, priority } = body as {
    title?: string;
    description?: string;
    priority?: string;
  };

  if (!title?.trim()) {
    return NextResponse.json({ ok: false, error: "Title is required." }, { status: 400 });
  }

  const validPriorities = ["urgent", "high", "medium", "low"];
  const safePriority = validPriorities.includes(priority ?? "") ? priority : "medium";

  const { data: request, error } = await db
    .from("update_requests")
    .insert({
      owner_id:    user.id,
      title:       title.trim(),
      description: description?.trim() || null,
      priority:    safePriority,
      status:      "open",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: request }, { status: 201 });
}
