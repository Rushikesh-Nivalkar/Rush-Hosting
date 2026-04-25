import { redirect } from "next/navigation";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/supabase-server";
import { SidebarLayout } from "@/components/shared/SidebarLayout";
import type { UserRole } from "@/lib/supabase/database.types";

type ProfileRow = { full_name: string | null; role: UserRole };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const adminClient = createSupabaseAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profileRes = await (adminClient as any).from("profiles").select("full_name, role").eq("id", user.id).single();
  const profile = profileRes.data as ProfileRow | null;

  if (!profile || profile.role !== "admin") redirect("/dashboard");

  return (
    <SidebarLayout
      role="admin"
      userName={profile.full_name ?? user.email ?? "Admin"}
      userEmail={user.email ?? ""}
    >
      {children}
    </SidebarLayout>
  );
}
