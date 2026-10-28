/**
 * search.js — RideCare Search Items page logic
 */
'use strict';

/* ── Helpers ─────────────────────────────────────────────── */
function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d} ${months[parseInt(m,10)-1]} ${y}`;
}

function highlightText(text, keyword) {
  if (!keyword.trim()) return escHtml(text);
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp('(' + escaped + ')', 'gi');
  return escHtml(text).replace(regex, '<mark>$1</mark>');
}

/* ── Build report card HTML ──────────────────────────────── */
function buildReportCard(r, keyword) {
  const isLost  = r.type === 'lost';
  const typeLabel = isLost ? 'Lost' : 'Found';
  const typeCls   = isLost ? 'badge-lost' : 'badge-found';
  const typeIcon  = isLost ? 'bi-search-heart' : 'bi-bag-check-fill';

  const hasContact = r.contact?.phone || r.contact?.email || r.contact?.name;

  return `
    <div class="report-card mb-3">
      <div class="d-flex flex-wrap align-items-start gap-2 mb-2">
        <span class="report-type-badge ${typeCls}"><i class="bi ${typeIcon}"></i> ${typeLabel}</span>
        <span class="status-badge status-${r.status}">${r.status}</span>
        <span class="badge bg-secondary-subtle text-secondary border">${escHtml(r.category)}</span>
        <span class="ms-auto text-muted small"><i class="bi bi-calendar3 me-1"></i>${formatDate(r.date)}</span>
      </div>
      <h6 class="fw-bold mb-1">${highlightText(r.name, keyword)}</h6>
      <p class="text-muted small mb-1"><i class="bi bi-geo-alt me-1"></i>${highlightText(r.location, keyword)}</p>
      <p class="mb-2 small" style="color:#555;">${highlightText(r.description, keyword)}</p>
      ${hasContact ? `
        <div class="rc-card bg-light border p-2 mt-2">
          <p class="small mb-1 fw-semibold"><i class="bi bi-person-lines-fill me-1 text-success"></i>Contact</p>
          ${r.contact.name  ? `<p class="small mb-0"><i class="bi bi-person me-1"></i>${escHtml(r.contact.name)}</p>` : ''}
          ${r.contact.phone ? `<p class="small mb-0"><i class="bi bi-telephone me-1"></i>${escHtml(r.contact.phone)}</p>` : ''}
          ${r.contact.email ? `<p class="small mb-0"><i class="bi bi-envelope me-1"></i>${escHtml(r.contact.email)}</p>` : ''}
          ${r.contact.method? `<p class="small mb-0"><i class="bi bi-chat-dots me-1"></i>Prefers: ${escHtml(r.contact.method)}</p>` : ''}
        </div>` : ''}
    </div>`;
}

/* ── Run search ──────────────────────────────────────────── */
async function runSearch() {
  const keyword  = document.getElementById('s-keyword').value;
  const type     = document.getElementById('s-type').value;
  const category = document.getElementById('s-category').value;
  const status   = document.getElementById('s-status').value;
  const date     = document.getElementById('s-date').value;
  const location = document.getElementById('s-location').value;
  const sortBy   = document.getElementById('s-sort').value;

  const container  = document.getElementById('search-results');
  const countBadge = document.getElementById('search-count');

  // Show loading state
  container.innerHTML = '<div class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm me-2"></div>Searching…</div>';

  try {
    let results = await Storage.searchReports({ keyword, type, category, status, date, location });

    // Sort
    if (sortBy === 'newest') {
      results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } else if (sortBy === 'oldest') {
      results.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    } else if (sortBy === 'name') {
      results.sort((a, b) => a.name.localeCompare(b.name));
    }

    countBadge.textContent = results.length;

    if (!results.length) {
      const hasFilters = keyword || type || category || status || date || location;
      container.innerHTML = `
        <div class="text-center py-5 text-muted">
          <i class="bi bi-inbox display-4 d-block mb-3"></i>
          <p>${hasFilters ? 'No reports match your filters.' : 'No reports have been submitted yet.'}</p>
          ${!hasFilters ? `<div class="d-flex gap-3 justify-content-center">
            <a href="report-lost.html" class="btn btn-warning btn-sm">Report Lost Item</a>
            <a href="report-found.html" class="btn btn-success btn-sm">Report Found Item</a>
          </div>` : ''}
        </div>`;
      return;
    }

    container.innerHTML = results.map(r => buildReportCard(r, keyword)).join('');
  } catch (err) {
    countBadge.textContent = '0';
    container.innerHTML = `
      <div class="text-center py-5 text-danger">
        <i class="bi bi-exclamation-triangle display-4 d-block mb-3"></i>
        <p>Failed to load search results. Is the server running?</p>
      </div>`;
    console.error('Search error:', err);
  }
}

/* ── Event listeners ─────────────────────────────────────── */
document.getElementById('btn-search').addEventListener('click', runSearch);

document.getElementById('btn-clear-search').addEventListener('click', () => {
  document.getElementById('s-keyword').value  = '';
  document.getElementById('s-type').value     = '';
  document.getElementById('s-category').value = '';
  document.getElementById('s-status').value   = '';
  document.getElementById('s-date').value     = '';
  document.getElementById('s-location').value = '';
  document.getElementById('s-sort').value     = 'newest';
  runSearch();
});

// Search on Enter key in keyword field
document.getElementById('s-keyword').addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); runSearch(); }
});

// Search on Enter key in location field
document.getElementById('s-location').addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); runSearch(); }
});

// Sort change triggers re-render
document.getElementById('s-sort').addEventListener('change', runSearch);

/* ── Init: show all reports on load ──────────────────────── */
runSearch();
