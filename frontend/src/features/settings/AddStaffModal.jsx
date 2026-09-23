import React, { useState } from 'react';
import api from '../../services/api.js';
import { X, UserPlus, AlertCircle } from 'lucide-react';

export default function AddStaffModal({ isOpen, onClose, onStaffAdded }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('STAFF');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/users', {
        fullName,
        email,
        password,
        role,
      });

      onStaffAdded(response.data.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to add staff member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#203A36]/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#FEFEFC] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E2E7E3] animate-in fade-in zoom-in-95 duration-150">
        <div className="flex justify-between items-center mb-5 pb-3 border-b border-[#E2E7E3]">
          <div className="flex items-center gap-2 text-[#28766B]">
            <UserPlus className="w-5 h-5" />
            <h3 className="font-bold text-[#202D2B] text-base">Add New Team Member</h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#66746F] hover:text-[#202D2B] p-1.5 rounded-lg hover:bg-[#F5F7F3] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50/80 border border-rose-200 flex items-center gap-2 text-rose-700 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#66746F] uppercase tracking-wider mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Ramesh Kumar"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E7E3] text-sm bg-[#FEFEFC] text-[#202D2B] focus:outline-none focus:border-[#28766B] focus:ring-1 focus:ring-[#28766B] transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#66746F] uppercase tracking-wider mb-1">
              Work Email Address *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="staff@store.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E7E3] text-sm bg-[#FEFEFC] text-[#202D2B] focus:outline-none focus:border-[#28766B] focus:ring-1 focus:ring-[#28766B] transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#66746F] uppercase tracking-wider mb-1">
              Initial Login Password *
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 6 characters"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E7E3] text-sm bg-[#FEFEFC] text-[#202D2B] focus:outline-none focus:border-[#28766B] focus:ring-1 focus:ring-[#28766B] transition"
            />
            <span className="text-[11px] text-[#66746F] mt-0.5 block">
              Staff will use this password to sign in. You can reset it anytime.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#66746F] uppercase tracking-wider mb-1">
              Role & Permissions
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E7E3] text-xs bg-[#FEFEFC] text-[#202D2B] focus:outline-none focus:border-[#28766B] focus:ring-1 focus:ring-[#28766B] transition font-medium"
            >
              <option value="STAFF">STAFF (Dispensary, Orders, Prescriptions, Customers)</option>
              <option value="OWNER">OWNER (Full Store Access, Finance, Team Management)</option>
            </select>
          </div>

          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl border border-[#E2E7E3] text-xs font-semibold text-[#66746F] hover:text-[#202D2B] hover:bg-[#F5F7F3] bg-[#FEFEFC] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 px-4 rounded-xl bg-[#28766B] hover:bg-[#1E5C53] text-xs font-semibold text-white shadow-xs transition disabled:opacity-50"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
