/**
 * billing.service.ts
 * All billing API calls go through here. Components never call fetch directly.
 */

type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };

async function post<T>(url: string, body?: Record<string, unknown>): Promise<ApiResponse<T>> {
  const res = await fetch(url, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json() as Promise<ApiResponse<T>>;
}

export const billingService = {
  async createCheckoutSession(planId: string, promoCode?: string, onboardingToken?: string): Promise<ApiResponse<{ url: string }>> {
    return post("/api/stripe/checkout", {
      plan_id: planId,
      ...(promoCode ? { promo_code: promoCode } : {}),
      ...(onboardingToken ? { onboarding_token: onboardingToken } : {}),
    });
  },

  async createPortalSession(): Promise<ApiResponse<{ url: string }>> {
    return post("/api/stripe/portal");
  },

  async toggleBackupAddon(action: "enable" | "disable"): Promise<ApiResponse<{ enabled: boolean }>> {
    return post("/api/stripe/addon", { action });
  },
};
