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
          <Printer className="w-4 h-4" /> Print Invoice / Save as PDF
        </button>
      </div>

      {/* Printable Invoice Container (Visible both on screen and on paper) */}
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm print:border-none print:shadow-none print:p-0 print:m-0 text-slate-900 font-sans text-xs">
        
        {/* Header: Store Info & Invoice Title */}
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
                    <Phone className="w-3 h-3" /> Phone: {store.phone}
                  </span>
                )}
                {store.email && (
                  <span className="flex items-center gap-1">
                    Email: {store.email}
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
            <div className="text-lg font-mono font-extrabold text-slate-900">{order.order_number}</div>
            <div className="text-xs font-bold text-indigo-600 uppercase tracking-wider">{order.is_gst_bill !== false ? 'OFFICIAL TAX INVOICE' : 'RETAIL INVOICE'}</div>
            <div className="mt-2 inline-block px-2.5 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-700 uppercase">
              Status: {order.status.replace(/_/g, ' ')}
            </div>
          </div>
        </div>

        {/* Customer & Dates Info Grid */}
        <div className="grid grid-cols-2 gap-6 py-4 border-b border-slate-200">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Billed To (Customer)</div>
            <div className="font-bold text-slate-900 text-sm">{order.customer_name}</div>
            <div className="text-slate-600 mt-0.5 font-mono">
              Phone: {order.customer_phone || 'N/A'} {order.customer_code ? `• Code: ${order.customer_code}` : ''}
            </div>
          </div>

          <div className="text-right space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Invoice Details</div>
            <div className="text-slate-700">
              <strong>Invoice Date:</strong> {new Date(order.order_date).toLocaleDateString()}
            </div>
            <div className="text-slate-900 font-bold">
              <strong>Delivery Due:</strong> {new Date(order.due_date).toLocaleDateString()}
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
                    <th className="py-1.5 px-3">SPH</th>
                    <th className="py-1.5 px-3">CYL</th>
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
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Item Particulars & Tax Breakup</div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase bg-slate-50/50">
                <th className="py-2 px-2">Type</th>
                <th className="py-2 px-2">Description</th>
                <th className="py-2 px-2 text-center">HSN</th>
                <th className="py-2 px-2 text-center">Qty</th>
                <th className="py-2 px-2 text-right">Taxable Val</th>
                {order.is_gst_bill !== false && (
                  <>
                    <th className="py-2 px-2 text-right">CGST</th>
                    <th className="py-2 px-2 text-right">SGST</th>
                  </>
                )}
                <th className="py-2 px-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {order.items?.map((item) => {
                const taxable = parseFloat(item.taxable_value ?? item.total_price);
                const cgst = parseFloat(item.cgst_amount || 0);
                const sgst = parseFloat(item.sgst_amount || 0);
                const rate = parseFloat(item.gst_rate || 0);
                const halfRate = rate / 2;

                return (
                  <tr key={item.id}>
                    <td className="py-2.5 px-2 font-bold text-[10px] text-slate-600 uppercase">
                      {item.item_type}
                    </td>
                    <td className="py-2.5 px-2 font-medium text-slate-800">{item.description}</td>
                    <td className="py-2.5 px-2 text-center font-mono text-[11px]">{item.hsn_code || '—'}</td>
                    <td className="py-2.5 px-2 text-center font-mono">{item.quantity}</td>
                    <td className="py-2.5 px-2 text-right font-mono">₹{taxable.toFixed(2)}</td>
                    {order.is_gst_bill !== false && (
                      <>
                        <td className="py-2.5 px-2 text-right font-mono text-[11px]">
                          ₹{cgst.toFixed(2)} <span className="text-[9px] text-slate-400">({halfRate}%)</span>
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono text-[11px]">
                          ₹{sgst.toFixed(2)} <span className="text-[9px] text-slate-400">({halfRate}%)</span>
                        </td>
                      </>
                    )}
                    <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-900">
                      ₹{(order.discount_allocated ? taxable + cgst + sgst : parseFloat(item.total_price)).toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Financial Calculation & Payment Summary */}
        <div className="py-4 flex justify-between items-start">
          <div className="max-w-xs text-[11px] text-slate-500 space-y-2">
            <p className="font-semibold text-slate-700">Important Instructions & Terms:</p>
            <ul className="list-disc pl-4 space-y-0.5 text-[10.5px]">
              <li>Please present this invoice when collecting your custom optical order.</li>
              <li>Spectacle lenses are edged to the precise prescription measurements recorded above.</li>
              <li>Goods once sold are covered under manufacturer optical warranty.</li>
            </ul>
            {order.notes && (
              <p className="text-slate-600 italic mt-2 bg-slate-50 p-2 rounded border border-slate-100">
                <strong>Notes:</strong> {order.notes}
              </p>
            )}
          </div>

          <div className="w-72 space-y-1.5 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
            {order.is_gst_bill !== false && (
              <>
                <div className="flex justify-between text-slate-600 text-xs">
                  <span>Total Taxable Value:</span>
                  <span className="font-mono">₹{parseFloat(order.total_taxable_value ?? order.subtotal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500 text-xs">
                  <span>Total CGST:</span>
                  <span className="font-mono">₹{parseFloat(order.total_cgst || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500 text-xs">
                  <span>Total SGST:</span>
                  <span className="font-mono">₹{parseFloat(order.total_sgst || 0).toFixed(2)}</span>
                </div>
              </>
            )}

            {order.discount > 0 && (
              <div className="flex justify-between text-emerald-600 text-xs">
                <span>{order.discount_allocated ? 'Order discount (included):' : 'Discount Applied:'}</span>
                <span className="font-mono">{order.discount_allocated ? '' : '-'}₹{parseFloat(order.discount).toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between font-bold text-sm text-slate-900 border-t border-slate-200 pt-1.5">
              <span>Net Grand Total:</span>
              <span className="font-mono">₹{parseFloat(order.total_amount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-700 font-medium text-xs">
              <span>Advance Payment Paid:</span>
              <span className="font-mono">₹{parseFloat(order.total_paid).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-extrabold text-sm border-t border-slate-200 pt-1.5 text-indigo-700 bg-white p-2 rounded-lg border border-indigo-100 shadow-sm">
              <span>Balance Due:</span>
              <span className="font-mono">₹{parseFloat(order.balance_due).toFixed(2)}</span>
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