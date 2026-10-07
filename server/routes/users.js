const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { db } = require('../db');
const { authenticateToken, requirePermission, logAudit } = require('../middleware/auth');

// GET /api/users - List users
router.get('/', authenticateToken, (req, res) => {
  try {
    const { role, is_active, search } = req.query;
    let query = 'SELECT id, username, full_name, email, phone, role, designation, is_active, permissions, created_at, updated_at FROM users WHERE 1=1';
    const params = [];

    if (role) {
      query += ' AND role = ?';
      params.push(role);
    }
    if (is_active !== undefined) {
      query += ' AND is_active = ?';
      params.push(is_active === 'true' || is_active === '1' ? 1 : 0);
    }
    if (search) {
      query += ' AND (full_name LIKE ? OR username LIKE ? OR phone LIKE ? OR designation LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    query += ' ORDER BY role ASC, full_name ASC';
    const users = db.prepare(query).all(...params);

    const formatted = users.map(u => {
      try {
        u.permissions = JSON.parse(u.permissions || '[]');
      } catch (e) {
        u.permissions = [];
      }
      return u;
    });

    res.json(formatted);
  } catch (err) {
    console.error('Fetch users error:', err);
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

// GET /api/users/:id
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const user = db.prepare('SELECT id, username, full_name, email, phone, role, designation, is_active, permissions, created_at, updated_at FROM users WHERE id = ?').get(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    try {
      user.permissions = JSON.parse(user.permissions || '[]');
    } catch (e) {
      user.permissions = [];
    }
    res.json(user);
  } catch (err) {
    console.error('Fetch user error:', err);
    res.status(500).json({ error: 'Failed to fetch user.' });
  }
});

// POST /api/users - Create User
router.post('/', authenticateToken, requirePermission('users_manage'), (req, res) => {
  try {
    const { username, password, full_name, email, phone, role, designation, permissions } = req.body;

    if (!username || !password || !full_name || !role) {
      return res.status(400).json({ error: 'Username, password, full name, and role are required.' });
    }

    if (!['admin', 'manager', 'employee'].includes(role)) {
      return res.status(400).json({ error: 'Invalid user role.' });
    }

    if (req.user.role !== 'admin' && role === 'admin') {
      return res.status(403).json({ error: 'Only administrators can create admin accounts.' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE username = ? COLLATE NOCASE').get(username.trim());
    if (existing) {
      return res.status(400).json({ error: 'Username is already taken.' });
    }

    const password_hash = bcrypt.hashSync(password, 10);
    const permsJson = JSON.stringify(Array.isArray(permissions) ? permissions : []);

    const stmt = db.prepare(`
      INSERT INTO users (username, password_hash, full_name, email, phone, role, designation, permissions)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(username.trim(), password_hash, full_name.trim(), email || null, phone || null, role, designation || null, permsJson);

    logAudit(req.user.id, req.user.full_name, 'USER_CREATE', 'users', result.lastInsertRowid, { username, role, full_name }, req.ip);

    res.status(201).json({
      message: 'User created successfully.',
      id: result.lastInsertRowid
    });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ error: 'Failed to create user.' });
  }
});

// PUT /api/users/:id - Update User
router.put('/:id', authenticateToken, requirePermission('users_manage'), (req, res) => {
  try {
    const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (targetUser.role === 'admin' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Cannot modify an Admin account.' });
    }

    const { full_name, email, phone, role, designation, permissions, is_active } = req.body;

    const updatedRole = req.user.role === 'admin' && role ? role : targetUser.role;
    const permsJson = permissions !== undefined ? JSON.stringify(permissions) : targetUser.permissions;
    const activeState = is_active !== undefined ? (is_active ? 1 : 0) : targetUser.is_active;

    db.prepare(`
      UPDATE users
      SET full_name = ?, email = ?, phone = ?, role = ?, designation = ?, permissions = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      full_name !== undefined ? full_name.trim() : targetUser.full_name,
      email !== undefined ? email : targetUser.email,
      phone !== undefined ? phone : targetUser.phone,
      updatedRole,
      designation !== undefined ? designation : targetUser.designation,
      permsJson,
      activeState,
      req.params.id
    );

    logAudit(req.user.id, req.user.full_name, 'USER_UPDATE', 'users', req.params.id, { full_name, role: updatedRole }, req.ip);

    res.json({ message: 'User updated successfully.' });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Failed to update user.' });
  }
});

// POST /api/users/:id/reset-password - Admin reset password
router.post('/:id/reset-password', authenticateToken, requirePermission('users_manage'), (req, res) => {
  try {
    const { new_password } = req.body;
    if (!new_password) {
      return res.status(400).json({ error: 'New password is required.' });
    }

    const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (targetUser.role === 'admin' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Cannot reset password of an Admin.' });
    }

    const password_hash = bcrypt.hashSync(new_password, 10);
    db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(password_hash, req.params.id);

    logAudit(req.user.id, req.user.full_name, 'USER_PASSWORD_RESET', 'users', req.params.id, { target: targetUser.username }, req.ip);

    res.json({ message: 'Password reset successfully.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password.' });
  }
});

// PUT /api/users/:id/status - Toggle active/deactive
router.put('/:id/status', authenticateToken, requirePermission('users_manage'), (req, res) => {
  try {
    const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (targetUser.id === req.user.id) {
      return res.status(400).json({ error: 'You cannot deactivate your own account.' });
    }

    if (targetUser.role === 'admin' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Cannot deactivate an Admin account.' });
    }

    const newStatus = targetUser.is_active ? 0 : 1;
    db.prepare('UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStatus, req.params.id);

    logAudit(req.user.id, req.user.full_name, newStatus ? 'USER_ACTIVATE' : 'USER_DEACTIVATE', 'users', req.params.id, { username: targetUser.username }, req.ip);

    res.json({ message: `User ${newStatus ? 'activated' : 'deactivated'} successfully.`, is_active: newStatus });
  } catch (err) {
    console.error('Status toggle error:', err);
    res.status(500).json({ error: 'Failed to update user status.' });
  }
});

module.exports = router;
