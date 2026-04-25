import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/supabase-server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = any;

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: { code: "UNAUTHORISED" } }, { status: 401 });
  }

  const db: DB = createSupabaseAdminClient();
  const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ ok: false, error: { code: "FORBIDDEN" } }, { status: 403 });
  }

  const { data: profiles } = await db
    .from("profiles")
    .select("id, full_name")
    .eq("role", "client");

  // Fetch emails from auth admin
  let emailMap = new Map<string, string>();
  try {
    const { data: { users } } = await db.auth.admin.listUsers();
    emailMap = new Map(users.map((u: { id: string; email: string }) => [u.id, u.email ?? ""]));
  } catch { /* auth admin unavailable */ }

  const clients = (profiles ?? []).map((p: { id: string; full_name: string | null }) => ({
    id: p.id,
    full_name: p.full_name,
    email: emailMap.get(p.id) ?? p.id.slice(0, 8) + "…",
  }));

  return NextResponse.json({ ok: true, data: clients });
}
