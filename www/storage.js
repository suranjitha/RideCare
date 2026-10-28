/**
 * storage.js — RideCare API Client
 *
 * Replaces the localStorage abstraction layer with real backend API calls.
 * All methods return Promises. Page JS files use async/await to call them.
 *
 * API base: http://localhost:3000/api
 */

'use strict';

const Storage = (() => {

  const BASE = '/api';

  async function _get(url) {
    const res = await fetch(BASE + url);
    if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`);
    return res.json();
  }

  async function _post(url, body) {
    const res = await fetch(BASE + url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`POST ${url} failed: ${res.status}`);
    return res.json();
  }

  async function _put(url, body) {
    const res = await fetch(BASE + url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`PUT ${url} failed: ${res.status}`);
    return res.json();
  }

  async function _delete(url) {
    const res = await fetch(BASE + url, { method: 'DELETE' });
    if (!res.ok) throw new Error(`DELETE ${url} failed: ${res.status}`);
    return res.json();
  }

  /* ══════════════════════════════════════════════════════════
     EARNINGS
     ══════════════════════════════════════════════════════════ */

  async function getEarnings() {
    return _get('/earnings');
  }

  async function addEarning(entry) {
    return _post('/earnings', entry);
  }

  async function deleteEarning(id) {
    return _delete(`/earnings/${id}`);
  }

  async function getEarningsForDate(dateStr) {
    return _get(`/earnings/date/${dateStr}`);
  }

  async function getTotalForDate(dateStr) {
    const entries = await getEarningsForDate(dateStr);
    return entries.reduce((sum, e) => sum + e.amount, 0);
  }

  async function getWeeklyEarnings(dateStr) {
    return _get(`/earnings/weekly/${dateStr}`);
  }

  /* ── Daily Target ─────────────────────────────────────── */

  async function getDailyTarget() {
    const data = await _get('/target');
    return data.amount;
  }

  async function setDailyTarget(amount) {
    return _put('/target', { amount });
  }

  /* ══════════════════════════════════════════════════════════
     REPORTS
     ══════════════════════════════════════════════════════════ */

  async function getReports() {
    return _get('/reports');
  }

  async function addReport(report) {
    return _post('/reports', report);
  }

  async function updateReport(id, updates) {
    return _put(`/reports/${id}`, updates);
  }

  async function deleteReport(id) {
    return _delete(`/reports/${id}`);
  }

  async function getReportById(id) {
    return _get(`/reports/${id}`);
  }

  async function searchReports(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
    const qs = params.toString();
    return _get('/reports' + (qs ? '?' + qs : ''));
  }

  /* ── Dashboard summary ────────────────────────────────── */
  async function getDashboardSummary() {
    return _get('/dashboard');
  }

  /* ── Public API ───────────────────────────────────────── */
  return {
    // Earnings
    getEarnings,
    addEarning,
    deleteEarning,
    getEarningsForDate,
    getTotalForDate,
    getWeeklyEarnings,
    getDailyTarget,
    setDailyTarget,
    // Reports
    getReports,
    addReport,
    updateReport,
    deleteReport,
    getReportById,
    searchReports,
    getDashboardSummary,
    // Compat shim
    generateId: () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
  };

})();
