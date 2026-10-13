import React, { useState, useRef, useEffect, useCallback } from 'react';
import api from '../../services/api.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { 
  X, 
  Send, 
  MessageSquare, 
  Image as ImageIcon, 
  Sparkles, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink,
  SkipForward,
  Smartphone,
  UploadCloud,
  FileVideo,
  FileText,
  Copy,
  Check,
  Download,
  Zap,
  Play,
  Pause,
  Clock,
  Trash2,
  HelpCircle,
  Link as LinkIcon
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

// Helper to copy image blob to OS clipboard as image/png
async function copyImageBlobToClipboard(file) {
  try {
    if (!file || !file.type.startsWith('image/')) return false;
    if (window.ClipboardItem && navigator.clipboard?.write) {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = objectUrl;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const pngBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      URL.revokeObjectURL(objectUrl);

      if (pngBlob) {
        await navigator.clipboard.write([
          new window.ClipboardItem({ 'image/png': pngBlob }),
        ]);
        return true;
      }
    }
  } catch (err) {
    console.warn('Clipboard image write failed:', err);
  }
  return false;
}

export default function BroadcastModal({ isOpen, onClose, selectedCustomers = [], onBroadcastFinished }) {
  const { currentStore } = useAuth();
  const storeName = currentStore?.name || 'Optics Store';
  const storePhone = currentStore?.phone || '';

  const [selectedPreset, setSelectedPreset] = useState('FESTIVAL_OFFER');
  const [campaignName, setCampaignName] = useState('Festive Eyewear Promotion');
  const [messageText, setMessageText] = useState(CAMPAIGN_PRESETS[0].text);
  
  // Media Attachment States
  const [mediaSource, setMediaSource] = useState('UPLOAD'); // 'UPLOAD' | 'LINK'
  const [uploadedFile, setUploadedFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState(null);
  const [fileType, setFileType] = useState(null); // 'IMAGE' | 'VIDEO' | 'DOCUMENT'
  const [imageUrl, setImageUrl] = useState('');
  const fileInputRef = useRef(null);

  // Status & Feedback States
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [copyFeedback, setCopyFeedback] = useState('');
  const [showVcfGuide, setShowVcfGuide] = useState(false);

  // Queue Runner & Auto-Pilot States
  const [queueMode, setQueueMode] = useState(false);
  const [queueItems, setQueueItems] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [isCloudSent, setIsCloudSent] = useState(false);
  
  // Auto-Pilot Runner
  const [autoPilotActive, setAutoPilotActive] = useState(false);
  const [autoPilotInterval, setAutoPilotInterval] = useState(5); // seconds
  const [countdown, setCountdown] = useState(5);
  const countdownTimerRef = useRef(null);

  // Clean up object URLs on unmount or file replace
  useEffect(() => {
    return () => {
      if (filePreviewUrl && filePreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(filePreviewUrl);
      }
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, [filePreviewUrl]);

  const validPhoneCount = selectedCustomers.filter(c => c.phone && c.phone.trim()).length;
  const missingPhoneCount = selectedCustomers.length - validPhoneCount;

  const handleSelectPreset = (preset) => {
    setSelectedPreset(preset.id);
    setMessageText(preset.text);
  };

  const handleInsertTag = (tag) => {
    setMessageText(prev => prev + tag);
  };

  // Handle local media selection (drag-and-drop or file input)
  const handleFileChange = (file) => {
    if (!file) return;

    // Check size (25MB limit)
    if (file.size > 25 * 1024 * 1024) {
      setError('Selected file is too large. Maximum file size is 25 MB.');
      return;
    }

    if (filePreviewUrl && filePreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(filePreviewUrl);
    }

    setError('');
    setUploadedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setFilePreviewUrl(objectUrl);

    if (file.type.startsWith('image/')) {
      setFileType('IMAGE');
      // Auto-copy image to clipboard so user can instantly paste in WhatsApp
      copyImageBlobToClipboard(file).then((ok) => {
        if (ok) {
          setCopyFeedback('Flyer copied to clipboard! (Ready to paste with Ctrl+V)');
          setTimeout(() => setCopyFeedback(''), 4000);
        }
      });
    } else if (file.type.startsWith('video/')) {
      setFileType('VIDEO');
    } else if (file.type === 'application/pdf') {
      setFileType('DOCUMENT');
    } else {
      setFileType('DOCUMENT');
    }
  };

  const handleRemoveFile = () => {
    if (filePreviewUrl && filePreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(filePreviewUrl);
    }
    setUploadedFile(null);
    setFilePreviewUrl(null);
    setFileType(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  // Preview interpolated for the first recipient
  const previewCustomer = selectedCustomers[0] || { full_name: 'John Doe', phone: '9876543210' };
  const previewMessage = messageText
    .replace(/\{customerName\}/g, previewCustomer.full_name || 'Valued Customer')
    .replace(/\{customerCode\}/g, previewCustomer.customer_code || 'CUST-1001')
    .replace(/\{storeName\}/g, storeName)
    .replace(/\{storePhone\}/g, storePhone || 'Store Phone')
    .replace(/\{storeAddress\}/g, currentStore?.address || 'Store Address');

  // Submit and prepare broadcast messages
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
        imageUrl: mediaSource === 'LINK' ? (imageUrl.trim() || null) : null,
        mediaFileName: uploadedFile ? uploadedFile.name : null,
        mediaType: uploadedFile ? fileType : (imageUrl.trim() ? 'IMAGE' : null),
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

  // Open customer WhatsApp chat and advance
  const handleQueueOpenCurrent = useCallback(() => {
    if (!queueItems[currentIndex]) return;
    const current = queueItems[currentIndex];

    // If an image is uploaded, make sure it's on the clipboard so user can press Ctrl+V in WhatsApp
    if (uploadedFile && fileType === 'IMAGE') {
      copyImageBlobToClipboard(uploadedFile);
    }

    window.open(current.waUrl, '_blank', 'noopener,noreferrer');
    setCompletedCount(prev => prev + 1);

    if (currentIndex + 1 < queueItems.length) {
      setCurrentIndex(prev => prev + 1);
      setCountdown(autoPilotInterval);
    } else {
      setAutoPilotActive(false);
    }
  }, [currentIndex, queueItems, uploadedFile, fileType, autoPilotInterval]);

  const handleQueueSkip = () => {
    if (currentIndex + 1 < queueItems.length) {
      setCurrentIndex(prev => prev + 1);
      setCountdown(autoPilotInterval);
    } else {
      setAutoPilotActive(false);
    }
  };

  // Auto-Pilot Timer Effect
  useEffect(() => {
    if (!queueMode || !autoPilotActive) {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      return;
    }

    countdownTimerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          handleQueueOpenCurrent();
          return autoPilotInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [queueMode, autoPilotActive, autoPilotInterval, handleQueueOpenCurrent]);

  // Spacebar keyboard shortcut to advance when in queue mode
  useEffect(() => {
    if (!queueMode) return;
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        handleQueueOpenCurrent();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [queueMode, handleQueueOpenCurrent]);

  const handleDone = () => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    if (onBroadcastFinished) onBroadcastFinished();
    onClose();
  };

  // Helper 1: Download VCF Contact File for mobile WhatsApp Broadcast List
  const handleExportVcf = () => {
    let vcfContent = '';
    selectedCustomers.forEach((c) => {
      if (!c.phone || !c.phone.trim()) return;
      let cleanPhone = c.phone.replace(/[^0-9]/g, '');
      if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;
      const name = c.full_name || 'Customer';
      vcfContent += `BEGIN:VCARD\r\nVERSION:3.0\r\nFN:Optics ${name}\r\nTEL;TYPE=CELL:+${cleanPhone}\r\nNOTE:Broadcast Target ${campaignName}\r\nEND:VCARD\r\n`;
    });

    if (!vcfContent) {
      setError('No valid customer phone numbers to export.');
      return;
    }

    const blob = new Blob([vcfContent], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(campaignName || 'Optics_Broadcast').replace(/[^a-zA-Z0-9]/g, '_')}_contacts.vcf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setCopyFeedback('VCF Contacts Downloaded! Import into your phone to send in 1 click.');
    setTimeout(() => setCopyFeedback(''), 5000);
  };

  // Helper 2: Copy all selected numbers
  const handleCopyNumbers = () => {
    const numbers = selectedCustomers
      .filter(c => c.phone && c.phone.trim())
      .map(c => {
        let clean = c.phone.replace(/[^0-9]/g, '');
        return clean.length === 10 ? '91' + clean : clean;
      })
      .join(', ');

    if (!numbers) {
      setError('No customer phone numbers to copy.');
      return;
    }

    navigator.clipboard.writeText(numbers).then(() => {
      setCopyFeedback(`Copied ${selectedCustomers.length} mobile numbers to clipboard!`);
      setTimeout(() => setCopyFeedback(''), 4000);
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-[#FEFEFC] rounded-2xl border border-[#E2E7E3] shadow-xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E2E7E3] flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#202D2B]">WhatsApp Marketing Broadcast</h2>
              <p className="text-xs text-[#66746F]">
                Attach flyers, photos, or videos and send personalized promotions to your customers
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

          {copyFeedback && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium flex items-center gap-2 animate-fade-in">
              <Check className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{copyFeedback}</span>
            </div>
          )}

          {/* CLOUD SENT SUCCESS VIEW */}
          {isCloudSent ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#202D2B]">Broadcast Dispatched Automatically!</h3>
                <p className="text-xs text-[#66746F] mt-1 max-w-md mx-auto">
                  Messages successfully sent via WhatsApp Cloud API in the background to <strong>{completedCount}</strong> customer(s) with zero manual clicks.
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
            /* SMART QUEUE RUNNER & AUTO-PILOT VIEW */
            <div className="space-y-5">
              
              {/* Auto-Pilot Header Bar */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 text-emerald-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-500" /> WhatsApp Queue Runner
                    </span>
                    {autoPilotActive && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold border border-amber-300 animate-pulse">
                        Auto-Pilot Running
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    {autoPilotActive 
                      ? `Automatically advancing to next customer in ${countdown}s. Press Spacebar anytime to open immediately.`
                      : 'Click "Open in WhatsApp & Next" or activate Auto-Pilot to step through recipients.'}
                  </p>
                </div>

                {/* Auto-Pilot Controls */}
                <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
                  <div className="flex items-center gap-1 bg-white/80 border border-emerald-200 rounded-lg px-2 py-1 text-xs">
                    <Clock className="w-3 h-3 text-[#66746F]" />
                    <select
                      value={autoPilotInterval}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setAutoPilotInterval(val);
                        setCountdown(val);
                      }}
                      disabled={autoPilotActive}
                      className="bg-transparent text-[11px] font-bold text-emerald-900 focus:outline-none cursor-pointer"
                    >
                      <option value={4}>4s delay</option>
                      <option value={5}>5s delay</option>
                      <option value={7}>7s delay</option>
                      <option value={10}>10s delay</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (autoPilotActive) {
                        setAutoPilotActive(false);
                      } else {
                        setCountdown(autoPilotInterval);
                        setAutoPilotActive(true);
                        // Trigger immediate first if not opened
                        handleQueueOpenCurrent();
                      }
                    }}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 shadow-xs ${
                      autoPilotActive
                        ? 'bg-amber-600 hover:bg-amber-700 text-white'
                        : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                    }`}
                  >
                    {autoPilotActive ? (
                      <>
                        <Pause className="w-3 h-3" /> Pause Auto-Pilot
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3" /> Start Auto-Pilot
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Progress Bar & Counter */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-[#66746F]">
                  <span>
                    Recipient <strong>{currentIndex + 1}</strong> of <strong>{queueItems.length}</strong>
                  </span>
                  <span className="font-bold text-emerald-800 tabular-nums">
                    {Math.round(((currentIndex + (autoPilotActive ? 0.5 : 0)) / queueItems.length) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-[#E2E7E3] h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-[#28766B] h-full transition-all duration-300"
                    style={{ width: `${Math.round(((currentIndex + 1) / queueItems.length) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Current Customer Card */}
              {queueItems[currentIndex] ? (
                <div className="p-5 rounded-2xl border-2 border-[#28766B]/30 bg-white shadow-xs space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-[#66746F] uppercase font-bold tracking-wider">Active Recipient</span>
                      <h4 className="text-base font-bold text-[#202D2B]">
                        {queueItems[currentIndex].customerName}
                      </h4>
                      <div className="text-xs font-mono text-[#28766B] font-semibold mt-0.5">
                        +{queueItems[currentIndex].phone}
                      </div>
                    </div>
                    {uploadedFile && fileType === 'IMAGE' && (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200 flex items-center gap-1">
                        <ImageIcon className="w-3 h-3" /> Image in Clipboard (Ctrl+V)
                      </span>
                    )}
                  </div>

                  {/* Attached Media Banner in Queue Card */}
                  {uploadedFile && (
                    <div className="p-2.5 rounded-xl bg-[#F5F7F3] border border-[#E2E7E3] flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        {fileType === 'IMAGE' ? (
                          <img src={filePreviewUrl} alt="Thumbnail" className="w-8 h-8 rounded-lg object-cover border border-[#CCDCD0]" />
                        ) : fileType === 'VIDEO' ? (
                          <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                            <FileVideo className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                            <FileText className="w-4 h-4" />
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-[#202D2B] truncate max-w-[240px]">{uploadedFile.name}</div>
                          <div className="text-[10px] text-[#66746F]">Press <kbd className="px-1 py-0.5 bg-white border border-[#CCDCD0] rounded text-[9px] font-mono">Ctrl+V</kbd> in WhatsApp to paste media</div>
                        </div>
                      </div>
                      {fileType === 'IMAGE' && (
                        <button
                          type="button"
                          onClick={() => {
                            copyImageBlobToClipboard(uploadedFile);
                            setCopyFeedback('Flyer copied to clipboard!');
                            setTimeout(() => setCopyFeedback(''), 3000);
                          }}
                          className="px-2.5 py-1 bg-white border border-[#CCDCD0] hover:bg-[#EBF3F1] text-[11px] font-bold text-[#28766B] rounded-lg transition flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" /> Copy Again
                        </button>
                      )}
                    </div>
                  )}

                  <div className="p-3.5 rounded-xl bg-[#F5F7F3] border border-[#E2E7E3] text-xs text-[#202D2B] whitespace-pre-wrap font-sans max-h-40 overflow-y-auto leading-relaxed">
                    {queueItems[currentIndex].message}
                  </div>

                  {/* Queue Action Buttons */}
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={handleQueueOpenCurrent}
                      className="flex-1 py-3 px-4 bg-[#28766B] hover:bg-[#1E5C53] text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center justify-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open in WhatsApp &amp; Next
                      <span className="text-[10px] opacity-75 font-normal ml-1">(or press Spacebar)</span>
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
                <div className="py-8 text-center space-y-2">
                  <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                  <h4 className="text-base font-bold text-[#202D2B]">All Messages Dispatched!</h4>
                  <p className="text-xs text-[#66746F]">Finished processing all {completedCount} selected customer(s).</p>
                </div>
              )}

              {/* Bottom stats & finish */}
              <div className="flex justify-between items-center pt-2">
                <span className="text-xs text-[#66746F]">
                  Completed: <strong>{completedCount}</strong> / {queueItems.length}
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
              {/* Audience pill & Alternative Broadcast Export Shortcuts */}
              <div className="p-3.5 rounded-xl bg-[#F5F7F3] border border-[#E2E7E3] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#28766B]" />
                  <span className="text-xs text-[#202D2B] font-semibold">
                    Target Audience: <strong className="text-[#28766B]">{validPhoneCount}</strong> customer(s) with mobile numbers
                  </span>
                  {missingPhoneCount > 0 && (
                    <span className="text-[11px] text-amber-700 font-medium ml-1">
                      ({missingPhoneCount} skipped: no phone)
                    </span>
                  )}
                </div>

                {/* Alternative Broadcast Ideas Toolbar */}
                <div className="flex items-center gap-1.5 flex-wrap self-stretch sm:self-auto justify-end">
                  <button
                    type="button"
                    onClick={handleExportVcf}
                    title="Export contacts as VCF to send in 1 click using WhatsApp mobile Broadcast List"
                    className="px-2.5 py-1 bg-white border border-[#CCDCD0] hover:bg-[#EBF3F1] text-[11px] font-bold text-[#28766B] rounded-lg transition flex items-center gap-1 shadow-2xs"
                  >
                    <Download className="w-3 h-3" />
                    Download Contacts (VCF)
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyNumbers}
                    title="Copy all phone numbers to clipboard"
                    className="px-2.5 py-1 bg-white border border-[#CCDCD0] hover:bg-[#EBF3F1] text-[11px] font-bold text-[#66746F] hover:text-[#202D2B] rounded-lg transition flex items-center gap-1 shadow-2xs"
                  >
                    <Copy className="w-3 h-3" />
                    Copy Numbers
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowVcfGuide(!showVcfGuide)}
                    className="p-1 text-[#66746F] hover:text-[#28766B] transition rounded"
                    title="How to broadcast in WhatsApp without clicking each customer"
                  >
                    <HelpCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* VCF Broadcast Guide Accordion */}
              {showVcfGuide && (
                <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200 text-blue-950 text-xs space-y-2 animate-fade-in">
                  <div className="flex items-center justify-between font-bold text-blue-900">
                    <span className="flex items-center gap-1.5">
                      💡 How to send to 200+ customers at once without opening individual chats:
                    </span>
                    <button type="button" onClick={() => setShowVcfGuide(false)} className="text-blue-600 hover:text-blue-900">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-blue-900/90 leading-relaxed pl-1">
                    <li>Click <strong>&quot;Download Contacts (VCF)&quot;</strong> above to get all selected customers.</li>
                    <li>Send that file to your phone (via WhatsApp/Email) and open it to import the contacts into your phone.</li>
                    <li>On your phone, open <strong>WhatsApp &gt; New Broadcast</strong> (or Broadcast Lists).</li>
                    <li>Select the imported contacts, attach your promotional image/video flyer, and tap <strong>Send</strong>.</li>
                    <li><strong>Done!</strong> WhatsApp delivers your photo and message to all recipients simultaneously in 1 click!</li>
                  </ol>
                </div>
              )}

              {/* Campaign Title & Presets */}
              <div className="space-y-2.5">
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
                  rows={5}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type your WhatsApp message..."
                  className="w-full p-3 rounded-xl border border-[#E2E7E3] bg-white text-xs text-[#202D2B] placeholder:text-[#9AA8A3] focus:outline-none focus:ring-2 focus:ring-[#28766B]/30 focus:border-[#28766B] transition font-sans leading-relaxed resize-y"
                />
              </div>

              {/* MEDIA ATTACHMENT SECTION (Upload vs Link) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#202D2B] uppercase tracking-wider">
                    Attach Promotional Flyer, Image or Video (Optional)
                  </label>
                  <div className="flex items-center gap-1 bg-[#F5F7F3] p-0.5 rounded-lg border border-[#E2E7E3]">
                    <button
                      type="button"
                      onClick={() => setMediaSource('UPLOAD')}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition flex items-center gap-1 ${
                        mediaSource === 'UPLOAD'
                          ? 'bg-white text-[#28766B] shadow-2xs'
                          : 'text-[#66746F] hover:text-[#202D2B]'
                      }`}
                    >
                      <UploadCloud className="w-3 h-3" /> Upload File
                    </button>
                    <button
                      type="button"
                      onClick={() => setMediaSource('LINK')}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition flex items-center gap-1 ${
                        mediaSource === 'LINK'
                          ? 'bg-white text-[#28766B] shadow-2xs'
                          : 'text-[#66746F] hover:text-[#202D2B]'
                      }`}
                    >
                      <LinkIcon className="w-3 h-3" /> Web Link
                    </button>
                  </div>
                </div>

                {mediaSource === 'UPLOAD' ? (
                  /* FILE UPLOAD DROPZONE */
                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={(e) => handleFileChange(e.target.files?.[0])}
                      accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,application/pdf"
                      className="hidden"
                    />

                    {uploadedFile ? (
                      /* Display Attached File Card */
                      <div className="p-3.5 rounded-xl border-2 border-emerald-300 bg-emerald-50/50 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {fileType === 'IMAGE' ? (
                            <img
                              src={filePreviewUrl}
                              alt="Uploaded flyer"
                              className="w-14 h-14 rounded-lg object-cover border border-emerald-200 shadow-2xs"
                            />
                          ) : fileType === 'VIDEO' ? (
                            <div className="w-14 h-14 rounded-lg bg-indigo-100 text-indigo-700 flex flex-col items-center justify-center border border-indigo-200">
                              <FileVideo className="w-6 h-6" />
                              <span className="text-[9px] font-bold mt-0.5">VIDEO</span>
                            </div>
                          ) : (
                            <div className="w-14 h-14 rounded-lg bg-rose-100 text-rose-700 flex flex-col items-center justify-center border border-rose-200">
                              <FileText className="w-6 h-6" />
                              <span className="text-[9px] font-bold mt-0.5">PDF</span>
                            </div>
                          )}

                          <div className="min-w-0">
                            <div className="font-bold text-xs text-[#202D2B] truncate">{uploadedFile.name}</div>
                            <div className="text-[11px] text-[#66746F] mt-0.5 flex items-center gap-2">
                              <span>{formatFileSize(uploadedFile.size)}</span>
                              <span className="px-1.5 py-0.2 rounded bg-white text-[#28766B] text-[10px] font-semibold border border-emerald-200">
                                {fileType}
                              </span>
                            </div>
                            {fileType === 'IMAGE' && (
                              <div className="text-[11px] text-emerald-800 font-medium mt-1 flex items-center gap-1">
                                <Check className="w-3 h-3" /> Auto-copies to clipboard on send (press Ctrl+V in WhatsApp)
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-2.5 py-1.5 bg-white border border-[#CCDCD0] hover:bg-[#F5F7F3] text-xs font-semibold text-[#202D2B] rounded-lg transition"
                          >
                            Replace
                          </button>
                          <button
                            type="button"
                            onClick={handleRemoveFile}
                            className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg transition"
                            title="Remove file"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Drop Area */
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (e.dataTransfer.files?.[0]) handleFileChange(e.dataTransfer.files[0]);
                        }}
                        className="p-6 rounded-xl border-2 border-dashed border-[#CCDCD0] hover:border-[#28766B] bg-white hover:bg-[#F5F7F3] cursor-pointer transition text-center space-y-2 group"
                      >
                        <div className="w-10 h-10 rounded-full bg-[#EBF3F1] group-hover:bg-[#28766B] text-[#28766B] group-hover:text-white flex items-center justify-center mx-auto transition">
                          <UploadCloud className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-[#202D2B]">
                            Click to upload or drag &amp; drop file from your computer
                          </div>
                          <div className="text-[11px] text-[#66746F] mt-0.5">
                            Supports Images (JPG, PNG, WebP), Videos (MP4), or PDF flyer (Max 25 MB)
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* WEB LINK INPUT */
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#66746F]">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                    <input
                      type="url"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://yourstore.com/offers/diwali-flyer.jpg"
                      className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#E2E7E3] bg-white text-xs text-[#202D2B] placeholder:text-[#9AA8A3] focus:outline-none focus:ring-2 focus:ring-[#28766B]/30 focus:border-[#28766B] transition"
                    />
                  </div>
                )}
              </div>

              {/* Live WhatsApp Mockup Preview */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#66746F] flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-[#28766B]" /> Live Preview for {previewCustomer.full_name}
                </span>
                <div className="p-4 rounded-xl bg-[#E8EFE9] border border-[#CCDCD0] max-w-lg">
                  <div className="bg-white rounded-lg overflow-hidden shadow-xs border-l-4 border-[#28766B]">
                    {/* Render Image or Video inside Mockup if attached */}
                    {uploadedFile && fileType === 'IMAGE' && filePreviewUrl && (
                      <div className="w-full max-h-48 overflow-hidden bg-black/5 flex items-center justify-center">
                        <img src={filePreviewUrl} alt="Flyer preview" className="w-full object-cover max-h-48" />
                      </div>
                    )}
                    {uploadedFile && fileType === 'VIDEO' && (
                      <div className="w-full h-32 bg-gray-900 text-white flex flex-col items-center justify-center gap-1.5">
                        <FileVideo className="w-8 h-8 text-emerald-400" />
                        <span className="text-[11px] font-bold text-gray-200">{uploadedFile.name}</span>
                      </div>
                    )}
                    <div className="p-3 text-xs text-[#202D2B] whitespace-pre-wrap leading-relaxed">
                      {previewMessage}
                      {mediaSource === 'LINK' && imageUrl && (
                        <div className="mt-2 text-[11px] text-blue-700 underline flex items-center gap-1">
                          <ImageIcon className="w-3 h-3" /> View Image: {imageUrl}
                        </div>
                      )}
                    </div>
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
