import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Settings as SettingsIcon,
  Building,
  Palette,
  Receipt,
  ListPlus,
  Clock,
  HardDriveDownload,
  RefreshCw,
  Plus,
  Trash2,
  Check,
  Save,
  Download
} from 'lucide-react';
import Badge from '../../components/common/Badge';

export default function Settings() {
  const { updateSettingsState } = useAuth();
  const [activeTab, setActiveTab] = useState('business'); // 'business', 'receipt', 'master_lists', 'attendance', 'backup'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  // Settings State
  const [businessInfo, setBusinessInfo] = useState({
    name: '',
    tagline: '',
    address: '',
    phone: '',
    whatsapp: '',
    email: '',
    website: '',
    currency_symbol: 'Rs.'
  });

  const [receiptSettings, setReceiptSettings] = useState({
    receipt_title: 'PAYMENT RECEIPT',
    size: '80mm',
    header_text: '',
    footer_text: '',
    show_customer_id: true,
    show_customer_phone: true,
    show_customer_address: true,
    show_package: true,
    show_billing_period: true,
    show_payment_method: true,
    show_collector: true
  });

  const [attendanceSettings, setAttendanceSettings] = useState({
    shift_start: '09:00',
    shift_end: '18:00',
    grace_period: 15,
    require_selfie: true,
    require_location: true
  });

  // Master Lists State
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [customerStatuses, setCustomerStatuses] = useState([]);
  const [ticketCategories, setTicketCategories] = useState([]);
  const [ticketStatuses, setTicketStatuses] = useState([]);
  const [expenseCategories, setExpenseCategories] = useState([]);

  // New item inputs
  const [newPayMethod, setNewPayMethod] = useState('');
  const [newCustStatus, setNewCustStatus] = useState('');
  const [newTicketCat, setNewTicketCat] = useState('');
  const [newTicketStatus, setNewTicketStatus] = useState('');
  const [newExpenseCat, setNewExpenseCat] = useState('');

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/settings');
      if (res.settings?.business_info) setBusinessInfo(res.settings.business_info);
      if (res.settings?.receipt_settings) setReceiptSettings(res.settings.receipt_settings);
      if (res.settings?.attendance_settings) setAttendanceSettings(res.settings.attendance_settings);

      setPaymentMethods(res.payment_methods || []);
      setCustomerStatuses(res.customer_statuses || []);
      setTicketCategories(res.ticket_categories || []);
      setTicketStatuses(res.ticket_statuses || []);
      setExpenseCategories(res.expense_categories || []);
    } catch (e) {
      console.error('Failed to load settings:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveSetting = async (key, value) => {
    setSaving(true);
    setMsg('');
    try {
      await api.post('/settings', { key, value });
      updateSettingsState({ [key]: value });
      setMsg('Settings saved successfully!');
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      alert(err.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  // Master list operations
  const handleAddMaster = async (type, name, setter, clear) => {
    if (!name.trim()) return;
    try {
      await api.post(`/settings/${type}`, { name: name.trim() });
      clear('');
      fetchSettings();
    } catch (err) {
      alert('Failed to add item.');
    }
  };

  const handleDeleteMaster = async (type, id) => {
    if (!window.confirm('Delete this item?')) return;
    try {
      await api.delete(`/settings/${type}/${id}`);
      fetchSettings();
    } catch (e) {
      alert('Failed to delete item.');
    }
  };

  const handleResetDemo = async () => {
    if (!window.confirm('WARNING: This will reset all demo records (customers, payments, complaints, expenses) to fresh demo data. Continue?')) return;
    try {
      await api.post('/settings/reset-demo', {});
      alert('Demo data successfully reset!');
      window.location.reload();
    } catch (err) {
      alert('Failed to reset demo data.');
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading system settings...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-sky-600" /> Admin System Settings
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure business information, branding, thermal receipt customization, master categories, and database backups
          </p>
        </div>

        {msg && (
          <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-1.5 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600" /> {msg}
          </div>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2 text-xs font-semibold">
        {[
          { id: 'business', label: 'Business Information', icon: Building },
          { id: 'receipt', label: 'Thermal Receipts', icon: Receipt },
          { id: 'attendance', label: 'Attendance Rules', icon: Clock },
          { id: 'master_lists', label: 'Categories & Lists', icon: ListPlus },
          { id: 'backup', label: 'Database Backup & Demo', icon: HardDriveDownload }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                isActive
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: BUSINESS INFO */}
      {activeTab === 'business' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs max-w-3xl space-y-4">
          <h3 className="text-sm font-bold text-slate-900 mb-2">Business Profile & Contact Information</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Business Name</label>
              <input
                type="text"
                value={businessInfo.name}
                onChange={(e) => setBusinessInfo({ ...businessInfo, name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tagline / Motto</label>
              <input
                type="text"
                value={businessInfo.tagline}
                onChange={(e) => setBusinessInfo({ ...businessInfo, tagline: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Primary Phone</label>
              <input
                type="text"
                value={businessInfo.phone}
                onChange={(e) => setBusinessInfo({ ...businessInfo, phone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">WhatsApp Support</label>
              <input
                type="text"
                value={businessInfo.whatsapp}
                onChange={(e) => setBusinessInfo({ ...businessInfo, whatsapp: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Support Email</label>
              <input
                type="email"
                value={businessInfo.email}
                onChange={(e) => setBusinessInfo({ ...businessInfo, email: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Currency Symbol</label>
              <input
                type="text"
                value={businessInfo.currency_symbol}
                onChange={(e) => setBusinessInfo({ ...businessInfo, currency_symbol: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Business Office Address</label>
              <input
                type="text"
                value={businessInfo.address}
                onChange={(e) => setBusinessInfo({ ...businessInfo, address: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              onClick={() => handleSaveSetting('business_info', businessInfo)}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
            >
              <Save className="w-4 h-4" /> Save Business Information
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: THERMAL RECEIPT CUSTOMIZER */}
      {activeTab === 'receipt' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs max-w-3xl space-y-5">
          <h3 className="text-sm font-bold text-slate-900 mb-2">Thermal Receipt Printer Customization (58mm & 80mm)</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Receipt Header Title</label>
              <input
                type="text"
                value={receiptSettings.receipt_title}
                onChange={(e) => setReceiptSettings({ ...receiptSettings, receipt_title: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Default Paper Size</label>
              <select
                value={receiptSettings.size}
                onChange={(e) => setReceiptSettings({ ...receiptSettings, size: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
              >
                <option value="80mm">80mm Standard POS Printer</option>
                <option value="58mm">58mm Compact Mini POS Printer</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Thank You / Footer Note</label>
              <textarea
                rows="2"
                value={receiptSettings.footer_text}
                onChange={(e) => setReceiptSettings({ ...receiptSettings, footer_text: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100">
            <span className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Visible Receipt Fields
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              {[
                { key: 'show_customer_id', label: 'Customer Code / ID' },
                { key: 'show_customer_phone', label: 'Customer Phone' },
                { key: 'show_customer_address', label: 'Customer Address' },
                { key: 'show_package', label: 'Internet Package Tier' },
                { key: 'show_billing_period', label: 'Billing Period' },
                { key: 'show_payment_method', label: 'Payment Mode' },
                { key: 'show_collector', label: 'Staff Receiver Name' }
              ].map(f => (
                <label key={f.key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!receiptSettings[f.key]}
                    onChange={(e) => setReceiptSettings({ ...receiptSettings, [f.key]: e.target.checked })}
                    className="rounded text-sky-600 focus:ring-sky-500"
                  />
                  <span className="text-slate-700 font-medium">{f.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              onClick={() => handleSaveSetting('receipt_settings', receiptSettings)}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-xl shadow-xs"
            >
              <Save className="w-4 h-4" /> Save Receipt Settings
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: ATTENDANCE RULES */}
      {activeTab === 'attendance' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs max-w-2xl space-y-4">
          <h3 className="text-sm font-bold text-slate-900 mb-2">Employee Shift & Attendance Rules</h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Shift Start Time</label>
              <input
                type="time"
                value={attendanceSettings.shift_start}
                onChange={(e) => setAttendanceSettings({ ...attendanceSettings, shift_start: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Shift End Time</label>
              <input
                type="time"
                value={attendanceSettings.shift_end}
                onChange={(e) => setAttendanceSettings({ ...attendanceSettings, shift_end: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Grace Period (Minutes)</label>
              <input
                type="number"
                value={attendanceSettings.grace_period}
                onChange={(e) => setAttendanceSettings({ ...attendanceSettings, grace_period: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              onClick={() => handleSaveSetting('attendance_settings', attendanceSettings)}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-xl shadow-xs"
            >
              <Save className="w-4 h-4" /> Save Attendance Rules
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: MASTER LISTS */}
      {activeTab === 'master_lists' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Payment Methods */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Payment Methods</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={newPayMethod}
                onChange={(e) => setNewPayMethod(e.target.value)}
                placeholder="New method name..."
                className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
              />
              <button
                onClick={() => handleAddMaster('payment-methods', newPayMethod, setPaymentMethods, setNewPayMethod)}
                className="px-3 py-1.5 bg-sky-600 text-white text-xs font-semibold rounded-xl hover:bg-sky-700"
              >
                Add
              </button>
            </div>
            <div className="divide-y divide-slate-100 text-xs max-h-48 overflow-y-auto">
              {paymentMethods.map(m => (
                <div key={m.id} className="py-2 flex justify-between items-center">
                  <span className="font-semibold text-slate-800">{m.name}</span>
                  <button onClick={() => handleDeleteMaster('payment-methods', m.id)} className="text-rose-500 hover:text-rose-700">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Ticket Categories */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Complaint Categories</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTicketCat}
                onChange={(e) => setNewTicketCat(e.target.value)}
                placeholder="New category..."
                className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
              />
              <button
                onClick={() => handleAddMaster('ticket-categories', newTicketCat, setTicketCategories, setNewTicketCat)}
                className="px-3 py-1.5 bg-sky-600 text-white text-xs font-semibold rounded-xl hover:bg-sky-700"
              >
                Add
              </button>
            </div>
            <div className="divide-y divide-slate-100 text-xs max-h-48 overflow-y-auto">
              {ticketCategories.map(c => (
                <div key={c.id} className="py-2 flex justify-between items-center">
                  <span className="font-semibold text-slate-800">{c.name}</span>
                  <button onClick={() => handleDeleteMaster('ticket-categories', c.id)} className="text-rose-500 hover:text-rose-700">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Expense Categories */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Expense Categories</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={newExpenseCat}
                onChange={(e) => setNewExpenseCat(e.target.value)}
                placeholder="New expense category..."
                className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
              />
              <button
                onClick={() => handleAddMaster('expense-categories', newExpenseCat, setExpenseCategories, setNewExpenseCat)}
                className="px-3 py-1.5 bg-sky-600 text-white text-xs font-semibold rounded-xl hover:bg-sky-700"
              >
                Add
              </button>
            </div>
            <div className="divide-y divide-slate-100 text-xs max-h-48 overflow-y-auto">
              {expenseCategories.map(ec => (
                <div key={ec.id} className="py-2 flex justify-between items-center">
                  <span className="font-semibold text-slate-800">{ec.name}</span>
                  <button onClick={() => handleDeleteMaster('expense-categories', ec.id)} className="text-rose-500 hover:text-rose-700">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Ticket Statuses */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Ticket Statuses</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTicketStatus}
                onChange={(e) => setNewTicketStatus(e.target.value)}
                placeholder="New status..."
                className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
              />
              <button
                onClick={() => handleAddMaster('ticket-statuses', newTicketStatus, setTicketStatuses, setNewTicketStatus)}
                className="px-3 py-1.5 bg-sky-600 text-white text-xs font-semibold rounded-xl hover:bg-sky-700"
              >
                Add
              </button>
            </div>
            <div className="divide-y divide-slate-100 text-xs max-h-48 overflow-y-auto">
              {ticketStatuses.map(s => (
                <div key={s.id} className="py-2 flex justify-between items-center">
                  <Badge size="sm">{s.name}</Badge>
                  <button onClick={() => handleDeleteMaster('ticket-statuses', s.id)} className="text-rose-500 hover:text-rose-700">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: DATABASE BACKUP & DEMO RESET */}
      {activeTab === 'backup' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
          {/* Download Raw Database */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <HardDriveDownload className="w-4 h-4 text-sky-600" /> Download Full SQLite Database
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Download the complete raw SQLite database file (<code className="font-mono bg-slate-100 px-1 py-0.5 rounded">.db</code>). This contains every single customer, payment, ticket, worklog, expense, and audit record for offline archival.
              </p>
            </div>

            <div className="pt-2">
              <a
                href="/api/settings/backup/download"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
              >
                <Download className="w-4 h-4" /> Download Raw .db File
              </a>
            </div>
          </div>

          {/* Download JSON Data Dump */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Download className="w-4 h-4 text-emerald-600" /> Export JSON Data Dump
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Export all relational tables formatted as human-readable JSON for migration, backups, or external reporting tools.
              </p>
            </div>

            <div className="pt-2">
              <a
                href="/api/settings/backup/json"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
              >
                <Download className="w-4 h-4" /> Download JSON Backup
              </a>
            </div>
          </div>

          {/* Reset Demo Data */}
          <div className="md:col-span-2 bg-rose-50/70 p-6 rounded-2xl border border-rose-200 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-rose-900 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-rose-600" /> Reset & Refresh Demo Data
            </h3>
            <p className="text-xs text-rose-700 leading-relaxed">
              Resets the database with fresh demo customers, subscriptions, tickets, work logs, expenses, and attendance records. Use this whenever you want to return to a clean initial state.
            </p>

            <button
              onClick={handleResetDemo}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
            >
              Reset to Fresh Demo State
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
