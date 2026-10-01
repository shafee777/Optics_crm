// Browser QA with synthetic data. Run preview on port 4173 first.
// PLAYWRIGHT_MODULE may point to a bundled Playwright installation.
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const out = resolve('work/pdf-verification');
mkdirSync(out, { recursive: true });
const rx = { id: '7', tested_at: '2026-10-01', tested_by_name: 'Dr. Example', r_sph: -1.75, r_cyl: -0.5, r_axis: 90, r_add: 2, r_va: '6/6', l_sph: -2, l_cyl: -0.75, l_axis: 80, l_add: 2, l_va: '6/6', pd: 62, notes: 'Use for reading and distance.', lens_type: 'Progressive' };
const customer = { id: '2', full_name: 'Sample Customer', phone: '9876543210', customer_code: 'C-002', age: 45, gender: 'Female' };
const order = { id: '1', prescription_id: 7, customer_id: '2', customer_name: customer.full_name, customer_phone: customer.phone, customer_code: customer.customer_code, order_number: 'QA-001', status: 'PENDING', order_date: '2026-10-01', due_date: '2026-10-04', subtotal: 3000, total_taxable_value: 2678.58, total_cgst: 160.71, total_sgst: 160.71, total_amount: 3000, total_paid: 1000, balance_due: 2000, is_gst_bill: true, items: [{ id: 1, description: 'Progressive lens', item_type: 'LENS', quantity: 2, unit_price: 1500, total_price: 3000, taxable_value: 2678.58, cgst_amount: 160.71, sgst_amount: 160.71, gst_rate: 12, hsn_code: '9001' }], payments: [] };
const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 1100 } });
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));
  await page.addInitScript(() => {
    localStorage.setItem('optics_token', 'qa-token');
    localStorage.setItem('optics_user', JSON.stringify({ id: 'qa', role: 'OWNER', store: { name: 'Example Optics', address: '12 Example Road, Bengaluru', phone: '9876543210', gstin: '29EXAMPLE1234Z5' } }));
  });
  await page.route('**/api/**', route => {
    const url = new URL(route.request().url());
    const data = url.pathname.endsWith('/prescriptions') ? [rx] : url.pathname.endsWith('/customers/2') ? customer : url.pathname.endsWith('/orders/1') ? order : url.pathname.endsWith('/movements') ? [
      { id: '2', created_at: '2026-10-01T09:00:00Z', quantity_change: -2, balance_after: 7, reason: 'ORDER_SALE_QA_001' },
      { id: '1', created_at: '2026-10-01T08:00:00Z', quantity_change: 9, balance_after: 9, reason: 'OPENING_BALANCE' }
    ] : url.pathname.endsWith('/products') ? [{ id: '1', name: 'Sample Frame', item_type: 'FRAME', stock_quantity: 7, selling_price: 1000, purchase_price: 500 }] : [];
    return route.fulfill({ json: { data } });
  });
  async function capture(name) {
    await page.emulateMedia({ media: 'print' });
    await page.evaluate(async () => { await document.fonts.ready; await Promise.all(Array.from(document.images).map(i => i.decode().catch(() => {}))); });
    await page.pdf({ path: resolve(out, name + '.pdf'), format: 'A4', printBackground: true });
    await page.screenshot({ path: resolve(out, name + '.png'), fullPage: true });
    await page.emulateMedia({ media: 'screen' });
  }
  await page.goto('http://127.0.0.1:4173/customers/2');
  await page.getByText('Print Rx / Save as PDF', { exact: true }).click();
  await capture('prescription-print');
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await page.getByText('Save Rx PDF + WhatsApp', { exact: true }).click();
  assert(!/SPH|CYL|-1.75/.test(await page.getByRole('textbox').inputValue()));
  await capture('prescription-share');
  await page.goto('http://127.0.0.1:4173/orders/1');
  await page.getByText('Print Invoice / Save as PDF', { exact: true }).click();
  await page.getByText('Eyeglass Prescription (Power Refraction)').waitFor();
  await capture('invoice-print');
  await page.getByText('Back to Order Details', { exact: true }).click();
  await page.getByText('Download Bill+Rx PDF', { exact: true }).click();
  await capture('invoice-download');
  await page.getByText('Back to Order Details', { exact: true }).click();
  await page.getByText('Save PDF + Open WhatsApp Draft', { exact: true }).click();
  await capture('invoice-share');
  await page.goto('http://127.0.0.1:4173/inventory');
  await page.getByText('History', { exact: true }).click();
  await page.getByText('OUT -2', { exact: true }).waitFor();
  await page.setViewportSize({ width: 375, height: 900 });
  const section = page.getByRole('region', { name: 'Inventory movement history' });
  await section.scrollIntoViewIfNeeded();
  const bounds = await section.boundingBox();
  assert(bounds.x >= 0 && bounds.x + bounds.width <= 375, 'History must fit a narrow screen');
  assert(await section.evaluate(el => el.scrollWidth <= el.clientWidth), 'History must not overflow horizontally');
  await section.screenshot({ path: resolve(out, 'inventory-mobile.png') });
  assert.deepEqual(pageErrors, []);
  console.log('Browser QA passed: 5 print-layout PDFs generated; prescription and invoice print/download/share paths exercised; inventory fits 375px.');
} finally { await browser.close(); }
