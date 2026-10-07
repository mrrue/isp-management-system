import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  History,
  Calendar,
  Search,
  Filter,
  Camera,
  MapPin,
  Download,
  Printer
} from 'lucide-react';
import Badge from '../../components/common/Badge';
import Pagination from '../../components/common/Pagination';
import { exportToCSV } from '../../services/export';

export default function AttendanceHistory() {
  const { user, hasPermission } = useAuth();
  const [history, setHistory] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchHistory = async (page = 1) => {
    setLoading(true);
    try {
      const res = await api.get('/attendance/history', {
        page,
        limit: 20,
        employee_id: selectedEmployee,
        status: selectedStatus,
        start_date: startDate,
        end_date: endDate
      });
      setHistory(res.data || []);
      setPagination(res.pagination || { page: 1, limit: 20, total: 0, pages: 1 });
    } catch (e) {
      console.error('Failed to load history:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users', { is_active: true });
      setUsers(res || []);
    } catch (e) {}
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchHistory(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [selectedEmployee, selectedStatus, startDate, endDate]);

  const handleExportCSV = () => {
    const data = history.map(h => ({
      'Date': h.date,
      'Employee': h.employee_name,
      'Designation': h.designation || '',
      'Clock In': h.clock_in_time || '',
      'Clock Out': h.clock_out_time || '',
      'Hours Worked': h.hours_worked || 0,
      'Status': h.status,
      'Notes': h.notes || ''
    }));
    exportToCSV(data, 'attendance_history_export');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-sky-600" /> Attendance Audit Logs & History
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Historical clock in/out times, selfies, and GPS coordinate tracking
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
        >
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-4 gap-3">
        {(hasPermission('attendance_manage') || user?.role === 'admin') && (
          <div>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
            >
              <option value="">All Employees</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.full_name}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
          >
            <option value="">All Statuses</option>
            <option value="Present">Present</option>
            <option value="Late">Late</option>
            <option value="Half Day">Half Day</option>
            <option value="Absent">Absent</option>
          </select>
        </div>

        <div>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
            title="From Date"
          />
        </div>

        <div>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
            title="To Date"
          />
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Clock In</th>
                <th className="py-3 px-4">Clock Out</th>
                <th className="py-3 px-4">Hours</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Notes</th>
                <th className="py-3 px-4 text-right">Selfie / GPS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-10 text-slate-400">Loading attendance logs...</td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-10 text-slate-400">No attendance logs found.</td>
                </tr>
              ) : (
                history.map(h => (
                  <tr key={h.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-700">{h.date}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{h.employee_name}</td>
                    <td className="py-3 px-4 font-mono text-slate-800">{h.clock_in_time || '—'}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{h.clock_out_time || '—'}</td>
                    <td className="py-3 px-4 font-semibold text-slate-700">{h.hours_worked > 0 ? `${h.hours_worked} hrs` : '—'}</td>
                    <td className="py-3 px-4"><Badge size="sm">{h.status}</Badge></td>
                    <td className="py-3 px-4 text-slate-500 text-[11px] max-w-xs truncate">{h.notes || '—'}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {h.clock_in_selfie && (
                          <a href={h.clock_in_selfie} target="_blank" rel="noreferrer" className="p-1.5 bg-sky-50 text-sky-700 rounded-lg text-xs" title="Clock In Selfie">
                            <Camera className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {h.clock_in_lat && (
                          <a href={`https://maps.google.com/?q=${h.clock_in_lat},${h.clock_in_lng}`} target="_blank" rel="noreferrer" className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs" title="GPS Map">
                            <MapPin className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination pagination={pagination} onPageChange={(p) => fetchHistory(p)} />
      </div>
    </div>
  );
}
