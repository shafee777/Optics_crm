import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api.js';
import OpticalGrid from '../prescriptions/OpticalGrid.jsx';
import NewPrescriptionModal from '../prescriptions/NewPrescriptionModal.jsx';
import OrderStatusBadge from '../orders/OrderStatusBadge.jsx';
import { MessageSquare, UserCheck } from 'lucide-react';
import { openWhatsApp, getGreetingMessage, getAnnualCheckupMessage } from '../../lib/whatsapp.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { ArrowLeft, Phone,MapPin,Calendar,FileText,ShoppingBag,Hash,PlusCircle,Clock,ArrowRight} from 'lucide-react';

export default function CustomerDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);

  const fetchCustomerData = useCallback(async () => {
    if (!id) return;
    try {
      const [custRes, prescRes, ordersRes] = await Promise.all([
        api.get(`/customers/${id}`),
        api.get(`/customers/${id}/prescriptions`),
        api.get(`/orders?customerId=${id}`),
      ]);
      setCustomer(custRes.data.data);
      setPrescriptions(prescRes.data.data);
      setCustomerOrders(ordersRes.data.data);
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

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate('/customers')}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Customers
      </button>

      {/* Customer Header Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-700 font-mono font-bold rounded-lg text-sm border border-indigo-100">
              <Hash className="w-3.5 h-3.5" />
              {customer.customer_code || 'CUST'}
            </span>
            <h1 className="text-2xl font-bold text-slate-900">{customer.full_name}</h1>
            <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-full">
              {customer.gender || 'Customer'}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
            {customer.phone && (
              <span className="flex items-center gap-1 font-mono font-medium text-slate-700">
                <Phone className="w-3.5 h-3.5 text-indigo-600" />
                {customer.phone}
              </span>
            )}
            {customer.age && <span>Age: {customer.age} years</span>}
            {customer.address && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {customer.address}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Registered: {new Date(customer.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPrescriptionModalOpen(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            New Eye Test
          </button>
          <button
            onClick={() => navigate(`/orders/new?customerId=${id}`)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-600/20 transition flex items-center gap-1.5"
          >
            <ShoppingBag className="w-4 h-4" />
            Create Order
          </button>
        </div>
      </div>
      <div className="flex gap-2">
  {customer.phone && (
    <>
      <button
        onClick={() => {
          const msg = getGreetingMessage({
            customerName: customer.full_name,
            storeName: user?.store?.name || 'Optical Store',
          });
          openWhatsApp(customer.phone, msg);
        }}
        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-xl border border-indigo-200 flex items-center gap-1"
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
          });
          openWhatsApp(customer.phone, msg);
        }}
        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-xl border border-emerald-200 flex items-center gap-1"
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
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                Eye Test & Prescription History ({prescriptions.length})
              </h2>
              <button
                onClick={() => setIsPrescriptionModalOpen(true)}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                + Record Test
              </button>
            </div>

            {prescriptions.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-slate-100 rounded-xl space-y-2">
                <p className="text-sm font-medium text-slate-600">No eye tests recorded yet</p>
                <p className="text-xs text-slate-400">Click "+ Record Test" to enter the refraction results.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {prescriptions.map((p, index) => (
                  <div
                    key={p.id}
                    className={`p-4 rounded-xl border ${
                      index === 0
                        ? 'bg-indigo-50/30 border-indigo-200'
                        : 'bg-white border-slate-200'
                    } space-y-3`}
                  >
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider text-[10px] ${
                            index === 0
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {index === 0 ? 'Current Power' : `Test #${prescriptions.length - index}`}
                        </span>
                        <span className="flex items-center gap-1 text-slate-500 font-medium">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(p.tested_at).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                      {p.tested_by_name && (
                        <span className="text-slate-500">
                          Tested by: <strong className="text-slate-700">{p.tested_by_name}</strong>
                        </span>
                      )}
                    </div>

                    <OpticalGrid prescription={p} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Column: Customer Orders List */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                <ShoppingBag className="w-4 h-4 text-emerald-600" />
                Customer Orders ({customerOrders.length})
              </h3>
              <button
                onClick={() => navigate(`/orders/new?customerId=${id}`)}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-800"
              >
                + New
              </button>
            </div>

            {customerOrders.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No orders placed yet.</p>
            ) : (
              <div className="space-y-2">
                {customerOrders.map((ord) => (
                  <div
                    key={ord.id}
                    onClick={() => navigate(`/orders/${ord.id}`)}
                    className="p-3 rounded-xl border border-slate-100 hover:border-slate-300 hover:bg-slate-50 cursor-pointer transition flex justify-between items-center"
                  >
                    <div>
                      <div className="font-mono font-bold text-xs text-indigo-600">{ord.order_number}</div>
                      <div className="text-[11px] text-slate-400">{new Date(ord.order_date).toLocaleDateString()}</div>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <div>
                        <div className="font-mono font-bold text-xs text-slate-900">₹{ord.total_amount.toLocaleString()}</div>
                        <OrderStatusBadge status={ord.status} />
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Prescription Modal */}
      <NewPrescriptionModal
        isOpen={isPrescriptionModalOpen}
        onClose={() => setIsPrescriptionModalOpen(false)}
        customerId={id}
        onPrescriptionCreated={fetchCustomerData}
      />
    </div>
  );
}