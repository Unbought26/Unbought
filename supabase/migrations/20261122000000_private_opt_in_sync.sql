-- Unbought private opt-in sync, rotating web-developer admins, and report pause.
--
-- This migration is additive. The public tables stay public-data-only.
-- Private tables are never written unless a member explicitly chooses
-- "Sync my private data" and signs in through Supabase Auth.
--
-- Passwords are handled only by Supabase Auth. No password, password hash, or
-- salt is stored in these tables.
--
-- ═══════════════════════════════════════════════════════════════════════════════
-- BEFORE YOU RUN THIS FILE: edit the WEB DEVELOPER ADMIN POOL block below.
-- ═══════════════════════════════════════════════════════════════════════════════

grant usage on schema public to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- WEB DEVELOPER ADMIN POOL
--
-- This is the only list you need to maintain. Add one row per web developer
-- who may hold a rotating admin seat. Find each UUID in the Supabase dashboard
-- under Authentication → Users after that developer signs up through the site.
--
-- Seven seats are active at a time. Each seat serves seven days, and the seats
-- are staggered one day apart, so one developer rotates in and one rotates out
-- every day. Keep MORE THAN SEVEN developers in the list, otherwise the same
-- seven people hold every seat and nothing actually changes.
--
-- Uncomment the example rows and replace them with real values. The dummy row
-- makes the statement harmless if you leave the list empty for now.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.private_admin_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  position integer not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

with developers(user_id, display_name, position) as (
  values
    -- ( '00000000-0000-0000-0000-000000000001'::uuid, 'Developer One', 1),
    -- ( '00000000-0000-0000-0000-000000000002'::uuid, 'Developer Two', 2),
    -- ( '00000000-0000-0000-0000-000000000003'::uuid, 'Developer Three', 3),
    (null::uuid, '', 0)
)
insert into public.private_admin_roles (user_id, display_name, position, active)
select user_id, display_name, position, true
from developers
where user_id is not null
on conflict (user_id) do update
  set display_name = excluded.display_name,
      position = excluded.position,
      active = true;

-- ─────────────────────────────────────────────────────────────────────────────
-- Automatic daily rotation. No cron job and no manual updates are needed: the
-- active seven are derived from today's date every time access is checked.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.unbought_active_admin_ids()
returns table (user_id uuid)
language sql
security definer
set search_path = ''
stable
as $$
  with ranked as (
    select r.user_id,
           (row_number() over (order by r.position, r.user_id) - 1)::bigint as idx
    from public.private_admin_roles r
    where r.active
  ),
  sizes as (
    select coalesce(count(*), 0)::bigint as n from ranked
  ),
  today as (
    select
      case when sizes.n > 0
        then mod(
               mod((current_date - date '2026-11-22')::bigint, sizes.n) + sizes.n,
               sizes.n
             )
        else 0
      end as day_offset,
      sizes.n
    from sizes
  )
  select ranked.user_id
  from ranked
  cross join today
  where today.n > 0
    and case when today.n > 0
      then mod(ranked.idx - today.day_offset + today.n, today.n) < 7
      else false
    end;
$$;

alter function public.unbought_active_admin_ids() owner to postgres;
revoke all on function public.unbought_active_admin_ids() from public;
grant execute on function public.unbought_active_admin_ids() to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Private member records. Created before the admin helper because that helper
-- joins these rows to resolve a reported member's local ID to an Auth user.
-- ─────────────────────────────────────────────────────────────────────────────

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
  pledge_frozen_at timestamptz,
  pledge_frozen_month text check (char_length(pledge_frozen_month) <= 7),
  pledge_deficit_hours numeric(6,2) not null default 0,
  pledge_observer_at timestamptz,
  pledge_track_before_freeze text check (char_length(pledge_track_before_freeze) <= 30),
  pledge_review_required boolean not null default false,
  signed_at timestamptz,
  sync_consented_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep an older private_members table compatible if this file is rerun.
alter table public.private_members add column if not exists pledge_frozen_at timestamptz;
alter table public.private_members add column if not exists pledge_frozen_month text check (char_length(pledge_frozen_month) <= 7);
alter table public.private_members add column if not exists pledge_deficit_hours numeric(6,2) not null default 0;
alter table public.private_members add column if not exists pledge_observer_at timestamptz;
alter table public.private_members add column if not exists pledge_track_before_freeze text check (char_length(pledge_track_before_freeze) <= 30);
alter table public.private_members add column if not exists pledge_review_required boolean not null default false;

-- A signed-in member must have an opted-in private record before this browser
-- may write a report flag. SECURITY DEFINER avoids recursion through the
-- private_members RLS policies.
create or replace function public.unbought_is_syncing_member()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.private_members m
    where m.user_id = auth.uid()
      and m.sync_consented_at is not null
  );
$$;

alter function public.unbought_is_syncing_member() owner to postgres;
revoke all on function public.unbought_is_syncing_member() from public;
grant execute on function public.unbought_is_syncing_member() to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Minimal report pause flag. The ONLY rows here are the reported member's
-- local ID and an open/settled status. No reporter ID, report text, evidence,
-- reason, or timestamp is ever written to this table or sent by the browser.
-- A signed-in member who opted into private sync may set or settle a flag;
-- an unknown member ID has no effect because the admin check joins it to a
-- real private_members row.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.private_admin_report_flags (
  member_id text primary key check (char_length(member_id) between 1 and 100),
  status text not null check (status in ('open', 'settled'))
);

-- An admin's access is suspended while any open report flag resolves to their
-- member record. The security definer functions bypass RLS, so this cannot
-- recurse through the policies that call this helper.
create or replace function public.unbought_is_private_admin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.unbought_active_admin_ids() a
    where a.user_id = auth.uid()
  )
  and not exists (
    select 1
    from public.private_admin_report_flags f
    join public.private_members m on m.member_id = f.member_id
    where m.user_id = auth.uid()
      and f.status = 'open'
  );
$$;

alter function public.unbought_is_private_admin() owner to postgres;
revoke all on function public.unbought_is_private_admin() from public;
grant execute on function public.unbought_is_private_admin() to anon, authenticated;

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
alter table public.private_admin_report_flags enable row level security;

revoke all on public.private_admin_roles from anon, authenticated;
revoke all on public.private_members from anon, authenticated;
revoke all on public.private_waitlist_entries from anon, authenticated;
revoke all on public.private_admin_report_flags from anon, authenticated;

grant select on public.private_admin_roles to authenticated;
grant select, insert, update, delete on public.private_members to authenticated;
grant select, insert, update, delete on public.private_waitlist_entries to authenticated;
grant select, insert, update, delete on public.private_admin_report_flags to authenticated;

-- The developer pool is readable by signed-in members so the rotation is
-- transparent. Nobody in the browser can add, remove, or reorder developers.
drop policy if exists "Private admin pool readable" on public.private_admin_roles;
create policy "Private admin pool readable"
  on public.private_admin_roles for select
  to authenticated
  using (true);

drop policy if exists "Private admin roles readable" on public.private_admin_roles;

drop policy if exists "Admin report flag readable" on public.private_admin_report_flags;
create policy "Admin report flag readable"
  on public.private_admin_report_flags for select
  to authenticated
  using (public.unbought_is_syncing_member());

drop policy if exists "Admin report flag insertable" on public.private_admin_report_flags;
create policy "Admin report flag insertable"
  on public.private_admin_report_flags for insert
  to authenticated
  with check (public.unbought_is_syncing_member() and status = 'open');

drop policy if exists "Admin report flag updatable" on public.private_admin_report_flags;
create policy "Admin report flag updatable"
  on public.private_admin_report_flags for update
  to authenticated
  using (public.unbought_is_syncing_member())
  with check (public.unbought_is_syncing_member() and status in ('open', 'settled'));

drop policy if exists "Admin report flag deletable" on public.private_admin_report_flags;
create policy "Admin report flag deletable"
  on public.private_admin_report_flags for delete
  to authenticated
  using (public.unbought_is_syncing_member());

-- Member records: owner or active, unpaused admin can read/update/delete;
-- only the owner can insert.
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

-- Waitlist entries: owner or active, unpaused admin can read/update/delete;
-- only the owner inserts.
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
