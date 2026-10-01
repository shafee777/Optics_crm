import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PdfSaveActions from '../src/components/common/PdfSaveActions.jsx';
import InventoryHistory from '../src/features/products/InventoryHistory.jsx';
import { sortMovements, reasonLabel } from '../src/lib/inventoryHistory.js';
import OrderDetailsPage from '../src/features/orders/OrderDetailsPage.jsx';
import CustomerDetailsPage from '../src/features/customers/CustomerDetailsPage.jsx';
import { prescriptionAvailability, printMatchingPdf, openPdfWhatsApp, pdfDraftMessage } from '../src/lib/printPdf.js';
import api from '../src/services/api.js';
vi.mock('../src/services/api.js', () => ({ default: { get: vi.fn() } }));
vi.mock('../src/features/auth/AuthContext.jsx', () => ({ useAuth: () => ({ user: { store: { name: 'Test Optics' } } }) }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); api.get.mockReset(); });
const rx = { id: '7', r_sph: -1.75, l_sph: -2, pd: 62 };
const order = { id: '1', prescription_id: 7, customer_id: '2', customer_name: 'Customer', customer_phone: '9876543210', order_number: 'TEST-1', status: 'PENDING', order_date: '2026-10-01', due_date: '2026-10-04', total_amount: 100, total_paid: 0, balance_due: 100, items: [], payments: [] };
const orderPage = () => render(<MemoryRouter initialEntries={['/orders/1']}><Routes><Route path="/orders/:id" element={<OrderDetailsPage />} /></Routes></MemoryRouter>);
describe('matching PDF actions', () => {
  it('blocks loading, failed, missing and stale linked prescriptions; permits invoice-only only without a link', () => {
    expect(prescriptionAvailability(order, null, 'loading')).toMatch(/loading/);
    expect(prescriptionAvailability(order, null, 'error')).toMatch(/Retry/);
    expect(prescriptionAvailability(order, null, 'ready')).toMatch(/unavailable/);
    expect(prescriptionAvailability(order, { id: 8 }, 'ready')).toMatch(/unavailable/);
    expect(prescriptionAvailability(order, rx, 'ready')).toBe('');
    expect(prescriptionAvailability({}, null, 'ready')).toBe('');
  });
  it('waits for fonts and images before printing and propagates print failures', async () => {
    const calls = [];
    await printMatchingPdf(() => calls.push('print'), { fonts: { ready: Promise.resolve() }, images: [{ decode: async () => { calls.push('image'); } }] });
    expect(calls).toEqual(['image', 'print']);
    await expect(printMatchingPdf(() => { throw Error('unavailable'); }, {})).rejects.toThrow('unavailable');
  });
  it('opens the correct editable chat; rejects invalid, offline and blocked actions', () => {
    const popup = { location: {}, opener: {} };
    const browser = { open: vi.fn(() => popup), navigator: { onLine: true } };
    openPdfWhatsApp('98765 43210', 'Hello & welcome', browser);
    expect(popup.location.href).toBe('https://wa.me/919876543210?text=Hello%20%26%20welcome');
    expect(popup.opener).toBeNull();
    expect(() => openPdfWhatsApp('', 'test', browser)).toThrow(/valid/);
    expect(() => openPdfWhatsApp('9876543210', '', { navigator: { onLine: false } })).toThrow(/internet/);
    expect(() => openPdfWhatsApp('9876543210', '', { open: () => null })).toThrow(/blocked/);
    expect(pdfDraftMessage({ customerName: 'Customer', prescription: rx })).not.toMatch(/SPH|CYL|-1.75|attached|sent/);
  });
  it('uses a print dialog and never asserts that a file was saved; supports edit and failure feedback', async () => {
    vi.spyOn(window, 'print').mockImplementation(() => {});
    render(<PdfSaveActions share phone="9876543210" customerName="Customer" />);
    expect(screen.getByText(/I saved the PDF/).disabled).toBe(true);
    fireEvent.click(screen.getByText('Print / Save as PDF'));
    await screen.findByRole('status');
    expect(screen.getByRole('status').textContent).toMatch(/cannot confirm/);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Edited message' } });
    vi.spyOn(window, 'open').mockReturnValue(null);
    fireEvent.click(screen.getByText(/I saved the PDF/));
    expect(screen.getByRole('alert').textContent).toMatch(/blocked/);
  });
  it('opens an edited WhatsApp draft after the save step and reports manual attachment', async () => {
    vi.spyOn(window, 'print').mockImplementation(() => {});
    const popup = { location: {} };
    vi.spyOn(window, 'open').mockReturnValue(popup);
    render(<PdfSaveActions share phone="9876543210" />);
    fireEvent.click(screen.getByText('Print / Save as PDF'));
    await screen.findByRole('status');
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Custom draft' } });
    fireEvent.click(screen.getByText(/I saved the PDF/));
    expect(popup.location.href).toContain('text=Custom%20draft');
    expect(screen.getByRole('status').textContent).toMatch(/Manually attach/);
  });
  it('reports print failure and keeps WhatsApp gated', async () => {
    vi.spyOn(window, 'print').mockImplementation(() => { throw Error(); });
    render(<PdfSaveActions share />);
    fireEvent.click(screen.getByText('Print / Save as PDF'));
    expect((await screen.findByRole('alert')).textContent).toMatch(/Could not open/);
    expect(screen.getByText(/I saved the PDF/).disabled).toBe(true);
  });
  it('order Bill+Rx waits for linked data and renders the existing invoice prescription chart', async () => {
    let resolveRx;
    api.get.mockImplementation(url => url.includes('prescriptions') ? new Promise(resolve => { resolveRx = resolve; }) : Promise.resolve({ data: { data: order } }));
    orderPage();
    fireEvent.click(await screen.findByText('Download Bill+Rx PDF'));
    expect(await screen.findByText(/still loading/)).toBeTruthy();
    expect(screen.getByText('Print / Save as PDF').disabled).toBe(true);
    resolveRx({ data: { data: [rx] } });
    expect(await screen.findByText(/Eyeglass Prescription/)).toBeTruthy();
    expect(screen.getByText('-1.75')).toBeTruthy();
  });
  it('failed linked prescription requests show retry and block saving', async () => {
    api.get.mockImplementation(url => url.includes('prescriptions') ? Promise.reject(Error('network')) : Promise.resolve({ data: { data: order } }));
    orderPage();
    fireEvent.click(await screen.findByText('Download Bill+Rx PDF'));
    await screen.findByText(/Could not load the linked prescription/);
    expect(screen.getByText('Print / Save as PDF').disabled).toBe(true);
    expect(screen.queryByText('Billed To (Customer)')).toBeNull();
  });
  it('order missing Rx offers retry without rendering an invoice-only document', async () => {
    api.get.mockImplementation(url => Promise.resolve({ data: { data: url.includes('prescriptions') ? [] : order } }));
    orderPage();
    fireEvent.click(await screen.findByText('Download Bill+Rx PDF'));
    await screen.findByText(/linked prescription is unavailable/);
    expect(screen.queryByText('Billed To (Customer)')).toBeNull();
    api.get.mockImplementation(url => Promise.resolve({ data: { data: url.includes('prescriptions') ? [rx] : order } }));
    fireEvent.click(screen.getByText('Retry prescription'));
    await screen.findByText(/Eyeglass Prescription/);
  });
  it('customer removes Download PDF and shares through the existing prescription view', async () => {
    api.get.mockImplementation(url => Promise.resolve({ data: { data: url.endsWith('/customers/2') ? { id: 2, full_name: 'Customer', phone: '9876543210' } : url.includes('prescriptions') ? [rx] : [] } }));
    render(<MemoryRouter initialEntries={['/customers/2']}><Routes><Route path="/customers/:id" element={<CustomerDetailsPage />} /></Routes></MemoryRouter>);
    await screen.findByText('Print Rx / Save as PDF');
    expect(screen.queryByText('Download PDF')).toBeNull();
    fireEvent.click(screen.getByText('Save Rx PDF + WhatsApp'));
    expect(screen.getByText('OFFICIAL VISION PRESCRIPTION')).toBeTruthy();
    expect(screen.getByText('-1.75')).toBeTruthy();
    expect(screen.getByRole('textbox').value).not.toMatch(/-1.75|SPH/);
  });
});
describe('inventory history', () => {
  it('orders by timestamp then numeric ID without mutating data and formats reasons', () => {
    const rows = [{ id: '10', created_at: '2026-01-01' }, { id: '2', created_at: '2026-01-01' }, { id: '1', created_at: '2026-02-01' }];
    expect(sortMovements(rows).map(r => r.id)).toEqual(['1', '10', '2']);
    expect(rows[0].id).toBe('10');
    expect(reasonLabel('OPENING_BALANCE')).toBe('Opening Balance');
  });
  it('shows loading, failure and retry then empty', async () => {
    api.get.mockRejectedValueOnce(Error('network')).mockResolvedValueOnce({ data: { data: [] } });
    render(<InventoryHistory product={{ id: 1, name: 'Frame' }} onClose={() => {}} />);
    expect(screen.getByRole('status').textContent).toMatch(/Loading/);
    await screen.findByRole('alert');
    fireEvent.click(screen.getByText('Retry'));
    await screen.findByText('No stock movements recorded yet.');
  });
  it('shows readable reasons, time, signed movements and balances with distinct colors', async () => {
    api.get.mockResolvedValue({ data: { data: [ { id: 1, created_at: '2026-10-01T08:00:00Z', quantity_change: 4, balance_after: 9, reason: 'OPENING_BALANCE' }, { id: 2, created_at: '2026-10-01T09:00:00Z', quantity_change: -2, balance_after: 7, reason: 'ORDER_SALE' } ] } });
    const close = vi.fn();
    render(<InventoryHistory product={{ id: 1, name: 'Frame' }} onClose={close} />);
    expect((await screen.findByText('IN +4')).className).toContain('emerald');
    expect(screen.getByText('OUT -2').className).toContain('rose');
    expect(screen.getAllByRole('listitem')[0].textContent).toContain('Order Sale');
    expect(screen.getByText('Opening Balance')).toBeTruthy();
    expect(screen.getByText('7')).toBeTruthy();
    fireEvent.click(screen.getByText('Close history')); expect(close).toHaveBeenCalled();
  });
});
