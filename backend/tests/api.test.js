import test from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/config/database.js';

const request = supertest(app);

test('List query validation rejects malformed filters and pagination', async () => {
  const login = await request.post('/api/v1/auth/login').send({ email: 'owner@visioncare.com', password: 'Password123!' });
  assert.equal(login.status, 200);
  for (const route of [
    '/products?limit=2x', '/products?limit=-1', '/products?limit=1001',
    '/products?offset=1.5', '/products?lowStockOnly=yes', '/products?itemType=INVALID',
    '/products?search[x]=bad', '/orders?status=INVALID', '/orders?page=1.5', '/customers?limit=2.5',
  ]) {
    const response = await request.get('/api/v1' + route).set('Authorization', `Bearer ${login.body.data.token}`);
    assert.equal(response.status, 400, route);
    assert.equal(response.body.error.code, 'VALIDATION_ERROR', route);
  }
  const valid = await request.get('/api/v1/products?limit=200&offset=0&lowStockOnly=false').set('Authorization', `Bearer ${login.body.data.token}`);
  assert.equal(valid.status, 200);
});

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
  assert.ok(res.body.data.user.store.name);
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

test('Auth: refresh tokens rotate and logout revokes the active session', async () => {
  const loginRes = await request.post('/api/v1/auth/login').send({
    email: 'owner@visioncare.com',
    password: 'Password123!',
  });
  const firstRefreshToken = loginRes.body.data.refreshToken;

  const refreshRes = await request.post('/api/v1/auth/refresh').send({
    refreshToken: firstRefreshToken,
  });
  assert.equal(refreshRes.status, 200);
  assert.ok(refreshRes.body.data.accessToken);
  assert.notEqual(refreshRes.body.data.refreshToken, firstRefreshToken);

  const reusedRes = await request.post('/api/v1/auth/refresh').send({
    refreshToken: firstRefreshToken,
  });
  assert.equal(reusedRes.status, 401);
  assert.equal(reusedRes.body.error.code, 'REFRESH_TOKEN_REVOKED');

  const logoutRes = await request.post('/api/v1/auth/logout').send({
    refreshToken: refreshRes.body.data.refreshToken,
  });
  assert.equal(logoutRes.status, 204);

  const revokedRes = await request.post('/api/v1/auth/refresh').send({
    refreshToken: refreshRes.body.data.refreshToken,
  });
  assert.equal(revokedRes.status, 401);
  assert.equal(revokedRes.body.error.code, 'REFRESH_TOKEN_REVOKED');
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

test('Payment: prevents overpayment beyond remaining balance', async () => {
  const ownerLogin = await request.post('/api/v1/auth/login').send({
    email: 'owner@visioncare.com',
    password: 'Password123!',
  });
  const ownerToken = ownerLogin.body.data.token;

  const customerRes = await request
    .get('/api/v1/customers')
    .set('Authorization', `Bearer ${ownerToken}`);

  const customerId = customerRes.body.data[0].id;

  const orderRes = await request
    .post('/api/v1/orders')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({
      customerId,
      dueDate: '2026-10-10',
      items: [
        {
          itemType: 'FRAME',
          description: 'Payment guard test frame',
          quantity: 1,
          unitPrice: 1500,
          discount: 0,
        },
      ],
      notes: 'Overpayment integrity check',
    });

  assert.equal(orderRes.status, 201);
  const orderId = orderRes.body.data.id;

  const paymentRes = await request
    .post(`/api/v1/orders/${orderId}/payments`)
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({
      amount: 3500,
      paymentMethod: 'CASH',
      notes: 'should fail',
    });

  assert.equal(paymentRes.status, 400);
  assert.equal(paymentRes.body.success, false);
  assert.equal(paymentRes.body.error.code, 'OVERPAYMENT_NOT_ALLOWED');
});

test('Payment: settles a READY_FOR_PICKUP order and marks it DELIVERED in the same transaction', async () => {
  const ownerLogin = await request.post('/api/v1/auth/login').send({
    email: 'owner@visioncare.com',
    password: 'Password123!',
  });
  const ownerToken = ownerLogin.body.data.token;

  const customerRes = await request
    .get('/api/v1/customers')
    .set('Authorization', `Bearer ${ownerToken}`);

  const customerId = customerRes.body.data[0].id;

  const orderRes = await request
    .post('/api/v1/orders')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({
      customerId,
      dueDate: '2026-10-12',
      items: [
        {
          itemType: 'LENS',
          description: 'Delivery transaction lens test',
          quantity: 1,
          unitPrice: 2200,
          discount: 0,
        },
      ],
      notes: 'Delivery transaction check',
    });

  assert.equal(orderRes.status, 201);
  const orderId = orderRes.body.data.id;

  const readyRes = await request
    .patch(`/api/v1/orders/${orderId}/status`)
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ status: 'PROCESSING' });

  assert.equal(readyRes.status, 200);

  const readyForPickupRes = await request
    .patch(`/api/v1/orders/${orderId}/status`)
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ status: 'READY_FOR_PICKUP' });

  assert.equal(readyForPickupRes.status, 200);

  const paymentRes = await request
    .post(`/api/v1/orders/${orderId}/payments`)
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({
      amount: 2200,
      paymentMethod: 'CARD',
      markDelivered: true,
      notes: 'Payment and delivery should happen together',
    });

  assert.equal(paymentRes.status, 201);
  assert.equal(paymentRes.body.success, true);
  assert.equal(paymentRes.body.data.order.status, 'DELIVERED');
  assert.equal(paymentRes.body.data.payment.amount, '2200.00');
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

test('Stage 2: Products CRUD and Stock Adjustment', async () => {
  const loginRes = await request.post('/api/v1/auth/login').send({
    email: 'owner@visioncare.com',
    password: 'Password123!',
  });
  const token = loginRes.body.data.token;

  // 1. Create a Product in Stock
  const createProdRes = await request
    .post('/api/v1/products')
    .set('Authorization', `Bearer ${token}`)
    .send({
      itemType: 'FRAME',
      brand: 'Ray-Ban',
      modelCode: 'RB3025-GOLD',
      name: 'Aviator Classic 58mm',
      sellingPrice: 4500,
      costPrice: 2800,
      stockQuantity: 10,
      minStockAlert: 2,
    });

  assert.equal(createProdRes.status, 201);
  assert.equal(createProdRes.body.success, true);
  const productId = createProdRes.body.data.id;
  assert.equal(createProdRes.body.data.stock_quantity, 10);

  // 2. Adjust Stock (+5)
  const adjustRes = await request
    .patch(`/api/v1/products/${productId}/stock`)
    .set('Authorization', `Bearer ${token}`)
    .send({ adjustment: 5 });

  assert.equal(adjustRes.status, 200);
  assert.equal(adjustRes.body.data.stock_quantity, 15);

  // 3. List Products by Category
  const listRes = await request
    .get('/api/v1/products?itemType=FRAME')
    .set('Authorization', `Bearer ${token}`);

  assert.equal(listRes.status, 200);
  assert.ok(listRes.body.data.some((p) => p.id === productId));
});

test('Stage 2: Order Creation decrements selected stock and leaves custom lines untracked', async () => {
  const loginRes = await request.post('/api/v1/auth/login').send({
    email: 'owner@visioncare.com',
    password: 'Password123!',
  });
  const token = loginRes.body.data.token;

  // 1. Create a customer
  const dynamicPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
  const custRes = await request
    .post('/api/v1/customers')
    .set('Authorization', `Bearer ${token}`)
    .send({
      fullName: 'Vikram Singh',
      phone: dynamicPhone,
    });
  const customerId = custRes.body.data.id;

  // 2. Create in-stock product
  const prodRes = await request
    .post('/api/v1/products')
    .set('Authorization', `Bearer ${token}`)
    .send({
      itemType: 'FRAME',
      name: 'Fastrack Sporty Black',
      sellingPrice: 1800,
      stockQuantity: 5,
    });
  const inStockProductId = prodRes.body.data.id;

  // 3. Create Order with 1 in-stock item + 1 on-the-fly custom item
  const uniqueCustomLens = `Essilor Crizal Sapphire ${Date.now()}`;
  const orderRes = await request
    .post('/api/v1/orders')
    .set('Authorization', `Bearer ${token}`)
    .send({
      customerId,
      dueDate: '2026-10-01',
      items: [
        {
          productId: inStockProductId,
          itemType: 'FRAME',
          description: 'Fastrack Sporty Black',
          quantity: 2,
          unitPrice: 1800,
          discount: 0,
        },
        {
          itemType: 'LENS',
          description: uniqueCustomLens,
          quantity: 1,
          unitPrice: 2500,
          discount: 0,
        },
      ],
      advancePayment: {
        amount: 1500,
        paymentMethod: 'UPI',
      },
    });

  assert.equal(orderRes.status, 201);
  assert.equal(orderRes.body.success, true);
  assert.equal(orderRes.body.data.total_amount, '6100.00');

  // 4. Verify in-stock product decreased from 5 -> 3
  const getProdRes = await request
    .get(`/api/v1/products/${inStockProductId}`)
    .set('Authorization', `Bearer ${token}`);
  assert.equal(getProdRes.body.data.stock_quantity, 3);

  // 5. Custom lines must not silently create negative-stock catalog entries
  const searchProdRes = await request
    .get(`/api/v1/products?search=${encodeURIComponent(uniqueCustomLens)}`)
    .set('Authorization', `Bearer ${token}`);
  assert.equal(searchProdRes.status, 200);
  assert.equal(searchProdRes.body.data.length, 0);
});

test('Stage 2: 1-Year Annual Eye Test Recall endpoint returns eligible customers', async () => {
  const loginRes = await request.post('/api/v1/auth/login').send({
    email: 'owner@visioncare.com',
    password: 'Password123!',
  });
  const token = loginRes.body.data.token;
  const storeId = loginRes.body.data.user.store.id;

  // 1. Create a customer
  const recallPhone = `97${Math.floor(10000000 + Math.random() * 90000000)}`;
  const custRes = await request
    .post('/api/v1/customers')
    .set('Authorization', `Bearer ${token}`)
    .send({
      fullName: 'Old Test Customer',
      phone: recallPhone,
    });
  const customerId = custRes.body.data.id;

  // 2. Insert a prescription with tested_at 350 days ago
  await pool.query(
    `INSERT INTO prescriptions (
      store_id, customer_id, r_sph, l_sph, pd, tested_at
    ) VALUES ($1, $2, -1.50, -1.25, 62, NOW() - INTERVAL '350 days');`,
    [storeId, customerId]
  );

  // 3. Call due-reminders endpoint
  const dueRes = await request
    .get('/api/v1/customers/due-reminders')
    .set('Authorization', `Bearer ${token}`);

  assert.equal(dueRes.status, 200);
  assert.equal(dueRes.body.success, true);
  assert.ok(Array.isArray(dueRes.body.data));
  assert.ok(dueRes.body.data.some((c) => c.id === customerId));
});

test('Stage 3: Store Settings - View store and update store configuration as OWNER', async () => {
  const loginRes = await request.post('/api/v1/auth/login').send({
    email: 'owner@visioncare.com',
    password: 'Password123!',
  });
  const token = loginRes.body.data.token;

  // 1. Get current store
  const getRes = await request
    .get('/api/v1/stores/current')
    .set('Authorization', `Bearer ${token}`);

  assert.equal(getRes.status, 200);
  assert.equal(getRes.body.success, true);
  assert.ok(getRes.body.data.name);

  // 2. Update store details
  const updateRes = await request
    .patch('/api/v1/stores/current')
    .set('Authorization', `Bearer ${token}`)
    .send({
      phone: '+91 9988776655',
      address: 'Shop #4, Optical Plaza, MG Road, Bangalore',
      googleReviewLink: 'https://g.page/r/test-optical/review',
    });

  assert.equal(updateRes.status, 200);
  assert.equal(updateRes.body.success, true);
  assert.equal(updateRes.body.data.phone, '+91 9988776655');
  assert.equal(updateRes.body.data.address, 'Shop #4, Optical Plaza, MG Road, Bangalore');
  assert.equal(updateRes.body.data.googleReviewLink, 'https://g.page/r/test-optical/review');
});

test('Stage 3: Store Settings - STAFF cannot update store configuration (403 Forbidden)', async () => {
  const loginRes = await request.post('/api/v1/auth/login').send({
    email: 'staff@visioncare.com',
    password: 'Password123!',
  });
  const staffToken = loginRes.body.data.token;

  const patchRes = await request
    .patch('/api/v1/stores/current')
    .set('Authorization', `Bearer ${staffToken}`)
    .send({
      name: 'Hacked Store Name',
    });

  assert.equal(patchRes.status, 403);
});

test('Stage 3: User Management - List, Create, Deactivate, Reset Password & Login', async () => {
  const loginRes = await request.post('/api/v1/auth/login').send({
    email: 'owner@visioncare.com',
    password: 'Password123!',
  });
  const ownerToken = loginRes.body.data.token;

  // 1. List users
  const listRes = await request
    .get('/api/v1/users')
    .set('Authorization', `Bearer ${ownerToken}`);

  assert.equal(listRes.status, 200);
  assert.ok(Array.isArray(listRes.body.data));

  // 2. Create a new staff user
  const uniqueStaffEmail = `staff_${Date.now()}@testoptical.com`;
  const createRes = await request
    .post('/api/v1/users')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({
      fullName: 'Rahul Optometrist',
      email: uniqueStaffEmail,
      password: 'InitialPassword123!',
      role: 'STAFF',
    });

  assert.equal(createRes.status, 201);
  assert.equal(createRes.body.data.email, uniqueStaffEmail);
  assert.equal(createRes.body.data.role, 'STAFF');
  assert.equal(createRes.body.data.active, true);
  const newUserId = createRes.body.data.id;

  // 3. New staff logs in successfully
  const firstLogin = await request.post('/api/v1/auth/login').send({
    email: uniqueStaffEmail,
    password: 'InitialPassword123!',
  });
  assert.equal(firstLogin.status, 200);
  assert.ok(firstLogin.body.data.token);

  // 4. Owner resets staff password
  const resetRes = await request
    .patch(`/api/v1/users/${newUserId}/password`)
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({
      password: 'NewChangedPass456!',
    });
  assert.equal(resetRes.status, 200);

  // 5. Old password now fails
  const failedOldLogin = await request.post('/api/v1/auth/login').send({
    email: uniqueStaffEmail,
    password: 'InitialPassword123!',
  });
  assert.equal(failedOldLogin.status, 401);

  // 6. New password succeeds
  const successNewLogin = await request.post('/api/v1/auth/login').send({
    email: uniqueStaffEmail,
    password: 'NewChangedPass456!',
  });
  assert.equal(successNewLogin.status, 200);

  // 7. Owner deactivates staff account
  const deactivateRes = await request
    .patch(`/api/v1/users/${newUserId}/status`)
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ active: false });
  assert.equal(deactivateRes.status, 200);
  assert.equal(deactivateRes.body.data.active, false);

  // 8. Deactivated staff cannot log in (403 ACCOUNT_DEACTIVATED)
  const deactivatedLogin = await request.post('/api/v1/auth/login').send({
    email: uniqueStaffEmail,
    password: 'NewChangedPass456!',
  });
  assert.equal(deactivatedLogin.status, 403);
  assert.equal(deactivatedLogin.body.error.code, 'ACCOUNT_DEACTIVATED');

  // 9. Re-activate staff account
  const reactivateRes = await request
    .patch(`/api/v1/users/${newUserId}/status`)
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ active: true });
  assert.equal(reactivateRes.status, 200);
  assert.equal(reactivateRes.body.data.active, true);
});

test('Stage 4: Reports - Custom Range Sales, Outstanding Dues & Top Products', async () => {
  const loginRes = await request.post('/api/v1/auth/login').send({
    email: 'owner@visioncare.com',
    password: 'Password123!',
  });
  const token = loginRes.body.data.token;

  // 1. Custom date range sales
  const rangeRes = await request
    .get('/api/v1/reports/custom-range?startDate=2026-01-01&endDate=2026-12-31')
    .set('Authorization', `Bearer ${token}`);
  assert.equal(rangeRes.status, 200);
  assert.equal(rangeRes.body.success, true);
  assert.ok(Array.isArray(rangeRes.body.data.transactions));

  // 2. Outstanding dues
  const duesRes = await request
    .get('/api/v1/reports/outstanding-dues')
    .set('Authorization', `Bearer ${token}`);
  assert.equal(duesRes.status, 200);
  assert.equal(duesRes.body.success, true);
  assert.ok(Array.isArray(duesRes.body.data.dues));

  // 3. Top products
  const topRes = await request
    .get('/api/v1/reports/top-products?limit=5')
    .set('Authorization', `Bearer ${token}`);
  assert.equal(topRes.status, 200);
  assert.equal(topRes.body.success, true);
  assert.ok(Array.isArray(topRes.body.data));
});

test('Stage 4: Customer Messages - Audit Log recording and retrieval', async () => {
  const loginRes = await request.post('/api/v1/auth/login').send({
    email: 'owner@visioncare.com',
    password: 'Password123!',
  });
  const token = loginRes.body.data.token;

  // Create a customer
  const custRes = await request
    .post('/api/v1/customers')
    .set('Authorization', `Bearer ${token}`)
    .send({
      fullName: 'Message Audit Customer',
      phone: `96${Math.floor(10000000 + Math.random() * 90000000)}`,
    });
  const customerId = custRes.body.data.id;

  // Log a WhatsApp message
  const logRes = await request
    .post('/api/v1/messages/log')
    .set('Authorization', `Bearer ${token}`)
    .send({
      customerId,
      messageType: 'ORDER_READY',
      channel: 'WHATSAPP',
    });
  assert.equal(logRes.status, 201);
  assert.equal(logRes.body.data.message_type, 'ORDER_READY');

  // Retrieve customer message history
  const getLogsRes = await request
    .get(`/api/v1/messages/customer/${customerId}`)
    .set('Authorization', `Bearer ${token}`);
  assert.equal(getLogsRes.status, 200);
  assert.ok(getLogsRes.body.data.some((m) => m.message_type === 'ORDER_READY'));
});

test('Stage 4: Store Data Export - Stream CSV files for Customers, Orders, Inventory, Expenses', async () => {
  const loginRes = await request.post('/api/v1/auth/login').send({
    email: 'owner@visioncare.com',
    password: 'Password123!',
  });
  const token = loginRes.body.data.token;

  // 1. Export Customers CSV
  const custCsvRes = await request
    .get('/api/v1/exports/customers.csv')
    .set('Authorization', `Bearer ${token}`);
  assert.equal(custCsvRes.status, 200);
  assert.ok(custCsvRes.text.includes('Customer ID'));

  // 2. Export Orders CSV
  const orderCsvRes = await request
    .get('/api/v1/exports/orders.csv')
    .set('Authorization', `Bearer ${token}`);
  assert.equal(orderCsvRes.status, 200);
  assert.ok(orderCsvRes.text.includes('Order Number'));

  // 3. Export Inventory CSV
  const invCsvRes = await request
    .get('/api/v1/exports/inventory.csv')
    .set('Authorization', `Bearer ${token}`);
  assert.equal(invCsvRes.status, 200);
  assert.ok(invCsvRes.text.includes('Model / Code'));

  // 4. Export Expenses CSV
  const expCsvRes = await request
    .get('/api/v1/exports/expenses.csv')
    .set('Authorization', `Bearer ${token}`);
  assert.equal(expCsvRes.status, 200);
  assert.ok(expCsvRes.text.includes('Expense Category'));
});

test('Option 1: GST Tax Billing - store GSTIN update & order CGST/SGST calculation', async () => {
  const loginRes = await request.post('/api/v1/auth/login').send({
    email: 'owner@visioncare.com',
    password: 'Password123!',
  });
  const token = loginRes.body.data.token;

  // 1. Update store GSTIN
  const gstinRes = await request
    .patch('/api/v1/stores/current')
    .set('Authorization', `Bearer ${token}`)
    .send({ gstin: '29ABCDE1234F1Z5' });

  assert.equal(gstinRes.status, 200);
  assert.equal(gstinRes.body.data.gstin, '29ABCDE1234F1Z5');

  // 2. Create customer
  const custRes = await request
    .post('/api/v1/customers')
    .set('Authorization', `Bearer ${token}`)
    .send({
      fullName: 'GST Taxpayer Customer',
      phone: `95${Math.floor(10000000 + Math.random() * 90000000)}`,
    });
  const customerId = custRes.body.data.id;

  // 3. Create GST Order (Frame 12% GST ₹1120 inclusive, Lens 18% GST ₹1180 inclusive)
  // Frame: total=1120, taxable=1000, tax=120, CGST=60, SGST=60
  // Lens: total=1180, taxable=1000, tax=180, CGST=90, SGST=90
  const orderRes = await request
    .post('/api/v1/orders')
    .set('Authorization', `Bearer ${token}`)
    .send({
      customerId,
      dueDate: '2026-10-15',
      isGstBill: true,
      items: [
        {
          itemType: 'FRAME',
          description: 'Titan Titanium Frame',
          quantity: 1,
          unitPrice: 1120,
          hsnCode: '9004',
          gstRate: 12,
        },
        {
          itemType: 'LENS',
          description: 'Crizal Single Vision Lens',
          quantity: 1,
          unitPrice: 1180,
          hsnCode: '9001',
          gstRate: 18,
        },
      ],
    });

  assert.equal(orderRes.status, 201);
  assert.equal(orderRes.body.success, true);
  assert.equal(orderRes.body.data.total_amount, '2300.00');
  assert.equal(orderRes.body.data.total_taxable_value, '2000.00');
  assert.equal(orderRes.body.data.total_cgst, '150.00');
  assert.equal(orderRes.body.data.total_sgst, '150.00');

  // Fetch order details
  const getOrderRes = await request
    .get(`/api/v1/orders/${orderRes.body.data.id}`)
    .set('Authorization', `Bearer ${token}`);

  assert.equal(getOrderRes.status, 200);
  assert.equal(getOrderRes.body.data.items.length, 2);

  const frameItem = getOrderRes.body.data.items.find((i) => i.item_type === 'FRAME');
  const lensItem = getOrderRes.body.data.items.find((i) => i.item_type === 'LENS');

  assert.ok(frameItem);
  assert.equal(frameItem.hsn_code, '9004');
  assert.equal(frameItem.taxable_value, '1000.00');
  assert.equal(frameItem.cgst_amount, '60.00');
  assert.equal(frameItem.sgst_amount, '60.00');

  assert.ok(lensItem);
  assert.equal(lensItem.hsn_code, '9001');
  assert.equal(lensItem.taxable_value, '1000.00');
  assert.equal(lensItem.cgst_amount, '90.00');
  assert.equal(lensItem.sgst_amount, '90.00');
});

test('Suppliers & Inward Purchase Orders - complete procurement workflow', async () => {
  const loginRes = await request.post('/api/v1/auth/login').send({
    email: 'owner@visioncare.com',
    password: 'Password123!',
  });
  const token = loginRes.body.data.token;

  // 1. Create a Supplier (Lens Lab)
  const supplierRes = await request
    .post('/api/v1/suppliers')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Essilor Lab India',
      contactPerson: 'Vikram Mehta',
      phone: '9888877777',
      email: 'orders@essilorlab.com',
      gstin: '29AABCU9603R1ZM',
      category: 'LENS_LAB',
    });

  assert.equal(supplierRes.status, 201);
  assert.equal(supplierRes.body.success, true);
  const supplierId = supplierRes.body.data.id;
  assert.equal(supplierRes.body.data.name, 'Essilor Lab India');

  // 2. Log an Inward Purchase Order with stock
  const poRes = await request
    .post('/api/v1/purchases')
    .set('Authorization', `Bearer ${token}`)
    .send({
      supplierId,
      invoiceNumber: 'INV-2026-889',
      notes: 'Urgent stock inward for new frames & lenses',
      items: [
        {
          itemName: 'Ray-Ban Aviator Gold RB3025',
          itemType: 'SUNGLASSES',
          brand: 'Ray-Ban',
          modelCode: 'RB3025',
          quantity: 10,
          unitCost: 2500,
          gstRate: 12,
        },
        {
          itemName: 'Crizal Easy Pro Lenses',
          itemType: 'LENS',
          brand: 'Essilor',
          quantity: 20,
          unitCost: 800,
          gstRate: 18,
        },
      ],
      initialPayment: {
        amount: 15000,
        paymentMethod: 'UPI',
        referenceNote: 'Advance paid on delivery',
      },
    });

  assert.equal(poRes.status, 201);
  assert.equal(poRes.body.success, true);
  const poData = poRes.body.data;
  assert.ok(poData.po_number.startsWith('PO-'));
  // Total cost: 10 * 2500 * 1.12 = 28000 + 20 * 800 * 1.18 = 18880 => Total = 46880
  assert.equal(poData.total_amount, '46880.00');
  assert.equal(poData.paid_amount, '15000.00');
  assert.equal(poData.balance_due, '31880.00');
  assert.equal(poData.items.length, 2);

  // 3. Verify that products were auto-created / stock added to inventory
  const productsRes = await request
    .get('/api/v1/products')
    .set('Authorization', `Bearer ${token}`);

  assert.equal(productsRes.status, 200);
  const rayban = productsRes.body.data.find((p) => p.name === 'Ray-Ban Aviator Gold RB3025');
  assert.ok(rayban);
  assert.equal(rayban.stock_quantity, 10);
  assert.equal(rayban.cost_price, '2500.00');

  // 4. Record a second payment to settle part of the supplier due
  const payRes = await request
    .post(`/api/v1/purchases/${poData.id}/payments`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      amount: 10000,
      paymentMethod: 'BANK_TRANSFER',
      referenceNote: 'NEFT Trans Ref #493021',
    });

  assert.equal(payRes.status, 201);

  // 5. Fetch PO details and verify updated dues
  const updatedPoRes = await request
    .get(`/api/v1/purchases/${poData.id}`)
    .set('Authorization', `Bearer ${token}`);

  assert.equal(updatedPoRes.status, 200);
  assert.equal(updatedPoRes.body.data.paid_amount, '25000.00');
  assert.equal(updatedPoRes.body.data.balance_due, '21880.00');
  assert.equal(updatedPoRes.body.data.payments.length, 2);

  // 6. Check supplier dues summary
  const duesRes = await request
    .get('/api/v1/suppliers/dues-summary')
    .set('Authorization', `Bearer ${token}`);

  assert.equal(duesRes.status, 200);
  assert.ok(parseFloat(duesRes.body.data.total_outstanding_payables) >= 21880.00);
  assert.ok(duesRes.body.data.suppliers_with_dues_count >= 1);
});

test('Automatic WhatsApp dispatch endpoints are disabled for the local edition', async () => {
  for (const endpoint of ['send', 'test']) {
    const response = await request.post('/api/v1/whatsapp/' + endpoint).send({phone:'919999999999',message:'must not send'});
    assert.equal(response.status,404);
  }
});

test('Security & Auth: Every store and order endpoint enforces authentication (401)', async () => {
  const fakeId = '00000000-0000-0000-0000-000000000000';

  // Stores endpoints require auth
  const getStoreNoAuth = await request.get('/api/v1/stores/current');
  assert.equal(getStoreNoAuth.status, 401);
  assert.equal(getStoreNoAuth.body.error.code, 'UNAUTHENTICATED');

  const patchStoreNoAuth = await request.patch('/api/v1/stores/current').send({ name: 'Hacked Store' });
  assert.equal(patchStoreNoAuth.status, 401);
  assert.equal(patchStoreNoAuth.body.error.code, 'UNAUTHENTICATED');

  // Orders endpoints require auth
  const listOrdersNoAuth = await request.get('/api/v1/orders');
  assert.equal(listOrdersNoAuth.status, 401);
  assert.equal(listOrdersNoAuth.body.error.code, 'UNAUTHENTICATED');

  const createOrderNoAuth = await request.post('/api/v1/orders').send({
    customerId: fakeId,
    dueDate: '2026-10-20',
    items: [{ itemType: 'FRAME', description: 'Test', quantity: 1, unitPrice: 1000 }],
  });
  assert.equal(createOrderNoAuth.status, 401);
  assert.equal(createOrderNoAuth.body.error.code, 'UNAUTHENTICATED');

  const getOrderNoAuth = await request.get(`/api/v1/orders/${fakeId}`);
  assert.equal(getOrderNoAuth.status, 401);
  assert.equal(getOrderNoAuth.body.error.code, 'UNAUTHENTICATED');

  const updateStatusNoAuth = await request.patch(`/api/v1/orders/${fakeId}/status`).send({ status: 'PROCESSING' });
  assert.equal(updateStatusNoAuth.status, 401);
  assert.equal(updateStatusNoAuth.body.error.code, 'UNAUTHENTICATED');

  const getPaymentsNoAuth = await request.get(`/api/v1/orders/${fakeId}/payments`);
  assert.equal(getPaymentsNoAuth.status, 401);
  assert.equal(getPaymentsNoAuth.body.error.code, 'UNAUTHENTICATED');

  const recordPaymentNoAuth = await request.post(`/api/v1/orders/${fakeId}/payments`).send({
    amount: 500,
    paymentMethod: 'CASH',
  });
  assert.equal(recordPaymentNoAuth.status, 401);
  assert.equal(recordPaymentNoAuth.body.error.code, 'UNAUTHENTICATED');

  // Malformed / invalid bearer token is rejected
  const invalidTokenRes = await request.get('/api/v1/orders').set('Authorization', 'Bearer invalid-garbage-token');
  assert.equal(invalidTokenRes.status, 401);
  assert.equal(invalidTokenRes.body.error.code, 'INVALID_TOKEN');
});

test('Security & Data Isolation: Store B user cannot access or mutate Store A orders, payments, or customers', async () => {
  // 1. Login Store A owner (Vision Care)
  const loginA = await request.post('/api/v1/auth/login').send({
    email: 'owner@visioncare.com',
    password: 'Password123!',
  });
  const tokenA = loginA.body.data.token;

  // 2. Login Store B owner (City Eye)
  const loginB = await request.post('/api/v1/auth/login').send({
    email: 'owner@cityeye.com',
    password: 'Password123!',
  });
  const tokenB = loginB.body.data.token;

  // 3. Create a Customer and Order in Store A
  const uniquePhone = '97' + Math.floor(10000000 + Math.random() * 90000000);
  const custARes = await request
    .post('/api/v1/customers')
    .set('Authorization', `Bearer ${tokenA}`)
    .send({
      fullName: 'Store A Exclusive Customer',
      phone: uniquePhone,
    });
  assert.equal(custARes.status, 201);
  const custAId = custARes.body.data.id;

  const orderARes = await request
    .post('/api/v1/orders')
    .set('Authorization', `Bearer ${tokenA}`)
    .send({
      customerId: custAId,
      dueDate: '2026-10-30',
      items: [
        {
          itemType: 'FRAME',
          description: 'Store A Isolated Spec Frame',
          quantity: 1,
          unitPrice: 4000,
          discount: 0,
        },
      ],
      notes: 'Store A confidential notes',
    });
  assert.equal(orderARes.status, 201);
  const orderAId = orderARes.body.data.id;

  // 4. Store B lists orders: Store A's order must NOT appear
  const listB = await request.get('/api/v1/orders').set('Authorization', `Bearer ${tokenB}`);
  assert.equal(listB.status, 200);
  const foundInB = listB.body.data.some((o) => o.id === orderAId || o.order_number === orderARes.body.data.order_number);
  assert.equal(foundInB, false, 'Store A order leaked into Store B order list');

  // 5. Store B attempts GET order details of Store A: must return 404
  const getOrderB = await request.get(`/api/v1/orders/${orderAId}`).set('Authorization', `Bearer ${tokenB}`);
  assert.equal(getOrderB.status, 404);
  assert.equal(getOrderB.body.error.code, 'ORDER_NOT_FOUND');

  // 6. Store B attempts to change status of Store A order: must return 404
  const patchOrderB = await request
    .patch(`/api/v1/orders/${orderAId}/status`)
    .set('Authorization', `Bearer ${tokenB}`)
    .send({ status: 'PROCESSING' });
  assert.equal(patchOrderB.status, 404);
  assert.equal(patchOrderB.body.error.code, 'ORDER_NOT_FOUND');

  // 7. Store B attempts to record payment on Store A order: must return 404
  const payOrderB = await request
    .post(`/api/v1/orders/${orderAId}/payments`)
    .set('Authorization', `Bearer ${tokenB}`)
    .send({
      amount: 1000,
      paymentMethod: 'CASH',
    });
  assert.equal(payOrderB.status, 404);
  assert.equal(payOrderB.body.error.code, 'ORDER_NOT_FOUND');

  // 8. Store B attempts to view payments of Store A order: must return 404
  const getPaymentsB = await request
    .get(`/api/v1/orders/${orderAId}/payments`)
    .set('Authorization', `Bearer ${tokenB}`);
  assert.equal(getPaymentsB.status, 404);
  assert.equal(getPaymentsB.body.error.code, 'ORDER_NOT_FOUND');

  // 9. Store B attempts to create an order referencing Store A's customer: must return 404
  const crossOrderCreate = await request
    .post('/api/v1/orders')
    .set('Authorization', `Bearer ${tokenB}`)
    .send({
      customerId: custAId,
      dueDate: '2026-10-30',
      items: [{ itemType: 'FRAME', description: 'Cross Store Attempt', quantity: 1, unitPrice: 1000 }],
    });
  assert.equal(crossOrderCreate.status, 404);
  assert.equal(crossOrderCreate.body.error.code, 'CUSTOMER_NOT_FOUND');
});

test('Security & Secret Leakage: Store and Auth APIs never return WhatsApp credentials or secrets', async () => {
  const loginRes = await request.post('/api/v1/auth/login').send({
    email: 'owner@visioncare.com',
    password: 'Password123!',
  });
  assert.equal(loginRes.status, 200);
  const token = loginRes.body.data.token;

  // 1. Check Store object in Auth response
  const authStore = loginRes.body.data.user.store;
  assert.equal(authStore.whatsappConfig, undefined);
  assert.equal(authStore.whatsapp_config, undefined);
  assert.equal(authStore.metaAccessToken, undefined);
  assert.equal(authStore.twilioAuthToken, undefined);

  // 2. Check GET /api/v1/stores/current
  const getStoreRes = await request.get('/api/v1/stores/current').set('Authorization', `Bearer ${token}`);
  assert.equal(getStoreRes.status, 200);
  const storeData = getStoreRes.body.data;
  assert.equal(storeData.whatsappConfig, undefined);
  assert.equal(storeData.whatsapp_config, undefined);
  assert.equal(storeData.metaAccessToken, undefined);
  assert.equal(storeData.metaPhoneNumberId, undefined);
  assert.equal(storeData.twilioAuthToken, undefined);
  assert.equal(storeData.twilioAccountSid, undefined);
  assert.equal(storeData.customWebhookUrl, undefined);
  assert.equal(storeData.password, undefined);
  assert.equal(storeData.password_hash, undefined);

  // 3. Check PATCH /api/v1/stores/current
  const patchStoreRes = await request
    .patch('/api/v1/stores/current')
    .set('Authorization', `Bearer ${token}`)
    .send({
      phone: '+91 9988776655',
    });
  assert.equal(patchStoreRes.status, 200);
  const updatedStoreData = patchStoreRes.body.data;
  assert.equal(updatedStoreData.whatsappConfig, undefined);
  assert.equal(updatedStoreData.whatsapp_config, undefined);
  assert.equal(updatedStoreData.metaAccessToken, undefined);
  assert.equal(updatedStoreData.twilioAuthToken, undefined);
});

// ─── Cancellation, Refund & Stock Edge Cases ────────────────────────────────

test('Cancellation: cancelling an order restores product stock', async () => {
  const loginRes = await request.post('/api/v1/auth/login').send({
    email: 'owner@visioncare.com',
    password: 'Password123!',
  });
  const token = loginRes.body.data.token;

  // 1. Create product with 10 units
  const prodRes = await request
    .post('/api/v1/products')
    .set('Authorization', `Bearer ${token}`)
    .send({ itemType: 'FRAME', name: 'Cancel-Test Frame', sellingPrice: 1000, stockQuantity: 10 });
  assert.equal(prodRes.status, 201);
  const productId = prodRes.body.data.id;

  // 2. Create customer
  const custRes = await request
    .post('/api/v1/customers')
    .set('Authorization', `Bearer ${token}`)
    .send({ fullName: 'Cancel Customer', phone: `91${Math.floor(10000000 + Math.random() * 90000000)}` });
  const customerId = custRes.body.data.id;

  // 3. Create order consuming 3 units
  const orderRes = await request
    .post('/api/v1/orders')
    .set('Authorization', `Bearer ${token}`)
    .send({
      customerId,
      dueDate: '2026-12-31',
      items: [{ productId, itemType: 'FRAME', description: 'Cancel-Test Frame', quantity: 3, unitPrice: 1000, discount: 0 }],
    });
  assert.equal(orderRes.status, 201);
  const orderId = orderRes.body.data.id;

  // 4. Stock should now be 7
  const stockAfterOrder = await request.get(`/api/v1/products/${productId}`).set('Authorization', `Bearer ${token}`);
  assert.equal(Number(stockAfterOrder.body.data.stock_quantity), 7, 'Stock should decrease by 3 after order');

  // 5. Cancel the order
  const cancelRes = await request
    .patch(`/api/v1/orders/${orderId}/status`)
    .set('Authorization', `Bearer ${token}`)
    .send({ status: 'CANCELLED' });
  assert.equal(cancelRes.status, 200);
  assert.equal(cancelRes.body.data.status, 'CANCELLED');

  // 6. Stock should be restored to 10
  const stockAfterCancel = await request.get(`/api/v1/products/${productId}`).set('Authorization', `Bearer ${token}`);
  assert.equal(Number(stockAfterCancel.body.data.stock_quantity), 10, 'Stock should be restored to 10 after cancellation');
});

test('Cancellation: cancelling a paid order creates a Refund expense entry', async () => {
  const loginRes = await request.post('/api/v1/auth/login').send({
    email: 'owner@visioncare.com',
    password: 'Password123!',
  });
  const token = loginRes.body.data.token;

  // 1. Create customer
  const custRes = await request
    .post('/api/v1/customers')
    .set('Authorization', `Bearer ${token}`)
    .send({ fullName: 'Refund Customer', phone: `92${Math.floor(10000000 + Math.random() * 90000000)}` });
  const customerId = custRes.body.data.id;

  // 2. Create order with advance payment of Rs.800 via UPI
  const orderRes = await request
    .post('/api/v1/orders')
    .set('Authorization', `Bearer ${token}`)
    .send({
      customerId,
      dueDate: '2026-12-31',
      items: [{ itemType: 'LENS', description: 'Refund-Test Lens', quantity: 1, unitPrice: 2000, discount: 0 }],
      advancePayment: { amount: 800, paymentMethod: 'UPI' },
    });
  assert.equal(orderRes.status, 201);
  const orderId = orderRes.body.data.id;
  const orderNumber = orderRes.body.data.order_number;

  // 3. Cancel the order
  const cancelRes = await request
    .patch(`/api/v1/orders/${orderId}/status`)
    .set('Authorization', `Bearer ${token}`)
    .send({ status: 'CANCELLED' });
  assert.equal(cancelRes.status, 200);

  // 4. Verify a Refund expense was created for this order
  const expensesRes = await request.get('/api/v1/expenses').set('Authorization', `Bearer ${token}`);
  assert.equal(expensesRes.status, 200);
  const refundExpense = expensesRes.body.data.find(
    (e) => e.category === 'Refund' && e.note && e.note.includes(orderNumber)
  );
  assert.ok(refundExpense, `Expected a Refund expense for order ${orderNumber}`);
  assert.equal(Number(refundExpense.amount), 800, 'Refund amount should match total paid (800)');
  assert.equal(refundExpense.payment_method, 'UPI', 'Refund payment method should match original payment');
});

test('Cancellation: duplicate cancellation is rejected with INVALID_STATE_TRANSITION', async () => {
  const loginRes = await request.post('/api/v1/auth/login').send({
    email: 'owner@visioncare.com',
    password: 'Password123!',
  });
  const token = loginRes.body.data.token;

  // 1. Create a product with 5 units
  const prodRes = await request
    .post('/api/v1/products')
    .set('Authorization', `Bearer ${token}`)
    .send({ itemType: 'FRAME', name: 'Dupe-Cancel Frame', sellingPrice: 500, stockQuantity: 5 });
  const productId = prodRes.body.data.id;

  // 2. Create customer + order consuming 2 units
  const custRes = await request
    .post('/api/v1/customers')
    .set('Authorization', `Bearer ${token}`)
    .send({ fullName: 'Duplicate Cancel Customer', phone: `93${Math.floor(10000000 + Math.random() * 90000000)}` });
  const customerId = custRes.body.data.id;

  const orderRes = await request
    .post('/api/v1/orders')
    .set('Authorization', `Bearer ${token}`)
    .send({
      customerId,
      dueDate: '2026-12-31',
      items: [{ productId, itemType: 'FRAME', description: 'Dupe-Cancel Frame', quantity: 2, unitPrice: 500, discount: 0 }],
    });
  const orderId = orderRes.body.data.id;

  // 3. First cancellation — should succeed and restore stock to 5
  const firstCancel = await request
    .patch(`/api/v1/orders/${orderId}/status`)
    .set('Authorization', `Bearer ${token}`)
    .send({ status: 'CANCELLED' });
  assert.equal(firstCancel.status, 200);

  const stockAfterFirst = await request.get(`/api/v1/products/${productId}`).set('Authorization', `Bearer ${token}`);
  assert.equal(Number(stockAfterFirst.body.data.stock_quantity), 5, 'Stock should be 5 after first cancel');

  // 4. Second cancellation — must be rejected
  const secondCancel = await request
    .patch(`/api/v1/orders/${orderId}/status`)
    .set('Authorization', `Bearer ${token}`)
    .send({ status: 'CANCELLED' });
  assert.equal(secondCancel.status, 400, 'Duplicate cancel must return 400');
  assert.equal(secondCancel.body.error.code, 'INVALID_STATE_TRANSITION');

  // 5. Stock must NOT be double-restored (still 5, not 7)
  const stockAfterSecond = await request.get(`/api/v1/products/${productId}`).set('Authorization', `Bearer ${token}`);
  assert.equal(Number(stockAfterSecond.body.data.stock_quantity), 5, 'Stock must not be double-restored');
});

test('Cancellation: cancelling an unpaid order does NOT create a Refund expense', async () => {
  const loginRes = await request.post('/api/v1/auth/login').send({
    email: 'owner@visioncare.com',
    password: 'Password123!',
  });
  const token = loginRes.body.data.token;

  // 1. Create customer + unpaid order
  const custRes = await request
    .post('/api/v1/customers')
    .set('Authorization', `Bearer ${token}`)
    .send({ fullName: 'No-Payment Cancel Customer', phone: `94${Math.floor(10000000 + Math.random() * 90000000)}` });
  const customerId = custRes.body.data.id;

  const orderRes = await request
    .post('/api/v1/orders')
    .set('Authorization', `Bearer ${token}`)
    .send({
      customerId,
      dueDate: '2026-12-31',
      items: [{ itemType: 'LENS', description: 'No-Pay Cancel Lens', quantity: 1, unitPrice: 1500, discount: 0 }],
      // No advancePayment
    });
  assert.equal(orderRes.status, 201);
  const orderId = orderRes.body.data.id;
  const orderNumber = orderRes.body.data.order_number;

  // 2. Get refund count for this order number before cancellation
  const beforeRes = await request.get('/api/v1/expenses').set('Authorization', `Bearer ${token}`);
  const refundCountBefore = beforeRes.body.data.filter(
    (e) => e.category === 'Refund' && e.note && e.note.includes(orderNumber)
  ).length;

  // 3. Cancel the unpaid order
  const cancelRes = await request
    .patch(`/api/v1/orders/${orderId}/status`)
    .set('Authorization', `Bearer ${token}`)
    .send({ status: 'CANCELLED' });
  assert.equal(cancelRes.status, 200);

  // 4. No Refund expense should have appeared for this order
  const afterRes = await request.get('/api/v1/expenses').set('Authorization', `Bearer ${token}`);
  const refundCountAfter = afterRes.body.data.filter(
    (e) => e.category === 'Refund' && e.note && e.note.includes(orderNumber)
  ).length;
  assert.equal(refundCountAfter, refundCountBefore, 'No Refund expense should be created for an unpaid order');
});

test('Stock Edge Case: negative adjustment exceeding available stock is rejected', async () => {
  const loginRes = await request.post('/api/v1/auth/login').send({
    email: 'owner@visioncare.com',
    password: 'Password123!',
  });
  const token = loginRes.body.data.token;

  // 1. Create product with 3 units
  const prodRes = await request
    .post('/api/v1/products')
    .set('Authorization', `Bearer ${token}`)
    .send({ itemType: 'FRAME', name: 'InsufficientStock Frame', sellingPrice: 750, stockQuantity: 3 });
  assert.equal(prodRes.status, 201);
  const productId = prodRes.body.data.id;

  // 2. Attempt to deduct more than available stock (3 - 10 = -7, violates CHECK)
  const adjustRes = await request
    .patch(`/api/v1/products/${productId}/stock`)
    .set('Authorization', `Bearer ${token}`)
    .send({ adjustment: -10, reason: 'Manual deduction test' });

  assert.equal(adjustRes.status, 409, `Expected 409, got ${adjustRes.status}: ${JSON.stringify(adjustRes.body)}`);
  assert.equal(adjustRes.body.error.code, 'INSUFFICIENT_STOCK');

  // 3. Stock must remain at 3
  const checkRes = await request.get(`/api/v1/products/${productId}`).set('Authorization', `Bearer ${token}`);
  assert.equal(Number(checkRes.body.data.stock_quantity), 3, 'Stock must not change on rejected adjustment');
});

test('Stock Edge Case: zero adjustment is rejected with a validation error', async () => {
  const loginRes = await request.post('/api/v1/auth/login').send({
    email: 'owner@visioncare.com',
    password: 'Password123!',
  });
  const token = loginRes.body.data.token;

  // 1. Create product
  const prodRes = await request
    .post('/api/v1/products')
    .set('Authorization', `Bearer ${token}`)
    .send({ itemType: 'FRAME', name: 'ZeroAdjust Frame', sellingPrice: 500, stockQuantity: 5 });
  const productId = prodRes.body.data.id;

  // 2. Attempt zero adjustment — Zod schema must reject it
  const adjustRes = await request
    .patch(`/api/v1/products/${productId}/stock`)
    .set('Authorization', `Bearer ${token}`)
    .send({ adjustment: 0 });

  assert.equal(adjustRes.status, 400, 'Zero adjustment should be rejected with 400 validation error');
});

// ─── P1: Supplier & Purchase Error Propagation ──────────────────────────────

test('Supplier API: not-found error returns structured JSON error response', async () => {
  const loginRes = await request.post('/api/v1/auth/login').send({
    email: 'owner@visioncare.com',
    password: 'Password123!',
  });
  const token = loginRes.body.data.token;

  // Request a supplier that does not exist
  const nonExistentId = '00000000-0000-0000-0000-000000000000';
  const res = await request
    .get(`/api/v1/suppliers/${nonExistentId}`)
    .set('Authorization', `Bearer ${token}`);

  // Must NOT crash as unhandled rejection — must return structured error
  assert.equal(res.status, 404);
  assert.equal(res.body.success, false);
  assert.ok(res.body.error?.code, 'Expected error.code in response');
});

test('Supplier API: creating a supplier with missing required fields returns 400 validation error', async () => {
  const loginRes = await request.post('/api/v1/auth/login').send({
    email: 'owner@visioncare.com',
    password: 'Password123!',
  });
  const token = loginRes.body.data.token;

  // Send empty body — schema should reject
  const res = await request
    .post('/api/v1/suppliers')
    .set('Authorization', `Bearer ${token}`)
    .send({});

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.ok(res.body.error, 'Expected error object in response');
});

test('Purchase API: not-found error returns structured JSON error response', async () => {
  const loginRes = await request.post('/api/v1/auth/login').send({
    email: 'owner@visioncare.com',
    password: 'Password123!',
  });
  const token = loginRes.body.data.token;

  const nonExistentId = '00000000-0000-0000-0000-000000000000';
  const res = await request
    .get(`/api/v1/purchases/${nonExistentId}`)
    .set('Authorization', `Bearer ${token}`);

  assert.equal(res.status, 404);
  assert.equal(res.body.success, false);
  assert.ok(res.body.error?.code, 'Expected error.code in response');
});

// ─── P1: Session Revocation on Security-Sensitive Account Changes ────────────

test('Session revocation: refresh token is invalidated after password reset', async () => {
  const ownerLogin = await request.post('/api/v1/auth/login').send({
    email: 'owner@visioncare.com',
    password: 'Password123!',
  });
  const ownerToken = ownerLogin.body.data.token;

  // 1. Create a new staff user to operate on
  const uniqueEmail = `revoke_pwd_${Date.now()}@testoptical.com`;
  const createRes = await request
    .post('/api/v1/users')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ fullName: 'Revoke PWD Staff', email: uniqueEmail, password: 'OldPass123!', role: 'STAFF' });
  assert.equal(createRes.status, 201);
  const targetUserId = createRes.body.data.id;

  // 2. Staff logs in and obtains a refresh token
  const staffLogin = await request.post('/api/v1/auth/login').send({
    email: uniqueEmail,
    password: 'OldPass123!',
  });
  assert.equal(staffLogin.status, 200);
  const staffRefreshToken = staffLogin.body.data.refreshToken;
  assert.ok(staffRefreshToken, 'Staff must receive a refresh token on login');

  // 3. Owner resets staff password
  const resetRes = await request
    .patch(`/api/v1/users/${targetUserId}/password`)
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ password: 'NewSecurePass456!' });
  assert.equal(resetRes.status, 200);

  // 4. The old refresh token must now be revoked — refresh must fail
  const refreshRes = await request.post('/api/v1/auth/refresh').send({
    refreshToken: staffRefreshToken,
  });
  assert.equal(
    refreshRes.status, 401,
    `Old refresh token should be revoked after password reset, got ${refreshRes.status}: ${JSON.stringify(refreshRes.body)}`
  );
  assert.equal(refreshRes.body.error.code, 'REFRESH_TOKEN_REVOKED');
});

test('Session revocation: refresh token is invalidated after account deactivation', async () => {
  const ownerLogin = await request.post('/api/v1/auth/login').send({
    email: 'owner@visioncare.com',
    password: 'Password123!',
  });
  const ownerToken = ownerLogin.body.data.token;

  // 1. Create a new staff user
  const uniqueEmail = `revoke_deact_${Date.now()}@testoptical.com`;
  const createRes = await request
    .post('/api/v1/users')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ fullName: 'Revoke Deact Staff', email: uniqueEmail, password: 'DeactPass123!', role: 'STAFF' });
  assert.equal(createRes.status, 201);
  const targetUserId = createRes.body.data.id;

  // 2. Staff logs in and gets a refresh token
  const staffLogin = await request.post('/api/v1/auth/login').send({
    email: uniqueEmail,
    password: 'DeactPass123!',
  });
  assert.equal(staffLogin.status, 200);
  const staffRefreshToken = staffLogin.body.data.refreshToken;
  assert.ok(staffRefreshToken, 'Staff must receive a refresh token on login');

  // 3. Owner deactivates staff account
  const deactivateRes = await request
    .patch(`/api/v1/users/${targetUserId}/status`)
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ active: false });
  assert.equal(deactivateRes.status, 200);
  assert.equal(deactivateRes.body.data.active, false);

  // 4. The old refresh token must now be revoked — refresh must fail
  const refreshRes = await request.post('/api/v1/auth/refresh').send({
    refreshToken: staffRefreshToken,
  });
  assert.equal(
    refreshRes.status, 401,
    `Old refresh token should be revoked after deactivation, got ${refreshRes.status}: ${JSON.stringify(refreshRes.body)}`
  );
  // Either REFRESH_TOKEN_REVOKED or USER_NOT_FOUND (inactive check in refresh) are acceptable
  assert.ok(
    ['REFRESH_TOKEN_REVOKED', 'USER_NOT_FOUND'].includes(refreshRes.body.error?.code),
    `Expected REFRESH_TOKEN_REVOKED or USER_NOT_FOUND, got: ${refreshRes.body.error?.code}`
  );
});

// ─── P2: Optional Phone & Prescription PATCH Contract ───────────────────────

test('Customer API: walk-in customer without phone number succeeds with 201', async () => {
  const loginRes = await request.post('/api/v1/auth/login').send({
    email: 'owner@visioncare.com',
    password: 'Password123!',
  });
  const token = loginRes.body.data.token;

  const res = await request
    .post('/api/v1/customers')
    .set('Authorization', `Bearer ${token}`)
    .send({
      fullName: 'Walk-in Customer No Phone',
      gender: 'Male',
      notes: 'Customer has no mobile device',
    });

  assert.equal(res.status, 201);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.phone, null);
  assert.equal(res.body.data.full_name, 'Walk-in Customer No Phone');
});

test('Prescription PATCH: omitted fields retain existing values, while explicit null clears them', async () => {
  const loginRes = await request.post('/api/v1/auth/login').send({
    email: 'owner@visioncare.com',
    password: 'Password123!',
  });
  const token = loginRes.body.data.token;

  // 1. Create a customer
  const custRes = await request
    .post('/api/v1/customers')
    .set('Authorization', `Bearer ${token}`)
    .send({ fullName: 'Rx Patch Test Patient' });
  assert.equal(custRes.status, 201);
  const customerId = custRes.body.data.id;

  // 2. Create prescription with rSph, notes, and pd
  const rxRes = await request
    .post(`/api/v1/customers/${customerId}/prescriptions`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      rSph: -1.5,
      rCyl: -0.5,
      rAxis: 90,
      pd: 63,
      notes: 'Initial doctor examination note',
    });
  assert.equal(rxRes.status, 201);
  const rxId = rxRes.body.data.id;
  assert.equal(rxRes.body.data.r_sph, '-1.50');
  assert.equal(rxRes.body.data.notes, 'Initial doctor examination note');
  assert.equal(Number(rxRes.body.data.pd), 63);

  // 3. PATCH update rSph only (omit notes and pd) — notes and pd must retain their existing values
  const patch1 = await request
    .patch(`/api/v1/customers/${customerId}/prescriptions/${rxId}`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      rSph: -2.25,
    });
  assert.equal(patch1.status, 200);
  assert.equal(patch1.body.data.r_sph, '-2.25');
  assert.equal(patch1.body.data.notes, 'Initial doctor examination note', 'Omitted notes field must retain existing value');
  assert.equal(Number(patch1.body.data.pd), 63, 'Omitted pd field must retain existing value');

  // 4. PATCH update with explicit null — notes and pd must now be cleared to null
  const patch2 = await request
    .patch(`/api/v1/customers/${customerId}/prescriptions/${rxId}`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      notes: null,
      pd: null,
    });
  assert.equal(patch2.status, 200);
  assert.equal(patch2.body.data.r_sph, '-2.25', 'rSph must remain unchanged');
  assert.equal(patch2.body.data.notes, null, 'Explicit null notes must clear the field');
  assert.equal(patch2.body.data.pd, null, 'Explicit null pd must clear the field');
});

// ─── P2: Calendar Date & Query Parameter Validation ─────────────────────────

test('Validation: invalid calendar date in order dueDate is rejected with 400', async () => {
  const loginRes = await request.post('/api/v1/auth/login').send({
    email: 'owner@visioncare.com',
    password: 'Password123!',
  });
  const token = loginRes.body.data.token;

  const custRes = await request
    .post('/api/v1/customers')
    .set('Authorization', `Bearer ${token}`)
    .send({ fullName: 'Date Validation Customer' });
  const customerId = custRes.body.data.id;

  // Send non-existent calendar date (February 31)
  const orderRes = await request
    .post('/api/v1/orders')
    .set('Authorization', `Bearer ${token}`)
    .send({
      customerId,
      dueDate: '2026-02-31',
      items: [
        { itemType: 'FRAME', description: 'Test Frame', quantity: 1, unitPrice: 1000 },
      ],
    });

  assert.equal(orderRes.status, 400);
  assert.equal(orderRes.body.success, false);
});

test('Validation: reports/custom-range rejects startDate > endDate with 400', async () => {
  const loginRes = await request.post('/api/v1/auth/login').send({
    email: 'owner@visioncare.com',
    password: 'Password123!',
  });
  const token = loginRes.body.data.token;

  const res = await request
    .get('/api/v1/reports/custom-range?startDate=2026-09-30&endDate=2026-09-01')
    .set('Authorization', `Bearer ${token}`);

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
});

test('Validation: reports/top-products rejects invalid limit with 400', async () => {
  const loginRes = await request.post('/api/v1/auth/login').send({
    email: 'owner@visioncare.com',
    password: 'Password123!',
  });
  const token = loginRes.body.data.token;

  const res = await request
    .get('/api/v1/reports/top-products?limit=-5')
    .set('Authorization', `Bearer ${token}`);

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
});

// ─── P2: Store Logo Upload & Security Validation ────────────────────────────

test('Store Logo: valid PNG image upload succeeds and updates store profile', async () => {
  const loginRes = await request.post('/api/v1/auth/login').send({
    email: 'owner@visioncare.com',
    password: 'Password123!',
  });
  const token = loginRes.body.data.token;

  const validPngDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==';

  const res = await request
    .patch('/api/v1/stores/current')
    .set('Authorization', `Bearer ${token}`)
    .send({ logoUrl: validPngDataUrl });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.logoUrl, validPngDataUrl);
});

test('Store Logo: unsupported file type (fake image spoofing MIME) is rejected with 400', async () => {
  const loginRes = await request.post('/api/v1/auth/login').send({
    email: 'owner@visioncare.com',
    password: 'Password123!',
  });
  const token = loginRes.body.data.token;

  // Text disguised as PNG data URL
  const fakePng = 'data:image/png;base64,' + Buffer.from('This is plain text, not a PNG file').toString('base64');

  const res = await request
    .patch('/api/v1/stores/current')
    .set('Authorization', `Bearer ${token}`)
    .send({ logoUrl: fakePng });

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
});

test('Store Logo: oversized image (>2MB) is rejected with 400', async () => {
  const loginRes = await request.post('/api/v1/auth/login').send({
    email: 'owner@visioncare.com',
    password: 'Password123!',
  });
  const token = loginRes.body.data.token;

  // Construct PNG with size > 2MB
  const bigBuffer = Buffer.concat([
    Buffer.from('89504e470d0a1a0a', 'hex'),
    Buffer.alloc(2.2 * 1024 * 1024),
  ]);
  const bigPng = 'data:image/png;base64,' + bigBuffer.toString('base64');

  const res = await request
    .patch('/api/v1/stores/current')
    .set('Authorization', `Bearer ${token}`)
    .send({ logoUrl: bigPng });

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
});

// ─── P2: Financial Outputs Accuracy ─────────────────────────────────────────

test('Financial outputs: expense late on the end date is included in date-filtered results', async () => {
  const loginRes = await request.post('/api/v1/auth/login').send({
    email: 'owner@visioncare.com',
    password: 'Password123!',
  });
  const token = loginRes.body.data.token;

  // Incur an expense at 23:45 late on 2026-08-15
  const lateDate = '2026-08-15';
  const lateExpense = await request
    .post('/api/v1/expenses')
    .set('Authorization', `Bearer ${token}`)
    .send({
      category: 'MISCELLANEOUS',
      amount: 450.00,
      paymentMethod: 'CASH',
      incurredAt: '2026-08-15T23:45:00+05:30',
      note: 'Late night cleaning expense',
    });
  assert.equal(lateExpense.status, 201);
  const expenseId = lateExpense.body.data.id;

  // Filter with from=2026-08-15 and to=2026-08-15 — should include the 23:45 expense
  const filterRes = await request
    .get(`/api/v1/expenses?from=${lateDate}&to=${lateDate}`)
    .set('Authorization', `Bearer ${token}`);

  assert.equal(filterRes.status, 200);
  const found = filterRes.body.data.some((e) => e.id === expenseId);
  assert.ok(found, 'Expense incurred late on the end date must be included in date filter');
});

test('Financial outputs: top-product revenue reflects item discounts and allocated order discount', async () => {
  const loginRes = await request.post('/api/v1/auth/login').send({
    email: 'owner@visioncare.com',
    password: 'Password123!',
  });
  const token = loginRes.body.data.token;

  const custRes = await request
    .post('/api/v1/customers')
    .set('Authorization', `Bearer ${token}`)
    .send({ fullName: 'Top Product Discount Customer' });
  const customerId = custRes.body.data.id;

  const uniqueDesc = `Discounted Premium Frame ${Date.now()}`;

  // Item: quantity 2, unitPrice 1000 = 2000 gross. Item discount: 200 => net item price = 1800.
  // Order discount: 300 => final order total = 1500.
  // The product's actual allocated revenue should be 1800 - 300 = 1500!
  const orderRes = await request
    .post('/api/v1/orders')
    .set('Authorization', `Bearer ${token}`)
    .send({
      customerId,
      dueDate: '2026-10-15',
      items: [
        {
          itemType: 'FRAME',
          description: uniqueDesc,
          quantity: 2,
          unitPrice: 1000,
          discount: 200,
        },
      ],
      discount: 300,
    });
  assert.equal(orderRes.status, 201);
  assert.equal(Number(orderRes.body.data.total_amount), 1500);

  // Check top products report
  const topRes = await request
    .get('/api/v1/reports/top-products?limit=50')
    .set('Authorization', `Bearer ${token}`);

  assert.equal(topRes.status, 200);
  const prod = topRes.body.data.find((p) => p.description === uniqueDesc);
  assert.ok(prod, 'Product should appear in top selling products');
  assert.equal(prod.unitsSold, 2);
  // Revenue must be 1500 (after item discount of 200 AND order-level discount of 300)
  assert.equal(prod.totalRevenue, 1500, `Expected totalRevenue to be 1500, got ${prod.totalRevenue}`);
});


