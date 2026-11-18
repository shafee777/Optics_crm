import React, { useState, useEffect } from 'react';
import { X, IndianRupee, CheckCircle2 } from 'lucide-react';
import api from '../../services/api.js';

export default function QuickEditPaymentModal({
  isOpen,
  onClose,
  onSuccess,
  entry,
}) {
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (entry) {
      setPaidAmount(entry.paid_amount?.toString() || '0');
      setPaymentMethod(entry.payment_method || 'CASH');
      setNotes(entry.notes || '');
      setError(null);
    }
  }, [entry, isOpen]);

  if (!isOpen || !entry) return null;

  const total = parseFloat(entry.total_amount) || 0;
  const currentPaid = parseFloat(paidAmount) || 0;
  const balance = Math.max(0, total - currentPaid);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (currentPaid < 0) {
      setError('Paid amount cannot be negative');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.patch(`/daily-stock-expenses/${entry.id}/payment`, {
        paidAmount: currentPaid,
        paymentMethod,
        notes: notes.trim() || null,
      });
      onSuccess(`Payment updated for ${entry.company_name}`);
      onClose();
    } catch (err) {
      console.error('Failed to update payment', err);
      setError(err.response?.data?.error?.message || 'Failed to update payment');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkFullPaid = () => {
    setPaidAmount(total.toString());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#FEFEFC] w-full max-w-md rounded-2xl border border-[#E2E7E3] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E2E7E3] flex justify-between items-center bg-[#F5F7F3]">
          <div>
            <h2 className="text-sm font-bold text-[#202D2B]">Edit Paid Amount</h2>
            <p className="text-[11px] text-[#66746F]">
              Vendor: <span className="font-bold text-[#202D2B]">{entry.company_name}</span> ({entry.category})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#66746F] hover:bg-[#E2E7E3] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-semibold text-xs">
              {error}
            </div>
          )}

          {/* Bill summary cards */}
          <div className="grid grid-cols-2 gap-2 p-3 bg-[#F5F7F3] rounded-xl border border-[#E2E7E3]">
            <div>
              <span className="text-[10px] font-bold text-[#66746F] uppercase">Bill Total</span>
              <p className="text-sm font-extrabold text-[#202D2B]">
                ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-[#66746F] uppercase">Remaining Due</span>
              <p className={`text-sm font-extrabold ${balance > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Paid Amount Input */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] font-bold text-[#202D2B] uppercase tracking-wider">
                How Much Paid (₹) *
              </label>
              <button
                type="button"
                onClick={handleMarkFullPaid}
                className="text-[11px] font-bold text-[#28766B] hover:underline flex items-center gap-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Mark Full Paid
              </button>
            </div>
            <div className="relative">
              <IndianRupee className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600" />
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-[#E2E7E3] rounded-xl text-sm font-extrabold text-emerald-700 focus:ring-2 focus:ring-emerald-500/30 focus:outline-none"
              />
            </div>
          </div>

          {/* Payment Method & Note */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#66746F] mb-1">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 bg-[#F5F7F3] border border-[#E2E7E3] rounded-xl text-xs font-semibold text-[#202D2B] focus:outline-none"
              >
                <option value="CASH">Cash</option>
                <option value="UPI">UPI / GPay / PhonePe</option>
                <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                <option value="CHEQUE">Cheque</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#66746F] mb-1">
                Remarks / Reference
              </label>
              <input
                type="text"
                placeholder="e.g. Paid balance via UPI"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-[#F5F7F3] border border-[#E2E7E3] rounded-xl text-xs text-[#202D2B] focus:outline-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#E2E7E3] text-[#66746F] hover:bg-[#E2E7E3] rounded-xl font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-[#28766B] hover:bg-[#1E5C53] text-white rounded-xl font-bold shadow-sm transition disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Update Paid Amount'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
