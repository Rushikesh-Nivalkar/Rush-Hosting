import { createSupabaseAdminClient } from "@/lib/supabase/supabase-server";
import { ClientsView, type ClientRow } from "./ClientsView";

export default async function ClientsPage() {
  const db = createSupabaseAdminClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  // Fetch all client profiles
  const { data: profiles } = await db
    .from("profiles")
    .select("id, full_name, created_at")
    .eq("role", "client");

  // Fetch all subscriptions (to determine active status + plan)
  const { data: subscriptions } = await db
    .from("subscriptions")
    .select("owner_id, plan_name, status");

  // Fetch emails from Supabase Auth (service role required)
  let emailMap = new Map<string, string>();
  try {
    const { data: { users } } = await db.auth.admin.listUsers({ perPage: 1000 });
    emailMap = new Map(users.map((u: { id: string; email?: string }) => [u.id, u.email ?? ""]));
  } catch { /* silently skip if unavailable */ }

  type SubInfo = { plan_name: string | null; status: string };
  const subMap = new Map<string, SubInfo>(
    (subscriptions ?? []).map((s: { owner_id: string; plan_name: string | null; status: string }) => [
      s.owner_id,
      { plan_name: s.plan_name, status: s.status },
    ])
  );

  const ACTIVE_STATUSES = new Set(["active", "trialing"]);

  const active: ClientRow[] = [];
  const inactive: ClientRow[] = [];

  for (const p of profiles ?? []) {
    const sub = subMap.get(p.id);
    const row: ClientRow = {
      id: p.id,
      full_name: p.full_name,
      email: emailMap.get(p.id) ?? "—",
      plan_name: sub?.plan_name ?? null,
      status: sub?.status ?? null,
      joined: p.created_at,
    };

    if (sub && ACTIVE_STATUSES.has(sub.status)) {
      active.push(row);
    } else {
      inactive.push(row);
    }
  }

  // Sort by join date descending
  const byDate = (a: ClientRow, b: ClientRow) =>
    new Date(b.joined).getTime() - new Date(a.joined).getTime();
  active.sort(byDate);
  inactive.sort(byDate);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Clients</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          {active.length + inactive.length} total accounts —{" "}
          {active.length} active, {inactive.length} not subscribed.
        </p>
      </div>

      <ClientsView active={active} inactive={inactive} />
    </div>
  );
}
