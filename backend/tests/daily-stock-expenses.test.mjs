import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDailyStockExpenseSchema,
  updatePaymentSchema,
  listDailyStockExpenseSchema,
} from '../src/modules/daily_stock_expenses/dailyStockExpense.schema.js';

test('createDailyStockExpenseSchema validates valid LENS entry', () => {
  const payload = {
    body: {
      category: 'LENS',
      companyName: 'Kamal Trichy',
      brandDetails: 'Crizal Alize',
      stockNotes: '10 pairs -2.50 CYL -0.50',
      billDate: '2026-11-18',
      totalAmount: 15000,
      paidAmount: 5000,
      paymentMethod: 'CASH',
      invoiceNumber: 'INV-KT-001',
    },
  };
  const parsed = createDailyStockExpenseSchema.parse(payload);
  assert.equal(parsed.body.category, 'LENS');
  assert.equal(parsed.body.companyName, 'Kamal Trichy');
  assert.equal(parsed.body.totalAmount, 15000);
  assert.equal(parsed.body.paidAmount, 5000);
});

test('createDailyStockExpenseSchema validates valid FRAME entry', () => {
  const payload = {
    body: {
      category: 'FRAME',
      companyName: 'Marko Lens',
      brandDetails: 'Titan Frames',
      totalAmount: 10000,
      paidAmount: 10000,
    },
  };
  const parsed = createDailyStockExpenseSchema.parse(payload);
  assert.equal(parsed.body.category, 'FRAME');
  assert.equal(parsed.body.totalAmount, 10000);
  assert.equal(parsed.body.paidAmount, 10000);
});

test('createDailyStockExpenseSchema rejects invalid category and negative amounts', () => {
  assert.throws(() => {
    createDailyStockExpenseSchema.parse({
      body: {
        category: 'INVALID',
        companyName: 'Kamal',
        totalAmount: 100,
      },
    });
  });

  assert.throws(() => {
    createDailyStockExpenseSchema.parse({
      body: {
        category: 'LENS',
        companyName: 'Kamal',
        totalAmount: -50,
      },
    });
  });

  assert.throws(() => {
    createDailyStockExpenseSchema.parse({
      body: {
        category: 'LENS',
        companyName: '',
        totalAmount: 100,
      },
    });
  });
});

test('updatePaymentSchema validates positive or zero paid amounts', () => {
  const valid = updatePaymentSchema.parse({
    params: { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' },
    body: { paidAmount: 1250.50, paymentMethod: 'UPI', notes: 'Paid via GPay' },
  });
  assert.equal(valid.body.paidAmount, 1250.50);
  assert.equal(valid.body.paymentMethod, 'UPI');

  assert.throws(() => {
    updatePaymentSchema.parse({
      params: { id: 'invalid-uuid' },
      body: { paidAmount: 50 },
    });
  });

  assert.throws(() => {
    updatePaymentSchema.parse({
      params: { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' },
      body: { paidAmount: -10 },
    });
  });
});

test('listDailyStockExpenseSchema parses filter defaults correctly', () => {
  const parsed = listDailyStockExpenseSchema.parse({
    query: {
      month: '2026-11',
    },
  });
  assert.equal(parsed.query.category, 'ALL');
  assert.equal(parsed.query.month, '2026-11');
  assert.equal(parsed.query.page, 1);
  assert.equal(parsed.query.limit, 50);
});
