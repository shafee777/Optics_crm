import React, { useState, useEffect } from 'react';
import api from '../../services/api.js';
import { enterpriseApi } from '../../services/enterprise.js';
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

  // Background Meta Cloud API Configuration
  const [cloudConfig, setCloudConfig] = useState({
    provider: 'MOCK',
    metaPhoneNumberId: '',
    metaAccessToken: '',
    metaWabaId: '',
    autoSendOrderCreated: true,
    autoSendOrderReady: true,
  });
  const [savingCloud, setSavingCloud] = useState(false);
  const [testingCloud, setTestingCloud] = useState(false);
  const [testPhone, setTestPhone] = useState(user?.store?.phone || '');
  const [cloudFeedback, setCloudFeedback] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const storeRes = await api.get('/stores/current');
      const savedTemplates = storeRes.data.data.whatsappTemplates || storeRes.data.data.whatsapp_templates || {};
      setTemplates({
        ...DEFAULT_TEMPLATES,
        ...savedTemplates,
      });

      const cfg = await enterpriseApi.getWhatsAppConfig();
      if (cfg) {
        setCloudConfig({
          provider: cfg.provider || 'MOCK',
          metaPhoneNumberId: cfg.metaPhoneNumberId || '',
          metaAccessToken: cfg.metaAccessToken || '',
          metaWabaId: cfg.metaWabaId || '',
          autoSendOrderCreated: cfg.autoSendOrderCreated !== false,
          autoSendOrderReady: cfg.autoSendOrderReady !== false,
        });
      }
    } catch (err) {
      console.error('Failed to load whatsapp settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCloud = async (e) => {
    if (e) e.preventDefault();
    if (!isOwner) return;
    setSavingCloud(true);
    setCloudFeedback(null);
    try {
      await enterpriseApi.updateWhatsAppConfig(cloudConfig);
      setCloudFeedback({ type: 'success', message: 'Background WhatsApp configuration saved successfully!' });
      setTimeout(() => setCloudFeedback(null), 4000);
    } catch (err) {
      setCloudFeedback({ type: 'error', message: err.response?.data?.error?.message || 'Failed to save configuration' });
    } finally {
      setSavingCloud(false);
    }
  };

  const handleTestCloud = async () => {
    if (!testPhone) {
      setCloudFeedback({ type: 'error', message: 'Please enter a test mobile number' });
      return;
    }
    setTestingCloud(true);
    setCloudFeedback(null);
    try {
      await enterpriseApi.testWhatsAppCloud(testPhone);
      setCloudFeedback({ type: 'success', message: `Test message sent successfully to ${testPhone}!` });
    } catch (err) {
      setCloudFeedback({ type: 'error', message: err.response?.data?.error?.message || 'Test message failed. Verify Token & Phone ID.' });
    } finally {
      setTestingCloud(false);
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
      {/* 1. Automated Background Dispatch (Zero-Touch WhatsApp Cloud API) */}
      <div className="bg-[#FEFEFC] p-6 rounded-2xl border border-[#E2E7E3] shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E2E7E3]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#202D2B]">Zero-Touch Background WhatsApp Automation</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Meta Cloud API
                </span>
              </div>
              <p className="text-xs text-[#66746F] mt-0.5">
                Automatically send WhatsApp messages in the background when orders are confirmed or marked ready — cashiers don't need to open WhatsApp Web or hit send!
              </p>
            </div>
          </div>

          {isOwner && (
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={cloudConfig.provider === 'META'}
                onChange={(e) => setCloudConfig({
                  ...cloudConfig,
                  provider: e.target.checked ? 'META' : 'MOCK',
                })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              <span className="ml-2.5 text-xs font-bold text-[#202D2B]">
                {cloudConfig.provider === 'META' ? 'AUTO-DISPATCH ON' : 'MANUAL OUTBOX (OFF)'}
              </span>
            </label>
          )}
        </div>

        {cloudFeedback && (
          <div
            className={`p-3.5 rounded-xl text-xs flex items-center gap-2 font-medium ${
              cloudFeedback.type === 'success'
                ? 'bg-emerald-50/80 border border-emerald-200 text-emerald-800'
                : 'bg-rose-50/80 border border-rose-200 text-rose-800'
            }`}
          >
            {cloudFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span>{cloudFeedback.message}</span>
          </div>
        )}

        {cloudConfig.provider === 'META' ? (
          <form onSubmit={handleSaveCloud} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#202D2B] mb-1 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-[#28766B]" />
                  Phone Number ID *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 104859384918274"
                  value={cloudConfig.metaPhoneNumberId}
                  onChange={(e) => setCloudConfig({ ...cloudConfig, metaPhoneNumberId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E7E3] text-xs font-mono text-[#202D2B] bg-white focus:outline-none focus:border-[#28766B]"
                  required
                />
                <p className="text-[10px] text-[#66746F] mt-1">From Meta App Dashboard &gt; WhatsApp &gt; API Setup</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202D2B] mb-1 flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-[#28766B]" />
                  WhatsApp Business Account ID (WABA)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 109823471928472"
                  value={cloudConfig.metaWabaId}
                  onChange={(e) => setCloudConfig({ ...cloudConfig, metaWabaId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E7E3] text-xs font-mono text-[#202D2B] bg-white focus:outline-none focus:border-[#28766B]"
                />
                <p className="text-[10px] text-[#66746F] mt-1">Found in your Meta Business Suite</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202D2B] mb-1 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-[#28766B]" />
                  Permanent System User Access Token *
                </label>
                <input
                  type="password"
                  placeholder="EAAG..."
                  value={cloudConfig.metaAccessToken}
                  onChange={(e) => setCloudConfig({ ...cloudConfig, metaAccessToken: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E7E3] text-xs font-mono text-[#202D2B] bg-white focus:outline-none focus:border-[#28766B]"
                  required
                />
                <p className="text-[10px] text-[#66746F] mt-1">Permanent access token from Meta Business System Users</p>
              </div>
            </div>

            {/* Auto-Dispatch Triggers */}
            <div className="p-4 rounded-xl bg-[#F5F7F3] border border-[#E2E7E3] flex flex-wrap gap-6 items-center">
              <span className="text-xs font-bold text-[#202D2B]">Automated Background Triggers:</span>
              <label className="inline-flex items-center gap-2 text-xs font-medium text-[#202D2B] cursor-pointer">
                <input
                  type="checkbox"
                  checked={cloudConfig.autoSendOrderCreated}
                  onChange={(e) => setCloudConfig({ ...cloudConfig, autoSendOrderCreated: e.target.checked })}
                  className="rounded text-[#28766B] focus:ring-[#28766B]"
                />
                Auto-send on Order Confirmation
              </label>
              <label className="inline-flex items-center gap-2 text-xs font-medium text-[#202D2B] cursor-pointer">
                <input
                  type="checkbox"
                  checked={cloudConfig.autoSendOrderReady}
                  onChange={(e) => setCloudConfig({ ...cloudConfig, autoSendOrderReady: e.target.checked })}
                  className="rounded text-[#28766B] focus:ring-[#28766B]"
                />
                Auto-send when Spectacles Ready for Pickup
              </label>
            </div>

            {/* Save & Test Ping Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <input
                  type="tel"
                  placeholder="+919876543210"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-[#E2E7E3] text-xs font-mono text-[#202D2B] w-44"
                />
                <button
                  type="button"
                  onClick={handleTestCloud}
                  disabled={testingCloud || !testPhone}
                  className="px-3 py-1.5 bg-[#FEFEFC] hover:bg-[#F5F7F3] text-[#28766B] border border-[#28766B]/30 text-xs font-semibold rounded-lg shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {testingCloud ? 'Sending Test...' : 'Send Test WhatsApp'}
                </button>
              </div>

              {isOwner && (
                <button
                  type="submit"
                  disabled={savingCloud}
                  className="px-5 py-2 bg-[#28766B] hover:bg-[#1E5C53] text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center gap-1.5 disabled:opacity-50 self-end sm:self-auto"
                >
                  <Save className="w-4 h-4" />
                  {savingCloud ? 'Saving...' : 'Save Background WhatsApp Config'}
                </button>
              )}
            </div>
          </form>
        ) : (
          <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/80 text-xs text-amber-900 space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              <span>ℹ️</span> Background Auto-Dispatch is currently turned OFF.
            </p>
            <p className="text-[11px] text-amber-800">
              All notifications are placed into your <strong>Staff Outbox Drawer</strong>. Staff can safely click each message to review and open WhatsApp Web. To send messages 100% silently in the background with zero clicks, toggle this switch ON and enter your Meta Cloud API keys.
            </p>
          </div>
        )}
      </div>

      {/* 2. Message Templates Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#FEFEFC] p-5 rounded-2xl border border-[#E2E7E3] shadow-xs">
        <div>
          <h2 className="font-bold text-[#202D2B] text-base flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#28766B]" />
            WhatsApp Message Template Customizer
          </h2>
          <p className="text-xs text-[#66746F] mt-0.5">
            Personalize the WhatsApp drafts shown to your customers with custom greetings and dynamic placeholders.
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