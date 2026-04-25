import { redirect } from "next/navigation";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/supabase-server";
import { getSubscriptionBuckets } from "@/lib/time-buckets";
import { UpdatesClient } from "./UpdatesClient";

export default async function UpdatesPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createSupabaseAdminClient() as any;

  const [buckets, { data: requests }] = await Promise.all([
    getSubscriptionBuckets(user.id, db),
    db
      .from("update_requests")
      .select("id, title, description, priority, status, admin_notes, quoted_minutes, created_at, quoted_at, accepted_at, done_at")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const hasTimeBucket = buckets && (buckets.lumpsum_minutes_total > 0 || buckets.weekly_minutes_total > 0);

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Website Updates</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Submit change requests, track progress, and manage your support time.
        </p>
      </div>

      <UpdatesClient
        initialRequests={requests ?? []}
        buckets={buckets}
        hasTimeBucket={!!hasTimeBucket}
      />
    </div>
  );
}
