/* ==========================================================================
   Unbought — What's to Come waiting list
   Stores one planning-stage entry in this browser. No network requests.
   ========================================================================== */
(function () {
  'use strict';

  const STORAGE_KEY = 'unbought:waitlist:v1';
  const INTEREST_LABELS = {
    academy: 'Unbought Academy',
    land: 'Land trust & housing',
    donations: 'Donations & trust formation',
    labor: 'Free labor & services',
    goods: 'Free goods'
  };

  const form = document.getElementById('waitlist-form');
  if (!form) return;

  const receipt = document.getElementById('waitlist-receipt');
  const receiptName = document.getElementById('waitlist-receipt-name');
  const receiptDetails = document.getElementById('waitlist-receipt-details');
  const receiptInterests = document.getElementById('waitlist-receipt-interests');
  const status = document.getElementById('waitlist-status');
  const errorBox = document.getElementById('waitlist-error');
  const editButton = document.getElementById('waitlist-edit');
  const withdrawButton = document.getElementById('waitlist-withdraw');
  const heading = document.getElementById('waitlist-title');
  const agreement = document.getElementById('waitlist-agreement');

  let saved = loadSaved();

  function clean(value, maxLength) {
    return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
  }

  function loadSaved() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      if (typeof parsed.name !== 'string' || typeof parsed.location !== 'string') return null;
      if (!Array.isArray(parsed.interests)) return null;
      return parsed;
    } catch (error) {
      return null;
    }
  }

  function save(entry) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
      return true;
    } catch (error) {
      return false;
    }
  }

  function clearSaved() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      // Storage may be blocked; the in-memory state still clears.
    }
  }

  function selectedInterests() {
    return Array.from(form.querySelectorAll('input[name="interests"]:checked')).map((input) => input.value);
  }

  function fillForm(entry) {
    form.elements.name.value = entry.name || '';
    form.elements.contact.value = entry.contact || '';
    form.elements.location.value = entry.location || '';
    form.elements.note.value = entry.note || '';
    form.querySelectorAll('input[name="interests"]').forEach((input) => {
      input.checked = entry.interests.includes(input.value);
    });
    if (agreement) agreement.checked = true;
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    try {
      return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
    } catch (error) {
      return date.toLocaleDateString();
    }
  }

  function renderReceipt() {
    if (!receipt || !saved) return;

    if (receiptName) receiptName.textContent = saved.name;
    if (receiptDetails) {
      const when = formatDate(saved.savedAt);
      receiptDetails.textContent = when
        ? `${saved.location} · saved ${when}`
        : saved.location;
    }
    if (receiptInterests) {
      receiptInterests.replaceChildren();
      saved.interests.forEach((value) => {
        const item = document.createElement('li');
        item.textContent = INTEREST_LABELS[value] || value;
        receiptInterests.appendChild(item);
      });
    }

    receipt.hidden = false;
    form.hidden = true;
    if (status) status.textContent = '';
    receipt.focus({ preventScroll: true });
  }

  function showForm(options = {}) {
    if (receipt) receipt.hidden = true;
    form.hidden = false;

    if (saved && options.fill !== false) fillForm(saved);

    if (options.focus) {
      const target = heading || form.querySelector('input, select, textarea, button');
      if (target) {
        if (target === heading) heading.tabIndex = -1;
        target.focus({ preventScroll: true });
      }
      const section = document.getElementById('waitlist');
      if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function announce(message) {
    const live = document.getElementById('live-region');
    if (live) live.textContent = message;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (errorBox) errorBox.hidden = true;
    if (!form.reportValidity()) return;

    const interests = selectedInterests();
    if (!interests.length) {
      if (errorBox) {
        errorBox.textContent = 'Choose at least one part of Unbought you want to hear about.';
        errorBox.hidden = false;
      }
      const firstInterest = form.querySelector('input[name="interests"]');
      if (firstInterest) firstInterest.focus();
      return;
    }

    if (!agreement || !agreement.checked) {
      if (errorBox) {
        errorBox.textContent = 'Please confirm that you understand this is a planning-stage waiting list.';
        errorBox.hidden = false;
      }
      if (agreement) agreement.focus();
      return;
    }

    const entry = {
      name: clean(form.elements.name.value, 60),
      contact: clean(form.elements.contact.value, 120),
      location: clean(form.elements.location.value, 80),
      interests,
      note: clean(form.elements.note.value, 400),
      savedAt: new Date().toISOString()
    };

    if (!entry.name || !entry.contact || !entry.location) return;

    if (!save(entry)) {
      if (errorBox) {
        errorBox.textContent = 'This browser blocked local storage, so the entry could not be saved. Nothing was transmitted.';
        errorBox.hidden = false;
      }
      return;
    }

    saved = entry;
    renderReceipt();
    announce(`Waiting list entry saved for ${entry.name}. It stays in this browser.`);
  });

  if (editButton) {
    editButton.addEventListener('click', () => showForm({ focus: true }));
  }

  if (withdrawButton) {
    withdrawButton.addEventListener('click', () => {
      saved = null;
      clearSaved();
      form.reset();
      if (errorBox) errorBox.hidden = true;
      showForm({ focus: true });
      if (status) status.textContent = 'Your waiting list entry was removed from this browser.';
      announce('Waiting list entry removed from this browser.');
    });
  }

  // Cards for the Academy and Land Trust can add themselves to the list.
  document.querySelectorAll('[data-waitlist-interest]').forEach((button) => {
    button.addEventListener('click', () => {
      const value = button.dataset.waitlistInterest;
      if (value) {
        const input = form.querySelector(`input[name="interests"][value="${value}"]`);
        if (input) input.checked = true;
      }
      if (receipt && !receipt.hidden) showForm({ fill: false });
      if (status) status.textContent = 'Added to the form below. Finish your details to join the waiting list.';
      showForm({ focus: true, fill: false });
    });
  });

  document.addEventListener('unbought:reset', () => {
    saved = null;
    clearSaved();
    form.reset();
    if (errorBox) errorBox.hidden = true;
    if (status) status.textContent = '';
    showForm();
  });

  if (saved) {
    fillForm(saved);
    renderReceipt();
  } else {
    showForm();
  }
})();
