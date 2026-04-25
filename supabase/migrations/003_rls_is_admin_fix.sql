-- Migration 003: Fix recursive RLS policy on profiles
-- The previous "admin read all" policy did a sub-select on profiles to check
-- if the current user is an admin, causing PostgreSQL to recurse and return null.
-- Replace it with a security_definer function that bypasses RLS internally.

drop policy if exists "profiles: admin read all" on profiles;

create or replace function is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

grant execute on function is_admin() to supabase_auth_admin;

create policy "profiles: admin read all"
  on profiles for select
  using (is_admin());
