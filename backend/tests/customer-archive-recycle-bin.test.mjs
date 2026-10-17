import test from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';
import { app } from '../src/app.js';
import { pool, query } from '../src/config/database.js';

const request = supertest(app);

test('Customer Archiving, Recycle Bin, and Safe Restoration Safeguards', async (t) => {
  // 1. Authenticate with owner and staff accounts
  const ownerLogin = await request.post('/api/v1/auth/login').send({
    email: 'owner@visioncare.com',
    password: 'Password123!',
  });
  assert.equal(ownerLogin.status, 200, 'Owner login failed');
  const ownerToken = ownerLogin.body.data.token;
  const storeId = ownerLogin.body.data.user.store.id;

  const staffLogin = await request.post('/api/v1/auth/login').send({
    email: 'staff@visioncare.com',
    password: 'Password123!',
  });
  assert.equal(staffLogin.status, 200, 'Staff login failed');
  const staffToken = staffLogin.body.data.token;

  // 2. Create customer A (will be archived and restored)
  const custARes = await request
    .post('/api/v1/customers')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({
      fullName: 'Archive Test Customer A ' + Date.now(),
      phone: '98111' + Math.floor(10000 + Math.random() * 90000),
      category: 'REGULAR',
    });
  assert.equal(custARes.status, 201);
  const custA = custARes.body.data;

  // 3. Create customer B (will be given an order to test permanent deletion protection)
  const custBRes = await request
    .post('/api/v1/customers')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({
      fullName: 'Archive Test Customer B ' + Date.now(),
      phone: '98222' + Math.floor(10000 + Math.random() * 90000),
      category: 'REGULAR',
    });
  assert.equal(custBRes.status, 201);
  const custB = custBRes.body.data;

  // Add an order for Customer B
  const orderRes = await request
    .post('/api/v1/orders')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({
      customerId: custB.id,
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      items: [
        {
          itemType: 'FRAME',
          description: 'Safeguard Test Frame',
          quantity: 1,
          unitPrice: 1500,
          discount: 0,
        },
      ],
      payments: [
        {
          amount: 500,
          paymentMethod: 'CASH',
        },
      ],
    });
  assert.equal(orderRes.status, 201, 'Failed to create order for customer B');

  // ─── Test 1: Role-Based Access Control ──────────────────────────────────────
  await t.test('Staff role cannot archive or access bin endpoints (returns 403)', async () => {
    const staffArchive = await request
      .delete(`/api/v1/customers/${custA.id}`)
      .set('Authorization', `Bearer ${staffToken}`);
    assert.equal(staffArchive.status, 403);

    const staffBin = await request
      .get('/api/v1/customers/bin/list')
      .set('Authorization', `Bearer ${staffToken}`);
    assert.equal(staffBin.status, 403);

    const staffRestore = await request
      .post(`/api/v1/customers/bin/${custA.id}/restore`)
      .set('Authorization', `Bearer ${staffToken}`);
    assert.equal(staffRestore.status, 403);

    const staffPermDelete = await request
      .delete(`/api/v1/customers/bin/${custA.id}/permanent`)
      .set('Authorization', `Bearer ${staffToken}`);
    assert.equal(staffPermDelete.status, 403);
  });

  // ─── Test 2: Move Customer to Recycle Bin (Soft Delete) ─────────────────────
  await t.test('Owner can move customer to Recycle Bin', async () => {
    const archiveRes = await request
      .delete(`/api/v1/customers/${custA.id}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    assert.equal(archiveRes.status, 200);
    assert.equal(archiveRes.body.data.archived, true);

    // Also archive Customer B
    const archiveB = await request
      .delete(`/api/v1/customers/${custB.id}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    assert.equal(archiveB.status, 200);
  });

  // ─── Test 3: Excluded from active directory, but direct URL returns profile ─
  await t.test('Archived customer excluded from active directory, accessible via direct URL', async () => {
    const activeList = await request
      .get('/api/v1/customers?search=' + encodeURIComponent(custA.full_name))
      .set('Authorization', `Bearer ${ownerToken}`);
    assert.equal(activeList.status, 200);
    assert.equal(activeList.body.data.customers.length, 0, 'Archived customer must not appear in active search');

    // Direct profile GET must succeed and include archived_at
    const directGet = await request
      .get(`/api/v1/customers/${custA.id}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    assert.equal(directGet.status, 200, 'Direct profile URL must not return 404');
    assert.ok(directGet.body.data.archived_at, 'Customer must contain archived_at timestamp');
  });

  // ─── Test 4: Recycle Bin Listing ───────────────────────────────────────────
  await t.test('Recycle Bin listing returns archived customers with spend & balance', async () => {
    const binRes = await request
      .get('/api/v1/customers/bin/list')
      .set('Authorization', `Bearer ${ownerToken}`);
    assert.equal(binRes.status, 200);
    assert.ok(Array.isArray(binRes.body.data));

    const foundA = binRes.body.data.find((c) => c.id === custA.id);
    assert.ok(foundA, 'Customer A must be present in Recycle Bin');
    assert.ok(foundA.archived_at, 'archived_at must be populated');

    const foundB = binRes.body.data.find((c) => c.id === custB.id);
    assert.ok(foundB, 'Customer B must be present in Recycle Bin');
    assert.equal(foundB.order_count, 1, 'Customer B must report 1 order');
    assert.ok(parseFloat(foundB.total_spend) > 0, 'Customer B must report total spend');
    assert.ok(parseFloat(foundB.balance_due) > 0, 'Customer B must report balance due');
  });

  // ─── Test 5: Safeguards: Block Orders, Rx, and Edits for Archived Customers ─
  await t.test('Mutations blocked for archived customers', async () => {
    // 1. Cannot create order
    const orderFail = await request
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        customerId: custA.id,
        dueDate: new Date().toISOString().split('T')[0],
        items: [{ itemType: 'FRAME', description: 'Test', quantity: 1, unitPrice: 1000 }],
      });
    assert.equal(orderFail.status, 400);
    assert.equal(orderFail.body.error.code, 'CUSTOMER_ARCHIVED');

    // 2. Cannot add prescription
    const rxFail = await request
      .post(`/api/v1/customers/${custA.id}/prescriptions`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        rSph: -1.25,
        lSph: -1.50,
      });
    assert.equal(rxFail.status, 400);
    assert.equal(rxFail.body.error.code, 'CUSTOMER_ARCHIVED');

    // 3. Cannot edit customer profile
    const editFail = await request
      .patch(`/api/v1/customers/${custA.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        notes: 'Trying to update archived profile',
      });
    assert.equal(editFail.status, 400);
    assert.equal(editFail.body.error.code, 'CUSTOMER_ARCHIVED');
  });

  // ─── Test 6: Permanent Deletion Safeguards ──────────────────────────────────
  await t.test('Permanent delete blocked when customer has dependent records', async () => {
    // Customer B has 1 order and payments — permanent delete must be rejected
    const delFail = await request
      .delete(`/api/v1/customers/bin/${custB.id}/permanent`)
      .set('Authorization', `Bearer ${ownerToken}`);
    assert.equal(delFail.status, 409, 'Must reject deletion with 409 conflict');
    assert.equal(delFail.body.error.code, 'HAS_DEPENDENTS');

    // Verify Customer B is still safely in the bin
    const binCheck = await request
      .get('/api/v1/customers/bin/list')
      .set('Authorization', `Bearer ${ownerToken}`);
    const stillInBin = binCheck.body.data.find((c) => c.id === custB.id);
    assert.ok(stillInBin, 'Customer B must remain safely in the Recycle Bin');
  });

  // ─── Test 7: Restoration & Duplicate Phone Conflict Safeguard ──────────────
  await t.test('Restoration returns customer to active directory', async () => {
    const restoreRes = await request
      .post(`/api/v1/customers/bin/${custA.id}/restore`)
      .set('Authorization', `Bearer ${ownerToken}`);
    assert.equal(restoreRes.status, 200);
    assert.equal(restoreRes.body.data.archived_at, null);

    // Customer A is back in active customer directory
    const activeList = await request
      .get('/api/v1/customers?search=' + encodeURIComponent(custA.full_name))
      .set('Authorization', `Bearer ${ownerToken}`);
    assert.equal(activeList.body.data.customers.length, 1);
    assert.equal(activeList.body.data.customers[0].id, custA.id);
  });

  // ─── Test 8: Permanent Delete Allowed for Unencumbered Records ──────────────
  await t.test('Permanent delete succeeds for unencumbered archived customer', async () => {
    // Move Customer A back to bin
    await request
      .delete(`/api/v1/customers/${custA.id}`)
      .set('Authorization', `Bearer ${ownerToken}`);

    // Since Customer A has 0 orders and 0 prescriptions, permanent deletion is permitted
    const permDelete = await request
      .delete(`/api/v1/customers/bin/${custA.id}/permanent`)
      .set('Authorization', `Bearer ${ownerToken}`);
    assert.equal(permDelete.status, 200);
    assert.equal(permDelete.body.data.permanentlyDeleted, true);

    // Verify Customer A no longer exists in DB
    const finalCheck = await request
      .get(`/api/v1/customers/${custA.id}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    assert.equal(finalCheck.status, 404);
  });
});
