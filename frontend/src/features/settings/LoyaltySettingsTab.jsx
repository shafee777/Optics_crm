import React, { useState, useEffect } from 'react';
import { enterpriseApi } from '../../services/enterprise.js';
import { Award, Sparkles, Check, AlertCircle, Save, Info, Zap } from 'lucide-react';

export default function LoyaltySettingsTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // Form State
  const [config, setConfig] = useState({
    enabled: true,
    accrualPercent: 10.0,
    pointsPerRupee: 1.0,
    redemptionValuePerPoint: 1.0,
    minRedeemPoints: 50,
    maxRedeemPercent: 50.0,
    expiryDays: 365,
    silverThreshold: 10000,
    vipThreshold: 25000,
    silverMultiplier: 1.5,
    vipMultiplier: 2.0,
  });

  // Interactive Calculator State
  const [sampleSpend, setSampleSpend] = useState(20000);

  useEffect(() => {
    enterpriseApi.getLoyaltyConfig()
      .then((data) => {
        if (data) {
          setConfig({
            enabled: data.enabled !== false,
            accrualPercent: Number(data.accrualPercent ?? 10.0),
            pointsPerRupee: Number(data.pointsPerRupee ?? 1.0),
            redemptionValuePerPoint: Number(data.redemptionValuePerPoint ?? 1.0),
            minRedeemPoints: Number(data.minRedeemPoints ?? 50),
            maxRedeemPercent: Number(data.maxRedeemPercent ?? 50.0),
            expiryDays: Number(data.expiryDays ?? 365),
            silverThreshold: Number(data.silverThreshold ?? 10000),
            vipThreshold: Number(data.vipThreshold ?? 25000),
            silverMultiplier: Number(data.silverMultiplier ?? 1.5),
            vipMultiplier: Number(data.vipMultiplier ?? 2.0),
          });
        }
      })
      .catch((err) => {
        setMessage({ type: 'error', text: 'Failed to load loyalty settings' });
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const updated = await enterpriseApi.updateLoyaltyConfig(config);
      setMessage({ type: 'success', text: 'Loyalty rewards configuration saved successfully!' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error?.message || 'Failed to update loyalty settings' });
    } finally {
      setSaving(false);
    }
  };

  // Calculations for interactive preview
  const ratePct = Number(config.accrualPercent) || 0;
  const standardEarn = Math.floor(sampleSpend * (ratePct / 100));
  const silverEarn = Math.floor(sampleSpend * (ratePct / 100) * Number(config.silverMultiplier || 1.5));
  const vipEarn = Math.floor(sampleSpend * (ratePct / 100) * Number(config.vipMultiplier || 2.0));
  const rupeePerPoint = ratePct > 0 ? (100 / ratePct).toFixed(0) : 0;
  const discountWorth = (standardEarn * Number(config.redemptionValuePerPoint || 1.0)).toFixed(2);

  if (loading) {
    return <div className="p-8 text-center text-xs text-[#66746F]">Loading loyalty rewards settings…</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {message && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center gap-2 font-medium ${
            message.type === 'success'
              ? 'bg-emerald-50/80 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50/80 border border-rose-200 text-rose-800'
          }`}
        >
          {message.type === 'success' ? (
            <Check className="w-4 h-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Card 1: Master Enable / Disable Toggle */}
        <div className="bg-[#FEFEFC] p-6 rounded-2xl border border-[#E2E7E3] shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#202D2B]">Loyalty Points & Rewards Program</h3>
                <p className="text-xs text-[#66746F]">Reward repeat customers with points on optical eyewear purchases</p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              <span className="ml-2.5 text-xs font-bold text-[#202D2B]">
                {config.enabled ? 'ACTIVE (ON)' : 'DISABLED (OFF)'}
              </span>
            </label>
          </div>
        </div>

        {/* Card 2: Interactive Live Rate Calculator & Configuration */}
        <div className="bg-[#FEFEFC] p-6 rounded-2xl border border-[#E2E7E3] shadow-xs space-y-5">
          <div className="flex items-center gap-2 pb-2 border-b border-[#E2E7E3]">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-[#202D2B]">Points Accrual Rate & Live Preview</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Input Controls */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#202D2B] mb-1">
                  Points Earn Rate (% of Bill Subtotal) *
                </label>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="100"
                      required
                      value={config.accrualPercent}
                      onChange={(e) => setConfig({ ...config, accrualPercent: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-xl border border-[#E2E7E3] text-sm font-bold tabular-nums text-[#202D2B] bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    />
                    <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs font-bold text-[#66746F]">%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {[5, 10, 15].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setConfig({ ...config, accrualPercent: preset })}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition border ${
                          config.accrualPercent === preset
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-[#F5F7F3] text-[#66746F] border-[#E2E7E3] hover:bg-[#E2E7E3]'
                        }`}
                      >
                        {preset}%
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-[11px] text-[#66746F] mt-1">
                  1 Point per <strong>₹{rupeePerPoint}</strong> spent.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202D2B] mb-1">
                  Point Redemption Value (₹ per Point) *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-bold text-[#66746F]">₹</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    value={config.redemptionValuePerPoint}
                    onChange={(e) => setConfig({ ...config, redemptionValuePerPoint: parseFloat(e.target.value) || 1.0 })}
                    className="w-full pl-7 pr-3 py-2 rounded-xl border border-[#E2E7E3] text-sm font-bold tabular-nums text-[#202D2B] bg-white focus:outline-none"
                  />
                </div>
                <p className="text-[11px] text-[#66746F] mt-1">
                  Standard optical retail standard is <strong>₹1.00</strong> per point.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#66746F] mb-1">
                    Min Points to Redeem
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={config.minRedeemPoints}
                    onChange={(e) => setConfig({ ...config, minRedeemPoints: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-1.5 rounded-lg border border-[#E2E7E3] text-xs font-bold tabular-nums text-[#202D2B] bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#66746F] mb-1">
                    Points Expiry (Days)
                  </label>
                  <input
                    type="number"
                    min="30"
                    value={config.expiryDays}
                    onChange={(e) => setConfig({ ...config, expiryDays: parseInt(e.target.value, 10) || 365 })}
                    className="w-full px-3 py-1.5 rounded-lg border border-[#E2E7E3] text-xs font-bold tabular-nums text-[#202D2B] bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Interactive Live Example Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50/70 to-purple-50/40 border border-indigo-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-indigo-600 fill-current" />
                  Live Calculation Example
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                  Instant Simulation
                </span>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-[#66746F]">
                  Try with a sample purchase amount (₹):
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-bold text-[#66746F]">₹</span>
                  <input
                    type="number"
                    step="1000"
                    value={sampleSpend}
                    onChange={(e) => setSampleSpend(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full pl-7 pr-3 py-1.5 rounded-lg border border-indigo-200 bg-white text-xs font-extrabold text-[#202D2B] tabular-nums"
                  />
                </div>
              </div>

              {/* Dynamic Calculation Breakdown */}
              <div className="p-3 bg-white/90 rounded-xl border border-indigo-100 space-y-2 text-xs">
                <div className="flex justify-between items-center text-[#66746F]">
                  <span>Customer Purchase:</span>
                  <span className="font-bold text-[#202D2B] tabular-nums">₹{sampleSpend.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-[#66746F]">
                  <span>Earn Rate Set by Owner:</span>
                  <span className="font-bold text-indigo-700">{ratePct}% ({rupeePerPoint > 0 ? `1 pt / ₹${rupeePerPoint}` : '0'})</span>
                </div>
                <div className="pt-2 border-t border-indigo-100 flex justify-between items-center font-bold text-indigo-950">
                  <span>Standard Points Earned:</span>
                  <span className="text-sm font-extrabold text-indigo-600 tabular-nums">+{standardEarn.toLocaleString()} Points</span>
                </div>
                <div className="text-[10.5px] text-[#66746F] italic flex justify-between">
                  <span>Discount Value:</span>
                  <span className="font-semibold text-emerald-700">₹{discountWorth} OFF next bill</span>
                </div>
              </div>

              {/* Tier Multiplier preview */}
              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                <div className="p-2 rounded-lg bg-white/70 border border-indigo-100">
                  <div className="text-[10px] font-bold text-[#66746F] uppercase">Silver Tier ({config.silverMultiplier}x)</div>
                  <div className="font-extrabold text-[#202D2B] tabular-nums mt-0.5">+{silverEarn.toLocaleString()} pts</div>
                </div>
                <div className="p-2 rounded-lg bg-white/70 border border-indigo-100">
                  <div className="text-[10px] font-bold text-[#66746F] uppercase">VIP Tier ({config.vipMultiplier}x)</div>
                  <div className="font-extrabold text-[#202D2B] tabular-nums mt-0.5">+{vipEarn.toLocaleString()} pts</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Tier Multipliers */}
        <div className="bg-[#FEFEFC] p-6 rounded-2xl border border-[#E2E7E3] shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-[#202D2B]">Retention Tiers & Multipliers</h3>
          <p className="text-xs text-[#66746F]">Automatically reward high-value repeat customers with bonus points</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="p-4 rounded-xl border border-[#E2E7E3] bg-[#F5F7F3] space-y-3">
              <span className="text-xs font-bold text-[#202D2B]">🥈 Silver Tier</span>
              <div>
                <label className="block text-[11px] font-semibold text-[#66746F] mb-1">Qualifying 365-Day Spend (₹)</label>
                <input
                  type="number"
                  value={config.silverThreshold}
                  onChange={(e) => setConfig({ ...config, silverThreshold: parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-3 py-1.5 rounded-lg border border-[#E2E7E3] text-xs font-bold bg-white text-[#202D2B]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#66746F] mb-1">Point Multiplier (e.g. 1.5x)</label>
                <input
                  type="number"
                  step="0.1"
                  value={config.silverMultiplier}
                  onChange={(e) => setConfig({ ...config, silverMultiplier: parseFloat(e.target.value) || 1.0 })}
                  className="w-full px-3 py-1.5 rounded-lg border border-[#E2E7E3] text-xs font-bold bg-white text-[#202D2B]"
                />
              </div>
            </div>

            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-3">
              <span className="text-xs font-bold text-amber-900">👑 VIP Tier</span>
              <div>
                <label className="block text-[11px] font-semibold text-[#66746F] mb-1">Qualifying 365-Day Spend (₹)</label>
                <input
                  type="number"
                  value={config.vipThreshold}
                  onChange={(e) => setConfig({ ...config, vipThreshold: parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-3 py-1.5 rounded-lg border border-amber-200 text-xs font-bold bg-white text-[#202D2B]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#66746F] mb-1">Point Multiplier (e.g. 2.0x)</label>
                <input
                  type="number"
                  step="0.1"
                  value={config.vipMultiplier}
                  onChange={(e) => setConfig({ ...config, vipMultiplier: parseFloat(e.target.value) || 1.0 })}
                  className="w-full px-3 py-1.5 rounded-lg border border-amber-200 text-xs font-bold bg-white text-[#202D2B]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#28766B] hover:bg-[#1E5C53] text-white text-xs font-semibold rounded-xl shadow-xs transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving Settings...' : 'Save Loyalty Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
}
