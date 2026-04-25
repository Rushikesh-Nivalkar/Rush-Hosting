import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHORISED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const [{ data: sites }, { data: subscription }] =
      await Promise.all([
        supabase.from("sites")
          .select("id, domain, status, plan_name, renewal_date")
          .eq("owner_id", user.id) as unknown as Promise<{ data: unknown }>,
        supabase.from("subscriptions")
          .select("plan_name, status, amount_aud, current_period_end, cancel_at_period_end")
          .eq("owner_id", user.id)
          .single() as unknown as Promise<{ data: unknown }>,
      ]);

    return NextResponse.json({
      ok: true,
      data: { site: (sites as unknown[])?.[0] ?? null, subscription },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json(
      { ok: false, error: { code: "SERVER_ERROR", message } },
      { status: 500 }
    );
  }
}
