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
social chats, group settings, and safety standards acknowledgment records are
never part of the public bridge.

## Private opt-in sync: what can sync

After explicit consent, the private bridge can upload:

- `private_members`: member ID, chosen name, legal name fields, email, location,
  mailing and physical addresses, phones and preferences, birthdate, housing
  status, profession, skills, monthly pledge, pledge status, first-month and
  probation fields, Care Circle result, outside-job flag, active-role flag,
  frozen pledge fields, Observer fields, re-pledge flag, signature time, and
  consent time. No disability proof, diagnosis, document, or note is stored.
- `private_waitlist_entries`: one planning-stage waiting-list entry per user.
- `private_admin_report_flags`: only the reported member's local ID and an
  `open`/`settled` status after a member files or settles a report.
- `private_web_developers`: only the Auth user ID and local member ID when an
  opted-in member records the Web development volunteer offer. No note or other
  role detail is uploaded.

The private bridge never uploads a password, password hash, salt, local demo
username, message, report text, evidence, reason, reporter identity, donation,
photo, listing comment, group chat, social chat, or safety standards
acknowledgment record. Acknowledgments stay in `unbought:v1` on the device;
no database column or migration is needed for them. Supabase Auth handles the
password; no password or hash is written to a private table. The report flag is
the sole minimal exception: no reporter ID or timestamp is stored, only the
reported local member ID and the status.

## Security notes

- `supabase-config.js` contains only the project URL and the publishable/anon
  key. Those are public by design in a static site. It validates the key shape
  and rejects secret/service-role keys in the browser.
- Never put a `service_role` key, database password, or Postgres connection
  string in this repo.
- Public tables have RLS enabled. Anyone can read public rows, but nobody can
  write to a public table directly. Shared-content saves go through a checked
  database function that requires a signed-in, pledged member. Client-supplied
  member IDs are ignored; the member identity comes from Supabase Auth.
- Shared-content changes write a short append-only audit note: who acted, which
  shared row changed, and when. No report text, evidence, reason, or profile
  detail is added to that note.
- Private tables have RLS enabled. Anonymous users have no access. An authenticated
  user can insert only their own member/waitlist/pool row (`auth.uid() = user_id`)
  and can read, update, or delete only their own row. The seven active web-developer
  admins can read, update, and delete private rows. Member inserts require a
  stored `sync_consented_at`; waitlist inserts require the planning-stage agreement.
- `private_web_developers` is the automatic web-developer pool. The site adds a
  row only for an opted-in member who recorded the local Web development offer,
  and removes it when that sync copy is deleted. Seven seats are active at a time
  for seven days each, staggered one day apart. `unbought_active_admin_ids()`
  derives the active seven from the current date every time access is checked, so
  no cron, scheduled job, or manual admin SQL is needed. If there are seven or
  fewer web developers, it returns no admins. This pool is separate from the
  local group admin seats in `app.js`.
- `unbought_is_private_admin()` is `SECURITY DEFINER` with a locked search path so
  the admin-role policy cannot recurse. It returns false for an active admin while
  an `open` flag joins that admin's local member ID to their Auth user row.
- `private_admin_report_flags` contains no reporter details, no timestamps, and no
  report content. It only maps a local member ID to `open` or `settled`.
- Supabase Auth stores its session under `unbought:private-auth` in localStorage.
  That session is not a password, hash, or salt. Local demo credentials remain in
  `unbought:v1` and are never uploaded.

## Apply the database schema

In the Supabase dashboard:

1. Open this project.
2. Go to **SQL Editor**.
3. Paste and run `supabase/migrations/20261120120000_public_data_only.sql`.
4. Paste and run `supabase/migrations/20261122000000_private_opt_in_sync.sql`.
   Do not edit it. There are no UUIDs, names, or positions to fill in.
5. If you ran an older version of the private migration, rerunning this file is
   safe. It removes the old manual pool and creates the automatic pool table.

Both files end with `notify pgrst, 'reload schema';` so the browser API sees the
new tables and grants immediately. Private sync will fail with a permission error
until the second migration is applied. The second migration also closes older
direct-write public policies, adds the checked shared-write function, creates
the Care Circle status columns, and adds the append-only audit note table.

The repo already includes `supabase/config.toml`, so do not run `supabase init`
again. Once the Supabase CLI is installed, you can link this folder with:

```bash
supabase link --project-ref hwobregmctityeqhsvmj
```

The CLI may ask for the database password from the Supabase dashboard. That
password is only for CLI/database administration and must never be added to this
repo or to `supabase-config.js`.

## Web developer admin pool and rotation

Nothing to edit, and no UUIDs to look up.

1. A member turns on private sync in Dashboard → Settings.
2. That member opens the volunteer form and records **Web development**.
3. The site adds their Auth user ID and local member ID to
   `private_web_developers`. It does not upload the volunteer note.
4. Once there are **more than seven** web developers in the pool, seven are
   active at a time. Each seat lasts seven days, and seats are staggered so one
   developer rotates in and one rotates out each day.

The active seven are derived from the current date on every access check. There
is no cron job and no later admin SQL. With seven or fewer web developers, no
private admin seats are active. Deleting a member's cloud copy removes their
pool row too.

This pool is only for Supabase private-data admins. The seven local group admin
seats in `app.js` rotate separately and never grant database access.

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
- Each page loads only the public rows it displays, so document pages stay fast.
- Public rows are read on page load and merged into the local prototype.
- Anonymous visitors can browse. A new shared row is published only when the
  browser has a signed-in Supabase Auth session for a pledged member in good
  standing. Otherwise the change stays on this device and a message explains how
  to sign in. Edits and deletes of already-shared rows remain local for now.
- The Supabase SDK is pinned in `vendor/supabase/`; the site does not fetch it
  from a third-party CDN at runtime.

### Private data

- Private sync stays off until a member opts in and signs in with Supabase Auth.
- Once enabled, private saves are debounced and pushed to the private tables
  automatically. The Settings panel also has **Check sync now** as a manual check.
- **Turn off private sync** removes the automatic web-developer pool row, signs
  out, and stops future uploads but keeps the member and waiting-list copies.
- **Delete my cloud copy** removes the member, waitlist, web-developer pool, and
  open report flag rows for that local member ID, then signs out.
- Local sign-out stops private sync. Withdrawing membership deletes the private
  cloud copy as well.
- Filing a report sends an `open` flag for the reported member ID. A `not_guilty`
  finding or restored access sends `settled`. An open flag pauses private-data
  access for an active web-developer admin whose local member ID matches. Report
  text, evidence, reasons, and reporter identity never enter the flag.
- The app also uploads pledge standing fields: frozen date/month/deficit,
  Observer date, prior track, and re-pledge-required status. The monthly freeze,
  30-day Observer conversion, and three-member re-pledge review still happen in
  the browser; Supabase stores only the resulting local status.
- If email confirmation is enabled in Supabase Auth, a new private sync account
  must be confirmed before the first upload will succeed.
