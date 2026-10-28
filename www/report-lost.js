/**
 * report-lost.js — RideCare Report Lost Item page logic
 */
'use strict';

/* ── Helpers ─────────────────────────────────────────────── */
function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function setInvalid(inputId, errId, msg) {
  const inp = document.getElementById(inputId);
  const err = document.getElementById(errId);
  if (inp) inp.classList.add('is-invalid');
  if (err) err.textContent = msg;
}

function clearInvalid(inputId, errId) {
  const inp = document.getElementById(inputId);
  const err = document.getElementById(errId);
  if (inp) inp.classList.remove('is-invalid');
  if (err) err.textContent = '';
}

function isValidPhone(phone) {
  return /^[6-9]\d{9}$/.test(phone);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/* ── Description char counter ────────────────────────────── */
const descEl    = document.getElementById('lost-desc');
const descCount = document.getElementById('lost-desc-count');
descEl.addEventListener('input', () => {
  descCount.textContent = descEl.value.length;
});

/* ── Set default date to today ───────────────────────────── */
const dateInput = document.getElementById('lost-date');
dateInput.value = new Date().toISOString().slice(0, 10);
dateInput.max   = new Date().toISOString().slice(0, 10);

/* ── Form submit ─────────────────────────────────────────── */
const form       = document.getElementById('lost-form');
const successMsg = document.getElementById('lost-success');
const errorMsg   = document.getElementById('lost-error');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  successMsg.classList.add('d-none');
  errorMsg.classList.add('d-none');

  // Clear previous errors
  ['lost-name','lost-category','lost-date','lost-location','lost-desc'].forEach((id, i) => {
    const errIds = ['err-lost-name','err-lost-category','err-lost-date','err-lost-location','err-lost-desc'];
    clearInvalid(id, errIds[i]);
  });
  clearInvalid('lost-contact-phone', 'err-lost-phone');
  clearInvalid('lost-contact-email', 'err-lost-email');

  const name     = document.getElementById('lost-name').value.trim();
  const category = document.getElementById('lost-category').value;
  const date     = document.getElementById('lost-date').value;
  const location = document.getElementById('lost-location').value.trim();
  const desc     = document.getElementById('lost-desc').value.trim();
  const cName    = document.getElementById('lost-contact-name').value.trim();
  const cPhone   = document.getElementById('lost-contact-phone').value.trim();
  const cEmail   = document.getElementById('lost-contact-email').value.trim();

  let valid = true;

  if (!name)     { setInvalid('lost-name',     'err-lost-name',     'Please enter the item name.');              valid = false; }
  if (!category) { setInvalid('lost-category', 'err-lost-category', 'Please select a category.');               valid = false; }
  if (!date)     { setInvalid('lost-date',      'err-lost-date',     'Please enter the date you lost the item.'); valid = false; }
  if (!location) { setInvalid('lost-location',  'err-lost-location', 'Please enter the approximate location.');  valid = false; }
  if (!desc)     { setInvalid('lost-desc',       'err-lost-desc',    'Please describe the item.');               valid = false; }
  if (cPhone && !isValidPhone(cPhone)) {
    setInvalid('lost-contact-phone', 'err-lost-phone', 'Enter a valid 10-digit Indian mobile number (starts with 6–9).');
    valid = false;
  }
  if (cEmail && !isValidEmail(cEmail)) {
    setInvalid('lost-contact-email', 'err-lost-email', 'Enter a valid email address.');
    valid = false;
  }

  if (!valid) {
    form.querySelector('.is-invalid')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  try {
    const report = await Storage.addReport({
      type: 'lost',
      name, category, date, location, description: desc,
      contact: { name: cName, phone: cPhone, email: cEmail, method: '' }
    });

    successMsg.innerHTML = `
      <strong><i class="bi bi-check-circle-fill me-1"></i>Report submitted!</strong><br>
      Your lost item report for <strong>${escHtml(report.name)}</strong> has been saved.
      <a href="my-reports.html" class="alert-link ms-2">View My Reports →</a>`;
    successMsg.classList.remove('d-none');

    form.reset();
    descCount.textContent = '0';
    dateInput.value = new Date().toISOString().slice(0, 10);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (err) {
    errorMsg.textContent = 'Failed to save report. Please try again.';
    errorMsg.classList.remove('d-none');
    console.error(err);
  }
});
