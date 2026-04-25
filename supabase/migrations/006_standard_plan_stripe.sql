-- Stores Stripe product/price IDs for the built-in standard plans.
-- Populated via the admin "Sync to Stripe" action.
-- Checkout falls back to this table when STRIPE_PRICE_* env vars are not set.
create table if not exists standard_plan_stripe (
  plan_id          text        primary key check (plan_id in ('hosting', 'basic', 'advanced')),
  stripe_product_id text       not null,
  stripe_price_id   text       not null,
  synced_at         timestamptz not null default now()
);

alter table standard_plan_stripe enable row level security;
drop policy if exists "standard_plan_stripe: no direct client access" on standard_plan_stripe;
create policy "standard_plan_stripe: no direct client access" on standard_plan_stripe using (false);
