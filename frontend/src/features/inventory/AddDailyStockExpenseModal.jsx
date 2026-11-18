import React, { useState, useEffect } from 'react';
import { X, Calendar, Building2, Tag, FileText, IndianRupee, Layers } from 'lucide-react';
import api from '../../services/api.js';

export default function AddDailyStockExpenseModal({
  isOpen,
  onClose,
  onSuccess,
  defaultCategory = 'LENS',
  existingCompanies = [],
  editingEntry = null,
}) {
  const [category, setCategory] = useState(defaultCategory);
  const [companyName, setCompanyName] = useState('');
  const [brandDetails, setBrandDetails] = useState('');
  const [stockNotes, setStockNotes] = useState('');
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
  const [totalAmount, setTotalAmount] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (editingEntry) {
      setCategory(editingEntry.category);
      setCompanyName(editingEntry.company_name);
      setBrandDetails(editingEntry.brand_details || '');
      setStockNotes(editingEntry.stock_notes || '');
      setBillDate(editingEntry.bill_date ? editingEntry.bill_date.split('T')[0] : '');
      setTotalAmount(editingEntry.total_amount?.toString() || '');
      setPaidAmount(editingEntry.paid_amount?.toString() || '0');
      setPaymentMethod(editingEntry.payment_method || 'CASH');
      setInvoiceNumber(editingEntry.invoice_number || '');
      setNotes(editingEntry.notes || '');
    } else {
      setCategory(defaultCategory);
      setCompanyName('');
      setBrandDetails('');
      setStockNotes('');
      setBillDate(new Date().toISOString().split('T')[0]);
      setTotalAmount('');
      setPaidAmount('0');
      setPaymentMethod('CASH');
      setInvoiceNumber('');
      setNotes('');
    }
    setError(null);
  }, [editingEntry, defaultCategory, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setError('Please provide a company / supplier name');
      return;
    }
    if (!totalAmount || parseFloat(totalAmount) < 0) {
      setError('Please provide a valid total bill amount');
      return;
    }

    setLoading(true);
    setError(null);

    const payload = {
      category,
      companyName: companyName.trim(),
      brandDetails: brandDetails.trim() || null,
      stockNotes: stockNotes.trim() || null,
      billDate: billDate || null,
      totalAmount: parseFloat(totalAmount),
      paidAmount: parseFloat(paidAmount || 0),
      paymentMethod,
      invoiceNumber: invoiceNumber.trim() || null,
      notes: notes.trim() || null,
    };

    try {
      if (editingEntry) {
        await api.put(`/daily-stock-expenses/${editingEntry.id}`, payload);
      } else {
        await api.post('/daily-stock-expenses', payload);
      }
      onSuccess(editingEntry ? 'Bill updated successfully' : 'Daily stock bill recorded');
      onClose();
    } catch (err) {
      console.error('Failed to save daily stock expense', err);
      setError(err.response?.data?.error?.message || 'Failed to save daily stock expense');
    } finally {
      setLoading(false);
    }
  };

  const calculatedBalance = Math.max(0, (parseFloat(totalAmount) || 0) - (parseFloat(paidAmount) || 0));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#FEFEFC] w-full max-w-lg rounded-2xl border border-[#E2E7E3] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E2E7E3] flex justify-between items-center bg-[#F5F7F3]">
          <div>
            <h2 className="text-sm font-bold text-[#202D2B]">
              {editingEntry ? 'Edit Stock Bill' : 'Record Daily Stock Bill'}
            </h2>
            <p className="text-[11px] text-[#66746F]">
              Direct vendor purchase tracker — does not alter product catalog or daily store expenses
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
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-semibold text-xs">
              {error}
            </div>
          )}

          {/* Category Switcher */}
          <div>
            <label className="block text-[11px] font-bold text-[#66746F] uppercase tracking-wider mb-1.5">
              Category
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCategory('LENS')}
                className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-2 border transition ${
                  category === 'LENS'
                    ? 'bg-[#28766B] text-white border-[#28766B]'
                    : 'bg-[#F5F7F3] text-[#66746F] border-[#E2E7E3] hover:bg-[#EBF3F1]'
                }`}
              >
                👓 Lens
              </button>
              <button
                type="button"
                onClick={() => setCategory('FRAME')}
                className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-2 border transition ${
                  category === 'FRAME'
                    ? 'bg-[#28766B] text-white border-[#28766B]'
                    : 'bg-[#F5F7F3] text-[#66746F] border-[#E2E7E3] hover:bg-[#EBF3F1]'
                }`}
              >
                🕶️ Frames
              </button>
            </div>
          </div>

          {/* Company Name & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#66746F] uppercase tracking-wider mb-1.5">
                Company / Supplier Name *
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9AA8A3]" />
                <input
                  type="text"
                  required
                  list="companies-list"
                  placeholder="e.g. Kamal Trichy, Marko"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#F5F7F3] border border-[#E2E7E3] rounded-xl text-xs font-semibold text-[#202D2B] placeholder:text-[#9AA8A3] focus:ring-2 focus:ring-[#28766B]/30 focus:outline-none"
                />
                <datalist id="companies-list">
                  {existingCompanies.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#66746F] uppercase tracking-wider mb-1.5">
                Bill Date *
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9AA8A3]" />
                <input
                  type="date"
                  required
                  value={billDate}
                  onChange={(e) => setBillDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#F5F7F3] border border-[#E2E7E3] rounded-xl text-xs font-semibold text-[#202D2B] focus:ring-2 focus:ring-[#28766B]/30 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Brand Details & Invoice # */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#66746F] uppercase tracking-wider mb-1.5">
                Brand / Type (For Brand Summary)
              </label>
              <div className="relative">
                <Tag className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9AA8A3]" />
                <input
                  type="text"
                  placeholder="e.g. Crizal, BluLite, Ray-Ban"
                  value={brandDetails}
                  onChange={(e) => setBrandDetails(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#F5F7F3] border border-[#E2E7E3] rounded-xl text-xs font-semibold text-[#202D2B] placeholder:text-[#9AA8A3] focus:ring-2 focus:ring-[#28766B]/30 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#66746F] uppercase tracking-wider mb-1.5">
                Invoice / Challan # (Optional)
              </label>
              <div className="relative">
                <FileText className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9AA8A3]" />
                <input
                  type="text"
                  placeholder="e.g. INV-9821, DC-44"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#F5F7F3] border border-[#E2E7E3] rounded-xl text-xs font-semibold text-[#202D2B] placeholder:text-[#9AA8A3] focus:ring-2 focus:ring-[#28766B]/30 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Stock Incoming Notes / Quantities */}
          <div>
            <label className="block text-[11px] font-bold text-[#66746F] uppercase tracking-wider mb-1.5">
              Stock Inward Notes / Quantities
            </label>
            <div className="relative">
              <Layers className="w-4 h-4 absolute left-3 top-2.5 text-[#9AA8A3]" />
              <textarea
                rows={2}
                placeholder="e.g. 10 pairs single vision, 2 progressives for customer jobs"
                value={stockNotes}
                onChange={(e) => setStockNotes(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#F5F7F3] border border-[#E2E7E3] rounded-xl text-xs text-[#202D2B] placeholder:text-[#9AA8A3] focus:ring-2 focus:ring-[#28766B]/30 focus:outline-none resize-none"
              />
            </div>
          </div>

          {/* Financials: Total Bill & Paid Amount */}
          <div className="p-3.5 bg-[#F5F7F3] rounded-xl border border-[#E2E7E3] space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#202D2B] uppercase tracking-wider mb-1">
                  Total Bill Amount (₹) *
                </label>
                <div className="relative">
                  <IndianRupee className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#28766B]" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="15000"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-[#E2E7E3] rounded-xl text-xs font-bold text-[#202D2B] focus:ring-2 focus:ring-[#28766B]/30 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#202D2B] uppercase tracking-wider mb-1">
                  Paid Amount (₹)
                </label>
                <div className="relative">
                  <IndianRupee className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-[#E2E7E3] rounded-xl text-xs font-bold text-emerald-700 focus:ring-2 focus:ring-emerald-500/30 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Calculated Balance Preview */}
            <div className="flex items-center justify-between pt-1 border-t border-[#E2E7E3] text-xs">
              <span className="font-semibold text-[#66746F]">Remaining Balance Owed:</span>
              <span
                className={`font-bold ${
                  calculatedBalance > 0 ? 'text-amber-700' : 'text-emerald-700'
                }`}
              >
                ₹{calculatedBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                {calculatedBalance === 0 && (parseFloat(totalAmount) || 0) > 0 && ' (Full Paid)'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-[#66746F] mb-1">
                  Payment Mode
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-[#E2E7E3] rounded-xl text-xs font-semibold text-[#202D2B] focus:outline-none"
                >
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI / GPay / PhonePe</option>
                  <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#66746F] mb-1">
                  Optional Remarks / Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Paid via UPI on delivery"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-[#E2E7E3] rounded-xl text-xs text-[#202D2B] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
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
              {loading ? 'Saving...' : editingEntry ? 'Update Bill' : 'Save Stock Bill'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
