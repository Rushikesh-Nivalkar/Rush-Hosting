# Product Requirements Document — RushHosting

**Version:** 2.0
**Date:** April 2026
**Status:** Live

---

## 1. Overview

RushHosting is a white-label hosting management portal for an Australian web agency. It replaces ad-hoc client communication (email, spreadsheets) with a centralised platform where clients self-serve status, billing, and change requests — while the admin manages everything from a single dashboard.

---

## 2. Users & Roles

**Admin (agency)** — single operator with full visibility across all clients, sites, requests, and revenue. Manually manages site records; configures plans, promo codes, and onboarding links.

**Client** — one account per client. Can only access their own site, billing, and change requests. Signs up via an onboarding link issued by admin.

---

## 3. Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router) |
| Auth + DB | Supabase (RLS, auth triggers) |
| Payments | Stripe AUD (subscriptions, customer portal, webhooks) |
| Email | Nodemailer via SMTP (`noreply@rushhosting.au`) |
| Styling | Tailwind CSS v4 + CSS custom properties (dark theme) |
| Deployment | Vercel |

---

## 4. Features

### Authentication
- Email + password via Supabase Auth
- Signup requires a valid onboarding link (token-gated)
- Middleware guards all routes; redirects unauthenticated to `/login`

### Client — My Site (`/dashboard`)
- Site domain, plan, renewal date, open request count
- Animated site status badge (active / pending / suspended)
- Empty state CTA before first site is provisioned

### Client — Updates (`/updates`)
- Time bucket progress bars (support hours remaining)
- Submit change requests: title, description, priority (Low / Medium / High / Urgent)
- Accept quoted time estimates from admin
- Confirm completion (triggers time deduction + hard delete of request)
- No time bucket = no request submission (hosting-only plan)

### Client — Billing (`/billing`)
- Shows current plan, price, next billing date
- Subscribe button → Stripe Checkout (AUD)
- Manage billing → Stripe Customer Portal
- Plan upgrade/downgrade via portal (pro-rata handled by Stripe)

### Client — Settings (`/settings`)
- Update profile: name, phone, address fields
- Change password

### Admin — Master Feed (`/admin`)
- All active sites with status badges
- Pending provisioning queue
- System-wide alerts

### Admin — Requests (`/admin/requests`)
- FIFO queue of all client change requests
- Inline: set time quote (minutes), add admin notes, mark work done
- "Awaiting customer" badge when work is marked done pending client review
- Archived section for resolved/closed requests

### Admin — Revenue (`/admin/revenue`)
- MRR, active subscriber count, plan breakdown
- Australian financial year (Jul–Jun) revenue totals
- Per-client subscription table

### Admin — Clients (`/admin/clients`)
- All client accounts — active (subscribed) and inactive
- Time bucket editor: set lump sum + weekly hours for any subscribed client
- Active/inactive tabs

### Admin — Sites (`/admin/sites`)
- All site records with domain, status, plan
- Mark site as active (triggers "site live" email to customer)
- Send hosting credentials email (with BCC to admin)

### Admin — Onboarding (`/admin/onboarding`)
- Generate time-limited signup links with optional minimum-plan gate or custom plan lock
- List of outstanding links with copy button

### Admin — Custom Plans (`/admin/plans`)
- Create Stripe products/prices directly from the dashboard
- Set lump sum hours + weekly hours per custom plan

### Admin — Promo Codes (`/admin/promo`)
- Create Stripe coupon codes (percentage or fixed AUD discount)
- List and delete active codes

---

## 5. Email Notifications

| Trigger | Recipient | Admin copy |
|---|---|---|
| Payment received | Customer | — |
| Plan changed | Customer | BCC |
| Work ready for review | Customer | BCC |
| Credentials sent | Customer | BCC |
| Site activated | Customer | BCC |
| Request completed (customer confirms) | Customer | BCC |
| New signup | Admin | — |
| User deleted | Admin | — |

---

## 6. Support Time System

- **Basic plan:** 40 hr lump sum + 1 hr/week recurring
- **Advanced plan:** 80 hr lump sum + 2 hr/week recurring
- **Custom plans:** admin-configured per plan
- **Hosting-only plan:** no time allocation
- Weekly bucket resets every Monday 00:00 UTC (lazy reset on read)
- Deduction order: lump sum first, then weekly

---

## 7. Security

| Control | Implementation |
|---|---|
| Auth guard | `proxy.ts` redirects unauthenticated requests to `/login` |
| Admin guard | Server-side role check on all `/admin` routes and API handlers |
| Data isolation | Supabase RLS — `owner_id = auth.uid()` on all client-facing tables |
| Service key | `SUPABASE_SERVICE_ROLE_KEY` server-side only, never in client bundle |
| Webhook integrity | Stripe signature verification before any DB writes |
| Security headers | X-Frame-Options, X-Content-Type-Options, Referrer-Policy |

---

## 8. Route Map

| Route | Access |
|---|---|
| `/login`, `/signup`, `/onboard` | Public |
| `/dashboard`, `/updates`, `/billing`, `/settings` | Client |
| `/admin`, `/admin/requests`, `/admin/revenue` | Admin |
| `/admin/clients`, `/admin/sites`, `/admin/onboarding` | Admin |
| `/admin/plans`, `/admin/promo` | Admin |
| `/api/requests/*` | Authenticated client |
| `/api/admin/*` | Admin |
| `/api/stripe/*` | Authenticated |
| `/api/webhooks/stripe` | Stripe only |
| `/api/cron/heartbeat` | Vercel cron (bearer token) |
