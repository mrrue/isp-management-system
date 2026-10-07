import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  FileText,
  Calendar,
  Download,
  Printer,
  CreditCard,
  DollarSign,
  TrendingUp,
  Package
} from 'lucide-react';
import { exportToCSV, exportToExcel, exportToPDF } from '../../services/export';
import { Line, Bar } from 'react-chartjs-2';

export default function BillingReports() {
  const { formatCurrency, settings } = useAuth();
  const [loading, setLoading] = useState(true);

  const [reportData, setReportData] = useState({
    summary: { total_payments: 0, total_revenue: 0 },
    method_breakdown: [],
    package_breakdown: [],
    daily_trend: [],
    payments: []
  });

  // Filters
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // 1st of current month
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('');

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reports/billing', {
        start_date: startDate,
        end_date: endDate,
        payment_method: paymentMethod
      });
      setReportData(res);
    } catch (e) {
      console.error('Failed to load billing report:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [startDate, endDate, paymentMethod]);

  const handleExportCSV = () => {
    const data = reportData.payments.map(p => ({
      'Receipt No': p.receipt_number,
      'Date': p.payment_date,
      'Customer ID': p.customer_code,
      'Customer Name': p.customer_name,
      'Area': p.area,
      'Package': p.package_name,
      'Billing Period': p.billing_period,
      'Method': p.payment_method,
      'Amount': p.amount,
      'Collector': p.collector_name || ''
    }));
    exportToCSV(data, `billing_report_${startDate}_to_${endDate}`);
  };

  const handleExportExcel = () => {
    const data = reportData.payments.map(p => ({
      'Receipt No': p.receipt_number,
      'Date': p.payment_date,
      'Customer ID': p.customer_code,
      'Customer Name': p.customer_name,
      'Area': p.area,
      'Package': p.package_name,
      'Billing Period': p.billing_period,
      'Method': p.payment_method,
      'Amount': p.amount,
      'Collector': p.collector_name || ''
    }));
    exportToExcel(data, `billing_report_${startDate}_to_${endDate}`);
  };

  const handleExportPDF = () => {
    const columns = ['Receipt #', 'Date', 'Customer', 'Area', 'Period', 'Method', 'Amount'];
    const rows = reportData.payments.map(p => [
      p.receipt_number,
      p.payment_date,
      `${p.customer_name} (${p.customer_code})`,
      p.area,
      p.billing_period,
      p.payment_method,
      formatCurrency(p.amount)
    ]);

    exportToPDF({
      title: `${settings?.business_info?.name || 'ISP'} - Billing Revenue Report`,
      subtitle: `Period: ${startDate} to ${endDate} | Total Revenue: ${formatCurrency(reportData.summary.total_revenue)}`,
      columns,
      rows,
      filename: `billing_report_${startDate}_${endDate}.pdf`
    });
  };

  // Trend Chart Data
  const trendData = {
    labels: reportData.daily_trend.map(d => d.date),
    datasets: [
      {
        label: 'Daily Revenue',
        data: reportData.daily_trend.map(d => d.amount),
        borderColor: '#0284c7',
        backgroundColor: 'rgba(2, 132, 199, 0.1)',
        fill: true,
        tension: 0.3
      }
    ]
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200 no-print">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-sky-600" /> Revenue & Billing Reports
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Detailed revenue audit, collection trends, and payment method statistics
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
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-xl transition-colors border border-emerald-200"
          >
            <Download className="w-3.5 h-3.5" /> Excel
          </button>
          <button
            onClick={handleExportPDF}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-semibold rounded-xl transition-colors border border-sky-200"
          >
            <Download className="w-3.5 h-3.5" /> PDF
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5" /> Print
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
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
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Payment Method</label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
          >
            <option value="">All Payment Modes</option>
            <option value="Cash">Cash</option>
            <option value="JazzCash">JazzCash</option>
            <option value="Easypaisa">Easypaisa</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="SadaPay">SadaPay</option>
            <option value="Nayapay">Nayapay</option>
          </select>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Collected Revenue</span>
          <p className="text-2xl font-black text-emerald-600 mt-2">{formatCurrency(reportData.summary.total_revenue)}</p>
          <p className="text-xs text-slate-500 mt-1">Between {startDate} and {endDate}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Payments Recorded</span>
          <p className="text-2xl font-black text-slate-900 mt-2">{reportData.summary.total_payments}</p>
          <p className="text-xs text-slate-500 mt-1">Validated receipts</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Average Transaction</span>
          <p className="text-2xl font-black text-sky-700 mt-2">
            {formatCurrency(reportData.summary.total_payments > 0 ? reportData.summary.total_revenue / reportData.summary.total_payments : 0)}
          </p>
          <p className="text-xs text-slate-500 mt-1">Per receipt average</p>
        </div>
      </div>

      {/* Revenue Trend Graph */}
      {reportData.daily_trend.length > 0 && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs no-print">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-sky-600" /> Daily Revenue Collection Trend
          </h3>
          <div className="h-64">
            <Line data={trendData} options={{ maintainAspectRatio: false, responsive: true }} />
          </div>
        </div>
      )}

      {/* Breakdown Grids */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Payment Method Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-slate-600" /> Payment Modes Breakdown
          </h3>
          <div className="divide-y divide-slate-100 text-xs">
            {reportData.method_breakdown.map(m => (
              <div key={m.method} className="py-2.5 flex justify-between items-center">
                <div>
                  <span className="font-semibold text-slate-800">{m.method}</span>
                  <span className="text-slate-400 ml-2">({m.count} payments)</span>
                </div>
                <span className="font-bold text-emerald-600">{formatCurrency(m.total)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Package Revenue Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Package className="w-4 h-4 text-slate-600" /> Package Revenue Breakdown
          </h3>
          <div className="divide-y divide-slate-100 text-xs">
            {reportData.package_breakdown.map(p => (
              <div key={p.package} className="py-2.5 flex justify-between items-center">
                <div>
                  <span className="font-semibold text-slate-800">{p.package}</span>
                  <span className="text-slate-400 ml-2">({p.count} customers)</span>
                </div>
                <span className="font-bold text-sky-700">{formatCurrency(p.total)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed Transaction Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-sm font-bold text-slate-900">Detailed Transaction Log</h3>
          <span className="text-xs text-slate-500">{reportData.payments.length} items</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
              <tr>
                <th className="py-2.5 px-4">Receipt No</th>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">Customer</th>
                <th className="py-2.5 px-4">Area</th>
                <th className="py-2.5 px-4">Period</th>
                <th className="py-2.5 px-4">Mode</th>
                <th className="py-2.5 px-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reportData.payments.map(p => (
                <tr key={p.id}>
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{p.receipt_number}</td>
                  <td className="py-3 px-4 text-slate-600">{p.payment_date}</td>
                  <td className="py-3 px-4 font-bold text-slate-800">{p.customer_name} <span className="font-normal text-slate-500">({p.customer_code})</span></td>
                  <td className="py-3 px-4 text-slate-600">{p.area}</td>
                  <td className="py-3 px-4 font-semibold text-slate-700">{p.billing_period}</td>
                  <td className="py-3 px-4 text-slate-600">{p.payment_method}</td>
                  <td className="py-3 px-4 text-right font-bold text-emerald-600">{formatCurrency(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
