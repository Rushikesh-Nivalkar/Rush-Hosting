import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/supabase-server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = any;

// ── POST — customer accepts admin's quote ─────────────────────────────────────

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorised" }, { status: 401 });

  const { id } = await params;
  const db: DB = createSupabaseAdminClient();

  const { data: request } = await db
    .from("update_requests")
    .select("id, owner_id, status")
    .eq("id", id)
    .single();

  if (!request) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  if (request.owner_id !== user.id) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  if (request.status !== "quoted") {
    return NextResponse.json({ ok: false, error: "Request is not in quoted status." }, { status: 400 });
  }

  const { data: updated, error } = await db
    .from("update_requests")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, data: updated });
}
