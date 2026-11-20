-- Unbought public-data-only Supabase schema.
-- Safe first phase: public directory content only. No pledge records, passwords,
-- addresses, phone numbers, donations, reports, messages, photos, or private
-- profile fields are stored here.
--
-- Run this in the Supabase SQL Editor, or deploy it with the Supabase CLI.

create table if not exists public.public_groups (
  id text primary key check (char_length(id) between 1 and 100),
  kind text not null check (kind in ('town', 'joined', 'own')),
  name text not null check (char_length(name) between 1 and 120),
  base_name text check (char_length(base_name) <= 120),
  purpose text check (char_length(purpose) <= 200),
  location_label text check (char_length(location_label) <= 80),
  created_at timestamptz not null default now()
);

create table if not exists public.public_listings (
  id text primary key check (char_length(id) between 1 and 100),
  pillar text not null check (pillar in ('building', 'health', 'daily', 'arts', 'civic', 'goods')),
  exchange text not null check (exchange in ('free', 'atcost')),
  title text not null check (char_length(title) between 1 and 80),
  description text not null check (char_length(description) between 1 and 400),
  location_label text not null check (char_length(location_label) between 1 and 80),
  provider text not null check (char_length(provider) between 1 and 60),
  category text check (char_length(category) <= 60),
  scope text check (char_length(scope) <= 40),
  nsfw boolean not null default false,
  nonmember_price numeric(10, 2) check (nonmember_price >= 0 and nonmember_price <= 100000),
  created_at timestamptz not null default now()
);

create table if not exists public.public_community_channels (
  id text primary key check (char_length(id) between 1 and 100),
  name text not null check (char_length(name) between 1 and 60),
  purpose text check (char_length(purpose) <= 200),
  created_by text check (char_length(created_by) <= 60),
  created_at timestamptz not null default now()
);

create table if not exists public.public_community_threads (
  id text primary key check (char_length(id) between 1 and 100),
  channel_id text not null check (char_length(channel_id) between 1 and 100),
  subject text not null check (char_length(subject) between 1 and 120),
  created_by text check (char_length(created_by) <= 60),
  created_at timestamptz not null default now()
);

create table if not exists public.public_community_posts (
  id text primary key check (char_length(id) between 1 and 100),
  channel text not null check (char_length(channel) between 1 and 40),
  channel_id text not null check (char_length(channel_id) between 1 and 100),
  thread_id text check (char_length(thread_id) <= 100),
  subject text check (char_length(subject) <= 120),
  body text not null check (char_length(body) between 1 and 1200),
  author_name text not null check (char_length(author_name) between 1 and 60),
  nsfw boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.public_groups enable row level security;
alter table public.public_listings enable row level security;
alter table public.public_community_channels enable row level security;
alter table public.public_community_threads enable row level security;
alter table public.public_community_posts enable row level security;

grant select, insert on public.public_groups to anon, authenticated;
grant select, insert on public.public_listings to anon, authenticated;
grant select, insert on public.public_community_channels to anon, authenticated;
grant select, insert on public.public_community_threads to anon, authenticated;
grant select, insert on public.public_community_posts to anon, authenticated;

drop policy if exists "Public groups can be read" on public.public_groups;
create policy "Public groups can be read"
  on public.public_groups for select
  to anon, authenticated
  using (true);

drop policy if exists "Public groups can be added" on public.public_groups;
create policy "Public groups can be added"
  on public.public_groups for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Public listings can be read" on public.public_listings;
create policy "Public listings can be read"
  on public.public_listings for select
  to anon, authenticated
  using (true);

drop policy if exists "Public listings can be added" on public.public_listings;
create policy "Public listings can be added"
  on public.public_listings for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Public community channels can be read" on public.public_community_channels;
create policy "Public community channels can be read"
  on public.public_community_channels for select
  to anon, authenticated
  using (true);

drop policy if exists "Public community channels can be added" on public.public_community_channels;
create policy "Public community channels can be added"
  on public.public_community_channels for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Public community threads can be read" on public.public_community_threads;
create policy "Public community threads can be read"
  on public.public_community_threads for select
  to anon, authenticated
  using (true);

drop policy if exists "Public community threads can be added" on public.public_community_threads;
create policy "Public community threads can be added"
  on public.public_community_threads for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Public community posts can be read" on public.public_community_posts;
create policy "Public community posts can be read"
  on public.public_community_posts for select
  to anon, authenticated
  using (true);

drop policy if exists "Public community posts can be added" on public.public_community_posts;
create policy "Public community posts can be added"
  on public.public_community_posts for insert
  to anon, authenticated
  with check (true);

-- Make PostgREST refresh its schema cache so the new tables and grants are
-- available to the browser immediately.
notify pgrst, 'reload schema';
