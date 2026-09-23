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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-white text-base">Pay Supplier Due</h2>
              <p className="text-xs text-slate-400">PO #{purchaseOrder.po_number} • {purchaseOrder.supplier_name}</p>
            </div>
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

        {/* PO Status Banner */}
        <div className="mx-6 mt-4 p-3 bg-amber-50 rounded-2xl border border-amber-200/80 flex justify-between items-center">
          <div>
            <div className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">Remaining Unpaid Balance</div>
            <div className="text-xl font-mono font-black text-amber-900 mt-0.5">
              ₹{parseFloat(purchaseOrder.balance_due || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="text-right text-[11px] text-slate-500 font-mono">
            Total: ₹{parseFloat(purchaseOrder.total_amount || 0).toLocaleString()}<br />
            Paid: ₹{parseFloat(purchaseOrder.paid_amount || 0).toLocaleString()}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Amount (₹) *</label>
            <input
              type="number"
              step="0.01"
              required
              min="1"
              max={purchaseOrder.balance_due}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method *</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
            >
              <option value="UPI">UPI / GPay / PhonePe / Paytm</option>
              <option value="BANK_TRANSFER">Bank Transfer (NEFT / RTGS / IMPS)</option>
              <option value="CASH">Cash</option>
              <option value="CHEQUE">Cheque</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Transaction Reference / Cheque No.</label>
            <input
              type="text"
              placeholder="e.g. UTR / UPI Ref 493021940"
              value={referenceNote}
              onChange={(e) => setReferenceNote(e.target.value)}
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
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 disabled:opacity-50 transition flex items-center gap-1.5"
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