import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api.js';
import OrderStatusBadge from './OrderStatusBadge.jsx';
import RecordPaymentModal from '../payments/RecordPaymentModal.jsx';
import PrintOrderInvoice from './PrintOrderInvoice.jsx';
import { openWhatsApp, getOrderPlacedGreetingMessage, getOrderReadyMessage, getGoogleReviewMessage } from '../../lib/whatsapp.js';
import { useAuth } from '../auth/AuthContext.jsx';

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

  // Fetch linked prescription if order has prescription_id
  useEffect(() => {
    if (order?.prescription_id && order?.customer_id) {
      api.get(`/customers/${order.customer_id}/prescriptions`)
        .then((res) => {
          const found = res.data.data.find((p) => p.id === order.prescription_id);
          if (found) setLinkedPrescription(found);
        })
        .catch((err) => console.error(err));
    }
  }, [order]);

  const fetchOrder = useCallback(async () => {
    try {
      const response = await api.get(`/orders/${id}`);
      setOrder(response.data.data);
    } catch (err) {
      console.error('Order not found:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

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

      // Trigger automatic WhatsApp notifications
      if (order?.customer_phone) {
        const storeName = user?.store?.name || 'Optical Store';
        if (nextStatus === 'PROCESSING') {
          const msg = getOrderPlacedGreetingMessage({
            customerName: order.customer_name,
            storeName,
            orderNumber: order.order_number,
            dueDate: order.due_date,
          });
          openWhatsApp(order.customer_phone, msg);
        } else if (nextStatus === 'READY_FOR_PICKUP') {
          const msg = getOrderReadyMessage({
            customerName: order.customer_name,
            storeName,
            orderNumber: order.order_number,
          });
          openWhatsApp(order.customer_phone, msg);
        } else if (nextStatus === 'DELIVERED') {
          const msg = getGoogleReviewMessage({
            customerName: order.customer_name,
            storeName,
            googleReviewLink: user?.store?.google_review_link,
          });
          openWhatsApp(order.customer_phone, msg);
        }
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Status transition failed');
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading order details...</div>;
  }

  if (!order) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500 font-medium">Order not found in this store</p>
        <button onClick={() => navigate('/orders')} className="mt-4 text-indigo-600 text-sm underline">
          Back to Orders
        </button>
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
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            Print Document
          </button>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm print:shadow-none print:p-0 print:border-none">
          <PrintOrderInvoice order={order} prescription={linkedPrescription} />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate('/orders')}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Orders
      </button>

      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-mono font-bold text-indigo-600">{order.order_number}</h1>
            <OrderStatusBadge status={order.status} />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Order Date: {new Date(order.order_date).toLocaleDateString()} • Due Date:{' '}
            <strong className="text-slate-700">{new Date(order.due_date).toLocaleDateString()}</strong>
          </p>
        </div>

        {/* Action Controls & Print Toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowPrintView(true)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            Print Invoice
          </button>

          {order.status === 'PENDING' && (
            <button
              disabled={updatingStatus}
              onClick={() => handleStatusTransition('PROCESSING')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition flex items-center gap-1.5"
            >
              <Wrench className="w-4 h-4" /> Send to Lab
            </button>
          )}

          {order.status === 'PROCESSING' && (
            <button
              disabled={updatingStatus}
              onClick={() => handleStatusTransition('READY_FOR_PICKUP')}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl shadow-sm transition flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" /> Mark Ready for Pickup
            </button>
          )}

          {order.status === 'READY_FOR_PICKUP' && (
            <button
              disabled={updatingStatus}
              onClick={() => handleStatusTransition('DELIVERED')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition flex items-center gap-1.5"
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
              className="px-3 py-2 text-red-600 hover:bg-red-50 text-xs font-semibold rounded-xl transition"
            >
              Cancel Order
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Customer & Bill Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left 2 Cols: Items & Payments */}
        <div className="md:col-span-2 space-y-6">
          {/* Items */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">Line Items</h3>
            <div className="divide-y divide-slate-100">
              {order.items?.map((item) => (
                <div key={item.id} className="py-3 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 uppercase mr-2">
                      {item.item_type}
                    </span>
                    <span className="font-medium text-slate-800 text-sm">{item.description}</span>
                    <div className="text-xs text-slate-400">Qty: {item.quantity}</div>
                  </div>
                  <div className="font-mono font-bold text-slate-900">
                    ₹{parseFloat(item.total_price).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payments History */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">Payments Collected</h3>
              {order.status !== 'CANCELLED' && order.balance_due > 0 && (
                <button
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-800"
                >
                  <Plus className="w-3.5 h-3.5" /> Record Payment
                </button>
              )}
            </div>

            {order.payments?.length === 0 ? (
              <p className="text-xs text-slate-400">No payments recorded yet</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {order.payments?.map((p) => (
                  <div key={p.id} className="py-2.5 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-semibold text-slate-800 font-mono">₹{parseFloat(p.amount).toLocaleString()}</span>{' '}
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                        {p.payment_method}
                      </span>
                      {p.reference && <span className="text-slate-400 ml-2">Ref: {p.reference}</span>}
                    </div>
                    <div className="text-slate-400">
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
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Customer</h3>
            <div className="space-y-1.5">
              <div className="font-bold text-slate-900">{order.customer_name}</div>
              <div className="text-xs font-mono text-slate-600 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                {order.customer_phone || order.customer_code}
              </div>
              <button
                onClick={() => navigate(`/customers/${order.customer_id}`)}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 pt-1 inline-block"
              >
                View Customer Profile &rarr;
              </button>
            </div>
          </div>

          {/* Balance Due Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Financial Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Total Amount:</span>
                <span className="font-mono font-bold">₹{order.total_amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Paid So Far:</span>
                <span className="font-mono">₹{order.total_paid.toLocaleString()}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-base">
                <span>Balance Due:</span>
                <span className={`font-mono ${order.balance_due > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  ₹{order.balance_due.toLocaleString()}
                </span>
              </div>

              {order.balance_due > 0 && order.status !== 'CANCELLED' && (
                <button
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="w-full mt-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-1"
                >
                  <IndianRupee className="w-3.5 h-3.5" /> Collect Remaining Balance
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* WhatsApp Quick Notification Buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        {order.customer_phone && (
          <>
            {/* Ready for pickup WhatsApp */}
            <button
              onClick={() => {
                const msg = getOrderReadyMessage({
                  customerName: order.customer_name,
                  storeName: user?.store?.name || 'Optical Store',
                  orderNumber: order.order_number,
                });
                openWhatsApp(order.customer_phone, msg);
              }}
              className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-xl border border-emerald-200 transition flex items-center gap-1.5"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
              WhatsApp: Ready for Pickup
            </button>

            {/* Google Review & Feedback WhatsApp */}
            <button
              onClick={() => {
                const msg = getGoogleReviewMessage({
                  customerName: order.customer_name,
                  storeName: user?.store?.name || 'Optical Store',
                  googleReviewLink: user?.store?.google_review_link || 'https://g.page/r/your-shop-review',
                });
                openWhatsApp(order.customer_phone, msg);
              }}
              className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold rounded-xl border border-amber-200 transition flex items-center gap-1.5"
            >
              <Star className="w-3.5 h-3.5 text-amber-600" />
              WhatsApp: Google Rating & Feedback
            </button>
          </>
        )}
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