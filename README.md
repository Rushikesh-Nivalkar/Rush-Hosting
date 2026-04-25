# RushHosting

A white-label hosting management portal for an Australian web agency. Clients self-serve status, billing, and change requests. The admin manages all accounts, revenue, and site provisioning from a single dashboard.

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router, server components) |
| Auth + DB | Supabase (RLS, auth triggers) |
| Payments | Stripe AUD (subscriptions, webhooks, customer portal) |
| Email | Nodemailer via SMTP |
| Styling | Tailwind CSS v4 + CSS custom properties |
| Deployment | Vercel |

## Local Development

```bash
npm install
npm run dev
```

Create `.env.local` with the variables listed below, then open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server only) |
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_test_` / `sk_live_`) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret (`whsec_`) |
| `NEXT_PUBLIC_APP_URL` | Full app URL (e.g. `https://rushhosting.au`) |
| `SMTP_HOST` | SMTP server hostname |
| `SMTP_PORT` | SMTP port (default: `465`) |
| `SMTP_USER` | SMTP login (e.g. `noreply@rushhosting.au`) |
| `SMTP_PASS` | SMTP password |
| `EMAIL_FROM` | Sender display name + address |
| `ADMIN_EMAIL` | Admin Gmail — receives BCC on all transactional emails |
| `BACKUP_NOTIFICATION_EMAIL` | Receives user deletion export emails |
| `CRON_SECRET` | Secret token for the daily heartbeat cron |

## Stripe Webhook Events

Register `https://yourdomain/api/webhooks/stripe` in Stripe Dashboard with:

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`
- `invoice.paid`

## Database Migrations

All migrations live in `supabase/migrations/`. Run them in order in the Supabase SQL Editor.

## Promote Yourself to Admin

```sql
UPDATE profiles SET role = 'admin' WHERE id = '<your-supabase-user-uuid>';
```
