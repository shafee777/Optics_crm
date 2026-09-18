import React from 'react';
import { Printer, Glasses, Phone, Calendar, User, FileText } from 'lucide-react';
import { useAuth } from '../auth/AuthContext.jsx';

export default function PrintOrderInvoice({ order, prescription }) {
  const { user } = useAuth();
  const store = user?.store || { name: 'Optical Store', phone: '', currency: 'INR' };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      {/* Action Button (Hidden during printing) */}
      <div className="print:hidden flex justify-end mb-4">
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-md transition"
        >
          <Printer className="w-4 h-4" /> Print Invoice / Job Slip
        </button>
      </div>

      {/* Printable Invoice Container (Visible both on screen and on paper) */}
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm print:border-none print:shadow-none print:p-0 print:m-0 text-slate-900 font-sans text-xs">
        
        {/* Header: Store Info & Invoice Title */}
        <div className="flex justify-between items-start pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-xl tracking-tight">
              <Glasses className="w-6 h-6" />
              <span>{store.name}</span>
            </div>
            <p className="text-slate-500 mt-1">Professional Eye Care & Optical Dispensary</p>
            {store.address && (
              <p className="text-slate-600 mt-0.5">{store.address}</p>
            )}
            {store.phone && (
              <p className="text-slate-500 flex items-center gap-1 mt-0.5">
                <Phone className="w-3 h-3" /> {store.phone}
              </p>
            )}
          </div>

          <div className="text-right">
            <div className="text-lg font-mono font-extrabold text-slate-900">{order.order_number}</div>
            <div className="text-[11px] text-slate-500">Order & Tax Invoice</div>
            <div className="mt-2 inline-block px-2.5 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-700 uppercase">
              Status: {order.status.replace(/_/g, ' ')}
            </div>
          </div>
        </div>

        {/* Customer & Dates Info Grid */}
        <div className="grid grid-cols-2 gap-6 py-4 border-b border-slate-200">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Customer Details</div>
            <div className="font-bold text-slate-900 text-sm">{order.customer_name}</div>
            <div className="text-slate-600 mt-0.5 font-mono">
              Phone: {order.customer_phone || 'N/A'} {order.customer_code ? `• Code: ${order.customer_code}` : ''}
            </div>
          </div>

          <div className="text-right space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Order Timings</div>
            <div className="text-slate-700">
              <strong>Order Date:</strong> {new Date(order.order_date).toLocaleDateString()}
            </div>
            <div className="text-slate-900 font-bold">
              <strong>Due / Delivery Date:</strong> {new Date(order.due_date).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Prescription Refraction Chart (If linked) */}
        {prescription && (
          <div className="py-4 border-b border-slate-200">
            <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 mb-2 flex items-center gap-1">
              <FileText className="w-3 h-3" /> Eyeglass Prescription (Power Refraction)
            </div>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-center border-collapse">
                <thead className="bg-slate-50 text-[10px] font-bold text-slate-600 uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-1.5 px-3 text-left">Eye</th>
                    <th className="py-1.5 px-3">SPH (Spherical)</th>
                    <th className="py-1.5 px-3">CYL (Cylindrical)</th>
                    <th className="py-1.5 px-3">AXIS</th>
                    <th className="py-1.5 px-3">ADD</th>
                    <th className="py-1.5 px-3">PD (Pupillary Dist.)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-xs">
                  <tr>
                    <td className="py-2 px-3 text-left font-bold text-slate-800">Right (OD)</td>
                    <td className="py-2 px-3">{prescription.r_sph || '0.00'}</td>
                    <td className="py-2 px-3">{prescription.r_cyl || '—'}</td>
                    <td className="py-2 px-3">{prescription.r_axis ? `${prescription.r_axis}°` : '—'}</td>
                    <td className="py-2 px-3">{prescription.r_add || '—'}</td>
                    <td className="py-2 px-3" rowSpan={2}>
                      {prescription.pd ? `${prescription.pd} mm` : '—'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-left font-bold text-slate-800">Left (OS)</td>
                    <td className="py-2 px-3">{prescription.l_sph || '0.00'}</td>
                    <td className="py-2 px-3">{prescription.l_cyl || '—'}</td>
                    <td className="py-2 px-3">{prescription.l_axis ? `${prescription.l_axis}°` : '—'}</td>
                    <td className="py-2 px-3">{prescription.l_add || '—'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Order Items Table */}
        <div className="py-4 border-b border-slate-200">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Order Line Items</div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                <th className="py-2 px-2">Type</th>
                <th className="py-2 px-2">Description</th>
                <th className="py-2 px-2 text-center">Qty</th>
                <th className="py-2 px-2 text-right">Unit Price</th>
                <th className="py-2 px-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {order.items?.map((item) => (
                <tr key={item.id}>
                  <td className="py-2.5 px-2 font-bold text-[10px] text-slate-600 uppercase">
                    {item.item_type}
                  </td>
                  <td className="py-2.5 px-2 font-medium text-slate-800">{item.description}</td>
                  <td className="py-2.5 px-2 text-center font-mono">{item.quantity}</td>
                  <td className="py-2.5 px-2 text-right font-mono">
                    ₹{parseFloat(item.unit_price).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-900">
                    ₹{parseFloat(item.total_price).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Calculation & Payment Summary */}
        <div className="py-4 flex justify-between items-start">
          <div className="max-w-xs text-[11px] text-slate-500 space-y-2">
            <p className="font-semibold text-slate-700">Important Instructions:</p>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>Please present this slip at the counter when collecting your glasses.</li>
              <li>Spectacles are crafted according to the prescribed parameters recorded above.</li>
            </ul>
            {order.notes && (
              <p className="text-slate-600 italic mt-2">
                <strong>Note:</strong> {order.notes}
              </p>
            )}
          </div>

          <div className="w-64 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-mono">₹{order.subtotal?.toLocaleString()}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount:</span>
                <span className="font-mono">-₹{order.discount?.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-sm text-slate-900 border-t border-slate-200 pt-1.5">
              <span>Grand Total:</span>
              <span className="font-mono">₹{order.total_amount?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-700 font-medium">
              <span>Advance Paid:</span>
              <span className="font-mono">₹{order.total_paid?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-extrabold text-sm border-t border-slate-200 pt-1.5 text-indigo-700 bg-indigo-50 p-2 rounded-lg">
              <span>Balance Due:</span>
              <span className="font-mono">₹{order.balance_due?.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Footer Signature */}
        <div className="pt-8 mt-4 border-t border-slate-100 flex justify-between items-end text-slate-400 text-[10px]">
          <div>Generated by Optical CRM • {new Date().toLocaleDateString()}</div>
          <div className="text-right">
            <div className="w-36 border-b border-slate-300 mb-1"></div>
            <span>Authorized Signatory</span>
          </div>
        </div>
      </div>
    </div>
  );
}