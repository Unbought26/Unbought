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
