import { calculateBilling } from '../../../../shared/billing.mjs';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api.js';
import CustomerFormModal from '../customers/CustomerFormModal.jsx';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Plus,
  Trash2,
  ShoppingBag,
  AlertCircle,
  Search,
  UserPlus,
  User,
  Eye,
  FileText,
  Copy,
  SkipForward,
  ChevronRight,
  Zap,
} from 'lucide-react';

// ─── Power helpers (mirrored from NewPrescriptionModal) ─────────────────────
const formatPower = (val) => {
  if (val === '' || val === null || val === undefined || isNaN(val)) return '';
  const num = parseFloat(val);
  if (num === 0) return '0.00';
  return (num > 0 ? '+' : '') + num.toFixed(2);
};

function PowerInput({ label, name, value, onChange, placeholder, step = 0.25, min, max, allowSign = true }) {
  const handleStep = (delta) => {
    const current = parseFloat(value) || 0;
    const next = current + delta;
    if (min !== undefined && next < min) return;
    if (max !== undefined && next > max) return;
    onChange({ target: { name, value: next.toFixed(2) } });
  };

  const handleToggleSign = () => {
    if (!value || parseFloat(value) === 0) return;
    onChange({ target: { name, value: (-parseFloat(value)).toFixed(2) } });
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px] font-semibold text-[#202D2B]">
        <span>{label}</span>
        {allowSign && value && parseFloat(value) !== 0 && (
          <button
            type="button"
            onClick={handleToggleSign}
            className="text-[10px] tabular-nums px-1.5 py-0.5 rounded-lg bg-[#E2E7E3] hover:bg-[#D5DDD6] text-[#202D2B] transition"
            title="Toggle Positive/Negative"
          >
            ± Sign
          </button>
        )}
      </div>
      <div className="flex items-center rounded-xl border border-[#E2E7E3] bg-white focus-within:ring-2 focus-within:ring-[#28766B]/30 focus-within:border-[#28766B] overflow-hidden shadow-sm">
        <button
          type="button"
          onClick={() => handleStep(-step)}
          className="px-2.5 py-2 text-[#66746F] hover:text-[#202D2B] hover:bg-[#F5F7F3] font-bold text-xs select-none transition"
        >
          -
        </button>
        <input
          type="number"
          step={step}
          name={name}
          min={min}
          max={max}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className="w-full text-center py-1.5 text-xs font-bold tabular-nums text-[#202D2B] focus:outline-none bg-transparent"
        />
        <button
          type="button"
          onClick={() => handleStep(step)}
          className="px-2.5 py-2 text-[#66746F] hover:text-[#202D2B] hover:bg-[#F5F7F3] font-bold text-xs select-none transition"
        >
          +
        </button>
      </div>
    </div>
  );
}

// ─── Step indicator ──────────────────────────────────────────────────────────
function StepIndicator({ currentStep, onStepClick }) {
  const steps = [
    { num: 1, label: '1. Customer' },
    { num: 2, label: '2. Prescription' },
    { num: 3, label: '3. Order' },
  ];
  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2">
      {steps.map((step, idx) => {
        const done = currentStep > step.num;
        const active = currentStep === step.num;
        return (
          <React.Fragment key={step.num}>
            <button
              type="button"
              onClick={() => onStepClick && onStepClick(step.num)}
              disabled={!done && !active}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                active
                  ? 'bg-[#28766B] text-white shadow-sm'
                  : done
                  ? 'bg-[#EBF3F1] text-[#28766B] hover:bg-[#DDEAE7] cursor-pointer'
                  : 'bg-[#F5F7F3] text-[#9AA8A3] cursor-not-allowed border border-[#E2E7E3]'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  active ? 'bg-white text-[#28766B]' : done ? 'bg-[#28766B] text-white' : 'bg-transparent text-[#9AA8A3]'
                }`}
              >
                {done ? <Check className="w-3 h-3" /> : step.num}
              </div>
              <span>{step.label}</span>
            </button>
            {idx < steps.length - 1 && (
              <ChevronRight className="w-4 h-4 text-[#C4D0CC] shrink-0" />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Step 1: Customer Selection ──────────────────────────────────────────────
function CustomerStep({ selectedCustomer, onCustomerSelected, onNext }) {
  const [query, setQuery] = useState('');
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length === 0) {
        setLoading(true);
        api.get('/customers?limit=15')
          .then((r) => setCustomers(r.data?.data || []))
          .catch(() => {})
          .finally(() => setLoading(false));
      } else {
        setLoading(true);
        api.get('/customers', { params: { search: query.trim(), limit: 15 } })
          .then((r) => setCustomers(r.data?.data || []))
          .catch(() => {})
          .finally(() => setLoading(false));
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const handleContinue = () => {
    if (!selectedCustomer) {
      setError('Please select an existing customer or create a new one to continue.');
      return;
    }
    setError('');
    onNext();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E7E3]">
        <div>
          <h2 className="font-bold text-[#202D2B] text-base flex items-center gap-2">
            <User className="w-4 h-4 text-[#28766B]" />
            Customer Selection or Creation
          </h2>
          <p className="text-xs text-[#66746F] mt-0.5">Search an existing customer or register a new walk-in client</p>
        </div>
        <button
          type="button"
          onClick={() => setShowNewModal(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#28766B] hover:bg-[#1E5C53] text-white rounded-xl text-xs font-semibold shadow-sm transition"
        >
          <UserPlus className="w-3.5 h-3.5" />
          Add New Customer
        </button>
      </div>

      {error && (
        <div role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-800 text-xs font-medium">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Selected customer card banner */}
      {selectedCustomer ? (
        <div className="p-4 bg-[#EBF3F1] border-2 border-[#28766B] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#28766B] text-white flex items-center justify-center font-bold text-sm shadow-xs">
              {selectedCustomer.full_name?.charAt(0) || 'C'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#202D2B] text-sm">{selectedCustomer.full_name}</span>
                <span className="text-[10px] font-bold text-[#28766B] bg-white px-2 py-0.5 rounded-full border border-[#28766B]/20">
                  {selectedCustomer.customer_code || 'ID'}
                </span>
              </div>
              <div className="text-xs text-[#66746F] tabular-nums mt-0.5">
                {selectedCustomer.phone ? `Phone: ${selectedCustomer.phone}` : 'No phone'}{' '}
                {selectedCustomer.age ? `• Age: ${selectedCustomer.age}` : ''}{' '}
                {selectedCustomer.gender ? `• ${selectedCustomer.gender}` : ''}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onCustomerSelected(null)}
              className="px-3 py-1.5 rounded-xl border border-[#C4D0CC] bg-white text-xs font-semibold text-[#66746F] hover:text-rose-600 hover:border-rose-300 transition"
            >
              Change Customer
            </button>
            <button
              type="button"
              onClick={handleContinue}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#28766B] hover:bg-[#1E5C53] text-white rounded-xl text-xs font-semibold shadow-xs transition"
            >
              Continue
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9AA8A3]" />
            <input
              type="text"
              placeholder="Search by name, 10-digit phone, or customer ID (e.g. CUST-1001)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E2E7E3] text-xs text-[#202D2B] bg-white focus:ring-2 focus:ring-[#28766B]/30 focus:border-[#28766B] focus:outline-none"
              autoFocus
            />
          </div>

          <div className="border border-[#E2E7E3] rounded-2xl bg-white divide-y divide-[#E2E7E3] max-h-72 overflow-y-auto">
            {loading && (
              <div className="text-xs text-[#66746F] py-6 text-center">Searching customer records...</div>
            )}
            {!loading && customers.length === 0 && (
              <div className="text-xs text-[#66746F] py-6 text-center space-y-2">
                <p>No customers match your search.</p>
                <button
                  type="button"
                  onClick={() => setShowNewModal(true)}
                  className="inline-flex items-center gap-1 text-[#28766B] font-semibold hover:underline"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Click here to register as a new customer
                </button>
              </div>
            )}
            {!loading &&
              customers.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    onCustomerSelected(c);
                    setError('');
                  }}
                  className="w-full flex items-center justify-between p-3.5 hover:bg-[#EBF3F1]/70 transition text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[#F5F7F3] border border-[#E2E7E3] group-hover:bg-[#28766B] group-hover:text-white flex items-center justify-center text-xs font-bold text-[#28766B] transition shrink-0">
                      {c.full_name?.charAt(0) || 'C'}
                    </div>
                    <div>
                      <div className="font-semibold text-[#202D2B] text-xs group-hover:text-[#28766B] transition">
                        {c.full_name}
                      </div>
                      <div className="text-[11px] text-[#66746F] tabular-nums">
                        {c.customer_code} • {c.phone || 'No phone'}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-[#28766B] group-hover:translate-x-0.5 transition flex items-center gap-1">
                    Select <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </button>
              ))}
          </div>
        </div>
      )}

      <CustomerFormModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        onCustomerCreated={(newCustomer) => {
          onCustomerSelected(newCustomer);
          setShowNewModal(false);
          setError('');
        }}
      />
    </div>
  );
}

// ─── Step 2: Prescription Entry ──────────────────────────────────────────────
function PrescriptionStep({
  customer,
  rxData,
  setRxData,
  savedPrescription,
  onSkip,
  onBack,
  onSave,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [existingRx, setExistingRx] = useState([]);

  useEffect(() => {
    if (customer?.id) {
      api.get(`/customers/${customer.id}/prescriptions`)
        .then((r) => setExistingRx(r.data?.data || []))
        .catch(() => {});
    }
  }, [customer?.id]);

  const handleChange = (e) => {
    setRxData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCopyRightToLeft = () => {
    setRxData((prev) => ({
      ...prev,
      lSph: prev.rSph,
      lCyl: prev.rCyl,
      lAxis: prev.rAxis,
      lAdd: prev.rAdd,
    }));
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 1800);
  };

  const handleSetPlano = () => {
    setRxData((prev) => ({
      ...prev,
      rSph: '0.00', rCyl: '0.00', rAxis: '',
      lSph: '0.00', lCyl: '0.00', lAxis: '',
    }));
  };

  const hasAnyValue = () =>
    ['rSph', 'rCyl', 'rAxis', 'rAdd', 'lSph', 'lCyl', 'lAxis', 'lAdd'].some(
      (k) => rxData[k] !== '' && rxData[k] !== null && rxData[k] !== undefined
    );

  const handleSaveAndContinue = async () => {
    if (loading) return;
    setError('');

    if (!hasAnyValue()) {
      // If all powers are empty, allow skipping smoothly
      onSkip();
      return;
    }

    // Axis validation
    if (rxData.rAxis !== '' && (parseInt(rxData.rAxis, 10) < 0 || parseInt(rxData.rAxis, 10) > 180)) {
      setError('Right Eye (OD) Axis must be between 0 and 180 degrees.');
      return;
    }
    if (rxData.lAxis !== '' && (parseInt(rxData.lAxis, 10) < 0 || parseInt(rxData.lAxis, 10) > 180)) {
      setError('Left Eye (OS) Axis must be between 0 and 180 degrees.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        rSph: rxData.rSph !== '' ? parseFloat(rxData.rSph) : null,
        rCyl: rxData.rCyl !== '' ? parseFloat(rxData.rCyl) : null,
        rAxis: rxData.rAxis !== '' ? parseInt(rxData.rAxis, 10) : null,
        rAdd: rxData.rAdd !== '' ? parseFloat(rxData.rAdd) : null,
        lSph: rxData.lSph !== '' ? parseFloat(rxData.lSph) : null,
        lCyl: rxData.lCyl !== '' ? parseFloat(rxData.lCyl) : null,
        lAxis: rxData.lAxis !== '' ? parseInt(rxData.lAxis, 10) : null,
        lAdd: rxData.lAdd !== '' ? parseFloat(rxData.lAdd) : null,
        pd: rxData.pd !== '' ? parseFloat(rxData.pd) : null,
        notes: rxData.notes || null,
      };

      let res;
      // Prevent duplicate creation: update if already saved in this flow session
      if (savedPrescription?.id) {
        res = await api.patch(`/customers/${customer.id}/prescriptions/${savedPrescription.id}`, payload);
      } else {
        res = await api.post(`/customers/${customer.id}/prescriptions`, payload);
      }
      onSave(res.data?.data || res.data);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to save eye test prescription.');
    } finally {
      setLoading(false);
    }
  };

  const formatEyeNotation = (sph, cyl, axis, add) => {
    const s = formatPower(sph) || '0.00';
    const c = formatPower(cyl);
    const ax = axis ? `× ${axis}°` : '';
    const ad = formatPower(add) ? ` | Add ${formatPower(add)}` : '';
    let res = `${s} DS`;
    if (c && c !== '0.00') res += ` / ${c} DC ${ax}`;
    res += ad;
    return res;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E7E3]">
        <div>
          <h2 className="font-bold text-[#202D2B] text-base flex items-center gap-2">
            <Eye className="w-4 h-4 text-[#28766B]" />
            Prescription (Refraction Power Matrix)
          </h2>
          <p className="text-xs text-[#66746F] mt-0.5">
            Recording eye test for <strong className="text-[#202D2B]">{customer?.full_name}</strong>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSetPlano}
            className="px-2.5 py-1 rounded-xl bg-[#F5F7F3] hover:bg-[#E2E7E3] text-[#66746F] text-xs font-semibold border border-[#E2E7E3] transition"
            title="Reset to Plano (0.00)"
          >
            Plano (0.00)
          </button>
          <button
            type="button"
            onClick={handleCopyRightToLeft}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#28766B] hover:bg-[#1E5C53] text-white text-xs font-semibold shadow-xs transition"
          >
            {copySuccess ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
            {copySuccess ? 'Copied to OS!' : 'Copy OD → OS'}
          </button>
        </div>
      </div>

      {existingRx.length > 0 && !savedPrescription && (
        <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl text-xs text-teal-800 flex items-center justify-between gap-2">
          <span>
            ℹ Customer has {existingRx.length} existing recorded prescription(s). You can record a new one below, or skip to link an existing test.
          </span>
          <button
            type="button"
            onClick={onSkip}
            className="px-2.5 py-1 bg-white border border-teal-300 rounded-lg font-semibold text-teal-800 hover:bg-teal-100/50 transition shrink-0"
          >
            Skip & Use Existing
          </button>
        </div>
      )}

      {error && (
        <div role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-800 text-xs font-medium">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* RIGHT EYE */}
      <div className="p-4 rounded-2xl bg-[#F5F7F3] border border-[#E2E7E3] space-y-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-sky-600 ring-4 ring-sky-100" />
            <span className="font-bold text-[#202D2B] text-xs uppercase tracking-wider">Right Eye (OD - Oculus Dexter)</span>
          </div>
          <span className="text-xs font-bold tabular-nums px-2.5 py-0.5 rounded-full bg-white text-[#202D2B] border border-[#E2E7E3]">
            {formatEyeNotation(rxData.rSph, rxData.rCyl, rxData.rAxis, rxData.rAdd)}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <PowerInput label="SPHERE (SPH)" name="rSph" value={rxData.rSph} onChange={handleChange} placeholder="0.00" />
          <PowerInput label="CYLINDER (CYL)" name="rCyl" value={rxData.rCyl} onChange={handleChange} placeholder="0.00" />
          <PowerInput label="AXIS (0-180°)" name="rAxis" value={rxData.rAxis} onChange={handleChange} placeholder="90" step={5} min={0} max={180} allowSign={false} />
          <PowerInput label="ADD (Near)" name="rAdd" value={rxData.rAdd} onChange={handleChange} placeholder="+1.50" step={0.25} min={0.5} max={4.0} allowSign={false} />
        </div>
      </div>

      {/* LEFT EYE */}
      <div className="p-4 rounded-2xl bg-[#F5F7F3] border border-[#E2E7E3] space-y-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-600 ring-4 ring-emerald-100" />
            <span className="font-bold text-[#202D2B] text-xs uppercase tracking-wider">Left Eye (OS - Oculus Sinister)</span>
          </div>
          <span className="text-xs font-bold tabular-nums px-2.5 py-0.5 rounded-full bg-white text-[#202D2B] border border-[#E2E7E3]">
            {formatEyeNotation(rxData.lSph, rxData.lCyl, rxData.lAxis, rxData.lAdd)}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <PowerInput label="SPHERE (SPH)" name="lSph" value={rxData.lSph} onChange={handleChange} placeholder="0.00" />
          <PowerInput label="CYLINDER (CYL)" name="lCyl" value={rxData.lCyl} onChange={handleChange} placeholder="0.00" />
          <PowerInput label="AXIS (0-180°)" name="lAxis" value={rxData.lAxis} onChange={handleChange} placeholder="90" step={5} min={0} max={180} allowSign={false} />
          <PowerInput label="ADD (Near)" name="lAdd" value={rxData.lAdd} onChange={handleChange} placeholder="+1.50" step={0.25} min={0.5} max={4.0} allowSign={false} />
        </div>
      </div>

      {/* PD & Notes */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#F5F7F3] p-4 rounded-2xl border border-[#E2E7E3]">
        <div>
          <label className="block text-xs font-semibold text-[#202D2B] mb-1">PD (Pupillary Distance, mm)</label>
          <input
            type="number"
            step="0.5"
            name="pd"
            placeholder="63.0"
            value={rxData.pd}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded-xl border border-[#E2E7E3] text-xs font-bold tabular-nums text-[#202D2B] focus:ring-2 focus:ring-[#28766B]/30 focus:border-[#28766B] focus:outline-none bg-white"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-[#202D2B] mb-1">Clinical Remarks / Recommended Lens Type</label>
          <input
            type="text"
            name="notes"
            placeholder="e.g. Anti-reflective progressive blue-cut, poly-carbonate"
            value={rxData.notes}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded-xl border border-[#E2E7E3] text-xs text-[#202D2B] placeholder:text-[#9AA8A3] focus:ring-2 focus:ring-[#28766B]/30 focus:border-[#28766B] focus:outline-none bg-white"
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-[#E2E7E3]">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#66746F] hover:bg-[#F5F7F3] rounded-xl transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Customer
        </button>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onSkip}
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-[#E2E7E3] text-xs font-semibold text-[#66746F] hover:bg-[#F5F7F3] rounded-xl transition"
            title="Skip if purchase does not require prescription"
          >
            <SkipForward className="w-3.5 h-3.5" />
            Skip (No Prescription Needed)
          </button>
          <button
            type="button"
            onClick={handleSaveAndContinue}
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2 bg-[#28766B] hover:bg-[#1E5C53] text-white rounded-xl text-xs font-semibold shadow-sm disabled:opacity-50 transition"
          >
            <FileText className="w-4 h-4" />
            {loading ? 'Saving Refraction...' : savedPrescription ? 'Update & Proceed to Order' : 'Save Prescription & Proceed'}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Step 3: Order Details ────────────────────────────────────────────────────
function OrderStep({
  customer,
  orderData,
  setOrderData,
  prescriptions,
  onBack,
  onOrderCreated,
}) {
  const getDefaultGstAndHsn = (itemType) => {
    switch (itemType) {
      case 'FRAME':
      case 'SUNGLASSES':
        return { hsnCode: '9004', gstRate: 12 };
      case 'LENS':
      case 'CONTACT_LENS':
      case 'SOLUTION':
        return { hsnCode: '9001', gstRate: 18 };
      default:
        return { hsnCode: '', gstRate: 0 };
    }
  };

  const [stockProducts, setStockProducts] = useState([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/products?limit=200')
      .then((res) => setStockProducts(res.data?.data || []))
      .catch(() => {});
  }, []);

  const {
    isGstBill,
    items,
    selectedPrescriptionId,
    dueDate,
    orderDiscount,
    notes,
    advanceAmount,
    paymentMethod,
    paymentRef,
  } = orderData;

  let billing, billingError = '';
  try {
    billing = calculateBilling(items, orderDiscount, isGstBill);
  } catch (e) {
    billingError = e.message;
  }
  const { subtotal = 0, totalTaxableValue: totalTaxable = 0, totalCgst = 0, totalSgst = 0, totalAmount: grandTotal = 0 } = billing || {};

  const handleDescriptionChange = (index, text) => {
    const updated = [...items];
    updated[index].description = text;
    updated[index].productId = null;
    setOrderData((prev) => ({ ...prev, items: updated }));
    setActiveSuggestionIndex(index);
  };

  const handleSelectSuggestion = (index, product) => {
    const updated = [...items];
    const { hsnCode, gstRate } = getDefaultGstAndHsn(product.item_type);
    updated[index].productId = product.id;
    updated[index].description = `${product.brand ? product.brand + ' ' : ''}${product.name}${product.model_code ? ' (' + product.model_code + ')' : ''}`;
    updated[index].unitPrice = product.selling_price;
    updated[index].itemType = product.item_type;
    updated[index].hsnCode = product.hsn_code || hsnCode;
    updated[index].gstRate = product.gst_rate !== null && product.gst_rate !== undefined ? product.gst_rate : gstRate;
    setOrderData((prev) => ({ ...prev, items: updated }));
    setActiveSuggestionIndex(null);
  };

  const addItem = () => {
    const defaults = getDefaultGstAndHsn('ACCESSORY');
    setOrderData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { productId: null, itemType: 'ACCESSORY', description: '', quantity: 1, unitPrice: '', discount: 0, hsnCode: defaults.hsnCode, gstRate: defaults.gstRate },
      ],
    }));
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      setOrderData((prev) => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index),
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError('');

    if (billingError) {
      setError(billingError);
      return;
    }
    if (!customer?.id) {
      setError('Please select a customer first.');
      return;
    }
    if (items.some((i) => !i.description || !i.unitPrice)) {
      setError('Please fill in descriptions and valid prices for all order items.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        customerId: customer.id,
        prescriptionId: selectedPrescriptionId || null,
        dueDate,
        isGstBill,
        items: items.map((i) => ({
          productId: i.productId || null,
          itemType: i.itemType,
          description: i.description.trim(),
          quantity: parseInt(i.quantity, 10),
          unitPrice: parseFloat(i.unitPrice),
          discount: parseFloat(i.discount) || 0,
          hsnCode: i.hsnCode || null,
          gstRate: isGstBill ? (parseFloat(i.gstRate) || 0) : 0,
        })),
        discount: parseFloat(orderDiscount) || 0,
        notes,
        advancePayment: advanceAmount && parseFloat(advanceAmount) > 0
          ? { amount: parseFloat(advanceAmount), paymentMethod, reference: paymentRef }
          : null,
      };

      const response = await api.post('/orders', payload);
      onOrderCreated(response.data?.data || response.data);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to create order.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E7E3]">
        <div>
          <h2 className="font-bold text-[#202D2B] text-base flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-[#28766B]" />
            Order Creation & Billing
          </h2>
          <p className="text-xs text-[#66746F] mt-0.5">
            Creating order for <strong className="text-[#202D2B]">{customer?.full_name}</strong>
          </p>
        </div>
        <div className="text-xs text-[#28766B] font-semibold bg-[#EBF3F1] px-3 py-1.5 rounded-xl border border-[#28766B]/20">
          Auto-linked to Customer #{customer?.customer_code || 'ID'}
        </div>
      </div>

      {error && (
        <div role="alert" className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-800 text-xs font-medium">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Linked Prescription Section */}
      <div className="bg-[#FEFEFC] p-4 rounded-2xl border border-[#E2E7E3] space-y-1.5 shadow-xs">
        <label className="block text-xs font-semibold text-[#202D2B]">Linked Eye Test / Prescription</label>
        <select
          value={selectedPrescriptionId || ''}
          onChange={(e) => setOrderData((prev) => ({ ...prev, selectedPrescriptionId: e.target.value }))}
          className="w-full px-3 py-2 rounded-xl border border-[#E2E7E3] text-xs text-[#202D2B] focus:ring-2 focus:ring-[#28766B]/30 focus:border-[#28766B] focus:outline-none bg-white"
        >
          <option value="">-- No linked prescription (Non-prescription purchase) --</option>
          {prescriptions.map((p, index) => (
            <option key={p.id} value={p.id}>
              {index === 0 ? 'Current Prescription' : `Test #${prescriptions.length - index}`} ({new Date(p.tested_at || p.created_at).toLocaleDateString()})
            </option>
          ))}
        </select>
        <p className="text-[11px] text-[#66746F]">
          {selectedPrescriptionId
            ? '✓ Prescription power details will appear on the printed tax invoice & optical job card.'
            : 'No prescription attached (standard sunglasses, solution, accessories, or frames).'}
        </p>
      </div>

      {/* Order Line Items */}
      <div className="bg-[#FEFEFC] p-5 rounded-2xl border border-[#E2E7E3] space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#E2E7E3]">
          <div>
            <h3 className="font-bold text-[#202D2B] text-xs">Order Line Items</h3>
            <p className="text-[11px] text-[#66746F]">Configure frames, spectacle lenses, coatings, or accessories</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#202D2B] bg-[#F5F7F3] px-3 py-1.5 rounded-xl border border-[#E2E7E3]">
              <input
                type="checkbox"
                checked={isGstBill}
                onChange={(e) => setOrderData((prev) => ({ ...prev, isGstBill: e.target.checked }))}
                className="w-4 h-4 text-[#28766B] rounded focus:ring-[#28766B]"
              />
              <span>Generate Official GST Tax Invoice</span>
            </label>
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#28766B] hover:underline"
            >
              <Plus className="w-3.5 h-3.5" /> Add Item
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {items.map((item, index) => {
            const matchedSuggestions = stockProducts.filter(
              (p) =>
                p.item_type === item.itemType &&
                (item.description
                  ? p.name.toLowerCase().includes(item.description.toLowerCase()) ||
                    (p.brand && p.brand.toLowerCase().includes(item.description.toLowerCase())) ||
                    (p.model_code && p.model_code.toLowerCase().includes(item.description.toLowerCase()))
                  : true)
            );

            return (
              <div key={index} className="p-4 bg-[#F5F7F3] border border-[#E2E7E3] rounded-xl space-y-3 relative">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-[#66746F] uppercase mb-1">Type</label>
                    <select
                      value={item.itemType}
                      onChange={(e) => {
                        const updated = [...items];
                        const newType = e.target.value;
                        const { hsnCode, gstRate } = getDefaultGstAndHsn(newType);
                        updated[index].itemType = newType;
                        updated[index].hsnCode = hsnCode;
                        updated[index].gstRate = gstRate;
                        setOrderData((prev) => ({ ...prev, items: updated }));
                      }}
                      className="w-full px-2 py-2 rounded-xl border border-[#E2E7E3] text-xs bg-white text-[#202D2B] font-semibold focus:outline-none"
                    >
                      <option value="FRAME">Frame</option>
                      <option value="LENS">Lens</option>
                      <option value="SUNGLASSES">Sunglasses</option>
                      <option value="CONTACT_LENS">Contact Lens</option>
                      <option value="SOLUTION">Solution</option>
                      <option value="ACCESSORY">Accessory</option>
                      <option value="SERVICE">Service</option>
                    </select>
                  </div>

                  <div className="md:col-span-4 relative">
                    <label className="block text-[10px] font-bold text-[#66746F] uppercase mb-1">Description / Product Name</label>
                    <input
                      type="text"
                      required
                      placeholder={`Type ${item.itemType.toLowerCase()} description...`}
                      value={item.description}
                      onFocus={() => setActiveSuggestionIndex(index)}
                      onChange={(e) => handleDescriptionChange(index, e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#E2E7E3] text-xs text-[#202D2B] bg-white focus:ring-2 focus:ring-[#28766B]/30 focus:border-[#28766B] focus:outline-none"
                    />

                    {activeSuggestionIndex === index && matchedSuggestions.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-[#FEFEFC] border border-[#E2E7E3] rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-[#E2E7E3]">
                        <div className="p-1.5 text-[10px] font-bold text-[#66746F] bg-[#F5F7F3] uppercase tracking-wider flex justify-between">
                          <span>Inventory Catalog Matches</span>
                          <button type="button" onClick={() => setActiveSuggestionIndex(null)} className="text-[#66746F] hover:text-[#202D2B]">✕</button>
                        </div>
                        {matchedSuggestions.map((prod) => (
                          <button
                            key={prod.id}
                            type="button"
                            onClick={() => handleSelectSuggestion(index, prod)}
                            className="w-full text-left p-2.5 hover:bg-[#EBF3F1] transition flex items-center justify-between text-xs"
                          >
                            <div>
                              <div className="font-semibold text-[#202D2B]">
                                {prod.brand ? `${prod.brand} ` : ''}{prod.name}
                              </div>
                              {prod.model_code && <div className="text-[10px] text-[#66746F]">Code: {prod.model_code}</div>}
                            </div>
                            <div className="text-right">
                              <div className="tabular-nums font-bold text-[#28766B]">₹{parseFloat(prod.selling_price).toLocaleString()}</div>
                              <div className="text-[10px] text-[#66746F]">In Stock: {prod.stock_quantity}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-[#66746F] uppercase mb-1">HSN Code</label>
                    <input
                      type="text"
                      placeholder="e.g. 9004"
                      value={item.hsnCode || ''}
                      onChange={(e) => {
                        const u = [...items];
                        u[index].hsnCode = e.target.value;
                        setOrderData((prev) => ({ ...prev, items: u }));
                      }}
                      className="w-full px-2 py-2 rounded-xl border border-[#E2E7E3] text-xs bg-white text-[#202D2B] tabular-nums focus:outline-none uppercase"
                    />
                  </div>

                  {isGstBill && (
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-[#66746F] uppercase mb-1">GST Rate</label>
                      <select
                        value={item.gstRate}
                        onChange={(e) => {
                          const u = [...items];
                          u[index].gstRate = e.target.value;
                          setOrderData((prev) => ({ ...prev, items: u }));
                        }}
                        className="w-full px-2 py-2 rounded-xl border border-[#E2E7E3] text-xs bg-white text-[#202D2B] font-semibold focus:outline-none"
                      >
                        <option value="0">0% GST</option>
                        <option value="5">5% GST</option>
                        <option value="12">12% GST</option>
                        <option value="18">18% GST</option>
                        <option value="28">28% GST</option>
                      </select>
                    </div>
                  )}

                  <div className={isGstBill ? 'md:col-span-2' : 'md:col-span-4'}>
                    <label className="block text-[10px] font-bold text-[#66746F] uppercase mb-1">Total Price (₹)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        required
                        placeholder="0"
                        value={item.unitPrice}
                        onChange={(e) => {
                          const u = [...items];
                          u[index].unitPrice = e.target.value;
                          setOrderData((prev) => ({ ...prev, items: u }));
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-[#E2E7E3] text-xs bg-white text-[#202D2B] tabular-nums font-bold text-right focus:outline-none"
                      />
                      {items.length > 1 && (
                        <button type="button" onClick={() => removeItem(index)} className="p-1.5 text-[#66746F] hover:text-rose-700 rounded-lg shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pricing Summary */}
        <div className="pt-4 border-t border-[#E2E7E3] flex justify-end">
          <div className="w-80 space-y-2 text-xs bg-[#F5F7F3] p-4 rounded-xl border border-[#E2E7E3]">
            <div className="flex justify-between text-[#66746F]">
              <span>Subtotal (Incl. Taxes):</span>
              <span className="tabular-nums font-bold text-[#202D2B]">₹{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            {isGstBill && (
              <>
                <div className="flex justify-between text-[#66746F]">
                  <span>Taxable Value (Net):</span>
                  <span className="tabular-nums">₹{totalTaxable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-[#66746F]">
                  <span>CGST:</span>
                  <span className="tabular-nums">₹{totalCgst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-[#66746F]">
                  <span>SGST:</span>
                  <span className="tabular-nums">₹{totalSgst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </>
            )}
            <div className="flex justify-between items-center text-[#66746F] pt-1 border-t border-[#E2E7E3]">
              <span>Order Discount (₹):</span>
              <input
                type="number"
                value={orderDiscount}
                onChange={(e) => setOrderData((prev) => ({ ...prev, orderDiscount: e.target.value }))}
                className="w-24 px-2 py-1 rounded-lg border border-[#E2E7E3] text-right tabular-nums text-xs bg-white text-[#202D2B]"
              />
            </div>
            <div className="flex justify-between font-bold text-sm text-[#202D2B] border-t border-[#E2E7E3] pt-2">
              <span>Grand Total Payable:</span>
              <span className="tabular-nums text-[#28766B]">₹{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Advance Payment & Delivery Due Date */}
      <div className="bg-[#FEFEFC] p-5 rounded-2xl border border-[#E2E7E3] space-y-4 shadow-xs">
        <h3 className="font-bold text-[#202D2B] text-xs">Advance Payment & Due Date</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#202D2B] mb-1">Expected Delivery Date *</label>
            <input
              type="date"
              required
              value={dueDate}
              onChange={(e) => setOrderData((prev) => ({ ...prev, dueDate: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-[#E2E7E3] text-xs text-[#202D2B] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#202D2B] mb-1">Advance Amount Paid (₹)</label>
            <input
              type="number"
              placeholder="e.g. 1000"
              value={advanceAmount}
              onChange={(e) => setOrderData((prev) => ({ ...prev, advanceAmount: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-[#E2E7E3] text-xs tabular-nums text-[#202D2B] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#202D2B] mb-1">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setOrderData((prev) => ({ ...prev, paymentMethod: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-[#E2E7E3] text-xs text-[#202D2B] bg-white focus:outline-none"
            >
              <option value="UPI">Google Pay / PhonePe (UPI)</option>
              <option value="CASH">Cash</option>
              <option value="CARD">Credit / Debit Card</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
            </select>
          </div>
        </div>

        {paymentMethod !== 'CASH' && (
          <div>
            <label className="block text-xs font-semibold text-[#202D2B] mb-1">Payment Reference / UPI Ref ID</label>
            <input
              type="text"
              placeholder="e.g. UPI Ref / Cheque No."
              value={paymentRef}
              onChange={(e) => setOrderData((prev) => ({ ...prev, paymentRef: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-[#E2E7E3] text-xs text-[#202D2B] focus:outline-none"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-[#202D2B] mb-1">Order Notes / Special Instructions</label>
          <input
            type="text"
            placeholder="e.g. High index 1.67 lenses, customer picking up Saturday"
            value={notes}
            onChange={(e) => setOrderData((prev) => ({ ...prev, notes: e.target.value }))}
            className="w-full px-3 py-2 rounded-xl border border-[#E2E7E3] text-xs text-[#202D2B] placeholder:text-[#9AA8A3] focus:outline-none"
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-[#E2E7E3]">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#66746F] hover:bg-[#F5F7F3] rounded-xl transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Prescription
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 bg-[#28766B] hover:bg-[#1E5C53] text-white rounded-xl text-xs font-semibold shadow-sm disabled:opacity-50 transition flex items-center gap-2"
        >
          {loading ? 'Creating Order...' : 'Confirm & Create Order'}
        </button>
      </div>
    </form>
  );
}

// ─── Step 4: Success State ────────────────────────────────────────────────────
function SuccessStep({ order, customer, onViewOrder, onNewFlow }) {
  return (
    <div className="flex flex-col items-center gap-6 py-8 text-center animate-in fade-in zoom-in-95 duration-200">
      <div className="w-16 h-16 rounded-2xl bg-[#EBF3F1] border-2 border-[#28766B]/30 flex items-center justify-center text-[#28766B] shadow-sm">
        <Check className="w-8 h-8" />
      </div>
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-[#202D2B]">Optical Order Created Successfully!</h2>
        <p className="text-xs text-[#66746F]">
          Order <span className="font-bold text-[#28766B]">{order?.order_number}</span> has been linked to{' '}
          <strong>{customer?.full_name}</strong> (#{customer?.customer_code || 'ID'}).
        </p>
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onNewFlow}
          className="px-4 py-2.5 border border-[#E2E7E3] text-xs font-semibold text-[#66746F] hover:bg-[#F5F7F3] rounded-xl transition"
        >
          Create Another Order
        </button>
        <button
          type="button"
          onClick={onViewOrder}
          className="px-5 py-2.5 bg-[#28766B] hover:bg-[#1E5C53] text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
        >
          View Order Details & Print Bill
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Main QuickOrderFlowPage Component ─────────────────────────────────────────
export default function QuickOrderFlowPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedCustomerId = searchParams.get('customerId');

  const [step, setStep] = useState(1); // 1 | 2 | 3 | 4
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [savedPrescription, setSavedPrescription] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [createdOrder, setCreatedOrder] = useState(null);

  // Prescription Form State (Preserved across step navigation)
  const [rxData, setRxData] = useState({
    rSph: '', rCyl: '', rAxis: '', rAdd: '',
    lSph: '', lCyl: '', lAxis: '', lAdd: '',
    pd: '63.0', notes: '',
  });

  // Order Form State (Preserved across step navigation)
  const [orderData, setOrderData] = useState({
    isGstBill: true,
    items: [
      { productId: null, itemType: 'FRAME', description: '', quantity: 1, unitPrice: '', discount: 0, hsnCode: '9004', gstRate: 12 },
      { productId: null, itemType: 'LENS', description: '', quantity: 1, unitPrice: '', discount: 0, hsnCode: '9001', gstRate: 18 },
    ],
    selectedPrescriptionId: '',
    dueDate: () => {
      const d = new Date();
      d.setDate(d.getDate() + 3);
      return d.toISOString().split('T')[0];
    },
    orderDiscount: 0,
    notes: '',
    advanceAmount: '',
    paymentMethod: 'UPI',
    paymentRef: '',
  });

  // Ensure dueDate is string
  useEffect(() => {
    if (typeof orderData.dueDate === 'function') {
      setOrderData((prev) => ({ ...prev, dueDate: prev.dueDate() }));
    }
  }, []);

  // Pre-select customer if customerId query param is provided
  useEffect(() => {
    if (preselectedCustomerId) {
      api.get(`/customers/${preselectedCustomerId}`)
        .then((res) => {
          setSelectedCustomer(res.data?.data || res.data);
          setStep(2);
        })
        .catch(() => {});
    }
  }, [preselectedCustomerId]);

  // Load existing prescriptions whenever selectedCustomer changes
  useEffect(() => {
    if (selectedCustomer?.id) {
      api.get(`/customers/${selectedCustomer.id}/prescriptions`)
        .then((r) => setPrescriptions(r.data?.data || []))
        .catch(() => setPrescriptions([]));
    } else {
      setPrescriptions([]);
    }
  }, [selectedCustomer?.id]);

  const handleCustomerSelected = (cust) => {
    setSelectedCustomer(cust);
    setSavedPrescription(null);
    setRxData({
      rSph: '', rCyl: '', rAxis: '', rAdd: '',
      lSph: '', lCyl: '', lAxis: '', lAdd: '',
      pd: '63.0', notes: '',
    });
    setOrderData((prev) => ({
      ...prev,
      selectedPrescriptionId: '',
    }));
  };

  const handlePrescriptionSaved = (newRx) => {
    setSavedPrescription(newRx);
    // Refresh customer prescriptions and auto-select this new prescription in Order step
    if (selectedCustomer?.id) {
      api.get(`/customers/${selectedCustomer.id}/prescriptions`)
        .then((r) => {
          const list = r.data?.data || [];
          setPrescriptions(list);
        })
        .catch(() => {});
    }
    setOrderData((prev) => ({
      ...prev,
      selectedPrescriptionId: newRx.id,
    }));
    setStep(3);
  };

  const handleSkipPrescription = () => {
    setSavedPrescription(null);
    setOrderData((prev) => ({
      ...prev,
      selectedPrescriptionId: '',
    }));
    setStep(3);
  };

  const handleOrderCreated = (order) => {
    setCreatedOrder(order);
    setStep(4);
  };

  const resetFlow = () => {
    setStep(1);
    setSelectedCustomer(null);
    setSavedPrescription(null);
    setPrescriptions([]);
    setCreatedOrder(null);
    setRxData({
      rSph: '', rCyl: '', rAxis: '', rAdd: '',
      lSph: '', lCyl: '', lAxis: '', lAdd: '',
      pd: '63.0', notes: '',
    });
    const d = new Date();
    d.setDate(d.getDate() + 3);
    setOrderData({
      isGstBill: true,
      items: [
        { productId: null, itemType: 'FRAME', description: '', quantity: 1, unitPrice: '', discount: 0, hsnCode: '9004', gstRate: 12 },
        { productId: null, itemType: 'LENS', description: '', quantity: 1, unitPrice: '', discount: 0, hsnCode: '9001', gstRate: 18 },
      ],
      selectedPrescriptionId: '',
      dueDate: d.toISOString().split('T')[0],
      orderDiscount: 0,
      notes: '',
      advanceAmount: '',
      paymentMethod: 'UPI',
      paymentRef: '',
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#66746F] hover:text-[#202D2B] transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#28766B] text-white flex items-center justify-center shadow-sm">
          <Zap className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#202D2B]">Guided Order Flow</h1>
          <p className="text-xs text-[#66746F]">
            Combine customer selection/creation, prescription entry, and order creation in one continuous flow
          </p>
        </div>
      </div>

      {/* Step Indicator Header (Visible in steps 1, 2, 3) */}
      {step < 4 && (
        <div className="bg-[#FEFEFC] p-3 rounded-2xl border border-[#E2E7E3] shadow-xs">
          <StepIndicator
            currentStep={step}
            onStepClick={(targetStep) => {
              if (targetStep === 1) setStep(1);
              else if (targetStep === 2 && selectedCustomer) setStep(2);
              else if (targetStep === 3 && selectedCustomer) setStep(3);
            }}
          />
        </div>
      )}

      {/* Persistent Step Panels (Kept mounted to preserve all entered information) */}
      <div className="bg-[#FEFEFC] rounded-2xl border border-[#E2E7E3] shadow-sm p-6">
        <div style={{ display: step === 1 ? 'block' : 'none' }}>
          <CustomerStep
            selectedCustomer={selectedCustomer}
            onCustomerSelected={handleCustomerSelected}
            onNext={() => setStep(2)}
          />
        </div>

        <div style={{ display: step === 2 ? 'block' : 'none' }}>
          <PrescriptionStep
            customer={selectedCustomer}
            rxData={rxData}
            setRxData={setRxData}
            savedPrescription={savedPrescription}
            onBack={() => setStep(1)}
            onSkip={handleSkipPrescription}
            onSave={handlePrescriptionSaved}
          />
        </div>

        <div style={{ display: step === 3 ? 'block' : 'none' }}>
          <OrderStep
            customer={selectedCustomer}
            orderData={orderData}
            setOrderData={setOrderData}
            prescriptions={prescriptions}
            onBack={() => setStep(2)}
            onOrderCreated={handleOrderCreated}
          />
        </div>

        {step === 4 && (
          <SuccessStep
            order={createdOrder}
            customer={selectedCustomer}
            onViewOrder={() => navigate(`/orders/${createdOrder?.id}`)}
            onNewFlow={resetFlow}
          />
        )}
      </div>
    </div>
  );
}
