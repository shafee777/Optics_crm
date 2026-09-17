import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import api from '../../services/api.js';
import AddExpenseModal from './AddExpenseModal.jsx';
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
  Filter,
  Eye,
  Clock,
  User,
  ShoppingBag,
  IndianRupee,
  CalendarDays,
  BarChart3
} from 'lucide-react';
import { Link } from 'react-router-dom';

const STATUS_COLORS = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  PROCESSING: 'bg-blue-50 text-blue-700 border-blue-200',
  READY_FOR_PICKUP: 'bg-purple-50 text-purple-700 border-purple-200',
  DELIVERED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CANCELLED: 'bg-slate-100 text-slate-500 border-slate-200',
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
          <h1 className="text-2xl font-bold text-slate-900">
            {isOwner ? 'Finance & Revenue Analytics' : 'Store Expense Ledger'}
          </h1>
          <p className="text-sm text-slate-500">
            {isOwner 
              ? 'Multi-level financial drill-down (Year → Month → Daily Transactions) & operational outflows'
              : 'Record petty cash expenses, supplier lab bills, and store maintenance'}
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-red-600/20 transition"
        >
          <Plus className="w-4 h-4" />
          Record Expense
        </button>
      </div>

      {/* Owner-Only Executive Overview Cards */}
      {isOwner && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Today's Sales */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <div className="flex justify-between items-center text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Today's Inflow</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-mono font-bold text-slate-900">
              ₹{summary.todaySales.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-400">Total payments collected today</p>
          </div>

          {/* Today's Expenses */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <div className="flex justify-between items-center text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Today's Expenses</span>
              <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-mono font-bold text-slate-900">
              ₹{summary.todayExpenses.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-400">Store operational expenses today</p>
          </div>

          {/* Net Cash Position */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <div className="flex justify-between items-center text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Net Cash Flow</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div
              className={`text-2xl font-mono font-bold ${
                summary.netCashFlow >= 0 ? 'text-emerald-600' : 'text-red-600'
              }`}
            >
              ₹{summary.netCashFlow.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-400">Inflow minus outflow today</p>
          </div>

          {/* Today's Payment Method Split */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <div className="flex justify-between items-center text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Today's Modes</span>
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xs font-mono space-y-1 pt-1">
              <div className="flex justify-between">
                <span className="text-slate-500">UPI:</span>
                <span className="font-bold text-slate-800">₹{summary.paymentSplit?.UPI?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cash:</span>
                <span className="font-bold text-slate-800">₹{summary.paymentSplit?.CASH?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Card:</span>
                <span className="font-bold text-slate-800">₹{summary.paymentSplit?.CARD?.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs (Owner sees 3 drill-down levels + expenses; Staff sees only Expense Ledger) */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-4">
          {isOwner && (
            <>
              <button
                onClick={() => handleTabChange('day')}
                className={`pb-3 px-1 text-sm font-semibold border-b-2 flex items-center gap-2 transition ${
                  activeTab === 'day'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Clock className="w-4 h-4" />
                Daily Transactions
              </button>

              <button
                onClick={() => handleTabChange('month')}
                className={`pb-3 px-1 text-sm font-semibold border-b-2 flex items-center gap-2 transition ${
                  activeTab === 'month'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <CalendarDays className="w-4 h-4" />
                Monthly Breakdown (Date-wise)
              </button>

              <button
                onClick={() => handleTabChange('year')}
                className={`pb-3 px-1 text-sm font-semibold border-b-2 flex items-center gap-2 transition ${
                  activeTab === 'year'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                Yearly Breakdown (Month-wise)
              </button>
            </>
          )}

          <button
            onClick={() => setActiveTab('expenses')}
            className={`pb-3 px-1 text-sm font-semibold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'expenses'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
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
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Select Date:
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  fetchDailySales(e.target.value);
                }}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              {selectedDate !== todayStr && (
                <button
                  onClick={() => {
                    setSelectedDate(todayStr);
                    fetchDailySales(todayStr);
                  }}
                  className="text-xs text-indigo-600 hover:underline font-semibold"
                >
                  Reset to Today
                </button>
              )}
            </div>

            {/* Quick stats for this selected date */}
            <div className="flex items-center gap-4 text-xs font-mono">
              <div>
                <span className="text-slate-400">Total Collected: </span>
                <span className="font-bold text-emerald-600 text-sm">
                  ₹{dailyData?.totalSales?.toLocaleString() || 0}
                </span>
              </div>
              <div className="h-4 w-px bg-slate-200" />
              <div>
                <span className="text-slate-400">Payments: </span>
                <span className="font-bold text-slate-800">
                  {dailyData?.transactionCount || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Daily Split Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200">
              <div className="text-[11px] font-semibold text-slate-400 uppercase">UPI / Online</div>
              <div className="text-base font-mono font-bold text-slate-900">
                ₹{dayPaymentSplit.UPI.toLocaleString()}
              </div>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200">
              <div className="text-[11px] font-semibold text-slate-400 uppercase">Cash Collected</div>
              <div className="text-base font-mono font-bold text-slate-900">
                ₹{dayPaymentSplit.CASH.toLocaleString()}
              </div>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200">
              <div className="text-[11px] font-semibold text-slate-400 uppercase">Card Swipe</div>
              <div className="text-base font-mono font-bold text-slate-900">
                ₹{dayPaymentSplit.CARD.toLocaleString()}
              </div>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200">
              <div className="text-[11px] font-semibold text-slate-400 uppercase">Other / Transfer</div>
              <div className="text-base font-mono font-bold text-slate-900">
                ₹{dayPaymentSplit.OTHER.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Detailed Transaction Breakdown Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Receipt className="w-5 h-5 text-indigo-600" />
                Individual Sales Breakdown for {new Date(selectedDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
              </h2>
              <span className="text-xs text-slate-500 font-medium">
                {dailyData?.transactions?.length || 0} payment entries
              </span>
            </div>

            {loading ? (
              <div className="p-12 text-center text-slate-400 text-sm">Loading daily transactions...</div>
            ) : !dailyData?.transactions || dailyData.transactions.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <p className="text-slate-600 font-medium text-sm">No payment transactions found for this date</p>
                <p className="text-xs text-slate-400">
                  When advance or delivery balance payments are received, each transaction will show here with customer, order number, and status.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3.5">Customer</th>
                      <th className="px-6 py-3.5">Order #</th>
                      <th className="px-6 py-3.5">Current Order Status</th>
                      <th className="px-6 py-3.5">Order Total & Balance Due</th>
                      <th className="px-6 py-3.5">Payment Method & Time</th>
                      <th className="px-6 py-3.5 text-right">Inflow Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dailyData.transactions.map((tx) => (
                      <tr key={tx.paymentId} className="hover:bg-slate-50/80 transition">
                        {/* Customer */}
                        <td className="px-6 py-4">
                          <Link 
                            to={`/customers/${tx.customerId}`}
                            className="font-semibold text-slate-900 hover:text-indigo-600 flex items-center gap-1.5"
                          >
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            {tx.customerName}
                          </Link>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-[11px] text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                              {tx.customerCode || 'CUST'}
                            </span>
                            <span className="text-xs text-slate-400 font-mono">{tx.customerPhone}</span>
                          </div>
                        </td>

                        {/* Order Number */}
                        <td className="px-6 py-4">
                          <Link 
                            to={`/orders/${tx.orderNumber}`}
                            className="inline-flex items-center gap-1 font-mono font-bold text-xs text-indigo-600 hover:underline bg-slate-50 px-2 py-1 rounded-lg border border-slate-200"
                          >
                            <ShoppingBag className="w-3 h-3 text-slate-400" />
                            {tx.orderNumber}
                          </Link>
                        </td>

                        {/* Current Status */}
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full border ${
                              STATUS_COLORS[tx.orderStatus] || 'bg-slate-50 text-slate-700'
                            }`}
                          >
                            {tx.orderStatus}
                          </span>
                        </td>

                        {/* Order Total & Balance */}
                        <td className="px-6 py-4 font-mono text-xs">
                          <div className="text-slate-800">
                            Total: <span className="font-bold">₹{tx.orderTotal.toLocaleString()}</span>
                          </div>
                          <div className="mt-0.5">
                            {tx.balanceDue > 0 ? (
                              <span className="text-amber-600 font-bold">
                                Due: ₹{tx.balanceDue.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-emerald-600 font-semibold">Fully Paid ✓</span>
                            )}
                          </div>
                        </td>

                        {/* Payment Method & Time */}
                        <td className="px-6 py-4 text-xs">
                          <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                            <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-mono text-[11px]">
                              {tx.paymentMethod}
                            </span>
                            {tx.reference && (
                              <span className="text-slate-400 font-mono">Ref: {tx.reference}</span>
                            )}
                          </div>
                          <div className="text-slate-400 text-[11px] mt-0.5 font-mono flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(tx.paidAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>

                        {/* Inflow Amount */}
                        <td className="px-6 py-4 text-right">
                          <span className="font-mono font-bold text-base text-emerald-600">
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
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Select Month:
              </label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  fetchMonthlySales(e.target.value);
                }}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <button
                onClick={() => handleTabChange('year')}
                className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline font-semibold ml-2"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Yearly Overview
              </button>
            </div>

            {/* Monthly Summary */}
            <div className="flex items-center gap-4 text-xs font-mono">
              <div>
                <span className="text-slate-400">Total Month Sales: </span>
                <span className="font-bold text-emerald-600 text-base">
                  ₹{monthlyData?.totalSales?.toLocaleString() || 0}
                </span>
              </div>
              <div className="h-4 w-px bg-slate-200" />
              <div>
                <span className="text-slate-400">Total Payments: </span>
                <span className="font-bold text-slate-800">
                  {monthlyData?.totalTransactions || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Day-by-Day Grid */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                Daily Sales for {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>
              <span className="text-xs text-slate-400">
                Click any day to drill into its detailed customer payment records
              </span>
            </div>

            {loading ? (
              <div className="p-12 text-center text-slate-400 text-sm">Loading monthly calendar data...</div>
            ) : !monthlyData?.days || monthlyData.days.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm">No days found for this month</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3.5">Date</th>
                      <th className="px-6 py-3.5">Day</th>
                      <th className="px-6 py-3.5 text-center">Transactions</th>
                      <th className="px-6 py-3.5 text-right">Daily Inflow</th>
                      <th className="px-6 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {monthlyData.days.map((day) => {
                      const hasSales = day.totalSales > 0;
                      return (
                        <tr
                          key={day.date}
                          onClick={() => handleDrillIntoDay(day.date)}
                          className={`cursor-pointer transition ${
                            hasSales ? 'bg-emerald-50/20 hover:bg-emerald-50/50' : 'hover:bg-slate-50/80'
                          }`}
                        >
                          <td className="px-6 py-4 font-mono font-medium text-slate-900">
                            {day.date}
                          </td>
                          <td className="px-6 py-4 text-xs font-semibold text-slate-500">
                            {day.dayName}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {day.paymentCount > 0 ? (
                              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-mono font-bold text-xs rounded-full border border-indigo-100">
                                {day.paymentCount} orders
                              </span>
                            ) : (
                              <span className="text-slate-300 text-xs">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right font-mono font-bold">
                            {hasSales ? (
                              <span className="text-emerald-600">₹{day.totalSales.toLocaleString()}</span>
                            ) : (
                              <span className="text-slate-300 font-normal">₹0</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800">
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
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Select Year:
              </label>
              <select
                value={selectedYear}
                onChange={(e) => {
                  const y = parseInt(e.target.value, 10);
                  setSelectedYear(y);
                  fetchYearlySales(y);
                }}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-sm font-medium bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {[2024, 2025, 2026, 2027, 2028].map((y) => (
                  <option key={y} value={y}>
                    Year {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Yearly Summary */}
            <div className="flex items-center gap-4 text-xs font-mono">
              <div>
                <span className="text-slate-400">Total Annual Sales: </span>
                <span className="font-bold text-emerald-600 text-base">
                  ₹{yearlyData?.totalSales?.toLocaleString() || 0}
                </span>
              </div>
              <div className="h-4 w-px bg-slate-200" />
              <div>
                <span className="text-slate-400">Total Payments: </span>
                <span className="font-bold text-slate-800">
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
                  className={`p-5 rounded-2xl border transition cursor-pointer hover:shadow-md ${
                    hasSales 
                      ? 'bg-white border-emerald-200/80 hover:border-emerald-400' 
                      : 'bg-white border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Month #{m.monthNum}
                      </span>
                      <h3 className="text-lg font-bold text-slate-900 mt-0.5">{m.monthName} {selectedYear}</h3>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-baseline">
                    <div className="text-xs text-slate-500">
                      {m.paymentCount} payments
                    </div>
                    <div className="font-mono font-bold text-lg">
                      {hasSales ? (
                        <span className="text-emerald-600">₹{m.totalSales.toLocaleString()}</span>
                      ) : (
                        <span className="text-slate-300 font-normal">₹0</span>
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
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-200">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div>
              <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Receipt className="w-5 h-5 text-red-600" />
                Store Expense Outflows ({expenses.length})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                All authorized staff and owners can log daily expenses here
              </p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="text-xs font-semibold text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg border border-red-200 transition"
            >
              + Record Expense
            </button>
          </div>

          {expenses.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <p className="text-slate-600 font-medium text-sm">No expense records found</p>
              <p className="text-xs text-slate-400">Click "+ Record Expense" to record lab bills, rent, or maintenance.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Category</th>
                    <th className="px-6 py-3.5">Note / Description</th>
                    <th className="px-6 py-3.5">Payment Method</th>
                    <th className="px-6 py-3.5">Date</th>
                    <th className="px-6 py-3.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 bg-red-50 text-red-700 font-semibold rounded-lg text-xs border border-red-100">
                          {exp.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-800">
                        {exp.note || <span className="text-slate-400 italic">No notes</span>}
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-slate-600">
                        {exp.payment_method}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 font-mono">
                        {new Date(exp.incurred_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-red-600">
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
