# Deploying to DreamIT Host / DirectAdmin

## Prerequisites
- Node.js 18+ enabled in DirectAdmin Node.js Selector
- SSH access to your server
- Git (optional but recommended)

---

## 1 — First-time setup on the server

SSH into your server, then:

```bash
# Navigate to your domain's application folder
cd /home/<username>/domains/<yourdomain.com.au>/

# Clone or upload your project (exclude node_modules and .next)
git clone <your-repo-url> .
# OR use FileManager / SFTP to upload the project files

# Install production dependencies only
npm install --omit=dev
```

---

## 2 — Set environment variables in DirectAdmin

In DirectAdmin → **Node.js Selector** → your app → **Environment Variables**, add every key from `.env.local.example`:

| Key | Where to get it |
|-----|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role (secret) |
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API keys |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Developers → Webhooks → your endpoint → Signing secret |
| `STRIPE_PRICE_STANDARD` | Stripe Dashboard → Products → Standard Hosting → price ID |
| `NEXT_PUBLIC_APP_URL` | `https://yourdomain.com.au` |
| `NODE_ENV` | `production` |

---

## 3 — Build and deploy

Run this **every time you deploy a code change**:

```bash
npm run deploy:build
```

This is equivalent to:
```bash
npm run build                          # Compile Next.js → .next/standalone/
cp -r public .next/standalone/public  # Copy public assets into standalone
cp -r .next/static .next/standalone/.next/static  # Copy compiled CSS/JS
```

---

## 4 — Configure DirectAdmin Node.js Selector

In DirectAdmin cPanel → **Node.js Selector**:

| Field | Value |
|-------|-------|
| Node.js version | 18.x (or latest LTS) |
| Application mode | Production |
| Application root | `/home/<username>/domains/<yourdomain.com.au>/` |
| **Application startup file** | `server.js` |
| Application URL | `yourdomain.com.au` |

Click **Create** / **Save**, then click **Start** (the play button).

---

## 5 — Set up Stripe live webhook

Once deployed, create a new webhook endpoint in Stripe Dashboard pointing to your live domain:

```
Stripe Dashboard → Developers → Webhooks → Add endpoint
URL: https://yourdomain.com.au/api/webhooks/stripe
Events:
  ✓ checkout.session.completed
  ✓ customer.subscription.updated
  ✓ customer.subscription.deleted
  ✓ invoice.payment_failed
```

Copy the **Signing secret** (`whsec_live_...`) and update `STRIPE_WEBHOOK_SECRET` in DirectAdmin's environment variables. Then restart the app.

---

## 6 — Promote your account to admin

In Supabase SQL Editor:

```sql
UPDATE profiles
SET role = 'admin'
WHERE id = '<your-supabase-user-uuid>';
```

Get your UUID from Supabase → **Authentication** → **Users** → click your account.

---

## Subsequent deployments

```bash
git pull                  # Pull latest code
npm install --omit=dev    # Install any new deps
npm run deploy:build      # Rebuild + copy statics
```

Then in DirectAdmin → Node.js Selector → **Restart** the app.

---

## Troubleshooting

**App won't start**
- Check DirectAdmin → Node.js Selector → Logs for the error
- Confirm all env vars are set (missing `NEXT_PUBLIC_SUPABASE_URL` is the most common cause)
- Confirm `server.js` is set as the startup file (not `index.js`)

**Static assets 404 (CSS/images broken)**
- Re-run `npm run deploy:copy-static`
- The `public/` and `.next/static/` folders must exist inside `.next/standalone/`

**Stripe webhooks not firing**
- Add the live endpoint in Stripe Dashboard (the `stripe listen` CLI only works locally)
- Ensure `STRIPE_WEBHOOK_SECRET` is set to the **live** endpoint's signing secret, not the CLI one

**Auth redirects to wrong URL**
- Update `NEXT_PUBLIC_APP_URL` to your live domain (`https://yourdomain.com.au`)
- Restart the app after changing env vars
