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
    <div className="min-h-screen flex flex-col justify-center items-center bg-slate-900 px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 mb-4">
            <Glasses className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Optical Growth CRM</h1>
          <p className="text-sm text-slate-500 mt-1">Optical Store Management System</p>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Staff Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@store.com"
                className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm transition shadow-md shadow-indigo-600/20 disabled:opacity-50"
          >
            {submitting ? 'Signing in...' : 'Sign in to Store'}
          </button>
        </form>

        {/* 1-Click Demo Login Shortcuts */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <p className="text-xs text-slate-400 text-center font-medium mb-3">Quick Demo Logins</p>
          <div className="grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('owner@visioncare.com', 'Password123!')}
              className="text-left px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs transition flex justify-between items-center"
            >
              <span className="font-semibold text-slate-800">Vision Care (Owner)</span>
              <span className="text-indigo-600">Rajesh Sharma &rarr;</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('staff@visioncare.com', 'Password123!')}
              className="text-left px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs transition flex justify-between items-center"
            >
              <span className="font-semibold text-slate-800">Vision Care (Staff)</span>
              <span className="text-indigo-600">Anjali Gupta &rarr;</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('owner@cityeye.com', 'Password123!')}
              className="text-left px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs transition flex justify-between items-center"
            >
              <span className="font-semibold text-slate-800">City Eye Optics (Store B)</span>
              <span className="text-indigo-600">Suresh Verma &rarr;</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}