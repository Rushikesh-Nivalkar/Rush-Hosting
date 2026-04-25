import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/supabase-server";
import { sendEmail, siteActivatedEmail, ADMIN_EMAIL } from "@/lib/services/email.service";

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

// PATCH — mark a site as active and notify the customer
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false, error: { code: "FORBIDDEN" } }, { status: 403 });
  }

  const { siteId } = await params;
  const db: DB = createSupabaseAdminClient();

  const { data: site } = await db
    .from("sites")
    .select("id, domain, owner_id, status")
    .eq("id", siteId)
    .single();

  if (!site) {
    return NextResponse.json({ ok: false, error: { code: "NOT_FOUND" } }, { status: 404 });
  }

  await db.from("sites").update({ status: "active" }).eq("id", siteId);

  // Notify the customer their site is live
  try {
    const { data: { user: customerUser } } = await db.auth.admin.getUserById(site.owner_id);
    const customerEmail = customerUser?.email;
    if (customerEmail) {
      const mail = siteActivatedEmail({ domain: site.domain, customerEmail });
      await sendEmail({ to: customerEmail, subject: mail.subject, html: mail.html, bcc: ADMIN_EMAIL ? [ADMIN_EMAIL] : [] });
    }
  } catch { /* non-fatal */ }

  return NextResponse.json({ ok: true });
}
