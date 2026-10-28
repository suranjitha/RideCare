/**
 * earnings.js — RideCare Daily Earnings page logic
 */
'use strict';

/* ── Helpers ─────────────────────────────────────────────── */
function fmtRupee(n) {
  return '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d} ${months[parseInt(m,10)-1]} ${y}`;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

/* ── State ───────────────────────────────────────────────── */
let pendingDeleteId = null;
const deleteModal = new bootstrap.Modal(document.getElementById('deleteEarnModal'));

/* ── Set Target ──────────────────────────────────────────── */
const targetInput   = document.getElementById('daily-target-input');
const btnSetTarget  = document.getElementById('btn-set-target');
const targetSuccess = document.getElementById('target-success');
const targetErrorEl = document.getElementById('target-error');

async function loadTarget() {
  try {
    const t = await Storage.getDailyTarget();
    if (t > 0) targetInput.value = t;
  } catch (err) {
    console.error('Load target error:', err);
  }
}

btnSetTarget.addEventListener('click', async () => {
  targetInput.classList.remove('is-invalid');
  targetErrorEl.textContent = '';
  targetSuccess.classList.add('d-none');

  const val = parseFloat(targetInput.value);
  if (isNaN(val) || val < 0) {
    targetInput.classList.add('is-invalid');
    targetErrorEl.textContent = 'Please enter a valid target amount (0 or more).';
    return;
  }
  try {
    await Storage.setDailyTarget(val);
    targetSuccess.textContent = `Daily target set to ${fmtRupee(val)}.`;
    targetSuccess.classList.remove('d-none');
    await renderSummary();
    await renderWeekly();
    setTimeout(() => targetSuccess.classList.add('d-none'), 3000);
  } catch (err) {
    targetErrorEl.textContent = 'Failed to save target. Please try again.';
    targetInput.classList.add('is-invalid');
    console.error(err);
  }
});

/* ── Add Earning ─────────────────────────────────────────── */
const earnDateInput   = document.getElementById('earn-date');
const earnAmountInput = document.getElementById('earn-amount');
const earnNoteInput   = document.getElementById('earn-note');
const btnAddEarning   = document.getElementById('btn-add-earning');
const earnSuccess     = document.getElementById('earn-success');

// Default to today
earnDateInput.value = todayStr();
earnDateInput.max = todayStr();

btnAddEarning.addEventListener('click', async () => {
  // Clear errors
  ['earn-date-error','earn-amount-error'].forEach(id => {
    document.getElementById(id).textContent = '';
  });
  earnDateInput.classList.remove('is-invalid');
  earnAmountInput.classList.remove('is-invalid');
  earnSuccess.classList.add('d-none');

  let valid = true;

  const date = earnDateInput.value;
  if (!date) {
    earnDateInput.classList.add('is-invalid');
    document.getElementById('earn-date-error').textContent = 'Please select a date.';
    valid = false;
  }

  const amount = parseFloat(earnAmountInput.value);
  if (isNaN(amount) || amount <= 0) {
    earnAmountInput.classList.add('is-invalid');
    document.getElementById('earn-amount-error').textContent = 'Please enter a valid amount greater than 0.';
    valid = false;
  }

  if (!valid) return;

  try {
    await Storage.addEarning({ date, amount, note: earnNoteInput.value });
    earnAmountInput.value = '';
    earnNoteInput.value   = '';
    earnSuccess.textContent = `Added ${fmtRupee(amount)} for ${formatDate(date)}.`;
    earnSuccess.classList.remove('d-none');
    setTimeout(() => earnSuccess.classList.add('d-none'), 3000);

    await renderSummary();
    await renderWeekly();
    await renderEntryList(historyDatePicker.value || todayStr());
  } catch (err) {
    earnAmountInput.classList.add('is-invalid');
    document.getElementById('earn-amount-error').textContent = 'Failed to save. Please try again.';
    console.error(err);
  }
});

/* ── Summary ─────────────────────────────────────────────── */
async function renderSummary() {
  try {
    const today     = todayStr();
    const target    = await Storage.getDailyTarget();
    const earned    = await Storage.getTotalForDate(today);
    const remaining = Math.max(0, target - earned);
    const pct       = target > 0 ? Math.min(100, Math.round((earned / target) * 100)) : 0;

    document.getElementById('earn-today-total').textContent    = fmtRupee(earned);
    document.getElementById('earn-target-disp').textContent    = fmtRupee(target);
    document.getElementById('earn-remaining-disp').textContent = fmtRupee(remaining);

    const bar   = document.getElementById('earn-progress-bar');
    const pctEl = document.getElementById('earn-progress-pct');
    bar.style.width = pct + '%';

    if (pct >= 100) {
      bar.className = 'progress-bar bg-warning progress-bar-striped';
      pctEl.className = 'badge bg-warning text-dark';
      pctEl.textContent = '🎉 Target Met!';
    } else {
      bar.className = 'progress-bar bg-success progress-bar-striped';
      pctEl.className = 'badge bg-success';
      pctEl.textContent = pct + '%';
    }

    const todayLabel = document.getElementById('today-date-label');
    todayLabel.textContent = formatDate(today);
  } catch (err) {
    console.error('Summary render error:', err);
  }
}

/* ── Weekly bar chart ────────────────────────────────────── */
async function renderWeekly() {
  try {
    const today  = todayStr();
    const data   = await Storage.getWeeklyEarnings(today);
    const maxVal = Math.max(...data.map(d => d.total), 1);
    const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

    const barsEl = document.getElementById('weekly-bars');
    barsEl.innerHTML = '';

    let weekTotal = 0;
    let daysWithEarn = 0;

    data.forEach(d => {
      const dayName   = DAY_NAMES[new Date(d.date + 'T00:00:00').getDay()];
      const heightPct = maxVal > 0 ? Math.round((d.total / maxVal) * 100) : 0;
      const isToday   = d.date === today;
      weekTotal += d.total;
      if (d.total > 0) daysWithEarn++;

      const wrap = document.createElement('div');
      wrap.className = 'weekly-bar-wrap';
      wrap.style.flex = '1';
      wrap.style.minWidth = '0';
      wrap.title = `${formatDate(d.date)}: ${fmtRupee(d.total)}`;

      wrap.innerHTML = `
        <div class="weekly-bar-amount">${d.total > 0 ? fmtRupee(d.total).replace('₹','') : ''}</div>
        <div class="weekly-bar-outer" style="flex:1; max-width:36px; margin:0 auto; background:#E8F5E9; border-radius:6px 6px 0 0; display:flex; align-items:flex-end; width:100%;">
          <div class="weekly-bar-inner${isToday?' is-today':''}" style="width:100%; height:${heightPct}%; min-height:4px; border-radius:6px 6px 0 0; background:${isToday?'var(--rc-amber)':'var(--rc-green)'};"></div>
        </div>
        <div class="weekly-bar-label${isToday?' fw-bold text-warning':''}">${dayName}${isToday?' ★':''}</div>`;
      barsEl.appendChild(wrap);
    });

    document.getElementById('weekly-total').textContent = fmtRupee(weekTotal);
    document.getElementById('weekly-avg').textContent   = daysWithEarn > 0 ? fmtRupee(weekTotal / daysWithEarn) : '₹0';
  } catch (err) {
    console.error('Weekly render error:', err);
  }
}

/* ── Entry list ──────────────────────────────────────────── */
const historyDatePicker = document.getElementById('history-date-picker');
historyDatePicker.value = todayStr();
historyDatePicker.max   = todayStr();

document.getElementById('history-date-label').textContent = formatDate(todayStr());

historyDatePicker.addEventListener('change', async () => {
  const dateStr = historyDatePicker.value || todayStr();
  document.getElementById('history-date-label').textContent = formatDate(dateStr);
  await renderEntryList(dateStr);
});

async function renderEntryList(dateStr) {
  try {
    const entries = await Storage.getEarningsForDate(dateStr);
    const el = document.getElementById('entry-list');

    if (!entries.length) {
      el.innerHTML = '<p class="text-muted text-center py-3">No entries for this date.</p>';
      return;
    }

    // Sort newest first
    const sorted = [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    el.innerHTML = sorted.map(e => `
      <div class="earn-entry-item" data-id="${e.id}">
        <span class="earn-entry-amount">${fmtRupee(e.amount)}</span>
        <span class="earn-entry-note">${e.note ? escHtml(e.note) : '<em class="text-muted">No note</em>'}</span>
        <button class="btn btn-sm btn-outline-danger ms-auto btn-delete-earn" data-id="${e.id}" title="Delete entry">
          <i class="bi bi-trash3"></i>
        </button>
      </div>`).join('');

    // Total row
    const total = entries.reduce((s, e) => s + e.amount, 0);
    el.innerHTML += `<div class="d-flex justify-content-between pt-2 mt-1 border-top fw-bold">
      <span>Total for ${formatDate(dateStr)}</span>
      <span class="text-success">${fmtRupee(total)}</span>
    </div>`;

    // Delete buttons
    el.querySelectorAll('.btn-delete-earn').forEach(btn => {
      btn.addEventListener('click', () => {
        pendingDeleteId = btn.dataset.id;
        deleteModal.show();
      });
    });
  } catch (err) {
    console.error('Entry list error:', err);
    document.getElementById('entry-list').innerHTML = '<p class="text-danger text-center py-3">Failed to load entries.</p>';
  }
}

/* ── Delete confirm ──────────────────────────────────────── */
document.getElementById('confirm-delete-earn').addEventListener('click', async () => {
  if (pendingDeleteId) {
    try {
      await Storage.deleteEarning(pendingDeleteId);
      pendingDeleteId = null;
      deleteModal.hide();
      await renderSummary();
      await renderWeekly();
      await renderEntryList(historyDatePicker.value || todayStr());
    } catch (err) {
      console.error('Delete error:', err);
    }
  }
});

/* ── Init ────────────────────────────────────────────────── */
(async () => {
  await loadTarget();
  await renderSummary();
  await renderWeekly();
  await renderEntryList(todayStr());
})();
