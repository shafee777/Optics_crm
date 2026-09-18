import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api.js';
import { useAuth } from '../auth/AuthContext.jsx';
import AddStaffModal from './AddStaffModal.jsx';
import ResetPasswordModal from './ResetPasswordModal.jsx';
import { 
  Store, 
  Users, 
  Save, 
  ExternalLink, 
  UserPlus, 
  KeyRound, 
  UserCheck, 
  UserX, 
  CheckCircle2, 
  AlertCircle,
  Phone,
  MapPin,
  Star,
  Shield,
  Clock,
  Download,
  Database
} from 'lucide-react';

export default function SettingsPage() {
  const { user, isOwner, updateStore } = useAuth();

  const [activeTab, setActiveTab] = useState('store'); // 'store' | 'staff'

  // Store form state
  const [storeData, setStoreData] = useState({
    name: '',
    phone: '',
    address: '',
    googleReviewLink: '',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
  });
  const [loadingStore, setLoadingStore] = useState(true);
  const [savingStore, setSavingStore] = useState(false);
  const [storeMessage, setStoreMessage] = useState(null);

  // Staff state
  const [staffList, setStaffList] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [staffError, setStaffError] = useState('');
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [resetTargetUser, setResetTargetUser] = useState(null);

  // 1. Fetch Store Profile
  const fetchStore = useCallback(async () => {
    setLoadingStore(true);
    try {
      const res = await api.get('/stores/current');
      const s = res.data.data;
      setStoreData({
        name: s.name || '',
        phone: s.phone || '',
        address: s.address || '',
        googleReviewLink: s.googleReviewLink || '',
        currency: s.currency || 'INR',
        timezone: s.timezone || 'Asia/Kolkata',
      });
    } catch (err) {
      console.error('Failed to load store settings:', err);
    } finally {
      setLoadingStore(false);
    }
  }, []);

  // 2. Fetch Staff Members (Owner only)
  const fetchStaff = useCallback(async () => {
    if (!isOwner) return;
    setLoadingStaff(true);
    setStaffError('');
    try {
      const res = await api.get('/users');
      setStaffList(res.data.data);
    } catch (err) {
      setStaffError(err.response?.data?.error?.message || 'Failed to load team members');
    } finally {
      setLoadingStaff(false);
    }
  }, [isOwner]);

  useEffect(() => {
    fetchStore();
    if (isOwner) {
      fetchStaff();
    }
  }, [fetchStore, fetchStaff, isOwner]);

  // Handle store form submit
  const handleSaveStore = async (e) => {
    e.preventDefault();
    if (!isOwner) return;

    setSavingStore(true);
    setStoreMessage(null);

    try {
      const res = await api.patch('/stores/current', storeData);
      setStoreMessage({ type: 'success', text: 'Store details updated successfully!' });
      
      // Update global context so headers, invoices, etc. update immediately
      updateStore({
        name: res.data.data.name,
        phone: res.data.data.phone,
        address: res.data.data.address,
        googleReviewLink: res.data.data.googleReviewLink,
        google_review_link: res.data.data.googleReviewLink,
        currency: res.data.data.currency,
        timezone: res.data.data.timezone,
      });

      setTimeout(() => setStoreMessage(null), 5000);
    } catch (err) {
      setStoreMessage({
        type: 'error',
        text: err.response?.data?.error?.message || 'Failed to update store settings',
      });
    } finally {
      setSavingStore(false);
    }
  };

  // Toggle staff active / inactive
  const handleToggleStatus = async (staffMember) => {
    const newActiveState = !staffMember.active;
    const actionLabel = newActiveState ? 'activate' : 'deactivate';

    if (!window.confirm(`Are you sure you want to ${actionLabel} ${staffMember.full_name}?`)) {
      return;
    }

    try {
      const res = await api.patch(`/users/${staffMember.id}/status`, {
        active: newActiveState,
      });

      setStaffList((prev) =>
        prev.map((u) => (u.id === staffMember.id ? { ...u, active: res.data.data.active } : u))
      );
    } catch (err) {
      alert(err.response?.data?.error?.message || `Failed to ${actionLabel} staff`);
    }
  };

  const handleStaffAdded = (newUser) => {
    setStaffList((prev) => [newUser, ...prev]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Store className="w-6 h-6 text-indigo-600" />
            Store Settings & Team
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure your optical dispensary profile, Google review link, and staff access accounts.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('store')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'store'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            Store Profile
          </button>
          {isOwner && (
            <>
              <button
                onClick={() => setActiveTab('staff')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
                  activeTab === 'staff'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Staff & Team ({staffList.length})
              </button>

              <button
                onClick={() => setActiveTab('export')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
                  activeTab === 'export'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                Data Backup & Export
              </button>
            </>
          )}
        </div>
      </div>

      {/* TAB 1: Store Profile */}
      {activeTab === 'store' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 max-w-3xl">
          {loadingStore ? (
            <div className="py-12 text-center text-slate-400 text-sm">Loading store configuration...</div>
          ) : (
            <form onSubmit={handleSaveStore} className="space-y-5">
              {storeMessage && (
                <div
                  className={`p-3.5 rounded-xl text-xs flex items-center gap-2 font-medium ${
                    storeMessage.type === 'success'
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                      : 'bg-red-50 border border-red-200 text-red-800'
                  }`}
                >
                  {storeMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  )}
                  <span>{storeMessage.text}</span>
                </div>
              )}

              {!isOwner && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>You are signed in as STAFF. Store settings can only be edited by the store OWNER.</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Store Name *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!isOwner}
                    value={storeData.name}
                    onChange={(e) => setStoreData({ ...storeData, name: e.target.value })}
                    placeholder="e.g. Vision Care Opticals"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition disabled:bg-slate-50 disabled:text-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Contact Phone
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      disabled={!isOwner}
                      value={storeData.phone}
                      onChange={(e) => setStoreData({ ...storeData, phone: e.target.value })}
                      placeholder="+91 9876543210"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition disabled:bg-slate-50 disabled:text-slate-500"
                    />
                  </div>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">Prints on receipts & customer invoices</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Base Currency
                  </label>
                  <input
                    type="text"
                    disabled
                    value={storeData.currency}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 text-slate-500 font-mono"
                  />
                  <span className="text-[11px] text-slate-400 mt-0.5 block">Standard INR (₹)</span>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Store Physical Address
                  </label>
                  <div className="relative">
                    <div className="absolute top-3 left-3 flex items-start pointer-events-none text-slate-400">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <textarea
                      rows={2}
                      disabled={!isOwner}
                      value={storeData.address}
                      onChange={(e) => setStoreData({ ...storeData, address: e.target.value })}
                      placeholder="e.g. Shop #12, Ground Floor, Grand Optical Mall, MG Road, Bengaluru - 560001"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition disabled:bg-slate-50 disabled:text-slate-500"
                    />
                  </div>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">Printed at the top of A4 customer invoices & optical job slips</span>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Google Review / Maps Link
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-amber-500">
                      <Star className="w-4 h-4 fill-amber-500" />
                    </div>
                    <input
                      type="url"
                      disabled={!isOwner}
                      value={storeData.googleReviewLink}
                      onChange={(e) => setStoreData({ ...storeData, googleReviewLink: e.target.value })}
                      placeholder="https://g.page/r/your-google-place-id/review"
                      className="w-full pl-9 pr-24 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition disabled:bg-slate-50 disabled:text-slate-500 font-mono text-xs"
                    />
                    {storeData.googleReviewLink && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        <a
                          href={storeData.googleReviewLink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                        >
                          Test <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">
                    Automatically attached in WhatsApp messages when orders are marked as DELIVERED to collect Google 5-star ratings.
                  </span>
                </div>
              </div>

              {isOwner && (
                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingStore}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition flex items-center gap-2 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {savingStore ? 'Saving Changes...' : 'Save Store Details'}
                  </button>
                </div>
              )}
            </form>
          )}
        </div>
      )}

      {/* TAB 2: Staff & Team Management */}
      {activeTab === 'staff' && isOwner && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <h2 className="font-bold text-slate-900 text-base">Store Team Accounts</h2>
              <p className="text-xs text-slate-500">
                Staff accounts can create orders, record payments, and manage customer records.
              </p>
            </div>
            <button
              onClick={() => setIsAddStaffOpen(true)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Add Team Member
            </button>
          </div>

          {staffError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{staffError}</span>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {loadingStaff ? (
              <div className="p-8 text-center text-slate-400 text-sm">Loading team accounts...</div>
            ) : staffList.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm">No team members registered yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="py-3 px-4">Member</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Joined</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {staffList.map((member) => {
                      const isSelf = member.id === user?.id;
                      return (
                        <tr key={member.id} className="hover:bg-slate-50/60 transition">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900">{member.full_name}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{member.email}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                member.role === 'OWNER'
                                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                  : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              }`}
                            >
                              <Shield className="w-3 h-3" />
                              {member.role}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                member.active
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-red-50 text-red-700 border border-red-200'
                              }`}
                            >
                              {member.active ? (
                                <>
                                  <UserCheck className="w-3 h-3" /> Active
                                </>
                              ) : (
                                <>
                                  <UserX className="w-3 h-3" /> Deactivated
                                </>
                              )}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                            {new Date(member.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setResetTargetUser(member)}
                                title="Reset login password"
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition flex items-center gap-1 text-[11px] font-semibold"
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Reset Password</span>
                              </button>

                              {!isSelf && (
                                <button
                                  onClick={() => handleToggleStatus(member)}
                                  className={`p-1.5 rounded-lg border transition text-[11px] font-semibold flex items-center gap-1 ${
                                    member.active
                                      ? 'border-red-200 text-red-600 hover:bg-red-50'
                                      : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                                  }`}
                                >
                                  {member.active ? (
                                    <>
                                      <UserX className="w-3.5 h-3.5" />
                                      <span className="hidden sm:inline">Deactivate</span>
                                    </>
                                  ) : (
                                    <>
                                      <UserCheck className="w-3.5 h-3.5" />
                                      <span className="hidden sm:inline">Activate</span>
                                    </>
                                  )}
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
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Data Backup & Export */}
      {activeTab === 'export' && isOwner && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-600" />
              Store Data Export & Backup (CSV)
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Download complete, uncompressed CSV spreadsheets of your store records for tax filing, accounting, or offline backups.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Customer Directory Export */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-slate-900 text-sm">Customer Directory</span>
                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-full uppercase">CSV</span>
                </div>
                <p className="text-xs text-slate-500">
                  Full list of registered customers, contact numbers, email addresses, age, gender, address, and total order count.
                </p>
              </div>
              <a
                href={`${api.defaults.baseURL}/exports/customers.csv`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs transition flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" /> Download Customers CSV
              </a>
            </div>

            {/* 2. Orders & Sales Register Export */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-slate-900 text-sm">Orders & Sales Register</span>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full uppercase">CSV</span>
                </div>
                <p className="text-xs text-slate-500">
                  Detailed order history, customer names, status, total amounts, payments received, and outstanding balance dues.
                </p>
              </div>
              <a
                href={`${api.defaults.baseURL}/exports/orders.csv`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-sm"
              >
                <Download className="w-4 h-4" /> Download Sales Orders CSV
              </a>
            </div>

            {/* 3. Stock Inventory Catalog Export */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-slate-900 text-sm">Stock Inventory Catalog</span>
                  <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-[10px] font-bold rounded-full uppercase">CSV</span>
                </div>
                <p className="text-xs text-slate-500">
                  Complete product catalog including frames, lenses, sunglasses, solutions, selling prices, cost prices, and current stock levels.
                </p>
              </div>
              <a
                href={`${api.defaults.baseURL}/exports/inventory.csv`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-sm"
              >
                <Download className="w-4 h-4" /> Download Inventory CSV
              </a>
            </div>

            {/* 4. Store Expense Ledger Export */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-slate-900 text-sm">Operational Expense Ledger</span>
                  <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-full uppercase">CSV</span>
                </div>
                <p className="text-xs text-slate-500">
                  Recorded shop expense transactions categorized by tea/coffee, utilities, lab fees, rent, and maintenance.
                </p>
              </div>
              <a
                href={`${api.defaults.baseURL}/exports/expenses.csv`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-sm"
              >
                <Download className="w-4 h-4" /> Download Expenses CSV
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      <AddStaffModal
        isOpen={isAddStaffOpen}
        onClose={() => setIsAddStaffOpen(false)}
        onStaffAdded={handleStaffAdded}
      />

      {/* Reset Password Modal */}
      <ResetPasswordModal
        isOpen={!!resetTargetUser}
        onClose={() => setResetTargetUser(null)}
        staffUser={resetTargetUser}
      />
    </div>
  );
}
