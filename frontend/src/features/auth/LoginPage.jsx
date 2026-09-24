import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import { Glasses, Lock, Mail, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#28766B] text-white shadow-sm mb-3">
            <Glasses className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-[#202D2B]">Optical Growth CRM</h1>
          <p className="text-xs text-[#66746F] mt-1">Optical Store Management System</p>
        </div>

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
              <input id="LoginPage-field-0"
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
              <input id="LoginPage-field-1"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#E2E7E3] bg-white text-sm text-[#202D2B] placeholder:text-[#9AA8A3] focus:outline-none focus:ring-2 focus:ring-[#28766B]/30 focus:border-[#28766B] transition"
              />
            </div>
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
      </div>
    </div>
  );
}