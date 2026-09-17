import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api.js';
import { ArrowLeft, Plus, Trash2, ShoppingBag, AlertCircle, Sparkles } from 'lucide-react';

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

  // Items
  const [items, setItems] = useState([
    { productId: null, itemType: 'FRAME', description: '', quantity: 1, unitPrice: '', discount: 0 },
    { productId: null, itemType: 'LENS', description: '', quantity: 1, unitPrice: '', discount: 0 },
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

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const handleSelectFromStock = (index, productId) => {
    if (!productId) return;
    const prod = stockProducts.find((p) => p.id === productId);
    if (prod) {
      const updated = [...items];
      updated[index].productId = prod.id; // <-- Passes real product ID
      updated[index].description = `${prod.brand ? prod.brand + ' ' : ''}${prod.name}${prod.model_code ? ' (' + prod.model_code + ')' : ''}`;
      updated[index].unitPrice = prod.selling_price;
      updated[index].itemType = prod.item_type;
      setItems(updated);
    }
  };

  const addItem = () => {
    setItems([...items, { itemType: 'ACCESSORY', description: '', quantity: 1, unitPrice: '', discount: 0, saveToStock: false }]);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  // Compute Subtotal and Total
  const subtotal = items.reduce((sum, item) => {
    const qty = parseInt(item.quantity, 10) || 0;
    const price = parseFloat(item.unitPrice) || 0;
    const disc = parseFloat(item.discount) || 0;
    return sum + (qty * price - disc);
  }, 0);

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
      // 1. Auto-save items to stock inventory if marked
      for (const item of items) {
        if (item.saveToStock && item.description && item.unitPrice) {
          try {
            await api.post('/products', {
              itemType: item.itemType,
              name: item.description,
              sellingPrice: parseFloat(item.unitPrice),
              stockQuantity: 0, // Recorded via order
            });
          } catch (err) {
            console.warn('Auto stock save skipped', err);
          }
        }
      }

      // 2. Create the order
      const payload = {
        customerId: selectedCustomerId,
        prescriptionId: selectedPrescriptionId || null,
        dueDate,
        items: items.map((i) => ({
          productId: i.productId || null,
          itemType: i.itemType,
          description: i.description,
          quantity: parseInt(i.quantity, 10),
          unitPrice: parseFloat(i.unitPrice),
          discount: parseFloat(i.discount) || 0,
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
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-slate-900 text-base">2. Order Items</h2>
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              <Plus className="w-3.5 h-3.5" /> Add Another Item
            </button>
          </div>

          <div className="space-y-4">
            {items.map((item, index) => {
              const matchedStock = stockProducts.filter((p) => p.item_type === item.itemType);
              return (
                <div
                  key={index}
                  className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3"
                >
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                    <div className="md:col-span-3">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Type</label>
                      <select
                        value={item.itemType}
                        onChange={(e) => handleItemChange(index, 'itemType', e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs bg-white font-semibold"
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

                    <div className="md:col-span-5">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Description</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Ray-Ban Matte Black"
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Price (₹)</label>
                      <input
                        type="number"
                        required
                        placeholder="0"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white font-mono text-right focus:outline-none"
                      />
                    </div>

                    <div className="md:col-span-2 flex items-center justify-end gap-2 pt-4">
                      <span className="text-xs font-mono font-bold text-slate-700">
                        ₹{(parseFloat(item.unitPrice) || 0).toLocaleString()}
                      </span>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Quick Select from Stock Dropdown & Auto-Add Option */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60 text-xs">
                    {matchedStock.length > 0 ? (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-500">Pick from stock:</span>
                        <select
                          onChange={(e) => handleSelectFromStock(index, e.target.value)}
                          defaultValue=""
                          className="px-2 py-1 bg-white border border-slate-200 rounded text-[11px] text-indigo-700 font-medium focus:outline-none"
                        >
                          <option value="">-- Choose Existing Stock Item --</option>
                          {matchedStock.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.brand || 'No brand'}) - ₹{p.selling_price} [Qty: {p.stock_quantity}]
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">No {item.itemType.toLowerCase()}s in stock yet</span>
                    )}

                    {/* Checkbox to automatically register into stock list */}
                    <label className="inline-flex items-center gap-1.5 text-[11px] font-medium text-indigo-600 cursor-pointer select-none bg-indigo-50/70 px-2 py-1 rounded border border-indigo-100">
                      <input
                        type="checkbox"
                        checked={item.saveToStock || false}
                        onChange={(e) => handleItemChange(index, 'saveToStock', e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <Sparkles className="w-3 h-3 text-indigo-500" />
                      Save this item to stock catalog
                    </label>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pricing Summary */}
          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <div className="w-64 space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-mono">₹{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Discount:</span>
                <input
                  type="number"
                  value={orderDiscount}
                  onChange={(e) => setOrderDiscount(e.target.value)}
                  className="w-24 px-2 py-1 rounded border border-slate-200 text-right font-mono text-xs"
                />
              </div>
              <div className="flex justify-between font-bold text-base text-slate-900 border-t border-slate-200 pt-2">
                <span>Grand Total:</span>
                <span className="font-mono text-indigo-600">₹{grandTotal.toLocaleString()}</span>
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