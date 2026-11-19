/* ==========================================================================
   UNBOUGHT — donate.js
   Local-only donation intents integrated with Unbought membership (prototype).

   No payment processing and no real email sending. Donation intents are saved in
   the shared local app state so members can track them in their account. Guest
   donors can provide an email for a future thank-you message (recorded locally).
   Contributions are also recorded in a DB-ready equity/contribution ledger shape.
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
  const liveRegion = document.getElementById('live-region');

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

  function defaultState() {
    return {
      pledge: null,
      track: null,
      trackDetails: {},
      listings: [],
      requests: [],
      inquiries: [],
      donationIntents: [],
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
    if (!Array.isArray(base.contributions)) base.contributions = [];

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

  function syncMemberUI() {
    const member = getMember();
    if (memberNote) {
      memberNote.hidden = false;
      memberNote.textContent = member
        ? `Signed in as ${member.name}. Your donation intents will be tracked in your account and recorded as contribution and stock value in this prototype.`
        : 'Donating without an account is welcome. If you provide an email, it is recorded locally for a future thank-you note; no email is sent in this prototype.';
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
    statusBox.textContent = `${intents.length} donation intent${intents.length === 1 ? '' : 's'} ${scope} · ${formatAmount(total)} intended. No money has moved.`;
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
      amount,
      hours: 0,
      profession: '',
      stateRegion: '',
      hourlyRate: 0,
      stockValue: amount,
      sourceId: intent.id,
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
