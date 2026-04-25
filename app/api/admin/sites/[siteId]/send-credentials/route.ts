import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/supabase-server";
import { sendEmail, hostingWelcomeEmail } from "@/lib/services/email.service";

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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false, error: { code: "FORBIDDEN" } }, { status: 403 });
  }

  const { siteId } = await params;
  const body = await req.json().catch(() => ({}));
  const password: string = (body.password ?? "").trim();

  if (!password) {
    return NextResponse.json(
      { ok: false, error: { code: "MISSING_PASSWORD", message: "Password is required." } },
      { status: 400 }
    );
  }

  const db: DB = createSupabaseAdminClient();

  const { data: site } = await db
    .from("sites")
    .select("id, domain, hosting_username, owner_id")
    .eq("id", siteId)
    .single();

  if (!site) {
    return NextResponse.json(
      { ok: false, error: { code: "NOT_FOUND", message: "Site not found." } },
      { status: 404 }
    );
  }

  if (!site.hosting_username) {
    return NextResponse.json(
      { ok: false, error: { code: "NO_USERNAME", message: "This site has no hosting username yet." } },
      { status: 400 }
    );
  }

  // Get customer email from Auth
  const { data: { user: customerUser } } = await db.auth.admin.getUserById(site.owner_id);
  const customerEmail = customerUser?.email;

  if (!customerEmail) {
    return NextResponse.json(
      { ok: false, error: { code: "NO_EMAIL", message: "Could not find customer email." } },
      { status: 400 }
    );
  }

  const userName = customerEmail.split("@")[0];
  const email = hostingWelcomeEmail({
    userName,
    domain: site.domain,
    hostingUsername: site.hosting_username,
    hostingPassword: password,
    panelHost: process.env.DREAMIT_SERVER_HOST ?? "",
    panelPort: process.env.DREAMIT_SERVER_PORT ?? "2222",
    ns1: process.env.DREAMIT_NS1 ?? "",
    ns2: process.env.DREAMIT_NS2 ?? "",
  });

  await sendEmail({ to: customerEmail, subject: email.subject, html: email.html });

  // Update stored password and mark site active
  await db
    .from("sites")
    .update({ hosting_password: password, status: "active" })
    .eq("id", siteId);

  return NextResponse.json({ ok: true });
}
