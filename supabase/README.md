# Supabase setup

This repo has two separate Supabase bridges:

1. **Public data sync** — already enabled, public-data-only, and always on when
   configured. It shares group cards, Free Labor and Free Stuff listings, and
   community chat content.
2. **Private opt-in sync** — off by default. It uploads private member details
   only after a member explicitly signs in through Supabase Auth and checks the
   consent box in Dashboard → Settings.

The site still lives on GitHub Pages.

## Public sync: what syncs

- Group cards: name, kind, purpose, public location label
- Free Labor and Free Stuff listings: title, pillar, exchange, category,
  description, public location label, provider name, NSFW tag, donation price
- Community channels and threads
- Community chat posts: channel, thread, subject, body, author display name, NSFW tag

## Public sync: what does not sync

Pledge records, legal names, usernames, passwords or password hashes, addresses,
phone numbers, birthdates, private profile fields, messages, reports, donation
records or amounts, waitlist entries, photos, listing comments, group chats,
social chats, and group settings are never part of the public bridge.

## Private opt-in sync: what can sync

After explicit consent, the private bridge can upload:

- `private_members`: member ID, chosen name, legal name fields, email, location,
  mailing and physical addresses, phones and preferences, birthdate, housing
  status, profession, skills, monthly pledge, pledge status, signature time, and
  consent time.
- `private_waitlist_entries`: one planning-stage waiting-list entry per user.

The private bridge never uploads a password, password hash, salt, local demo
username, message, report, donation, photo, listing comment, group chat, or social
chat. Supabase Auth handles the password; no password or hash is written to a
private table.

## Security notes

- `supabase-config.js` contains only the project URL and the publishable/anon
  key. Those are public by design in a static site. It validates the key shape
  and rejects secret/service-role keys in the browser.
- Never put a `service_role` key, database password, or Postgres connection
  string in this repo.
- Public tables have RLS enabled. Anonymous users can read and insert public rows
  only. There are no public update or delete policies.
- Private tables have RLS enabled. Anonymous users have no access. An authenticated
  user can insert only their own row (`auth.uid() = user_id`) and can read,
  update, or delete only their own row. Admins listed in `private_admin_roles`
  can read, update, and delete private rows. Member inserts require a stored
  `sync_consented_at`; waitlist inserts require the planning-stage agreement.
- `unbought_is_private_admin()` is `SECURITY DEFINER` with a locked search path so
  the admin-role policy cannot recurse.
- Supabase Auth stores its session under `unbought:private-auth` in localStorage.
  That session is not a password, hash, or salt. Local demo credentials remain in
  `unbought:v1` and are never uploaded.

## Apply the database schema

In the Supabase dashboard:

1. Open this project.
2. Go to **SQL Editor**.
3. Paste and run `supabase/migrations/20261120120000_public_data_only.sql`.
4. Paste and run `supabase/migrations/20261122000000_private_opt_in_sync.sql`.

Both files end with `notify pgrst, 'reload schema';` so the browser API sees the
new tables and grants immediately. Private sync will fail with a permission error
until the second migration is applied. The second migration also reasserts the
public insert grants and permissive insert policies, repairing deployments where
only the public read side had been applied.

The repo already includes `supabase/config.toml`, so do not run `supabase init`
again. Once the Supabase CLI is installed, you can link this folder with:

```bash
supabase link --project-ref hwobregmctityeqhsvmj
```

The CLI may ask for the database password from the Supabase dashboard. That
password is only for CLI/database administration and must never be added to this
repo or to `supabase-config.js`.

## Granting private admin access

After an admin has signed up through the site's private sync flow, find their
Supabase Auth user UUID and insert it manually in the SQL Editor:

```sql
insert into public.private_admin_roles (user_id, role)
values ('<auth-user-uuid>', 'admin')
on conflict (user_id) do nothing;
```

The site never writes to `private_admin_roles`.

## Browser configuration

The browser configuration lives in `supabase-config.js` at the repo root. It is
already set to this project:

- Project URL: `https://hwobregmctityeqhsvmj.supabase.co`
- Publishable key: set in `supabase-config.js`

After a migration has been run, commit and push `supabase-config.js`,
`supabase-sync.js`, `private-sync.js`, `supabase/`, and the page changes. GitHub
Pages will then load both bridges.

## Behavior

### Public data

- If the config is missing or the SDK cannot load, the site stays local-first and
  does not transmit data.
- Local saves publish only new public rows. The browser keeps a local list of
  already-pushed IDs in `unbought:supabase-pushed:v1` so saves do not duplicate
  rows.
- Public rows are read on page load and merged into the local prototype.
- Edits and deletes of public rows remain local for now because anonymous users
  are not allowed to overwrite or remove shared rows.

### Private data

- Private sync stays off until a member opts in and signs in with Supabase Auth.
- Once enabled, private saves are debounced and pushed to the private tables.
  The Settings panel also has **Sync now**.
- **Turn off private sync** signs out and stops future uploads but keeps the
  Supabase copy.
- **Delete my cloud copy** removes the member and waitlist rows, then signs out.
- Local sign-out stops private sync. Withdrawing membership deletes the private
  cloud copy as well.
- If email confirmation is enabled in Supabase Auth, a new private sync account
  must be confirmed before the first upload will succeed.
