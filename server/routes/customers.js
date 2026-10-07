const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticateToken, requirePermission, logAudit } = require('../middleware/auth');

// GET /api/customers - List customers with filtering, search, and pagination
router.get('/', authenticateToken, (req, res) => {
  try {
    const {
      search,
      status,
      area,
      package_id,
      connection_status,
      due_date,
      page = 1,
      limit = 50,
      sort_by = 'name',
      sort_dir = 'ASC'
    } = req.query;

    let query = `
      SELECT c.*, p.name as package_name, p.speed as package_speed
      FROM customers c
      LEFT JOIN packages p ON c.package_id = p.id
      WHERE c.is_deleted = 0
    `;
    const params = [];

    if (search) {
      query += ` AND (
        c.customer_code LIKE ? OR
        c.name LIKE ? OR
        c.phone LIKE ? OR
        c.alt_phone LIKE ? OR
        c.address LIKE ? OR
        c.area LIKE ? OR
        c.cnic LIKE ?
      )`;
      const term = `%${search}%`;
      params.push(term, term, term, term, term, term, term);
    }

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

    if (connection_status) {
      query += ' AND c.connection_status = ?';
      params.push(connection_status);
    }

    if (due_date) {
      query += ' AND c.due_date = ?';
      params.push(parseInt(due_date));
    }

    // Count total before pagination
    const countQuery = `SELECT COUNT(*) as total FROM (${query})`;
    const totalCount = db.prepare(countQuery).get(...params).total;

    // Sorting and pagination
    const allowedSortFields = ['customer_code', 'name', 'phone', 'area', 'monthly_price', 'due_date', 'status', 'created_at', 'balance'];
    const validSort = allowedSortFields.includes(sort_by) ? sort_by : 'name';
    const validDir = sort_dir.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    query += ` ORDER BY c.${validSort} ${validDir}`;

    const parsedLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 200);
    const parsedPage = Math.max(parseInt(page) || 1, 1);
    const offset = (parsedPage - 1) * parsedLimit;

    query += ' LIMIT ? OFFSET ?';
    params.push(parsedLimit, offset);

    const customers = db.prepare(query).all(...params);

    // Get list of distinct areas for filter dropdown
    const areas = db.prepare("SELECT DISTINCT area FROM customers WHERE is_deleted = 0 AND area IS NOT NULL AND area != '' ORDER BY area ASC").all().map(r => r.area);

    res.json({
      data: customers,
      pagination: {
        total: totalCount,
        page: parsedPage,
        limit: parsedLimit,
        pages: Math.ceil(totalCount / parsedLimit)
      },
      areas
    });
  } catch (err) {
    console.error('Fetch customers error:', err);
    res.status(500).json({ error: 'Failed to fetch customers.' });
  }
});

// GET /api/customers/stats - Quick dashboard metrics
router.get('/stats', authenticateToken, (req, res) => {
  try {
    const total = db.prepare('SELECT COUNT(*) as count FROM customers WHERE is_deleted = 0').get().count;
    const active = db.prepare("SELECT COUNT(*) as count FROM customers WHERE is_deleted = 0 AND status = 'Active'").get().count;
    const suspended = db.prepare("SELECT COUNT(*) as count FROM customers WHERE is_deleted = 0 AND status = 'Suspended'").get().count;
    const pending = db.prepare("SELECT COUNT(*) as count FROM customers WHERE is_deleted = 0 AND status = 'Pending'").get().count;
    const overdue = db.prepare('SELECT COUNT(*) as count FROM customers WHERE is_deleted = 0 AND balance > 0').get().count;

    res.json({
      total,
      active,
      suspended,
      pending,
      overdue
    });
  } catch (err) {
    console.error('Customer stats error:', err);
    res.status(500).json({ error: 'Failed to fetch customer stats.' });
  }
});

// GET /api/customers/:id - Detailed customer profile with complete history
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const customer = db.prepare(`
      SELECT c.*, p.name as package_name, p.speed as package_speed
      FROM customers c
      LEFT JOIN packages p ON c.package_id = p.id
      WHERE c.id = ? AND c.is_deleted = 0
    `).get(req.params.id);

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    // Historical Subscriptions
    const subscriptions = db.prepare(`
      SELECT s.*, p.name as package_name, p.speed as package_speed
      FROM subscriptions s
      LEFT JOIN packages p ON s.package_id = p.id
      WHERE s.customer_id = ?
      ORDER BY s.created_at DESC
    `).all(req.params.id);

    // Historical Payments
    const payments = db.prepare(`
      SELECT p.*, u.full_name as created_by_name, v.full_name as voided_by_name
      FROM payments p
      LEFT JOIN users u ON p.created_by = u.id
      LEFT JOIN users v ON p.voided_by = v.id
      WHERE p.customer_id = ?
      ORDER BY p.payment_date DESC, p.created_at DESC
    `).all(req.params.id);

    // Historical Complaints / Tickets
    const tickets = db.prepare(`
      SELECT t.*, u.full_name as technician_name, cby.full_name as created_by_name
      FROM tickets t
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN users cby ON t.created_by = cby.id
      WHERE t.customer_id = ?
      ORDER BY t.created_at DESC
    `).all(req.params.id);

    // Fetch attachments and messages for these tickets
    const ticketsWithDetails = tickets.map(ticket => {
      const messages = db.prepare(`
        SELECT m.*, u.full_name as sender_name, u.role as sender_role
        FROM ticket_messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.ticket_id = ?
        ORDER BY m.created_at ASC
      `).all(ticket.id);

      const attachments = db.prepare(`
        SELECT * FROM ticket_attachments WHERE ticket_id = ? ORDER BY created_at DESC
      `).all(ticket.id);

      return {
        ...ticket,
        messages,
        attachments
      };
    });

    res.json({
      customer,
      subscriptions,
      payments,
      tickets: ticketsWithDetails
    });
  } catch (err) {
    console.error('Fetch customer profile error:', err);
    res.status(500).json({ error: 'Failed to fetch customer profile.' });
  }
});

// POST /api/customers - Create new customer
router.post('/', authenticateToken, requirePermission('customer_manage'), (req, res) => {
  try {
    const {
      name,
      cnic,
      phone,
      alt_phone,
      email,
      address,
      area,
      package_id,
      monthly_price,
      installation_date,
      subscription_start_date,
      billing_cycle,
      due_date,
      status,
      connection_status,
      notes
    } = req.body;

    if (!name || !phone || !address || !area || !package_id) {
      return res.status(400).json({ error: 'Name, phone, address, area, and package are required.' });
    }

    // Auto-generate customer ID if not provided, e.g. CUST-1001
    const lastCust = db.prepare('SELECT id FROM customers ORDER BY id DESC LIMIT 1').get();
    const nextId = lastCust ? lastCust.id + 1 : 1001;
    const customer_code = `CUST-${String(nextId).padStart(4, '0')}`;

    // Get package details for price if not custom
    let finalPrice = monthly_price;
    const pkg = db.prepare('SELECT * FROM packages WHERE id = ?').get(package_id);
    if (!pkg) {
      return res.status(400).json({ error: 'Selected package does not exist.' });
    }
    if (finalPrice === undefined || finalPrice === null || finalPrice === '') {
      finalPrice = pkg.price;
    }

    const today = new Date().toISOString().split('T')[0];
    const subStart = subscription_start_date || today;

    const insertStmt = db.prepare(`
      INSERT INTO customers (
        customer_code, name, cnic, phone, alt_phone, email, address, area,
        package_id, monthly_price, installation_date, subscription_start_date,
        billing_cycle, due_date, status, connection_status, balance, notes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insertStmt.run(
      customer_code,
      name.trim(),
      cnic || null,
      phone.trim(),
      alt_phone || null,
      email || null,
      address.trim(),
      area.trim(),
      package_id,
      parseFloat(finalPrice),
      installation_date || today,
      subStart,
      billing_cycle || 'monthly',
      parseInt(due_date) || 10,
      status || 'Active',
      connection_status || 'Connected',
      0,
      notes || null
    );

    const customerId = result.lastInsertRowid;

    // Create initial subscription record
    db.prepare(`
      INSERT INTO subscriptions (customer_id, package_id, start_date, renewal_date, amount, final_amount, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      customerId,
      package_id,
      subStart,
      null,
      parseFloat(finalPrice),
      parseFloat(finalPrice),
      'Active',
      'Initial Subscription'
    );

    logAudit(req.user.id, req.user.full_name, 'CUSTOMER_CREATE', 'customers', customerId, { customer_code, name, phone, package_id }, req.ip);

    res.status(201).json({
      message: 'Customer created successfully.',
      id: customerId,
      customer_code
    });
  } catch (err) {
    console.error('Create customer error:', err);
    res.status(500).json({ error: 'Failed to create customer.' });
  }
});

// PUT /api/customers/:id - Update customer
router.put('/:id', authenticateToken, requirePermission('customer_manage'), (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM customers WHERE id = ? AND is_deleted = 0').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    const {
      name,
      cnic,
      phone,
      alt_phone,
      email,
      address,
      area,
      package_id,
      monthly_price,
      installation_date,
      subscription_start_date,
      billing_cycle,
      due_date,
      status,
      connection_status,
      notes,
      balance
    } = req.body;

    const newPackageId = package_id !== undefined ? parseInt(package_id) : existing.package_id;
    const newPrice = monthly_price !== undefined ? parseFloat(monthly_price) : existing.monthly_price;

    // Check if package changed to record subscription history
    if (newPackageId !== existing.package_id || newPrice !== existing.monthly_price) {
      const today = new Date().toISOString().split('T')[0];
      // Mark previous active subscriptions as historical/changed
      db.prepare("UPDATE subscriptions SET status = 'Replaced' WHERE customer_id = ? AND status = 'Active'").run(existing.id);

      // Create new subscription record
      db.prepare(`
        INSERT INTO subscriptions (customer_id, package_id, start_date, amount, final_amount, status, notes)
        VALUES (?, ?, ?, ?, ?, 'Active', 'Package updated')
      `).run(existing.id, newPackageId, today, newPrice, newPrice);
    }

    db.prepare(`
      UPDATE customers
      SET
        name = ?, cnic = ?, phone = ?, alt_phone = ?, email = ?,
        address = ?, area = ?, package_id = ?, monthly_price = ?,
        installation_date = ?, subscription_start_date = ?, billing_cycle = ?,
        due_date = ?, status = ?, connection_status = ?, notes = ?, balance = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name !== undefined ? name.trim() : existing.name,
      cnic !== undefined ? cnic : existing.cnic,
      phone !== undefined ? phone.trim() : existing.phone,
      alt_phone !== undefined ? alt_phone : existing.alt_phone,
      email !== undefined ? email : existing.email,
      address !== undefined ? address.trim() : existing.address,
      area !== undefined ? area.trim() : existing.area,
      newPackageId,
      newPrice,
      installation_date !== undefined ? installation_date : existing.installation_date,
      subscription_start_date !== undefined ? subscription_start_date : existing.subscription_start_date,
      billing_cycle !== undefined ? billing_cycle : existing.billing_cycle,
      due_date !== undefined ? parseInt(due_date) : existing.due_date,
      status !== undefined ? status : existing.status,
      connection_status !== undefined ? connection_status : existing.connection_status,
      notes !== undefined ? notes : existing.notes,
      balance !== undefined ? parseFloat(balance) : existing.balance,
      req.params.id
    );

    logAudit(req.user.id, req.user.full_name, 'CUSTOMER_UPDATE', 'customers', req.params.id, { name, status, package_id: newPackageId }, req.ip);

    res.json({ message: 'Customer updated successfully.' });
  } catch (err) {
    console.error('Update customer error:', err);
    res.status(500).json({ error: 'Failed to update customer.' });
  }
});

// DELETE /api/customers/:id - Soft delete
router.delete('/:id', authenticateToken, requirePermission('customer_manage'), (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    db.prepare('UPDATE customers SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
    logAudit(req.user.id, req.user.full_name, 'CUSTOMER_DELETE', 'customers', req.params.id, { customer_code: existing.customer_code }, req.ip);

    res.json({ message: 'Customer deleted successfully (historical records retained).' });
  } catch (err) {
    console.error('Delete customer error:', err);
    res.status(500).json({ error: 'Failed to delete customer.' });
  }
});

module.exports = router;
