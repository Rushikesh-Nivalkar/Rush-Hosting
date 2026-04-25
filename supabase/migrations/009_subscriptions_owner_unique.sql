-- 009_subscriptions_owner_unique.sql
-- Add unique constraint on owner_id so upsert(onConflict: "owner_id") works correctly.
-- A user can only ever have one subscription row.
-- Safe to re-run: no-ops if constraint already exists.

do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'subscriptions_owner_id_unique'
  ) then
    alter table subscriptions add constraint subscriptions_owner_id_unique unique (owner_id);
  end if;
end $$;
