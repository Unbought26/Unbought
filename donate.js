/* ==========================================================================
   UNBOUGHT — donate.js
   Local-only donation intents integrated with Unbought membership (prototype).

   No payment processing and no real email sending. Donation intents are saved in
   the shared local app state so members can track them in their account. Guest
   donors can provide an email for a future thank-you message (recorded locally).
   Contributions are also recorded in a DB-ready equity/contribution ledger shape
   with fund: 'unbought', matching academy tuition and non-member purchases.
   Every cent is catalogued for the Unbought donation fund; nothing here moves money.
   ========================================================================== */
(() => {
  'use strict';

  const STORAGE_KEY = 'unbought:v1';
  const LEGACY_STORAGE_KEY = 'unbought:donation-intents:v1';
  const MAX_INTENTS = 100;

  const FREQUENCY_LABELS = Object.freeze({
    'one-time': 'One-time gift',
    monthly: 'Monthly gift',
    'pledge-later': 'Pledge to give when the trust opens'
  });

  const WISHLIST_CATEGORIES = Object.freeze({
    need: 'Need',
    want: 'Want',
    nice: 'Nice to have'
  });
  const WISHLIST_GROUPS = Object.freeze([
    { key: 'active', label: 'Active working members' },
    { key: 'disabled', label: 'Disabled' },
    { key: 'over65', label: 'Over 65' },
    { key: 'homeless', label: 'Homeless' },
    { key: 'under25', label: 'Under 25' },
    { key: 'report', label: 'Confirmed report within the last year' }
  ]);
  const WISHLIST_CATALOG = Object.freeze([
    'Food', 'Health Care', 'Dental', 'Mental Health', 'Shelter', 'Clothing',
    'Gas Cards', 'Uber Gift cards', 'Spot on the waitlist for land',
    'Access to the Academy', 'Bedding', 'Kitchen supplies', 'Cleaning supplies',
    'Tools', 'School supplies', 'Winter coat', 'Prescription help',
    'Public transit pass', 'Internet access', 'Phone minutes'
  ]);
  const WISHLIST_HOLD_MS = 7 * 24 * 60 * 60 * 1000;
  const MAX_WISHLIST_ITEMS = 200;

  const form = document.getElementById('donation-form');
  if (!form) return;

  const errorBox = document.getElementById('donation-error');
  const statusBox = document.getElementById('donation-status');
  const receipt = document.getElementById('donation-receipt');
  const receiptRef = document.getElementById('receipt-ref');
  const receiptSummary = document.getElementById('receipt-summary');
  const receiptAgain = document.getElementById('receipt-again');
  const clearButton = document.getElementById('clear-intents');
  const amountInput = document.getElementById('donation-amount');
  const nameInput = document.getElementById('donation-name');
  const emailInput = document.getElementById('donation-email');
  const memberNote = document.getElementById('donation-member-note');
  const sourceField = document.getElementById('donation-source-field');
  const sourceSelect = document.getElementById('donation-source');
  const liveRegion = document.getElementById('live-region');

  const wishlistForm = document.getElementById('wishlist-form');
  const wishlistStatus = document.getElementById('wishlist-status');
  const wishlistGate = document.getElementById('wishlist-member-gate');
  const wishlistSearch = document.getElementById('wishlist-search');
  const wishlistSuggestions = document.getElementById('wishlist-suggestions');
  const wishlistOptions = document.getElementById('wishlist-options');
  const wishlistTitle = document.getElementById('wishlist-item-title');
  const wishlistUrl = document.getElementById('wishlist-example-url');
  const wishlistCategory = document.getElementById('wishlist-category');
  const wishlistGroup = document.getElementById('wishlist-group');
  const wishlistRank = document.getElementById('wishlist-rank');
  const wishlistPerishable = document.getElementById('wishlist-perishable');
  const wishlistError = document.getElementById('wishlist-error');
  const wishlistOwned = document.getElementById('wishlist-owned');
  const wishlistCycle = document.getElementById('wishlist-cycle');
  const wishlistPublic = document.getElementById('wishlist-public');

  let state = loadState();
  let clearArmed = false;
  let clearTimer = null;

  function cleanText(value, maxLength) {
    if (typeof value !== 'string') return '';
    return value.trim().slice(0, maxLength);
  }

  function isValidFrequency(value) {
    return Object.prototype.hasOwnProperty.call(FREQUENCY_LABELS, value);
  }

  function wishlistGroupLabel(key) {
    const found = WISHLIST_GROUPS.find((group) => group.key === key);
    return found ? found.label : WISHLIST_GROUPS[0].label;
  }

  function cleanExampleUrl(value) {
    const url = cleanText(value, 500);
    if (!/^https?:\/\//i.test(url)) return '';
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href.slice(0, 500) : '';
    } catch (error) {
      return '';
    }
  }

  function normalizeWishlistItem(item) {
    if (!item || typeof item !== 'object') return null;
    const title = cleanText(item.title, 120);
    const memberId = cleanText(item.memberId, 100);
    if (!title || !memberId) return null;
    const rank = Number(item.rank);
    return {
      id: cleanText(item.id, 100) || `wish-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      memberId,
      memberName: cleanText(item.memberName, 60),
      title,
      category: Object.prototype.hasOwnProperty.call(WISHLIST_CATEGORIES, item.category) ? item.category : 'want',
      wishlistGroup: WISHLIST_GROUPS.some((group) => group.key === item.wishlistGroup) ? item.wishlistGroup : 'active',
      rank: Number.isFinite(rank) ? Math.min(20, Math.max(1, Math.round(rank))) : 10,
      exampleUrl: cleanExampleUrl(item.exampleUrl),
      perishable: Boolean(item.perishable),
      createdAt: cleanText(item.createdAt, 40) || new Date().toISOString(),
      status: cleanText(item.status, 30) || 'active'
    };
  }

  function wishlistItems() {
    return (Array.isArray(state.wishlistItems) ? state.wishlistItems : [])
      .map(normalizeWishlistItem)
      .filter(Boolean)
      .slice(0, MAX_WISHLIST_ITEMS);
  }

  function isPublicWishlistItem(item, now) {
    if (!item || item.status !== 'active') return false;
    if (item.perishable) return true;
    const created = new Date(item.createdAt).getTime();
    return Number.isFinite(created) && (now - created) >= WISHLIST_HOLD_MS;
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (typeof text === 'string') node.textContent = text;
    return node;
  }

  function defaultState() {
    return {
      pledge: null,
      track: null,
      trackDetails: {},
      listings: [],
      requests: [],
      inquiries: [],
      donationIntents: [],
      wishlistItems: [],
      contributions: []
    };
  }

  function loadState() {
    let parsed = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      parsed = raw ? JSON.parse(raw) : null;
    } catch (error) {
      parsed = null;
    }
    const base = parsed && typeof parsed === 'object' ? parsed : defaultState();
    if (!Array.isArray(base.donationIntents)) base.donationIntents = [];
    if (!Array.isArray(base.wishlistItems)) base.wishlistItems = [];
    if (!Array.isArray(base.contributions)) base.contributions = [];
    base.wishlistItems = base.wishlistItems.map(normalizeWishlistItem).filter(Boolean).slice(0, MAX_WISHLIST_ITEMS);

    // Migrate legacy standalone donation intents if shared state has none.
    if (!base.donationIntents.length) {
      try {
        const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
        const legacy = legacyRaw ? JSON.parse(legacyRaw) : null;
        if (Array.isArray(legacy)) {
          base.donationIntents = legacy
            .filter((item) => item && typeof item === 'object' && Number.isFinite(Number(item.amount)) && isValidFrequency(item.frequency))
            .slice(0, MAX_INTENTS)
            .map((item) => ({
              id: cleanText(item.id, 40) || `UB-${Date.now().toString(36).toUpperCase()}`,
              memberId: '',
              amount: Math.max(1, Math.round(Number(item.amount))),
              frequency: item.frequency,
              name: cleanText(item.name, 60),
              email: '',
              note: cleanText(item.note, 280),
              savedAt: cleanText(item.savedAt, 40) || new Date().toISOString(),
              status: 'intent',
              fund: 'unbought',
              stockValue: Math.max(1, Math.round(Number(item.amount))),
              thankYouEmailQueued: false
            }));
        }
      } catch (error) {
        // ignore
      }
    }

    return base;
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      // Keep legacy key in sync minimally for older tabs/tools.
      localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify((state.donationIntents || []).slice(0, 20)));
      return true;
    } catch (error) {
      return false;
    }
  }

  function getMember() {
    // Match the app's member check: a stored pledge alone is not enough, the
    // visitor must be signed in. This keeps auto-filled names and tracking
    // consistent when someone signs out on this device.
    const signedIn = Boolean(state.auth && state.auth.session && state.auth.session.signedIn);
    return signedIn && state.pledge && state.pledge.memberId ? state.pledge : null;
  }

  function visibleIntents() {
    const member = getMember();
    const intents = Array.isArray(state.donationIntents) ? state.donationIntents : [];
    if (member) return intents.filter((item) => item && item.memberId === member.memberId);
    return intents;
  }

  function announce(message) {
    if (!liveRegion) return;
    liveRegion.textContent = '';
    window.setTimeout(() => {
      liveRegion.textContent = message;
    }, 30);
  }

  function formatAmount(value) {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(value);
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

  function populateDonationSources(member) {
    if (!sourceSelect) return;
    const previous = sourceSelect.value;
    sourceSelect.replaceChildren();
    const general = document.createElement('option');
    general.value = '';
    general.textContent = 'Unbought donation fund (general)';
    sourceSelect.appendChild(general);
    if (!member) return;

    const groups = Array.isArray(state.groups) ? state.groups : [];
    const memberGroups = groups.filter((group) => group && !group.left && Array.isArray(group.members)
      && group.members.some((entry) => entry && entry.memberId === member.memberId));
    if (memberGroups.length) {
      const groupOptions = document.createElement('optgroup');
      groupOptions.label = 'Your groups';
      memberGroups.forEach((group) => {
        const id = cleanText(group.id, 120);
        if (!id) return;
        const option = document.createElement('option');
        option.value = `group:${id}`;
        option.textContent = cleanText(group.name, 120) || id;
        groupOptions.appendChild(option);
      });
      sourceSelect.appendChild(groupOptions);
    }

    const allianceIds = new Set();
    memberGroups.forEach((group) => {
      const settings = group.settings && typeof group.settings === 'object' ? group.settings : {};
      (Array.isArray(settings.alliances) ? settings.alliances : []).forEach((id) => {
        const clean = cleanText(id, 120);
        if (clean) allianceIds.add(clean);
      });
    });
    if (allianceIds.size) {
      const allianceOptions = document.createElement('optgroup');
      allianceOptions.label = 'Alliances';
      allianceIds.forEach((id) => {
        const linked = groups.find((group) => group && group.id === id);
        const option = document.createElement('option');
        option.value = `alliance:${id}`;
        option.textContent = linked ? `${cleanText(linked.name, 120) || id} (alliance)` : `Alliance ${id}`;
        allianceOptions.appendChild(option);
      });
      sourceSelect.appendChild(allianceOptions);
    }

    if (Array.from(sourceSelect.options).some((option) => option.value === previous)) sourceSelect.value = previous;
  }

  function syncMemberUI() {
    const member = getMember();
    if (memberNote) {
      memberNote.hidden = false;
      memberNote.textContent = member
        ? `Signed in as ${member.name}. Your donation intents will be tracked in your account and recorded for the Unbought donation fund, with contribution and stock value in this prototype. Academy tuition and non-member purchases go to the same fund.`
        : 'Donating without an account is welcome. Your intent is recorded locally for the Unbought donation fund. If you provide an email, it is kept locally for a future thank-you note; no email is sent in this prototype.';
    }
    if (member && nameInput && !nameInput.value.trim()) {
      nameInput.value = member.name || '';
    }
    if (emailInput) {
      emailInput.required = !member;
      const hint = document.getElementById('donation-email-hint');
      if (hint) {
        hint.textContent = member
          ? 'Optional for members (your account can track this donation).'
          : 'Required here if you donate without an account. It is stored locally for a possible future thank-you email; no email is sent in this prototype.';
      }
    }
    if (sourceField) sourceField.hidden = !member;
    populateDonationSources(member);
    syncWishlistUI();
  }

  function updateStatus() {
    if (!statusBox) return;
    const intents = visibleIntents();
    if (!intents.length) {
      statusBox.textContent = getMember()
        ? 'No donation intents tracked in your account yet.'
        : 'No donation intents saved in this browser yet.';
      return;
    }
    const total = intents.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const scope = getMember() ? 'tracked in your account' : 'saved in this browser';
    statusBox.textContent = `${intents.length} donation intent${intents.length === 1 ? '' : 's'} ${scope} · ${formatAmount(total)} intended for the Unbought donation fund. No money has moved.`;
  }

  function showReceipt(intent, shouldFocus) {
    if (!receipt || !receiptSummary || !receiptRef) return;

    receiptRef.textContent = intent.id ? `Reference ${intent.id}` : '';
    const name = intent.name ? ` for ${intent.name}` : '';
    const tracking = intent.memberId ? 'tracked in your account' : (intent.email ? 'email recorded locally for a future thank-you note' : 'saved locally');
    receiptSummary.textContent = `${formatAmount(intent.amount)} · ${FREQUENCY_LABELS[intent.frequency]}${name} · saved ${formatDate(intent.savedAt)} · ${tracking}.`;
    receipt.hidden = false;

    if (shouldFocus) {
      receipt.focus({ preventScroll: true });
      const msg = intent.memberId
        ? `Donation intent for ${formatAmount(intent.amount)} saved and tracked in your account. No payment was collected.`
        : intent.email
          ? `Donation intent for ${formatAmount(intent.amount)} saved locally. No payment was collected. Your email is recorded locally for a possible future thank-you note; no email was sent.`
          : `Donation intent for ${formatAmount(intent.amount)} saved locally. No payment was collected.`;
      announce(msg);
    }
  }

  function hideReceipt() {
    if (receipt) receipt.hidden = true;
  }

  function resetClearButton() {
    clearArmed = false;
    window.clearTimeout(clearTimer);
    if (clearButton) clearButton.textContent = 'Clear saved intents';
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (errorBox) errorBox.hidden = true;
    state = loadState(); // refresh in case member state changed in another tab/page

    if (!form.reportValidity()) return;

    const data = new FormData(form);
    const amount = Math.round(Number(data.get('amount')));
    const frequency = String(data.get('frequency') || '');
    const agreement = document.getElementById('donation-agreement');
    const member = getMember();
    const email = cleanText(data.get('email'), 120);
    const source = cleanText(data.get('source'), 140);
    const sourceAllowed = Boolean(member && sourceSelect && Array.from(sourceSelect.options).some((option) => option.value === source));
    const groupId = sourceAllowed && source.startsWith('group:') ? cleanText(source.slice(6), 120) : '';
    const allianceId = sourceAllowed && source.startsWith('alliance:') ? cleanText(source.slice(9), 120) : '';

    if (!Number.isFinite(amount) || amount < 1) {
      if (errorBox) {
        errorBox.textContent = 'Please enter an intended amount of at least $1.';
        errorBox.hidden = false;
      }
      if (amountInput) amountInput.focus();
      return;
    }

    if (!isValidFrequency(frequency)) {
      if (errorBox) {
        errorBox.textContent = 'Please choose a donation frequency.';
        errorBox.hidden = false;
      }
      document.getElementById('donation-frequency')?.focus();
      return;
    }

    if (!member && !email) {
      if (errorBox) {
        errorBox.textContent = 'Please provide an email so a future thank-you note can be recorded locally, or sign the pledge to track donations in your account.';
        errorBox.hidden = false;
      }
      if (emailInput) emailInput.focus();
      return;
    }

    if (!agreement || !agreement.checked) {
      if (errorBox) {
        errorBox.textContent = 'Please confirm that you understand this is a non-binding prototype intent.';
        errorBox.hidden = false;
      }
      if (agreement) agreement.focus();
      return;
    }

    const intent = {
      id: `UB-${Date.now().toString(36).toUpperCase()}`,
      memberId: member ? member.memberId : '',
      amount,
      frequency,
      name: cleanText(data.get('name'), 60) || (member ? member.name : ''),
      email,
      note: cleanText(data.get('note'), 280),
      savedAt: new Date().toISOString(),
      status: 'intent',
      stockValue: amount,
      groupId,
      allianceId,
      thankYouEmailQueued: !member && Boolean(email)
    };

    state.donationIntents = Array.isArray(state.donationIntents) ? state.donationIntents : [];
    state.contributions = Array.isArray(state.contributions) ? state.contributions : [];
    state.donationIntents.unshift(intent);
    state.donationIntents = state.donationIntents.slice(0, MAX_INTENTS);

    // Record a contribution/equity ledger entry (DB-ready). Donations count as stock value.
    state.contributions.unshift({
      id: `contrib-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      memberId: intent.memberId,
      type: 'donation',
      fund: 'unbought',
      amount,
      hours: 0,
      profession: '',
      stateRegion: '',
      hourlyRate: 0,
      stockValue: amount,
      sourceId: intent.id,
      groupId,
      allianceId,
      note: intent.note,
      createdAt: intent.savedAt,
      status: 'recorded'
    });
    state.contributions = state.contributions.slice(0, 200);

    if (!saveState()) {
      if (errorBox) {
        errorBox.textContent = 'Local storage is blocked, so this intent could not be saved. Nothing was transmitted.';
        errorBox.hidden = false;
      }
      return;
    }

    form.reset();
    syncMemberUI();
    resetClearButton();
    updateStatus();
    showReceipt(intent, true);
    document.dispatchEvent(new CustomEvent('unbought:donation-recorded', { detail: { intent } }));
  });

  if (receiptAgain) {
    receiptAgain.addEventListener('click', () => {
      hideReceipt();
      resetClearButton();
      if (amountInput) amountInput.focus({ preventScroll: true });
    });
  }

  if (clearButton) {
    clearButton.addEventListener('click', () => {
      state = loadState();
      if (!clearArmed) {
        clearArmed = true;
        clearButton.textContent = 'Click again to confirm';
        window.clearTimeout(clearTimer);
        clearTimer = window.setTimeout(resetClearButton, 5000);
        return;
      }

      const member = getMember();
      if (member) {
        state.donationIntents = (state.donationIntents || []).filter((item) => item.memberId !== member.memberId);
        state.contributions = (state.contributions || []).filter((item) => !(item.memberId === member.memberId && item.type === 'donation'));
      } else {
        state.donationIntents = (state.donationIntents || []).filter((item) => item.memberId);
        state.contributions = (state.contributions || []).filter((item) => !(item.type === 'donation' && !item.memberId));
      }
      saveState();
      hideReceipt();
      resetClearButton();
      updateStatus();
      announce(member ? 'Donation intents for your account were cleared from this browser.' : 'Saved guest donation intents were cleared from this browser.');
    });
  }

  function renderWishlistSuggestions() {
    if (!wishlistSuggestions || !wishlistSearch) return;
    const query = cleanText(wishlistSearch.value, 120).toLowerCase();
    wishlistSuggestions.replaceChildren();
    if (!query) return;
    const matches = WISHLIST_CATALOG.filter((label) => label.toLowerCase().includes(query)).slice(0, 6);
    if (!matches.length) {
      wishlistSuggestions.appendChild(element('p', 'field-hint', 'No catalog match. You can still type your own item below.'));
      return;
    }
    matches.forEach((label) => {
      const button = element('button', 'wishlist-suggestion', label);
      button.type = 'button';
      button.addEventListener('click', () => {
        if (wishlistTitle) wishlistTitle.value = label;
        wishlistSuggestions.replaceChildren();
        if (wishlistTitle) wishlistTitle.focus({ preventScroll: true });
      });
      wishlistSuggestions.appendChild(button);
    });
  }

  function timeOf(value) {
    const time = new Date(value).getTime();
    return Number.isFinite(time) ? time : Number.MAX_SAFE_INTEGER;
  }

  function wishlistTallies(items) {
    const map = new Map();
    items.filter((item) => item.status === 'active').forEach((item) => {
      const key = `${item.wishlistGroup}|${item.category}|${item.title.toLowerCase()}`;
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
        existing.bestRank = Math.min(existing.bestRank, item.rank);
        existing.createdAt = existing.createdAt < item.createdAt ? existing.createdAt : item.createdAt;
        existing.members.add(item.memberId);
      } else {
        map.set(key, {
          title: item.title,
          category: item.category,
          wishlistGroup: item.wishlistGroup,
          count: 1,
          bestRank: item.rank,
          createdAt: item.createdAt,
          members: new Set([item.memberId])
        });
      }
    });
    // Each priority list is first come, first served: the earliest saved item
    // on a group's list is the top of that list when the waitlist cycles.
    const sorted = Array.from(map.values()).sort((a, b) =>
      timeOf(a.createdAt) - timeOf(b.createdAt) || a.title.localeCompare(b.title));
    const tops = {};
    WISHLIST_GROUPS.forEach((group) => {
      tops[group.key] = sorted.find((item) => item.wishlistGroup === group.key) || null;
    });
    return { sorted, tops };
  }

  function renderWishlistCycle(items) {
    if (!wishlistCycle) return;
    wishlistCycle.replaceChildren();
    const active = items.filter((item) => item.status === 'active');
    if (!active.length) {
      wishlistCycle.appendChild(element('p', 'field-hint', 'No wishlist items are saved on this device yet.'));
      return;
    }
    const { tops } = wishlistTallies(active);
    const memberCount = new Set(active.map((item) => item.memberId)).size;
    wishlistCycle.appendChild(element('p', 'contribution-meta', `${active.length} saved item${active.length === 1 ? '' : 's'} across ${memberCount} member list${memberCount === 1 ? '' : 's'}. Each priority list is first come, first served; the waitlist takes the earliest item on each list in the fixed group order, then cycles again.`));
    let shown = 0;
    for (let round = 1; round <= 2; round += 1) {
      WISHLIST_GROUPS.forEach((group) => {
        const top = tops[group.key];
        if (!top) return;
        const row = element('div', 'wishlist-cycle-row');
        row.appendChild(element('span', 'wishlist-cycle-step', String(shown + 1)));
        const copy = element('div', 'wishlist-cycle-copy');
        copy.appendChild(element('strong', '', `${group.label}: ${top.title}`));
        copy.appendChild(element('span', 'contribution-meta', `${WISHLIST_CATEGORIES[top.category]} #${top.bestRank} · saved ${formatDate(top.createdAt)} · first come, first served · round ${round}`));
        row.appendChild(copy);
        wishlistCycle.appendChild(row);
        shown += 1;
      });
    }
    if (!shown) wishlistCycle.appendChild(element('p', 'field-hint', 'No active items in this cycle yet.'));
  }

  function renderOwnedWishlist(items, member) {
    if (!wishlistOwned) return;
    wishlistOwned.replaceChildren();
    if (!member) {
      wishlistOwned.appendChild(element('p', 'field-hint', 'Your saved wishlist is available after you sign in on this device.'));
      return;
    }
    const own = items
      .filter((item) => item.memberId === member.memberId)
      .sort((a, b) => {
        const order = { need: 0, want: 1, nice: 2 };
        return order[a.category] - order[b.category] || a.rank - b.rank || a.title.localeCompare(b.title);
      });
    const head = element('h4', '', 'Saved on this device');
    wishlistOwned.appendChild(head);
    if (!own.length) {
      wishlistOwned.appendChild(element('p', 'field-hint', 'No items yet. Search the catalog above and add as many as you need.'));
      return;
    }
    own.forEach((item) => {
      const card = element('article', 'wishlist-item');
      const top = element('div', 'wishlist-item-top');
      top.appendChild(element('strong', '', item.title));
      top.appendChild(element('span', 'badge badge--soft', `${wishlistGroupLabel(item.wishlistGroup)} · ${WISHLIST_CATEGORIES[item.category]} #${item.rank}`));
      card.appendChild(top);
      card.appendChild(element('p', 'contribution-meta', isPublicWishlistItem(item, Date.now())
        ? 'Visible to the general public now.'
        : item.perishable ? 'Perishable item.' : 'Private to you for seven days, then visible to the general public.'));
      const actions = element('div', 'wishlist-item-actions');
      if (item.exampleUrl) {
        const link = element('a', 'text-link', 'Example link');
        link.href = item.exampleUrl;
        link.rel = 'noopener noreferrer';
        link.target = '_blank';
        actions.appendChild(link);
      }
      const remove = element('button', 'button button--ghost button--tiny', 'Remove');
      remove.type = 'button';
      remove.dataset.wishlistRemove = item.id;
      actions.appendChild(remove);
      card.appendChild(actions);
      wishlistOwned.appendChild(card);
    });
  }

  function renderPublicWishlist(items) {
    if (!wishlistPublic) return;
    wishlistPublic.replaceChildren();
    const now = Date.now();
    const publicItems = items
      .filter((item) => isPublicWishlistItem(item, now))
      .sort((a, b) => {
        const order = { need: 0, want: 1, nice: 2 };
        return order[a.category] - order[b.category] || a.rank - b.rank || a.title.localeCompare(b.title);
      });
    if (!publicItems.length) {
      wishlistPublic.appendChild(element('p', 'field-hint', 'No items are public yet. Need items stay with the member who listed them for seven days unless marked perishable.'));
      return;
    }
    const { sorted } = wishlistTallies(items);
    publicItems.slice(0, 12).forEach((item) => {
      const card = element('article', 'wishlist-item');
      const top = element('div', 'wishlist-item-top');
      top.appendChild(element('strong', '', item.title));
      top.appendChild(element('span', 'badge badge--soft', WISHLIST_CATEGORIES[item.category]));
      card.appendChild(top);
      const tally = sorted.find((entry) => entry.wishlistGroup === item.wishlistGroup && entry.category === item.category && entry.title.toLowerCase() === item.title.toLowerCase());
      card.appendChild(element('p', 'contribution-meta', `${wishlistGroupLabel(item.wishlistGroup)} · ${WISHLIST_CATEGORIES[item.category]} #${item.rank}${tally ? ` · ${tally.count} list${tally.count === 1 ? '' : 's'}` : ''} · saved ${formatDate(item.createdAt)}${item.perishable ? ' · perishable' : ''}`));
      if (item.exampleUrl) {
        const link = element('a', 'text-link', 'Example link');
        link.href = item.exampleUrl;
        link.rel = 'noopener noreferrer';
        link.target = '_blank';
        card.appendChild(link);
      }
      wishlistPublic.appendChild(card);
    });
    if (publicItems.length > 12) {
      wishlistPublic.appendChild(element('p', 'field-hint', `Showing 12 of ${publicItems.length} public items on this device.`));
    }
  }

  function renderWishlist() {
    const items = wishlistItems();
    const member = getMember();
    renderOwnedWishlist(items, member);
    renderWishlistCycle(items);
    renderPublicWishlist(items);
  }

  function syncWishlistUI() {
    const member = getMember();
    if (wishlistStatus) {
      wishlistStatus.textContent = member
        ? `Signed in as ${member.name}. Your wishlist is saved only on this device and never appears on a public resume.`
        : 'Sign in with your member or representative username to build a local wishlist. Everyone can still see items that have become public.';
    }
    if (wishlistGate) wishlistGate.hidden = Boolean(member);
    if (wishlistForm) wishlistForm.hidden = !member;
    renderWishlist();
  }

  if (wishlistOptions) {
    WISHLIST_CATALOG.forEach((label) => {
      const option = document.createElement('option');
      option.value = label;
      wishlistOptions.appendChild(option);
    });
  }

  if (wishlistSearch) wishlistSearch.addEventListener('input', renderWishlistSuggestions);

  if (wishlistForm) {
    wishlistForm.addEventListener('submit', (event) => {
      event.preventDefault();
      state = loadState();
      if (wishlistError) wishlistError.hidden = true;
      const member = getMember();
      if (!member) {
        if (wishlistError) {
          wishlistError.textContent = 'Sign in before saving a wishlist item.';
          wishlistError.hidden = false;
        }
        return;
      }
      if (!wishlistForm.reportValidity()) return;
      const title = cleanText(wishlistTitle ? wishlistTitle.value : '', 120);
      const exampleUrl = cleanExampleUrl(wishlistUrl ? wishlistUrl.value : '');
      const rawUrl = cleanText(wishlistUrl ? wishlistUrl.value : '', 500);
      const category = cleanText(wishlistCategory ? wishlistCategory.value : '', 20);
      const groupKey = cleanText(wishlistGroup ? wishlistGroup.value : '', 20);
      const rank = Math.round(Number(wishlistRank ? wishlistRank.value : 10));
      if (!title) {
        if (wishlistError) {
          wishlistError.textContent = 'Enter an item before saving it.';
          wishlistError.hidden = false;
        }
        if (wishlistTitle) wishlistTitle.focus();
        return;
      }
      if (rawUrl && !exampleUrl) {
        if (wishlistError) {
          wishlistError.textContent = 'Example links must start with http:// or https://.';
          wishlistError.hidden = false;
        }
        if (wishlistUrl) wishlistUrl.focus();
        return;
      }
      if (!Object.prototype.hasOwnProperty.call(WISHLIST_CATEGORIES, category)) {
        if (wishlistError) {
          wishlistError.textContent = 'Choose need, want, or nice to have.';
          wishlistError.hidden = false;
        }
        return;
      }
      if (!WISHLIST_GROUPS.some((group) => group.key === groupKey)) {
        if (wishlistError) {
          wishlistError.textContent = 'Choose one of the six wishlist groups.';
          wishlistError.hidden = false;
        }
        return;
      }
      if (!Number.isFinite(rank) || rank < 1 || rank > 20) {
        if (wishlistError) {
          wishlistError.textContent = 'Use a priority number from 1 to 20.';
          wishlistError.hidden = false;
        }
        if (wishlistRank) wishlistRank.focus();
        return;
      }

      const item = normalizeWishlistItem({
        id: `wish-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        memberId: member.memberId,
        memberName: member.name || '',
        title,
        category,
        wishlistGroup: groupKey,
        rank,
        exampleUrl,
        perishable: Boolean(wishlistPerishable && wishlistPerishable.checked),
        createdAt: new Date().toISOString(),
        status: 'active'
      });
      state.wishlistItems = wishlistItems();
      state.wishlistItems.unshift(item);
      state.wishlistItems = state.wishlistItems.slice(0, MAX_WISHLIST_ITEMS);
      if (!saveState()) {
        if (wishlistError) {
          wishlistError.textContent = 'Local storage is blocked, so this item could not be saved. Nothing was transmitted.';
          wishlistError.hidden = false;
        }
        return;
      }
      wishlistForm.reset();
      if (wishlistSearch) wishlistSearch.value = '';
      if (wishlistSuggestions) wishlistSuggestions.replaceChildren();
      syncWishlistUI();
      announce(`${title} added to your local ${WISHLIST_CATEGORIES[category].toLowerCase()} wishlist at priority ${rank}.`);
    });
  }

  if (wishlistOwned) {
    wishlistOwned.addEventListener('click', (event) => {
      const trigger = event.target.closest('[data-wishlist-remove]');
      if (!trigger) return;
      const member = getMember();
      if (!member) return;
      state = loadState();
      state.wishlistItems = wishlistItems().filter((item) =>
        !(item.id === trigger.dataset.wishlistRemove && item.memberId === member.memberId));
      saveState();
      syncWishlistUI();
      announce('Item removed from your local wishlist.');
    });
  }

  document.addEventListener('unbought:reset', () => {
    state = loadState();
    hideReceipt();
    resetClearButton();
    syncMemberUI();
    updateStatus();
  });

  window.addEventListener('pagehide', resetClearButton);

  syncMemberUI();
  updateStatus();

  const intents = visibleIntents();
  if (intents.length) {
    showReceipt(intents[0], false);
  }
})();
