-- 010_time_buckets.sql
-- Time bucket support: lump-sum + weekly allocations on subscriptions,
-- time bucket config on custom_plans, and quoting/review flow on update_requests.

-- ── subscriptions: add time bucket columns ────────────────────────────────────
alter table subscriptions
  add column if not exists lumpsum_minutes_total  integer not null default 0,
  add column if not exists lumpsum_minutes_used   integer not null default 0,
  add column if not exists weekly_minutes_total   integer not null default 0,
  add column if not exists weekly_minutes_used    integer not null default 0,
  add column if not exists weekly_reset_at        timestamptz;

-- ── custom_plans: add time bucket config columns ──────────────────────────────
alter table custom_plans
  add column if not exists lumpsum_minutes  integer not null default 0,
  add column if not exists weekly_minutes   integer not null default 0;

-- ── update_requests: extend status enum + add quoting columns ─────────────────
alter type ticket_status add value if not exists 'quoted';
alter type ticket_status add value if not exists 'accepted';
alter type ticket_status add value if not exists 'done_pending_review';

alter table update_requests
  add column if not exists quoted_minutes  integer,
  add column if not exists quoted_at       timestamptz,
  add column if not exists accepted_at     timestamptz,
  add column if not exists done_at         timestamptz;

-- Customers need to update their own requests (to accept quote + mark complete)
do $$ begin
  create policy "requests: own update"
    on update_requests for update
    using (auth.uid() = owner_id);
exception when duplicate_object then null;
end $$;
