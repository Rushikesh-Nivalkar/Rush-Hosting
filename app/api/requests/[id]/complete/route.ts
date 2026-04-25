import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/supabase-server";
import { getSubscriptionBuckets, deductFromBuckets } from "@/lib/time-buckets";
import { sendEmail, requestCompletedEmail, ADMIN_EMAIL } from "@/lib/services/email.service";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = any;

// ── POST — customer marks request complete: deduct time → email → delete ──────

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorised" }, { status: 401 });

  const { id } = await params;
  const db: DB = createSupabaseAdminClient();

  const { data: request } = await db
    .from("update_requests")
    .select("id, owner_id, title, description, status, admin_notes, quoted_minutes")
    .eq("id", id)
    .single();

  if (!request) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  if (request.owner_id !== user.id) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  if (request.status !== "done_pending_review") {
    return NextResponse.json({ ok: false, error: "Request is not ready for completion." }, { status: 400 });
  }

  // Get current buckets (applies lazy weekly reset)
  const buckets = await getSubscriptionBuckets(user.id, db);
  if (!buckets) return NextResponse.json({ ok: false, error: "No subscription found." }, { status: 400 });

  // Deduct time
  const minutesCharged = request.quoted_minutes ?? 0;
  const { lumpsum_minutes_used, weekly_minutes_used } = await deductFromBuckets(buckets, minutesCharged, db);

  const lumpsumRemaining = Math.max(0, buckets.lumpsum_minutes_total - lumpsum_minutes_used);
  const weeklyRemaining  = Math.max(0, buckets.weekly_minutes_total  - weekly_minutes_used);

  // Get customer email
  let customerEmail = "";
  try {
    const { data: { user: authUser } } = await db.auth.admin.getUserById(user.id);
    customerEmail = authUser?.email ?? "";
  } catch { /* skip */ }

  // Send completion email (BCC admin)
  if (customerEmail) {
    const { subject, html } = requestCompletedEmail({
      customerEmail,
      requestTitle:       request.title,
      requestDescription: request.description,
      adminNotes:         request.admin_notes,
      minutesCharged,
      lumpsumRemaining,
      weeklyRemaining,
    });

    const bccList = ADMIN_EMAIL ? [ADMIN_EMAIL] : [];
    await sendEmail({
      to: customerEmail,
      subject,
      html,
      ...(bccList.length > 0 ? { bcc: bccList } : {}),
    });
  }

  // Hard delete the request record
  await db.from("update_requests").delete().eq("id", id);

  return NextResponse.json({
    ok: true,
    data: { minutes_charged: minutesCharged, lumpsum_remaining: lumpsumRemaining, weekly_remaining: weeklyRemaining },
  });
}
