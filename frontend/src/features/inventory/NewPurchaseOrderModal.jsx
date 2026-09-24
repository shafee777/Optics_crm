import { useModalAccessibility } from '../../hooks/useModalAccessibility.js';
import React, { useState, useEffect } from 'react';
import api from '../../services/api.js';
import { X, ShoppingBag, Plus, Trash2, AlertCircle, Building2, Calculator, CheckCircle2 } from 'lucide-react';

const ITEM_TYPES = [
  { value: 'FRAME', label: 'Spectacle Frame' },
  { value: 'LENS', label: 'Ophthalmic Lens Pair' },
  { value: 'SUNGLASSES', label: 'Sunglasses' },
  { value: 'CONTACT_LENS', label: 'Contact Lens' },
  { value: 'SOLUTION', label: 'Cleaning Solution' },
  { value: 'ACCESSORY', label: 'Case / Accessory' },
];

export default function NewPurchaseOrderModal({ isOpen, onClose, onPurchaseCreated, onOpenAddSupplier }) {
  const [suppliers, setSuppliers] = useState([]);
  const [existingProducts, setExistingProducts] = useState([]);
  const [supplierId, setSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const [items, setItems] = useState([
    {
      productId: '',
      itemName: '',
      itemType: 'FRAME',
      brand: '',
      modelCode: '',
      quantity: 1,
      unitCost: '',
      gstRate: 12,
    },
  ]);

  const [hasInitialPayment, setHasInitialPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [paymentRef, setPaymentRef] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchSuppliersAndProducts();
    }
  }, [isOpen]);

  const fetchSuppliersAndProducts = async () => {
    try {
      const [supRes, prodRes] = await Promise.all([
        api.get('/suppliers'),
        api.get('/products'),
      ]);
      setSuppliers(supRes.data.data || []);
      setExistingProducts(prodRes.data.data || []);
      if (supRes.data.data?.length > 0 && !supplierId) {
        setSupplierId(supRes.data.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  };

  const modalRef = useModalAccessibility(isOpen, onClose);
  if (!isOpen) return null;

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        productId: '',
        itemName: '',
        itemType: 'FRAME',
        brand: '',
        modelCode: '',
        quantity: 1,
        unitCost: '',
        gstRate: 12,
      },
    ]);
  };

  const handleRemoveItem = (index) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;

    // If existing product selected, autofill details
    if (field === 'productId') {
      if (value) {
        const prod = existingProducts.find((p) => p.id === value);
        if (prod) {
          updated[index].itemName = prod.name;
          updated[index].itemType = prod.item_type || 'FRAME';
          updated[index].brand = prod.brand || '';
          updated[index].modelCode = prod.model_code || '';
          updated[index].unitCost = prod.cost_price ? prod.cost_price.toString() : '';
          updated[index].gstRate = prod.gst_rate !== undefined ? prod.gst_rate : 12;
        }
      } else {
        updated[index].itemName = '';
        updated[index].brand = '';
        updated[index].modelCode = '';
        updated[index].unitCost = '';
      }
    }

    setItems(updated);
  };

  // Calculations
  const calculateTotals = () => {
    let subtotal = 0;
    let totalTax = 0;

    items.forEach((item) => {
      const qty = parseInt(item.quantity, 10) || 0;
      const cost = parseFloat(item.unitCost) || 0;
      const gst = parseFloat(item.gstRate) || 0;

      const lineBase = qty * cost;
      const lineGst = (lineBase * gst) / 100;

      subtotal += lineBase;
      totalTax += lineGst;
    });

    const grandTotal = subtotal + totalTax;
    return { subtotal, totalTax, grandTotal };
  };

  const { subtotal, totalTax, grandTotal } = calculateTotals();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!supplierId) {
      setError('Please select or add a supplier');
      return;
    }

    for (let i = 0; i < items.length; i++) {
      if (!items[i].itemName || !items[i].unitCost || parseFloat(items[i].unitCost) <= 0) {
        setError(`Please provide valid Item Name and Unit Cost for row #${i + 1}`);
        return;
      }
    }

    setLoading(true);

    try {
      const payload = {
        supplierId,
        invoiceNumber: invoiceNumber.trim() || null,
        orderDate,
        notes: notes.trim() || null,
        items: items.map((item) => ({
          productId: item.productId || null,
          itemName: item.itemName.trim(),
          itemType: item.itemType,
          brand: item.brand?.trim() || null,
          modelCode: item.modelCode?.trim() || null,
          quantity: parseInt(item.quantity, 10),
          unitCost: parseFloat(item.unitCost),
          gstRate: parseFloat(item.gstRate) || 0,
        })),
        initialPayment: hasInitialPayment && parseFloat(paymentAmount) > 0
          ? {
              amount: parseFloat(paymentAmount),
              paymentMethod,
              referenceNote: paymentRef.trim() || null,
            }
          : null,
      };

      const res = await api.post('/purchases', payload);
      onPurchaseCreated(res.data.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to log purchase order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={modalRef} className="fixed inset-0 z-50 flex items-center justify-center bg-[#203A36]/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-[#FEFEFC] w-full max-w-4xl rounded-2xl shadow-2xl border border-[#E2E7E3] overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
        
        {/* Header */}
        <div className="px-6 py-4 bg-[#203A36] text-white flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#28766B]/30 text-white flex items-center justify-center border border-white/10">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-white text-base">Inward Stock / Purchase Order Entry</h2>
              <p className="text-xs text-white/70">Receive stock from lens labs & frame vendors (auto-increments inventory)</p>
            </div>
          </div>
          <button aria-label="Close dialog" onClick={onClose} className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div role="alert" className="mx-6 mt-4 p-3.5 rounded-xl bg-red-50/80 border border-red-200 flex items-center gap-2 text-red-700 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6">

          {/* PO Header Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#F5F7F3] p-4 rounded-2xl border border-[#E2E7E3]">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="NewPurchaseOrderModal-field-0" className="block text-xs font-semibold text-[#66746F]">Select Supplier / Lab *</label>
                {onOpenAddSupplier && (
                  <button
                    type="button"
                    onClick={onOpenAddSupplier}
                    className="text-[11px] text-[#28766B] hover:text-[#1E5C53] font-semibold"
                  >
                    + New
                  </button>
                )}
              </div>
              <select id="NewPurchaseOrderModal-field-0"
                required
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E2E7E3] text-xs font-semibold text-[#202D2B] focus:border-[#28766B] focus:ring-1 focus:ring-[#28766B] focus:outline-none bg-[#FEFEFC]"
              >
                <option value="">-- Choose Supplier --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.category?.replace('_', ' ')})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="NewPurchaseOrderModal-field-1" className="block text-xs font-semibold text-[#66746F] mb-1">Supplier Bill / Invoice #</label>
              <input id="NewPurchaseOrderModal-field-1"
                type="text"
                placeholder="e.g. INV-2026-904"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E2E7E3] text-xs font-mono focus:border-[#28766B] focus:ring-1 focus:ring-[#28766B] focus:outline-none bg-[#FEFEFC] text-[#202D2B]"
              />
            </div>

            <div>
              <label htmlFor="NewPurchaseOrderModal-field-2" className="block text-xs font-semibold text-[#66746F] mb-1">Inward Date *</label>
              <input id="NewPurchaseOrderModal-field-2"
                type="date"
                required
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E2E7E3] text-xs focus:border-[#28766B] focus:ring-1 focus:ring-[#28766B] focus:outline-none bg-[#FEFEFC] text-[#202D2B]"
              />
            </div>
          </div>

          {/* Items Inward Table */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#202D2B] flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-[#28766B]" />
                Inward Items & Cost Pricing
              </h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="px-3 py-1 bg-[#EBF3F1] hover:bg-[#DCEAE7] text-[#28766B] text-xs font-semibold rounded-xl border border-[#28766B]/20 transition flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Row
              </button>
            </div>

            <div className="border border-[#E2E7E3] rounded-2xl overflow-hidden shadow-xs bg-[#FEFEFC]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F5F7F3] text-[#66746F] font-semibold uppercase tracking-wider text-[11px] border-b border-[#E2E7E3]">
                  <tr>
                    <th className="py-2.5 px-3">Item / Catalog</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-2 w-20 text-center">Qty</th>
                    <th className="py-2.5 px-3 w-28 text-right">Unit Cost (₹)</th>
                    <th className="py-2.5 px-2 w-24 text-center">GST %</th>
                    <th className="py-2.5 px-3 w-28 text-right">Line Total</th>
                    <th className="py-2.5 px-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E7E3]">
                  {items.map((item, idx) => {
                    const qty = parseInt(item.quantity, 10) || 0;
                    const cost = parseFloat(item.unitCost) || 0;
                    const gst = parseFloat(item.gstRate) || 0;
                    const lineTot = (qty * cost) * (1 + gst / 100);

                    return (
                      <tr key={idx} className="hover:bg-[#F5F7F3]/60 transition-colors">
                        <td className="p-2 space-y-1">
                          <input
                            type="text"
                            required
                            placeholder="Item name (e.g. Ray-Ban RB5228)"
                            value={item.itemName}
                            onChange={(e) => handleItemChange(idx, 'itemName', e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-[#E2E7E3] text-xs font-semibold bg-[#FEFEFC] text-[#202D2B] focus:border-[#28766B] focus:outline-none"
                          />
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              placeholder="Brand"
                              value={item.brand}
                              onChange={(e) => handleItemChange(idx, 'brand', e.target.value)}
                              className="w-1/2 px-2 py-1 rounded border border-[#E2E7E3] text-[11px] text-[#66746F] bg-[#FEFEFC] focus:outline-none"
                            />
                            <input
                              type="text"
                              placeholder="Model / Code"
                              value={item.modelCode}
                              onChange={(e) => handleItemChange(idx, 'modelCode', e.target.value)}
                              className="w-1/2 px-2 py-1 rounded border border-[#E2E7E3] text-[11px] text-[#66746F] bg-[#FEFEFC] focus:outline-none"
                            />
                          </div>
                        </td>

                        <td className="p-2 align-top">
                          <select
                            value={item.itemType}
                            onChange={(e) => handleItemChange(idx, 'itemType', e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg border border-[#E2E7E3] text-xs bg-[#FEFEFC] text-[#202D2B] focus:outline-none font-medium"
                          >
                            {ITEM_TYPES.map((t) => (
                              <option key={t.value} value={t.value}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="p-2 align-top">
                          <input
                            type="number"
                            min="1"
                            required
                            value={item.quantity}
                            onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                            className="w-full text-center px-1.5 py-1.5 rounded-lg border border-[#E2E7E3] text-xs font-mono font-bold tabular-nums bg-[#FEFEFC] text-[#202D2B] focus:outline-none"
                          />
                        </td>

                        <td className="p-2 align-top">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            required
                            placeholder="0.00"
                            value={item.unitCost}
                            onChange={(e) => handleItemChange(idx, 'unitCost', e.target.value)}
                            className="w-full text-right px-2 py-1.5 rounded-lg border border-[#E2E7E3] text-xs font-mono font-bold tabular-nums text-[#202D2B] bg-[#FEFEFC] focus:outline-none"
                          />
                        </td>

                        <td className="p-2 align-top">
                          <select
                            value={item.gstRate}
                            onChange={(e) => handleItemChange(idx, 'gstRate', e.target.value)}
                            className="w-full text-center px-1 py-1.5 rounded-lg border border-[#E2E7E3] text-xs font-mono tabular-nums bg-[#FEFEFC] text-[#202D2B] focus:outline-none"
                          >
                            <option value="0">0%</option>
                            <option value="12">12% (Frames)</option>
                            <option value="18">18% (Lenses)</option>
                          </select>
                        </td>

                        <td className="p-2 align-top text-right font-mono font-bold text-[#202D2B] tabular-nums pt-3">
                          ₹{lineTot.toFixed(2)}
                        </td>

                        <td className="p-2 align-top text-center pt-2.5">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            disabled={items.length <= 1}
                            className="text-[#66746F] hover:text-red-600 disabled:opacity-30 p-1 transition"
                            title="Remove row"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pricing Summary & Downpayment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left: Downpayment on delivery */}
            <div className="bg-[#F5F7F3] p-4 rounded-2xl border border-[#E2E7E3] space-y-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasInitialPayment}
                  onChange={(e) => {
                    setHasInitialPayment(e.target.checked);
                    if (e.target.checked && !paymentAmount) {
                      setPaymentAmount(grandTotal.toFixed(2));
                    }
                  }}
                  className="rounded text-[#28766B] focus:ring-[#28766B] w-4 h-4 border-[#E2E7E3]"
                />
                <span className="text-xs font-bold text-[#202D2B]">
                  Record Down-Payment / Cash Paid to Supplier Now
                </span>
              </label>

              {hasInitialPayment && (
                <div className="space-y-3 pt-2 border-t border-[#E2E7E3]">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="NewPurchaseOrderModal-field-3" className="block text-[11px] font-semibold text-[#66746F] mb-1">Paid Amount (₹)</label>
                      <input id="NewPurchaseOrderModal-field-3"
                        type="number"
                        step="0.01"
                        placeholder="e.g. 5000"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#E2E7E3] text-xs font-mono font-bold tabular-nums bg-[#FEFEFC] text-[#202D2B] focus:border-[#28766B] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label htmlFor="NewPurchaseOrderModal-field-4" className="block text-[11px] font-semibold text-[#66746F] mb-1">Payment Method</label>
                      <select id="NewPurchaseOrderModal-field-4"
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#E2E7E3] text-xs bg-[#FEFEFC] text-[#202D2B] focus:border-[#28766B] focus:outline-none"
                      >
                        <option value="UPI">UPI / GPay / PhonePe</option>
                        <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                        <option value="CASH">Cash</option>
                        <option value="CHEQUE">Cheque</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Payment note / Reference (e.g. UPI Ref #4930)"
                      value={paymentRef}
                      onChange={(e) => setPaymentRef(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-[#E2E7E3] text-xs bg-[#FEFEFC] text-[#202D2B] focus:border-[#28766B] focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Right: Cost Calculations */}
            <div className="bg-[#203A36] text-white p-4 rounded-2xl space-y-2 text-xs border border-[#182C29]">
              <div className="flex justify-between text-white/80">
                <span>Subtotal (Base Cost):</span>
                <span className="font-mono tabular-nums">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-white/80">
                <span>Total Input GST:</span>
                <span className="font-mono tabular-nums">+₹{totalTax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-white/10">
                <span>Grand Total Inward:</span>
                <span className="font-mono tabular-nums text-emerald-400">₹{grandTotal.toFixed(2)}</span>
              </div>
              {hasInitialPayment && (
                <div className="flex justify-between text-xs text-amber-300 pt-1">
                  <span>Balance Payable to Supplier:</span>
                  <span className="font-mono tabular-nums">
                    ₹{Math.max(0, grandTotal - (parseFloat(paymentAmount) || 0)).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="NewPurchaseOrderModal-field-5" className="block text-xs font-semibold text-[#66746F] mb-1">Internal Purchase Order Notes</label>
            <input id="NewPurchaseOrderModal-field-5"
              type="text"
              placeholder="e.g. Received via courier box #2, lenses inspected and verified"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#E2E7E3] text-xs bg-[#FEFEFC] text-[#202D2B] focus:border-[#28766B] focus:ring-1 focus:ring-[#28766B] focus:outline-none"
            />
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-[#E2E7E3]">
            <span className="text-xs text-[#66746F]">
              Inward stock will be added directly to your inventory quantities
            </span>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-semibold text-[#66746F] hover:text-[#202D2B] bg-[#FEFEFC] border border-[#E2E7E3] hover:bg-[#F5F7F3] rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-[#28766B] hover:bg-[#1E5C53] text-white text-xs font-semibold rounded-xl shadow-xs disabled:opacity-50 transition flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                {loading ? 'Processing Inward...' : 'Confirm & Inward Stock'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}