import { redirect } from "next/navigation";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/supabase-server";
import { Zap, AlertCircle } from "lucide-react";

export default async function OnboardPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = params.token?.trim();

  // No token — generic invalid page
  if (!token) {
    return <InvalidPage message="This link is missing a token. Please ask for a new link." />;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createSupabaseAdminClient() as any;
  const { data: link } = await db
    .from("onboarding_links")
    .select("token, email, minimum_plan, promo_code, expires_at, used")
    .eq("token", token)
    .single();

  if (!link) {
    return <InvalidPage message="This link is invalid. Please ask your account manager for a new one." />;
  }

  if (link.used) {
    return <InvalidPage message="This link has already been used. Please ask your account manager for a new one." />;
  }

  if (new Date(link.expires_at) < new Date()) {
    return <InvalidPage message="This link has expired. Please ask your account manager for a new one." />;
  }

  // Check auth — new customers should sign up, existing customers go straight to billing
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/signup?redirect=/billing?token=${token}`);
  }

  redirect(`/billing?token=${token}`);
}

function InvalidPage({ message }: { message: string }) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--bg-base)] px-4">
      <div className="w-full max-w-sm text-center">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--brand-primary)] flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <span className="text-base font-semibold text-[var(--text-primary)]">RushHosting</span>
        </div>
        <div className="rounded-[var(--radius-xl)] border border-[var(--border-default)] bg-[var(--bg-elevated)] p-8">
          <div className="w-10 h-10 rounded-full bg-[var(--status-error-bg)] flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={20} className="text-[var(--status-error)]" />
          </div>
          <h1 className="text-base font-semibold text-[var(--text-primary)] mb-2">Invalid link</h1>
          <p className="text-sm text-[var(--text-secondary)]">{message}</p>
        </div>
      </div>
    </main>
  );
}
