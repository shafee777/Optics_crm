import React, { useState, useEffect, useCallback } from 'react';
import { X, Calendar, Building2, Tag, Layers, IndianRupee, Edit3, ArrowRight } from 'lucide-react';
import api from '../../services/api.js';

export default function CompanyDrilldownModal({
  isOpen,
  onClose,
  companyName,
  category,
  initialMonth,
  onEditPayment,
}) {
  const [selectedMonth, setSelectedMonth] = useState(initialMonth || new Date().toISOString().slice(0, 7));
  const [summaryData, setSummaryData] = useState(null);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialMonth) {
      setSelectedMonth(initialMonth);
    }
  }, [initialMonth]);

  const fetchCompanyDetails = useCallback(async () => {
    if (!companyName) return;
    try {
      setLoading(true);
      const [sumRes, listRes] = await Promise.all([
        api.get(`/daily-stock-expenses/company-summary?companyName=${encodeURIComponent(companyName)}&month=${selectedMonth}${category ? `&category=${category}` : ''}`),
        api.get(`/daily-stock-expenses?companyName=${encodeURIComponent(companyName)}&month=${selectedMonth}${category ? `&category=${category}` : ''}&limit=100`),
      ]);
      setSummaryData(sumRes.data.data);
      setBills(listRes.data.data || []);
    } catch (err) {
      console.error('Failed to fetch company drill-down data', err);
    } finally {
      setLoading(false);
    }
  }, [companyName, category, selectedMonth]);

  useEffect(() => {
    if (isOpen && companyName) {
      fetchCompanyDetails();
    }
  }, [isOpen, companyName, selectedMonth, fetchCompanyDetails]);

  if (!isOpen || !companyName) return null;

  const companyStats = summaryData?.companies?.[0] || {
    totalPurchased: 0,
    totalPaid: 0,
    balanceOwed: 0,
    totalBills: 0,
  };

  const brandBreakdown = summaryData?.brandBreakdown || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#FEFEFC] w-full max-w-3xl rounded-2xl border border-[#E2E7E3] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E2E7E3] flex justify-between items-center bg-[#F5F7F3]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#28766B]/10 text-[#28766B] flex items-center justify-center font-bold text-sm">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#202D2B]">{companyName}</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#28766B]/15 text-[#28766B]">
                  {category === 'LENS' ? '👓 Lens Lab' : category === 'FRAME' ? '🕶️ Frame Vendor' : 'Stock Vendor'}
                </span>
              </div>
              <p className="text-[11px] text-[#66746F]">
                Monthly statement & brand-wise purchase breakdown
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Month selector */}
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-[#E2E7E3]">
              <Calendar className="w-3.5 h-3.5 text-[#66746F]" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="text-xs font-bold text-[#202D2B] focus:outline-none bg-transparent"
              />
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-[#66746F] hover:bg-[#E2E7E3] transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          {/* Top KPI Cards for the selected month */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-[#F5F7F3] border border-[#E2E7E3]">
              <span className="text-[10px] font-bold text-[#66746F] uppercase tracking-wider">
                Total Purchased ({selectedMonth})
              </span>
              <p className="text-lg font-black text-[#202D2B] mt-1">
                ₹{companyStats.totalPurchased.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-[#66746F] mt-0.5 block">
                Across {companyStats.totalBills} daily deliveries
              </span>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                Total Paid
              </span>
              <p className="text-lg font-black text-emerald-700 mt-1">
                ₹{companyStats.totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-emerald-700 mt-0.5 block">
                Settled to {companyName}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200">
              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                How Much We Owe (Balance)
              </span>
              <p className="text-lg font-black text-amber-800 mt-1">
                ₹{companyStats.balanceOwed.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-amber-700 font-semibold mt-0.5 block">
                {companyStats.balanceOwed > 0 ? 'Pending month-end payment' : 'All cleared! 🎉'}
              </span>
            </div>
          </div>

          {/* SECTION: BRAND-WISE PURCHASE BREAKDOWN */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs font-bold text-[#202D2B] flex items-center gap-1.5 uppercase tracking-wider">
                <Tag className="w-3.5 h-3.5 text-[#28766B]" />
                Brand-Wise Details ({selectedMonth})
              </h3>
              <span className="text-[11px] text-[#66746F]">
                {brandBreakdown.length} {brandBreakdown.length === 1 ? 'brand line' : 'brand lines'}
              </span>
            </div>

            {brandBreakdown.length === 0 ? (
              <div className="p-4 text-center rounded-xl bg-[#F5F7F3] text-[#66746F] text-xs">
                No brand-wise breakdown recorded for this month.
              </div>
            ) : (
              <div className="border border-[#E2E7E3] rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F5F7F3] border-b border-[#E2E7E3] text-[10px] font-bold text-[#66746F] uppercase">
                    <tr>
                      <th className="py-2.5 px-3.5">Brand / Type</th>
                      <th className="py-2.5 px-3.5 text-center">Deliveries</th>
                      <th className="py-2.5 px-3.5 text-right">Total Purchased</th>
                      <th className="py-2.5 px-3.5 text-right">Paid</th>
                      <th className="py-2.5 px-3.5 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E7E3]">
                    {brandBreakdown.map((item, idx) => (
                      <tr key={idx} className="hover:bg-[#F9FAF8] transition">
                        <td className="py-2.5 px-3.5 font-bold text-[#202D2B]">
                          {item.brand}
                        </td>
                        <td className="py-2.5 px-3.5 text-center text-[#66746F]">
                          {item.count}
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-bold text-[#202D2B]">
                          ₹{item.totalPurchased.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3.5 text-right text-emerald-700 font-semibold">
                          ₹{item.totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-bold text-amber-700">
                          ₹{item.balanceOwed.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* SECTION: ALL DAILY BILLS FOR THIS COMPANY */}
          <div>
            <h3 className="text-xs font-bold text-[#202D2B] flex items-center gap-1.5 uppercase tracking-wider mb-2.5">
              <Layers className="w-3.5 h-3.5 text-[#28766B]" />
              Daily Delivery Bills ({selectedMonth})
            </h3>

            {bills.length === 0 ? (
              <div className="p-4 text-center rounded-xl bg-[#F5F7F3] text-[#66746F] text-xs">
                No bills recorded for {companyName} in {selectedMonth}.
              </div>
            ) : (
              <div className="border border-[#E2E7E3] rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F5F7F3] border-b border-[#E2E7E3] text-[10px] font-bold text-[#66746F] uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Stock Particulars / Brand</th>
                      <th className="py-2.5 px-3 text-right">Bill Total</th>
                      <th className="py-2.5 px-3 text-right">Paid</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E7E3]">
                    {bills.map((bill) => {
                      const bal = parseFloat(bill.total_amount) - parseFloat(bill.paid_amount);
                      return (
                        <tr key={bill.id} className="hover:bg-[#F9FAF8] transition">
                          <td className="py-2.5 px-3 font-semibold text-[#202D2B] whitespace-nowrap">
                            {bill.bill_date ? new Date(bill.bill_date).toLocaleDateString('en-GB') : '-'}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-[#202D2B] block">
                              {bill.brand_details || 'General'}
                            </span>
                            <span className="text-[11px] text-[#66746F] line-clamp-1">
                              {bill.stock_notes || (bill.invoice_number ? `Inv: ${bill.invoice_number}` : '-')}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-[#202D2B]">
                            ₹{parseFloat(bill.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold text-emerald-700">
                            ₹{parseFloat(bill.paid_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                bill.payment_status === 'PAID'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : bill.payment_status === 'PARTIAL'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {bill.payment_status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <button
                              onClick={() => {
                                onEditPayment(bill);
                              }}
                              className="px-2.5 py-1 text-[11px] font-bold text-[#28766B] bg-[#EBF3F1] hover:bg-[#28766B] hover:text-white rounded-lg transition"
                            >
                              Edit Paid
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#E2E7E3] bg-[#F5F7F3] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#28766B] hover:bg-[#1E5C53] text-white rounded-xl font-bold transition text-xs"
          >
            Close Statement
          </button>
        </div>
      </div>
    </div>
  );
}
