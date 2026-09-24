import { useModalAccessibility } from '../../hooks/useModalAccessibility.js';
import React, { useState } from 'react';
import api from '../../services/api.js';
import { X, KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ResetPasswordModal({ isOpen, onClose, staffUser }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const modalRef = useModalAccessibility(isOpen, onClose);
  if (!isOpen || !staffUser) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await api.patch(`/users/${staffUser.id}/password`, {
        password,
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setPassword('');
        setConfirmPassword('');
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={modalRef} className="fixed inset-0 z-50 overflow-y-auto bg-[#203A36]/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#FEFEFC] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E2E7E3] animate-in fade-in zoom-in-95 duration-150">
        <div className="flex justify-between items-center mb-5 pb-3 border-b border-[#E2E7E3]">
          <div className="flex items-center gap-2 text-[#28766B]">
            <KeyRound className="w-5 h-5" />
            <h3 className="font-bold text-[#202D2B] text-base">Reset Staff Password</h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#66746F] hover:text-[#202D2B] p-1.5 rounded-lg hover:bg-[#F5F7F3] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mb-4 p-3.5 bg-[#F5F7F3] rounded-xl border border-[#E2E7E3]">
          <div className="text-[11px] font-semibold text-[#66746F] uppercase tracking-wider">Staff Account</div>
          <div className="font-bold text-[#202D2B] text-sm mt-0.5">{staffUser.full_name}</div>
          <div className="text-xs text-[#66746F] font-mono">{staffUser.email}</div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50/80 border border-rose-200 flex items-center gap-2 text-rose-700 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 flex items-center gap-2 text-emerald-800 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>Password has been reset successfully!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="ResetPasswordModal-field-0" className="block text-xs font-semibold text-[#66746F] uppercase tracking-wider mb-1">
              New Password *
            </label>
            <input id="ResetPasswordModal-field-0"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 6 characters"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E7E3] text-sm bg-[#FEFEFC] text-[#202D2B] focus:outline-none focus:border-[#28766B] focus:ring-1 focus:ring-[#28766B] transition"
            />
          </div>

          <div>
            <label htmlFor="ResetPasswordModal-field-1" className="block text-xs font-semibold text-[#66746F] uppercase tracking-wider mb-1">
              Confirm New Password *
            </label>
            <input id="ResetPasswordModal-field-1"
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-type password"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E7E3] text-sm bg-[#FEFEFC] text-[#202D2B] focus:outline-none focus:border-[#28766B] focus:ring-1 focus:ring-[#28766B] transition"
            />
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
              disabled={loading || success}
              className="flex-1 py-2.5 px-4 rounded-xl bg-[#28766B] hover:bg-[#1E5C53] text-xs font-semibold text-white shadow-xs transition disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
