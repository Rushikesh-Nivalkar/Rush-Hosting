# CONTEXT.md — RushHosting (Ultra-Optimized for Claude Code)

## ⚠️ READ FIRST (CRITICAL)

You are working on a project called:

👉 **RushHosting**

Always refer to the product as **RushHosting**.
Do NOT rename or reinterpret the product.

---

## 🎯 PRIMARY OBJECTIVE

Minimize token usage while maintaining correctness.

You MUST:

* Avoid scanning entire repo
* Load ONLY relevant files
* Reuse patterns already defined
* Make minimal changes

---

## 🧠 EXECUTION MODE

### ALWAYS FOLLOW:

1. Identify task scope
2. Load ONLY required files
3. Make targeted changes
4. Stop

---

## 🚫 HARD RULES (DO NOT BREAK)

❌ Do NOT scan entire directory
❌ Do NOT refactor unrelated code
❌ Do NOT introduce new architecture
❌ Do NOT add dependencies
❌ Do NOT move business logic to frontend
❌ Do NOT redesign UI

---

## 🏗 SYSTEM ARCHITECTURE

```id="arch_min"
Next.js (Frontend + Backend)
    ↓
------------------------------
Supabase (Auth + DB)
Stripe (Billing)
DirectAdmin (Hosting)
------------------------------
```

---

## ⚙️ CORE PRINCIPLES

* Backend owns ALL logic
* Frontend is UI only
* Stripe = billing truth
* DirectAdmin = external system
* Supabase = auth + DB + RLS
* Minimal client state

(From TRD) 

---

## 📦 MVP SCOPE (LOCKED)

### INCLUDED

* Auth
* Dashboard
* Billing (Stripe)
* Admin dashboard
* Capacity tracking
* Hosting provisioning

### EXCLUDED

* AI builder
* Multi-site
* CMS
* Ticketing

(From PRD) 

---

## 📁 FILE LOADING RULES (TOKEN SAVER)

### Only load:

| Task         | Files to Load                  |
| ------------ | ------------------------------ |
| Dashboard UI | dashboard components + service |
| Billing      | billing service + API route    |
| Admin        | admin service + API route      |
| Auth         | auth service                   |
| API work     | specific route handler only    |

👉 NEVER load entire `/src`

---

## 🔌 API CONTRACT (DO NOT CHANGE)

```id="api_contract_min"
GET /api/dashboard
POST /api/stripe/checkout
POST /api/stripe/portal
POST /api/webhooks/stripe
GET /api/admin/overview
```

---

## 🧱 DATA MODEL (FIXED)

* profiles
* sites
* subscriptions
* system_metrics

(From TRD) 

---

## 🔁 CRITICAL FLOWS

### Subscription Flow

```id="sub_flow_min"
Stripe → Webhook → DB → Provision → Site created
```

### Dashboard Flow

```id="dash_flow_min"
GET /api/dashboard → render UI
```

(From roadmap) 

---

## 🧩 FRONTEND RULES

* No business logic
* No direct DB calls
* No Stripe calls
* Use service layer only

---

## 🧪 STATE RULES

* No global state libs
* Server-driven data
* Local state only for UI

---

## 🔧 SERVICE LAYER RULES

* All API calls go through services
* Hooks call services
* Components call hooks

---

## ⚠️ ERROR FORMAT (MANDATORY)

```id="error_format_min"
{ ok: boolean, data?: T, error?: { code, message } }
```

---

## ⏳ LOADING RULES

Each screen MUST support:

* loading
* error
* empty

---

## 🔐 SECURITY RULES

* No secrets in frontend
* All admin logic server-side
* Enforce RLS
* Validate Stripe webhooks

(From TRD) 

---

## 📊 CAPACITY RULE

```id="capacity_rule_min"
if total_accounts >= max_accounts:
    block provisioning
```

Threshold alerts:

* 70%
* 85%
* 100%

(From PRD/TRD)  

---

## 🌐 DIRECTADMIN RULE

* External system
* No replication
* On failure → mark "pending"

---

## 💳 STRIPE RULE

* Webhooks = source of truth
* Must be idempotent

---

## 🧠 THINKING MODEL

When making changes:

1. Is this required by PRD?
2. Does it break architecture?
3. Can I reuse existing pattern?
4. Is this the smallest change possible?

If unsure → STOP

---

## 🧾 RESPONSE RULE

Claude should:

* Respond concisely
* Avoid explanations unless asked
* Show only relevant code

---

## 🏁 SUCCESS DEFINITION

* Minimal diff
* No regressions
* Clean structure
* Stable system

---

END OF CONTEXT
