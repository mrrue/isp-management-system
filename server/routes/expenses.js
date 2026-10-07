const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticateToken, requirePermission, logAudit } = require('../middleware/auth');
const upload = require('../middleware/upload');

// GET /api/expenses - List expenses with filters and pagination
router.get('/', authenticateToken, (req, res) => {
  try {
    const {
      employee_id,
      category,
      classification,
      payment_method,
      start_date,
      end_date,
      search,
      page = 1,
      limit = 50
    } = req.query;

    let query = `
      SELECT e.*, u.full_name as employee_name, u.designation as employee_designation,
             ent.full_name as entered_by_name
      FROM expenses e
      LEFT JOIN users u ON e.employee_id = u.id
      LEFT JOIN users ent ON e.entered_by = ent.id
      WHERE 1=1
    `;
    const params = [];

    // If employee viewing without finance_manage, they only see expenses related to them
    if (req.user.role === 'employee' && !req.user.permissions.includes('finance_manage')) {
      query += ' AND e.employee_id = ?';
      params.push(req.user.id);
    } else if (employee_id) {
      query += ' AND e.employee_id = ?';
      params.push(employee_id);
    }

    if (category) {
      query += ' AND e.category = ?';
      params.push(category);
    }

    if (classification) {
      query += ' AND e.classification = ?';
      params.push(classification);
    }

    if (payment_method) {
      query += ' AND e.payment_method = ?';
      params.push(payment_method);
    }

    if (start_date) {
      query += ' AND e.expense_date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND e.expense_date <= ?';
      params.push(end_date);
    }

    if (search) {
      query += ` AND (
        e.description LIKE ? OR
        e.category LIKE ? OR
        e.notes LIKE ? OR
        u.full_name LIKE ?
      )`;
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    const countQuery = `SELECT COUNT(*) as total FROM (${query})`;
    const totalCount = db.prepare(countQuery).get(...params).total;

    // Calculate total amount matching criteria
    const sumQuery = `
      SELECT SUM(e.amount) as total_sum
      FROM expenses e
      LEFT JOIN users u ON e.employee_id = u.id
      WHERE 1=1
      ${req.user.role === 'employee' && !req.user.permissions.includes('finance_manage') ? ' AND e.employee_id = ' + req.user.id : (employee_id ? ' AND e.employee_id = ' + employee_id : '')}
      ${category ? ' AND e.category = "' + category + '"' : ''}
      ${classification ? ' AND e.classification = "' + classification + '"' : ''}
      ${start_date ? ' AND e.expense_date >= "' + start_date + '"' : ''}
      ${end_date ? ' AND e.expense_date <= "' + end_date + '"' : ''}
    `;
    const sumResult = db.prepare(sumQuery).get();

    query += ' ORDER BY e.expense_date DESC, e.created_at DESC';

    const parsedLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 200);
    const parsedPage = Math.max(parseInt(page) || 1, 1);
    const offset = (parsedPage - 1) * parsedLimit;

    query += ' LIMIT ? OFFSET ?';
    params.push(parsedLimit, offset);

    const expenses = db.prepare(query).all(...params);

    res.json({
      data: expenses,
      total_amount: sumResult ? (sumResult.total_sum || 0) : 0,
      pagination: {
        total: totalCount,
        page: parsedPage,
        limit: parsedLimit,
        pages: Math.ceil(totalCount / parsedLimit)
      }
    });
  } catch (err) {
    console.error('Fetch expenses error:', err);
    res.status(500).json({ error: 'Failed to fetch expenses.' });
  }
});

// GET /api/expenses/stats - Breakdown by category and classification
router.get('/stats', authenticateToken, (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const monthStart = today.substring(0, 7) + '-01';

    const todaySum = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE expense_date = ?').get(today).total;
    const monthSum = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE expense_date >= ?').get(monthStart).total;

    const byClassification = db.prepare(`
      SELECT classification, COALESCE(SUM(amount), 0) as total, COUNT(*) as count
      FROM expenses
      WHERE expense_date >= ?
      GROUP BY classification
    `).all(monthStart);

    const byCategory = db.prepare(`
      SELECT category, COALESCE(SUM(amount), 0) as total, COUNT(*) as count
      FROM expenses
      WHERE expense_date >= ?
      GROUP BY category
      ORDER BY total DESC
    `).all(monthStart);

    res.json({
      today_total: todaySum,
      month_total: monthSum,
      by_classification: byClassification,
      by_category: byCategory
    });
  } catch (err) {
    console.error('Expense stats error:', err);
    res.status(500).json({ error: 'Failed to fetch expense stats.' });
  }
});

// GET /api/expenses/employee/:id - Detailed Employee Financial Ledger
router.get('/employee/:id', authenticateToken, (req, res) => {
  try {
    const employee = db.prepare('SELECT id, full_name, designation, phone FROM users WHERE id = ?').get(req.params.id);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found.' });
    }

    const today = new Date().toISOString().split('T')[0];
    const monthStart = today.substring(0, 7) + '-01';

    // Calculate start of this week (Monday)
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff)).toISOString().split('T')[0];

    const todayTotal = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE employee_id = ? AND expense_date = ?').get(employee.id, today).total;
    const weekTotal = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE employee_id = ? AND expense_date >= ?').get(employee.id, monday).total;
    const monthTotal = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE employee_id = ? AND expense_date >= ?').get(employee.id, monthStart).total;
    const allTimeTotal = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE employee_id = ?').get(employee.id).total;

    const records = db.prepare(`
      SELECT e.*, ent.full_name as entered_by_name
      FROM expenses e
      LEFT JOIN users ent ON e.entered_by = ent.id
      WHERE e.employee_id = ?
      ORDER BY e.expense_date DESC, e.created_at DESC
    `).all(employee.id);

    res.json({
      employee,
      totals: {
        today: todayTotal,
        this_week: weekTotal,
        this_month: monthTotal,
        all_time: allTimeTotal
      },
      records
    });
  } catch (err) {
    console.error('Employee expense ledger error:', err);
    res.status(500).json({ error: 'Failed to fetch employee expense ledger.' });
  }
});

// POST /api/expenses - Add new expense
router.post('/', authenticateToken, requirePermission('expense_create'), upload.single('receipt'), (req, res) => {
  try {
    const {
      expense_date,
      employee_id,
      amount,
      category,
      description,
      payment_method,
      classification,
      notes
    } = req.body;

    if (!amount || !category || !description) {
      return res.status(400).json({ error: 'Amount, category, and description are required.' });
    }

    const receiptUrl = req.file ? `/uploads/${req.file.filename}` : null;
    const dateVal = expense_date || new Date().toISOString().split('T')[0];

    const stmt = db.prepare(`
      INSERT INTO expenses (
        expense_date, employee_id, amount, category, description,
        payment_method, classification, receipt_url, notes, entered_by
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      dateVal,
      employee_id ? parseInt(employee_id) : null,
      parseFloat(amount),
      category.trim(),
      description.trim(),
      payment_method || 'Cash',
      classification || 'Business',
      receiptUrl,
      notes || null,
      req.user.id
    );

    logAudit(req.user.id, req.user.full_name, 'EXPENSE_CREATE', 'expenses', result.lastInsertRowid, { amount, category, classification, employee_id }, req.ip);

    res.status(201).json({
      message: 'Expense recorded successfully.',
      id: result.lastInsertRowid
    });
  } catch (err) {
    console.error('Create expense error:', err);
    res.status(500).json({ error: 'Failed to record expense.' });
  }
});

// PUT /api/expenses/:id - Update expense
router.put('/:id', authenticateToken, requirePermission('finance_manage'), (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Expense not found.' });
    }

    const {
      expense_date,
      employee_id,
      amount,
      category,
      description,
      payment_method,
      classification,
      notes
    } = req.body;

    db.prepare(`
      UPDATE expenses
      SET
        expense_date = ?, employee_id = ?, amount = ?, category = ?,
        description = ?, payment_method = ?, classification = ?, notes = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      expense_date || existing.expense_date,
      employee_id !== undefined ? (employee_id ? parseInt(employee_id) : null) : existing.employee_id,
      amount !== undefined ? parseFloat(amount) : existing.amount,
      category || existing.category,
      description || existing.description,
      payment_method || existing.payment_method,
      classification || existing.classification,
      notes !== undefined ? notes : existing.notes,
      req.params.id
    );

    logAudit(req.user.id, req.user.full_name, 'EXPENSE_UPDATE', 'expenses', req.params.id, { amount, category }, req.ip);

    res.json({ message: 'Expense updated successfully.' });
  } catch (err) {
    console.error('Update expense error:', err);
    res.status(500).json({ error: 'Failed to update expense.' });
  }
});

// DELETE /api/expenses/:id - Delete expense
router.delete('/:id', authenticateToken, requirePermission('finance_manage'), (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Expense not found.' });
    }

    db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id);
    logAudit(req.user.id, req.user.full_name, 'EXPENSE_DELETE', 'expenses', req.params.id, { amount: existing.amount, category: existing.category }, req.ip);

    res.json({ message: 'Expense deleted successfully.' });
  } catch (err) {
    console.error('Delete expense error:', err);
    res.status(500).json({ error: 'Failed to delete expense.' });
  }
});

module.exports = router;
