-- Minimal stand-in for the parts of Supabase the migration depends on, so the
-- schema and its row-level security can be tested on plain PostgreSQL.
-- NOT for use against a real Supabase project (it already has these).
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key, email text);
create or replace function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create or replace function auth.jwt() returns jsonb language sql stable as
  $$ select jsonb_build_object('email', current_setting('request.jwt.claim.email', true)) $$;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;
grant usage on schema public, auth to anon, authenticated;
