import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api.js';
import OrderStatusBadge from './OrderStatusBadge.jsx';
import { SkeletonTable } from '../../components/common/Skeleton.jsx';
import { Search, Plus, Calendar, AlertTriangle, ArrowRight, AlertCircle, RotateCcw, Zap } from 'lucide-react';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [meta, setMeta] = useState({ page: 1, total: 0, totalPages: 1 });

  const navigate = useNavigate();

  const fetchOrders = useCallback(async (searchTerm = search, status = statusFilter, page = 1) => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit: 10 };
      if (searchTerm) params.search = searchTerm;
      if (status === 'OVERDUE') {
        params.overdue = 'true';
      } else if (status !== 'ALL') {
        params.status = status;
      }

      const response = await api.get('/orders', { params });
      setOrders(response.data.data);
      setMeta(response.data.meta);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError(err.response?.data?.error?.message || 'Failed to load orders. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOrders(search, statusFilter, 1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, statusFilter, fetchOrders]);

  const tabs = [
    { key: 'ALL', label: 'All Orders' },
    { key: 'PENDING', label: 'Pending' },
    { key: 'PROCESSING', label: 'At Lab' },
    { key: 'READY_FOR_PICKUP', label: 'Ready for Pickup' },
    { key: 'DELIVERED', label: 'Delivered' },
    { key: 'OVERDUE', label: '⚠️ Overdue' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#202D2B]">Orders & Deliveries</h1>
          <p className="text-xs text-[#66746F] mt-0.5">Track spectacle orders from frame selection to customer delivery</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/quick-add')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#EBF3F1] hover:bg-[#DDEAE7] text-[#28766B] rounded-xl text-xs font-semibold border border-[#28766B]/20 transition"
          >
            <Zap className="w-4 h-4" />
            Quick Add Customer
          </button>
          <button
            onClick={() => navigate('/orders/new')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#28766B] hover:bg-[#1E5C53] text-white rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Create Order
          </button>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
        <div className="flex overflow-x-auto pb-1 gap-1 border-b md:border-b-0 border-[#E2E7E3]">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                statusFilter === tab.key
                  ? 'bg-[#28766B] text-white shadow-sm'
                  : 'text-[#66746F] hover:bg-[#F5F7F3]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#66746F]">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Order # or Customer..."
            className="w-full pl-9 pr-4 py-2 bg-[#FEFEFC] rounded-xl border border-[#E2E7E3] text-xs text-[#202D2B] placeholder:text-[#9AA8A3] focus:ring-2 focus:ring-[#28766B]/30 focus:border-[#28766B] focus:outline-none"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-[#FEFEFC] rounded-2xl border border-[#E2E7E3] shadow-sm overflow-hidden">
        {error ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center mx-auto text-rose-600">
              <AlertCircle className="w-6 h-6" />
            </div>
            <p className="text-[#202D2B] font-semibold text-sm">Failed to load orders</p>
            <p className="text-xs text-rose-700 max-w-md mx-auto">{error}</p>
            <button
              onClick={() => fetchOrders(search, statusFilter, meta.page || 1)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#28766B] hover:bg-[#1E5C53] text-white rounded-xl text-xs font-semibold transition shadow-xs mt-2"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        ) : loading ? (
          <SkeletonTable rows={6} cols={5} />
        ) : orders.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <p className="text-[#202D2B] font-semibold text-sm">No orders found in this queue</p>
            <p className="text-xs text-[#66746F]">Try selecting a different filter or create a new order.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F5F7F3] border-b border-[#E2E7E3] text-[#66746F] font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Order #</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Due Date</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Total</th>
                  <th className="px-5 py-3 text-right">Balance</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E7E3]">
                {orders.map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => navigate(`/orders/${o.id}`)}
                    className="hover:bg-[#F5F7F3] cursor-pointer transition"
                  >
                    <td className="px-5 py-3.5 tabular-nums font-bold text-[#28766B]">
                      {o.order_number}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-[#202D2B]">{o.customer_name}</div>
                      <div className="text-[11px] text-[#66746F] tabular-nums">{o.customer_phone || o.customer_code}</div>
                    </td>
                    <td className="px-5 py-3.5 text-xs">
                      <div className="flex items-center gap-1.5 text-[#202D2B] tabular-nums">
                        <Calendar className="w-3.5 h-3.5 text-[#66746F]" />
                        {new Date(o.due_date).toLocaleDateString()}
                      </div>
                      {o.is_overdue && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 mt-0.5">
                          <AlertTriangle className="w-3 h-3" /> Delayed
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <OrderStatusBadge status={o.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums font-bold text-[#202D2B]">
                      ₹{o.total_amount.toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums">
                      {o.balance_due > 0 ? (
                        <span className="text-amber-700 font-bold">₹{o.balance_due.toLocaleString()}</span>
                      ) : (
                        <span className="text-emerald-700 font-bold text-xs">Settled</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/orders/${o.id}`);
                        }}
                        className="p-1.5 text-[#28766B] hover:bg-[#EBF3F1] rounded-lg transition"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
