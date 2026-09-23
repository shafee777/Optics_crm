import React, { useState } from 'react';
import api from '../../services/api.js';
import { X, TrendingDown, AlertCircle } from 'lucide-react';

export default function AddExpenseModal({ isOpen, onClose, onExpenseAdded }) {
  const [formData, setFormData] = useState({
    category: 'Supplier/Lab',
    amount: '',
    paymentMethod: 'UPI',
    note: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const categories = [
    'Supplier/Lab',
    'Rent',
    'Salary',
    'Electricity',
    'Shop Maintenance',
    'Marketing',
    'Tea/Snacks',
    'Miscellaneous',
  ];

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const numericAmount = parseFloat(formData.amount);
    if (!numericAmount || numericAmount <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    setLoading(true);

    try {
      await api.post('/expenses', {
        ...formData,
        amount: numericAmount,
      });
      onExpenseAdded();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to record expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#203A36]/40 backdrop-blur-xs p-4">
      <div className="bg-[#FEFEFC] w-full max-w-md rounded-2xl shadow-2xl border border-[#E2E7E3] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 bg-[#F5F7F3] border-b border-[#E2E7E3] flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center border border-rose-100">
              <TrendingDown className="w-4 h-4" />
            </div>
            <h2 className="font-bold text-[#202D2B] text-sm">Record Business Expense</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-[#66746F] hover:text-[#202D2B] hover:bg-[#FEFEFC]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-red-50/80 border border-red-200 flex items-center gap-2 text-red-700 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#66746F] mb-1">Expense Category *</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-xl border border-[#E2E7E3] text-xs bg-[#FEFEFC] text-[#202D2B] focus:border-[#28766B] focus:ring-1 focus:ring-[#28766B] focus:outline-none font-medium"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#66746F] mb-1">Amount (₹) *</label>
            <input
              type="number"
              step="0.01"
              name="amount"
              required
              placeholder="e.g. 1500"
              value={formData.amount}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-xl border border-[#E2E7E3] font-mono tabular-nums text-sm font-bold text-[#202D2B] bg-[#FEFEFC] focus:border-[#28766B] focus:ring-1 focus:ring-[#28766B] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#66746F] mb-1">Payment Method *</label>
            <select
              name="paymentMethod"
              value={formData.paymentMethod}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-xl border border-[#E2E7E3] text-xs bg-[#FEFEFC] text-[#202D2B] focus:border-[#28766B] focus:ring-1 focus:ring-[#28766B] focus:outline-none font-medium"
            >
              <option value="UPI">Google Pay / PhonePe / Paytm (UPI)</option>
              <option value="CASH">Cash</option>
              <option value="CARD">Credit / Debit Card</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#66746F] mb-1">Note / Description</label>
            <input
              type="text"
              name="note"
              placeholder="e.g. Lens grinding lab bill for order ORD-1001"
              value={formData.note}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-xl border border-[#E2E7E3] text-xs bg-[#FEFEFC] text-[#202D2B] focus:border-[#28766B] focus:ring-1 focus:ring-[#28766B] focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#E2E7E3]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#66746F] hover:text-[#202D2B] bg-[#FEFEFC] border border-[#E2E7E3] hover:bg-[#F5F7F3] rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-xs disabled:opacity-50 transition"
            >
              {loading ? 'Saving...' : 'Record Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
