const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticateToken, requirePermission, logAudit } = require('../middleware/auth');

// GET /api/subscriptions - List subscriptions with filters
router.get('/', authenticateToken, (req, res) => {
  try {
    const { customer_id, package_id, status } = req.query;
    let query = `
      SELECT s.*, c.name as customer_name, c.customer_code, c.phone as customer_phone,
             p.name as package_name, p.speed as package_speed
      FROM subscriptions s
      JOIN customers c ON s.customer_id = c.id
      JOIN packages p ON s.package_id = p.id
      WHERE c.is_deleted = 0
    `;
    const params = [];

    if (customer_id) {
      query += ' AND s.customer_id = ?';
      params.push(customer_id);
    }
    if (package_id) {
      query += ' AND s.package_id = ?';
      params.push(package_id);
    }
    if (status) {
      query += ' AND s.status = ?';
      params.push(status);
    }

    query += ' ORDER BY s.created_at DESC';
    const subscriptions = db.prepare(query).all(...params);
    res.json(subscriptions);
  } catch (err) {
    console.error('Fetch subscriptions error:', err);
    res.status(500).json({ error: 'Failed to fetch subscriptions.' });
  }
});

// POST /api/subscriptions - Create / Renew Subscription
router.post('/', authenticateToken, requirePermission('billing_manage'), (req, res) => {
  try {
    const { customer_id, package_id, start_date, renewal_date, due_date, amount, discount, notes } = req.body;

    if (!customer_id || !package_id || !start_date || amount === undefined) {
      return res.status(400).json({ error: 'Customer, package, start date, and amount are required.' });
    }

    const disc = parseFloat(discount) || 0;
    const final_amount = Math.max(parseFloat(amount) - disc, 0);

    const stmt = db.prepare(`
      INSERT INTO subscriptions (customer_id, package_id, start_date, renewal_date, due_date, amount, discount, final_amount, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Active', ?)
    `);

    const result = stmt.run(
      customer_id,
      package_id,
      start_date,
      renewal_date || null,
      due_date || null,
      parseFloat(amount),
      disc,
      final_amount,
      notes || null
    );

    // Update customer's current package and monthly price
    db.prepare(`
      UPDATE customers
      SET package_id = ?, monthly_price = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(package_id, final_amount, customer_id);

    logAudit(req.user.id, req.user.full_name, 'SUBSCRIPTION_CREATE', 'subscriptions', result.lastInsertRowid, { customer_id, package_id, final_amount }, req.ip);

    res.status(201).json({ message: 'Subscription recorded successfully.', id: result.lastInsertRowid });
  } catch (err) {
    console.error('Create subscription error:', err);
    res.status(500).json({ error: 'Failed to create subscription.' });
  }
});

module.exports = router;
