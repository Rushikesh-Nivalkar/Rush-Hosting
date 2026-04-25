-- Custom packages created by admin (synced to Stripe)
create table if not exists custom_plans (
  id              uuid          primary key default gen_random_uuid(),
  name            text          not null,
  description     text,
  price_aud       int           not null,          -- AUD cents, e.g. 5000 = A$50
  features        text[]        not null default '{}',
  stripe_product_id text,
  stripe_price_id   text,
  created_for     uuid          references profiles(id) on delete set null,
  created_by      uuid          references profiles(id) on delete set null,
  created_at      timestamptz   not null default now()
);

alter table custom_plans enable row level security;
create policy "custom_plans: no direct client access" on custom_plans using (false);

-- Allow onboarding links to point at a custom plan.
-- minimum_plan becomes optional when a custom_plan_id is set.
alter table onboarding_links alter column minimum_plan drop not null;
alter table onboarding_links add column if not exists custom_plan_id uuid references custom_plans(id) on delete set null;
