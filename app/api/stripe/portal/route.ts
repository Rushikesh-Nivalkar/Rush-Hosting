import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import { stripe } from "@/lib/stripe/stripe-helpers";

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHORISED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("owner_id", user.id)
      .single() as unknown as { data: { stripe_customer_id: string | null } | null };

    if (!sub?.stripe_customer_id) {
      return NextResponse.json(
        { ok: false, error: { code: "NO_SUBSCRIPTION", message: "No active subscription found" } },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${appUrl}/billing`,
    });

    return NextResponse.json({ ok: true, data: { url: session.url } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json(
      { ok: false, error: { code: "STRIPE_ERROR", message } },
      { status: 500 }
    );
  }
}
