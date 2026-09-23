import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api.js';
import { useAuth } from '../auth/AuthContext.jsx';
import OrderStatusBadge from '../orders/OrderStatusBadge.jsx';
import { sendWhatsApp, getPaymentReminderMessage } from '../../lib/whatsapp.js';
import { SkeletonTable } from '../../components/common/Skeleton.jsx';
import { 
  TrendingUp, 
  Download, 
  Receipt, 
  AlertCircle, 
  Filter, 
  Package,
  MessageSquare,
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
      <div className="p-8 text-center text-rose-700 bg-rose-50/80 rounded-2xl border border-rose-200">
        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-rose-600" />
        <h2 className="font-bold text-base text-[#202D2B]">Restricted Access</h2>
        <p className="text-xs text-[#66746F] mt-1">Detailed business turnover reports and receivables are accessible to the store OWNER only.</p>
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FEFEFC] p-6 rounded-2xl border border-[#E2E7E3] shadow-xs">
        <div>
          <h1 className="text-2xl font-bold text-[#202D2B] flex items-center gap-2.5">
            <FileSpreadsheet className="w-6 h-6 text-[#28766B]" />
            Store Reports & Business Intelligence
          </h1>
          <p className="text-sm text-[#66746F] mt-1">
            Custom date range sales breakdown, outstanding customer receivables, and top-selling product statistics.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-[#F5F7F3] p-1 rounded-xl border border-[#E2E7E3]">
          <button
            onClick={() => setActiveTab('range')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'range'
                ? 'bg-[#FEFEFC] text-[#28766B] shadow-xs'
                : 'text-[#66746F] hover:text-[#202D2B]'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Date Range Sales
          </button>
          <button
            onClick={() => setActiveTab('dues')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'dues'
                ? 'bg-[#FEFEFC] text-[#28766B] shadow-xs'
                : 'text-[#66746F] hover:text-[#202D2B]'
            }`}
          >
            <Receipt className="w-3.5 h-3.5 text-amber-700" />
            Outstanding Dues ({duesData?.count || 0})
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'products'
                ? 'bg-[#FEFEFC] text-[#28766B] shadow-xs'
                : 'text-[#66746F] hover:text-[#202D2B]'
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
          <div className="bg-[#FEFEFC] p-5 rounded-2xl border border-[#E2E7E3] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#66746F] uppercase mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-1.5 border border-[#E2E7E3] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#28766B] focus:ring-1 focus:ring-[#28766B] bg-[#FEFEFC] text-[#202D2B]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#66746F] uppercase mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-1.5 border border-[#E2E7E3] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#28766B] focus:ring-1 focus:ring-[#28766B] bg-[#FEFEFC] text-[#202D2B]"
                />
              </div>

              <div className="self-end pt-1">
                <button
                  onClick={fetchCustomRange}
                  className="px-4 py-2 bg-[#28766B] hover:bg-[#1E5C53] text-white font-semibold rounded-xl text-xs shadow-xs transition flex items-center gap-1.5"
                >
                  <Filter className="w-3.5 h-3.5" /> Apply Filter
                </button>
              </div>
            </div>

            {rangeData?.transactions?.length > 0 && (
              <button
                onClick={handleExportRangeCsv}
                className="px-4 py-2.5 bg-[#203A36] hover:bg-[#182C29] text-white font-semibold rounded-xl text-xs transition flex items-center gap-2 shadow-xs"
              >
                <Download className="w-4 h-4 text-emerald-400" /> Export Sales CSV
              </button>
            )}
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#FEFEFC] p-5 rounded-2xl border border-[#E2E7E3] shadow-xs space-y-2">
              <div className="text-xs font-semibold text-[#66746F] uppercase tracking-wider">Total Sales Inflow</div>
              <div className="text-2xl font-mono tabular-nums font-bold text-emerald-700">
                ₹{(rangeData?.totalSales || 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-[#66746F] font-mono tabular-nums">{rangeData?.transactionCount || 0} transactions</div>
            </div>

            <div className="bg-[#FEFEFC] p-5 rounded-2xl border border-[#E2E7E3] shadow-xs space-y-2">
              <div className="text-xs font-semibold text-[#66746F] uppercase tracking-wider">UPI / Online</div>
              <div className="text-xl font-mono tabular-nums font-bold text-[#202D2B]">
                ₹{(rangeData?.paymentSplit?.UPI || 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-[#66746F]">Digital payments</div>
            </div>

            <div className="bg-[#FEFEFC] p-5 rounded-2xl border border-[#E2E7E3] shadow-xs space-y-2">
              <div className="text-xs font-semibold text-[#66746F] uppercase tracking-wider">Cash Collected</div>
              <div className="text-xl font-mono tabular-nums font-bold text-[#202D2B]">
                ₹{(rangeData?.paymentSplit?.CASH || 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-[#66746F]">Over-the-counter cash</div>
            </div>

            <div className="bg-[#FEFEFC] p-5 rounded-2xl border border-[#E2E7E3] shadow-xs space-y-2">
              <div className="text-xs font-semibold text-[#66746F] uppercase tracking-wider">Card / Other</div>
              <div className="text-xl font-mono tabular-nums font-bold text-[#202D2B]">
                ₹{((rangeData?.paymentSplit?.CARD || 0) + (rangeData?.paymentSplit?.OTHER || 0)).toLocaleString()}
              </div>
              <div className="text-[11px] text-[#66746F]">POS terminals & transfers</div>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="bg-[#FEFEFC] rounded-2xl border border-[#E2E7E3] shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E2E7E3] flex justify-between items-center bg-[#F5F7F3]">
              <h2 className="font-bold text-[#202D2B] text-sm">
                Sales Transactions ({rangeData?.transactions?.length || 0})
              </h2>
              <span className="text-xs text-[#66746F] font-mono tabular-nums">
                {startDate} to {endDate}
              </span>
            </div>

            {loadingRange ? (
              <SkeletonTable rows={5} cols={5} />
            ) : !rangeData?.transactions || rangeData.transactions.length === 0 ? (
              <div className="p-12 text-center text-[#66746F] text-xs">No sales transactions found for this date range.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#202D2B]">
                  <thead className="bg-[#F5F7F3] border-b border-[#E2E7E3] text-[11px] font-bold uppercase tracking-wider text-[#66746F]">
                    <tr>
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">Order #</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Mode</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E7E3]">
                    {rangeData.transactions.map((t) => (
                      <tr key={t.paymentId} className="hover:bg-[#F5F7F3]/60 transition">
                        <td className="py-3 px-4 font-mono tabular-nums text-[#66746F]">
                          {new Date(t.paidAt).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-[#28766B]">
                          <button
                            onClick={() => navigate(`/orders/${t.orderId}`)}
                            className="hover:underline"
                          >
                            {t.orderNumber}
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-[#202D2B]">{t.customerName}</div>
                          <div className="text-[10px] text-[#66746F] font-mono tabular-nums">{t.customerPhone}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-[#F5F7F3] border border-[#E2E7E3] text-[#202D2B] uppercase">
                            {t.paymentMethod}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-emerald-700">
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
          <div className="flex justify-between items-center bg-[#FEFEFC] p-5 rounded-2xl border border-[#E2E7E3] shadow-xs">
            <div>
              <div className="text-xs font-semibold uppercase text-amber-800 tracking-wider">Total Outstanding Receivables</div>
              <div className="text-3xl font-mono tabular-nums font-bold text-[#202D2B] mt-1">
                ₹{(duesData?.totalOutstanding || 0).toLocaleString()}
              </div>
              <p className="text-xs text-[#66746F] mt-0.5">
                Pending balance across {duesData?.count || 0} active orders
              </p>
            </div>

            {duesData?.dues?.length > 0 && (
              <button
                onClick={handleExportDuesCsv}
                className="px-4 py-2.5 bg-[#203A36] hover:bg-[#182C29] text-white font-semibold rounded-xl text-xs transition flex items-center gap-2 shadow-xs"
              >
                <Download className="w-4 h-4 text-amber-400" /> Export Dues CSV
              </button>
            )}
          </div>

          <div className="bg-[#FEFEFC] rounded-2xl border border-[#E2E7E3] shadow-xs overflow-hidden">
            {loadingDues ? (
              <SkeletonTable rows={5} cols={6} />
            ) : !duesData?.dues || duesData.dues.length === 0 ? (
              <div className="p-12 text-center space-y-1">
                <p className="font-bold text-emerald-700 text-base">🎉 No outstanding dues!</p>
                <p className="text-xs text-[#66746F]">All customer spectacle orders have been fully paid.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#202D2B]">
                  <thead className="bg-[#F5F7F3] border-b border-[#E2E7E3] text-[11px] font-bold uppercase tracking-wider text-[#66746F]">
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
                  <tbody className="divide-y divide-[#E2E7E3]">
                    {duesData.dues.map((due) => (
                      <tr key={due.orderId} className="hover:bg-[#F5F7F3]/60 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-[#28766B]">
                          <button onClick={() => navigate(`/orders/${due.orderId}`)} className="hover:underline">
                            {due.orderNumber}
                          </button>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-[#202D2B]">{due.customerName}</div>
                          <div className="text-[10px] text-[#66746F] font-mono tabular-nums">
                            {due.customerPhone} {due.customerCode ? `• ${due.customerCode}` : ''}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <OrderStatusBadge status={due.status} />
                        </td>
                        <td className="py-3.5 px-4 font-mono tabular-nums font-semibold text-[#202D2B]">
                          ₹{due.totalAmount.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 font-mono tabular-nums text-emerald-700 font-semibold">
                          ₹{due.totalPaid.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 font-mono tabular-nums font-bold text-amber-800 text-sm">
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
                                sendWhatsApp({
                                  phone: due.customerPhone,
                                  message: msg,
                                  label: `Payment Reminder #${due.orderNumber}`,
                                  customerId: due.customerId,
                                  messageType: 'PAYMENT_REMINDER',
                                });
                              }}
                              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-semibold rounded-xl border border-amber-200 transition inline-flex items-center gap-1.5"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-amber-700" />
                              Send Reminder
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
          <div className="bg-[#FEFEFC] p-6 rounded-2xl border border-[#E2E7E3] shadow-xs">
            <h2 className="font-bold text-[#202D2B] text-base flex items-center gap-2">
              <Package className="w-5 h-5 text-[#28766B]" />
              Most Popular Spectacle Frames & Lenses
            </h2>
            <p className="text-xs text-[#66746F] mt-1">
              Top items ranked by total units sold across all completed optical orders.
            </p>
          </div>

          <div className="bg-[#FEFEFC] rounded-2xl border border-[#E2E7E3] shadow-xs overflow-hidden">
            {loadingProducts ? (
              <SkeletonTable rows={5} cols={4} />
            ) : topProducts.length === 0 ? (
              <div className="p-12 text-center text-[#66746F] text-xs">No sales item data recorded yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#202D2B]">
                  <thead className="bg-[#F5F7F3] border-b border-[#E2E7E3] text-[11px] font-bold uppercase tracking-wider text-[#66746F]">
                    <tr>
                      <th className="py-3 px-4">Rank</th>
                      <th className="py-3 px-4">Item Description</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4 text-center">Units Sold</th>
                      <th className="py-3 px-4 text-right">Total Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E7E3]">
                    {topProducts.map((p, idx) => (
                      <tr key={idx} className="hover:bg-[#F5F7F3]/60 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-[#66746F] tabular-nums">
                          #{idx + 1}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-[#202D2B]">
                          {p.description}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#EBF3F1] text-[#28766B] border border-[#28766B]/20">
                            {p.itemType}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-[#202D2B] tabular-nums text-sm">
                          {p.unitsSold}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700 tabular-nums">
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
