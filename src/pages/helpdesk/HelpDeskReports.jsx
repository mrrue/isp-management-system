import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  FileText,
  Calendar,
  Download,
  Printer,
  LifeBuoy,
  UserCheck,
  CheckCircle,
  Clock
} from 'lucide-react';
import { exportToCSV, exportToExcel, exportToPDF } from '../../services/export';

export default function HelpDeskReports() {
  const { settings } = useAuth();
  const [loading, setLoading] = useState(true);

  const [reportData, setReportData] = useState({
    summary: { total_tickets: 0, completed: 0, in_progress: 0, new: 0 },
    technician_statistics: [],
    tickets: []
  });

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedCategory, setSelectedCategory] = useState('');

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reports/technicians', {
        start_date: startDate,
        end_date: endDate,
        category: selectedCategory
      });
      setReportData(res);
    } catch (e) {
      console.error('Failed to load technician report:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [startDate, endDate, selectedCategory]);

  const handleExportCSV = () => {
    const data = reportData.tickets.map(t => ({
      'Ticket No': t.ticket_number,
      'Date': t.created_at,
      'Customer': t.customer_name,
      'Area': t.customer_area || '',
      'Category': t.category,
      'Priority': t.priority,
      'Technician': t.technician_name || 'Unassigned',
      'Status': t.status,
      'Arrival Time': t.arrival_time || '',
      'Departure Time': t.departure_time || '',
      'Fault Found': t.fault_found || '',
      'Work Performed': t.work_performed || '',
      'Parts Used': t.parts_used || '',
      'Resolution': t.resolution || '',
      'Completion Date': t.completion_date || ''
    }));
    exportToCSV(data, `technician_work_report_${startDate}_to_${endDate}`);
  };

  const handleExportPDF = () => {
    const columns = ['Ticket #', 'Customer', 'Category', 'Tech', 'Status', 'Resolution'];
    const rows = reportData.tickets.map(t => [
      t.ticket_number,
      t.customer_name,
      t.category,
      t.technician_name || 'Unassigned',
      t.status,
      t.resolution || t.description
    ]);

    exportToPDF({
      title: `${settings?.business_info?.name || 'ISP'} - Technician Factual Work Report`,
      subtitle: `Period: ${startDate} to ${endDate} | Total Logged Complaints: ${reportData.summary.total_tickets}`,
      columns,
      rows,
      filename: `technician_report_${startDate}_${endDate}.pdf`
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200 no-print">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-sky-600" /> Technician Work & Resolution Reports
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Factual records of tickets assigned, work performed, materials used, and completion times
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

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3 no-print">
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
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Category</label>
          <input
            type="text"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            placeholder="e.g. Fiber Cut, Slow Speed"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
          />
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Logged</span>
          <p className="text-2xl font-black text-slate-900 mt-2">{reportData.summary.total_tickets}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Completed / Resolved</span>
          <p className="text-2xl font-black text-emerald-600 mt-2">{reportData.summary.completed}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">In Progress</span>
          <p className="text-2xl font-black text-amber-600 mt-2">{reportData.summary.in_progress}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">New / Unassigned</span>
          <p className="text-2xl font-black text-sky-600 mt-2">{reportData.summary.new}</p>
        </div>
      </div>

      {/* Factual Technician Statistics Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
        <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-emerald-600" /> Technician Factual Activity Log
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold">
              <tr>
                <th className="py-2.5 px-4">Technician Name</th>
                <th className="py-2.5 px-4">Total Assigned</th>
                <th className="py-2.5 px-4">Resolved / Done</th>
                <th className="py-2.5 px-4">In Progress</th>
                <th className="py-2.5 px-4">New</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reportData.technician_statistics.map(stat => (
                <tr key={stat.technician_name}>
                  <td className="py-3 px-4 font-bold text-slate-900">{stat.technician_name}</td>
                  <td className="py-3 px-4 font-semibold text-slate-800">{stat.total_assigned}</td>
                  <td className="py-3 px-4 font-bold text-emerald-600">{stat.completed}</td>
                  <td className="py-3 px-4 font-bold text-amber-600">{stat.in_progress}</td>
                  <td className="py-3 px-4 font-bold text-sky-600">{stat.new}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Factual Work Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">Work Logs & Resolution Audit</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
              <tr>
                <th className="py-2.5 px-4">Ticket No</th>
                <th className="py-2.5 px-4">Customer</th>
                <th className="py-2.5 px-4">Technician</th>
                <th className="py-2.5 px-4">Fault Found</th>
                <th className="py-2.5 px-4">Work Done</th>
                <th className="py-2.5 px-4">Parts Used</th>
                <th className="py-2.5 px-4">Resolution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reportData.tickets.map(t => (
                <tr key={t.id}>
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{t.ticket_number}</td>
                  <td className="py-3 px-4 font-semibold text-slate-800">{t.customer_name}</td>
                  <td className="py-3 px-4 text-slate-700">{t.technician_name || 'Unassigned'}</td>
                  <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{t.fault_found || '—'}</td>
                  <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{t.work_performed || '—'}</td>
                  <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{t.parts_used || '—'}</td>
                  <td className="py-3 px-4 text-slate-900 font-medium max-w-xs">{t.resolution || t.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
