/**
 * my-reports.js — RideCare My Reports page logic
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

function isValidPhone(phone) { return /^[6-9]\d{9}$/.test(phone); }
function isValidEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }

/* ── State ───────────────────────────────────────────────── */
let activeFilter    = 'all';
let pendingDeleteId = null;

const editModal   = new bootstrap.Modal(document.getElementById('editReportModal'));
const deleteModal = new bootstrap.Modal(document.getElementById('deleteReportModal'));

/* ── Render list ─────────────────────────────────────────── */
async function renderList() {
  const keyword = document.getElementById('my-search').value.toLowerCase();
  const statusF = document.getElementById('my-status-filter').value;

  try {
    let reports = await Storage.getReports();

    // Type filter (tab)
    if (activeFilter !== 'all') {
      reports = reports.filter(r => r.type === activeFilter);
    }

    // Status filter
    if (statusF) {
      reports = reports.filter(r => r.status === statusF);
    }

    // Keyword filter
    if (keyword) {
      reports = reports.filter(r =>
        r.name.toLowerCase().includes(keyword) ||
        r.location.toLowerCase().includes(keyword) ||
        r.category.toLowerCase().includes(keyword) ||
        r.description.toLowerCase().includes(keyword)
      );
    }

    // Newest first
    reports.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const container = document.getElementById('my-reports-list');

    if (!reports.length) {
      const allReports = await Storage.getReports();
      if (allReports.length === 0) {
        container.innerHTML = `
          <div class="text-center py-5 text-muted">
            <i class="bi bi-journal-x display-4 d-block mb-3"></i>
            <p>You haven't submitted any reports yet.</p>
            <div class="d-flex gap-3 justify-content-center">
              <a href="report-lost.html" class="btn btn-warning btn-sm">Report Lost Item</a>
              <a href="report-found.html" class="btn btn-success btn-sm">Report Found Item</a>
            </div>
          </div>`;
      } else {
        container.innerHTML = `<div class="text-center py-4 text-muted"><i class="bi bi-filter-circle me-1"></i>No reports match the current filter.</div>`;
      }
      return;
    }

    container.innerHTML = reports.map(r => buildCard(r)).join('');

    // Bind buttons
    container.querySelectorAll('.btn-edit-report').forEach(btn => {
      btn.addEventListener('click', () => openEditModal(btn.dataset.id));
    });
    container.querySelectorAll('.btn-delete-report').forEach(btn => {
      btn.addEventListener('click', () => {
        pendingDeleteId = btn.dataset.id;
        deleteModal.show();
      });
    });
    container.querySelectorAll('.btn-status-update').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          await Storage.updateReport(btn.dataset.id, { status: btn.dataset.status });
          await renderList();
        } catch (err) {
          console.error('Status update error:', err);
        }
      });
    });
  } catch (err) {
    console.error('Report list error:', err);
    document.getElementById('my-reports-list').innerHTML =
      '<div class="text-center py-4 text-danger"><i class="bi bi-exclamation-triangle me-1"></i>Failed to load reports. Is the server running?</div>';
  }
}

function buildCard(r) {
  const isLost   = r.type === 'lost';
  const typeLbl  = isLost ? 'Lost' : 'Found';
  const typeCls  = isLost ? 'badge-lost' : 'badge-found';
  const typeIcon = isLost ? 'bi-search-heart' : 'bi-bag-check-fill';

  const statuses  = ['Missing','Found','Returned'];
  const statusBtns = statuses
    .filter(s => s !== r.status)
    .map(s => `<button class="btn btn-sm btn-outline-secondary btn-status-update" data-id="${r.id}" data-status="${s}">→ ${s}</button>`)
    .join('');

  return `
    <div class="report-card mb-3" id="card-${r.id}">
      <div class="d-flex flex-wrap align-items-start gap-2 mb-2">
        <span class="report-type-badge ${typeCls}"><i class="bi ${typeIcon}"></i> ${typeLbl}</span>
        <span class="status-badge status-${r.status}">${r.status}</span>
        <span class="badge bg-secondary-subtle text-secondary border">${escHtml(r.category)}</span>
        <span class="ms-auto text-muted small"><i class="bi bi-calendar3 me-1"></i>${formatDate(r.date)}</span>
      </div>
      <h6 class="fw-bold mb-1">${escHtml(r.name)}</h6>
      <p class="text-muted small mb-1"><i class="bi bi-geo-alt me-1"></i>${escHtml(r.location)}</p>
      <p class="mb-2 small" style="color:#555;">${escHtml(r.description)}</p>
      <div class="d-flex flex-wrap gap-2 align-items-center">
        <button class="btn btn-sm btn-success btn-edit-report" data-id="${r.id}">
          <i class="bi bi-pencil-fill me-1"></i>Edit
        </button>
        <button class="btn btn-sm btn-danger btn-delete-report" data-id="${r.id}">
          <i class="bi bi-trash3 me-1"></i>Delete
        </button>
        <span class="text-muted small ms-1">Update status:</span>
        ${statusBtns}
      </div>
      <div class="text-muted" style="font-size:0.7rem; margin-top:6px;">
        Reported: ${new Date(r.createdAt).toLocaleString('en-IN')}
        ${r.updatedAt !== r.createdAt ? ' &bull; Updated: ' + new Date(r.updatedAt).toLocaleString('en-IN') : ''}
      </div>
    </div>`;
}

/* ── Edit modal ──────────────────────────────────────────── */
const editDescEl    = document.getElementById('edit-desc');
const editDescCount = document.getElementById('edit-desc-count');
editDescEl.addEventListener('input', () => {
  editDescCount.textContent = editDescEl.value.length;
});

async function openEditModal(id) {
  try {
    const r = await Storage.getReportById(id);
    if (!r) return;

    document.getElementById('edit-id').value            = r.id;
    document.getElementById('edit-type').value          = r.type;
    document.getElementById('edit-name').value          = r.name;
    document.getElementById('edit-category').value      = r.category;
    document.getElementById('edit-date').value          = r.date;
    document.getElementById('edit-location').value      = r.location;
    document.getElementById('edit-desc').value          = r.description;
    document.getElementById('edit-status').value        = r.status;
    document.getElementById('edit-contact-name').value  = r.contact?.name  || '';
    document.getElementById('edit-contact-phone').value = r.contact?.phone || '';
    document.getElementById('edit-contact-email').value = r.contact?.email || '';
    editDescCount.textContent = r.description.length;

    document.querySelectorAll('#edit-report-form .is-invalid').forEach(el => el.classList.remove('is-invalid'));
    editModal.show();
  } catch (err) {
    console.error('Open edit modal error:', err);
  }
}

document.getElementById('btn-save-edit').addEventListener('click', async () => {
  const form  = document.getElementById('edit-report-form');
  const id    = document.getElementById('edit-id').value;
  const name  = document.getElementById('edit-name').value.trim();
  const cat   = document.getElementById('edit-category').value;
  const date  = document.getElementById('edit-date').value;
  const loc   = document.getElementById('edit-location').value.trim();
  const desc  = document.getElementById('edit-desc').value.trim();
  const status= document.getElementById('edit-status').value;
  const cName = document.getElementById('edit-contact-name').value.trim();
  const cPhone= document.getElementById('edit-contact-phone').value.trim();
  const cEmail= document.getElementById('edit-contact-email').value.trim();

  // Reset
  form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
  document.getElementById('err-edit-phone').textContent = '';
  document.getElementById('err-edit-email').textContent = '';

  let valid = true;
  if (!name)  { document.getElementById('edit-name').classList.add('is-invalid');     valid = false; }
  if (!cat)   { document.getElementById('edit-category').classList.add('is-invalid'); valid = false; }
  if (!date)  { document.getElementById('edit-date').classList.add('is-invalid');     valid = false; }
  if (!loc)   { document.getElementById('edit-location').classList.add('is-invalid'); valid = false; }
  if (!desc)  { document.getElementById('edit-desc').classList.add('is-invalid');     valid = false; }

  if (cPhone && !isValidPhone(cPhone)) {
    document.getElementById('edit-contact-phone').classList.add('is-invalid');
    document.getElementById('err-edit-phone').textContent = 'Enter a valid 10-digit Indian mobile number.';
    valid = false;
  }
  if (cEmail && !isValidEmail(cEmail)) {
    document.getElementById('edit-contact-email').classList.add('is-invalid');
    document.getElementById('err-edit-email').textContent = 'Enter a valid email address.';
    valid = false;
  }

  if (!valid) return;

  try {
    await Storage.updateReport(id, {
      name, category: cat, date, location: loc, description: desc, status,
      contact: { name: cName, phone: cPhone, email: cEmail }
    });
    editModal.hide();
    await renderList();
  } catch (err) {
    console.error('Save edit error:', err);
    alert('Failed to save changes. Please try again.');
  }
});

/* ── Delete confirm ──────────────────────────────────────── */
document.getElementById('confirm-delete-report').addEventListener('click', async () => {
  if (pendingDeleteId) {
    try {
      await Storage.deleteReport(pendingDeleteId);
      pendingDeleteId = null;
      deleteModal.hide();
      await renderList();
    } catch (err) {
      console.error('Delete report error:', err);
    }
  }
});

/* ── Tab buttons ─────────────────────────────────────────── */
document.querySelectorAll('#myreports-tabs button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#myreports-tabs button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.filter;
    renderList();
  });
});

/* ── Filter inputs ───────────────────────────────────────── */
document.getElementById('my-search').addEventListener('input', renderList);
document.getElementById('my-status-filter').addEventListener('change', renderList);

document.getElementById('my-clear-filter').addEventListener('click', () => {
  document.getElementById('my-search').value = '';
  document.getElementById('my-status-filter').value = '';
  renderList();
});

/* ── Init ────────────────────────────────────────────────── */
renderList();
