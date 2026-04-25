# RushHosting — Action Items

Things to complete before going live. Work through these in order.

---

## 1. Supabase — Run Migrations

~~Go to your **Supabase Dashboard → SQL Editor** and run the following:~~

### ✅ 1a. Add contact/address columns to profiles — DONE

`supabase/migrations/002_profile_contact_fields.sql` has been run.

### ✅ 1b. Fix recursive RLS policy on profiles — DONE

`supabase/migrations/003_rls_is_admin_fix.sql` has been run.

---

## 2. Stripe — Create Products & Price IDs

Go to your **Stripe Dashboard → Products → Add product** and create the following three products.
Set billing to **recurring / monthly / AUD**.

| Product name      | Price (AUD) | Env var to update          |
|-------------------|-------------|----------------------------|
| Hosting Only      | $15.00/mo   | `STRIPE_PRICE_HOSTING`     |
| Basic Website     | $29.00/mo   | `STRIPE_PRICE_BASIC`       |
| Advanced Website  | $49.00/mo   | `STRIPE_PRICE_ADVANCED`    |

Once created, copy each **Price ID** (starts with `price_`) and update `.env.local`:

```
STRIPE_PRICE_HOSTING=price_xxxxx
STRIPE_PRICE_BASIC=price_xxxxx
STRIPE_PRICE_ADVANCED=price_xxxxx
```

---

## 3. Stripe — Webhook Endpoint (for deployment)

When you deploy, register a webhook so Stripe can notify the app of subscription events.

1. Stripe Dashboard → **Developers → Webhooks → Add endpoint**
2. Endpoint URL: `https://yourdomain.com.au/api/webhooks/stripe`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Copy the **Signing secret** (starts with `whsec_`) → update `STRIPE_WEBHOOK_SECRET` in your deployment env vars

> Your local `STRIPE_WEBHOOK_SECRET` in `.env.local` is already set for local testing via Stripe CLI. The deployed webhook will have a different secret.

---

## 4. Email (SMTP) — Update Credentials

Currently `.env.local` has placeholder values. Replace with your real hosting email credentials:

```
SMTP_HOST=mail.yourdomain.com.au
SMTP_USER=noreply@rushhosting.com.au
SMTP_PASS=your-actual-password
ADMIN_EMAIL=your-admin-inbox@email.com
EMAIL_FROM=RushHosting <noreply@rushhosting.com.au>
```

- `SMTP_HOST` — found in your hosting control panel (cPanel/Plesk) under **Email Accounts → Configure Mail Client**
- `SMTP_PORT` — add this if your host uses 587 (STARTTLS) instead of the default 465 (SSL)
- `ADMIN_EMAIL` — the inbox that receives a CC on every plan change notification
- `EMAIL_FROM` — the sender name/address shown to customers

> Until these are set, emails silently fall back to `console.log` — no errors, just no emails sent.

---

## 5. Deployment — Environment Variables

When deploying (Vercel / VPS), set all of the following in your deployment environment:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET          ← use the NEW webhook secret from step 3
STRIPE_PRICE_HOSTING
STRIPE_PRICE_BASIC
STRIPE_PRICE_ADVANCED
NEXT_PUBLIC_APP_URL            ← set to your live domain, e.g. https://rushhosting.com.au
SMTP_HOST
SMTP_USER
SMTP_PASS
SMTP_PORT                      ← only if using 587
ADMIN_EMAIL
EMAIL_FROM
```

> Switch `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` from `sk_test_` / `pk_test_` to your **live keys** (`sk_live_` / `pk_live_`) before going live.

---

## 6. Optional — Performance Improvement (Supabase JWT role claim)

Currently the middleware (`proxy.ts`) makes a database call on **every page request** to check the user's role, adding 1–3 seconds of latency.

The proper fix is to embed the role in the Supabase JWT via a **custom access token hook**:

1. Supabase Dashboard → **Authentication → Hooks**
2. Create a hook on `custom_access_token` that adds `user_role` to the JWT claims
3. Update `proxy.ts` to read `user.user_metadata?.user_role` instead of fetching the DB

This is optional but recommended before launch if you notice slow page transitions.

---

## Summary Checklist

- [x] 1a. Run `profiles` migration (phone/address columns)
- [x] 1b. Run RLS `is_admin()` fix
- [ ] 2. Create 3 Stripe products + update price IDs in `.env.local`
- [ ] 3. Register Stripe webhook on deployed URL
- [ ] 4. Update SMTP credentials in `.env.local`
- [ ] 5. Set all env vars in deployment platform
- [ ] 6. (Optional) Set up Supabase JWT custom access token hook
