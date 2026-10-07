const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { db } = require('../db');
const { authenticateToken, requireAdmin, logAudit } = require('../middleware/auth');
const upload = require('../middleware/upload');

// GET /api/settings - Fetch all application settings
router.get('/', authenticateToken, (req, res) => {
  try {
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    rows.forEach(r => {
      try {
        settings[r.key] = JSON.parse(r.value);
      } catch (e) {
        settings[r.key] = r.value;
      }
    });

    // Also fetch master data lists
    const paymentMethods = db.prepare('SELECT * FROM payment_methods ORDER BY id ASC').all();
    const customerStatuses = db.prepare('SELECT * FROM customer_statuses ORDER BY id ASC').all();
    const ticketCategories = db.prepare('SELECT * FROM ticket_categories ORDER BY id ASC').all();
    const ticketStatuses = db.prepare('SELECT * FROM ticket_statuses ORDER BY id ASC').all();
    const expenseCategories = db.prepare('SELECT * FROM expense_categories ORDER BY id ASC').all();

    res.json({
      settings,
      payment_methods: paymentMethods,
      customer_statuses: customerStatuses,
      ticket_categories: ticketCategories,
      ticket_statuses: ticketStatuses,
      expense_categories: expenseCategories
    });
  } catch (err) {
    console.error('Fetch settings error:', err);
    res.status(500).json({ error: 'Failed to fetch settings.' });
  }
});

// POST /api/settings - Update application settings
router.post('/', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key || value === undefined) {
      return res.status(400).json({ error: 'Key and value are required.' });
    }

    const valStr = typeof value === 'object' ? JSON.stringify(value) : String(value);

    db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `).run(key, valStr);

    logAudit(req.user.id, req.user.full_name, 'SETTINGS_UPDATE', 'settings', null, { key }, req.ip);

    res.json({ message: 'Settings saved successfully.' });
  } catch (err) {
    console.error('Update settings error:', err);
    res.status(500).json({ error: 'Failed to update settings.' });
  }
});

// POST /api/settings/upload-logo - Upload logo/branding image
router.post('/upload-logo', authenticateToken, requireAdmin, upload.single('logo'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded.' });
    }
    const logoUrl = `/uploads/${req.file.filename}`;
    res.json({ url: logoUrl });
  } catch (err) {
    console.error('Logo upload error:', err);
    res.status(500).json({ error: 'Failed to upload logo.' });
  }
});

// MASTER LISTS CRUD

// Payment Methods
router.post('/payment-methods', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required.' });
    const result = db.prepare('INSERT INTO payment_methods (name) VALUES (?)').run(name.trim());
    res.status(201).json({ id: result.lastInsertRowid, name: name.trim(), is_active: 1 });
  } catch (err) {
    res.status(400).json({ error: 'Failed to add payment method. Must be unique.' });
  }
});
router.put('/payment-methods/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { name, is_active } = req.body;
    db.prepare('UPDATE payment_methods SET name = COALESCE(?, name), is_active = COALESCE(?, is_active) WHERE id = ?').run(name ? name.trim() : null, is_active !== undefined ? (is_active ? 1 : 0) : null, req.params.id);
    res.json({ message: 'Payment method updated.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update.' });
  }
});
router.delete('/payment-methods/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    db.prepare('DELETE FROM payment_methods WHERE id = ?').run(req.params.id);
    res.json({ message: 'Payment method deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete.' });
  }
});

// Customer Statuses
router.post('/customer-statuses', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { name, color } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required.' });
    const result = db.prepare('INSERT INTO customer_statuses (name, color) VALUES (?, ?)').run(name.trim(), color || '#10b981');
    res.status(201).json({ id: result.lastInsertRowid, name: name.trim(), color: color || '#10b981', is_active: 1 });
  } catch (err) {
    res.status(400).json({ error: 'Failed to add customer status. Must be unique.' });
  }
});
router.put('/customer-statuses/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { name, color, is_active } = req.body;
    db.prepare('UPDATE customer_statuses SET name = COALESCE(?, name), color = COALESCE(?, color), is_active = COALESCE(?, is_active) WHERE id = ?').run(name ? name.trim() : null, color || null, is_active !== undefined ? (is_active ? 1 : 0) : null, req.params.id);
    res.json({ message: 'Customer status updated.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update.' });
  }
});
router.delete('/customer-statuses/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    db.prepare('DELETE FROM customer_statuses WHERE id = ?').run(req.params.id);
    res.json({ message: 'Customer status deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete.' });
  }
});

// Ticket Categories
router.post('/ticket-categories', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required.' });
    const result = db.prepare('INSERT INTO ticket_categories (name) VALUES (?)').run(name.trim());
    res.status(201).json({ id: result.lastInsertRowid, name: name.trim(), is_active: 1 });
  } catch (err) {
    res.status(400).json({ error: 'Failed to add ticket category.' });
  }
});
router.put('/ticket-categories/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { name, is_active } = req.body;
    db.prepare('UPDATE ticket_categories SET name = COALESCE(?, name), is_active = COALESCE(?, is_active) WHERE id = ?').run(name ? name.trim() : null, is_active !== undefined ? (is_active ? 1 : 0) : null, req.params.id);
    res.json({ message: 'Ticket category updated.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update.' });
  }
});
router.delete('/ticket-categories/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    db.prepare('DELETE FROM ticket_categories WHERE id = ?').run(req.params.id);
    res.json({ message: 'Ticket category deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete.' });
  }
});

// Ticket Statuses
router.post('/ticket-statuses', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { name, color, is_closed } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required.' });
    const result = db.prepare('INSERT INTO ticket_statuses (name, color, is_closed) VALUES (?, ?, ?)').run(name.trim(), color || '#3b82f6', is_closed ? 1 : 0);
    res.status(201).json({ id: result.lastInsertRowid, name: name.trim(), color: color || '#3b82f6', is_closed: is_closed ? 1 : 0, is_active: 1 });
  } catch (err) {
    res.status(400).json({ error: 'Failed to add ticket status.' });
  }
});
router.put('/ticket-statuses/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { name, color, is_closed, is_active } = req.body;
    db.prepare('UPDATE ticket_statuses SET name = COALESCE(?, name), color = COALESCE(?, color), is_closed = COALESCE(?, is_closed), is_active = COALESCE(?, is_active) WHERE id = ?').run(
      name ? name.trim() : null,
      color || null,
      is_closed !== undefined ? (is_closed ? 1 : 0) : null,
      is_active !== undefined ? (is_active ? 1 : 0) : null,
      req.params.id
    );
    res.json({ message: 'Ticket status updated.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update.' });
  }
});
router.delete('/ticket-statuses/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    db.prepare('DELETE FROM ticket_statuses WHERE id = ?').run(req.params.id);
    res.json({ message: 'Ticket status deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete.' });
  }
});

// Expense Categories
router.post('/expense-categories', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required.' });
    const result = db.prepare('INSERT INTO expense_categories (name) VALUES (?)').run(name.trim());
    res.status(201).json({ id: result.lastInsertRowid, name: name.trim(), is_active: 1 });
  } catch (err) {
    res.status(400).json({ error: 'Failed to add expense category.' });
  }
});
router.put('/expense-categories/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { name, is_active } = req.body;
    db.prepare('UPDATE expense_categories SET name = COALESCE(?, name), is_active = COALESCE(?, is_active) WHERE id = ?').run(name ? name.trim() : null, is_active !== undefined ? (is_active ? 1 : 0) : null, req.params.id);
    res.json({ message: 'Expense category updated.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update.' });
  }
});
router.delete('/expense-categories/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    db.prepare('DELETE FROM expense_categories WHERE id = ?').run(req.params.id);
    res.json({ message: 'Expense category deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete.' });
  }
});

// GET /api/settings/backup/download - Download database file directly
router.get('/backup/download', authenticateToken, requireAdmin, (req, res) => {
  try {
    const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/isp_system.db');
    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({ error: 'Database file not found.' });
    }

    logAudit(req.user.id, req.user.full_name, 'DATABASE_BACKUP_DOWNLOAD', 'system', null, 'Admin downloaded database backup', req.ip);

    res.download(dbPath, `isp_system_backup_${new Date().toISOString().split('T')[0]}.db`);
  } catch (err) {
    console.error('Backup download error:', err);
    res.status(500).json({ error: 'Failed to download backup.' });
  }
});

// GET /api/settings/backup/json - JSON export of all core tables
router.get('/backup/json', authenticateToken, requireAdmin, (req, res) => {
  try {
    const dump = {
      timestamp: new Date().toISOString(),
      business_info: db.prepare("SELECT value FROM settings WHERE key = 'business_info'").get()?.value,
      users: db.prepare('SELECT id, username, full_name, email, phone, role, designation, is_active, permissions, created_at FROM users').all(),
      packages: db.prepare('SELECT * FROM packages').all(),
      customers: db.prepare('SELECT * FROM customers WHERE is_deleted = 0').all(),
      subscriptions: db.prepare('SELECT * FROM subscriptions').all(),
      payments: db.prepare('SELECT * FROM payments').all(),
      tickets: db.prepare('SELECT * FROM tickets').all(),
      expenses: db.prepare('SELECT * FROM expenses').all(),
      attendance: db.prepare('SELECT * FROM attendance').all()
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=isp_data_export_${new Date().toISOString().split('T')[0]}.json`);
    res.send(JSON.stringify(dump, null, 2));
  } catch (err) {
    console.error('JSON export error:', err);
    res.status(500).json({ error: 'Failed to export JSON.' });
  }
});

// POST /api/settings/reset-demo - Re-seed initial demo data
router.post('/reset-demo', authenticateToken, requireAdmin, (req, res) => {
  try {
    const seed = require('../seed');
    seed.seedDatabase(true);

    logAudit(req.user.id, req.user.full_name, 'DEMO_DATA_RESET', 'system', null, 'Admin reset database to demo data', req.ip);

    res.json({ message: 'Database refreshed with complete demo data successfully.' });
  } catch (err) {
    console.error('Reset demo error:', err);
    res.status(500).json({ error: 'Failed to reset demo data.' });
  }
});

module.exports = router;
