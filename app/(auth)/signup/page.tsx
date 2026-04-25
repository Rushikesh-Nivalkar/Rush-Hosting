"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { saveOnboardingToken } from "@/app/(client)/billing/OnboardingTokenGate";
import {
  Zap, Mail, Lock, User, Phone, MapPin,
  AlertCircle, Loader2, CheckCircle,
} from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/supabase-client";

const AU_STATES = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"];

const inputClass =
  "w-full pl-9 pr-3 py-2.5 rounded-[var(--radius-md)] bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--brand-primary)] transition-colors";

function SignupForm() {
  const supabase = getSupabaseBrowserClient();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/dashboard";

  const [fullName, setFullName]         = useState("");
  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [phone, setPhone]               = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [suburb, setSuburb]             = useState("");
  const [state, setState]               = useState("");
  const [postcode, setPostcode]         = useState("");

  const [error, setError]     = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    // 1. Create auth user
    const callbackNext = redirectTo.startsWith("/") ? redirectTo : "/dashboard";
    const emailRedirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(callbackNext)}`;
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo,
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // 2. Save contact + billing address to profile
    if (authData.user) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from("profiles").update({
        phone:         phone || null,
        address_line1: addressLine1 || null,
        address_line2: addressLine2 || null,
        suburb:        suburb || null,
        state:         state || null,
        postcode:      postcode || null,
      }).eq("id", authData.user.id);
    }

    // Save onboarding token to localStorage so billing page can recover it after email confirmation
    const tokenMatch = redirectTo.match(/[?&]token=([^&]+)/);
    if (tokenMatch) saveOnboardingToken(tokenMatch[1]);

    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[var(--bg-base)] px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-12 h-12 rounded-full bg-[var(--status-active-bg)] flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={24} className="text-[var(--status-active)]" />
          </div>
          <h1 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Check your email</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            We sent a confirmation link to{" "}
            <span className="text-[var(--text-primary)]">{email}</span>.
            Click it to activate your account and you&apos;ll be taken straight to checkout.
          </p>
          <Link
            href={`/login?redirect=${encodeURIComponent(redirectTo)}`}
            className="inline-block mt-6 text-sm text-[var(--brand-primary)] hover:underline"
          >
            Already confirmed? Sign in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--bg-base)] px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--brand-primary)] flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <span className="text-base font-semibold text-[var(--text-primary)]">RushHosting</span>
        </div>

        <div className="rounded-[var(--radius-xl)] border border-[var(--border-default)] bg-[var(--bg-elevated)] p-8">
          <h1 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Create account</h1>
          <p className="text-sm text-[var(--text-secondary)] mb-6">Get started with RushHosting</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-[var(--radius-md)] bg-[var(--status-error-bg)] border border-[var(--status-error)]/20 text-[var(--status-error)] text-sm">
                <AlertCircle size={14} className="shrink-0" />
                {error}
              </div>
            )}

            {/* ── Account details ── */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-tertiary)] mb-3">
                Account
              </p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1">Full name</label>
                  <div className="relative">
                    <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                    <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required placeholder="Jane Smith" className={inputClass} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1">Email</label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com.au" className={inputClass} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1">Password</label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} placeholder="Min. 8 characters" className={inputClass} />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Contact ── */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-tertiary)] mb-3">
                Contact
              </p>
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1">Best contact number</label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="04XX XXX XXX"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            {/* ── Billing address ── */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-tertiary)] mb-3">
                Billing address
              </p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1">Street address</label>
                  <div className="relative">
                    <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                    <input type="text" value={addressLine1} onChange={e => setAddressLine1(e.target.value)} placeholder="123 Main Street" className={inputClass} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1">Apartment / suite (optional)</label>
                  <div className="relative">
                    <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                    <input type="text" value={addressLine2} onChange={e => setAddressLine2(e.target.value)} placeholder="Unit 2" className={inputClass} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1">Suburb</label>
                    <input
                      type="text"
                      value={suburb}
                      onChange={e => setSuburb(e.target.value)}
                      placeholder="Sydney"
                      className="w-full px-3 py-2.5 rounded-[var(--radius-md)] bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--brand-primary)] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1">State</label>
                    <select
                      value={state}
                      onChange={e => setState(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-[var(--radius-md)] bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)] transition-colors"
                    >
                      <option value="">State</option>
                      {AU_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1">Postcode</label>
                  <input
                    type="text"
                    value={postcode}
                    onChange={e => setPostcode(e.target.value)}
                    placeholder="2000"
                    maxLength={4}
                    className="w-full px-3 py-2.5 rounded-[var(--radius-md)] bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--brand-primary)] transition-colors"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-[var(--radius-md)] bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-[var(--text-secondary)] mt-4">
          Already have an account?{" "}
          <Link href="/login" className="text-[var(--brand-primary)] hover:underline">Sign in</Link>
        </p>
      </div>
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
