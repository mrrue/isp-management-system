import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Package, Plus, Edit, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';

export default function PackagesList() {
  const { hasPermission, formatCurrency } = useAuth();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPkg, setEditingPkg] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    speed: '',
    price: '',
    billing_cycle: 'monthly',
    description: '',
    is_active: 1
  });

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const res = await api.get('/packages');
      setPackages(res || []);
    } catch (e) {
      console.error('Failed to load packages:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const handleOpenAdd = () => {
    setEditingPkg(null);
    setFormData({
      name: '',
      speed: '',
      price: '',
      billing_cycle: 'monthly',
      description: '',
      is_active: 1
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (pkg) => {
    setEditingPkg(pkg);
    setFormData({
      name: pkg.name,
      speed: pkg.speed,
      price: pkg.price,
      billing_cycle: pkg.billing_cycle || 'monthly',
      description: pkg.description || '',
      is_active: pkg.is_active
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingPkg) {
        await api.put(`/packages/${editingPkg.id}`, formData);
      } else {
        await api.post('/packages', formData);
      }
      setIsModalOpen(false);
      fetchPackages();
    } catch (err) {
      alert(err.message || 'Failed to save package.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete or deactivate this package?')) return;
    try {
      const res = await api.delete(`/packages/${id}`);
      alert(res.message);
      fetchPackages();
    } catch (err) {
      alert(err.message || 'Failed to delete package.');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-sky-600" /> ISP Broadband Packages
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure speed tiers, bandwidth rates, and subscription pricing
          </p>
        </div>

        {hasPermission('billing_manage') && (
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" /> Create Package
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {packages.map(pkg => (
          <div
            key={pkg.id}
            className={`bg-white rounded-2xl border p-5 shadow-xs flex flex-col justify-between transition-all ${
              pkg.is_active ? 'border-slate-200 hover:border-sky-300' : 'border-slate-200 opacity-60 bg-slate-50'
            }`}
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{pkg.name}</h3>
                  <span className="inline-block mt-1 font-mono font-bold text-xs px-2.5 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200">
                    ⚡ {pkg.speed}
                  </span>
                </div>
                <Badge variant={pkg.is_active ? 'success' : 'default'}>
                  {pkg.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>

              <div className="my-4">
                <span className="text-2xl font-black text-slate-900">{formatCurrency(pkg.price)}</span>
                <span className="text-xs text-slate-500 font-medium"> / {pkg.billing_cycle}</span>
              </div>

              {pkg.description && (
                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  {pkg.description}
                </p>
              )}
            </div>

            {hasPermission('billing_manage') && (
              <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-slate-100">
                <button
                  onClick={() => handleOpenEdit(pkg)}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                >
                  <Edit className="w-3.5 h-3.5" /> Edit
                </button>
                <button
                  onClick={() => handleDelete(pkg.id)}
                  className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-semibold transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* CREATE / EDIT PACKAGE MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPkg ? 'Edit Package' : 'Create New ISP Package'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Package Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500"
              placeholder="e.g. Standard Home Fiber"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Bandwidth Speed *</label>
              <input
                type="text"
                required
                value={formData.speed}
                onChange={(e) => setFormData({ ...formData, speed: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500"
                placeholder="e.g. 20 Mbps"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Monthly Price *</label>
              <input
                type="number"
                required
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-bold focus:bg-white focus:ring-2 focus:ring-sky-500"
                placeholder="2000"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Billing Cycle</label>
            <select
              value={formData.billing_cycle}
              onChange={(e) => setFormData({ ...formData, billing_cycle: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              rows="2"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
              placeholder="Package features, fair usage policy details, etc."
            />
          </div>

          {editingPkg && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={!!formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked ? 1 : 0 })}
                className="rounded text-sky-600 focus:ring-sky-500"
              />
              <label htmlFor="is_active" className="text-xs font-semibold text-slate-700">Package Active</label>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl shadow-xs"
            >
              Save Package
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
