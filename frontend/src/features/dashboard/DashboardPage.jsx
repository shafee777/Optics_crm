import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api.js';
import { SkeletonStatGrid, SkeletonTable } from '../../components/common/Skeleton.jsx';
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
  ShieldCheck,
  AlertCircle,
  RotateCcw,
  Zap,
} from 'lucide-react';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const { isOwner, user } = useAuth();
  const navigate = useNavigate();

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/dashboard/today');
      setData(response.data.data);
    } catch (err) {
      console.error('Error fetching dashboard:', err);
      setError(err.response?.data?.error?.message || 'Failed to load dashboard operational data. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonStatGrid count={4} />
        <SkeletonTable rows={5} cols={5} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-lg mx-auto p-8 text-center bg-[#FEFEFC] rounded-2xl border border-rose-200 shadow-sm space-y-4 my-8">
        <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center mx-auto text-rose-600">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-[#202D2B]">Unable to load dashboard data</h2>
        <p className="text-xs text-rose-700">{error || 'Failed to load dashboard operational data'}</p>
        <button
          onClick={fetchDashboard}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#28766B] hover:bg-[#1E5C53] text-white rounded-xl text-xs font-semibold transition shadow-xs"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Retry
        </button>
      </div>
    );
  }

  const { todaySales, todayExpenses, netCashFlow, counts, readyOrders, overdueOrders } = data;

  return (
    <div className="space-y-6">
      {/* Welcome & Quick Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FEFEFC] p-6 rounded-2xl border border-[#E2E7E3] shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-[#202D2B]">
              {isOwner ? 'Store Executive Dashboard' : 'Staff Operations Desk'}
            </h1>
            <span className="px-2.5 py-0.5 bg-[#EBF3F1] text-[#28766B] text-[11px] font-bold rounded-full border border-[#28766B]/20 uppercase">
              {user?.role}
            </span>
          </div>
          <p className="text-xs text-[#66746F] mt-1">
            {isOwner
              ? 'Real-time daily turnover, financial summaries, and work queues'
              : 'Manage walk-in customers, lens lab tracking, and customer spectacle deliveries'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => navigate('/quick-add')}
            className="px-4 py-2 bg-[#28766B] hover:bg-[#1E5C53] text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5"
            title="Fast single-page customer registration, refraction, and order flow"
          >
            <Zap className="w-4 h-4 text-emerald-300" /> Quick Add Customer
          </button>
          <button
            onClick={() => navigate('/customers')}
            className="px-3.5 py-2 bg-[#EBF3F1] hover:bg-[#DDEAE7] text-[#28766B] text-xs font-semibold rounded-xl border border-[#28766B]/20 transition flex items-center gap-1.5"
          >
            <UserPlus className="w-3.5 h-3.5" /> Customer Directory
          </button>
          <button
            onClick={() => navigate('/orders/new')}
            className="px-3.5 py-2 bg-white hover:bg-[#F5F7F3] text-[#202D2B] text-xs font-semibold rounded-xl border border-[#E2E7E3] transition flex items-center gap-1.5"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-[#66746F]" /> Create Order
          </button>
          <button
            onClick={() => navigate('/finance')}
            className="px-3.5 py-2 bg-white hover:bg-[#F5F7F3] text-[#202D2B] text-xs font-semibold rounded-xl border border-[#E2E7E3] transition flex items-center gap-1.5"
          >
            <Receipt className="w-3.5 h-3.5 text-[#66746F]" /> Record Expense
          </button>
        </div>
      </div>

      {/* Quick Intake Banner for walk-in desk */}
      <div
        onClick={() => navigate('/quick-add')}
        className="bg-gradient-to-r from-[#203A36] to-[#28766B] p-4 sm:p-5 rounded-2xl text-white shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer hover:opacity-95 transition"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-emerald-300" />
          </div>
          <div>
            <div className="font-bold text-sm">Quick Add Walk-in Customer</div>
            <div className="text-xs text-white/80">Register customer, record optical eye test, and bill spectacles on a single continuous page</div>
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); navigate('/quick-add'); }}
          className="px-4 py-2 bg-white text-[#203A36] hover:bg-[#F5F7F3] font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 shrink-0"
        >
          Open Quick Add Flow <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Top Financial Stat Cards - EXCLUSIVE TO OWNER */}
      {isOwner && todaySales !== null && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Today's Sales */}
          <div
            onClick={() => navigate('/finance')}
            className="bg-[#FEFEFC] hover:border-[#28766B]/40 p-5 rounded-2xl border border-[#E2E7E3] shadow-sm space-y-2 cursor-pointer transition"
          >
            <div className="flex justify-between items-center text-[#66746F]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#66746F]">Today's Sales</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold tabular-nums text-[#202D2B]">
              ₹{todaySales?.toLocaleString() || 0}
            </div>
            <div className="text-[11px] text-[#28766B] font-medium flex items-center gap-1">
              View customer payment breakdown &rarr;
            </div>
          </div>

          {/* Today's Expenses */}
          <div
            onClick={() => navigate('/finance')}
            className="bg-[#FEFEFC] hover:border-[#28766B]/40 p-5 rounded-2xl border border-[#E2E7E3] shadow-sm space-y-2 cursor-pointer transition"
          >
            <div className="flex justify-between items-center text-[#66746F]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#66746F]">Today's Expenses</span>
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold tabular-nums text-[#202D2B]">
              ₹{todayExpenses?.toLocaleString() || 0}
            </div>
            <div className="text-[11px] text-[#66746F]">Recorded operational costs</div>
          </div>

          {/* Net Cash Position */}
          <div className="bg-[#FEFEFC] p-5 rounded-2xl border border-[#E2E7E3] shadow-sm space-y-2">
            <div className="flex justify-between items-center text-[#66746F]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#66746F]">Net Cash Flow</span>
              <div className="w-8 h-8 rounded-xl bg-[#EBF3F1] text-[#28766B] flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div
              className={`text-2xl font-bold tabular-nums ${
                netCashFlow >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              ₹{netCashFlow?.toLocaleString() || 0}
            </div>
            <div className="text-[11px] text-[#66746F]">Inflow minus Outflow today</div>
          </div>

          {/* Ready for Pickup Queue Counter */}
          <div
            onClick={() => navigate('/orders')}
            className="bg-[#FEFEFC] hover:border-[#28766B]/40 p-5 rounded-2xl border border-[#E2E7E3] shadow-sm space-y-2 cursor-pointer transition"
          >
            <div className="flex justify-between items-center text-[#28766B]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#66746F]">Ready for Pickup</span>
              <div className="w-8 h-8 rounded-xl bg-[#28766B] text-white flex items-center justify-center shadow-sm">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold tabular-nums text-[#202D2B]">
              {counts.readyForPickup} <span className="text-sm font-normal text-[#66746F]">orders</span>
            </div>
            <div className="text-[11px] text-[#28766B] font-medium flex items-center gap-1">
              Glasses ready for collection &rarr;
            </div>
          </div>
        </div>
      )}

      {/* Operational Order Status Summary (Visible to Both Staff & Owner) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          onClick={() => navigate('/orders')}
          className="p-4 bg-[#FEFEFC] rounded-xl border border-[#E2E7E3] shadow-sm cursor-pointer hover:border-[#28766B]/40 transition"
        >
          <div className="flex items-center gap-1.5 text-amber-700 font-semibold text-xs mb-1">
            <Clock className="w-3.5 h-3.5" /> Pending Orders
          </div>
          <div className="text-xl font-bold tabular-nums text-[#202D2B]">{counts.pending}</div>
        </div>

        <div
          onClick={() => navigate('/orders')}
          className="p-4 bg-[#FEFEFC] rounded-xl border border-[#E2E7E3] shadow-sm cursor-pointer hover:border-[#28766B]/40 transition"
        >
          <div className="flex items-center gap-1.5 text-sky-700 font-semibold text-xs mb-1">
            <Wrench className="w-3.5 h-3.5" /> At Lens Lab
          </div>
          <div className="text-xl font-bold tabular-nums text-[#202D2B]">{counts.processing}</div>
        </div>

        <div
          onClick={() => navigate('/orders')}
          className="p-4 bg-[#FEFEFC] rounded-xl border border-[#E2E7E3] shadow-sm cursor-pointer hover:border-[#28766B]/40 transition"
        >
          <div className="flex items-center gap-1.5 text-[#28766B] font-semibold text-xs mb-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Ready for Pickup
          </div>
          <div className="text-xl font-bold tabular-nums text-[#202D2B]">{counts.readyForPickup}</div>
        </div>

        <div
          onClick={() => navigate('/orders')}
          className={`p-4 rounded-xl border shadow-sm cursor-pointer transition ${
            counts.overdue > 0
              ? 'bg-rose-50/70 border-rose-200 text-rose-950'
              : 'bg-[#FEFEFC] border-[#E2E7E3] text-[#202D2B] hover:border-[#28766B]/40'
          }`}
        >
          <div className="flex items-center gap-1.5 font-semibold text-xs mb-1 text-rose-700">
            <AlertTriangle className="w-3.5 h-3.5" /> Delayed / Overdue
          </div>
          <div className="text-xl font-bold tabular-nums">{counts.overdue}</div>
        </div>
      </div>

      {/* Operational Queues Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ready for Pickup Queue */}
        <div className="bg-[#FEFEFC] p-6 rounded-2xl border border-[#E2E7E3] shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-[#202D2B] text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#28766B]" />
              Ready for Pickup Queue ({readyOrders.length})
            </h2>
            <button
              onClick={() => navigate('/orders')}
              className="text-xs font-semibold text-[#28766B] hover:underline"
            >
              View All &rarr;
            </button>
          </div>

          {readyOrders.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-[#E2E7E3] rounded-xl space-y-1">
              <p className="text-xs text-[#66746F]">No orders waiting for pickup right now.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {readyOrders.map((ord) => (
                <div
                  key={ord.id}
                  onClick={() => navigate(`/orders/${ord.id}`)}
                  className="p-3.5 rounded-xl border border-[#E2E7E3] hover:border-[#28766B]/40 hover:bg-[#F5F7F3] cursor-pointer transition flex justify-between items-center"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="tabular-nums font-bold text-xs text-[#28766B]">{ord.order_number}</span>
                      <span className="font-semibold text-[#202D2B] text-sm">{ord.customer_name}</span>
                    </div>
                    <div className="text-xs text-[#66746F] tabular-nums flex items-center gap-1">
                      <Phone className="w-3 h-3 text-[#66746F]" />
                      {ord.customer_phone || ord.customer_code}
                    </div>
                  </div>

                  <div className="text-right flex items-center gap-3">
                    <div>
                      {ord.balance_due > 0 ? (
                        <div className="text-xs tabular-nums font-bold text-amber-700">
                          Due: ₹{ord.balance_due.toLocaleString()}
                        </div>
                      ) : (
                        <div className="text-xs font-semibold text-emerald-700">Paid Full</div>
                      )}
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#66746F]" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Delayed / Overdue Queue */}
        <div className="bg-[#FEFEFC] p-6 rounded-2xl border border-[#E2E7E3] shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-[#202D2B] text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              Delayed / Overdue Orders ({overdueOrders.length})
            </h2>
            <button
              onClick={() => navigate('/orders')}
              className="text-xs font-semibold text-rose-700 hover:underline"
            >
              View All &rarr;
            </button>
          </div>

          {overdueOrders.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-[#E2E7E3] rounded-xl space-y-1">
              <p className="text-xs text-emerald-700 font-semibold">🎉 All orders are on schedule!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {overdueOrders.map((ord) => (
                <div
                  key={ord.id}
                  onClick={() => navigate(`/orders/${ord.id}`)}
                  className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/30 hover:border-rose-300 hover:bg-rose-50/60 cursor-pointer transition flex justify-between items-center"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="tabular-nums font-bold text-xs text-[#28766B]">{ord.order_number}</span>
                      <span className="font-semibold text-[#202D2B] text-sm">{ord.customer_name}</span>
                    </div>
                    <div className="text-xs text-[#66746F] tabular-nums">
                      Due: <span className="text-rose-700 font-bold">{new Date(ord.due_date).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="text-right flex items-center gap-3">
                    <OrderStatusBadge status={ord.status} />
                    <ArrowRight className="w-4 h-4 text-[#66746F]" />
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
