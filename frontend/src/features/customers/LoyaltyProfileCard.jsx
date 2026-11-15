import React, { useState, useEffect } from 'react';
import { Award, Sparkles, Clock, AlertTriangle, History, PlusCircle, ArrowUpRight, ArrowDownRight, X } from 'lucide-react';
import { enterpriseApi } from '../../services/enterprise.js';
import { showBanner } from '../../lib/whatsapp.js';

export default function LoyaltyProfileCard({ customerId, isOwner }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustDelta, setAdjustDelta] = useState('');
  const [adjustNotes, setAdjustNotes] = useState('');
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await enterpriseApi.getLoyaltyProfile(customerId);
      setProfile(data);
    } catch (err) {
      console.error('Failed to load loyalty profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (customerId) loadProfile();
  }, [customerId]);

  const handleAdjust = async (e) => {
    e.preventDefault();
    const delta = parseInt(adjustDelta, 10);
    if (isNaN(delta) || delta === 0) {
      alert('Please enter a valid non-zero points adjustment.');
      return;
    }
    setAdjustSubmitting(true);
    try {
      await enterpriseApi.adjustLoyaltyPoints(customerId, delta, adjustNotes);
      showBanner(`Points adjusted (${delta > 0 ? '+' : ''}${delta} pts)`, 'success');
      setShowAdjustModal(false);
      setAdjustDelta('');
      setAdjustNotes('');
      loadProfile();
    } catch (err) {
      showBanner(err.response?.data?.error?.message || err.message, 'error');
    } finally {
      setAdjustSubmitting(false);
    }
  };

  if (loading && !profile) {
    return (
      <div className="bg-[#FEFEFC] p-4 rounded-2xl border border-[#E2E7E3] animate-pulse h-28 flex items-center justify-center text-xs text-[#66746F]">
        Loading loyalty data...
      </div>
    );
  }

  if (!profile) return null;

  const tierColors = {
    VIP: 'bg-gradient-to-r from-amber-500 to-amber-700 text-white shadow-amber-500/20',
    SILVER: 'bg-gradient-to-r from-teal-600 to-teal-800 text-white shadow-teal-600/20',
    STANDARD: 'bg-gradient-to-r from-[#203A36] to-[#28766B] text-white shadow-[#203A36]/20',
  };

  return (
    <div className="bg-[#FEFEFC] rounded-2xl border border-[#E2E7E3] shadow-xs overflow-hidden">
      {/* Top Banner */}
      <div className={`p-4 ${tierColors[profile.tier] || tierColors.STANDARD} flex items-center justify-between`}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center">
            <Award className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm tracking-wide">{profile.tier} MEMBER</span>
              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">
                {profile.multiplier}x Multiplier
              </span>
            </div>
            <p className="text-[11px] text-white/80 font-medium mt-0.5">
              Lifetime Spend: ₹{profile.lifetimeSpend.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="text-2xl font-black tabular-nums tracking-tight">
            {profile.balance} <span className="text-xs font-semibold text-white/80">pts</span>
          </div>
          <div className="text-[11px] text-white/90 font-bold">
            ≈ ₹{profile.valueRupees.toLocaleString()} Discount
          </div>
        </div>
      </div>

      {/* Expiry Alert Warning */}
      {profile.expiringSoon > 0 && (
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{profile.expiringSoon} points expiring within 30 days. Remind customer to redeem!</span>
        </div>
      )}

      {/* Actions and Stats */}
      <div className="p-4 flex items-center justify-between text-xs">
        <div className="flex items-center gap-4 text-[#5A6F6A]">
          <div>
            <span className="text-[10px] text-[#8C9B97] block">Earned</span>
            <span className="font-bold text-[#203A36] tabular-nums">+{profile.totalEarned}</span>
          </div>
          <div>
            <span className="text-[10px] text-[#8C9B97] block">Redeemed</span>
            <span className="font-bold text-[#203A36] tabular-nums">-{profile.totalRedeemed}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistoryModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F5F7F3] hover:bg-[#EAEFEA] text-[#203A36] rounded-xl font-bold transition border border-[#DDE3DC]"
          >
            <History className="w-3.5 h-3.5 text-[#28766B]" />
            Ledger History
          </button>

          {isOwner && (
            <button
              onClick={() => setShowAdjustModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#28766B] hover:bg-[#203A36] text-white rounded-xl font-bold transition shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Adjust
            </button>
          )}
        </div>
      </div>

      {/* Ledger History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#182C29]/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#DDE3DC] max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8E0] mb-4">
              <div>
                <h3 className="font-bold text-base text-[#203A36]">Points Ledger History</h3>
                <p className="text-xs text-[#718580]">Append-only FIFO financial transaction log</p>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="p-1 rounded-lg text-[#8C9B97] hover:text-[#203A36]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {profile.transactions.length === 0 ? (
                <p className="text-xs text-center py-8 text-[#718580]">No loyalty transactions yet.</p>
              ) : (
                profile.transactions.map((tx) => (
                  <div key={tx.id} className="p-3 bg-[#F9FAF8] rounded-xl border border-[#E8EDE6] flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        tx.delta > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {tx.delta > 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="font-bold text-[#203A36]">{tx.type}</div>
                        <div className="text-[11px] text-[#718580]">{tx.notes || (tx.orderNumber ? `Order #${tx.orderNumber}` : '')}</div>
                        <div className="text-[10px] text-[#8C9B97] mt-0.5">{new Date(tx.createdAt).toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-black tabular-nums ${tx.delta > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {tx.delta > 0 ? `+${tx.delta}` : tx.delta} pts
                      </div>
                      <div className="text-[10px] text-[#8C9B97] font-medium">Balance: {tx.balanceAfter} pts</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Adjust Points Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#182C29]/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-[#DDE3DC]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-[#203A36]">Adjust Points Balance</h3>
              <button onClick={() => setShowAdjustModal(false)} className="p-1 rounded-lg text-[#8C9B97] hover:text-[#203A36]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdjust} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#203A36] mb-1">
                  Points Delta (e.g. +100 for bonus, -50 for correction)
                </label>
                <input
                  type="number"
                  required
                  placeholder="+50 or -50"
                  value={adjustDelta}
                  onChange={(e) => setAdjustDelta(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#CCD7D2] text-[#203A36] font-mono text-sm focus:ring-2 focus:ring-[#28766B]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#203A36] mb-1">Reason / Notes</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Goodwill bonus, promotional campaign"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#CCD7D2] text-[#203A36] focus:ring-2 focus:ring-[#28766B]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-[#CCD7D2] font-bold text-[#5A6F6A]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustSubmitting}
                  className="px-4 py-1.5 rounded-xl bg-[#28766B] font-bold text-white hover:bg-[#203A36]"
                >
                  {adjustSubmitting ? 'Saving...' : 'Apply Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
