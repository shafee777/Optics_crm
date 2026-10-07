import React, { useState } from 'react';
import api from '../../services/api.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { 
  X, 
  Send, 
  MessageSquare, 
  Image, 
  Sparkles, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink,
  ChevronRight,
  RotateCcw,
  SkipForward,
  Smartphone
} from 'lucide-react';

const CAMPAIGN_PRESETS = [
  {
    id: 'FESTIVAL_OFFER',
    name: 'Special Discount Offer',
    desc: 'Festival / Seasonal eyewear discount',
    text: `Hello {customerName}! 👓✨\n\nExclusive Offer from *{storeName}*!\nEnjoy up to *25% OFF* on our latest collection of premium spectacle frames and blue-cut digital lenses this week.\n\n📍 Visit our store or call {storePhone} to claim your offer.\nWe look forward to serving you!`,
  },
  {
    id: 'NEW_ARRIVAL',
    name: 'New Frames & Sunglasses',
    desc: 'Announce fresh stock & designer arrivals',
    text: `Hello {customerName}! 🕶️\n\nFresh eyewear collection has just arrived at *{storeName}*!\nExplore trendy lightweight titanium, transparent acetates, and polarized sunglasses.\n\n👓 Drop by today for a complimentary frame fitting & styling advice!\nPhone: {storePhone}`,
  },
  {
    id: 'EYE_CAMP',
    name: 'Free Eye Checkup Invitation',
    desc: 'Promote vision screening & routine eye tests',
    text: `Hello {customerName}! 🩺\n\nYour eye health matters to us at *{storeName}*.\nWe are offering a *Complimentary Vision Checkup* this week. Get your eye power tested by our certified optometrists.\n\n📅 Call {storePhone} to book your preferred time slot.\nSee clearly, live better!`,
  },
  {
    id: 'CLEARANCE',
    name: 'Clearance Sale',
    desc: 'Flat discount on select eyewear',
    text: `Hello {customerName}! 🔥\n\n*SUPER CLEARANCE SALE* at *{storeName}*!\nFlat *30% to 50% OFF* on select designer optical frames and branded sunglasses. Limited stock available.\n\n📍 Visit us today at {storeAddress}.\nHurry while stocks last!`,
  },
  {
    id: 'CUSTOM',
    name: 'Custom Announcement',
    desc: 'Write your own personalized promotion',
    text: `Hello {customerName}!\n\nGreetings from *{storeName}*.\n\nWe have exciting updates for you! Please visit our store or contact us at {storePhone} for more details.`,
  },
];

export default function BroadcastModal({ isOpen, onClose, selectedCustomers = [], onBroadcastFinished }) {
  const { currentStore } = useAuth();
  const storeName = currentStore?.name || 'Optics Store';
  const storePhone = currentStore?.phone || '';

  const [selectedPreset, setSelectedPreset] = useState('FESTIVAL_OFFER');
  const [campaignName, setCampaignName] = useState('Festive Eyewear Promotion');
  const [messageText, setMessageText] = useState(CAMPAIGN_PRESETS[0].text);
  const [imageUrl, setImageUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Queue runner states
  const [queueMode, setQueueMode] = useState(false);
  const [queueItems, setQueueItems] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [isCloudSent, setIsCloudSent] = useState(false);

  if (!isOpen) return null;

  const validPhoneCount = selectedCustomers.filter(c => c.phone && c.phone.trim()).length;
  const missingPhoneCount = selectedCustomers.length - validPhoneCount;

  const handleSelectPreset = (preset) => {
    setSelectedPreset(preset.id);
    setMessageText(preset.text);
  };

  const handleInsertTag = (tag) => {
    setMessageText(prev => prev + tag);
  };

  // Preview interpolated for the first recipient
  const previewCustomer = selectedCustomers[0] || { full_name: 'John Doe', phone: '9876543210' };
  const previewMessage = messageText
    .replace(/\{customerName\}/g, previewCustomer.full_name || 'Valued Customer')
    .replace(/\{customerCode\}/g, previewCustomer.customer_code || 'CUST-1001')
    .replace(/\{storeName\}/g, storeName)
    .replace(/\{storePhone\}/g, storePhone || 'Store Phone')
    .replace(/\{storeAddress\}/g, currentStore?.address || 'Store Address');

  const handleStartBroadcast = async () => {
    setError('');
    if (!messageText.trim()) {
      setError('Message body cannot be empty.');
      return;
    }
    if (validPhoneCount === 0) {
      setError('None of the selected customers have a valid mobile number.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/customers/broadcast-whatsapp', {
        customerIds: selectedCustomers.map(c => c.id),
        messageTemplate: messageText,
        imageUrl: imageUrl.trim() || null,
        campaignName: campaignName.trim() || 'WhatsApp Broadcast',
      });

      const data = res.data?.data;
      if (data?.deliveryMode === 'CLOUD_SENT') {
        setIsCloudSent(true);
        setCompletedCount(data.cloudSentCount || data.totalPrepared || 0);
      } else {
        // Queue runner for desktop/offline direct WhatsApp send
        setQueueItems(data.messages || []);
        setCurrentIndex(0);
        setCompletedCount(0);
        setQueueMode(true);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to initialize broadcast.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQueueOpenCurrent = () => {
    if (!queueItems[currentIndex]) return;
    const current = queueItems[currentIndex];
    window.open(current.waUrl, '_blank', 'noopener,noreferrer');
    setCompletedCount(prev => prev + 1);
    if (currentIndex + 1 < queueItems.length) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleQueueSkip = () => {
    if (currentIndex + 1 < queueItems.length) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleDone = () => {
    if (onBroadcastFinished) onBroadcastFinished();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-[#FEFEFC] rounded-2xl border border-[#E2E7E3] shadow-xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E2E7E3] flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#202D2B]">WhatsApp Marketing Broadcast</h2>
              <p className="text-xs text-[#66746F]">
                Send customized promotional offers, discounts, or announcements to selected customers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#66746F] hover:bg-[#F5F7F3] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* CLOUD SENT SUCCESS VIEW */}
          {isCloudSent ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#202D2B]">Broadcast Dispatched!</h3>
                <p className="text-xs text-[#66746F] mt-1 max-w-md mx-auto">
                  Messages successfully queued and sent via WhatsApp Cloud API to <strong>{completedCount}</strong> customer(s).
                </p>
              </div>
              <button
                onClick={handleDone}
                className="px-5 py-2.5 bg-[#28766B] hover:bg-[#1E5C53] text-white text-xs font-semibold rounded-xl transition shadow-xs"
              >
                Done &amp; Close
              </button>
            </div>
          ) : queueMode ? (
            /* 1-CLICK QUEUE RUNNER VIEW */
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200 text-emerald-900 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                    Smart 1-Click WhatsApp Queue
                  </h3>
                  <p className="text-xs mt-0.5">
                    Click the button below to open each customer in WhatsApp Web/App pre-filled with their personalized message.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-emerald-800 tabular-nums">
                    {currentIndex + 1} / {queueItems.length}
                  </span>
                  <div className="text-[11px] text-emerald-700">Recipients</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-[#E2E7E3] h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-[#28766B] h-full transition-all duration-300"
                  style={{ width: `${Math.round(((currentIndex + 1) / queueItems.length) * 100)}%` }}
                />
              </div>

              {/* Current Customer Card */}
              {queueItems[currentIndex] ? (
                <div className="p-5 rounded-2xl border-2 border-[#28766B]/30 bg-white shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-[#66746F] uppercase font-bold tracking-wider">Current Recipient</span>
                      <h4 className="text-base font-bold text-[#202D2B]">
                        {queueItems[currentIndex].customerName}
                      </h4>
                      <div className="text-xs font-mono text-[#28766B] font-semibold mt-0.5">
                        +{queueItems[currentIndex].phone}
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-[#EBF3F1] text-[#28766B] text-[11px] font-bold">
                      {currentIndex + 1} of {queueItems.length}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#F5F7F3] border border-[#E2E7E3] text-xs text-[#202D2B] whitespace-pre-wrap font-sans max-h-48 overflow-y-auto">
                    {queueItems[currentIndex].message}
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleQueueOpenCurrent}
                      className="flex-1 py-3 px-4 bg-[#28766B] hover:bg-[#1E5C53] text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center justify-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open in WhatsApp &amp; Next
                    </button>
                    <button
                      type="button"
                      onClick={handleQueueSkip}
                      className="py-3 px-4 border border-[#E2E7E3] hover:bg-[#F5F7F3] text-xs font-semibold text-[#66746F] rounded-xl transition flex items-center gap-1.5"
                    >
                      <SkipForward className="w-4 h-4" />
                      Skip
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                  <h4 className="font-bold text-[#202D2B]">Queue Finished!</h4>
                  <p className="text-xs text-[#66746F]">All {completedCount} selected customers have been processed.</p>
                </div>
              )}

              <div className="flex justify-between items-center pt-2">
                <span className="text-xs text-[#66746F]">
                  Processed: <strong>{completedCount}</strong> / {queueItems.length}
                </span>
                <button
                  type="button"
                  onClick={handleDone}
                  className="px-4 py-2 bg-[#203A36] text-white text-xs font-semibold rounded-xl hover:bg-[#182C29] transition"
                >
                  Finished &amp; Close
                </button>
              </div>
            </div>
          ) : (
            /* CAMPAIGN COMPOSER VIEW */
            <>
              {/* Recipients summary pill */}
              <div className="p-3.5 rounded-xl bg-[#F5F7F3] border border-[#E2E7E3] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#28766B]" />
                  <span className="text-xs text-[#202D2B] font-semibold">
                    Target Audience: <strong className="text-[#28766B]">{validPhoneCount}</strong> customer(s) with mobile numbers
                  </span>
                </div>
                {missingPhoneCount > 0 && (
                  <span className="text-[11px] text-amber-700 font-medium">
                    ({missingPhoneCount} skipped: no mobile number)
                  </span>
                )}
              </div>

              {/* Campaign Title & Presets */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#202D2B] uppercase tracking-wider">
                    Select Offer / Announcement Template
                  </label>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CAMPAIGN_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className={`p-2.5 rounded-xl border text-left transition ${
                        selectedPreset === preset.id
                          ? 'border-[#28766B] bg-[#EBF3F1]/80 text-[#202D2B]'
                          : 'border-[#E2E7E3] bg-white hover:bg-[#F5F7F3] text-[#66746F]'
                      }`}
                    >
                      <div className="font-bold text-xs truncate text-[#202D2B]">{preset.name}</div>
                      <div className="text-[10px] text-[#66746F] truncate mt-0.5">{preset.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Message Composer & Variable Buttons */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#202D2B] uppercase tracking-wider">
                    Message Content
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-[#66746F] mr-1">Insert tag:</span>
                    <button
                      type="button"
                      onClick={() => handleInsertTag(' {customerName} ')}
                      className="px-2 py-0.5 bg-[#EBF3F1] hover:bg-[#DDEAE7] text-[#28766B] text-[10px] font-bold rounded-md transition"
                    >
                      + Name
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertTag(' {storeName} ')}
                      className="px-2 py-0.5 bg-[#EBF3F1] hover:bg-[#DDEAE7] text-[#28766B] text-[10px] font-bold rounded-md transition"
                    >
                      + Store
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertTag(' {storePhone} ')}
                      className="px-2 py-0.5 bg-[#EBF3F1] hover:bg-[#DDEAE7] text-[#28766B] text-[10px] font-bold rounded-md transition"
                    >
                      + Phone
                    </button>
                  </div>
                </div>

                <textarea
                  rows={6}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type your WhatsApp message..."
                  className="w-full p-3 rounded-xl border border-[#E2E7E3] bg-white text-xs text-[#202D2B] placeholder:text-[#9AA8A3] focus:outline-none focus:ring-2 focus:ring-[#28766B]/30 focus:border-[#28766B] transition font-sans leading-relaxed resize-y"
                />
              </div>

              {/* Optional Promotional Image URL */}
              <div>
                <label className="block text-xs font-bold text-[#202D2B] uppercase tracking-wider mb-1.5">
                  Promotional Flyer / Image Link (Optional)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#66746F]">
                    <Image className="w-4 h-4" />
                  </div>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://yourstore.com/offers/diwali-flyer.jpg"
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#E2E7E3] bg-white text-xs text-[#202D2B] placeholder:text-[#9AA8A3] focus:outline-none focus:ring-2 focus:ring-[#28766B]/30 focus:border-[#28766B] transition"
                  />
                </div>
              </div>

              {/* Live WhatsApp Preview */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#66746F] flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-[#28766B]" /> Live WhatsApp Preview (First Recipient: {previewCustomer.full_name})
                </span>
                <div className="p-4 rounded-xl bg-[#E8EFE9] border border-[#CCDCD0] max-w-lg">
                  <div className="bg-white rounded-lg p-3 text-xs text-[#202D2B] shadow-xs whitespace-pre-wrap leading-relaxed border-l-4 border-[#28766B]">
                    {previewMessage}
                    {imageUrl && (
                      <div className="mt-2 text-[11px] text-blue-700 underline flex items-center gap-1">
                        <Image className="w-3 h-3" /> Image Attachment Link
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!queueMode && !isCloudSent && (
          <div className="px-6 py-4 border-t border-[#E2E7E3] bg-[#F5F7F3] flex items-center justify-between">
            <span className="text-xs text-[#66746F]">
              Ready to send to <strong>{validPhoneCount}</strong> customer(s)
            </span>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-[#E2E7E3] text-xs font-semibold text-[#66746F] hover:bg-white transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStartBroadcast}
                disabled={submitting || validPhoneCount === 0}
                className="px-5 py-2 bg-[#28766B] hover:bg-[#1E5C53] text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-2 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                {submitting ? 'Preparing Broadcast…' : 'Start WhatsApp Broadcast'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
