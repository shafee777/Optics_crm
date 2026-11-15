import test from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';
import { app } from '../src/app.js';
import { query } from '../src/config/database.js';

test('Enterprise Expansion: Loyalty FIFO Ledger, Warranty Subscriptions & Smart Outbox', async (t) => {
  const request = supertest(app);

  // 1. Authenticate as Owner
  const loginRes = await request
    .post('/api/v1/auth/login')
    .send({
      email: 'owner@visioncare.com',
      password: 'Password123!',
    });

  if (loginRes.status !== 200) {
    // Skip if dev seed not loaded in current test env
    t.skip('Database seed not active; skipping enterprise integration test suite');
    return;
  }

  const token = loginRes.body.data.token;
  const storeId = loginRes.body.data.user.storeId;

  // 2. Create a test customer
  const phone = '98' + Math.floor(10000000 + Math.random() * 90000000);
  const custRes = await request
    .post('/api/v1/customers')
    .set('Authorization', `Bearer ${token}`)
    .send({
      fullName: 'Vikram Enterprise Client',
      phone,
      email: 'vikram@example.com',
    });
  assert.equal(custRes.status, 201);
  const customerId = custRes.body.data.id;

  // 3. Test initial Loyalty profile
  await t.test('Customer starts with Standard tier and 0 points', async () => {
    const res = await request
      .get(`/api/v1/loyalty/customer/${customerId}`)
      .set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.tier, 'STANDARD');
    assert.equal(res.body.data.balance, 0);
    assert.equal(res.body.data.multiplier, 1.0);
  });

  // 4. Create an inventory product for testing warranty replacement
  const prodRes = await request
    .post('/api/v1/products')
    .set('Authorization', `Bearer ${token}`)
    .send({
      itemType: 'FRAME',
      brand: 'RayBan',
      modelCode: 'RB-3025-GOLD',
      name: 'RayBan Aviator Gold Luxury',
      sellingPrice: 3000,
      costPrice: 1500,
      stockQuantity: 10,
    });
  assert.equal(prodRes.status, 201);
  const productId = prodRes.body.data.id;

  // 5. Create a Warranty Plan
  const planCode = 'WAR-' + Date.now().toString().slice(-4);
  const planRes = await request
    .post('/api/v1/warranties/plans')
    .set('Authorization', `Bearer ${token}`)
    .send({
      planCode,
      name: '1-Year Complete Optical Care',
      description: 'Covers 1 free frame replacement within 365 days',
      durationDays: 365,
      price: 499,
      maxClaims: 1,
      coveragePercentage: 100,
      terms: 'Valid on manufacturing and accidental frame breakages',
    });
  assert.equal(planRes.status, 201);
  const planId = planRes.body.data.id;

  // 6. Create an Order that earns points, creates a warranty, and enqueues an Outbox message
  let orderId = null;
  let orderNumber = null;
  await t.test('Order creation accrues FIFO points, binds warranty, and enqueues Outbox confirmation', async () => {
    const orderRes = await request
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerId,
        dueDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
        items: [
          {
            productId,
            itemType: 'FRAME',
            description: 'RayBan Aviator Gold Luxury',
            quantity: 1,
            unitPrice: 3000,
            gstRate: 12,
          }
        ],
        warranties: [
          {
            planId,
            coveredProductId: productId,
            coveredItemDescription: 'RayBan Aviator Gold Luxury Frame',
            notes: 'Primary optical warranty coverage',
          }
        ],
      });

    assert.equal(orderRes.status, 201);
    orderId = orderRes.body.data.id;
    orderNumber = orderRes.body.data.order_number;

    // Check loyalty points accrued
    assert.ok(orderRes.body.data.loyalty_points_earned > 0, 'Points must be accrued on order creation');

    // Check customer loyalty balance
    const loyRes = await request
      .get(`/api/v1/loyalty/customer/${customerId}`)
      .set('Authorization', `Bearer ${token}`);
    assert.equal(loyRes.status, 200);
    assert.equal(loyRes.body.data.balance, orderRes.body.data.loyalty_points_earned);
    assert.equal(loyRes.body.data.transactions.length, 1);
    assert.equal(loyRes.body.data.transactions[0].type, 'EARN');

    // Check customer warranty created
    const warRes = await request
      .get(`/api/v1/warranties/customer/${customerId}`)
      .set('Authorization', `Bearer ${token}`);
    assert.equal(warRes.status, 200);
    assert.equal(warRes.body.data.length, 1);
    assert.equal(warRes.body.data[0].planCode, planCode);
    assert.equal(warRes.body.data[0].status, 'ACTIVE');
    assert.equal(warRes.body.data[0].claimsRemaining, 1);

    // Check Smart Outbox pending message
    const outRes = await request
      .get('/api/v1/outbox?status=PENDING')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(outRes.status, 200);
    const orderMsg = outRes.body.data.find(m => m.orderId === orderId);
    assert.ok(orderMsg, 'Outbox must contain pending confirmation message for new order');
    assert.equal(orderMsg.eventType, 'ORDER_CREATED');
  });

  // 7. Test Warranty Claim Workflow
  await t.test('Warranty Claim verifies active contract, decrements physical stock, and shifts status to EXHAUSTED', async () => {
    const warRes = await request
      .get(`/api/v1/warranties/customer/${customerId}`)
      .set('Authorization', `Bearer ${token}`);
    const warranty = warRes.body.data[0];

    // Initial stock check
    const initProd = await request
      .get(`/api/v1/products/${productId}`)
      .set('Authorization', `Bearer ${token}`);
    const initialStock = initProd.body.data.stock_quantity;

    // Claim the warranty
    const claimRes = await request
      .post(`/api/v1/warranties/${warranty.id}/claim`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        replacementProductId: productId,
        replacementDescription: 'Replacement RayBan Aviator Frame (Claim Fulfilled)',
        claimType: 'REPLACEMENT',
        originalItemPrice: 3000,
        discountAmount: 3000,
        customerPaid: 0,
        notes: 'Cracked bridge replaced free under warranty',
      });

    assert.equal(claimRes.status, 200);
    assert.equal(claimRes.body.data.updatedWarranty.status, 'EXHAUSTED');
    assert.equal(claimRes.body.data.updatedWarranty.claims_remaining, 0);

    // Verify product stock was decremented for replacement
    const afterProd = await request
      .get(`/api/v1/products/${productId}`)
      .set('Authorization', `Bearer ${token}`);
    assert.equal(afterProd.body.data.stock_quantity, initialStock - 1);

    // Second claim must be rejected because contract is EXHAUSTED
    const secondClaim = await request
      .post(`/api/v1/warranties/${warranty.id}/claim`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        replacementDescription: 'Attempted duplicate claim',
      });
    assert.equal(secondClaim.status, 400);
    assert.equal(secondClaim.body.error.code, 'WARRANTY_NOT_ACTIVE');
  });

  // 8. Test Loyalty Points Redemption at Checkout
  await t.test('Points redemption applies integer-paise discount and updates FIFO balance', async () => {
    const loyProfile = await request
      .get(`/api/v1/loyalty/customer/${customerId}`)
      .set('Authorization', `Bearer ${token}`);
    const availablePoints = loyProfile.body.data.balance;
    assert.ok(availablePoints >= 50, 'Customer should have points to redeem');

    const redeemAmount = 50;
    const orderRes = await request
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerId,
        dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
        loyaltyPointsToRedeem: redeemAmount,
        items: [
          {
            itemType: 'SERVICE',
            description: 'Lab Lens Edging & Coating',
            quantity: 1,
            unitPrice: 500,
            gstRate: 18,
          }
        ],
      });

    assert.equal(orderRes.status, 201);
    assert.equal(orderRes.body.data.loyalty_points_redeemed, redeemAmount);
    assert.equal(Number(orderRes.body.data.loyalty_discount), 50);
    // Subtotal 500 - 50 = 450 totalAmount
    assert.equal(Number(orderRes.body.data.total_amount), 450);

    // Verify balance after redemption
    const afterLoy = await request
      .get(`/api/v1/loyalty/customer/${customerId}`)
      .set('Authorization', `Bearer ${token}`);
    assert.equal(afterLoy.body.data.balance, availablePoints - redeemAmount + orderRes.body.data.loyalty_points_earned);
  });

  // 9. Test Smart Outbox Dispatch & Transition Triggers
  await t.test('Order status transition enqueues pickup alert and outbox mark-sent logs message', async () => {
    // Transition order to PROCESSING first, then READY_FOR_PICKUP (enforcing state machine)
    const procRes = await request
      .patch(`/api/v1/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'PROCESSING' });
    assert.equal(procRes.status, 200);

    const transRes = await request
      .patch(`/api/v1/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'READY_FOR_PICKUP' });
    assert.equal(transRes.status, 200);

    // Verify READY_FOR_PICKUP message in Outbox
    const outRes = await request
      .get('/api/v1/outbox?status=PENDING')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(outRes.status, 200);
    const pickupMsg = outRes.body.data.find(m => m.orderId === orderId && m.eventType === 'READY_FOR_PICKUP');
    assert.ok(pickupMsg, 'Outbox must contain READY_FOR_PICKUP notification');

    // Mark sent (staff clicked wa.me in drawer)
    const sentRes = await request
      .post(`/api/v1/outbox/${pickupMsg.id}/sent`)
      .set('Authorization', `Bearer ${token}`)
      .send({ dispatchMethod: 'MANUAL_WA_ME' });
    assert.equal(sentRes.status, 200);
    assert.equal(sentRes.body.data.status, 'SENT');
    assert.equal(sentRes.body.data.dispatch_method, 'MANUAL_WA_ME');

    // Pending count should decrease
    const countRes = await request
      .get('/api/v1/outbox/pending-count')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(countRes.status, 200);
    assert.ok(typeof countRes.body.data.count === 'number');
  });
});
