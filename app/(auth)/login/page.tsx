"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Zap, Mail, Lock, AlertCircle, Loader2 } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/supabase-client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = getSupabaseBrowserClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // If there's a redirect param (e.g. from onboarding link), honour it for clients
    const redirectTo = searchParams.get("redirect");

    // Route based on role — admins go to /admin, clients to redirect or /dashboard
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase as any)
      .from("profiles")
      .select("role")
      .eq("id", authData.user.id)
      .single();

    const destination =
      profile?.role === "admin"
        ? "/admin"
        : redirectTo && redirectTo.startsWith("/")
        ? redirectTo
        : "/dashboard";

    router.push(destination);
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--bg-base)] px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--brand-primary)] flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <span className="text-base font-semibold text-[var(--text-primary)]">RushHosting</span>
        </div>

        {/* Card */}
        <div className="rounded-[var(--radius-xl)] border border-[var(--border-default)] bg-[var(--bg-elevated)] p-8">
          <h1 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Sign in</h1>
          <p className="text-sm text-[var(--text-secondary)] mb-6">Welcome back to your account</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-[var(--radius-md)] bg-[var(--status-error-bg)] border border-[var(--status-error)]/20 text-[var(--status-error)] text-sm">
                <AlertCircle size={14} className="shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-secondary)]">Email</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com.au"
                  className="w-full pl-9 pr-3 py-2.5 rounded-[var(--radius-md)] bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--brand-primary)] transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-secondary)]">Password</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 rounded-[var(--radius-md)] bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--brand-primary)] transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-[var(--radius-md)] bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-[var(--text-secondary)] mt-4">
          No account?{" "}
          <Link href="/signup" className="text-[var(--brand-primary)] hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
