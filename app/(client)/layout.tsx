/**
 * (client)/layout.tsx — Server Component
 *
 * Reads the Supabase session and profile server-side, then renders
 * the SidebarLayout with the correct role, name, and email.
 * Redirects to /login if no session (belt-and-suspenders under middleware).
 *
 * Note: explicit casts below are temporary until `npx supabase gen types`
 * is run against the live project.
 */

import { redirect } from "next/navigation";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/supabase-server";
import { SidebarLayout } from "@/components/shared/SidebarLayout";
import type { UserRole } from "@/lib/supabase/database.types";

type ProfileRow = { full_name: string | null; role: UserRole };

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Use service-role client so RLS doesn't block reading the profile
  // (safe here — user identity already verified above via getUser())
  const adminClient = createSupabaseAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profileRes = await (adminClient as any).from("profiles").select("full_name, role").eq("id", user.id).single();
  const profile = profileRes.data as ProfileRow | null;

  return (
    <SidebarLayout
      role={profile?.role ?? "client"}
      userName={profile?.full_name ?? user.email ?? "User"}
      userEmail={user.email ?? ""}
    >
      {children}
    </SidebarLayout>
  );
}
