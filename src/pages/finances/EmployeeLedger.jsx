import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  ArrowLeft,
  User,
  DollarSign,
  Calendar,
  Download,
  Printer,
  Paperclip,
  Tag
} from 'lucide-react';
import Badge from '../../components/common/Badge';
import { exportToCSV, exportToPDF } from '../../services/export';

export default function EmployeeLedger() {
  const { id } = useParams();
  const { formatCurrency, settings } = useAuth();

  const [ledgerData, setLedgerData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchLedger = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/expenses/employee/${id}`);
      setLedgerData(res);
    } catch (e) {
      console.error('Failed to load employee ledger:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, [id]);

  const handleExportCSV = () => {
    if (!ledgerData) return;
    const data = ledgerData.records.map(r => ({
      'Date': r.expense_date,
      'Category': r.category,
      'Classification': r.classification,
      'Description': r.description,
      'Payment Method': r.payment_method,
      'Amount': r.amount,
      'Entered By': r.entered_by_name || ''
    }));
    exportToCSV(data, `employee_ledger_${ledgerData.employee.full_name}`);
  };

  const handleExportPDF = () => {
    if (!ledgerData) return;
    const columns = ['Date', 'Category', 'Description', 'Classification', 'Amount'];
    const rows = ledgerData.records.map(r => [
      r.expense_date,
      r.category,
      r.description,
      r.classification,
      formatCurrency(r.amount)
    ]);

    exportToPDF({
      title: `${settings?.business_info?.name || 'ISP'} - Employee Financial Ledger`,
      subtitle: `Employee: ${ledgerData.employee.full_name} (${ledgerData.employee.designation}) | All-time Total: ${formatCurrency(ledgerData.totals.all_time)}`,
      columns,
      rows,
      filename: `ledger_${ledgerData.employee.full_name}.pdf`
    });
  };

  if (loading || !ledgerData) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading employee ledger...</div>;
  }

  const { employee, totals, records } = ledgerData;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200 no-print">
        <div className="flex items-center gap-3">
          <Link
            to="/finances/expenses"
            className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{employee.full_name}</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Financial Record & Expense Ledger • <span className="font-semibold text-slate-700">{employee.designation || 'Staff'}</span>
            </p>
          </div>
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
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-semibold rounded-xl border border-sky-200 transition-colors"
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

      {/* Summary Totals Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Today</span>
          <p className="text-xl font-black text-slate-900 mt-1">{formatCurrency(totals.today)}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">This Week</span>
          <p className="text-xl font-black text-slate-900 mt-1">{formatCurrency(totals.this_week)}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">This Month</span>
          <p className="text-xl font-black text-sky-700 mt-1">{formatCurrency(totals.this_month)}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs bg-gradient-to-br from-white to-slate-50">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">All-Time Total</span>
          <p className="text-xl font-black text-emerald-600 mt-1">{formatCurrency(totals.all_time)}</p>
        </div>
      </div>

      {/* Complete Expense History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">All Recorded Transactions ({records.length})</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
              <tr>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">Category</th>
                <th className="py-2.5 px-4">Purpose / Description</th>
                <th className="py-2.5 px-4">Classification</th>
                <th className="py-2.5 px-4">Mode</th>
                <th className="py-2.5 px-4">Amount</th>
                <th className="py-2.5 px-4 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-slate-400">No expenses recorded for this employee.</td>
                </tr>
              ) : (
                records.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 text-slate-600 font-medium">{r.expense_date}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{r.category}</td>
                    <td className="py-3 px-4 text-slate-700 max-w-sm">{r.description}</td>
                    <td className="py-3 px-4"><Badge size="sm">{r.classification}</Badge></td>
                    <td className="py-3 px-4 text-slate-600">{r.payment_method}</td>
                    <td className="py-3 px-4 font-bold text-sm text-slate-900">{formatCurrency(r.amount)}</td>
                    <td className="py-3 px-4 text-right">
                      {r.receipt_url ? (
                        <a
                          href={r.receipt_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-sky-600 font-semibold hover:underline text-xs"
                        >
                          <Paperclip className="w-3.5 h-3.5" /> View Slip
                        </a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
