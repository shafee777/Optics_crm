import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api.js';
import CustomerFormModal from './CustomerFormModal.jsx';
import AnnualRemindersTab from './AnnualRemindersTab.jsx';
import BroadcastModal from './BroadcastModal.jsx';
import BulkTagModal from './BulkTagModal.jsx';
import { SkeletonTable } from '../../components/common/Skeleton.jsx';
import { 
  Search, 
  UserPlus, 
  Phone, 
  Eye, 
  UserCheck, 
  Hash, 
  Clock, 
  Users, 
  Edit2, 
  AlertCircle, 
  RotateCcw, 
  Zap,
  Filter,
  X,
  MessageSquare,
  Tag,
  ArrowUpDown,
  Calendar,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  CheckSquare,
  Square,
  ShoppingBag,
  Send
} from 'lucide-react';

const QUICK_FILTERS = [
  { id: 'ALL', label: 'All Customers' },
  { id: 'VIP', label: '⭐ VIP / High Spenders' },
  { id: 'PENDING_BALANCE', label: '⚠️ Pending Balance' },
  { id: 'DUE_EYE_TEST', label: '🩺 1-Yr Eye Test Due' },
  { id: 'NEW_THIS_MONTH', label: '✨ New This Month' },
  { id: 'REPEAT', label: '🔁 Repeat (2+ Orders)' },
  { id: 'INACTIVE_6M', label: '💤 Inactive (6+ Mos)' },
];

const AVAILABLE_TAGS = [
  'VIP',
  'Progressive',
  'Single Vision',
  'Bifocal',
  'Contact Lens',
  'Kids Eyewear',
  'Senior Citizen',
  'Corporate',
];

export default function CustomersPage() {
  const [activeTab, setActiveTab] = useState('directory'); // 'directory' | 'reminders'
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [meta, setMeta] = useState({ page: 1, total: 0, totalPages: 1, limit: 10 });
  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(1);

  // Filters & Sorting state
  const [segment, setSegment] = useState('ALL');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [hasBalanceOnly, setHasBalanceOnly] = useState(false);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [isBulkTagOpen, setIsBulkTagOpen] = useState(false);

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState([]);

  const navigate = useNavigate();

  const fetchCustomers = useCallback(async (targetPage = page) => {
    setLoading(true);
    setError('');
    try {
      const params = {
        search: search.trim() || undefined,
        page: targetPage,
        limit,
        segment: segment !== 'ALL' ? segment : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        tag: selectedTag || undefined,
        hasBalance: hasBalanceOnly ? 'true' : undefined,
        sortBy,
        sortOrder,
      };

      const response = await api.get('/customers', { params });
      setCustomers(response.data.data || []);
      setMeta(response.data.meta || { page: targetPage, total: 0, totalPages: 1, limit });
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError(err.response?.data?.error?.message || 'Failed to load customers. Please check connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [search, page, limit, segment, startDate, endDate, selectedTag, hasBalanceOnly, sortBy, sortOrder]);

  // Debounced search / filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers(1);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search, segment, startDate, endDate, selectedTag, hasBalanceOnly, sortBy, sortOrder, limit]);

  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > meta.totalPages) return;
    setPage(newPage);
    fetchCustomers(newPage);
  };

  // Checkbox handling
  const allOnPageSelected = useMemo(() => {
    if (customers.length === 0) return false;
    return customers.every((c) => selectedIds.includes(c.id));
  }, [customers, selectedIds]);

  const toggleSelectAll = () => {
    if (allOnPageSelected) {
      const pageIds = new Set(customers.map((c) => c.id));
      setSelectedIds((prev) => prev.filter((id) => !pageIds.has(id)));
    } else {
      const newIds = new Set([...selectedIds, ...customers.map((c) => c.id)]);
      setSelectedIds(Array.from(newIds));
    }
  };

  const toggleSelectCustomer = (customerId) => {
    setSelectedIds((prev) =>
      prev.includes(customerId) ? prev.filter((id) => id !== customerId) : [...prev, customerId]
    );
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const selectedCustomersList = useMemo(() => {
    return customers.filter((c) => selectedIds.includes(c.id));
  }, [customers, selectedIds]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (segment !== 'ALL') count++;
    if (startDate || endDate) count++;
    if (selectedTag) count++;
    if (hasBalanceOnly) count++;
    if (sortBy !== 'created_at') count++;
    return count;
  }, [segment, startDate, endDate, selectedTag, hasBalanceOnly, sortBy]);

  const resetAllFilters = () => {
    setSegment('ALL');
    setStartDate('');
    setEndDate('');
    setSelectedTag('');
    setHasBalanceOnly(false);
    setSortBy('created_at');
    setSortOrder('desc');
    setSearch('');
  };

  const handleOpenDirectWhatsApp = (e, customer) => {
    e.stopPropagation();
    if (!customer.phone) return;
    let clean = customer.phone.replace(/[^0-9]/g, '');
    if (clean.length === 10) clean = '91' + clean;
    const msg = `Hello ${customer.full_name || 'there'}! Greetings from Optics Store.`;
    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-5 pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#202D2B]">Customer Directory &amp; Marketing</h1>
          <p className="text-xs text-[#66746F] mt-0.5">
            Manage customer records, track spend, and broadcast WhatsApp offers to selected groups
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/quick-add')}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-[#EBF3F1] hover:bg-[#DDEAE7] text-[#28766B] rounded-xl text-xs font-semibold border border-[#28766B]/20 transition shadow-xs"
          >
            <Zap className="w-4 h-4" />
            Quick Add Customer
          </button>
          <button
            onClick={() => {
              setEditingCustomer(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#28766B] hover:bg-[#1E5C53] text-white rounded-xl text-xs font-semibold shadow-xs transition"
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
              ? 'bg-[#28766B] text-white shadow-xs'
              : 'bg-[#FEFEFC] text-[#66746F] hover:bg-[#F5F7F3] border border-[#E2E7E3]'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          Customer Directory ({meta.total || 0})
        </button>

        <button
          onClick={() => setActiveTab('reminders')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'reminders'
              ? 'bg-[#28766B] text-white shadow-xs'
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
          {/* Quick Filter Pills (Horizontal Scrollable) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {QUICK_FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setSegment(f.id)}
                className={`whitespace-nowrap px-3.5 py-1.5 rounded-xl text-xs font-semibold transition border ${
                  segment === f.id
                    ? 'bg-[#203A36] text-white border-[#203A36] shadow-xs'
                    : 'bg-white text-[#66746F] border-[#E2E7E3] hover:bg-[#F5F7F3] hover:text-[#202D2B]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Search Bar & Advanced Filter Toggle */}
          <div className="bg-[#FEFEFC] p-4 rounded-2xl border border-[#E2E7E3] shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#66746F]">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by Customer ID (e.g. CUST-1001), phone, full name, or email..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-[#E2E7E3] text-xs text-[#202D2B] placeholder:text-[#9AA8A3] focus:outline-none focus:ring-2 focus:ring-[#28766B]/30 focus:border-[#28766B] transition"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#9AA8A3] hover:text-[#202D2B]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className={`px-3.5 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition ${
                    showAdvancedFilters || activeFilterCount > 0
                      ? 'bg-[#EBF3F1] border-[#28766B]/30 text-[#28766B]'
                      : 'bg-white border-[#E2E7E3] text-[#66746F] hover:bg-[#F5F7F3]'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>Filters</span>
                  {activeFilterCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-[#28766B] text-white text-[10px] font-bold flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={resetAllFilters}
                    className="px-3 py-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition"
                    title="Clear all filters"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Collapsible Advanced Filters Bar */}
            {showAdvancedFilters && (
              <div className="pt-3 border-t border-[#E2E7E3] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                {/* Registered Date Range */}
                <div>
                  <label className="block text-[11px] font-bold text-[#66746F] uppercase tracking-wider mb-1">
                    Registered From
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#E2E7E3] bg-white text-xs text-[#202D2B] focus:outline-none focus:ring-1 focus:ring-[#28766B]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#66746F] uppercase tracking-wider mb-1">
                    Registered To
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#E2E7E3] bg-white text-xs text-[#202D2B] focus:outline-none focus:ring-1 focus:ring-[#28766B]"
                  />
                </div>

                {/* Filter by Tag */}
                <div>
                  <label className="block text-[11px] font-bold text-[#66746F] uppercase tracking-wider mb-1">
                    Filter by Tag
                  </label>
                  <select
                    value={selectedTag}
                    onChange={(e) => setSelectedTag(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#E2E7E3] bg-white text-xs text-[#202D2B] focus:outline-none focus:ring-1 focus:ring-[#28766B]"
                  >
                    <option value="">All Tags</option>
                    {AVAILABLE_TAGS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* Sort By */}
                <div>
                  <label className="block text-[11px] font-bold text-[#66746F] uppercase tracking-wider mb-1">
                    Sort By
                  </label>
                  <div className="flex gap-1.5">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 rounded-lg border border-[#E2E7E3] bg-white text-xs text-[#202D2B] focus:outline-none focus:ring-1 focus:ring-[#28766B]"
                    >
                      <option value="created_at">Joined Date</option>
                      <option value="total_spend">Total Spend (₹)</option>
                      <option value="balance_due">Balance Due (₹)</option>
                      <option value="last_order_date">Last Visit Date</option>
                      <option value="full_name">Customer Name</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                      className="px-2 py-1.5 border border-[#E2E7E3] bg-white rounded-lg hover:bg-[#F5F7F3] font-bold text-[11px] text-[#202D2B]"
                      title={`Toggle ${sortOrder.toUpperCase()}`}
                    >
                      {sortOrder.toUpperCase()}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Customers Table Container */}
          <div className="bg-[#FEFEFC] rounded-2xl border border-[#E2E7E3] shadow-xs overflow-hidden">
            {error ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center mx-auto text-rose-600">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <p className="text-[#202D2B] font-semibold text-sm">Failed to load customer records</p>
                <p className="text-xs text-rose-700 max-w-md mx-auto">{error}</p>
                <button
                  onClick={() => fetchCustomers(meta.page || 1)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#28766B] hover:bg-[#1E5C53] text-white rounded-xl text-xs font-semibold transition shadow-xs mt-2"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Retry
                </button>
              </div>
            ) : loading ? (
              <SkeletonTable rows={8} cols={7} />
            ) : customers.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#F5F7F3] flex items-center justify-center mx-auto text-[#66746F]">
                  <UserCheck className="w-6 h-6" />
                </div>
                <p className="text-[#202D2B] font-semibold text-sm">No matching customers found</p>
                <p className="text-xs text-[#66746F]">Try adjusting your search keywords, quick filters, or date range.</p>
                {activeFilterCount > 0 && (
                  <button
                    onClick={resetAllFilters}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#EBF3F1] text-[#28766B] rounded-xl text-xs font-semibold mt-2"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F5F7F3] border-b border-[#E2E7E3] text-[#66746F] font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="w-10 px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={toggleSelectAll}
                          className="text-[#66746F] hover:text-[#28766B] transition"
                          title={allOnPageSelected ? 'Deselect all on this page' : 'Select all on this page'}
                        >
                          {allOnPageSelected ? (
                            <CheckSquare className="w-4 h-4 text-[#28766B]" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </th>
                      <th className="px-4 py-3">Customer Info</th>
                      <th className="px-4 py-3">Phone &amp; WA</th>
                      <th className="px-4 py-3">Tags &amp; Category</th>
                      <th className="px-4 py-3">Orders &amp; Total Spend</th>
                      <th className="px-4 py-3">Balance Due</th>
                      <th className="px-4 py-3">Prescriptions</th>
                      <th className="px-4 py-3">Last Visit</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E7E3]">
                    {customers.map((c) => {
                      const isSelected = selectedIds.includes(c.id);
                      const totalSpendNum = parseFloat(c.total_spend || 0);
                      const balanceDueNum = parseFloat(c.balance_due || 0);
                      const isVip = c.category === 'VIP' || totalSpendNum >= 5000;

                      return (
                        <tr
                          key={c.id}
                          onClick={() => navigate(`/customers/${c.id}`)}
                          className={`hover:bg-[#F5F7F3]/70 cursor-pointer transition ${
                            isSelected ? 'bg-[#EBF3F1]/40' : ''
                          }`}
                        >
                          {/* Checkbox */}
                          <td 
                            className="px-4 py-3.5 text-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => toggleSelectCustomer(c.id)}
                              className="text-[#66746F] hover:text-[#28766B] transition"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-[#28766B]" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          </td>

                          {/* Customer Info */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[#202D2B] text-xs">
                                {c.full_name}
                              </span>
                              {isVip && (
                                <span className="px-1.5 py-0.2 bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[9px] rounded-md">
                                  VIP
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-[#66746F] mt-0.5">
                              <span className="font-mono">{c.customer_code || '—'}</span>
                              {c.gender && <span>• {c.gender}</span>}
                              {c.age && <span>• {c.age}y</span>}
                            </div>
                          </td>

                          {/* Phone & Direct WA */}
                          <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                            {c.phone ? (
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-[#202D2B] font-medium">{c.phone}</span>
                                <button
                                  type="button"
                                  onClick={(e) => handleOpenDirectWhatsApp(e, c)}
                                  title="Open WhatsApp chat"
                                  className="p-1 rounded-md text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-[#9AA8A3] italic">No phone</span>
                            )}
                          </td>

                          {/* Tags & Category */}
                          <td className="px-4 py-3.5">
                            <div className="flex flex-wrap gap-1 max-w-[160px]">
                              {c.category && c.category !== 'REGULAR' && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#203A36] text-white">
                                  {c.category}
                                </span>
                              )}
                              {(c.tags || []).slice(0, 2).map((t, i) => (
                                <span
                                  key={i}
                                  className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-[#EBF3F1] text-[#28766B] border border-[#28766B]/20"
                                >
                                  {t}
                                </span>
                              ))}
                              {(c.tags || []).length > 2 && (
                                <span className="px-1 py-0.5 text-[10px] text-[#66746F]">
                                  +{(c.tags.length - 2)}
                                </span>
                              )}
                              {(!c.tags || c.tags.length === 0) && (!c.category || c.category === 'REGULAR') && (
                                <span className="text-[#9AA8A3] text-[11px]">—</span>
                              )}
                            </div>
                          </td>

                          {/* Orders & Total Spend */}
                          <td className="px-4 py-3.5 tabular-nums">
                            <div className="font-bold text-[#202D2B]">
                              ₹{totalSpendNum.toLocaleString('en-IN')}
                            </div>
                            <div className="text-[11px] text-[#66746F]">
                              {c.order_count || 0} order(s)
                            </div>
                          </td>

                          {/* Balance Due */}
                          <td className="px-4 py-3.5 tabular-nums">
                            {balanceDueNum > 0 ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                                ₹{balanceDueNum.toLocaleString('en-IN')}
                              </span>
                            ) : (
                              <span className="text-[#9AA8A3] font-medium text-[11px]">₹0 (Paid)</span>
                            )}
                          </td>

                          {/* Prescriptions */}
                          <td className="px-4 py-3.5 tabular-nums">
                            <span className="px-2 py-0.5 rounded-md bg-[#F5F7F3] text-[#202D2B] font-semibold text-[11px] border border-[#E2E7E3]">
                              {c.prescription_count || 0} test(s)
                            </span>
                          </td>

                          {/* Last Visit */}
                          <td className="px-4 py-3.5 text-[#66746F] tabular-nums text-[11px]">
                            {c.last_order_date
                              ? new Date(c.last_order_date).toLocaleDateString('en-IN')
                              : c.created_at
                              ? new Date(c.created_at).toLocaleDateString('en-IN')
                              : '—'}
                          </td>

                          {/* Action Buttons */}
                          <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => navigate(`/quick-add?customerId=${c.id}`)}
                                className="p-1.5 rounded-lg text-[#28766B] hover:bg-[#EBF3F1] transition"
                                title="Create Order / Prescription"
                              >
                                <ShoppingBag className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCustomer(c);
                                  setIsModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-[#66746F] hover:text-[#202D2B] hover:bg-[#F5F7F3] transition"
                                title="Edit Customer"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => navigate(`/customers/${c.id}`)}
                                className="p-1.5 rounded-lg text-[#28766B] hover:bg-[#EBF3F1] transition"
                                title="View Customer Full Profile"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls Footer */}
            {!loading && customers.length > 0 && (
              <div className="p-4 border-t border-[#E2E7E3] bg-[#FEFEFC] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#66746F]">
                <div className="flex items-center gap-2">
                  <span>
                    Showing <strong>{((meta.page - 1) * meta.limit) + 1}</strong> to{' '}
                    <strong>{Math.min(meta.page * meta.limit, meta.total)}</strong> of{' '}
                    <strong>{meta.total}</strong> customers
                  </span>
                  <span className="hidden sm:inline">•</span>
                  <div className="hidden sm:flex items-center gap-1.5">
                    <span>Rows:</span>
                    <select
                      value={limit}
                      onChange={(e) => setLimit(Number(e.target.value))}
                      className="px-2 py-1 rounded-md border border-[#E2E7E3] bg-white text-xs text-[#202D2B]"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={meta.page <= 1}
                    onClick={() => handlePageChange(meta.page - 1)}
                    className="p-1.5 rounded-lg border border-[#E2E7E3] text-[#202D2B] hover:bg-[#F5F7F3] disabled:opacity-40 transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-3 py-1 font-semibold text-[#202D2B]">
                    Page {meta.page} of {meta.totalPages || 1}
                  </span>
                  <button
                    type="button"
                    disabled={meta.page >= meta.totalPages}
                    onClick={() => handlePageChange(meta.page + 1)}
                    className="p-1.5 rounded-lg border border-[#E2E7E3] text-[#202D2B] hover:bg-[#F5F7F3] disabled:opacity-40 transition"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Floating Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40 bg-[#203A36] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-4 border border-white/20 animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#28766B] flex items-center justify-center font-bold text-xs text-white">
              {selectedIds.length}
            </span>
            <span className="text-xs font-semibold">Customers Selected</span>
          </div>

          <div className="h-4 w-px bg-white/20" />

          <button
            type="button"
            onClick={() => setIsBroadcastOpen(true)}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            WhatsApp Broadcast
          </button>

          <button
            type="button"
            onClick={() => setIsBulkTagOpen(true)}
            className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs rounded-xl transition flex items-center gap-1.5"
          >
            <Tag className="w-3.5 h-3.5" />
            Assign Tags
          </button>

          <button
            type="button"
            onClick={clearSelection}
            className="p-1 text-white/70 hover:text-white transition"
            title="Clear selection"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* WhatsApp Broadcast Modal */}
      <BroadcastModal
        isOpen={isBroadcastOpen}
        onClose={() => setIsBroadcastOpen(false)}
        selectedCustomers={selectedCustomersList}
        onBroadcastFinished={() => {
          clearSelection();
          fetchCustomers(meta.page);
        }}
      />

      {/* Bulk Tag Modal */}
      <BulkTagModal
        isOpen={isBulkTagOpen}
        onClose={() => setIsBulkTagOpen(false)}
        selectedCustomerIds={selectedIds}
        onTagsUpdated={() => {
          clearSelection();
          fetchCustomers(meta.page);
        }}
      />

      {/* Customer Form Modal */}
      <CustomerFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingCustomer(null);
        }}
        customer={editingCustomer}
        onCustomerSaved={() => fetchCustomers(meta.page)}
        onCustomerCreated={() => fetchCustomers(1)}
      />
    </div>
  );
}