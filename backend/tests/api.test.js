import test from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/config/database.js';

const request = supertest(app);

test.after(async () => {
  await pool.end();
});

test('GET /health/live returns 200 UP', async () => {
  const res = await request.get('/health/live');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'UP');
});

test('GET /health/ready returns 200 CONNECTED when DB is healthy', async () => {
  const res = await request.get('/health/ready');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'READY');
  assert.equal(res.body.database, 'CONNECTED');
});

test('Auth: Valid login returns JWT token and store details', async () => {
  const res = await request.post('/api/v1/auth/login').send({
    email: 'owner@visioncare.com',
    password: 'Password123!',
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(res.body.data.token);
  assert.equal(res.body.data.user.store.name, 'Vision Care Opticals');
});

test('Auth: Invalid password returns 401 Unauthorized', async () => {
  const res = await request.post('/api/v1/auth/login').send({
    email: 'owner@visioncare.com',
    password: 'WrongPassword!',
  });

  assert.equal(res.status, 401);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error.code, 'INVALID_CREDENTIALS');
});

test('Multi-Tenant Isolation: Store B user cannot fetch Store A data', async () => {
  // Login Store B owner (City Eye Optics)
  const loginB = await request.post('/api/v1/auth/login').send({
    email: 'owner@cityeye.com',
    password: 'Password123!',
  });

  const tokenB = loginB.body.data.token;

  // Try to access customer list for Store B
  const resB = await request
    .get('/api/v1/customers')
    .set('Authorization', `Bearer ${tokenB}`);

  assert.equal(resB.status, 200);
  // Store B should only see City Eye customer, not Vision Care customer
  const names = resB.body.data.map((c) => c.full_name);
  assert.ok(!names.includes('Ravi Kumar'));
});

test('Role Isolation: Staff is forbidden (403) from accessing financial sales reports & revenue summary', async () => {
  // Login Staff user
  const staffLogin = await request.post('/api/v1/auth/login').send({
    email: 'staff@visioncare.com',
    password: 'Password123!',
  });
  const staffToken = staffLogin.body.data.token;
  assert.equal(staffLogin.body.data.user.role, 'STAFF');

  // Attempt to access reports/sales
  const reportsRes = await request
    .get('/api/v1/reports/sales?period=day')
    .set('Authorization', `Bearer ${staffToken}`);

  assert.equal(reportsRes.status, 403);
  assert.equal(reportsRes.body.success, false);
  assert.equal(reportsRes.body.error.code, 'FORBIDDEN');

  // Attempt to access expenses/summary (cash position & sales total)
  const summaryRes = await request
    .get('/api/v1/expenses/summary')
    .set('Authorization', `Bearer ${staffToken}`);

  assert.equal(summaryRes.status, 403);
  assert.equal(summaryRes.body.success, false);
  assert.equal(summaryRes.body.error.code, 'FORBIDDEN');
});

test('Role Access: Owner can fetch daily, monthly, and yearly sales reports with customer drill-downs', async () => {
  // Login Owner user
  const ownerLogin = await request.post('/api/v1/auth/login').send({
    email: 'owner@visioncare.com',
    password: 'Password123!',
  });
  const ownerToken = ownerLogin.body.data.token;
  assert.equal(ownerLogin.body.data.user.role, 'OWNER');

  // 1. Daily sales report
  const dailyRes = await request
    .get('/api/v1/reports/sales?period=day&date=2026-09-17')
    .set('Authorization', `Bearer ${ownerToken}`);

  assert.equal(dailyRes.status, 200);
  assert.equal(dailyRes.body.success, true);
  assert.ok('totalSales' in dailyRes.body.data);
  assert.ok(Array.isArray(dailyRes.body.data.transactions));

  // 2. Monthly sales report
  const monthlyRes = await request
    .get('/api/v1/reports/sales?period=month&month=2026-09')
    .set('Authorization', `Bearer ${ownerToken}`);

  assert.equal(monthlyRes.status, 200);
  assert.equal(monthlyRes.body.success, true);
  assert.ok('days' in monthlyRes.body.data);
  assert.ok(Array.isArray(monthlyRes.body.data.days));
  assert.equal(monthlyRes.body.data.days.length, 30); // September has 30 days

  // 3. Yearly sales report
  const yearlyRes = await request
    .get('/api/v1/reports/sales?period=year&year=2026')
    .set('Authorization', `Bearer ${ownerToken}`);

  assert.equal(yearlyRes.status, 200);
  assert.equal(yearlyRes.body.success, true);
  assert.ok('months' in yearlyRes.body.data);
  assert.ok(Array.isArray(yearlyRes.body.data.months));
  assert.equal(yearlyRes.body.data.months.length, 12); // 12 months
});

test('Role Operations: Staff can record and view expenses ledger', async () => {
  const staffLogin = await request.post('/api/v1/auth/login').send({
    email: 'staff@visioncare.com',
    password: 'Password123!',
  });
  const staffToken = staffLogin.body.data.token;

  // 1. Record expense
  const createExpRes = await request
    .post('/api/v1/expenses')
    .set('Authorization', `Bearer ${staffToken}`)
    .send({
      category: 'Supplier/Lab',
      amount: 450,
      paymentMethod: 'UPI',
      note: 'Lab edging fee for CUST-1001',
    });

  assert.equal(createExpRes.status, 201);
  assert.equal(createExpRes.body.success, true);
  assert.equal(createExpRes.body.data.amount, '450.00');

  // 2. Fetch expenses list
  const listExpRes = await request
    .get('/api/v1/expenses')
    .set('Authorization', `Bearer ${staffToken}`);

  assert.equal(listExpRes.status, 200);
  assert.ok(Array.isArray(listExpRes.body.data));
  assert.ok(listExpRes.body.data.some((e) => e.note === 'Lab edging fee for CUST-1001'));
});
