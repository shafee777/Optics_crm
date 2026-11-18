import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Search,
  Plus,
  Building2,
  Tag,
  IndianRupee,
  Edit,
  Trash2,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Filter,
} from 'lucide-react';
import api from '../../services/api.js';
import AddDailyStockExpenseModal from './AddDailyStockExpenseModal.jsx';
import QuickEditPaymentModal from './QuickEditPaymentModal.jsx';
import CompanyDrilldownModal from './CompanyDrilldownModal.jsx';
import { SkeletonTable, SkeletonStatGrid } from '../../components/common/Skeleton.jsx';

export default function DailyStockExpensesTab() {
  const [category, setCategory] = useState('LENS'); // 'LENS' | 'FRAME'
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('ALL');
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState('');

  // Data states
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState({
    totalPurchased: 0,
    totalPaid: 0,
    balanceOwed: 0,
    totalRecords: 0,
  });
  const [companySummaries, setCompanySummaries] = useState([]);
  const [existingCompanies, setExistingCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [paymentModalEntry, setPaymentModalEntry] = useState(null);
  const [drilldownCompany, setDrilldownCompany] = useState(null);

  // 1. Fetch Expenses & Summary
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (category) params.append('category', category);
      if (selectedMonth) params.append('month', selectedMonth);
      if (paymentStatus && paymentStatus !== 'ALL') params.append('paymentStatus', paymentStatus);
      if (selectedCompanyFilter) params.append('companyName', selectedCompanyFilter);
      if (searchTerm) params.append('search', searchTerm);

      const [listRes, sumRes, compRes] = await Promise.all([
        api.get(`/daily-stock-expenses?${params.toString()}`),
        api.get(`/daily-stock-expenses/company-summary?category=${category}&month=${selectedMonth}`),
        api.get(`/daily-stock-expenses/companies?category=${category}`),
      ]);

      setExpenses(listRes.data.data || []);
      setSummary(
        listRes.data.summary || {
          totalPurchased: 0,
          totalPaid: 0,
          balanceOwed: 0,
          totalRecords: 0,
        }
      );
      setCompanySummaries(sumRes.data.data?.companies || []);
      setExistingCompanies(compRes.data.data || []);
    } catch (err) {
      console.error('Failed to fetch daily stock expenses', err);
      setFeedback({ type: 'error', message: 'Failed to load stock expenses' });
    } finally {
      setLoading(false);
    }
  }, [category, selectedMonth, paymentStatus, selectedCompanyFilter, searchTerm]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id, companyName) => {
    if (!window.confirm(`Are you sure you want to delete this bill entry for ${companyName}?`)) return;
    try {
      await api.delete(`/daily-stock-expenses/${id}`);
      setFeedback({ type: 'success', message: 'Bill removed successfully' });
      setTimeout(() => setFeedback(null), 3000);
      fetchData();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.error?.message || 'Failed to delete entry',
      });
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const showToast = (message, type = 'success') => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3500);
    fetchData();
  };

  return (
    <div className="space-y-5">
      {/* Toast Feedback */}
      {feedback && (
        <div
          role="status"
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between border transition ${
            feedback.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-[#EBF3F1] text-[#28766B] border-[#28766B]/30'
          }`}
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs opacity-70 hover:opacity-100 font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Controls: Category Tabs & Action Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#FEFEFC] p-4 rounded-2xl border border-[#E2E7E3] shadow-sm">
        {/* Category Switcher: Lens vs Frames */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setCategory('LENS');
              setSelectedCompanyFilter('');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
              category === 'LENS'
                ? 'bg-[#28766B] text-white shadow-sm'
                : 'bg-[#F5F7F3] text-[#66746F] hover:bg-[#E2E7E3]'
            }`}
          >
            👓 Lens Section
          </button>
          <button
            onClick={() => {
              setCategory('FRAME');
              setSelectedCompanyFilter('');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
              category === 'FRAME'
                ? 'bg-[#28766B] text-white shadow-sm'
                : 'bg-[#F5F7F3] text-[#66746F] hover:bg-[#E2E7E3]'
            }`}
          >
            🕶️ Frames Section
          </button>
        </div>

        {/* Month Selector & Add Bill Button */}
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 bg-[#F5F7F3] px-3 py-2 rounded-xl border border-[#E2E7E3]">
            <Calendar className="w-4 h-4 text-[#66746F]" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-xs font-bold text-[#202D2B] bg-transparent focus:outline-none"
            />
          </div>

          <button
            onClick={() => {
              setEditingEntry(null);
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[#28766B] hover:bg-[#1E5C53] text-white rounded-xl text-xs font-bold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Record {category === 'LENS' ? 'Lens' : 'Frame'} Bill
          </button>
        </div>
      </div>

      {/* KPI Cards (Month-End Overview) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Purchased */}
        <div className="bg-[#FEFEFC] p-4 rounded-2xl border border-[#E2E7E3] shadow-sm">
          <span className="text-[10px] font-bold text-[#66746F] uppercase tracking-wider">
            Total {category === 'LENS' ? 'Lens' : 'Frame'} Purchases ({selectedMonth})
          </span>
          <p className="text-xl font-black text-[#202D2B] mt-1.5">
            ₹{summary.totalPurchased.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-[#66746F] mt-1 block">
            {summary.totalRecords} bills received
          </span>
        </div>

        {/* Total Paid */}
        <div className="bg-[#FEFEFC] p-4 rounded-2xl border border-[#E2E7E3] shadow-sm">
          <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
            Total Paid to Vendors
          </span>
          <p className="text-xl font-black text-emerald-700 mt-1.5">
            ₹{summary.totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-emerald-700 font-semibold mt-1 block">
            Settled this month
          </span>
        </div>

        {/* Balance We Owe */}
        <div className="bg-[#FEFEFC] p-4 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-sm">
          <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
            Balance We Owe to Companies
          </span>
          <p className="text-xl font-black text-amber-800 mt-1.5">
            ₹{summary.balanceOwed.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-amber-700 font-semibold mt-1 block">
            Pending month-end clearance
          </span>
        </div>

        {/* Active Companies */}
        <div className="bg-[#FEFEFC] p-4 rounded-2xl border border-[#E2E7E3] shadow-sm">
          <span className="text-[10px] font-bold text-[#66746F] uppercase tracking-wider">
            Active Companies
          </span>
          <p className="text-xl font-black text-[#28766B] mt-1.5">
            {companySummaries.length}
          </p>
          <span className="text-[11px] text-[#66746F] mt-1 block">
            Click any company below for details
          </span>
        </div>
      </div>

      {/* Company Summary Cards / Quick Filter Bar */}
      {companySummaries.length > 0 && (
        <div className="bg-[#FEFEFC] p-4 rounded-2xl border border-[#E2E7E3] shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#202D2B] uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#28766B]" />
              Companies this Month (Click for Brand Breakdown & Statement)
            </span>
            {selectedCompanyFilter && (
              <button
                onClick={() => setSelectedCompanyFilter('')}
                className="text-[11px] font-bold text-[#28766B] hover:underline"
              >
                Clear Company Filter (Show All)
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {companySummaries.map((comp) => {
              const isSelected = selectedCompanyFilter.toLowerCase() === comp.companyName.toLowerCase();
              return (
                <div
                  key={comp.companyName}
                  className={`flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-xl border transition cursor-pointer text-xs ${
                    isSelected
                      ? 'bg-[#28766B] text-white border-[#28766B]'
                      : 'bg-[#F5F7F3] text-[#202D2B] border-[#E2E7E3] hover:border-[#28766B]'
                  }`}
                  onClick={() => {
                    setDrilldownCompany(comp.companyName);
                  }}
                  title="Click to view brand-wise details and monthly statement"
                >
                  <span className="font-bold">{comp.companyName}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : comp.balanceOwed > 0
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {comp.balanceOwed > 0
                      ? `Owe ₹${comp.balanceOwed.toLocaleString('en-IN')}`
                      : 'Cleared'}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter Bar: Search & Status */}
      <div className="bg-[#FEFEFC] p-4 rounded-2xl border border-[#E2E7E3] shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#66746F]" />
          <input
            type="text"
            placeholder="Search company, brand, stock note, invoice..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#F5F7F3] border border-[#E2E7E3] rounded-xl text-xs text-[#202D2B] placeholder:text-[#9AA8A3] focus:ring-2 focus:ring-[#28766B]/30 focus:border-[#28766B] focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value)}
            className="px-3 py-2 bg-[#F5F7F3] border border-[#E2E7E3] rounded-xl text-xs font-semibold text-[#202D2B] focus:outline-none"
          >
            <option value="ALL">All Payment Statuses</option>
            <option value="UNPAID">Unpaid Only</option>
            <option value="PARTIAL">Partially Paid</option>
            <option value="PAID">Fully Paid</option>
          </select>
        </div>
      </div>

      {/* Daily Bills Table */}
      <div className="bg-[#FEFEFC] rounded-2xl border border-[#E2E7E3] shadow-sm overflow-hidden">
        {loading ? (
          <SkeletonTable rows={5} cols={7} />
        ) : expenses.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <Building2 className="w-10 h-10 mx-auto text-[#9AA8A3]" />
            <h3 className="text-sm font-bold text-[#202D2B]">No stock bills found</h3>
            <p className="text-xs text-[#66746F] max-w-sm mx-auto">
              No {category === 'LENS' ? 'lens' : 'frame'} bills recorded for {selectedMonth}. Click "Record{' '}
              {category === 'LENS' ? 'Lens' : 'Frame'} Bill" above to enter daily deliveries.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F5F7F3] border-b border-[#E2E7E3] text-[10px] font-bold text-[#66746F] uppercase">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Company Name</th>
                  <th className="py-3 px-4">Brand / Particulars</th>
                  <th className="py-3 px-4">Stock Inward Details</th>
                  <th className="py-3 px-4 text-right">Bill Total (₹)</th>
                  <th className="py-3 px-4 text-right">Paid (₹)</th>
                  <th className="py-3 px-4 text-right">Due Balance</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E7E3]">
                {expenses.map((item) => {
                  const bal = parseFloat(item.total_amount) - parseFloat(item.paid_amount);
                  return (
                    <tr key={item.id} className="hover:bg-[#F9FAF8] transition group">
                      {/* Date */}
                      <td className="py-3 px-4 font-semibold text-[#202D2B] whitespace-nowrap">
                        {item.bill_date ? new Date(item.bill_date).toLocaleDateString('en-GB') : '-'}
                      </td>

                      {/* Company Name */}
                      <td className="py-3 px-4">
                        <button
                          onClick={() => setDrilldownCompany(item.company_name)}
                          className="font-bold text-[#28766B] hover:underline flex items-center gap-1 text-left"
                        >
                          <Building2 className="w-3.5 h-3.5 text-[#28766B]/60" />
                          {item.company_name}
                        </button>
                        {item.invoice_number && (
                          <span className="text-[10px] text-[#66746F] block mt-0.5">
                            Inv: {item.invoice_number}
                          </span>
                        )}
                      </td>

                      {/* Brand Details */}
                      <td className="py-3 px-4 font-semibold text-[#202D2B]">
                        {item.brand_details ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#EBF3F1] text-[#28766B] font-bold text-[11px]">
                            <Tag className="w-3 h-3" />
                            {item.brand_details}
                          </span>
                        ) : (
                          <span className="text-[#9AA8A3] italic">General</span>
                        )}
                      </td>

                      {/* Stock Notes */}
                      <td className="py-3 px-4 text-[#66746F] max-w-xs truncate" title={item.stock_notes}>
                        {item.stock_notes || '-'}
                      </td>

                      {/* Bill Total */}
                      <td className="py-3 px-4 text-right font-black text-[#202D2B] whitespace-nowrap">
                        ₹{parseFloat(item.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Paid Amount */}
                      <td className="py-3 px-4 text-right font-bold text-emerald-700 whitespace-nowrap">
                        ₹{parseFloat(item.paid_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        <span className="text-[10px] text-[#66746F] block font-normal">
                          {item.payment_method}
                        </span>
                      </td>

                      {/* Due Balance */}
                      <td className="py-3 px-4 text-right font-black whitespace-nowrap">
                        <span className={bal > 0 ? 'text-amber-700' : 'text-emerald-700'}>
                          ₹{bal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.payment_status === 'PAID'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.payment_status === 'PARTIAL'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {item.payment_status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap space-x-1.5">
                        {/* Quick Edit Paid Amount Button */}
                        <button
                          onClick={() => setPaymentModalEntry(item)}
                          className="px-2.5 py-1 text-[11px] font-bold text-[#28766B] bg-[#EBF3F1] hover:bg-[#28766B] hover:text-white rounded-lg transition"
                          title="Update how much was paid"
                        >
                          Edit Paid
                        </button>

                        {/* Full Edit */}
                        <button
                          onClick={() => {
                            setEditingEntry(item);
                            setIsAddModalOpen(true);
                          }}
                          className="p-1 text-[#66746F] hover:text-[#28766B] hover:bg-[#E2E7E3] rounded-lg transition"
                          title="Edit Bill"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(item.id, item.company_name)}
                          className="p-1 text-[#66746F] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Delete Bill"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* Add / Edit Bill Modal */}
      <AddDailyStockExpenseModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingEntry(null);
        }}
        onSuccess={showToast}
        defaultCategory={category}
        existingCompanies={existingCompanies}
        editingEntry={editingEntry}
      />

      {/* Quick Edit Paid Amount Modal */}
      <QuickEditPaymentModal
        isOpen={!!paymentModalEntry}
        onClose={() => setPaymentModalEntry(null)}
        onSuccess={showToast}
        entry={paymentModalEntry}
      />

      {/* Company Monthly Statement & Brand Breakdown Modal */}
      <CompanyDrilldownModal
        isOpen={!!drilldownCompany}
        onClose={() => setDrilldownCompany(null)}
        companyName={drilldownCompany}
        category={category}
        initialMonth={selectedMonth}
        onEditPayment={(bill) => {
          setDrilldownCompany(null);
          setPaymentModalEntry(bill);
        }}
      />
    </div>
  );
}
