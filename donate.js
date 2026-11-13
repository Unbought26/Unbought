/* ==========================================================================
   UNBOUGHT — donate.js
   Local-only donation intents for the prototype.

   No network calls. No payment fields. No payment processing. The form saves
   a non-binding intent in this browser so the flow can be tested before a real
   trust, payment provider, and legal/tax structure exist.
   ========================================================================== */
(() => {
  'use strict';

  const STORAGE_KEY = 'unbought:donation-intents:v1';
  const MAX_INTENTS = 20;

  const FREQUENCY_LABELS = Object.freeze({
    'one-time': 'One-time gift',
    monthly: 'Monthly gift',
    'pledge-later': 'Pledge when the trust opens'
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
  const liveRegion = document.getElementById('live-region');

  let intents = loadIntents();
  let clearArmed = false;
  let clearTimer = null;

  function cleanText(value, maxLength) {
    if (typeof value !== 'string') return '';
    return value.trim().slice(0, maxLength);
  }

  function isValidFrequency(value) {
    return Object.prototype.hasOwnProperty.call(FREQUENCY_LABELS, value);
  }

  function loadIntents() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((item) => (
          item &&
          typeof item === 'object' &&
          Number.isFinite(item.amount) &&
          item.amount >= 1 &&
          isValidFrequency(item.frequency) &&
          typeof item.savedAt === 'string'
        ))
        .slice(0, MAX_INTENTS)
        .map((item) => ({
          id: cleanText(item.id, 40),
          amount: Math.round(item.amount),
          frequency: item.frequency,
          name: cleanText(item.name, 60),
          note: cleanText(item.note, 280),
          savedAt: item.savedAt
        }));
    } catch (error) {
      return [];
    }
  }

  function saveIntents() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(intents.slice(0, MAX_INTENTS)));
      return true;
    } catch (error) {
      return false;
    }
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

  function updateStatus() {
    if (!statusBox) return;
    if (!intents.length) {
      statusBox.textContent = 'No donation intents saved in this browser yet.';
      return;
    }
    const total = intents.reduce((sum, item) => sum + item.amount, 0);
    statusBox.textContent = `${intents.length} donation intent${intents.length === 1 ? '' : 's'} saved in this browser · ${formatAmount(total)} intended. No money has moved.`;
  }

  function showReceipt(intent, shouldFocus) {
    if (!receipt || !receiptSummary || !receiptRef) return;

    receiptRef.textContent = intent.id ? `Reference ${intent.id}` : '';
    const name = intent.name ? ` for ${intent.name}` : '';
    receiptSummary.textContent = `${formatAmount(intent.amount)} · ${FREQUENCY_LABELS[intent.frequency]}${name} · saved ${formatDate(intent.savedAt)}.`;
    receipt.hidden = false;

    if (shouldFocus) {
      receipt.focus({ preventScroll: true });
      announce(`Donation intent for ${formatAmount(intent.amount)} saved locally. No payment was collected.`);
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

    if (!form.reportValidity()) return;

    const data = new FormData(form);
    const amount = Math.round(Number(data.get('amount')));
    const frequency = String(data.get('frequency') || '');
    const agreement = document.getElementById('donation-agreement');

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
      amount,
      frequency,
      name: cleanText(data.get('name'), 60),
      note: cleanText(data.get('note'), 280),
      savedAt: new Date().toISOString()
    };

    intents.unshift(intent);
    intents = intents.slice(0, MAX_INTENTS);

    if (!saveIntents()) {
      if (errorBox) {
        errorBox.textContent = 'Local storage is blocked, so this intent could not be saved. Nothing was transmitted.';
        errorBox.hidden = false;
      }
      return;
    }

    form.reset();
    resetClearButton();
    updateStatus();
    showReceipt(intent, true);
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
      if (!clearArmed) {
        clearArmed = true;
        clearButton.textContent = 'Click again to confirm';
        window.clearTimeout(clearTimer);
        clearTimer = window.setTimeout(resetClearButton, 5000);
        return;
      }

      intents = [];
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (error) {
        // The in-memory list is still cleared below.
      }
      hideReceipt();
      resetClearButton();
      updateStatus();
      announce('Saved donation intents were cleared from this browser.');
    });
  }

  document.addEventListener('unbought:reset', () => {
    intents = [];
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      // In-memory state is still cleared below.
    }
    hideReceipt();
    resetClearButton();
    updateStatus();
  });

  window.addEventListener('pagehide', resetClearButton);

  updateStatus();

  if (intents.length) {
    // Show the most recent intent on return visits, without stealing focus.
    showReceipt(intents[0], false);
  }
})();
