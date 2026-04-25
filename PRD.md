# Product Requirements Document
## HostingPlatform — White-Label Hosting Management MVP

**Version:** 1.0  
**Date:** April 2026  
**Status:** MVP Complete

---

## 1. Overview

HostingPlatform is a premium, white-labeled hosting management portal built for an Australian agency. It replaces ad-hoc client communication (email, spreadsheets) with a centralised platform where clients self-serve status updates, submit change requests, and manage billing — while the agency admin manages everything from a single feed.

---

## 2. Goals

| Goal | Metric |
|------|--------|
| Reduce support overhead | Clients submit structured requests instead of unformatted emails |
| Centralise billing | All subscriptions processed via Stripe AUD — no manual invoicing |
| Role isolation | Clients cannot see each other's data under any circumstance |
| Deployable on existing infra | Runs on DreamIT Host / DirectAdmin — no new hosting cost |

---

## 3. Users & Roles

### Admin (Agency)
- Single operator (you)
- Full visibility across all clients, sites, requests, and revenue
- Manually provisions sites in DirectAdmin; updates site status in Supabase

### Client
- One or more clients, each with their own isolated account
- Can only see their own sites, requests, and subscription
- Self-onboards via /signup; you promote to admin via SQL

---

## 4. Tech Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Framework | Next.js 16 (App Router) | Server Components, Server Actions, standalone output |
| Auth + DB | Supabase | RLS for data isolation, auth triggers for profile creation |
| Payments | Stripe (AUD) | Subscriptions, Customer Portal, webhooks |
| Styling | Tailwind CSS v4 + CSS custom properties | Linear.app-inspired dark design system |
| Animation | Framer Motion | Glassmorphic cards, page transitions |
| Icons | Lucide React | Consistent icon set |
| Hosting | DreamIT Host / DirectAdmin (AU) | Node.js Selector, existing infra |

---

## 5. Database Schema

### `profiles`
Extends `auth.users`. Created automatically on signup via trigger.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | matches auth.users.id |
| full_name | text | from signup metadata |
| role | enum | `admin` \| `client` (default: client) |
| company_name | text | optional |

### `sites`
One row per hosted website. Admin-managed.

| Column | Type | Notes |
|--------|------|-------|
| owner_id | uuid FK | → profiles.id |
| domain | text | e.g. example.com.au |
| status | enum | `active` \| `pending` \| `suspended` \| `cancelled` |
| plan_name | text | e.g. Standard Hosting |
| renewal_date | date | displayed on client dashboard |
| hosting_username | text | DirectAdmin username |

### `update_requests`
Client-submitted change requests.

| Column | Type | Notes |
|--------|------|-------|
| owner_id | uuid FK | → profiles.id |
| site_id | uuid FK | → sites.id (nullable) |
| title | text | required |
| description | text | optional detail |
| priority | enum | `urgent` \| `high` \| `medium` \| `low` |
| status | enum | `open` \| `in_progress` \| `resolved` \| `closed` |
| admin_notes | text | visible to client |

### `subscriptions`
Mirrors Stripe subscription state.

| Column | Type | Notes |
|--------|------|-------|
| owner_id | uuid FK | → profiles.id |
| stripe_customer_id | text unique | |
| stripe_subscription_id | text unique | |
| status | enum | `active` \| `trialing` \| `past_due` \| `cancelled` \| `incomplete` |
| amount_aud | integer | cents |
| current_period_end | timestamptz | next billing date (from billing_cycle_anchor) |
| cancel_at_period_end | boolean | |

**RLS:** Every table has Row Level Security. Clients can only read/write rows where `owner_id = auth.uid()`. Admins bypass via service-role key server-side.

---

## 6. Features

### 6.1 Authentication (`/login`, `/signup`)
- Email + password via Supabase Auth
- Signup auto-creates a `profiles` row (trigger)
- Confirmation email sent on signup
- Middleware (`proxy.ts`) guards all routes — redirects unauthenticated users to `/login`

### 6.2 Client Dashboard (`/dashboard`)
- 4 stat cards: Domain, Plan + AUD price, Renewal date, Open request count
- Site status grid with animated live-status badge
- List of latest open requests with link to Updates page
- Empty state CTA if no site provisioned yet

### 6.3 Update Requests (`/updates`)
- **Client:** Linear-style form — title input, description textarea, priority selector (Low / Medium / High / Urgent), submit
- Full request history below form with priority + status badges and admin notes
- **Admin:** Master Feed at `/admin` — all requests from all clients grouped by Open / In Progress / Resolved
- Each row expandable with inline status switcher + admin notes textarea + save
- Badge on sidebar nav shows open request count

### 6.4 Billing (`/billing`)
- **No subscription:** Plan card showing Standard Hosting — A$49/month AUD — feature list + Subscribe button
- Subscribe button → POST `/api/stripe/checkout` → Stripe Checkout (AUD, card)
- **Active subscription:** Shows plan name, amount, next billing date, cancellation status
- "Manage billing" button → POST `/api/stripe/portal` → Stripe Customer Portal
- Success / cancelled banners on return from Stripe

### 6.5 Stripe Webhook (`/api/webhooks/stripe`)
Handles 4 events:

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Upsert subscription row |
| `customer.subscription.updated` | Update status, billing date |
| `customer.subscription.deleted` | Set status = cancelled |
| `invoice.payment_failed` | Set status = past_due |

Webhook verified via `STRIPE_WEBHOOK_SECRET` before any DB writes.

### 6.6 Admin Revenue (`/admin/revenue`)
- Placeholder — Phase 2: Stripe MRR pull, churn chart, client ARR list

### 6.7 Admin Clients (`/admin/clients`)
- Placeholder — Phase 2: Full client list with site status, subscription status, last request

---

## 7. Security

| Control | Implementation |
|---------|---------------|
| Auth guard | `proxy.ts` redirects unauthenticated requests to /login |
| Admin guard | `proxy.ts` + layout server component check role before rendering admin routes |
| Data isolation | Supabase RLS on all tables — `owner_id = auth.uid()` |
| Service key | `SUPABASE_SERVICE_ROLE_KEY` server-side only, never in client bundle |
| Webhook integrity | Stripe signature verification before processing |
| Security headers | X-Frame-Options, X-Content-Type-Options, Referrer-Policy on all routes |
| Secrets | `.env.local` gitignored; `.env.local.example` has placeholder values only |

---

## 8. Route Map

| Route | Access | Description |
|-------|--------|-------------|
| `/login` | Public | Sign in |
| `/signup` | Public | Create account |
| `/dashboard` | Client | Site overview |
| `/updates` | Client | Submit + view requests |
| `/billing` | Client | Subscription management |
| `/settings` | Client | (Phase 2) |
| `/admin` | Admin | Master feed |
| `/admin/revenue` | Admin | Revenue overview (Phase 2) |
| `/admin/clients` | Admin | Client list (Phase 2) |
| `POST /api/stripe/checkout` | Authenticated | Create checkout session |
| `POST /api/stripe/portal` | Authenticated | Create portal session |
| `POST /api/webhooks/stripe` | Stripe only | Event handler |

---

## 9. Deployment

- **Output:** `next build` → `output: standalone` → self-contained server at `.next/standalone/server.js`
- **Entry point:** Root `server.js` — sets `NODE_ENV=production`, `chdir`s to standalone dir, delegates to Next.js server
- **Static assets:** Copied via `npm run deploy:copy-static` after every build
- **Host:** DirectAdmin Node.js Selector — startup file: `server.js`, Node 18+
- **Environment:** All secrets set via DirectAdmin UI (not `.env` files on server)

---

## 10. Phase 2 Backlog

| Feature | Notes |
|---------|-------|
| Revenue dashboard | Stripe MRR, churn, ARR per client |
| Client list + management | Promote/demote roles, link sites to subscriptions |
| Settings page | Profile update, password change, notification preferences |
| DirectAdmin API integration | Auto-provision sites on subscription activation |
| Email notifications | Notify admin on new request; notify client on status change |
| Private nameservers | ns1/ns2.yourdomain.com.au white-labelling |
| Multi-site support | Clients with multiple domains |
| File attachments on requests | Screenshots, reference docs |

---

## 11. Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role — server only |
| `STRIPE_SECRET_KEY` | Yes | Stripe secret key (sk_test / sk_live) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Yes | Stripe publishable key |
| `STRIPE_WEBHOOK_SECRET` | Yes | Webhook signing secret (whsec_) |
| `STRIPE_PRICE_STANDARD` | Yes | Stripe price ID for A$49/mo plan |
| `NEXT_PUBLIC_APP_URL` | Yes | Full app URL for redirects |
