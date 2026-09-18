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

test('Stage 2: Order Creation decrements stock & auto-registers new products', async () => {
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

  // 5. Verify the on-the-fly custom lens was automatically created in catalog
  const searchProdRes = await request
    .get(`/api/v1/products?search=${encodeURIComponent(uniqueCustomLens)}`)
    .set('Authorization', `Bearer ${token}`);
  assert.equal(searchProdRes.status, 200);
  assert.ok(searchProdRes.body.data.length > 0);
  assert.equal(searchProdRes.body.data[0].name, uniqueCustomLens);
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


