export function prescriptionAvailability(order, prescription, state) {
  if (!order?.prescription_id) return '';
  if (state === 'loading') return 'The linked prescription is still loading. Please wait.';
  if (state === 'error') return 'Could not load the linked prescription. Retry before saving Bill+Rx.';
  if (!prescription || String(prescription.id) !== String(order.prescription_id)) return 'The linked prescription is unavailable. Retry before saving Bill+Rx.';
  return '';
}

export function pdfDraftMessage({ customerName, storeName, orderNumber }) {
  return `Hello ${customerName || 'Customer'}, your ${orderNumber ? `invoice and order documents for #${orderNumber}` : 'prescription'} from ${storeName || 'Optical Store'} are ready. Please contact us with any questions.`;
}

export async function printMatchingPdf(print = () => window.print(), doc = document) {
  await doc.fonts?.ready;
  await Promise.all(Array.from(doc.images || []).map(img => img.decode ? img.decode().catch(() => {}) : Promise.resolve()));
  print();
}

export function openPdfWhatsApp(phone, message, browser = window) {
  let digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 10) digits = '91' + digits;
  if (!/^[1-9]\d{7,14}$/.test(digits)) throw new Error('Enter a valid customer phone number with country code.');
  if (browser.navigator?.onLine === false) throw new Error('Connect to the internet to open WhatsApp.');
  const popup = browser.open('about:blank', '_blank');
  if (!popup) throw new Error('WhatsApp was blocked. Allow pop-ups and try again.');
  popup.opener = null;
  popup.location.href = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
