# Unbought

Unbought is a local-first, static prototype for a mutual-aid community built around
consent, free labor, free goods, and shared accountability.

The current site is a front-end prototype. It uses `localStorage` for demonstration
data, and no account, pledge, exchange, donation, or waiting-list information is
transmitted to a server.

The sample Newsboard posts are general updates about the movement and rollout
process, not a coding changelog. A future blog service will replace them.

## Pages

- `index.html` — How It Works, with the Newsboard near the top
- `pledge.html` — The Pledge and sign-up
- `freelabor.html` — Free Labor directory and post form
- `freestuff.html` — Free Stuff directory and post form
- `donate.html` — Donation form and closing call to action
- `future.html` — What’s to Come, donation information, and waiting list
- `dashboard.html` — Member dashboard, full private record, and Exchanges
- `profile.html` — Public member resume with a private record for the signed-in member

## Running locally

Open `index.html` directly in a browser, or serve the directory locally, for example:

```bash
python -m http.server 8000
```

Then visit <http://localhost:8000/>.

Prototype sign-in accepts a locally created username and password. Passwords are
stored only in the browser as a salted prototype hash; this is not real account
security and must be replaced before any production deployment.

## Member data and public resume

The local member record stores full legal name, chosen name, mailing and physical
addresses, housing status, birthdate, phone, profession, career/paid skills, unpaid
skills, bio, locally resized picture, chosen tag line, private group/crew, donation
count, confirmed hours worked, hours used, items gifted, items taken, reports made
against the member, availability, and public-sharing choices. The full record is
visible only in the Dashboard and in the signed-in member profile.

The public resume is a filtered projection. It shows the chosen first name,
picture, tag line, bio, profession, City/State from the member-selected mailing or
physical address, both skill lists, confirmed hours worked, items gifted, other
commons totals, availability, and a phone number only when the member opts in. It
never includes the legal name, street or mailing addresses, ZIP, housing status,
birthdate, group/crew, or report count.

## Confirmed hours and member-only fund metrics

Members cannot enter their own work hours. In Dashboard → Exchanges, the worker and
the receiver each confirm a completed service or product and enter the hours they
believe were worked. Matching numbers create a local `labor` contribution with
`mutualConfirmation: true`. If the numbers differ, evidence stays on the device and
three randomly drawn active members vote on the hours; care circle members,
students, observers, and either party are excluded. Only matching or review-decided
hours count toward the member's totals.

The member account panel is the only place that shows hours worked and amounts
donated by week, month, year, and all time, the member's entitled severance share,
and the current Unbound donation fund balance. The stored `severanceFund` key and
`severance_purchase` contribution type are retained only for older local data. No
payout, stock issuance, or payment occurs, and nothing is transmitted.

`donate.html` catalogues the same ledger: whole-dollar amount and frequency,
optional chosen name and note, local timestamp and intent ID, member link only when
signed in, and a guest email only for a future local thank-you. It also explains
that donations, academy tuition, non-member purchases, and mutually confirmed
hours share the same accounting model while sensitive profile fields stay private.

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
labor post forms a provider can opt in to a fixed whole-dollar price for
non-members, who see that price on the card and in the locked purchase dialog.
Guests cannot type their own amount: the submit handler reads the provider's
stored price and records a `nonmember_purchase` request plus a contribution in
the local Unbound donation fund. Listings without an opt-in are shown as member-only and
cannot be purchased. Internally the fund still uses the legacy `severanceFund`
key and `severance_purchase` contribution type so older local data loads, but
all visible copy calls it the Unbound donation fund, which also holds academy tuition.

## Member labels and equinox years

The sign-up form collects a primary profession and ZIP code. A seed member is
the first person of a profession to sign up in a ZIP code; the local roster
stores one entry per member and resolves ties by signup time and member ID.
Founding members are seed members whose signup falls in Unbought's first year.

Membership years begin at the exact moment of the northern vernal equinox. The
first year runs from March 20, 2026 at 14:46 UTC to March 20, 2027 at 20:25 UTC
— 4:25pm Eastern. That 2027 equinox is also the label rollout moment. Before
then the dashboard shows the labels as pending rather than presenting them as
live. Published equinox instants for 2026–2031 are kept in `VERNAL_EQUINOXES`;
ZIP stays private and never appears on the public resume; profession is shown.

## Equinox festival and seed-member thank-you

`future.html#festival` describes the hope of partnering with an organization
for a large festival somewhere in the United States on the 2027 vernal equinox,
March 20 at 4:25pm Eastern — the end of the first year and the label rollout —
to celebrate the movement and its seed and founding members. It is explicitly a
planning intention: no venue, partner, or ticket exists.

Seed members see a locally generated thank-you draft in the dashboard
(`renderSeedThankYou`). A live deployment would email it automatically. The
copy explains the label, mentions the possible festival, and suggests ways to
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

The guidelines are linked from every footer site map, the FAQ, the pledge
agreement, and the member account panel.

## Academy access and tuition

The Academy is free for pledged members. Non-members may enroll at the
standard tuition set by a guild; every cent goes to the Unbound donation fund, and this
prototype processes no payments. Neighbors aged 15 and older who are not
already working in the commons can learn free by promising to work for Unbought
part time (the community's 1–15 hours per week rhythm) for one year upon
completing the program. That year must finish before their 25th birthday, or
they become liable for the same tuition offered to non-members. Students hold a
limited standing — basic necessities only — while enrolled, and not completing
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
Active filters can be removed one at a time. Custom titles written in by members
also appear as filter choices.

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

Attributes are stored as structured fields on each listing, ready for a future
shared database. All listings and filters still operate only in this browser;
nothing is transmitted.

## Photos on posts

Members can attach up to three photos to a goods or labor post. Each image is
resized in the browser to a small JPEG preview (at most 800px on the long edge)
and saved with the listing in this browser. Photos appear as thumbnails on the
listing card; extra photos are counted on goods cards. Nothing is uploaded, and
no photo leaves the device.

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

## Notifications, social circles, and listing conversations

Dashboard → Notifications holds local drafts created by the signed-in member’s own
actions: messages, requests, comments, and social chat drafts. Notices can be marked
read individually or all at once, and the Open action switches to the related
dashboard tab when there is one. Listing-comment notices have no dashboard panel
and point back to the comment on Free Labor or Free Stuff instead. A live system
would notify neighbors about messages, requests, and comments on their posts;
this prototype delivers nothing.

Dashboard → Friends & Groups stores friends by chosen name, one group of your own,
groups you have joined, and social chat drafts addressed to friends or one of those
groups. Each chat record carries its audience label. There is a single local account,
so there are no invitations, account lookups, or changes to another person’s data.
Friend lists are capped at 150 people and every group at 150 people.

Free Labor and Free Stuff listings have local comment threads with replies (a reply
simply quotes the earlier chosen name). Comments on the static seed listings are
stored in `state.listingComments` by listing id so they survive a reload; comments
on member-created listings are also kept on the listing record. Every comment has
its own contextual report trigger. Nothing is published or transmitted.

## Hosting

The project is hosted at <https://github.com/Unbought26/Unbought>. The published
site is <https://unbought26.github.io/Unbought/> and uses GitHub Pages from the
`main` branch.

## Provenance

This project is human-directed and AI-assisted. All published changes are reviewed,
tested, and maintained by the site owner.
