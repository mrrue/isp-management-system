import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  FileText,
  Calendar,
  Download,
  Printer,
  DollarSign,
  PieChart,
  User,
  Tag,
  Filter,
  FileSpreadsheet
} from 'lucide-react';
import Badge from '../../components/common/Badge';
import { exportToCSV, exportToExcel, exportToPDF } from '../../services/export';
import { Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function FinanceReports() {
  const { formatCurrency, settings } = useAuth();
  const [loading, setLoading] = useState(true);

  const [reportData, setReportData] = useState({
    summary: { total_records: 0, total_amount: 0 },
    classification_breakdown: [],
    category_breakdown: [],
    employee_breakdown: [],
    expenses: []
  });

  const [categories, setCategories] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [classification, setClassification] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');

  // Fetch helper lists
  useEffect(() => {
    const loadMeta = async () => {
      try {
        const [catRes, userRes] = await Promise.all([
          api.get('/expenses/categories').catch(() => []),
          api.get('/users').catch(() => [])
        ]);
        setCategories(Array.isArray(catRes) ? catRes : []);
        setEmployees(Array.isArray(userRes) ? userRes : []);
      } catch (e) {
        console.error('Failed to load filter metadata:', e);
      }
    };
    loadMeta();
  }, []);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reports/finances', {
        start_date: startDate,
        end_date: endDate,
        classification: classification || undefined,
        category: selectedCategory || undefined,
        employee_id: selectedEmployee || undefined
      });
      setReportData({
        summary: res.summary || { total_records: 0, total_amount: 0 },
        classification_breakdown: res.classification_breakdown || [],
        category_breakdown: res.category_breakdown || [],
        employee_breakdown: res.employee_breakdown || [],
        expenses: res.expenses || []
      });
    } catch (e) {
      console.error('Failed to load finance report:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [startDate, endDate, classification, selectedCategory, selectedEmployee]);

  const handleExportCSV = () => {
    const data = (reportData.expenses || []).map(e => ({
      'Date': e.expense_date,
      'Person/Employee': e.employee_name || 'General Office',
      'Category': e.category,
      'Classification': e.classification,
      'Description': e.description,
      'Payment Method': e.payment_method,
      'Amount': e.amount,
      'Entered By': e.entered_by_name || ''
    }));
    exportToCSV(data, `finance_report_${startDate}_to_${endDate}`);
  };

  const handleExportExcel = () => {
    const data = (reportData.expenses || []).map(e => ({
      'Date': e.expense_date,
      'Person/Employee': e.employee_name || 'General Office',
      'Category': e.category,
      'Classification': e.classification,
      'Description': e.description,
      'Payment Method': e.payment_method,
      'Amount': e.amount,
      'Entered By': e.entered_by_name || ''
    }));
    exportToExcel(data, `finance_report_${startDate}_to_${endDate}`);
  };

  const handleExportPDF = () => {
    const columns = ['Date', 'Person/Emp', 'Category', 'Classification', 'Description', 'Amount'];
    const rows = (reportData.expenses || []).map(e => [
      e.expense_date,
      e.employee_name || 'General Office',
      e.category,
      e.classification,
      e.description,
      formatCurrency(e.amount)
    ]);

    exportToPDF({
      title: `${settings?.business_info?.name || 'ISP'} - Expense & Finance Report`,
      subtitle: `Period: ${startDate} to ${endDate} | Total Expenditure: ${formatCurrency(reportData.summary.total_amount)}`,
      columns,
      rows,
      filename: `finance_report_${startDate}_${endDate}.pdf`
    });
  };

  // Classification Chart
  const classChartData = {
    labels: (reportData.classification_breakdown || []).map(c => c.classification),
    datasets: [
      {
        data: (reportData.classification_breakdown || []).map(c => c.total),
        backgroundColor: ['#0284c7', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#64748b'],
        borderWidth: 0
      }
    ]
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200 no-print">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" /> Expense & Spending Reports
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Business vs Personal expenditures, category totals, and employee expense summaries
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
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-xl border border-emerald-200 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
          </button>
          <button
            onClick={handleExportPDF}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-semibold rounded-xl border border-sky-200 transition-colors"
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

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 no-print">
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">From Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">To Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Classification</label>
          <select
            value={classification}
            onChange={(e) => setClassification(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            <option value="">All Classifications</option>
            <option value="Business">Business Only</option>
            <option value="Employee-related">Employee-related Only</option>
            <option value="Personal">Personal Only</option>
            <option value="Family">Family Only</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Category</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            <option value="">All Categories</option>
            {categories.map((c, idx) => (
              <option key={idx} value={c.name || c}>{c.name || c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Employee / Person</label>
          <select
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            <option value="">All Staff / General</option>
            {employees.map(u => (
              <option key={u.id} value={u.id}>{u.full_name} ({u.designation || u.role})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Total Spending Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Money Spent</span>
          <p className="text-2xl font-black text-rose-600 mt-2">{formatCurrency(reportData.summary.total_amount || 0)}</p>
          <p className="text-xs text-slate-500 mt-1">Between {startDate} and {endDate}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Expense Entries</span>
          <p className="text-2xl font-black text-slate-900 mt-2">{reportData.summary.total_records || 0}</p>
          <p className="text-xs text-slate-500 mt-1">Recorded line items</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Average Expense</span>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {formatCurrency(reportData.summary.total_records > 0 ? (reportData.summary.total_amount / reportData.summary.total_records) : 0)}
          </p>
          <p className="text-xs text-slate-500 mt-1">Per transaction average</p>
        </div>
      </div>

      {/* Visual Charts & Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Business vs Personal Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-sky-600" />
            Business vs Personal Breakdown
          </h3>
          {reportData.classification_breakdown.length > 0 ? (
            <>
              <div className="h-40 flex items-center justify-center my-2">
                <Doughnut data={classChartData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
              </div>
              <div className="divide-y divide-slate-100 text-xs mt-3">
                {reportData.classification_breakdown.map(c => (
                  <div key={c.classification} className="py-2 flex justify-between items-center">
                    <div>
                      <span className="font-semibold text-slate-800">{c.classification}</span>
                      <span className="text-slate-400 ml-2">({c.count} items)</span>
                    </div>
                    <span className="font-bold text-slate-900">{formatCurrency(c.total)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-xs text-slate-400 py-10 text-center">No classification data</p>
          )}
        </div>

        {/* Category Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Tag className="w-4 h-4 text-amber-600" />
            Top Categories
          </h3>
          <div className="divide-y divide-slate-100 text-xs max-h-72 overflow-y-auto">
            {reportData.category_breakdown.length === 0 ? (
              <p className="text-xs text-slate-400 py-10 text-center">No category data</p>
            ) : (
              reportData.category_breakdown.map(c => (
                <div key={c.category} className="py-2.5 flex justify-between items-center">
                  <div>
                    <span className="font-semibold text-slate-800">{c.category}</span>
                    <span className="text-slate-400 ml-2">({c.count})</span>
                  </div>
                  <span className="font-bold text-slate-900">{formatCurrency(c.total)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Employee Spending Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-600" />
            Employee / Staff Breakdown
          </h3>
          <div className="divide-y divide-slate-100 text-xs max-h-72 overflow-y-auto">
            {reportData.employee_breakdown.length === 0 ? (
              <p className="text-xs text-slate-400 py-10 text-center">No employee expenses</p>
            ) : (
              reportData.employee_breakdown.map(e => (
                <div key={e.employee_name} className="py-2.5 flex justify-between items-center">
                  <div>
                    <span className="font-semibold text-slate-800">{e.employee_name}</span>
                    <span className="text-slate-400 ml-2">({e.count})</span>
                  </div>
                  <span className="font-bold text-slate-900">{formatCurrency(e.total)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Transaction Details Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            All Expenses in Period ({reportData.expenses?.length || 0})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
              <tr>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">Person/Employee</th>
                <th className="py-2.5 px-4">Category</th>
                <th className="py-2.5 px-4">Classification</th>
                <th className="py-2.5 px-4">Description</th>
                <th className="py-2.5 px-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reportData.expenses.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400">
                    No expense records found for this period and filter.
                  </td>
                </tr>
              ) : (
                reportData.expenses.map(e => (
                  <tr key={e.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 text-slate-600 font-medium">{e.expense_date}</td>
                    <td className="py-3 px-4 font-bold text-slate-800">{e.employee_name || 'General Office'}</td>
                    <td className="py-3 px-4 text-slate-700">{e.category}</td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={e.classification === 'Business' ? 'primary' : e.classification === 'Employee-related' ? 'warning' : 'default'}
                        size="sm"
                      >
                        {e.classification}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{e.description}</td>
                    <td className="py-3 px-4 text-right font-bold text-rose-600">{formatCurrency(e.amount)}</td>
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
