import { createSupabaseAdminClient } from "@/lib/supabase/supabase-server";
import { RequestsAdmin } from "./RequestsAdmin";

type RequestRow = {
  id: string;
  owner_id: string;
  owner_email: string;
  title: string;
  description: string | null;
  priority: "urgent" | "high" | "medium" | "low";
  status: string;
  admin_notes: string | null;
  quoted_minutes: number | null;
  created_at: string;
  quoted_at: string | null;
  accepted_at: string | null;
  done_at: string | null;
};

export default async function RequestsPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createSupabaseAdminClient() as any;

  const { data: rawRequests } = await db
    .from("update_requests")
    .select("id, owner_id, title, description, priority, status, admin_notes, quoted_minutes, created_at, quoted_at, accepted_at, done_at")
    .order("created_at", { ascending: true });

  let emailMap = new Map<string, string>();
  try {
    const { data: { users } } = await db.auth.admin.listUsers({ perPage: 1000 });
    emailMap = new Map(
      (users as { id: string; email?: string }[]).map((u) => [u.id, u.email ?? "—"])
    );
  } catch { /* skip */ }

  const requests: RequestRow[] = (rawRequests ?? []).map((r: Omit<RequestRow, "owner_email">) => ({
    ...r,
    owner_email: emailMap.get(r.owner_id) ?? "—",
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Change Requests</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Customer requests in order received — oldest first.
        </p>
      </div>
      <RequestsAdmin initialRequests={requests} />
    </div>
  );
}
