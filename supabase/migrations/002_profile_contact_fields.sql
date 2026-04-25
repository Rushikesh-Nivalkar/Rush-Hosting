-- ─────────────────────────────────────────────────────────────────────────────
-- 002_profile_contact_fields.sql
-- Adds phone and billing address fields to profiles.
-- Run in Supabase SQL Editor or via: supabase db push
-- ─────────────────────────────────────────────────────────────────────────────

alter table profiles
  add column if not exists phone          text,
  add column if not exists address_line1  text,
  add column if not exists address_line2  text,
  add column if not exists suburb         text,
  add column if not exists state          text,
  add column if not exists postcode       text,
  add column if not exists country        text not null default 'Australia';
