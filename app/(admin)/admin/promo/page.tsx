import { createSupabaseAdminClient } from "@/lib/supabase/supabase-server";
import { stripe } from "@/lib/stripe/stripe-helpers";
import { formatAUD } from "@/lib/stripe/stripe-helpers";
import { GlassCard } from "@/components/shared/GlassCard";
import { PromoForm } from "./PromoForm";
import { Tag, Users, Infinity, RefreshCcw, CheckCircle2, User } from "lucide-react";
import { DeletePromoButton } from "./DeletePromoButton";
import type Stripe from "stripe";

// ── Helpers ───────────────────────────────────────────────────────────────────

function discountLabel(coupon: Stripe.Coupon) {
  if (coupon.percent_off) return `${coupon.percent_off}% off`;
  if (coupon.amount_off) return `${formatAUD(coupon.amount_off)} off`;
  return "—";
}

function durationLabel(coupon: Stripe.Coupon) {
  if (coupon.duration === "forever") return "Forever";
  if (coupon.duration === "once") return "First payment only";
  if (coupon.duration === "repeating") return `${coupon.duration_in_months} month${coupon.duration_in_months === 1 ? "" : "s"}`;
  return "—";
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function PromoCodesPage() {
  const db = createSupabaseAdminClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  // Fetch clients + their Stripe customer IDs for the restriction dropdown
  const { data: profiles } = await db
    .from("profiles")
    .select("id, full_name, role")
    .eq("role", "client");

  const { data: subscriptions } = await db
    .from("subscriptions")
    .select("owner_id, stripe_customer_id");

  const subMap = new Map(
    (subscriptions ?? []).map((s: { owner_id: string; stripe_customer_id: string | null }) => [s.owner_id, s.stripe_customer_id])
  );

  // We need emails — fetch from Supabase auth admin API
  let emailMap = new Map<string, string>();
  try {
    const { data: { users } } = await (createSupabaseAdminClient() as any).auth.admin.listUsers();
    emailMap = new Map(users.map((u: { id: string; email: string }) => [u.id, u.email ?? ""]));
  } catch { /* auth admin may not be available */ }

  const clients = (profiles ?? []).map((p: { id: string; full_name: string | null }) => ({
    id: p.id,
    full_name: p.full_name,
    email: emailMap.get(p.id) ?? p.id.slice(0, 8) + "…",
    stripe_customer_id: subMap.get(p.id) ?? null,
  }));

  // Fetch existing promo codes from Stripe
  let promoCodes: Stripe.PromotionCode[] = [];
  try {
    const list = await stripe.promotionCodes.list({ limit: 50, active: true, expand: ["data.promotion.coupon", "data.customer"] });
    promoCodes = list.data;
  } catch { /* no Stripe key configured yet */ }

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Promo Codes</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Create discount codes for friends, family, or specific clients.
        </p>
      </div>

      <PromoForm clients={clients} />

      {/* Existing codes */}
      <div>
        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Active codes</h2>
        {promoCodes.length === 0 ? (
          <GlassCard padding="md">
            <p className="text-sm text-[var(--text-secondary)] text-center py-4">No promo codes yet.</p>
          </GlassCard>
        ) : (
          <div className="space-y-2">
            {promoCodes.map((pc) => {
              const coupon = pc.promotion.coupon as Stripe.Coupon;
              const customer = pc.customer as Stripe.Customer | null;
              return (
                <GlassCard key={pc.id} padding="md">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--brand-primary-muted)] flex items-center justify-center shrink-0">
                        <Tag size={14} className="text-[var(--brand-primary)]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-mono font-semibold text-[var(--text-primary)]">{pc.code}</p>
                        <p className="text-xs text-[var(--text-tertiary)]">{coupon.name}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 text-xs text-[var(--text-secondary)]">
                      {/* Discount */}
                      <div className="flex items-center gap-1">
                        <CheckCircle2 size={12} className="text-[var(--status-active)]" />
                        {discountLabel(coupon)}
                      </div>
                      {/* Duration */}
                      <div className="flex items-center gap-1">
                        {coupon.duration === "forever"
                          ? <Infinity size={12} />
                          : coupon.duration === "repeating"
                          ? <RefreshCcw size={12} />
                          : <CheckCircle2 size={12} />
                        }
                        {durationLabel(coupon)}
                      </div>
                      {/* Redemptions */}
                      <div className="flex items-center gap-1">
                        <Users size={12} />
                        {pc.times_redeemed}
                        {pc.max_redemptions ? `/${pc.max_redemptions}` : ""} used
                      </div>
                      {/* Customer restriction */}
                      {customer && (
                        <div className="flex items-center gap-1 text-[var(--brand-primary)]">
                          <User size={12} />
                          {customer.email ?? "1 customer"}
                        </div>
                      )}
                      <DeletePromoButton promoId={pc.id} code={pc.code} />
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
