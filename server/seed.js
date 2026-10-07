const bcrypt = require('bcryptjs');
const { db, initDatabase } = require('./db');

function seedDatabase(force = false) {
  initDatabase();

  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount > 0 && !force) {
    console.log('Database already contains records. Skipping seed.');
    return;
  }

  console.log('Seeding fresh demo data...');

  if (force) {
    db.exec(`
      DELETE FROM audit_logs;
      DELETE FROM notifications;
      DELETE FROM attendance;
      DELETE FROM expenses;
      DELETE FROM ticket_attachments;
      DELETE FROM ticket_messages;
      DELETE FROM tickets;
      DELETE FROM payments;
      DELETE FROM subscriptions;
      DELETE FROM customers;
      DELETE FROM packages;
      DELETE FROM expense_categories;
      DELETE FROM ticket_statuses;
      DELETE FROM ticket_categories;
      DELETE FROM customer_statuses;
      DELETE FROM payment_methods;
      DELETE FROM settings;
      DELETE FROM users;
    `);
  }

  // 1. SETTINGS & BRANDING
  const businessInfo = {
    name: 'Apex FastNet Broadband',
    tagline: 'High Speed Optical Fiber Internet',
    address: 'Suite 402, Al-Madina Commercial Complex, Block 6, PECHS, Karachi',
    phone: '+92 300 1234567',
    alt_phone: '+92 21 34567890',
    whatsapp: '+92 300 1234567',
    email: 'support@apexfastnet.pk',
    website: 'https://apexfastnet.pk',
    ntn: 'NTN-7849201-9',
    currency: 'PKR',
    currency_symbol: 'Rs.',
    timezone: 'Asia/Karachi'
  };

  const branding = {
    primary_color: '#0284c7', // Sky-600
    secondary_color: '#0f172a', // Slate-900
    app_title: 'Apex FastNet ISP ERP',
    logo_url: '/logo.svg'
  };

  const receiptSettings = {
    receipt_title: 'PAYMENT RECEIPT',
    size: '80mm', // 58mm or 80mm
    header_text: 'APEX FASTNET BROADBAND\nHigh Speed Fiber Internet Services',
    footer_text: 'Thank you for choosing Apex FastNet.\nFor 24/7 Support: +92 300 1234567\nKeep this slip for your record.',
    show_logo: true,
    show_customer_id: true,
    show_customer_phone: true,
    show_customer_address: true,
    show_package: true,
    show_billing_period: true,
    show_payment_method: true,
    show_collector: true,
    font_size: 'normal'
  };

  const attendanceSettings = {
    shift_start: '09:00',
    shift_end: '18:00',
    grace_period: 15,
    require_selfie: true,
    require_location: true
  };

  const dashboardWidgets = {
    show_customers_stat: true,
    show_payments_stat: true,
    show_complaints_stat: true,
    show_expenses_stat: true,
    show_attendance_stat: true,
    show_revenue_chart: true,
    show_complaints_chart: true
  };

  const insertSetting = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
  insertSetting.run('business_info', JSON.stringify(businessInfo));
  insertSetting.run('branding', JSON.stringify(branding));
  insertSetting.run('receipt_settings', JSON.stringify(receiptSettings));
  insertSetting.run('attendance_settings', JSON.stringify(attendanceSettings));
  insertSetting.run('dashboard_widgets', JSON.stringify(dashboardWidgets));

  // 2. MASTER LISTS
  const paymentMethods = ['Cash', 'JazzCash', 'Easypaisa', 'Bank Transfer', 'SadaPay', 'Nayapay', 'Other'];
  paymentMethods.forEach(m => db.prepare('INSERT INTO payment_methods (name) VALUES (?)').run(m));

  const custStatuses = [
    { name: 'Active', color: '#10b981' },
    { name: 'Suspended', color: '#f59e0b' },
    { name: 'Disconnected', color: '#ef4444' },
    { name: 'Pending', color: '#8b5cf6' },
    { name: 'Relocation', color: '#06b6d4' }
  ];
  custStatuses.forEach(s => db.prepare('INSERT INTO customer_statuses (name, color) VALUES (?, ?)').run(s.name, s.color));

  const ticketCats = [
    'Internet Down / No Light',
    'Slow Speed',
    'Fiber Cable Cut / Fault',
    'Router Configuration',
    'WiFi Password Reset',
    'New Installation',
    'Relocation / Shifting',
    'Billing / Payment Query',
    'ONU / Router Hardware Fault'
  ];
  ticketCats.forEach(c => db.prepare('INSERT INTO ticket_categories (name) VALUES (?)').run(c));

  const ticketStatuses = [
    { name: 'New', color: '#64748b', is_closed: 0 },
    { name: 'Assigned', color: '#3b82f6', is_closed: 0 },
    { name: 'Accepted', color: '#0284c7', is_closed: 0 },
    { name: 'In Progress', color: '#eab308', is_closed: 0 },
    { name: 'Waiting for Parts', color: '#f97316', is_closed: 0 },
    { name: 'Resolved', color: '#10b981', is_closed: 1 },
    { name: 'Completed', color: '#059669', is_closed: 1 },
    { name: 'Cancelled', color: '#94a3b8', is_closed: 1 }
  ];
  ticketStatuses.forEach(s => db.prepare('INSERT INTO ticket_statuses (name, color, is_closed) VALUES (?, ?, ?)').run(s.name, s.color, s.is_closed));

  const expenseCats = [
    'Fuel / Petrol',
    'Bike Maintenance / Repair',
    'Transport / Ride',
    'Employee Food / Refreshment',
    'Fiber Splicing & Tools',
    'Cables & Connectors (RJ45/SC)',
    'Office Utility / Electricity',
    'Office Rent',
    'Hardware & Equipment',
    'Personal / Family',
    'Miscellaneous'
  ];
  expenseCats.forEach(c => db.prepare('INSERT INTO expense_categories (name) VALUES (?)').run(c));

  // 3. USERS (Admin, Manager, Employees/Technicians)
  const allPermissions = [
    'billing_view', 'billing_manage', 'customer_manage', 'payment_create', 'payment_void',
    'helpdesk_view', 'helpdesk_manage', 'ticket_assign', 'ticket_worklog',
    'finance_view', 'finance_manage', 'expense_create',
    'attendance_view', 'attendance_manage', 'attendance_clock',
    'reports_view', 'settings_manage', 'users_manage', 'audit_view', 'backup_manage'
  ];

  const managerPerms = [
    'billing_view', 'billing_manage', 'customer_manage', 'payment_create',
    'helpdesk_view', 'helpdesk_manage', 'ticket_assign', 'ticket_worklog',
    'finance_view', 'finance_manage', 'expense_create',
    'attendance_view', 'attendance_manage', 'attendance_clock',
    'reports_view'
  ];

  const technicianPerms = [
    'helpdesk_view', 'ticket_worklog',
    'attendance_clock', 'expense_create'
  ];

  const billingStaffPerms = [
    'billing_view', 'customer_manage', 'payment_create',
    'attendance_clock', 'expense_create'
  ];

  const insertUser = db.prepare(`
    INSERT INTO users (username, password_hash, full_name, email, phone, role, designation, permissions)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const adminPass = bcrypt.hashSync('admin123', 10);
  const managerPass = bcrypt.hashSync('manager123', 10);
  const staffPass = bcrypt.hashSync('password123', 10);

  const adminId = insertUser.run('admin', adminPass, 'Kamran Khan (Admin)', 'admin@apexfastnet.pk', '+92 300 1112233', 'admin', 'Chief Operating Officer', JSON.stringify(allPermissions)).lastInsertRowid;
  const managerId = insertUser.run('manager', managerPass, 'Tariq Mehmood (Operations Manager)', 'manager@apexfastnet.pk', '+92 301 2223344', 'manager', 'Operations Manager', JSON.stringify(managerPerms)).lastInsertRowid;
  const tech1Id = insertUser.run('tech_ali', staffPass, 'Ali Raza (Field Technician)', 'ali.tech@apexfastnet.pk', '+92 302 3334455', 'employee', 'Senior Fiber Technician', JSON.stringify(technicianPerms)).lastInsertRowid;
  const tech2Id = insertUser.run('tech_ahmed', staffPass, 'Ahmed Bilal (Field Technician)', 'ahmed.tech@apexfastnet.pk', '+92 303 4445566', 'employee', 'Network Field Technician', JSON.stringify(technicianPerms)).lastInsertRowid;
  const billingStaffId = insertUser.run('billing_sara', staffPass, 'Sara Noor (Billing Clerk)', 'sara.billing@apexfastnet.pk', '+92 304 5556677', 'employee', 'Accounts & Front Desk', JSON.stringify(billingStaffPerms)).lastInsertRowid;

  // 4. PACKAGES
  const packagesData = [
    { name: 'Starter Fiber', speed: '10 Mbps', price: 1500, desc: 'Ideal for single user browsing & SD streaming' },
    { name: 'Standard Home', speed: '20 Mbps', price: 2000, desc: 'Smooth HD streaming, gaming & family use' },
    { name: 'Fast Family Plus', speed: '35 Mbps', price: 2800, desc: 'Multiple 4K screens & high speed downloads' },
    { name: 'Ultra Pro Max', speed: '50 Mbps', price: 3800, desc: 'Heavy gamers, streamers & smart homes' },
    { name: 'Business Dedicated', speed: '100 Mbps', price: 6500, desc: 'Dedicated static IP & high priority bandwidth' }
  ];

  const packageIds = [];
  packagesData.forEach(p => {
    const res = db.prepare('INSERT INTO packages (name, speed, price, description) VALUES (?, ?, ?, ?)').run(p.name, p.speed, p.price, p.desc);
    packageIds.push(res.lastInsertRowid);
  });

  // 5. CUSTOMERS
  const customersData = [
    { code: 'CUST-1001', name: 'Muhammad Usman', cnic: '42201-1234567-1', phone: '+92 300 9876543', area: 'Block 2, PECHS', address: 'House 45-B, Street 12, PECHS Block 2', pkg: packageIds[1], price: 2000, status: 'Active', balance: 0 },
    { code: 'CUST-1002', name: 'Zubair Siddiqui', cnic: '42101-9876543-3', phone: '+92 312 4567890', area: 'Gulshan-e-Iqbal Block 13D', address: 'Flat B-4, Al-Rauf Heights, Block 13D', pkg: packageIds[2], price: 2800, status: 'Active', balance: 0 },
    { code: 'CUST-1003', name: 'Dr. Farhan Qureshi', cnic: '42201-4455667-5', phone: '+92 333 1122334', area: 'Clifton Block 5', address: 'Villa 18, Kehkashan, Clifton Block 5', pkg: packageIds[3], price: 3800, status: 'Active', balance: 0 },
    { code: 'CUST-1004', name: 'Syed Hamza Ali', cnic: '42301-8899001-7', phone: '+92 321 8877665', area: 'DHA Phase 6', address: 'House 124, 26th Commercial Street, DHA 6', pkg: packageIds[4], price: 6500, status: 'Active', balance: 0 },
    { code: 'CUST-1005', name: 'Bilal Shahid', cnic: '42201-3322114-9', phone: '+92 345 6677889', area: 'Bahadurabad', address: 'Plot 78, Kokan Society, Alamgir Road', pkg: packageIds[0], price: 1500, status: 'Suspended', balance: 3000 },
    { code: 'CUST-1006', name: 'Ayesha Nadeem', cnic: '42101-7788992-4', phone: '+92 315 9988776', area: 'Gulistan-e-Johar Block 15', address: 'Apartment 301, Saima Pride, Johar Block 15', pkg: packageIds[1], price: 2000, status: 'Active', balance: 0 },
    { code: 'CUST-1007', name: 'Waqas Merchant', cnic: '42301-5544332-1', phone: '+92 301 3344556', area: 'Tariq Road', address: 'Shop 14, Commercial Center, Tariq Road', pkg: packageIds[2], price: 2800, status: 'Active', balance: 2800 },
    { code: 'CUST-1008', name: 'Kashif Mehmood', cnic: '42201-6677889-8', phone: '+92 334 5566778', area: 'Block 6, PECHS', address: 'House 89-K, Nursery, PECHS Block 6', pkg: packageIds[0], price: 1500, status: 'Disconnected', balance: 4500 },
    { code: 'CUST-1009', name: 'Noman Riaz', cnic: '42101-1122334-6', phone: '+92 322 7788990', area: 'North Nazimabad Block H', address: 'House B-12, Block H, North Nazimabad', pkg: packageIds[1], price: 2000, status: 'Active', balance: 0 },
    { code: 'CUST-1010', name: 'Sohail Anjum', cnic: '42201-9988771-3', phone: '+92 300 2233445', area: 'Block 2, PECHS', address: 'Flat 12, Gul Plaza, Block 2 PECHS', pkg: packageIds[2], price: 2800, status: 'Active', balance: 0 }
  ];

  const custIds = [];
  const custStmt = db.prepare(`
    INSERT INTO customers (
      customer_code, name, cnic, phone, address, area,
      package_id, monthly_price, installation_date, subscription_start_date,
      billing_cycle, due_date, status, connection_status, balance
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, '2026-01-15', '2026-01-15', 'monthly', 10, ?, 'Connected', ?)
  `);

  customersData.forEach(c => {
    const res = custStmt.run(c.code, c.name, c.cnic, c.phone, c.address, c.area, c.pkg, c.price, c.status, c.balance);
    custIds.push(res.lastInsertRowid);

    // Initial Subscription record
    db.prepare(`
      INSERT INTO subscriptions (customer_id, package_id, start_date, amount, final_amount, status, notes)
      VALUES (?, ?, '2026-01-15', ?, ?, 'Active', 'Initial account setup')
    `).run(res.lastInsertRowid, c.pkg, c.price, c.price);
  });

  // 6. PAYMENTS (Historical and recent)
  const paymentsData = [
    { custIndex: 0, amount: 2000, method: 'Cash', date: '2026-09-02', period: 'September 2026' },
    { custIndex: 1, amount: 2800, method: 'JazzCash', date: '2026-09-04', period: 'September 2026' },
    { custIndex: 2, amount: 3800, method: 'Bank Transfer', date: '2026-09-05', period: 'September 2026' },
    { custIndex: 3, amount: 6500, method: 'Easypaisa', date: '2026-09-08', period: 'September 2026' },
    { custIndex: 5, amount: 2000, method: 'Cash', date: '2026-09-10', period: 'September 2026' },
    { custIndex: 8, amount: 2000, method: 'SadaPay', date: '2026-09-12', period: 'September 2026' },
    { custIndex: 9, amount: 2800, method: 'Cash', date: '2026-09-15', period: 'September 2026' },
    { custIndex: 0, amount: 2000, method: 'Cash', date: '2026-08-05', period: 'August 2026' },
    { custIndex: 1, amount: 2800, method: 'JazzCash', date: '2026-08-08', period: 'August 2026' },
    { custIndex: 2, amount: 3800, method: 'Bank Transfer', date: '2026-08-07', period: 'August 2026' }
  ];

  paymentsData.forEach((p, idx) => {
    const custId = custIds[p.custIndex];
    const recNo = `REC-202609-${String(1001 + idx)}`;
    db.prepare(`
      INSERT INTO payments (receipt_number, customer_id, amount, payment_method, payment_date, billing_period, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(recNo, custId, p.amount, p.method, p.date, p.period, billingStaffId);
  });

  // 7. COMPLAINTS / TICKETS
  const t1 = db.prepare(`
    INSERT INTO tickets (
      ticket_number, customer_id, customer_name, customer_phone, customer_address,
      category, description, priority, assigned_to, status, created_by,
      arrival_time, departure_time, fault_found, work_performed, parts_used, resolution, completion_date
    ) VALUES (
      'TCK-20260920-101', ?, 'Muhammad Usman', '+92 300 9876543', 'House 45-B, Street 12, PECHS Block 2',
      'Fiber Cable Cut / Fault', 'Red LOS light blinking on ONU. Internet completely down since morning.', 'High', ?, 'Resolved', ?,
      '2026-09-20 11:30:00', '2026-09-20 12:45:00', 'Drop fiber wire severed near utility pole outside house', 'Respliced core fiber cable with fusion splicer and tested optical power level (-19.2 dBm)', '1 SC APC connector, 2 protection sleeves', 'Signal restored, speed verified 20Mbps', '2026-09-20 12:45:00'
    )
  `).run(custIds[0], tech1Id, adminId);

  // Add messages & worklog to Ticket 1
  db.prepare(`
    INSERT INTO ticket_messages (ticket_id, sender_id, message)
    VALUES (?, ?, 'Assigned to Ali. Customer requested urgent resolution before 1 PM.')
  `).run(t1.lastInsertRowid, managerId);

  db.prepare(`
    INSERT INTO ticket_messages (ticket_id, sender_id, message)
    VALUES (?, ?, 'Arrived at location. Found cut in 2-core drop wire outside gate. Splicing now.')
  `).run(t1.lastInsertRowid, tech1Id);

  const t2 = db.prepare(`
    INSERT INTO tickets (
      ticket_number, customer_id, customer_name, customer_phone, customer_address,
      category, description, priority, assigned_to, status, created_by
    ) VALUES (
      'TCK-20260922-102', ?, 'Zubair Siddiqui', '+92 312 4567890', 'Flat B-4, Al-Rauf Heights, Block 13D',
      'Slow Speed', 'Customer complaints ping is high (180ms) and getting 5 Mbps on 35 Mbps package.', 'Medium', ?, 'In Progress', ?
    )
  `).run(custIds[1], tech2Id, managerId);

  db.prepare(`
    INSERT INTO ticket_messages (ticket_id, sender_id, message)
    VALUES (?, ?, 'Checked switch port at main distribution box. Port speed was auto-negotiated to 10M half duplex. Heading upstairs to re-crimp RJ45.')
  `).run(t2.lastInsertRowid, tech2Id);

  const t3 = db.prepare(`
    INSERT INTO tickets (
      ticket_number, customer_id, customer_name, customer_phone, customer_address,
      category, description, priority, assigned_to, status, created_by
    ) VALUES (
      'TCK-20260922-103', ?, 'Dr. Farhan Qureshi', '+92 333 1122334', 'Villa 18, Kehkashan, Clifton Block 5',
      'Router Configuration', 'Customer installed a new TP-Link Archer router and needs PPPoE VLAN tagging configured.', 'Low', ?, 'Assigned', ?
    )
  `).run(custIds[2], tech1Id, billingStaffId);

  // 8. EXPENSES (Realistic records as described in user prompt)
  const expensesData = [
    { empId: tech1Id, date: '2026-09-20', amount: 1500, cat: 'Fuel / Petrol', desc: 'Bike fuel for field visits in PECHS & Tariq Road', method: 'Cash', class: 'Employee-related' },
    { empId: tech1Id, date: '2026-09-21', amount: 2000, cat: 'Bike Maintenance / Repair', desc: 'Rear tyre puncture & brake shoe change', method: 'Cash', class: 'Employee-related' },
    { empId: tech1Id, date: '2026-09-22', amount: 1000, cat: 'Fuel / Petrol', desc: 'Fuel refill for urgent Clifton calls', method: 'Cash', class: 'Employee-related' },
    { empId: tech2Id, date: '2026-09-21', amount: 1200, cat: 'Fuel / Petrol', desc: 'Field bike petrol allowance', method: 'Cash', class: 'Employee-related' },
    { empId: tech2Id, date: '2026-09-22', amount: 800, cat: 'Transport / Ride', desc: 'Auto rickshaw fare carrying fiber drum', method: 'Cash', class: 'Business' },
    { empId: null, date: '2026-09-18', amount: 14500, cat: 'Fiber Splicing & Tools', desc: 'Purchased 2-Rolls 2-Core Drop Fiber Wire (2km)', method: 'Bank Transfer', class: 'Business' },
    { empId: null, date: '2026-09-19', amount: 3500, cat: 'Cables & Connectors (RJ45/SC)', desc: 'Box of 100 Fast Connectors SC-APC & Cat6 RJ45 clips', method: 'Cash', class: 'Business' },
    { empId: null, date: '2026-09-21', amount: 5000, cat: 'Personal / Family', desc: 'Home grocery & personal expense', method: 'Cash', class: 'Personal' }
  ];

  expensesData.forEach(e => {
    db.prepare(`
      INSERT INTO expenses (expense_date, employee_id, amount, category, description, payment_method, classification, entered_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(e.date, e.empId, e.amount, e.cat, e.desc, e.method, e.class, adminId);
  });

  // 9. ATTENDANCE (Today & Yesterday)
  const today = new Date().toISOString().split('T')[0];

  // Ali clocked in today
  db.prepare(`
    INSERT INTO attendance (
      employee_id, date, clock_in_time, clock_in_lat, clock_in_lng,
      clock_in_address, status, hours_worked, notes
    ) VALUES (
      ?, ?, '08:55', 24.8615, 67.0694, 'PECHS Block 6 Office HQ', 'Present', 0, 'On-time arrival'
    )
  `).run(tech1Id, today);

  // Ahmed clocked in slightly late today
  db.prepare(`
    INSERT INTO attendance (
      employee_id, date, clock_in_time, clock_in_lat, clock_in_lng,
      clock_in_address, status, hours_worked, notes
    ) VALUES (
      ?, ?, '09:25', 24.8710, 67.0580, 'PECHS Main Hub', 'Late', 0, 'Traffic at Nursery Flyover'
    )
  `).run(tech2Id, today);

  // Sara completed full day yesterday
  db.prepare(`
    INSERT INTO attendance (
      employee_id, date, clock_in_time, clock_out_time, clock_in_lat, clock_in_lng,
      clock_in_address, status, hours_worked, notes
    ) VALUES (
      ?, '2026-09-21', '09:00', '18:00', 24.8615, 67.0694, 'Main Office', 'Present', 9.0, 'Regular shift'
    )
  `).run(billingStaffId);

  // 10. NOTIFICATIONS
  db.prepare(`
    INSERT INTO notifications (user_id, title, message, link, type)
    VALUES (?, 'Ticket Assigned', 'You have been assigned Ticket #TCK-20260922-102', '/helpdesk/tickets', 'ticket')
  `).run(tech2Id);

  db.prepare(`
    INSERT INTO notifications (user_id, title, message, link, type)
    VALUES (?, 'Monthly Summary Ready', 'September 2026 billing records have reached 80% collection.', '/reports/billing', 'info')
  `).run(adminId);

  // 11. AUDIT LOGS
  db.prepare(`
    INSERT INTO audit_logs (user_id, user_name, action, entity_type, details)
    VALUES (?, 'System', 'SYSTEM_INITIALIZE', 'system', 'Demo database initialized with master data, customers, packages, tickets and expenses')
  `).run(adminId);

  console.log('Demo data seeded successfully!');
}

if (require.main === module) {
  seedDatabase(true);
}

module.exports = {
  seedDatabase
};
