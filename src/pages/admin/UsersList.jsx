import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Shield,
  UserPlus,
  Edit,
  KeyRound,
  Power,
  Search,
  Check,
  X,
  Lock,
  Phone,
  Mail,
  UserCheck
} from 'lucide-react';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';

export default function UsersList() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  // User Form
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    full_name: '',
    email: '',
    phone: '',
    role: 'employee',
    designation: '',
    permissions: []
  });

  const availablePermissions = [
    { key: 'billing_view', label: 'Billing View', desc: 'Can view billing portal & customer directory' },
    { key: 'billing_manage', label: 'Billing Manage', desc: 'Can manage packages & plan changes' },
    { key: 'customer_manage', label: 'Customer Management', desc: 'Can create and edit customers' },
    { key: 'payment_create', label: 'Payment Entry', desc: 'Can record manual payments & print slips' },
    { key: 'payment_void', label: 'Payment Void', desc: 'Can void erroneous payments' },
    { key: 'helpdesk_view', label: 'Help Desk View', desc: 'Can view complaints & tickets' },
    { key: 'helpdesk_manage', label: 'Help Desk Manage', desc: 'Can assign tickets & manage categories' },
    { key: 'ticket_worklog', label: 'Record Work Logs', desc: 'Can record technician work & resolution' },
    { key: 'finance_view', label: 'Finance View', desc: 'Can view expense records' },
    { key: 'finance_manage', label: 'Finance Manage', desc: 'Can manage expense categories & delete entries' },
    { key: 'expense_create', label: 'Record Expenses', desc: 'Can log money spent/given' },
    { key: 'attendance_view', label: 'Attendance View', desc: 'Can view staff attendance records' },
    { key: 'attendance_manage', label: 'Attendance Manage', desc: 'Can view full company attendance logs' },
    { key: 'attendance_clock', label: 'Clock In/Out', desc: 'Can use camera selfie clock-in' },
    { key: 'reports_view', label: 'Reports Access', desc: 'Can view billing, finance & tech reports' },
    { key: 'users_manage', label: 'User Management', desc: 'Can manage employees' }
  ];

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users', { search });
      setUsers(res || []);
    } catch (e) {
      console.error('Failed to load users:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search]);

  const handleOpenAdd = () => {
    setFormData({
      username: '',
      password: '',
      full_name: '',
      email: '',
      phone: '',
      role: 'employee',
      designation: 'Field Technician',
      permissions: ['helpdesk_view', 'ticket_worklog', 'attendance_clock', 'expense_create']
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (u) => {
    setSelectedUser(u);
    setFormData({
      username: u.username,
      full_name: u.full_name,
      email: u.email || '',
      phone: u.phone || '',
      role: u.role,
      designation: u.designation || '',
      permissions: u.permissions || []
    });
    setIsEditModalOpen(true);
  };

  const handleTogglePermission = (permKey) => {
    const current = formData.permissions || [];
    if (current.includes(permKey)) {
      setFormData({ ...formData, permissions: current.filter(k => k !== permKey) });
    } else {
      setFormData({ ...formData, permissions: [...current, permKey] });
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await api.post('/users', formData);
      setIsAddModalOpen(false);
      fetchUsers();
    } catch (err) {
      alert(err.message || 'Failed to create user.');
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/users/${selectedUser.id}`, formData);
      setIsEditModalOpen(false);
      fetchUsers();
    } catch (err) {
      alert(err.message || 'Failed to update user.');
    }
  };

  const handleToggleStatus = async (u) => {
    if (u.id === currentUser.id) {
      alert('You cannot deactivate your own account.');
      return;
    }
    try {
      await api.put(`/users/${u.id}/status`);
      fetchUsers();
    } catch (err) {
      alert(err.message || 'Failed to update status.');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!selectedUser || !newPassword) return;
    try {
      await api.post(`/users/${selectedUser.id}/reset-password`, { new_password: newPassword });
      setIsPasswordModalOpen(false);
      setSelectedUser(null);
      setNewPassword('');
      alert('Password updated successfully.');
    } catch (err) {
      alert(err.message || 'Failed to reset password.');
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-sky-600" /> User Accounts & Permissions
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage Admin, Manager, and Employee logins with granular portal toggles
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
        >
          <UserPlus className="w-4 h-4" /> Create User Account
        </button>
      </div>

      {/* Search Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs max-w-sm">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, username, phone..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Username</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Active Permissions</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-10 text-slate-400">Loading user accounts...</td>
                </tr>
              ) : (
                users.map(u => (
                  <tr key={u.id} className={`hover:bg-slate-50/70 transition-colors ${!u.is_active ? 'opacity-50 bg-slate-50' : ''}`}>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{u.full_name}</p>
                      <p className="text-[11px] text-slate-500">{u.designation || u.role}</p>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-700">
                      {u.username}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={u.role === 'admin' ? 'danger' : u.role === 'manager' ? 'primary' : 'default'}>
                        {u.role.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      <p>{u.phone || '—'}</p>
                      <p className="text-[11px] text-slate-400">{u.email || ''}</p>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      {u.role === 'admin' ? (
                        <span className="font-bold text-emerald-600 text-xs">Full Administrative Control</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {(u.permissions || []).slice(0, 3).map(p => (
                            <span key={p} className="px-1.5 py-0.5 bg-slate-100 text-slate-700 text-[10px] rounded font-medium">
                              {p.replace('_', ' ')}
                            </span>
                          ))}
                          {(u.permissions || []).length > 3 && (
                            <span className="text-[10px] text-slate-400 font-semibold self-center">
                              +{u.permissions.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={u.is_active ? 'success' : 'danger'}>
                        {u.is_active ? 'Active' : 'Deactivated'}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="p-1.5 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-lg text-xs"
                          title="Edit User & Permissions"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUser(u);
                            setIsPasswordModalOpen(true);
                          }}
                          className="p-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg text-xs"
                          title="Reset Password"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                        {u.id !== currentUser.id && (
                          <button
                            onClick={() => handleToggleStatus(u)}
                            className={`p-1.5 rounded-lg text-xs transition-colors ${
                              u.is_active ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            }`}
                            title={u.is_active ? 'Deactivate User' : 'Activate User'}
                          >
                            <Power className="w-3.5 h-3.5" />
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
      </div>

      {/* CREATE / EDIT USER MODAL */}
      <Modal
        isOpen={isAddModalOpen || isEditModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setIsEditModalOpen(false);
        }}
        title={isAddModalOpen ? 'Create New User Account' : `Edit User: ${selectedUser?.full_name}`}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={isAddModalOpen ? handleCreateUser : handleUpdateUser} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Username *</label>
              <input
                type="text"
                required
                disabled={isEditModalOpen}
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 disabled:opacity-60"
              />
            </div>
          </div>

          {isAddModalOpen && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Password *</label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                placeholder="••••••••"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Account Role *</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-bold"
              >
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                {currentUser?.role === 'admin' && <option value="admin">Admin</option>}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Designation / Title</label>
              <input
                type="text"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                placeholder="e.g. Field Technician"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
              />
            </div>
          </div>

          {/* Granular Permission Checkboxes */}
          {formData.role !== 'admin' && (
            <div className="pt-3 border-t border-slate-200 space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Granular Permissions & Portal Access
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 max-h-56 overflow-y-auto">
                {availablePermissions.map(p => {
                  const isChecked = (formData.permissions || []).includes(p.key);
                  return (
                    <label key={p.key} className="flex items-start gap-2 p-1.5 rounded-lg hover:bg-white cursor-pointer transition-colors text-xs">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleTogglePermission(p.key)}
                        className="rounded text-sky-600 focus:ring-sky-500 mt-0.5"
                      />
                      <div>
                        <span className="font-semibold text-slate-800 block">{p.label}</span>
                        <span className="text-[10px] text-slate-500">{p.desc}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsAddModalOpen(false);
                setIsEditModalOpen(false);
              }}
              className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl shadow-xs"
            >
              Save User Account
            </button>
          </div>
        </form>
      </Modal>

      {/* RESET PASSWORD MODAL */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        title={`Reset Password for ${selectedUser?.full_name}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">New Password *</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500"
              placeholder="Enter new strong password"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsPasswordModalOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl"
            >
              Update Password
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
