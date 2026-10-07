import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  FileText,
  Calendar,
  Download,
  Printer,
  Clock,
  UserCheck,
  AlertCircle
} from 'lucide-react';
import { exportToCSV, exportToExcel, exportToPDF } from '../../services/export';

export default function AttendanceReports() {
  const { settings } = useAuth();
  const [loading, setLoading] = useState(true);

  const [reportData, setReportData] = useState({
    summary: { total_records: 0, total_hours_worked: 0, late_arrivals: 0, missing_clock_outs: 0 },
    records: []
  });

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reports/attendance', {
        start_date: startDate,
        end_date: endDate
      });
      setReportData(res);
    } catch (e) {
      console.error('Failed to load attendance report:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [startDate, endDate]);

  const handleExportCSV = () => {
    const data = reportData.records.map(r => ({
      'Date': r.date,
      'Employee': r.employee_name,
      'Designation': r.designation || '',
      'Clock In': r.clock_in_time || '',
      'Clock Out': r.clock_out_time || '',
      'Hours Worked': r.hours_worked || 0,
      'Status': r.status,
      'Notes': r.notes || ''
    }));
    exportToCSV(data, `attendance_report_${startDate}_to_${endDate}`);
  };

  const handleExportPDF = () => {
    const columns = ['Date', 'Employee', 'Clock In', 'Clock Out', 'Hours', 'Status'];
    const rows = reportData.records.map(r => [
      r.date,
      r.employee_name,
      r.clock_in_time || '—',
      r.clock_out_time || '—',
      `${r.hours_worked || 0} hrs`,
      r.status
    ]);

    exportToPDF({
      title: `${settings?.business_info?.name || 'ISP'} - Attendance Audit Report`,
      subtitle: `Period: ${startDate} to ${endDate} | Total Logged Hours: ${reportData.summary.total_hours_worked} hrs`,
      columns,
      rows,
      filename: `attendance_report_${startDate}_${endDate}.pdf`
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200 no-print">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" /> Staff Attendance Reports
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Total working hours, late arrival trends, and shift attendance summaries
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
          <button
            onClick={handleExportPDF}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-semibold rounded-xl border border-sky-200"
          >
            <Download className="w-3.5 h-3.5" /> PDF
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" /> Print
          </button>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 gap-3 no-print">
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">From Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">To Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Shifts Logged</span>
          <p className="text-2xl font-black text-slate-900 mt-2">{reportData.summary.total_records}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Hours Worked</span>
          <p className="text-2xl font-black text-emerald-600 mt-2">{reportData.summary.total_hours_worked} hrs</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Late Arrivals</span>
          <p className="text-2xl font-black text-amber-600 mt-2">{reportData.summary.late_arrivals}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Missing Clock Outs</span>
          <p className="text-2xl font-black text-rose-600 mt-2">{reportData.summary.missing_clock_outs}</p>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">Attendance Log Details</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
              <tr>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">Employee</th>
                <th className="py-2.5 px-4">Clock In</th>
                <th className="py-2.5 px-4">Clock Out</th>
                <th className="py-2.5 px-4">Hours</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reportData.records.map(r => (
                <tr key={r.id}>
                  <td className="py-3 px-4 font-medium text-slate-700">{r.date}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">{r.employee_name}</td>
                  <td className="py-3 px-4 font-mono text-slate-800">{r.clock_in_time || '—'}</td>
                  <td className="py-3 px-4 font-mono text-slate-600">{r.clock_out_time || '—'}</td>
                  <td className="py-3 px-4 font-semibold text-slate-700">{r.hours_worked > 0 ? `${r.hours_worked} hrs` : '—'}</td>
                  <td className="py-3 px-4"><span className="font-semibold text-slate-800">{r.status}</span></td>
                  <td className="py-3 px-4 text-slate-500 text-[11px]">{r.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
