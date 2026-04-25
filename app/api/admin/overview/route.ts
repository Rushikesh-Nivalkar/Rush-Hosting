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

    // Verify admin role server-side
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profileRes = await (supabase as any).from("profiles").select("role").eq("id", user.id).single();
    const profileRole: string | undefined = profileRes.data?.role;

    if (profileRole !== "admin") {
      return NextResponse.json(
        { ok: false, error: { code: "FORBIDDEN", message: "Admin only" } },
        { status: 403 }
      );
    }

    const [
      { count: totalClients },
      { count: activeSites },
      { count: openRequests },
      { data: recentRequests },
    ] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "client"),
      supabase.from("sites").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("update_requests").select("id", { count: "exact", head: true }).eq("status", "open"),
      supabase.from("update_requests")
        .select("id, title, priority, status, created_at, owner_id")
        .order("created_at", { ascending: false })
        .limit(10) as unknown as Promise<{ data: unknown }>,
    ]);

    return NextResponse.json({
      ok: true,
      data: {
        stats: { totalClients, activeSites, openRequests },
        recentRequests,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json(
      { ok: false, error: { code: "SERVER_ERROR", message } },
      { status: 500 }
    );
  }
}
