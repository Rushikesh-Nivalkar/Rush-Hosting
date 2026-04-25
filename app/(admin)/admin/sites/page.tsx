import { createSupabaseAdminClient } from "@/lib/supabase/supabase-server";
import { SitesView, type SiteRow } from "./SitesView";

export default async function SitesPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createSupabaseAdminClient() as any;

  const { data: sites } = await db
    .from("sites")
    .select("id, domain, status, plan_name, owner_id, created_at")
    .order("created_at", { ascending: false });

  // Fetch customer emails from Auth
  let emailMap = new Map<string, string>();
  try {
    const { data: { users } } = await db.auth.admin.listUsers({ perPage: 1000 });
    emailMap = new Map(users.map((u: { id: string; email?: string }) => [u.id, u.email ?? ""]));
  } catch { /* skip */ }

  const rows: SiteRow[] = (sites ?? []).map((s: {
    id: string;
    domain: string;
    status: string;
    plan_name: string | null;
    owner_id: string;
    created_at: string;
  }) => ({
    id: s.id,
    domain: s.domain,
    status: s.status,
    plan_name: s.plan_name,
    customer_email: emailMap.get(s.owner_id) ?? "—",
    created_at: s.created_at,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Sites</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          {rows.length} site{rows.length !== 1 ? "s" : ""} — manage hosting accounts and send credentials.
        </p>
      </div>
      <SitesView sites={rows} />
    </div>
  );
}
