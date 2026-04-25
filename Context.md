# Context — RushHosting

## Project

**RushHosting** — white-label hosting management portal for an Australian web agency. Always refer to the product as RushHosting.

## Architecture

```
Next.js App Router (server + client components)
    ↓
Supabase  — auth + database + RLS
Stripe    — AUD subscriptions, webhooks, customer portal
Vercel    — deployment + cron jobs
SMTP      — transactional email via nodemailer
```

## Core principles

- Backend owns all business logic — no Stripe or DB calls from client components
- Stripe webhooks are the source of truth for subscription state
- Supabase RLS enforces data isolation — clients can only see their own rows
- Admin operations use `createSupabaseAdminClient()` (bypasses RLS) after server-side auth check
- All API responses follow `{ ok: boolean, data?: T, error?: { code, message } }`

## Roles

- **admin** — single operator; full visibility across all clients, sites, revenue, requests
- **client** — self-service; can only access their own site, billing, and change requests

## Data model

| Table | Purpose |
|---|---|
| `profiles` | Extends `auth.users`; holds `role`, `full_name`, contact fields |
| `subscriptions` | Mirrors Stripe subscription state + time bucket columns |
| `sites` | One row per hosted website; admin-managed |
| `update_requests` | Client-submitted change requests with quote/accept/done lifecycle |
| `onboarding_links` | Time-limited signup links with optional plan gate |
| `custom_plans` | Admin-created plans with custom Stripe price IDs and time buckets |
| `standard_plan_stripe` | Maps standard plan IDs to live Stripe price IDs |
| `promo_codes` | Stripe coupon/promo codes created by admin |
| `heartbeat` | Single-row table bumped daily to keep Supabase free tier active |

## Support time buckets

Every subscription has four columns: `lumpsum_minutes_total`, `lumpsum_minutes_used`, `weekly_minutes_total`, `weekly_minutes_used`. Lump sum is drawn down first; weekly resets every UTC Monday (lazy reset on read). Standard plan allocations are in `constants/plans.ts`; custom plan allocations are on the `custom_plans` row.

## Email routing

All mail sends from `noreply@rushhosting.au` via SMTP. `ADMIN_EMAIL` (set in Vercel env) receives BCC on: plan changes, work-ready notifications, credentials emails, and a silent copy on request completions.

## File loading hints

| Task | Files to read |
|---|---|
| Email | `lib/services/email.service.ts` |
| Stripe billing | `app/api/stripe/`, `lib/stripe/stripe-helpers.ts` |
| Webhook events | `app/api/webhooks/stripe/route.ts` |
| Time buckets | `lib/time-buckets.ts` |
| Admin clients | `app/(admin)/admin/clients/` |
| Change requests | `app/(client)/updates/`, `app/(admin)/admin/requests/`, `app/api/requests/` |
| Auth middleware | `proxy.ts` |
