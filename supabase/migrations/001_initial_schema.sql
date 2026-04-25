-- ─────────────────────────────────────────────────────────────────────────────
-- 001_initial_schema.sql
-- HostingPlatform — initial database schema + RLS policies
-- Run in Supabase SQL Editor or via: supabase db push
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Extensions ───────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── Custom types ─────────────────────────────────────────────────────────────
create type user_role         as enum ('admin', 'client');
create type site_status       as enum ('active', 'suspended', 'pending', 'cancelled');
create type ticket_priority   as enum ('urgent', 'high', 'medium', 'low');
create type ticket_status     as enum ('open', 'in_progress', 'resolved', 'closed');
create type sub_status        as enum ('active', 'trialing', 'past_due', 'cancelled', 'incomplete');

-- ─────────────────────────────────────────────────────────────────────────────
-- PROFILES
-- ─────────────────────────────────────────────────────────────────────────────
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text,
  avatar_url    text,
  role          user_role not null default 'client',
  company_name  text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Auto-create profile when a new user signs up
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Updated-at trigger helper
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger profiles_updated_at before update on profiles
  for each row execute procedure set_updated_at();

-- RLS
alter table profiles enable row level security;

-- Users can read and update their own profile
create policy "profiles: own read"
  on profiles for select using (auth.uid() = id);

create policy "profiles: own update"
  on profiles for update using (auth.uid() = id);

-- Admins can read all profiles
create policy "profiles: admin read all"
  on profiles for select
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- SITES
-- ─────────────────────────────────────────────────────────────────────────────
create table sites (
  id                  uuid primary key default uuid_generate_v4(),
  owner_id            uuid not null references profiles(id) on delete cascade,
  domain              text not null,
  status              site_status not null default 'pending',
  plan_name           text,
  renewal_date        date,
  hosting_username    text,                -- DirectAdmin username
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index sites_owner_id_idx on sites(owner_id);

create trigger sites_updated_at before update on sites
  for each row execute procedure set_updated_at();

alter table sites enable row level security;

-- Clients see only their own sites
create policy "sites: own read"
  on sites for select using (auth.uid() = owner_id);

-- Admins can do everything
create policy "sites: admin all"
  on sites for all
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- UPDATE REQUESTS
-- ─────────────────────────────────────────────────────────────────────────────
create table update_requests (
  id            uuid primary key default uuid_generate_v4(),
  owner_id      uuid not null references profiles(id) on delete cascade,
  site_id       uuid references sites(id) on delete set null,
  title         text not null,
  description   text,
  priority      ticket_priority not null default 'medium',
  status        ticket_status not null default 'open',
  admin_notes   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index update_requests_owner_id_idx on update_requests(owner_id);
create index update_requests_status_idx   on update_requests(status);

create trigger update_requests_updated_at before update on update_requests
  for each row execute procedure set_updated_at();

alter table update_requests enable row level security;

-- Clients: read + insert their own requests
create policy "requests: own read"
  on update_requests for select using (auth.uid() = owner_id);

create policy "requests: own insert"
  on update_requests for insert with check (auth.uid() = owner_id);

-- Admins: full access
create policy "requests: admin all"
  on update_requests for all
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- SUBSCRIPTIONS
-- ─────────────────────────────────────────────────────────────────────────────
create table subscriptions (
  id                      uuid primary key default uuid_generate_v4(),
  owner_id                uuid not null references profiles(id) on delete cascade,
  stripe_customer_id      text unique,
  stripe_subscription_id  text unique,
  stripe_price_id         text,
  plan_name               text,
  status                  sub_status not null default 'incomplete',
  current_period_end      timestamptz,
  cancel_at_period_end    boolean not null default false,
  amount_aud              integer,        -- stored in cents (AUD)
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index subscriptions_owner_id_idx on subscriptions(owner_id);

create trigger subscriptions_updated_at before update on subscriptions
  for each row execute procedure set_updated_at();

alter table subscriptions enable row level security;

-- Clients: read own subscription
create policy "subscriptions: own read"
  on subscriptions for select using (auth.uid() = owner_id);

-- Admins: full access
create policy "subscriptions: admin all"
  on subscriptions for all
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );
