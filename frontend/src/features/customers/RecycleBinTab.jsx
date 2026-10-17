import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api.js';
import { Trash2, RotateCcw, AlertCircle, Users, ShieldOff, Clock, Info, Search, IndianRupee } from 'lucide-react';

/**
 * RecycleBinTab — OWNER-only view of soft-deleted customers.
 * Displays customer code, name, phone, archive date, orders, prescriptions, total spend, and balance due.
 * Provides Restore and Permanent Delete actions with strict safeguards.
 */
export default function RecycleBinTab() {
  const navigate = useNavigate();
  const [archivedCustomers, setArchivedCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState('success'); // 'success' | 'error'
  const [search, setSearch] = useState('');

  // Confirmation modal state
  const [confirmCustomer, setConfirmCustomer] = useState(null); // customer to permanently delete
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmError, setConfirmError] = useState('');

  // Restore loading state per customer
  const [restoringId, setRestoringId] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToastMsg(msg);
    setToastType(type);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const fetchBin = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/customers/bin/list');
      setArchivedCustomers(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load Recycle Bin.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBin();
  }, [fetchBin]);

  const filteredCustomers = useMemo(() => {
    if (!search.trim()) return archivedCustomers;
    const q = search.trim().toLowerCase();
    return archivedCustomers.filter((c) =>
      c.full_name?.toLowerCase().includes(q) ||
      c.customer_code?.toLowerCase().includes(q) ||
      c.phone?.includes(q)
    );
  }, [archivedCustomers, search]);

  const handleRestore = async (customer) => {
    setRestoringId(customer.id);
    try {
      await api.post(`/customers/bin/${customer.id}/restore`);
      showToast(`✅ "${customer.full_name}" has been restored to the active directory.`);
      setArchivedCustomers((prev) => prev.filter((c) => c.id !== customer.id));
    } catch (err) {
      showToast(err.response?.data?.error?.message || 'Failed to restore customer.', 'error');
    } finally {
      setRestoringId(null);
    }
  };

  const handlePermanentDeleteConfirm = async () => {
    if (!confirmCustomer) return;
    setConfirmLoading(true);
    setConfirmError('');
    try {
      await api.delete(`/customers/bin/${confirmCustomer.id}/permanent`);
      showToast(`🗑️ "${confirmCustomer.full_name}" has been permanently deleted.`);
      setArchivedCustomers((prev) => prev.filter((c) => c.id !== confirmCustomer.id));
      setConfirmCustomer(null);
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to permanently delete customer.';
      setConfirmError(msg);
    } finally {
      setConfirmLoading(false);
    }
  };

  const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  const fmtCurrency = (val) => {
    const num = parseFloat(val || 0);
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-4">
      {/* Header Info Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
        <Info className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-amber-800">
          <p className="font-bold mb-0.5">Admin — Recycle Bin</p>
          <p>
            Archived customers are moved here. You can <strong>restore</strong> them at any time or{' '}
            <strong>permanently delete</strong> records that have no historical orders, prescriptions, or payments.
            Financial history is always preserved.
          </p>
        </div>
      </div>

      {/* Search & Stats Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#66746F] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search bin by name, customer code, or mobile..."
            className="w-full pl-9 pr-4 py-2 bg-[#FEFEFC] border border-[#E2E7E3] rounded-xl text-xs text-[#202D2B] placeholder-[#9AA8A3] focus:outline-none focus:ring-1 focus:ring-[#28766B]"
          />
        </div>
        <div className="text-xs text-[#66746F] flex items-center gap-2 self-end sm:self-center">
          <span>{filteredCustomers.length} archived record{filteredCustomers.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Toast */}
      {toastMsg && (
        <div
          className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-2xl shadow-xl text-white text-xs font-semibold flex items-center gap-2 transition-all animate-fade-in ${
            toastType === 'error' ? 'bg-rose-600' : 'bg-[#28766B]'
          }`}
        >
          {toastMsg}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="bg-[#FEFEFC] rounded-2xl border border-[#E2E7E3] p-12 text-center text-xs text-[#66746F]">
          Loading archived customers…
        </div>
      ) : error ? (
        <div className="bg-[#FEFEFC] rounded-2xl border border-rose-200 p-10 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
          <p className="text-sm font-semibold text-[#202D2B]">Failed to load Recycle Bin</p>
          <p className="text-xs text-rose-700">{error}</p>
          <button
            onClick={fetchBin}
            className="px-4 py-2 bg-[#28766B] text-white text-xs font-semibold rounded-xl"
          >
            Retry
          </button>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="bg-[#FEFEFC] rounded-2xl border border-[#E2E7E3] p-14 text-center space-y-3">
          <div className="w-12 h-12 bg-[#F5F7F3] rounded-full flex items-center justify-center mx-auto">
            <Users className="w-6 h-6 text-[#66746F]" />
          </div>
          <p className="font-semibold text-sm text-[#202D2B]">
            {search ? 'No archived customers match your search' : 'Recycle Bin is empty'}
          </p>
          <p className="text-xs text-[#66746F]">
            {search ? 'Try clearing or changing your search keywords.' : 'Customers moved to the bin will appear here.'}
          </p>
        </div>
      ) : (
        <div className="bg-[#FEFEFC] rounded-2xl border border-[#E2E7E3] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F5F7F3] border-b border-[#E2E7E3] text-[#66746F] uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Archived On</th>
                  <th className="px-4 py-3 text-center">Orders</th>
                  <th className="px-4 py-3 text-center">Rx Tests</th>
                  <th className="px-4 py-3 text-right">Total Spend</th>
                  <th className="px-4 py-3 text-right">Balance Due</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E7E3]">
                {filteredCustomers.map((c) => {
                  const hasDeps =
                    c.order_count > 0 ||
                    c.prescription_count > 0 ||
                    parseFloat(c.total_spend || 0) > 0 ||
                    parseFloat(c.balance_due || 0) > 0;
                  return (
                    <tr key={c.id} className="hover:bg-[#F5F7F3]/60 transition">
                      {/* Customer Info */}
                      <td className="px-4 py-3.5">
                        <button
                          type="button"
                          onClick={() => navigate(`/customers/${c.id}`)}
                          className="text-left group"
                          title="View customer profile and historical records"
                        >
                          <div className="font-bold text-[#202D2B] group-hover:text-[#28766B] transition">
                            {c.full_name}
                          </div>
                          <div className="text-[11px] text-[#66746F] font-mono">{c.customer_code}</div>
                        </button>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-[#202D2B]">{c.phone || '—'}</td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
                          <Clock className="w-3 h-3" />
                          {fmtDate(c.archived_at)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center tabular-nums">
                        {c.order_count > 0 ? (
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 font-semibold text-[11px]">
                            {c.order_count} order{c.order_count !== 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="text-[#9AA8A3]">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center tabular-nums">
                        {c.prescription_count > 0 ? (
                          <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-200 font-semibold text-[11px]">
                            {c.prescription_count} test{c.prescription_count !== 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="text-[#9AA8A3]">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-[#202D2B]">
                        {fmtCurrency(c.total_spend)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono">
                        {parseFloat(c.balance_due || 0) > 0 ? (
                          <span className="text-rose-600 font-bold">{fmtCurrency(c.balance_due)}</span>
                        ) : (
                          <span className="text-[#66746F]">₹0</span>
                        )}
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Restore */}
                          <button
                            type="button"
                            disabled={restoringId === c.id}
                            onClick={() => handleRestore(c)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#EBF3F1] hover:bg-[#DDEAE7] text-[#28766B] text-xs font-semibold rounded-xl border border-[#28766B]/20 transition disabled:opacity-50"
                            title="Restore this customer to the active directory"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            {restoringId === c.id ? 'Restoring…' : 'Restore'}
                          </button>

                          {/* Permanent Delete */}
                          {hasDeps ? (
                            <span
                              title="Cannot permanently delete — customer has historical orders, prescriptions, or financial ledger records. Keep archived."
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#9AA8A3] bg-[#F5F7F3] rounded-xl border border-[#E2E7E3] cursor-not-allowed"
                            >
                              <ShieldOff className="w-3.5 h-3.5" />
                              Protected
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmCustomer(c);
                                setConfirmError('');
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-xl border border-rose-200 transition"
                              title="Permanently delete this customer record — cannot be undone"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Delete Forever
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 border-t border-[#E2E7E3] text-xs text-[#66746F] flex items-center justify-between">
            <span>
              Showing {filteredCustomers.length} of {archivedCustomers.length} archived record{archivedCustomers.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}

      {/* ─── Permanent Delete Confirmation Modal ─────────────────────────────── */}
      {confirmCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#E2E7E3] w-full max-w-md p-6 space-y-5 animate-fade-in">
            {/* Warning Icon */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#202D2B]">Permanently Delete Customer?</h2>
                <p className="text-xs text-[#66746F]">This action cannot be undone.</p>
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800">
              You are about to permanently delete{' '}
              <strong>
                {confirmCustomer.full_name} ({confirmCustomer.customer_code})
              </strong>
              . This customer has no orders, prescriptions, or financial records. All profile data will be permanently removed.
            </div>

            {confirmError && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{confirmError}</span>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                disabled={confirmLoading}
                onClick={() => {
                  setConfirmCustomer(null);
                  setConfirmError('');
                }}
                className="px-4 py-2 border border-[#E2E7E3] text-[#66746F] hover:bg-[#F5F7F3] rounded-xl text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={confirmLoading}
                onClick={handlePermanentDeleteConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-60"
              >
                {confirmLoading ? 'Deleting…' : 'Yes, Delete Forever'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
