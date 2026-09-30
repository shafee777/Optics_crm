import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api.js';
import OpticalGrid from '../prescriptions/OpticalGrid.jsx';
import NewPrescriptionModal from '../prescriptions/NewPrescriptionModal.jsx';
import PrintPrescription from '../prescriptions/PrintPrescription.jsx';
import CustomerFormModal from './CustomerFormModal.jsx';
import OrderStatusBadge from '../orders/OrderStatusBadge.jsx';
import { MessageSquare, UserCheck, Edit2, FileDown, Share2, Printer } from 'lucide-react';
import { sendWhatsApp, sharePdfOnWhatsApp, getRichPrescriptionWhatsAppMessage, getGreetingMessage, getAnnualCheckupMessage } from '../../lib/whatsapp.js';
import { downloadPrescriptionPdf } from '../../lib/pdfGenerator.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { ArrowLeft, Phone, MapPin, Calendar, FileText, ShoppingBag, Hash, PlusCircle, Clock, ArrowRight } from 'lucide-react';

export default function CustomerDetailsPage() {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [messageLogs, setMessageLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
  const [editingPrescription, setEditingPrescription] = useState(null);
  const [printingPrescription, setPrintingPrescription] = useState(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

  const fetchCustomerData = useCallback(async () => {
    if (!id) return;
    try {
      const [custRes, prescRes, ordersRes, logsRes] = await Promise.all([
        api.get(`/customers/${id}`),
        api.get(`/customers/${id}/prescriptions`),
        api.get(`/orders?customerId=${id}`),
        api.get(`/messages/customer/${id}`).catch(() => ({ data: { data: [] } })),
      ]);
      setCustomer(custRes.data.data);
      setPrescriptions(prescRes.data.data);
      setCustomerOrders(ordersRes.data.data);
      setMessageLogs(logsRes.data?.data || []);
    } catch (err) {
      console.error('Error fetching customer data:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCustomerData();
  }, [fetchCustomerData]);

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading customer profile & history...</div>;
  }

  if (!customer) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500 font-medium">Customer not found in this store</p>
        <button onClick={() => navigate('/customers')} className="mt-4 text-indigo-600 text-sm underline">
          Back to Customers
        </button>
      </div>
    );
  }

  // Dedicated Print / Save PDF View for Prescription
  if (printingPrescription) {
    return (
      <PrintPrescription
        prescription={printingPrescription}
        customer={customer}
        onBack={() => setPrintingPrescription(null)}
      />
    );
  }

  const templates = user?.store?.whatsapp_templates || user?.store?.whatsappTemplates;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate('/customers')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#66746F] hover:text-[#202D2B] transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Customers
      </button>

      {/* Customer Header Card */}
      <div className="bg-[#FEFEFC] rounded-2xl p-6 border border-[#E2E7E3] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#F5F7F3] text-[#28766B] font-bold tabular-nums rounded-lg text-xs border border-[#E2E7E3]">
              <Hash className="w-3.5 h-3.5" />
              {customer.customer_code || 'CUST'}
            </span>
            <h1 className="text-xl font-bold text-[#202D2B]">{customer.full_name}</h1>
            <span className="px-2.5 py-0.5 bg-[#F5F7F3] text-[#66746F] text-xs font-semibold rounded-full border border-[#E2E7E3]">
              {customer.gender || 'Customer'}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-[#66746F]">
            {customer.phone && (
              <span className="flex items-center gap-1 tabular-nums font-semibold text-[#202D2B]">
                <Phone className="w-3.5 h-3.5 text-[#28766B]" />
                {customer.phone}
              </span>
            )}
            {customer.age && <span>Age: {customer.age} years</span>}
            {customer.address && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#66746F]" />
                {customer.address}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#66746F]" />
              Registered: {new Date(customer.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsCustomerModalOpen(true)}
            className="px-3.5 py-2 bg-[#FEFEFC] hover:bg-[#F5F7F3] text-[#202D2B] rounded-xl text-xs font-semibold border border-[#E2E7E3] transition flex items-center gap-1.5 shadow-sm"
            title="Edit Customer Information"
          >
            <Edit2 className="w-3.5 h-3.5 text-[#28766B]" />
            Edit Profile
          </button>
          <button
            onClick={() => {
              setEditingPrescription(null);
              setIsPrescriptionModalOpen(true);
            }}
            className="px-3.5 py-2 bg-[#EBF3F1] hover:bg-[#DDEAE7] text-[#28766B] rounded-xl text-xs font-semibold border border-[#28766B]/20 transition flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            New Eye Test
          </button>
          <button
            onClick={() => navigate(`/orders/new?customerId=${id}`)}
            className="px-3.5 py-2 bg-[#28766B] hover:bg-[#1E5C53] text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
          >
            <ShoppingBag className="w-4 h-4" />
            Create Order
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {customer.phone && (
          <>
            <button
              onClick={() => {
                const msg = getGreetingMessage({
                  customerName: customer.full_name,
                  storeName: user?.store?.name || 'Optical Store',
                  customTemplate: templates?.GREETING,
                });
                sendWhatsApp({ phone: customer.phone, message: msg, label: 'Welcome Greeting', customerId: customer.id, messageType: 'GREETING' });
              }}
              className="px-3 py-1.5 bg-[#FEFEFC] hover:bg-[#F5F7F3] text-[#28766B] text-xs font-semibold rounded-xl border border-[#E2E7E3] flex items-center gap-1.5 transition shadow-sm"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Send Welcome Greeting
            </button>
            <button
              onClick={() => {
                const msg = getAnnualCheckupMessage({
                  customerName: customer.full_name,
                  storeName: user?.store?.name || 'Optical Store',
                  lastTestDate: prescriptions[0]?.tested_at,
                  customTemplate: templates?.ANNUAL_CHECKUP,
                });
                sendWhatsApp({ phone: customer.phone, message: msg, label: 'Annual Eye Checkup Recall', customerId: customer.id, messageType: 'ANNUAL_CHECKUP' });
              }}
              className="px-3 py-1.5 bg-[#FEFEFC] hover:bg-[#F5F7F3] text-amber-700 text-xs font-semibold rounded-xl border border-[#E2E7E3] flex items-center gap-1.5 transition shadow-sm"
            >
              <UserCheck className="w-3.5 h-3.5" />
              Send 1-Year Checkup Recall
            </button>
          </>
        )}
      </div>

      {/* Main Grid: Eye Test History & Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Prescription Timeline */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#FEFEFC] p-6 rounded-2xl border border-[#E2E7E3] shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-[#202D2B] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#28766B]" />
                Eye Test & Prescription History ({prescriptions.length})
              </h2>
              <button
                onClick={() => {
                  setEditingPrescription(null);
                  setIsPrescriptionModalOpen(true);
                }}
                className="text-xs font-semibold text-[#28766B] hover:underline"
              >
                + Record Test
              </button>
            </div>

            {prescriptions.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-[#E2E7E3] rounded-xl space-y-1">
                <p className="text-xs font-semibold text-[#202D2B]">No eye tests recorded yet</p>
                <p className="text-xs text-[#66746F]">Click "+ Record Test" to enter the refraction results.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {prescriptions.map((p, index) => (
                  <div
                    key={p.id}
                    className={`p-4 rounded-xl border ${
                      index === 0
                        ? 'bg-[#EBF3F1]/40 border-[#28766B]/30'
                        : 'bg-white border-[#E2E7E3]'
                    } space-y-3`}
                  >
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold uppercase tracking-wider text-[10px] ${
                            index === 0
                              ? 'bg-[#28766B] text-white'
                              : 'bg-[#F5F7F3] text-[#66746F] border border-[#E2E7E3]'
                          }`}
                        >
                          {index === 0 ? 'Current Power' : `Test #${prescriptions.length - index}`}
                        </span>
                        <span className="flex items-center gap-1 text-[#66746F] font-medium">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(p.tested_at).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {p.tested_by_name && (
                          <span className="text-[#66746F]">
                            Tested by: <strong className="text-[#202D2B]">{p.tested_by_name}</strong>
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPrescription(p);
                            setIsPrescriptionModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#28766B] hover:bg-[#EBF3F1] rounded-lg border border-[#28766B]/20 transition"
                          title="Edit this eye test values"
                        >
                          <Edit2 className="w-3 h-3" />
                          Edit Test
                        </button>
                      </div>
                    </div>

                    <OpticalGrid prescription={p} />
                    
                    <div className="pt-2 flex items-center gap-2 flex-wrap">
                      {/* Print Rx / Save as PDF */}
                      <button
                        type="button"
                        onClick={() => setPrintingPrescription(p)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#203A36] hover:bg-[#182C29] text-white text-xs font-semibold rounded-xl shadow-xs transition"
                        title="Open clean, print-ready prescription with 1-click Print or Save as PDF"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Print Rx / Save as PDF
                      </button>

                      {/* Share Prescription via WhatsApp */}
                      {customer.phone && (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#28766B] hover:bg-[#1E5C53] text-white text-xs font-semibold rounded-xl shadow-xs transition"
                          onClick={() => {
                            const msg = getRichPrescriptionWhatsAppMessage({
                              customer,
                              store: user?.store,
                              prescription: p,
                            });
                            sendWhatsApp({
                              phone: customer.phone,
                              message: msg,
                              label: 'Prescription Details',
                              customerId: customer.id,
                              messageType: 'PRESCRIPTION',
                            });
                          }}
                          title="Sends complete prescription refraction powers directly into WhatsApp message"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          Send Rx via WhatsApp
                        </button>
                      )}

                      {/* Download PDF */}
                      <button
                        type="button"
                        onClick={() => {
                          downloadPrescriptionPdf({
                            prescription: p,
                            customer,
                            store: user?.store,
                          });
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F5F7F3] hover:bg-[#E2E7E3] text-[#202D2B] text-xs font-semibold rounded-xl border border-[#E2E7E3] transition"
                        title="Download prescription PDF file"
                      >
                        <FileDown className="w-3.5 h-3.5 text-[#66746F]" />
                        Download PDF
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Column: Customer Orders List */}
        <div className="space-y-6">
          <div className="bg-[#FEFEFC] p-6 rounded-2xl border border-[#E2E7E3] shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-[#202D2B] flex items-center gap-2 text-sm">
                <ShoppingBag className="w-4 h-4 text-[#28766B]" />
                Customer Orders ({customerOrders.length})
              </h3>
              <button
                onClick={() => navigate(`/orders/new?customerId=${id}`)}
                className="text-xs font-semibold text-[#28766B] hover:underline"
              >
                + New
              </button>
            </div>

            {customerOrders.length === 0 ? (
              <p className="text-xs text-[#66746F] py-4 text-center">No orders placed yet.</p>
            ) : (
              <div className="space-y-2">
                {customerOrders.map((ord) => (
                  <div
                    key={ord.id}
                    onClick={() => navigate(`/orders/${ord.id}`)}
                    className="p-3 rounded-xl border border-[#E2E7E3] hover:border-[#28766B]/40 hover:bg-[#F5F7F3] cursor-pointer transition flex justify-between items-center"
                  >
                    <div>
                      <div className="tabular-nums font-bold text-xs text-[#28766B]">{ord.order_number}</div>
                      <div className="text-[11px] text-[#66746F] tabular-nums">{new Date(ord.order_date).toLocaleDateString()}</div>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <div>
                        <div className="tabular-nums font-bold text-xs text-[#202D2B]">₹{ord.total_amount.toLocaleString()}</div>
                        <OrderStatusBadge status={ord.status} />
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-[#66746F]" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* WhatsApp Message Log Timeline */}
          <div className="bg-[#FEFEFC] p-6 rounded-2xl border border-[#E2E7E3] shadow-sm space-y-3">
            <h3 className="font-bold text-[#202D2B] flex items-center gap-2 text-sm">
              <MessageSquare className="w-4 h-4 text-[#28766B]" />
              Legacy WhatsApp records ({messageLogs.length})
            </h3>
            {messageLogs.length === 0 ? (
              <p className="text-xs text-[#66746F] py-2 text-center">No legacy messages. New WhatsApp drafts do not track delivery.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {messageLogs.map((log) => (
                  <div key={log.id} className="p-2.5 bg-[#F5F7F3] rounded-xl border border-[#E2E7E3] text-xs flex justify-between items-center">
                    <div>
                      <span className="font-bold text-[#28766B] uppercase text-[10px] tracking-wider px-2 py-0.5 rounded bg-[#EBF3F1] border border-[#28766B]/20">
                        {log.message_type?.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="text-[10px] text-[#66746F] tabular-nums">
                      {new Date(log.sent_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New / Edit Prescription Modal */}
      <NewPrescriptionModal
        isOpen={isPrescriptionModalOpen}
        onClose={() => {
          setIsPrescriptionModalOpen(false);
          setEditingPrescription(null);
        }}
        customerId={id}
        prescription={editingPrescription}
        onPrescriptionSaved={fetchCustomerData}
      />

      {/* Edit Customer Profile Modal */}
      <CustomerFormModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        customer={customer}
        onCustomerSaved={(updated) => {
          setCustomer(updated);
          fetchCustomerData();
        }}
      />
    </div>
  );
}