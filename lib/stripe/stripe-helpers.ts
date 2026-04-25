/**
 * stripe-helpers.ts
 * Server-side Stripe client. Safe to import only in server components and API routes.
 * For formatting utilities usable in client components, import from "@/lib/format".
 */

import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY environment variable");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-03-25.dahlia",
  appInfo: { name: "RushHosting", version: "0.1.0" },
});

export { formatAUD, formatAUDCompact } from "@/lib/format";
