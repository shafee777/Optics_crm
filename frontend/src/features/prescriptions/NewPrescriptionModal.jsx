import { useModalAccessibility } from '../../hooks/useModalAccessibility.js';
import React, { useState } from 'react';
import api from '../../services/api.js';
import { X, FileText, AlertCircle, Copy, Check, Eye } from 'lucide-react';

// Helper to format power values (e.g., -1.5 -> "-1.50", 2 -> "+2.00", 0 -> "0.00")
const formatPower = (val) => {
  if (val === '' || val === null || val === undefined || isNaN(val)) return '';
  const num = parseFloat(val);
  if (num === 0) return '0.00';
  return (num > 0 ? '+' : '') + num.toFixed(2);
};

// Power Quick Stepper Input Component
function PowerInput({ label, name, value, onChange, placeholder, step = 0.25, min, max, allowSign = true, quickPresets = [] }) {
  const handleStep = (delta) => {
    const current = parseFloat(value) || 0;
    const next = current + delta;
    if (min !== undefined && next < min) return;
    if (max !== undefined && next > max) return;
    onChange({ target: { name, value: next.toFixed(2) } });
  };

  const handleToggleSign = () => {
    if (!value || parseFloat(value) === 0) return;
    const next = -parseFloat(value);
    onChange({ target: { name, value: next.toFixed(2) } });
  };

  const handleSelectPreset = (pVal) => {
    onChange({ target: { name, value: pVal.toString() } });
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
          title={`Decrease by ${step}`}
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
          title={`Increase by ${step}`}
        >
          +
        </button>
      </div>

      {/* Quick Chips if provided */}
      {quickPresets.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-0.5">
          {quickPresets.map((p) => (
            <button
              key={p.label || p}
              type="button"
              onClick={() => handleSelectPreset(p.val !== undefined ? p.val : p)}
              className={`text-[10px] px-1.5 py-0.5 rounded-md tabular-nums transition font-semibold ${
                value === (p.val !== undefined ? p.val.toString() : p.toString())
                  ? 'bg-[#28766B] text-white'
                  : 'bg-[#F5F7F3] hover:bg-[#E2E7E3] text-[#66746F] border border-[#E2E7E3]'
              }`}
            >
              {p.label || (p > 0 ? `+${p}` : p)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NewPrescriptionModal({ isOpen, onClose, customerId, onPrescriptionCreated }) {
  const [formData, setFormData] = useState({
    rSph: '',
    rCyl: '',
    rAxis: '',
    rAdd: '',
    lSph: '',
    lCyl: '',
    lAxis: '',
    lAdd: '',
    pd: '63.0',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  const modalRef = useModalAccessibility(isOpen, onClose);
  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCopyRightToLeft = () => {
    setFormData({
      ...formData,
      lSph: formData.rSph,
      lCyl: formData.rCyl,
      lAxis: formData.rAxis,
      lAdd: formData.rAdd,
    });
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 1800);
  };

  const handleSetPlano = () => {
    setFormData({
      ...formData,
      rSph: '0.00',
      rCyl: '0.00',
      rAxis: '',
      lSph: '0.00',
      lCyl: '0.00',
      lAxis: '',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = {
        rSph: formData.rSph !== '' ? parseFloat(formData.rSph) : null,
        rCyl: formData.rCyl !== '' ? parseFloat(formData.rCyl) : null,
        rAxis: formData.rAxis !== '' ? parseInt(formData.rAxis, 10) : null,
        rAdd: formData.rAdd !== '' ? parseFloat(formData.rAdd) : null,

        lSph: formData.lSph !== '' ? parseFloat(formData.lSph) : null,
        lCyl: formData.lCyl !== '' ? parseFloat(formData.lCyl) : null,
        lAxis: formData.lAxis !== '' ? parseInt(formData.lAxis, 10) : null,
        lAdd: formData.lAdd !== '' ? parseFloat(formData.lAdd) : null,

        pd: formData.pd !== '' ? parseFloat(formData.pd) : null,
        notes: formData.notes,
      };

      const response = await api.post(`/customers/${customerId}/prescriptions`, payload);
      onPrescriptionCreated(response.data.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to save eye test');
    } finally {
      setLoading(false);
    }
  };

  // Live Clinical Notation Formatter
  const formatEyeNotation = (sph, cyl, axis, add) => {
    const s = formatPower(sph) || '0.00';
    const c = formatPower(cyl);
    const ax = axis ? `× ${axis}°` : '';
    const ad = formatPower(add) ? ` | Add ${formatPower(add)}` : '';
    
    let res = `${s} DS`;
    if (c && c !== '0.00') {
      res += ` / ${c} DC ${ax}`;
    }
    res += ad;
    return res;
  };

  return (
    <div ref={modalRef} className="fixed inset-0 z-50 flex items-center justify-center bg-[#203A36]/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#FEFEFC] w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden border border-[#E2E7E3] animate-in fade-in zoom-in-95 duration-200 my-8">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#203A36] text-white flex justify-between items-center border-b border-[#182C29]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#28766B] text-white flex items-center justify-center shadow-sm">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-white text-base">Quick Lens Power Matrix</h2>
              <p className="text-xs text-[#A3CCC4]">Log optical refraction & prescription in under 10 seconds</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSetPlano}
              className="px-2.5 py-1 rounded-xl bg-[#182C29] hover:bg-[#2A4742] text-[#A3CCC4] text-xs font-semibold border border-[#2C4843] transition"
              title="Reset both eyes to Plano (0.00)"
            >
              Plano (0.00)
            </button>
            <button
              type="button"
              onClick={handleCopyRightToLeft}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#28766B] hover:bg-[#1E5C53] text-white text-xs font-semibold shadow-sm transition"
              title="Copy OD (Right Eye) to OS (Left Eye)"
            >
              {copySuccess ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copySuccess ? 'Copied to OS!' : 'Copy OD → OS'}</span>
            </button>
            <button aria-label="Close dialog" onClick={onClose} className="p-1 rounded-xl text-[#A3B8B2] hover:text-white hover:bg-[#2A4742] transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {error && (
          <div role="alert" className="mx-6 mt-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-800 text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* RIGHT EYE (OD) SECTION */}
          <div className="p-4 rounded-2xl bg-[#F5F7F3] border border-[#E2E7E3] space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-sky-600 ring-4 ring-sky-100"></span>
                <span className="font-bold text-[#202D2B] text-xs uppercase tracking-wider">Right Eye (OD - Oculus Dexter)</span>
              </div>
              <span className="text-xs font-bold tabular-nums px-2.5 py-0.5 rounded-full bg-white text-[#202D2B] border border-[#E2E7E3]">
                {formatEyeNotation(formData.rSph, formData.rCyl, formData.rAxis, formData.rAdd)}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <PowerInput
                label="SPHERE (SPH)"
                name="rSph"
                value={formData.rSph}
                onChange={handleChange}
                placeholder="0.00"
                step={0.25}
                quickPresets={[
                  { label: '0.00', val: '0.00' },
                  { label: '-1.00', val: '-1.00' },
                  { label: '-1.50', val: '-1.50' },
                  { label: '-2.00', val: '-2.00' },
                  { label: '+1.00', val: '1.00' },
                ]}
              />

              <PowerInput
                label="CYLINDER (CYL)"
                name="rCyl"
                value={formData.rCyl}
                onChange={handleChange}
                placeholder="0.00"
                step={0.25}
                quickPresets={[
                  { label: '0.00', val: '0.00' },
                  { label: '-0.25', val: '-0.25' },
                  { label: '-0.50', val: '-0.50' },
                  { label: '-0.75', val: '-0.75' },
                  { label: '-1.00', val: '-1.00' },
                ]}
              />

              <PowerInput
                label="AXIS (0 - 180°)"
                name="rAxis"
                value={formData.rAxis}
                onChange={handleChange}
                placeholder="90"
                step={5}
                min={0}
                max={180}
                allowSign={false}
                quickPresets={[
                  { label: '180°', val: '180' },
                  { label: '90°', val: '90' },
                  { label: '45°', val: '45' },
                  { label: '135°', val: '135' },
                ]}
              />

              <PowerInput
                label="ADD (Near Vision)"
                name="rAdd"
                value={formData.rAdd}
                onChange={handleChange}
                placeholder="+1.50"
                step={0.25}
                min={0.5}
                max={4.0}
                allowSign={false}
                quickPresets={[
                  { label: '+1.00', val: '1.00' },
                  { label: '+1.50', val: '1.50' },
                  { label: '+2.00', val: '2.00' },
                  { label: '+2.50', val: '2.50' },
                ]}
              />
            </div>
          </div>

          {/* LEFT EYE (OS) SECTION */}
          <div className="p-4 rounded-2xl bg-[#F5F7F3] border border-[#E2E7E3] space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-600 ring-4 ring-emerald-100"></span>
                <span className="font-bold text-[#202D2B] text-xs uppercase tracking-wider">Left Eye (OS - Oculus Sinister)</span>
              </div>
              <span className="text-xs font-bold tabular-nums px-2.5 py-0.5 rounded-full bg-white text-[#202D2B] border border-[#E2E7E3]">
                {formatEyeNotation(formData.lSph, formData.lCyl, formData.lAxis, formData.lAdd)}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <PowerInput
                label="SPHERE (SPH)"
                name="lSph"
                value={formData.lSph}
                onChange={handleChange}
                placeholder="0.00"
                step={0.25}
                quickPresets={[
                  { label: '0.00', val: '0.00' },
                  { label: '-1.00', val: '-1.00' },
                  { label: '-1.50', val: '-1.50' },
                  { label: '-2.00', val: '-2.00' },
                  { label: '+1.00', val: '1.00' },
                ]}
              />

              <PowerInput
                label="CYLINDER (CYL)"
                name="lCyl"
                value={formData.lCyl}
                onChange={handleChange}
                placeholder="0.00"
                step={0.25}
                quickPresets={[
                  { label: '0.00', val: '0.00' },
                  { label: '-0.25', val: '-0.25' },
                  { label: '-0.50', val: '-0.50' },
                  { label: '-0.75', val: '-0.75' },
                  { label: '-1.00', val: '-1.00' },
                ]}
              />

              <PowerInput
                label="AXIS (0 - 180°)"
                name="lAxis"
                value={formData.lAxis}
                onChange={handleChange}
                placeholder="90"
                step={5}
                min={0}
                max={180}
                allowSign={false}
                quickPresets={[
                  { label: '180°', val: '180' },
                  { label: '90°', val: '90' },
                  { label: '45°', val: '45' },
                  { label: '135°', val: '135' },
                ]}
              />

              <PowerInput
                label="ADD (Near Vision)"
                name="lAdd"
                value={formData.lAdd}
                onChange={handleChange}
                placeholder="+1.50"
                step={0.25}
                min={0.5}
                max={4.0}
                allowSign={false}
                quickPresets={[
                  { label: '+1.00', val: '1.00' },
                  { label: '+1.50', val: '1.50' },
                  { label: '+2.00', val: '2.00' },
                  { label: '+2.50', val: '2.50' },
                ]}
              />
            </div>
          </div>

          {/* Pupillary Distance & Remarks */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#F5F7F3] p-4 rounded-2xl border border-[#E2E7E3]">
            <div>
              <label htmlFor="NewPrescriptionModal-field-0" className="block text-xs font-semibold text-[#202D2B] mb-1">PD (Pupillary Distance, mm)</label>
              <div className="flex items-center gap-1.5">
                <input id="NewPrescriptionModal-field-0"
                  type="number"
                  step="0.5"
                  name="pd"
                  placeholder="63.0"
                  value={formData.pd}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E7E3] text-xs font-bold tabular-nums text-[#202D2B] focus:ring-2 focus:ring-[#28766B]/30 focus:border-[#28766B] focus:outline-none bg-white"
                />
                <div className="flex gap-1">
                  {['62', '63', '64'].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setFormData({ ...formData, pd: val })}
                      className={`px-2 py-1.5 rounded-lg text-[10px] font-bold tabular-nums transition ${
                        formData.pd === val ? 'bg-[#28766B] text-white' : 'bg-white border border-[#E2E7E3] text-[#66746F] hover:bg-[#F5F7F3]'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="NewPrescriptionModal-field-1" className="block text-xs font-semibold text-[#202D2B] mb-1">Clinical Remarks / Recommended Lens Type</label>
              <input id="NewPrescriptionModal-field-1"
                type="text"
                name="notes"
                placeholder="e.g. Anti-reflective progressive blue-cut, poly-carbonate"
                value={formData.notes}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-xl border border-[#E2E7E3] text-xs text-[#202D2B] placeholder:text-[#9AA8A3] focus:ring-2 focus:ring-[#28766B]/30 focus:border-[#28766B] focus:outline-none bg-white"
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-[#E2E7E3]">
            <span className="text-xs text-[#66746F]">
              Prescription will be attached to customer profile & instant WhatsApp printable
            </span>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-semibold text-[#66746F] hover:bg-[#F5F7F3] rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 bg-[#28766B] hover:bg-[#1E5C53] text-white text-xs font-bold rounded-xl shadow-sm disabled:opacity-50 transition flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                {loading ? 'Saving Refraction...' : 'Save Prescription'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}