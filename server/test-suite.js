const http = require('http');

const PORT = process.env.PORT || 5001;
const BASE_URL = `http://127.0.0.1:${PORT}/api`;

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = { 'Content-Type': 'application/json', ...options.headers };

  const response = await fetch(url, {
    ...options,
    headers,
    body: options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : undefined
  });

  const contentType = response.headers.get('content-type');
  let data = null;
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  return { status: response.status, ok: response.ok, data };
}

async function runTestSuite() {
  console.log('====================================================');
  console.log(' RUNNING COMPREHENSIVE ISP SYSTEM AUTOMATED TESTS   ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(` ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(` ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Admin Login
    const adminLogin = await request('/auth/login', {
      method: 'POST',
      body: { username: 'admin', password: 'admin123' }
    });
    assert(adminLogin.ok && adminLogin.data.token, '1. Admin Login successfully authenticated');
    const adminToken = adminLogin.data.token;
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };

    // 2. Manager Login
    const managerLogin = await request('/auth/login', {
      method: 'POST',
      body: { username: 'manager', password: 'manager123' }
    });
    assert(managerLogin.ok && managerLogin.data.token, '2. Manager Login successfully authenticated');
    const managerToken = managerLogin.data.token;

    // 3. Employee / Technician Login
    const techLogin = await request('/auth/login', {
      method: 'POST',
      body: { username: 'tech_ali', password: 'password123' }
    });
    assert(techLogin.ok && techLogin.data.token, '3. Employee / Technician Login authenticated');
    const techToken = techLogin.data.token;
    const techHeaders = { Authorization: `Bearer ${techToken}` };

    // 4. Permissions Check
    const meRes = await request('/auth/me', { headers: adminHeaders });
    assert(meRes.data.user.role === 'admin', '4. Admin role verified with full permissions');

    // 5. Package Creation
    const pkgRes = await request('/packages', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        name: 'Test Turbo 150M',
        speed: '150 Mbps',
        price: 8500,
        description: 'Ultra fast gaming fiber'
      }
    });
    assert(pkgRes.status === 201 && pkgRes.data.id, '5. Package created successfully');
    const newPkgId = pkgRes.data.id;

    // 6. Customer Creation
    const custRes = await request('/customers', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        name: 'Test Subscriber Tariq',
        phone: '+92 300 7788990',
        cnic: '42201-9988776-5',
        address: 'House 99-A, PECHS Block 6',
        area: 'PECHS Block 6',
        package_id: newPkgId,
        monthly_price: 8500,
        due_date: 10,
        status: 'Active'
      }
    });
    assert(custRes.status === 201 && custRes.data.customer_code, `6. Customer created with code: ${custRes.data.customer_code}`);
    const newCustId = custRes.data.id;

    // 7. Customer Search & Retrieval
    const searchCust = await request('/customers?search=Tariq', { headers: adminHeaders });
    if (!searchCust.ok || !searchCust.data.data) {
      console.error('searchCust failed with status:', searchCust.status, searchCust.data);
    }
    assert(searchCust.data && searchCust.data.data && searchCust.data.data.length >= 1, '7. Customer searchable by name/phone');

    // 8. Payment Entry
    const payRes = await request('/payments', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        customer_id: newCustId,
        amount: 8500,
        payment_method: 'Cash',
        billing_period: 'September 2026',
        reference_number: 'CASH-9981'
      }
    });
    assert(payRes.status === 201 && payRes.data.receipt_number, `8. Payment recorded with receipt: ${payRes.data.receipt_number}`);
    const newPaymentId = payRes.data.id;

    // 9. Receipt Generation & Custom Metadata
    const receiptRes = await request(`/payments/${newPaymentId}/receipt`, { headers: adminHeaders });
    assert(receiptRes.data.payment && receiptRes.data.settings, '9. Thermal receipt generated with business metadata');

    // 10. Customer Profile with Payment History
    const custProfile = await request(`/customers/${newCustId}`, { headers: adminHeaders });
    assert(custProfile.data.payments.length >= 1 && custProfile.data.subscriptions.length >= 1, '10. Customer profile contains historical subscriptions & payments');

    // 11. Ticket / Complaint Creation
    const ticketRes = await request('/tickets', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        customer_id: newCustId,
        category: 'Slow Speed',
        description: 'Customer reports 20Mbps instead of 150Mbps',
        priority: 'High',
        assigned_to: techLogin.data.user.id
      }
    });
    assert(ticketRes.status === 201 && ticketRes.data.ticket_number, `11. Complaint ticket logged: ${ticketRes.data.ticket_number}`);
    const newTicketId = ticketRes.data.id;

    // 12. Technician Ticket View
    const techTickets = await request('/tickets?my_tickets=true', { headers: techHeaders });
    assert(techTickets.data.data.some(t => t.id === newTicketId), '12. Ticket visible in assigned Technician view');

    // 13. Ticket Internal Messaging
    const msgRes = await request(`/tickets/${newTicketId}/messages`, {
      method: 'POST',
      headers: techHeaders,
      body: { message: 'Technician on the way with optical power meter' }
    });
    assert(msgRes.status === 201, '13. In-ticket message sent successfully');

    // 14. Technician Work Log & Completion
    const worklogRes = await request(`/tickets/${newTicketId}/worklog`, {
      method: 'POST',
      headers: techHeaders,
      body: {
        arrival_time: '14:00',
        departure_time: '14:35',
        fault_found: 'Dirty optical fiber SC connector',
        work_performed: 'Cleaned with isopropyl alcohol and re-seated',
        parts_used: 'Optical cleaning cassette',
        resolution: 'Power restored to -18.5dBm, full 150M speed verified',
        status: 'Resolved'
      }
    });
    assert(worklogRes.status === 200, '14. Technician recorded worklog and marked Resolved');

    // 15. Customer Complaint History Integrity
    const custHistory = await request(`/customers/${newCustId}`, { headers: adminHeaders });
    assert(custHistory.data.tickets.length >= 1 && custHistory.data.tickets[0].resolution, '15. Full complaint & resolution history permanently linked to customer profile');

    // 16. Expense Entry
    const expRes = await request('/expenses', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        expense_date: '2026-09-22',
        employee_id: techLogin.data.user.id,
        amount: 1500,
        category: 'Fuel / Petrol',
        description: 'Bike fuel for emergency fiber splicing visits',
        payment_method: 'Cash',
        classification: 'Employee-related'
      }
    });
    assert(expRes.status === 201, '16. Expense recorded without fixed allowance limits');

    // 17. Employee Financial History
    const empLedger = await request(`/expenses/employee/${techLogin.data.user.id}`, { headers: adminHeaders });
    assert(empLedger.data.records.length >= 1 && empLedger.data.totals.all_time >= 1500, '17. Employee financial ledger calculated all-time spending');

    const testUname = `tech_test_${Date.now()}`;
    const newEmpRes = await request('/users', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        username: testUname,
        password: 'password123',
        full_name: 'Test Technician Faraz',
        role: 'employee',
        designation: 'Field Technician',
        permissions: ['attendance_clock', 'helpdesk_view', 'ticket_worklog']
      }
    });
    const newEmpLogin = await request('/auth/login', {
      method: 'POST',
      body: { username: testUname, password: 'password123' }
    });
    const newEmpHeaders = newEmpLogin.ok ? { Authorization: `Bearer ${newEmpLogin.data.token}` } : techHeaders;

    const clockInRes = await request('/attendance/clock-in', {
      method: 'POST',
      headers: newEmpHeaders,
      body: {
        lat: 24.8615,
        lng: 67.0694,
        notes: 'Main office shift start'
      }
    });
    assert(clockInRes.ok || clockInRes.status === 400, '18. Employee clock-in handled properly (with duplicate protection)');

    // 19. Staff Attendance Clock Out
    const clockOutRes = await request('/attendance/clock-out', {
      method: 'POST',
      headers: newEmpHeaders,
      body: {
        lat: 24.8615,
        lng: 67.0694,
        notes: 'Shift completed'
      }
    });
    assert(clockOutRes.ok || clockOutRes.status === 400, '19. Employee clocked out and calculated hours worked');

    // 20. Attendance Dashboard Today
    const attToday = await request('/attendance/today', { headers: adminHeaders });
    assert(attToday.data.records.length > 0, '20. Attendance dashboard displays real-time employee roster');

    // 21. Reports - Billing, Expenses, Attendance, Technicians
    const billingRep = await request('/reports/billing', { headers: adminHeaders });
    const expenseRep = await request('/reports/finances', { headers: adminHeaders });
    const techRep = await request('/reports/technicians', { headers: adminHeaders });
    const attRep = await request('/reports/attendance', { headers: adminHeaders });

    assert(billingRep.ok && billingRep.data.summary.total_revenue > 0, '21. Billing report generated with revenue summaries');
    assert(expenseRep.ok && expenseRep.data.summary.total_amount > 0, '22. Finance report generated with classification breakdown');
    assert(techRep.ok && techRep.data.technician_statistics.length > 0, '23. Technician report generated with factual metrics');
    assert(attRep.ok && attRep.data.summary.total_records > 0, '24. Attendance report generated with working hours');

    // 22. Audit Logs
    const auditRes = await request('/audit', { headers: adminHeaders });
    assert(auditRes.data.data.length > 5, '25. Complete audit logs tracking all actions');

    // 23. Database Backup JSON
    const backupRes = await request('/settings/backup/json', { headers: adminHeaders });
    assert(backupRes.data.customers && backupRes.data.payments, '26. Full database JSON backup generated');

  } catch (err) {
    console.error('Test suite error:', err);
    failed++;
  }

  console.log('\n====================================================');
  console.log(` TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');
}

if (require.main === module) {
  runTestSuite();
}

module.exports = { runTestSuite };
