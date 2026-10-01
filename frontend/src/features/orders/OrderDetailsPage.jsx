import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api.js';
import OrderStatusBadge from './OrderStatusBadge.jsx';
import RecordPaymentModal from '../payments/RecordPaymentModal.jsx';
import PrintOrderInvoice from './PrintOrderInvoice.jsx';
import { sendWhatsApp, getOrderReadyMessage, getGoogleReviewMessage } from '../../lib/whatsapp.js';
import PdfSaveActions from '../../components/common/PdfSaveActions.jsx';
import { prescriptionAvailability } from '../../lib/printPdf.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { SkeletonCard, SkeletonTable } from '../../components/common/Skeleton.jsx';

import { 
  ArrowLeft, 
  Phone, 
  AlertCircle, 
  Wrench, 
  CheckCircle2, 
  Check, 
  IndianRupee,
  Plus,
  Printer,
  FileDown,
  MessageSquare,
  Star
} from 'lucide-react';

export default function OrderDetailsPage() {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPrintView, setShowPrintView] = useState(false);
  const [linkedPrescription, setLinkedPrescription] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const [prescriptionState, setPrescriptionState] = useState('loading');
  const [prescriptionRetry, setPrescriptionRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setLinkedPrescription(null);
    setPrescriptionState(order?.prescription_id ? 'loading' : 'ready');
    if (order?.prescription_id) {
      api.get(`/customers/${order.customer_id}/prescriptions`).then(res => {
        if (!active) return;
        const found = res.data.data.find(p => String(p.id) === String(order.prescription_id));
        setLinkedPrescription(found || null);
        setPrescriptionState(found ? 'ready' : 'missing');
      }).catch(() => { if (active) setPrescriptionState('error'); });
    }
    return () => { active = false; };
  }, [order?.prescription_id, order?.customer_id, prescriptionRetry]);
  const prescriptionBlocked = prescriptionAvailability(order, linkedPrescription, prescriptionState);

  const fetchOrder = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/orders/${id}`);
      setOrder(response.data.data);
    } catch (err) {
      const status = err.response?.status;
      if (status === 404) {
        setError('Order not found in this store.');
      } else {
        setError(err.response?.data?.error?.message || 'Failed to load order. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const handleDownloadBillAndRxPdf = () => setShowPrintView('download');
  const handleShareOnWhatsApp = () => setShowPrintView('share');

  const handleStatusTransition = async (nextStatus) => {
    if (nextStatus === 'DELIVERED' && order.balance_due > 0) {
      setIsPaymentModalOpen(true);
      return;
    }

    setUpdatingStatus(true);
    setError('');
    try {
      await api.patch(`/orders/${id}/status`, { status: nextStatus });
      await fetchOrder();

    } catch (err) {
      setError(err.response?.data?.error?.message || 'Status transition failed');
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <SkeletonCard height="h-6" className="max-w-md" />
        <SkeletonCard height="h-24" />
        <SkeletonTable rows={4} cols={4} />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4">
        <div className="p-6 bg-rose-50 rounded-2xl border border-rose-200 shadow-xs flex flex-col items-center gap-3">
          <AlertCircle className="w-8 h-8 text-rose-500" />
          <p className="text-sm font-semibold text-rose-800">{error || 'Order not found in this store.'}</p>
          <div className="flex gap-3 mt-1">
            <button
              onClick={fetchOrder}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
            >
              Try Again
            </button>
            <button onClick={() => navigate('/orders')} className="px-4 py-2 border border-rose-300 text-rose-700 rounded-xl text-xs font-semibold hover:bg-rose-100 transition">
              Back to Orders
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Dedicated Print / Invoice View
  if (showPrintView) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center print:hidden">
          <button
            onClick={() => setShowPrintView(false)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Order Details
          </button>

        </div>
        <PdfSaveActions key={showPrintView} share={showPrintView === 'share'} phone={order.customer_phone} customerName={order.customer_name} storeName={user?.store?.name} orderNumber={order.order_number} blocked={prescriptionBlocked} onRetry={() => setPrescriptionRetry(n => n + 1)} />
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm print:shadow-none print:p-0 print:border-none">
          {!prescriptionBlocked && <PrintOrderInvoice order={order} prescription={linkedPrescription} hideActions />}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate('/orders')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#66746F] hover:text-[#202D2B] transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Orders
      </button>

      {/* Header Banner */}
      <div className="bg-[#FEFEFC] p-6 rounded-2xl border border-[#E2E7E3] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tabular-nums text-[#28766B]">{order.order_number}</h1>
            <OrderStatusBadge status={order.status} />
          </div>
          <p className="text-xs text-[#66746F] mt-1 tabular-nums">
            Order Date: {new Date(order.order_date).toLocaleDateString()} • Due Date:{' '}
            <strong className="text-[#202D2B]">{new Date(order.due_date).toLocaleDateString()}</strong>
          </p>
        </div>

        {/* Action Controls & Print / PDF Toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Dedicated In-browser Print View / Save PDF */}
          <button
            onClick={() => setShowPrintView(true)}
            className="px-3.5 py-2 bg-[#203A36] hover:bg-[#182C29] text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center gap-1.5"
            title="Open clean, print-ready invoice with 1-click Print or Save as PDF"
          >
            <Printer className="w-4 h-4" />
            Print Invoice / Save as PDF
          </button>

          {/* Download Bill + Rx PDF */}
          <button
            onClick={handleDownloadBillAndRxPdf}
            title="Save the matching print layout as PDF through the print dialog"
            className="px-3 py-2 bg-[#F5F7F3] hover:bg-[#E2E7E3] text-[#202D2B] text-xs font-semibold rounded-xl border border-[#E2E7E3] transition flex items-center gap-1.5"
          >
            <FileDown className="w-4 h-4 text-[#66746F]" />
            {order.prescription_id ? 'Download Bill+Rx PDF' : 'Download Invoice PDF'}
          </button>

          {order.status === 'PENDING' && (
            <button
              disabled={updatingStatus}
              onClick={() => handleStatusTransition('PROCESSING')}
              className="px-4 py-2 bg-[#28766B] hover:bg-[#1E5C53] text-white text-xs font-semibold rounded-xl shadow-sm transition flex items-center gap-1.5"
            >
              <Wrench className="w-4 h-4" /> Send to Lab
            </button>
          )}

          {order.status === 'PROCESSING' && (
            <button
              disabled={updatingStatus}
              onClick={() => handleStatusTransition('READY_FOR_PICKUP')}
              className="px-4 py-2 bg-[#28766B] hover:bg-[#1E5C53] text-white text-xs font-semibold rounded-xl shadow-sm transition flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" /> Mark Ready for Pickup
            </button>
          )}

          {order.status === 'READY_FOR_PICKUP' && (
            <button
              disabled={updatingStatus}
              onClick={() => handleStatusTransition('DELIVERED')}
              className="px-4 py-2 bg-[#28766B] hover:bg-[#1E5C53] text-white text-xs font-semibold rounded-xl shadow-sm transition flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              {order.balance_due > 0 ? 'Collect Balance & Deliver' : 'Mark Delivered'}
            </button>
          )}

          {order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
            <button
              disabled={updatingStatus}
              onClick={() => {
                if (window.confirm('Are you sure you want to cancel this order?')) {
                  handleStatusTransition('CANCELLED');
                }
              }}
              className="px-3 py-2 text-rose-700 hover:bg-rose-50 text-xs font-semibold rounded-xl transition"
            >
              Cancel Order
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-800 text-xs font-medium">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Customer & Bill Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left 2 Cols: Items & Payments */}
        <div className="md:col-span-2 space-y-6">
          {/* Items */}
          <div className="bg-[#FEFEFC] p-6 rounded-2xl border border-[#E2E7E3] shadow-sm space-y-4">
            <h3 className="font-bold text-[#202D2B] text-xs uppercase tracking-wider">Line Items</h3>
            <div className="divide-y divide-[#E2E7E3]">
              {order.items?.map((item) => (
                <div key={item.id} className="py-3 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#F5F7F3] text-[#66746F] border border-[#E2E7E3] uppercase mr-2">
                      {item.item_type}
                    </span>
                    <span className="font-semibold text-[#202D2B] text-xs">{item.description}</span>
                    <div className="text-[11px] text-[#66746F] tabular-nums">Qty: {item.quantity}</div>
                  </div>
                  <div className="tabular-nums font-bold text-xs text-[#202D2B]">
                    ₹{parseFloat(item.total_price).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payments History */}
          <div className="bg-[#FEFEFC] p-6 rounded-2xl border border-[#E2E7E3] shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-[#202D2B] text-xs uppercase tracking-wider">Payments Collected</h3>
              {order.status !== 'CANCELLED' && order.balance_due > 0 && (
                <button
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#28766B] hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" /> Record Payment
                </button>
              )}
            </div>

            {order.payments?.length === 0 ? (
              <p className="text-xs text-[#66746F]">No payments recorded yet</p>
            ) : (
              <div className="divide-y divide-[#E2E7E3]">
                {order.payments?.map((p) => (
                  <div key={p.id} className="py-2.5 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-[#202D2B] tabular-nums">₹{parseFloat(p.amount).toLocaleString()}</span>{' '}
                      <span className="px-2 py-0.5 rounded-full bg-[#F5F7F3] text-[#28766B] font-semibold text-[11px] border border-[#E2E7E3]">
                        {p.payment_method}
                      </span>
                      {p.reference && <span className="text-[#66746F] ml-2">Ref: {p.reference}</span>}
                    </div>
                    <div className="text-[#66746F] tabular-nums">
                      {new Date(p.paid_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Customer & Financial Summary */}
        <div className="space-y-6">
          {/* Customer Card */}
          <div className="bg-[#FEFEFC] p-6 rounded-2xl border border-[#E2E7E3] shadow-sm space-y-3">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#66746F]">Customer</h3>
            <div className="space-y-1.5">
              <div className="font-bold text-[#202D2B] text-sm">{order.customer_name}</div>
              <div className="text-xs tabular-nums text-[#66746F] flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-[#28766B]" />
                {order.customer_phone || order.customer_code}
              </div>
              <button
                onClick={() => navigate(`/customers/${order.customer_id}`)}
                className="text-xs font-semibold text-[#28766B] hover:underline pt-1 inline-block"
              >
                View Customer Profile &rarr;
              </button>
            </div>
          </div>

          {/* Balance Due Card */}
          <div className="bg-[#FEFEFC] p-6 rounded-2xl border border-[#E2E7E3] shadow-sm space-y-3">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#66746F]">Financial Summary</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-[#66746F]">
                <span>Total Amount:</span>
                <span className="tabular-nums font-bold text-[#202D2B]">₹{order.total_amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Paid So Far:</span>
                <span className="tabular-nums">₹{order.total_paid.toLocaleString()}</span>
              </div>
              <div className="pt-2 border-t border-[#E2E7E3] flex justify-between font-bold text-sm">
                <span>Balance Due:</span>
                <span className={`tabular-nums ${order.balance_due > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                  ₹{order.balance_due.toLocaleString()}
                </span>
              </div>

              {order.balance_due > 0 && order.status !== 'CANCELLED' && (
                <button
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="w-full mt-3 py-2 bg-[#28766B] hover:bg-[#1E5C53] text-white font-semibold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-1"
                >
                  <IndianRupee className="w-3.5 h-3.5" /> Collect Remaining Balance
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* WhatsApp Quick Notification & PDF Sharing Buttons */}
      <div className="bg-[#FEFEFC] p-4 rounded-2xl border border-[#E2E7E3] shadow-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#202D2B] flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4 text-[#28766B]" />
            WhatsApp Actions & PDF Sharing
          </span>
          <span className="text-[11px] text-[#66746F]">
            Save PDF, then manually attach in WhatsApp
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap pt-1">
          {order.customer_phone ? (
            <>
              <button onClick={handleShareOnWhatsApp} className="px-3 py-2 rounded-xl border text-xs font-semibold" title="Use Save as PDF, then manually attach the file in WhatsApp">
                <FileDown className="w-3.5 h-3.5 inline mr-1" /> Save PDF + Open WhatsApp Draft
              </button>

              {/* Ready for pickup WhatsApp */}
              <button
                onClick={() => {
                  const msg = getOrderReadyMessage({
                    customerName: order.customer_name,
                    storeName: user?.store?.name || 'Optical Store',
                    orderNumber: order.order_number,
                  });
                  sendWhatsApp({ phone: order.customer_phone, message: msg, label: 'Order Ready for Pickup', customerId: order.customer_id, messageType: 'ORDER_READY' });
                }}
                className="px-3.5 py-2 bg-[#FEFEFC] hover:bg-[#F5F7F3] text-[#28766B] text-xs font-semibold rounded-xl border border-[#E2E7E3] shadow-xs transition flex items-center gap-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5 text-[#28766B]" />
                Send: Ready for Pickup
              </button>

              {/* Google Review & Feedback WhatsApp */}
              <button
                onClick={() => {
                  const reviewLink = user?.store?.googleReviewLink || user?.store?.google_review_link || 'https://g.page/r/your-shop-review';
                  const msg = getGoogleReviewMessage({
                    customerName: order.customer_name,
                    storeName: user?.store?.name || 'Optical Store',
                    googleReviewLink: reviewLink,
                  });
                  sendWhatsApp({ phone: order.customer_phone, message: msg, label: 'Google Review Request', customerId: order.customer_id, messageType: 'GOOGLE_REVIEW' });
                }}
                className="px-3.5 py-2 bg-[#FEFEFC] hover:bg-[#F5F7F3] text-amber-700 text-xs font-semibold rounded-xl border border-[#E2E7E3] shadow-xs transition flex items-center gap-1.5"
              >
                <Star className="w-3.5 h-3.5 text-amber-600" />
                Send: Google Review Link
              </button>
            </>
          ) : (
            <span className="text-xs text-[#66746F] italic">Customer phone number not available for WhatsApp.</span>
          )}
        </div>
      </div>

      {/* Record Payment Modal */}
      <RecordPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        orderId={order.id}
        orderNumber={order.order_number}
        balanceDue={order.balance_due}
        isReadyForPickup={order.status === 'READY_FOR_PICKUP'}
        onPaymentRecorded={fetchOrder}
      />
    </div>
  );
}