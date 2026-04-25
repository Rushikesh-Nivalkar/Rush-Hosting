import { redirect } from "next/navigation";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/supabase-server";
import { SettingsClient } from "./SettingsClient";

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const db = createSupabaseAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbAny = db as any;

  const [profileRes, subRes] = await Promise.all([
    dbAny
      .from("profiles")
      .select("full_name, company_name, role, phone, address_line1, address_line2, suburb, state, postcode")
      .eq("id", user.id)
      .single(),
    dbAny
      .from("subscriptions")
      .select("stripe_subscription_id, plan_name, status, amount_aud, current_period_end, cancel_at_period_end")
      .eq("owner_id", user.id)
      .single(),
  ]);

  const profile = profileRes.data as {
    full_name: string | null;
    company_name: string | null;
    role: string;
    phone: string | null;
    address_line1: string | null;
    address_line2: string | null;
    suburb: string | null;
    state: string | null;
    postcode: string | null;
  } | null;

  const subscription = subRes.data as {
    stripe_subscription_id: string | null;
    plan_name: string | null;
    status: string;
    amount_aud: number | null;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
  } | null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Settings</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">Manage your account details and subscription.</p>
      </div>

      <SettingsClient
        userId={user.id}
        email={user.email ?? ""}
        profile={profile}
        subscription={subscription}
        role={profile?.role ?? "client"}
      />
    </div>
  );
}
