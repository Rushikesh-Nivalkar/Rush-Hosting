import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/supabase-server";
import { sendEmail, requestReadyEmail } from "@/lib/services/email.service";

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

// ── POST — admin marks work done, notifies customer ───────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { admin_notes } = body as { admin_notes?: string };

  const db: DB = createSupabaseAdminClient();

  const { data: request } = await db
    .from("update_requests")
    .select("id, owner_id, title, status")
    .eq("id", id)
    .single();

  if (!request) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  if (!["accepted", "in_progress", "open", "quoted"].includes(request.status)) {
    return NextResponse.json({ ok: false, error: "Cannot mark this request as done." }, { status: 400 });
  }

  const updatePayload: Record<string, unknown> = {
    status:  "done_pending_review",
    done_at: new Date().toISOString(),
  };
  if (admin_notes !== undefined) updatePayload.admin_notes = admin_notes.trim() || null;

  const { data: updated, error } = await db
    .from("update_requests")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  // Notify the customer by email
  try {
    const { data: { user: ownerAuth } } = await db.auth.admin.getUserById(request.owner_id);
    const ownerEmail = ownerAuth?.email;
    if (ownerEmail) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://rushhosting.au";
      const { subject, html } = requestReadyEmail({
        customerEmail: ownerEmail,
        requestTitle:  request.title,
        adminNotes:    admin_notes?.trim() || null,
        appUrl,
      });
      await sendEmail({ to: ownerEmail, subject, html });
    }
  } catch { /* non-fatal */ }

  return NextResponse.json({ ok: true, data: updated });
}
