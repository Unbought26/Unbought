# Unbought

Unbought is a local-first, static prototype for a mutual-aid community built around
consent, free labor, free goods, and shared accountability.

The current site is a front-end prototype. It uses `localStorage` for demonstration
data, and no account, pledge, exchange, donation, or waiting-list information is
transmitted to a server.

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
addresses, housing status, birthdate, phone, career/paid skills, unpaid skills,
donation count, hours completed, hours used, items gifted, items taken,
availability, and public-sharing choices. The full record is visible only in the
Dashboard and in the signed-in member profile.

The public resume is a filtered projection. It shows the chosen first name,
City/State from the member-selected mailing or physical address, both skill lists,
commons totals, availability, and a phone number only when the member opts in. It
never includes the legal name, street address, ZIP, housing status, or birthdate.

## Chosen name in other forms

Signed-in members do not retype their name outside the initial intake. The chosen
name is filled automatically on listing posts, volunteer offers, donation intents,
and the waiting list. The non-member purchase form is shown only to guests, who type
their own name there. Only the chosen name is reused. The pledge intake still asks
for the full legal name and a chosen name, and the chosen-name setting in the
Dashboard stays editable. Legal name, address, birthdate, housing status, and phone
are never auto-filled elsewhere.

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
Free Stuff listing, a dashboard message or community chat, a member profile, or the
accountability panel. The report form never asks the reporter to type the reported
person’s name; the listing, message, or profile supplies it. Reporters are still
identified by their own member record.

A report can include local multimedia evidence: images are resized and previewed,
text or message files are copied, and other files are recorded by name, type, and
size only. Evidence is stored in the same browser with the case file. No file,
message, or report is uploaded or transmitted by this prototype.

## Hosting

The project is hosted at <https://github.com/Unbought26/Unbought>. The published
site is <https://unbought26.github.io/Unbought/> and uses GitHub Pages from the
`main` branch.

## Provenance

This project is human-directed and AI-assisted. All published changes are reviewed,
tested, and maintained by the site owner.
