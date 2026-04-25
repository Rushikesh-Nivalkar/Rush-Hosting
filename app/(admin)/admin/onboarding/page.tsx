import { createSupabaseAdminClient } from "@/lib/supabase/supabase-server";
import { OnboardingForm } from "./OnboardingForm";
import { OnboardingLinksList } from "./OnboardingLinksList";
import type { PlanId } from "@/constants/plans";

type OnboardingLink = {
  id: string;
  token: string;
  email: string;
  minimum_plan: PlanId | null;
  promo_code: string | null;
  custom_plan_id: string | null;
  expires_at: string;
  used: boolean;
  created_at: string;
};

type CustomPlan = {
  id: string;
  name: string;
  price_aud: number;
};

export default async function OnboardingPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createSupabaseAdminClient() as any;

  const [{ data: links }, { data: customPlans }] = await Promise.all([
    db
      .from("onboarding_links")
      .select("id, token, email, minimum_plan, promo_code, custom_plan_id, expires_at, used, created_at")
      .order("created_at", { ascending: false })
      .limit(50) as Promise<{ data: OnboardingLink[] | null }>,
    db
      .from("custom_plans")
      .select("id, name, price_aud")
      .order("created_at", { ascending: false }) as Promise<{ data: CustomPlan[] | null }>,
  ]);

  const customPlanMap = Object.fromEntries((customPlans ?? []).map((cp) => [cp.id, cp]));
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Onboarding Links</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Generate personalised links for new customers with optional plan restrictions and promo codes.
        </p>
      </div>

      <OnboardingForm customPlans={customPlans ?? []} />

      {/* Existing links */}
      <div>
        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Recent links</h2>
        <OnboardingLinksList
          initialLinks={links ?? []}
          customPlanMap={customPlanMap}
          appUrl={appUrl}
        />
      </div>
    </div>
  );
}
