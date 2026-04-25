import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/supabase-server";
import { sendEmail, adminUserDeletionEmail } from "@/lib/services/email.service";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

function err(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

async function triggerDaBackup(username: string): Promise<{ triggered: boolean; detail: string }> {
  const host = process.env.DREAMIT_SERVER_HOST;
  const port = process.env.DREAMIT_SERVER_PORT ?? "2222";
  const resUser = process.env.DREAMIT_RESELLER_USER;
  const resPass = process.env.DREAMIT_RESELLER_PASS;

  if (!host || !resUser || !resPass) return { triggered: false, detail: "DA credentials not configured" };

  const basicAuth = Buffer.from(`${resUser}:${resPass}`).toString("base64");
  const payload = new URLSearchParams({
    action: "backup",
    username,
    select0: "domain",
    select1: "subdomain",
    select2: "email",
    select3: "database",
    select4: "ftp",
  });

  try {
    const res = await fetch(`https://${host}:${port}/CMD_API_SITE_BACKUP`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: payload.toString(),
    });
    const text = await res.text();
    const parsed = Object.fromEntries(new URLSearchParams(text));
    if (parsed.error === "0") {
      return { triggered: true, detail: `Backup file created in /home/${username}/backups/` };
    }
    return { triggered: false, detail: parsed.details ?? parsed.text ?? text };
  } catch (e) {
    return { triggered: false, detail: e instanceof Error ? e.message : "Unknown error" };
  }
}

async function deleteDaUser(username: string): Promise<void> {
  const host = process.env.DREAMIT_SERVER_HOST;
  const port = process.env.DREAMIT_SERVER_PORT ?? "2222";
  const resUser = process.env.DREAMIT_RESELLER_USER;
  const resPass = process.env.DREAMIT_RESELLER_PASS;

  if (!host || !resUser || !resPass) return;

  const basicAuth = Buffer.from(`${resUser}:${resPass}`).toString("base64");
  const payload = new URLSearchParams({
    action: "delete",
    confirmed: "yes",
    select0: username,
  });

  try {
    await fetch(`https://${host}:${port}/CMD_API_SELECT_USERS`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: payload.toString(),
    });
  } catch (e) {
    console.error("[DA] Failed to delete user:", e);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return err("UNAUTHORIZED", "Not authenticated", 401);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createSupabaseAdminClient() as any;

  const { data: adminProfile } = await db
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (adminProfile?.role !== "admin") return err("FORBIDDEN", "Admin only", 403);

  // Gather all data before deletion for the backup export
  const [profileRes, siteRes, subRes, ticketsRes] = await Promise.all([
    db.from("profiles").select("*").eq("id", userId).maybeSingle(),
    db.from("sites").select("*").eq("owner_id", userId).maybeSingle(),
    db.from("subscriptions").select("*").eq("owner_id", userId).maybeSingle(),
    db.from("update_requests").select("*").eq("owner_id", userId),
  ]);

  let userEmail = "";
  try {
    const { data: { user: authUser } } = await db.auth.admin.getUserById(userId);
    userEmail = authUser?.email ?? "";
  } catch { /* no-op */ }

  const profile = profileRes.data;
  const site = siteRes.data;
  const subscription = subRes.data;
  const tickets = ticketsRes.data ?? [];

  // Trigger DA backup (best-effort, before deleting the account)
  let backupStatus = { triggered: false, detail: "No DirectAdmin account on record" };
  if (site?.hosting_username) {
    backupStatus = await triggerDaBackup(site.hosting_username);
  }

  // Build data export
  const exportData = {
    exported_at: new Date().toISOString(),
    user: { id: userId, email: userEmail, ...profile },
    site,
    subscription,
    tickets,
    directadmin_backup: backupStatus,
  };

  // Send backup notification email
  const backupEmail = process.env.BACKUP_NOTIFICATION_EMAIL;
  if (backupEmail) {
    const emailContent = adminUserDeletionEmail({
      userEmail,
      domain: site?.domain ?? "N/A",
      daUsername: site?.hosting_username ?? "N/A",
      backupTriggered: backupStatus.triggered,
      backupDetail: backupStatus.detail,
      panelHost: process.env.DREAMIT_SERVER_HOST ?? "",
      panelPort: process.env.DREAMIT_SERVER_PORT ?? "2222",
    });
    await sendEmail({
      to: backupEmail,
      subject: emailContent.subject,
      html: emailContent.html,
      attachments: [
        {
          filename: `user_export_${userId.slice(0, 8)}.json`,
          content: Buffer.from(JSON.stringify(exportData, null, 2)),
          contentType: "application/json",
        },
      ],
    });
  }

  // Cancel Stripe subscription (hard cancel, not at period end)
  if (subscription?.stripe_subscription_id) {
    try {
      await stripe.subscriptions.cancel(subscription.stripe_subscription_id);
    } catch (e) {
      console.error("[Stripe] Failed to cancel subscription:", e);
    }
  }

  // Delete DA hosting account (best-effort, after backup)
  if (site?.hosting_username) {
    await deleteDaUser(site.hosting_username);
  }

  // Delete auth user — cascades to profiles, sites, subscriptions, update_requests
  const { error: deleteErr } = await db.auth.admin.deleteUser(userId);
  if (deleteErr) return err("DB_ERROR", deleteErr.message, 500);

  return NextResponse.json({ ok: true });
}
