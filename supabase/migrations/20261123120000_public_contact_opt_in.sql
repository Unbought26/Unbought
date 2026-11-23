-- Unbought public contact directory, explicit opt-in only.
--
-- This table is public by design: a member chooses to publish an email address
-- so other members can open a direct mail draft. No address is uploaded unless
-- the member signs in with Supabase Auth, has active pledged standing, and calls
-- unbought_set_public_contact. Turning the setting off deletes the row.

create table if not exists public.public_member_contacts (
  member_id text primary key check (char_length(member_id) between 1 and 100),
  display_name text not null check (char_length(display_name) between 1 and 60),
  email text not null check (char_length(email) between 3 and 254),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.public_member_contacts enable row level security;

revoke all on public.public_member_contacts from public, anon, authenticated;
grant select on public.public_member_contacts to anon, authenticated;

drop policy if exists "Public member contacts can be read" on public.public_member_contacts;
create policy "Public member contacts can be read"
  on public.public_member_contacts for select
  to anon, authenticated
  using (true);

create or replace function public.unbought_set_public_contact(p_email text, p_display_name text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_member text;
  v_name text;
  v_email text;
begin
  if v_user is null or not public.unbought_can_write_shared_data() then
    raise exception 'Only signed-in pledged members can publish a contact address.'
      using errcode = '42501';
  end if;

  select m.member_id,
         coalesce(nullif(btrim(p_display_name), ''), nullif(btrim(m.chosen_name), ''), 'Neighbor')
    into v_member, v_name
  from public.private_members m
  where m.user_id = v_user
    and m.sync_consented_at is not null
  limit 1;

  if v_member is null then
    raise exception 'A signed-in pledged member record is required.' using errcode = '42501';
  end if;

  v_email := lower(btrim(coalesce(p_email, '')));

  if v_email = '' then
    delete from public.public_member_contacts where member_id = v_member;

    insert into public.private_shared_content_audit
      (actor_user_id, actor_member_id, action, target_table, target_id, note)
    values (v_user, v_member, 'delete', 'public_member_contacts', v_member, null);

    return jsonb_build_object('ok', true, 'published', false, 'member_id', v_member);
  end if;

  if char_length(v_email) > 254
     or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Enter a valid contact email address.' using errcode = '22023';
  end if;

  insert into public.public_member_contacts
    (member_id, display_name, email, created_at, updated_at)
  values (v_member, v_name, v_email, pg_catalog.now(), pg_catalog.now())
  on conflict (member_id) do update set
    display_name = excluded.display_name,
    email = excluded.email,
    updated_at = pg_catalog.now();

  insert into public.private_shared_content_audit
    (actor_user_id, actor_member_id, action, target_table, target_id, note)
  values (v_user, v_member, 'upsert', 'public_member_contacts', v_member, null);

  return jsonb_build_object(
    'ok', true,
    'published', true,
    'member_id', v_member,
    'email', v_email
  );
end;
$$;

alter function public.unbought_set_public_contact(text, text) owner to postgres;
revoke all on function public.unbought_set_public_contact(text, text) from public;
grant execute on function public.unbought_set_public_contact(text, text) to authenticated;

notify pgrst, 'reload schema';
