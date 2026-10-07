import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import {
  DollarSign,
  Search,
  Filter,
  Plus,
  Paperclip,
  Download,
  Calendar,
  User,
  Trash2,
  FileText
} from 'lucide-react';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import { exportToCSV, exportToExcel } from '../../services/export';

export default function ExpensesList() {
  const { user, hasPermission, formatCurrency } = useAuth();

  const [expenses, setExpenses] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedClassification, setSelectedClassification] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Add Expense Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);
  const [formData, setFormData] = useState({
    expense_date: new Date().toISOString().split('T')[0],
    employee_id: '',
    amount: '',
    category: 'Fuel / Petrol',
    description: '',
    payment_method: 'Cash',
    classification: 'Business',
    notes: ''
  });

  const fetchExpenses = async (page = 1) => {
    setLoading(true);
    try {
      const res = await api.get('/expenses', {
        page,
        limit: 20,
        search,
        category: selectedCategory,
        classification: selectedClassification,
        employee_id: selectedEmployee,
        start_date: startDate,
        end_date: endDate
      });
      setExpenses(res.data || []);
      setTotalAmount(res.total_amount || 0);
      setPagination(res.pagination || { page: 1, limit: 20, total: 0, pages: 1 });
    } catch (e) {
      console.error('Failed to load expenses:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchMasterData = async () => {
    try {
      const sRes = await api.get('/settings');
      if (sRes.expense_categories) setCategories(sRes.expense_categories);

      const uRes = await api.get('/users', { is_active: true });
      setUsers(uRes || []);
    } catch (e) {}
  };

  useEffect(() => {
    fetchMasterData();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchExpenses(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search, selectedCategory, selectedClassification, selectedEmployee, startDate, endDate]);

  const handleCreateExpense = async (e) => {
    e.preventDefault();
    try {
      const formPayload = new FormData();
      Object.entries(formData).forEach(([key, val]) => {
        formPayload.append(key, val);
      });
      if (receiptFile) {
        formPayload.append('receipt', receiptFile);
      }

      await api.post('/expenses', formPayload);
      setIsAddModalOpen(false);
      setReceiptFile(null);
      setFormData({
        expense_date: new Date().toISOString().split('T')[0],
        employee_id: '',
        amount: '',
        category: categories[0]?.name || 'Fuel / Petrol',
        description: '',
        payment_method: 'Cash',
        classification: 'Business',
        notes: ''
      });
      fetchExpenses(1);
    } catch (err) {
      alert(err.message || 'Failed to record expense.');
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense record?')) return;
    try {
      await api.delete(`/expenses/${id}`);
      fetchExpenses(pagination.page);
    } catch (err) {
      alert('Failed to delete expense.');
    }
  };

  const handleExportCSV = () => {
    const data = expenses.map(e => ({
      'Date': e.expense_date,
      'Employee': e.employee_name || 'General Office',
      'Category': e.category,
      'Classification': e.classification,
      'Description': e.description,
      'Payment Method': e.payment_method,
      'Amount': e.amount,
      'Entered By': e.entered_by_name || ''
    }));
    exportToCSV(data, 'isp_expenses_export');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-600" /> Expense Records & Finances
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Total filtered spending: <span className="font-bold text-rose-600">{formatCurrency(totalAmount)}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          {hasPermission('expense_create') && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" /> Record Money Spent
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search description, employee..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <select
              value={selectedClassification}
              onChange={(e) => setSelectedClassification(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
            >
              <option value="">All Classifications</option>
              <option value="Business">Business</option>
              <option value="Employee-related">Employee-related</option>
              <option value="Personal">Personal</option>
              <option value="Family">Family</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
            >
              <option value="">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

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

          <div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
              title="From Date"
            />
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Person / Employee</th>
                <th className="py-3 px-4">Category & Purpose</th>
                <th className="py-3 px-4">Classification</th>
                <th className="py-3 px-4">Payment Mode</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-10 text-slate-400">Loading expense records...</td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-10 text-slate-400">No expense records found.</td>
                </tr>
              ) : (
                expenses.map(e => (
                  <tr key={e.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {e.expense_date}
                    </td>
                    <td className="py-3.5 px-4">
                      {e.employee_id ? (
                        <Link
                          to={`/finances/employee/${e.employee_id}`}
                          className="font-bold text-sky-700 hover:underline flex items-center gap-1"
                        >
                          <User className="w-3.5 h-3.5 text-sky-600" />
                          <span>{e.employee_name}</span>
                        </Link>
                      ) : (
                        <span className="text-slate-500 italic">General Business</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <p className="font-semibold text-slate-900">{e.category}</p>
                      <p className="text-[11px] text-slate-600 truncate mt-0.5">{e.description}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={e.classification === 'Business' ? 'primary' : e.classification === 'Employee-related' ? 'warning' : 'default'} size="sm">
                        {e.classification}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {e.payment_method}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-sm text-slate-900">
                      {formatCurrency(e.amount)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {e.receipt_url && (
                          <a
                            href={e.receipt_url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs"
                            title="View Attached Slip"
                          >
                            <Paperclip className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {hasPermission('finance_manage') && (
                          <button
                            onClick={() => handleDeleteExpense(e.id)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          pagination={pagination}
          onPageChange={(p) => fetchExpenses(p)}
        />
      </div>

      {/* RECORD EXPENSE MODAL */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Record Expense / Money Given"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateExpense} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Expense Date *</label>
              <input
                type="date"
                required
                value={formData.expense_date}
                onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Amount Given / Spent *</label>
              <input
                type="number"
                required
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-bold focus:ring-2 focus:ring-emerald-500"
                placeholder="1500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Employee / Person (Optional)</label>
            <select
              value={formData.employee_id}
              onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
            >
              <option value="">General Office / No Specific Employee</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Category *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
              >
                {categories.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Classification *</label>
              <select
                value={formData.classification}
                onChange={(e) => setFormData({ ...formData, classification: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold"
              >
                <option value="Business">Business</option>
                <option value="Employee-related">Employee-related</option>
                <option value="Personal">Personal</option>
                <option value="Family">Family</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Purpose / Description *</label>
            <input
              type="text"
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g. Bike fuel for PECHS complaints, 2km drop fiber"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Receipt / Photo Attachment</label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setReceiptFile(e.target.files[0] || null)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs"
            >
              Save Expense Record
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
