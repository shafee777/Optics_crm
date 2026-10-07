import { calculateBilling } from '../../../../shared/billing.mjs';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api.js';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Plus,
  Trash2,
  ShoppingBag,
  AlertCircle,
  Search,
  User,
  UserCheck,
  Eye,
  FileText,
  Copy,
  SkipForward,
  Edit2,
  Phone,
  Zap,
  Printer,
  RotateCcw,
  Clock,
  Sparkles,
} from 'lucide-react';

// ─── Power helpers ──────────────────────────────────────────────────────────
const formatPower = (val) => {
  if (val === '' || val === null || val === undefined || isNaN(val)) return '';
  const num = parseFloat(val);
  if (num === 0) return '0.00';
  return (num > 0 ? '+' : '') + num.toFixed(2);
};

function PowerInput({ label, name, value, onChange, placeholder, step = 0.25, min, max, allowSign = true }) {
  const handleStep = (delta) => {
    const current = parseFloat(value) || 0;
    const next = current + delta;
    if (min !== undefined && next < min) return;
    if (max !== undefined && next > max) return;
    onChange({ target: { name, value: next.toFixed(2) } });
  };

  const handleToggleSign = () => {
    if (!value || parseFloat(value) === 0) return;
    onChange({ target: { name, value: (-parseFloat(value)).toFixed(2) } });
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px] font-semibold text-[#202D2B]">
        <span>{label}</span>
        {allowSign && value && parseFloat(value) !== 0 && (
          <button
            type="button"
            onClick={handleToggleSign}
            className="text-[10px] tabular-nums px-1.5 py-0.5 rounded-lg bg-[#E2E7E3] hover:bg-[#D5DDD6] text-[#202D2B] transition"
            title="Toggle Positive/Negative"
          >
            ± Sign
          </button>
        )}
      </div>
      <div className="flex items-center rounded-xl border border-[#E2E7E3] bg-white focus-within:ring-2 focus-within:ring-[#28766B]/30 focus-within:border-[#28766B] overflow-hidden shadow-xs">
        <button
          type="button"
          onClick={() => handleStep(-step)}
          className="px-2.5 py-2 text-[#66746F] hover:text-[#202D2B] hover:bg-[#F5F7F3] font-bold text-xs select-none transition"
        >
          -
        </button>
        <input
          type="number"
          step={step}
          name={name}
          min={min}
          max={max}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className="w-full text-center py-1.5 text-xs font-bold tabular-nums text-[#202D2B] focus:outline-none bg-transparent"
        />
        <button
          type="button"
          onClick={() => handleStep(step)}
          className="px-2.5 py-2 text-[#66746F] hover:text-[#202D2B] hover:bg-[#F5F7F3] font-bold text-xs select-none transition"
        >
          +
        </button>
      </div>
    </div>
  );
}

export default function QuickAddCustomerPage() {
  const navigate = useNavigate();

  // Section Refs for smooth scrolling
  const customerSectionRef = useRef(null);
  const prescriptionSectionRef = useRef(null);
  const orderSectionRef = useRef(null);
  const reviewSectionRef = useRef(null);

  // Active step tracker: 'customer' | 'prescription' | 'order' | 'review' | 'success'
  const [activeStep, setActiveStep] = useState('customer');

  // Confirmation flags for each continuous vertical block
  const [isCustomerConfirmed, setIsCustomerConfirmed] = useState(false);
  const [isPrescriptionConfirmed, setIsPrescriptionConfirmed] = useState(false);
  const [isPrescriptionSkipped, setIsPrescriptionSkipped] = useState(false);
  const [isOrderConfirmed, setIsOrderConfirmed] = useState(false);

  // Final submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [createdResult, setCreatedResult] = useState(null);

  // Stored IDs for idempotent safe retries
  const [persistedCustomerId, setPersistedCustomerId] = useState(null);
  const [persistedPrescriptionId, setPersistedPrescriptionId] = useState(null);

  // ──────────────────────────────────────────────────────────────────────────
  // 1. CUSTOMER STATE & DUPLICATE PHONE DETECTION
  // ──────────────────────────────────────────────────────────────────────────
  const [customerForm, setCustomerForm] = useState({
    customerCode: '',
    fullName: '',
    phone: '',
    email: '',
    gender: 'Male',
    age: '',
    address: '',
    notes: '',
  });

  const [existingMatch, setExistingMatch] = useState(null);
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);
  const [selectedExistingCustomer, setSelectedExistingCustomer] = useState(null);
  const [customerError, setCustomerError] = useState('');

  // Fetch initial next-code on load
  useEffect(() => {
    api.get('/customers/next-code')
      .then((res) => {
        if (res.data?.data?.nextCode) {
          setCustomerForm((prev) => ({
            ...prev,
            customerCode: prev.customerCode || res.data.data.nextCode,
          }));
        }
      })
      .catch(() => {});
  }, []);

  // Real-time phone duplicate lookup
  useEffect(() => {
    const rawDigits = customerForm.phone.replace(/\D/g, '');
    if (selectedExistingCustomer) return;

    if (rawDigits.length === 10) {
      setIsCheckingPhone(true);
      const timer = setTimeout(() => {
        api.get('/customers', { params: { search: rawDigits, limit: 5 } })
          .then((res) => {
            const list = res.data?.data || [];
            const match = list.find((c) => c.phone && c.phone.replace(/\D/g, '') === rawDigits);
            setExistingMatch(match || null);
          })
          .catch(() => setExistingMatch(null))
          .finally(() => setIsCheckingPhone(false));
      }, 250);
      return () => clearTimeout(timer);
    } else {
      setExistingMatch(null);
      setIsCheckingPhone(false);
    }
  }, [customerForm.phone, selectedExistingCustomer]);

  const handleCustomerChange = (e) => {
    const { name, value } = e.target;
    if (name === 'phone') {
      const digitsOnly = value.replace(/\D/g, '').slice(0, 10);
      setCustomerForm((prev) => ({ ...prev, phone: digitsOnly }));
      return;
    }
    setCustomerForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleUseExistingCustomer = (existing) => {
    setSelectedExistingCustomer(existing);
    setPersistedCustomerId(existing.id);
    setExistingMatch(null);
    setCustomerError('');
    setCustomerForm({
      customerCode: existing.customer_code || '',
      fullName: existing.full_name || '',
      phone: existing.phone || '',
      email: existing.email || '',
      gender: existing.gender || 'Male',
      age: existing.age ? String(existing.age) : '',
      address: existing.address || '',
      notes: existing.notes || '',
    });
    setIsCustomerConfirmed(true);
    setActiveStep('prescription');
    setTimeout(() => {
      prescriptionSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleConfirmCustomer = (e) => {
    e.preventDefault();
    setCustomerError('');

    if (!customerForm.fullName.trim() || customerForm.fullName.trim().length < 2) {
      setCustomerError('Customer full name must be at least 2 characters.');
      return;
    }
    if (customerForm.phone && customerForm.phone.length !== 10) {
      setCustomerError('Mobile number must contain exactly 10 digits.');
      return;
    }

    setIsCustomerConfirmed(true);
    setActiveStep('prescription');
    setTimeout(() => {
      prescriptionSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleEditCustomer = () => {
    setIsCustomerConfirmed(false);
    setActiveStep('customer');
    setTimeout(() => {
      customerSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 2. PRESCRIPTION STATE
  // ──────────────────────────────────────────────────────────────────────────
  const [rxData, setRxData] = useState({
    rSph: '', rCyl: '', rAxis: '', rAdd: '',
    lSph: '', lCyl: '', lAxis: '', lAdd: '',
    pd: '63.0', notes: '',
  });
  const [copySuccess, setCopySuccess] = useState(false);
  const [prescriptionError, setPrescriptionError] = useState('');

  const handleRxChange = (e) => {
    setRxData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCopyRightToLeft = () => {
    setRxData((prev) => ({
      ...prev,
      lSph: prev.rSph,
      lCyl: prev.rCyl,
      lAxis: prev.rAxis,
      lAdd: prev.rAdd,
    }));
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 1800);
  };

  const handleSetPlano = () => {
    setRxData((prev) => ({
      ...prev,
      rSph: '0.00', rCyl: '0.00', rAxis: '',
      lSph: '0.00', lCyl: '0.00', lAxis: '',
    }));
  };

  const handleConfirmPrescription = () => {
    setPrescriptionError('');

    // Validate axis range if entered
    if (rxData.rAxis !== '' && (parseInt(rxData.rAxis, 10) < 0 || parseInt(rxData.rAxis, 10) > 180)) {
      setPrescriptionError('Right Eye (OD) Axis must be between 0 and 180 degrees.');
      return;
    }
    if (rxData.lAxis !== '' && (parseInt(rxData.lAxis, 10) < 0 || parseInt(rxData.lAxis, 10) > 180)) {
      setPrescriptionError('Left Eye (OS) Axis must be between 0 and 180 degrees.');
      return;
    }

    setIsPrescriptionConfirmed(true);
    setIsPrescriptionSkipped(false);
    setActiveStep('order');
    setTimeout(() => {
      orderSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleSkipPrescription = () => {
    setPrescriptionError('');
    setIsPrescriptionConfirmed(true);
    setIsPrescriptionSkipped(true);
    setActiveStep('order');
    setTimeout(() => {
      orderSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleEditPrescription = () => {
    setIsPrescriptionConfirmed(false);
    setActiveStep('prescription');
    setTimeout(() => {
      prescriptionSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const formatEyeNotation = (sph, cyl, axis, add) => {
    const s = formatPower(sph) || '0.00';
    const c = formatPower(cyl);
    const ax = axis ? `× ${axis}°` : '';
    const ad = formatPower(add) ? ` | Add ${formatPower(add)}` : '';
    let res = `${s} DS`;
    if (c && c !== '0.00') res += ` / ${c} DC ${ax}`;
    res += ad;
    return res;
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 3. ORDER & BILLING STATE
  // ──────────────────────────────────────────────────────────────────────────
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

  const [stockProducts, setStockProducts] = useState([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(null);

  useEffect(() => {
    api.get('/products?limit=200')
      .then((res) => setStockProducts(res.data?.data || []))
      .catch(() => {});
  }, []);

  const [orderState, setOrderState] = useState({
    isGstBill: true,
    items: [
      { productId: null, itemType: 'FRAME', description: '', quantity: 1, unitPrice: '', discount: 0, hsnCode: '9004', gstRate: 12 },
      { productId: null, itemType: 'LENS', description: '', quantity: 1, unitPrice: '', discount: 0, hsnCode: '9001', gstRate: 18 },
    ],
    dueDate: () => {
      const d = new Date();
      d.setDate(d.getDate() + 3);
      return d.toISOString().split('T')[0];
    },
    orderDiscount: 0,
    notes: '',
    advanceAmount: '',
    paymentMethod: 'UPI',
    paymentRef: '',
  });

  const [orderError, setOrderError] = useState('');

  // Normalize dueDate
  useEffect(() => {
    if (typeof orderState.dueDate === 'function') {
      setOrderState((prev) => ({ ...prev, dueDate: prev.dueDate() }));
    }
  }, []);

  const {
    isGstBill,
    items,
    dueDate,
    orderDiscount,
    notes,
    advanceAmount,
    paymentMethod,
    paymentRef,
  } = orderState;

  let billing, billingError = '';
  try {
    billing = calculateBilling(items, orderDiscount, isGstBill);
  } catch (e) {
    billingError = e.message;
  }
  const {
    subtotal = 0,
    totalTaxableValue: totalTaxable = 0,
    totalCgst = 0,
    totalSgst = 0,
    totalAmount: grandTotal = 0,
  } = billing || {};

  const handleItemDescriptionChange = (index, text) => {
    const updated = [...items];
    updated[index].description = text;
    updated[index].productId = null;
    setOrderState((prev) => ({ ...prev, items: updated }));
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
    setOrderState((prev) => ({ ...prev, items: updated }));
    setActiveSuggestionIndex(null);
  };

  const addOrderItem = () => {
    const defaults = getDefaultGstAndHsn('ACCESSORY');
    setOrderState((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { productId: null, itemType: 'ACCESSORY', description: '', quantity: 1, unitPrice: '', discount: 0, hsnCode: defaults.hsnCode, gstRate: defaults.gstRate },
      ],
    }));
  };

  const removeOrderItem = (index) => {
    if (items.length > 1) {
      setOrderState((prev) => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index),
      }));
    }
  };

  const handleConfirmOrder = () => {
    setOrderError('');

    if (billingError) {
      setOrderError(billingError);
      return;
    }
    if (items.some((i) => !i.description || !i.unitPrice || parseFloat(i.unitPrice) <= 0)) {
      setOrderError('Please provide item descriptions and valid selling prices for all order lines.');
      return;
    }
    if (!dueDate) {
      setOrderError('Please select an expected delivery due date.');
      return;
    }

    setIsOrderConfirmed(true);
    setActiveStep('review');
    setTimeout(() => {
      reviewSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleEditOrder = () => {
    setIsOrderConfirmed(false);
    setActiveStep('order');
    setTimeout(() => {
      orderSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 4. FINAL SAFE SUBMISSION HANDLER
  // ──────────────────────────────────────────────────────────────────────────
  const handleFinalSubmit = async () => {
    if (isSubmitting) return; // Prevent duplicate clicks
    setSubmitError('');
    setIsSubmitting(true);

    try {
      let finalCustomerId = selectedExistingCustomer?.id || persistedCustomerId;

      // Step 1: Create customer if not already existing or persisted
      if (!finalCustomerId) {
        const customerPayload = {
          customerCode: customerForm.customerCode?.trim() || null,
          fullName: customerForm.fullName.trim(),
          phone: customerForm.phone || null,
          email: customerForm.email?.trim() || null,
          gender: customerForm.gender || null,
          age: customerForm.age ? parseInt(customerForm.age, 10) : null,
          address: customerForm.address?.trim() || null,
          notes: customerForm.notes?.trim() || null,
        };

        const custRes = await api.post('/customers', customerPayload);
        const newCustomer = custRes.data?.data || custRes.data;
        finalCustomerId = newCustomer.id;
        setPersistedCustomerId(finalCustomerId);
      }

      // Step 2: Create prescription if entered and not already persisted
      let finalPrescriptionId = persistedPrescriptionId;
      const hasRxValues = !isPrescriptionSkipped && ['rSph', 'rCyl', 'rAxis', 'rAdd', 'lSph', 'lCyl', 'lAxis', 'lAdd'].some(
        (k) => rxData[k] !== '' && rxData[k] !== null && rxData[k] !== undefined
      );

      if (hasRxValues && !finalPrescriptionId) {
        const rxPayload = {
          rSph: rxData.rSph !== '' ? parseFloat(rxData.rSph) : null,
          rCyl: rxData.rCyl !== '' ? parseFloat(rxData.rCyl) : null,
          rAxis: rxData.rAxis !== '' ? parseInt(rxData.rAxis, 10) : null,
          rAdd: rxData.rAdd !== '' ? parseFloat(rxData.rAdd) : null,
          lSph: rxData.lSph !== '' ? parseFloat(rxData.lSph) : null,
          lCyl: rxData.lCyl !== '' ? parseFloat(rxData.lCyl) : null,
          lAxis: rxData.lAxis !== '' ? parseInt(rxData.lAxis, 10) : null,
          lAdd: rxData.lAdd !== '' ? parseFloat(rxData.lAdd) : null,
          pd: rxData.pd !== '' ? parseFloat(rxData.pd) : null,
          notes: rxData.notes?.trim() || null,
        };

        const rxRes = await api.post(`/customers/${finalCustomerId}/prescriptions`, rxPayload);
        const newRx = rxRes.data?.data || rxRes.data;
        finalPrescriptionId = newRx.id;
        setPersistedPrescriptionId(finalPrescriptionId);
      }

      // Step 3: Create Order
      const orderPayload = {
        customerId: finalCustomerId,
        prescriptionId: finalPrescriptionId || null,
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
        notes: notes?.trim() || null,
        advancePayment: advanceAmount && parseFloat(advanceAmount) > 0
          ? {
              amount: parseFloat(advanceAmount),
              paymentMethod,
              reference: paymentRef?.trim() || null,
            }
          : null,
      };

      const orderRes = await api.post('/orders', orderPayload);
      const createdOrder = orderRes.data?.data || orderRes.data;

      setCreatedResult({
        order: createdOrder,
        customer: selectedExistingCustomer || customerForm,
        prescriptionId: finalPrescriptionId,
      });
      setActiveStep('success');
    } catch (err) {
      console.error('Quick Add submission failed:', err);
      setSubmitError(
        err.response?.data?.error?.message ||
        err.message ||
        'An error occurred while creating the customer record or order. Please check the values and retry.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetFlow = () => {
    setActiveStep('customer');
    setIsCustomerConfirmed(false);
    setIsPrescriptionConfirmed(false);
    setIsPrescriptionSkipped(false);
    setIsOrderConfirmed(false);
    setPersistedCustomerId(null);
    setPersistedPrescriptionId(null);
    setSelectedExistingCustomer(null);
    setExistingMatch(null);
    setSubmitError('');
    setCreatedResult(null);

    const d = new Date();
    d.setDate(d.getDate() + 3);

    setCustomerForm({
      customerCode: '',
      fullName: '',
      phone: '',
      email: '',
      gender: 'Male',
      age: '',
      address: '',
      notes: '',
    });
    setRxData({
      rSph: '', rCyl: '', rAxis: '', rAdd: '',
      lSph: '', lCyl: '', lAxis: '', lAdd: '',
      pd: '63.0', notes: '',
    });
    setOrderState({
      isGstBill: true,
      items: [
        { productId: null, itemType: 'FRAME', description: '', quantity: 1, unitPrice: '', discount: 0, hsnCode: '9004', gstRate: 12 },
        { productId: null, itemType: 'LENS', description: '', quantity: 1, unitPrice: '', discount: 0, hsnCode: '9001', gstRate: 18 },
      ],
      dueDate: d.toISOString().split('T')[0],
      orderDiscount: 0,
      notes: '',
      advanceAmount: '',
      paymentMethod: 'UPI',
      paymentRef: '',
    });

    api.get('/customers/next-code')
      .then((res) => {
        if (res.data?.data?.nextCode) {
          setCustomerForm((prev) => ({ ...prev, customerCode: res.data.data.nextCode }));
        }
      })
      .catch(() => {});

    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
  };

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER SUCCESS VIEW
  // ──────────────────────────────────────────────────────────────────────────
  if (activeStep === 'success' && createdResult) {
    const { order, customer } = createdResult;
    return (
      <div className="max-w-3xl mx-auto space-y-6 py-6 animate-in fade-in duration-200">
        <div className="bg-[#FEFEFC] rounded-3xl border border-[#E2E7E3] p-8 shadow-sm text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 border-2 border-emerald-500/30 flex items-center justify-center text-emerald-600 mx-auto shadow-xs">
            <Check className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold text-[#202D2B]">Customer Registration & Order Complete!</h1>
            <p className="text-xs text-[#66746F]">
              Successfully created order <span className="font-bold text-[#28766B]">{order.order_number}</span> for{' '}
              <strong>{customer.fullName || customer.full_name}</strong> (#{customer.customerCode || customer.customer_code || 'ID'}).
            </p>
          </div>

          <div className="p-4 bg-[#F5F7F3] rounded-2xl border border-[#E2E7E3] max-w-md mx-auto grid grid-cols-2 gap-3 text-left text-xs">
            <div>
              <span className="text-[#66746F] block text-[11px]">Customer:</span>
              <strong className="text-[#202D2B]">{customer.fullName || customer.full_name}</strong>
              <div className="text-[10px] text-[#66746F]">{customer.phone || 'No phone'}</div>
            </div>
            <div>
              <span className="text-[#66746F] block text-[11px]">Order Total:</span>
              <strong className="text-[#28766B] font-bold text-sm">
                ₹{parseFloat(order.total_amount || grandTotal).toLocaleString()}
              </strong>
              <div className="text-[10px] text-[#66746F]">Status: {order.status}</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleResetFlow}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#E2E7E3] text-xs font-semibold text-[#66746F] hover:bg-[#F5F7F3] transition"
            >
              <RotateCcw className="w-4 h-4" />
              Quick Add Another Customer
            </button>
            <button
              type="button"
              onClick={() => navigate(`/orders/${order.id}`)}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#28766B] hover:bg-[#1E5C53] text-white rounded-xl text-xs font-semibold shadow-sm transition"
            >
              <FileText className="w-4 h-4" />
              View Order Details & Print Bill
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // MAIN SINGLE-PAGE CONTINUOUS WORKFLOW
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#66746F] hover:text-[#202D2B] transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
        <div className="flex items-center gap-2 text-xs text-[#28766B] bg-[#EBF3F1] px-3 py-1 rounded-full border border-[#28766B]/20 font-medium">
          <Sparkles className="w-3.5 h-3.5" />
          Single-Page Continuous Registration & Order Workflow
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-[#28766B] text-white flex items-center justify-center shadow-sm">
          <Zap className="w-6 h-6 text-emerald-300" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#202D2B]">Quick Add Customer</h1>
          <p className="text-xs text-[#66746F]">
            Fast customer intake, eye power refraction, and order creation in one seamless page
          </p>
        </div>
      </div>

      {/* Sticky Progress Stepper */}
      <div className="sticky top-16 z-30 bg-[#FEFEFC]/95 backdrop-blur-md p-3.5 rounded-2xl border border-[#E2E7E3] shadow-xs">
        <div className="flex items-center justify-between text-xs">
          {/* Step 1 */}
          <button
            type="button"
            onClick={() => {
              if (isCustomerConfirmed) handleEditCustomer();
            }}
            className={`flex items-center gap-2 font-semibold transition ${
              isCustomerConfirmed
                ? 'text-emerald-700 cursor-pointer'
                : activeStep === 'customer'
                ? 'text-[#28766B]'
                : 'text-[#9AA8A3]'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                isCustomerConfirmed
                  ? 'bg-emerald-600 text-white'
                  : activeStep === 'customer'
                  ? 'bg-[#28766B] text-white'
                  : 'bg-[#F5F7F3] text-[#9AA8A3] border border-[#E2E7E3]'
              }`}
            >
              {isCustomerConfirmed ? <Check className="w-3.5 h-3.5" /> : '1'}
            </div>
            <span className="hidden sm:inline">1. Customer</span>
          </button>

          <div className={`h-0.5 w-8 sm:w-16 ${isCustomerConfirmed ? 'bg-emerald-500' : 'bg-[#E2E7E3]'}`} />

          {/* Step 2 */}
          <button
            type="button"
            onClick={() => {
              if (isPrescriptionConfirmed) handleEditPrescription();
            }}
            disabled={!isCustomerConfirmed}
            className={`flex items-center gap-2 font-semibold transition ${
              isPrescriptionConfirmed
                ? 'text-emerald-700 cursor-pointer'
                : activeStep === 'prescription'
                ? 'text-[#28766B]'
                : 'text-[#9AA8A3] cursor-not-allowed'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                isPrescriptionConfirmed
                  ? 'bg-emerald-600 text-white'
                  : activeStep === 'prescription'
                  ? 'bg-[#28766B] text-white'
                  : 'bg-[#F5F7F3] text-[#9AA8A3] border border-[#E2E7E3]'
              }`}
            >
              {isPrescriptionConfirmed ? <Check className="w-3.5 h-3.5" /> : '2'}
            </div>
            <span className="hidden sm:inline">2. Prescription</span>
          </button>

          <div className={`h-0.5 w-8 sm:w-16 ${isPrescriptionConfirmed ? 'bg-emerald-500' : 'bg-[#E2E7E3]'}`} />

          {/* Step 3 */}
          <button
            type="button"
            onClick={() => {
              if (isOrderConfirmed) handleEditOrder();
            }}
            disabled={!isPrescriptionConfirmed}
            className={`flex items-center gap-2 font-semibold transition ${
              isOrderConfirmed
                ? 'text-emerald-700 cursor-pointer'
                : activeStep === 'order'
                ? 'text-[#28766B]'
                : 'text-[#9AA8A3] cursor-not-allowed'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                isOrderConfirmed
                  ? 'bg-emerald-600 text-white'
                  : activeStep === 'order'
                  ? 'bg-[#28766B] text-white'
                  : 'bg-[#F5F7F3] text-[#9AA8A3] border border-[#E2E7E3]'
              }`}
            >
              {isOrderConfirmed ? <Check className="w-3.5 h-3.5" /> : '3'}
            </div>
            <span className="hidden sm:inline">3. Order</span>
          </button>

          <div className={`h-0.5 w-8 sm:w-16 ${isOrderConfirmed ? 'bg-emerald-500' : 'bg-[#E2E7E3]'}`} />

          {/* Step 4 */}
          <div
            className={`flex items-center gap-2 font-semibold ${
              activeStep === 'review' ? 'text-[#28766B]' : 'text-[#9AA8A3]'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                activeStep === 'review'
                  ? 'bg-[#28766B] text-white'
                  : 'bg-[#F5F7F3] text-[#9AA8A3] border border-[#E2E7E3]'
              }`}
            >
              4
            </div>
            <span className="hidden sm:inline">4. Review & Save</span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SECTION 1: CUSTOMER DETAILS                                         */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section
        ref={customerSectionRef}
        className={`bg-[#FEFEFC] rounded-3xl border transition-all duration-200 overflow-hidden ${
          isCustomerConfirmed
            ? 'border-emerald-300 bg-emerald-50/20 shadow-xs'
            : activeStep === 'customer'
            ? 'border-[#28766B] shadow-md ring-2 ring-[#28766B]/10'
            : 'border-[#E2E7E3] shadow-xs'
        }`}
      >
        <div className="p-6 space-y-5">
          {/* Section Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E7E3]">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  isCustomerConfirmed
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[#28766B] text-white'
                }`}
              >
                {isCustomerConfirmed ? <Check className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>
              <div>
                <h2 className="font-bold text-[#202D2B] text-base flex items-center gap-2">
                  Customer Details
                  {isCustomerConfirmed && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                      ✓ Confirmed
                    </span>
                  )}
                </h2>
                <p className="text-xs text-[#66746F]">
                  {isCustomerConfirmed
                    ? 'Customer information locked for this transaction'
                    : 'Enter customer contact details; duplicate phone numbers will be automatically detected'}
                </p>
              </div>
            </div>

            {isCustomerConfirmed && (
              <button
                type="button"
                onClick={handleEditCustomer}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#C4D0CC] bg-white text-xs font-semibold text-[#28766B] hover:bg-[#EBF3F1] transition shadow-2xs"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Change / Edit
              </button>
            )}
          </div>

          {/* CONFIRMED SUMMARY CARD */}
          {isCustomerConfirmed ? (
            <div className="p-4 bg-white rounded-2xl border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                  {customerForm.fullName?.charAt(0) || 'C'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#202D2B] text-sm">{customerForm.fullName}</span>
                    <span className="text-[10px] font-bold text-[#28766B] bg-[#EBF3F1] px-2 py-0.5 rounded-full border border-[#28766B]/20">
                      {customerForm.customerCode || 'ID'}
                    </span>
                    {selectedExistingCustomer && (
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                        Existing Customer Record
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#66746F] tabular-nums mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                    <span>Phone: {customerForm.phone || 'N/A'}</span>
                    {customerForm.gender && <span>• {customerForm.gender}</span>}
                    {customerForm.age && <span>• Age: {customerForm.age}</span>}
                    {customerForm.address && <span>• Address: {customerForm.address}</span>}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ACTIVE CUSTOMER FORM */
            <form onSubmit={handleConfirmCustomer} className="space-y-4">
              {customerError && (
                <div role="alert" className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-800 text-xs font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{customerError}</span>
                </div>
              )}

              {/* DUPLICATE EXISTING CUSTOMER DETECTED BANNER */}
              {existingMatch && (
                <div className="p-4 bg-amber-50/90 border-2 border-amber-400 rounded-2xl space-y-3 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      !
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-amber-900 text-sm flex items-center gap-2">
                        Existing Customer Detected
                        <span className="text-[10px] font-bold text-amber-700 bg-white px-2 py-0.5 rounded-full border border-amber-300">
                          {existingMatch.customer_code}
                        </span>
                      </div>
                      <p className="text-xs text-amber-800 mt-0.5">
                        Phone number <strong>{existingMatch.phone}</strong> is already registered to <strong>{existingMatch.full_name}</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => handleUseExistingCustomer(existingMatch)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-semibold shadow-xs transition"
                    >
                      <UserCheck className="w-4 h-4" />
                      Use Existing Customer ({existingMatch.full_name})
                    </button>
                    <button
                      type="button"
                      onClick={() => setExistingMatch(null)}
                      className="px-3 py-2 bg-white hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-semibold border border-amber-300 transition"
                    >
                      Ignore & Register as Separate
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Mobile Phone with live duplicate check */}
                <div>
                  <label className="block text-xs font-semibold text-[#202D2B] mb-1">
                    Mobile Phone Number
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      name="phone"
                      placeholder="10-digit mobile number"
                      value={customerForm.phone}
                      onChange={handleCustomerChange}
                      className="w-full px-3 py-2 rounded-xl border border-[#E2E7E3] text-xs font-bold tabular-nums text-[#202D2B] focus:ring-2 focus:ring-[#28766B]/30 focus:border-[#28766B] focus:outline-none bg-white"
                      autoFocus
                    />
                    {isCheckingPhone && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#66746F] animate-pulse">
                        Checking...
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-[#66746F] mt-1">
                    Enter phone to auto-detect previous customer visits.
                  </p>
                </div>

                {/* Customer Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-[#202D2B] mb-1">
                    Customer Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    name="fullName"
                    placeholder="e.g. Rahul Sharma"
                    value={customerForm.fullName}
                    onChange={handleCustomerChange}
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E7E3] text-xs text-[#202D2B] focus:ring-2 focus:ring-[#28766B]/30 focus:border-[#28766B] focus:outline-none bg-white font-medium"
                  />
                </div>

                {/* Customer Code / ID */}
                <div>
                  <label className="block text-xs font-semibold text-[#202D2B] mb-1">
                    Customer ID / Code
                  </label>
                  <input
                    type="text"
                    name="customerCode"
                    value={customerForm.customerCode}
                    onChange={handleCustomerChange}
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E7E3] text-xs font-mono font-bold text-[#202D2B] focus:ring-2 focus:ring-[#28766B]/30 focus:border-[#28766B] focus:outline-none bg-white uppercase"
                  />
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-xs font-semibold text-[#202D2B] mb-1">
                    Gender
                  </label>
                  <select
                    name="gender"
                    value={customerForm.gender}
                    onChange={handleCustomerChange}
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E7E3] text-xs text-[#202D2B] focus:ring-2 focus:ring-[#28766B]/30 focus:border-[#28766B] focus:outline-none bg-white"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>

                {/* Age */}
                <div>
                  <label className="block text-xs font-semibold text-[#202D2B] mb-1">
                    Age
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="125"
                    name="age"
                    placeholder="e.g. 35"
                    value={customerForm.age}
                    onChange={handleCustomerChange}
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E7E3] text-xs tabular-nums text-[#202D2B] focus:ring-2 focus:ring-[#28766B]/30 focus:border-[#28766B] focus:outline-none bg-white"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-[#202D2B] mb-1">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    name="email"
                    placeholder="e.g. rahul@example.com"
                    value={customerForm.email}
                    onChange={handleCustomerChange}
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E7E3] text-xs text-[#202D2B] focus:ring-2 focus:ring-[#28766B]/30 focus:border-[#28766B] focus:outline-none bg-white"
                  />
                </div>
              </div>

              {/* Address & Remarks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#202D2B] mb-1">
                    Street Address / City (Optional)
                  </label>
                  <input
                    type="text"
                    name="address"
                    placeholder="e.g. 14 MG Road, Bengaluru"
                    value={customerForm.address}
                    onChange={handleCustomerChange}
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E7E3] text-xs text-[#202D2B] focus:ring-2 focus:ring-[#28766B]/30 focus:border-[#28766B] focus:outline-none bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#202D2B] mb-1">
                    Customer Notes (Optional)
                  </label>
                  <input
                    type="text"
                    name="notes"
                    placeholder="e.g. Referred by Dr. Rao"
                    value={customerForm.notes}
                    onChange={handleCustomerChange}
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E7E3] text-xs text-[#202D2B] focus:ring-2 focus:ring-[#28766B]/30 focus:border-[#28766B] focus:outline-none bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#28766B] hover:bg-[#1E5C53] text-white rounded-xl text-xs font-semibold shadow-sm transition"
                >
                  Confirm Customer & Continue to Prescription
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SECTION 2: PRESCRIPTION REFRACTION                                  */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section
        ref={prescriptionSectionRef}
        className={`bg-[#FEFEFC] rounded-3xl border transition-all duration-200 overflow-hidden ${
          !isCustomerConfirmed
            ? 'opacity-60 border-[#E2E7E3] pointer-events-none'
            : isPrescriptionConfirmed
            ? 'border-emerald-300 bg-emerald-50/20 shadow-xs'
            : activeStep === 'prescription'
            ? 'border-[#28766B] shadow-md ring-2 ring-[#28766B]/10'
            : 'border-[#E2E7E3] shadow-xs'
        }`}
      >
        <div className="p-6 space-y-5">
          {/* Section Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E7E3]">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  isPrescriptionConfirmed
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[#28766B] text-white'
                }`}
              >
                {isPrescriptionConfirmed ? <Check className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </div>
              <div>
                <h2 className="font-bold text-[#202D2B] text-base flex items-center gap-2">
                  Eye Test Prescription
                  {isPrescriptionConfirmed && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                      {isPrescriptionSkipped ? '✓ Skipped (Non-Rx)' : '✓ Confirmed'}
                    </span>
                  )}
                </h2>
                <p className="text-xs text-[#66746F]">
                  Enter optical refraction powers, or skip if purchase does not require prescription
                </p>
              </div>
            </div>

            {isPrescriptionConfirmed && (
              <button
                type="button"
                onClick={handleEditPrescription}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#C4D0CC] bg-white text-xs font-semibold text-[#28766B] hover:bg-[#EBF3F1] transition shadow-2xs"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Change / Edit
              </button>
            )}
          </div>

          {/* CONFIRMED SUMMARY CARD */}
          {isPrescriptionConfirmed ? (
            <div className="p-4 bg-white rounded-2xl border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {isPrescriptionSkipped ? (
                <div className="text-xs text-[#66746F]">
                  <strong className="text-[#202D2B]">No prescription attached</strong> (ready-made sunglasses, contact lens solution, or frame-only order).
                </div>
              ) : (
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-sky-700">Right (OD):</span>
                    <span className="tabular-nums font-semibold text-[#202D2B]">
                      {formatEyeNotation(rxData.rSph, rxData.rCyl, rxData.rAxis, rxData.rAdd)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-emerald-700">Left (OS):</span>
                    <span className="tabular-nums font-semibold text-[#202D2B]">
                      {formatEyeNotation(rxData.lSph, rxData.lCyl, rxData.lAxis, rxData.lAdd)}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#66746F] pt-1">
                    PD: {rxData.pd ? `${rxData.pd} mm` : 'Not recorded'}{' '}
                    {rxData.notes ? `• Remarks: ${rxData.notes}` : ''}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ACTIVE PRESCRIPTION FORM */
            <div className="space-y-4">
              {prescriptionError && (
                <div role="alert" className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-800 text-xs font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{prescriptionError}</span>
                </div>
              )}

              {/* Fast entry shortcuts bar */}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleSetPlano}
                  className="px-2.5 py-1 rounded-xl bg-[#F5F7F3] hover:bg-[#E2E7E3] text-[#66746F] text-xs font-semibold border border-[#E2E7E3] transition"
                  title="Reset to Plano (0.00)"
                >
                  Plano (0.00)
                </button>
                <button
                  type="button"
                  onClick={handleCopyRightToLeft}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#28766B] hover:bg-[#1E5C53] text-white text-xs font-semibold shadow-xs transition"
                >
                  {copySuccess ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                  {copySuccess ? 'Copied to OS!' : 'Copy OD → OS'}
                </button>
              </div>

              {/* RIGHT EYE */}
              <div className="p-4 rounded-2xl bg-[#F5F7F3] border border-[#E2E7E3] space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-sky-600 ring-4 ring-sky-100" />
                    <span className="font-bold text-[#202D2B] text-xs uppercase tracking-wider">Right Eye (OD - Oculus Dexter)</span>
                  </div>
                  <span className="text-xs font-bold tabular-nums px-2.5 py-0.5 rounded-full bg-white text-[#202D2B] border border-[#E2E7E3]">
                    {formatEyeNotation(rxData.rSph, rxData.rCyl, rxData.rAxis, rxData.rAdd)}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <PowerInput label="SPHERE (SPH)" name="rSph" value={rxData.rSph} onChange={handleRxChange} placeholder="0.00" />
                  <PowerInput label="CYLINDER (CYL)" name="rCyl" value={rxData.rCyl} onChange={handleRxChange} placeholder="0.00" />
                  <PowerInput label="AXIS (0-180°)" name="rAxis" value={rxData.rAxis} onChange={handleRxChange} placeholder="90" step={5} min={0} max={180} allowSign={false} />
                  <PowerInput label="ADD (Near)" name="rAdd" value={rxData.rAdd} onChange={handleRxChange} placeholder="+1.50" step={0.25} min={0.5} max={4.0} allowSign={false} />
                </div>
              </div>

              {/* LEFT EYE */}
              <div className="p-4 rounded-2xl bg-[#F5F7F3] border border-[#E2E7E3] space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-600 ring-4 ring-emerald-100" />
                    <span className="font-bold text-[#202D2B] text-xs uppercase tracking-wider">Left Eye (OS - Oculus Sinister)</span>
                  </div>
                  <span className="text-xs font-bold tabular-nums px-2.5 py-0.5 rounded-full bg-white text-[#202D2B] border border-[#E2E7E3]">
                    {formatEyeNotation(rxData.lSph, rxData.lCyl, rxData.lAxis, rxData.lAdd)}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <PowerInput label="SPHERE (SPH)" name="lSph" value={rxData.lSph} onChange={handleRxChange} placeholder="0.00" />
                  <PowerInput label="CYLINDER (CYL)" name="lCyl" value={rxData.lCyl} onChange={handleRxChange} placeholder="0.00" />
                  <PowerInput label="AXIS (0-180°)" name="lAxis" value={rxData.lAxis} onChange={handleRxChange} placeholder="90" step={5} min={0} max={180} allowSign={false} />
                  <PowerInput label="ADD (Near)" name="lAdd" value={rxData.lAdd} onChange={handleRxChange} placeholder="+1.50" step={0.25} min={0.5} max={4.0} allowSign={false} />
                </div>
              </div>

              {/* PD & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#F5F7F3] p-4 rounded-2xl border border-[#E2E7E3]">
                <div>
                  <label className="block text-xs font-semibold text-[#202D2B] mb-1">PD (Pupillary Distance, mm)</label>
                  <input
                    type="number"
                    step="0.5"
                    name="pd"
                    placeholder="63.0"
                    value={rxData.pd}
                    onChange={handleRxChange}
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E7E3] text-xs font-bold tabular-nums text-[#202D2B] focus:ring-2 focus:ring-[#28766B]/30 focus:border-[#28766B] focus:outline-none bg-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#202D2B] mb-1">Clinical Remarks / Lens Type</label>
                  <input
                    type="text"
                    name="notes"
                    placeholder="e.g. Anti-reflective progressive blue-cut"
                    value={rxData.notes}
                    onChange={handleRxChange}
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E7E3] text-xs text-[#202D2B] placeholder:text-[#9AA8A3] focus:ring-2 focus:ring-[#28766B]/30 focus:border-[#28766B] focus:outline-none bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleSkipPrescription}
                  className="inline-flex items-center gap-1.5 px-4 py-2 border border-[#E2E7E3] text-xs font-semibold text-[#66746F] hover:bg-[#F5F7F3] rounded-xl transition"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                  Skip Prescription (Non-Rx Purchase)
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPrescription}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#28766B] hover:bg-[#1E5C53] text-white rounded-xl text-xs font-semibold shadow-sm transition"
                >
                  Confirm Prescription & Continue to Order
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SECTION 3: ORDER & BILLING                                          */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section
        ref={orderSectionRef}
        className={`bg-[#FEFEFC] rounded-3xl border transition-all duration-200 overflow-hidden ${
          !isPrescriptionConfirmed
            ? 'opacity-60 border-[#E2E7E3] pointer-events-none'
            : isOrderConfirmed
            ? 'border-emerald-300 bg-emerald-50/20 shadow-xs'
            : activeStep === 'order'
            ? 'border-[#28766B] shadow-md ring-2 ring-[#28766B]/10'
            : 'border-[#E2E7E3] shadow-xs'
        }`}
      >
        <div className="p-6 space-y-5">
          {/* Section Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E7E3]">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  isOrderConfirmed
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[#28766B] text-white'
                }`}
              >
                {isOrderConfirmed ? <Check className="w-4 h-4" /> : <ShoppingBag className="w-4 h-4" />}
              </div>
              <div>
                <h2 className="font-bold text-[#202D2B] text-base flex items-center gap-2">
                  Order Details & Billing
                  {isOrderConfirmed && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                      ✓ Confirmed
                    </span>
                  )}
                </h2>
                <p className="text-xs text-[#66746F]">
                  Select catalog frames/lenses or enter custom specs, set advance payment & delivery date
                </p>
              </div>
            </div>

            {isOrderConfirmed && (
              <button
                type="button"
                onClick={handleEditOrder}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#C4D0CC] bg-white text-xs font-semibold text-[#28766B] hover:bg-[#EBF3F1] transition shadow-2xs"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Change / Edit
              </button>
            )}
          </div>

          {/* CONFIRMED SUMMARY CARD */}
          {isOrderConfirmed ? (
            <div className="p-4 bg-white rounded-2xl border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1 text-xs">
                <div className="font-bold text-[#202D2B]">
                  {items.length} Order Item(s) • Grand Total: <span className="text-[#28766B]">₹{grandTotal.toLocaleString()}</span>
                </div>
                <div className="text-[#66746F] flex flex-wrap gap-x-3 text-[11px]">
                  <span>Due: {dueDate}</span>
                  <span>• Advance: ₹{advanceAmount ? parseFloat(advanceAmount).toLocaleString() : '0.00'} ({paymentMethod})</span>
                  <span>• Balance: ₹{(grandTotal - (parseFloat(advanceAmount) || 0)).toLocaleString()}</span>
                </div>
              </div>
            </div>
          ) : (
            /* ACTIVE ORDER FORM */
            <div className="space-y-5">
              {orderError && (
                <div role="alert" className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-800 text-xs font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{orderError}</span>
                </div>
              )}

              {/* Items control bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#E2E7E3]">
                <div className="text-xs font-bold text-[#202D2B]">Line Items Specification</div>
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#202D2B] bg-[#F5F7F3] px-3 py-1.5 rounded-xl border border-[#E2E7E3]">
                    <input
                      type="checkbox"
                      checked={isGstBill}
                      onChange={(e) => setOrderState((prev) => ({ ...prev, isGstBill: e.target.checked }))}
                      className="w-4 h-4 text-[#28766B] rounded focus:ring-[#28766B]"
                    />
                    <span>GST Tax Invoice</span>
                  </label>
                  <button
                    type="button"
                    onClick={addOrderItem}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#28766B] hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Item
                  </button>
                </div>
              </div>

              {/* Items rows */}
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
                    <div key={index} className="p-4 bg-[#F5F7F3] border border-[#E2E7E3] rounded-2xl space-y-3 relative">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                        <div className="md:col-span-2">
                          <label className="block text-[10px] font-bold text-[#66746F] uppercase mb-1">Type</label>
                          <select
                            value={item.itemType}
                            onChange={(e) => {
                              const updated = [...items];
                              const newType = e.target.value;
                              const { hsnCode, gstRate } = getDefaultGstAndHsn(newType);
                              updated[index].itemType = newType;
                              updated[index].hsnCode = hsnCode;
                              updated[index].gstRate = gstRate;
                              setOrderState((prev) => ({ ...prev, items: updated }));
                            }}
                            className="w-full px-2 py-2 rounded-xl border border-[#E2E7E3] text-xs bg-white text-[#202D2B] font-semibold focus:outline-none"
                          >
                            <option value="FRAME">Frame</option>
                            <option value="LENS">Lens</option>
                            <option value="SUNGLASSES">Sunglasses</option>
                            <option value="CONTACT_LENS">Contact Lens</option>
                            <option value="SOLUTION">Solution</option>
                            <option value="ACCESSORY">Accessory</option>
                            <option value="COATING">Coating</option>
                            <option value="SERVICE">Service</option>
                          </select>
                        </div>

                        <div className="md:col-span-4 relative">
                          <label className="block text-[10px] font-bold text-[#66746F] uppercase mb-1">Description / Name</label>
                          <input
                            type="text"
                            required
                            placeholder={`Type ${item.itemType.toLowerCase()} description...`}
                            value={item.description}
                            onFocus={() => setActiveSuggestionIndex(index)}
                            onChange={(e) => handleItemDescriptionChange(index, e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-[#E2E7E3] text-xs text-[#202D2B] bg-white focus:ring-2 focus:ring-[#28766B]/30 focus:border-[#28766B] focus:outline-none"
                          />

                          {activeSuggestionIndex === index && matchedSuggestions.length > 0 && (
                            <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-[#FEFEFC] border border-[#E2E7E3] rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-[#E2E7E3]">
                              <div className="p-1.5 text-[10px] font-bold text-[#66746F] bg-[#F5F7F3] uppercase tracking-wider flex justify-between">
                                <span>Inventory Matches</span>
                                <button type="button" onClick={() => setActiveSuggestionIndex(null)} className="text-[#66746F] hover:text-[#202D2B]">✕</button>
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
                                    {prod.model_code && <div className="text-[10px] text-[#66746F]">Code: {prod.model_code}</div>}
                                  </div>
                                  <div className="text-right">
                                    <div className="tabular-nums font-bold text-[#28766B]">₹{parseFloat(prod.selling_price).toLocaleString()}</div>
                                    <div className="text-[10px] text-[#66746F]">In Stock: {prod.stock_quantity}</div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-[10px] font-bold text-[#66746F] uppercase mb-1">HSN Code</label>
                          <input
                            type="text"
                            placeholder="e.g. 9004"
                            value={item.hsnCode || ''}
                            onChange={(e) => {
                              const u = [...items];
                              u[index].hsnCode = e.target.value;
                              setOrderState((prev) => ({ ...prev, items: u }));
                            }}
                            className="w-full px-2 py-2 rounded-xl border border-[#E2E7E3] text-xs bg-white text-[#202D2B] tabular-nums focus:outline-none uppercase"
                          />
                        </div>

                        {isGstBill && (
                          <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold text-[#66746F] uppercase mb-1">GST Rate</label>
                            <select
                              value={item.gstRate}
                              onChange={(e) => {
                                const u = [...items];
                                u[index].gstRate = e.target.value;
                                setOrderState((prev) => ({ ...prev, items: u }));
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

                        <div className={isGstBill ? 'md:col-span-2' : 'md:col-span-4'}>
                          <label className="block text-[10px] font-bold text-[#66746F] uppercase mb-1">Price (₹)</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              required
                              placeholder="0"
                              value={item.unitPrice}
                              onChange={(e) => {
                                const u = [...items];
                                u[index].unitPrice = e.target.value;
                                setOrderState((prev) => ({ ...prev, items: u }));
                              }}
                              className="w-full px-3 py-2 rounded-xl border border-[#E2E7E3] text-xs bg-white text-[#202D2B] tabular-nums font-bold text-right focus:outline-none"
                            />
                            {items.length > 1 && (
                              <button type="button" onClick={() => removeOrderItem(index)} className="p-1.5 text-[#66746F] hover:text-rose-700 rounded-lg shrink-0">
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

              {/* Pricing breakdown summary */}
              <div className="pt-3 border-t border-[#E2E7E3] flex justify-end">
                <div className="w-80 space-y-2 text-xs bg-[#F5F7F3] p-4 rounded-2xl border border-[#E2E7E3]">
                  <div className="flex justify-between text-[#66746F]">
                    <span>Subtotal (Incl. Taxes):</span>
                    <span className="tabular-nums font-bold text-[#202D2B]">
                      ₹{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  {isGstBill && (
                    <>
                      <div className="flex justify-between text-[#66746F]">
                        <span>Taxable Value:</span>
                        <span className="tabular-nums">
                          ₹{totalTaxable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between text-[#66746F]">
                        <span>CGST + SGST:</span>
                        <span className="tabular-nums">
                          ₹{(totalCgst + totalSgst).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between items-center text-[#66746F] pt-1 border-t border-[#E2E7E3]">
                    <span>Order Discount (₹):</span>
                    <input
                      type="number"
                      value={orderDiscount}
                      onChange={(e) => setOrderState((prev) => ({ ...prev, orderDiscount: e.target.value }))}
                      className="w-24 px-2 py-1 rounded-lg border border-[#E2E7E3] text-right tabular-nums text-xs bg-white text-[#202D2B]"
                    />
                  </div>
                  <div className="flex justify-between font-bold text-sm text-[#202D2B] border-t border-[#E2E7E3] pt-2">
                    <span>Grand Total:</span>
                    <span className="tabular-nums text-[#28766B]">
                      ₹{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Delivery due date & Advance Payment */}
              <div className="p-4 bg-[#F5F7F3] rounded-2xl border border-[#E2E7E3] space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#202D2B] mb-1">Delivery Due Date *</label>
                    <input
                      type="date"
                      required
                      value={dueDate}
                      onChange={(e) => setOrderState((prev) => ({ ...prev, dueDate: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-[#E2E7E3] text-xs text-[#202D2B] bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#202D2B] mb-1">Advance Payment (₹)</label>
                    <input
                      type="number"
                      placeholder="e.g. 1000"
                      value={advanceAmount}
                      onChange={(e) => setOrderState((prev) => ({ ...prev, advanceAmount: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-[#E2E7E3] text-xs tabular-nums text-[#202D2B] bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#202D2B] mb-1">Payment Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setOrderState((prev) => ({ ...prev, paymentMethod: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-[#E2E7E3] text-xs text-[#202D2B] bg-white focus:outline-none"
                    >
                      <option value="UPI">Google Pay / PhonePe (UPI)</option>
                      <option value="CASH">Cash</option>
                      <option value="CARD">Credit / Debit Card</option>
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {paymentMethod !== 'CASH' && (
                    <div>
                      <label className="block text-xs font-semibold text-[#202D2B] mb-1">Payment Reference / Txn ID</label>
                      <input
                        type="text"
                        placeholder="e.g. UPI Ref ID / Cheque"
                        value={paymentRef}
                        onChange={(e) => setOrderState((prev) => ({ ...prev, paymentRef: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl border border-[#E2E7E3] text-xs text-[#202D2B] bg-white focus:outline-none"
                      />
                    </div>
                  )}
                  <div className={paymentMethod === 'CASH' ? 'md:col-span-2' : ''}>
                    <label className="block text-xs font-semibold text-[#202D2B] mb-1">Order Notes (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Customer requested anti-glare cleaning cloth"
                      value={notes}
                      onChange={(e) => setOrderState((prev) => ({ ...prev, notes: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-[#E2E7E3] text-xs text-[#202D2B] bg-white placeholder:text-[#9AA8A3] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleConfirmOrder}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#28766B] hover:bg-[#1E5C53] text-white rounded-xl text-xs font-semibold shadow-sm transition"
                >
                  Confirm Order & Review Summary
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SECTION 4: FINAL REVIEW & SUBMISSION                                */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section
        ref={reviewSectionRef}
        className={`bg-[#FEFEFC] rounded-3xl border transition-all duration-200 overflow-hidden ${
          !isOrderConfirmed
            ? 'opacity-60 border-[#E2E7E3] pointer-events-none'
            : 'border-[#28766B] shadow-lg ring-2 ring-[#28766B]/20'
        }`}
      >
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E7E3]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#28766B] text-white flex items-center justify-center font-bold text-xs">
                4
              </div>
              <div>
                <h2 className="font-bold text-[#202D2B] text-base">Final Review & Complete Submission</h2>
                <p className="text-xs text-[#66746F]">Review customer, eye test, and billing before creating the records</p>
              </div>
            </div>
          </div>

          {submitError && (
            <div role="alert" className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-1 text-rose-900 text-xs font-medium">
              <div className="flex items-center gap-2 font-bold text-rose-800">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                Submission Error
              </div>
              <p>{submitError}</p>
            </div>
          )}

          {/* Review Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Customer Box */}
            <div className="p-4 bg-[#F5F7F3] rounded-2xl border border-[#E2E7E3] space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-[#66746F] uppercase tracking-wider">Customer</span>
                <button
                  type="button"
                  onClick={handleEditCustomer}
                  className="text-[11px] text-[#28766B] font-semibold hover:underline"
                >
                  Edit
                </button>
              </div>
              <div className="font-bold text-[#202D2B] text-sm">{customerForm.fullName || '—'}</div>
              <div className="text-xs text-[#66746F] tabular-nums">
                {customerForm.phone ? `Phone: ${customerForm.phone}` : 'No phone'}
              </div>
              <div className="text-[11px] text-[#66746F]">
                {selectedExistingCustomer ? (
                  <span className="text-purple-700 font-semibold">Existing Customer</span>
                ) : (
                  <span className="text-emerald-700 font-semibold">New Walk-In Customer</span>
                )}
              </div>
            </div>

            {/* Prescription Box */}
            <div className="p-4 bg-[#F5F7F3] rounded-2xl border border-[#E2E7E3] space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-[#66746F] uppercase tracking-wider">Prescription</span>
                <button
                  type="button"
                  onClick={handleEditPrescription}
                  className="text-[11px] text-[#28766B] font-semibold hover:underline"
                >
                  Edit
                </button>
              </div>
              {isPrescriptionSkipped ? (
                <div className="text-xs text-[#66746F] italic">No prescription (Skipped)</div>
              ) : (
                <div className="text-[11px] space-y-1">
                  <div>
                    <strong className="text-sky-700">OD:</strong> {formatEyeNotation(rxData.rSph, rxData.rCyl, rxData.rAxis, rxData.rAdd)}
                  </div>
                  <div>
                    <strong className="text-emerald-700">OS:</strong> {formatEyeNotation(rxData.lSph, rxData.lCyl, rxData.lAxis, rxData.lAdd)}
                  </div>
                  {rxData.pd && <div className="text-[10px] text-[#66746F]">PD: {rxData.pd} mm</div>}
                </div>
              )}
            </div>

            {/* Order Box */}
            <div className="p-4 bg-[#F5F7F3] rounded-2xl border border-[#E2E7E3] space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-[#66746F] uppercase tracking-wider">Order & Billing</span>
                <button
                  type="button"
                  onClick={handleEditOrder}
                  className="text-[11px] text-[#28766B] font-semibold hover:underline"
                >
                  Edit
                </button>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#66746F]">Total Payable:</span>
                <strong className="text-[#28766B] tabular-nums font-bold">₹{grandTotal.toLocaleString()}</strong>
              </div>
              <div className="flex justify-between text-xs text-[#66746F]">
                <span>Advance Paid:</span>
                <span className="tabular-nums">₹{advanceAmount ? parseFloat(advanceAmount).toLocaleString() : '0.00'}</span>
              </div>
              <div className="flex justify-between text-xs text-[#66746F]">
                <span>Balance Due:</span>
                <span className="tabular-nums font-semibold text-rose-700">
                  ₹{(grandTotal - (parseFloat(advanceAmount) || 0)).toLocaleString()}
                </span>
              </div>
              <div className="text-[10px] text-[#66746F]">Due Date: {dueDate}</div>
            </div>
          </div>

          {/* Primary Action Button */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-xs text-[#66746F]">
              Clicking below will create the customer, prescription, and order in one single operation.
            </div>
            <button
              type="button"
              onClick={handleFinalSubmit}
              disabled={isSubmitting || !isOrderConfirmed}
              className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-[#28766B] hover:bg-[#1E5C53] text-white rounded-xl text-sm font-bold shadow-md transition disabled:opacity-50"
            >
              <Zap className="w-4 h-4 text-emerald-300" />
              {isSubmitting
                ? 'Processing Registration & Order...'
                : selectedExistingCustomer
                ? isPrescriptionSkipped
                  ? 'Create Order for Customer'
                  : 'Save Prescription & Create Order'
                : isPrescriptionSkipped
                ? 'Save Customer & Create Order'
                : 'Save Customer, Prescription & Order'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
