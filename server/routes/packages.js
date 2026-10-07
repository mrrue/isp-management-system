const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticateToken, requirePermission, logAudit } = require('../middleware/auth');

// GET /api/packages - List all packages
router.get('/', authenticateToken, (req, res) => {
  try {
    const { active_only } = req.query;
    let query = 'SELECT * FROM packages';
    if (active_only === 'true' || active_only === '1') {
      query += ' WHERE is_active = 1';
    }
    query += ' ORDER BY price ASC';
    const packages = db.prepare(query).all();
    res.json(packages);
  } catch (err) {
    console.error('Fetch packages error:', err);
    res.status(500).json({ error: 'Failed to fetch packages.' });
  }
});

// POST /api/packages - Create package
router.post('/', authenticateToken, requirePermission('billing_manage'), (req, res) => {
  try {
    const { name, speed, price, billing_cycle, description } = req.body;
    if (!name || !speed || price === undefined) {
      return res.status(400).json({ error: 'Package name, speed, and price are required.' });
    }

    const stmt = db.prepare(`
      INSERT INTO packages (name, speed, price, billing_cycle, description)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(name.trim(), speed.trim(), parseFloat(price), billing_cycle || 'monthly', description || null);

    logAudit(req.user.id, req.user.full_name, 'PACKAGE_CREATE', 'packages', result.lastInsertRowid, { name, speed, price }, req.ip);

    res.status(201).json({ message: 'Package created successfully.', id: result.lastInsertRowid });
  } catch (err) {
    console.error('Create package error:', err);
    res.status(500).json({ error: 'Failed to create package.' });
  }
});

// PUT /api/packages/:id - Update package
router.put('/:id', authenticateToken, requirePermission('billing_manage'), (req, res) => {
  try {
    const { name, speed, price, billing_cycle, description, is_active } = req.body;
    const pkg = db.prepare('SELECT * FROM packages WHERE id = ?').get(req.params.id);
    if (!pkg) {
      return res.status(404).json({ error: 'Package not found.' });
    }

    db.prepare(`
      UPDATE packages
      SET name = ?, speed = ?, price = ?, billing_cycle = ?, description = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name !== undefined ? name.trim() : pkg.name,
      speed !== undefined ? speed.trim() : pkg.speed,
      price !== undefined ? parseFloat(price) : pkg.price,
      billing_cycle !== undefined ? billing_cycle : pkg.billing_cycle,
      description !== undefined ? description : pkg.description,
      is_active !== undefined ? (is_active ? 1 : 0) : pkg.is_active,
      req.params.id
    );

    logAudit(req.user.id, req.user.full_name, 'PACKAGE_UPDATE', 'packages', req.params.id, { name, speed, price }, req.ip);

    res.json({ message: 'Package updated successfully.' });
  } catch (err) {
    console.error('Update package error:', err);
    res.status(500).json({ error: 'Failed to update package.' });
  }
});

// DELETE /api/packages/:id - Soft delete/deactivate
router.delete('/:id', authenticateToken, requirePermission('billing_manage'), (req, res) => {
  try {
    const customerCount = db.prepare('SELECT COUNT(*) as count FROM customers WHERE package_id = ? AND is_deleted = 0').get(req.params.id).count;
    if (customerCount > 0) {
      // Instead of hard deletion, deactivate to maintain integrity
      db.prepare('UPDATE packages SET is_active = 0 WHERE id = ?').run(req.params.id);
      return res.json({ message: `Package has ${customerCount} active customers, so it was marked inactive instead of deleted.` });
    }

    db.prepare('DELETE FROM packages WHERE id = ?').run(req.params.id);
    logAudit(req.user.id, req.user.full_name, 'PACKAGE_DELETE', 'packages', req.params.id, null, req.ip);
    res.json({ message: 'Package deleted successfully.' });
  } catch (err) {
    console.error('Delete package error:', err);
    res.status(500).json({ error: 'Failed to delete package.' });
  }
});

module.exports = router;
