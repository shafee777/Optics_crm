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
      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
        <span>{label}</span>
        {allowSign && value && parseFloat(value) !== 0 && (
          <button
            type="button"
            onClick={handleToggleSign}
            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            title="Toggle Positive/Negative"
          >
            ± Sign
          </button>
        )}
      </div>

      <div className="flex items-center rounded-xl border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 overflow-hidden shadow-sm">
        <button
          type="button"
          onClick={() => handleStep(-step)}
          className="px-2 py-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 font-mono font-bold text-xs select-none transition"
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
          className="w-full text-center py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none bg-transparent"
        />

        <button
          type="button"
          onClick={() => handleStep(step)}
          className="px-2 py-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 font-mono font-bold text-xs select-none transition"
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
              className={`text-[10px] px-1.5 py-0.5 rounded font-mono transition ${
                value === (p.val !== undefined ? p.val.toString() : p.toString())
                  ? 'bg-indigo-600 text-white font-bold'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-white text-base">Quick Lens Power Matrix</h2>
              <p className="text-xs text-slate-400">Log optical refraction & prescription in under 10 seconds</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSetPlano}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              title="Reset both eyes to Plano (0.00)"
            >
              Plano (0.00)
            </button>
            <button
              type="button"
              onClick={handleCopyRightToLeft}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition"
              title="Copy OD (Right Eye) to OS (Left Eye)"
            >
              {copySuccess ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copySuccess ? 'Copied to OS!' : 'Copy OD → OS'}</span>
            </button>
            <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-red-700 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6">

          {/* RIGHT EYE (OD) SECTION */}
          <div className="p-4 rounded-2xl bg-blue-50/40 border border-blue-100/80 space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-600 ring-4 ring-blue-100"></span>
                <span className="font-bold text-slate-900 text-sm">Right Eye (OD - Oculus Dexter)</span>
              </div>
              <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full bg-blue-100/80 text-blue-800">
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
          <div className="p-4 rounded-2xl bg-emerald-50/40 border border-emerald-100/80 space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-600 ring-4 ring-emerald-100"></span>
                <span className="font-bold text-slate-900 text-sm">Left Eye (OS - Oculus Sinister)</span>
              </div>
              <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100/80 text-emerald-800">
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">PD (Pupillary Distance, mm)</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  step="0.5"
                  name="pd"
                  placeholder="63.0"
                  value={formData.pd}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                />
                <div className="flex gap-1">
                  {['62', '63', '64'].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setFormData({ ...formData, pd: val })}
                      className={`px-2 py-1.5 rounded-lg text-[10px] font-mono font-bold transition ${
                        formData.pd === val ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Clinical Remarks / Recommended Lens Type</label>
              <input
                type="text"
                name="notes"
                placeholder="e.g. Anti-reflective progressive blue-cut, poly-carbonate"
                value={formData.notes}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <span className="text-xs text-slate-400">
              Prescription will be attached to customer profile & instant WhatsApp printable
            </span>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 disabled:opacity-50 transition flex items-center gap-2"
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