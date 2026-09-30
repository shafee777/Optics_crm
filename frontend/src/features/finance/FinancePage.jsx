import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import api from '../../services/api.js';
import AddExpenseModal from './AddExpenseModal.jsx';
import { SkeletonTable } from '../../components/common/Skeleton.jsx';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Plus, 
  Receipt, 
  Calendar, 
  CreditCard,
  ChevronRight,
  ArrowLeft,
  Clock,
  User,
  ShoppingBag,
  CalendarDays,
  BarChart3,
  AlertCircle,
  RotateCcw
} from 'lucide-react';
import { Link } from 'react-router-dom';

const STATUS_COLORS = {
  PENDING: 'bg-amber-50 text-amber-800 border-amber-200',
  PROCESSING: 'bg-[#EBF3F1] text-[#28766B] border-[#28766B]/20',
  READY_FOR_PICKUP: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  DELIVERED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  CANCELLED: 'bg-[#F5F7F3] text-[#66746F] border-[#E2E7E3]',
};

export default function FinancePage() {
  const { isOwner } = useAuth();

  // Active Tab: 'day' | 'month' | 'year' | 'expenses'
  const [activeTab, setActiveTab] = useState(isOwner ? 'day' : 'expenses');

  // Selected date / month / year state
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());

  // Data states
  const [dailyData, setDailyData] = useState(null);
  const [monthlyData, setMonthlyData] = useState(null);
  const [yearlyData, setYearlyData] = useState(null);
  const [summary, setSummary] = useState({
    todaySales: 0,
    todayExpenses: 0,
    netCashFlow: 0,
    paymentSplit: { UPI: 0, CASH: 0, CARD: 0, OTHER: 0 },
  });
  const [expenses, setExpenses] = useState([]);

  // UI states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch Summary and Expenses
  const fetchExpensesAndSummary = useCallback(async () => {
    try {
      const expRes = await api.get('/expenses');
      setExpenses(expRes.data.data);

      if (isOwner) {
        const sumRes = await api.get('/expenses/summary');
        setSummary(sumRes.data.data);
      }
    } catch (err) {
      console.error('Error fetching expenses/summary:', err);
      setError(err.response?.data?.error?.message || 'Failed to load financial records');
    }
  }, [isOwner]);

  // Fetch Daily Sales Drill-down
  const fetchDailySales = useCallback(async (date) => {
    if (!isOwner) return;
    setLoading(true);
    try {
      const res = await api.get('/reports/sales', {
        params: { period: 'day', date },
      });
      setDailyData(res.data.data);
    } catch (err) {
      console.error('Error fetching daily sales:', err);
    } finally {
      setLoading(false);
    }
  }, [isOwner]);

  // Fetch Monthly Sales Drill-down
  const fetchMonthlySales = useCallback(async (monthStr) => {
    if (!isOwner) return;
    setLoading(true);
    try {
      const res = await api.get('/reports/sales', {
        params: { period: 'month', month: monthStr },
      });
      setMonthlyData(res.data.data);
    } catch (err) {
      console.error('Error fetching monthly sales:', err);
    } finally {
      setLoading(false);
    }
  }, [isOwner]);

  // Fetch Yearly Sales Drill-down
  const fetchYearlySales = useCallback(async (year) => {
    if (!isOwner) return;
    setLoading(true);
    try {
      const res = await api.get('/reports/sales', {
        params: { period: 'year', year },
      });
      setYearlyData(res.data.data);
    } catch (err) {
      console.error('Error fetching yearly sales:', err);
    } finally {
      setLoading(false);
    }
  }, [isOwner]);

  // Initial Load
  useEffect(() => {
    fetchExpensesAndSummary();
    if (isOwner) {
      fetchDailySales(selectedDate);
    } else {
      setLoading(false);
    }
  }, [fetchExpensesAndSummary, fetchDailySales, isOwner, selectedDate]);

  // Handle Tab Navigation & Drill Downs
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'day') {
      fetchDailySales(selectedDate);
    } else if (tab === 'month') {
      fetchMonthlySales(selectedMonth);
    } else if (tab === 'year') {
      fetchYearlySales(selectedYear);
    }
  };

  // Drill down from Year to Month
  const handleDrillIntoMonth = (monthNum) => {
    const formattedMonth = `${selectedYear}-${String(monthNum).padStart(2, '0')}`;
    setSelectedMonth(formattedMonth);
    setActiveTab('month');
    fetchMonthlySales(formattedMonth);
  };

  // Drill down from Month to Day
  const handleDrillIntoDay = (dateStr) => {
    setSelectedDate(dateStr);
    setActiveTab('day');
    fetchDailySales(dateStr);
  };

  // Calculate payment method split for the selected day's transactions
  const dayPaymentSplit = dailyData?.transactions?.reduce((acc, t) => {
    const m = t.paymentMethod || 'OTHER';
    acc[m] = (acc[m] || 0) + t.amount;
    return acc;
  }, { UPI: 0, CASH: 0, CARD: 0, OTHER: 0 }) || { UPI: 0, CASH: 0, CARD: 0, OTHER: 0 };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#202D2B]">
            {isOwner ? 'Finance & Revenue Analytics' : 'Store Expense Ledger'}
          </h1>
          <p className="text-sm text-[#66746F] mt-1">
            {isOwner 
              ? 'Multi-level financial drill-down (Year → Month → Daily Transactions) & operational outflows'
              : 'Record petty cash expenses, supplier lab bills, and store maintenance'}
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          Record Expense
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-rose-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => {
              setError('');
              fetchExpensesAndSummary();
              if (isOwner) fetchDailySales(selectedDate);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#28766B] hover:bg-[#1E5C53] text-white rounded-lg text-xs font-semibold self-start sm:self-auto shadow-xs transition"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      )}

      {/* Owner-Only Executive Overview Cards */}
      {isOwner && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Today's Sales */}
          <div className="bg-[#FEFEFC] p-5 rounded-2xl border border-[#E2E7E3] shadow-xs space-y-2">
            <div className="flex justify-between items-center text-[#66746F]">
              <span className="text-xs font-semibold uppercase tracking-wider">Today's Inflow</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-mono tabular-nums font-bold text-[#202D2B]">
              ₹{summary.todaySales.toLocaleString()}
            </div>
            <p className="text-[11px] text-[#66746F]">Total payments collected today</p>
          </div>

          {/* Today's Expenses */}
          <div className="bg-[#FEFEFC] p-5 rounded-2xl border border-[#E2E7E3] shadow-xs space-y-2">
            <div className="flex justify-between items-center text-[#66746F]">
              <span className="text-xs font-semibold uppercase tracking-wider">Today's Expenses</span>
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center border border-rose-100">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-mono tabular-nums font-bold text-[#202D2B]">
              ₹{summary.todayExpenses.toLocaleString()}
            </div>
            <p className="text-[11px] text-[#66746F]">Store operational expenses today</p>
          </div>

          {/* Net Cash Position */}
          <div className="bg-[#FEFEFC] p-5 rounded-2xl border border-[#E2E7E3] shadow-xs space-y-2">
            <div className="flex justify-between items-center text-[#66746F]">
              <span className="text-xs font-semibold uppercase tracking-wider">Net Cash Flow</span>
              <div className="w-8 h-8 rounded-lg bg-[#EBF3F1] text-[#28766B] flex items-center justify-center border border-[#28766B]/20">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div
              className={`text-2xl font-mono tabular-nums font-bold ${
                summary.netCashFlow >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              ₹{summary.netCashFlow.toLocaleString()}
            </div>
            <p className="text-[11px] text-[#66746F]">Inflow minus outflow today</p>
          </div>

          {/* Today's Payment Method Split */}
          <div className="bg-[#FEFEFC] p-5 rounded-2xl border border-[#E2E7E3] shadow-xs space-y-2">
            <div className="flex justify-between items-center text-[#66746F]">
              <span className="text-xs font-semibold uppercase tracking-wider">Today's Modes</span>
              <div className="w-8 h-8 rounded-lg bg-[#F5F7F3] text-[#202D2B] flex items-center justify-center border border-[#E2E7E3]">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xs font-mono tabular-nums space-y-1 pt-1">
              <div className="flex justify-between">
                <span className="text-[#66746F]">UPI:</span>
                <span className="font-bold text-[#202D2B]">₹{summary.paymentSplit?.UPI?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#66746F]">Cash:</span>
                <span className="font-bold text-[#202D2B]">₹{summary.paymentSplit?.CASH?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#66746F]">Card:</span>
                <span className="font-bold text-[#202D2B]">₹{summary.paymentSplit?.CARD?.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs (Owner sees 3 drill-down levels + expenses; Staff sees only Expense Ledger) */}
      <div className="border-b border-[#E2E7E3]">
        <nav className="flex space-x-2">
          {isOwner && (
            <>
              <button
                onClick={() => handleTabChange('day')}
                className={`pb-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition ${
                  activeTab === 'day'
                    ? 'border-[#28766B] text-[#28766B]'
                    : 'border-transparent text-[#66746F] hover:text-[#202D2B]'
                }`}
              >
                <Clock className="w-4 h-4" />
                Daily Transactions
              </button>

              <button
                onClick={() => handleTabChange('month')}
                className={`pb-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition ${
                  activeTab === 'month'
                    ? 'border-[#28766B] text-[#28766B]'
                    : 'border-transparent text-[#66746F] hover:text-[#202D2B]'
                }`}
              >
                <CalendarDays className="w-4 h-4" />
                Monthly Breakdown
              </button>

              <button
                onClick={() => handleTabChange('year')}
                className={`pb-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition ${
                  activeTab === 'year'
                    ? 'border-[#28766B] text-[#28766B]'
                    : 'border-transparent text-[#66746F] hover:text-[#202D2B]'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                Yearly Breakdown
              </button>
            </>
          )}

          <button
            onClick={() => setActiveTab('expenses')}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'expenses'
                ? 'border-[#28766B] text-[#28766B]'
                : 'border-transparent text-[#66746F] hover:text-[#202D2B]'
            }`}
          >
            <Receipt className="w-4 h-4" />
            Store Expenses Ledger
          </button>
        </nav>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. DAILY TRANSACTIONS VIEW (OWNER ONLY) */}
      {/* ------------------------------------------------------------- */}
      {isOwner && activeTab === 'day' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Filter / Date Selector Bar */}
          <div className="bg-[#FEFEFC] p-4 rounded-2xl border border-[#E2E7E3] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-[#202D2B] uppercase tracking-wider">
                Select Date:
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  fetchDailySales(e.target.value);
                }}
                className="px-3 py-1.5 rounded-xl border border-[#E2E7E3] text-xs font-medium bg-[#FEFEFC] text-[#202D2B] focus:border-[#28766B] focus:ring-1 focus:ring-[#28766B] focus:outline-none"
              />
              {selectedDate !== todayStr && (
                <button
                  onClick={() => {
                    setSelectedDate(todayStr);
                    fetchDailySales(todayStr);
                  }}
                  className="text-xs text-[#28766B] hover:underline font-semibold"
                >
                  Reset to Today
                </button>
              )}
            </div>

            {/* Quick stats for this selected date */}
            <div className="flex items-center gap-4 text-xs font-mono tabular-nums">
              <div>
                <span className="text-[#66746F]">Total Collected: </span>
                <span className="font-bold text-emerald-700 text-sm">
                  ₹{dailyData?.totalSales?.toLocaleString() || 0}
                </span>
              </div>
              <div className="h-4 w-px bg-[#E2E7E3]" />
              <div>
                <span className="text-[#66746F]">Payments: </span>
                <span className="font-bold text-[#202D2B]">
                  {dailyData?.transactionCount || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Daily Split Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#FEFEFC] p-3.5 rounded-xl border border-[#E2E7E3]">
              <div className="text-[11px] font-semibold text-[#66746F] uppercase">UPI / Online</div>
              <div className="text-base font-mono tabular-nums font-bold text-[#202D2B]">
                ₹{dayPaymentSplit.UPI.toLocaleString()}
              </div>
            </div>
            <div className="bg-[#FEFEFC] p-3.5 rounded-xl border border-[#E2E7E3]">
              <div className="text-[11px] font-semibold text-[#66746F] uppercase">Cash Collected</div>
              <div className="text-base font-mono tabular-nums font-bold text-[#202D2B]">
                ₹{dayPaymentSplit.CASH.toLocaleString()}
              </div>
            </div>
            <div className="bg-[#FEFEFC] p-3.5 rounded-xl border border-[#E2E7E3]">
              <div className="text-[11px] font-semibold text-[#66746F] uppercase">Card Swipe</div>
              <div className="text-base font-mono tabular-nums font-bold text-[#202D2B]">
                ₹{dayPaymentSplit.CARD.toLocaleString()}
              </div>
            </div>
            <div className="bg-[#FEFEFC] p-3.5 rounded-xl border border-[#E2E7E3]">
              <div className="text-[11px] font-semibold text-[#66746F] uppercase">Other / Transfer</div>
              <div className="text-base font-mono tabular-nums font-bold text-[#202D2B]">
                ₹{dayPaymentSplit.OTHER.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Detailed Transaction Breakdown Table */}
          <div className="bg-[#FEFEFC] rounded-2xl border border-[#E2E7E3] shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E2E7E3] flex justify-between items-center bg-[#F5F7F3]">
              <h2 className="font-bold text-[#202D2B] text-sm flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#28766B]" />
                Individual Sales Breakdown for {new Date(selectedDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
              </h2>
              <span className="text-xs text-[#66746F] font-medium font-mono tabular-nums">
                {dailyData?.transactions?.length || 0} payment entries
              </span>
            </div>

            {loading ? (
              <SkeletonTable rows={5} cols={5} />
            ) : !dailyData?.transactions || dailyData.transactions.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <p className="text-[#202D2B] font-semibold text-sm">No payment transactions found for this date</p>
                <p className="text-xs text-[#66746F]">
                  When advance or delivery balance payments are received, each transaction will show here with customer, order number, and status.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F5F7F3] border-b border-[#E2E7E3] text-[#66746F] font-semibold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-6 py-3.5">Customer</th>
                      <th className="px-6 py-3.5">Order #</th>
                      <th className="px-6 py-3.5">Current Order Status</th>
                      <th className="px-6 py-3.5">Order Total & Balance Due</th>
                      <th className="px-6 py-3.5">Payment Method & Time</th>
                      <th className="px-6 py-3.5 text-right">Inflow Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E7E3]">
                    {dailyData.transactions.map((tx) => (
                      <tr key={tx.paymentId} className="hover:bg-[#F5F7F3]/60 transition">
                        {/* Customer */}
                        <td className="px-6 py-4">
                          <Link 
                            to={`/customers/${tx.customerId}`}
                            className="font-semibold text-[#202D2B] hover:text-[#28766B] flex items-center gap-1.5"
                          >
                            <User className="w-3.5 h-3.5 text-[#66746F]" />
                            {tx.customerName}
                          </Link>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-[11px] text-[#28766B] font-semibold bg-[#EBF3F1] px-1.5 py-0.5 rounded border border-[#28766B]/20">
                              {tx.customerCode || 'CUST'}
                            </span>
                            <span className="text-xs text-[#66746F] font-mono tabular-nums">{tx.customerPhone}</span>
                          </div>
                        </td>

                        {/* Order Number */}
                        <td className="px-6 py-4">
                          <Link 
                            to={`/orders/${tx.orderNumber}`}
                            className="inline-flex items-center gap-1 font-mono font-bold text-xs text-[#28766B] hover:underline bg-[#F5F7F3] px-2 py-1 rounded-lg border border-[#E2E7E3]"
                          >
                            <ShoppingBag className="w-3 h-3 text-[#66746F]" />
                            {tx.orderNumber}
                          </Link>
                        </td>

                        {/* Current Status */}
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full border ${
                              STATUS_COLORS[tx.orderStatus] || 'bg-[#F5F7F3] text-[#202D2B]'
                            }`}
                          >
                            {tx.orderStatus}
                          </span>
                        </td>

                        {/* Order Total & Balance */}
                        <td className="px-6 py-4 font-mono text-xs tabular-nums">
                          <div className="text-[#202D2B]">
                            Total: <span className="font-bold">₹{tx.orderTotal.toLocaleString()}</span>
                          </div>
                          <div className="mt-0.5">
                            {tx.balanceDue > 0 ? (
                              <span className="text-amber-800 font-bold">
                                Due: ₹{tx.balanceDue.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-emerald-700 font-semibold">Fully Paid ✓</span>
                            )}
                          </div>
                        </td>

                        {/* Payment Method & Time */}
                        <td className="px-6 py-4 text-xs">
                          <div className="font-semibold text-[#202D2B] flex items-center gap-1.5">
                            <span className="px-2 py-0.5 bg-[#F5F7F3] border border-[#E2E7E3] rounded text-[#202D2B] font-mono text-[11px]">
                              {tx.paymentMethod}
                            </span>
                            {tx.reference && (
                              <span className="text-[#66746F] font-mono">Ref: {tx.reference}</span>
                            )}
                          </div>
                          <div className="text-[#66746F] text-[11px] mt-0.5 font-mono tabular-nums flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(tx.paidAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>

                        {/* Inflow Amount */}
                        <td className="px-6 py-4 text-right">
                          <span className="font-mono font-bold text-sm text-emerald-700 tabular-nums">
                            +₹{tx.amount.toLocaleString()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. MONTHLY BREAKDOWN VIEW (DATE-WISE DRILL-DOWN) (OWNER ONLY) */}
      {/* ------------------------------------------------------------- */}
      {isOwner && activeTab === 'month' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Month Selector */}
          <div className="bg-[#FEFEFC] p-4 rounded-2xl border border-[#E2E7E3] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-[#202D2B] uppercase tracking-wider">
                Select Month:
              </label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  fetchMonthlySales(e.target.value);
                }}
                className="px-3 py-1.5 rounded-xl border border-[#E2E7E3] text-xs font-medium bg-[#FEFEFC] text-[#202D2B] focus:border-[#28766B] focus:ring-1 focus:ring-[#28766B] focus:outline-none"
              />
              <button
                onClick={() => handleTabChange('year')}
                className="inline-flex items-center gap-1 text-xs text-[#28766B] hover:underline font-semibold ml-2"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Yearly Overview
              </button>
            </div>

            {/* Monthly Summary */}
            <div className="flex items-center gap-4 text-xs font-mono tabular-nums">
              <div>
                <span className="text-[#66746F]">Total Month Sales: </span>
                <span className="font-bold text-emerald-700 text-sm">
                  ₹{monthlyData?.totalSales?.toLocaleString() || 0}
                </span>
              </div>
              <div className="h-4 w-px bg-[#E2E7E3]" />
              <div>
                <span className="text-[#66746F]">Total Payments: </span>
                <span className="font-bold text-[#202D2B]">
                  {monthlyData?.totalTransactions || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Day-by-Day Grid */}
          <div className="bg-[#FEFEFC] rounded-2xl border border-[#E2E7E3] shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E2E7E3] flex justify-between items-center bg-[#F5F7F3]">
              <h2 className="font-bold text-[#202D2B] text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#28766B]" />
                Daily Sales for {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>
              <span className="text-xs text-[#66746F]">
                Click any day to drill into its detailed customer payment records
              </span>
            </div>

            {loading ? (
              <SkeletonTable rows={7} cols={5} />
            ) : !monthlyData?.days || monthlyData.days.length === 0 ? (
              <div className="p-12 text-center text-[#66746F] text-xs">No days found for this month</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F5F7F3] border-b border-[#E2E7E3] text-[#66746F] font-semibold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-6 py-3.5">Date</th>
                      <th className="px-6 py-3.5">Day</th>
                      <th className="px-6 py-3.5 text-center">Transactions</th>
                      <th className="px-6 py-3.5 text-right">Daily Inflow</th>
                      <th className="px-6 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E7E3]">
                    {monthlyData.days.map((day) => {
                      const hasSales = day.totalSales > 0;
                      return (
                        <tr
                          key={day.date}
                          onClick={() => handleDrillIntoDay(day.date)}
                          className={`cursor-pointer transition ${
                            hasSales ? 'bg-emerald-50/20 hover:bg-emerald-50/40' : 'hover:bg-[#F5F7F3]/60'
                          }`}
                        >
                          <td className="px-6 py-4 font-mono font-semibold text-[#202D2B] tabular-nums">
                            {day.date}
                          </td>
                          <td className="px-6 py-4 text-xs font-semibold text-[#66746F]">
                            {day.dayName}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {day.paymentCount > 0 ? (
                              <span className="px-2 py-0.5 bg-[#EBF3F1] text-[#28766B] font-mono font-semibold text-xs rounded-full border border-[#28766B]/20 tabular-nums">
                                {day.paymentCount} orders
                              </span>
                            ) : (
                              <span className="text-[#66746F]/50 text-xs">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right font-mono tabular-nums font-bold">
                            {hasSales ? (
                              <span className="text-emerald-700">₹{day.totalSales.toLocaleString()}</span>
                            ) : (
                              <span className="text-[#66746F]/50 font-normal">₹0</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#28766B] hover:text-[#1E5C53]">
                              View Day Breakdown <ChevronRight className="w-3.5 h-3.5" />
                            </span>
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
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. YEARLY BREAKDOWN VIEW (MONTH-WISE DRILL-DOWN) (OWNER ONLY) */}
      {/* ------------------------------------------------------------- */}
      {isOwner && activeTab === 'year' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Year Selector */}
          <div className="bg-[#FEFEFC] p-4 rounded-2xl border border-[#E2E7E3] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-[#202D2B] uppercase tracking-wider">
                Select Year:
              </label>
              <select
                value={selectedYear}
                onChange={(e) => {
                  const y = parseInt(e.target.value, 10);
                  setSelectedYear(y);
                  fetchYearlySales(y);
                }}
                className="px-3 py-1.5 rounded-xl border border-[#E2E7E3] text-xs font-semibold bg-[#FEFEFC] text-[#202D2B] focus:border-[#28766B] focus:ring-1 focus:ring-[#28766B] focus:outline-none"
              >
                {[2024, 2025, 2026, 2027, 2028].map((y) => (
                  <option key={y} value={y}>
                    Year {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Yearly Summary */}
            <div className="flex items-center gap-4 text-xs font-mono tabular-nums">
              <div>
                <span className="text-[#66746F]">Total Annual Sales: </span>
                <span className="font-bold text-emerald-700 text-sm">
                  ₹{yearlyData?.totalSales?.toLocaleString() || 0}
                </span>
              </div>
              <div className="h-4 w-px bg-[#E2E7E3]" />
              <div>
                <span className="text-[#66746F]">Total Payments: </span>
                <span className="font-bold text-[#202D2B]">
                  {yearlyData?.totalTransactions || 0}
                </span>
              </div>
            </div>
          </div>

          {/* 12 Months Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {yearlyData?.months?.map((m) => {
              const hasSales = m.totalSales > 0;
              return (
                <div
                  key={m.monthStart}
                  onClick={() => handleDrillIntoMonth(m.monthNum)}
                  className={`p-5 rounded-2xl border transition cursor-pointer hover:shadow-sm ${
                    hasSales 
                      ? 'bg-[#FEFEFC] border-emerald-300 hover:border-emerald-500' 
                      : 'bg-[#FEFEFC] border-[#E2E7E3] hover:border-[#28766B]'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[11px] font-bold text-[#66746F] uppercase tracking-wider">
                        Month #{m.monthNum}
                      </span>
                      <h3 className="text-base font-bold text-[#202D2B] mt-0.5">{m.monthName} {selectedYear}</h3>
                    </div>
                    <div className="w-7 h-7 rounded-lg bg-[#EBF3F1] text-[#28766B] flex items-center justify-center">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#E2E7E3] flex justify-between items-baseline">
                    <div className="text-xs text-[#66746F]">
                      {m.paymentCount} payments
                    </div>
                    <div className="font-mono font-bold text-base tabular-nums">
                      {hasSales ? (
                        <span className="text-emerald-700">₹{m.totalSales.toLocaleString()}</span>
                      ) : (
                        <span className="text-[#66746F]/50 font-normal">₹0</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. EXPENSE HISTORY LEDGER (VISIBLE TO OWNER AND STAFF) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'expenses' && (
        <div className="bg-[#FEFEFC] rounded-2xl border border-[#E2E7E3] shadow-xs overflow-hidden animate-in fade-in duration-200">
          <div className="px-6 py-4 border-b border-[#E2E7E3] flex justify-between items-center bg-[#F5F7F3]">
            <div>
              <h2 className="font-bold text-[#202D2B] text-sm flex items-center gap-2">
                <Receipt className="w-4 h-4 text-rose-700" />
                Store Expense Outflows ({expenses.length})
              </h2>
              <p className="text-xs text-[#66746F] mt-0.5">
                All authorized staff and owners can log daily expenses here
              </p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="text-xs font-semibold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl border border-rose-200 transition"
            >
              + Record Expense
            </button>
          </div>

          {expenses.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <p className="text-[#202D2B] font-medium text-sm">No expense records found</p>
              <p className="text-xs text-[#66746F]">Click "+ Record Expense" to record lab bills, rent, or maintenance.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F5F7F3] border-b border-[#E2E7E3] text-[#66746F] font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-6 py-3.5">Category</th>
                    <th className="px-6 py-3.5">Note / Description</th>
                    <th className="px-6 py-3.5">Payment Method</th>
                    <th className="px-6 py-3.5">Date</th>
                    <th className="px-6 py-3.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E7E3]">
                  {expenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-[#F5F7F3]/60 transition">
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 bg-rose-50 text-rose-700 font-semibold rounded-lg text-xs border border-rose-100">
                          {exp.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[#202D2B]">
                        {exp.note || <span className="text-[#66746F] italic">No notes</span>}
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-[#66746F]">
                        {exp.payment_method}
                      </td>
                      <td className="px-6 py-4 text-xs text-[#66746F] font-mono tabular-nums">
                        {new Date(exp.incurred_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-rose-700 tabular-nums">
                        -₹{exp.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add Expense Modal */}
      <AddExpenseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onExpenseAdded={() => {
          fetchExpensesAndSummary();
          if (isOwner) fetchDailySales(selectedDate);
        }}
      />
    </div>
  );
}
