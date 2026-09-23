import React from 'react';

const formatPower = (val) => {
  if (val === null || val === undefined || val === '') return '0.00';
  const num = parseFloat(val);
  return num > 0 ? `+${num.toFixed(2)}` : num.toFixed(2);
};

export default function OpticalGrid({ prescription }) {
  if (!prescription) return null;

  return (
    <div className="overflow-hidden border border-[#E2E7E3] rounded-xl bg-white">
      <table className="w-full text-center text-xs">
        <thead className="bg-[#F5F7F3] text-[#66746F] font-semibold uppercase tracking-wider border-b border-[#E2E7E3]">
          <tr>
            <th className="py-2.5 px-3 text-left">Eye</th>
            <th className="py-2.5 px-3">SPH (Sphere)</th>
            <th className="py-2.5 px-3">CYL (Cylinder)</th>
            <th className="py-2.5 px-3">AXIS</th>
            <th className="py-2.5 px-3">ADD (Near)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E2E7E3] tabular-nums font-semibold">
          <tr className="bg-white hover:bg-[#F5F7F3]/70">
            <td className="py-2.5 px-3 font-sans font-bold text-[#202D2B] text-left flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-600"></span>
              OD (Right)
            </td>
            <td className="py-2.5 px-3 text-[#202D2B]">{formatPower(prescription.r_sph)}</td>
            <td className="py-2.5 px-3 text-[#202D2B]">{formatPower(prescription.r_cyl)}</td>
            <td className="py-2.5 px-3 text-[#202D2B]">{prescription.r_axis ? `${prescription.r_axis}°` : '—'}</td>
            <td className="py-2.5 px-3 text-[#28766B] font-bold">{formatPower(prescription.r_add)}</td>
          </tr>
          <tr className="bg-[#F5F7F3]/40 hover:bg-[#F5F7F3]/70">
            <td className="py-2.5 px-3 font-sans font-bold text-[#202D2B] text-left flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              OS (Left)
            </td>
            <td className="py-2.5 px-3 text-[#202D2B]">{formatPower(prescription.l_sph)}</td>
            <td className="py-2.5 px-3 text-[#202D2B]">{formatPower(prescription.l_cyl)}</td>
            <td className="py-2.5 px-3 text-[#202D2B]">{prescription.l_axis ? `${prescription.l_axis}°` : '—'}</td>
            <td className="py-2.5 px-3 text-[#28766B] font-bold">{formatPower(prescription.l_add)}</td>
          </tr>
        </tbody>
      </table>

      {/* Pupillary Distance & Notes footer */}
      <div className="bg-[#F5F7F3] px-4 py-2 border-t border-[#E2E7E3] flex flex-wrap justify-between items-center text-xs text-[#66746F]">
        <div>
          <span className="font-semibold text-[#202D2B]">PD (Pupillary Distance): </span>
          <span className="tabular-nums font-bold text-[#202D2B]">{prescription.pd ? `${prescription.pd} mm` : 'Not recorded'}</span>
        </div>
        {prescription.notes && (
          <div className="italic text-[#66746F] max-w-md truncate">
            Note: "{prescription.notes}"
          </div>
        )}
      </div>
    </div>
  );
}