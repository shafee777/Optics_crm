import React, { useState, useEffect } from 'react';
import api from '../../services/api.js';
import { X, UserPlus, AlertCircle, Hash } from 'lucide-react';

export default function CustomerFormModal({ isOpen, onClose, onCustomerCreated }) {
  const [formData, setFormData] = useState({
    customerCode: '',
    fullName: '',
    phone: '',
    email: '',
    gender: 'Male',
    age: '',
    address: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch next available customer code when modal opens
  useEffect(() => {
    if (isOpen) {
      api.get('/customers/next-code')
        .then((res) => {
          setFormData((prev) => ({
            ...prev,
            customerCode: res.data.data.nextCode || 'CUST-1001',
          }));
        })
        .catch((err) => console.error('Could not fetch next customer code', err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = {
        ...formData,
        age: formData.age ? parseInt(formData.age, 10) : null,
      };
      const response = await api.post('/customers', payload);
      onCustomerCreated(response.data.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to create customer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-indigo-600" />
            <h2 className="font-semibold text-slate-800 text-lg">Add New Customer</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Customer ID & Mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-indigo-600" />
                Customer ID *
              </label>
              <input
                type="text"
                name="customerCode"
                required
                value={formData.customerCode}
                onChange={handleChange}
                placeholder="e.g. CUST-1002"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono font-bold text-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50"
              />
              <span className="text-[10px] text-slate-400">Auto-suggested sequential ID</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number</label>
              <input
                type="tel"
                name="phone"
                placeholder="10-digit mobile"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400">Shared family mobile allowed</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
            <input
              type="text"
              name="fullName"
              required
              placeholder="e.g. Ravi Kumar"
              value={formData.fullName}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Age</label>
              <input
                type="number"
                name="age"
                placeholder="e.g. 35"
                value={formData.age}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Gender</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                name="email"
                placeholder="Optional"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Address</label>
            <input
              type="text"
              name="address"
              placeholder="Locality, City"
              value={formData.address}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
            <textarea
              name="notes"
              rows={2}
              placeholder="Doctor recommendations or notes..."
              value={formData.notes}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}