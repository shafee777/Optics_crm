import React, { useState, useEffect } from 'react';
import api from '../../services/api.js';
import { Calendar, Phone, MessageSquare, AlertCircle, Clock } from 'lucide-react';
import { sendWhatsApp, getAnnualCheckupMessage } from '../../lib/whatsapp.js';
import { useAuth } from '../auth/AuthContext.jsx';

export default function AnnualRemindersTab() {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    api.get('/customers/due-reminders')
      .then((res) => setReminders(res.data.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleSendReminder = (customer) => {
    const templates = user?.store?.whatsapp_templates || user?.store?.whatsappTemplates;
    const msg = getAnnualCheckupMessage({
      customerName: customer.full_name,
      storeName: user?.store?.name || 'Optical Store',
      lastTestDate: customer.last_test_date,
      customTemplate: templates?.ANNUAL_CHECKUP,
    });
    sendWhatsApp({
      phone: customer.phone,
      message: msg,
      label: `Annual Recall - ${customer.full_name}`,
      customerId: customer.id,
      messageType: 'ANNUAL_CHECKUP',
    });
  };

  return (
    <div className="bg-[#FEFEFC] p-6 rounded-2xl border border-[#E2E7E3] shadow-sm space-y-4">
      <div className="flex justify-between items-center pb-3 border-b border-[#E2E7E3]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#EBF3F1] text-[#28766B] flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#202D2B]">1-Year Annual Eye Test Reminders</h2>
            <p className="text-xs text-[#66746F]">Customers due for an eye checkup (tested 11+ months ago)</p>
          </div>
        </div>
        <span className="px-3 py-1 bg-[#EBF3F1] text-[#28766B] text-xs font-semibold rounded-full border border-[#28766B]/20">
          {reminders.length} Due for Recall
        </span>
      </div>

      {loading ? (
        <div className="p-8 text-center text-[#66746F] text-xs">Checking annual recall records...</div>
      ) : reminders.length === 0 ? (
        <div className="p-8 text-center text-[#66746F] text-xs">
          No customers currently due for 1-year annual recall.
        </div>
      ) : (
        <div className="divide-y divide-[#E2E7E3]">
          {reminders.map((c) => (
            <div key={c.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-[#202D2B] text-sm">{c.full_name}</div>
                <div className="text-xs text-[#66746F] flex items-center gap-3 mt-0.5">
                  <span className="tabular-nums text-[#202D2B]">{c.phone || 'No phone'}</span>
                  <span>• Last Test: {new Date(c.last_test_date).toLocaleDateString()}</span>
                  <span className="text-amber-700 font-semibold tabular-nums">({c.days_since_test} days ago)</span>
                </div>
              </div>

              <button
                onClick={() => handleSendReminder(c)}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-[#28766B] hover:bg-[#1E5C53] text-white rounded-xl text-xs font-semibold shadow-sm transition"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Send 1-Year Recall via WhatsApp
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}