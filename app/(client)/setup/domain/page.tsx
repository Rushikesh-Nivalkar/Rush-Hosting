import { redirect } from "next/navigation";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/supabase-server";
import { DomainSetupForm } from "./DomainSetupForm";

export default async function DomainSetupPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createSupabaseAdminClient() as any;

  // If user already has a site, skip this step
  const { data: site } = await db
    .from("sites")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (site) redirect("/dashboard");

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Set up your domain</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Enter the domain you want to host. We&apos;ll create your hosting account and give you the nameservers to point it to us.
        </p>
      </div>
      <DomainSetupForm />
    </div>
  );
}
