import React, { useState, useEffect } from 'react';
import { enterpriseApi } from '../../services/enterprise.js';
import { ShieldCheck, Plus, Check, AlertCircle, Edit2, X, ToggleLeft, ToggleRight } from 'lucide-react';

export default function WarrantySettingsTab() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [savingPlan, setSavingPlan] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    planCode: '',
    name: '',
    description: '',
    durationMonths: 12,
    price: 499,
    maxClaims: 1,
    coveragePercentage: 100,
    terms: 'Covers accidental frame breakage & deep lens scratches.',
    active: true,
  });

  const loadPlans = async () => {
    setLoading(true);
    try {
      const data = await enterpriseApi.getWarrantyPlans(true);
      setPlans(data || []);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to load warranty plans' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingPlan(null);
    setFormData({
      planCode: `CARE_${Math.floor(Math.random() * 900 + 100)}`,
      name: '',
      description: '',
      durationMonths: 12,
      price: 499,
      maxClaims: 1,
      coveragePercentage: 100,
      terms: 'Covers accidental frame breakage & deep lens scratches.',
      active: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (plan) => {
    setEditingPlan(plan);
    setFormData({
      planCode: plan.planCode,
      name: plan.name,
      description: plan.description || '',
      durationMonths: Math.round((plan.durationDays || 365) / 30),
      price: plan.price,
      maxClaims: plan.maxClaims,
      coveragePercentage: plan.coveragePercentage || 100,
      terms: plan.terms || '',
      active: plan.active !== false,
    });
    setIsModalOpen(true);
  };

  const handleSavePlan = async (e) => {
    e.preventDefault();
    setSavingPlan(true);
    setMessage(null);

    const payload = {
      planCode: formData.planCode.toUpperCase().trim(),
      name: formData.name.trim(),
      description: formData.description,
      durationDays: Number(formData.durationMonths) * 30,
      price: parseFloat(formData.price) || 0,
      maxClaims: parseInt(formData.maxClaims, 10) || 1,
      coveragePercentage: parseFloat(formData.coveragePercentage) || 100,
      terms: formData.terms,
      active: Boolean(formData.active),
    };

    try {
      if (editingPlan) {
        await enterpriseApi.updateWarrantyPlan(editingPlan.id, payload);
        setMessage({ type: 'success', text: `Warranty plan "${formData.name}" updated successfully!` });
      } else {
        await enterpriseApi.createWarrantyPlan(payload);
        setMessage({ type: 'success', text: `New warranty plan "${formData.name}" created successfully!` });
      }
      setIsModalOpen(false);
      loadPlans();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error?.message || 'Failed to save warranty plan' });
    } finally {
      setSavingPlan(false);
    }
  };

  const handleTogglePlanActive = async (plan) => {
    try {
      await enterpriseApi.updateWarrantyPlan(plan.id, { active: !plan.active });
      loadPlans();
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update plan status' });
    }
  };

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

      {/* Header & Add Button */}
      <div className="bg-[#FEFEFC] p-6 rounded-2xl border border-[#E2E7E3] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#202D2B]">Optical Protection & Care Plans</h3>
            <p className="text-xs text-[#66746F]">Manage prepaid eyewear warranty subscriptions & replacement policies</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#28766B] hover:bg-[#1E5C53] text-white text-xs font-semibold rounded-xl shadow-xs transition shrink-0"
        >
          <Plus className="w-4 h-4" /> Add New Care Plan
        </button>
      </div>

      {/* Plans List Table */}
      <div className="bg-[#FEFEFC] rounded-2xl border border-[#E2E7E3] shadow-xs overflow-hidden">
        <div className="p-4 border-b border-[#E2E7E3] bg-[#F5F7F3] flex justify-between items-center">
          <h4 className="text-xs font-bold text-[#202D2B] uppercase tracking-wider">Active Warranty Categories</h4>
          <span className="text-xs text-[#66746F]">{plans.length} total plan(s)</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-[#66746F]">Loading care plans…</div>
        ) : plans.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#66746F] space-y-2">
            <p>No warranty plans configured yet.</p>
            <button
              onClick={handleOpenCreateModal}
              className="text-xs font-semibold text-[#28766B] hover:underline"
            >
              + Create your first 1-Year Protection Plan
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#E2E7E3]">
            {plans.map((plan) => (
              <div key={plan.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#F5F7F3]/40 transition">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#202D2B]">{plan.name}</span>
                    <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-[#EBF3F1] text-[#28766B] border border-[#CCDCD0]">
                      {plan.planCode}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      plan.active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {plan.active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>
                  {plan.description && (
                    <p className="text-xs text-[#66746F]">{plan.description}</p>
                  )}
                  <div className="text-[11px] text-[#66746F] flex items-center gap-3 pt-1">
                    <span>Duration: <strong>{Math.round((plan.durationDays || 365) / 30)} Months</strong> ({plan.durationDays} days)</span>
                    <span>•</span>
                    <span>Max Claims: <strong>{plan.maxClaims}</strong></span>
                    <span>•</span>
                    <span>Coverage: <strong>{plan.coveragePercentage || 100}%</strong></span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                  <div className="text-right">
                    <div className="text-sm font-extrabold text-[#28766B] tabular-nums">
                      ₹{parseFloat(plan.price).toLocaleString()}
                    </div>
                    <div className="text-[10px] text-[#66746F]">Billed at POS</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleTogglePlanActive(plan)}
                    className="p-1.5 rounded-lg border border-[#E2E7E3] hover:bg-[#EBF3F1] transition"
                    title={plan.active ? 'Disable plan from checkout' : 'Activate plan for checkout'}
                  >
                    {plan.active ? (
                      <ToggleRight className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <ToggleLeft className="w-5 h-5 text-gray-400" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(plan)}
                    className="p-1.5 rounded-lg border border-[#E2E7E3] hover:bg-[#F5F7F3] text-[#66746F] hover:text-[#202D2B] transition"
                    title="Edit Plan"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Create or Edit Plan */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FEFEFC] rounded-2xl border border-[#E2E7E3] shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E7E3]">
              <h3 className="font-bold text-sm text-[#202D2B]">
                {editingPlan ? 'Edit Protection Plan' : 'Create Optical Care Plan'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-[#66746F] hover:text-[#202D2B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#202D2B] mb-1">Plan Code *</label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingPlan)}
                    value={formData.planCode}
                    onChange={(e) => setFormData({ ...formData, planCode: e.target.value.toUpperCase() })}
                    placeholder="e.g. CARE_1YR"
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E7E3] text-xs font-mono font-bold bg-white uppercase disabled:bg-[#F5F7F3]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#202D2B] mb-1">Selling Price (₹) *</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-bold text-[#66746F]">₹</span>
                    <input
                      type="number"
                      required
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="499"
                      className="w-full pl-7 pr-3 py-2 rounded-xl border border-[#E2E7E3] text-xs font-bold tabular-nums bg-white"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202D2B] mb-1">Plan Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. 1-Year Frame & Lens Protection"
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E7E3] text-xs bg-white text-[#202D2B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#202D2B] mb-1">Duration (Months) *</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    required
                    value={formData.durationMonths}
                    onChange={(e) => setFormData({ ...formData, durationMonths: parseInt(e.target.value, 10) || 12 })}
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E7E3] text-xs tabular-nums bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#202D2B] mb-1">Max Claims Allowed *</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    required
                    value={formData.maxClaims}
                    onChange={(e) => setFormData({ ...formData, maxClaims: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E7E3] text-xs tabular-nums bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202D2B] mb-1">Short Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g. Covers accidental frame fracture & deep scratches"
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E7E3] text-xs bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202D2B] mb-1">Terms & Policy Text</label>
                <textarea
                  rows={2}
                  value={formData.terms}
                  onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                  placeholder="Terms printed on invoices..."
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E7E3] text-xs bg-white resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#202D2B]">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="w-4 h-4 text-[#28766B] rounded border-gray-300"
                  />
                  <span>Show this plan at POS checkout</span>
                </label>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-[#E2E7E3] text-xs font-semibold text-[#66746F] hover:bg-[#F5F7F3]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingPlan}
                    className="px-5 py-2 bg-[#28766B] hover:bg-[#1E5C53] text-white text-xs font-semibold rounded-xl shadow-xs disabled:opacity-50"
                  >
                    {savingPlan ? 'Saving...' : editingPlan ? 'Update Plan' : 'Create Plan'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
