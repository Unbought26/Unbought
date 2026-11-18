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

  const dialog = document.getElementById('waitlist-dialog');
  const form = document.getElementById('waitlist-form');
  if (!form) return;

  const receipt = document.getElementById('waitlist-receipt');
  const receiptName = document.getElementById('waitlist-receipt-name');
  const receiptDetails = document.getElementById('waitlist-receipt-details');
  const receiptInterests = document.getElementById('waitlist-receipt-interests');
  const dialogStatus = document.getElementById('waitlist-status');
  const inlineStatus = document.getElementById('waitlist-inline-status');
  const errorBox = document.getElementById('waitlist-error');
  const editButton = document.getElementById('waitlist-edit');
  const withdrawButton = document.getElementById('waitlist-withdraw');
  const inlineEditButton = document.getElementById('waitlist-inline-edit');
  const inlineWithdrawButton = document.getElementById('waitlist-inline-withdraw');
  const openButton = document.getElementById('waitlist-open');
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

  function setStatus(message) {
    if (dialogStatus) dialogStatus.textContent = message;
    if (inlineStatus) inlineStatus.textContent = message;
  }

  function syncEntryActions() {
    const hasEntry = Boolean(saved);
    [editButton, inlineEditButton].forEach((button) => {
      if (button) button.hidden = !hasEntry;
    });
    [withdrawButton, inlineWithdrawButton].forEach((button) => {
      if (button) button.hidden = !hasEntry;
    });
    if (openButton) {
      const label = openButton.querySelector('[data-waitlist-label]') || openButton;
      label.textContent = hasEntry ? 'View my entry' : 'Join the waiting list';
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
    syncEntryActions();
    setStatus(`You’re on the waiting list, ${saved.name}. Your entry stays in this browser.`);
  }

  function showForm(options = {}) {
    if (receipt) receipt.hidden = true;
    form.hidden = false;

    if (saved && options.fill !== false) fillForm(saved);

    if (options.focus && dialog && dialog.open) focusDialog();
  }

  function announce(message) {
    const live = document.getElementById('live-region');
    if (live) live.textContent = message;
  }

  function focusDialog() {
    if (!dialog || !dialog.open) return;
    const target = !form.hidden
      ? (form.querySelector('input:not([type="checkbox"]), textarea') || form.querySelector('button'))
      : receipt;
    if (target && typeof target.focus === 'function') target.focus({ preventScroll: true });
  }

  function openWaitlistDialog(options = {}) {
    if (!dialog) return;

    if (errorBox) {
      errorBox.textContent = '';
      errorBox.hidden = true;
    }

    if (options.interest) {
      const input = form.querySelector(`input[name="interests"][value="${options.interest}"]`);
      if (input) input.checked = true;
    }

    if (options.edit || !saved) {
      showForm({ fill: options.fill !== false, focus: false });
    } else {
      renderReceipt();
    }

    if (!dialog.open) {
      if (typeof dialog.showModal === 'function') {
        dialog.showModal();
      } else {
        dialog.setAttribute('open', '');
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
      }
      document.body.classList.add('dialog-open');
    }

    window.requestAnimationFrame(focusDialog);
  }

  function editEntry() {
    openWaitlistDialog({ edit: true });
  }

  function withdrawEntry() {
    saved = null;
    clearSaved();
    form.reset();
    if (errorBox) {
      errorBox.textContent = '';
      errorBox.hidden = true;
    }
    syncEntryActions();
    showForm({ fill: false, focus: false });
    setStatus('Your waiting list entry was removed from this browser.');
    announce('Waiting list entry removed from this browser.');
    if (dialog && dialog.open) window.requestAnimationFrame(focusDialog);
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

  [editButton, inlineEditButton].forEach((button) => {
    if (button) button.addEventListener('click', editEntry);
  });

  [withdrawButton, inlineWithdrawButton].forEach((button) => {
    if (button) button.addEventListener('click', withdrawEntry);
  });

  document.querySelectorAll('[data-waitlist-trigger]').forEach((trigger) => {
    trigger.addEventListener('click', (event) => {
      event.preventDefault();
      openWaitlistDialog();
    });
  });

  // Cards for the Academy and Land Trust can add themselves to the list.
  document.querySelectorAll('[data-waitlist-interest]').forEach((button) => {
    button.addEventListener('click', () => {
      const value = button.dataset.waitlistInterest;
      openWaitlistDialog({ interest: value, edit: true, fill: false });
      setStatus(value === 'land'
        ? 'Added to the form. Finish your details to record your land inquiry locally.'
        : 'Added to the form. Finish your details to join the waiting list.');
    });
  });

  document.addEventListener('unbought:reset', () => {
    saved = null;
    clearSaved();
    form.reset();
    if (errorBox) {
      errorBox.textContent = '';
      errorBox.hidden = true;
    }
    syncEntryActions();
    setStatus('Stored only on this device. Nothing is transmitted.');
    showForm();
  });

  syncEntryActions();
  if (saved) {
    fillForm(saved);
    renderReceipt();
  } else {
    showForm();
  }
})();
