import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api.js';
import CustomerFormModal from './CustomerFormModal.jsx';
import { Search, UserPlus, Phone, Eye, UserCheck, Hash } from 'lucide-react';

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ page: 1, total: 0, totalPages: 1 });
  const [isModalOpen, setIsModalOpen] = useState(false);

  const navigate = useNavigate();

  const fetchCustomers = useCallback(async (searchTerm = search, page = 1) => {
    setLoading(true);
    try {
      const response = await api.get('/customers', {
        params: { search: searchTerm, page, limit: 10 },
      });
      setCustomers(response.data.data);
      setMeta(response.data.meta);
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers(search, 1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, fetchCustomers]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customer Directory</h1>
          <p className="text-sm text-slate-500">Search walk-in customers by Customer ID, phone, or name</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium shadow-md shadow-indigo-600/20 transition"
        >
          <UserPlus className="w-4 h-4" />
          Add Customer
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <Search className="w-5 h-5" />
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by Customer ID (e.g. CUST-1001), phone, or name..."
          className="w-full pl-10 pr-4 py-3 bg-white rounded-xl border border-slate-200 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
        />
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading customers...</div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <UserCheck className="w-6 h-6" />
            </div>
            <p className="text-slate-600 font-medium text-sm">No customers found</p>
            <p className="text-xs text-slate-400">Try searching a different ID/phone or add a new customer.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Customer ID</th>
                  <th className="px-6 py-3.5">Name</th>
                  <th className="px-6 py-3.5">Phone</th>
                  <th className="px-6 py-3.5">Age / Gender</th>
                  <th className="px-6 py-3.5">Prescriptions</th>
                  <th className="px-6 py-3.5">Orders</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/customers/${c.id}`)}
                    className="hover:bg-slate-50/80 cursor-pointer transition"
                  >
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-800 font-mono font-bold rounded-lg text-xs border border-slate-200">
                        <Hash className="w-3 h-3 text-slate-400" />
                        {c.customer_code || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{c.full_name}</div>
                      {c.email && <div className="text-xs text-slate-400">{c.email}</div>}
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-700">
                      {c.phone ? (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          {c.phone}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs italic">No phone</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {c.age ? `${c.age} yrs` : '—'} {c.gender ? `• ${c.gender}` : ''}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-blue-50 text-blue-700 font-medium rounded-full text-xs">
                        {c.prescription_count || 0} tests
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-medium rounded-full text-xs">
                        {c.order_count || 0} orders
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/customers/${c.id}`);
                        }}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                        title="View Profile"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Customer Form Modal */}
      <CustomerFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCustomerCreated={() => fetchCustomers(search, 1)}
      />
    </div>
  );
}