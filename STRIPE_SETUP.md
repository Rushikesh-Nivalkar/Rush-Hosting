# Stripe Setup Guide — Sandbox → Live

This document covers every Stripe activity that needs to be performed in sandbox mode, and what to repeat identically when switching to live keys. Complete all sandbox steps before going live.

---

## Sandbox vs Live

| | Sandbox | Live |
|---|---|---|
| Secret key prefix | `sk_test_` | `sk_live_` |
| Publishable key prefix | `pk_test_` | `pk_live_` |
| Webhook secret prefix | `whsec_` (test) | `whsec_` (live) |
| Cards charged | Test cards only — no real money | Real cards — real charges |
| Stripe Dashboard toggle | Top-left → **Test mode ON** | Top-left → **Test mode OFF** |

Work entirely in one mode at a time. Never mix keys.

---

## Step 1 — Standard Plans (automated via the app)

The app creates Hosting Only, Basic Website, and Advanced Website products and prices in Stripe automatically when you click **Sync Standard Plans** in the admin panel.

1. Log in to the app as admin.
2. Go to **Admin → Plans** (sidebar).
3. Click **Sync Standard Plans**.
4. The app creates three Stripe products with monthly AUD recurring prices:

| Plan | AUD/month |
|---|---|
| Hosting Only | $15.00 |
| Basic Website | $29.00 |
| Advanced Website | $49.00 |

5. The price IDs are stored automatically in the `standard_plan_stripe` database table — no manual env var entry needed for standard plans.

> **Live:** After switching to live keys in Vercel, come back to Admin → Plans and click **Sync Standard Plans** again. It will create new live products and prices and update the database.

---

## Step 2 — GST Tax Rate

The checkout flow applies GST automatically if `STRIPE_GST_TAX_RATE_ID` is set.

1. Stripe Dashboard → **Products → Tax rates → New tax rate**
2. Set:
   - **Display name:** GST
   - **Rate:** 10%
   - **Type:** Inclusive (prices already include GST)
   - **Country:** Australia
3. Copy the Tax Rate ID (starts with `txr_`).
4. Add to Vercel env vars:
   ```
   STRIPE_GST_TAX_RATE_ID=txr_xxxxx
   ```
5. Redeploy.

> **Live:** Repeat in live mode. Create a new tax rate — tax rates are mode-specific. Update `STRIPE_GST_TAX_RATE_ID` with the new live ID.

---

## Step 3 — Managed Backup Add-on

The backup add-on ($5/month) must be created manually in Stripe — it is not automated.

1. Stripe Dashboard → **Products → Add product**
2. Set:
   - **Name:** Managed Backup
   - **Pricing model:** Standard pricing
   - **Price:** $5.00 AUD / month (recurring)
   - **Billing period:** Monthly
3. Copy the **Price ID** (starts with `price_`).
4. Add to Vercel env vars:
   ```
   STRIPE_BACKUP_PRICE_ID=price_xxxxx
   ```
5. Redeploy.

> **Live:** Repeat in live mode. The product name and price must match. Update `STRIPE_BACKUP_PRICE_ID` with the live price ID.

---

## Step 4 — Webhook Endpoint

Stripe must notify the app of subscription events. The webhook endpoint is `/api/webhooks/stripe`.

### Sandbox (local development)

Use the Stripe CLI to forward events to your local server:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

The CLI outputs a webhook signing secret (`whsec_...`) — set it in `.env.local`:

```
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

### Sandbox (deployed to Vercel preview/production)

1. Stripe Dashboard (test mode) → **Developers → Webhooks → Add endpoint**
2. **Endpoint URL:** `https://rushhosting.au/api/webhooks/stripe`
3. **Events to select:**
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
   - `invoice.paid`
4. Click **Add endpoint**.
5. Click the endpoint → copy the **Signing secret** (`whsec_...`).
6. Add to Vercel env vars:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx
   ```
7. Redeploy.

> **Live:** Repeat in live mode (Stripe Dashboard with Test mode OFF). Register the same URL with the same 5 events. Copy the new live signing secret and update `STRIPE_WEBHOOK_SECRET` in Vercel. Redeploy.

---

## Step 5 — Custom Plans (via app)

Custom plans are created from within the app — they create a Stripe product + price automatically.

1. Go to **Admin → Custom Plans**.
2. Click **New custom plan**.
3. Fill in: name, description, AUD price, features, support hours.
4. Save — the app creates the Stripe product and price and stores the IDs in the database.

> **Live:** After switching to live keys, re-create any custom plans from Admin → Custom Plans. Each save creates a new live Stripe product and price.

---

## Step 6 — Promo Codes (via app)

Promo codes map to Stripe coupons and are created from within the app.

1. Go to **Admin → Promo Codes**.
2. Click **New promo code**.
3. Set: code string, discount type (percentage or fixed AUD), optional expiry + redemption limit.
4. Save — the app creates a Stripe coupon and promotion code.

> **Live:** Promo codes are mode-specific. Re-create any codes you want available in live mode.

---

## Step 7 — Stripe Customer Portal

The customer portal lets clients manage their own subscription (cancel, update payment method). Configure it once per mode.

1. Stripe Dashboard → **Settings → Billing → Customer portal**
2. Enable:
   - Cancel subscriptions
   - Update payment method
   - View billing history / invoices
3. Set the **Return URL** to `https://rushhosting.au/billing`
4. Save.

> **Live:** Repeat in live mode with the same settings and return URL.

---

## Step 8 — Disable Stripe's default payment emails

Stripe sends its own receipt emails by default. Since RushHosting sends branded receipts via `invoice.paid`, disable Stripe's to avoid duplicates.

1. Stripe Dashboard → **Settings → Billing → Customer emails**
2. Uncheck **Successful payments**
3. Save.

> **Live:** Repeat in live mode.

---

## Full Sandbox Checklist

- [ ] **Step 1** — Sync Standard Plans via Admin → Plans
- [ ] **Step 2** — Create GST tax rate → update `STRIPE_GST_TAX_RATE_ID`
- [ ] **Step 3** — Create Managed Backup product → update `STRIPE_BACKUP_PRICE_ID`
- [ ] **Step 4** — Register webhook endpoint → update `STRIPE_WEBHOOK_SECRET`
- [ ] **Step 5** — Create any custom plans via Admin → Custom Plans
- [ ] **Step 6** — Create any promo codes via Admin → Promo Codes
- [ ] **Step 7** — Configure customer portal → set return URL
- [ ] **Step 8** — Disable Stripe default payment emails

---

## Going Live — What Changes

1. In Vercel, update these env vars to live values then redeploy:
   ```
   STRIPE_SECRET_KEY=sk_live_xxxxx
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
   ```
2. Re-run steps 1–8 in live mode. All Stripe objects (products, prices, tax rates, coupons, webhooks) are mode-specific and must be re-created.
3. Custom plans and promo codes in the database reference sandbox Stripe IDs — re-create them in the app after switching to live keys so they get live IDs.
4. Update `STRIPE_WEBHOOK_SECRET`, `STRIPE_GST_TAX_RATE_ID`, `STRIPE_BACKUP_PRICE_ID` with the new live values.

---

## Test Cards (Sandbox Only)

| Scenario | Card number | Expiry | CVC |
|---|---|---|---|
| Successful payment | `4242 4242 4242 4242` | Any future | Any |
| Card declined | `4000 0000 0000 0002` | Any future | Any |
| Requires authentication (3DS) | `4000 0025 0000 3155` | Any future | Any |
| Payment fails after trial | `4000 0000 0000 0341` | Any future | Any |
