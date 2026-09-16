import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api.js';
import { ArrowLeft, Phone, MapPin, Calendar, FileText, ShoppingBag, Hash } from 'lucide-react';

export default function CustomerDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        const response = await api.get(`/customers/${id}`);
        setCustomer(response.data.data);
      } catch (err) {
        console.error('Customer not found:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCustomer();
  }, [id]);

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading customer profile...</div>;
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

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => alert('New Eye Test modal ready for Step 6!')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
          >
            <FileText className="w-4 h-4" />
            New Eye Test
          </button>
          <button
            onClick={() => alert('Create Order page ready for Step 7!')}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
          >
            <ShoppingBag className="w-4 h-4" />
            Create Order
          </button>
        </div>
      </div>

      {/* Placeholders for Step 6 & 7 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-600" />
            Eye-Test & Prescription History
          </h3>
          <p className="text-xs text-slate-400">
            Historical optical refractions (SPH, CYL, AXIS, ADD) will display here in Step 6.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-emerald-600" />
            Orders & Purchases
          </h3>
          <p className="text-xs text-slate-400">
            Frames, lenses, status tracking, and payment balances will display here in Step 7.
          </p>
        </div>
      </div>
    </div>
  );
}