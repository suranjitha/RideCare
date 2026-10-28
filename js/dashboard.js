/**
 * dashboard.js — RideCare Dashboard page logic
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

/* ── Render ──────────────────────────────────────────────── */
async function renderDashboard() {
  try {
    const today  = todayStr();
    const data   = await Storage.getDashboardSummary();

    const target    = data.dailyTarget;
    const earned    = data.todayEarned;
    const remaining = Math.max(0, target - earned);
    const pct       = target > 0 ? Math.min(100, Math.round((earned / target) * 100)) : 0;

    // Weekly total (still need to fetch separately)
    const weekly     = await Storage.getWeeklyEarnings(today);
    const weeklyTotal = weekly.reduce((s, d) => s + d.total, 0);

    // Earnings cards
    document.getElementById('dash-today-earnings').textContent = fmtRupee(earned);
    document.getElementById('dash-target').textContent          = fmtRupee(target);
    document.getElementById('dash-remaining').textContent       = fmtRupee(remaining);
    document.getElementById('dash-weekly').textContent          = fmtRupee(weeklyTotal);

    // Progress bar
    const bar   = document.getElementById('dash-progress-bar');
    const pctEl = document.getElementById('dash-progress-pct');
    bar.style.width = pct + '%';
    bar.setAttribute('aria-valuenow', pct);
    pctEl.textContent = pct + '%';
    if (pct >= 100) {
      bar.classList.remove('bg-success');
      bar.classList.add('bg-warning');
      pctEl.className = 'badge bg-warning text-dark';
      pctEl.textContent = '🎉 Target Met!';
    } else {
      bar.classList.add('bg-success');
      bar.classList.remove('bg-warning');
      pctEl.className = 'badge bg-success';
    }

    // L&F summary
    const summary = data.reports;
    document.getElementById('dash-missing').textContent       = summary.missing;
    document.getElementById('dash-found-count').textContent   = summary.found;
    document.getElementById('dash-returned').textContent      = summary.returned;
    document.getElementById('dash-total-reports').textContent = summary.total;

    // Recent reports
    renderRecentReports(summary.recent);

  } catch (err) {
    console.error('Dashboard load error:', err);
  }
}

function renderRecentReports(reports) {
  const el = document.getElementById('dash-recent-reports');
  if (!reports || !reports.length) {
    el.innerHTML = '<p class="text-muted text-center py-3">No reports yet. <a href="report-lost.html">Report a lost item</a> or <a href="report-found.html">report a found item</a>.</p>';
    return;
  }

  el.innerHTML = reports.map(r => {
    const typeLabel = r.type === 'lost' ? 'Lost' : 'Found';
    const typeCls   = r.type === 'lost' ? 'badge-lost' : 'badge-found';
    const icon      = r.type === 'lost' ? 'bi-search-heart' : 'bi-bag-check-fill';
    const dateDisp  = formatDate(r.date);
    return `
      <div class="d-flex align-items-start gap-3 py-2 border-bottom">
        <span class="report-type-badge ${typeCls}"><i class="bi ${icon}"></i> ${typeLabel}</span>
        <div class="flex-grow-1 min-w-0">
          <div class="fw-semibold text-truncate">${escHtml(r.name)}</div>
          <div class="text-muted small">${escHtml(r.category)} &bull; ${escHtml(r.location)} &bull; ${dateDisp}</div>
        </div>
        <span class="status-badge status-${r.status}">${r.status}</span>
      </div>`;
  }).join('') + `<div class="text-end mt-2"><a href="search.html" class="btn btn-sm btn-outline-success">View all reports <i class="bi bi-arrow-right"></i></a></div>`;
}

/* ── Init ────────────────────────────────────────────────── */
renderDashboard();
