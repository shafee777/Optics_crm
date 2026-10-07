import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api.js';
import CustomerFormModal from './CustomerFormModal.jsx';
import AnnualRemindersTab from './AnnualRemindersTab.jsx';
import { SkeletonTable } from '../../components/common/Skeleton.jsx';
import { Search, UserPlus, Phone, Eye, UserCheck, Hash, Clock, Users, Edit2, AlertCircle, RotateCcw, Zap } from 'lucide-react';

export default function CustomersPage() {
  const [activeTab, setActiveTab] = useState('directory'); // 'directory' | 'reminders'
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [meta, setMeta] = useState({ page: 1, total: 0, totalPages: 1 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  const navigate = useNavigate();

  const fetchCustomers = useCallback(async (searchTerm = search, page = 1) => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/customers', {
        params: { search: searchTerm, page, limit: 10 },
      });
      setCustomers(response.data.data);
      setMeta(response.data.meta);
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError(err.response?.data?.error?.message || 'Failed to load customers. Please check your connection and try again.');
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
          <h1 className="text-xl font-bold text-[#202D2B]">Customer Directory</h1>
          <p className="text-xs text-[#66746F] mt-0.5">Search walk-in customers by Customer ID, phone, or name</p>
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
            onClick={() => {
              setEditingCustomer(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#28766B] hover:bg-[#1E5C53] text-white rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <UserPlus className="w-4 h-4" />
            Add Customer
          </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 border-b border-[#E2E7E3] pb-2">
        <button
          onClick={() => setActiveTab('directory')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'directory'
              ? 'bg-[#28766B] text-white shadow-sm'
              : 'bg-[#FEFEFC] text-[#66746F] hover:bg-[#F5F7F3] border border-[#E2E7E3]'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          Customer Directory
        </button>

        <button
          onClick={() => setActiveTab('reminders')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'reminders'
              ? 'bg-[#28766B] text-white shadow-sm'
              : 'bg-[#FEFEFC] text-[#66746F] hover:bg-[#F5F7F3] border border-[#E2E7E3]'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-amber-600" />
          1-Year Eye Test Recall Reminders
        </button>
      </div>

      {activeTab === 'reminders' ? (
        <AnnualRemindersTab />
      ) : (
        <>
          {/* Search Input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#66746F]">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Customer ID (e.g. CUST-1001), phone, or name..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#FEFEFC] rounded-xl border border-[#E2E7E3] text-xs text-[#202D2B] placeholder:text-[#9AA8A3] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#28766B]/30 focus:border-[#28766B] transition"
            />
          </div>

          {/* Customers Table */}
          <div className="bg-[#FEFEFC] rounded-2xl border border-[#E2E7E3] shadow-sm overflow-hidden">
        {error ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center mx-auto text-rose-600">
              <AlertCircle className="w-6 h-6" />
            </div>
            <p className="text-[#202D2B] font-semibold text-sm">Failed to load customer records</p>
            <p className="text-xs text-rose-700 max-w-md mx-auto">{error}</p>
            <button
              onClick={() => fetchCustomers(search, meta.page || 1)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#28766B] hover:bg-[#1E5C53] text-white rounded-xl text-xs font-semibold transition shadow-xs mt-2"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        ) : loading ? (
          <SkeletonTable rows={6} cols={5} />
        ) : customers.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#F5F7F3] flex items-center justify-center mx-auto text-[#66746F]">
              <UserCheck className="w-6 h-6" />
            </div>
            <p className="text-[#202D2B] font-semibold text-sm">No customers found</p>
            <p className="text-xs text-[#66746F]">Try searching a different ID/phone or add a new customer.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F5F7F3] border-b border-[#E2E7E3] text-[#66746F] font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Customer ID</th>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Phone</th>
                  <th className="px-5 py-3">Age / Gender</th>
                  <th className="px-5 py-3">Prescriptions</th>
                  <th className="px-5 py-3">Orders</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y border-t border-[#E2E7E3]">
                {customers.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/customers/${c.id}`)}
                    className="hover:bg-[#F5F7F3] cursor-pointer transition"
                  >
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#F5F7F3] text-[#202D2B] font-bold tabular-nums rounded-lg text-xs border border-[#E2E7E3]">
                        <Hash className="w-3 h-3 text-[#66746F]" />
                        {c.customer_code || '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-[#202D2B]">{c.full_name}</div>
                      {c.email && <div className="text-[11px] text-[#66746F]">{c.email}</div>}
                    </td>
                    <td className="px-5 py-3.5 tabular-nums text-[#202D2B]">
                      {c.phone ? (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-[#66746F]" />
                          {c.phone}
                        </div>
                      ) : (
                        <span className="text-[#9AA8A3] italic">No phone</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-[#66746F]">
                      {c.age ? `${c.age} yrs` : '—'} {c.gender ? `• ${c.gender}` : ''}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="px-2.5 py-0.5 bg-[#EBF3F1] text-[#28766B] font-semibold rounded-full text-[11px] border border-[#28766B]/20">
                        {c.prescription_count || 0} tests
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 font-semibold rounded-full text-[11px] border border-emerald-200">
                        {c.order_count || 0} orders
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCustomer(c);
                            setIsModalOpen(true);
                          }}
                          className="p-1.5 text-[#66746F] hover:text-[#28766B] hover:bg-[#EBF3F1] rounded-lg transition"
                          title="Edit Customer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/customers/${c.id}`);
                          }}
                          className="p-1.5 text-[#28766B] hover:bg-[#EBF3F1] rounded-lg transition"
                          title="View Profile"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </>
      )}

      {/* Customer Form Modal */}
      <CustomerFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingCustomer(null);
        }}
        customer={editingCustomer}
        onCustomerSaved={() => fetchCustomers(search, meta.page)}
        onCustomerCreated={() => fetchCustomers(search, 1)}
      />
    </div>
  );
}