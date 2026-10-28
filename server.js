/**
 * server.js — RideCare Backend API Server
 * Express + better-sqlite3 (file-based SQLite database)
 * Run with: node server.js
 * API available at: http://localhost:3000/api/...
 */

'use strict';

const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// ── Middleware ────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
// Serve all static HTML/CSS/JS files from the project root
app.use(express.static(path.join(__dirname)));

// ── Database setup ────────────────────────────────────────────
const db = new Database(path.join(__dirname, 'ridecare.db'));

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS earnings (
    id         TEXT PRIMARY KEY,
    date       TEXT NOT NULL,
    amount     REAL NOT NULL,
    note       TEXT DEFAULT '',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS daily_target (
    id     INTEGER PRIMARY KEY CHECK (id = 1),
    amount REAL NOT NULL DEFAULT 0
  );

  INSERT OR IGNORE INTO daily_target (id, amount) VALUES (1, 0);

  CREATE TABLE IF NOT EXISTS reports (
    id             TEXT PRIMARY KEY,
    type           TEXT NOT NULL CHECK (type IN ('lost','found')),
    status         TEXT NOT NULL DEFAULT 'Missing',
    name           TEXT NOT NULL,
    category       TEXT NOT NULL,
    date           TEXT NOT NULL,
    location       TEXT NOT NULL,
    description    TEXT NOT NULL,
    contact_name   TEXT DEFAULT '',
    contact_phone  TEXT DEFAULT '',
    contact_email  TEXT DEFAULT '',
    contact_method TEXT DEFAULT '',
    created_at     TEXT NOT NULL,
    updated_at     TEXT NOT NULL
  );
`);

// ── Helper: generate ID ───────────────────────────────────────
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ── Helper: map DB row → JS report object ────────────────────
function rowToReport(row) {
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    name: row.name,
    category: row.category,
    date: row.date,
    location: row.location,
    description: row.description,
    contact: {
      name:   row.contact_name   || '',
      phone:  row.contact_phone  || '',
      email:  row.contact_email  || '',
      method: row.contact_method || ''
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// ══════════════════════════════════════════════════════════════
//  EARNINGS ROUTES
// ══════════════════════════════════════════════════════════════

// GET /api/earnings — all earnings
app.get('/api/earnings', (req, res) => {
  const rows = db.prepare('SELECT * FROM earnings ORDER BY created_at DESC').all();
  res.json(rows.map(r => ({
    id: r.id, date: r.date, amount: r.amount,
    note: r.note, createdAt: r.created_at
  })));
});

// GET /api/earnings/date/:date — earnings for a specific date
app.get('/api/earnings/date/:date', (req, res) => {
  const rows = db.prepare('SELECT * FROM earnings WHERE date = ? ORDER BY created_at DESC').all(req.params.date);
  res.json(rows.map(r => ({
    id: r.id, date: r.date, amount: r.amount,
    note: r.note, createdAt: r.created_at
  })));
});

// GET /api/earnings/weekly/:date — 7-day totals ending on date
app.get('/api/earnings/weekly/:date', (req, res) => {
  const baseDate = new Date(req.params.date + 'T00:00:00');
  const result = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    const row = db.prepare('SELECT COALESCE(SUM(amount),0) as total FROM earnings WHERE date = ?').get(ds);
    result.push({ date: ds, total: row.total });
  }
  res.json(result);
});

// POST /api/earnings — add an earning entry
app.post('/api/earnings', (req, res) => {
  const { date, amount, note } = req.body;
  if (!date || amount === undefined) return res.status(400).json({ error: 'date and amount required' });
  const id = generateId();
  const createdAt = new Date().toISOString();
  db.prepare('INSERT INTO earnings (id, date, amount, note, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(id, date, Number(amount), (note || '').trim(), createdAt);
  res.status(201).json({ id, date, amount: Number(amount), note: (note || '').trim(), createdAt });
});

// DELETE /api/earnings/:id — delete an earning entry
app.delete('/api/earnings/:id', (req, res) => {
  db.prepare('DELETE FROM earnings WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ── Daily Target ───────────────────────────────────────────────

// GET /api/target — get daily target
app.get('/api/target', (req, res) => {
  const row = db.prepare('SELECT amount FROM daily_target WHERE id = 1').get();
  res.json({ amount: row ? row.amount : 0 });
});

// PUT /api/target — set daily target
app.put('/api/target', (req, res) => {
  const { amount } = req.body;
  if (amount === undefined) return res.status(400).json({ error: 'amount required' });
  db.prepare('UPDATE daily_target SET amount = ? WHERE id = 1').run(Number(amount));
  res.json({ amount: Number(amount) });
});

// ══════════════════════════════════════════════════════════════
//  REPORTS ROUTES
// ══════════════════════════════════════════════════════════════

// GET /api/reports — all reports (with optional filters)
app.get('/api/reports', (req, res) => {
  const { keyword = '', type = '', category = '', status = '', date = '', location = '' } = req.query;
  let sql = 'SELECT * FROM reports WHERE 1=1';
  const params = [];

  if (type)     { sql += ' AND type = ?';     params.push(type); }
  if (category) { sql += ' AND category = ?'; params.push(category); }
  if (status)   { sql += ' AND status = ?';   params.push(status); }
  if (date)     { sql += ' AND date = ?';     params.push(date); }
  if (location.trim()) {
    sql += ' AND LOWER(location) LIKE ?';
    params.push('%' + location.toLowerCase() + '%');
  }
  if (keyword.trim()) {
    sql += ' AND (LOWER(name) LIKE ? OR LOWER(description) LIKE ? OR LOWER(category) LIKE ?)';
    const kw = '%' + keyword.toLowerCase() + '%';
    params.push(kw, kw, kw);
  }

  sql += ' ORDER BY created_at DESC';
  const rows = db.prepare(sql).all(...params);
  res.json(rows.map(rowToReport));
});

// GET /api/reports/:id — get a single report
app.get('/api/reports/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM reports WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Report not found' });
  res.json(rowToReport(row));
});

// POST /api/reports — add a report
app.post('/api/reports', (req, res) => {
  const { type, name, category, date, location, description, contact = {} } = req.body;
  if (!type || !name || !category || !date || !location || !description) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const id = generateId();
  const now = new Date().toISOString();
  const status = type === 'lost' ? 'Missing' : 'Found';
  db.prepare(`
    INSERT INTO reports (id, type, status, name, category, date, location, description,
      contact_name, contact_phone, contact_email, contact_method, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, type, status,
    name.trim(), category, date, location.trim(), description.trim(),
    (contact.name  || '').trim(),
    (contact.phone || '').trim(),
    (contact.email || '').trim(),
    (contact.method|| '').trim(),
    now, now
  );
  const row = db.prepare('SELECT * FROM reports WHERE id = ?').get(id);
  res.status(201).json(rowToReport(row));
});

// PUT /api/reports/:id — update a report
app.put('/api/reports/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM reports WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Report not found' });

  const { name, category, date, location, description, status, contact = {} } = req.body;
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE reports SET
      name = ?, category = ?, date = ?, location = ?, description = ?,
      status = ?, contact_name = ?, contact_phone = ?, contact_email = ?,
      contact_method = ?, updated_at = ?
    WHERE id = ?
  `).run(
    (name        || existing.name).trim(),
    category     || existing.category,
    date         || existing.date,
    (location    || existing.location).trim(),
    (description || existing.description).trim(),
    status       || existing.status,
    (contact.name   !== undefined ? contact.name   : existing.contact_name  ).trim(),
    (contact.phone  !== undefined ? contact.phone  : existing.contact_phone ).trim(),
    (contact.email  !== undefined ? contact.email  : existing.contact_email ).trim(),
    (contact.method !== undefined ? contact.method : existing.contact_method).trim(),
    now,
    req.params.id
  );

  const row = db.prepare('SELECT * FROM reports WHERE id = ?').get(req.params.id);
  res.json(rowToReport(row));
});

// DELETE /api/reports/:id — delete a report
app.delete('/api/reports/:id', (req, res) => {
  db.prepare('DELETE FROM reports WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// GET /api/dashboard — summary stats
app.get('/api/dashboard', (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const target = db.prepare('SELECT amount FROM daily_target WHERE id = 1').get();
  const todayEarned = db.prepare('SELECT COALESCE(SUM(amount),0) as total FROM earnings WHERE date = ?').get(today);

  const reports = db.prepare('SELECT * FROM reports ORDER BY created_at DESC').all().map(rowToReport);
  const missing  = reports.filter(r => r.status === 'Missing').length;
  const found    = reports.filter(r => r.status === 'Found').length;
  const returned = reports.filter(r => r.status === 'Returned').length;
  const recent   = reports.slice(0, 5);

  res.json({
    todayEarned:  todayEarned.total,
    dailyTarget:  target ? target.amount : 0,
    reports: { total: reports.length, missing, found, returned, recent }
  });
});

// Catch-all: serve index.html for any unmatched route
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ── Start server ──────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n✅ RideCare server running at http://localhost:${PORT}`);
  console.log(`   Database: ridecare.db`);
  console.log(`   Press Ctrl+C to stop.\n`);
});
