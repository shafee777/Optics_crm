import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api.js';
import { ArrowLeft, Plus, Trash2, ShoppingBag, AlertCircle } from 'lucide-react';

export default function CreateOrderPage() {
  const [searchParams] = useSearchParams();
  const preselectedCustomerId = searchParams.get('customerId');
  const navigate = useNavigate();

  // Customer selection
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(preselectedCustomerId || '');
  const [prescriptions, setPrescriptions] = useState([]);
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState('');

  // Products stock catalog (for quick select)
  const [stockProducts, setStockProducts] = useState([]);

  // Helper for default GST rate and HSN Code based on optical item type
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

  // Items state with GST tax fields
  const [isGstBill, setIsGstBill] = useState(true);
  const [items, setItems] = useState([
    { productId: null, itemType: 'FRAME', description: '', quantity: 1, unitPrice: '', discount: 0, hsnCode: '9004', gstRate: 12 },
    { productId: null, itemType: 'LENS', description: '', quantity: 1, unitPrice: '', discount: 0, hsnCode: '9001', gstRate: 18 },
  ]);

  // Order Settings
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });
  const [orderDiscount, setOrderDiscount] = useState(0);
  const [notes, setNotes] = useState('');

  // Advance Payment
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [paymentRef, setPaymentRef] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(null);

  // Fetch customers and stock products
  useEffect(() => {
    api.get('/customers?limit=50')
      .then((res) => setCustomers(res.data.data))
      .catch((err) => console.error(err));

    api.get('/products?limit=200')
      .then((res) => setStockProducts(res.data.data))
      .catch((err) => console.error(err));
  }, []);

  // Fetch prescriptions when customer is selected
  useEffect(() => {
    if (selectedCustomerId) {
      api.get(`/customers/${selectedCustomerId}/prescriptions`)
        .then((res) => {
          setPrescriptions(res.data.data);
          if (res.data.data.length > 0) {
            setSelectedPrescriptionId(res.data.data[0].id);
          }
        })
        .catch((err) => console.error(err));
    }
  }, [selectedCustomerId]);

  const handleDescriptionChange = (index, text) => {
    const updated = [...items];
    updated[index].description = text;
    updated[index].productId = null; // Clear linked product ID if manually typed
    setItems(updated);
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
    setItems(updated);
    setActiveSuggestionIndex(null);
  };

  const addItem = () => {
    const defaults = getDefaultGstAndHsn('ACCESSORY');
    setItems([...items, { productId: null, itemType: 'ACCESSORY', description: '', quantity: 1, unitPrice: '', discount: 0, hsnCode: defaults.hsnCode, gstRate: defaults.gstRate }]);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  // Compute Subtotal, Taxable, CGST, SGST and Grand Total
  const subtotal = items.reduce((sum, item) => {
    const qty = parseInt(item.quantity, 10) || 0;
    const price = parseFloat(item.unitPrice) || 0;
    const disc = parseFloat(item.discount) || 0;
    return sum + Math.max(0, qty * price - disc);
  }, 0);

  const totalTaxable = items.reduce((sum, item) => {
    const qty = parseInt(item.quantity, 10) || 0;
    const price = parseFloat(item.unitPrice) || 0;
    const disc = parseFloat(item.discount) || 0;
    const itemTotal = Math.max(0, qty * price - disc);
    const rate = isGstBill ? (parseFloat(item.gstRate) || 0) : 0;
    const taxable = rate > 0 ? itemTotal / (1 + rate / 100) : itemTotal;
    return sum + taxable;
  }, 0);

  const totalTax = isGstBill ? subtotal - totalTaxable : 0;
  const totalCgst = totalTax / 2;
  const totalSgst = totalTax / 2;

  const grandTotal = Math.max(0, subtotal - (parseFloat(orderDiscount) || 0));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedCustomerId) {
      setError('Please select a customer');
      return;
    }

    if (items.some((i) => !i.description || !i.unitPrice)) {
      setError('Please fill in descriptions and prices for all items');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        customerId: selectedCustomerId,
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
        advancePayment:
          advanceAmount && parseFloat(advanceAmount) > 0
            ? {
                amount: parseFloat(advanceAmount),
                paymentMethod,
                reference: paymentRef,
              }
            : null,
      };

      const response = await api.post('/orders', payload);
      navigate(`/orders/${response.data.data.id}`);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
          <ShoppingBag className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">New Optical Order</h1>
          <p className="text-xs text-slate-500">Select stock items or enter custom frames & lenses</p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Customer & Prescription */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="font-bold text-slate-900 text-base">1. Customer & Eye Power</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Select Customer *</label>
              <select
                required
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
              >
                <option value="">-- Choose Customer --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name} ({c.customer_code} • {c.phone || 'No phone'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Link Prescription</label>
              <select
                value={selectedPrescriptionId}
                onChange={(e) => setSelectedPrescriptionId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
              >
                <option value="">-- No linked prescription --</option>
                {prescriptions.map((p, index) => (
                  <option key={p.id} value={p.id}>
                    {index === 0 ? 'Current Power' : `Test #${prescriptions.length - index}`} ({new Date(p.tested_at).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Step 2: Line items */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <div>
              <h2 className="font-bold text-slate-900 text-base">2. Order Items</h2>
              <p className="text-xs text-slate-500">Configure item specs, HSN codes, and GST tax rates</p>
            </div>
            <div className="flex items-center gap-4">
              <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                <input
                  type="checkbox"
                  checked={isGstBill}
                  onChange={(e) => setIsGstBill(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <span>Generate Official Indian GST Tax Invoice</span>
              </label>
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                <Plus className="w-3.5 h-3.5" /> Add Item
              </button>
            </div>
          </div>

          <div className="space-y-4">
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
                <div
                  key={index}
                  className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 relative"
                >
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Type</label>
                      <select
                        value={item.itemType}
                        onChange={(e) => {
                          const updated = [...items];
                          const newType = e.target.value;
                          const { hsnCode, gstRate } = getDefaultGstAndHsn(newType);
                          updated[index].itemType = newType;
                          updated[index].hsnCode = hsnCode;
                          updated[index].gstRate = gstRate;
                          setItems(updated);
                        }}
                        className="w-full px-2 py-2 rounded-lg border border-slate-200 text-xs bg-white font-semibold focus:outline-none"
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
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        Description / Name (Auto-search Catalog)
                      </label>
                      <input
                        type="text"
                        required
                        placeholder={`Type ${item.itemType.toLowerCase()} name...`}
                        value={item.description}
                        onFocus={() => setActiveSuggestionIndex(index)}
                        onChange={(e) => handleDescriptionChange(index, e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />

                      {/* Live Autocomplete Suggestions Overlay */}
                      {activeSuggestionIndex === index && matchedSuggestions.length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100">
                          <div className="p-1.5 text-[10px] font-bold text-slate-400 bg-slate-50 uppercase tracking-wider flex justify-between">
                            <span>Matching In-Stock Items</span>
                            <button
                              type="button"
                              onClick={() => setActiveSuggestionIndex(null)}
                              className="text-slate-400 hover:text-slate-600"
                            >
                              ✕
                            </button>
                          </div>
                          {matchedSuggestions.map((prod) => (
                            <button
                              key={prod.id}
                              type="button"
                              onClick={() => handleSelectSuggestion(index, prod)}
                              className="w-full text-left p-2 hover:bg-indigo-50/80 transition flex items-center justify-between text-xs"
                            >
                              <div>
                                <div className="font-semibold text-slate-900">
                                  {prod.brand ? `${prod.brand} ` : ''}{prod.name}
                                </div>
                                {prod.model_code && (
                                  <div className="text-[10px] text-slate-400 font-mono">Code: {prod.model_code}</div>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="font-mono font-bold text-indigo-600">₹{parseFloat(prod.selling_price).toLocaleString()}</div>
                                <div className="text-[10px] text-slate-500 font-medium">Stock: {prod.stock_quantity}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">HSN Code</label>
                      <input
                        type="text"
                        placeholder="e.g. 9004"
                        value={item.hsnCode || ''}
                        onChange={(e) => {
                          const updated = [...items];
                          updated[index].hsnCode = e.target.value;
                          setItems(updated);
                        }}
                        className="w-full px-2 py-2 rounded-lg border border-slate-200 text-xs bg-white font-mono focus:outline-none uppercase"
                      />
                    </div>

                    {isGstBill && (
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">GST Rate</label>
                        <select
                          value={item.gstRate}
                          onChange={(e) => {
                            const updated = [...items];
                            updated[index].gstRate = e.target.value;
                            setItems(updated);
                          }}
                          className="w-full px-2 py-2 rounded-lg border border-slate-200 text-xs bg-white font-semibold focus:outline-none"
                        >
                          <option value="0">0% GST</option>
                          <option value="5">5% GST</option>
                          <option value="12">12% GST</option>
                          <option value="18">18% GST</option>
                          <option value="28">28% GST</option>
                        </select>
                      </div>
                    )}

                    <div className={isGstBill ? "md:col-span-2" : "md:col-span-4"}>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Total Price (₹)</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          required
                          placeholder="0"
                          value={item.unitPrice}
                          onChange={(e) => {
                            const updated = [...items];
                            updated[index].unitPrice = e.target.value;
                            setItems(updated);
                          }}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white font-mono text-right focus:outline-none"
                        />
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg shrink-0"
                          >
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
          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <div className="w-80 space-y-2 text-sm bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex justify-between text-slate-600 text-xs">
                <span>Subtotal (Incl. Taxes):</span>
                <span className="font-mono font-semibold">₹{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>

              {isGstBill && (
                <>
                  <div className="flex justify-between text-slate-500 text-xs">
                    <span>Taxable Amount (Net):</span>
                    <span className="font-mono">₹{totalTaxable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 text-xs">
                    <span>CGST Total:</span>
                    <span className="font-mono">₹{totalCgst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 text-xs">
                    <span>SGST Total:</span>
                    <span className="font-mono">₹{totalSgst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </>
              )}

              <div className="flex justify-between items-center text-slate-600 text-xs pt-1 border-t border-slate-200">
                <span>Additional Order Discount:</span>
                <input
                  type="number"
                  value={orderDiscount}
                  onChange={(e) => setOrderDiscount(e.target.value)}
                  className="w-24 px-2 py-1 rounded border border-slate-200 text-right font-mono text-xs bg-white"
                />
              </div>

              <div className="flex justify-between font-bold text-base text-slate-900 border-t border-slate-200 pt-2">
                <span>Grand Total Payable:</span>
                <span className="font-mono text-indigo-600">₹{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Step 3: Advance Payment & Due Date */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="font-bold text-slate-900 text-base">3. Advance Payment & Due Date</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Expected Delivery Date *</label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Advance Amount (₹)</label>
              <input
                type="number"
                placeholder="e.g. 1000"
                value={advanceAmount}
                onChange={(e) => setAdvanceAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none"
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Reference / Txn ID</label>
              <input
                type="text"
                placeholder="e.g. UPI Ref / Cheque No."
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Order Notes</label>
            <input
              type="text"
              placeholder="e.g. Needs delivery by Saturday afternoon"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none"
            />
          </div>
        </div>

        {/* Submit button */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-600/20 disabled:opacity-50"
          >
            {loading ? 'Creating Order...' : 'Confirm & Create Order'}
          </button>
        </div>
      </form>
    </div>
  );
}