/**
 * WhatsApp message template engine & wa.me URL generator
 *
 * Offline handling:
 *  - If navigator.onLine is false, the message is saved to localStorage under
 *    'wa_pending_queue' so it can be retried when internet comes back.
 *  - A custom in-page notification (no external deps needed) is shown instead
 *    of silently opening a blank tab.
 *  - When the browser comes back online the queue is flushed automatically
 *    (listener registered once on import).
 */

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

/** Flush saved messages when back online (called once per session) */
function flushQueueOnline() {
  const queue = loadQueue();
  if (!queue.length) return;
  // Keep items that fail (unlikely, but safe)
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

// Register once when this module is first imported
if (typeof window !== 'undefined') {
  window.addEventListener('online', flushQueueOnline);
}

// ---------------------------------------------------------------------------
// Banner notification (no external toast library needed)
// ---------------------------------------------------------------------------
function showBanner(text, type = 'warning') {
  // Remove existing banner if any
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

  // Inject keyframe once
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

  // Close button
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
// Message templates
// ---------------------------------------------------------------------------

// 1. Welcome Greeting Message
export function getGreetingMessage({ customerName, storeName }) {
  return encodeURIComponent(
    `Hello ${customerName}! 👓\n\n` +
    `Thank you for visiting *${storeName}*.\n` +
    `We are delighted to assist you with your eyewear and eye care needs. Please feel free to reach out to us anytime for any adjustments or assistance.\n\n` +
    `Have a wonderful day!`
  );
}

// 1b. Order Confirmed & Greetings with Delivery Date (Sent on Order Placement)
export function getOrderPlacedGreetingMessage({ customerName, storeName, orderNumber, dueDate }) {
  const formattedDueDate = dueDate ? new Date(dueDate).toLocaleDateString() : 'soon';
  return encodeURIComponent(
    `Hello ${customerName}! 👓✨\n\n` +
    `Thank you for choosing *${storeName}*.\n` +
    `Your optical order *#${orderNumber}* is confirmed and sent to our lab for lens fitting.\n\n` +
    `📅 *Expected Delivery Date:* ${formattedDueDate}\n\n` +
    `We will notify you immediately once your spectacles are ready for collection. Have a great day!`
  );
}

// 2. Order Status: Ready for Pickup Message
export function getOrderReadyMessage({ customerName, storeName, orderNumber }) {
  return encodeURIComponent(
    `Hello ${customerName}! ✨\n\n` +
    `Good news! Your spectacles for Order *#${orderNumber}* are crafted and *READY FOR PICKUP* at *${storeName}*.\n\n` +
    `📍 You can visit our store anytime during business hours to collect your eyewear.\n` +
    `We look forward to seeing you!`
  );
}

// 3. Google Rating & Review Request
export function getGoogleReviewMessage({ customerName, storeName, googleReviewLink }) {
  const reviewPart = googleReviewLink
    ? `\n\n⭐ *Please take 30 seconds to rate us on Google:*\n${googleReviewLink}`
    : '';

  return encodeURIComponent(
    `Hello ${customerName}! 👓\n\n` +
    `Thank you for collecting your spectacles from *${storeName}*.\n` +
    `We hope you are enjoying crystal-clear vision! Your feedback means the world to our team.${reviewPart}\n\n` +
    `Thank you for choosing us!`
  );
}

// 4. 1-Year Annual Eye Test Reminder
export function getAnnualCheckupMessage({ customerName, storeName, lastTestDate }) {
  const formattedDate = lastTestDate ? new Date(lastTestDate).toLocaleDateString() : 'one year ago';

  return encodeURIComponent(
    `Hello ${customerName}! 🩺\n\n` +
    `This is a friendly reminder from *${storeName}*.\n` +
    `It has been *1 year* since your last vision test on *${formattedDate}*.\n\n` +
    `Annual eye checkups are essential to ensure your vision remains sharp and your eyes stay healthy.\n\n` +
    `👓 *Visit us this week for your routine eye checkup & power test!*`
  );
}

// ---------------------------------------------------------------------------
// Main entry point — offline-aware
// ---------------------------------------------------------------------------
/**
 * @param {string} phone       - Raw phone number (10-digit or with country code)
 * @param {string} message     - Already-encoded message (from template functions above)
 * @param {string} [label]     - Human-readable label for the queued item, e.g. "Order Ready"
 */
export function openWhatsApp(phone, message, label = 'WhatsApp message') {
  const formattedPhone = sanitizePhone(phone);

  if (!formattedPhone) {
    showBanner('⚠️ Customer has no valid phone number recorded.', 'error');
    return;
  }

  // ── Offline check ──────────────────────────────────────────────────────────
  if (!navigator.onLine) {
    enqueue(formattedPhone, message, label);
    showBanner(
      `📵 No internet connection.\n"${label}" message saved — it will open automatically when you're back online.`,
      'warning'
    );
    return;
  }

  // ── Online: open normally ─────────────────────────────────────────────────
  const url = buildUrl(formattedPhone, message);
  const opened = window.open(url, '_blank', 'noopener,noreferrer');

  // Some browsers block window.open even when online (popup blocker)
  if (!opened) {
    showBanner(
      `🚫 Popup blocked by browser.\nAllow popups for this site, then try again — or click: ${url}`,
      'error'
    );
  }
}

// ---------------------------------------------------------------------------
// Expose queue status for UI (e.g. show badge on nav)
// ---------------------------------------------------------------------------
export function getPendingQueueCount() {
  return loadQueue().length;
}

export function clearPendingQueue() {
  saveQueue([]);
}