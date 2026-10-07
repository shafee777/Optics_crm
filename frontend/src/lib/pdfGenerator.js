import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { amountToWords } from './amountToWords.js';
import { calculateBilling } from '../../../shared/billing.mjs';

const PRIMARY_COLOR = [32, 58, 54]; // #203A36 Deep Forest
const ACCENT_COLOR = [40, 118, 107]; // #28766B Calm Sage
const TEXT_DARK = [32, 45, 43]; // #202D2B
const TEXT_MUTED = [102, 116, 111]; // #66746F
const BORDER_COLOR = [226, 231, 227]; // #E2E7E3
const BG_LIGHT = [245, 247, 243]; // #F5F7F3

function drawHeader(doc, store, title, pageNum, totalPages) {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header accent bar
  doc.setFillColor(...PRIMARY_COLOR);
  doc.rect(0, 0, pageWidth, 4, 'F');

  let currentY = 12;
  let textStartX = 14;

  // Store Logo if available
  const logoData = store?.logoUrl || store?.logo_url;
  if (logoData && typeof logoData === 'string' && logoData.startsWith('data:image')) {
    try {
      const imgProps = doc.getImageProperties(logoData);
      const aspect = imgProps.width / imgProps.height;
      const maxH = 16;
      const maxW = 32;
      let renderedW = maxH * aspect;
      let renderedH = maxH;
      if (renderedW > maxW) {
        renderedW = maxW;
        renderedH = maxW / aspect;
      }
      doc.addImage(logoData, 'JPEG', 14, currentY, renderedW, renderedH);
      textStartX = 14 + renderedW + 4;
    } catch (e) {
      console.warn('Could not render logo on PDF:', e);
    }
  }

  // Right column: Title & Date (reserved 60mm width)
  const rightColX = pageWidth - 14;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...ACCENT_COLOR);
  doc.text(title, rightColX, currentY + 4, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...TEXT_MUTED);
  doc.text(
    `Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`,
    rightColX,
    currentY + 9,
    { align: 'right' }
  );

  // Left column: Store details (bounded so it never crosses into right column)
  const leftMaxW = pageWidth - 14 - 65 - textStartX;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text(store?.name || 'Optics Store', textStartX, currentY + 4);

  let leftY = currentY + 8.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...TEXT_MUTED);

  if (store?.address) {
    const splitAddr = doc.splitTextToSize(store.address, leftMaxW);
    doc.text(splitAddr, textStartX, leftY);
    leftY += splitAddr.length * 3.5;
  }

  const contacts = [];
  if (store?.phone) contacts.push(`Ph: ${store.phone}`);
  if (store?.email) contacts.push(store.email);
  if (contacts.length > 0) {
    doc.text(contacts.join('  •  '), textStartX, leftY);
    leftY += 3.5;
  }

  if (store?.gstin) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PRIMARY_COLOR);
    doc.text(`GSTIN: ${store.gstin}`, textStartX, leftY);
    leftY += 4;
  }

  const dividerY = Math.max(leftY + 2, currentY + 18);
  doc.setDrawColor(...BORDER_COLOR);
  doc.setLineWidth(0.4);
  doc.line(14, dividerY, pageWidth - 14, dividerY);

  return dividerY + 4;
}

function drawFooter(doc, store, pageNum, totalPages) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setDrawColor(...BORDER_COLOR);
  doc.setLineWidth(0.4);
  doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...TEXT_MUTED);
  doc.text(
    `${store?.name || 'Optical CRM'} • Computer generated document • Thank you for your business!`,
    14,
    pageHeight - 9
  );

  if (pageNum && totalPages) {
    doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - 14, pageHeight - 9, { align: 'right' });
  }
}

/**
 * Render Tax Invoice section onto doc
 */
export function renderInvoiceSection(doc, { order, customer, store, items = [], payments = [] }) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const startY = drawHeader(doc, store, 'TAX INVOICE', 1, 1);

  // Metadata Box (Customer details on left, Order details on right)
  const colWidth = (pageWidth - 28 - 6) / 2;
  const leftX = 14;
  const rightX = 14 + colWidth + 6;
  let currentY = startY + 2;

  // Box Backgrounds
  doc.setFillColor(...BG_LIGHT);
  doc.roundedRect(leftX, currentY, colWidth, 28, 2, 2, 'F');
  doc.roundedRect(rightX, currentY, colWidth, 28, 2, 2, 'F');

  // Customer Info
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text('BILLED TO (CUSTOMER):', leftX + 4, currentY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...TEXT_DARK);
  doc.text(customer?.name || customer?.full_name || order?.customer_name || 'Walk-in Customer', leftX + 4, currentY + 11.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...TEXT_MUTED);
  const phoneText = customer?.phone || order?.customer_phone ? `Phone: ${customer?.phone || order?.customer_phone}` : '';
  const codeText = customer?.customer_code ? `Code: #${customer.customer_code}` : '';
  doc.text([phoneText, codeText].filter(Boolean).join('  |  '), leftX + 4, currentY + 16.5);

  if (customer?.address) {
    const addr = doc.splitTextToSize(`Address: ${customer.address}`, colWidth - 8);
    doc.text(addr, leftX + 4, currentY + 21);
  }

  // Invoice / Order Info
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text('INVOICE / ORDER DETAILS:', rightX + 4, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...TEXT_DARK);

  const orderNum = order?.order_number || order?.orderNumber || '—';
  const orderDate = order?.created_at ? new Date(order.created_at).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN');
  const deliveryDate = order?.expected_delivery_date || order?.dueDate ? new Date(order.expected_delivery_date || order.dueDate).toLocaleDateString('en-IN') : 'Standard';
  const orderStatus = (order?.status || 'PENDING').toUpperCase();

  doc.text(`Invoice / Order #: ${orderNum}`, rightX + 4, currentY + 11.5);
  doc.text(`Date: ${orderDate}`, rightX + 4, currentY + 16.5);
  doc.text(`Delivery Date: ${deliveryDate}   |   Status: ${orderStatus}`, rightX + 4, currentY + 21.5);

  currentY += 33;

  // Compute billing items
  const orderItems = (items && items.length > 0) ? items : (order?.items || []);
  const normalizedItems = orderItems.map(item => ({
    description: item.product_name || item.description || item.name || 'Optical Item',
    sku: item.sku || '',
    hsnCode: item.hsn_code || item.hsnCode || '9003',
    quantity: Number(item.quantity || 1),
    unitPrice: Number(item.unit_price || item.unitPrice || 0),
    discount: Number(item.discount || 0),
    gstRate: Number(item.gst_rate ?? item.gstRate ?? (store?.gstin ? 12 : 0)),
  }));

  const orderDiscount = Number(order?.discount || 0);
  const isGst = Boolean(store?.gstin);
  const extraTax = Number(order?.tax || 0);

  let billing;
  try {
    billing = calculateBilling(normalizedItems, orderDiscount, isGst, extraTax);
  } catch (err) {
    const sub = normalizedItems.reduce((acc, it) => acc + (it.quantity * it.unitPrice - it.discount), 0);
    billing = {
      computedItems: normalizedItems.map(it => ({
        ...it,
        totalPrice: it.quantity * it.unitPrice - it.discount,
        taxableValue: (it.quantity * it.unitPrice - it.discount) / 1.12,
        cgstAmount: ((it.quantity * it.unitPrice - it.discount) * 0.06),
        sgstAmount: ((it.quantity * it.unitPrice - it.discount) * 0.06),
      })),
      subtotal: sub,
      discount: orderDiscount,
      tax: extraTax,
      totalAmount: sub - orderDiscount + extraTax,
      totalTaxableValue: sub / 1.12,
      totalCgst: sub * 0.06,
      totalSgst: sub * 0.06,
    };
  }

  // Items Table
  const tableHead = isGst 
    ? [['#', 'Description', 'HSN/SAC', 'Qty', 'Unit Price', 'Disc (₹)', 'Taxable (₹)', 'GST Rate', 'Amount (₹)']]
    : [['#', 'Description', 'Qty', 'Unit Price', 'Discount (₹)', 'Net Amount (₹)']];

  const tableBody = billing.computedItems.map((item, idx) => {
    if (isGst) {
      return [
        idx + 1,
        item.description + (item.sku ? ` (${item.sku})` : ''),
        item.hsnCode || '9003',
        item.quantity,
        `₹${Number(item.unitPrice).toFixed(2)}`,
        item.discount > 0 ? `₹${Number(item.discount).toFixed(2)}` : '—',
        `₹${Number(item.taxableValue).toFixed(2)}`,
        `${item.gstRate}%`,
        `₹${Number(item.totalPrice).toFixed(2)}`
      ];
    } else {
      return [
        idx + 1,
        item.description + (item.sku ? ` (${item.sku})` : ''),
        item.quantity,
        `₹${Number(item.unitPrice).toFixed(2)}`,
        item.discount > 0 ? `₹${Number(item.discount).toFixed(2)}` : '—',
        `₹${Number(item.totalPrice).toFixed(2)}`
      ];
    }
  });

  autoTable(doc, {
    startY: currentY,
    head: tableHead,
    body: tableBody,
    theme: 'striped',
    headStyles: {
      fillColor: PRIMARY_COLOR,
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'left',
      cellPadding: 2.5,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: TEXT_DARK,
      cellPadding: 2.5,
    },
    alternateRowStyles: {
      fillColor: [249, 250, 248],
    },
    columnStyles: isGst ? {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 16, halign: 'center' },
      3: { cellWidth: 10, halign: 'center' },
      4: { cellWidth: 18, halign: 'right' },
      5: { cellWidth: 16, halign: 'right' },
      6: { cellWidth: 20, halign: 'right' },
      7: { cellWidth: 16, halign: 'center' },
      8: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
    } : {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 15, halign: 'center' },
      3: { cellWidth: 25, halign: 'right' },
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
  });

  let afterTableY = doc.lastAutoTable.finalY + 4;

  // Financial Breakdown Box
  const summaryBoxWidth = 80;
  const summaryBoxX = pageWidth - 14 - summaryBoxWidth;

  // Words Section on the left
  const amountWords = amountToWords(billing.totalAmount);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text('AMOUNT IN WORDS:', 14, afterTableY + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...TEXT_DARK);
  const splitWords = doc.splitTextToSize(amountWords, summaryBoxX - 20);
  doc.text(splitWords, 14, afterTableY + 9);

  // Summary rows on the right
  const summaryRows = [
    ['Subtotal:', `₹${billing.subtotal.toFixed(2)}`],
  ];

  if (billing.discount > 0) {
    summaryRows.push(['Order Discount:', `- ₹${billing.discount.toFixed(2)}`]);
  }

  if (isGst) {
    summaryRows.push(['Taxable Value:', `₹${billing.totalTaxableValue.toFixed(2)}`]);
    summaryRows.push(['CGST:', `₹${billing.totalCgst.toFixed(2)}`]);
    summaryRows.push(['SGST:', `₹${billing.totalSgst.toFixed(2)}`]);
  } else if (billing.tax > 0) {
    summaryRows.push(['Tax:', `₹${billing.tax.toFixed(2)}`]);
  }

  const finalTotal = billing.totalAmount;
  const advancePaid = Number(order?.advance_amount || order?.advanceAmount || order?.paid_amount || 0);
  const balanceDue = Math.max(0, finalTotal - advancePaid);

  summaryRows.push(['GRAND TOTAL:', `₹${finalTotal.toFixed(2)}`]);
  summaryRows.push(['Advance Paid:', `₹${advancePaid.toFixed(2)}`]);
  summaryRows.push(['Balance Due:', `₹${balanceDue.toFixed(2)}`]);

  let sumY = afterTableY;
  doc.setFillColor(...BG_LIGHT);
  doc.roundedRect(summaryBoxX, sumY, summaryBoxWidth, summaryRows.length * 5 + 4, 2, 2, 'F');
  sumY += 4;

  summaryRows.forEach(([label, val]) => {
    const isGrand = label === 'GRAND TOTAL:';
    const isDue = label === 'Balance Due:';

    doc.setFont('helvetica', isGrand || isDue ? 'bold' : 'normal');
    doc.setFontSize(isGrand ? 9 : 8);
    doc.setTextColor(...(isDue && balanceDue > 0 ? [180, 40, 40] : isGrand ? PRIMARY_COLOR : TEXT_DARK));

    doc.text(label, summaryBoxX + 4, sumY);
    doc.text(val, summaryBoxX + summaryBoxWidth - 4, sumY, { align: 'right' });
    sumY += 5;
  });

  // Terms & Authorized Signatory Footer
  const signY = Math.max(doc.internal.pageSize.getHeight() - 32, sumY + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...TEXT_MUTED);
  doc.text('Terms & Conditions:', 14, signY);
  doc.text('1. Goods once sold cannot be returned without original invoice.', 14, signY + 4);
  doc.text('2. Please inspect spectacles and power tolerance within 7 days.', 14, signY + 7.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...TEXT_DARK);
  doc.text(`For ${store?.name || 'Optics Store'}`, pageWidth - 14, signY, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...TEXT_MUTED);
  doc.text('Authorized Signatory', pageWidth - 14, signY + 10, { align: 'right' });

  drawFooter(doc, store, 1, 1);
}

/**
 * Render Prescription section onto doc
 */
export function renderPrescriptionSection(doc, { prescription, customer, store, orderNumber }) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const startY = drawHeader(doc, store, 'VISION PRESCRIPTION', 1, 1);

  // Metadata Box (Patient details on left, Test details on right)
  const colWidth = (pageWidth - 28 - 6) / 2;
  const leftX = 14;
  const rightX = 14 + colWidth + 6;
  let currentY = startY + 2;

  // Box Backgrounds
  doc.setFillColor(...BG_LIGHT);
  doc.roundedRect(leftX, currentY, colWidth, 24, 2, 2, 'F');
  doc.roundedRect(rightX, currentY, colWidth, 24, 2, 2, 'F');

  // Patient Info
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text('PATIENT DETAILS:', leftX + 4, currentY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...TEXT_DARK);
  doc.text(customer?.name || customer?.full_name || 'Patient', leftX + 4, currentY + 11.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...TEXT_MUTED);
  const details = [];
  if (customer?.age) details.push(`Age: ${customer.age} yrs`);
  if (customer?.gender) details.push(`Gender: ${customer.gender}`);
  if (customer?.phone) details.push(`Ph: ${customer.phone}`);
  doc.text(details.join('  |  '), leftX + 4, currentY + 16.5);

  // Test / Optometrist Info — store info only (no "Examined By" / "Tested by")
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text('EXAMINATION INFO:', rightX + 4, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...TEXT_DARK);

  const testDate = prescription?.tested_at || prescription?.testedAt || prescription?.created_at;
  const formattedTestDate = testDate ? new Date(testDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('en-IN');

  doc.text(`Test Date: ${formattedTestDate}`, rightX + 4, currentY + 11.5);
  if (orderNumber) {
    doc.text(`Linked Order: #${orderNumber}`, rightX + 4, currentY + 16.5);
  }

  currentY += 30;

  // Prescription OD / OS Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text('REFRACTION POWER SPECIFICATIONS', 14, currentY);
  currentY += 4;

  const rxHead = [['Eye', 'SPH (Sphere)', 'CYL (Cylinder)', 'AXIS', 'ADD (Addition)', 'VA (Visual Acuity)']];

  const formatPower = (val) => {
    if (val === null || val === undefined || val === '') return '—';
    const num = Number(val);
    if (isNaN(num)) return val;
    return num > 0 ? `+${num.toFixed(2)}` : num.toFixed(2);
  };

  const rxBody = [
    [
      { content: 'OD (Right Eye)', styles: { fontStyle: 'bold', textColor: PRIMARY_COLOR } },
      formatPower(prescription?.r_sph ?? prescription?.sph_od ?? prescription?.sphOd),
      formatPower(prescription?.r_cyl ?? prescription?.cyl_od ?? prescription?.cylOd),
      (prescription?.r_axis ?? prescription?.axis_od ?? prescription?.axisOd) ? `${prescription?.r_axis ?? prescription?.axis_od ?? prescription?.axisOd}°` : '—',
      formatPower(prescription?.r_add ?? prescription?.add_od ?? prescription?.addOd),
      prescription?.r_va ?? prescription?.va_od ?? prescription?.vaOd ?? '6/6',
    ],
    [
      { content: 'OS (Left Eye)', styles: { fontStyle: 'bold', textColor: PRIMARY_COLOR } },
      formatPower(prescription?.l_sph ?? prescription?.sph_os ?? prescription?.sphOs),
      formatPower(prescription?.l_cyl ?? prescription?.cyl_os ?? prescription?.cylOs),
      (prescription?.l_axis ?? prescription?.axis_os ?? prescription?.axisOs) ? `${prescription?.l_axis ?? prescription?.axis_os ?? prescription?.axisOs}°` : '—',
      formatPower(prescription?.l_add ?? prescription?.add_os ?? prescription?.addOs),
      prescription?.l_va ?? prescription?.va_os ?? prescription?.vaOs ?? '6/6',
    ],
  ];

  autoTable(doc, {
    startY: currentY,
    head: rxHead,
    body: rxBody,
    theme: 'grid',
    headStyles: {
      fillColor: ACCENT_COLOR,
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold',
      halign: 'center',
      cellPadding: 3.5,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: TEXT_DARK,
      halign: 'center',
      cellPadding: 4,
    },
    columnStyles: {
      0: { cellWidth: 38, halign: 'left' },
      1: { cellWidth: 28 },
      2: { cellWidth: 28 },
      3: { cellWidth: 24 },
      4: { cellWidth: 28 },
      5: { cellWidth: 'auto' },
    },
    margin: { left: 14, right: 14 },
  });

  let rxBottomY = doc.lastAutoTable.finalY + 6;

  // Additional Details Box: Pupillary Distance (PD), Lens Type, Remarks
  const pd = prescription?.pd || prescription?.pupillary_distance;
  const lensType = prescription?.lens_type || prescription?.lensType;
  const remarks = prescription?.remarks || prescription?.notes;

  doc.setFillColor(...BG_LIGHT);
  doc.roundedRect(14, rxBottomY, pageWidth - 28, 28, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text('OPTICAL MEASUREMENTS & RECOMMENDATIONS:', 18, rxBottomY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...TEXT_DARK);

  doc.text(`Pupillary Distance (PD): ${pd ? `${pd} mm` : 'Standard'}`, 18, rxBottomY + 12);
  doc.text(`Recommended Lens: ${lensType || 'Single Vision / Anti-Reflective'}`, 18, rxBottomY + 17);

  if (remarks) {
    const splitRemarks = doc.splitTextToSize(`Doctor Notes: ${remarks}`, pageWidth - 36);
    doc.text(splitRemarks, 18, rxBottomY + 22);
  }

  // Signatory Footer — store name only, no "Examined By" / "Tested by"
  const signY = Math.max(doc.internal.pageSize.getHeight() - 32, rxBottomY + 36);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...TEXT_MUTED);
  doc.text('• Prescriptions are valid for 12 months from test date.', 14, signY);
  doc.text('• Routine annual eye checkups are strongly recommended.', 14, signY + 4);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...TEXT_DARK);
  doc.text(store?.name || 'Optics Store', pageWidth - 14, signY, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...TEXT_MUTED);
  doc.text('Authorized Signatory', pageWidth - 14, signY + 5, { align: 'right' });

  drawFooter(doc, store, 1, 1);
}

/**
 * Creates and downloads Tax Invoice PDF
 */
export function downloadInvoicePdf({ order, customer, store, items, payments }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  renderInvoiceSection(doc, { order, customer, store, items, payments });
  const filename = `Invoice_${order?.order_number || order?.orderNumber || 'Optical'}.pdf`;
  doc.save(filename);
  return filename;
}

/**
 * Creates and downloads Eye Test Prescription PDF
 */
export function downloadPrescriptionPdf({ prescription, customer, store, orderNumber }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  renderPrescriptionSection(doc, { prescription, customer, store, orderNumber });
  const custName = (customer?.name || customer?.full_name || 'Patient').replace(/\s+/g, '_');
  const filename = `Prescription_${custName}.pdf`;
  doc.save(filename);
  return filename;
}

/**
 * Creates and downloads Combined Bill + Prescription PDF (2 Pages)
 */
export function downloadBillAndPrescriptionPdf({ order, customer, store, items, payments, prescription }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  
  // Page 1: Invoice
  renderInvoiceSection(doc, { order, customer, store, items, payments });
  drawFooter(doc, store, 1, prescription ? 2 : 1);

  // Page 2: Prescription (if present)
  if (prescription) {
    doc.addPage();
    renderPrescriptionSection(doc, { prescription, customer, store, orderNumber: order?.order_number || order?.orderNumber });
    drawFooter(doc, store, 2, 2);
  }

  const filename = `Bill_Prescription_${order?.order_number || order?.orderNumber || 'Order'}.pdf`;
  doc.save(filename);
  return filename;
}
