# Unbought

Unbought is a local-first, static prototype for a mutual-aid community built around
consent, free labor, free goods, and shared accountability.

The current site is a front-end prototype. It uses `localStorage` for the full
member record. A public-data-only Supabase bridge shares group cards, Free Labor
and Free Stuff listings, and community chat content. Pledge records, account
details, messages, reports, donations, waiting-list entries, photos, and private
profile fields are never transmitted.

See `supabase/README.md` for the schema, security notes, and setup steps. The site
remains hosted on GitHub Pages; Supabase is only a backend for shared public data.

The sample Newsboard posts are general updates about the movement and rollout
process, not a coding changelog. A future blog service will replace them.

## Pages

- `index.html` — How It Works, with the Newsboard near the top
- `pledge.html` — The Pledge and sign-up
- `freelabor.html` — Free Labor directory and post form
- `freestuff.html` — Free Stuff directory and post form
- `donate.html` — Donation fund plan and status; giving is closed until a bank account, lawyer, and accountant are in place
- `future.html` — What’s to Come, donation information, and waiting list
- `dashboard.html` — Member dashboard, full private record, and Exchanges
- `profile.html` — Public member resume with a private record for the signed-in member
- `group.html?group=<id>` — Group profile with members, worker admins, chat, and offers
- `supabase-config.js`, `supabase-sync.js`, `supabase/` — Public-data-only Supabase bridge and migration

## Running locally

Open `index.html` directly in a browser, or serve the directory locally, for example:

```bash
python -m http.server 8000
```

Then visit <http://localhost:8000/>.

Prototype sign-in accepts a locally created username and password. Passwords are
stored only in the browser as a salted prototype hash; this is not real account
security and must be replaced before any production deployment. When power of
attorney applies, the pledge form can also create a second local username and
password for the authorized representative. Either sign-in can manage the
member’s local record on their behalf. The prototype does not verify legal
documents, grant legal authority, or transmit anything.

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
resized picture, chosen tag line, private group/crew, donation count, confirmed hours
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
cannot send labor or product requests or record a non-member purchase intent:
the request button is disabled and both the dialog and submit paths refuse the
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
status, birthdate, group/crew, report count, amounts donated, comments, or
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
Friends/Groups. Unbought Academy is phase-gated to Phase 2 and hidden in Phase 1.
Commons content is grouped into a shortcut strip, a compact “Your corner” activity
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
access only: there is no real authentication, website admin, server, or
background check, and nothing is transmitted.

## Confirmed hours and member-only fund metrics

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
`state.pledge.monthlyHours`. Members choose a fixed option from 4 hours per month
upward; the Care Circle option records no labor obligation for members who cannot
work. This pledge is a stated intention only and never becomes logged hours.

The member account panel is the only place that shows hours worked and amounts
donated by week, month, year, and all time, the current Unbought donation fund
balance, and the member's share of it. The stored `severanceFund` key and
`severance_purchase` contribution type are retained only for older local data. No
payout, stock issuance, or payment occurs, and nothing is transmitted.

`donate.html` explains the same ledger model: whole-dollar amount and frequency,
optional chosen name and note, local timestamp and intent ID, member link only when
signed in, and a guest email only for a future local thank-you. Signed-in members
may credit a future intent to one of their groups or alliances; that source is
stored as `groupId` or `allianceId` for local share calculations only. Giving is
closed in this build: the local intent form is hidden, all donation calls to action
say “Read the fund plan,” and no payment channel is advertised. It also explains
that donations, academy tuition, non-member purchases, and mutually confirmed hours
share the same accounting model while sensitive profile fields stay private.

The published allocation plan runs in stages. Every dollar starts with pre-rollout
operations: licensing, web hosting, database set up, and social media awareness.
The beta plan is to get the database, mailer, and social channels running for free
first, then open a dedicated account for the Unbought donation fund and let it sit
until a lawyer and accountant are on board. No pledge service or giving link is
published before that. Once the Land Trust account is formed and initial
start-up costs are paid, the fund builds in an account while seeking accountants
until the first plot of land, house, or warehouse can be bought. The first house
will be where the most Unbought members live; scaling means groups keep scouting
locally while the first purchase follows the densest membership. After that, a
separate housing-stability account keeps
the Land Trust alive, obtains resources, and keeps the lights on. Vacant houses will
be furnished for members to stay free or for non-members to stay for donations
decided by surrounding Groups. Any budget that has leftover money sends it to the
surplus fund; money that is spoken for, including savings for taxes and utilities,
stays in an active checking fund.

Once the balance sheet is organized and producing a surplus, that surplus goes to a
local member wishlist. Members search a fixed catalog, may type their own item, add
an example `http(s)` link, and label each entry High priority, Medium, or Nice to
have. High priority equals 3 points, Medium equals 2, and Nice to have equals 1;
the points come from the type, not a typed number. Each item also has a local
wishlist group: Active working members, Disabled, Over 65, Homeless, Under 25, or
Confirmed report within the last year, in that order. The group is not chosen by
hand. It is derived from age, disability status, housing status, and all
information in the member's profile stored on this device, including the
care/capacity track, worker information, and confirmed reports. “Active working
members” is the default; when more than one status applies, the first matching
status group in the published order is used. The group is re-derived when the
profile changes and never appears on a public resume. Each priority list is first
come, first served: the waitlist picks the earliest saved item on each list and
cycles through the six lists. The category and its points remain visible as local
priority labels, and matching titles tally with other lists. Whoever listed an item
first on its priority list sees it first. After seven days, unless the item is
marked perishable, it appears in the public wishlist. No item is bought, delivered,
or transmitted, and wishlists never appear on a public resume. The wishlist is
separate from the closed Basic Necessities list.

When a member withdraws, the prototype shows a cancellation estimate capped at
$4,000. It multiplies the member's share of contributions credited to their groups
and alliances by those groups' share of the Unbought donation fund. The calculation
appears in the member account panel and in the withdrawal confirmation. That capped
severance check is separate from a group's uncapped slice of unspoken-for money, so
the two amounts can be different. Both are local estimates only, with no payout,
debt, legal claim, or transmission.

## Chosen name in other forms

Signed-in members do not retype their name outside the initial intake. The chosen
name is filled automatically on listing posts, volunteer offers, donation intents,
and the waiting list. The non-member purchase form is shown only to guests, who type
their own name there. Only the chosen name is reused. The pledge intake still asks
for the full legal name and a chosen name, and the chosen-name setting in the
Dashboard stays editable. Legal name, address, birthdate, housing status, and phone
are never auto-filled elsewhere.

## Member-set non-member prices

Members always get goods and labor free through mutual consent. On the goods and
labor post forms a provider can opt in to a fixed whole-dollar suggested donation
price for non-members, shown as a badge on the card, as a "Donation price" row in
the details dialog, and in the locked purchase dialog. Each directory has a
**Donation price** filter (free to everyone, has a suggested donation, under $25,
$25–$49, $50 and up), and the text search also matches the dollar amount, so
neighbors can find and compare prices. Only pledged members can post a service
or product: the posting button and the `#post-trigger` / `#post-form` links check
membership before opening the form, and restricted members are blocked too.
Guests cannot type their own amount: the submit handler reads the provider's
stored price and records a `nonmember_purchase` request plus a contribution in
the local Unbought donation fund. Listings without an opt-in are shown as member-only and
cannot be purchased. Internally the fund still uses the legacy `severanceFund`
key and `severance_purchase` contribution type so older local data loads, but
all visible copy calls it the Unbought donation fund, which also holds academy tuition.

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
(`renderSeedThankYou`). A live deployment would email it automatically. The
copy explains the profession Seed badge, Beta Founder status when applicable,
the possible festival, and suggests ways to
get involved: talk to other professionals locally, post on social media, scout
cheap or donated housing, start an Unbought business for donation revenue,
donate, volunteer services to develop the community, and offer skills through
Free Labor or the Academy. Nothing is sent from this prototype.

## Community guidelines

`guidelines.html` holds the Ten Consent Commandments and the consequence path:
monthly pledge review with observe-only status, a care circle that allows basic
necessities, access limits for guideline or law violations, community review of
every case, and exile (membership revocation) only by a majority vote. A
revoked member serves a community-decided reflection period before reapplying;
the new application goes straight to review and a vote by members in their
area. Therapy is encouraged, and some cases require a therapeutic evaluation
and proof of treatment. Nothing is enforced outside this browser prototype.

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
Clothing, Gas Cards, Uber Gift cards, spot on the waitlist for land, access to
the Academy. No luxury items or nice to haves. Groups can decide how mutual aid
will work within these limits. The same closed definition is used in
`guidelines.html`, the FAQ, the How It Works track note, the Academy roadmap,
the track panels, and group profiles.

Alliances are other groups within the Unbought network. Groups decide whether
to accept an alliance between them, and working members vote on alliance terms
and guidelines. The group settings field and group profile use this definition;
alliance records stay local in this prototype.

Track access follows the same rules: apprentices may use Basic Necessities only
while enrolled, Care Circle members may use Basic Necessities with no labor
obligation and limits are reviewable with evidence, and Observers may read,
explore, and donate. Consequence steps are unnumbered.

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

## Academy access and tuition

The Academy is free for pledged members. Non-members may enroll at the
standard tuition set by a guild; every cent goes to the Unbought donation fund, and this
prototype processes no payments. Neighbors aged 15 and older who are not
already working in the commons can learn free by promising to work for Unbought
part time (the community's 1–15 hours per week rhythm) for one year upon
completing the program. That year must finish before their 25th birthday, or
they become liable for the same tuition offered to non-members. Students hold a
limited standing — Basic Necessities only — while enrolled, and not completing
the program creates a tuition obligation. This is a community commitment
reviewed under the guidelines, not a legal contract, and full membership still
opens at 18. The rules live in the Academy section of `future.html`, in `faq.html`,
and in the standing levels on `guidelines.html`.

## FAQ and help button

`faq.html` answers common questions about membership, privacy, local-only
prototype data, goods and labor, safety reporting, member labels, and the
Poconos rollout. It is linked from every footer site map, and `app.js` adds a
small fixed question-mark button to every page so the FAQ is always one tap
away. The FAQ uses native `<details>` accordions and needs no extra script.

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

Because this rollout is in the Poconos, location placeholders across the site
use Pocono-area towns in Pennsylvania (Stroudsburg, East Stroudsburg, Mount
Pocono, Jim Thorpe, and nearby ZIP codes). These are examples only; members can
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
size only. Evidence is stored in the same browser with the case file. No file,
message, or report is uploaded or transmitted by this prototype.

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

Seven admin seats rotate each week for workers only, on staggered one-to-seven-week
cycles. Worker eligibility uses track, profession, skills, or confirmed exchanges;
Care Circle, Observer, and Apprentice members cannot hold a seat or be added as a
standing admin. Only admins can add another admin, cancel a group, delete group chat
posts and replies, require an impartial review, change that group’s community
guidelines, and run a guideline vote. A member can leave a non-town group when
another admin exists. The town group cannot be left; only an admin can cancel a
group. Guideline votes open a group chat post where replies beginning Agree or
Disagree are tallied, and an admin records Agreed, Not agreed, or More discussion
needed with an optional note.

`group.html` headings stay exactly Members, Admins, Group chat, Offers in Free
Stuff & Free Labor, and Group details. Group chat is made of posts with replies
attached to the post; there are no separate group comments and no Group involvement
block. Offers come only from that group’s members’ Free Stuff and Free Labor posts;
scraped listing comments are not shown. Group profiles show the member list, admin
seats, group chat, group offers, and local details only.

Each group profile also shows an uncapped local surplus allowance: the group's slice
of unspoken-for money. It is the group's share of locally credited contributions to
Unbought applied to the current local fund balance as a surplus proxy; it is not a
budget, payment, or promise. It is separate from a member's capped severance check.
Eventually the admins from all groups will come together to figure out Unbought
spending. Each group is in charge of finding land in its own area that it wants to
collectively buy; the allowance only guides that local discussion. Once a group picks
a house, it would contact the all-volunteer Unbought housing team (real estate,
lawyers, and others) to check whether the house is available to buy. No contact is
made or transmitted by the prototype.

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
subject, NSFW, and picture fields. All of it stays on this device. Each public
resume shows that member's Free Stuff and Free Labor offers plus their community
chat posts; group chat posts and replies stay on the group profile for group
members only.

Free Labor and Free Stuff listings have separate local comment threads with replies
(a reply simply quotes the earlier chosen name). Comments on the static seed
listings are stored in `state.listingComments` by listing id so they survive a
reload; comments on member-created listings are also kept on the listing record.
Every comment has its own contextual report trigger. Nothing is published or
transmitted.

## Prototype boundaries

This build is static and local-first. There is no real authentication, payment
processing, email delivery, wage API, stock issuance, payout, police report, server
upload, or server transmission. Copy across the site says plainly that nothing is
transmitted. `SITE_PHASE = 1` hides Phase 2 features such as the Unbought Academy and
group brands/business settings.
Every footer carries “Built on Consent.” exactly once. The public fund name is
“Unbought donation fund”; internal `severanceFund`, `severance_purchase`, and
`getSeveranceSummary()` keys remain only for older local data compatibility. The
working name “Unbought Community Trust” appears only in `future.html`, and
“Free Goods Fund” is donation priority #4. The donation-fund stages, surplus
wishlist, and $4,000 cancellation estimate are local planning records; they open no
accounts, buy no items, and pay no one.

## Hosting

The project is hosted at <https://github.com/Unbought26/Unbought>. The published
site is <https://unbought26.github.io/Unbought/> and uses GitHub Pages from the
`main` branch.

## Provenance

This project is human-directed and AI-assisted. All published changes are reviewed,
tested, and maintained by the site owner.
