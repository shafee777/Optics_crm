/**
 * WhatsApp message template engine & wa.me URL generator
 * Supports custom store templates with placeholder interpolation.
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
function flushQueueOnline() {
  const queue = loadQueue();
  if (!queue.length) return;
  const remaining = [];
  queue.forEach(({ phone, message }) => {
    try {
      const url = buildUrl(phone, message);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      remaining.push({ phone, message });
    }
  });
  saveQueue(remaining);
  if (queue.length - remaining.length > 0) {
    showBanner(
      `📤 ${queue.length - remaining.length} queued WhatsApp message(s) opened now that you're back online.`,
      'success'
    );
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', flushQueueOnline);
}

// ---------------------------------------------------------------------------
// Banner notification
// ---------------------------------------------------------------------------
function showBanner(text, type = 'warning') {
  document.getElementById('wa-offline-banner')?.remove();

  const colors = {
    warning: { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E' },
    error:   { bg: '#FEE2E2', border: '#EF4444', text: '#7F1D1D' },
    success: { bg: '#D1FAE5', border: '#10B981', text: '#065F46' },
  };
  const c = colors[type] || colors.warning;

  const banner = document.createElement('div');
  banner.id = 'wa-offline-banner';
  banner.style.cssText = `
    position: fixed; top: 16px; left: 50%; transform: translateX(-50%);
    background: ${c.bg}; border: 1px solid ${c.border}; color: ${c.text};
    padding: 12px 20px; border-radius: 10px; font-size: 14px; font-weight: 500;
    z-index: 99999; box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    max-width: 90vw; text-align: center; white-space: pre-line;
    animation: wa-slide-in 0.3s ease;
  `;

  if (!document.getElementById('wa-banner-style')) {
    const style = document.createElement('style');
    style.id = 'wa-banner-style';
    style.textContent = `
      @keyframes wa-slide-in {
        from { opacity: 0; transform: translateX(-50%) translateY(-12px); }
        to   { opacity: 1; transform: translateX(-50%) translateY(0); }
      }
    `;
    document.head.appendChild(style);
  }

  banner.textContent = text;
  const close = document.createElement('button');
  close.textContent = ' ✕';
  close.style.cssText = 'margin-left:12px; background:none; border:none; cursor:pointer; font-size:15px; color:inherit;';
  close.onclick = () => banner.remove();
  banner.appendChild(close);

  document.body.appendChild(banner);
  setTimeout(() => banner?.remove(), 7000);
}

// ---------------------------------------------------------------------------
// Core URL builder
// ---------------------------------------------------------------------------
function buildUrl(phone, message) {
  return `https://wa.me/${phone}?text=${message}`;
}

// ---------------------------------------------------------------------------
// Phone sanitizer
// ---------------------------------------------------------------------------
export function sanitizePhone(phone, defaultCountryCode = '91') {
  if (!phone) return '';
  let cleaned = phone.replace(/[^0-9]/g, '');
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
  return encodeURIComponent(interpolateTemplate(tpl, { customerName, storeName }));
}

export function getOrderPlacedGreetingMessage({ customerName, storeName, orderNumber, dueDate, customTemplate }) {
  const formattedDueDate = dueDate ? new Date(dueDate).toLocaleDateString() : 'soon';
  const tpl = customTemplate || DEFAULT_TEMPLATES.ORDER_PLACED;
  return encodeURIComponent(
    interpolateTemplate(tpl, { customerName, storeName, orderNumber, expectedDate: formattedDueDate })
  );
}

export function getOrderReadyMessage({ customerName, storeName, orderNumber, customTemplate }) {
  const tpl = customTemplate || DEFAULT_TEMPLATES.ORDER_READY;
  return encodeURIComponent(interpolateTemplate(tpl, { customerName, storeName, orderNumber }));
}

export function getGoogleReviewMessage({ customerName, storeName, googleReviewLink, customTemplate }) {
  const tpl = customTemplate || DEFAULT_TEMPLATES.GOOGLE_REVIEW;
  return encodeURIComponent(
    interpolateTemplate(tpl, {
      customerName,
      storeName,
      googleReviewLink: googleReviewLink || 'https://maps.google.com',
    })
  );
}

export function getAnnualCheckupMessage({ customerName, storeName, lastTestDate, customTemplate }) {
  const formattedDate = lastTestDate ? new Date(lastTestDate).toLocaleDateString() : 'one year ago';
  const tpl = customTemplate || DEFAULT_TEMPLATES.ANNUAL_CHECKUP;
  return encodeURIComponent(
    interpolateTemplate(tpl, { customerName, storeName, lastTestDate: formattedDate })
  );
}

export function getPaymentReminderMessage({ customerName, storeName, orderNumber, balanceDue, customTemplate }) {
  const formattedBalance = parseFloat(balanceDue || 0).toLocaleString();
  const tpl = customTemplate || DEFAULT_TEMPLATES.PAYMENT_REMINDER;
  return encodeURIComponent(
    interpolateTemplate(tpl, { customerName, storeName, orderNumber, balanceDue: formattedBalance })
  );
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------
export function openWhatsApp(phone, message, label = 'WhatsApp message', customerId = null, messageType = null) {
  const formattedPhone = sanitizePhone(phone);

  if (!formattedPhone) {
    showBanner('⚠️ Customer has no valid phone number recorded.', 'error');
    return;
  }

  // Audit Log Trigger
  if (customerId && messageType) {
    api.post('/messages/log', {
      customerId,
      messageType,
      channel: 'WHATSAPP',
    }).catch((err) => console.warn('Failed to record message audit log:', err));
  }

  // Offline check
  if (!navigator.onLine) {
    enqueue(formattedPhone, message, label);
    showBanner(
      `📵 No internet connection.\n"${label}" message saved — it will open automatically when you're back online.`,
      'warning'
    );
    return;
  }

  // Online: open wa.me
  const url = buildUrl(formattedPhone, message);
  const opened = window.open(url, '_blank', 'noopener,noreferrer');

  if (!opened) {
    showBanner(
      `🚫 Popup blocked by browser.\nAllow popups for this site, then try again — or click: ${url}`,
      'error'
    );
  }
}

export function getPendingQueueCount() {
  return loadQueue().length;
}

export function clearPendingQueue() {
  saveQueue([]);
}