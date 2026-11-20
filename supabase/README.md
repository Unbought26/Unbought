# Supabase setup

This repo now has a **public-data-only** Supabase bridge. The site still lives on
GitHub Pages. Supabase is only a backend for shared public directory content.

## What syncs

- Group cards: name, kind, purpose, public location label
- Free Labor and Free Stuff listings: title, pillar, exchange, category,
  description, public location label, provider name, NSFW tag, donation price
- Community channels and threads
- Community chat posts: channel, thread, subject, body, author display name, NSFW tag

## What does not sync

Pledge records, legal names, usernames, passwords or password hashes, addresses,
phone numbers, birthdates, private profile fields, messages, reports, donation
records or amounts, waitlist entries, photos, listing comments, group chats,
social chats, and group settings all stay in this browser only.

## Security notes

- `supabase-config.js` contains only the project URL and the publishable/anon
  key. Those are public by design in a static site.
- Never put a `service_role` key, database password, or Postgres connection
  string in this repo.
- Row Level Security is enabled. Anonymous users can read and insert public rows
  only. There are no update or delete policies in this first phase.
- This phase has no real authentication. Public inserts are moderated only by
  schema length/value checks. Do not use it for sensitive content.
- Photos stay local. Listing and chat photo data is not sent to Supabase.

## Apply the database schema

In the Supabase dashboard:

1. Open this project.
2. Go to **SQL Editor**.
3. Paste the contents of `supabase/migrations/20261120120000_public_data_only.sql`.
4. Run it. The file ends with `notify pgrst, 'reload schema';` so the browser API
   sees the new tables and grants immediately.

The repo already includes `supabase/config.toml`, so do not run `supabase init`
again. Once the Supabase CLI is installed, you can link this folder with:

```bash
supabase link --project-ref hwobregmctityeqhsvmj
```

The CLI may ask for the database password from the Supabase dashboard. That
password is only for CLI/database administration and must never be added to this
repo or to `supabase-config.js`.

## Browser configuration

The browser configuration lives in `supabase-config.js` at the repo root. It is
already set to this project:

- Project URL: `https://hwobregmctityeqhsvmj.supabase.co`
- Publishable key: set in `supabase-config.js`

After the SQL migration has been run, commit and push `supabase-config.js`,
`supabase-sync.js`, `supabase/`, and the page changes. GitHub Pages will then load
the public data bridge.

## Behavior

- If the config is missing or the SDK cannot load, the site stays local-first and
  does not transmit data.
- Local saves publish only new public rows. The browser keeps a local list of
  already-pushed IDs in `unbought:supabase-pushed:v1` so saves do not duplicate
  rows.
- Public rows are read on page load and merged into the local prototype.
- Edits and deletes of public rows remain local for now because anonymous users
  are not allowed to overwrite or remove shared rows.
