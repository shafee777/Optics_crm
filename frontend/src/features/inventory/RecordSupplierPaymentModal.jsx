import React, { useState, useEffect } from 'react';
import api from '../../services/api.js';
import { X, DollarSign, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function RecordSupplierPaymentModal({ isOpen, onClose, purchaseOrder, onPaymentRecorded }) {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [referenceNote, setReferenceNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (purchaseOrder && isOpen) {
      setAmount(purchaseOrder.balance_due ? purchaseOrder.balance_due.toString() : '');
      setReferenceNote('');
      setError('');
    }
  }, [purchaseOrder, isOpen]);

  if (!isOpen || !purchaseOrder) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid payment amount greater than 0');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post(`/purchases/${purchaseOrder.id}/payments`, {
        amount: numAmount,
        paymentMethod,
        referenceNote: referenceNote.trim() || null,
      });

      onPaymentRecorded(res.data.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to record supplier payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#203A36]/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-[#FEFEFC] w-full max-w-md rounded-2xl shadow-2xl border border-[#E2E7E3] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-[#203A36] text-white flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#28766B]/30 text-white flex items-center justify-center border border-white/10">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-white text-base">Pay Supplier Due</h2>
              <p className="text-xs text-white/70">PO #{purchaseOrder.po_number} • {purchaseOrder.supplier_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-red-50/80 border border-red-200 flex items-center gap-2 text-red-700 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* PO Status Banner */}
        <div className="mx-6 mt-4 p-3.5 bg-amber-50/80 rounded-2xl border border-amber-200 flex justify-between items-center">
          <div>
            <div className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">Remaining Unpaid Balance</div>
            <div className="text-xl font-mono tabular-nums font-bold text-amber-900 mt-0.5">
              ₹{parseFloat(purchaseOrder.balance_due || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="text-right text-[11px] text-[#66746F] font-mono tabular-nums">
            Total: ₹{parseFloat(purchaseOrder.total_amount || 0).toLocaleString()}<br />
            Paid: ₹{parseFloat(purchaseOrder.paid_amount || 0).toLocaleString()}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#66746F] mb-1">Payment Amount (₹) *</label>
            <input
              type="number"
              step="0.01"
              required
              min="1"
              max={purchaseOrder.balance_due}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#E2E7E3] text-sm font-mono tabular-nums font-bold text-[#202D2B] bg-[#FEFEFC] focus:border-[#28766B] focus:ring-1 focus:ring-[#28766B] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#66746F] mb-1">Payment Method *</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#E2E7E3] text-xs font-medium text-[#202D2B] bg-[#FEFEFC] focus:border-[#28766B] focus:ring-1 focus:ring-[#28766B] focus:outline-none"
            >
              <option value="UPI">UPI / GPay / PhonePe / Paytm</option>
              <option value="BANK_TRANSFER">Bank Transfer (NEFT / RTGS / IMPS)</option>
              <option value="CASH">Cash</option>
              <option value="CHEQUE">Cheque</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#66746F] mb-1">Transaction Reference / Cheque No.</label>
            <input
              type="text"
              placeholder="e.g. UTR / UPI Ref 493021940"
              value={referenceNote}
              onChange={(e) => setReferenceNote(e.target.value)}
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
              className="px-5 py-2 bg-[#28766B] hover:bg-[#1E5C53] text-white text-xs font-semibold rounded-xl shadow-xs disabled:opacity-50 transition flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              {loading ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}