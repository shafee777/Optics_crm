/**
 * WhatsApp message template engine & wa.me URL generator
 */

// Helper to clean phone number to international format (Defaults to +91 for India)
export function sanitizePhone(phone, defaultCountryCode = '91') {
  if (!phone) return '';
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.length === 10) {
    cleaned = defaultCountryCode + cleaned;
  }
  return cleaned;
}

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
export function getOrderReadyMessage({ customerName, storeName, orderNumber, dueDate }) {
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

// Launch WhatsApp Web or App
export function openWhatsApp(phone, message) {
  const formattedPhone = sanitizePhone(phone);
  if (!formattedPhone) {
    alert('Customer has no valid phone number recorded.');
    return;
  }
  const url = `https://wa.me/${formattedPhone}?text=${message}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}