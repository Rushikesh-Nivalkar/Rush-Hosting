# Deploying to Vercel

## First-time setup

1. Push the repo to GitHub.
2. Import the project in [vercel.com/new](https://vercel.com/new).
3. Set all environment variables (see README.md) in **Vercel → Project → Settings → Environment Variables**.
4. Deploy.

## Environment variables checklist

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role |
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Developers → Webhooks → your endpoint → Signing secret |
| `NEXT_PUBLIC_APP_URL` | Your live domain e.g. `https://rushhosting.au` |
| `SMTP_HOST` | Your mail server hostname |
| `SMTP_PORT` | `465` (SSL) or `587` (STARTTLS) |
| `SMTP_USER` | e.g. `noreply@rushhosting.au` |
| `SMTP_PASS` | SMTP account password |
| `EMAIL_FROM` | e.g. `RushHosting <noreply@rushhosting.au>` |
| `ADMIN_EMAIL` | Your Gmail (BCC on all transactional emails) |
| `BACKUP_NOTIFICATION_EMAIL` | Your Gmail (user deletion exports) |
| `CRON_SECRET` | Any random string — run `openssl rand -hex 32` |

## Stripe webhook

After your first deployment, register the live webhook:

1. Stripe Dashboard → **Developers → Webhooks → Add endpoint**
2. URL: `https://rushhosting.au/api/webhooks/stripe`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
   - `invoice.paid`
4. Copy the signing secret → paste into `STRIPE_WEBHOOK_SECRET` in Vercel, then redeploy.

## Daily heartbeat cron

`vercel.json` schedules `GET /api/cron/heartbeat` daily at 08:00 UTC to keep the Supabase free-tier database active. Requires `CRON_SECRET` to be set — Vercel sends it automatically as `Authorization: Bearer <CRON_SECRET>`.

## Subsequent deployments

Push to the connected branch. Vercel redeploys automatically.

## Run database migrations

Paste each file from `supabase/migrations/` into the Supabase SQL Editor and run in order.

## Promote admin account

```sql
UPDATE profiles SET role = 'admin' WHERE id = '<your-supabase-user-uuid>';
```

Get your UUID from Supabase → **Authentication → Users**.

## Switch to Stripe live keys

Before going live, replace `sk_test_` / `pk_test_` keys in Vercel with `sk_live_` / `pk_live_` from the Stripe Dashboard, and create a new live webhook endpoint.
