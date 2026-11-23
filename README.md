# Unbought

Unbought is a local-first, static prototype for a mutual-aid community built around
consent, free labor, free goods, and shared accountability.

The current site is a front-end prototype. It uses `localStorage` for the full
member record. A public-data-only Supabase bridge shares group cards, Free Labor
and Free Stuff listings, public groups and community threads, and the opt-in
public contact directory. A separate private sync bridge is off by default:
after explicit opt-in and Supabase Auth sign-in, it can upload the member ID,
account details, pledge details, and waiting-list entry. Row Level Security
limits those private rows to the member and the current rotating web-developer
admins. Messages, report text and evidence, photos, group chats, social chats,
and local sign-in details are never transmitted. The only report-related
exception after opt-in is the reported member's local ID and an `open`/`settled`
status, used to pause private-data access for the reported web developer.
Public rows are anon-readable, but shared content can be published only by a
signed-in pledged member; the member identity comes from Supabase Auth, not from
a client-supplied ID.

See `supabase/README.md` for the schema, security notes, and setup steps. The site
remains hosted on GitHub Pages.

The current beta is a soft launch: it is open to anyone, anywhere, with no
Pocono-only membership limit. Features are intentionally limited while the
prototype is still being built. Free beta signup is open for every track except
the Academy, which stays phase-gated to Phase 2. Free Labor, Free Stuff, free
requests, public groups and community threads, and alliances are active in the
beta. Donations, sales, non-member purchases, prices, and purchase intents stay
closed; funding plans live on `future.html`.

The sample Newsboard posts are general updates about the movement and rollout
process, not a coding changelog. A future blog service will replace them.

## Pages

- `index.html` — How It Works, with the Newsboard near the top
- `pledge.html` — The Pledge and sign-up
- `safety-standards.html` — Versioned Labor & Product Safety Standards and the local acknowledgment record
- `freelabor.html` — Free Labor directory and post form
- `freestuff.html` — Free Stuff directory and post form
- `donate.html` — Redirect to `future.html`; giving stays closed in the beta
- `future.html` — What’s to Come, funding plans, and the planning-stage waiting list
- `dashboard.html` — Member dashboard, full private record, and Exchanges
- `profile.html` — Public member resume with a private record for the signed-in member
- `group.html?group=<id>` — Group profile with members, worker admins, chat, and offers
- `supabase-config.js`, `supabase-sync.js`, `private-sync.js`, `supabase/`, `vendor/supabase/` — Pinned SDK, public bridge, opt-in private sync, and the public contact migration

## Running locally

Open `index.html` directly in a browser, or serve the directory locally, for example:

```bash
python -m http.server 8000
```

Then visit <http://localhost:8000/>.

Prototype sign-in accepts a locally created username and password. Passwords are
stored only in the browser as a salted prototype hash; this is not real account
security. That hash is never uploaded. When power of attorney applies, the pledge
form can also create a second local username and password for the authorized
representative. Either sign-in can manage the member’s local record on their
behalf. The prototype does not verify legal documents or grant legal authority.
Private cloud sync uses a separate Supabase Auth account and never uploads the
local demo hash. Members can change the local password in Dashboard → Settings →
Local sign-in password: the current password is checked on this device, a fresh
salt is generated, and the new hash stays in `unbought:v1` only. That control
does not change the Supabase Auth password, which is handled by Supabase.

## Optional private sync

Private sync is off by default and lives in **Dashboard → Settings → Private cloud sync**.
A member must enter a Supabase Auth email and password and check an explicit
consent box before any private record is uploaded. There are two actions: **Sign
in & sync** for an existing Supabase Auth account, and **Create account & sync**
for a new one. Supabase Auth owns the password; no password, password hash, or
salt is stored in `unbought:v1` or in any private table.

When enabled, the bridge uploads:

- `private_members`: member ID, chosen name, legal name fields, email, location,
  mailing and physical addresses, phones and phone preferences, birthdate,
  housing status, profession, skills, monthly pledge, pledge status, first-month
  and probation fields, Care Circle result, outside-job flag, active-role flag,
  frozen pledge fields, Observer fields, re-pledge flag, signature time, and
  consent time. No disability proof, document, diagnosis, or note is stored.
- `private_waitlist_entries`: one planning-stage waiting-list entry per user.
- `private_admin_report_flags`: the reported member's local ID and an
  `open`/`settled` status only. No reporter ID, report text, evidence, reason,
  or timestamp is uploaded.
- `private_web_developers`: only the Auth user ID and local member ID for
  opted-in members who offered Web development. No volunteer note or other
  personal detail is uploaded.

Safety standards acknowledgments are **not** part of private sync. They stay in
`unbought:v1` on the member's device with the member ID, version, label, date,
and source (pledge, post, edit, request, or settings).

The RLS policies allow an authenticated user to insert and manage only their own
member, waitlist, and web-developer rows. The seven current web-developer admins
derived from `private_web_developers` may read, update, and delete private rows
but cannot insert on a member’s behalf; that rotation is separate from the local
group admin seats. Anonymous users have no access. Applying
`supabase/migrations/20261122000000_private_opt_in_sync.sql` is required before
this feature works.

There is no developer list to edit. After opting into private sync, recording the
local **Web development** volunteer offer automatically adds a member to the
pool; deleting the cloud copy removes them. Seven seats are active at a time,
each for seven days, staggered one day apart. The active seven are recomputed
from the current date on every access check, so there is no cron job and no
manual admin SQL. If there are seven or fewer web developers in the pool, no
private admin seats are active.

When a member files a report after opting in, the app sends an `open` flag for
the reported member ID. A `not_guilty` finding or restored access sends
`settled`. The flag pauses private-data access for the reported web developer
until resolution; it carries no allegation or identity of the reporter.

After a member turns private sync on once, uploads happen automatically whenever
records change. **Check sync status** is only a manual status check; it does not
start or repeat an upload. The Settings panel also offers **Turn off private
sync** and **Delete my cloud copy**. Turning sync off keeps the local records and
signs out of Supabase Auth; deleting removes the Supabase rows. Signing out
locally or withdrawing membership also stops private sync, and withdrawal
deletes the cloud copy. These actions never affect the separate public directory
bridge.

## Direct member messages and contact directory

Messages are pre-filled `mailto` drafts that open in the member's own mail app;
the site never sends them and stores no email log. Members should create a
separate email just for Unbought. A member can publish one Unbought-only contact
email in Dashboard → Settings after signing in with Supabase Auth and opting in.
That address is public by design and should never be a private, work, or school
email. Turning publishing off removes the row. The public contact list is read
by the dashboard and profile pages so the Messages form can open a direct mail
draft to a published contact address. If a recipient has not published one, the
coordinator relay draft opens addressed to `unbought26@gmail.com` for a one-time
introduction, after which the members can email each other directly. There is no
`@unbought` forwarding yet. Local folders, stars, and records stay on the device.

Publishing writes to `public_member_contacts` through
`public.unbought_set_public_contact(text, text)`, which requires a signed-in
pledged member with private sync consent. Apply
`supabase/migrations/20261123120000_public_contact_opt_in.sql` before using this
feature; see `supabase/README.md`.

## Free beta email drafts

Email in the beta is pre-filled `mailto` drafts only. There is no paid email
service, no secrets in browser code, and no `@unbought` forwarding. Dashboard →
Settings has a **Beta email drafts** panel with pre-filled messages for
new-member welcome, Care Circle updates, posting notices, request notices,
the review board process, and group welcome/alliance information. Member-facing
drafts use the member's published Unbought-only contact email when available;
coordinator drafts open addressed to `unbought26@gmail.com`. Each button opens
the visitor's own mail app; the site sends nothing and stores no email log.

## Official contact channels

These are public organization contact channels, not private member data:

- Email: unbought26@gmail.com (an ordinary `mailto` link; the site itself sends nothing)
- Instagram: @unbought26 — https://www.instagram.com/unbought26/
- Facebook: Unbought — https://www.facebook.com/share/1cPuizNHLK/

## Header and navigation

Every page has the same header order: brand, primary navigation, local search,
one call to action, the notification bell, and the mobile menu button. The primary
navigation is exactly How It Works, Free Labor, Free Stuff, Donate, and What’s to
Come. The blue call to action sits outside the navigation: signed-out visitors see
Take the Pledge, and signed-in members see Dashboard. The bell is immediately to
the right of the CTA, and the hamburger follows the bell. The bell stays in the
DOM but is hidden when signed out.

The header search is injected on every page. It searches static page titles and
copy, Free Labor and Free Stuff listings, the member directory, and saved groups
locally. Results are plain local links; the search sends no query to a server.

## Member data and public resume

The local member record stores full legal name, chosen name, mailing and physical
addresses with county, housing status, birthdate, cell phone, optional public phone,
text-message preference, profession, career/paid skills, unpaid skills, bio, locally
resized picture, chosen tag line, private group/crew, confirmed hours
worked, hours used, items gifted, items taken, reports made against the member,
availability, and public-sharing choices. The full record is visible only in the
Dashboard and in the signed-in member profile.

The pledge and Settings forms keep both addresses as structured fields: Address 1,
Address 2, City, County, State, and ZIP. County is private and exists only for
review board eligibility. When “same as mailing” is checked, the physical
fields copy the mailing fields and lock until the box is cleared. Birthdate uses
separate month, day, and year selectors and is stored as one ISO date. Career and
unpaid skills use a search box with suggested skills; members can also type a
custom skill and press Enter. Chosen skills are saved as comma-separated values and
shown as removable chips. Settings edits every field in the private profile’s
Identity &amp; contact block—legal name parts, both structured addresses and
counties, ZIP codes, birthdate, availability, and phone choices—rather than
showing a read-only duplicate.

Availability is a request gate, not a hidden profile. When a member is marked
Unavailable, their Free Labor and Free Stuff offers stay visible, but neighbors
cannot send labor or product requests: the request button is disabled and both
the dialog and submit paths refuse the
request. Availability is chosen in Settings or the private profile privacy
panel and copied into the local member roster so other members' listings follow
it too. Seeded community offers remain requestable by default.

The phone section asks for a required cell phone, an optional public phone, whether
the public phone is the same as the cell phone, whether the chosen phone number
should appear on the public resume, and whether the member wants text messages.
When “same as cell” is checked, the public phone mirrors the cell phone and locks
until the box is cleared. The text preference is stored locally only; no texts are
sent in this prototype. These fields are shown on the signed-in private profile and
edited in Settings.

The public resume is a filtered projection. It shows the chosen first name,
picture, tag line, bio, profession, City/State from the member-selected mailing or
physical address, both skill lists, confirmed hours worked, items gifted, other
commons totals, availability, and the public phone number only when the member opts
in. It never includes the cell phone, legal name, street or mailing addresses, county, ZIP, housing
status, birthdate, group/crew, report count, comments, or
interactions.
Member IDs are never displayed; they remain storage and report attributes only.
Status badges appear on the public resume: a profession-based Seed badge (for
example, Dancer Seed, Law Seed, Doctor Seed, Cleaning Seed), Beta Founder for
everyone who signs from the database build until rollout, 1st Year for non-seeds
in the first official year, First year Founder for seeds in that year, and
Volunteer for local operating-team members. Seed and Beta Founder badges are
marked pending before rollout; Volunteer is active locally as soon as an offer is
recorded. Badges never include ZIP, dates, or other private fields.

`profile.html` uses the public resume card as the visual basis for the private
record. Signed-in members get an edit-profile action, Dashboard menu, a clear
notice that lower content is not public, and a View as button that toggles between
the public resume and the full private profile. Signed-out visitors only get the
limited public resume; signed-in visitors reach another member’s public resume
through View as. Public member profiles include an Add friend action that searches
current members and records a local friend request. Names in member summaries,
notifications, and group lists link to the appropriate local profile. Public and
private profile background/content colors are editable in Settings and profile,
stored only in `state.pledge.profileTheme`, and validated before use.

Dashboard first menu is exactly Overview, The Commons, Profile, and Settings;
account details and account settings live on the same Settings page. The Commons
menu appears only inside The Commons, on the left with content on the right, and
contains Free Labor, Free Stuff, Donate, Exchanges, Messages, Review Board, and
Friends/Groups. Free beta signup is open for every track except Unbought Academy,
which is phase-gated to Phase 2 and hidden in Phase 1. Commons content is grouped
into a shortcut strip, a compact “Your corner” activity
card, and a wider community-chat card so channels and threads are easier to scan.

## Volunteers and operating-team access

Volunteers get a special Volunteer badge and access to the member tools. The
roles describe the people running Unbought: keeping the website updated, paying
the bills, accepting new volunteers, legal work, records, communications, and
accessibility. The shared sign-up dialog includes a volunteer-intake role. When
a signed-in member records an offer, the offer is stored in `state.volunteerInterests`,
the Volunteer badge appears on the public resume and private profile, and a
volunteer-access card appears in Dashboard → Overview. The private profile's
Local account access block also notes the local access. This is local prototype
access only: it grants no real website admin, server access, or background
check, and the volunteer offer is not transmitted. Optional Supabase Auth is a
separate private-sync account and does not grant website admin rights.

One named person displays a permanent local **Launch Coordinator** label. Because
Unbought launches only once, it stays on that profile with no end date. It is
derived from the local chosen name, is not stored as a credential, and is never
synced. It creates no hierarchy, grants no moderation or group-admin power, is
not a Supabase admin seat, does not enter the web-developer pool, and does not
change the more-than-seven-developer consent rule.

## Confirmed hours and pledge standing

No one can add work hours unilaterally, and no one types hours into a counter. In
Dashboard → Exchanges, the worker and the receiver each confirm a completed service
or product by choosing the same agreed time from fixed options. Matching choices
create a local `labor` contribution with `mutualConfirmation: true`. If the choices
differ, evidence stays on the device and three randomly drawn active members choose
one of the confirmed times; care circle members, students, observers, and either
party are excluded. Only matching or review-decided hours count toward the member's
totals. The same rule applies to the thank-you nudge: it appears only after a
service or product is actually confirmed or logged in Exchanges.

The Pledge form also records a separate monthly work-hours commitment, stored as
`state.pledge.monthlyHours`. Members type any whole number of hours at or above the
Phase 1 minimum of 4 per month; the explicit Care Circle checkbox records no labor
obligation for members who cannot work and disables the hours field. Members can
change this commitment later in Dashboard → Settings → Pledge commitment, with the
same 4-hour minimum and Care Circle exception. The pledge is a stated intention
and never becomes logged hours by itself; only mutual confirmation or a
three-member hour review logs hours.

The first month is probationary. Confirming one week of the monthly pledge
unlocks normal member tools, and a pledge does not freeze during probation. After
that, a pledge freezes only after a full week with no confirmed work while this
month's hours are still short; confirmed work resets that week. Once frozen, only offering labor stays
available until the pledged hours are completed; hours logged after the freeze
count toward that deficit. If the pledge stays frozen for more than 30 days, the
member becomes an Observer. A re-pledge is accepted only after three impartial
active members approve it: Observers, Care Circle members, apprentices, students,
frozen members, and the applicant cannot serve on that review. Care Circle members
with no labor obligation are exempt from freezing.

The Care Circle is offered when someone cannot keep a labor pledge. Basic
Necessities are the base; full access can be confirmed locally; no proof detail,
diagnosis, document, or note is stored or uploaded. Members 65 or
older are automatically in the Care Circle. With no outside paid job or business
they keep retired full access; with one they move to Basic Necessities and are
asked to take an active role in Unbought. Nothing in the site says a 65+ member
cannot work. These status changes and local anonymous review ballots stay in the
browser; optional private sync carries only the resulting status fields.

`donate.html` redirects to `future.html#donations`. Active beta tracks are free;
Academy and funding plans are future-only on `future.html`. No buying, selling,
donations, or purchase intents are part of the active beta, and no payment channel
or intent form is advertised here. Funding, banking, and legal groundwork are
still being built.

## Chosen name in other forms

Signed-in members do not retype their name outside the initial intake. The chosen
name is filled automatically on listing posts, volunteer offers, and the waiting
list. Only the chosen name is reused. The pledge intake still asks
for the full legal name and a chosen name, and the chosen-name setting in the
Dashboard stays editable. Legal name, address, birthdate, housing status, and phone
are never auto-filled elsewhere.

## Member labels and equinox years

The sign-up form collects a primary profession and ZIP code. A seed member is
the first person of a profession to sign up in a ZIP code; the local roster
stores one entry per member and resolves ties by signup time and member ID. The
public badge is the profession plus Seed: Dancer Seed, Law Seed, Doctor Seed,
Cleaning Seed, and so on. Common synonyms map to the shorter badge word, such as
lawyer/attorney/legal to Law Seed.

Every member who signs from the database build through the beta period gets a
Beta Founder badge. The first official membership year begins at the 2027 rollout
equinox; non-seed members who sign during that year get a 1st Year badge, and
seed members who sign during that year get a First year Founder badge. The
Volunteer badge is separate and is active locally when a member records a
volunteer offer.

Membership years begin at the exact moment of the northern vernal equinox. The
beta build year runs from March 20, 2026 at 14:46 UTC to March 20, 2027 at
20:25 UTC — 4:25pm Eastern. That 2027 equinox is also the label rollout moment
and the first day of the first official year, which runs to the 2028 equinox.
Before rollout the dashboard marks Seed and Beta Founder labels as pending
rather than presenting them as live. Published equinox instants for 2026–2031
are kept in `VERNAL_EQUINOXES`; ZIP stays private and never appears on the
public resume; profession is shown.

## Equinox festival and seed-member thank-you

`future.html#festival` describes the hope of partnering with an organization
for a large festival somewhere in the United States on the 2028 vernal equinox,
March 20 at 4:25pm Eastern — one full year after the 2027 rollout — celebrating
the movement and its Seed, Beta Founder, 1st Year, and First year Founder members. The exact sentence is: “The moment
matters because we will have been fully rolled out for a full year, meaning something
must be working”. It is explicitly a planning intention: no venue, partner, or
ticket exists. The beta runs until the exact 2027 vernal equinox, March 20, 2027 at
4:25pm, when the site rolls out; seed members and Beta Founders remain until
then, day joined is logged, and that date is the first day of the first official
year. Seed members who sign in that first official year receive a First year
Founder badge; other first-year members receive a 1st Year badge.

Seed members see a locally generated thank-you draft in the dashboard
(`renderSeedThankYou`). It opens in their own mail app as a pre-filled draft; the
site sends nothing and stores no email log. The copy explains the profession Seed
badge, Beta Founder status when applicable, the possible festival, and suggests
ways to get involved: talk to other professionals locally, post on social media,
scout donated housing, volunteer services to develop the community, and offer
skills through Free Labor. The Academy opens in Phase 2, and giving stays closed
in the beta.

## Community guidelines

`guidelines.html` holds the Ten Consent Commandments and the consequence path:
after probation, a full week without confirmed work freezes the pledge while the
monthly hours are short, and the freeze blocks service requests until the pledged
hours are made up; more than 30 days frozen converts the member to Observer, and
a re-pledge needs approval from three impartial active members. It also covers a
care circle that allows basic necessities, access limits for guideline or law
violations, community review of every case, and exile (membership revocation)
only by a majority vote. A
revoked member serves a community-decided reflection period before reapplying;
the new application goes straight to review and a vote by members in their
area. Reflection is encouraged, and any access change is recorded only as a
resulting access status and time. Nothing is enforced outside this browser prototype.

No porn and no prostitution. There are free websites that can serve those needs
outside of Unbought. Anything else unsuitable for minors must carry an NSFW tag;
the tag is available on Free Labor, Free Stuff, group posts, and community chat
posts, and it never permits prohibited content. Photos can be added to posts and
chat messages, are resized locally, and are never uploaded.

All voting is completely anonymous. Ballots do not store a member ID, name, or
link back to the voter; results show only the choice, reflection period, reason,
and date. Anonymous receipts record only that a ballot was cast on this device.
This applies to review board cases, group guideline votes, and hour-review votes.

## Basic Necessities and alliances

Basic Necessities are Food, Health Care, Dental, Mental Health, Shelter,
Clothing, Gas Cards, and Uber Gift cards. No luxury items or nice to haves.
Groups can decide how mutual aid will work within these limits. The same closed
definition is used in `guidelines.html`, the FAQ, the How It Works track note,
the Academy roadmap, the track panels, and group profiles.

Alliances are other groups within the Unbought network and are active in the beta
through group settings. Groups decide whether to accept an alliance between
them, and working members vote on alliance terms and guidelines. The group
settings field and group profile use this definition; alliance records stay local
in this prototype.

Track access follows the same rules: apprentices may use Basic Necessities only
while enrolled, Care Circle members may use Basic Necessities with no labor
obligation and limits are reviewable with evidence, and Observers may read and
explore. Consequence steps are unnumbered.

Review board voting is impartial and local. Involved parties, friends of
involved parties, Observers, and Care Circle members cannot vote on a case, but
are encouraged to provide evidence and join the review board conversation.
Voting is open to members whose physical-address county matches an involved
party's county; if one party is in State A and the other in State B, members in
both respective counties may vote. Members of the same group may also vote
unless they have a report against them from the last year. Members of allied
groups (other groups within the Unbought network that chose to accept an
alliance) may vote too, unless the group voted to close its review board to
alliances outside its own ZIP code; alliances within that ZIP code are always
included. Working members of groups and alliances vote on alliance terms and
guidelines. County fields are captured on the pledge and editable in Settings,
are used only for eligibility, and are never projected to a public resume.
Cases and votes remain in this browser only.

The guidelines are linked from every footer site map, the FAQ, the pledge
agreement, and the member account panel. Current group admins can delete group
chat posts and replies, require an impartial review of a member, change group
community guidelines, and run guideline votes in chat. Reports made by a temporary
admin require evidence and a non-criminal, impartial member review; criminal
matters are never decided by member vote. Admins record the outcome they believe
the conversation reached: Agreed, Not agreed, or More discussion needed.

## Academy access

Unbought Academy is phase-gated to Phase 2 and is not open during the beta; free
beta signup covers every other track. Its access and tuition rules are planning
material on `future.html` and in `faq.html`, and the related standing levels are
on `guidelines.html`. No tuition is charged, no payment is processed, and no
tuition obligation is created in this prototype.

## FAQ and help button

`faq.html` answers common questions about membership, privacy, local-only
prototype data, goods and labor, safety reporting, member labels, the open
invitation beta, and the vernal-equinox rollout. It is linked from every footer
site map, and `app.js` adds a
small fixed question-mark button to every page so the FAQ is always one tap
away. The FAQ uses native `<details>` accordions and needs no extra script.

## Safety standards acknowledgment

`safety-standards.html` is the canonical, versioned copy of the Labor & Product
Safety Standards. The current version is `2026-11-22`, labeled “Labor & Product
Safety Standards, Nov 22, 2026”. Members check a required box when they sign the
pledge. Pledged members are also asked to acknowledge the current version before
posting, editing, or requesting a labor or goods exchange, and after a version
change. If a member has already acknowledged the current version, the action
continues without another prompt.

The acknowledgment record is local-only: it stores an ID, standards version and
label, local member ID, chosen name, accepted time, and source in
`state.safetyAcknowledgments`. It is never sent to Supabase and is not part of
the private sync allowlist. Dashboard → Settings shows the recorded date and
version, offers **Review standards**, and can download the record as
`unbought-safety-acknowledgment.txt`. The copy says plainly that this is a record
of reading the rules, not legal advice, not medical or legal guidance, and not a
promise of legal protection. No database migration is needed for this feature.

## Free Labor directory and service titles

The labor directory uses the five pillars as umbrella categories. Each pillar
has its own listed service titles, and the title choices in the filter sidebar
change when a different pillar is selected. Members can search by listing title,
description, provider, or service title; filter by city, two-letter state, ZIP
prefix, and in-person/online format; and sort by featured, newest, title,
service title, location, or nearest to a ZIP entered in the sort controls.
Active filters can be removed one at a time. Custom titles entered by members
also appear as filter choices. Both directory pages open straight into the
directory without a separate hero block, use a compact section head, and keep
search and filters collapsed behind a “Search & filters” disclosure until needed.
Both directories have a required search field. They use compact linked cards
(photo, tags, title, description, and location); the
whole card is the link, no card text is underlined, and clicking it opens the
details dialog with more information. Cards also support `?listing=<id>` deep links
so an opened card can be restored from a local link. Existing tags and badges stay
on the card.

The post form follows the same structure. A member chooses a pillar, then a
listed service title, or writes a new one. Location can be city/state/ZIP, city
and state only, ZIP only, or online; the chosen mode decides which fields are
required and what is stored on the listing. When a title is not on the list, the
prototype saves a maintainer note in Dashboard → Suggestions with the title,
pillar, listing title, and location. In a live site that note would be delivered
to whoever maintains the site; this prototype sends nothing and displays that
boundary in the form and the saved note.

## Free Stuff catalog and filters

The goods directory has a filter sidebar and a compact product grid: category,
condition, color, brand, city, state, ZIP, and details that change with the
chosen category (for example food type, size, wattage, title status, or card
type). Results can be sorted by title, date, category, location (state and
city), or nearest to the ZIP entered in the sort controls. Active filters can be
removed one at a time.

New listings save city, state, and ZIP as structured fields. Seed listings keep
their readable location label, and the same fields are derived from it so every
offer can be filtered the same way. Nearest-ZIP sorting compares the first five
ZIP digits as a local approximation; it is not a map or a real distance service.

Location placeholders across the site still use Pocono-area towns in Pennsylvania
(Stroudsburg, East Stroudsburg, Mount Pocono, Jim Thorpe, and nearby ZIP codes),
but beta membership is not regional. These are examples only; anyone invited can
enter their own location.

Members can offer legal, safe goods of almost any kind: groceries, household
supplies, clothing, furniture, tech, tools, solar panels, raw materials,
vehicles, gift cards for independent small businesses and co-ops, and other
items. Gift cards never name major corporations. For vehicles, the car is free
and the receiving person covers registration and titling fees; those fees are
paid to the state, not to Unbought. Weapons, medication, recalled goods, and
unsafe items remain excluded.

Attributes are stored as structured fields on each listing. When Supabase is
configured, the public listing fields are shared there; photos, comments, and
private listing details stay in this browser. Filters operate on the merged local
and public listing set.

Members can edit their own listings with “Edit my listing” on the card or in the
details dialog. The post form opens prefilled, and saving keeps the original ID,
posting date, requests, comments, and report links. Edits are local-only in this
build: the Supabase table is append-only, so the already-shared public row is not
updated and a reload will not overwrite the member's edited copy. Photos, comments,
and private details are never synced.

## Photos on posts

Members can attach up to three photos to a goods or labor post. Each image is
resized in the browser to a small JPEG preview (at most 800px on the long edge)
and saved with the listing in this browser. A photo appears on the compact listing
card, extra photos are counted there, and the full set appears in the details
dialog. Nothing is uploaded, and no photo leaves the device.

Each photo is stored as a structured record with `id`, `name`, `mime`, `size`,
`width`, `height`, `addedAt`, a local-only `dataUrl`, and an empty `storageRef`.
When a backend is added, `storageRef` can point to the stored image and the
placeholder `dataUrl` can be dropped without changing the listing or card code.

## Safety reporting and evidence

Reports are opened from the place where the interaction happened: a Free Labor or
Free Stuff listing, a comment on a listing, a dashboard message, community or social
chat, a member profile, or the accountability panel. The report form never asks the
reporter to type the reported person’s name; the listing, comment, message, or profile
supplies it. Reporters are still identified by their own member record.

A report can include local multimedia evidence: images are resized and previewed,
text or message files are copied, and other files are recorded by name, type, and
size only. Evidence is stored in the same browser with the case file. No file, message,
report text, evidence, reason, or reporter identity is uploaded by this
prototype. With optional private sync on, filing or settling a report sends only
the reported member's local ID and an `open`/`settled` flag so a reported
web-developer admin's access can pause.

## Notifications, social circles, and local conversations

Dashboard → Notifications holds local drafts: messages, requests, comments, group
posts, social chat drafts, and a one-time notice when a review board case opens and
the member is eligible to vote (excluded members get no vote notice). Each
notice is one whole list-item link: clicking the item marks it read and opens its target.
Notices can also be marked read all at once. Listing-comment notices point back to
the comment on Free Labor or Free Stuff instead. A live system would notify
neighbors about messages, requests, and comments on their posts; this prototype
delivers nothing.

Dashboard → Friends & Groups automatically places the member in the main town group
named after their town (for example, "Stroudsburg Group I"). Other groups are social
or support circles the member creates or joins. The group form opens in join mode:
members search group names saved on this device and each Request to join button
records a pending request only for the signed-in member; no one else is added and
nothing is delivered. Create mode still saves a local social circle. Groups decide
how mutual aid works within Basic Necessities and whether to accept an alliance with
another group in the Unbought network. Town group names link to
`group.html?group=<id>`, and group counts come from `group.members`, not a typed
number. When a town group reaches 150 people, another Stroudsburg group is created
with a Roman numeral ending: II, III, … XI. The first member of a new numbered group
is not a seed member, Seed and other membership badges stay with the member's
sign-up record rather than the group, and neighbors may choose Group I, II, III,
XI, and so on. Joining a numbered
group moves the member out of the previous town group. Town group profiles show the
location below the title with city/state and ZIP.

These are the local group admin seats, separate from Supabase's rotating
web-developer admins. Seven local seats rotate each week for workers only, on
staggered one-to-seven-week cycles. Worker eligibility uses track, profession, skills, or confirmed exchanges;
Care Circle, Observer, and Apprentice members cannot hold a seat or be added as a
standing admin. When notified of a seat, the member must read the Unbought
Community Guidelines and that group’s guidelines, then accept by 6pm local time
the day before the term starts. Until then the seat stays pending and no admin
tools are available. Declining or missing the deadline chooses a backup admin from
the other eligible workers. Group admins are responsible for upholding the
Unbought Community Guidelines and maintaining their group’s guidelines. Active
admins can add another admin, cancel a group, delete group chat posts and replies,
require an impartial review, change that group’s community guidelines, and run a
guideline vote. A member can leave a non-town group when another active admin
exists. The town group cannot be left; only an active admin can cancel a group.
Guideline votes open a group chat post where replies beginning Agree or
Disagree are tallied, and an admin records Agreed, Not agreed, or More discussion
needed with an optional note.

`group.html` headings stay exactly Members, Admins, Group chat, Offers in Free
Stuff & Free Labor, and Group details. Group chat is made of posts with replies
attached to the post; there are no separate group comments and no Group involvement
block. Offers come only from that group’s members’ Free Stuff and Free Labor posts;
scraped listing comments are not shown. Group profiles show the member list, admin
seats, group chat, group offers, and local details only.

Funding, banking, and legal groundwork are still being built. Land and housing
plans are future goals described on `future.html`; admins from all groups will
eventually coordinate Unbought spending, and each group will scout its own area.
The prototype opens no accounts, makes no contact, and transmits nothing.

## Group brands and businesses (Phase 2)

Group business features are stored locally in `group.settings` and hidden in Phase 1
(`SITE_PHASE = 1`). They roll out on the 2027 vernal equinox, **March 20, 2027 at
4:25pm Eastern**, the same instant as the rest of the full site. A group can create a
Business and offer a collection of related services and products as a Group Brand,
creating industry inside a moneyless society; members still receive everything free.
Only a current admin can open Group settings from the group profile. There, admins set
a physical location or mark the group **Online** when it has no physical location, and
can record a brand name, the related offers, a description, and optional co-op legal
information. The Unbought Brand is optional: choosing it records, in local copy only,
that the Unbought legal guild and administrative guild will work with the group to
ensure safety. Forming a co-op is a legal step outside Unbought; nothing is filed,
registered, published, or transmitted. The group profile shows a Group Brand banner
under "Offers in Free Stuff & Free Labor" and the location or "Online" under the group
title, without adding any new headings to the group profile.

The member search covers a small local sample directory plus the current member
recorded on this device; searches match chosen name, profession, and city/state.
Sending, accepting, and declining friend requests changes local records only, and
public profiles offer the same Add friend action. The panel also stores friends and
social chat drafts with exactly Audience, Title, Message, and picture; each chat
record carries its audience label. There is a single local account, so no request
or chat draft is delivered and no other person’s data changes. Friend lists and
every group are capped at 150 people.

Dashboard → The Commons also has community chat channels. Members can create a
channel, then create threads within that channel; every thread and reply has a
subject. A picture is optional, and anything unsuitable for minors is tagged
NSFW. Channels live in `state.communityChannels`, threads in
`state.communityThreads`, and messages in `state.chats` with channel, thread,
subject, NSFW, and picture fields. Public groups and community threads are shared
through the public data bridge; photos stay on the device. Each public resume
shows that member's Free Stuff and Free Labor offers plus their community chat
posts; group chat posts and replies stay on the group profile for group members
only.

Free Labor and Free Stuff listings have separate local comment threads with replies
(a reply simply quotes the earlier chosen name). Comments on the static seed
listings are stored in `state.listingComments` by listing id so they survive a
reload; comments on member-created listings are also kept on the listing record.
Every comment has its own contextual report trigger. Nothing is published or
transmitted.

## Prototype boundaries

This build is static and local-first. The local demo sign-in is not real
authentication, and there is no payment processing, email delivery, paid email
service, wage API, stock issuance, payout, or police report. No secrets are placed
in browser code. Public directory data is shared through the always-on public
bridge; private records are transmitted only after explicit opt-in. Messages,
report text and evidence, photos, and local sign-in details always stay on the
device. With opt-in private sync, only the reported
member ID and an `open`/`settled` flag are sent for report pauses. The
Launch Coordinator label is local-only, stays on the profile with no end date,
and is never synced. No password, hash, DOB, address, phone, private email, or
other private detail is added to source for it. `SITE_PHASE = 1` hides Phase 2
features such as the Unbought Academy and group brands/business settings.
Every footer carries “Free Labor. Free Goods. Shared Care.” exactly once.
Active beta tracks are free; Academy and funding plans are future-only on
`future.html`. No buying, selling, donations, or purchase intents are part of the
active beta. Nothing here opens an account, buys an item, or pays anyone.

## Hosting

The project is hosted at <https://github.com/Unbought26/Unbought>. The published
site is <https://unbought26.github.io/Unbought/> and uses GitHub Pages from the
`main` branch.

## Reviewer-set project-hours handoff

This is a one-time local handoff entry for the site owner's first logged
contribution to Unbought. The reviewer reviewed the 58 commits dated November 12
through November 23, 2026, with about 40,745 lines added and 6,055 lines changed
or removed, and set a conservative reviewer estimate of **80.00 hours** of
Unbought project work through November 23, 2026, including the site owner's
reading, review, decisions, corrections, and editing time, not just prompt text
or generated commits. This is an estimate, not measured time or a timesheet.
Because there were no other
members available for the normal worker/receiver confirmation, the reviewer
served as the impartial second confirmation for this one entry only. It is stored
locally as a confirmed labor contribution, counts toward confirmed hours and
pledge standing, and is never sent to Supabase.

The hourly value is **$47.85**, the U.S. Bureau of Labor Statistics May 2025
median hourly figure shown for Web Developers and Digital Designers in the
Occupational Outlook Handbook (SOC 15-1254/15-1255 group). BLS has no official
remote-only national wage, so this is the closest neutral public benchmark rather
than a payroll promise. The 80.00 hours are valued at **$3,828.00** in the
handoff. This valuation is a record of worth, not wages due, an invoice, a
donation, a payout, or a live wage API.

The local prototype username for the site owner is `unbought.founder`. The
temporary password is deliberately not written here, in source, in the PDF, or
in cloud data; it is given only in the final handoff message and should be
changed after first sign-in.

## Provenance

This project is human-directed and AI-assisted. All published changes are reviewed,
tested, and maintained by the site owner.
