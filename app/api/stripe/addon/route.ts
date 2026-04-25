import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/supabase-server";
import { stripe } from "@/lib/stripe/stripe-helpers";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function err(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

// Best-effort: enable or disable Acronis Backup for a DirectAdmin user.
// Errors are swallowed — Stripe is the billing source of truth; a DA failure
// means admin needs to toggle backup manually in the DreamIT panel.
async function toggleAcronisBackup(username: string, enable: boolean): Promise<void> {
  const serverHost = process.env.DREAMIT_SERVER_HOST;
  const serverPort = process.env.DREAMIT_SERVER_PORT ?? "2222";
  const resUser    = process.env.DREAMIT_RESELLER_USER;
  const resPass    = process.env.DREAMIT_RESELLER_PASS;
  if (!serverHost || !resUser || !resPass) return;

  const basicAuth = Buffer.from(`${resUser}:${resPass}`).toString("base64");
  // CMD_API_MODIFY_USER: set the "backup" feature flag for the account.
  // Verify the exact parameter name with DreamIT / DirectAdmin Acronis docs.
  const payload = new URLSearchParams({
    action:  "modify",
    username,
    backup:  enable ? "ON" : "OFF",
  });

  try {
    await fetch(`https://${serverHost}:${serverPort}/CMD_API_MODIFY_USER`, {
      method:  "POST",
      headers: {
        Authorization:  `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: payload.toString(),
    });
  } catch {
    // DA unreachable — admin must enable manually
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return err("UNAUTHORIZED", "Not authenticated", 401);

  const body = await req.json().catch(() => ({}));
  const action: unknown = body.action;
  if (action !== "enable" && action !== "disable") {
    return err("INVALID_ACTION", "action must be 'enable' or 'disable'", 400);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createSupabaseAdminClient() as any;

  const { data: sub } = await db
    .from("subscriptions")
    .select("stripe_subscription_id, backup_addon_stripe_item_id")
    .eq("owner_id", user.id)
    .single();

  if (!sub?.stripe_subscription_id) {
    return err("NO_SUBSCRIPTION", "No active subscription found.", 400);
  }

  const { data: site } = await db
    .from("sites")
    .select("hosting_username")
    .eq("owner_id", user.id)
    .maybeSingle();

  try {
    if (action === "enable") {
      if (sub.backup_addon_stripe_item_id) {
        return err("ALREADY_ENABLED", "Managed Backup is already active.", 409);
      }

      const priceId = process.env.STRIPE_BACKUP_PRICE_ID;
      if (!priceId) {
        return err(
          "NOT_CONFIGURED",
          "Managed Backup is not yet available. Please contact support.",
          503,
        );
      }

      const item = await stripe.subscriptionItems.create({
        subscription: sub.stripe_subscription_id,
        price:        priceId,
        quantity:     1,
      });

      // Enable Acronis on DirectAdmin (best-effort)
      if (site?.hosting_username) {
        await toggleAcronisBackup(site.hosting_username, true);
      }

      await db.from("subscriptions")
        .update({ backup_addon_stripe_item_id: item.id })
        .eq("owner_id", user.id);

      if (site) {
        await db.from("sites")
          .update({ backup_enabled: true })
          .eq("owner_id", user.id);
      }

      return NextResponse.json({ ok: true, data: { enabled: true } });
    } else {
      if (!sub.backup_addon_stripe_item_id) {
        return err("NOT_ENABLED", "Managed Backup is not active.", 409);
      }

      await stripe.subscriptionItems.del(sub.backup_addon_stripe_item_id, {
        proration_behavior: "always_invoice",
      });

      // Disable Acronis on DirectAdmin (best-effort)
      if (site?.hosting_username) {
        await toggleAcronisBackup(site.hosting_username, false);
      }

      await db.from("subscriptions")
        .update({ backup_addon_stripe_item_id: null })
        .eq("owner_id", user.id);

      if (site) {
        await db.from("sites")
          .update({ backup_enabled: false })
          .eq("owner_id", user.id);
      }

      return NextResponse.json({ ok: true, data: { enabled: false } });
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return err("STRIPE_ERROR", message, 500);
  }
}
