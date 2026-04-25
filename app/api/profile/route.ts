import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/supabase-server";

const ALLOWED_FIELDS = [
  "full_name", "company_name", "phone",
  "address_line1", "address_line2", "suburb", "state", "postcode",
] as const;

export async function PATCH(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: "UNAUTHORISED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => ({}));

  // Only allow whitelisted fields — never let a client change their role
  const updates: Record<string, string | null> = {};
  for (const field of ALLOWED_FIELDS) {
    if (field in body) {
      updates[field] = body[field] ?? null;
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { ok: false, error: { code: "NO_FIELDS", message: "No valid fields provided" } },
      { status: 400 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createSupabaseAdminClient() as any;
  const { error } = await db.from("profiles").update(updates).eq("id", user.id);

  if (error) {
    return NextResponse.json(
      { ok: false, error: { code: "DB_ERROR", message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
