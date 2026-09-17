import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api.js';
import OrderStatusBadge from './OrderStatusBadge.jsx';
import { Search, Plus, Calendar, AlertTriangle, ArrowRight } from 'lucide-react';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ page: 1, total: 0, totalPages: 1 });

  const navigate = useNavigate();

  const fetchOrders = useCallback(async (searchTerm = search, status = statusFilter, page = 1) => {
    setLoading(true);
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
          <h1 className="text-2xl font-bold text-slate-900">Orders & Deliveries</h1>
          <p className="text-sm text-slate-500">Track spectacle orders from frame selection to customer delivery</p>
        </div>
        <button
          onClick={() => navigate('/orders/new')}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-600/20 transition"
        >
          <Plus className="w-4 h-4" />
          Create Order
        </button>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
        <div className="flex overflow-x-auto pb-1 gap-1 border-b md:border-b-0 border-slate-200">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                statusFilter === tab.key
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Order # or Customer..."
            className="w-full pl-9 pr-4 py-2 bg-white rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <p className="text-slate-600 font-medium text-sm">No orders found in this queue</p>
            <p className="text-xs text-slate-400">Try selecting a different filter or create a new order.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Order #</th>
                  <th className="px-6 py-3.5">Customer</th>
                  <th className="px-6 py-3.5">Due Date</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Total</th>
                  <th className="px-6 py-3.5 text-right">Balance</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => navigate(`/orders/${o.id}`)}
                    className="hover:bg-slate-50/80 cursor-pointer transition"
                  >
                    <td className="px-6 py-4 font-mono font-bold text-indigo-600">
                      {o.order_number}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{o.customer_name}</div>
                      <div className="text-xs text-slate-400 font-mono">{o.customer_phone || o.customer_code}</div>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(o.due_date).toLocaleDateString()}
                      </div>
                      {o.is_overdue && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 mt-0.5">
                          <AlertTriangle className="w-3 h-3" /> Delayed
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <OrderStatusBadge status={o.status} />
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-slate-900">
                      ₹{o.total_amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right font-mono">
                      {o.balance_due > 0 ? (
                        <span className="text-amber-600 font-bold">₹{o.balance_due.toLocaleString()}</span>
                      ) : (
                        <span className="text-emerald-600 font-bold text-xs">Settled</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/orders/${o.id}`);
                        }}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
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
