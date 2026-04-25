import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/supabase-server";

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

// ── GET — all requests FIFO (oldest first) ────────────────────────────────────

export async function GET() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const db: DB = createSupabaseAdminClient();

  const { data: requests } = await db
    .from("update_requests")
    .select("id, owner_id, title, description, priority, status, admin_notes, quoted_minutes, created_at, quoted_at, accepted_at, done_at")
    .order("created_at", { ascending: true });

  if (!requests?.length) return NextResponse.json({ ok: true, data: [] });

  // Resolve owner emails
  let emailMap = new Map<string, string>();
  try {
    const { data: { users } } = await db.auth.admin.listUsers({ perPage: 1000 });
    emailMap = new Map((users as { id: string; email?: string }[]).map((u) => [u.id, u.email ?? "—"]));
  } catch { /* skip */ }

  const enriched = requests.map((r: { owner_id: string; [key: string]: unknown }) => ({
    ...r,
    owner_email: emailMap.get(r.owner_id) ?? "—",
  }));

  return NextResponse.json({ ok: true, data: enriched });
}
