import { useModalAccessibility } from '../../hooks/useModalAccessibility.js';
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

  const modalRef = useModalAccessibility(isOpen, onClose);
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
    <div ref={modalRef} className="fixed inset-0 z-50 flex items-center justify-center bg-[#203A36]/40 backdrop-blur-sm p-4">
      <div className="bg-[#FEFEFC] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-[#E2E7E3] animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 bg-[#F5F7F3] border-b border-[#E2E7E3] flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#EBF3F1] text-[#28766B] flex items-center justify-center border border-[#28766B]/20">
              <IndianRupee className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-[#202D2B] text-base">Collect Payment</h2>
              <p className="text-[11px] text-[#66746F] tabular-nums font-semibold">Order #{orderNumber}</p>
            </div>
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
          <div>
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="RecordPaymentModal-field-0" className="block text-xs font-semibold text-[#202D2B]">Payment Amount (₹) *</label>
              <span className="text-xs text-amber-700 font-bold tabular-nums">
                Balance Due: ₹{balanceDue?.toLocaleString()}
              </span>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-[#66746F] font-bold text-sm">₹</span>
              <input id="RecordPaymentModal-field-0"
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-2.5 tabular-nums text-lg font-bold text-[#202D2B] rounded-xl border border-[#E2E7E3] focus:ring-2 focus:ring-[#28766B]/30 focus:border-[#28766B] focus:outline-none bg-white"
              />
            </div>
          </div>

          <div>
            <label htmlFor="RecordPaymentModal-field-1" className="block text-xs font-semibold text-[#202D2B] mb-1">Payment Method *</label>
            <select id="RecordPaymentModal-field-1"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-[#E2E7E3] text-xs text-[#202D2B] bg-white focus:ring-2 focus:ring-[#28766B]/30 focus:border-[#28766B] focus:outline-none"
            >
              <option value="UPI">Google Pay / PhonePe / Paytm (UPI)</option>
              <option value="CASH">Cash</option>
              <option value="CARD">Credit / Debit Card</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="RecordPaymentModal-field-2" className="block text-xs font-semibold text-[#202D2B] mb-1">UPI / Transaction Reference (Optional)</label>
            <input id="RecordPaymentModal-field-2"
              type="text"
              placeholder="e.g. UPI-987123"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#E2E7E3] text-xs text-[#202D2B] placeholder:text-[#9AA8A3] focus:ring-2 focus:ring-[#28766B]/30 focus:border-[#28766B] focus:outline-none bg-white"
            />
          </div>

          <div>
            <label htmlFor="RecordPaymentModal-field-3" className="block text-xs font-semibold text-[#202D2B] mb-1">Remarks / Note</label>
            <input id="RecordPaymentModal-field-3"
              type="text"
              placeholder="e.g. Balance collected on customer pickup"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#E2E7E3] text-xs text-[#202D2B] placeholder:text-[#9AA8A3] focus:ring-2 focus:ring-[#28766B]/30 focus:border-[#28766B] focus:outline-none bg-white"
            />
          </div>

          {/* Auto Deliver Checkbox if status is READY_FOR_PICKUP */}
          {isReadyForPickup && (
            <label className="flex items-center gap-2 p-3 bg-[#EBF3F1] border border-[#28766B]/30 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={markDelivered}
                onChange={(e) => setMarkDelivered(e.target.checked)}
                className="w-4 h-4 text-[#28766B] rounded border-[#E2E7E3] focus:ring-[#28766B]"
              />
              <span className="text-xs font-semibold text-[#202D2B] flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#28766B]" />
                Mark order as DELIVERED after collecting balance
              </span>
            </label>
          )}

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
              className="px-5 py-2.5 bg-[#28766B] hover:bg-[#1E5C53] text-white text-xs font-bold rounded-xl shadow-sm transition disabled:opacity-50"
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
