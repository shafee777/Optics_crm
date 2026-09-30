/** User-initiated WhatsApp drafts. Opening a draft never confirms delivery. */
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
  banner.setAttribute('role', 'status');
  banner.setAttribute('aria-live', 'polite');
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
  close.setAttribute('aria-label', 'Dismiss notification');
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

export function sendWhatsApp({ phone, message }) {
  const formattedPhone = sanitizePhone(phone);
  if (!/^[1-9]\d{7,14}$/.test(formattedPhone)) {
    showBanner('Enter a valid customer phone number with country code.', 'error');
    return { success: false, reason: 'INVALID_PHONE' };
  }
  if (navigator.onLine === false) {
    showBanner('WhatsApp requires internet. Your CRM still works locally. Reopen this message when connected.', 'warning');
    return { success: false, reason: 'OFFLINE' };
  }
  window.open('https://wa.me/' + formattedPhone + '?text=' + encodeURIComponent(message), '_blank', 'noopener,noreferrer');
  showBanner('WhatsApp draft opened. Review it and press Send in WhatsApp. Delivery is not tracked.');
  return { success: true, opened: true, sent: false };
}

export function getRichOrderWhatsAppMessage({ order, store, prescription }) {
  const storeName = store?.name || 'Vision Opticals';
  const customerName = order?.customer_name || 'Valued Customer';
  const orderNumber = order?.order_number || '';
  const orderDate = order?.order_date ? new Date(order.order_date).toLocaleDateString('en-IN') : '';
  const dueDate = order?.due_date ? new Date(order.due_date).toLocaleDateString('en-IN') : '';

  const formatPwr = (val) => {
    if (val === null || val === undefined || val === '') return '—';
    const num = parseFloat(val);
    if (isNaN(num)) return val;
    if (num === 0) return '0.00';
    return (num > 0 ? '+' : '') + num.toFixed(2);
  };

  const lines = [
    `👓 *${storeName}*`,
    `*TAX INVOICE & ORDER SUMMARY*`,
    `━━━━━━━━━━━━━━━━━━━━━`,
    `🧾 Order / Invoice: *#${orderNumber}*`,
    `👤 Customer: *${customerName}*`,
    `📅 Date: ${orderDate}${dueDate ? ` | *Due Date:* ${dueDate}` : ''}`,
  ];

  if (prescription) {
    lines.push(
      ``,
      `👁️ *EYEGLASS POWER (PRESCRIPTION):*`,
      `• *Right (OD):* SPH ${formatPwr(prescription.r_sph)} | CYL ${formatPwr(prescription.r_cyl)} | AXIS ${prescription.r_axis ? `${prescription.r_axis}°` : '—'} | ADD ${formatPwr(prescription.r_add)}`,
      `• *Left (OS):* SPH ${formatPwr(prescription.l_sph)} | CYL ${formatPwr(prescription.l_cyl)} | AXIS ${prescription.l_axis ? `${prescription.l_axis}°` : '—'} | ADD ${formatPwr(prescription.l_add)}`,
      prescription.pd ? `• *PD (Pupillary Dist.):* ${prescription.pd} mm` : ''
    );
  }

  if (order?.items && order.items.length > 0) {
    lines.push(
      ``,
      `🛍️ *ORDER ITEMS:*`,
      ...order.items.map(item => `• ${item.description || item.product_name} (Qty: ${item.quantity || 1}) - ₹${parseFloat(item.total_price || 0).toFixed(2)}`)
    );
  }

  const total = parseFloat(order?.total_amount || 0).toFixed(2);
  const paid = parseFloat(order?.total_paid || order?.advance_amount || 0).toFixed(2);
  const balance = parseFloat(order?.balance_due || 0).toFixed(2);

  lines.push(
    ``,
    `💰 *PAYMENT BREAKDOWN:*`,
    `• Net Grand Total: *₹${total}*`,
    `• Advance Paid: *₹${paid}*`,
    `• Balance Due: *₹${balance}*`,
    ``,
    store?.address ? `📍 ${store.address}` : '',
    store?.phone ? `📞 Contact: ${store.phone}` : '',
    `Thank you for choosing ${storeName}! ✨`
  );

  return lines.filter(Boolean).join('\n');
}

export function getRichPrescriptionWhatsAppMessage({ customer, store, prescription }) {
  const storeName = store?.name || 'Vision Opticals';
  const customerName = customer?.full_name || customer?.name || 'Valued Customer';
  const testDate = prescription?.tested_at
    ? new Date(prescription.tested_at).toLocaleDateString('en-IN')
    : new Date().toLocaleDateString('en-IN');

  const formatPwr = (val) => {
    if (val === null || val === undefined || val === '') return '—';
    const num = parseFloat(val);
    if (isNaN(num)) return val;
    if (num === 0) return '0.00';
    return (num > 0 ? '+' : '') + num.toFixed(2);
  };

  const lines = [
    `👓 *${storeName}*`,
    `*VISION & EYE POWER PRESCRIPTION*`,
    `━━━━━━━━━━━━━━━━━━━━━`,
    `👤 Patient: *${customerName}*`,
    `📅 Exam Date: *${testDate}*`,
    prescription?.tested_by_name ? `👨‍⚕️ Optometrist: ${prescription.tested_by_name}` : '',
    ``,
    `👁️ *REFRACTION POWER SPECIFICATIONS:*`,
    `• *Right Eye (OD):* SPH ${formatPwr(prescription?.r_sph)} | CYL ${formatPwr(prescription?.r_cyl)} | AXIS ${prescription?.r_axis ? `${prescription.r_axis}°` : '—'} | ADD ${formatPwr(prescription?.r_add)}`,
    `• *Left Eye (OS):* SPH ${formatPwr(prescription?.l_sph)} | CYL ${formatPwr(prescription?.l_cyl)} | AXIS ${prescription?.l_axis ? `${prescription.l_axis}°` : '—'} | ADD ${formatPwr(prescription?.l_add)}`,
    prescription?.pd ? `• *PD:* ${prescription.pd} mm` : '',
    prescription?.lens_type ? `• *Recommended Lens:* ${prescription.lens_type}` : '',
    prescription?.notes ? `• *Notes:* ${prescription.notes}` : '',
    ``,
    `📍 *${storeName}*`,
    store?.phone ? `📞 Phone: ${store.phone}` : '',
    `Valid for 12 months. Routine annual checkups recommended! ✨`
  ];

  return lines.filter(Boolean).join('\n');
}

export function sharePdfOnWhatsApp({ phone, customerName, storeName, docType = 'BILL_PRESCRIPTION', orderNumber, filename, customMessage }) {
  const message = customMessage || (
    docType === 'BILL_PRESCRIPTION'
      ? `Hello ${customerName}! 👓\n\nThank you for choosing *${storeName}*.\nYour order details for Order *#${orderNumber}* are confirmed.\n\nHave a great day!`
      : `Hello ${customerName}! 👓\n\nThank you for visiting *${storeName}*.\nHere are your vision and eye power prescription details.\n\nHave a wonderful day!`
  );

  const res = sendWhatsApp({ phone, message });
  if (res.success) {
    showBanner(`WhatsApp draft opened with complete details! Review and send in WhatsApp.`, 'success');
  }
  return res;
}

export function openWhatsApp(phone, message) { return sendWhatsApp({ phone, message }); }

