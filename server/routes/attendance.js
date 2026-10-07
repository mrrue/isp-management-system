const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { db } = require('../db');
const { authenticateToken, requirePermission, logAudit } = require('../middleware/auth');

// Helper to save base64 selfie image to uploads folder
function saveSelfie(base64Data, prefix = 'attendance') {
  if (!base64Data || !base64Data.startsWith('data:image')) return null;
  try {
    const matches = base64Data.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return null;

    const extension = matches[1].split('/')[1] || 'jpeg';
    const buffer = Buffer.from(matches[2], 'base64');
    const filename = `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e9)}.${extension}`;
    const filePath = path.join(__dirname, '../../uploads', filename);

    fs.writeFileSync(filePath, buffer);
    return `/uploads/${filename}`;
  } catch (err) {
    console.error('Failed to save selfie:', err);
    return null;
  }
}

// GET /api/attendance/today - Attendance dashboard status for today
router.get('/today', authenticateToken, (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Fetch all active employees
    const employees = db.prepare("SELECT id, full_name, designation, phone FROM users WHERE is_active = 1 AND role IN ('employee', 'manager') ORDER BY full_name ASC").all();

    // Fetch today's attendance records
    const attendanceRecords = db.prepare(`
      SELECT a.*, u.full_name as employee_name, u.designation
      FROM attendance a
      JOIN users u ON a.employee_id = u.id
      WHERE a.date = ?
    `).all(today);

    const recordMap = {};
    attendanceRecords.forEach(rec => {
      recordMap[rec.employee_id] = rec;
    });

    const summary = employees.map(emp => {
      const record = recordMap[emp.id];
      return {
        employee_id: emp.id,
        employee_name: emp.full_name,
        designation: emp.designation,
        phone: emp.phone,
        is_clocked_in: !!(record && record.clock_in_time && !record.clock_out_time),
        is_clocked_out: !!(record && record.clock_out_time),
        clock_in_time: record ? record.clock_in_time : null,
        clock_out_time: record ? record.clock_out_time : null,
        clock_in_selfie: record ? record.clock_in_selfie : null,
        clock_out_selfie: record ? record.clock_out_selfie : null,
        clock_in_lat: record ? record.clock_in_lat : null,
        clock_in_lng: record ? record.clock_in_lng : null,
        clock_in_address: record ? record.clock_in_address : null,
        clock_out_address: record ? record.clock_out_address : null,
        status: record ? record.status : 'Not Clocked In',
        hours_worked: record ? record.hours_worked : 0,
        notes: record ? record.notes : null
      };
    });

    const clockedInCount = summary.filter(s => s.is_clocked_in).length;
    const completedCount = summary.filter(s => s.is_clocked_out).length;
    const notClockedInCount = summary.filter(s => !s.clock_in_time).length;
    const lateCount = summary.filter(s => s.status === 'Late').length;

    res.json({
      date: today,
      stats: {
        total_employees: employees.length,
        clocked_in: clockedInCount,
        completed: completedCount,
        not_clocked_in: notClockedInCount,
        late: lateCount
      },
      records: summary
    });
  } catch (err) {
    console.error('Fetch today attendance error:', err);
    res.status(500).json({ error: 'Failed to fetch attendance.' });
  }
});

// GET /api/attendance/my-status - Current user clock-in status for today
router.get('/my-status', authenticateToken, (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const record = db.prepare('SELECT * FROM attendance WHERE employee_id = ? AND date = ?').get(req.user.id, today);

    res.json({
      date: today,
      is_clocked_in: !!(record && record.clock_in_time && !record.clock_out_time),
      is_clocked_out: !!(record && record.clock_out_time),
      record: record || null
    });
  } catch (err) {
    console.error('My attendance status error:', err);
    res.status(500).json({ error: 'Failed to fetch attendance status.' });
  }
});

// POST /api/attendance/clock-in
router.post('/clock-in', authenticateToken, (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const existing = db.prepare('SELECT * FROM attendance WHERE employee_id = ? AND date = ?').get(req.user.id, today);

    if (existing && existing.clock_in_time) {
      return res.status(400).json({ error: 'You have already clocked in today.' });
    }

    const {
      selfie,
      lat,
      lng,
      address,
      permission_denied,
      device_info,
      notes
    } = req.body;

    const selfieUrl = selfie ? saveSelfie(selfie, `clockin-${req.user.id}`) : null;
    const now = new Date();
    const currentTimeStr = now.toTimeString().split(' ')[0].substring(0, 5); // HH:MM

    // Fetch shift settings to determine if Late
    const settingRow = db.prepare("SELECT value FROM settings WHERE key = 'attendance_settings'").get();
    let shiftStart = '09:00';
    let graceMinutes = 15;

    if (settingRow) {
      try {
        const parsed = JSON.parse(settingRow.value);
        if (parsed.shift_start) shiftStart = parsed.shift_start;
        if (parsed.grace_period) graceMinutes = parseInt(parsed.grace_period) || 15;
      } catch (e) {}
    }

    // Check if late
    const [shiftH, shiftM] = shiftStart.split(':').map(Number);
    const shiftTotalMinutes = shiftH * 60 + shiftM + graceMinutes;
    const [nowH, nowM] = currentTimeStr.split(':').map(Number);
    const nowTotalMinutes = nowH * 60 + nowM;

    const status = nowTotalMinutes > shiftTotalMinutes ? 'Late' : 'Present';

    if (existing) {
      db.prepare(`
        UPDATE attendance
        SET clock_in_time = ?, clock_in_selfie = ?, clock_in_lat = ?, clock_in_lng = ?,
            clock_in_address = ?, clock_in_permission_denied = ?, device_info = ?,
            status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        currentTimeStr,
        selfieUrl,
        lat || null,
        lng || null,
        address || null,
        permission_denied ? 1 : 0,
        device_info || null,
        status,
        notes || null,
        existing.id
      );
    } else {
      db.prepare(`
        INSERT INTO attendance (
          employee_id, date, clock_in_time, clock_in_selfie, clock_in_lat,
          clock_in_lng, clock_in_address, clock_in_permission_denied,
          device_info, status, notes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        req.user.id,
        today,
        currentTimeStr,
        selfieUrl,
        lat || null,
        lng || null,
        address || null,
        permission_denied ? 1 : 0,
        device_info || null,
        status,
        notes || null
      );
    }

    logAudit(req.user.id, req.user.full_name, 'ATTENDANCE_CLOCK_IN', 'attendance', req.user.id, { time: currentTimeStr, status }, req.ip);

    res.json({
      message: `Clocked in successfully at ${currentTimeStr}! Status: ${status}`,
      clock_in_time: currentTimeStr,
      status
    });
  } catch (err) {
    console.error('Clock in error:', err);
    res.status(500).json({ error: 'Failed to clock in.' });
  }
});

// POST /api/attendance/clock-out
router.post('/clock-out', authenticateToken, (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const existing = db.prepare('SELECT * FROM attendance WHERE employee_id = ? AND date = ?').get(req.user.id, today);

    if (!existing || !existing.clock_in_time) {
      return res.status(400).json({ error: 'You have not clocked in yet today.' });
    }

    if (existing.clock_out_time) {
      return res.status(400).json({ error: 'You have already clocked out today.' });
    }

    const {
      selfie,
      lat,
      lng,
      address,
      permission_denied,
      notes
    } = req.body;

    const selfieUrl = selfie ? saveSelfie(selfie, `clockout-${req.user.id}`) : null;
    const now = new Date();
    const currentTimeStr = now.toTimeString().split(' ')[0].substring(0, 5); // HH:MM

    // Calculate hours worked
    const [inH, inM] = existing.clock_in_time.split(':').map(Number);
    const [outH, outM] = currentTimeStr.split(':').map(Number);
    const totalMinutes = Math.max((outH * 60 + outM) - (inH * 60 + inM), 0);
    const hoursWorked = parseFloat((totalMinutes / 60).toFixed(2));

    db.prepare(`
      UPDATE attendance
      SET clock_out_time = ?, clock_out_selfie = ?, clock_out_lat = ?,
          clock_out_lng = ?, clock_out_address = ?, clock_out_permission_denied = ?,
          hours_worked = ?, notes = COALESCE(notes || ' | ' || ?, notes),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      currentTimeStr,
      selfieUrl,
      lat || null,
      lng || null,
      address || null,
      permission_denied ? 1 : 0,
      hoursWorked,
      notes || null,
      existing.id
    );

    logAudit(req.user.id, req.user.full_name, 'ATTENDANCE_CLOCK_OUT', 'attendance', existing.id, { time: currentTimeStr, hoursWorked }, req.ip);

    res.json({
      message: `Clocked out successfully at ${currentTimeStr}! Total: ${hoursWorked} hrs.`,
      clock_out_time: currentTimeStr,
      hours_worked: hoursWorked
    });
  } catch (err) {
    console.error('Clock out error:', err);
    res.status(500).json({ error: 'Failed to clock out.' });
  }
});

// GET /api/attendance/history - Attendance logs with employee and date filters
router.get('/history', authenticateToken, (req, res) => {
  try {
    const { employee_id, start_date, end_date, status, page = 1, limit = 50 } = req.query;

    let query = `
      SELECT a.*, u.full_name as employee_name, u.designation, u.phone as employee_phone
      FROM attendance a
      JOIN users u ON a.employee_id = u.id
      WHERE 1=1
    `;
    const params = [];

    // If employee viewing their own history
    if (req.user.role === 'employee' && !req.user.permissions.includes('attendance_manage')) {
      query += ' AND a.employee_id = ?';
      params.push(req.user.id);
    } else if (employee_id) {
      query += ' AND a.employee_id = ?';
      params.push(employee_id);
    }

    if (start_date) {
      query += ' AND a.date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND a.date <= ?';
      params.push(end_date);
    }

    if (status) {
      query += ' AND a.status = ?';
      params.push(status);
    }

    const countQuery = `SELECT COUNT(*) as total FROM (${query})`;
    const totalCount = db.prepare(countQuery).get(...params).total;

    query += ' ORDER BY a.date DESC, a.clock_in_time DESC';

    const parsedLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 200);
    const parsedPage = Math.max(parseInt(page) || 1, 1);
    const offset = (parsedPage - 1) * parsedLimit;

    query += ' LIMIT ? OFFSET ?';
    params.push(parsedLimit, offset);

    const history = db.prepare(query).all(...params);

    res.json({
      data: history,
      pagination: {
        total: totalCount,
        page: parsedPage,
        limit: parsedLimit,
        pages: Math.ceil(totalCount / parsedLimit)
      }
    });
  } catch (err) {
    console.error('Fetch attendance history error:', err);
    res.status(500).json({ error: 'Failed to fetch attendance history.' });
  }
});

module.exports = router;
