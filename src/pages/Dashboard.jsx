import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Link } from 'react-router-dom';
import {
  Users,
  CreditCard,
  LifeBuoy,
  DollarSign,
  CalendarCheck,
  AlertCircle,
  TrendingUp,
  Plus,
  ArrowRight,
  Receipt,
  Wrench,
  Clock,
  Printer,
  Smartphone,
  Shield,
  Layers,
  CheckCircle,
  ExternalLink
} from 'lucide-react';
import Badge from '../components/common/Badge';
import ReceiptModal from '../components/common/ReceiptModal';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function Dashboard() {
  const { user, hasPermission, formatCurrency, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);

  const [custStats, setCustStats] = useState({ total: 0, active: 0, suspended: 0, overdue: 0 });
  const [payStats, setPayStats] = useState({ today: { count: 0, total: 0 }, month: { count: 0, total: 0 } });
  const [ticketStats, setTicketStats] = useState({ total: 0, new: 0, in_progress: 0, completed: 0, by_category: [] });
  const [expenseStats, setExpenseStats] = useState({ today_total: 0, month_total: 0, by_classification: [] });
  const [attStats, setAttStats] = useState({ total_employees: 0, clocked_in: 0, late: 0, not_clocked_in: 0 });
  const [recentPayments, setRecentPayments] = useState([]);
  const [recentTickets, setRecentTickets] = useState([]);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const promises = [];

        if (hasPermission('billing_view')) {
          promises.push(api.get('/customers/stats').then(setCustStats).catch(() => {}));
          promises.push(api.get('/payments/stats').then(setPayStats).catch(() => {}));
          promises.push(api.get('/payments', { limit: 5 }).then(res => setRecentPayments(res.data || [])).catch(() => {}));
        }

        if (hasPermission('helpdesk_view')) {
          promises.push(api.get('/tickets/stats').then(setTicketStats).catch(() => {}));
          promises.push(api.get('/tickets', { limit: 5 }).then(res => setRecentTickets(res.data || [])).catch(() => {}));
        }

        if (hasPermission('finance_view')) {
          promises.push(api.get('/expenses/stats').then(setExpenseStats).catch(() => {}));
        }

        if (hasPermission('attendance_view') || user?.role === 'admin' || user?.role === 'manager') {
          promises.push(api.get('/attendance/today').then(res => setAttStats(res.stats || {})).catch(() => {}));
        }

        await Promise.all(promises);
      } catch (err) {
        console.error('Dashboard data fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  const viewReceipt = async (paymentId) => {
    try {
      const res = await api.get(`/payments/${paymentId}/receipt`);
      setSelectedReceipt(res);
    } catch (e) {
      console.error('Failed to load receipt:', e);
    }
  };

  // Chart Data for Tickets by Category
  const ticketChartData = {
    labels: (ticketStats.by_category || []).map(c => c.category),
    datasets: [
      {
        data: (ticketStats.by_category || []).map(c => c.count),
        backgroundColor: ['#0284c7', '#38bdf8', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6', '#64748b'],
        borderWidth: 0
      }
    ]
  };

  return (
    <div className="space-y-6">
      {/* Header with Quick Action Shortcuts */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900">ISP Operations Hub</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Logged in as <span className="font-semibold text-slate-700">{user?.full_name}</span> ({user?.role?.toUpperCase()}) • Unified Multi-Portal Access
          </p>
        </div>

        {/* Action Shortcuts */}
        <div className="flex flex-wrap items-center gap-2">
          {hasPermission('payment_create') && (
            <Link
              to="/billing/payments?action=new"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Record Payment
            </Link>
          )}
          {hasPermission('customer_manage') && (
            <Link
              to="/billing/customers?action=new"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
            >
              <Users className="w-3.5 h-3.5" /> Add Customer
            </Link>
          )}
          {hasPermission('helpdesk_view') && (
            <Link
              to="/helpdesk/tickets?action=new"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
            >
              <LifeBuoy className="w-3.5 h-3.5" /> New Complaint
            </Link>
          )}
        </div>
      </div>

      {/* 4 DEDICATED PORTAL LAUNCHPAD CARDS */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Dedicated Workspaces & Portals
          </h2>
          <span className="text-[11px] text-slate-500">Single Login • 4 Dedicated Modules</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. BILLING PORTAL */}
          {hasPermission('billing_view') && (
            <div className="bg-white rounded-2xl border border-sky-100 p-5 shadow-xs hover:shadow-md hover:border-sky-300 transition-all flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600 group-hover:bg-sky-600 group-hover:text-white transition-colors">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                    Portal 1
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-sky-600 transition-colors">
                  Billing & Customers
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Customer accounts, recharge receipts, packages & collection reports
                </p>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Active Customers:</span>
                    <span className="font-bold text-slate-800">{custStats.active} / {custStats.total}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Month Revenue:</span>
                    <span className="font-bold text-emerald-600">{formatCurrency(payStats.month.total)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3">
                <Link
                  to="/billing/customers"
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-sky-50 hover:bg-sky-600 text-sky-700 hover:text-white text-xs font-bold rounded-xl transition-all"
                >
                  <span>Open Billing Portal</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}

          {/* 2. HELP DESK PORTAL */}
          {hasPermission('helpdesk_view') && (
            <div className="bg-white rounded-2xl border border-amber-100 p-5 shadow-xs hover:shadow-md hover:border-amber-300 transition-all flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                    <LifeBuoy className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    Portal 2
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
                  Help Desk & Complaints
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Trouble tickets, field technician assignments, resolution notes & logs
                </p>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Active Queue:</span>
                    <span className="font-bold text-amber-600">{ticketStats.in_progress + ticketStats.new} open</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Resolved:</span>
                    <span className="font-bold text-emerald-600">{ticketStats.completed} tickets</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3">
                <Link
                  to="/helpdesk/tickets"
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-amber-50 hover:bg-amber-600 text-amber-800 hover:text-white text-xs font-bold rounded-xl transition-all"
                >
                  <span>Open Help Desk</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}

          {/* 3. FINANCES & EXPENSES PORTAL */}
          {(hasPermission('finance_view') || user?.role === 'employee') && (
            <div className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Portal 3
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                  Finances & Expenses
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Business vs personal spending, employee advances & finance reports
                </p>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>This Month Spent:</span>
                    <span className="font-bold text-rose-600">{formatCurrency(expenseStats.month_total)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Today's Expenses:</span>
                    <span className="font-bold text-slate-800">{formatCurrency(expenseStats.today_total)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3">
                <Link
                  to="/finances/expenses"
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white text-xs font-bold rounded-xl transition-all"
                >
                  <span>Open Finance Portal</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}

          {/* 4. STAFF ATTENDANCE PORTAL */}
          {(hasPermission('attendance_view') || hasPermission('attendance_clock')) && (
            <div className="bg-white rounded-2xl border border-indigo-100 p-5 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <CalendarCheck className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Portal 4
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                  Staff & Attendance
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Daily clock in / clock out, live staff board, hours worked & attendance logs
                </p>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Clocked In Today:</span>
                    <span className="font-bold text-indigo-600">{attStats.clocked_in} staff</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Late Arrivals:</span>
                    <span className="font-bold text-amber-600">{attStats.late || 0}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3">
                <Link
                  to="/attendance/clock"
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white text-xs font-bold rounded-xl transition-all"
                >
                  <span>Open Attendance Portal</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RECENT ACTIVITY & CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Payments (2 cols) */}
        {hasPermission('billing_view') && (
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-sky-600" />
                Recent Payments Entered
              </h3>
              <Link to="/billing/payments" className="text-xs text-sky-600 font-semibold hover:underline flex items-center gap-1">
                View All Payments <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {recentPayments.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No payment entries found.</p>
              ) : (
                recentPayments.map(p => (
                  <div key={p.id} className="py-3 flex items-center justify-between text-xs gap-3">
                    <div>
                      <p className="font-bold text-slate-800">{p.customer_name} <span className="font-normal text-slate-500">({p.customer_code})</span></p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{p.receipt_number} • {p.payment_method} • {p.billing_period}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="font-bold text-emerald-600 text-sm">{formatCurrency(p.amount)}</p>
                        <p className="text-[10px] text-slate-400">{p.payment_date}</p>
                      </div>
                      <button
                        onClick={() => viewReceipt(p.id)}
                        className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-200 transition-colors"
                        title="Send via WhatsApp or Thermal Print"
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Complaints Breakdown Chart */}
        {hasPermission('helpdesk_view') && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between">
            <div className="pb-3 border-b border-slate-100 mb-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <LifeBuoy className="w-4 h-4 text-amber-600" />
                Complaints by Category
              </h3>
            </div>

            <div className="my-auto py-2 flex items-center justify-center">
              {ticketStats.by_category && ticketStats.by_category.length > 0 ? (
                <div className="w-48 h-48">
                  <Doughnut data={ticketChartData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-8 text-center">No complaints recorded.</p>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 text-center">
              <Link to="/helpdesk/tickets" className="text-xs text-sky-600 font-semibold hover:underline">
                Manage Help Desk Queue &rarr;
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={!!selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
        receiptData={selectedReceipt}
      />
    </div>
  );
}
