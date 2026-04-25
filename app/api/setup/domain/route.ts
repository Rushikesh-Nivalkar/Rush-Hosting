import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/supabase-server";
import { sendEmail, adminNewSiteEmail, ADMIN_EMAIL } from "@/lib/services/email.service";

const DOMAIN_RE = /^(?!-)([a-z0-9-]{1,63}\.)+[a-z]{2,}$/i;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function err(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return err("UNAUTHORIZED", "Not authenticated", 401);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createSupabaseAdminClient() as any;

  const { data: existing } = await db
    .from("sites")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (existing) return err("SITE_EXISTS", "You already have a hosting account set up.", 409);

  const body = await req.json().catch(() => ({}));
  const rawDomain = (body.domain ?? "")
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split("/")[0];

  if (!rawDomain || !DOMAIN_RE.test(rawDomain)) {
    return err("INVALID_DOMAIN", "Please enter a valid domain name (e.g. example.com.au)", 400);
  }

  const { data: sub } = await db
    .from("subscriptions")
    .select("plan_name")
    .eq("owner_id", user.id)
    .maybeSingle();

  const { error: dbErr } = await db.from("sites").insert({
    owner_id: user.id,
    domain:   rawDomain,
    status:   "pending",
    plan_name: sub?.plan_name ?? null,
  });
  if (dbErr) return err("DB_ERROR", dbErr.message, 500);

  if (ADMIN_EMAIL) {
    const mail = adminNewSiteEmail({ customerEmail: user.email!, domain: rawDomain });
    await sendEmail({ to: ADMIN_EMAIL, subject: mail.subject, html: mail.html });
  }

  return NextResponse.json({ ok: true, data: { domain: rawDomain } });
}
