/**
 * WhatsApp message template engine & Automated Background WhatsApp Dispatcher
 * Dispatches WhatsApp messages in the background via Meta Cloud API / Twilio / Webhook / Gateway
 * without opening extra tabs or redirecting away from the CRM page.
 */

import api from '../services/api.js';

// ---------------------------------------------------------------------------
// Offline queue helpers
// ---------------------------------------------------------------------------
const QUEUE_KEY = 'wa_pending_queue';

function loadQueue() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveQueue(queue) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

function enqueue(phone, message, label = '') {
  const queue = loadQueue();
  queue.push({ phone, message, label, savedAt: new Date().toISOString() });
  saveQueue(queue);
}

/** Flush saved messages when back online */
async function flushQueueOnline() {
  const queue = loadQueue();
  if (!queue.length) return;
  const remaining = [];

  for (const item of queue) {
    try {
      await api.post('/whatsapp/send', {
        phone: item.phone,
        message: item.message,
      });
    } catch {
      remaining.push(item);
    }
  }

  saveQueue(remaining);
  const sentCount = queue.length - remaining.length;
  if (sentCount > 0) {
    showBanner(
      `📤 ${sentCount} queued WhatsApp message(s) delivered now that you're back online.`,
      'success'
    );
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', flushQueueOnline);
}

// ---------------------------------------------------------------------------
// Non-blocking Toast Banner notification (Calm Sage / Forest Theme)
// ---------------------------------------------------------------------------
export function showBanner(text, type = 'success') {
  document.getElementById('wa-crm-banner')?.remove();

  const colors = {
    warning: { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E' },
    error:   { bg: '#FEE2E2', border: '#EF4444', text: '#7F1D1D' },
    success: { bg: '#EBF3F1', border: '#28766B', text: '#203A36' },
  };
  const c = colors[type] || colors.success;

  const banner = document.createElement('div');
  banner.id = 'wa-crm-banner';
  banner.style.cssText = `
    position: fixed; bottom: 24px; right: 24px;
    background: ${c.bg}; border: 1px solid ${c.border}; color: ${c.text};
    padding: 12px 18px; border-radius: 12px; font-size: 13px; font-weight: 600;
    z-index: 99999; box-shadow: 0 10px 25px -5px rgba(32,58,54,0.15);
    max-width: 380px; text-align: left; white-space: pre-line;
    animation: wa-slide-up 0.25s ease-out; font-family: 'Manrope', system-ui, sans-serif;
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
  `;

  if (!document.getElementById('wa-banner-style')) {
    const style = document.createElement('style');
    style.id = 'wa-banner-style';
    style.textContent = `
      @keyframes wa-slide-up {
        from { opacity: 0; transform: translateY(16px); }
        to   { opacity: 1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(style);
  }

  const textNode = document.createElement('span');
  textNode.textContent = text;
  banner.appendChild(textNode);

  const close = document.createElement('button');
  close.textContent = '✕';
  close.style.cssText = 'background:none; border:none; cursor:pointer; font-size:14px; opacity:0.6; color:inherit; padding:0 4px;';
  close.onclick = () => banner.remove();
  banner.appendChild(close);

  document.body.appendChild(banner);
  setTimeout(() => banner?.remove(), 5000);
}

// ---------------------------------------------------------------------------
// Phone sanitizer
// ---------------------------------------------------------------------------
export function sanitizePhone(phone, defaultCountryCode = '91') {
  if (!phone) return '';
  let cleaned = phone.toString().replace(/[^0-9]/g, '');
  if (cleaned.length === 10) {
    cleaned = defaultCountryCode + cleaned;
  }
  return cleaned;
}

// ---------------------------------------------------------------------------
// Interpolate Placeholders: replaces {key} with value
// ---------------------------------------------------------------------------
export function interpolateTemplate(tpl, vars = {}) {
  if (!tpl) return '';
  return tpl.replace(/\{(\w+)\}/g, (match, key) => {
    return vars[key] !== undefined && vars[key] !== null ? vars[key] : match;
  });
}

// ---------------------------------------------------------------------------
// Default Templates Definition
// ---------------------------------------------------------------------------
export const DEFAULT_TEMPLATES = {
  GREETING: `Hello {customerName}! 👓\n\nThank you for visiting *{storeName}*.\nWe are delighted to assist you with your eyewear and eye care needs. Please feel free to reach out anytime for any adjustments or assistance.\n\nHave a wonderful day!`,
  
  ORDER_PLACED: `Hello {customerName}! 👓✨\n\nThank you for choosing *{storeName}*.\nYour optical order *#{orderNumber}* is confirmed and sent to our lab for lens fitting.\n\n📅 *Expected Delivery Date:* {expectedDate}\n\nWe will notify you immediately once your spectacles are ready for collection. Have a great day!`,
  
  ORDER_READY: `Hello {customerName}! ✨\n\nGood news! Your spectacles for Order *#{orderNumber}* are crafted and *READY FOR PICKUP* at *{storeName}*.\n\n📍 You can visit our store anytime during business hours to collect your eyewear.\nWe look forward to seeing you!`,
  
  GOOGLE_REVIEW: `Hello {customerName}! 👓\n\nThank you for collecting your spectacles from *{storeName}*.\nWe hope you are enjoying crystal-clear vision! Your feedback means the world to our team.\n\n⭐ *Please take 30 seconds to rate us on Google:*\n{googleReviewLink}\n\nThank you for choosing us!`,
  
  ANNUAL_CHECKUP: `Hello {customerName}! 🩺\n\nThis is a friendly reminder from *{storeName}*.\nIt has been *1 year* since your last vision test on *{lastTestDate}*.\n\nAnnual eye checkups are essential to ensure your vision remains sharp and your eyes stay healthy.\n\n👓 *Visit us this week for your routine eye checkup & power test!*`,
  
  PAYMENT_REMINDER: `Hello {customerName}! 👓\n\nThis is a friendly reminder from *{storeName}* regarding your spectacles Order *#{orderNumber}*.\n\n💰 *Outstanding Balance:* ₹{balanceDue}\n\nKindly clear the pending balance during your visit or via UPI. Feel free to contact us if you have any questions!\nThank you!`,
};

// ---------------------------------------------------------------------------
// Message template builders (supports custom store override)
// ---------------------------------------------------------------------------

export function getGreetingMessage({ customerName, storeName, customTemplate }) {
  const tpl = customTemplate || DEFAULT_TEMPLATES.GREETING;
  return interpolateTemplate(tpl, { customerName, storeName });
}

export function getOrderPlacedGreetingMessage({ customerName, storeName, orderNumber, dueDate, customTemplate }) {
  const formattedDueDate = dueDate ? new Date(dueDate).toLocaleDateString() : 'soon';
  const tpl = customTemplate || DEFAULT_TEMPLATES.ORDER_PLACED;
  return interpolateTemplate(tpl, { customerName, storeName, orderNumber, expectedDate: formattedDueDate });
}

export function getOrderReadyMessage({ customerName, storeName, orderNumber, customTemplate }) {
  const tpl = customTemplate || DEFAULT_TEMPLATES.ORDER_READY;
  return interpolateTemplate(tpl, { customerName, storeName, orderNumber });
}

export function getGoogleReviewMessage({ customerName, storeName, googleReviewLink, customTemplate }) {
  const tpl = customTemplate || DEFAULT_TEMPLATES.GOOGLE_REVIEW;
  return interpolateTemplate(tpl, {
    customerName,
    storeName,
    googleReviewLink: googleReviewLink || 'https://maps.google.com',
  });
}

export function getAnnualCheckupMessage({ customerName, storeName, lastTestDate, customTemplate }) {
  const formattedDate = lastTestDate ? new Date(lastTestDate).toLocaleDateString() : 'one year ago';
  const tpl = customTemplate || DEFAULT_TEMPLATES.ANNUAL_CHECKUP;
  return interpolateTemplate(tpl, { customerName, storeName, lastTestDate: formattedDate });
}

export function getPaymentReminderMessage({ customerName, storeName, orderNumber, balanceDue, customTemplate }) {
  const formattedBalance = parseFloat(balanceDue || 0).toLocaleString();
  const tpl = customTemplate || DEFAULT_TEMPLATES.PAYMENT_REMINDER;
  return interpolateTemplate(tpl, { customerName, storeName, orderNumber, balanceDue: formattedBalance });
}

// ---------------------------------------------------------------------------
// Automated Background Dispatcher (Zero Browser Redirects)
// ---------------------------------------------------------------------------
export async function sendWhatsApp({ phone, message, label = 'WhatsApp message', customerId = null, messageType = 'CUSTOM' }) {
  const formattedPhone = sanitizePhone(phone);

  if (!formattedPhone) {
    showBanner('⚠️ Customer has no valid phone number recorded.', 'error');
    return { success: false, reason: 'INVALID_PHONE' };
  }

  // Ensure clean decoded string for backend API
  let plainMessage = message;
  try {
    if (typeof message === 'string' && message.includes('%')) {
      plainMessage = decodeURIComponent(message);
    }
  } catch {
    plainMessage = message;
  }

  // Offline handling
  if (!navigator.onLine) {
    enqueue(formattedPhone, plainMessage, label);
    showBanner(
      `📵 Offline: Message queued.\nIt will send automatically when your connection is restored.`,
      'warning'
    );
    return { success: true, queued: true };
  }

  try {
    const res = await api.post('/whatsapp/send', {
      phone: formattedPhone,
      message: plainMessage,
      customerId,
      messageType,
    });

    if (res.data?.success) {
      showBanner(`💬 WhatsApp sent automatically to +${formattedPhone}`, 'success');
      return { success: true, data: res.data.data };
    } else {
      throw new Error(res.data?.message || 'Failed to dispatch WhatsApp');
    }
  } catch (err) {
    console.error('Automated WhatsApp dispatch error:', err);
    showBanner(`⚠️ WhatsApp notification failed: ${err.message || 'Network error'}`, 'error');
    return { success: false, error: err.message };
  }
}

/**
 * Backward compatibility alias: Calls silent background sendWhatsApp
 */
export function openWhatsApp(phone, message, label = 'WhatsApp message', customerId = null, messageType = null) {
  return sendWhatsApp({
    phone,
    message,
    label,
    customerId,
    messageType: messageType || 'CUSTOM',
  });
}

export function getPendingQueueCount() {
  return loadQueue().length;
}

export function clearPendingQueue() {
  saveQueue([]);
}