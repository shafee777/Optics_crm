import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api.js';
import { useAuth } from '../auth/AuthContext.jsx';
import OrderStatusBadge from '../orders/OrderStatusBadge.jsx';
import { openWhatsApp, getPaymentReminderMessage } from '../../lib/whatsapp.js';
import { 
  BarChart3, 
  Calendar, 
  Download, 
  TrendingUp, 
  CreditCard, 
  Receipt, 
  AlertCircle, 
  CheckCircle2, 
  Filter, 
  Clock, 
  ArrowRight,
  Package,
  MessageSquare,
  DollarSign,
  FileSpreadsheet
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function exportRowsToCsv(filename, rows) {
  if (!rows || !rows.length) return;
  const headers = Object.keys(rows[0]);
  const csvRows = [headers.join(',')];

  rows.forEach((row) => {
    const values = headers.map((header) => {
      let val = row[header];
      if (val === null || val === undefined) {
        val = '';
      } else if (val instanceof Date) {
        val = val.toISOString();
      } else {
        val = String(val).replace(/"/g, '""');
      }
      return `"${val}"`;
    });
    csvRows.push(values.join(','));
  });

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default function ReportsPage() {
  const { isOwner, user } = useAuth();
  const navigate = useNavigate();

  // Active Tab: 'range' | 'dues' | 'products'
  const [activeTab, setActiveTab] = useState('range');

  // Custom Date Range state
  const todayStr = new Date().toISOString().split('T')[0];
  const thirtyDaysAgoStr = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(thirtyDaysAgoStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [rangeData, setRangeData] = useState(null);
  const [loadingRange, setLoadingRange] = useState(false);

  // Outstanding Dues state
  const [duesData, setDuesData] = useState(null);
  const [loadingDues, setLoadingDues] = useState(false);

  // Top Products state
  const [topProducts, setTopProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // 1. Fetch Custom Range Sales
  const fetchCustomRange = useCallback(async () => {
    if (!isOwner) return;
    setLoadingRange(true);
    try {
      const res = await api.get('/reports/custom-range', {
        params: { startDate, endDate },
      });
      setRangeData(res.data.data);
    } catch (err) {
      console.error('Error fetching custom range sales:', err);
    } finally {
      setLoadingRange(false);
    }
  }, [isOwner, startDate, endDate]);

  // 2. Fetch Outstanding Dues
  const fetchDues = useCallback(async () => {
    if (!isOwner) return;
    setLoadingDues(true);
    try {
      const res = await api.get('/reports/outstanding-dues');
      setDuesData(res.data.data);
    } catch (err) {
      console.error('Error fetching outstanding dues:', err);
    } finally {
      setLoadingDues(false);
    }
  }, [isOwner]);

  // 3. Fetch Top Products
  const fetchTopProducts = useCallback(async () => {
    if (!isOwner) return;
    setLoadingProducts(true);
    try {
      const res = await api.get('/reports/top-products', { params: { limit: 15 } });
      setTopProducts(res.data.data);
    } catch (err) {
      console.error('Error fetching top products:', err);
    } finally {
      setLoadingProducts(false);
    }
  }, [isOwner]);

  useEffect(() => {
    if (activeTab === 'range') {
      fetchCustomRange();
    } else if (activeTab === 'dues') {
      fetchDues();
    } else if (activeTab === 'products') {
      fetchTopProducts();
    }
  }, [activeTab, fetchCustomRange, fetchDues, fetchTopProducts]);

  if (!isOwner) {
    return (
      <div className="p-8 text-center text-red-600 bg-red-50 rounded-2xl border border-red-200">
        <AlertCircle className="w-8 h-8 mx-auto mb-2" />
        <h2 className="font-bold text-base">Restricted Access</h2>
        <p className="text-xs text-slate-600 mt-1">Detailed business turnover reports and receivables are accessible to the store OWNER only.</p>
      </div>
    );
  }

  // Handle Export CSV for Custom Range
  const handleExportRangeCsv = () => {
    if (!rangeData?.transactions?.length) return;
    const formatted = rangeData.transactions.map((t) => ({
      'Payment ID': t.paymentId,
      'Payment Date': new Date(t.paidAt).toLocaleString(),
      'Order Number': t.orderNumber,
      'Customer Name': t.customerName,
      'Customer Phone': t.customerPhone,
      'Payment Method': t.paymentMethod,
      'Amount (INR)': t.amount,
      'Order Total': t.orderTotal,
    }));
    exportRowsToCsv(`sales_report_${startDate}_to_${endDate}.csv`, formatted);
  };

  // Handle Export CSV for Dues
  const handleExportDuesCsv = () => {
    if (!duesData?.dues?.length) return;
    const formatted = duesData.dues.map((d) => ({
      'Customer Code': d.customerCode,
      'Customer Name': d.customerName,
      'Customer Phone': d.customerPhone,
      'Order Number': d.orderNumber,
      'Order Status': d.status,
      'Total Order Amount': d.totalAmount,
      'Paid So Far': d.totalPaid,
      'Balance Due': d.balanceDue,
      'Expected Delivery Date': d.dueDate ? new Date(d.dueDate).toLocaleDateString() : 'N/A',
      'Order Date': new Date(d.createdAt).toLocaleDateString(),
    }));
    exportRowsToCsv(`outstanding_dues_${todayStr}.csv`, formatted);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <FileSpreadsheet className="w-6 h-6 text-indigo-600" />
            Store Reports & Business Intelligence
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Custom date range sales breakdown, outstanding customer receivables, and top-selling product statistics.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('range')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'range'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Date Range Sales
          </button>
          <button
            onClick={() => setActiveTab('dues')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'dues'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Receipt className="w-3.5 h-3.5 text-amber-600" />
            Outstanding Dues ({duesData?.count || 0})
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'products'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            Top Selling Products
          </button>
        </div>
      </div>

      {/* TAB 1: Custom Date Range Sales */}
      {activeTab === 'range' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>

              <div className="self-end pt-1">
                <button
                  onClick={fetchCustomRange}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5"
                >
                  <Filter className="w-3.5 h-3.5" /> Apply Filter
                </button>
              </div>
            </div>

            {rangeData?.transactions?.length > 0 && (
              <button
                onClick={handleExportRangeCsv}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs transition flex items-center gap-2 shadow-sm"
              >
                <Download className="w-4 h-4 text-emerald-400" /> Export Sales CSV
              </button>
            )}
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Sales Inflow</div>
              <div className="text-2xl font-mono font-bold text-emerald-600">
                ₹{(rangeData?.totalSales || 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-400">{rangeData?.transactionCount || 0} transactions</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">UPI / Online</div>
              <div className="text-xl font-mono font-bold text-slate-900">
                ₹{(rangeData?.paymentSplit?.UPI || 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-400">Digital payments</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cash Collected</div>
              <div className="text-xl font-mono font-bold text-slate-900">
                ₹{(rangeData?.paymentSplit?.CASH || 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-400">Over-the-counter cash</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Card / Other</div>
              <div className="text-xl font-mono font-bold text-slate-900">
                ₹{((rangeData?.paymentSplit?.CARD || 0) + (rangeData?.paymentSplit?.OTHER || 0)).toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-400">POS terminals & transfers</div>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="font-bold text-slate-900 text-sm">
                Sales Transactions ({rangeData?.transactions?.length || 0})
              </h2>
              <span className="text-xs text-slate-500 font-mono">
                {startDate} to {endDate}
              </span>
            </div>

            {loadingRange ? (
              <div className="p-12 text-center text-slate-400 text-sm">Loading custom sales report...</div>
            ) : !rangeData?.transactions || rangeData.transactions.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm">No sales transactions found for this date range.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">Order #</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Mode</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rangeData.transactions.map((t) => (
                      <tr key={t.paymentId} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-4 font-mono text-slate-500">
                          {new Date(t.paidAt).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-indigo-600">
                          <button
                            onClick={() => navigate(`/orders/${t.orderId}`)}
                            className="hover:underline"
                          >
                            {t.orderNumber}
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{t.customerName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{t.customerPhone}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-slate-100 text-slate-700 uppercase">
                            {t.paymentMethod}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                          +₹{t.amount.toLocaleString()}
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

      {/* TAB 2: Outstanding Customer Dues (Receivables) */}
      {activeTab === 'dues' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <div className="text-xs font-semibold uppercase text-amber-600 tracking-wider">Total Outstanding Receivables</div>
              <div className="text-3xl font-mono font-extrabold text-slate-900 mt-1">
                ₹{(duesData?.totalOutstanding || 0).toLocaleString()}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Pending balance across {duesData?.count || 0} active orders
              </p>
            </div>

            {duesData?.dues?.length > 0 && (
              <button
                onClick={handleExportDuesCsv}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs transition flex items-center gap-2 shadow-sm"
              >
                <Download className="w-4 h-4 text-amber-400" /> Export Dues CSV
              </button>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {loadingDues ? (
              <div className="p-12 text-center text-slate-400 text-sm">Loading outstanding customer dues...</div>
            ) : !duesData?.dues || duesData.dues.length === 0 ? (
              <div className="p-12 text-center space-y-1">
                <p className="font-bold text-emerald-600 text-base">🎉 No outstanding dues!</p>
                <p className="text-xs text-slate-400">All customer spectacle orders have been fully paid.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="py-3 px-4">Order #</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Total Order</th>
                      <th className="py-3 px-4">Paid So Far</th>
                      <th className="py-3 px-4">Unpaid Balance</th>
                      <th className="py-3 px-4 text-right">Reminder Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {duesData.dues.map((due) => (
                      <tr key={due.orderId} className="hover:bg-slate-50/60 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-indigo-600">
                          <button onClick={() => navigate(`/orders/${due.orderId}`)} className="hover:underline">
                            {due.orderNumber}
                          </button>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{due.customerName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {due.customerPhone} {due.customerCode ? `• ${due.customerCode}` : ''}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <OrderStatusBadge status={due.status} />
                        </td>
                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">
                          ₹{due.totalAmount.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-emerald-600 font-semibold">
                          ₹{due.totalPaid.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-extrabold text-amber-600 text-sm">
                          ₹{due.balanceDue.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {due.customerPhone && (
                            <button
                              onClick={() => {
                                const msg = getPaymentReminderMessage({
                                  customerName: due.customerName,
                                  storeName: user?.store?.name || 'Optical Store',
                                  orderNumber: due.orderNumber,
                                  balanceDue: due.balanceDue,
                                });
                                openWhatsApp(
                                  due.customerPhone,
                                  msg,
                                  `Payment Reminder #${due.orderNumber}`,
                                  due.customerId,
                                  'PAYMENT_REMINDER'
                                );
                              }}
                              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 text-[11px] font-semibold rounded-xl border border-amber-200 transition inline-flex items-center gap-1.5"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
                              Send Payment Reminder
                            </button>
                          )}
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

      {/* TAB 3: Top Selling Products Leaderboard */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Package className="w-5 h-5 text-indigo-600" />
              Most Popular Spectacle Frames & Lenses
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Top items ranked by total units sold across all completed optical orders.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {loadingProducts ? (
              <div className="p-12 text-center text-slate-400 text-sm">Loading product leaderboard...</div>
            ) : topProducts.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm">No sales item data recorded yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="py-3 px-4">Rank</th>
                      <th className="py-3 px-4">Item Description</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4 text-center">Units Sold</th>
                      <th className="py-3 px-4 text-right">Total Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {topProducts.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-400">
                          #{idx + 1}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {p.description}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100">
                            {p.itemType}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-extrabold text-slate-800 text-sm">
                          {p.unitsSold}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600">
                          ₹{p.totalRevenue.toLocaleString()}
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
    </div>
  );
}
