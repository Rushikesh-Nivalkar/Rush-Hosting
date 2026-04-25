"use client";

/**
 * Runs once on mount: reads onboarding_token from localStorage and,
 * if the current URL doesn't already carry it, reloads the page with
 * the token appended so the server component can validate it.
 *
 * This handles the case where the login redirect strips query params —
 * the token was saved to localStorage before login and is restored here.
 */

import { useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

const LS_KEY = "onboarding_token";

interface Props {
  /** Token already validated by the server — save it and we're done */
  serverToken?: string;
}

export function OnboardingTokenGate({ serverToken }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // If the server already gave us a valid token, persist it to localStorage
    if (serverToken) {
      localStorage.setItem(LS_KEY, serverToken);
      return;
    }

    // No token in the URL — check localStorage (survived a login redirect)
    const stored = localStorage.getItem(LS_KEY);
    if (stored && !searchParams.get("token")) {
      // Re-navigate to billing with the token in the URL so the server can validate it
      const params = new URLSearchParams(searchParams.toString());
      params.set("token", stored);
      router.replace(`${pathname}?${params.toString()}`);
    }
  }, [serverToken, searchParams, router, pathname]);

  return null;
}

/** Call this before navigating away from the /onboard page */
export function saveOnboardingToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem(LS_KEY, token);
  }
}

/** Clear the token after a successful checkout */
export function clearOnboardingToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(LS_KEY);
  }
}
