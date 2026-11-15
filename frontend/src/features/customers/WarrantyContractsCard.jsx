import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, AlertCircle, CheckCircle2, Plus, Clock, Wrench, X, Package } from 'lucide-react';
import { enterpriseApi } from '../../services/enterprise.js';
import api from '../../services/api.js';
import { showBanner } from '../../lib/whatsapp.js';

export default function WarrantyContractsCard({ customerId }) {
  const [warranties, setWarranties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claimModalWarranty, setClaimModalWarranty] = useState(null);
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [replacementDesc, setReplacementDesc] = useState('');
  const [claimNotes, setClaimNotes] = useState('');
  const [claimSubmitting, setClaimSubmitting] = useState(false);

  const loadWarranties = async () => {
    try {
      setLoading(true);
      const data = await enterpriseApi.getCustomerWarranties(customerId);
      setWarranties(data || []);
    } catch (err) {
      console.error('Failed to load customer warranties:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const res = await api.get('/products?limit=100');
      setProducts(res.data?.data || []);
    } catch (err) {
      // non-blocking
    }
  };

  useEffect(() => {
    if (customerId) {
      loadWarranties();
      loadProducts();
    }
  }, [customerId]);

  const handleOpenClaimModal = (warranty) => {
    setClaimModalWarranty(warranty);
    setSelectedProductId('');
    setReplacementDesc(`Replacement for ${warranty.coveredItemDescription}`);
    setClaimNotes('');
  };

  const handleProcessClaim = async (e) => {
    e.preventDefault();
    if (!claimModalWarranty) return;

    setClaimSubmitting(true);
    try {
      await enterpriseApi.processWarrantyClaim(claimModalWarranty.id, {
        replacementProductId: selectedProductId || null,
        replacementDescription: replacementDesc,
        notes: claimNotes,
        claimType: 'REPLACEMENT',
      });
      showBanner('Warranty claim processed and replacement stock deducted!', 'success');
      setClaimModalWarranty(null);
      loadWarranties();
    } catch (err) {
      showBanner(err.response?.data?.error?.message || err.message, 'error');
    } finally {
      setClaimSubmitting(false);
    }
  };

  if (loading && warranties.length === 0) {
    return (
      <div className="bg-[#FEFEFC] p-4 rounded-2xl border border-[#E2E7E3] animate-pulse h-24 flex items-center justify-center text-xs text-[#66746F]">
        Loading warranty agreements...
      </div>
    );
  }

  if (warranties.length === 0) {
    return (
      <div className="bg-[#FEFEFC] p-5 rounded-2xl border border-[#E2E7E3] shadow-xs text-xs">
        <div className="flex items-center gap-2 font-bold text-[#203A36] mb-1">
          <ShieldCheck className="w-4 h-4 text-[#28766B]" />
          <span>Active Protection & Warranty Plans</span>
        </div>
        <p className="text-[11px] text-[#718580]">No active warranty contracts on file. Warranties can be attached during order checkout.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#FEFEFC] rounded-2xl border border-[#E2E7E3] shadow-xs p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-[#E8EDE6] pb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#28766B]" />
          <h3 className="font-bold text-sm text-[#203A36]">Protection Plans ({warranties.length})</h3>
        </div>
        <span className="text-[11px] text-[#718580] font-medium">Digital Repair & Replacement Contracts</span>
      </div>

      <div className="space-y-3">
        {warranties.map((w) => {
          const daysLeft = Math.ceil((new Date(w.endDate) - new Date()) / (1000 * 60 * 60 * 24));
          const isActive = w.status === 'ACTIVE' && daysLeft >= 0 && w.claimsRemaining > 0;

          return (
            <div
              key={w.id}
              className={`p-4 rounded-xl border transition ${
                isActive ? 'border-[#CCD7D2] bg-white hover:border-[#28766B]/40' : 'border-[#E2E7E3] bg-[#F9FAF8]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-[#203A36]">{w.planName}</span>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-emerald-100 text-emerald-800'
                        : w.status === 'EXHAUSTED'
                        ? 'bg-gray-100 text-gray-700'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {isActive ? 'ACTIVE' : w.status}
                    </span>
                  </div>

                  <p className="text-xs text-[#5A6F6A] font-medium mt-1">
                    Covered: <strong className="text-[#203A36]">{w.coveredItemDescription}</strong>
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#718580] mt-2">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#8C9B97]" />
                      Valid until {new Date(w.endDate).toLocaleDateString()}
                    </span>
                    {isActive && (
                      <span className="font-semibold text-emerald-700">
                        ({daysLeft} days remaining)
                      </span>
                    )}
                    <span className="font-bold text-[#203A36]">
                      Claims: {w.claimsUsed} / {w.claimsAllowed} used ({w.claimsRemaining} remaining)
                    </span>
                  </div>
                </div>

                {isActive && (
                  <button
                    onClick={() => handleOpenClaimModal(w)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#28766B] hover:bg-[#203A36] text-white rounded-xl text-xs font-bold transition shadow-xs shrink-0"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    Process Claim
                  </button>
                )}
              </div>

              {/* Claims History */}
              {Array.isArray(w.claims) && w.claims.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-[#F0F4EF] space-y-1">
                  <span className="text-[10px] font-bold text-[#8C9B97] uppercase">Fulfilled Claims:</span>
                  {w.claims.map((cl) => (
                    <div key={cl.id} className="text-[11px] text-[#5A6F6A] flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>{new Date(cl.claimedAt).toLocaleDateString()}: {cl.replacementDescription} ({cl.claimType})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Process Warranty Claim Modal */}
      {claimModalWarranty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#182C29]/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#DDE3DC]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#EBF3F1] text-[#28766B] flex items-center justify-center">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#203A36]">Process Warranty Claim</h3>
                  <p className="text-[11px] text-[#718580]">{claimModalWarranty.planName}</p>
                </div>
              </div>
              <button onClick={() => setClaimModalWarranty(null)} className="p-1 rounded-lg text-[#8C9B97] hover:text-[#203A36]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleProcessClaim} className="space-y-4 text-xs">
              <div className="bg-[#F5F7F3] p-3 rounded-xl border border-[#E2E8E0]">
                <span className="text-[10px] text-[#8C9B97] uppercase font-bold block">Covered Agreement</span>
                <span className="font-bold text-[#203A36] text-xs">{claimModalWarranty.coveredItemDescription}</span>
                <div className="text-[11px] text-[#5A6F6A] mt-0.5">
                  Remaining Claims: <strong>{claimModalWarranty.claimsRemaining}</strong>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#203A36] mb-1">
                  Replacement Inventory Stock (Optional - Auto-decrements 1 unit)
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => {
                    setSelectedProductId(e.target.value);
                    const sel = products.find(p => p.id === e.target.value);
                    if (sel) {
                      setReplacementDesc(`Replacement: ${sel.name} (${sel.brand || ''} ${sel.model_code || ''})`);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-[#CCD7D2] bg-white text-[#203A36] focus:ring-2 focus:ring-[#28766B]"
                >
                  <option value="">-- No Inventory Deduction (External / Custom Repair) --</option>
                  {products
                    .filter(p => p.stock_quantity > 0)
                    .map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} [{p.brand || p.item_type}] - Stock: {p.stock_quantity} (MRP: ₹{p.selling_price})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#203A36] mb-1">Replacement / Repair Description</label>
                <input
                  type="text"
                  required
                  value={replacementDesc}
                  onChange={(e) => setReplacementDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#CCD7D2] focus:ring-2 focus:ring-[#28766B]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#203A36] mb-1">Cashier Notes / Damage Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Scratched lens replaced under 1-year care plan"
                  value={claimNotes}
                  onChange={(e) => setClaimNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#CCD7D2] focus:ring-2 focus:ring-[#28766B]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setClaimModalWarranty(null)}
                  className="px-3.5 py-1.5 rounded-xl border border-[#CCD7D2] font-bold text-[#5A6F6A]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={claimSubmitting}
                  className="px-4 py-1.5 rounded-xl bg-[#28766B] font-bold text-white hover:bg-[#203A36] transition shadow-xs"
                >
                  {claimSubmitting ? 'Processing...' : 'Confirm Claim Fulfillment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
