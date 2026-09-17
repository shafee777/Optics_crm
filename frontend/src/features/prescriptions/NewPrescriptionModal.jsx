import React, { useState } from 'react';
import api from '../../services/api.js';
import { X, FileText, AlertCircle } from 'lucide-react';

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

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            <h2 className="font-semibold text-slate-800 text-lg">Record Eye-Test (Refraction)</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Refraction Table Inputs */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Eye</th>
                  <th className="py-2.5 px-3">SPH (Sphere)</th>
                  <th className="py-2.5 px-3">CYL (Cylinder)</th>
                  <th className="py-2.5 px-3">AXIS (0-180°)</th>
                  <th className="py-2.5 px-3">ADD (Near)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {/* Right Eye (OD) */}
                <tr className="bg-white">
                  <td className="py-2.5 px-3 font-bold text-slate-800 flex items-center gap-1.5 pt-4">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                    OD (Right)
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      step="0.25"
                      name="rSph"
                      placeholder="-1.50"
                      value={formData.rSph}
                      onChange={handleChange}
                      className="w-full px-2.5 py-1.5 font-mono text-center rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      step="0.25"
                      name="rCyl"
                      placeholder="-0.50"
                      value={formData.rCyl}
                      onChange={handleChange}
                      className="w-full px-2.5 py-1.5 font-mono text-center rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      min="0"
                      max="180"
                      name="rAxis"
                      placeholder="90"
                      value={formData.rAxis}
                      onChange={handleChange}
                      className="w-full px-2.5 py-1.5 font-mono text-center rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      step="0.25"
                      name="rAdd"
                      placeholder="+1.25"
                      value={formData.rAdd}
                      onChange={handleChange}
                      className="w-full px-2.5 py-1.5 font-mono text-center rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </td>
                </tr>

                {/* Left Eye (OS) */}
                <tr className="bg-slate-50/50">
                  <td className="py-2.5 px-3 font-bold text-slate-800 flex items-center gap-1.5 pt-4">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    OS (Left)
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      step="0.25"
                      name="lSph"
                      placeholder="-1.75"
                      value={formData.lSph}
                      onChange={handleChange}
                      className="w-full px-2.5 py-1.5 font-mono text-center rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      step="0.25"
                      name="lCyl"
                      placeholder="-0.25"
                      value={formData.lCyl}
                      onChange={handleChange}
                      className="w-full px-2.5 py-1.5 font-mono text-center rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      min="0"
                      max="180"
                      name="lAxis"
                      placeholder="85"
                      value={formData.lAxis}
                      onChange={handleChange}
                      className="w-full px-2.5 py-1.5 font-mono text-center rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      step="0.25"
                      name="lAdd"
                      placeholder="+1.25"
                      value={formData.lAdd}
                      onChange={handleChange}
                      className="w-full px-2.5 py-1.5 font-mono text-center rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Pupillary Distance & Remarks */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">PD (Pupillary Distance, mm)</label>
              <input
                type="number"
                step="0.5"
                name="pd"
                placeholder="e.g. 63.0"
                value={formData.pd}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Clinical Remarks / Symptoms</label>
              <input
                type="text"
                name="notes"
                placeholder="e.g. Needs blue-cut progressive lenses for computer use"
                value={formData.notes}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm disabled:opacity-50"
            >
              {loading ? 'Saving Eye Test...' : 'Save Prescription'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}