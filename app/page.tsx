import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import { LandingPage } from "./LandingPage";

export default async function RootPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");
  return <LandingPage />;
}
