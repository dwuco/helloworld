-- Run after supabase-stub.sql and the migration. Exits non-zero on the first failed check.
\set ON_ERROR_STOP on
grant select, insert, update, delete on all tables in schema public to authenticated;

insert into auth.users values
  ('00000000-0000-0000-0000-00000000000a', 'alice@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'bob@example.com'),
  ('00000000-0000-0000-0000-00000000000c', 'mallory@example.com');

create or replace function pg_temp.as_user(uid text, email text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', uid, false);
  perform set_config('request.jwt.claim.email', email, false);
end $$;

\pset tuples_only on
\o /dev/null
set role authenticated;

-- Alice creates a household and adds food.
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a', 'alice@example.com');
create temp table ctx as select public.create_household('Alice Home') as hid;
insert into inventory_items (household_id, name, location) select hid, 'Milk', 'fridge' from ctx;
create temp table inv as select public.create_household_invite((select hid from ctx)) as code;
do $$ begin
  assert (select count(*) from inventory_items) = 1, 'owner sees own item';
  assert (select role from household_members where user_id = auth.uid()) = 'owner', 'creator is owner';
  assert (select email_import_opt_in from profiles where user_id = auth.uid()) = false, 'email import defaults to OFF';
end $$;

-- Mallory (not a member) sees nothing and cannot write into Alice's household.
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c', 'mallory@example.com');
do $$ begin
  assert (select count(*) from inventory_items) = 0, 'non-member cannot read inventory';
  assert (select count(*) from households) = 0, 'non-member cannot read household';
  begin
    insert into inventory_items (household_id, name, location) select hid, 'Evil', 'pantry' from ctx;
    raise exception 'non-member insert should have failed';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.create_household_invite((select hid from ctx));
    raise exception 'non-member invite should have failed';
  exception when raise_exception then
    if sqlerrm not like 'Not a member%' then raise; end if;
  end;
  begin
    perform public.join_household('WRONG123');
    raise exception 'bad invite code should have failed';
  exception when raise_exception then
    if sqlerrm not like 'Invite code is invalid%' then raise; end if;
  end;
end $$;
update inventory_items set quantity = 99;  -- silently affects 0 rows under RLS
delete from inventory_items;

-- Bob joins with the invite and shares the data.
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b', 'bob@example.com');
select public.join_household((select lower(code) from inv));
do $$ begin
  assert (select count(*) from inventory_items) = 1, 'member sees shared item';
  assert (select quantity from inventory_items) = 1, 'non-member update had no effect';
  assert (select count(*) from household_members) = 2, 'member list has both people';
end $$;
update inventory_items set quantity = 3 where name = 'Milk';
insert into shopping_items (household_id, name) select hid, 'Eggs' from ctx;
insert into meal_plan_entries (household_id, date, slot, title) select hid, current_date, 'dinner', 'Tacos' from ctx;
insert into grocery_imports (household_id, source, status, fulfillment, lines)
  select hid, 'paste', 'awaiting', 'pickup', '[{"name":"Milk"}]'::jsonb from ctx;

-- Constraints reject bad data.
do $$ begin
  begin
    insert into inventory_items (household_id, name, location) select hid, 'X', 'garage' from ctx;
    raise exception 'bad location should have failed';
  exception when check_violation then null;
  end;
end $$;

-- Bob opts in to email import for himself only; Alice's preference is untouched.
insert into profiles (user_id, email_import_opt_in, email_import_opted_in_at) values (auth.uid(), true, now())
  on conflict (user_id) do update set email_import_opt_in = true;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a', 'alice@example.com');
do $$ begin
  assert (select email_import_opt_in from profiles where user_id = auth.uid()) = false, 'consent is per user';
  assert (select count(*) from profiles) = 1, 'users cannot read each other''s profiles';
  assert (select quantity from inventory_items where name = 'Milk') = 3, 'alice sees bob''s update';
end $$;

-- Bob leaves and loses access.
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b', 'bob@example.com');
delete from household_members where user_id = auth.uid();
do $$ begin
  assert (select count(*) from inventory_items) = 0, 'former member loses access';
end $$;

reset role;
\o
\echo 'RLS checks passed'
