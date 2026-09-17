import React from 'react';

const formatPower = (val) => {
  if (val === null || val === undefined || val === '') return '0.00';
  const num = parseFloat(val);
  return num > 0 ? `+${num.toFixed(2)}` : num.toFixed(2);
};

export default function OpticalGrid({ prescription }) {
  if (!prescription) return null;

  return (
    <div className="overflow-hidden border border-slate-200 rounded-xl">
      <table className="w-full text-center text-xs">
        <thead className="bg-slate-100 text-slate-700 font-semibold uppercase tracking-wider">
          <tr>
            <th className="py-2.5 px-3 text-left">Eye</th>
            <th className="py-2.5 px-3">SPH (Sphere)</th>
            <th className="py-2.5 px-3">CYL (Cylinder)</th>
            <th className="py-2.5 px-3">AXIS</th>
            <th className="py-2.5 px-3">ADD (Near)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 font-mono font-medium">
          <tr className="bg-white hover:bg-slate-50">
            <td className="py-2.5 px-3 font-sans font-bold text-slate-800 text-left flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              OD (Right)
            </td>
            <td className="py-2.5 px-3 text-slate-800">{formatPower(prescription.r_sph)}</td>
            <td className="py-2.5 px-3 text-slate-800">{formatPower(prescription.r_cyl)}</td>
            <td className="py-2.5 px-3 text-slate-800">{prescription.r_axis ? `${prescription.r_axis}°` : '—'}</td>
            <td className="py-2.5 px-3 text-indigo-600 font-semibold">{formatPower(prescription.r_add)}</td>
          </tr>
          <tr className="bg-slate-50/50 hover:bg-slate-50">
            <td className="py-2.5 px-3 font-sans font-bold text-slate-800 text-left flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              OS (Left)
            </td>
            <td className="py-2.5 px-3 text-slate-800">{formatPower(prescription.l_sph)}</td>
            <td className="py-2.5 px-3 text-slate-800">{formatPower(prescription.l_cyl)}</td>
            <td className="py-2.5 px-3 text-slate-800">{prescription.l_axis ? `${prescription.l_axis}°` : '—'}</td>
            <td className="py-2.5 px-3 text-indigo-600 font-semibold">{formatPower(prescription.l_add)}</td>
          </tr>
        </tbody>
      </table>

      {/* Pupillary Distance & Notes footer */}
      <div className="bg-slate-50 px-4 py-2 border-t border-slate-100 flex flex-wrap justify-between items-center text-xs text-slate-600">
        <div>
          <span className="font-semibold text-slate-700">PD (Pupillary Distance): </span>
          <span className="font-mono font-bold text-slate-900">{prescription.pd ? `${prescription.pd} mm` : 'Not recorded'}</span>
        </div>
        {prescription.notes && (
          <div className="italic text-slate-500 max-w-md truncate">
            Note: "{prescription.notes}"
          </div>
        )}
      </div>
    </div>
  );
}