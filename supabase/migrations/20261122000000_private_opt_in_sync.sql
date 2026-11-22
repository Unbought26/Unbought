-- Unbought private opt-in sync.
--
-- This migration is additive. The public tables stay public-data-only.
-- These private tables are never written unless a member explicitly chooses
-- "Sync my private data" and signs in through Supabase Auth.
--
-- Passwords are handled only by Supabase Auth. No password, password hash, or
-- salt is stored in these tables.

grant usage on schema public to anon, authenticated;

-- Admin role map. Rows are added manually inside Supabase, never from the site.
create table if not exists public.private_admin_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin')),
  created_at timestamptz not null default now()
);

-- Security definer helper avoids recursive RLS on the role table.
create or replace function public.unbought_is_private_admin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.private_admin_roles r
    where r.user_id = auth.uid()
      and r.role = 'admin'
  );
$$;

alter function public.unbought_is_private_admin() owner to postgres;
revoke all on function public.unbought_is_private_admin() from public;
grant execute on function public.unbought_is_private_admin() to anon, authenticated;

create table if not exists public.private_members (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  member_id text not null unique check (char_length(member_id) between 1 and 100),
  chosen_name text not null check (char_length(chosen_name) between 1 and 60),
  legal_first_name text check (char_length(legal_first_name) <= 40),
  legal_middle_initial text check (char_length(legal_middle_initial) <= 2),
  legal_last_name text check (char_length(legal_last_name) <= 60),
  legal_suffix text check (char_length(legal_suffix) <= 12),
  legal_full_name text check (char_length(legal_full_name) <= 100),
  email text check (char_length(email) <= 160),
  location_label text check (char_length(location_label) <= 80),
  address1 text check (char_length(address1) <= 100),
  address2 text check (char_length(address2) <= 100),
  city text check (char_length(city) <= 80),
  state text check (char_length(state) <= 2),
  zip text check (char_length(zip) <= 10),
  county text check (char_length(county) <= 60),
  mailing_address text check (char_length(mailing_address) <= 240),
  physical_address1 text check (char_length(physical_address1) <= 100),
  physical_address2 text check (char_length(physical_address2) <= 100),
  physical_city text check (char_length(physical_city) <= 80),
  physical_state text check (char_length(physical_state) <= 2),
  physical_zip text check (char_length(physical_zip) <= 10),
  physical_county text check (char_length(physical_county) <= 60),
  physical_address text check (char_length(physical_address) <= 240),
  dob text check (char_length(dob) <= 10),
  housing_status text check (char_length(housing_status) <= 40),
  profession text check (char_length(profession) <= 80),
  paid_skills text check (char_length(paid_skills) <= 240),
  unpaid_skills text check (char_length(unpaid_skills) <= 240),
  cell_phone text check (char_length(cell_phone) <= 40),
  public_phone text check (char_length(public_phone) <= 40),
  public_phone_opt_in boolean not null default false,
  receive_texts boolean not null default false,
  monthly_hours jsonb,
  pledge_status text not null default 'active',
  signed_at timestamptz,
  sync_consented_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.private_waitlist_entries (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  member_id text check (char_length(member_id) <= 100),
  name text not null check (char_length(name) between 1 and 120),
  contact text not null check (char_length(contact) between 1 and 160),
  location text not null check (char_length(location) between 1 and 120),
  note text check (char_length(note) <= 600),
  interests jsonb not null default '[]'::jsonb,
  agreed boolean not null default false,
  saved_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.unbought_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

alter function public.unbought_set_updated_at() owner to postgres;

drop trigger if exists unbought_private_members_updated_at on public.private_members;
create trigger unbought_private_members_updated_at
  before update on public.private_members
  for each row execute function public.unbought_set_updated_at();

drop trigger if exists unbought_private_waitlist_updated_at on public.private_waitlist_entries;
create trigger unbought_private_waitlist_updated_at
  before update on public.private_waitlist_entries
  for each row execute function public.unbought_set_updated_at();

alter table public.private_admin_roles enable row level security;
alter table public.private_members enable row level security;
alter table public.private_waitlist_entries enable row level security;

revoke all on public.private_admin_roles from anon, authenticated;
revoke all on public.private_members from anon, authenticated;
revoke all on public.private_waitlist_entries from anon, authenticated;

grant select on public.private_admin_roles to authenticated;
grant select, insert, update, delete on public.private_members to authenticated;
grant select, insert, update, delete on public.private_waitlist_entries to authenticated;

-- Admin roles: a member sees only their own role; admins see the role table.
drop policy if exists "Private admin roles readable" on public.private_admin_roles;
create policy "Private admin roles readable"
  on public.private_admin_roles for select
  to authenticated
  using (auth.uid() = user_id or public.unbought_is_private_admin());

-- Member records: owner or admin can read/update/delete; only owner can insert.
drop policy if exists "Private member record readable" on public.private_members;
create policy "Private member record readable"
  on public.private_members for select
  to authenticated
  using (auth.uid() = user_id or public.unbought_is_private_admin());

drop policy if exists "Private member record insertable" on public.private_members;
create policy "Private member record insertable"
  on public.private_members for insert
  to authenticated
  with check (auth.uid() = user_id and sync_consented_at is not null);

drop policy if exists "Private member record updatable" on public.private_members;
create policy "Private member record updatable"
  on public.private_members for update
  to authenticated
  using (auth.uid() = user_id or public.unbought_is_private_admin())
  with check (
    (auth.uid() = user_id and sync_consented_at is not null)
    or public.unbought_is_private_admin()
  );

drop policy if exists "Private member record deletable" on public.private_members;
create policy "Private member record deletable"
  on public.private_members for delete
  to authenticated
  using (auth.uid() = user_id or public.unbought_is_private_admin());

-- Waitlist entries: owner or admin can read/update/delete; only owner inserts.
drop policy if exists "Private waitlist readable" on public.private_waitlist_entries;
create policy "Private waitlist readable"
  on public.private_waitlist_entries for select
  to authenticated
  using (auth.uid() = user_id or public.unbought_is_private_admin());

drop policy if exists "Private waitlist insertable" on public.private_waitlist_entries;
create policy "Private waitlist insertable"
  on public.private_waitlist_entries for insert
  to authenticated
  with check (auth.uid() = user_id and agreed);

drop policy if exists "Private waitlist updatable" on public.private_waitlist_entries;
create policy "Private waitlist updatable"
  on public.private_waitlist_entries for update
  to authenticated
  using (auth.uid() = user_id or public.unbought_is_private_admin())
  with check (
    (auth.uid() = user_id and agreed)
    or public.unbought_is_private_admin()
  );

drop policy if exists "Private waitlist deletable" on public.private_waitlist_entries;
create policy "Private waitlist deletable"
  on public.private_waitlist_entries for delete
  to authenticated
  using (auth.uid() = user_id or public.unbought_is_private_admin());

-- Reassert the public bridge grants and permissive insert policies. This is
-- additive and safe to rerun; it repairs deployments where only the read side
-- of the public schema was applied. No private data is affected.
grant select, insert on public.public_groups to anon, authenticated;
grant select, insert on public.public_listings to anon, authenticated;
grant select, insert on public.public_community_channels to anon, authenticated;
grant select, insert on public.public_community_threads to anon, authenticated;
grant select, insert on public.public_community_posts to anon, authenticated;

drop policy if exists "Public groups insert enabled" on public.public_groups;
create policy "Public groups insert enabled"
  on public.public_groups for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Public listings insert enabled" on public.public_listings;
create policy "Public listings insert enabled"
  on public.public_listings for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Public community channels insert enabled" on public.public_community_channels;
create policy "Public community channels insert enabled"
  on public.public_community_channels for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Public community threads insert enabled" on public.public_community_threads;
create policy "Public community threads insert enabled"
  on public.public_community_threads for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Public community posts insert enabled" on public.public_community_posts;
create policy "Public community posts insert enabled"
  on public.public_community_posts for insert
  to anon, authenticated
  with check (true);

notify pgrst, 'reload schema';
