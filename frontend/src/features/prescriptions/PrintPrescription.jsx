import React from 'react';
import { Printer, Glasses, Phone, Calendar, User, FileText, ArrowLeft, Mail } from 'lucide-react';
import { useAuth } from '../auth/AuthContext.jsx';

const formatPower = (val) => {
  if (val === null || val === undefined || val === '') return '—';
  const num = parseFloat(val);
  if (isNaN(num)) return val;
  if (num === 0) return '0.00';
  return (num > 0 ? '+' : '') + num.toFixed(2);
};

export default function PrintPrescription({ prescription, customer, onBack, hideActions = false }) {
  const { user } = useAuth();
  const store = user?.store || { name: 'Optical Store', phone: '', currency: 'INR' };

  const handlePrint = () => {
    window.print();
  };

  const testDate = prescription?.tested_at || prescription?.created_at;
  const formattedDate = testDate
    ? new Date(testDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : new Date().toLocaleDateString('en-IN');

  const optometristName = prescription?.tested_by_name || prescription?.optometrist_name || store.name;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Action Buttons (Hidden when printing) */}
      {!hideActions && <div className="print:hidden flex justify-between items-center">
        {onBack ? (
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        ) : <div />}
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-md transition"
        >
          <Printer className="w-4 h-4" /> Print Prescription / Save as PDF
        </button>
      </div>}

      {/* Printable Prescription Card */}
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm print:border-none print:shadow-none print:p-0 print:m-0 text-slate-900 font-sans text-xs">
        
        {/* Header: Store Info & Document Title */}
        <div className="flex justify-between items-start pb-6 border-b border-slate-200">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              {(store.logoUrl || store.logo_url) ? (
                <img
                  src={store.logoUrl || store.logo_url}
                  alt={store.name}
                  className="h-12 max-w-[120px] object-contain rounded"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <Glasses className="w-5 h-5" />
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900">{store.name}</h1>
                <p className="text-slate-500 text-xs">Professional Eye Care & Optical Dispensary</p>
              </div>
            </div>

            <div className="pt-2 text-slate-600 space-y-0.5">
              {store.address && <p>{store.address}</p>}
              <div className="flex flex-wrap items-center gap-3 text-slate-500">
                {store.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {store.phone}
                  </span>
                )}
                {store.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3" /> {store.email}
                  </span>
                )}
              </div>
              {store.gstin && (
                <p className="text-slate-900 font-bold font-mono text-[11px] mt-1 bg-slate-100 px-2 py-0.5 rounded inline-block">
                  GSTIN: {store.gstin}
                </p>
              )}
            </div>
          </div>

          <div className="text-right">
            <div className="text-sm font-bold text-indigo-600 uppercase tracking-wider">OFFICIAL VISION PRESCRIPTION</div>
            <div className="text-slate-500 text-[11px] mt-1">Refraction & Eye Power Certificate</div>
            <div className="mt-3 inline-block px-2.5 py-1 bg-slate-100 rounded text-[11px] font-semibold text-slate-700">
              Date: <strong className="text-slate-900">{formattedDate}</strong>
            </div>
          </div>
        </div>

        {/* Patient Details */}
        <div className="grid grid-cols-2 gap-6 py-4 border-b border-slate-200">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Patient Details</div>
            <div className="font-bold text-slate-900 text-sm">{customer?.full_name || customer?.name || 'Patient'}</div>
            <div className="text-slate-600 mt-0.5 font-mono">
              Phone: {customer?.phone || 'N/A'} {customer?.customer_code ? `• Code: #${customer.customer_code}` : ''}
            </div>
            {(customer?.age || customer?.gender) && (
              <div className="text-slate-500 text-[11px] mt-0.5">
                {[customer?.age ? `Age: ${customer.age} yrs` : null, customer?.gender ? `Gender: ${customer.gender}` : null].filter(Boolean).join(' • ')}
              </div>
            )}
          </div>

          <div className="text-right space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Clinical Details</div>
            <div className="text-slate-700">
              <strong>Examined By:</strong> {optometristName}
            </div>
            <div className="text-slate-500 text-[11px]">
              Optometry & Vision Screening
            </div>
          </div>
        </div>

        {/* Prescription Refraction Chart */}
        <div className="py-5 border-b border-slate-200 space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" /> Refraction Power Specifications
          </div>
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-center border-collapse">
              <thead className="bg-slate-50 text-[10px] font-bold text-slate-600 uppercase border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 text-left">Eye</th>
                  <th className="py-2.5 px-3">SPH (Sphere)</th>
                  <th className="py-2.5 px-3">CYL (Cylinder)</th>
                  <th className="py-2.5 px-3">AXIS</th>
                  <th className="py-2.5 px-3">ADD (Near)</th>
                  <th className="py-2.5 px-3">VA (Distance)</th>
                  <th className="py-2.5 px-3">PD (Pupillary Dist.)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-xs">
                <tr>
                  <td className="py-3 px-3 text-left font-sans font-bold text-slate-800">
                    <span className="inline-block w-2 h-2 rounded-full bg-sky-600 mr-1.5"></span>
                    Right (OD)
                  </td>
                  <td className="py-3 px-3 font-bold">{formatPower(prescription?.r_sph)}</td>
                  <td className="py-3 px-3">{formatPower(prescription?.r_cyl)}</td>
                  <td className="py-3 px-3">{prescription?.r_axis ? `${prescription.r_axis}°` : '—'}</td>
                  <td className="py-3 px-3 text-indigo-600 font-bold">{formatPower(prescription?.r_add)}</td>
                  <td className="py-3 px-3">{prescription?.r_va || '6/6'}</td>
                  <td className="py-3 px-3 font-sans" rowSpan={2}>
                    <strong className="text-slate-900 font-mono">{prescription?.pd ? `${prescription.pd} mm` : '—'}</strong>
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-3 text-left font-sans font-bold text-slate-800">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-600 mr-1.5"></span>
                    Left (OS)
                  </td>
                  <td className="py-3 px-3 font-bold">{formatPower(prescription?.l_sph)}</td>
                  <td className="py-3 px-3">{formatPower(prescription?.l_cyl)}</td>
                  <td className="py-3 px-3">{prescription?.l_axis ? `${prescription.l_axis}°` : '—'}</td>
                  <td className="py-3 px-3 text-indigo-600 font-bold">{formatPower(prescription?.l_add)}</td>
                  <td className="py-3 px-3">{prescription?.l_va || '6/6'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Recommendations & Notes */}
        <div className="py-4 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Lens Recommendation</span>
            <p className="text-slate-800 font-medium">
              {prescription?.lens_type || 'Single Vision / Anti-Reflective Coating'}
            </p>
          </div>
          {prescription?.notes && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Doctor / Optometrist Notes</span>
              <p className="text-slate-700 italic bg-slate-50 p-2 rounded border border-slate-100">
                "{prescription.notes}"
              </p>
            </div>
          )}
        </div>

        {/* Footer Notes & Signatory */}
        <div className="pt-6 flex justify-between items-end">
          <div className="text-[10px] text-slate-400 space-y-0.5">
            <p>• Prescriptions are valid for 12 months from examination date.</p>
            <p>• Annual eye checkups are strongly recommended to maintain optimal visual acuity.</p>
            <p className="pt-1">Generated by Optical CRM • {new Date().toLocaleDateString()}</p>
          </div>
          <div className="text-right">
            <div className="w-44 border-b border-slate-300 mb-1"></div>
            <div className="font-bold text-slate-800 text-xs">{optometristName}</div>
            <div className="text-slate-400 text-[10px]">Consulting Optometrist / Refractionist</div>
          </div>
        </div>

      </div>
    </div>
  );
}
