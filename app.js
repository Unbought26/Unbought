/* ==========================================================================
   UNBOUGHT — app.js
   Vanilla JavaScript for the Unbought community prototype.

   Everything is stored in one versioned localStorage key. No network calls,
   no analytics, no third-party code. All user-generated text is inserted with
   textContent / value assignments rather than HTML strings, so a saved listing
   can never inject markup into the page.

   Contents:
     01. Data & constants
     02. State, storage & small helpers
     03. Services & goods directory
     04. Posting a listing
     05. Pledge & digital signature
     06. Membership tracks
     07. Tabs, navigation & page polish
     08. Dialogs, land inquiries & reset
     09. Initialization
   ========================================================================== */
(() => {
  'use strict';

  /* ------------------------------------------------------------------------
     01. Data & constants
     ------------------------------------------------------------------------ */
  const STORAGE_KEY = 'unbought:v1';
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const reportEvidenceDrafts = new WeakMap();
  const reportEvidencePending = new WeakMap();
  let reportDialog = null;

  // Sample newsboard posts shared by the public site and the member dashboard.
  // A blog service will replace this list in the live site.
  const NEWS_POSTS = Object.freeze([
    {
      date: '2026-11-19',
      label: 'Nov 19, 2026',
      tag: 'Member tools',
      title: 'Your chosen name follows you',
      body: 'Signed-in members no longer retype their name on listing posts, volunteer offers, donation intents, or the waiting list. Only your chosen name is carried over; the pledge still asks for your full legal name, and you can change your chosen name in Settings.'
    },
    {
      date: '2026-11-19',
      label: 'Nov 19, 2026',
      tag: 'Safety & accountability',
      title: 'Contextual reports with local evidence',
      body: 'Reports now open from the listing, message, chat, or profile where an interaction happened. The person is carried into the form instead of typed, and reporters can attach images, message files, or file details that stay in this browser.'
    },
    {
      date: '2026-11-18',
      label: 'Nov 18, 2026',
      tag: 'Member profile',
      title: 'Public resumes are ready to preview',
      body: 'Members can now see a filtered public resume with a chosen first name, City/State, skills, commons totals, availability, and an optional phone. Legal name, street address, ZIP, housing status, and birthdate stay private.'
    },
    {
      date: '2026-11-18',
      label: 'Nov 18, 2026',
      tag: 'Site update',
      title: 'Unbought moves to GitHub Pages',
      body: 'The prototype now has a public home. Source, updates, and the provenance note live in one public repository; the site itself still stores all demo activity in your browser.'
    },
    {
      date: '2026-11-12',
      label: 'Nov 12, 2026',
      tag: 'Community tools',
      title: 'Post forms moved into dialogs',
      body: 'Labor and goods forms now open in keyboard-friendly dialogs instead of blocking the page. Location is entered as city, state, and ZIP, then composed into one listing label.'
    },
    {
      date: '2026-11-05',
      label: 'Nov 5, 2026',
      tag: 'Member dashboard',
      title: 'Exchange confirmations are ready to test',
      body: 'Members can confirm a completed service or a delivered product in Dashboard. The thank-you note appears only after a confirmation, and nothing is transmitted.'
    }
  ]);

  const PILLARS = Object.freeze({
    building: {
      label: 'Building, Repair & Infrastructure',
      short: 'Building & Repair'
    },
    health: {
      label: 'Health, Wellness & Care',
      short: 'Health & Care'
    },
    daily: {
      label: 'Daily Life & Sustenance',
      short: 'Daily Life'
    },
    arts: {
      label: 'Arts, Culture & Education',
      short: 'Arts & Education'
    },
    civic: {
      label: 'Civic, Legal & Digital Support',
      short: 'Civic & Digital'
    },
    goods: {
      label: 'Free Physical Goods & Production',
      short: 'Free Goods'
    }
  });

  const EXCHANGES = Object.freeze({
    free: {
      label: '100% Free',
      short: '100% Free'
    },
    atcost: {
      label: 'Labor free · requester covers materials',
      short: 'Requester covers materials'
    }
  });

  const GOODS_CATEGORIES = Object.freeze({
    new: {
      label: 'Free new stuff',
      short: 'New'
    },
    homemade: {
      label: 'Free homemade stuff',
      short: 'Homemade'
    },
    used: {
      label: 'Free old stuff',
      short: 'Old'
    },
    parts: {
      label: 'Free stuff for parts or restoration (broken)',
      short: 'Parts / restoration'
    }
  });

  const SCOPE_LABELS = Object.freeze({
    peer: 'General Peer Education',
    licensed: 'Licensed Clinical/Legal Service'
  });

  const TRACKS = Object.freeze({
    contributor: 'Active Contributor',
    apprentice: 'Apprentice (Skill-Builder)',
    care: 'Care Circle Member',
    observer: 'Observer'
  });

  const HOUSING_STATUSES = Object.freeze({
    own: 'Own',
    rent: 'Rent',
    transient: 'Transient',
    'live with family': 'Live with family',
    'intentional community': 'Intentional community',
    homeless: 'Homeless'
  });

  /* Six realistic seed listings. User-created listings are prepended at runtime. */
  const SEED_LISTINGS = Object.freeze([
    {
      id: 'seed-dance',
      pillar: 'arts',
      exchange: 'free',
      title: 'Community Dance & Movement Workshops',
      provider: 'Amara Okafor',
      location: 'Eastside Community Hall + online',
      description: 'A joyful, all-bodies movement circle for people who danced once, never danced, or just want to move without being watched. No experience, no mirrors, no performance pressure. Paid-level facilitation, offered freely.',
      details: [
        { label: 'Where', value: 'Eastside Community Hall + online' },
        { label: 'Rhythm', value: '2nd & 4th Saturday · 90 min' },
        { label: 'Access', value: 'Chairs · scent-free room · captions' }
      ],
      note: 'All ages and bodies welcome.'
    },
    {
      id: 'seed-web',
      pillar: 'civic',
      exchange: 'free',
      title: 'Web Coding & Graphic Design Studio Hours',
      provider: 'Devin Reyes',
      location: 'Remote + Tuesday library drop-in',
      description: 'Two-hour studio for neighbors, small nonprofits, and co-ops. Bring a website, a flyer, an accessibility question, or just curiosity. We work on semantic HTML, CSS, vanilla JavaScript, and print design together—no hourly invoice.',
      details: [
        { label: 'Format', value: 'Remote + Tuesday library drop-in' },
        { label: 'Good for', value: 'Neighbors & small community groups' },
        { label: 'Bring', value: 'A project or a question' }
      ],
      note: 'Accessibility reviewed with every build.'
    },
    {
      id: 'seed-brakes',
      pillar: 'building',
      exchange: 'atcost',
      title: 'Free Auto Brake Repair — You Cover the Parts',
      provider: 'Marcus Bell',
      location: 'Northside garage · by appointment',
      description: 'Brake pads, rotors, fluid checks, and honest safety inspections. The labor is free for both of us. If the parts cannot be found free on Unbought, you buy them at the exact receipt price, or I order them and show you the receipt. Zero markup, ever. I will say no when a job is outside my scope or needs a licensed specialist.',
      details: [
        { label: 'Rhythm', value: 'Weekends · 2–4 hrs' },
        { label: 'Materials', value: 'Requester covers pads, rotors, fluid — receipt shown' },
        { label: 'Good for', value: 'Older cars & tight budgets' }
      ],
      note: 'Labor free. Requester covers materials at exact receipt price.'
    },
    {
      id: 'seed-garden',
      pillar: 'daily',
      exchange: 'atcost',
      title: 'Organic Backyard Gardening & Seed Share',
      provider: 'Rosa Jiménez',
      location: 'Maple Street plots + home visits',
      description: 'Garden planning, planting, pruning, compost setup, and seasonal coaching. The teaching and labor are free. Seedlings and compost are free when the share has them; if they must be bought, the person requesting the work covers the exact receipt price, never a markup. Harvest is shared with everyone who tends the plot.',
      details: [
        { label: 'Season', value: 'Spring–fall · flexible' },
        { label: 'Materials', value: 'Free from the share, or requester covers receipt' },
        { label: 'Capacity', value: '4 households per month' }
      ],
      note: 'No plot fee. Harvest shared.'
    },
    {
      id: 'seed-childcare',
      pillar: 'daily',
      exchange: 'free',
      title: 'Childcare & Laundry Support',
      provider: 'Nia Brooks',
      location: 'Westside neighborhood',
      description: 'After-school care, bedtime routines, laundry folding, and pickup help for families in a hard week. Free and consent-based. We meet first, references are available, and a background check can be requested. Parents are always welcome to stay.',
      details: [
        { label: 'Rhythm', value: 'Weekday afternoons' },
        { label: 'Capacity', value: '2 families at a time' },
        { label: 'Safety', value: 'Meet first · references available' }
      ],
      note: 'No unvetted one-on-one time.'
    },
    {
      id: 'seed-legal',
      pillar: 'civic',
      exchange: 'free',
      title: 'Peer Legal Literacy Circles',
      provider: 'Samir Haddad',
      location: 'Online + downtown library',
      description: 'Plain-language sessions on tenants’ rights, small claims, benefits appeals, and how to find a licensed lawyer. This is peer education, not legal representation or individualized advice. We clarify scope at the start of every circle.',
      details: [
        { label: 'Rhythm', value: 'First Thursday · 60 min' },
        { label: 'Scope', value: 'General Peer Education' },
        { label: 'Not', value: 'Legal representation or advice' }
      ],
      scope: 'peer',
      note: 'Licensed referrals available.'
    },
    {
      id: 'seed-pantry',
      pillar: 'goods',
      exchange: 'free',
      category: 'new',
      title: 'Neighborhood Pantry & Fresh Produce Share',
      provider: 'Community Pantry Crew',
      location: 'St. Aiden’s basement · Wed & Sat',
      description: 'Shelf-stable staples, fresh produce, bread, and baby supplies, free to anyone who needs them. No proof of income, no forms, no questions. Take what you need and leave what you can. Delivery is available for neighbors who cannot travel.',
      details: [
        { label: 'Open', value: 'Wed 4–7pm · Sat 10am–1pm' },
        { label: 'Cost', value: 'Always free' },
        { label: 'Access', value: 'Step-free entrance · delivery available' }
      ],
      note: 'No eligibility test. No means test.'
    },
    {
      id: 'seed-tools',
      pillar: 'goods',
      exchange: 'free',
      category: 'used',
      title: 'Tool Library: Borrow, Don’t Buy',
      provider: 'Westside Tool Library',
      location: 'Westside workshop · Thursdays 4–7pm',
      description: 'Drills, saws, ladders, sanders, garden tools, and basic repair kits available to borrow for a week at a time. A short safety walkthrough is offered for tools you have not used before. Bring nothing but a name—no deposit, no fee.',
      details: [
        { label: 'Borrow', value: 'Up to 7 days · renew by message' },
        { label: 'Cost', value: 'Free · no deposit' },
        { label: 'Good for', value: 'Repairs, gardens, small builds' }
      ],
      note: 'Return clean and working, or tell us what broke.'
    },
    {
      id: 'seed-clothing',
      pillar: 'goods',
      exchange: 'free',
      category: 'used',
      title: 'Clothing, Bedding & Housewares Swap',
      provider: 'Maple Street Neighbors',
      location: 'Maple Street Hall · first Sunday',
      description: 'Free clothing in all sizes, coats, bedding, dishes, and small housewares. Everything is cleaned and sorted before it hits the tables. No swap is required—take what fits your household and leave the rest for a neighbor.',
      details: [
        { label: 'When', value: 'First Sunday · 11am–3pm' },
        { label: 'Cost', value: 'Free · no swap required' },
        { label: 'Access', value: 'Step-free hall · private changing room' }
      ],
      note: 'Sizes and seasons vary. Ask and we will look.'
    },
    {
      id: 'seed-hygiene',
      pillar: 'goods',
      exchange: 'free',
      category: 'new',
      title: 'Bulk Cleaning & Hygiene Supplies — Free',
      provider: 'Nia Brooks',
      location: 'Westside neighborhood · pickup or delivery',
      description: 'Laundry soap, dish soap, toothpaste, period supplies, and cleaning basics bought in bulk and shared freely. No price, no split, no minimum, and no membership fee. Take what your household needs; tell us what ran out so the next bulk run covers it.',
      details: [
        { label: 'Order', value: 'Monthly bulk run · posted when ready' },
        { label: 'Cost', value: 'Free · no split, no minimum' },
        { label: 'Access', value: 'Porch pickup or local delivery' }
      ],
      note: 'Free supplies. Nothing to repay.'
    }
  ]);

  const MULTI_VALUE_FIELDS = new Set(['support', 'capacity', 'interests']);

  const VOLUNTEER_ROLES = Object.freeze({
    'project-management': 'Project management',
    legal: 'Legal counsel & compliance',
    administrative: 'Administration & records',
    web: 'Web development',
    hr: 'HR & people operations',
    finance: 'Finance & bookkeeping',
    communications: 'Communications & accessibility'
  });

  // Report categories are triaged to either the member review board or a
  // police referral. Criminal matters are never decided by member vote.
  const REPORT_TYPES = Object.freeze({
    consent: { label: 'Violation of consent or boundaries', route: 'board' },
    harassment: { label: 'Harassment or intimidation (non-criminal)', route: 'board' },
    bias: { label: 'Bias, discrimination, or hateful conduct', route: 'board' },
    exploitation: { label: 'Exploitation of the commons or members', route: 'board' },
    safety: { label: 'Unsafe conduct in a shared space or project', route: 'board' },
    'other-board': { label: 'Other concern that is not a crime', route: 'board' },
    assault: { label: 'Assault or threat of violence', route: 'criminal' },
    theft: { label: 'Theft, fraud, or property crime', route: 'criminal' },
    'sexual-offense': { label: 'Sexual assault or abuse', route: 'criminal' },
    'other-criminal': { label: 'Other suspected criminal activity', route: 'criminal' }
  });

  const RESPONSE_DAYS = 3;   // time for the reported member to gather evidence and plead
  const VOTING_DAYS = 3;     // time for all members to review the case file and vote
  const DAY_MS = 24 * 60 * 60 * 1000;

  const MEDIA_TYPES = Object.freeze({
    video: 'Video link',
    audio: 'Audio link',
    image: 'Image link',
    document: 'Document link'
  });

  const REPORT_EVIDENCE = Object.freeze({
    maxItems: 4,
    maxFileBytes: 8 * 1024 * 1024,
    maxDataLength: 500000,
    maxTextLength: 20000,
    imageTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    accepted: 'image/jpeg,image/png,image/webp,image/gif,text/*,.txt,.csv,.json,.md,.log,.pdf,audio/*,video/*'
  });

  const REFLECTION_OPTIONS = Object.freeze([30, 90, 180]);
  const TREATMENT_STEPS = Object.freeze([
    { key: 'evaluation', label: 'Therapeutic evaluation completed (inside or outside Unbought)' },
    { key: 'plan', label: 'Recommended treatment plan documented' },
    { key: 'treatment', label: 'Treatment completed or sustained as recommended' }
  ]);

  /* ------------------------------------------------------------------------
     02. State, storage & small helpers
     ------------------------------------------------------------------------ */
  function createDefaultState() {
    return {
      pledge: null,
      auth: {
        credential: null,
        session: { signedIn: false, signedInAt: null }
      },
      track: null,
      trackDetails: {},
      listings: [],
      requests: [],
      inquiries: [],
      donationIntents: [],
      contributions: [],
      volunteerInterests: [],
      reports: [],
      settings: {
        compactDashboard: false,
        showPrototypeNotices: true
      },
      messages: [],
      chats: [],
      suggestions: [],
      severanceFund: {
        balance: 0,
        contributions: []
      }
    };
  }

  function getCredential() {
    return state.auth && state.auth.credential ? state.auth.credential : null;
  }

  function isSignedIn() {
    return Boolean(state.auth && state.auth.session && state.auth.session.signedIn);
  }

  function isMember() {
    return isSignedIn() && Boolean(state.pledge && state.pledge.memberId);
  }

  // Non-intake forms reuse the signed-in member's chosen name so people do not
  // have to retype it. The initial intake (pledge.html) still asks for the full
  // legal name, and the chosen-name setting stays editable in the dashboard.
  // Private fields (legal name, address, DOB, housing, phone) are never used here.
  function memberChosenName() {
    return isMember() ? cleanString(state.pledge.name, 60) : '';
  }

  function fillOwnNameField(input) {
    if (!input || cleanString(input.value, 120)) return;
    const name = memberChosenName();
    if (name) input.value = name;
  }

  function normalizeUsername(value) {
    return cleanString(value, 40).toLowerCase();
  }

  // Prototype-only local credential check. This is NOT real cryptography and
  // must never be used for a live account system.
  function hashPassword(password, salt) {
    let hash = 2166136261;
    const input = `${salt}:${password}`;
    for (let i = 0; i < input.length; i += 1) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
  }

  function setSession(signedIn) {
    if (!state.auth) state.auth = { credential: null, session: {} };
    state.auth.session = {
      signedIn: Boolean(signedIn),
      signedInAt: signedIn ? new Date().toISOString() : null
    };
    saveState();
  }

  // The signed pledge is the sign-in. Members land on the dashboard; everyone
  // else is invited to "Take the Pledge" on its dedicated page.
  function renderAuthUi() {
    const signedIn = isMember();
    const href = signedIn ? 'dashboard.html' : 'pledge.html';
    const label = signedIn ? 'Dashboard' : 'Take the Pledge';

    document.querySelectorAll('[data-auth-cta]').forEach((element) => {
      const labelNode = element.querySelector('[data-auth-label]') || element;
      labelNode.textContent = label;
      element.setAttribute('href', href);
      element.setAttribute('aria-label', label);
    });

    // Members do not need the pledge page, so retire pledge-only nav links.
    document.querySelectorAll('[data-pledge-nav]').forEach((item) => {
      item.hidden = signedIn;
    });

    const topButton = document.getElementById('signin-top');
    const form = document.getElementById('pledge-form');
    const signinTriggers = document.querySelectorAll('[data-signin-trigger]');
    const signedPanel = document.getElementById('pledge-already-signed');
    const dashboardLink = document.getElementById('pledge-to-dashboard-link');
    const alreadyName = document.getElementById('already-signed-name');
    const signoutButton = document.getElementById('signout-account');
    const hasCredential = Boolean(getCredential());

    if (topButton) {
      const labelNode = topButton.querySelector('[data-auth-label]') || topButton;
      labelNode.textContent = signedIn ? 'Dashboard' : 'Sign in';
    }
    // An existing local account signs in through the pop-up; no account yet
    // means the pledge form is the account setup.
    if (form) form.hidden = signedIn || hasCredential;
    signinTriggers.forEach((trigger) => {
      trigger.hidden = signedIn || !hasCredential;
    });
    if (signedPanel) signedPanel.hidden = !signedIn;
    if (dashboardLink) dashboardLink.hidden = !signedIn;
    if (signoutButton) signoutButton.hidden = !signedIn;
    if (alreadyName && signedIn) alreadyName.textContent = `Signed in as ${state.pledge.name}`;
  }

  function formatMoney(value) {
    const amount = Number(value) || 0;
    return amount.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  }

  function getMemberContributions() {
    if (!isMember()) return [];
    return (Array.isArray(state.contributions) ? state.contributions : []).filter((item) => item && item.memberId === state.pledge.memberId);
  }

  function getMemberDonationIntents() {
    if (!isMember()) return [];
    return (Array.isArray(state.donationIntents) ? state.donationIntents : []).filter((item) => item && item.memberId === state.pledge.memberId);
  }

  function getSeveranceSummary() {
    const fund = state.severanceFund || { balance: 0, contributions: [] };
    const balance = Number(fund.balance) || 0;
    const purchases = (Array.isArray(state.contributions) ? state.contributions : []).filter((c) => c && c.type === 'severance_purchase');
    const computed = purchases.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
    return { balance: Math.max(balance, computed), count: purchases.length };
  }

  function allReports() {
    return Array.isArray(state.reports) ? state.reports : [];
  }

  function getMemberReports() {
    if (!isMember()) return [];
    return allReports().filter((report) => report && report.reporterMemberId === state.pledge.memberId);
  }

  function isRespondent(report) {
    if (!isMember() || !report) return false;
    if (report.respondentMemberId && report.respondentMemberId === state.pledge.memberId) return true;
    const name = String(state.pledge.name || '').trim().toLowerCase();
    const respondent = String(report.respondentName || '').trim().toLowerCase();
    return Boolean(respondent && respondent === name);
  }

  function reportsAboutMember() {
    if (!isMember()) return [];
    return allReports().filter((report) => isRespondent(report));
  }

  // Move cases whose evidence-gathering window has ended into voting. This is
  // called on load and on render so the demo stays consistent across reloads.
  function syncReportPhases() {
    let changed = false;
    const now = Date.now();
    allReports().forEach((report) => {
      if (report.status !== 'response_period') return;
      const deadline = Date.parse(report.responseDeadlineAt);
      if (report.responseDeadlineAt && !Number.isNaN(deadline) && now < deadline) return;
      report.status = 'board_review';
      report.votingEndsAt = new Date(now + (VOTING_DAYS * DAY_MS)).toISOString();
      changed = true;
    });
    if (changed) saveState();
  }

  function isRestrictionComplete(report) {
    const steps = report.treatmentSteps || {};
    const periodDone = !report.restrictionEnd || Date.now() >= Date.parse(report.restrictionEnd);
    return Boolean(periodDone && steps.evaluation && steps.plan && steps.treatment);
  }

  function getActiveRestriction() {
    return reportsAboutMember().find((report) => report.status === 'restriction_active') || null;
  }

  function hasActiveRestriction() {
    const report = getActiveRestriction();
    return Boolean(report && !isRestrictionComplete(report));
  }

  function requireMembership(message) {
    if (isMember()) return true;
    showToast(message || 'Sign the Unbought Pledge to become a member and participate.');
    const pledgeLink = document.querySelector('a[data-auth-cta], a[href="pledge.html"]');
    if (pledgeLink) {
      pledgeLink.focus({ preventScroll: true });
    }
    return false;
  }

  function requireFullAccess(message) {
    if (!requireMembership()) return false;
    if (hasActiveRestriction()) {
      showToast(message || 'Full access is paused during your reflection period. Basic necessities remain available.');
      return false;
    }
    return true;
  }

  function cleanString(value, maxLength = 400) {
    if (typeof value !== 'string') return '';
    return value.trim().slice(0, maxLength);
  }

  function cleanCount(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
  }

  function cleanHours(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.round(number * 100) / 100 : 0;
  }

  function normalizeHousingStatus(value) {
    const status = cleanString(value, 30);
    if (hasOwn(HOUSING_STATUSES, status)) return status;
    if (status === 'family') return 'live with family';
    if (status === 'intentional') return 'intentional community';
    return '';
  }

  function firstName(value) {
    return cleanString(value, 60).split(/\s+/)[0] || '';
  }

  function safeCity(value) {
    const city = cleanString(value, 80).replace(/[.,\s]+$/, '');
    if (!city || /^\d/.test(city)) return '';
    // A street line is never a safe public City value.
    if (/\b(st|street|ave|avenue|rd|road|dr|drive|ln|lane|blvd|boulevard|ct|court|way|ter|terrace|pkwy|parkway)\b/i.test(city)) return '';
    return city;
  }

  // Public resumes show City, State only. If the address cannot be parsed
  // safely, the caller falls back to the member's general location.
  function parseCityState(address) {
    const parts = cleanString(address, 240)
      .split(/[\n,]+/)
      .map((part) => part.trim())
      .filter(Boolean);

    for (let index = 0; index < parts.length; index += 1) {
      const match = parts[index].match(/^([A-Za-z]{2})(?:\s+\d{5}(?:-\d{4})?)?$/);
      if (!match || index === 0) continue;
      const city = safeCity(parts[index - 1]);
      if (city) return `${city}, ${match[1].toUpperCase()}`;
    }
    return '';
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }

  // Only http(s) links become clickable; anything else is shown as plain text.
  function safeMediaUrl(value) {
    const url = cleanString(value, 500);
    return /^https?:\/\//i.test(url) ? url : '';
  }

  // Evidence images are stored as small local data URLs. SVG and other
  // scriptable formats are rejected so case files cannot execute markup.
  function safeEvidenceImageUrl(value) {
    const url = cleanString(value, REPORT_EVIDENCE.maxDataLength);
    return /^data:image\/(?:jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(url) ? url : '';
  }

  function formatBytes(bytes) {
    const value = Number(bytes);
    if (!Number.isFinite(value) || value <= 0) return '0 KB';
    if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }

  function cleanEvidenceItem(item) {
    if (!item || typeof item !== 'object') return null;
    const kind = cleanString(item.kind, 20);
    const name = cleanString(item.name, 120) || 'Evidence';
    const mime = cleanString(item.mime, 80);
    const size = Number.isFinite(Number(item.size)) ? Math.max(0, Number(item.size)) : 0;
    const caption = cleanString(item.caption, 200);

    if (kind === 'image') {
      const dataUrl = safeEvidenceImageUrl(item.dataUrl);
      if (!dataUrl) return null;
      return { kind, name, mime, size, caption, dataUrl };
    }
    if (kind === 'text') {
      const text = cleanString(item.text, REPORT_EVIDENCE.maxTextLength);
      if (!text) return null;
      return { kind, name, mime: mime || 'text/plain', size, caption, text };
    }
    if (kind === 'file') {
      return { kind, name, mime, size, caption };
    }
    return null;
  }

  function cleanEvidenceItems(items) {
    return (Array.isArray(items) ? items : [])
      .slice(0, REPORT_EVIDENCE.maxItems)
      .map(cleanEvidenceItem)
      .filter(Boolean);
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('read-failed'));
      reader.readAsDataURL(file);
    });
  }

  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('read-failed'));
      reader.readAsText(file);
    });
  }

  function getReportContextSummary(report) {
    const area = cleanString(report && report.contextArea, 80) || 'Dashboard';
    const detail = cleanString(report && report.contextDetail, 160);
    const target = cleanString(report && report.respondentName, 80);
    const parts = [area];
    if (target) parts.push(`about ${target}`);
    if (detail) parts.push(detail);
    return parts.join(' · ');
  }

  function renderEvidenceList(items, e) {
    const evidence = cleanEvidenceItems(items);
    if (!evidence.length) return `<p class="account-note">No uploaded evidence was attached.</p>`;
    return `<ul class="evidence-list">${evidence.map((item) => {
      if (item.kind === 'image' && item.dataUrl) {
        return `<li class="evidence-item evidence-item--image"><figure><img src="${item.dataUrl}" alt="${e(item.caption || item.name)}" loading="lazy"><figcaption><strong>${e(item.name)}</strong>${item.caption ? ` · ${e(item.caption)}` : ''}<span class="contribution-meta">${e(formatBytes(item.size))} · stored locally as an image preview</span></figcaption></figure></li>`;
      }
      if (item.kind === 'text' && item.text) {
        const preview = item.text.length > 1200 ? `${item.text.slice(0, 1200)}\n…` : item.text;
        return `<li class="evidence-item"><strong>${e(item.name)}</strong>${item.caption ? `<p>${e(item.caption)}</p>` : ''}<p class="contribution-meta">${e(formatBytes(item.size))} · text stored locally in this browser</p><pre class="evidence-text">${e(preview)}</pre></li>`;
      }
      return `<li class="evidence-item"><strong>${e(item.name)}</strong>${item.caption ? `<p>${e(item.caption)}</p>` : ''}<p class="contribution-meta">${e([item.mime, formatBytes(item.size)].filter(Boolean).join(' · '))} · file selected from this device; this prototype stored details only, not the file contents or transmission.</p></li>`;
    }).join('')}</ul>`;
  }

  // Only accept keys that belong to the object itself. This keeps stray
  // prototype names (for example "constructor") from passing as valid data.
  function hasOwn(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
  }

  function isValidListing(item) {
    return Boolean(
      item &&
      typeof item === 'object' &&
      typeof item.id === 'string' &&
      typeof item.title === 'string' &&
      hasOwn(PILLARS, item.pillar) &&
      hasOwn(EXCHANGES, item.exchange) &&
      typeof item.provider === 'string' &&
      typeof item.location === 'string' &&
      typeof item.description === 'string'
    );
  }

  function normalizeStoredListing(item) {
    const category = item.pillar === 'goods' && hasOwn(GOODS_CATEGORIES, item.category) ? item.category : '';
    return {
      id: cleanString(item.id, 100) || `listing-${Date.now().toString(36)}`,
      memberId: cleanString(item.memberId, 100),
      title: cleanString(item.title, 80),
      pillar: item.pillar,
      exchange: item.exchange,
      category,
      provider: cleanString(item.provider, 60),
      location: cleanString(item.location, 80),
      description: cleanString(item.description, 400),
      note: cleanString(item.note, 120) || 'Added by a neighbor · consent first',
      scope: hasOwn(SCOPE_LABELS, item.scope) ? item.scope : '',
      details: Array.isArray(item.details)
        ? item.details
            .filter((detail) => detail && typeof detail === 'object')
            .slice(0, 4)
            .map((detail) => ({
              label: cleanString(detail.label, 40),
              value: cleanString(detail.value, 120)
            }))
            .filter((detail) => detail.label && detail.value)
        : [],
      isUser: true,
      createdAt: cleanString(item.createdAt, 40),
      status: cleanString(item.status, 30) || 'active'
    };
  }

  function loadState() {
    const fallback = createDefaultState();
    let raw = null;

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      raw = saved ? JSON.parse(saved) : null;
    } catch (error) {
      return fallback;
    }

    if (!raw || typeof raw !== 'object') return fallback;

    if (raw.pledge && typeof raw.pledge === 'object') {
      const name = cleanString(raw.pledge.name, 60);
      if (name) {
        const signedAt = cleanString(raw.pledge.signedAt, 40) || new Date().toISOString();
        fallback.pledge = {
          memberId: cleanString(raw.pledge.memberId, 100) || makeId('member'),
          name,
          fullName: cleanString(raw.pledge.fullName, 100),
          location: cleanString(raw.pledge.location, 80),
          mailingAddress: cleanString(raw.pledge.mailingAddress, 240),
          physicalAddress: cleanString(raw.pledge.physicalAddress, 240),
          housingStatus: normalizeHousingStatus(raw.pledge.housingStatus),
          phone: cleanString(raw.pledge.phone, 40),
          dob: cleanString(raw.pledge.dob, 10),
          paidSkills: cleanString(raw.pledge.paidSkills, 400),
          unpaidSkills: cleanString(raw.pledge.unpaidSkills, 400),
          donationCount: cleanCount(raw.pledge.donationCount),
          hoursCompleted: cleanHours(raw.pledge.hoursCompleted),
          hoursUsed: cleanHours(raw.pledge.hoursUsed),
          itemsGifted: cleanCount(raw.pledge.itemsGifted),
          itemsTaken: cleanCount(raw.pledge.itemsTaken),
          available: raw.pledge.available !== false,
          publicAddressSource: raw.pledge.publicAddressSource === 'physical' ? 'physical' : 'mailing',
          publicPhone: Boolean(raw.pledge.publicPhone),
          note: cleanString(raw.pledge.note, 240),
          signedAt,
          status: 'active'
        };
      }
    }

    const rawAuth = raw.auth && typeof raw.auth === 'object' ? raw.auth : null;
    const rawCredential = rawAuth && rawAuth.credential && typeof rawAuth.credential === 'object'
      ? rawAuth.credential
      : null;
    if (rawCredential) {
      const username = normalizeUsername(rawCredential.username);
      const salt = cleanString(rawCredential.salt, 40);
      const passwordHash = cleanString(rawCredential.passwordHash, 16);
      if (username && salt && passwordHash) {
        fallback.auth.credential = { username, salt, passwordHash };
      }
    }
    if (rawAuth && rawAuth.session && typeof rawAuth.session === 'object') {
      fallback.auth.session = {
        signedIn: Boolean(rawAuth.session.signedIn),
        signedInAt: cleanString(rawAuth.session.signedInAt, 40) || null
      };
    }
    if (!fallback.auth.credential && fallback.pledge) {
      // Legacy local pledges predate usernames; keep them signed in.
      fallback.auth.session = { signedIn: true, signedInAt: fallback.pledge.signedAt };
    }

    if (typeof raw.track === 'string' && hasOwn(TRACKS, raw.track)) {
      fallback.track = raw.track;
    }

    if (raw.trackDetails && typeof raw.trackDetails === 'object' && !Array.isArray(raw.trackDetails)) {
      fallback.trackDetails = raw.trackDetails;
    }

    if (Array.isArray(raw.listings)) {
      fallback.listings = raw.listings
        .filter(isValidListing)
        .slice(0, 60)
        .map(normalizeStoredListing);
    }

    if (Array.isArray(raw.requests)) {
      fallback.requests = raw.requests
        .filter((request) => request && typeof request === 'object' && typeof request.listingId === 'string')
        .slice(0, 100)
        .map((request) => ({
          id: cleanString(request.id, 100) || makeId('request'),
          type: cleanString(request.type, 40) || 'mutual_aid_request',
          memberId: cleanString(request.memberId, 100),
          listingId: cleanString(request.listingId, 100),
          listingTitle: cleanString(request.listingTitle, 80),
          provider: cleanString(request.provider, 60),
          note: cleanString(request.note, 280),
          pillar: cleanString(request.pillar, 40),
          requestedAt: cleanString(request.requestedAt, 40),
          confirmedAt: cleanString(request.confirmedAt, 40),
          status: cleanString(request.status, 30) || 'requested'
        }));
    }

    if (Array.isArray(raw.inquiries)) {
      fallback.inquiries = raw.inquiries
        .filter((inquiry) => inquiry && typeof inquiry === 'object' && typeof inquiry.type === 'string')
        .slice(0, 100)
        .map((inquiry) => ({
          ...inquiry,
          id: cleanString(inquiry.id, 100) || makeId('inquiry'),
          memberId: cleanString(inquiry.memberId, 100),
          type: cleanString(inquiry.type, 40),
          createdAt: cleanString(inquiry.createdAt, 40),
          status: cleanString(inquiry.status, 30) || 'open'
        }));
    }

    if (Array.isArray(raw.donationIntents)) {
      fallback.donationIntents = raw.donationIntents
        .filter((item) => item && typeof item === 'object')
        .slice(0, 100)
        .map((item) => ({
          id: cleanString(item.id, 40) || makeId('donation'),
          memberId: cleanString(item.memberId, 100),
          amount: Number.isFinite(Number(item.amount)) ? Math.max(0, Math.round(Number(item.amount))) : 0,
          frequency: cleanString(item.frequency, 30),
          name: cleanString(item.name, 60),
          email: cleanString(item.email, 120),
          note: cleanString(item.note, 280),
          savedAt: cleanString(item.savedAt, 40),
          status: cleanString(item.status, 30) || 'intent',
          stockValue: Number.isFinite(Number(item.stockValue)) ? Math.max(0, Number(item.stockValue)) : (Number.isFinite(Number(item.amount)) ? Math.max(0, Number(item.amount)) : 0),
          thankYouEmailQueued: Boolean(item.thankYouEmailQueued)
        }))
        .filter((item) => item.amount >= 1 && ['one-time', 'monthly', 'pledge-later'].includes(item.frequency));
    }

    // Back-compat: migrate legacy donation intents stored by donate.js
    if (!fallback.donationIntents.length) {
      try {
        const legacyRaw = localStorage.getItem('unbought:donation-intents:v1');
        const legacy = legacyRaw ? JSON.parse(legacyRaw) : null;
        if (Array.isArray(legacy)) {
          fallback.donationIntents = legacy
            .filter((item) => item && typeof item === 'object' && Number.isFinite(Number(item.amount)) && ['one-time', 'monthly', 'pledge-later'].includes(item.frequency))
            .slice(0, 100)
            .map((item) => ({
              id: cleanString(item.id, 40) || makeId('donation'),
              memberId: '',
              amount: Math.max(1, Math.round(Number(item.amount))),
              frequency: cleanString(item.frequency, 30),
              name: cleanString(item.name, 60),
              email: '',
              note: cleanString(item.note, 280),
              savedAt: cleanString(item.savedAt, 40),
              status: 'intent',
              stockValue: Math.max(1, Math.round(Number(item.amount))),
              thankYouEmailQueued: false
            }));
        }
      } catch (error) {
        // Ignore legacy migration errors.
      }
    }

    if (Array.isArray(raw.volunteerInterests)) {
      fallback.volunteerInterests = raw.volunteerInterests
        .filter((item) => item && typeof item === 'object' && typeof item.role === 'string')
        .slice(0, 100)
        .map((item) => ({
          id: cleanString(item.id, 100) || makeId('volunteer'),
          memberId: cleanString(item.memberId, 100),
          name: cleanString(item.name, 60),
          role: cleanString(item.role, 40),
          note: cleanString(item.note, 280),
          createdAt: cleanString(item.createdAt, 40),
          status: cleanString(item.status, 30) || 'interest_recorded'
        }));
    }

    if (Array.isArray(raw.reports)) {
      fallback.reports = raw.reports
        .filter((item) => item && typeof item === 'object' && typeof item.type === 'string')
        .slice(0, 200)
        .map((item) => ({
          id: cleanString(item.id, 100) || makeId('report'),
          reporterMemberId: cleanString(item.reporterMemberId, 100),
          reporterName: cleanString(item.reporterName, 60),
          respondentName: cleanString(item.respondentName, 80),
          respondentMemberId: cleanString(item.respondentMemberId, 100),
          type: cleanString(item.type, 40),
          typeLabel: hasOwn(REPORT_TYPES, item.type) ? REPORT_TYPES[item.type].label : cleanString(item.typeLabel, 80),
          route: item.route === 'criminal' ? 'criminal' : 'board',
          description: cleanString(item.description, 1200),
          occurredAt: cleanString(item.occurredAt, 20),
          contextArea: cleanString(item.contextArea, 80) || 'Dashboard',
          contextDetail: cleanString(item.contextDetail, 160),
          sourceId: cleanString(item.sourceId, 100),
          evidence: Array.isArray(item.evidence) ? item.evidence.slice(0, REPORT_EVIDENCE.maxItems).map(cleanEvidenceItem).filter(Boolean) : [],
          createdAt: cleanString(item.createdAt, 40),
          status: ['response_period', 'board_review', 'police_referral', 'restriction_active', 'not_guilty', 'access_restored'].includes(item.status) ? item.status : 'board_review',
          responseDeadlineAt: cleanString(item.responseDeadlineAt, 40),
          response: item.response && typeof item.response === 'object' ? {
            plea: item.response.plea === 'guilty' || item.response.plea === 'not_guilty' ? item.response.plea : '',
            explanation: cleanString(item.response.explanation, 2000),
            media: Array.isArray(item.response.media) ? item.response.media.slice(0, 6).map((media) => ({
              type: hasOwn(MEDIA_TYPES, media.type) ? media.type : 'document',
              url: cleanString(media.url, 500),
              caption: cleanString(media.caption, 200)
            })).filter((media) => media.url || media.caption) : [],
            submittedAt: cleanString(item.response.submittedAt, 40)
          } : null,
          votes: Array.isArray(item.votes) ? item.votes.slice(0, 500).map((vote) => ({
            memberId: cleanString(vote.memberId, 100),
            name: cleanString(vote.name, 60),
            verdict: vote.verdict === 'guilty' || vote.verdict === 'not_guilty' ? vote.verdict : '',
            reflectionDays: REFLECTION_OPTIONS.includes(Number(vote.reflectionDays)) ? Number(vote.reflectionDays) : null,
            reason: cleanString(vote.reason, 600),
            votedAt: cleanString(vote.votedAt, 40)
          })) : [],
          comments: Array.isArray(item.comments) ? item.comments.slice(0, 200).map((comment) => ({
            id: cleanString(comment.id, 100) || makeId('comment'),
            memberId: cleanString(comment.memberId, 100),
            name: cleanString(comment.name, 60),
            text: cleanString(comment.text, 800),
            createdAt: cleanString(comment.createdAt, 40)
          })) : [],
          votingEndsAt: cleanString(item.votingEndsAt, 40),
          demoVotingClosed: Boolean(item.demoVotingClosed),
          reflectionDays: REFLECTION_OPTIONS.includes(Number(item.reflectionDays)) ? Number(item.reflectionDays) : null,
          restrictionStart: cleanString(item.restrictionStart, 40),
          restrictionEnd: cleanString(item.restrictionEnd, 40),
          treatmentSteps: {
            evaluation: Boolean(item.treatmentSteps && item.treatmentSteps.evaluation),
            plan: Boolean(item.treatmentSteps && item.treatmentSteps.plan),
            treatment: Boolean(item.treatmentSteps && item.treatmentSteps.treatment)
          },
          resolutionAt: cleanString(item.resolutionAt, 40),
          policeReferral: item.policeReferral && typeof item.policeReferral === 'object' ? {
            createdAt: cleanString(item.policeReferral.createdAt, 40),
            status: cleanString(item.policeReferral.status, 30) || 'referral_recorded',
            note: cleanString(item.policeReferral.note, 280)
          } : null
        }));
    }

    if (Array.isArray(raw.contributions)) {
      fallback.contributions = raw.contributions
        .filter((item) => item && typeof item === 'object' && typeof item.type === 'string')
        .slice(0, 200)
        .map((item) => ({
          id: cleanString(item.id, 100) || makeId('contribution'),
          memberId: cleanString(item.memberId, 100),
          type: cleanString(item.type, 30), // donation | labor | severance_purchase
          amount: Number.isFinite(Number(item.amount)) ? Math.max(0, Number(item.amount)) : 0,
          hours: Number.isFinite(Number(item.hours)) ? Math.max(0, Number(item.hours)) : 0,
          profession: cleanString(item.profession, 80),
          stateRegion: cleanString(item.stateRegion, 40),
          hourlyRate: Number.isFinite(Number(item.hourlyRate)) ? Math.max(0, Number(item.hourlyRate)) : 0,
          stockValue: Number.isFinite(Number(item.stockValue)) ? Math.max(0, Number(item.stockValue)) : 0,
          sourceId: cleanString(item.sourceId, 100),
          note: cleanString(item.note, 280),
          createdAt: cleanString(item.createdAt, 40),
          status: cleanString(item.status, 30) || 'recorded',
          purchaserEmail: cleanString(item.purchaserEmail, 120),
          purchaserName: cleanString(item.purchaserName, 60)
        }));
    }

    if (fallback.pledge) {
      // Legacy profiles did not store counters explicitly. Seed them from
      // existing local records so the resume is useful without re-entry.
      if (!raw.pledge || !hasOwn(raw.pledge, 'donationCount')) {
        fallback.pledge.donationCount = fallback.donationIntents.length;
      }
      if (!raw.pledge || !hasOwn(raw.pledge, 'hoursCompleted')) {
        fallback.pledge.hoursCompleted = cleanHours(
          fallback.contributions
            .filter((item) => item.type === 'labor')
            .reduce((sum, item) => sum + (Number(item.hours) || 0), 0)
        );
      }
    }

    if (raw.settings && typeof raw.settings === 'object' && !Array.isArray(raw.settings)) {
      fallback.settings = {
        compactDashboard: Boolean(raw.settings.compactDashboard),
        showPrototypeNotices: raw.settings.showPrototypeNotices !== false
      };
    }

    if (Array.isArray(raw.messages)) {
      fallback.messages = raw.messages
        .filter((item) => item && typeof item === 'object' && typeof item.body === 'string')
        .slice(0, 300)
        .map((item) => ({
          id: cleanString(item.id, 100) || makeId('message'),
          memberId: cleanString(item.memberId, 100),
          name: cleanString(item.name, 60),
          toName: cleanString(item.toName, 80),
          body: cleanString(item.body, 1200),
          createdAt: cleanString(item.createdAt, 40),
          status: cleanString(item.status, 30) || 'recorded'
        }));
    }

    if (Array.isArray(raw.chats)) {
      fallback.chats = raw.chats
        .filter((item) => item && typeof item === 'object' && typeof item.body === 'string')
        .slice(0, 300)
        .map((item) => ({
          id: cleanString(item.id, 100) || makeId('chat'),
          memberId: cleanString(item.memberId, 100),
          name: cleanString(item.name, 60),
          channel: cleanString(item.channel, 40) || 'general',
          body: cleanString(item.body, 1200),
          createdAt: cleanString(item.createdAt, 40)
        }));
    }

    if (Array.isArray(raw.suggestions)) {
      fallback.suggestions = raw.suggestions
        .filter((item) => item && typeof item === 'object' && typeof item.text === 'string')
        .slice(0, 200)
        .map((item) => ({
          id: cleanString(item.id, 100) || makeId('suggestion'),
          memberId: cleanString(item.memberId, 100),
          name: cleanString(item.name, 60),
          category: cleanString(item.category, 40) || 'general',
          text: cleanString(item.text, 1200),
          createdAt: cleanString(item.createdAt, 40),
          status: cleanString(item.status, 30) || 'submitted'
        }));
    }

    if (raw.severanceFund && typeof raw.severanceFund === 'object') {
      fallback.severanceFund = {
        balance: Number.isFinite(Number(raw.severanceFund.balance)) ? Math.max(0, Number(raw.severanceFund.balance)) : 0,
        contributions: Array.isArray(raw.severanceFund.contributions) ? raw.severanceFund.contributions.slice(0, 200) : []
      };
    } else {
      // Recompute from contributions if needed
      const purchases = fallback.contributions.filter((c) => c.type === 'severance_purchase');
      fallback.severanceFund = {
        balance: purchases.reduce((sum, c) => sum + (Number(c.amount) || 0), 0),
        contributions: purchases.map((c) => c.id)
      };
    }

    return fallback;
  }

  let state = loadState();
  let storageWarningShown = false;
  let toastTimer = null;
  let currentListingId = null;
  let currentRequestMode = 'mutual';
  let confirmAction = null;
  let currentInquiryType = 'waitlist';

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      if (!storageWarningShown) {
        storageWarningShown = true;
        showToast('Local storage is full or blocked. Changes will last only for this visit.');
      }
    }
  }

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function createEl(tagName, className = '', text = '') {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
  }

  function createIcon(name) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'icon');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    const use = document.createElementNS(SVG_NS, 'use');
    use.setAttribute('href', `#icon-${name}`);
    svg.appendChild(use);
    return svg;
  }

  function makeId(prefix = 'id') {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  function domId(value) {
    return String(value).replace(/[^a-zA-Z0-9_-]/g, '-');
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  }

  function initials(name) {
    const words = String(name || '').trim().split(/\s+/).filter(Boolean);
    return words.slice(0, 2).map((word) => word.charAt(0).toUpperCase()).join('') || '?';
  }

  function scrollBehavior() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  }

  function announce(message) {
    const region = document.getElementById('live-region');
    if (!region) return;
    region.textContent = '';
    window.setTimeout(() => {
      region.textContent = message;
    }, 30);
  }

  function showToast(message, announceMessage = true) {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = message;
    toast.hidden = false;
    window.requestAnimationFrame(() => toast.classList.add('is-visible'));

    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toast.classList.remove('is-visible');
      window.setTimeout(() => {
        toast.hidden = true;
      }, 220);
    }, 4200);

    if (announceMessage) announce(message);
  }

  function getDirectoryScope() {
    const scope = document.body.dataset.directoryScope;
    return scope === 'goods' || scope === 'labor' ? scope : 'all';
  }

  function getAllListings() {
    // User posts appear first; seed listings remain available underneath.
    const all = [...state.listings, ...SEED_LISTINGS];
    const scope = getDirectoryScope();
    if (scope === 'goods') return all.filter((listing) => listing.pillar === 'goods');
    if (scope === 'labor') return all.filter((listing) => listing.pillar !== 'goods');
    return all;
  }

  function findListing(id) {
    return getAllListings().find((listing) => listing.id === id) || null;
  }

  function focusListingTitle(id, preventScroll = false) {
    const card = document.getElementById(`listing-${domId(id)}`);
    const title = card ? $('.listing-title', card) : null;
    if (!title) return;
    title.tabIndex = -1;
    title.focus({ preventScroll });
  }

  /* ------------------------------------------------------------------------
     03. Services & goods directory
     ------------------------------------------------------------------------ */
  function getFilterValues() {
    return {
      pillar: $('#pillar-filter') ? $('#pillar-filter').value : 'all',
      exchange: $('#exchange-filter') ? $('#exchange-filter').value : 'all',
      category: $('#category-filter') ? $('#category-filter').value : 'all'
    };
  }

  function getFilteredListings() {
    const { pillar, exchange, category } = getFilterValues();
    const scope = getDirectoryScope();
    return getAllListings().filter((listing) => {
      const matchesPillar = pillar === 'all' || listing.pillar === pillar;
      const matchesExchange = exchange === 'all' || listing.exchange === exchange;
      const matchesCategory = scope !== 'goods' || category === 'all' || listing.category === category;
      return matchesPillar && matchesExchange && matchesCategory;
    });
  }

  function addBadge(container, className, text) {
    const badge = createEl('span', `badge ${className}`, text);
    container.appendChild(badge);
    return badge;
  }

  function buildListingCard(listing) {
    const card = createEl('article', 'listing-card');
    card.id = `listing-${domId(listing.id)}`;
    card.dataset.pillar = listing.pillar;
    card.dataset.listingId = listing.id;
    if (listing.isUser) card.classList.add('is-user');

    const matchingRequests = state.requests.filter((request) => request.listingId === listing.id);
    const hasMutualRequest = matchingRequests.some((request) => request.type !== 'nonmember_purchase');
    const hasPurchaseIntent = matchingRequests.some((request) => request.type === 'nonmember_purchase');
    if (hasMutualRequest || hasPurchaseIntent) card.classList.add('is-requested');

    const badges = createEl('div', 'listing-badges');
    addBadge(badges, 'badge--pillar', PILLARS[listing.pillar].short);
    const isGoods = listing.pillar === 'goods';
    if (isGoods && hasOwn(GOODS_CATEGORIES, listing.category)) {
      addBadge(badges, 'badge--soft', GOODS_CATEGORIES[listing.category].label);
    }
    if (isGoods || listing.exchange === 'free') {
      addBadge(badges, 'badge--free', isGoods ? '100% Free' : '100% Free · no materials');
    } else {
      addBadge(badges, 'badge--atcost', 'Labor free · requester covers materials');
    }
    if (listing.isUser) addBadge(badges, 'badge--soft', 'Posted by you');
    if (hasOwn(SCOPE_LABELS, listing.scope)) addBadge(badges, 'badge--soft', SCOPE_LABELS[listing.scope]);
    card.appendChild(badges);

    const title = createEl('h3', 'listing-title', listing.title);
    title.id = `listing-title-${domId(listing.id)}`;
    card.appendChild(title);

    const provider = createEl('p', 'listing-provider');
    const avatar = createEl('span', 'avatar', initials(listing.provider));
    avatar.setAttribute('aria-hidden', 'true');
    provider.append(avatar, document.createTextNode('Offered by '));
    const providerName = createEl('strong', '', listing.provider);
    provider.appendChild(providerName);
    card.appendChild(provider);

    card.appendChild(createEl('p', 'listing-desc', listing.description));

    const meta = createEl('dl', 'listing-meta');
    const details = Array.isArray(listing.details) && listing.details.length
      ? listing.details
      : [{ label: 'Where', value: listing.location }];

    details.forEach((detail) => {
      if (!detail || !detail.label || !detail.value) return;
      const row = document.createElement('div');
      row.appendChild(createEl('dt', '', detail.label));
      row.appendChild(createEl('dd', '', detail.value));
      meta.appendChild(row);
    });
    card.appendChild(meta);

    const actions = createEl('div', 'listing-actions');
    const note = createEl(
      'p',
      'listing-note',
      hasMutualRequest
        ? 'Request saved locally · consent first'
        : hasPurchaseIntent
          ? 'Purchase intent recorded locally · no payment processed'
          : listing.note || 'Peer offer · consent first'
    );
    note.prepend(createIcon('check'));
    actions.appendChild(note);

    const requestButton = createEl('button', 'button button--small');
    requestButton.type = 'button';
    requestButton.dataset.requestListing = listing.id;

    if (hasMutualRequest) {
      requestButton.classList.add('button--ghost');
      requestButton.disabled = true;
      requestButton.append(createIcon('check'), document.createTextNode('Request recorded'));
      requestButton.setAttribute('aria-label', `Request recorded: ${listing.title}`);
    } else if (!isMember()) {
      if (hasPurchaseIntent) {
        requestButton.classList.add('button--ghost');
        requestButton.disabled = true;
        requestButton.append(createIcon('check'), document.createTextNode('Purchase intent recorded'));
        requestButton.setAttribute('aria-label', `Purchase intent recorded locally for ${listing.title}`);
      } else {
        requestButton.classList.add('button--outline');
        requestButton.textContent = 'Buy as non-member';
        requestButton.dataset.requestMode = 'purchase';
        requestButton.setAttribute('aria-label', `Buy ${listing.title} as a non-member (supports severance fund)`);
      }
    } else {
      requestButton.dataset.requestMode = 'mutual';
      requestButton.classList.add('button--outline');
      requestButton.textContent = 'Request with Mutual Consent';
      requestButton.setAttribute('aria-label', `Request with Mutual Consent: ${listing.title}`);
    }
    actions.appendChild(requestButton);

    const reportButton = createEl('button', 'button button--ghost button--small button--report', 'Report');
    reportButton.type = 'button';
    reportButton.dataset.reportContext = '';
    reportButton.dataset.reportArea = getDirectoryScope() === 'goods' ? 'Free Stuff listing' : 'Free Labor listing';
    reportButton.dataset.reportDetail = listing.title;
    reportButton.dataset.reportName = listing.provider;
    reportButton.dataset.reportMemberId = listing.memberId || '';
    reportButton.dataset.reportSourceId = listing.id;
    reportButton.setAttribute('aria-label', `Report a concern about ${listing.provider}'s listing: ${listing.title}`);
    actions.appendChild(reportButton);

    if (listing.isUser) {
      const removeWrap = createEl('div', 'listing-remove');
      const removeButton = createEl('button');
      removeButton.type = 'button';
      removeButton.dataset.removeListing = listing.id;
      removeButton.append(createIcon('trash'), document.createTextNode('Remove my listing'));
      removeButton.setAttribute('aria-label', `Remove my listing: ${listing.title}`);
      removeWrap.appendChild(removeButton);
      actions.appendChild(removeWrap);
    }

    card.appendChild(actions);
    return card;
  }

  function renderListings(listings) {
    const grid = document.getElementById('listings-grid');
    if (!grid) return;

    grid.replaceChildren();
    if (!listings.length) {
      const empty = createEl('div', 'no-results');
      empty.appendChild(createEl('h3', '', 'No offerings match those filters yet.'));
      empty.appendChild(createEl('p', '', 'Try another pillar or materials option—or post the first free offer in this category.'));
      const reset = createEl('button', 'button button--outline button--small', 'Reset filters');
      reset.type = 'button';
      reset.dataset.clearFilters = '';
      empty.appendChild(reset);
      grid.appendChild(empty);
      return;
    }

    const fragment = document.createDocumentFragment();
    listings.forEach((listing) => fragment.appendChild(buildListingCard(listing)));
    grid.appendChild(fragment);
  }

  function updateResultsStatus(shown, total, pillar, exchange, category) {
    const status = document.getElementById('results-status');
    if (!status) return;

    const scope = getDirectoryScope();
    const pillarText = pillar === 'all'
      ? ''
      : PILLARS[pillar].label;
    const exchangeText = exchange === 'all' ? '' : EXCHANGES[exchange].label;
    const categoryText = scope === 'goods' && category && category !== 'all' && hasOwn(GOODS_CATEGORIES, category)
      ? GOODS_CATEGORIES[category].label
      : '';
    const detail = [pillarText, exchangeText, categoryText].filter(Boolean).join(' · ');
    const offeringText = scope === 'goods' ? 'free goods' : scope === 'labor' ? 'free labor offers' : 'community offerings';

    if (!shown) {
      status.textContent = `No ${offeringText} match those filters. Try resetting the filters.`;
    } else if (!detail) {
      status.textContent = `Showing all ${total} ${offeringText}.`;
    } else {
      status.textContent = `Showing ${shown} of ${total} ${offeringText} · ${detail}.`;
    }
  }

  function applyFilters() {
    const all = getAllListings();
    const filtered = getFilteredListings();
    const { pillar, exchange, category } = getFilterValues();
    renderListings(filtered);
    updateResultsStatus(filtered.length, all.length, pillar, exchange, category);
  }

  function resetFilters() {
    const pillarFilter = document.getElementById('pillar-filter');
    const exchangeFilter = document.getElementById('exchange-filter');
    const categoryFilter = document.getElementById('category-filter');
    if (pillarFilter) pillarFilter.value = 'all';
    if (exchangeFilter) exchangeFilter.value = 'all';
    if (categoryFilter) categoryFilter.value = 'all';
    applyFilters();
  }

  function initDirectory() {
    const pillarFilter = document.getElementById('pillar-filter');
    const exchangeFilter = document.getElementById('exchange-filter');
    const categoryFilter = document.getElementById('category-filter');
    const clearButton = document.getElementById('clear-filters');
    const grid = document.getElementById('listings-grid');

    if (pillarFilter) pillarFilter.addEventListener('change', applyFilters);
    if (exchangeFilter) exchangeFilter.addEventListener('change', applyFilters);
    if (categoryFilter) categoryFilter.addEventListener('change', applyFilters);
    if (clearButton) clearButton.addEventListener('click', resetFilters);

    if (grid) {
      grid.addEventListener('click', (event) => {
        const requestButton = event.target.closest('[data-request-listing]');
        if (requestButton) {
          openConsentDialog(requestButton.dataset.requestListing, requestButton);
          return;
        }

        const removeButton = event.target.closest('[data-remove-listing]');
        if (removeButton) {
          confirmRemoveListing(removeButton.dataset.removeListing, removeButton);
          return;
        }

        const resetButton = event.target.closest('[data-clear-filters]');
        if (resetButton) resetFilters();
      });
    }

    applyFilters();
  }

  /* ------------------------------------------------------------------------
     04. Posting a listing
     ------------------------------------------------------------------------ */
  function requireNonBlank(control) {
    if (!control) return true;
    if (control.value.trim()) return true;
    control.setCustomValidity('Please fill out this field.');
    control.reportValidity();
    control.setCustomValidity('');
    control.focus();
    return false;
  }

  // The posting form lives in a dialog on both directory pages. It stays in
  // the hidden source card until this runs, then moves into the pop-up.
  function buildPostDialog(form) {
    const existing = document.getElementById('post-dialog');
    if (existing) return existing;

    const card = form.closest('.post-card');
    const isGoods = getDirectoryScope() === 'goods';
    const heading = isGoods ? 'Post Free Stuff' : 'Post a Free Service';
    const intro = isGoods
      ? 'Offer food, clothing, tools, supplies, or household goods. Everything posted here is free: no price, no deposit, and no swap required.'
      : 'Offer a skill, a repair, a class, or a care task. Keep the exchange honest: labor is free for you and the person requesting it. If materials cannot be found free on Unbought, the requester pays their exact receipt price.';

    const dialog = document.createElement('dialog');
    dialog.className = 'dialog dialog--post';
    dialog.id = 'post-dialog';
    dialog.setAttribute('aria-labelledby', 'post-dialog-title');
    dialog.setAttribute('aria-describedby', 'post-dialog-intro');
    dialog.innerHTML = `
      <div class="dialog-shell">
        <div class="dialog-top">
          <p class="eyebrow">Add to the commons</p>
          <button class="icon-button" type="button" data-dialog-close aria-label="Close the posting form">
            <svg class="icon" aria-hidden="true" focusable="false"><use href="#icon-close"></use></svg>
          </button>
        </div>
        <div class="dialog-content">
          <h2 id="post-dialog-title">${escapeHtml(heading)}</h2>
          <p id="post-dialog-intro">${escapeHtml(intro)}</p>
          <p class="dialog-note"><svg class="icon" aria-hidden="true" focusable="false"><use href="#icon-shield"></use></svg> Posting is for pledged members. Listings stay in this browser; nothing is sent to a provider or published online.</p>
          <div id="post-form-mount"></div>
        </div>
      </div>`;
    document.body.appendChild(dialog);
    dialog.querySelector('#post-form-mount').appendChild(form);
    if (card) card.hidden = true;
    return dialog;
  }

  function flagInvalidField(input, message) {
    if (!input) return;
    input.setCustomValidity(message);
    input.reportValidity();
    input.focus();
    input.addEventListener('input', () => input.setCustomValidity(''), { once: true });
  }

  function initPostForm() {
    const form = document.getElementById('post-form');
    if (!form) return;
    const dialog = buildPostDialog(form);

    // The provider is the signed-in member, so carry their chosen name over
    // instead of asking them to type it again.
    const fillProviderName = () => fillOwnNameField(document.getElementById('post-provider'));
    fillProviderName();

    $$('[data-post-trigger]').forEach((trigger) => {
      trigger.addEventListener('click', (event) => {
        event.preventDefault();
        fillProviderName();
        openDialog(dialog);
      });
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!requireFullAccess('Full access is paused during your reflection period. Posting is unavailable until you complete the reflection and treatment requirements.')) return;
      if (!form.reportValidity()) return;

      const titleInput = document.getElementById('post-title-input');
      const providerInput = document.getElementById('post-provider');
      const cityInput = document.getElementById('post-city');
      const stateInput = document.getElementById('post-state');
      const zipInput = document.getElementById('post-zip');
      const descriptionInput = document.getElementById('post-description');

      if (![titleInput, providerInput, cityInput, stateInput, zipInput, descriptionInput].every(requireNonBlank)) {
        return;
      }

      const data = new FormData(form);
      const title = cleanString(data.get('title'), 80);
      const provider = cleanString(data.get('provider'), 60);
      const city = cleanString(data.get('city'), 60);
      const stateCode = cleanString(data.get('state'), 2).toUpperCase();
      const zip = cleanString(data.get('zip'), 10);
      const description = cleanString(data.get('description'), 400);
      const pillar = getDirectoryScope() === 'goods' ? 'goods' : String(data.get('pillar') || '');
      const exchange = pillar === 'goods' ? 'free' : String(data.get('exchange') || '');
      const category = pillar === 'goods' ? String(data.get('category') || '') : '';
      const scope = String(data.get('scope') || '');

      if (!/^[A-Z]{2}$/.test(stateCode)) {
        flagInvalidField(stateInput, 'Use the two-letter state code, such as NC.');
        return;
      }
      if (!/^\d{5}(?:-\d{4})?$/.test(zip)) {
        flagInvalidField(zipInput, 'Use a 5-digit ZIP code, or ZIP+4 such as 12345-6789.');
        return;
      }

      const location = `${city}, ${stateCode} ${zip}`;
      const locationInput = document.getElementById('post-location');
      if (locationInput) locationInput.value = location;

      if (!hasOwn(PILLARS, pillar) || !hasOwn(EXCHANGES, exchange)) return;
      if (pillar === 'goods' && !hasOwn(GOODS_CATEGORIES, category)) return;
      if (scope && !hasOwn(SCOPE_LABELS, scope)) return;

      const listing = {
        id: makeId('user-listing'),
        memberId: state.pledge.memberId,
        title,
        provider,
        location,
        description,
        pillar,
        exchange,
        category,
        scope,
        details: [
          { label: 'Where', value: location },
          ...(pillar === 'goods' ? [{ label: 'Category', value: GOODS_CATEGORIES[category].label }] : []),
          { label: pillar === 'goods' ? 'Cost' : 'Materials', value: EXCHANGES[exchange].label },
          { label: 'Contact', value: 'Through a consent request' }
        ],
        note: 'Posted by a member · consent first',
        isUser: true,
        createdAt: new Date().toISOString(),
        status: 'active'
      };

      state.listings.unshift(listing);
      saveState();

      resetFilters();
      form.reset();
      fillProviderName();
      closeDialog(dialog, { restoreFocus: false });
      const postStatus = document.getElementById('post-status');
      if (postStatus) {
        postStatus.textContent = 'Published. Your listing is now in the directory above.';
      }
      showToast('Listing published to this browser.', false);
      announce(`Your listing “${listing.title}” was published. It is at the top of the directory.`);
      focusListingTitle(listing.id);
    });

    if (window.location.hash === '#post-trigger' || window.location.hash === '#post-form') {
      fillProviderName();
      openDialog(dialog);
    }
  }

  function confirmRemoveListing(id, trigger) {
    const listing = state.listings.find((item) => item.id === id);
    if (!listing) return;

    showConfirm({
      title: 'Remove your listing?',
      message: `“${listing.title}” will be removed from this browser. This cannot be undone.`,
      confirmLabel: 'Remove listing',
      tone: 'danger',
      onConfirm: () => {
        state.listings = state.listings.filter((item) => item.id !== id);
        saveState();
        applyFilters();
        announce('Your listing was removed.');
        showToast('Listing removed.', false);
        const status = document.getElementById('results-status');
        if (status) {
          status.tabIndex = -1;
          status.focus({ preventScroll: true });
        }
      }
    });
  }

  /* ------------------------------------------------------------------------
     05. Member account, contributions, stock & severance (prototype)
     ------------------------------------------------------------------------ */
  function renderMemberAccount() {
    const container = document.getElementById('member-account');
    if (!container) return;

    const signedIn = isMember();
    const memberContribs = getMemberContributions();
    const memberDonations = getMemberDonationIntents();
    const donationTotal = memberDonations.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
    const laborEntries = memberContribs.filter((c) => c.type === 'labor');
    const laborHours = laborEntries.reduce((sum, c) => sum + (Number(c.hours) || 0), 0);
    const laborValue = laborEntries.reduce((sum, c) => sum + (Number(c.stockValue) || 0), 0);
    const donationStock = memberContribs.filter((c) => c.type === 'donation').reduce((sum, c) => sum + (Number(c.stockValue) || 0), 0);
    const totalStock = memberContribs.reduce((sum, c) => sum + (Number(c.stockValue) || 0), 0);
    const severance = getSeveranceSummary();

    container.replaceChildren();

    const card = createEl('section', 'account-card');
    const head = createEl('div', 'account-head');
    head.appendChild(createEl('p', 'eyebrow', signedIn ? 'Your account' : 'Participation & severance'));
    head.appendChild(createEl('h3', '', signedIn ? 'Contributions, work, and stock' : 'Members join by pledge; non-members may record purchase intents'));
    card.appendChild(head);

    if (!signedIn) {
      const intro = createEl('p', '', 'Anyone can browse. To participate in the commons (post offers/needs, request mutual-aid connections, and manage your track), sign the Unbought Pledge to become a member. People who do not take the pledge can record a purchase intent for goods or services in this prototype; the amount is tracked locally for the severance fund and no real payment is processed.');
      card.appendChild(intro);
    } else {
      const meta = createEl('p', 'account-meta', `${state.pledge.name} · ${state.pledge.location || 'Location not shared'} · Member ID ${state.pledge.memberId}`);
      card.appendChild(meta);
    }

    const stats = createEl('div', 'account-stats');
    const statDefs = signedIn ? [
      ['Donations tracked', `${memberDonations.length} intent${memberDonations.length === 1 ? '' : 's'} · ${formatMoney(donationTotal)}`],
      ['Work logged', `${laborHours.toLocaleString()} hr · ${formatMoney(laborValue)} stock value`],
      ['Volunteer roles offered', String(getMemberVolunteerInterests().length)],
      ['Your stock value (prototype)', formatMoney(totalStock)],
      ['Severance fund (non-member purchase intents)', `${formatMoney(severance.balance)} · ${severance.count} recorded`]
    ] : [
      ['Severance fund (non-member purchase intents)', formatMoney(severance.balance)],
      ['Recorded non-member purchase intents', String(severance.count)],
      ['Member benefit', 'Mutual-aid access by pledge (no purchase)'],
      ['Stock model', 'Donations and logged work hours create stock value for members']
    ];
    statDefs.forEach(([label, value]) => {
      const s = createEl('div', 'account-stat');
      s.appendChild(createEl('span', 'account-stat-label', label));
      s.appendChild(createEl('strong', 'account-stat-value', value));
      stats.appendChild(s);
    });
    card.appendChild(stats);

    const model = createEl('p', 'account-note', 'Prototype model (local only): every donation intent or logged hour gives stock value in the commons. Hours are valued at the average hourly wage you enter for your profession and state or region; a future system may calculate this automatically. Non-members who record contributions may be eligible for a severance share based on contribution percentage; no payouts are made and nothing is transmitted in this prototype.');
    card.appendChild(model);

    if (signedIn) {
      // Labor logging form
      const formWrap = createEl('div', 'account-block');
      formWrap.appendChild(createEl('h4', '', 'Log work hours (stock value)'));
      formWrap.appendChild(createEl('p', 'account-note', 'Record hours you worked for the commons. Stock value = hours × average hourly wage for your profession in your state/region. This is stored locally in this prototype.'));
      const form = document.createElement('form');
      form.className = 'account-form';
      form.id = 'labor-log-form';
      form.innerHTML = `
        <div class="form-grid">
          <div class="field">
            <label for="labor-hours">Hours worked <span class="required-mark" aria-hidden="true">*</span></label>
            <input type="number" id="labor-hours" name="hours" min="0.25" step="0.25" required placeholder="2">
          </div>
          <div class="field">
            <label for="labor-profession">Profession / role <span class="required-mark" aria-hidden="true">*</span></label>
            <input type="text" id="labor-profession" name="profession" maxlength="80" required placeholder="Carpenter, tutor, caregiver...">
          </div>
          <div class="field">
            <label for="labor-state">State / region <span class="required-mark" aria-hidden="true">*</span></label>
            <input type="text" id="labor-state" name="stateRegion" maxlength="40" required placeholder="CA, NY, Ontario...">
          </div>
          <div class="field">
            <label for="labor-rate">Avg hourly wage (USD) <span class="required-mark" aria-hidden="true">*</span></label>
            <input type="number" id="labor-rate" name="hourlyRate" min="1" step="0.01" required placeholder="28.50">
            <p class="field-hint">Enter the average hourly wage for this profession in your state now. Future versions may auto-calculate.</p>
          </div>
        </div>
        <div class="field">
          <label for="labor-note">Note <span class="optional">(optional)</span></label>
          <input type="text" id="labor-note" name="note" maxlength="200" placeholder="What work was done?">
        </div>
        <div class="account-form-actions">
          <button class="button button--primary button--small" type="submit">Record hours as stock value</button>
          <p class="form-hint" id="labor-log-status" aria-live="polite"></p>
        </div>`;
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        if (!isMember()) return;
        if (!form.reportValidity()) return;
        const data = new FormData(form);
        const hours = Math.max(0, Number(data.get('hours') || 0));
        const hourlyRate = Math.max(0, Number(data.get('hourlyRate') || 0));
        const profession = cleanString(data.get('profession'), 80);
        const stateRegion = cleanString(data.get('stateRegion'), 40);
        const note = cleanString(data.get('note'), 200);
        if (!(hours > 0) || !(hourlyRate > 0) || !profession || !stateRegion) return;
        const stockValue = Math.round(hours * hourlyRate * 100) / 100;
        const entry = {
          id: makeId('contribution'),
          memberId: state.pledge.memberId,
          type: 'labor',
          amount: 0,
          hours,
          profession,
          stateRegion,
          hourlyRate,
          stockValue,
          sourceId: '',
          note,
          createdAt: new Date().toISOString(),
          status: 'recorded'
        };
        state.contributions = Array.isArray(state.contributions) ? state.contributions : [];
        state.contributions.unshift(entry);
        state.contributions = state.contributions.slice(0, 200);
        saveState();
        announce(`Recorded ${hours} hour${hours === 1 ? '' : 's'} as ${formatMoney(stockValue)} in stock value.`);
        showToast('Work hours recorded as contribution/stock value (prototype).', false);
        renderSharedMemberViews();
      });
      formWrap.appendChild(form);
      card.appendChild(formWrap);

      // Ledger
      const ledger = createEl('div', 'account-block');
      ledger.appendChild(createEl('h4', '', 'Contribution ledger'));
      if (!memberContribs.length) {
        ledger.appendChild(createEl('p', 'account-note', 'No contributions recorded yet. Donations you make while signed in and logged work hours will appear here.'));
      } else {
        const list = createEl('ul', 'contribution-list');
        memberContribs.slice(0, 10).forEach((c) => {
          const item = createEl('li', 'contribution-item');
          const title = c.type === 'labor'
            ? `${c.hours} hr ${c.profession} (${c.stateRegion} @ ${formatMoney(c.hourlyRate)}/hr)`
            : c.type === 'donation'
              ? `Donation ${formatMoney(c.amount || c.stockValue)}`
              : `${c.type} ${formatMoney(c.amount || c.stockValue)}`;
          item.appendChild(createEl('strong', '', title));
          const sub = `${formatMoney(c.stockValue)} stock value · ${formatDate(c.createdAt) || 'recorded'}${c.note ? ' · ' + c.note : ''}`;
          item.appendChild(createEl('span', 'contribution-meta', sub));
          list.appendChild(item);
        });
        ledger.appendChild(list);
        if (memberContribs.length > 10) {
          ledger.appendChild(createEl('p', 'account-note', `Showing 10 of ${memberContribs.length} contributions.`));
        }
      }
      card.appendChild(ledger);
    }

    container.appendChild(card);
  }

  /* ------------------------------------------------------------------------
     05a. Volunteer operating team
     ------------------------------------------------------------------------ */
  function getMemberVolunteerInterests() {
    if (!isMember()) return [];
    return (Array.isArray(state.volunteerInterests) ? state.volunteerInterests : []).filter((item) => item && item.memberId === state.pledge.memberId);
  }

  // One shared pop-up form, built once from app.js so every page that loads
  // this script can open it from a [data-volunteer-trigger] button.
  function buildVolunteerDialog() {
    if (document.getElementById('volunteer-dialog')) return;

    const roleOptions = Object.entries(VOLUNTEER_ROLES)
      .map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`)
      .join('');

    const dialog = document.createElement('dialog');
    dialog.className = 'dialog dialog--volunteer';
    dialog.id = 'volunteer-dialog';
    dialog.setAttribute('aria-labelledby', 'volunteer-dialog-title');
    dialog.setAttribute('aria-describedby', 'volunteer-dialog-intro');
    dialog.innerHTML = `
      <div class="dialog-shell">
        <div class="dialog-top">
          <p class="eyebrow">Offer your time</p>
          <button class="icon-button" type="button" data-dialog-close aria-label="Close the volunteer form">
            <svg class="icon" aria-hidden="true" focusable="false"><use href="#icon-close"></use></svg>
          </button>
        </div>
        <div class="dialog-content">
          <h2 id="volunteer-dialog-title">Join the operating team.</h2>
          <p id="volunteer-dialog-intro">Tell us where you can help. In this prototype your offer is recorded in this browser only—nothing is sent to a coordinator and no real onboarding happens yet.</p>
          <p class="volunteer-gate" id="volunteer-dialog-gate" data-volunteer-gate role="status"></p>
          <div class="volunteer-guest-note" id="volunteer-guest-note" hidden>
            <p><strong>Members only.</strong> Sign the Unbought Pledge to become a member before recording a volunteer offer. Browsing the roles is open to everyone.</p>
            <a class="button button--primary button--small" href="pledge.html">Take the Pledge <svg class="icon" aria-hidden="true" focusable="false"><use href="#icon-arrow"></use></svg></a>
          </div>
          <form class="volunteer-form" id="volunteer-form">
            <div class="field">
              <label for="volunteer-name">Chosen name <span class="required-mark" aria-hidden="true">*</span></label>
              <input type="text" id="volunteer-name" name="name" maxlength="60" autocomplete="nickname" placeholder="What should we call you?">
            </div>
            <div class="field">
              <label for="volunteer-role">Role you can help with <span class="required-mark" aria-hidden="true">*</span></label>
              <select id="volunteer-role" name="role" required>
                <option value="">Choose a role…</option>
                ${roleOptions}
              </select>
            </div>
            <div class="field">
              <label for="volunteer-note">How can you help? <span class="optional">(optional)</span></label>
              <textarea id="volunteer-note" name="note" rows="3" maxlength="280" placeholder="Hours you can offer, skills, or anything we should know."></textarea>
            </div>
            <label class="checkbox">
              <input type="checkbox" name="volunteerAgreement" required>
              <span>I understand this is a local prototype offer, not a job, employment relationship, or background-checked position, and that no one is obligated to contact me from this browser.</span>
            </label>
            <div class="volunteer-form-actions">
              <button class="button button--primary" type="submit">Record volunteer offer</button>
              <p class="form-hint">Members only · no data leaves this device</p>
            </div>
          </form>
          <p class="volunteer-join-status" id="volunteer-dialog-status" data-volunteer-status role="status">No volunteer offers recorded yet.</p>
        </div>
      </div>`;
    document.body.appendChild(dialog);
  }

  function openVolunteerDialog() {
    const dialog = document.getElementById('volunteer-dialog');
    if (!dialog) return;
    renderVolunteerStatus();
    openDialog(dialog);
  }

  function renderVolunteerStatus() {
    const signedIn = isMember();
    const memberName = signedIn ? (state.pledge.name || '') : '';

    const gateText = signedIn
      ? `Signed in as ${memberName}. Record a volunteer offer in this pop-up—stored in this browser only.`
      : 'Browsing these roles is open to everyone. Sign the Unbought Pledge to become a member and record a volunteer offer.';

    $$('[data-volunteer-gate], #volunteer-gate').forEach((gate) => {
      gate.textContent = gateText;
      gate.classList.toggle('is-signed', signedIn);
    });

    const form = document.getElementById('volunteer-form');
    if (form) form.hidden = !signedIn;

    const guestNote = document.getElementById('volunteer-guest-note');
    if (guestNote) guestNote.hidden = signedIn;

    const nameInput = document.getElementById('volunteer-name');
    if (nameInput && signedIn && !nameInput.value.trim()) nameInput.value = memberName;

    const interests = getMemberVolunteerInterests();
    const roles = interests
      .map((item) => (hasOwn(VOLUNTEER_ROLES, item.role) ? VOLUNTEER_ROLES[item.role] : item.role))
      .join(', ');
    const statusText = interests.length
      ? `${interests.length} volunteer offer${interests.length === 1 ? '' : 's'} recorded in this browser${roles ? ` (${roles})` : ''}.`
      : 'No volunteer offers recorded yet.';

    $$('[data-volunteer-status], #volunteer-status').forEach((status) => {
      status.textContent = statusText;
    });
  }

  function initVolunteerForm() {
    buildVolunteerDialog();

    $$('[data-volunteer-trigger]').forEach((trigger) => {
      trigger.addEventListener('click', (event) => {
        event.preventDefault();
        openVolunteerDialog();
      });
    });

    const form = document.getElementById('volunteer-form');
    if (!form) return;

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!requireMembership('Sign the Unbought Pledge to become a member before recording a volunteer offer.')) return;
      if (!requireFullAccess('Full access is paused during your reflection period. Volunteering is unavailable until you complete the reflection and treatment requirements.')) return;
      if (!form.reportValidity()) return;

      const data = new FormData(form);
      const role = cleanString(data.get('role'), 40);
      if (!hasOwn(VOLUNTEER_ROLES, role)) return;
      const name = cleanString(data.get('name'), 60) || state.pledge.name || '';
      const note = cleanString(data.get('note'), 280);

      if (getMemberVolunteerInterests().some((item) => item.role === role)) {
        announce('You already recorded an offer for that role in this browser.');
        showToast('That volunteer role is already recorded for your account.', false);
        return;
      }

      const interest = {
        id: makeId('volunteer'),
        memberId: state.pledge.memberId,
        name,
        role,
        note,
        createdAt: new Date().toISOString(),
        status: 'interest_recorded'
      };

      state.volunteerInterests = Array.isArray(state.volunteerInterests) ? state.volunteerInterests : [];
      state.volunteerInterests.unshift(interest);
      state.volunteerInterests = state.volunteerInterests.slice(0, 100);
      saveState();

      form.reset();
      renderVolunteerStatus();
      renderSharedMemberViews();
      announce(`Volunteer offer for ${VOLUNTEER_ROLES[role]} recorded. This prototype saved it in your browser only.`);
      showToast('Volunteer offer recorded locally. No data left this device.', false);
    });

    renderVolunteerStatus();
  }

  /* ------------------------------------------------------------------------
     05a-1. Member dashboard shell & panels
     ------------------------------------------------------------------------ */
  function renderDashboardGate() {
    const gate = document.getElementById('dashboard-gate');
    const dash = document.getElementById('member-dashboard');
    if (!gate || !dash) return;
    if (isMember()) {
      gate.hidden = true;
      dash.hidden = false;
      document.body.classList.toggle('dashboard-compact', Boolean(state.settings && state.settings.compactDashboard));
    } else {
      gate.hidden = false;
      dash.hidden = true;
      document.body.classList.remove('dashboard-compact');
    }
  }

  function setDashboardTab(name) {
    const tabs = Array.from(document.querySelectorAll('[data-dashboard-tab]'));
    const panels = Array.from(document.querySelectorAll('[data-dashboard-panel]'));
    const tab = tabs.find((item) => item.dataset.dashboardTab === name);
    if (!tab) return;
    tabs.forEach((item) => {
      const active = item === tab;
      item.setAttribute('aria-selected', String(active));
      item.tabIndex = active ? 0 : -1;
    });
    panels.forEach((panel) => {
      panel.hidden = panel.dataset.dashboardPanel !== name;
    });

    document.querySelectorAll('[data-menu-tab]').forEach((item) => {
      const active = item.dataset.menuTab === name;
      item.classList.toggle('is-active', active);
      if (active) item.setAttribute('aria-current', 'page');
      else item.removeAttribute('aria-current');
    });

    tab.focus({ preventScroll: true });
  }

  function initDashboardMenu() {
    const menu = document.querySelector('.dashboard-menu');
    if (!menu) return;
    menu.addEventListener('click', (event) => {
      const item = event.target.closest('[data-menu-tab]');
      if (!item) return;
      event.preventDefault();
      setDashboardTab(item.dataset.menuTab);
    });
  }

  function renderNewsFeeds() {
    document.querySelectorAll('[data-news-feed]').forEach((feed) => {
      if (feed.children.length) return;
      feed.innerHTML = NEWS_POSTS.map((post) => {
        const e = escapeHtml;
        return `<article class="news-item">
          <p class="news-meta"><time datetime="${e(post.date)}">${e(post.label)}</time> · <span class="news-tag">${e(post.tag)}</span></p>
          <h3>${e(post.title)}</h3>
          <p>${e(post.body)}</p>
        </article>`;
      }).join('');
    });
  }

  function initDashboardTabs() {
    const nav = document.querySelector('.dashboard-tabs');
    if (!nav) return;
    nav.addEventListener('click', (event) => {
      const tab = event.target.closest('[data-dashboard-tab]');
      if (tab) setDashboardTab(tab.dataset.dashboardTab);
    });
    nav.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
      const tabs = Array.from(nav.querySelectorAll('[data-dashboard-tab]'));
      const current = event.target.closest('[data-dashboard-tab]');
      if (!current || !tabs.length) return;
      const index = tabs.indexOf(current);
      const next = event.key === 'ArrowRight'
        ? (index + 1) % tabs.length
        : (index - 1 + tabs.length) % tabs.length;
      event.preventDefault();
      setDashboardTab(tabs[next].dataset.dashboardTab);
    });
  }

  function renderAccountInfo() {
    const panel = document.getElementById('account-info-panel');
    if (!panel || !isMember()) return;
    const m = state.pledge;
    const e = escapeHtml;
    const credential = getCredential();
    const notice = state.settings && state.settings.showPrototypeNotices
      ? `<p class="prototype-note">Prototype: account details, your username, and a salted password hash are stored only on this device. There is no real authentication or server, and nothing is transmitted.</p>`
      : '';
    panel.innerHTML = `<section class="account-card">
      <p class="eyebrow">Account</p>
      <h3>Your membership</h3>
      <dl class="account-details">
        <div><dt>Full legal name</dt><dd>${e(m.fullName || 'Not shared')}</dd></div>
        <div><dt>Chosen name</dt><dd>${e(m.name)}</dd></div>
        <div><dt>Username</dt><dd>${e(credential && credential.username ? credential.username : 'Not set')}</dd></div>
        <div><dt>Password hash (local prototype)</dt><dd>${e(credential && credential.passwordHash ? credential.passwordHash : 'Not set')}</dd></div>
        <div><dt>Password salt (local prototype)</dt><dd>${e(credential && credential.salt ? credential.salt : 'Not set')}</dd></div>
        <div><dt>General location</dt><dd>${e(m.location || 'Not shared')}</dd></div>
        <div><dt>Mailing address</dt><dd>${e(m.mailingAddress || 'Not shared')}</dd></div>
        <div><dt>Physical address</dt><dd>${e(m.physicalAddress || 'Not shared')}</dd></div>
        <div><dt>Housing status</dt><dd>${e(hasOwn(HOUSING_STATUSES, m.housingStatus) ? HOUSING_STATUSES[m.housingStatus] : 'Not shared')}</dd></div>
        <div><dt>Phone number</dt><dd>${e(m.phone || 'Not shared')}</dd></div>
        <div><dt>Date of birth</dt><dd>${e(m.dob || 'Not shared')}</dd></div>
        <div><dt>Career / paid skills</dt><dd>${e(m.paidSkills || 'Not listed')}</dd></div>
        <div><dt>Unpaid skills</dt><dd>${e(m.unpaidSkills || 'Not listed')}</dd></div>
        <div><dt>Donation count</dt><dd>${cleanCount(m.donationCount)}</dd></div>
        <div><dt>Hours completed on Unbought</dt><dd>${cleanHours(m.hoursCompleted)}</dd></div>
        <div><dt>Hours used on Unbought</dt><dd>${cleanHours(m.hoursUsed)}</dd></div>
        <div><dt>Items gifted</dt><dd>${cleanCount(m.itemsGifted)}</dd></div>
        <div><dt>Items taken</dt><dd>${cleanCount(m.itemsTaken)}</dd></div>
        <div><dt>Availability</dt><dd>${m.available === false ? 'Not available right now' : 'Available'}</dd></div>
        <div><dt>Public City, State from</dt><dd>${m.publicAddressSource === 'physical' ? 'Physical address' : 'Mailing address'}</dd></div>
        <div><dt>Public phone</dt><dd>${m.publicPhone ? 'Shown on resume' : 'Hidden from resume'}</dd></div>
        <div><dt>Member ID</dt><dd>${e(m.memberId)}</dd></div>
        <div><dt>Pledged on</dt><dd>${e(formatDate(m.signedAt))}</dd></div>
        <div><dt>Status</dt><dd>${e(m.status || 'active')}</dd></div>
        <div><dt>Track</dt><dd>${e(state.track && hasOwn(TRACKS, state.track) ? TRACKS[state.track] : 'Not chosen')}</dd></div>
        <div><dt>Volunteer offers</dt><dd>${getMemberVolunteerInterests().length}</dd></div>
      </dl>
      <form class="account-form" data-account-form>
        <div class="form-row">
          <div class="field">
            <label for="account-name">Chosen name</label>
            <input type="text" id="account-name" name="name" maxlength="60" value="${e(m.name)}" required>
          </div>
          <div class="field">
            <label for="account-location">General location</label>
            <input type="text" id="account-location" name="location" maxlength="80" value="${e(m.location || '')}">
          </div>
        </div>
        <div class="form-row">
          <div class="field">
            <label for="account-housing">Housing status</label>
            <select id="account-housing" name="housingStatus">
              ${Object.entries(HOUSING_STATUSES).map(([value, label]) => `<option value="${value}"${m.housingStatus === value ? ' selected' : ''}>${e(label)}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label for="account-public-address">Public City, State from</label>
            <select id="account-public-address" name="publicAddressSource">
              <option value="mailing"${m.publicAddressSource !== 'physical' ? ' selected' : ''}>Mailing address</option>
              <option value="physical"${m.publicAddressSource === 'physical' ? ' selected' : ''}>Physical address</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="field">
            <label for="account-paid-skills">Career / paid skills</label>
            <textarea id="account-paid-skills" name="paidSkills" rows="3" maxlength="400">${e(m.paidSkills || '')}</textarea>
          </div>
          <div class="field">
            <label for="account-unpaid-skills">Unpaid skills</label>
            <textarea id="account-unpaid-skills" name="unpaidSkills" rows="3" maxlength="400">${e(m.unpaidSkills || '')}</textarea>
          </div>
        </div>
        <div class="form-row">
          <div class="field"><label for="account-donations">Donation count</label><input type="number" id="account-donations" name="donationCount" min="0" step="1" value="${cleanCount(m.donationCount)}"></div>
          <div class="field"><label for="account-hours-completed">Hours completed</label><input type="number" id="account-hours-completed" name="hoursCompleted" min="0" step="0.25" value="${cleanHours(m.hoursCompleted)}"></div>
          <div class="field"><label for="account-hours-used">Hours used</label><input type="number" id="account-hours-used" name="hoursUsed" min="0" step="0.25" value="${cleanHours(m.hoursUsed)}"></div>
          <div class="field"><label for="account-items-gifted">Items gifted</label><input type="number" id="account-items-gifted" name="itemsGifted" min="0" step="1" value="${cleanCount(m.itemsGifted)}"></div>
          <div class="field"><label for="account-items-taken">Items taken</label><input type="number" id="account-items-taken" name="itemsTaken" min="0" step="1" value="${cleanCount(m.itemsTaken)}"></div>
        </div>
        <div class="account-privacy-options">
          <label class="checkbox"><input type="checkbox" name="available"${m.available !== false ? ' checked' : ''}> <span>Available for exchanges</span></label>
          <label class="checkbox"><input type="checkbox" name="publicPhone"${m.publicPhone ? ' checked' : ''}> <span>Show my phone number on my public resume</span></label>
        </div>
        <div class="account-form-actions">
          <button type="submit" class="button button--primary button--small">Save account details</button>
          <a class="button button--outline button--small" href="profile.html">View public resume</a>
        </div>
      </form>
      ${notice}
      <p class="account-note">Only you can see this full record on this device. Your public resume hides your legal name, street address, ZIP, housing status, and birthdate. To withdraw your membership, use the button in the pledge section.</p>
    </section>`;
  }

  function renderSettings() {
    const panel = document.getElementById('settings-panel');
    if (!panel || !isMember()) return;
    const s = state.settings || {};
    panel.innerHTML = `<section class="account-card">
      <p class="eyebrow">Settings</p>
      <h3>Your local preferences</h3>
      <p class="account-note">These settings only change how this prototype behaves on this device. Nothing is sent anywhere.</p>
      <form class="account-form" data-settings-form>
        <label class="checkbox"><input type="checkbox" name="compactDashboard" ${s.compactDashboard ? 'checked' : ''}> <span>Use compact spacing on the dashboard</span></label>
        <label class="checkbox"><input type="checkbox" name="showPrototypeNotices" ${s.showPrototypeNotices ? 'checked' : ''}> <span>Show prototype notices</span></label>
        <div class="account-form-actions">
          <button type="submit" class="button button--primary button--small">Save settings</button>
        </div>
      </form>
    </section>`;
  }

  function getPublicResume(member) {
    const address = member.publicAddressSource === 'physical' ? member.physicalAddress : member.mailingAddress;
    return {
      displayName: firstName(member.name),
      cityState: parseCityState(address) || parseCityState(member.location) || 'City not shared',
      paidSkills: cleanString(member.paidSkills, 400),
      unpaidSkills: cleanString(member.unpaidSkills, 400),
      donationCount: cleanCount(member.donationCount),
      hoursCompleted: cleanHours(member.hoursCompleted),
      hoursUsed: cleanHours(member.hoursUsed),
      itemsGifted: cleanCount(member.itemsGifted),
      itemsTaken: cleanCount(member.itemsTaken),
      available: member.available !== false,
      phone: member.publicPhone ? cleanString(member.phone, 40) : ''
    };
  }

  function renderProfile() {
    const publicPanel = document.getElementById('public-resume');
    const privatePanel = document.getElementById('private-profile');
    if (!publicPanel) return;

    const e = escapeHtml;
    const m = state.pledge;
    const credential = getCredential();

    if (!m) {
      publicPanel.innerHTML = `<section class="resume-card">
        <p class="eyebrow">Member profile</p>
        <h2>No public resume yet</h2>
        <p>When someone signs the pledge on this device, their public resume will appear here.</p>
        <a class="button button--primary" href="pledge.html">Take the Pledge <svg class="icon" aria-hidden="true" focusable="false"><use href="#icon-arrow"></use></svg></a>
      </section>`;
      if (privatePanel) privatePanel.innerHTML = '';
      return;
    }

    const resume = getPublicResume(m);
    const skillList = (value) => {
      const items = cleanString(value, 400)
        .split(/[\n,]+/)
        .map((item) => item.trim())
        .filter(Boolean);
      return items.length
        ? `<ul class="resume-skills">${items.map((item) => `<li>${e(item)}</li>`).join('')}</ul>`
        : `<p class="resume-empty">Not listed yet.</p>`;
    };
    const metrics = [
      ['Donation count', resume.donationCount],
      ['Hours completed', resume.hoursCompleted],
      ['Hours used', resume.hoursUsed],
      ['Items gifted', resume.itemsGifted],
      ['Items taken', resume.itemsTaken]
    ];

    publicPanel.innerHTML = `<section class="resume-card" aria-labelledby="resume-name">
      <div class="resume-head">
        <div>
          <p class="eyebrow">Public resume</p>
          <h2 id="resume-name">${e(resume.displayName || 'Member')}</h2>
          <p class="resume-location"><svg class="icon" aria-hidden="true" focusable="false"><use href="#icon-pin"></use></svg> ${e(resume.cityState)}</p>
          ${resume.phone ? `<p class="resume-phone">Public phone: ${e(resume.phone)}</p>` : ''}
        </div>
        <span class="resume-availability ${resume.available ? 'is-available' : ''}">${resume.available ? 'Available' : 'Not available right now'}</span>
        ${isMember() ? `<button class="button button--ghost button--small button--report" type="button" data-report-context data-report-area="Member profile" data-report-detail="Public resume" data-report-name="${e(resume.displayName)}" data-report-member-id="${e(m.memberId || '')}" data-report-source-id="${e(m.memberId || 'profile')}" aria-label="Report a concern from ${e(resume.displayName)}'s profile">Report from this profile</button>` : ''}
      </div>
      <div class="resume-section">
        <h3>Career / paid skills</h3>
        ${skillList(resume.paidSkills)}
      </div>
      <div class="resume-section">
        <h3>Unpaid skills</h3>
        ${skillList(resume.unpaidSkills)}
      </div>
      <div class="resume-section">
        <h3>Commons record</h3>
        <dl class="resume-metrics">
          ${metrics.map(([label, value]) => `<div><dt>${e(label)}</dt><dd>${e(value)}</dd></div>`).join('')}
        </dl>
      </div>
      <p class="account-note">This resume shows only the first name, City/State, skills, commons totals, availability, and an optional public phone. Legal name, street address, ZIP, housing status, and birthdate are never included.</p>
      ${isMember() ? `<p class="field-hint">This prototype stores one local member profile. Opening the report fills the name from this resume; you do not type it.</p>` : ''}
    </section>`;

    if (!privatePanel) return;
    if (!isMember()) {
      privatePanel.innerHTML = '';
      return;
    }

    privatePanel.innerHTML = `<section class="account-card private-profile" aria-labelledby="private-profile-title">
      <p class="eyebrow">Private to you</p>
      <h2 id="private-profile-title">Your full member record</h2>
      <p class="account-note">This section appears only in your signed-in browser. It is not part of the public resume.</p>
      <dl class="account-details">
        <div><dt>Full legal name</dt><dd>${e(m.fullName || 'Not shared')}</dd></div>
        <div><dt>Chosen name</dt><dd>${e(m.name)}</dd></div>
        <div><dt>Username</dt><dd>${e(credential && credential.username ? credential.username : 'Not set')}</dd></div>
        <div><dt>Password hash (local prototype)</dt><dd>${e(credential && credential.passwordHash ? credential.passwordHash : 'Not set')}</dd></div>
        <div><dt>Password salt (local prototype)</dt><dd>${e(credential && credential.salt ? credential.salt : 'Not set')}</dd></div>
        <div><dt>General location</dt><dd>${e(m.location || 'Not shared')}</dd></div>
        <div><dt>Mailing address</dt><dd>${e(m.mailingAddress || 'Not shared')}</dd></div>
        <div><dt>Physical address</dt><dd>${e(m.physicalAddress || 'Not shared')}</dd></div>
        <div><dt>Housing status</dt><dd>${e(hasOwn(HOUSING_STATUSES, m.housingStatus) ? HOUSING_STATUSES[m.housingStatus] : 'Not shared')}</dd></div>
        <div><dt>Phone number</dt><dd>${e(m.phone || 'Not shared')}</dd></div>
        <div><dt>Date of birth</dt><dd>${e(m.dob || 'Not shared')}</dd></div>
        <div><dt>Career / paid skills</dt><dd>${e(m.paidSkills || 'Not listed')}</dd></div>
        <div><dt>Unpaid skills</dt><dd>${e(m.unpaidSkills || 'Not listed')}</dd></div>
        <div><dt>Donation count</dt><dd>${cleanCount(m.donationCount)}</dd></div>
        <div><dt>Hours completed on Unbought</dt><dd>${cleanHours(m.hoursCompleted)}</dd></div>
        <div><dt>Hours used on Unbought</dt><dd>${cleanHours(m.hoursUsed)}</dd></div>
        <div><dt>Items gifted</dt><dd>${cleanCount(m.itemsGifted)}</dd></div>
        <div><dt>Items taken</dt><dd>${cleanCount(m.itemsTaken)}</dd></div>
        <div><dt>Availability</dt><dd>${m.available === false ? 'Not available right now' : 'Available'}</dd></div>
        <div><dt>Public City, State from</dt><dd>${m.publicAddressSource === 'physical' ? 'Physical address' : 'Mailing address'}</dd></div>
        <div><dt>Public phone</dt><dd>${m.publicPhone ? 'Shown on resume' : 'Hidden from resume'}</dd></div>
        <div><dt>Member ID</dt><dd>${e(m.memberId)}</dd></div>
        <div><dt>Pledged on</dt><dd>${e(formatDate(m.signedAt))}</dd></div>
        <div><dt>Status</dt><dd>${e(m.status || 'active')}</dd></div>
        <div><dt>Track</dt><dd>${e(state.track && hasOwn(TRACKS, state.track) ? TRACKS[state.track] : 'Not chosen')}</dd></div>
        <div><dt>Volunteer offers</dt><dd>${getMemberVolunteerInterests().length}</dd></div>
        <div><dt>Private note</dt><dd>${e(m.note || 'Not shared')}</dd></div>
      </dl>
      <a class="button button--outline button--small" href="dashboard.html">Edit in Dashboard</a>
    </section>`;
  }

  function renderSharedMemberViews() {
    renderMemberAccount();
    renderProfile();
  }

  function getExchangeType(request) {
    const listing = findListing(request && request.listingId);
    const pillar = (request && request.pillar) || (listing ? listing.pillar : '');
    return pillar === 'goods' ? 'product' : 'service';
  }

  function isConfirmedExchange(request) {
    return Boolean(request && (request.status === 'service_completed' || request.status === 'product_delivered'));
  }

  function renderExchanges() {
    const panel = document.getElementById('exchanges-panel');
    if (!panel || !isMember()) return;
    const e = escapeHtml;
    const requests = (Array.isArray(state.requests) ? state.requests : [])
      .filter((request) => request && request.memberId === state.pledge.memberId && request.type === 'mutual_aid_request')
      .slice(0, 30);
    const open = requests.filter((request) => !isConfirmedExchange(request));
    const confirmed = requests.filter(isConfirmedExchange);

    const itemMarkup = (request, done) => {
      const type = getExchangeType(request);
      const label = type === 'product' ? 'Product delivered' : 'Service completed';
      const confirmedAt = done && request.confirmedAt ? ` · confirmed ${e(formatDate(request.confirmedAt))}` : '';
      return `<li class="exchange-item">
        <div class="exchange-copy">
          <strong>${e(request.listingTitle || 'Commons request')}</strong>
          <span class="contribution-meta">${e(type === 'product' ? 'Product' : 'Service')} · requested ${e(formatDate(request.requestedAt))}${confirmedAt}</span>
          ${request.provider ? `<span class="contribution-meta">Offered by ${e(request.provider)}</span>` : ''}
        </div>
        ${done
          ? `<span class="badge badge--green">${e(label)}</span>`
          : `<button class="button button--outline button--small" type="button" data-confirm-exchange="${e(request.id)}">${e(label)}</button>`}
      </li>`;
    };

    panel.innerHTML = `<section class="account-card">
      <p class="eyebrow">Exchanges</p>
      <h3>Confirm what you received</h3>
      <p class="account-note">When a neighbor finishes a service or delivers a product, confirm it here. This is a local prototype record: nothing is verified by another person and nothing is transmitted.</p>
      <div class="account-block">
        <h4>Open requests</h4>
        ${open.length ? `<ul class="exchange-list">${open.map((request) => itemMarkup(request, false)).join('')}</ul>` : `<p class="account-note">No open requests to confirm yet. Make a request from Free Labor or Free Stuff first.</p>`}
      </div>
      <div class="account-block">
        <h4>Confirmed exchanges</h4>
        ${confirmed.length ? `<ul class="exchange-list">${confirmed.map((request) => itemMarkup(request, true)).join('')}</ul>` : `<p class="account-note">Nothing confirmed yet. The thank-you note appears after your first confirmation.</p>`}
      </div>
      ${confirmed.length ? `<div class="donate-nudge donate-nudge--dashboard">
        <span class="donate-nudge-icon" aria-hidden="true"><svg class="icon" aria-hidden="true" focusable="false"><use href="#icon-heart"></use></svg></span>
        <div>
          <p><strong>A small way to say thanks.</strong> If you have received goods or services you would have otherwise paid for, consider leaving a small donation. Every bit helps to fund this initiative.</p>
          <a class="button button--amber button--small" href="donate.html">Support the commons <svg class="icon" aria-hidden="true" focusable="false"><use href="#icon-arrow"></use></svg></a>
        </div>
      </div>` : ''}
    </section>`;
  }

  function renderCommons() {
    const panel = document.getElementById('commons-panel');
    if (!panel || !isMember()) return;
    const e = escapeHtml;
    const posts = (Array.isArray(state.listings) ? state.listings : []).filter((item) => item && item.memberId === state.pledge.memberId).slice(0, 6);
    const chats = (Array.isArray(state.chats) ? state.chats : []).slice(-12).reverse();
    panel.innerHTML = `<section class="account-card">
      <p class="eyebrow">The Commons</p>
      <h3>Everything you can take part in</h3>
      <div class="commons-links">
        <a class="commons-link" href="freelabor.html"><strong>Free Labor</strong><span>Offer or request skills and time.</span></a>
        <a class="commons-link" href="freestuff.html"><strong>Free Stuff</strong><span>Share new, homemade, used, and repairable goods.</span></a>
        <a class="commons-link" href="future.html#academy"><strong>Academy</strong><span>Learn from a neighbor. Build for the commons.</span></a>
        <a class="commons-link" href="donate.html"><strong>Donations</strong><span>Support the work. Track your giving here.</span></a>
      </div>
      <div class="account-block">
        <h4>Your postings</h4>
        ${posts.length ? `<ul class="contribution-list">${posts.map((post) => `<li class="contribution-item"><strong>${e(post.title)}</strong><span class="contribution-meta">${e(formatDate(post.createdAt))} · ${e(post.provider || '')}</span></li>`).join('')}</ul>` : `<p class="account-note">You have not posted an offering in this browser yet.</p>`}
        <p class="account-note"><a href="freelabor.html#post-trigger">Post free labor</a> · <a href="freestuff.html#post-trigger">Post free stuff</a></p>
      </div>
      <div class="account-block">
        <h4>Community chats</h4>
        <p class="account-note">Local-only channels for this prototype. Nothing is sent to other people.</p>
        <div class="chat-list">
          ${chats.length ? chats.map((chat) => `<div class="chat-message"><p class="contribution-meta"><strong>${e(chat.name)}</strong> · ${e(chat.channel)} · ${e(formatDate(chat.createdAt))}</p><p>${e(chat.body)}</p><button class="button button--ghost button--small button--report" type="button" data-report-context data-report-area="Community chat" data-report-detail="${e(chat.channel)} channel" data-report-name="${e(chat.name)}" data-report-source-id="${e(chat.id)}" aria-label="Report a concern about a message from ${e(chat.name)}">Report</button></div>`).join('') : `<p class="account-note">No chat messages yet.</p>`}
        </div>
        <form class="account-form" data-chat-form>
          <div class="form-row">
            <div class="field">
              <label for="chat-channel">Channel</label>
              <select id="chat-channel" name="channel">
                <option value="general">general</option>
                <option value="mutual-aid">mutual-aid</option>
                <option value="projects">projects</option>
              </select>
            </div>
            <div class="field">
              <label for="chat-body">Message</label>
              <input type="text" id="chat-body" name="body" maxlength="1200" required placeholder="Say something to the community…">
            </div>
          </div>
          <button type="submit" class="button button--primary button--small">Post to chat</button>
        </form>
      </div>
    </section>`;
  }

  function renderMessages() {
    const panel = document.getElementById('messages-panel');
    if (!panel || !isMember()) return;
    const e = escapeHtml;
    const messages = (Array.isArray(state.messages) ? state.messages : []).slice(-20).reverse();
    panel.innerHTML = `<section class="account-card">
      <p class="eyebrow">Messaging</p>
      <h3>Your messages</h3>
      <p class="account-note">Consent-based requests and replies would gather here in a live system. In this prototype, messages stay on this device.</p>
      ${messages.length ? `<ul class="contribution-list">${messages.map((message) => `<li class="contribution-item"><strong>${e(message.name)}${message.toName ? ` → ${e(message.toName)}` : ''}</strong><span>${e(message.body)}</span><span class="contribution-meta">${e(formatDate(message.createdAt))} · ${e(message.status || 'recorded')}</span>${message.toName ? `<button class="button button--ghost button--small button--report" type="button" data-report-context data-report-area="Dashboard messages" data-report-detail="Message to ${e(message.toName)}" data-report-name="${e(message.toName)}" data-report-source-id="${e(message.id)}" aria-label="Report a concern about the message to ${e(message.toName)}">Report</button>` : ''}</li>`).join('')}</ul>` : `<p class="account-note">No messages recorded yet.</p>`}
      <form class="account-form" data-message-form>
        <div class="field">
          <label for="message-to">To (chosen name)</label>
          <input type="text" id="message-to" name="toName" maxlength="80" required placeholder="Neighbor's chosen name">
        </div>
        <div class="field">
          <label for="message-body">Message</label>
          <textarea id="message-body" name="body" rows="3" maxlength="1200" required placeholder="Write a consent-based message…"></textarea>
        </div>
        <button type="submit" class="button button--primary button--small">Record message</button>
      </form>
    </section>`;
  }

  function renderSuggestions() {
    const panel = document.getElementById('suggestions-panel');
    if (!panel || !isMember()) return;
    const e = escapeHtml;
    const items = (Array.isArray(state.suggestions) ? state.suggestions : []).slice(0, 20);
    panel.innerHTML = `<section class="account-card">
      <p class="eyebrow">Suggestion box</p>
      <h3>Help shape the commons</h3>
      <p class="account-note">Ideas, concerns, and improvements are welcome. This prototype stores suggestions locally only—nothing is sent to a coordinator.</p>
      <form class="account-form" data-suggestion-form>
        <div class="field">
          <label for="suggestion-category">Category</label>
          <select id="suggestion-category" name="category">
            <option value="general">General idea</option>
            <option value="site">Site or accessibility</option>
            <option value="events">Events &amp; workdays</option>
            <option value="policy">Policy &amp; governance</option>
            <option value="safety">Safety &amp; accountability</option>
          </select>
        </div>
        <div class="field">
          <label for="suggestion-text">Your suggestion <span class="required-mark" aria-hidden="true">*</span></label>
          <textarea id="suggestion-text" name="text" rows="4" maxlength="1200" required placeholder="What would make Unbought better?"></textarea>
        </div>
        <button type="submit" class="button button--primary button--small">Submit suggestion</button>
      </form>
      <div class="account-block">
        <h4>Suggestions you recorded</h4>
        ${items.length ? `<ul class="contribution-list">${items.map((item) => `<li class="contribution-item"><strong>${e(item.category)}</strong><span>${e(item.text)}</span><span class="contribution-meta">${e(formatDate(item.createdAt))} · ${e(item.status || 'submitted')}</span></li>`).join('')}</ul>` : `<p class="account-note">No suggestions recorded in this browser yet.</p>`}
      </div>
    </section>`;
  }

  function renderDashboard() {
    renderDashboardGate();
    if (!isMember()) return;
    renderAccountInfo();
    renderSettings();
    renderCommons();
    renderExchanges();
    renderMessages();
    renderSuggestions();
  }

  function initDashboard() {
    const dash = document.getElementById('member-dashboard');
    if (!dash) return;
    initDashboardTabs();

    dash.addEventListener('click', (event) => {
      const button = event.target.closest('[data-confirm-exchange]');
      if (!button || !isMember()) return;
      event.preventDefault();

      const request = state.requests.find((item) => item && item.id === button.dataset.confirmExchange
        && item.memberId === state.pledge.memberId && item.type === 'mutual_aid_request');
      if (!request || isConfirmedExchange(request)) return;

      const type = getExchangeType(request);
      const label = type === 'product' ? 'Product delivered' : 'Service completed';
      showConfirm({
        title: `${type === 'product' ? 'Product' : 'Service'} confirmed?`,
        message: `Confirm that “${request.listingTitle || 'this exchange'}” was completed. This only records it in this browser; nothing is sent or independently verified.`,
        confirmLabel: label,
        onConfirm: () => {
          request.status = type === 'product' ? 'product_delivered' : 'service_completed';
          request.confirmedAt = new Date().toISOString();
          saveState();
          renderExchanges();
          announce(`${label} recorded locally. The thank-you note is now available.`);
          showToast('Confirmation saved locally. Thank-you note unlocked.', false);
        }
      });
    });

    dash.addEventListener('submit', (event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      if (!requireMembership()) return;
      if (!form.reportValidity()) return;
      const data = new FormData(form);
      const now = new Date().toISOString();

      if (form.matches('[data-account-form]')) {
        event.preventDefault();
        const name = cleanString(data.get('name'), 60);
        const location = cleanString(data.get('location'), 80);
        if (!name) return;
        state.pledge.name = name;
        state.pledge.location = location;
        state.pledge.housingStatus = normalizeHousingStatus(data.get('housingStatus'));
        state.pledge.paidSkills = cleanString(data.get('paidSkills'), 400);
        state.pledge.unpaidSkills = cleanString(data.get('unpaidSkills'), 400);
        state.pledge.donationCount = cleanCount(data.get('donationCount'));
        state.pledge.hoursCompleted = cleanHours(data.get('hoursCompleted'));
        state.pledge.hoursUsed = cleanHours(data.get('hoursUsed'));
        state.pledge.itemsGifted = cleanCount(data.get('itemsGifted'));
        state.pledge.itemsTaken = cleanCount(data.get('itemsTaken'));
        state.pledge.available = Boolean(data.get('available'));
        state.pledge.publicPhone = Boolean(data.get('publicPhone'));
        state.pledge.publicAddressSource = data.get('publicAddressSource') === 'physical' ? 'physical' : 'mailing';
        saveState();
        renderAccountInfo();
        renderSharedMemberViews();
        renderVolunteerStatus();
        renderAccountability();
        announce('Your account details were saved in this browser.');
        showToast('Account details saved locally.', false);
      } else if (form.matches('[data-settings-form]')) {
        event.preventDefault();
        state.settings = {
          compactDashboard: Boolean(data.get('compactDashboard')),
          showPrototypeNotices: Boolean(data.get('showPrototypeNotices'))
        };
        saveState();
        renderSettings();
        renderDashboardGate();
        renderAccountInfo();
        announce('Your settings were saved in this browser.');
        showToast('Settings saved locally.', false);
      } else if (form.matches('[data-chat-form]')) {
        event.preventDefault();
        const body = cleanString(data.get('body'), 1200);
        if (!body) return;
        state.chats = Array.isArray(state.chats) ? state.chats : [];
        state.chats.push({
          id: makeId('chat'),
          memberId: state.pledge.memberId,
          name: state.pledge.name,
          channel: cleanString(data.get('channel'), 40) || 'general',
          body,
          createdAt: now
        });
        state.chats = state.chats.slice(-300);
        saveState();
        renderCommons();
        form.reset();
        announce('Your message was posted to the local community chat.');
        showToast('Chat message saved locally.', false);
      } else if (form.matches('[data-message-form]')) {
        event.preventDefault();
        const body = cleanString(data.get('body'), 1200);
        const toName = cleanString(data.get('toName'), 80);
        if (!body || !toName) return;
        state.messages = Array.isArray(state.messages) ? state.messages : [];
        state.messages.push({
          id: makeId('message'),
          memberId: state.pledge.memberId,
          name: state.pledge.name,
          toName,
          body,
          createdAt: now,
          status: 'recorded'
        });
        state.messages = state.messages.slice(-300);
        saveState();
        renderMessages();
        form.reset();
        announce('Your message was recorded in this browser.');
        showToast('Message recorded locally.', false);
      } else if (form.matches('[data-suggestion-form]')) {
        event.preventDefault();
        const text = cleanString(data.get('text'), 1200);
        if (!text) return;
        state.suggestions = Array.isArray(state.suggestions) ? state.suggestions : [];
        state.suggestions.unshift({
          id: makeId('suggestion'),
          memberId: state.pledge.memberId,
          name: state.pledge.name,
          category: cleanString(data.get('category'), 40) || 'general',
          text,
          createdAt: now,
          status: 'submitted'
        });
        state.suggestions = state.suggestions.slice(0, 200);
        saveState();
        renderSuggestions();
        form.reset();
        announce('Your suggestion was submitted in this browser.');
        showToast('Suggestion saved locally.', false);
      }
    });

    renderDashboard();
  }

  /* ------------------------------------------------------------------------
     05a-2. Safety & accountability (member dashboard)
     ------------------------------------------------------------------------ */
  function reportStatusLabel(status) {
    const labels = {
      response_period: 'Response period · evidence gathering',
      board_review: 'Member review · 3-day vote',
      police_referral: 'Police referral recorded',
      restriction_active: 'Reflection · access restricted',
      not_guilty: 'Found not guilty',
      access_restored: 'Full access restored'
    };
    return labels[status] || status;
  }

  function votingRemaining(report) {
    if (report.demoVotingClosed) return 'Voting closed';
    const end = Date.parse(report.votingEndsAt);
    if (!end) return 'Voting closed';
    const ms = end - Date.now();
    if (ms <= 0) return 'Voting closed';
    const days = Math.floor(ms / 86400000);
    const hours = Math.floor((ms % 86400000) / 3600000);
    return `${days} day${days === 1 ? '' : 's'} ${hours} hour${hours === 1 ? '' : 's'} left`;
  }

  function pickMajorityValue(values) {
    if (!values.length) return REFLECTION_OPTIONS[0];
    const counts = {};
    values.forEach((value) => { counts[value] = (counts[value] || 0) + 1; });
    return Object.keys(counts).map(Number).sort((a, b) => a - b)
      .reduce((best, value) => (counts[value] > counts[best] ? value : best));
  }

  function resolveAccountabilityReport(report) {
    const votes = Array.isArray(report.votes) ? report.votes : [];
    const guilty = votes.filter((vote) => vote.verdict === 'guilty').length;
    const notGuilty = votes.filter((vote) => vote.verdict === 'not_guilty').length;
    const now = new Date();

    if (guilty > notGuilty) {
      const days = pickMajorityValue(votes.filter((vote) => vote.reflectionDays).map((vote) => vote.reflectionDays));
      report.reflectionDays = days;
      report.restrictionStart = now.toISOString();
      report.restrictionEnd = new Date(now.getTime() + (days * 86400000)).toISOString();
      report.status = 'restriction_active';
      announce(`Member found guilty. Reflection period set to ${days} days.`);
    } else {
      report.status = 'not_guilty';
      announce('Member found not guilty. No restriction applied.');
    }
    report.resolutionAt = now.toISOString();
    saveState();
    renderAccountability();
    showToast('Voting closed and case resolved locally.', false);
  }

  async function prepareReportEvidence(file) {
    const base = {
      id: makeId('evidence'),
      name: cleanString(file.name, 120) || 'Evidence',
      mime: cleanString(file.type, 80),
      size: Number(file.size) || 0,
      caption: '',
      addedAt: new Date().toISOString(),
      kind: 'file'
    };

    if (base.size > REPORT_EVIDENCE.maxFileBytes) {
      return { ...base, note: 'Too large to store locally; details only.' };
    }

    if (REPORT_EVIDENCE.imageTypes.includes(file.type)) {
      try {
        const sourceUrl = await readFileAsDataUrl(file);
        const image = await new Promise((resolve, reject) => {
          const element = new Image();
          element.onload = () => resolve(element);
          element.onerror = () => reject(new Error('image-failed'));
          element.src = sourceUrl;
        });
        const width = image.naturalWidth || image.width;
        const height = image.naturalHeight || image.height;
        if (!width || !height) return { ...base, note: 'Image could not be previewed; details only.' };
        const scale = Math.min(1, 1200 / Math.max(width, height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));
        const context = canvas.getContext('2d');
        if (!context) return { ...base, note: 'Image preview unavailable; details only.' };
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.72);
        if (dataUrl.length > REPORT_EVIDENCE.maxDataLength) {
          return { ...base, note: 'Image too large after resizing; details only.' };
        }
        return { ...base, kind: 'image', mime: 'image/jpeg', dataUrl };
      } catch (error) {
        return { ...base, note: 'Image could not be read; details only.' };
      }
    }

    const isText = file.type.startsWith('text/') || /\.(txt|csv|json|jsonl|md|log|xml)$/i.test(file.name);
    if (isText) {
      try {
        const slice = typeof file.slice === 'function'
          ? file.slice(0, REPORT_EVIDENCE.maxTextLength * 2)
          : file;
        const text = cleanString(await readFileAsText(slice), REPORT_EVIDENCE.maxTextLength);
        if (!text) return { ...base, note: 'Text file was empty; details only.' };
        return { ...base, kind: 'text', mime: file.type || 'text/plain', text };
      } catch (error) {
        return { ...base, note: 'Text file could not be read; details only.' };
      }
    }

    return { ...base, note: 'File selected locally; this prototype stores details only, not the file itself.' };
  }

  function renderEvidenceDraft(form) {
    const list = form && form.querySelector('[data-report-evidence-list]');
    if (!list) return;
    const entries = reportEvidenceDrafts.get(form) || [];
    const e = escapeHtml;

    if (!entries.length) {
      list.innerHTML = '';
      return;
    }
    list.innerHTML = `<ul class="evidence-list evidence-list--draft">${entries.map((item) => `
      <li class="evidence-item">
        ${item.kind === 'image' && item.dataUrl ? `<img class="evidence-thumb" src="${item.dataUrl}" alt="Preview of ${e(item.name)}">` : ''}
        <strong>${e(item.name)}</strong>
        <span class="contribution-meta">${e([item.kind === 'image' ? 'Image' : item.kind === 'text' ? 'Text / messages' : 'File details', formatBytes(item.size)].join(' · '))}${item.note ? ` · ${e(item.note)}` : ''}</span>
        <button type="button" class="button button--ghost button--small" data-action="remove-report-evidence" data-evidence-id="${e(item.id)}" aria-label="Remove ${e(item.name)}">Remove</button>
      </li>`).join('')}</ul>`;
  }

  async function addReportEvidence(form, files, session) {
    if (!form || !files || !files.length) return;
    const status = form.querySelector('[data-report-evidence-status]');
    const existing = reportEvidenceDrafts.get(form) || [];
    const room = REPORT_EVIDENCE.maxItems - existing.length;
    if (room <= 0) {
      if (status) status.textContent = `You can attach up to ${REPORT_EVIDENCE.maxItems} items.`;
      return;
    }

    const selected = Array.from(files).slice(0, room);
    if (status) status.textContent = `Reading ${selected.length} item${selected.length === 1 ? '' : 's'} locally…`;
    const prepared = await Promise.all(selected.map(prepareReportEvidence));
    if (session && form.dataset.reportSession !== session) return;
    const next = [...existing, ...prepared];
    reportEvidenceDrafts.set(form, next);
    renderEvidenceDraft(form);

    const skipped = files.length - selected.length;
    const parts = [`Added ${prepared.length} local evidence item${prepared.length === 1 ? '' : 's'}.`];
    if (skipped > 0) parts.push(`Only ${REPORT_EVIDENCE.maxItems} items can be attached.`);
    parts.push('Nothing was transmitted.');
    const message = parts.join(' ');
    if (status) status.textContent = message;
    announce(message);
  }

  async function fileAccountabilityReport(form) {
    const pending = reportEvidencePending.get(form);
    if (pending) await pending;

    const data = new FormData(form);
    const type = cleanString(data.get('type'), 40);
    const meta = hasOwn(REPORT_TYPES, type) ? REPORT_TYPES[type] : null;
    const description = cleanString(data.get('description'), 1200);
    if (!meta || !description || !data.get('goodFaith')) return;

    const now = new Date();
    const isCriminal = meta.route === 'criminal';
    const report = {
      id: makeId('report'),
      reporterMemberId: state.pledge.memberId,
      reporterName: state.pledge.name,
      respondentName: cleanString(data.get('respondentName'), 80),
      respondentMemberId: cleanString(data.get('respondentMemberId'), 100),
      contextArea: cleanString(data.get('contextArea'), 80) || 'Dashboard',
      contextDetail: cleanString(data.get('contextDetail'), 160),
      sourceId: cleanString(data.get('sourceId'), 100),
      evidence: cleanEvidenceItems(reportEvidenceDrafts.get(form) || []),
      type,
      typeLabel: meta.label,
      route: meta.route,
      description,
      occurredAt: cleanString(data.get('occurredAt'), 20),
      createdAt: now.toISOString(),
      status: isCriminal ? 'police_referral' : 'response_period',
      responseDeadlineAt: isCriminal ? '' : new Date(now.getTime() + (RESPONSE_DAYS * DAY_MS)).toISOString(),
      response: null,
      comments: [],
      votes: [],
      votingEndsAt: '',
      demoVotingClosed: false,
      reflectionDays: null,
      restrictionStart: '',
      restrictionEnd: '',
      treatmentSteps: { evaluation: false, plan: false, treatment: false },
      resolutionAt: '',
      policeReferral: isCriminal ? {
        createdAt: now.toISOString(),
        status: 'referral_recorded',
        note: 'Recorded as a police referral for investigation under local and federal law. This prototype does not contact authorities.'
      } : null
    };

    state.reports = Array.isArray(state.reports) ? state.reports : [];
    state.reports.unshift(report);
    state.reports = state.reports.slice(0, 200);
    saveState();
    reportEvidenceDrafts.delete(form);
    form.reset();
    renderEvidenceDraft(form);
    renderAccountability();
    if (reportDialog && reportDialog.open) closeDialog(reportDialog);
    announce(isCriminal
      ? 'Criminal matter recorded as a police referral. In a live system it would be referred to police for investigation. Nothing was transmitted in this prototype.'
      : `Report filed from ${report.contextArea}. Evidence stayed in this browser. The response period is open.`);
    showToast(isCriminal ? 'Police referral recorded (prototype only).' : 'Report filed. Response period is open.', false);
  }

  // One report form is shared by every contextual trigger. The person being
  // reported is supplied by the page (listing, message, or profile), never by
  // a free-text name field in the report itself.
  function buildReportDialog() {
    if (reportDialog) return reportDialog;

    const dialog = document.createElement('dialog');
    dialog.className = 'dialog dialog--report';
    dialog.id = 'report-dialog';
    dialog.setAttribute('aria-labelledby', 'report-dialog-title');
    dialog.setAttribute('aria-describedby', 'report-dialog-intro');
    dialog.innerHTML = `
      <div class="dialog-shell">
        <div class="dialog-top">
          <p class="eyebrow">Safety &amp; accountability</p>
          <button class="icon-button" type="button" data-dialog-close aria-label="Close the report form">
            <svg class="icon" aria-hidden="true" focusable="false"><use href="#icon-close"></use></svg>
          </button>
        </div>
        <div class="dialog-content">
          <h2 id="report-dialog-title">Report a concern</h2>
          <p id="report-dialog-intro">This report is tied to your member record. The person is carried over from the listing, message, or profile where you opened this form—you do not type their name.</p>
          <p class="dialog-note" data-report-context-summary role="status"></p>
          <form class="account-form report-form" data-report-form>
            <input type="hidden" name="respondentName" value="">
            <input type="hidden" name="respondentMemberId" value="">
            <input type="hidden" name="contextArea" value="Dashboard">
            <input type="hidden" name="contextDetail" value="">
            <input type="hidden" name="sourceId" value="">
            <div class="field">
              <label for="report-dialog-type">What are you reporting? <span class="required-mark" aria-hidden="true">*</span></label>
              <select id="report-dialog-type" name="type" required>
                <option value="">Choose a type…</option>
                <optgroup label="Reviewed by members (not a crime)">
                  ${Object.keys(REPORT_TYPES).filter((key) => REPORT_TYPES[key].route === 'board').map((key) => `<option value="${escapeHtml(key)}">${escapeHtml(REPORT_TYPES[key].label)}</option>`).join('')}
                </optgroup>
                <optgroup label="Criminal matter — police referral">
                  ${Object.keys(REPORT_TYPES).filter((key) => REPORT_TYPES[key].route === 'criminal').map((key) => `<option value="${escapeHtml(key)}">${escapeHtml(REPORT_TYPES[key].label)}</option>`).join('')}
                </optgroup>
              </select>
            </div>
            <div class="field">
              <label for="report-dialog-when">When did it happen? <span class="optional">(optional)</span></label>
              <input type="date" id="report-dialog-when" name="occurredAt">
            </div>
            <div class="field">
              <label for="report-dialog-description">What happened? <span class="required-mark" aria-hidden="true">*</span></label>
              <textarea id="report-dialog-description" name="description" rows="4" maxlength="1200" required placeholder="Describe what happened and where. The person or listing is already attached above."></textarea>
              <p class="field-hint">Up to 1200 characters. Stored with your member record in this browser only.</p>
            </div>
            <fieldset class="evidence-fieldset">
              <legend>Local evidence <span class="optional">(optional)</span></legend>
              <p class="field-hint">Select images, text or message files, or other files from this device. Images are resized and saved locally; text files are copied locally; other files are recorded by name and size only. Up to ${REPORT_EVIDENCE.maxItems} items, 8 MB each. Nothing is uploaded or transmitted.</p>
              <input type="file" id="report-evidence-input" name="evidenceFiles" multiple accept="${REPORT_EVIDENCE.accepted}">
              <p class="evidence-status" data-report-evidence-status role="status"></p>
              <div data-report-evidence-list></div>
            </fieldset>
            <label class="checkbox">
              <input type="checkbox" name="goodFaith" required>
              <span>I confirm this report is made in good faith and is true to the best of my knowledge.</span>
            </label>
            <div class="account-form-actions">
              <button type="submit" class="button button--primary button--small">File report</button>
              <button type="button" class="button button--ghost button--small" data-dialog-close>Cancel</button>
              <p class="form-hint">Named reporter · local evidence only · nothing transmitted</p>
            </div>
          </form>
        </div>
      </div>`;

    document.body.appendChild(dialog);
    reportDialog = dialog;

    const form = dialog.querySelector('[data-report-form]');
    const fileInput = dialog.querySelector('#report-evidence-input');
    const status = dialog.querySelector('[data-report-evidence-status]');

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!requireMembership()) return;
      if (!form.reportValidity()) return;
      fileAccountabilityReport(form);
    });

    form.addEventListener('click', (event) => {
      const button = event.target.closest('[data-action="remove-report-evidence"]');
      if (!button || !form.contains(button)) return;
      const id = cleanString(button.dataset.evidenceId, 60);
      const entries = reportEvidenceDrafts.get(form) || [];
      const removed = entries.find((item) => item.id === id);
      reportEvidenceDrafts.set(form, entries.filter((item) => item.id !== id));
      renderEvidenceDraft(form);
      if (status) status.textContent = removed ? `Removed ${removed.name}. Nothing was transmitted.` : '';
    });

    if (fileInput) {
      fileInput.addEventListener('change', () => {
        if (!fileInput.files || !fileInput.files.length) return;
        if (!form.dataset.reportSession) form.dataset.reportSession = makeId('report-session');
        const session = form.dataset.reportSession;
        const task = addReportEvidence(form, fileInput.files, session);
        reportEvidencePending.set(form, task);
        task.finally(() => {
          if (reportEvidencePending.get(form) === task) reportEvidencePending.delete(form);
          fileInput.value = '';
        });
      });
    }

    dialog.querySelectorAll('[data-dialog-close]').forEach((button) => {
      button.addEventListener('click', () => closeDialog(dialog));
    });

    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) closeDialog(dialog);
    });

    dialog.addEventListener('close', () => {
      form.dataset.reportSession = makeId('report-session');
      reportEvidenceDrafts.delete(form);
      reportEvidencePending.delete(form);
      form.reset();
      renderEvidenceDraft(form);
      if (status) status.textContent = '';
    });

    return dialog;
  }

  function openReportDialog(context, trigger) {
    if (!requireMembership()) return;
    const dialog = buildReportDialog();
    const form = dialog.querySelector('[data-report-form]');
    const summary = dialog.querySelector('[data-report-context-summary]');

    const area = cleanString(context && context.area, 80) || 'Dashboard';
    const detail = cleanString(context && context.detail, 160);
    const name = cleanString(context && context.name, 80);
    const memberId = cleanString(context && context.memberId, 100);
    const sourceId = cleanString(context && context.sourceId, 100);

    const setField = (fieldName, value) => {
      const input = form.querySelector(`[name="${fieldName}"]`);
      if (input) input.value = value;
    };

    form.dataset.reportSession = makeId('report-session');
    form.reset();
    reportEvidenceDrafts.delete(form);
    reportEvidencePending.delete(form);
    renderEvidenceDraft(form);
    const status = form.querySelector('[data-report-evidence-status]');
    if (status) status.textContent = '';

    setField('respondentName', name);
    setField('respondentMemberId', memberId);
    setField('contextArea', area);
    setField('contextDetail', detail);
    setField('sourceId', sourceId);

    const parts = [`Reporting from ${area}`];
    if (detail) parts.push(detail);
    if (name) parts.push(`about ${name}`);
    else parts.push('about a general concern');
    if (summary) summary.textContent = `${parts.join(' · ')}. The name was filled from this page, not typed by you.`;

    dialog._returnFocus = trigger instanceof HTMLElement ? trigger : null;
    openDialog(dialog);
  }

  function initReportDialog() {
    document.addEventListener('click', (event) => {
      const trigger = event.target.closest('[data-report-context]');
      if (!trigger) return;
      event.preventDefault();
      openReportDialog({
        area: trigger.dataset.reportArea,
        detail: trigger.dataset.reportDetail,
        name: trigger.dataset.reportName,
        memberId: trigger.dataset.reportMemberId,
        sourceId: trigger.dataset.reportSourceId
      }, trigger);
    });
  }

  function castAccountabilityVote(reportId, data) {
    if (!isMember()) return;
    const report = allReports().find((item) => item.id === reportId);
    if (!report || report.status !== 'board_review') return;
    if (report.votes.some((vote) => vote.memberId === state.pledge.memberId)) return;
    if (report.demoVotingClosed || (report.votingEndsAt && Date.now() > Date.parse(report.votingEndsAt))) return;

    const verdict = data.verdict === 'guilty' ? 'guilty' : data.verdict === 'not_guilty' ? 'not_guilty' : '';
    if (!verdict) return;
    const days = REFLECTION_OPTIONS.includes(Number(data.reflectionDays)) ? Number(data.reflectionDays) : REFLECTION_OPTIONS[0];

    report.votes = Array.isArray(report.votes) ? report.votes : [];
    report.votes.push({
      memberId: state.pledge.memberId,
      name: state.pledge.name,
      verdict,
      reflectionDays: verdict === 'guilty' ? days : null,
      reason: cleanString(data.reason, 600),
      votedAt: new Date().toISOString()
    });
    saveState();
    renderAccountability();
    announce(`Vote recorded: ${verdict === 'guilty' ? 'guilty' : 'not guilty'}, with your reason attached.`);
    showToast('Vote and reason recorded locally.', false);
  }

  function submitRespondentResponse(reportId, form) {
    if (!isMember()) return;
    syncReportPhases();
    const report = allReports().find((item) => item.id === reportId);
    if (!report || report.status !== 'response_period' || !isRespondent(report)) return;

    const data = new FormData(form);
    const plea = data.get('plea') === 'guilty' ? 'guilty' : data.get('plea') === 'not_guilty' ? 'not_guilty' : '';
    if (!plea) return;

    const media = [];
    for (let i = 1; i <= 3; i += 1) {
      const url = cleanString(data.get(`mediaUrl${i}`), 500);
      const caption = cleanString(data.get(`mediaCaption${i}`), 200);
      const type = cleanString(data.get(`mediaType${i}`), 20);
      if (url || caption) {
        media.push({ type: hasOwn(MEDIA_TYPES, type) ? type : 'document', url, caption });
      }
    }

    const now = new Date();
    report.response = {
      plea,
      explanation: cleanString(data.get('explanation'), 2000),
      media,
      submittedAt: now.toISOString()
    };
    report.status = 'board_review';
    report.votingEndsAt = new Date(now.getTime() + (VOTING_DAYS * DAY_MS)).toISOString();
    saveState();
    renderAccountability();
    announce('Your plea and evidence were recorded. Member voting is now open.');
    showToast('Response recorded. Voting is now open.', false);
  }

  function addAccountabilityComment(reportId, data) {
    if (!isMember()) return;
    const report = allReports().find((item) => item.id === reportId);
    if (!report || report.route !== 'board') return;
    const text = cleanString(data.get('text'), 800);
    if (!text) return;

    report.comments = Array.isArray(report.comments) ? report.comments : [];
    report.comments.unshift({
      id: makeId('comment'),
      memberId: state.pledge.memberId,
      name: state.pledge.name,
      text,
      createdAt: new Date().toISOString()
    });
    report.comments = report.comments.slice(0, 200);
    saveState();
    renderAccountability();
    announce('Your comment was added to the case file.');
    showToast('Comment added locally.', false);
  }

  function responseRemaining(report) {
    if (report.status !== 'response_period') return '';
    const end = Date.parse(report.responseDeadlineAt);
    if (Number.isNaN(end)) return 'Response period open';
    const ms = end - Date.now();
    if (ms <= 0) return 'Response period ended';
    const days = Math.floor(ms / DAY_MS);
    const hours = Math.floor((ms % DAY_MS) / 3600000);
    return `${days} day${days === 1 ? '' : 's'} ${hours} hour${hours === 1 ? '' : 's'} to gather evidence`;
  }

  function renderCaseFile(report, e) {
    const response = report.response;
    const media = response && Array.isArray(response.media) ? response.media : [];
    let html = `<div class="case-file">
      <p class="case-file-label">Case file · stored in this browser only</p>
      <dl class="case-file-meta">
        <div><dt>Report type</dt><dd>${e(report.typeLabel || report.type)}</dd></div>
        <div><dt>Filed by</dt><dd>${e(report.reporterName || 'Member')}${report.reporterMemberId ? ` · ${e(report.reporterMemberId)}` : ''}</dd></div>
        <div><dt>Reported member</dt><dd>${e(report.respondentName || 'not specified')}</dd></div>
        <div><dt>Reported from</dt><dd>${e(getReportContextSummary(report))}</dd></div>
        ${report.occurredAt ? `<div><dt>When it happened</dt><dd>${e(report.occurredAt)}</dd></div>` : ''}
        <div><dt>Filed on</dt><dd>${e(formatDate(report.createdAt))}</dd></div>
      </dl>
      <p class="case-file-section-title">What was reported</p>
      <p class="case-file-text">${e(report.description)}</p>
      <p class="case-file-section-title">Evidence from the person reporting</p>
      ${renderEvidenceList(report.evidence, e)}
      <p class="case-file-section-title">Response from the reported member</p>`;

    if (response && response.plea) {
      html += `<p class="case-response-plea"><strong>Plea:</strong> ${e(response.plea === 'guilty' ? 'Guilty' : 'Not guilty')}${response.submittedAt ? ` · submitted ${e(formatDate(response.submittedAt))}` : ''}</p>
        <p class="case-file-text">${e(response.explanation || 'No written explanation was provided.')}</p>`;
      if (media.length) {
        html += `<ul class="media-list">${media.map((item) => {
          const url = safeMediaUrl(item.url);
          return `<li><span class="media-kind">${e(MEDIA_TYPES[item.type] || 'Link')}</span> ${url ? `<a href="${e(url)}" target="_blank" rel="noopener noreferrer">${e(url)}</a>` : e(item.url || 'No link provided')}${item.caption ? ` — ${e(item.caption)}` : ''}</li>`;
        }).join('')}</ul>`;
      } else {
        html += `<p class="account-note">No multimedia evidence was attached.</p>`;
      }
    } else {
      html += `<p class="account-note">${report.status === 'response_period'
        ? 'No response submitted yet. The reported member may still plead and add evidence during the response period.'
        : 'No response was submitted in this local record.'}</p>`;
    }
    return `${html}</div>`;
  }

  function renderCaseComments(report, e) {
    const comments = Array.isArray(report.comments) ? report.comments : [];
    return `<div class="case-comments">
      <p class="case-file-section-title">Member comments (${comments.length})</p>
      ${comments.length ? `<ul class="comment-list">${comments.map((comment) => `
        <li class="comment-item">
          <p class="contribution-meta"><strong>${e(comment.name || 'Member')}</strong> · ${e(formatDate(comment.createdAt))}</p>
          <p>${e(comment.text)}</p>
        </li>`).join('')}</ul>` : `<p class="account-note">No comments yet. Members can voice their opinions below.</p>`}
      <form class="account-form comment-form" data-comment-form data-id="${e(report.id)}">
        <div class="field">
          <label for="comment-${e(domId(report.id))}">Add a comment <span class="required-mark" aria-hidden="true">*</span></label>
          <textarea id="comment-${e(domId(report.id))}" name="text" rows="2" maxlength="800" required placeholder="Share your view on this matter. Recorded locally with your name."></textarea>
          <p class="field-hint">Comments are named and stored in this browser only. Up to 800 characters.</p>
        </div>
        <button type="submit" class="button button--outline button--small">Post comment</button>
      </form>
    </div>`;
  }

  function renderResponseForm(report, e) {
    const id = e(domId(report.id));
    return `<form class="account-form response-form" data-response-form data-id="${e(report.id)}">
      <p class="account-note">You are the reported member. You may plead guilty or not guilty, explain why if you choose, and add links to evidence. In a live system this would accept direct video, audio, and image uploads; this prototype records links and text only. The person reporting can attach local evidence in the report form; nothing is transmitted.</p>
      <fieldset class="vote-fieldset"><legend>1. Your plea</legend>
        <label class="radio-choice"><input type="radio" name="plea" value="guilty" required> Guilty</label>
        <label class="radio-choice"><input type="radio" name="plea" value="not_guilty" required> Not guilty</label>
      </fieldset>
      <div class="field">
        <label for="response-explanation-${id}">2. Explain why <span class="optional">(optional)</span></label>
        <textarea id="response-explanation-${id}" name="explanation" rows="4" maxlength="2000" placeholder="Tell the board your side of the story."></textarea>
        <p class="field-hint">Up to 2000 characters. Stored with your plea in this browser only.</p>
      </div>
      <p class="account-note"><strong>3. Evidence</strong> — add links to video, audio, images, or documents. Leave blank if you have none.</p>
      ${[1, 2, 3].map((i) => `<div class="media-row">
        <select name="mediaType${i}" aria-label="Media type ${i}">
          ${Object.keys(MEDIA_TYPES).map((key) => `<option value="${e(key)}">${e(MEDIA_TYPES[key])}</option>`).join('')}
        </select>
        <input type="url" name="mediaUrl${i}" maxlength="500" placeholder="https://…" aria-label="Media link ${i}">
        <input type="text" name="mediaCaption${i}" maxlength="200" placeholder="Caption (optional)" aria-label="Media caption ${i}">
      </div>`).join('')}
      <div class="account-form-actions">
        <button type="submit" class="button button--primary button--small">Submit plea and evidence</button>
        <button type="button" class="button button--ghost button--small" data-action="skip-response" data-id="${e(report.id)}">Skip response (open voting)</button>
      </div>
    </form>`;
  }

  function renderAccountability() {
    const panel = document.getElementById('accountability-panel');
    if (!panel) return;
    syncReportPhases();

    if (!isMember()) {
      panel.innerHTML = `
        <section class="account-card accountability-card" aria-labelledby="accountability-title">
          <p class="eyebrow">Member dashboard</p>
          <h3 id="accountability-title">Safety &amp; accountability</h3>
          <p class="account-note">Reporting, member review, and access decisions live in the member dashboard. Sign the Unbought Pledge to become a member and access them.</p>
        </section>`;
      return;
    }

    const member = state.pledge;
    const reports = allReports();
    const mine = getMemberReports();
    const aboutMe = reportsAboutMember();
    const restriction = getActiveRestriction();
    const openReports = reports.filter((report) => report && ['response_period', 'board_review'].includes(report.status));
    const resolved = reports.filter((report) => report && ['restriction_active', 'not_guilty', 'access_restored'].includes(report.status)).slice(0, 8);
    const e = escapeHtml;

    let html = `<section class="account-card accountability-card" aria-labelledby="accountability-title">
      <p class="eyebrow">Member dashboard · Safety</p>
      <h3 id="accountability-title">Safety &amp; accountability</h3>
      <p class="account-note">Members file reports tied to their own member record; the person being reported is taken from the interaction, not typed by the reporter. Criminal matters are recorded as police referrals for investigation under local and federal law; they are never decided by a member vote. For non-criminal matters, the reported member gets ${RESPONSE_DAYS} days to gather evidence and plead guilty or not guilty with an explanation and multimedia links. Then all members get ${VOTING_DAYS} days to read the complete case file, comment, and vote on guilt, on the reflection period if guilty, and on a reason for their vote. Everything is visible on this dashboard. This prototype records it all locally—nothing is transmitted.</p>`;

    if (restriction) {
      const complete = isRestrictionComplete(restriction);
      const steps = restriction.treatmentSteps || {};
      const stepsDone = TREATMENT_STEPS.every((step) => Boolean(steps[step.key]));
      const periodDone = !restriction.restrictionEnd || Date.now() >= Date.parse(restriction.restrictionEnd);
      const remaining = Math.max(0, Math.ceil((Date.parse(restriction.restrictionEnd) - Date.now()) / 86400000));
      html += `
        <div class="restriction-banner ${complete ? 'is-complete' : ''}" role="status">
          <h4>${complete ? 'Eligible for full access' : 'Access restriction active'}</h4>
          <p>Case ${e(restriction.id)} · ${e(restriction.reflectionDays || 0)}-day reflection ${e(formatDate(restriction.restrictionStart))} – ${e(formatDate(restriction.restrictionEnd))}${complete ? '' : ` · ${remaining} day${remaining === 1 ? '' : 's'} remaining`}.</p>
          <p><strong>Allowed during reflection:</strong> health care, food, mental health care, legal services, and housing at lower priority if you are on a waiting list. Posting, requesting, track management, volunteering, and other full-access activities are paused.</p>
          <p><strong>Required to regain full access:</strong> a therapeutic evaluation (inside or outside Unbought), the recommended treatment plan, and completing or sustaining that treatment.</p>
          <ul class="treatment-list">
            ${TREATMENT_STEPS.map((step) => {
              const done = Boolean(steps[step.key]);
              return `<li><button type="button" class="treatment-step ${done ? 'is-done' : ''}" data-action="toggle-step" data-id="${e(restriction.id)}" data-step="${step.key}" aria-pressed="${done}">${done ? '✓' : '○'} ${e(step.label)}</button></li>`;
            }).join('')}
          </ul>
          ${complete ? `<button type="button" class="button button--primary button--small" data-action="restore-access" data-id="${e(restriction.id)}">Restore full access</button>` : stepsDone && !periodDone ? `<button type="button" class="button button--outline button--small" data-action="complete-period" data-id="${e(restriction.id)}">Mark reflection period complete (demo)</button>` : ''}
        </div>`;
    } else if (aboutMe.some((report) => report.status === 'access_restored')) {
      html += `<p class="account-note">Your full access has been restored after a completed reflection and treatment.</p>`;
    }

    html += `
      <div class="account-block">
        <h4>File a report</h4>
        <p class="account-note">Filed under ${e(member.name)} (member ID ${e(member.memberId)}). You do not type the person's name: open <strong>Report</strong> from the listing, message, or profile where the interaction happened. The context is carried into the form automatically.</p>
        <button class="button button--outline button--small" type="button" data-report-context data-report-area="Dashboard" data-report-detail="Accountability panel" data-report-source-id="dashboard">Report a concern</button>
        <p class="field-hint">You can attach local images, message files, or other file details in the form. Nothing is uploaded or transmitted.</p>
      </div>`;

    html += `<div class="account-block"><h4>Your reports</h4>`;
    if (!mine.length) {
      html += `<p class="account-note">You have not filed a report in this browser.</p>`;
    } else {
      html += `<ul class="case-list">`;
      mine.forEach((report) => {
        const isCriminal = report.route === 'criminal';
        html += `<li class="case-item">
          <div class="case-item-head"><strong>${e(report.typeLabel || report.type)}</strong><span class="case-status ${isCriminal ? 'case-status--criminal' : ''}">${e(reportStatusLabel(report.status))}</span></div>
          <p class="contribution-meta">${e(formatDate(report.createdAt))} · ${e(getReportContextSummary(report))}${report.id ? ' · ' + e(report.id) : ''}</p>
          <details><summary>What was reported</summary><p>${e(report.description)}</p></details>
          ${isCriminal ? `<p class="case-referral"><strong>Police referral recorded.</strong> ${e(report.policeReferral && report.policeReferral.note ? report.policeReferral.note : 'In a live system this would be sent to local police for investigation. This prototype does not contact authorities.')}</p>` : ''}
        </li>`;
      });
      html += `</ul>`;
    }
    html += `</div>`;

    html += `<div class="account-block"><h4>Member review board · open cases</h4>
      <p class="account-note">Each case opens with a ${RESPONSE_DAYS}-day response period so the reported member can gather evidence and plead. After that, voting is open for ${VOTING_DAYS} days—every vote counts. Vote guilty or not guilty; if guilty, choose a reflection period (30, 90, or 180 days), and always explain why. The full case file, votes, reasons, and comments are stored in this browser only for this local prototype.</p>`;
    if (!openReports.length) {
      html += `<p class="account-note">No cases are open for review right now.</p>`;
    } else {
      html += `<ul class="case-list">`;
      openReports.forEach((report) => {
        const votes = Array.isArray(report.votes) ? report.votes : [];
        const guilty = votes.filter((vote) => vote.verdict === 'guilty').length;
        const notGuilty = votes.filter((vote) => vote.verdict === 'not_guilty').length;
        const alreadyVoted = votes.some((vote) => vote.memberId === member.memberId);
        const isResponsePhase = report.status === 'response_period';
        const canVote = !isResponsePhase && !alreadyVoted && (!report.votingEndsAt || Date.now() <= Date.parse(report.votingEndsAt)) && !report.demoVotingClosed;
        html += `<li class="case-item case-item--review">
          <div class="case-item-head"><strong>${e(report.typeLabel || report.type)}</strong><span class="case-status ${isResponsePhase ? 'case-status--response' : ''}">${e(reportStatusLabel(report.status))}</span></div>
          <p class="contribution-meta">Filed ${e(formatDate(report.createdAt))} · ${e(getReportContextSummary(report))} · ${e(isResponsePhase ? responseRemaining(report) : votingRemaining(report))} · ${votes.length} vote${votes.length === 1 ? '' : 's'}</p>
          ${renderCaseFile(report, e)}
          ${isResponsePhase
            ? (isRespondent(report) ? renderResponseForm(report, e) : `<p class="account-note">The reported member has ${RESPONSE_DAYS} days to gather evidence and plead before voting opens. You can read the full case file and leave a comment now.</p>`)
            : `<p class="case-tally"><strong>Tally:</strong> guilty ${guilty} · not guilty ${notGuilty}</p>
              ${votes.length ? `<ul class="vote-reasons">${votes.map((vote) => `
                <li class="vote-reason">
                  <p class="contribution-meta"><strong>${e(vote.name || 'Member')}</strong> · voted ${e(vote.verdict === 'guilty' ? 'guilty' : 'not guilty')}${vote.verdict === 'guilty' && vote.reflectionDays ? ` · ${vote.reflectionDays} days` : ''} · ${e(formatDate(vote.votedAt))}</p>
                  <p>${e(vote.reason || 'No reason was recorded for this vote.')}</p>
                </li>`).join('')}</ul>` : ''}
              ${alreadyVoted ? `<p class="account-note">You already voted on this case. Your verdict and reason are listed above.</p>` : canVote ? `
                <form class="account-form vote-form" data-vote-form data-id="${e(report.id)}">
                  <fieldset class="vote-fieldset"><legend>1. Your verdict</legend>
                    <label class="radio-choice"><input type="radio" name="verdict" value="guilty" required> Guilty</label>
                    <label class="radio-choice"><input type="radio" name="verdict" value="not_guilty" required> Not guilty</label>
                  </fieldset>
                  <fieldset class="vote-fieldset"><legend>2. If guilty, reflection period</legend>
                    ${REFLECTION_OPTIONS.map((days) => `<label class="radio-choice"><input type="radio" name="reflectionDays" value="${days}"> ${days} days</label>`).join('')}
                  </fieldset>
                  <div class="field">
                    <label for="vote-reason-${e(domId(report.id))}">3. Why are you voting this way? <span class="required-mark" aria-hidden="true">*</span></label>
                    <textarea id="vote-reason-${e(domId(report.id))}" name="reason" rows="3" maxlength="600" required placeholder="Explain your reasoning. Stored locally with your vote."></textarea>
                    <p class="field-hint">Your reason is recorded with your vote in this browser only. Up to 600 characters.</p>
                  </div>
                  <button type="submit" class="button button--primary button--small">Submit vote and reason</button>
                </form>
              ` : `<p class="account-note">Voting has closed for this case.</p>`}
              <button type="button" class="button button--ghost button--small" data-action="close-voting" data-id="${e(report.id)}">Close voting now (demo)</button>`}
          ${renderCaseComments(report, e)}
        </li>`;
      });
      html += `</ul>`;
    }
    html += `</div>`;

    html += `<div class="account-block"><h4>Decisions &amp; active restrictions</h4>`;
    if (!resolved.length) {
      html += `<p class="account-note">No completed decisions yet.</p>`;
    } else {
      html += `<ul class="case-list">`;
      resolved.forEach((report) => {
        html += `<li class="case-item">
          <div class="case-item-head"><strong>${e(report.typeLabel || report.type)}</strong><span class="case-status">${e(reportStatusLabel(report.status))}</span></div>
          <p class="contribution-meta">${e(formatDate(report.resolutionAt || report.createdAt))} · ${e(getReportContextSummary(report))}${report.reflectionDays ? ' · ' + report.reflectionDays + ' days' : ''}</p>
          <p class="contribution-meta">${(report.votes || []).length} member vote${(report.votes || []).length === 1 ? '' : 's'}${report.status === 'not_guilty' ? ' · no restriction applied' : ''}</p>
          <details><summary>Full case file and response</summary>${renderCaseFile(report, e)}</details>
          ${(report.votes || []).length ? `<details><summary>How members voted and why</summary><ul class="vote-reasons">${report.votes.map((vote) => `
            <li class="vote-reason">
              <p class="contribution-meta"><strong>${e(vote.name || 'Member')}</strong> · voted ${e(vote.verdict === 'guilty' ? 'guilty' : 'not guilty')}${vote.verdict === 'guilty' && vote.reflectionDays ? ` · ${vote.reflectionDays} days` : ''}</p>
              <p>${e(vote.reason || 'No reason was recorded for this vote.')}</p>
            </li>`).join('')}</ul></details>` : ''}
          ${renderCaseComments(report, e)}
        </li>`;
      });
      html += `</ul>`;
    }
    html += `</div></section>`;

    panel.innerHTML = html;
  }

  function initAccountability() {
    const panel = document.getElementById('accountability-panel');
    if (!panel) return;

    panel.addEventListener('submit', (event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      if (form.matches('[data-report-form]')) {
        event.preventDefault();
        if (!requireMembership()) return;
        if (!form.reportValidity()) return;
        fileAccountabilityReport(form);
      } else if (form.matches('[data-vote-form]')) {
        event.preventDefault();
        if (!requireMembership()) return;
        if (!form.reportValidity()) return;
        const data = new FormData(form);
        castAccountabilityVote(form.dataset.id, {
          verdict: data.get('verdict'),
          reflectionDays: data.get('reflectionDays'),
          reason: data.get('reason')
        });
      } else if (form.matches('[data-response-form]')) {
        event.preventDefault();
        if (!requireMembership()) return;
        if (!form.reportValidity()) return;
        submitRespondentResponse(form.dataset.id, form);
      } else if (form.matches('[data-comment-form]')) {
        event.preventDefault();
        if (!requireMembership()) return;
        if (!form.reportValidity()) return;
        addAccountabilityComment(form.dataset.id, new FormData(form));
      }
    });

    panel.addEventListener('click', (event) => {
      const button = event.target.closest('[data-action]');
      if (!button || !panel.contains(button)) return;
      const report = allReports().find((item) => item.id === button.dataset.id);
      if (!report) return;

      if (button.dataset.action === 'toggle-step') {
        if (!isMember() || report.status !== 'restriction_active') return;
        const stepKey = button.dataset.step;
        const step = TREATMENT_STEPS.find((item) => item.key === stepKey);
        if (!step) return;
        report.treatmentSteps = report.treatmentSteps || {};
        report.treatmentSteps[stepKey] = !report.treatmentSteps[stepKey];
        saveState();
        renderAccountability();
        announce(`${report.treatmentSteps[stepKey] ? 'Completed' : 'Marked incomplete'}: ${step.label}.`);
      } else if (button.dataset.action === 'complete-period') {
        if (!isMember() || report.status !== 'restriction_active') return;
        if (!TREATMENT_STEPS.every((step) => Boolean((report.treatmentSteps || {})[step.key]))) return;
        report.restrictionEnd = new Date(Date.now() - 1000).toISOString();
        saveState();
        renderAccountability();
        announce('Reflection period marked complete for this demo.');
        showToast('Reflection period complete (demo).', false);
      } else if (button.dataset.action === 'restore-access') {
        if (!isMember() || report.status !== 'restriction_active' || !isRestrictionComplete(report)) return;
        report.status = 'access_restored';
        report.resolutionAt = new Date().toISOString();
        saveState();
        renderAccountability();
        announce('Full access restored after reflection and treatment.');
        showToast('Full access restored (prototype).', false);
      } else if (button.dataset.action === 'skip-response') {
        if (!isMember() || report.status !== 'response_period' || !isRespondent(report)) return;
        report.status = 'board_review';
        report.votingEndsAt = new Date(Date.now() + (VOTING_DAYS * DAY_MS)).toISOString();
        saveState();
        renderAccountability();
        announce('Response skipped. Member voting is now open.');
        showToast('Response skipped. Voting is open.', false);
      } else if (button.dataset.action === 'close-voting') {
        if (!isMember() || report.status !== 'board_review') return;
        report.demoVotingClosed = true;
        resolveAccountabilityReport(report);
      }
    });

    renderAccountability();
  }

  /* ------------------------------------------------------------------------
     05b. Pledge & digital signature
     ------------------------------------------------------------------------ */
  // Whole years as of today. Returns null for empty or impossible dates.
  function getAgeFromDob(dob) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null;
    const [year, month, day] = dob.split('-').map(Number);
    const birth = new Date(year, month - 1, day);
    if (birth.getFullYear() !== year || birth.getMonth() !== month - 1 || birth.getDate() !== day) return null;
    const now = new Date();
    let age = now.getFullYear() - year;
    const beforeBirthday = now.getMonth() < month - 1 ||
      (now.getMonth() === month - 1 && now.getDate() < day);
    if (beforeBirthday) age -= 1;
    return age;
  }

  function showPledgeError(message, focusId) {
    const box = document.getElementById('pledge-error');
    if (box) {
      box.textContent = message;
      box.hidden = false;
    }
    const field = focusId ? document.getElementById(focusId) : null;
    if (field) field.focus({ preventScroll: true });
  }

  function renderPledge() {
    const card = document.getElementById('signature-card');
    const banner = document.getElementById('signed-banner');
    const signedName = document.getElementById('signed-name');
    const signedDate = document.getElementById('signed-date');
    if (!card || !banner || !signedName || !signedDate) return;

    const pledge = state.pledge;
    const isSigned = isMember() && Boolean(pledge);
    card.classList.toggle('is-signed', isSigned);
    banner.hidden = !isSigned;

    if (isSigned) {
      const when = formatDate(pledge.signedAt);
      signedName.textContent = `Member: ${pledge.name}`;
      signedDate.textContent = [pledge.location || 'Location not shared', when ? `Member since ${when}` : 'Membership active'].filter(Boolean).join(' · ');
    } else {
      signedName.textContent = '';
      signedDate.textContent = '';
    }
  }

  function renderTrackGate() {
    const strip = document.getElementById('track-pledge-status');
    const message = document.getElementById('track-pledge-message');
    const link = strip ? $('.text-link', strip) : null;
    if (!strip || !message) return;

    const signedIn = isMember();
    strip.classList.toggle('is-signed', signedIn);

    if (signedIn) {
      const trackText = state.track
        ? ` Your current track is ${TRACKS[state.track]}. You can manage it here as your capacity changes.`
        : ' Your membership is active. Choose and manage the track that fits this season of your life.';
      message.textContent = `Signed in as ${state.pledge.name}.${trackText}`;
      if (link) {
        link.textContent = 'Dashboard';
        link.setAttribute('href', 'dashboard.html');
      }
    } else {
      message.textContent = 'You can browse labor, goods, and tracks. Sign the Unbought Pledge to become a member and participate—post offers, request connections, and manage your track and messages.';
      if (link) {
        link.textContent = 'Take the Pledge';
        link.setAttribute('href', 'pledge.html');
      }
    }
  }

  function openSigninDialog() {
    const dialog = document.getElementById('signin-dialog');
    const errorBox = document.getElementById('signin-error');
    if (errorBox) {
      errorBox.textContent = '';
      errorBox.hidden = true;
    }
    openDialog(dialog);
  }

  function initPledgePage() {
    const button = document.getElementById('signin-top');
    if (!button) return;
    button.addEventListener('click', () => {
      if (isMember()) {
        window.location.assign('dashboard.html');
        return;
      }
      openSigninDialog();
    });
  }

  function initPledgeForm() {
    const form = document.getElementById('pledge-form');
    const errorBox = document.getElementById('pledge-error');
    const withdraw = document.getElementById('withdraw-pledge');
    const card = document.getElementById('signature-card');
    if (!form && !withdraw) return;

    // Members must be 18+. The submit handler applies the real age check;
    // no max attribute is used so the visitor gets a clear explanation.
    const dobInput = document.getElementById('pledge-dob');

    const sameAddress = document.getElementById('pledge-same-address');
    const mailingInput = document.getElementById('pledge-mailing');
    const physicalInput = document.getElementById('pledge-physical');
    if (sameAddress && mailingInput && physicalInput) {
      const syncAddress = () => {
        if (sameAddress.checked) {
          physicalInput.value = mailingInput.value;
          physicalInput.readOnly = true;
        } else {
          physicalInput.readOnly = false;
          if (physicalInput.value === mailingInput.value) physicalInput.value = '';
        }
      };
      sameAddress.addEventListener('change', syncAddress);
      mailingInput.addEventListener('input', () => {
        if (sameAddress.checked) physicalInput.value = mailingInput.value;
      });
    }

    if (form) {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        if (errorBox) errorBox.hidden = true;

        // Check age before native validation so under-18 visitors get a clear
        // explanation instead of a generic date-range tooltip.
        const earlyAge = getAgeFromDob(dobInput ? dobInput.value : '');
        if (earlyAge === null) {
          showPledgeError('Please enter a valid date of birth.', 'pledge-dob');
          return;
        }
        if (earlyAge < 18) {
          showPledgeError('You must be 18 or older to sign the Unbought Pledge. You can keep browsing the commons and sign when you turn 18. Nothing was saved.', 'pledge-dob');
          announce('Members must be 18 or older. Your pledge was not signed.');
          return;
        }

        if (!form.reportValidity()) return;

        const data = new FormData(form);
        const fullName = cleanString(data.get('fullName'), 100);
        const name = cleanString(data.get('chosenName'), 60);
        const location = cleanString(data.get('location'), 80);
        const mailingAddress = cleanString(data.get('mailingAddress'), 240);
        const physicalAddress = sameAddress && sameAddress.checked
          ? mailingAddress
          : cleanString(data.get('physicalAddress'), 240);
        const phone = cleanString(data.get('phone'), 40);
        const dob = cleanString(data.get('dob'), 10);
        const housingStatus = normalizeHousingStatus(data.get('housingStatus'));
        const paidSkills = cleanString(data.get('paidSkills'), 400);
        const unpaidSkills = cleanString(data.get('unpaidSkills'), 400);
        const note = cleanString(data.get('note'), 240);
        const username = normalizeUsername(data.get('username'));
        const password = String(data.get('password') || '');
        const passwordConfirm = String(data.get('passwordConfirm') || '');
        const agreement = document.getElementById('pledge-agreement');
        const freeAtCost = document.getElementById('pledge-free-atcost');

        if (!agreement || !agreement.checked) {
          if (errorBox) {
            errorBox.textContent = 'Please confirm the five commitments before signing.';
            errorBox.hidden = false;
          }
          if (agreement) agreement.focus();
          return;
        }

        if (!freeAtCost || !freeAtCost.checked) {
          if (errorBox) {
            errorBox.textContent = 'Please confirm that labor and goods are free, and that only exact material costs may change hands.';
            errorBox.hidden = false;
          }
          if (freeAtCost) freeAtCost.focus();
          return;
        }

        if (!fullName || !name || !location || !mailingAddress || !physicalAddress || !phone) {
          showPledgeError('Please complete your full name, chosen name, mailing address, physical address, phone number, and general location.', 'pledge-full-name');
          return;
        }
        if (!hasOwn(HOUSING_STATUSES, housingStatus)) {
          showPledgeError('Please choose your housing status.', 'pledge-housing');
          return;
        }

        if (!/^[a-z0-9_.-]{3,40}$/.test(username)) {
          showPledgeError('Choose a username of 3–40 letters, numbers, periods, underscores, or hyphens.', 'pledge-username');
          return;
        }
        if (password.length < 8) {
          showPledgeError('Choose a password of at least 8 characters.', 'pledge-password');
          return;
        }
        if (password !== passwordConfirm) {
          showPledgeError('Your passwords do not match.', 'pledge-password-confirm');
          return;
        }
        const existingCredential = getCredential();
        if (existingCredential && existingCredential.username === username) {
          showPledgeError('That username is already used by the account on this device. Sign in instead.', 'pledge-username');
          return;
        }

        const age = getAgeFromDob(dob);
        if (age === null) {
          showPledgeError('Please enter a valid date of birth.', 'pledge-dob');
          return;
        }
        if (age < 18) {
          showPledgeError('You must be 18 or older to sign the Unbought Pledge. You can keep browsing the commons and sign when you turn 18. Nothing was saved.', 'pledge-dob');
          announce('Members must be 18 or older. Your pledge was not signed.');
          return;
        }

        state.pledge = {
          memberId: makeId('member'),
          name,
          fullName,
          location,
          mailingAddress,
          physicalAddress,
          housingStatus,
          phone,
          dob,
          paidSkills,
          unpaidSkills,
          donationCount: 0,
          hoursCompleted: 0,
          hoursUsed: 0,
          itemsGifted: 0,
          itemsTaken: 0,
          available: true,
          publicAddressSource: 'mailing',
          publicPhone: false,
          note,
          signedAt: new Date().toISOString(),
          status: 'active'
        };
        const salt = makeId('salt');
        state.auth = {
          credential: { username, salt, passwordHash: hashPassword(password, salt) },
          session: { signedIn: true, signedInAt: new Date().toISOString() }
        };
        saveState();
        renderPledge();
        renderTrackGate();
        renderTrackPanel(state.track);
        renderSharedMemberViews();
        renderVolunteerStatus();
        renderDashboard();
        renderAccountability();
        applyFilters();
        renderAuthUi();

        const banner = document.getElementById('signed-banner');
        if (banner) {
          banner.tabIndex = -1;
          banner.focus({ preventScroll: true });
        }
        announce(`Welcome, ${name}. Your username ${username} is set up and your membership is active in this browser. You can now choose a track, post offers, and request connections.`);
        showToast('Membership active. You can now participate in the community.', false);
      });
    }

    if (withdraw) {
      withdraw.addEventListener('click', () => {
        showConfirm({
          title: 'Withdraw your membership?',
          message: 'Your membership, username, and salted password hash will be removed from this browser. You can still browse offers, but you will need to sign the pledge again to post, request, or manage your track. Your saved track details may remain on this device.',
          confirmLabel: 'Withdraw membership',
          tone: 'danger',
          onConfirm: () => {
            state.pledge = null;
            state.auth = { credential: null, session: { signedIn: false, signedInAt: null } };
            saveState();
            renderPledge();
            renderTrackGate();
            renderTrackPanel(state.track);
            renderSharedMemberViews();
            renderVolunteerStatus();
            renderDashboard();
            renderAccountability();
            applyFilters();
            renderAuthUi();

            const agreement = document.getElementById('pledge-agreement');
            if (agreement) agreement.checked = false;

            const freeAtCost = document.getElementById('pledge-free-atcost');
            if (freeAtCost) freeAtCost.checked = false;

            const firstField = document.getElementById('pledge-agreement') || (form ? form.querySelector('input, textarea, button') : null);
            if (firstField) firstField.focus({ preventScroll: true });

            announce('Your membership was withdrawn. You can sign the pledge again at any time to participate.');
            showToast('Membership withdrawn.', false);
          }
        });
      });
    }

    // Ensure clicking the signed banner's copy area doesn't accidentally submit anything.
    if (card) {
      card.addEventListener('click', (event) => {
        if (event.target === event.currentTarget) return;
      });
    }

    renderPledge();
    renderTrackGate();
  }

  function initSigninForm() {
    const form = document.getElementById('signin-form');
    const errorBox = document.getElementById('signin-error');
    const signout = document.getElementById('signout-account');
    const triggers = document.querySelectorAll('[data-signin-trigger]');

    triggers.forEach((trigger) => {
      trigger.addEventListener('click', openSigninDialog);
    });

    if (form) {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        if (errorBox) errorBox.hidden = true;
        if (!form.reportValidity()) return;

        const data = new FormData(form);
        const username = normalizeUsername(data.get('username'));
        const password = String(data.get('password') || '');
        const credential = getCredential();

        if (!credential || username !== credential.username ||
            hashPassword(password, credential.salt) !== credential.passwordHash) {
          const message = 'That username or password does not match the account stored in this browser.';
          if (errorBox) {
            errorBox.textContent = message;
            errorBox.hidden = false;
          }
          announce('Sign in failed. Check your username and password.');
          return;
        }

        setSession(true);
        announce(`Welcome back, ${state.pledge ? state.pledge.name : username}.`);
        showToast('Signed in. Opening your dashboard.', false);
        closeDialog(document.getElementById('signin-dialog'));
        window.location.assign('dashboard.html');
      });
    }

    if (signout) {
      signout.addEventListener('click', () => {
        setSession(false);
        renderAuthUi();
        renderPledge();
        renderSharedMemberViews();
        renderVolunteerStatus();
        renderDashboard();
        announce('You are signed out. Your membership details remain on this device.');
        showToast('Signed out of this browser.', false);
      });
    }
  }

  /* ------------------------------------------------------------------------
     06. Membership tracks
     ------------------------------------------------------------------------ */
  function pillarOptions(includeGoods = false) {
    return Object.entries(PILLARS)
      .filter(([key]) => includeGoods || key !== 'goods')
      .map(([key, pillar]) => `<option value="${key}">${pillar.label}</option>`)
      .join('');
  }

  const TRACK_TEMPLATES = {
    contributor: () => `
      <div class="panel-head">
        <div class="panel-head-copy">
          <p class="eyebrow">Active Contributor</p>
          <h3>What will you share?</h3>
          <p>Offer the same quality of work you would be paid for—without charging for your time. Be specific about scope, and name the pillar your offer belongs to.</p>
        </div>
        <span class="badge badge--pillar">Paid-level, freely given</span>
      </div>
      <form class="panel-form">
        <div class="form-row">
          <div class="field">
            <label for="contributor-skill">Skill, trade, or care task <span class="required-mark" aria-hidden="true">*</span></label>
            <input type="text" id="contributor-skill" name="skill" maxlength="80" required placeholder="e.g., wheelchair ramp carpentry, tax prep, haircuts">
          </div>
          <div class="field">
            <label for="contributor-pillar">Primary pillar <span class="required-mark" aria-hidden="true">*</span></label>
            <select id="contributor-pillar" name="pillar" required>
              <option value="">Choose a pillar</option>
              ${pillarOptions(false)}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="field">
            <label for="contributor-hours">Weekly hours pledged <span class="required-mark" aria-hidden="true">*</span></label>
            <input type="number" id="contributor-hours" name="hours" min="1" max="40" step="1" value="1" required>
            <p class="field-hint">Phase 1 minimum: 1 hour per week. A real, sustainable number—you can change it later.</p>
          </div>
          <div class="field">
            <label for="contributor-availability">Availability <span class="optional">(optional)</span></label>
            <input type="text" id="contributor-availability" name="availability" maxlength="100" placeholder="e.g., Saturday mornings, online weeknights">
          </div>
        </div>
        <div class="field field--check">
          <label class="checkbox">
            <input type="checkbox" name="scope" value="agreed" required>
            <span>I will agree on scope, safety, and boundaries before starting—and I will refer out work outside my competence or legal scope.</span>
          </label>
        </div>
        <div class="panel-actions">
          <button class="button button--primary" type="submit">Save contributor track <svg class="icon" aria-hidden="true" focusable="false"><use href="#icon-arrow"></use></svg></button>
          <p class="panel-note">Saving records your track and details in this browser only.</p>
        </div>
      </form>
    `,

    apprentice: () => `
      <div class="panel-head">
        <div class="panel-head-copy">
          <p class="eyebrow">Apprentice <span class="optional">(Skill-Builder)</span></p>
          <h3>What do you want to learn?</h3>
          <p>Join a mentor and a local or online guild. You are not expected to arrive skilled—only willing to practice safely and give the craft back to the community.</p>
        </div>
        <span class="badge badge--pillar">Learn by doing</span>
      </div>
      <form class="panel-form">
        <div class="form-row">
          <div class="field">
            <label for="apprentice-craft">Craft or guild <span class="required-mark" aria-hidden="true">*</span></label>
            <select id="apprentice-craft" name="craft" required>
              <option value="">Choose a craft or guild</option>
              <option value="home-repair">Safe home repair &amp; building</option>
              <option value="web">Community web development</option>
              <option value="garden">Organic gardening</option>
              <option value="care">Care circle &amp; listening</option>
              <option value="other">Something else</option>
            </select>
          </div>
          <div class="field">
            <label for="apprentice-format">Learning format <span class="required-mark" aria-hidden="true">*</span></label>
            <select id="apprentice-format" name="format" required>
              <option value="either">Either online or local</option>
              <option value="online">Online</option>
              <option value="local">Hands-on local guild</option>
            </select>
          </div>
        </div>
        <div class="field">
          <label for="apprentice-goals">What do you hope to build or give back? <span class="optional">(optional)</span></label>
          <textarea id="apprentice-goals" name="goals" rows="3" maxlength="300" placeholder="A ramp for a neighbor, a website for a food co-op, a community garden bed…"></textarea>
        </div>
        <div class="field field--check">
          <label class="checkbox">
            <input type="checkbox" name="commitment" value="agreed" required>
            <span>I can commit to at least one guild session and will follow the mentor’s safety and scope guidance.</span>
          </label>
        </div>
        <div class="panel-actions">
          <button class="button button--primary" type="submit">Save apprentice track <svg class="icon" aria-hidden="true" focusable="false"><use href="#icon-arrow"></use></svg></button>
          <p class="panel-note">Unbought Academy mentorship is free. No tuition or debt is created.</p>
        </div>
      </form>
    `,

    care: () => `
      <div class="panel-head">
        <div class="panel-head-copy">
          <p class="eyebrow">Care Circle Member</p>
          <h3>You do not have to earn care.</h3>
          <p>This track is for people who cannot work right now due to age, disability, illness, or mental capacity—and for anyone whose capacity changes. No diagnosis is requested. No productivity test. A peer can meet you where you are.</p>
        </div>
        <span class="badge badge--amber">Ubuntu welcome</span>
      </div>

      <div class="care-preview" aria-label="Preview of a Welcome and Care Circle chat">
        <div class="chat-bubble"><strong>Peer host</strong>Welcome, neighbor. No paperwork or diagnosis here. What would feel supportive this week?</div>
        <div class="chat-bubble chat-bubble--reply"><strong>You</strong>I could use a short call, and maybe help picking up groceries.</div>
        <div class="chat-bubble"><strong>Peer host</strong>We can start with a 20-minute call—or just text. You set the pace, and you can change your mind.</div>
      </div>
      <p class="ubuntu-preview-note"><svg class="icon" aria-hidden="true" focusable="false"><use href="#icon-hands"></use></svg> A Welcome &amp; Care Circle chat is a peer conversation, not a clinical assessment.</p>

      <form class="panel-form">
        <fieldset>
          <legend>What would feel supportive? <span class="optional">(choose any)</span></legend>
          <div class="support-grid">
            <label class="support-choice"><input type="checkbox" name="support" value="listening"> A listening ear</label>
            <label class="support-choice"><input type="checkbox" name="support" value="grocery"> Grocery or pharmacy pickup</label>
            <label class="support-choice"><input type="checkbox" name="support" value="meals"> A meal train</label>
            <label class="support-choice"><input type="checkbox" name="support" value="rides"> Rides to appointments</label>
            <label class="support-choice"><input type="checkbox" name="support" value="tech"> Technology help</label>
            <label class="support-choice"><input type="checkbox" name="support" value="checkin"> A regular check-in</label>
          </div>
        </fieldset>

        <fieldset>
          <legend>Functional capacity &amp; contact preferences <span class="optional">(no diagnosis)</span></legend>
          <div class="support-grid">
            <label class="support-choice"><input type="checkbox" name="capacity" value="short-chat"> I can manage a short 20-minute chat</label>
            <label class="support-choice"><input type="checkbox" name="capacity" value="text-first"> I prefer text first</label>
            <label class="support-choice"><input type="checkbox" name="capacity" value="lived-experience"> I would like a peer with lived experience</label>
            <label class="support-choice"><input type="checkbox" name="capacity" value="quiet-space"> A quiet, low-sensory space would help</label>
            <label class="support-choice"><input type="checkbox" name="capacity" value="coordinate-visit"> Please coordinate before visiting</label>
            <label class="support-choice"><input type="checkbox" name="capacity" value="interpreter"> I need an interpreter or captions</label>
          </div>
        </fieldset>

        <div class="form-row">
          <div class="field">
            <label for="care-pace">Preferred pace</label>
            <select id="care-pace" name="pace">
              <option value="one-checkin">One short check-in</option>
              <option value="weekly-month">Weekly for a month</option>
              <option value="ongoing">Ongoing, low-key support</option>
              <option value="decide-together">Let’s decide together</option>
            </select>
          </div>
          <div class="field">
            <label for="care-note">Anything you want a peer to know? <span class="optional">(optional)</span></label>
            <input type="text" id="care-note" name="note" maxlength="160" placeholder="A preference, a boundary, or a good time to reach you.">
          </div>
        </div>

        <div class="field field--check">
          <label class="checkbox">
            <input type="checkbox" name="requestChat" value="requested" required>
            <span>Please contact me to arrange a peer Welcome &amp; Care Circle chat. I can withdraw this request at any time.</span>
          </label>
        </div>

        <div class="panel-actions">
          <button class="button button--primary" type="submit">Request Welcome &amp; Care Circle chat <svg class="icon" aria-hidden="true" focusable="false"><use href="#icon-chat"></use></svg></button>
          <p class="panel-note">This prototype stores only what you enter here. No medical or diagnostic information is requested.</p>
        </div>
      </form>
    `,

    observer: () => `
      <div class="panel-head">
        <div class="panel-head-copy">
          <p class="eyebrow">Observer</p>
          <h3>Stay curious. Stay unpressured.</h3>
          <p>Reading and listening are forms of participation. You can explore the philosophy and governance before requesting or offering anything.</p>
        </div>
        <span class="badge badge--soft">No obligation</span>
      </div>
      <form class="panel-form">
        <fieldset>
          <legend>What would you like to explore? <span class="optional">(choose any)</span></legend>
          <div class="support-grid">
            <label class="support-choice"><input type="checkbox" name="interests" value="philosophy"> Ubuntu &amp; Unbought philosophy</label>
            <label class="support-choice"><input type="checkbox" name="interests" value="land"> Land trust updates</label>
            <label class="support-choice"><input type="checkbox" name="interests" value="academy"> Academy open talks</label>
            <label class="support-choice"><input type="checkbox" name="interests" value="directory"> Service &amp; goods directory</label>
            <label class="support-choice"><input type="checkbox" name="interests" value="governance"> Care Circle governance</label>
            <label class="support-choice"><input type="checkbox" name="interests" value="events"> Gatherings &amp; repair days</label>
          </div>
        </fieldset>
        <div class="form-row">
          <div class="field">
            <label for="observer-cadence">How often would you like local reminders?</label>
            <select id="observer-cadence" name="cadence">
              <option value="rarely">Only major updates</option>
              <option value="monthly">Monthly summary</option>
              <option value="events">When something is happening nearby</option>
              <option value="quiet">No reminders for now</option>
            </select>
            <p class="field-hint">This preference is saved only in this browser; nothing is sent.</p>
          </div>
          <div class="field">
            <label for="observer-note">What brought you here? <span class="optional">(optional)</span></label>
            <input type="text" id="observer-note" name="note" maxlength="140" placeholder="A question, a hope, or a reason to listen.">
          </div>
        </div>
        <div class="field field--check">
          <label class="checkbox">
            <input type="checkbox" name="consent" value="agreed" required>
            <span>I understand that observing is welcome and creates no obligation to offer or request services.</span>
          </label>
        </div>
        <div class="panel-actions">
          <button class="button button--primary" type="submit">Save observer track <svg class="icon" aria-hidden="true" focusable="false"><use href="#icon-eye"></use></svg></button>
          <p class="panel-note">You can switch tracks whenever your capacity or interest changes.</p>
        </div>
      </form>
    `
  };

  function hydrateForm(form, details) {
    if (!form || !details || typeof details !== 'object') return;

    Object.entries(details).forEach(([name, value]) => {
      if (name === 'savedAt') return;
      // Field names come from stored data, so only accept simple control names
      // before building a selector. This prevents malformed or injected selectors.
      if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name)) return;
      const controls = form.querySelectorAll(`[name="${name}"]`);
      controls.forEach((control) => {
        if (control.type === 'checkbox') {
          control.checked = Array.isArray(value) ? value.includes(control.value) : Boolean(value) && value !== 'false';
        } else if (control.type === 'radio') {
          control.checked = String(value) === control.value;
        } else {
          control.value = value;
        }
      });
    });
  }

  function collectFormDetails(form) {
    const data = new FormData(form);
    const details = {};

    MULTI_VALUE_FIELDS.forEach((fieldName) => {
      if (form.elements.namedItem(fieldName)) {
        details[fieldName] = data.getAll(fieldName).map((value) => cleanString(value, 120));
      }
    });

    for (const key of new Set(data.keys())) {
      if (MULTI_VALUE_FIELDS.has(key)) continue;
      const values = data.getAll(key).map((value) => cleanString(value, 400));
      details[key] = values.length > 1 ? values : values[0];
    }

    details.savedAt = new Date().toISOString();
    return details;
  }

  function renderTrackPanel(track, options = {}) {
    const panel = document.getElementById('track-panel');
    if (!panel) return;

    panel.replaceChildren();

    if (!track || !hasOwn(TRACK_TEMPLATES, track)) {
      const empty = createEl('div', 'track-empty');
      const iconWrap = createEl('span', 'track-empty-icon');
      iconWrap.setAttribute('aria-hidden', 'true');
      iconWrap.appendChild(createIcon('people'));
      empty.appendChild(iconWrap);
      empty.appendChild(createEl('h3', '', 'Choose a track above to see what comes next.'));
      empty.appendChild(createEl('p', '', 'Nothing is locked in. You can change tracks whenever your capacity changes.'));
      panel.appendChild(empty);
      return;
    }

    // Templates are static, trusted markup. All saved values are hydrated with
    // DOM properties below, never concatenated into HTML.
    panel.innerHTML = TRACK_TEMPLATES[track]();

    const form = $('.panel-form', panel);
    const details = state.trackDetails[track];
    hydrateForm(form, details);

    if (details && details.savedAt) {
      const when = formatDate(details.savedAt);
      const savedNote = createEl(
        'p',
        'saved-note',
        when ? ` Saved ${when}. You can update these details and save again.` : ' Saved. You can update these details and save again.'
      );
      savedNote.prepend(createIcon('check'));
      const head = $('.panel-head', panel);
      if (head) head.after(savedNote);
    }

    if (form) {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        if (!requireMembership('Sign the Unbought Pledge to become a member before saving your track.')) return;
        if (!requireFullAccess('Full access is paused during your reflection period. Track management is unavailable until you complete the reflection and treatment requirements.')) return;
        if (!form.reportValidity()) return;

        const savedDetails = collectFormDetails(form);
        savedDetails.memberId = state.pledge.memberId;
        state.trackDetails[track] = savedDetails;
        saveState();

        let message = 'Your track details were saved.';
        if (track === 'contributor') {
          const hours = savedDetails.hours || '0';
          message = `Contributor track saved. You pledged ${hours} hour${Number(hours) === 1 ? '' : 's'} per week in ${hasOwn(PILLARS, savedDetails.pillar) ? PILLARS[savedDetails.pillar].label : 'the community'}.`;
        } else if (track === 'apprentice') {
          message = 'Apprentice track saved. Your guild preference is stored in this browser.';
        } else if (track === 'care') {
          message = 'Welcome & Care Circle request saved locally. No diagnosis or medical information was requested.';
        } else if (track === 'observer') {
          message = 'Observer track saved. Explore at your own pace—no obligation.';
        }

        renderTrackPanel(track);
        renderSharedMemberViews();
        const newSubmit = $('#track-panel .panel-form button[type="submit"]');
        if (newSubmit) newSubmit.focus({ preventScroll: true });

        announce(message);
        showToast(message, false);
      });
    }

    if (options.focusPanel) {
      const heading = $('.panel-head-copy h3', panel);
      if (heading) {
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
      }
    }
  }

  function initTracks() {
    const radios = $$('input[name="membership-track"]');

    radios.forEach((radio) => {
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        if (!isMember()) {
          radio.checked = false;
          if (state.track) {
            const savedRadio = radios.find((item) => item.value === state.track);
            if (savedRadio) savedRadio.checked = true;
          }
          requireMembership('Sign the Unbought Pledge to become a member before choosing or managing a track.');
          return;
        }
        if (hasActiveRestriction()) {
          radio.checked = false;
          if (state.track) {
            const savedRadio = radios.find((item) => item.value === state.track);
            if (savedRadio) savedRadio.checked = true;
          }
          requireFullAccess('Full access is paused during your reflection period. Track changes are unavailable until you complete the reflection and treatment requirements.');
          return;
        }
        state.track = radio.value;
        saveState();
        renderTrackPanel(radio.value);
        renderTrackGate();
        renderSharedMemberViews();
        announce(`${TRACKS[radio.value]} selected. Complete the details below and save your choice.`);
      });
    });

    if (state.track) {
      const savedRadio = radios.find((radio) => radio.value === state.track);
      if (savedRadio) savedRadio.checked = true;
      renderTrackPanel(state.track);
    } else {
      renderTrackPanel(null);
    }

    // Academy “Ask to apprentice” buttons preselect the apprentice track.
    const apprenticeshipCraftMap = {
      'Safe home repair': 'home-repair',
      'Community web development': 'web',
      'Organic gardening': 'garden'
    };

    $$('[data-apprentice]').forEach((button) => {
      button.addEventListener('click', () => {
        const apprenticeRadio = radios.find((radio) => radio.value === 'apprentice');
        if (!apprenticeRadio) return;

        apprenticeRadio.checked = true;
        state.track = 'apprentice';
        saveState();
        renderTrackPanel('apprentice', { focusPanel: true });
        renderTrackGate();

        const craft = apprenticeshipCraftMap[button.dataset.apprentice];
        const craftSelect = document.getElementById('apprentice-craft');
        if (craft && craftSelect) craftSelect.value = craft;

        announce('Apprentice track selected. Review the craft and save your details below.');
        showToast('Apprentice track selected. Finish your details in Join & Tracks.', false);

        const panel = document.getElementById('track-panel');
        if (panel) {
          panel.scrollIntoView({ behavior: scrollBehavior(), block: 'center' });
        }
      });
    });
  }

  /* ------------------------------------------------------------------------
     07. Tabs, navigation & page polish
     ------------------------------------------------------------------------ */
  function initTabs() {
    const tablist = document.querySelector('#care-tabs [role="tablist"]');
    if (!tablist) return;

    const tabs = $$('[role="tab"]', tablist);

    function activate(tab, shouldFocus) {
      tabs.forEach((item) => {
        const selected = item === tab;
        item.setAttribute('aria-selected', String(selected));
        item.tabIndex = selected ? 0 : -1;
        item.classList.toggle('is-active', selected);

        const panel = document.getElementById(item.getAttribute('aria-controls'));
        if (panel) panel.hidden = !selected;
      });
      if (shouldFocus) tab.focus();
    }

    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => activate(tab, false));
      tab.addEventListener('keydown', (event) => {
        let targetIndex = null;

        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
          targetIndex = (index + 1) % tabs.length;
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
          targetIndex = (index - 1 + tabs.length) % tabs.length;
        } else if (event.key === 'Home') {
          targetIndex = 0;
        } else if (event.key === 'End') {
          targetIndex = tabs.length - 1;
        }

        if (targetIndex !== null) {
          event.preventDefault();
          activate(tabs[targetIndex], true);
        }
      });
    });
  }

  function initHeader() {
    const header = document.getElementById('site-header');
    const toggle = document.getElementById('nav-toggle');
    const nav = document.getElementById('primary-nav');
    if (!header || !toggle || !nav) return;

    const toggleLabel = $('.sr-only', toggle);
    const navLinks = $$('a[href^="#"]', nav).filter((link) => !link.classList.contains('nav-cta'));
    const navSections = navLinks
      .map((link) => ({ link, section: document.getElementById(link.hash.slice(1)) }))
      .filter((item) => item.section);

    function setNavOpen(open) {
      header.classList.toggle('nav-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      if (toggleLabel) toggleLabel.textContent = open ? 'Close navigation menu' : 'Open navigation menu';
    }

    toggle.addEventListener('click', () => {
      setNavOpen(!header.classList.contains('nav-open'));
    });

    nav.addEventListener('click', (event) => {
      const link = event.target.closest('a');
      if (!link) return;

      const wasOpen = header.classList.contains('nav-open');
      if (!wasOpen) return;

      setNavOpen(false);

      // On small screens the menu covers the page. Move focus to the section
      // heading so keyboard and screen-reader users land at the destination.
      if (link.hash && link.hash.length > 1) {
        window.requestAnimationFrame(() => {
          const target = document.getElementById(link.hash.slice(1));
          if (!target) return;
          const heading = target.matches('h1, h2, h3, h4')
            ? target
            : target.querySelector('h1, h2, h3, h4');
          if (!heading) return;
          if (!heading.hasAttribute('tabindex')) {
            heading.setAttribute('tabindex', '-1');
            heading.addEventListener('blur', () => heading.removeAttribute('tabindex'), { once: true });
          }
          heading.focus({ preventScroll: true });
        });
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && header.classList.contains('nav-open')) {
        setNavOpen(false);
        toggle.focus();
      }
    });

    document.addEventListener('click', (event) => {
      if (header.classList.contains('nav-open') && !header.contains(event.target)) {
        setNavOpen(false);
      }
    });

    function updateActiveNav() {
      const threshold = window.scrollY + header.offsetHeight + 120;
      let activeLink = null;

      navSections.forEach(({ link, section }) => {
        if (section.offsetTop <= threshold) activeLink = link;
      });

      navLinks.forEach((link) => {
        if (link === activeLink) {
          link.setAttribute('aria-current', 'location');
        } else {
          link.removeAttribute('aria-current');
        }
      });
    }

    let scrollTicking = false;
    function onScroll() {
      if (scrollTicking) return;
      scrollTicking = true;
      window.requestAnimationFrame(() => {
        header.classList.toggle('is-scrolled', window.scrollY > 8);
        updateActiveNav();
        scrollTicking = false;
      });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    header.classList.toggle('is-scrolled', window.scrollY > 8);
    updateActiveNav();
  }

  function initVideo() {
    const video = document.querySelector('.pledge-video');
    if (!video) return;

    let errorShown = false;
    function showVideoFallback() {
      if (errorShown) return;
      errorShown = true;
      const note = $('.video-caption p');
      if (note) {
        note.textContent = 'The placeholder clip could not load here. The full written pledge is available beside the player, and the captions file is in the project assets.';
      }
    }

    const source = video.querySelector('source');
    if (source) source.addEventListener('error', showVideoFallback);
    video.addEventListener('error', showVideoFallback);

    // A source error can fire before this deferred script attaches its listener.
    if (video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
      showVideoFallback();
    }
  }

  function initFooterYear() {
    const year = document.getElementById('copyright-year');
    if (year) year.textContent = String(new Date().getFullYear());
  }

  /* ------------------------------------------------------------------------
     08. Dialogs, land inquiries & reset
     ------------------------------------------------------------------------ */
  function openDialog(dialog) {
    if (!dialog) return;

    dialog._returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
    } else {
      // Minimal fallback for very old browsers without <dialog> support.
      dialog.setAttribute('open', '');
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');
    }

    document.body.classList.add('dialog-open');

    window.requestAnimationFrame(() => {
      const closeButton = dialog.querySelector('.icon-button');
      if (closeButton) {
        closeButton.focus();
      } else {
        const firstField = dialog.querySelector('input, select, textarea, button, a[href]');
        if (firstField) firstField.focus();
      }
    });
  }

  function closeDialog(dialog, options = {}) {
    if (!dialog) return;
    const { restoreFocus = true } = options;
    const returnFocus = dialog._returnFocus;

    if (typeof dialog.close === 'function' && dialog.open) {
      dialog.close();
    } else {
      dialog.removeAttribute('open');
      dialog.removeAttribute('aria-modal');
    }

    dialog._returnFocus = null;

    if (!document.querySelector('dialog[open]')) {
      document.body.classList.remove('dialog-open');
    }

    if (restoreFocus && returnFocus && returnFocus.isConnected) {
      window.requestAnimationFrame(() => {
        if (returnFocus.isConnected) returnFocus.focus({ preventScroll: true });
      });
    }
  }

  function initDialogBasics() {
    const dialogs = $$('dialog');

    dialogs.forEach((dialog) => {
      dialog.addEventListener('close', () => {
        if (!document.querySelector('dialog[open]')) {
          document.body.classList.remove('dialog-open');
        }
      });

      // Clicking the backdrop closes the dialog; clicking inside does not.
      dialog.addEventListener('click', (event) => {
        if (event.target === dialog) closeDialog(dialog);
      });

      // Native modal dialogs close on Escape, but wiring it explicitly keeps
      // the fallback path and assistive setups consistent.
      dialog.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape' || event.isComposing) return;
        event.preventDefault();
        closeDialog(dialog);
      });
    });

    $$('[data-dialog-close]').forEach((button) => {
      button.addEventListener('click', () => {
        const dialog = button.closest('dialog');
        if (dialog) closeDialog(dialog);
      });
    });
  }

  function openConsentDialog(listingId, trigger) {
    const dialog = document.getElementById('consent-dialog');
    const form = document.getElementById('consent-form');
    const summaryTitle = document.getElementById('request-summary-title');
    const summaryMeta = document.getElementById('request-summary-meta');
    const summaryLabel = document.querySelector('#request-summary .request-summary-label');
    const title = document.getElementById('consent-title');
    const description = document.getElementById('consent-description');
    const listing = findListing(listingId);

    if (!dialog || !form || !listing) return;

    currentRequestMode = isMember() ? 'mutual' : 'purchase';
    currentListingId = listing.id;
    form.reset();

    // Members use mutual-aid mode so the purchase fields are hidden for them,
    // but fill the name field too: no non-intake form asks a member to retype it.
    fillOwnNameField(document.getElementById('purchase-name'));

    // Toggle purchase/member fields if present
    const mutualFields = document.getElementById('consent-mutual-fields');
    const purchaseFields = document.getElementById('consent-purchase-fields');
    if (mutualFields) mutualFields.hidden = currentRequestMode !== 'mutual';
    if (purchaseFields) purchaseFields.hidden = currentRequestMode !== 'purchase';
    $$('input, textarea, select', mutualFields || document).forEach((el) => {
      if (!mutualFields || !mutualFields.contains(el)) return;
      if (el.type === 'checkbox') el.required = currentRequestMode === 'mutual';
    });
    $$('input, textarea, select', purchaseFields || document).forEach((el) => {
      if (!purchaseFields || !purchaseFields.contains(el)) return;
      const requiredPurchase = ['purchaseName', 'purchaseEmail', 'purchaseAmount', 'purchaseAgreement'];
      if (requiredPurchase.includes(el.name)) el.required = currentRequestMode === 'purchase';
    });

    if (summaryTitle) summaryTitle.textContent = listing.title;
    if (summaryMeta) {
      summaryMeta.textContent = `${PILLARS[listing.pillar].label} · ${EXCHANGES[listing.exchange].label} · Offered by ${listing.provider}`;
    }
    if (summaryLabel) summaryLabel.textContent = currentRequestMode === 'purchase' ? 'Your purchase request' : 'Your request';

    if (title) title.textContent = currentRequestMode === 'purchase' ? 'Buy as a non-member' : 'Request with mutual consent';
    if (description) {
      description.textContent = currentRequestMode === 'purchase'
        ? 'In this prototype, people without a pledge can record a purchase intent for goods or services. The amount is recorded locally for the severance fund; no real payment is processed and nothing is transmitted. Members access the commons through mutual aid instead.'
        : 'A request starts a conversation. It does not create a sale, a deposit, or a guarantee that an item is still available.';
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.textContent = currentRequestMode === 'purchase' ? 'Record purchase intent' : 'Confirm request';

    dialog._trigger = trigger || null;
    openDialog(dialog);
  }

  function initConsentDialog() {
    const dialog = document.getElementById('consent-dialog');
    const form = document.getElementById('consent-form');
    if (!dialog || !form) return;

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;

      const listing = findListing(currentListingId);
      if (!listing) {
        closeDialog(dialog);
        return;
      }

      const data = new FormData(form);

      if (currentRequestMode === 'purchase') {
        const amount = Math.max(0, Number(data.get('purchaseAmount') || 0));
        const purchaserName = cleanString(data.get('purchaseName'), 60);
        const purchaserEmail = cleanString(data.get('purchaseEmail'), 120);
        if (!(amount > 0) || !purchaserName || !purchaserEmail) return;

        const now = new Date().toISOString();
        const request = {
          id: makeId('purchase'),
          type: 'nonmember_purchase',
          memberId: '',
          listingId: listing.id,
          listingTitle: listing.title,
          provider: listing.provider,
          pillar: listing.pillar,
          note: cleanString(data.get('note'), 280),
          purchaserName,
          purchaserEmail,
          amount,
          requestedAt: now,
          status: 'purchase_intent',
          fund: 'severance'
        };
        state.requests.unshift(request);
        state.requests = state.requests.slice(0, 100);

        const contribution = {
          id: makeId('contribution'),
          memberId: '',
          type: 'severance_purchase',
          amount,
          hours: 0,
          profession: '',
          stateRegion: '',
          hourlyRate: 0,
          stockValue: 0,
          sourceId: request.id,
          note: `Non-member purchase intent: ${listing.title}`,
          createdAt: now,
          status: 'recorded',
          purchaserEmail,
          purchaserName
        };
        state.contributions = Array.isArray(state.contributions) ? state.contributions : [];
        state.contributions.unshift(contribution);
        state.contributions = state.contributions.slice(0, 200);

        state.severanceFund = state.severanceFund || { balance: 0, contributions: [] };
        state.severanceFund.balance = (Number(state.severanceFund.balance) || 0) + amount;
        state.severanceFund.contributions = Array.isArray(state.severanceFund.contributions) ? state.severanceFund.contributions : [];
        state.severanceFund.contributions.unshift(contribution.id);
        state.severanceFund.contributions = state.severanceFund.contributions.slice(0, 500);

        saveState();
        closeDialog(dialog, { restoreFocus: false });
        currentListingId = null;
        applyFilters();
        focusListingTitle(listing.id);
        announce(`Purchase intent recorded for ${listing.title}. ${amount.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} is recorded locally for the severance fund in this prototype.`);
        showToast('Purchase intent recorded locally for the severance fund. No payment was processed and nothing was transmitted.', false);
        return;
      }

      if (!isMember()) {
        closeDialog(dialog);
        showToast('Sign the Unbought Pledge to make a mutual-aid request as a member.');
        return;
      }

      if (!requireFullAccess('Full access is paused during your reflection period. Mutual-aid requests are unavailable until you complete the reflection and treatment requirements.')) {
        closeDialog(dialog);
        return;
      }

      if (state.requests.some((request) => request.listingId === listing.id && request.memberId === state.pledge.memberId && request.type !== 'nonmember_purchase')) {
        closeDialog(dialog);
        announce('A request for this offering is already saved in your browser.');
        showToast('This request is already recorded locally.', false);
        return;
      }

      state.requests.unshift({
        id: makeId('request'),
        type: 'mutual_aid_request',
        memberId: state.pledge.memberId,
        listingId: listing.id,
        listingTitle: listing.title,
        provider: listing.provider,
        pillar: listing.pillar,
        note: cleanString(data.get('note'), 280),
        requestedAt: new Date().toISOString(),
        status: 'requested'
      });
      state.requests = state.requests.slice(0, 100);
      saveState();

      closeDialog(dialog, { restoreFocus: false });
      currentListingId = null;
      applyFilters();
      focusListingTitle(listing.id);

      announce(`Request recorded for ${listing.title}. This prototype saved it in your browser only.`);
      showToast('Request recorded locally. No data left this device.', false);
    });
  }

  function syncInquiryFields() {
    const typeSelect = document.getElementById('inquiry-type');
    const waitlistFields = document.getElementById('waitlist-fields');
    const landFields = document.getElementById('land-fields');
    const title = document.getElementById('inquiry-title');
    const description = document.getElementById('inquiry-description');
    const agreementLabel = document.getElementById('inquiry-agreement-label');
    const noteLabel = document.getElementById('inquiry-note-label');
    if (!typeSelect) return;

    const type = typeSelect.value;
    currentInquiryType = type;

    const showWaitlist = type === 'waitlist';
    const showLand = type === 'land';

    if (waitlistFields) waitlistFields.hidden = !showWaitlist;
    if (landFields) landFields.hidden = !showLand;

    // Disable hidden fields so required validation and FormData stay clean.
    if (waitlistFields) {
      $$('input, select, textarea', waitlistFields).forEach((field) => {
        field.disabled = !showWaitlist;
      });
    }
    if (landFields) {
      $$('input, select, textarea', landFields).forEach((field) => {
        field.disabled = !showLand;
      });
    }

    if (title) {
      title.textContent = showLand
        ? 'Offer land or a building'
        : type === 'question'
          ? 'Ask the land circle'
          : 'Join the housing waitlist';
    }

    if (description) {
      description.textContent = showLand
        ? 'Tell us a little about the land or building, and how you would like it to serve the community. A conversation comes before any agreement.'
        : type === 'question'
          ? 'Ask the land circle about community land trusts, stewardship, affordability, or how decisions are made. No question is too basic.'
          : 'This is an early planning conversation, not an application for housing or credit. Share only what you are comfortable sharing.';
    }

    if (agreementLabel) {
      agreementLabel.textContent = showLand
        ? 'I understand this is an initial conversation, not a legal or financial commitment.'
        : type === 'question'
          ? 'I understand this is a planning-stage prototype and no one is obligated to respond.'
          : 'I understand this is a planning-stage waitlist, not an offer of housing or credit.';
    }

    if (noteLabel) {
      noteLabel.textContent = showLand
        ? 'What should the land circle know? (optional)'
        : 'What would you like us to know? (optional)';
    }
  }

  function openInquiryDialog(type) {
    const dialog = document.getElementById('inquiry-dialog');
    const form = document.getElementById('inquiry-form');
    const typeSelect = document.getElementById('inquiry-type');
    if (!dialog || !form || !typeSelect) return;

    form.reset();
    typeSelect.value = ['waitlist', 'land', 'question'].includes(type) ? type : 'waitlist';
    syncInquiryFields();
    openDialog(dialog);
  }

  function initInquiryDialog() {
    const dialog = document.getElementById('inquiry-dialog');
    const form = document.getElementById('inquiry-form');
    const typeSelect = document.getElementById('inquiry-type');
    if (!dialog || !form || !typeSelect) return;

    typeSelect.addEventListener('change', syncInquiryFields);

    $$('[data-inquiry]').forEach((button) => {
      button.addEventListener('click', () => openInquiryDialog(button.dataset.inquiry));
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;

      const data = new FormData(form);
      const type = String(data.get('inquiryType') || currentInquiryType);
      const inquiry = {
        id: makeId('inquiry'),
        type,
        name: cleanString(data.get('name'), 60),
        contact: cleanString(data.get('contact'), 120),
        location: cleanString(data.get('location'), 80),
        household: cleanString(data.get('household'), 20),
        access: cleanString(data.get('access'), 120),
        propertyType: cleanString(data.get('propertyType'), 40),
        tenure: cleanString(data.get('tenure'), 40),
        note: cleanString(data.get('note'), 400),
        createdAt: new Date().toISOString()
      };

      state.inquiries.unshift(inquiry);
      state.inquiries = state.inquiries.slice(0, 100);
      saveState();

      closeDialog(dialog);

      const status = document.getElementById('land-inquiry-status');
      if (status) {
        status.textContent = type === 'land'
          ? 'Your land or building inquiry is saved in this browser. A land-circle host would follow up in a real deployment.'
          : type === 'question'
            ? 'Your question is saved in this browser. A land-circle host would follow up in a real deployment.'
            : 'Your housing waitlist inquiry is saved in this browser. This is a planning-stage prototype, not a housing offer.';
      }

      showToast('Inquiry saved locally. Nothing was transmitted.', false);
    });
  }

  function showConfirm(options) {
    const dialog = document.getElementById('confirm-dialog');
    const title = document.getElementById('confirm-title');
    const message = document.getElementById('confirm-message');
    const accept = document.getElementById('confirm-accept');
    if (!dialog || !title || !message || !accept) return;

    title.textContent = options.title || 'Are you sure?';
    message.textContent = options.message || '';
    accept.textContent = options.confirmLabel || 'Confirm';
    accept.className = `button ${options.tone === 'danger' ? 'button--danger' : 'button--primary'}`;
    confirmAction = typeof options.onConfirm === 'function' ? options.onConfirm : null;

    openDialog(dialog);
  }

  function initConfirmDialog() {
    const dialog = document.getElementById('confirm-dialog');
    const accept = document.getElementById('confirm-accept');
    const cancel = document.getElementById('confirm-cancel');
    if (!dialog || !accept) return;

    accept.addEventListener('click', () => {
      const action = confirmAction;
      confirmAction = null;
      closeDialog(dialog, { restoreFocus: false });
      if (action) action();
    });

    if (cancel) {
      cancel.addEventListener('click', () => {
        confirmAction = null;
        closeDialog(dialog);
      });
    }

    $$('[data-confirm-close]', dialog).forEach((button) => {
      button.addEventListener('click', () => {
        confirmAction = null;
        closeDialog(dialog);
      });
    });

    dialog.addEventListener('close', () => {
      confirmAction = null;
    });
  }

  function initResetDemo() {
    const resetButton = document.getElementById('reset-demo');
    if (!resetButton) return;

    resetButton.addEventListener('click', () => {
      showConfirm({
        title: 'Demo Reset / Clear Local Data',
        message: 'This removes your pledge and membership, account credentials, track, listings, requests, inquiries, donation intents, contributions, severance fund records, volunteer offers, reports and votes, messages, suggestions, waiting-list entry, and settings from this browser. It cannot be undone.',
        confirmLabel: 'Clear local data',
        tone: 'danger',
        onConfirm: () => {
          try {
            localStorage.removeItem(STORAGE_KEY);
            Object.keys(localStorage)
              .filter((key) => key.startsWith('unbought'))
              .forEach((key) => localStorage.removeItem(key));
          } catch (error) {
            // Storage may be blocked; the in-memory reset below still applies.
          }

          state = createDefaultState();
          currentListingId = null;

          const pledgeForm = document.getElementById('pledge-form');
          if (pledgeForm) pledgeForm.reset();

          const postForm = document.getElementById('post-form');
          if (postForm) postForm.reset();

          const consentForm = document.getElementById('consent-form');
          if (consentForm) consentForm.reset();

          const inquiryForm = document.getElementById('inquiry-form');
          if (inquiryForm) inquiryForm.reset();

          const donationForm = document.getElementById('donation-form');
          if (donationForm) donationForm.reset();

          $$('input[name="membership-track"]').forEach((radio) => {
            radio.checked = false;
          });

          renderPledge();
          renderTrackGate();
          renderTrackPanel(null);
          renderSharedMemberViews();
          renderVolunteerStatus();
          renderDashboard();
          renderAccountability();
          resetFilters();
          renderAuthUi();

          const postStatus = document.getElementById('post-status');
          if (postStatus) postStatus.textContent = 'For pledged members. Stored only on this device. Nothing is transmitted.';

          const landStatus = document.getElementById('land-inquiry-status');
          if (landStatus) landStatus.textContent = '';

          document.dispatchEvent(new CustomEvent('unbought:reset'));

          resetButton.focus({ preventScroll: true });
          announce('All local demo data has been cleared. The page is back to its starting state.');
          showToast('Local demo data cleared.', false);
        }
      });
    });
  }

  function initDialogs() {
    initDialogBasics();
    initReportDialog();
    initConsentDialog();
    initInquiryDialog();
    initConfirmDialog();
    initResetDemo();
  }

  /* ------------------------------------------------------------------------
     09. Initialization
     ------------------------------------------------------------------------ */
  function init() {
    initHeader();
    initPledgePage();
    initPledgeForm();
    initSigninForm();
    initVolunteerForm();
    initDashboard();
    initDashboardMenu();
    initAccountability();
    initTracks();
    initTabs();
    initDirectory();
    initPostForm();
    initDialogs();
    initVideo();
    initFooterYear();
    renderSharedMemberViews();
    renderAuthUi();
    renderNewsFeeds();
    document.addEventListener('unbought:donation-recorded', () => {
      // donation.js writes to shared state; reload to reflect in account UI
      try {
        state = loadState();
        if (state.pledge) {
          const recordedDonations = getMemberDonationIntents().length;
          state.pledge.donationCount = Math.max(cleanCount(state.pledge.donationCount), recordedDonations);
          saveState();
        }
      } catch (error) {
        // ignore
      }
      renderSharedMemberViews();
      renderDashboard();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
