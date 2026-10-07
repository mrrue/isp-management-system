const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// GET /api/audit - List audit logs
router.get('/', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { action, user_id, start_date, end_date, search, page = 1, limit = 50 } = req.query;

    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params = [];

    if (action) {
      query += ' AND action = ?';
      params.push(action);
    }
    if (user_id) {
      query += ' AND user_id = ?';
      params.push(user_id);
    }
    if (start_date) {
      query += ' AND created_at >= ?';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND created_at <= ?';
      params.push(end_date + ' 23:59:59');
    }
    if (search) {
      query += ' AND (user_name LIKE ? OR action LIKE ? OR details LIKE ? OR entity_type LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    const countQuery = `SELECT COUNT(*) as total FROM (${query})`;
    const totalCount = db.prepare(countQuery).get(...params).total;

    query += ' ORDER BY created_at DESC';

    const parsedLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 200);
    const parsedPage = Math.max(parseInt(page) || 1, 1);
    const offset = (parsedPage - 1) * parsedLimit;

    query += ' LIMIT ? OFFSET ?';
    params.push(parsedLimit, offset);

    const logs = db.prepare(query).all(...params);

    // Get list of distinct actions for filter dropdown
    const actions = db.prepare('SELECT DISTINCT action FROM audit_logs ORDER BY action ASC').all().map(r => r.action);

    res.json({
      data: logs,
      actions,
      pagination: {
        total: totalCount,
        page: parsedPage,
        limit: parsedLimit,
        pages: Math.ceil(totalCount / parsedLimit)
      }
    });
  } catch (err) {
    console.error('Fetch audit logs error:', err);
    res.status(500).json({ error: 'Failed to fetch audit logs.' });
  }
});

module.exports = router;
