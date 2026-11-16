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

  /* ------------------------------------------------------------------------
     02. State, storage & small helpers
     ------------------------------------------------------------------------ */
  function createDefaultState() {
    return {
      pledge: null,
      track: null,
      trackDetails: {},
      listings: [],
      requests: [],
      inquiries: [],
      donationIntents: [],
      contributions: [],
      severanceFund: {
        balance: 0,
        contributions: []
      }
    };
  }

  function isMember() {
    return Boolean(state.pledge && state.pledge.memberId);
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

  function requireMembership(message) {
    if (isMember()) return true;
    showToast(message || 'Sign the Unbought Pledge to become a member and participate.');
    const pledgeLink = document.querySelector('a[href="#pledge"], a[href="index.html#pledge"]');
    if (pledgeLink) {
      pledgeLink.focus({ preventScroll: true });
    }
    return false;
  }

  function cleanString(value, maxLength = 400) {
    if (typeof value !== 'string') return '';
    return value.trim().slice(0, maxLength);
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
          location: cleanString(raw.pledge.location, 80),
          note: cleanString(raw.pledge.note, 240),
          signedAt,
          status: 'active'
        };
      }
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
          memberId: cleanString(request.memberId, 100),
          listingId: cleanString(request.listingId, 100),
          listingTitle: cleanString(request.listingTitle, 80),
          provider: cleanString(request.provider, 60),
          note: cleanString(request.note, 280),
          requestedAt: cleanString(request.requestedAt, 40),
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
        showToast('Local storage is blocked. Changes will last only for this visit.');
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

    const isRequested = state.requests.some((request) => request.listingId === listing.id);
    if (isRequested) card.classList.add('is-requested');

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
      isRequested ? 'Request saved locally · thank you' : listing.note || 'Peer offer · consent first'
    );
    note.prepend(createIcon('check'));
    actions.appendChild(note);

    const requestButton = createEl('button', 'button button--small');
    requestButton.type = 'button';
    requestButton.dataset.requestListing = listing.id;

    if (isRequested) {
      requestButton.classList.add('button--ghost');
      requestButton.disabled = true;
      requestButton.append(createIcon('check'), document.createTextNode('Request recorded'));
      requestButton.setAttribute('aria-label', `Request recorded: ${listing.title}`);
    } else if (!isMember()) {
      requestButton.classList.add('button--outline');
      requestButton.textContent = 'Buy as non-member';
      requestButton.dataset.requestMode = 'purchase';
      requestButton.setAttribute('aria-label', `Buy ${listing.title} as a non-member (supports severance fund)`);
    } else {
      requestButton.dataset.requestMode = 'mutual';
      requestButton.classList.add('button--outline');
      requestButton.textContent = 'Request with Mutual Consent';
      requestButton.setAttribute('aria-label', `Request with Mutual Consent: ${listing.title}`);
    }
    actions.appendChild(requestButton);

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

  function initPostForm() {
    const form = document.getElementById('post-form');
    if (!form) return;

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;

      const titleInput = document.getElementById('post-title-input');
      const providerInput = document.getElementById('post-provider');
      const locationInput = document.getElementById('post-location');
      const descriptionInput = document.getElementById('post-description');

      if (![titleInput, providerInput, locationInput, descriptionInput].every(requireNonBlank)) {
        return;
      }

      const data = new FormData(form);
      const title = cleanString(data.get('title'), 80);
      const provider = cleanString(data.get('provider'), 60);
      const location = cleanString(data.get('location'), 80);
      const description = cleanString(data.get('description'), 400);
      const pillar = getDirectoryScope() === 'goods' ? 'goods' : String(data.get('pillar') || '');
      const exchange = pillar === 'goods' ? 'free' : String(data.get('exchange') || '');
      const category = pillar === 'goods' ? String(data.get('category') || '') : '';
      const scope = String(data.get('scope') || '');

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
      const postStatus = document.getElementById('post-status');
      if (postStatus) {
        postStatus.textContent = 'Published. Your listing is now in the directory above.';
      }
      showToast('Listing published to this browser.', false);
      announce(`Your listing “${listing.title}” was published. It is at the top of the directory.`);
      focusListingTitle(listing.id);
    });
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
    head.appendChild(createEl('h3', '', signedIn ? 'Contributions, work, and stock' : 'Members join by pledge; non-members may buy to support the severance fund'));
    card.appendChild(head);

    if (!signedIn) {
      const intro = createEl('p', '', 'Anyone can browse. To participate in the commons (post offers/needs, request mutual-aid connections, and manage your track), sign the Unbought Pledge to become a member. People who do not take the pledge can buy goods and services for money in this prototype; proceeds are recorded for the severance fund.');
      card.appendChild(intro);
    } else {
      const meta = createEl('p', 'account-meta', `${state.pledge.name} · ${state.pledge.location || 'Location not shared'} · Member ID ${state.pledge.memberId}`);
      card.appendChild(meta);
    }

    const stats = createEl('div', 'account-stats');
    const statDefs = signedIn ? [
      ['Donations tracked', `${memberDonations.length} intent${memberDonations.length === 1 ? '' : 's'} · ${formatMoney(donationTotal)}`],
      ['Work logged', `${laborHours.toLocaleString()} hr · ${formatMoney(laborValue)} stock value`],
      ['Your stock value (prototype)', formatMoney(totalStock)],
      ['Severance fund (all non-member purchases)', `${formatMoney(severance.balance)} · ${severance.count} recorded`]
    ] : [
      ['Severance fund (non-member purchases)', formatMoney(severance.balance)],
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

    const model = createEl('p', 'account-note', 'Prototype model (DB-ready, local only): every donation or logged hour gives stock value in the company/community enterprise. Hours are valued at the average hourly wage for your profession in your state/region (enter rate now; future system may auto-calculate). Non-members who contribute through purchases or other recorded contributions may be eligible for a severance share based on contribution percentage; no payouts are made in this prototype.');
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
        renderMemberAccount();
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
     05b. Pledge & digital signature
     ------------------------------------------------------------------------ */
  function renderPledge() {
    const card = document.getElementById('signature-card');
    const banner = document.getElementById('signed-banner');
    const signedName = document.getElementById('signed-name');
    const signedDate = document.getElementById('signed-date');
    if (!card || !banner || !signedName || !signedDate) return;

    const pledge = state.pledge;
    const isSigned = Boolean(pledge);
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
      if (link) link.textContent = 'Manage membership';
    } else {
      message.textContent = 'You can browse labor, goods, and tracks. Sign the Unbought Pledge to become a member and participate—post offers, request connections, and manage your track and messages.';
      if (link) link.textContent = 'Sign the pledge';
    }
  }

  function initPledgeForm() {
    const form = document.getElementById('pledge-form');
    const errorBox = document.getElementById('pledge-error');
    const withdraw = document.getElementById('withdraw-pledge');
    const card = document.getElementById('signature-card');
    if (!form && !withdraw) return;

    if (form) {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        if (errorBox) errorBox.hidden = true;
        if (!form.reportValidity()) return;

        const data = new FormData(form);
        const name = cleanString(data.get('chosenName'), 60);
        const location = cleanString(data.get('location'), 80);
        const note = cleanString(data.get('note'), 240);
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

        if (!name || !location) {
          if (errorBox) {
            errorBox.textContent = 'Please add a chosen name and a general location.';
            errorBox.hidden = false;
          }
          return;
        }

        state.pledge = {
          memberId: makeId('member'),
          name,
          location,
          note,
          signedAt: new Date().toISOString(),
          status: 'active'
        };
        saveState();
        renderPledge();
        renderTrackGate();
        renderTrackPanel(state.track);
        renderMemberAccount();
        applyFilters();

        const banner = document.getElementById('signed-banner');
        if (banner) {
          banner.tabIndex = -1;
          banner.focus({ preventScroll: true });
        }
        announce(`Welcome, ${name}. Your pledge is signed and your membership is active in this browser. You can now choose a track, post offers, and request connections.`);
        showToast('Membership active. You can now participate in the community.', false);
      });
    }

    if (withdraw) {
      withdraw.addEventListener('click', () => {
        showConfirm({
          title: 'Withdraw your membership?',
          message: 'Your pledge and membership will be removed from this browser. You can still browse offers, but you will need to sign the pledge again to post, request, or manage your track. Your saved track details may remain on this device.',
          confirmLabel: 'Withdraw membership',
          tone: 'danger',
          onConfirm: () => {
            state.pledge = null;
            saveState();
            renderPledge();
            renderTrackGate();
            renderTrackPanel(state.track);
            renderMemberAccount();
            applyFilters();

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
            <label for="contributor-hours">Monthly hours pledged <span class="required-mark" aria-hidden="true">*</span></label>
            <input type="number" id="contributor-hours" name="hours" min="1" max="40" step="1" value="4" required>
            <p class="field-hint">A real, sustainable number. You can change it later.</p>
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
            <label for="observer-cadence">How often would you like to hear from the community?</label>
            <select id="observer-cadence" name="cadence">
              <option value="rarely">Only major updates</option>
              <option value="monthly">Monthly digest</option>
              <option value="events">When something is happening nearby</option>
              <option value="quiet">Keep me quiet for now</option>
            </select>
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
        if (!form.reportValidity()) return;

        const savedDetails = collectFormDetails(form);
        savedDetails.memberId = state.pledge.memberId;
        state.trackDetails[track] = savedDetails;
        saveState();

        let message = 'Your track details were saved.';
        if (track === 'contributor') {
          const hours = savedDetails.hours || '0';
          message = `Contributor track saved. You pledged ${hours} hours per month in ${hasOwn(PILLARS, savedDetails.pillar) ? PILLARS[savedDetails.pillar].label : 'the community'}.`;
        } else if (track === 'apprentice') {
          message = 'Apprentice track saved. Your guild preference is stored in this browser.';
        } else if (track === 'care') {
          message = 'Welcome & Care Circle request saved locally. No diagnosis or medical information was requested.';
        } else if (track === 'observer') {
          message = 'Observer track saved. Explore at your own pace—no obligation.';
        }

        renderTrackPanel(track);
        renderMemberAccount();
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
        state.track = radio.value;
        saveState();
        renderTrackPanel(radio.value);
        renderTrackGate();
        renderMemberAccount();
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
        ? 'People without a pledge can buy goods and services for money in this prototype. Your payment intent is recorded locally and allocated to the severance fund (no real payment is processed). Members access the commons through mutual aid instead.'
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
        announce(`Purchase intent recorded for ${listing.title}. ${amount.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} is allocated to the severance fund in this prototype.`);
        showToast('Purchase intent recorded. Proceeds allocated to the severance fund (prototype).', false);
        return;
      }

      if (!isMember()) {
        closeDialog(dialog);
        showToast('Sign the Unbought Pledge to make a mutual-aid request as a member.');
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
        message: 'This removes your pledge signature, membership track, custom listings, requests, waiting-list entry, and donation intents from this browser. It cannot be undone.',
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
          renderMemberAccount();
          resetFilters();

          const postStatus = document.getElementById('post-status');
          if (postStatus) postStatus.textContent = 'No account needed. Stored only on this device.';

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
    initPledgeForm();
    initTracks();
    initTabs();
    initDirectory();
    initPostForm();
    initDialogs();
    initVideo();
    initFooterYear();
    renderMemberAccount();
    document.addEventListener('unbought:donation-recorded', () => {
      // donation.js writes to shared state; reload to reflect in account UI
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) state = migrateState(JSON.parse(raw));
      } catch (error) {
        // ignore
      }
      renderMemberAccount();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
