/**
 * time-buckets.ts
 * Helpers for lump-sum + weekly time bucket management.
 * Weekly buckets reset every Monday (UTC midnight).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = any;

export interface BucketRow {
  id: string;
  lumpsum_minutes_total: number;
  lumpsum_minutes_used: number;
  weekly_minutes_total: number;
  weekly_minutes_used: number;
  weekly_reset_at: string | null;
}

/** Returns midnight UTC of the most recent Monday. */
export function getMostRecentMonday(): Date {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun … 6=Sat
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - diff);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

/** Returns true if the weekly bucket needs a reset (new Monday has started). */
export function needsWeeklyReset(weekly_reset_at: string | null): boolean {
  if (!weekly_reset_at) return true;
  return new Date(weekly_reset_at) < getMostRecentMonday();
}

/**
 * Fetches the subscription bucket row for a user, applying a lazy weekly reset
 * if a new Monday has passed since the last reset. Returns null if no subscription.
 */
export async function getSubscriptionBuckets(userId: string, db: DB): Promise<BucketRow | null> {
  const { data: sub } = await db
    .from("subscriptions")
    .select("id, lumpsum_minutes_total, lumpsum_minutes_used, weekly_minutes_total, weekly_minutes_used, weekly_reset_at")
    .eq("owner_id", userId)
    .single();

  if (!sub) return null;

  if (needsWeeklyReset(sub.weekly_reset_at)) {
    const monday = getMostRecentMonday().toISOString();
    await db
      .from("subscriptions")
      .update({ weekly_minutes_used: 0, weekly_reset_at: monday })
      .eq("id", sub.id);
    sub.weekly_minutes_used = 0;
    sub.weekly_reset_at = monday;
  }

  return sub as BucketRow;
}

/**
 * Deducts minutes from the subscription buckets: lump sum first, weekly second.
 * Caps deductions so values never go below 0 or above total.
 * Returns the updated used values.
 */
export async function deductFromBuckets(
  buckets: BucketRow,
  minutes: number,
  db: DB
): Promise<{ lumpsum_minutes_used: number; weekly_minutes_used: number }> {
  const lumpsumAvailable = Math.max(0, buckets.lumpsum_minutes_total - buckets.lumpsum_minutes_used);
  const deductFromLump = Math.min(minutes, lumpsumAvailable);
  const remainder = minutes - deductFromLump;

  const weeklyAvailable = Math.max(0, buckets.weekly_minutes_total - buckets.weekly_minutes_used);
  const deductFromWeekly = Math.min(remainder, weeklyAvailable);

  const newLumpsumUsed = buckets.lumpsum_minutes_used + deductFromLump;
  const newWeeklyUsed = buckets.weekly_minutes_used + deductFromWeekly;

  await db
    .from("subscriptions")
    .update({ lumpsum_minutes_used: newLumpsumUsed, weekly_minutes_used: newWeeklyUsed })
    .eq("id", buckets.id);

  return { lumpsum_minutes_used: newLumpsumUsed, weekly_minutes_used: newWeeklyUsed };
}

/** Looks up the plan time bucket config for a given Stripe price ID.
 *  Checks standard plans first, then custom plans table. */
export async function getPlanBuckets(
  stripePriceId: string | null,
  db: DB
): Promise<{ lumpsum_minutes: number; weekly_minutes: number } | null> {
  if (!stripePriceId) return null;

  // Try standard plan lookup
  const { data: stdLink } = await db
    .from("standard_plan_stripe")
    .select("plan_id")
    .eq("stripe_price_id", stripePriceId)
    .maybeSingle();

  if (stdLink?.plan_id) {
    const { PLAN_TIME_BUCKETS } = await import("@/constants/plans");
    return PLAN_TIME_BUCKETS[stdLink.plan_id as keyof typeof PLAN_TIME_BUCKETS] ?? null;
  }

  // Try custom plan lookup
  const { data: customPlan } = await db
    .from("custom_plans")
    .select("lumpsum_minutes, weekly_minutes")
    .eq("stripe_price_id", stripePriceId)
    .maybeSingle();

  if (customPlan && (customPlan.lumpsum_minutes > 0 || customPlan.weekly_minutes > 0)) {
    return { lumpsum_minutes: customPlan.lumpsum_minutes, weekly_minutes: customPlan.weekly_minutes };
  }

  return null;
}
