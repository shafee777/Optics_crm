// Prices include GST. Allocate the order discount in paise before extracting tax.
export function calculateBilling(items, orderDiscount = 0, isGstBill = true, extraTax = 0) {
  const cents = value => Math.round(Number(value || 0) * 100);
  const bases = items.map(item => {
    const gross = cents(Number(item.quantity) * Number(item.unitPrice));
    const discount = cents(item.discount);
    if (!Number.isSafeInteger(gross) || gross < 0 || discount < 0 || discount > gross) throw new RangeError('Item discount exceeds its price');
    return gross - discount;
  });
  const subtotal = bases.reduce((a, b) => a + b, 0);
  const discount = cents(orderDiscount), tax = cents(extraTax);
  if (discount < 0 || discount > subtotal) throw new RangeError('Order discount exceeds subtotal');
  if (tax < 0 || (isGstBill && tax !== 0)) throw new RangeError('GST-inclusive bills cannot add extra tax');
  let remainingDiscount = discount, remainingBase = subtotal;
  let taxable = 0, cgst = 0, sgst = 0;
  const computedItems = items.map((item, index) => {
    const share = remainingBase ? Math.round(remainingDiscount * bases[index] / remainingBase) : 0;
    remainingDiscount -= share; remainingBase -= bases[index];
    const net = bases[index] - share;
    const gstRate = isGstBill ? Number(item.gstRate || 0) : 0;
    const taxableCents = Math.round(net / (1 + gstRate / 100));
    const cgstCents = Math.round((net - taxableCents) / 2);
    const sgstCents = net - taxableCents - cgstCents;
    taxable += taxableCents; cgst += cgstCents; sgst += sgstCents;
    return { ...item, totalPrice: bases[index] / 100, orderDiscountShare: share / 100,
      hsnCode: item.hsnCode || null, gstRate, taxableValue: taxableCents / 100,
      cgstAmount: cgstCents / 100, sgstAmount: sgstCents / 100 };
  });
  return { computedItems, subtotal: subtotal / 100, discount: discount / 100, tax: tax / 100,
    totalAmount: (subtotal - discount + tax) / 100,
    totalTaxableValue: taxable / 100, totalCgst: cgst / 100, totalSgst: sgst / 100 };
}
