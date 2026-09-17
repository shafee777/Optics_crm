import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api.js';
import { useAuth } from '../auth/AuthContext.jsx';
import OrderStatusBadge from '../orders/OrderStatusBadge.jsx';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  UserPlus, 
  ShoppingBag, 
  Receipt,
  ArrowRight,
  Phone,
  Wrench,
  ShieldCheck
} from 'lucide-react';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const { isOwner, user } = useAuth();
  const navigate = useNavigate();

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/dashboard/today');
      setData(response.data.data);
    } catch (err) {
      console.error('Error fetching dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading store dashboard...</div>;
  }

  if (!data) {
    return <div className="p-8 text-center text-red-500">Failed to load dashboard operational data</div>;
  }

  const { todaySales, todayExpenses, netCashFlow, counts, readyOrders, overdueOrders } = data;

  return (
    <div className="space-y-8">
      {/* Welcome & Quick Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">
              {isOwner ? 'Store Executive Dashboard' : 'Staff Operations Desk'}
            </h1>
            <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full uppercase">
              {user?.role}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            {isOwner
              ? 'Real-time daily turnover, financial summaries, and work queues'
              : 'Manage walk-in customers, lens lab tracking, and customer spectacle deliveries'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => navigate('/customers')}
            className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
          >
            <UserPlus className="w-3.5 h-3.5" /> New Customer
          </button>
          <button
            onClick={() => navigate('/orders/new')}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-emerald-600/20 transition flex items-center gap-1.5"
          >
            <ShoppingBag className="w-3.5 h-3.5" /> Create Order
          </button>
          <button
            onClick={() => navigate('/finance')}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
          >
            <Receipt className="w-3.5 h-3.5" /> Record Expense
          </button>
        </div>
      </div>

      {/* Top Financial Stat Cards - EXCLUSIVE TO OWNER */}
      {isOwner && todaySales !== null && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Today's Sales */}
          <div
            onClick={() => navigate('/finance')}
            className="bg-white hover:bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2 cursor-pointer transition"
          >
            <div className="flex justify-between items-center text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Today's Sales</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-mono font-bold text-slate-900">
              ₹{todaySales?.toLocaleString() || 0}
            </div>
            <div className="text-[11px] text-indigo-600 font-medium flex items-center gap-1">
              View customer payment breakdown &rarr;
            </div>
          </div>

          {/* Today's Expenses */}
          <div
            onClick={() => navigate('/finance')}
            className="bg-white hover:bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2 cursor-pointer transition"
          >
            <div className="flex justify-between items-center text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Today's Expenses</span>
              <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-mono font-bold text-slate-900">
              ₹{todayExpenses?.toLocaleString() || 0}
            </div>
            <div className="text-[11px] text-slate-400">Recorded operational costs</div>
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
                netCashFlow >= 0 ? 'text-emerald-600' : 'text-red-600'
              }`}
            >
              ₹{netCashFlow?.toLocaleString() || 0}
            </div>
            <div className="text-[11px] text-slate-400">Inflow minus Outflow today</div>
          </div>

          {/* Ready for Pickup Queue Counter */}
          <div
            onClick={() => navigate('/orders')}
            className="bg-purple-50/50 hover:bg-purple-50 p-5 rounded-2xl border border-purple-200 shadow-sm space-y-2 cursor-pointer transition"
          >
            <div className="flex justify-between items-center text-purple-700">
              <span className="text-xs font-semibold uppercase tracking-wider">Ready for Pickup</span>
              <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center shadow-sm">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-mono font-bold text-purple-900">
              {counts.readyForPickup} orders
            </div>
            <div className="text-[11px] text-purple-700 font-medium flex items-center gap-1">
              Glasses ready for collection &rarr;
            </div>
          </div>
        </div>
      )}

      {/* Operational Order Status Summary (Visible to Both Staff & Owner) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          onClick={() => navigate('/orders')}
          className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-slate-300 transition"
        >
          <div className="flex items-center gap-2 text-amber-600 font-semibold text-xs mb-1">
            <Clock className="w-4 h-4" /> Pending Orders
          </div>
          <div className="text-xl font-mono font-bold text-slate-900">{counts.pending}</div>
        </div>

        <div
          onClick={() => navigate('/orders')}
          className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-slate-300 transition"
        >
          <div className="flex items-center gap-2 text-blue-600 font-semibold text-xs mb-1">
            <Wrench className="w-4 h-4" /> At Lens Lab
          </div>
          <div className="text-xl font-mono font-bold text-slate-900">{counts.processing}</div>
        </div>

        <div
          onClick={() => navigate('/orders')}
          className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-slate-300 transition"
        >
          <div className="flex items-center gap-2 text-purple-600 font-semibold text-xs mb-1">
            <CheckCircle2 className="w-4 h-4" /> Ready for Pickup
          </div>
          <div className="text-xl font-mono font-bold text-slate-900">{counts.readyForPickup}</div>
        </div>

        <div
          onClick={() => navigate('/orders')}
          className={`p-4 rounded-xl border shadow-sm cursor-pointer transition ${
            counts.overdue > 0
              ? 'bg-red-50/60 border-red-200 text-red-900'
              : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          <div className="flex items-center gap-2 font-semibold text-xs mb-1 text-red-600">
            <AlertTriangle className="w-4 h-4" /> Delayed / Overdue
          </div>
          <div className="text-xl font-mono font-bold">{counts.overdue}</div>
        </div>
      </div>

      {/* Operational Queues Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ready for Pickup Queue */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-purple-600" />
              Ready for Pickup Queue ({readyOrders.length})
            </h2>
            <button
              onClick={() => navigate('/orders')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              View All &rarr;
            </button>
          </div>

          {readyOrders.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed border-slate-100 rounded-xl space-y-1">
              <p className="text-xs text-slate-500 font-medium">No orders waiting for pickup right now.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {readyOrders.map((ord) => (
                <div
                  key={ord.id}
                  onClick={() => navigate(`/orders/${ord.id}`)}
                  className="p-3.5 rounded-xl border border-slate-100 hover:border-purple-200 hover:bg-purple-50/30 cursor-pointer transition flex justify-between items-center"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-indigo-600">{ord.order_number}</span>
                      <span className="font-semibold text-slate-900 text-sm">{ord.customer_name}</span>
                    </div>
                    <div className="text-xs text-slate-400 font-mono flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {ord.customer_phone || ord.customer_code}
                    </div>
                  </div>

                  <div className="text-right flex items-center gap-3">
                    <div>
                      {ord.balance_due > 0 ? (
                        <div className="text-xs font-mono font-bold text-amber-600">
                          Due: ₹{ord.balance_due.toLocaleString()}
                        </div>
                      ) : (
                        <div className="text-xs font-semibold text-emerald-600">Paid Full</div>
                      )}
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Delayed / Overdue Queue */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Delayed / Overdue Orders ({overdueOrders.length})
            </h2>
            <button
              onClick={() => navigate('/orders')}
              className="text-xs font-semibold text-red-600 hover:text-red-800"
            >
              View All &rarr;
            </button>
          </div>

          {overdueOrders.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed border-slate-100 rounded-xl space-y-1">
              <p className="text-xs text-emerald-600 font-semibold">🎉 All orders are on schedule!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {overdueOrders.map((ord) => (
                <div
                  key={ord.id}
                  onClick={() => navigate(`/orders/${ord.id}`)}
                  className="p-3.5 rounded-xl border border-red-100 hover:border-red-300 hover:bg-red-50/30 cursor-pointer transition flex justify-between items-center"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-indigo-600">{ord.order_number}</span>
                      <span className="font-semibold text-slate-900 text-sm">{ord.customer_name}</span>
                    </div>
                    <div className="text-xs text-slate-500 font-mono">
                      Due: <span className="text-red-600 font-bold">{new Date(ord.due_date).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="text-right flex items-center gap-3">
                    <OrderStatusBadge status={ord.status} />
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
