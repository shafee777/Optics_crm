import React, { useState, useEffect } from 'react';
import api from '../../services/api.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { DEFAULT_TEMPLATES, interpolateTemplate, showBanner } from '../../lib/whatsapp.js';
import { 
  MessageSquare, 
  Sparkles, 
  RotateCcw, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  Eye,
  CheckCheck,
  Send,
  Zap,
  Key,
  Smartphone,
  Server
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

  // WhatsApp Gateway Configuration State
  const [waConfig, setWaConfig] = useState({
    provider: 'MOCK',
    autoSendOrderCreated: true,
    autoSendOrderReady: true,
    autoSendGoogleReview: false,
    metaPhoneNumberId: '',
    metaAccessToken: '',
    metaWabaId: '',
    twilioAccountSid: '',
    twilioAuthToken: '',
    twilioFromPhone: '',
    customWebhookUrl: '',
  });
  const [savingConfig, setSavingConfig] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testPhone, setTestPhone] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [storeRes, configRes] = await Promise.all([
        api.get('/stores/current'),
        api.get('/whatsapp/config').catch(() => ({ data: { data: {} } })),
      ]);

      const savedTemplates = storeRes.data.data.whatsappTemplates || storeRes.data.data.whatsapp_templates || {};
      setTemplates({
        ...DEFAULT_TEMPLATES,
        ...savedTemplates,
      });

      if (configRes?.data?.data) {
        setWaConfig((prev) => ({
          ...prev,
          ...configRes.data.data,
        }));
      }
    } catch (err) {
      console.error('Failed to load whatsapp settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!isOwner) return;
    setSavingConfig(true);
    try {
      await api.put('/whatsapp/config', waConfig);
      setFeedback({ type: 'success', message: 'WhatsApp Gateway & Automation settings saved successfully!' });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.error?.message || 'Failed to save WhatsApp gateway settings',
      });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleTestConnection = async () => {
    if (!testPhone || testPhone.length < 10) {
      alert('Please enter a valid 10-digit mobile number for testing.');
      return;
    }
    setTestingConnection(true);
    try {
      const res = await api.post('/whatsapp/test', {
        phone: testPhone,
        testConfig: waConfig,
      });
      if (res.data?.success) {
        showBanner(`✅ Test WhatsApp message dispatched to +${testPhone}`, 'success');
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.error?.message || 'WhatsApp connection test failed',
      });
    } finally {
      setTestingConnection(false);
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
      await api.patch('/stores/current', {
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
      {/* 1. WhatsApp Automated Gateway Settings Card */}
      <div className="bg-[#FEFEFC] p-6 rounded-2xl border border-[#E2E7E3] shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#E2E7E3] pb-4">
          <div>
            <h2 className="font-bold text-[#202D2B] text-base flex items-center gap-2">
              <Zap className="w-5 h-5 text-[#28766B]" />
              Automated Background WhatsApp Gateway
            </h2>
            <p className="text-xs text-[#66746F] mt-0.5">
              Send messages silently in the background without opening browser tabs or redirecting away from the CRM.
            </p>
          </div>

          {isOwner && (
            <button
              type="button"
              onClick={handleSaveConfig}
              disabled={savingConfig}
              className="px-4 py-2 bg-[#28766B] hover:bg-[#1E5C53] text-white text-xs font-semibold rounded-xl shadow-xs disabled:opacity-50 transition flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              {savingConfig ? 'Saving...' : 'Save Gateway Settings'}
            </button>
          )}
        </div>

        {/* Provider Selection */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {[
            { id: 'MOCK', label: 'Dev / Demo Mode', desc: 'Simulated automatic background delivery (Zero setup)', icon: Zap },
            { id: 'META', label: 'Meta Cloud API', desc: 'Official WhatsApp Business Cloud API (Meta Graph v19)', icon: Key },
            { id: 'TWILIO', label: 'Twilio API', desc: 'Twilio WhatsApp REST API gateway', icon: Smartphone },
            { id: 'WEBHOOK', label: 'Custom Webhook', desc: 'Interakt, AiSensy, WATI or custom backend', icon: Server },
          ].map((p) => {
            const isSelected = waConfig.provider === p.id;
            const Icon = p.icon;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setWaConfig((prev) => ({ ...prev, provider: p.id }))}
                className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between gap-1.5 ${
                  isSelected
                    ? 'bg-[#EBF3F1] border-[#28766B] ring-1 ring-[#28766B]'
                    : 'bg-[#FEFEFC] border-[#E2E7E3] hover:bg-[#F5F7F3]'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-[#28766B]' : 'text-[#66746F]'}`} />
                    <span className="font-bold text-xs text-[#202D2B]">{p.label}</span>
                  </div>
                  {isSelected && <span className="w-2 h-2 rounded-full bg-[#28766B]"></span>}
                </div>
                <p className="text-[11px] text-[#66746F]">{p.desc}</p>
              </button>
            );
          })}
        </div>

        {/* Provider Specific Input Fields */}
        {waConfig.provider === 'META' && (
          <div className="p-4 rounded-2xl bg-[#F5F7F3] border border-[#E2E7E3] grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-[#66746F] uppercase tracking-wider mb-1">
                Meta Phone Number ID
              </label>
              <input
                type="text"
                placeholder="e.g. 109283746501928"
                value={waConfig.metaPhoneNumberId || ''}
                onChange={(e) => setWaConfig({ ...waConfig, metaPhoneNumberId: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-[#FEFEFC] rounded-xl border border-[#E2E7E3] font-mono focus:border-[#28766B] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#66746F] uppercase tracking-wider mb-1">
                Permanent Access Token
              </label>
              <input
                type="password"
                placeholder="EAAG..."
                value={waConfig.metaAccessToken || ''}
                onChange={(e) => setWaConfig({ ...waConfig, metaAccessToken: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-[#FEFEFC] rounded-xl border border-[#E2E7E3] font-mono focus:border-[#28766B] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#66746F] uppercase tracking-wider mb-1">
                WhatsApp Business Account ID (WABA)
              </label>
              <input
                type="text"
                placeholder="e.g. 192837465019283"
                value={waConfig.metaWabaId || ''}
                onChange={(e) => setWaConfig({ ...waConfig, metaWabaId: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-[#FEFEFC] rounded-xl border border-[#E2E7E3] font-mono focus:border-[#28766B] focus:outline-none"
              />
            </div>
          </div>
        )}

        {waConfig.provider === 'TWILIO' && (
          <div className="p-4 rounded-2xl bg-[#F5F7F3] border border-[#E2E7E3] grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-[#66746F] uppercase tracking-wider mb-1">
                Twilio Account SID
              </label>
              <input
                type="text"
                placeholder="AC..."
                value={waConfig.twilioAccountSid || ''}
                onChange={(e) => setWaConfig({ ...waConfig, twilioAccountSid: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-[#FEFEFC] rounded-xl border border-[#E2E7E3] font-mono focus:border-[#28766B] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#66746F] uppercase tracking-wider mb-1">
                Twilio Auth Token
              </label>
              <input
                type="password"
                placeholder="Auth Token"
                value={waConfig.twilioAuthToken || ''}
                onChange={(e) => setWaConfig({ ...waConfig, twilioAuthToken: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-[#FEFEFC] rounded-xl border border-[#E2E7E3] font-mono focus:border-[#28766B] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#66746F] uppercase tracking-wider mb-1">
                Twilio WhatsApp From Phone
              </label>
              <input
                type="text"
                placeholder="+14155238886"
                value={waConfig.twilioFromPhone || ''}
                onChange={(e) => setWaConfig({ ...waConfig, twilioFromPhone: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-[#FEFEFC] rounded-xl border border-[#E2E7E3] font-mono focus:border-[#28766B] focus:outline-none"
              />
            </div>
          </div>
        )}

        {waConfig.provider === 'WEBHOOK' && (
          <div className="p-4 rounded-2xl bg-[#F5F7F3] border border-[#E2E7E3]">
            <label className="block text-[11px] font-bold text-[#66746F] uppercase tracking-wider mb-1">
              Custom Webhook URL (POST Endpoint)
            </label>
            <input
              type="text"
              placeholder="https://api.interakt.ai/v1/..."
              value={waConfig.customWebhookUrl || ''}
              onChange={(e) => setWaConfig({ ...waConfig, customWebhookUrl: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-[#FEFEFC] rounded-xl border border-[#E2E7E3] font-mono focus:border-[#28766B] focus:outline-none"
            />
          </div>
        )}

        {/* Automation Triggers & Test Ping */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pt-2">
          {/* Checkboxes */}
          <div className="flex flex-wrap gap-4 text-xs font-semibold text-[#202D2B]">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={waConfig.autoSendOrderCreated ?? true}
                onChange={(e) => setWaConfig({ ...waConfig, autoSendOrderCreated: e.target.checked })}
                className="rounded text-[#28766B] focus:ring-[#28766B]"
              />
              <span>Auto-send on Order Creation</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={waConfig.autoSendOrderReady ?? true}
                onChange={(e) => setWaConfig({ ...waConfig, autoSendOrderReady: e.target.checked })}
                className="rounded text-[#28766B] focus:ring-[#28766B]"
              />
              <span>Auto-send when Marked Ready for Pickup</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={waConfig.autoSendGoogleReview ?? false}
                onChange={(e) => setWaConfig({ ...waConfig, autoSendGoogleReview: e.target.checked })}
                className="rounded text-[#28766B] focus:ring-[#28766B]"
              />
              <span>Auto-send Google Review on Delivery</span>
            </label>
          </div>

          {/* Test Live Message */}
          <div className="flex items-center gap-2">
            <input
              type="tel"
              placeholder="10-digit mobile number"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              className="px-3 py-1.5 text-xs bg-[#FEFEFC] rounded-xl border border-[#E2E7E3] w-44 font-mono focus:border-[#28766B] focus:outline-none"
            />
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testingConnection}
              className="px-3 py-1.5 bg-[#FEFEFC] hover:bg-[#F5F7F3] text-[#28766B] text-xs font-semibold rounded-xl border border-[#E2E7E3] shadow-xs transition flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              {testingConnection ? 'Testing...' : 'Test Connection'}
            </button>
          </div>
        </div>
      </div>

      {/* 2. Message Templates Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#FEFEFC] p-5 rounded-2xl border border-[#E2E7E3] shadow-xs">
        <div>
          <h2 className="font-bold text-[#202D2B] text-base flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#28766B]" />
            WhatsApp Message Template Customizer
          </h2>
          <p className="text-xs text-[#66746F] mt-0.5">
            Personalize the automated WhatsApp messages sent to your customers with custom greetings and dynamic placeholders.
          </p>
        </div>

        {isOwner && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleResetAll}
              className="px-3 py-2 text-xs font-semibold text-[#66746F] hover:text-[#202D2B] bg-[#FEFEFC] hover:bg-[#F5F7F3] rounded-xl border border-[#E2E7E3] transition flex items-center gap-1.5"
              title="Reset all templates to system defaults"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset All Defaults
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 bg-[#28766B] hover:bg-[#1E5C53] text-white text-xs font-semibold rounded-xl shadow-xs disabled:opacity-50 transition flex items-center gap-1.5"
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
              ? 'bg-emerald-50/80 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50/80 border border-rose-200 text-rose-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* 3. Main Grid: Template Tabs (Left) + Editor (Center) + Live Preview (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Template Selector Sidebar */}
        <div className="lg:col-span-4 space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-[#66746F] px-1 mb-2">
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
                    ? 'bg-[#EBF3F1] border-[#28766B]/30 text-[#202D2B] shadow-xs'
                    : 'bg-[#FEFEFC] border-[#E2E7E3] hover:bg-[#F5F7F3] text-[#66746F]'
                }`}
              >
                <div className="font-bold text-xs flex items-center justify-between">
                  <span className={isSelected ? 'text-[#28766B]' : 'text-[#202D2B]'}>{cfg.name}</span>
                  {isSelected && <span className="w-2 h-2 rounded-full bg-[#28766B]"></span>}
                </div>
                <div className="text-[11px] text-[#66746F] line-clamp-1">{cfg.desc}</div>
              </button>
            );
          })}
        </div>

        {/* Editor (Center) */}
        <div className="lg:col-span-4 bg-[#FEFEFC] p-5 rounded-2xl border border-[#E2E7E3] shadow-xs space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-[#202D2B] text-sm">{activeConfig.name}</h3>
              <p className="text-[11px] text-[#66746F]">{activeConfig.desc}</p>
            </div>
            <button
              type="button"
              onClick={handleResetCurrent}
              className="text-[11px] text-[#28766B] hover:text-[#1E5C53] font-semibold"
            >
              Reset to Default
            </button>
          </div>

          {/* Placeholders chips */}
          <div>
            <label className="block text-[11px] font-bold text-[#66746F] uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-[#28766B]" />
              Click to insert dynamic variables:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {activeConfig.placeholders.map((ph) => (
                <button
                  key={ph}
                  type="button"
                  onClick={() => handleInsertPlaceholder(ph)}
                  className="px-2.5 py-1 rounded-lg bg-[#EBF3F1] hover:bg-[#DCEAE7] text-[#28766B] text-[11px] font-mono font-semibold transition border border-[#28766B]/20"
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
              className="w-full p-3.5 rounded-xl border border-[#E2E7E3] text-xs font-mono leading-relaxed bg-[#FEFEFC] text-[#202D2B] focus:border-[#28766B] focus:ring-1 focus:ring-[#28766B] focus:outline-none"
              placeholder="Enter message template text with placeholders..."
            />
            <p className="text-[10px] text-[#66746F] mt-1">
              *bold* text is enclosed in asterisks. Use emojis freely.
            </p>
          </div>
        </div>

        {/* Live WhatsApp Chat Bubble Preview (Right) */}
        <div className="lg:col-span-4 bg-[#FEFEFC] p-5 rounded-2xl border border-[#E2E7E3] shadow-xs flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-[#E2E7E3]">
              <Eye className="w-4 h-4 text-[#28766B]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#202D2B]">
                Live WhatsApp Preview
              </span>
            </div>

            {/* Chat background */}
            <div className="bg-[#EFEAE2] p-4 rounded-2xl shadow-inner min-h-[260px] flex flex-col justify-end">
              {/* WhatsApp message bubble */}
              <div className="bg-[#E7FFDB] text-[#202D2B] p-3.5 rounded-2xl rounded-tr-none shadow-xs text-xs leading-relaxed whitespace-pre-line max-w-[95%] self-end relative">
                {previewText}
                <div className="flex items-center justify-end gap-1 text-[10px] text-slate-400 mt-1 font-mono">
                  <span>10:45 AM</span>
                  <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 text-[11px] text-[#66746F] text-center">
            Simulated using sample customer name & store details
          </div>
        </div>

      </div>
    </div>
  );
}