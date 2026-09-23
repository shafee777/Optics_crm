import React, { useState, useEffect } from 'react';
import api from '../../services/api.js';
import { X, Building2, AlertCircle } from 'lucide-react';

const CATEGORIES = [
  { value: 'LENS_LAB', label: 'Lens Processing Lab' },
  { value: 'FRAME_VENDOR', label: 'Frame Manufacturer / Distributor' },
  { value: 'CONTACT_LENS', label: 'Contact Lens Supplier' },
  { value: 'ACCESSORIES', label: 'Cases & Solutions / Accessories' },
  { value: 'GENERAL', label: 'General Vendor' },
];

export default function SupplierModal({ isOpen, onClose, supplierToEdit, onSupplierSaved }) {
  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    gstin: '',
    address: '',
    category: 'FRAME_VENDOR',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (supplierToEdit) {
      setFormData({
        name: supplierToEdit.name || '',
        contactPerson: supplierToEdit.contact_person || '',
        phone: supplierToEdit.phone || '',
        email: supplierToEdit.email || '',
        gstin: supplierToEdit.gstin || '',
        address: supplierToEdit.address || '',
        category: supplierToEdit.category || 'FRAME_VENDOR',
      });
    } else {
      setFormData({
        name: '',
        contactPerson: '',
        phone: '',
        email: '',
        gstin: '',
        address: '',
        category: 'FRAME_VENDOR',
      });
    }
  }, [supplierToEdit, isOpen]);

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
        name: formData.name.trim(),
        contactPerson: formData.contactPerson.trim() || null,
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        gstin: formData.gstin.trim() || null,
        address: formData.address.trim() || null,
        category: formData.category,
      };

      let res;
      if (supplierToEdit) {
        res = await api.put(`/suppliers/${supplierToEdit.id}`, payload);
      } else {
        res = await api.post('/suppliers', payload);
      }

      onSupplierSaved(res.data.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to save supplier');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Building2 className="w-4 h-4" />
            </div>
            <h2 className="font-bold text-white text-base">
              {supplierToEdit ? 'Edit Supplier / Lab' : 'Add New Supplier / Lens Lab'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-red-700 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Company / Supplier Name *</label>
            <input
              type="text"
              required
              name="name"
              placeholder="e.g. Essilor Lens Lab / Titan Eye Distribution"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Category *</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Person</label>
              <input
                type="text"
                name="contactPerson"
                placeholder="e.g. Vikram Mehta (Sales Mgr)"
                value={formData.contactPerson}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
              <input
                type="text"
                name="phone"
                placeholder="e.g. 9888877777"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Supplier GSTIN</label>
              <input
                type="text"
                name="gstin"
                placeholder="e.g. 29AABCU9603R1ZM"
                value={formData.gstin}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono uppercase focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              name="email"
              placeholder="e.g. laborders@supplier.com"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Office / Lab Address</label>
            <textarea
              rows={2}
              name="address"
              placeholder="e.g. Industrial Area, Phase 2, Bangalore"
              value={formData.address}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 disabled:opacity-50 transition"
            >
              {loading ? 'Saving...' : supplierToEdit ? 'Update Supplier' : 'Save Supplier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}