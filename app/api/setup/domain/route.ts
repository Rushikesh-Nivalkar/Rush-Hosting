import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/supabase-server";
import { sendEmail, nameserverSetupEmail, hostingWelcomeEmail, adminNewSiteEmail, ADMIN_EMAIL } from "@/lib/services/email.service";
import { randomBytes } from "crypto";

// Basic domain format: e.g. example.com, my-site.com.au, sub.domain.io
const DOMAIN_RE = /^(?!-)([a-z0-9-]{1,63}\.)+[a-z]{2,}$/i;

function generateUsername(email: string): string {
  const base = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
  // Must start with a letter
  const alpha = /^[a-z]/.test(base) ? base : "h" + base;
  // DirectAdmin: 2–10 chars, alphanumeric only
  return alpha.slice(0, 10).padEnd(2, "x");
}

function generatePassword(): string {
  return randomBytes(10).toString("base64url").slice(0, 14);
}

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

  // Prevent duplicate site creation
  const { data: existing } = await db
    .from("sites")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (existing) {
    return err("SITE_EXISTS", "You already have a hosting account set up.", 409);
  }

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

  const serverHost  = process.env.DREAMIT_SERVER_HOST;
  const serverPort  = process.env.DREAMIT_SERVER_PORT ?? "2222";
  const resUser     = process.env.DREAMIT_RESELLER_USER;
  const resPass     = process.env.DREAMIT_RESELLER_PASS;
  const ns1         = process.env.DREAMIT_NS1 ?? null;
  const ns2         = process.env.DREAMIT_NS2 ?? null;

  // Pick the DirectAdmin package that matches the customer's plan
  const planName = (sub?.plan_name ?? "").toLowerCase();
  const pkg = planName.includes("advanced")
    ? (process.env.DREAMIT_PACKAGE_ADVANCED ?? "ADVANCED_WEBSITE")
    : planName.includes("basic")
    ? (process.env.DREAMIT_PACKAGE_BASIC ?? "BASIC_WEBSITE")
    : (process.env.DREAMIT_PACKAGE_HOSTING ?? "HOSTING_ONLY");

  // DreamIT not yet configured — save pending site for manual admin provisioning
  if (!serverHost || !resUser || !resPass) {
    const { error: dbErr } = await db.from("sites").insert({
      owner_id: user.id,
      domain: rawDomain,
      status: "pending",
      plan_name: sub?.plan_name ?? null,
    });
    if (dbErr) return err("DB_ERROR", dbErr.message, 500);

    const userName = user.email?.split("@")[0] ?? "there";

    if (ns1 && ns2) {
      const nsEmail = nameserverSetupEmail({ userName, domain: rawDomain, ns1, ns2 });
      await sendEmail({ to: user.email!, subject: nsEmail.subject, html: nsEmail.html });
    }

    if (ADMIN_EMAIL) {
      const adminEmail = adminNewSiteEmail({ customerEmail: user.email!, domain: rawDomain });
      await sendEmail({ to: ADMIN_EMAIL, subject: adminEmail.subject, html: adminEmail.html });
    }

    return NextResponse.json({ ok: true, data: { domain: rawDomain, provisioned: false, ns1, ns2 } });
  }

  // Provision account on DirectAdmin
  const username = generateUsername(user.email ?? rawDomain);
  const tempPassword = generatePassword();
  const basicAuth = Buffer.from(`${resUser}:${resPass}`).toString("base64");

  const payload = new URLSearchParams({
    action:  "create",
    add:     "Submit",
    username,
    email:   user.email ?? `${username}@${rawDomain}`,
    passwd:  tempPassword,
    passwd2: tempPassword,
    domain:  rawDomain,
    package: pkg,
    ip:      "shared",
    notify:  "no",
  });

  try {
    const daRes = await fetch(
      `https://${serverHost}:${serverPort}/CMD_API_ACCOUNT_USER`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${basicAuth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: payload.toString(),
      }
    );

    const text = await daRes.text();
    const parsed = Object.fromEntries(new URLSearchParams(text));

    if (parsed.error !== "0") {
      throw new Error(parsed.details ?? parsed.text ?? text);
    }

    const { error: dbErr } = await db.from("sites").insert({
      owner_id: user.id,
      domain: rawDomain,
      status: "pending",
      plan_name: sub?.plan_name ?? null,
      hosting_username: username,
      hosting_password: tempPassword,
    });
    if (dbErr) throw new Error(dbErr.message);

    const welcomeEmail = hostingWelcomeEmail({
      userName: username,
      domain: rawDomain,
      hostingUsername: username,
      hostingPassword: tempPassword,
      panelHost: serverHost,
      panelPort: serverPort,
      ns1: ns1 ?? "",
      ns2: ns2 ?? "",
    });
    await sendEmail({ to: user.email!, subject: welcomeEmail.subject, html: welcomeEmail.html });

    if (ADMIN_EMAIL) {
      const adminEmail = adminNewSiteEmail({ customerEmail: user.email!, domain: rawDomain });
      await sendEmail({ to: ADMIN_EMAIL, subject: adminEmail.subject, html: adminEmail.html });
    }

    return NextResponse.json({
      ok: true,
      data: { domain: rawDomain, provisioned: true, ns1, ns2 },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return err("PROVISIONING_ERROR", message, 500);
  }
}
