import { NextRequest, NextResponse } from "next/server";
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

// ── POST — admin sets a time quote on a request ───────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { quoted_minutes } = body as { quoted_minutes?: number };

  if (!quoted_minutes || quoted_minutes < 1) {
    return NextResponse.json({ ok: false, error: "quoted_minutes must be a positive integer." }, { status: 400 });
  }

  const db: DB = createSupabaseAdminClient();

  const { data: request } = await db
    .from("update_requests")
    .select("id, status")
    .eq("id", id)
    .single();

  if (!request) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const { data: updated, error } = await db
    .from("update_requests")
    .update({ status: "quoted", quoted_minutes, quoted_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, data: updated });
}
