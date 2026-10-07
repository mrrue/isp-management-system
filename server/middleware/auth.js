const jwt = require('jsonwebtoken');
const { db } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'isp_management_super_secret_jwt_key_2026';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT id, username, full_name, email, phone, role, designation, is_active, permissions FROM users WHERE id = ?').get(decoded.id);

    if (!user || !user.is_active) {
      return res.status(403).json({ error: 'Account inactive or not found.' });
    }

    try {
      user.permissions = JSON.parse(user.permissions || '[]');
    } catch (e) {
      user.permissions = [];
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token.' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ error: 'Admin access required.' });
}

function requirePermission(permissionKey) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (req.user.role === 'admin') {
      return next();
    }
    if (req.user.permissions && req.user.permissions.includes(permissionKey)) {
      return next();
    }
    return res.status(403).json({ error: `Permission denied: ${permissionKey} required.` });
  };
}

function logAudit(userId, userName, action, entityType, entityId, details, ipAddress = '') {
  try {
    db.prepare(`
      INSERT INTO audit_logs (user_id, user_name, action, entity_type, entity_id, details, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId || null,
      userName || 'System',
      action,
      entityType || null,
      entityId ? String(entityId) : null,
      typeof details === 'object' ? JSON.stringify(details) : (details || null),
      ipAddress || ''
    );
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

module.exports = {
  authenticateToken,
  requireAdmin,
  requirePermission,
  logAudit,
  JWT_SECRET
};
