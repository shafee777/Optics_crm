import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import api from '../../services/api.js';
import logo from '../../assets/logo.png';
import { Lock, Mail, AlertCircle, KeyRound, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Recovery Mode State
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryKey, setRecoveryKey] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recoveryError, setRecoveryError] = useState('');
  const [recoverySuccessMessage, setRecoverySuccessMessage] = useState('');
  const [recoverySubmitting, setRecoverySubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Login failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecoverySubmit = async (e) => {
    e?.preventDefault();
    setRecoveryError('');

    if (newPassword !== confirmPassword) {
      setRecoveryError('Passwords do not match.');
      return;
    }

    if (newPassword.length < 8) {
      setRecoveryError('Password must be at least 8 characters.');
      return;
    }

    setRecoverySubmitting(true);
    try {
      const res = await api.post('/auth/recover-password', {
        email: recoveryEmail,
        recoveryKey,
        newPassword,
      });
      setRecoverySuccessMessage(
        res.data?.data?.message || 'Password reset successfully! Please sign in with your new password.'
      );
      setEmail(recoveryEmail);
      setPassword('');
    } catch (err) {
      setRecoveryError(
        err.response?.data?.error?.message || 'Invalid recovery credentials.'
      );
    } finally {
      setRecoverySubmitting(false);
    }
  };

  const handleQuickLogin = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    login(demoEmail, demoPassword)
      .then(() => navigate('/'))
      .catch((err) => setError(err.response?.data?.error?.message || 'Demo login failed'));
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-[#F5F7F3] px-4 py-12">
      <div className="w-full max-w-md bg-[#FEFEFC] rounded-2xl shadow-sm p-8 border border-[#E2E7E3]">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <img src={logo} alt="Optics CRM Logo" className="w-16 h-16 object-contain mx-auto mb-3 drop-shadow-sm" />
          <h1 className="text-xl font-bold text-[#202D2B]">Optics CRM</h1>
          <p className="text-xs text-[#66746F] mt-1">Optical Store Management System</p>
        </div>

        {isRecoveryMode ? (
          /* Owner Account Recovery Flow */
          <div className="space-y-4">
            <div className="text-center mb-2">
              <div className="inline-flex p-2.5 rounded-full bg-[#EBF3F1] text-[#28766B] mb-2">
                <KeyRound className="w-5 h-5" />
              </div>
              <h2 className="text-base font-bold text-[#202D2B]">Owner Account Recovery</h2>
              <p className="text-xs text-[#66746F] mt-1 leading-relaxed">
                Reset your owner password offline using your secret Owner Recovery Key.
              </p>
            </div>

            {recoverySuccessMessage ? (
              <div className="space-y-4 pt-2">
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{recoverySuccessMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsRecoveryMode(false);
                    setRecoverySuccessMessage('');
                  }}
                  className="w-full py-2.5 px-4 bg-[#28766B] hover:bg-[#1E5C53] text-white font-semibold rounded-xl text-sm transition shadow-sm"
                >
                  Return to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleRecoverySubmit} className="space-y-3.5">
                {recoveryError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-800 text-xs font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{recoveryError}</span>
                  </div>
                )}

                <div>
                  <label htmlFor="LoginPage-field-rec-email" className="block text-xs font-semibold text-[#202D2B] uppercase tracking-wider mb-1">
                    Owner Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#66746F]">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="LoginPage-field-rec-email"
                      type="email"
                      required
                      value={recoveryEmail}
                      onChange={(e) => setRecoveryEmail(e.target.value)}
                      placeholder="owner@store.com"
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#E2E7E3] bg-white text-sm text-[#202D2B] placeholder:text-[#9AA8A3] focus:outline-none focus:ring-2 focus:ring-[#28766B]/30 focus:border-[#28766B] transition"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="LoginPage-field-rec-key" className="block text-xs font-semibold text-[#202D2B] uppercase tracking-wider mb-1">
                    Owner Recovery Key
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#66746F]">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      id="LoginPage-field-rec-key"
                      type="text"
                      required
                      value={recoveryKey}
                      onChange={(e) => setRecoveryKey(e.target.value)}
                      placeholder="XXXX-XXXX-XXXX-XXXX"
                      className="w-full pl-9 pr-4 py-2.5 font-mono rounded-xl border border-[#E2E7E3] bg-white text-sm text-[#202D2B] placeholder:text-[#9AA8A3] focus:outline-none focus:ring-2 focus:ring-[#28766B]/30 focus:border-[#28766B] transition uppercase tracking-wider"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="LoginPage-field-rec-pass" className="block text-xs font-semibold text-[#202D2B] uppercase tracking-wider mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#66746F]">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="LoginPage-field-rec-pass"
                      type="password"
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#E2E7E3] bg-white text-sm text-[#202D2B] placeholder:text-[#9AA8A3] focus:outline-none focus:ring-2 focus:ring-[#28766B]/30 focus:border-[#28766B] transition"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="LoginPage-field-rec-conf" className="block text-xs font-semibold text-[#202D2B] uppercase tracking-wider mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#66746F]">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="LoginPage-field-rec-conf"
                      type="password"
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#E2E7E3] bg-white text-sm text-[#202D2B] placeholder:text-[#9AA8A3] focus:outline-none focus:ring-2 focus:ring-[#28766B]/30 focus:border-[#28766B] transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={recoverySubmitting}
                  className="w-full mt-2 py-2.5 px-4 bg-[#28766B] hover:bg-[#1E5C53] text-white font-semibold rounded-xl text-sm transition shadow-sm disabled:opacity-50"
                >
                  {recoverySubmitting ? 'Resetting Password…' : 'Reset Password'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsRecoveryMode(false);
                    setRecoveryError('');
                  }}
                  className="w-full py-2 px-4 rounded-xl border border-[#E2E7E3] text-xs font-semibold text-[#66746F] hover:bg-[#F5F7F3] transition flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Sign In
                </button>
              </form>
            )}
          </div>
        ) : (
          /* Normal Sign In Flow */
          <>
            {/* Error Notification */}
            {error && (
              <div className="mb-6 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-800 text-xs font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="LoginPage-field-0" className="block text-xs font-semibold text-[#202D2B] uppercase tracking-wider mb-1.5">
                  Staff Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#66746F]">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="LoginPage-field-0"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="staff@store.com"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#E2E7E3] bg-white text-sm text-[#202D2B] placeholder:text-[#9AA8A3] focus:outline-none focus:ring-2 focus:ring-[#28766B]/30 focus:border-[#28766B] transition"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="LoginPage-field-1" className="block text-xs font-semibold text-[#202D2B] uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#66746F]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="LoginPage-field-1"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#E2E7E3] bg-white text-sm text-[#202D2B] placeholder:text-[#9AA8A3] focus:outline-none focus:ring-2 focus:ring-[#28766B]/30 focus:border-[#28766B] transition"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsRecoveryMode(true);
                    setError('');
                    setRecoveryError('');
                    setRecoverySuccessMessage('');
                    setRecoveryEmail(email);
                    setRecoveryKey('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  className="text-xs font-semibold text-[#28766B] hover:text-[#1E5C53] transition"
                >
                  Forgot Password?
                </button>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 py-2.5 px-4 bg-[#28766B] hover:bg-[#1E5C53] text-white font-semibold rounded-xl text-sm transition shadow-sm disabled:opacity-50"
              >
                {submitting ? 'Signing in...' : 'Sign in to Store'}
              </button>
            </form>

            {/* Demo accounts are available only in development. */}
            {import.meta.env.DEV && (
              <div className="mt-8 pt-6 border-t border-[#E2E7E3]">
                <p className="text-xs text-[#66746F] text-center font-medium mb-3">Quick Demo Logins</p>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('owner@visioncare.com', 'Password123!')}
                    className="text-left px-3.5 py-2.5 rounded-xl bg-[#F5F7F3] hover:bg-[#EBF3F1] border border-[#E2E7E3] text-xs transition flex justify-between items-center group"
                  >
                    <span className="font-semibold text-[#202D2B]">Vision Opticals (Owner)</span>
                    <span className="text-[#28766B] font-medium group-hover:translate-x-0.5 transition">Halil &rarr;</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('staff@visioncare.com', 'Password123!')}
                    className="text-left px-3.5 py-2.5 rounded-xl bg-[#F5F7F3] hover:bg-[#EBF3F1] border border-[#E2E7E3] text-xs transition flex justify-between items-center group"
                  >
                    <span className="font-semibold text-[#202D2B]">Vision Opticals (Staff)</span>
                    <span className="text-[#28766B] font-medium group-hover:translate-x-0.5 transition">Halil &rarr;</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('owner@cityeye.com', 'Password123!')}
                    className="text-left px-3.5 py-2.5 rounded-xl bg-[#F5F7F3] hover:bg-[#EBF3F1] border border-[#E2E7E3] text-xs transition flex justify-between items-center group"
                  >
                    <span className="font-semibold text-[#202D2B]">Vision Care Optics (Store B)</span>
                    <span className="text-[#28766B] font-medium group-hover:translate-x-0.5 transition">Spiderman &rarr;</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}