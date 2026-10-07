import test from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';
import { app } from '../src/app.js';
import { pool, query } from '../src/config/database.js';

const request = supertest(app);

test('Customer Segmentation, Filters & Broadcast Campaign API', async () => {
  // 1. Authenticate with owner demo account
  const login = await request.post('/api/v1/auth/login').send({
    email: 'owner@visioncare.com',
    password: 'Password123!',
  });
  assert.equal(login.status, 200);
  const token = login.body.data.token;
  const storeId = login.body.data.user.store.id;

  // 2. Create sample test customers with distinct tags and profiles
  const custA = await request
    .post('/api/v1/customers')
    .set('Authorization', `Bearer ${token}`)
    .send({
      fullName: 'Campaign VIP ' + Date.now(),
      phone: '98888' + Math.floor(10000 + Math.random() * 90000),
      category: 'VIP',
      tags: ['VIP', 'Progressive'],
    });
  assert.equal(custA.status, 201);
  const custAId = custA.body.data.id;

  const custB = await request
    .post('/api/v1/customers')
    .set('Authorization', `Bearer ${token}`)
    .send({
      fullName: 'Campaign Regular ' + Date.now(),
      phone: '97777' + Math.floor(10000 + Math.random() * 90000),
      category: 'REGULAR',
      tags: ['Single Vision'],
    });
  assert.equal(custB.status, 201);
  const custBId = custB.body.data.id;

  // 3. Create an order with pending balance for customer A
  const productRes = await query('SELECT id, selling_price FROM products WHERE store_id = $1 LIMIT 1', [storeId]);
  let productId;
  if (productRes.rows.length > 0) {
    productId = productRes.rows[0].id;
  } else {
    const newProd = await query(
      "INSERT INTO products (store_id, item_type, name, selling_price, stock_quantity) VALUES ($1, 'FRAME', 'Test Frame', 2500, 10) RETURNING id",
      [storeId]
    );
    productId = newProd.rows[0].id;
  }

  const orderRes = await request
    .post('/api/v1/orders')
    .set('Authorization', `Bearer ${token}`)
    .send({
      customerId: custAId,
      dueDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      items: [
        {
          productId,
          itemType: 'FRAME',
          description: 'Designer Frame',
          quantity: 1,
          unitPrice: 3000,
          discount: 0,
          gstRate: 0,
        },
      ],
    });
  assert.equal(orderRes.status, 201);

  // 4. Test Customer Listing with Enhanced Metrics
  const listRes = await request
    .get('/api/v1/customers?limit=50')
    .set('Authorization', `Bearer ${token}`);
  assert.equal(listRes.status, 200);
  const foundA = listRes.body.data.find(c => c.id === custAId);
  assert.ok(foundA);
  assert.equal(foundA.category, 'VIP');
  assert.ok(Array.isArray(foundA.tags));
  assert.ok(foundA.tags.includes('VIP'));
  assert.equal(Number(foundA.total_spend), 3000);
  assert.equal(Number(foundA.balance_due), 3000);
  assert.equal(foundA.order_count, 1);

  // 5. Test Quick Filter: VIP segment
  const vipList = await request
    .get('/api/v1/customers?segment=VIP')
    .set('Authorization', `Bearer ${token}`);
  assert.equal(vipList.status, 200);
  assert.ok(vipList.body.data.some(c => c.id === custAId));

  // 6. Test Quick Filter: Pending Balance segment
  const balanceList = await request
    .get('/api/v1/customers?segment=PENDING_BALANCE')
    .set('Authorization', `Bearer ${token}`);
  assert.equal(balanceList.status, 200);
  assert.ok(balanceList.body.data.some(c => c.id === custAId));

  // 7. Test Tag Filtering
  const tagList = await request
    .get('/api/v1/customers?tag=Progressive')
    .set('Authorization', `Bearer ${token}`);
  assert.equal(tagList.status, 200);
  assert.ok(tagList.body.data.some(c => c.id === custAId));

  // 8. Test Bulk Tag Assignment
  const bulkTagRes = await request
    .post('/api/v1/customers/bulk-tags')
    .set('Authorization', `Bearer ${token}`)
    .send({
      customerIds: [custAId, custBId],
      tagsToAdd: ['FestiveCampaign2026'],
      category: 'VIP',
    });
  assert.equal(bulkTagRes.status, 200);
  assert.equal(bulkTagRes.body.data.updatedCount, 2);

  // Verify tags were added
  const verifyTags = await request
    .get(`/api/v1/customers/${custBId}`)
    .set('Authorization', `Bearer ${token}`);
  assert.equal(verifyTags.status, 200);
  assert.ok(verifyTags.body.data.tags.includes('FestiveCampaign2026'));
  assert.equal(verifyTags.body.data.category, 'VIP');

  // 9. Test WhatsApp Broadcast Endpoint
  const broadcastRes = await request
    .post('/api/v1/customers/broadcast-whatsapp')
    .set('Authorization', `Bearer ${token}`)
    .send({
      customerIds: [custAId, custBId],
      messageTemplate: 'Hello {customerName}! Special 20% discount at {storeName}. Call {storePhone}.',
      campaignName: 'Diwali Special 2026',
    });
  assert.equal(broadcastRes.status, 200);
  assert.equal(broadcastRes.body.data.totalSelected, 2);
  assert.equal(broadcastRes.body.data.totalPrepared, 2);
  assert.ok(Array.isArray(broadcastRes.body.data.messages));
  assert.equal(broadcastRes.body.data.messages.length, 2);

  // Verify message personalized text and WhatsApp URL
  const firstMsg = broadcastRes.body.data.messages[0];
  assert.ok(firstMsg.phone);
  assert.ok(firstMsg.message.includes('Special 20% discount'));
  assert.ok(firstMsg.waUrl.startsWith('https://wa.me/'));

  // Verify message logged to audit table
  const logs = await query(
    "SELECT * FROM customer_messages_log WHERE store_id = $1 AND message_type = 'CAMPAIGN' AND customer_id = $2",
    [storeId, custAId]
  );
  assert.ok(logs.rows.length > 0);

  // Clean up test records
  await query('DELETE FROM customer_messages_log WHERE customer_id IN ($1, $2)', [custAId, custBId]);
  await query('DELETE FROM order_items WHERE order_id = $1', [orderRes.body.data.id]);
  await query('DELETE FROM orders WHERE id = $1', [orderRes.body.data.id]);
  await query('DELETE FROM customers WHERE id IN ($1, $2)', [custAId, custBId]);
});

test.after(async () => {
  await pool.end();
});
