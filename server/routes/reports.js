const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticateToken, requirePermission } = require('../middleware/auth');

// GET /api/reports/billing
router.get('/billing', authenticateToken, requirePermission('reports_view'), (req, res) => {
  try {
    const { start_date, end_date, package_id, payment_method, area } = req.query;

    let payQuery = `
      SELECT p.*, c.customer_code, c.name as customer_name, c.area, c.phone,
             pkg.name as package_name, u.full_name as collector_name
      FROM payments p
      JOIN customers c ON p.customer_id = c.id
      LEFT JOIN packages pkg ON c.package_id = pkg.id
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.is_voided = 0
    `;
    const payParams = [];

    if (start_date) {
      payQuery += ' AND p.payment_date >= ?';
      payParams.push(start_date);
    }
    if (end_date) {
      payQuery += ' AND p.payment_date <= ?';
      payParams.push(end_date);
    }
    if (package_id) {
      payQuery += ' AND c.package_id = ?';
      payParams.push(package_id);
    }
    if (payment_method) {
      payQuery += ' AND p.payment_method = ?';
      payParams.push(payment_method);
    }
    if (area) {
      payQuery += ' AND c.area = ?';
      payParams.push(area);
    }

    payQuery += ' ORDER BY p.payment_date DESC, p.created_at DESC';
    const payments = db.prepare(payQuery).all(...payParams);

    const totalRevenue = payments.reduce((acc, p) => acc + (p.amount || 0), 0);

    // Grouping by Payment Method
    const methodSummary = {};
    payments.forEach(p => {
      const m = p.payment_method || 'Other';
      if (!methodSummary[m]) methodSummary[m] = { method: m, count: 0, total: 0 };
      methodSummary[m].count++;
      methodSummary[m].total += p.amount;
    });

    // Grouping by Package
    const packageSummary = {};
    payments.forEach(p => {
      const pkg = p.package_name || 'Unassigned';
      if (!packageSummary[pkg]) packageSummary[pkg] = { package: pkg, count: 0, total: 0 };
      packageSummary[pkg].count++;
      packageSummary[pkg].total += p.amount;
    });

    // Grouping by Day for trend chart
    const dailyTrend = {};
    payments.forEach(p => {
      const date = p.payment_date;
      dailyTrend[date] = (dailyTrend[date] || 0) + p.amount;
    });

    res.json({
      summary: {
        total_payments: payments.length,
        total_revenue: totalRevenue
      },
      method_breakdown: Object.values(methodSummary),
      package_breakdown: Object.values(packageSummary),
      daily_trend: Object.entries(dailyTrend).map(([date, amount]) => ({ date, amount })).sort((a, b) => a.date.localeCompare(b.date)),
      payments
    });
  } catch (err) {
    console.error('Billing report error:', err);
    res.status(500).json({ error: 'Failed to generate billing report.' });
  }
});

// GET /api/reports/customers
router.get('/customers', authenticateToken, requirePermission('reports_view'), (req, res) => {
  try {
    const { status, area, package_id } = req.query;

    let query = `
      SELECT c.*, p.name as package_name, p.speed as package_speed
      FROM customers c
      LEFT JOIN packages p ON c.package_id = p.id
      WHERE c.is_deleted = 0
    `;
    const params = [];

    if (status) {
      query += ' AND c.status = ?';
      params.push(status);
    }
    if (area) {
      query += ' AND c.area = ?';
      params.push(area);
    }
    if (package_id) {
      query += ' AND c.package_id = ?';
      params.push(package_id);
    }

    query += ' ORDER BY c.name ASC';
    const customers = db.prepare(query).all(...params);

    const totalBalance = customers.reduce((acc, c) => acc + (c.balance || 0), 0);
    const overdueCustomers = customers.filter(c => c.balance > 0);

    res.json({
      total_count: customers.length,
      total_balance_due: totalBalance,
      overdue_count: overdueCustomers.length,
      customers
    });
  } catch (err) {
    console.error('Customer report error:', err);
    res.status(500).json({ error: 'Failed to generate customer report.' });
  }
});

// GET /api/reports/finances
router.get('/finances', authenticateToken, requirePermission('reports_view'), (req, res) => {
  try {
    const { start_date, end_date, employee_id, category, classification } = req.query;

    let query = `
      SELECT e.*, u.full_name as employee_name, u.designation as employee_designation,
             ent.full_name as entered_by_name
      FROM expenses e
      LEFT JOIN users u ON e.employee_id = u.id
      LEFT JOIN users ent ON e.entered_by = ent.id
      WHERE 1=1
    `;
    const params = [];

    if (start_date) {
      query += ' AND e.expense_date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND e.expense_date <= ?';
      params.push(end_date);
    }
    if (employee_id) {
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

    query += ' ORDER BY e.expense_date DESC';
    const expenses = db.prepare(query).all(...params);

    const totalExpense = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);

    // Grouping by Classification
    const classSummary = {};
    expenses.forEach(e => {
      const c = e.classification || 'Business';
      if (!classSummary[c]) classSummary[c] = { classification: c, count: 0, total: 0 };
      classSummary[c].count++;
      classSummary[c].total += e.amount;
    });

    // Grouping by Category
    const catSummary = {};
    expenses.forEach(e => {
      const cat = e.category || 'Other';
      if (!catSummary[cat]) catSummary[cat] = { category: cat, count: 0, total: 0 };
      catSummary[cat].count++;
      catSummary[cat].total += e.amount;
    });

    // Grouping by Employee
    const empSummary = {};
    expenses.forEach(e => {
      const name = e.employee_name || 'General Office';
      if (!empSummary[name]) empSummary[name] = { employee_name: name, count: 0, total: 0 };
      empSummary[name].count++;
      empSummary[name].total += e.amount;
    });

    res.json({
      summary: {
        total_records: expenses.length,
        total_amount: totalExpense
      },
      classification_breakdown: Object.values(classSummary),
      category_breakdown: Object.values(catSummary),
      employee_breakdown: Object.values(empSummary),
      expenses
    });
  } catch (err) {
    console.error('Finance report error:', err);
    res.status(500).json({ error: 'Failed to generate finance report.' });
  }
});

// GET /api/reports/technicians - Factual ticket activity
router.get('/technicians', authenticateToken, requirePermission('reports_view'), (req, res) => {
  try {
    const { start_date, end_date, technician_id, category, status } = req.query;

    let query = `
      SELECT t.*, u.full_name as technician_name, u.phone as technician_phone,
             c.customer_code, c.area as customer_area
      FROM tickets t
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN customers c ON t.customer_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (start_date) {
      query += ' AND t.created_at >= ?';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND t.created_at <= ?';
      params.push(end_date + ' 23:59:59');
    }
    if (technician_id) {
      query += ' AND t.assigned_to = ?';
      params.push(technician_id);
    }
    if (category) {
      query += ' AND t.category = ?';
      params.push(category);
    }
    if (status) {
      query += ' AND t.status = ?';
      params.push(status);
    }

    query += ' ORDER BY t.created_at DESC';
    const tickets = db.prepare(query).all(...params);

    // Factual breakdown per technician
    const techMap = {};
    tickets.forEach(t => {
      const tech = t.technician_name || 'Unassigned';
      if (!techMap[tech]) {
        techMap[tech] = {
          technician_name: tech,
          total_assigned: 0,
          completed: 0,
          in_progress: 0,
          new: 0
        };
      }
      techMap[tech].total_assigned++;
      if (['Resolved', 'Completed'].includes(t.status)) {
        techMap[tech].completed++;
      } else if (['Assigned', 'Accepted', 'In Progress', 'Waiting'].includes(t.status)) {
        techMap[tech].in_progress++;
      } else {
        techMap[tech].new++;
      }
    });

    res.json({
      summary: {
        total_tickets: tickets.length,
        completed: tickets.filter(t => ['Resolved', 'Completed'].includes(t.status)).length,
        in_progress: tickets.filter(t => ['Assigned', 'Accepted', 'In Progress', 'Waiting'].includes(t.status)).length,
        new: tickets.filter(t => t.status === 'New').length
      },
      technician_statistics: Object.values(techMap),
      tickets
    });
  } catch (err) {
    console.error('Technician report error:', err);
    res.status(500).json({ error: 'Failed to generate technician report.' });
  }
});

// GET /api/reports/attendance
router.get('/attendance', authenticateToken, requirePermission('reports_view'), (req, res) => {
  try {
    const { start_date, end_date, employee_id, status } = req.query;

    let query = `
      SELECT a.*, u.full_name as employee_name, u.designation, u.phone as employee_phone
      FROM attendance a
      JOIN users u ON a.employee_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (start_date) {
      query += ' AND a.date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND a.date <= ?';
      params.push(end_date);
    }
    if (employee_id) {
      query += ' AND a.employee_id = ?';
      params.push(employee_id);
    }
    if (status) {
      query += ' AND a.status = ?';
      params.push(status);
    }

    query += ' ORDER BY a.date DESC, u.full_name ASC';
    const records = db.prepare(query).all(...params);

    const totalHours = records.reduce((acc, r) => acc + (r.hours_worked || 0), 0);
    const lateArrivals = records.filter(r => r.status === 'Late').length;
    const missingClockOuts = records.filter(r => r.clock_in_time && !r.clock_out_time).length;

    res.json({
      summary: {
        total_records: records.length,
        total_hours_worked: parseFloat(totalHours.toFixed(2)),
        late_arrivals: lateArrivals,
        missing_clock_outs: missingClockOuts
      },
      records
    });
  } catch (err) {
    console.error('Attendance report error:', err);
    res.status(500).json({ error: 'Failed to generate attendance report.' });
  }
});

module.exports = router;
