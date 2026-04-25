-- Migration 004: Onboarding links table
-- Stores admin-generated onboarding URLs with optional plan restriction + promo code.

create table if not exists onboarding_links (
  id            uuid        primary key default gen_random_uuid(),
  token         text        unique not null,
  email         text        not null,
  minimum_plan  text        not null,
  promo_code    text,
  expires_at    timestamptz not null,
  used          boolean     not null default false,
  created_by    uuid        references profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);

alter table onboarding_links enable row level security;

-- Block all direct client access — the app always uses the service-role admin client
create policy "onboarding_links: no direct client access"
  on onboarding_links
  using (false);
