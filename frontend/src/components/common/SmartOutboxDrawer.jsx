import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Send, 
  CheckCircle2, 
  RefreshCw, 
  X, 
  AlertCircle, 
  Copy, 
  Check, 
  ExternalLink, 
  Settings, 
  Cloud, 
  Clock, 
  User, 
  Phone, 
  Tag,
  Trash2,
  Zap
} from 'lucide-react';
import { enterpriseApi } from '../../services/enterprise.js';
import { sendWhatsApp, showBanner } from '../../lib/whatsapp.js';

export default function SmartOutboxDrawer({ isOpen, onClose, onCountChange }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('PENDING'); // PENDING | SENT
  const [copiedId, setCopiedId] = useState(null);
  const [dispatchingId, setDispatchingId] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [cloudConfig, setCloudConfig] = useState(null);
  const [cloudSubmitting, setCloudSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadMessages();
      loadConfig();
    }
  }, [isOpen, tab]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const data = await enterpriseApi.listOutbox(tab, 50);
      setMessages(data || []);
      if (tab === 'PENDING') {
        onCountChange?.(data?.length || 0);
      }
    } catch (err) {
      console.error('Failed to load outbox:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadConfig = async () => {
    try {
      const cfg = await enterpriseApi.getWhatsAppConfig();
      setCloudConfig(cfg);
    } catch (err) {
      // Non-blocking
    }
  };

  const handleManualSend = async (msg) => {
    // 1. Open WhatsApp draft via wa.me
    const result = sendWhatsApp({
      phone: msg.phone,
      message: msg.messageBody,
    });

    if (result.success || result.opened) {
      // 2. Mark as sent in outbox
      try {
        await enterpriseApi.markOutboxSent(msg.id, 'MANUAL_WA_ME');
        // Update local list
        setMessages(prev => prev.filter(m => m.id !== msg.id));
        onCountChange?.(prev => Math.max(0, prev - 1));
        showBanner(`Message marked as dispatched for ${msg.customerName || msg.phone}`, 'success');
      } catch (err) {
        showBanner('Failed to update outbox status', 'error');
      }
    }
  };

  const handleCloudSend = async (msg) => {
    setDispatchingId(msg.id);
    try {
      await enterpriseApi.dispatchOutboxCloud(msg.id);
      setMessages(prev => prev.filter(m => m.id !== msg.id));
      onCountChange?.(prev => Math.max(0, prev - 1));
      showBanner(`Cloud WhatsApp message delivered to ${msg.phone}!`, 'success');
    } catch (err) {
      showBanner(`Cloud delivery failed: ${err.response?.data?.error?.message || err.message}`, 'error');
    } finally {
      setDispatchingId(null);
    }
  };

  const handleBatchCloudDispatch = async () => {
    if (!window.confirm('Send all pending outbox messages via Meta WhatsApp Cloud API now?')) return;
    setLoading(true);
    try {
      const summary = await enterpriseApi.dispatchAllOutboxCloud();
      showBanner(`Dispatched ${summary.sent} messages successfully! (${summary.failed} failed)`, 'success');
      loadMessages();
    } catch (err) {
      showBanner(`Batch cloud dispatch failed: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = async (msgId) => {
    try {
      await enterpriseApi.dismissOutboxMessage(msgId);
      setMessages(prev => prev.filter(m => m.id !== msgId));
      onCountChange?.(prev => Math.max(0, prev - 1));
    } catch (err) {
      showBanner('Failed to dismiss message', 'error');
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setCloudSubmitting(true);
    try {
      await enterpriseApi.updateWhatsAppConfig(cloudConfig);
      showBanner('WhatsApp configuration saved!', 'success');
      setShowConfigModal(false);
    } catch (err) {
      showBanner(`Failed to save config: ${err.message}`, 'error');
    } finally {
      setCloudSubmitting(false);
    }
  };

  const isCloudEnabled = cloudConfig && cloudConfig.provider === 'META' && cloudConfig.metaAccessToken;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-[#182C29]/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-lg bg-white shadow-2xl flex flex-col border-l border-[#DDE3DC]">
          
          {/* Header */}
          <div className="bg-[#203A36] text-white px-5 py-4 flex items-center justify-between border-b border-[#182C29]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#28766B] flex items-center justify-center text-white shadow-sm">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold leading-tight">Smart Message Outbox</h2>
                <p className="text-xs text-[#A3CCC4] font-medium">Customer notifications & WhatsApp dispatch</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowConfigModal(true)}
                title="Configure Cloud WhatsApp API"
                className="p-2 rounded-xl text-[#A3B8B2] hover:text-white hover:bg-[#2B4B46] transition"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={loadMessages}
                title="Refresh outbox"
                className="p-2 rounded-xl text-[#A3B8B2] hover:text-white hover:bg-[#2B4B46] transition"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-[#A3B8B2] hover:text-white hover:bg-[#2B4B46] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Mode Indicator Banner */}
          <div className="px-5 py-2.5 bg-[#F5F7F3] border-b border-[#E2E8E0] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isCloudEnabled ? 'bg-emerald-500' : 'bg-blue-500'}`} />
              <span className="font-semibold text-[#203A36]">
                Mode: {isCloudEnabled ? 'Meta Cloud API (Automated)' : 'Zero-Cost Manual (wa.me)'}
              </span>
            </div>
            {isCloudEnabled && (
              <button
                onClick={handleBatchCloudDispatch}
                disabled={loading || messages.length === 0 || tab !== 'PENDING'}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-[#28766B] text-white rounded-lg text-xs font-bold hover:bg-[#203A36] transition disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5" />
                Dispatch All Cloud
              </button>
            )}
          </div>

          {/* Tabs: Pending vs Sent */}
          <div className="flex border-b border-[#E2E8E0] px-5 bg-white text-xs font-bold">
            <button
              onClick={() => setTab('PENDING')}
              className={`py-3 px-4 border-b-2 flex items-center gap-2 transition ${
                tab === 'PENDING'
                  ? 'border-[#28766B] text-[#28766B]'
                  : 'border-transparent text-[#718580] hover:text-[#203A36]'
              }`}
            >
              <span>Pending Queue</span>
              {messages.length > 0 && tab === 'PENDING' && (
                <span className="px-2 py-0.5 rounded-full bg-[#EBF3F1] text-[#28766B] font-extrabold text-[11px]">
                  {messages.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setTab('SENT')}
              className={`py-3 px-4 border-b-2 flex items-center gap-2 transition ${
                tab === 'SENT'
                  ? 'border-[#28766B] text-[#28766B]'
                  : 'border-transparent text-[#718580] hover:text-[#203A36]'
              }`}
            >
              <span>Sent History</span>
            </button>
          </div>

          {/* Message List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F9FAF8]">
            {loading && messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-[#718580] gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-[#28766B]" />
                <span className="text-xs font-semibold">Loading outbox queue...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center px-4">
                <div className="w-12 h-12 rounded-2xl bg-[#EBF3F1] text-[#28766B] flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-[#203A36]">All Caught Up!</h4>
                <p className="text-xs text-[#718580] mt-1 max-w-xs">
                  {tab === 'PENDING'
                    ? 'No messages waiting to be dispatched. New orders and status changes will automatically queue here.'
                    : 'No sent message history recorded yet.'}
                </p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className="bg-white rounded-2xl p-4 border border-[#E2E8E0] shadow-xs hover:border-[#28766B]/30 transition"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-[#203A36]">
                          {msg.customerName || 'Customer'}
                        </span>
                        <span className="text-[11px] font-mono text-[#718580] bg-[#F5F7F3] px-2 py-0.5 rounded-md">
                          {msg.phone}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#EBF3F1] text-[#28766B]">
                          <Tag className="w-2.5 h-2.5" />
                          {msg.eventType}
                        </span>
                        <span className="text-[10px] text-[#8C9B97] flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {tab === 'PENDING' && (
                      <button
                        onClick={() => handleDismiss(msg.id)}
                        title="Dismiss from queue"
                        className="text-[#8C9B97] hover:text-red-600 p-1 rounded-lg transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Message Body Bubble */}
                  <div className="bg-[#F5F7F3] rounded-xl p-3 text-xs text-[#203A36] leading-relaxed font-sans whitespace-pre-wrap border border-[#E8EDE6] mb-3">
                    {msg.messageBody}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#F0F4EF]">
                    <button
                      onClick={() => copyToClipboard(msg.messageBody, msg.id)}
                      className="flex items-center gap-1 text-[11px] font-semibold text-[#5A6F6A] hover:text-[#203A36] px-2 py-1 rounded-lg hover:bg-[#F5F7F3] transition"
                    >
                      {copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                    </button>

                    {tab === 'PENDING' ? (
                      <div className="flex items-center gap-2">
                        {isCloudEnabled && (
                          <button
                            onClick={() => handleCloudSend(msg)}
                            disabled={dispatchingId === msg.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#203A36] text-white rounded-xl text-xs font-bold hover:bg-[#182C29] transition disabled:opacity-50"
                          >
                            <Cloud className="w-3.5 h-3.5" />
                            <span>{dispatchingId === msg.id ? 'Sending...' : 'Cloud Send'}</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleManualSend(msg)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366] text-white rounded-xl text-xs font-bold hover:bg-[#20BA5A] shadow-xs transition"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Open WhatsApp</span>
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] font-medium text-[#718580] flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Dispatched via {msg.dispatchMethod || 'WhatsApp'}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-4 bg-white border-t border-[#DDE3DC] text-center text-[11px] text-[#718580]">
            🔒 100% offline queue. Messages persist locally and never leak without cashier review.
          </div>
        </div>
      </div>

      {/* Cloud WhatsApp Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-[#182C29]/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#DDE3DC]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#EBF3F1] text-[#28766B] flex items-center justify-center">
                  <Cloud className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#203A36]">WhatsApp Cloud API Settings</h3>
                  <p className="text-[11px] text-[#718580]">Optional automated dispatch via Meta Business API</p>
                </div>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="p-1 rounded-lg text-[#8C9B97] hover:text-[#203A36]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#203A36] mb-1">Provider Engine</label>
                <select
                  value={cloudConfig?.provider || 'MOCK'}
                  onChange={(e) => setCloudConfig({ ...cloudConfig, provider: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#CCD7D2] bg-white text-[#203A36] font-medium focus:ring-2 focus:ring-[#28766B]"
                >
                  <option value="MOCK">Disabled (Zero-Cost Manual wa.me Only)</option>
                  <option value="META">Meta WhatsApp Cloud API (Recommended)</option>
                  <option value="TWILIO">Twilio SMS / WhatsApp</option>
                </select>
              </div>

              {cloudConfig?.provider === 'META' && (
                <>
                  <div>
                    <label className="block font-bold text-[#203A36] mb-1">Phone Number ID</label>
                    <input
                      type="text"
                      placeholder="e.g. 104829104928"
                      value={cloudConfig?.metaPhoneNumberId || ''}
                      onChange={(e) => setCloudConfig({ ...cloudConfig, metaPhoneNumberId: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-[#CCD7D2] font-mono text-xs focus:ring-2 focus:ring-[#28766B]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#203A36] mb-1">Permanent Access Token</label>
                    <input
                      type="password"
                      placeholder="EAAG..."
                      value={cloudConfig?.metaAccessToken || ''}
                      onChange={(e) => setCloudConfig({ ...cloudConfig, metaAccessToken: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-[#CCD7D2] font-mono text-xs focus:ring-2 focus:ring-[#28766B]"
                    />
                  </div>
                </>
              )}

              <div className="bg-[#F5F7F3] p-3 rounded-2xl border border-[#E2E8E0] text-[11px] text-[#5A6F6A] leading-relaxed">
                💡 <strong>FAANG Cost & Ban Safeguard:</strong> Meta provides 1,000 free conversations every month. Official Cloud API has 0% ban risk and uses 0MB Chromium RAM.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#CCD7D2] font-bold text-[#5A6F6A] hover:bg-[#F5F7F3]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={cloudSubmitting}
                  className="px-4 py-2 rounded-xl bg-[#28766B] font-bold text-white hover:bg-[#203A36] transition"
                >
                  {cloudSubmitting ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
