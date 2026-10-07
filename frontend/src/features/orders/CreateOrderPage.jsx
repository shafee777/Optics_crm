import { calculateBilling } from '../../../../shared/billing.mjs';
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api.js';
import { ArrowLeft, Plus, Trash2, ShoppingBag, AlertCircle, Zap } from 'lucide-react';

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

  let billing, billingError = '';
  try { billing = calculateBilling(items, orderDiscount, isGstBill); }
  catch (error) { billingError = error.message; }
  const { subtotal = 0, totalTaxableValue: totalTaxable = 0, totalCgst = 0, totalSgst = 0, totalAmount: grandTotal = 0 } = billing || {};
  const totalTax = totalCgst + totalSgst;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (billingError) { setError(billingError); return; }

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
      const createdOrder = response.data.data;

      navigate(`/orders/${createdOrder.id}`);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <p className="text-sm">Select an inventory product to deduct stock. Custom lines are not stock-tracked.</p>
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#66746F] hover:text-[#202D2B] transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#28766B] text-white flex items-center justify-center shadow-sm">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#202D2B]">New Optical Order</h1>
            <p className="text-xs text-[#66746F]">Select stock items or enter custom frames & lenses</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate(selectedCustomerId ? `/orders/quick?customerId=${selectedCustomerId}` : '/orders/quick')}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#EBF3F1] hover:bg-[#DDEAE7] text-[#28766B] rounded-xl text-xs font-semibold border border-[#28766B]/20 transition self-start sm:self-auto"
        >
          <Zap className="w-4 h-4" />
          Guided Flow (Customer + Rx + Order)
        </button>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-800 text-xs font-medium">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      <form aria-label="Create order" onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Customer & Prescription */}
        <div className="bg-[#FEFEFC] p-6 rounded-2xl border border-[#E2E7E3] shadow-sm space-y-4">
          <h2 className="font-bold text-[#202D2B] text-sm">1. Customer & Eye Power</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="CreateOrderPage-field-0" className="block text-xs font-semibold text-[#202D2B] mb-1">Select Customer *</label>
              <select id="CreateOrderPage-field-0"
                required
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E2E7E3] text-xs text-[#202D2B] focus:ring-2 focus:ring-[#28766B]/30 focus:border-[#28766B] focus:outline-none bg-white"
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
              <label htmlFor="CreateOrderPage-field-1" className="block text-xs font-semibold text-[#202D2B] mb-1">Link Prescription</label>
              <select id="CreateOrderPage-field-1"
                value={selectedPrescriptionId}
                onChange={(e) => setSelectedPrescriptionId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E2E7E3] text-xs text-[#202D2B] focus:ring-2 focus:ring-[#28766B]/30 focus:border-[#28766B] focus:outline-none bg-white"
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
        <div className="bg-[#FEFEFC] p-6 rounded-2xl border border-[#E2E7E3] shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#E2E7E3]">
            <div>
              <h2 className="font-bold text-[#202D2B] text-sm">2. Order Items</h2>
              <p className="text-xs text-[#66746F]">Configure item specs, HSN codes, and GST tax rates</p>
            </div>
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#202D2B] bg-[#F5F7F3] px-3 py-1.5 rounded-xl border border-[#E2E7E3]">
                <input
                  type="checkbox"
                  checked={isGstBill}
                  onChange={(e) => setIsGstBill(e.target.checked)}
                  className="w-4 h-4 text-[#28766B] rounded focus:ring-[#28766B]"
                />
                <span>Generate Official Indian GST Tax Invoice</span>
              </label>
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#28766B] hover:underline"
              >
                <Plus className="w-3.5 h-3.5" /> Add Item
              </button>
            </div>
          </div>

          <div className="space-y-3">
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
                  className="p-4 bg-[#F5F7F3] border border-[#E2E7E3] rounded-xl space-y-3 relative"
                >
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                    <div className="md:col-span-2">
                      <label htmlFor={'CreateOrderPage-field-2-' + index} className="block text-[10px] font-bold text-[#66746F] uppercase mb-1">Type</label>
                      <select id={'CreateOrderPage-field-2-' + index}
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
                        className="w-full px-2 py-2 rounded-xl border border-[#E2E7E3] text-xs bg-white text-[#202D2B] font-semibold focus:outline-none"
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
                      <label htmlFor={'CreateOrderPage-field-3-' + index} className="block text-[10px] font-bold text-[#66746F] uppercase mb-1">
                        Description / Name (Auto-search Catalog)
                      </label>
                      <input id={'CreateOrderPage-field-3-' + index}
                        type="text"
                        required
                        placeholder={`Type ${item.itemType.toLowerCase()} name...`}
                        value={item.description}
                        onFocus={() => setActiveSuggestionIndex(index)}
                        onChange={(e) => handleDescriptionChange(index, e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-[#E2E7E3] text-xs text-[#202D2B] bg-white focus:ring-2 focus:ring-[#28766B]/30 focus:border-[#28766B] focus:outline-none"
                      />

                      {/* Live Autocomplete Suggestions Overlay */}
                      {activeSuggestionIndex === index && matchedSuggestions.length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-[#FEFEFC] border border-[#E2E7E3] rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-[#E2E7E3]">
                          <div className="p-1.5 text-[10px] font-bold text-[#66746F] bg-[#F5F7F3] uppercase tracking-wider flex justify-between">
                            <span>Matching In-Stock Items</span>
                            <button
                              type="button"
                              onClick={() => setActiveSuggestionIndex(null)}
                              className="text-[#66746F] hover:text-[#202D2B]"
                            >
                              ✕
                            </button>
                          </div>
                          {matchedSuggestions.map((prod) => (
                            <button
                              key={prod.id}
                              type="button"
                              onClick={() => handleSelectSuggestion(index, prod)}
                              className="w-full text-left p-2.5 hover:bg-[#EBF3F1] transition flex items-center justify-between text-xs"
                            >
                              <div>
                                <div className="font-semibold text-[#202D2B]">
                                  {prod.brand ? `${prod.brand} ` : ''}{prod.name}
                                </div>
                                {prod.model_code && (
                                  <div className="text-[10px] text-[#66746F] tabular-nums">Code: {prod.model_code}</div>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="tabular-nums font-bold text-[#28766B]">₹{parseFloat(prod.selling_price).toLocaleString()}</div>
                                <div className="text-[10px] text-[#66746F] font-medium">Stock: {prod.stock_quantity}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label htmlFor={'CreateOrderPage-field-4-' + index} className="block text-[10px] font-bold text-[#66746F] uppercase mb-1">HSN Code</label>
                      <input id={'CreateOrderPage-field-4-' + index}
                        type="text"
                        placeholder="e.g. 9004"
                        value={item.hsnCode || ''}
                        onChange={(e) => {
                          const updated = [...items];
                          updated[index].hsnCode = e.target.value;
                          setItems(updated);
                        }}
                        className="w-full px-2 py-2 rounded-xl border border-[#E2E7E3] text-xs bg-white text-[#202D2B] tabular-nums focus:outline-none uppercase"
                      />
                    </div>

                    {isGstBill && (
                      <div className="md:col-span-2">
                        <label htmlFor={'CreateOrderPage-field-5-' + index} className="block text-[10px] font-bold text-[#66746F] uppercase mb-1">GST Rate</label>
                        <select id={'CreateOrderPage-field-5-' + index}
                          value={item.gstRate}
                          onChange={(e) => {
                            const updated = [...items];
                            updated[index].gstRate = e.target.value;
                            setItems(updated);
                          }}
                          className="w-full px-2 py-2 rounded-xl border border-[#E2E7E3] text-xs bg-white text-[#202D2B] font-semibold focus:outline-none"
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
                      <label htmlFor={'CreateOrderPage-field-6-' + index} className="block text-[10px] font-bold text-[#66746F] uppercase mb-1">Total Price (₹)</label>
                      <div className="flex items-center gap-2">
                        <input id={'CreateOrderPage-field-6-' + index}
                          type="number"
                          required
                          placeholder="0"
                          value={item.unitPrice}
                          onChange={(e) => {
                            const updated = [...items];
                            updated[index].unitPrice = e.target.value;
                            setItems(updated);
                          }}
                          className="w-full px-3 py-2 rounded-xl border border-[#E2E7E3] text-xs bg-white text-[#202D2B] tabular-nums font-bold text-right focus:outline-none"
                        />
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="p-1.5 text-[#66746F] hover:text-rose-700 rounded-lg shrink-0"
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
          <div className="pt-4 border-t border-[#E2E7E3] flex justify-end">
            <div className="w-80 space-y-2 text-xs bg-[#F5F7F3] p-4 rounded-xl border border-[#E2E7E3]">
              <div className="flex justify-between text-[#66746F]">
                <span>Subtotal (Incl. Taxes):</span>
                <span className="tabular-nums font-bold text-[#202D2B]">₹{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>

              {isGstBill && (
                <>
                  <div className="flex justify-between text-[#66746F]">
                    <span>Taxable Amount (Net):</span>
                    <span className="tabular-nums">₹{totalTaxable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-[#66746F]">
                    <span>CGST Total:</span>
                    <span className="tabular-nums">₹{totalCgst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-[#66746F]">
                    <span>SGST Total:</span>
                    <span className="tabular-nums">₹{totalSgst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </>
              )}

              <div className="flex justify-between items-center text-[#66746F] pt-1 border-t border-[#E2E7E3]">
                <span>Additional Order Discount:</span>
                <input
                  type="number"
                  value={orderDiscount}
                  onChange={(e) => setOrderDiscount(e.target.value)}
                  className="w-24 px-2 py-1 rounded-lg border border-[#E2E7E3] text-right tabular-nums text-xs bg-white text-[#202D2B]"
                />
              </div>

              <div className="flex justify-between font-bold text-sm text-[#202D2B] border-t border-[#E2E7E3] pt-2">
                <span>Grand Total Payable:</span>
                <span className="tabular-nums text-[#28766B]">₹{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Step 3: Advance Payment & Due Date */}
        <div className="bg-[#FEFEFC] p-6 rounded-2xl border border-[#E2E7E3] shadow-sm space-y-4">
          <h2 className="font-bold text-[#202D2B] text-sm">3. Advance Payment & Due Date</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="CreateOrderPage-field-7" className="block text-xs font-semibold text-[#202D2B] mb-1">Expected Delivery Date *</label>
              <input id="CreateOrderPage-field-7"
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E2E7E3] text-xs text-[#202D2B] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="CreateOrderPage-field-8" className="block text-xs font-semibold text-[#202D2B] mb-1">Advance Amount (₹)</label>
              <input id="CreateOrderPage-field-8"
                type="number"
                placeholder="e.g. 1000"
                value={advanceAmount}
                onChange={(e) => setAdvanceAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E2E7E3] text-xs tabular-nums text-[#202D2B] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="CreateOrderPage-field-9" className="block text-xs font-semibold text-[#202D2B] mb-1">Payment Method</label>
              <select id="CreateOrderPage-field-9"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E2E7E3] text-xs text-[#202D2B] bg-white focus:outline-none"
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
              <label htmlFor="CreateOrderPage-field-10" className="block text-xs font-semibold text-[#202D2B] mb-1">Payment Reference / Txn ID</label>
              <input id="CreateOrderPage-field-10"
                type="text"
                placeholder="e.g. UPI Ref / Cheque No."
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E2E7E3] text-xs text-[#202D2B] focus:outline-none"
              />
            </div>
          )}

          <div>
            <label htmlFor="CreateOrderPage-field-11" className="block text-xs font-semibold text-[#202D2B] mb-1">Order Notes</label>
            <input id="CreateOrderPage-field-11"
              type="text"
              placeholder="e.g. Needs delivery by Saturday afternoon"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#E2E7E3] text-xs text-[#202D2B] placeholder:text-[#9AA8A3] focus:outline-none"
            />
          </div>
        </div>

        {/* Submit button */}
        <div className="flex justify-end gap-2.5">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2.5 rounded-xl border border-[#E2E7E3] text-xs font-semibold text-[#66746F] hover:bg-[#F5F7F3] transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-[#28766B] hover:bg-[#1E5C53] text-white rounded-xl text-xs font-semibold shadow-sm disabled:opacity-50 transition"
          >
            {loading ? 'Creating Order...' : 'Confirm & Create Order'}
          </button>
        </div>
      </form>
    </div>
  );
}