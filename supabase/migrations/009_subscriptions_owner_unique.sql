-- 009_subscriptions_owner_unique.sql
-- Add unique constraint on owner_id so upsert(onConflict: "owner_id") works correctly.
-- A user can only ever have one subscription row.

alter table subscriptions
  add constraint subscriptions_owner_id_unique unique (owner_id);
