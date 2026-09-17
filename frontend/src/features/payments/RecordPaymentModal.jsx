import React, { useState, useEffect } from 'react';
import api from '../../services/api.js';
import { X, IndianRupee, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function RecordPaymentModal({
  isOpen,
  onClose,
  orderId,
  orderNumber,
  balanceDue,
  isReadyForPickup,
  onPaymentRecorded,
}) {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [markDelivered, setMarkDelivered] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setAmount(balanceDue ? balanceDue.toString() : '');
      setMarkDelivered(isReadyForPickup);
      setError('');
    }
  }, [isOpen, balanceDue, isReadyForPickup]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const numericAmount = parseFloat(amount);

    if (!numericAmount || numericAmount <= 0) {
      setError('Please enter a valid payment amount greater than 0');
      return;
    }

    setLoading(true);

    try {
      await api.post(`/orders/${orderId}/payments`, {
        amount: numericAmount,
        paymentMethod,
        reference,
        notes,
        markDelivered: isReadyForPickup && markDelivered,
      });

      onPaymentRecorded();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-base">Collect Payment</h2>
              <p className="text-[11px] text-slate-500 font-mono">Order #{orderNumber}</p>
            </div>
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
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold text-slate-700">Payment Amount (₹) *</label>
              <span className="text-xs text-amber-600 font-medium font-mono">
                Balance Due: ₹{balanceDue?.toLocaleString()}
              </span>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 font-bold text-sm">₹</span>
              <input
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-2.5 font-mono text-lg font-bold text-slate-900 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method *</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="UPI">Google Pay / PhonePe / Paytm (UPI)</option>
              <option value="CASH">Cash</option>
              <option value="CARD">Credit / Debit Card</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">UPI / Transaction Reference (Optional)</label>
            <input
              type="text"
              placeholder="e.g. UPI-987123"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks / Note</label>
            <input
              type="text"
              placeholder="e.g. Balance collected on customer pickup"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Auto Deliver Checkbox if status is READY_FOR_PICKUP */}
          {isReadyForPickup && (
            <label className="flex items-center gap-2 p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={markDelivered}
                onChange={(e) => setMarkDelivered(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
              <span className="text-xs font-semibold text-emerald-900 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Mark order as DELIVERED after collecting balance
              </span>
            </label>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 disabled:opacity-50"
            >
              {loading
                ? 'Processing...'
                : isReadyForPickup && markDelivered
                ? 'Collect Balance & Deliver'
                : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
