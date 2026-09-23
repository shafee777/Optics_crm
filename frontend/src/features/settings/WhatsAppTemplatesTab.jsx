import React, { useState, useEffect } from 'react';
import api from '../../services/api.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { DEFAULT_TEMPLATES, interpolateTemplate } from '../../lib/whatsapp.js';
import { 
  MessageSquare, 
  Sparkles, 
  RotateCcw, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  Eye,
  CheckCheck
} from 'lucide-react';

const TEMPLATE_CONFIGS = [
  {
    id: 'GREETING',
    name: 'Customer Welcome Greeting',
    desc: 'Sent when welcoming a new customer to the optical store',
    placeholders: ['customerName', 'storeName'],
  },
  {
    id: 'ORDER_PLACED',
    name: 'Order Confirmation & Job Tracking',
    desc: 'Sent when a new eyewear order is confirmed and sent for lens processing',
    placeholders: ['customerName', 'storeName', 'orderNumber', 'expectedDate'],
  },
  {
    id: 'ORDER_READY',
    name: 'Spectacles Ready for Pickup',
    desc: 'Sent when the lenses are fitted and glasses are ready at the store counter',
    placeholders: ['customerName', 'storeName', 'orderNumber'],
  },
  {
    id: 'GOOGLE_REVIEW',
    name: 'Google Rating & Review Request',
    desc: 'Sent after delivery to boost the store 5-star Google Maps reviews',
    placeholders: ['customerName', 'storeName', 'googleReviewLink'],
  },
  {
    id: 'ANNUAL_CHECKUP',
    name: '1-Year Annual Eye-Test Recall',
    desc: 'Sent 1 year after last vision test to invite customer for checkup',
    placeholders: ['customerName', 'storeName', 'lastTestDate'],
  },
  {
    id: 'PAYMENT_REMINDER',
    name: 'Payment Due Balance Reminder',
    desc: 'Sent for unpaid balance on active or delivered spectacle orders',
    placeholders: ['customerName', 'storeName', 'orderNumber', 'balanceDue'],
  },
];

export default function WhatsAppTemplatesTab() {
  const { user, isOwner, updateStore } = useAuth();
  const [selectedTemplateKey, setSelectedTemplateKey] = useState('ORDER_PLACED');
  const [templates, setTemplates] = useState({ ...DEFAULT_TEMPLATES });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await api.get('/stores/current');
      const saved = res.data.data.whatsappTemplates || res.data.data.whatsapp_templates || {};
      setTemplates({
        ...DEFAULT_TEMPLATES,
        ...saved,
      });
    } catch (err) {
      console.error('Failed to load whatsapp templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTextChange = (text) => {
    setTemplates((prev) => ({
      ...prev,
      [selectedTemplateKey]: text,
    }));
  };

  const handleInsertPlaceholder = (placeholder) => {
    const currentText = templates[selectedTemplateKey] || '';
    handleTextChange(currentText + ` {${placeholder}}`);
  };

  const handleResetCurrent = () => {
    handleTextChange(DEFAULT_TEMPLATES[selectedTemplateKey]);
  };

  const handleResetAll = () => {
    if (!window.confirm('Reset ALL message templates to factory defaults?')) return;
    setTemplates({ ...DEFAULT_TEMPLATES });
  };

  const handleSave = async () => {
    if (!isOwner) return;
    setSaving(true);
    setFeedback(null);

    try {
      const res = await api.patch('/stores/current', {
        whatsappTemplates: templates,
      });

      updateStore({
        ...user?.store,
        whatsapp_templates: templates,
        whatsappTemplates: templates,
      });

      setFeedback({ type: 'success', message: 'WhatsApp message templates saved successfully!' });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.error?.message || 'Failed to save templates',
      });
    } finally {
      setSaving(false);
    }
  };

  // Sample values for live preview
  const sampleValues = {
    customerName: 'Rahul Sharma',
    storeName: user?.store?.name || 'Vision Care Opticals',
    orderNumber: 'ORD-2026-0042',
    expectedDate: 'Sat, Sep 28',
    lastTestDate: 'Sep 23, 2025',
    balanceDue: '1,500',
    googleReviewLink: user?.store?.google_review_link || 'https://g.page/r/your-store/review',
  };

  const activeConfig = TEMPLATE_CONFIGS.find((c) => c.id === selectedTemplateKey) || TEMPLATE_CONFIGS[0];
  const previewText = interpolateTemplate(templates[selectedTemplateKey] || '', sampleValues);

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-600" />
            WhatsApp Message Template Customizer
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Personalize the automated WhatsApp messages sent to your customers with custom greetings and dynamic placeholders.
          </p>
        </div>

        {isOwner && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleResetAll}
              className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200 transition flex items-center gap-1.5"
              title="Reset all templates to system defaults"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset All Defaults
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 disabled:opacity-50 transition flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Templates'}
            </button>
          </div>
        )}
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-2xl text-xs flex items-center gap-2 font-medium ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Main Grid: Template Tabs (Left) + Editor (Center) + Live Preview (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Template Selector Sidebar */}
        <div className="lg:col-span-4 space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1 mb-2">
            Select Message Type
          </div>
          {TEMPLATE_CONFIGS.map((cfg) => {
            const isSelected = selectedTemplateKey === cfg.id;
            return (
              <button
                key={cfg.id}
                type="button"
                onClick={() => setSelectedTemplateKey(cfg.id)}
                className={`w-full text-left p-3.5 rounded-2xl border transition flex flex-col gap-1 ${
                  isSelected
                    ? 'bg-indigo-50/80 border-indigo-200 text-indigo-900 shadow-sm'
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="font-bold text-xs flex items-center justify-between">
                  <span>{cfg.name}</span>
                  {isSelected && <span className="w-2 h-2 rounded-full bg-indigo-600"></span>}
                </div>
                <div className="text-[11px] text-slate-500 line-clamp-1">{cfg.desc}</div>
              </button>
            );
          })}
        </div>

        {/* Editor (Center) */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">{activeConfig.name}</h3>
              <p className="text-[11px] text-slate-400">{activeConfig.desc}</p>
            </div>
            <button
              type="button"
              onClick={handleResetCurrent}
              className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold"
            >
              Reset to Default
            </button>
          </div>

          {/* Placeholders chips */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              Click to insert dynamic variables:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {activeConfig.placeholders.map((ph) => (
                <button
                  key={ph}
                  type="button"
                  onClick={() => handleInsertPlaceholder(ph)}
                  className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-mono font-semibold transition border border-indigo-100"
                >
                  +{`{${ph}}`}
                </button>
              ))}
            </div>
          </div>

          {/* Text Area */}
          <div>
            <textarea
              rows={9}
              value={templates[selectedTemplateKey] || ''}
              onChange={(e) => handleTextChange(e.target.value)}
              className="w-full p-3.5 rounded-xl border border-slate-200 text-xs font-mono leading-relaxed focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50/50"
              placeholder="Enter message template text with placeholders..."
            />
            <p className="text-[10px] text-slate-400 mt-1">
              *bold* text is enclosed in asterisks. Use emojis freely.
            </p>
          </div>
        </div>

        {/* Live WhatsApp Chat Bubble Preview (Right) */}
        <div className="lg:col-span-4 bg-emerald-900/5 p-5 rounded-2xl border border-emerald-200/60 shadow-sm flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-emerald-200/50">
              <Eye className="w-4 h-4 text-emerald-700" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                Live WhatsApp Preview
              </span>
            </div>

            {/* Chat background */}
            <div className="bg-[#EFEAE2] p-4 rounded-2xl shadow-inner min-h-[260px] flex flex-col justify-end">
              {/* WhatsApp message bubble */}
              <div className="bg-[#E7FFDB] text-slate-900 p-3.5 rounded-2xl rounded-tr-none shadow-sm text-xs leading-relaxed whitespace-pre-line max-w-[95%] self-end relative">
                {previewText}
                <div className="flex items-center justify-end gap-1 text-[10px] text-slate-400 mt-1 font-mono">
                  <span>10:45 AM</span>
                  <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 text-[11px] text-slate-500 text-center">
            Simulated using sample customer name & store details
          </div>
        </div>

      </div>
    </div>
  );
}