/**
 * report-found.js — RideCare Report Found Item page logic
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
const descEl    = document.getElementById('found-desc');
const descCount = document.getElementById('found-desc-count');
descEl.addEventListener('input', () => {
  descCount.textContent = descEl.value.length;
});

/* ── Set default date to today ───────────────────────────── */
const dateInput = document.getElementById('found-date');
dateInput.value = new Date().toISOString().slice(0, 10);
dateInput.max   = new Date().toISOString().slice(0, 10);

/* ── Form submit ─────────────────────────────────────────── */
const form       = document.getElementById('found-form');
const successMsg = document.getElementById('found-success');
const errorMsg   = document.getElementById('found-error');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  successMsg.classList.add('d-none');
  errorMsg.classList.add('d-none');

  const fields = [
    ['found-name','err-found-name'],
    ['found-category','err-found-category'],
    ['found-date','err-found-date'],
    ['found-location','err-found-location'],
    ['found-desc','err-found-desc'],
    ['found-contact-phone','err-found-phone'],
    ['found-contact-email','err-found-email']
  ];
  fields.forEach(([inp, err]) => clearInvalid(inp, err));

  const name    = document.getElementById('found-name').value.trim();
  const category= document.getElementById('found-category').value;
  const date    = document.getElementById('found-date').value;
  const location= document.getElementById('found-location').value.trim();
  const desc    = document.getElementById('found-desc').value.trim();
  const cName   = document.getElementById('found-contact-name').value.trim();
  const cPhone  = document.getElementById('found-contact-phone').value.trim();
  const cEmail  = document.getElementById('found-contact-email').value.trim();
  const cMethod = document.getElementById('found-contact-method').value;

  let valid = true;

  if (!name)     { setInvalid('found-name',     'err-found-name',     'Please enter the item name.');                   valid = false; }
  if (!category) { setInvalid('found-category', 'err-found-category', 'Please select a category.');                    valid = false; }
  if (!date)     { setInvalid('found-date',      'err-found-date',     'Please enter the date you found the item.');    valid = false; }
  if (!location) { setInvalid('found-location',  'err-found-location', 'Please enter the location where you found it.'); valid = false; }
  if (!desc)     { setInvalid('found-desc',       'err-found-desc',    'Please describe the item.');                    valid = false; }
  if (cPhone && !isValidPhone(cPhone)) {
    setInvalid('found-contact-phone', 'err-found-phone', 'Enter a valid 10-digit Indian mobile number (starts with 6–9).');
    valid = false;
  }
  if (cEmail && !isValidEmail(cEmail)) {
    setInvalid('found-contact-email', 'err-found-email', 'Enter a valid email address.');
    valid = false;
  }

  if (!valid) {
    form.querySelector('.is-invalid')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  try {
    const report = await Storage.addReport({
      type: 'found',
      name, category, date, location, description: desc,
      contact: { name: cName, phone: cPhone, email: cEmail, method: cMethod }
    });

    successMsg.innerHTML = `
      <strong><i class="bi bi-check-circle-fill me-1"></i>Report submitted!</strong><br>
      Found item report for <strong>${escHtml(report.name)}</strong> has been saved. Thank you for helping!
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
