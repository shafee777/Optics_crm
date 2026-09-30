import test from 'node:test';
import assert from 'node:assert/strict';
import { amountToWords } from '../../shared/amountToWords.mjs';
import { calculateBilling } from '../../shared/billing.mjs';

test('amountToWords converts various Indian currency amounts accurately', () => {
  assert.equal(amountToWords(0), 'Rupees Zero Only');
  assert.equal(amountToWords(5), 'Rupees Five Only');
  assert.equal(amountToWords(18), 'Rupees Eighteen Only');
  assert.equal(amountToWords(250), 'Rupees Two Hundred Fifty Only');
  assert.equal(amountToWords(1500), 'Rupees One Thousand Five Hundred Only');
  assert.equal(amountToWords(15420.50), 'Rupees Fifteen Thousand Four Hundred Twenty and Fifty Paise Only');
  assert.equal(amountToWords(100000), 'Rupees One Lakh Only');
  assert.equal(amountToWords(12500000), 'Rupees One Crore Twenty Five Lakh Only');
  assert.equal(amountToWords(0.75), 'Seventy Five Paise Only');
});

test('calculateBilling matches PDF invoice breakdown structure', () => {
  const items = [
    { description: 'Anti-Glare Progressive Lens', quantity: 2, unitPrice: 2500, gstRate: 12 },
    { description: 'Titanium Eyeglass Frame', quantity: 1, unitPrice: 3500, gstRate: 18 },
  ];
  const orderDiscount = 500;
  const result = calculateBilling(items, orderDiscount, true);

  assert.equal(result.subtotal, 8500);
  assert.equal(result.discount, 500);
  assert.equal(result.totalAmount, 8000);
  assert.equal(
    Math.round((result.totalTaxableValue + result.totalCgst + result.totalSgst) * 100) / 100,
    result.totalAmount
  );
  assert.equal(amountToWords(result.totalAmount), 'Rupees Eight Thousand Only');
});

test('prescription power values and visual acuity mapping are handled cleanly', () => {
  const formatPower = (val) => {
    if (val === null || val === undefined || val === '') return '—';
    const num = Number(val);
    if (isNaN(num)) return val;
    return num > 0 ? `+${num.toFixed(2)}` : num.toFixed(2);
  };

  const rx = {
    r_sph: -1.75,
    r_cyl: 0.5,
    r_axis: 90,
    r_add: 2,
    l_sph: -2.0,
    l_cyl: null,
    l_axis: '',
    l_add: 2.0,
  };

  assert.equal(formatPower(rx.r_sph), '-1.75');
  assert.equal(formatPower(rx.r_cyl), '+0.50');
  assert.equal(formatPower(rx.l_cyl), '—');
  assert.equal(formatPower(rx.r_add), '+2.00');
});
