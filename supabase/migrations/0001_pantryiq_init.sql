-- PantryIQ schema: shared households with row-level security.
-- Apply with `supabase db push` or paste into the Supabase SQL editor.

-- ---------------------------------------------------------------------------
-- Households & membership
-- ---------------------------------------------------------------------------

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'My household' check (char_length(name) between 1 and 80),
  -- Household-wide preferences (expiring-soon window, staples, default servings).
  settings jsonb not null default '{}'::jsonb,
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.household_members (
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  email text,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create table if not exists public.household_invites (
  code text primary key,
  household_id uuid not null references public.households (id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  expires_at timestamptz not null default now() + interval '7 days',
  created_at timestamptz not null default now()
);

-- Per-user preferences. Email import consent is per person, never per household,
-- and defaults to OFF. Nothing in PantryIQ requests mailbox access unless a user
-- explicitly sets this to true from Settings.
create table if not exists public.profiles (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  active_household_id uuid references public.households (id) on delete set null,
  email_import_opt_in boolean not null default false,
  email_import_opted_in_at timestamptz,
  updated_at timestamptz not null default now()
);

create or replace function public.is_household_member(hid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.household_members m
    where m.household_id = hid and m.user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- Household data
-- ---------------------------------------------------------------------------

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  quantity numeric not null default 1 check (quantity >= 0),
  unit text not null default 'count',
  location text not null check (location in ('fridge', 'freezer', 'pantry')),
  category text not null default 'other',
  expires_on date,
  low_stock_threshold numeric check (low_stock_threshold is null or low_stock_threshold >= 0),
  notes text not null default '' check (char_length(notes) <= 500),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists inventory_items_household_idx on public.inventory_items (household_id, location);

create table if not exists public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  quantity numeric not null default 1 check (quantity > 0),
  unit text not null default 'count',
  category text not null default 'other',
  checked boolean not null default false,
  source text,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists shopping_items_household_idx on public.shopping_items (household_id);

create table if not exists public.meal_plan_entries (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  date date not null,
  slot text not null check (slot in ('breakfast', 'lunch', 'dinner', 'snack')),
  recipe_id text,
  title text not null check (char_length(title) between 1 and 120),
  servings integer not null default 2 check (servings >= 1),
  notes text not null default '',
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists meal_plan_household_date_idx on public.meal_plan_entries (household_id, date);

create table if not exists public.grocery_imports (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  retailer_id text not null default 'other',
  source text not null check (source in ('paste', 'file', 'manual', 'email_file')),
  status text not null check (status in ('review', 'awaiting', 'received', 'cancelled')),
  fulfillment text not null check (fulfillment in ('in_store', 'pickup', 'delivery')),
  expected_on date,
  order_ref text not null default '',
  lines jsonb not null default '[]'::jsonb,
  received_at timestamptz,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists grocery_imports_household_idx on public.grocery_imports (household_id, status);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['inventory_items', 'shopping_items', 'meal_plan_entries', 'grocery_imports', 'profiles'] loop
    execute format('drop trigger if exists touch_%1$s on public.%1$s', t);
    execute format('create trigger touch_%1$s before update on public.%1$s for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_invites enable row level security;
alter table public.profiles enable row level security;
alter table public.inventory_items enable row level security;
alter table public.shopping_items enable row level security;
alter table public.meal_plan_entries enable row level security;
alter table public.grocery_imports enable row level security;

drop policy if exists "members read household" on public.households;
create policy "members read household" on public.households
  for select using (public.is_household_member(id));
drop policy if exists "members update household" on public.households;
create policy "members update household" on public.households
  for update using (public.is_household_member(id)) with check (public.is_household_member(id));
-- Households are created through create_household() so the creator is always a member.

drop policy if exists "members read members" on public.household_members;
create policy "members read members" on public.household_members
  for select using (public.is_household_member(household_id));
drop policy if exists "leave household" on public.household_members;
create policy "leave household" on public.household_members
  for delete using (user_id = auth.uid());

drop policy if exists "members manage invites" on public.household_invites;
create policy "members manage invites" on public.household_invites
  for all using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

do $$
declare t text;
begin
  foreach t in array array['inventory_items', 'shopping_items', 'meal_plan_entries', 'grocery_imports'] loop
    execute format('drop policy if exists "household members" on public.%I', t);
    execute format(
      'create policy "household members" on public.%I for all using (public.is_household_member(household_id)) with check (public.is_household_member(household_id))',
      t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

create or replace function public.create_household(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare hid uuid;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  insert into households (name, created_by) values (coalesce(nullif(trim(p_name), ''), 'My household'), auth.uid())
    returning id into hid;
  insert into household_members (household_id, user_id, email, role)
    values (hid, auth.uid(), auth.jwt() ->> 'email', 'owner');
  insert into profiles (user_id, active_household_id) values (auth.uid(), hid)
    on conflict (user_id) do update set active_household_id = excluded.active_household_id;
  return hid;
end;
$$;

create or replace function public.create_household_invite(p_household uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare c text;
begin
  if not public.is_household_member(p_household) then raise exception 'Not a member of this household'; end if;
  c := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  insert into household_invites (code, household_id, created_by) values (c, p_household, auth.uid());
  return c;
end;
$$;

create or replace function public.join_household(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare hid uuid;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select household_id into hid from household_invites
    where code = upper(trim(p_code)) and expires_at > now();
  if hid is null then raise exception 'Invite code is invalid or has expired'; end if;
  insert into household_members (household_id, user_id, email, role)
    values (hid, auth.uid(), auth.jwt() ->> 'email', 'member')
    on conflict (household_id, user_id) do nothing;
  insert into profiles (user_id, active_household_id) values (auth.uid(), hid)
    on conflict (user_id) do update set active_household_id = excluded.active_household_id;
  return hid;
end;
$$;

revoke all on function public.create_household(text) from public, anon;
revoke all on function public.create_household_invite(uuid) from public, anon;
revoke all on function public.join_household(text) from public, anon;
grant execute on function public.create_household(text) to authenticated;
grant execute on function public.create_household_invite(uuid) to authenticated;
grant execute on function public.join_household(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime: lets household members see each other's changes live.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.inventory_items, public.shopping_items,
        public.meal_plan_entries, public.grocery_imports;
    exception when duplicate_object then null;
    end;
  end if;
end $$;
