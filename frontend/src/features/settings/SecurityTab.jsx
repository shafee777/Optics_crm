import React, { useState, useEffect } from 'react';
import api from '../../services/api.js';
import { Shield, KeyRound, AlertTriangle, CheckCircle2, Copy, Check, Lock, RefreshCw, AlertCircle } from 'lucide-react';
import { SkeletonCard } from '../../components/common/Skeleton.jsx';

export default function SecurityTab() {
  const [loading, setLoading] = useState(true);
  const [hasRecoveryKey, setHasRecoveryKey] = useState(false);
  const [error, setError] = useState('');
  
  // Modal / Generate state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [generating, setGenerating] = useState(false);
  const [modalError, setModalError] = useState('');
  const [generatedKey, setGeneratedKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [confirmedSaved, setConfirmedSaved] = useState(false);

  const fetchStatus = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/auth/recovery-key/status');
      setHasRecoveryKey(Boolean(res.data?.data?.hasRecoveryKey));
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load recovery key status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleOpenModal = () => {
    setCurrentPassword('');
    setModalError('');
    setGeneratedKey('');
    setCopied(false);
    setConfirmedSaved(false);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (generatedKey && !confirmedSaved) {
      if (!window.confirm('Are you sure you have saved your recovery key? You will not be able to view it again.')) {
        return;
      }
    }
    setIsModalOpen(false);
    setGeneratedKey('');
    setCurrentPassword('');
    fetchStatus();
  };

  const handleGenerateKey = async (e) => {
    e?.preventDefault();
    setModalError('');
    setGenerating(true);
    try {
      const res = await api.post('/auth/recovery-key/generate', { currentPassword });
      setGeneratedKey(res.data?.data?.recoveryKey || '');
      setHasRecoveryKey(true);
    } catch (err) {
      setModalError(err.response?.data?.error?.message || 'Failed to generate recovery key. Please check your password.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedKey) return;
    try {
      await navigator.clipboard.writeText(generatedKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  if (loading) {
    return <SkeletonCard height="h-64" />;
  }

  return (
    <div className="bg-[#FEFEFC] rounded-2xl border border-[#E2E7E3] shadow-xs p-6 max-w-3xl space-y-6">
      <div>
        <h2 className="text-lg font-bold text-[#202D2B] flex items-center gap-2">
          <Shield className="w-5 h-5 text-[#28766B]" />
          Owner Account Security &amp; Recovery
        </h2>
        <p className="text-xs text-[#66746F] mt-1">
          Optics CRM operates locally and offline. A cryptographically secure Owner Recovery Key is used to regain account access without an internet connection or external services.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Recovery Key Status Card */}
      <div className="p-5 rounded-xl border border-[#E2E7E3] bg-[#F5F7F3]/60 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-xl shrink-0 ${hasRecoveryKey ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#202D2B]">Owner Recovery Key</h3>
                {hasRecoveryKey ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                    <CheckCircle2 className="w-3 h-3" /> Configured
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800">
                    <AlertTriangle className="w-3 h-3" /> Not Configured
                  </span>
                )}
              </div>
              <p className="text-xs text-[#66746F] mt-1 leading-relaxed">
                {hasRecoveryKey
                  ? 'Your owner account is protected with a recovery key. If you forget your password, you can reset it on the login page using your recovery key.'
                  : 'You do not have a recovery key configured yet. If you forget your password, you will not be able to recover your account.'}
              </p>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-[#E2E7E3] flex flex-wrap gap-3 items-center justify-between">
          <span className="text-[11px] text-[#66746F]">
            {hasRecoveryKey ? 'Need to replace your key? Generating a new key invalidates the previous one.' : 'Generate your secure offline key now to enable account recovery.'}
          </span>
          <button
            type="button"
            onClick={handleOpenModal}
            className="px-4 py-2 bg-[#28766B] hover:bg-[#1E5C53] text-white text-xs font-semibold rounded-xl transition shadow-xs flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {hasRecoveryKey ? 'Regenerate Recovery Key' : 'Generate Recovery Key'}
          </button>
        </div>
      </div>

      {/* Security Best Practices */}
      <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200/60 text-blue-900 text-xs space-y-1.5 leading-relaxed">
        <p className="font-semibold flex items-center gap-1.5 text-blue-950">
          <Shield className="w-3.5 h-3.5" /> Offline Security Information
        </p>
        <p>
          • The plaintext recovery key is never stored in the database. Only a secure one-way hash is saved.
        </p>
        <p>
          • Store your recovery key in a secure physical location or password manager.
        </p>
        <p>
          • Repeated failed recovery attempts will temporarily lock recovery to prevent brute-force attacks.
        </p>
      </div>

      {/* Modal for Generating / Regenerating Key */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#FEFEFC] rounded-2xl border border-[#E2E7E3] shadow-lg max-w-md w-full p-6 space-y-4">
            {!generatedKey ? (
              <form onSubmit={handleGenerateKey} className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-[#202D2B] flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-[#28766B]" />
                    {hasRecoveryKey ? 'Regenerate Recovery Key' : 'Generate Recovery Key'}
                  </h3>
                  <p className="text-xs text-[#66746F] mt-1">
                    {hasRecoveryKey
                      ? 'Confirm your current password to generate a new key. The existing recovery key will stop working immediately.'
                      : 'Confirm your current password to generate a secure owner recovery key.'}
                  </p>
                </div>

                {modalError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{modalError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-[#202D2B] uppercase tracking-wider mb-1.5">
                    Current Owner Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#66746F]">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter your current password"
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#E2E7E3] bg-white text-sm text-[#202D2B] placeholder:text-[#9AA8A3] focus:outline-none focus:ring-2 focus:ring-[#28766B]/30 focus:border-[#28766B] transition"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 rounded-xl border border-[#E2E7E3] text-xs font-semibold text-[#66746F] hover:bg-[#F5F7F3] transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={generating}
                    className="px-4 py-2 bg-[#28766B] hover:bg-[#1E5C53] text-white text-xs font-semibold rounded-xl transition shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {generating ? 'Verifying…' : hasRecoveryKey ? 'Regenerate Key' : 'Generate Key'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mb-2 mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-[#202D2B] text-center">
                    New Recovery Key Generated
                  </h3>
                  <p className="text-xs text-[#66746F] text-center mt-1">
                    Save this recovery key in a safe, offline place. It will <strong className="text-rose-700">never</strong> be displayed again.
                  </p>
                </div>

                {/* Key Display Card */}
                <div className="p-4 rounded-xl bg-[#F5F7F3] border-2 border-dashed border-[#28766B] text-center space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#66746F]">
                    Owner Recovery Key
                  </span>
                  <p className="font-mono text-lg font-bold text-[#1E5C53] tracking-widest select-all">
                    {generatedKey}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCopy}
                  className="w-full py-2.5 px-4 rounded-xl border border-[#E2E7E3] bg-white hover:bg-[#F5F7F3] text-xs font-semibold text-[#202D2B] transition flex items-center justify-center gap-1.5 shadow-xs"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-700">Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-[#66746F]" />
                      <span>Copy Recovery Key</span>
                    </>
                  )}
                </button>

                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed">
                  <strong>Warning:</strong> Optics CRM does not store this plaintext key in the database. If you lose this key, it cannot be retrieved.
                </div>

                <label className="flex items-start gap-2 text-xs text-[#202D2B] font-medium cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={confirmedSaved}
                    onChange={(e) => setConfirmedSaved(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded border-[#E2E7E3] text-[#28766B] focus:ring-[#28766B]"
                  />
                  <span>I have saved my recovery key in a secure location.</span>
                </label>

                <button
                  type="button"
                  disabled={!confirmedSaved}
                  onClick={handleCloseModal}
                  className="w-full py-2.5 bg-[#28766B] hover:bg-[#1E5C53] text-white text-xs font-semibold rounded-xl transition shadow-xs disabled:opacity-50"
                >
                  I Understand, Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
