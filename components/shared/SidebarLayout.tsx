"use client";

/**
 * SidebarLayout.tsx
 *
 * Wraps page content with the role-aware Sidebar.
 * Used by both (admin) and (client) route groups.
 *
 * The `role`, `userName`, and `userEmail` props come from the
 * server layout which reads the Supabase session server-side —
 * no client flash, no waterfall.
 */

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Sidebar, type SidebarProps } from "@/components/shared/Sidebar";
import { getSupabaseBrowserClient } from "@/lib/supabase/supabase-client";

type SidebarLayoutProps = Omit<SidebarProps, "onSignOut"> & {
  children: React.ReactNode;
};

export function SidebarLayout({
  children,
  role,
  userName,
  userEmail,
}: SidebarLayoutProps) {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      <Sidebar
        role={role}
        userName={userName}
        userEmail={userEmail}
        onSignOut={handleSignOut}
      />

      {/* Main content — offset by sidebar width */}
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        style={{ paddingLeft: "var(--space-sidebar)" }}
        className="min-h-screen"
      >
        <div className="max-w-6xl mx-auto px-6 py-8">
          {children}
        </div>
      </motion.main>
    </div>
  );
}
