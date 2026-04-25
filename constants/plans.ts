/**
 * Single source of truth for all hosting plans.
 * Prices in AUD cents. DirectAdmin package names must match DREAMIT_PACKAGE_* env vars.
 */

export const PLANS = {
  HOSTING: {
    id: "hosting" as const,
    name: "Hosting Only",
    price: 1500,
    dreamitPackageEnv: "DREAMIT_PACKAGE_HOSTING",
    features: [
      "2 GB SSD storage",
      "1 domain, 5 subdomains",
      "5 email accounts",
      "1 MySQL database",
      "1 FTP account",
      "WordPress pre-installed",
      "Free SSL certificate",
      "PHP, ClamAV & SpamAssassin",
    ],
  },
  BASIC: {
    id: "basic" as const,
    name: "Basic Website",
    price: 2900,
    dreamitPackageEnv: "DREAMIT_PACKAGE_BASIC",
    features: [
      "Everything in Hosting Only",
      "3 GB SSD storage",
      "10 email accounts",
      "3 MySQL databases",
      "2 FTP accounts",
      "10 subdomains + 1 domain pointer",
      "Dream Website Builder",
    ],
  },
  ADVANCED: {
    id: "advanced" as const,
    name: "Advanced Website",
    price: 4900,
    dreamitPackageEnv: "DREAMIT_PACKAGE_ADVANCED",
    features: [
      "Everything in Basic Website",
      "5 GB SSD storage",
      "20 email accounts",
      "5 MySQL databases",
      "3 FTP accounts",
      "20 subdomains + 2 domain pointers",
      "Git & Redis access",
      "System info & login keys",
    ],
  },
} as const;

/** Add-ons — not full plans, sold alongside a base plan */
export const ADDONS = {
  MANAGED_BACKUP: {
    id: "managed_backup" as const,
    name: "Managed Backup",
    price: 500,
    description: "Daily automated backups with 30-day retention",
  },
} as const;

export type PlanId = (typeof PLANS)[keyof typeof PLANS]["id"];

/** Ordered from lowest to highest tier — used for minimum-plan enforcement */
export const PLAN_ORDER: PlanId[] = ["hosting", "basic", "advanced"];

/** Time buckets for plans that include website support.
 *  hosting has no allocation. basic = 40 hrs lump + 1 hr/week.
 *  advanced = 80 hrs lump + 2 hrs/week. All values in minutes. */
export const PLAN_TIME_BUCKETS: Partial<Record<PlanId, { lumpsum_minutes: number; weekly_minutes: number }>> = {
  basic:    { lumpsum_minutes: 40 * 60,  weekly_minutes: 60  },
  advanced: { lumpsum_minutes: 80 * 60,  weekly_minutes: 120 },
};

export function getPlanRank(planId: PlanId): number {
  return PLAN_ORDER.indexOf(planId);
}

