import { useModalAccessibility } from '../../hooks/useModalAccessibility.js';
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

  const modalRef = useModalAccessibility(isOpen, onClose);
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
    <div ref={modalRef} className="fixed inset-0 z-50 flex items-center justify-center bg-[#203A36]/40 backdrop-blur-sm p-4">
      <div className="bg-[#FEFEFC] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-[#E2E7E3] animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 bg-[#F5F7F3] border-b border-[#E2E7E3] flex justify-between items-center">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-[#28766B]" />
            <h2 className="font-bold text-[#202D2B] text-base">Add New Customer</h2>
          </div>
          <button aria-label="Close dialog" onClick={onClose} className="p-1 rounded-lg text-[#66746F] hover:text-[#202D2B] hover:bg-[#E2E7E3]/60">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div role="alert" className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-800 text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Customer ID & Mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-1 text-xs font-semibold text-[#202D2B] mb-1">
                <Hash className="w-3.5 h-3.5 text-[#28766B]" />
                Customer ID *
              </label>
              <input
                type="text"
                name="customerCode"
                required
                value={formData.customerCode}
                onChange={handleChange}
                placeholder="e.g. CUST-1002"
                className="w-full px-3 py-2 rounded-xl border border-[#E2E7E3] font-bold tabular-nums text-[#202D2B] text-xs focus:ring-2 focus:ring-[#28766B]/30 focus:border-[#28766B] focus:outline-none bg-[#F5F7F3]"
              />
              <span className="text-[10px] text-[#66746F]">Auto-suggested sequential ID</span>
            </div>

            <div>
              <label htmlFor="CustomerFormModal-field-0" className="block text-xs font-semibold text-[#202D2B] mb-1">Mobile Number</label>
              <input id="CustomerFormModal-field-0"
                type="tel"
                name="phone"
                placeholder="10-digit mobile"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-xl border border-[#E2E7E3] bg-white text-xs tabular-nums text-[#202D2B] placeholder:text-[#9AA8A3] focus:ring-2 focus:ring-[#28766B]/30 focus:border-[#28766B] focus:outline-none"
              />
              <span className="text-[10px] text-[#66746F]">Shared family mobile allowed</span>
            </div>
          </div>

          <div>
            <label htmlFor="CustomerFormModal-field-1" className="block text-xs font-semibold text-[#202D2B] mb-1">Full Name *</label>
            <input id="CustomerFormModal-field-1"
              type="text"
              name="fullName"
              required
              placeholder="e.g. Ravi Kumar"
              value={formData.fullName}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-xl border border-[#E2E7E3] bg-white text-xs text-[#202D2B] placeholder:text-[#9AA8A3] focus:ring-2 focus:ring-[#28766B]/30 focus:border-[#28766B] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="CustomerFormModal-field-2" className="block text-xs font-semibold text-[#202D2B] mb-1">Age</label>
              <input id="CustomerFormModal-field-2"
                type="number"
                name="age"
                placeholder="e.g. 35"
                value={formData.age}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-xl border border-[#E2E7E3] bg-white text-xs tabular-nums text-[#202D2B] placeholder:text-[#9AA8A3] focus:ring-2 focus:ring-[#28766B]/30 focus:border-[#28766B] focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="CustomerFormModal-field-3" className="block text-xs font-semibold text-[#202D2B] mb-1">Gender</label>
              <select id="CustomerFormModal-field-3"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-xl border border-[#E2E7E3] text-xs text-[#202D2B] focus:ring-2 focus:ring-[#28766B]/30 focus:border-[#28766B] focus:outline-none bg-white"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label htmlFor="CustomerFormModal-field-4" className="block text-xs font-semibold text-[#202D2B] mb-1">Email</label>
              <input id="CustomerFormModal-field-4"
                type="email"
                name="email"
                placeholder="Optional"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-xl border border-[#E2E7E3] bg-white text-xs text-[#202D2B] placeholder:text-[#9AA8A3] focus:ring-2 focus:ring-[#28766B]/30 focus:border-[#28766B] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="CustomerFormModal-field-5" className="block text-xs font-semibold text-[#202D2B] mb-1">Address</label>
            <input id="CustomerFormModal-field-5"
              type="text"
              name="address"
              placeholder="Locality, City"
              value={formData.address}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-xl border border-[#E2E7E3] bg-white text-xs text-[#202D2B] placeholder:text-[#9AA8A3] focus:ring-2 focus:ring-[#28766B]/30 focus:border-[#28766B] focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="CustomerFormModal-field-6" className="block text-xs font-semibold text-[#202D2B] mb-1">Notes</label>
            <textarea id="CustomerFormModal-field-6"
              name="notes"
              rows={2}
              placeholder="Doctor recommendations or notes..."
              value={formData.notes}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-xl border border-[#E2E7E3] bg-white text-xs text-[#202D2B] placeholder:text-[#9AA8A3] focus:ring-2 focus:ring-[#28766B]/30 focus:border-[#28766B] focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-[#E2E7E3]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#66746F] hover:bg-[#F5F7F3] rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-[#28766B] hover:bg-[#1E5C53] text-white text-xs font-semibold rounded-xl shadow-sm transition disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}