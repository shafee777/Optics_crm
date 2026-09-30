import test from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../src/config/database.js';
import { orderService } from '../src/modules/orders/order.service.js';
import { paymentService } from '../src/modules/payments/payment.service.js';
import { purchaseRepository } from '../src/modules/purchases/purchase.repository.js';
import { productRepository } from '../src/modules/products/product.repository.js';
if (!new URL(process.env.DATABASE_URL).pathname.startsWith('/optics_test_')) throw new Error('Requires isolated optics_test_ database');
let store, customer, user, product, supplier, otherProduct, otherSupplier;
test.before(async () => {
  store=(await pool.query("SELECT id FROM stores WHERE name='Vision Care Opticals'")).rows[0].id;
  customer=(await pool.query('SELECT id FROM customers WHERE store_id=$1 LIMIT 1',[store])).rows[0].id;
  user=(await pool.query('SELECT id FROM users WHERE store_id=$1 LIMIT 1',[store])).rows[0].id;
  const other=(await pool.query('SELECT id FROM stores WHERE id<>$1 LIMIT 1',[store])).rows[0].id;
  product=(await productRepository.create({storeId:store,itemType:'FRAME',name:'Regression frame',sellingPrice:100,stockQuantity:5})).id;
  otherProduct=(await productRepository.create({storeId:other,itemType:'FRAME',name:'Other store',sellingPrice:100,stockQuantity:5})).id;
  supplier=(await pool.query("INSERT INTO suppliers(store_id,name) VALUES($1,'Regression vendor') RETURNING id",[store])).rows[0].id;
  otherSupplier=(await pool.query("INSERT INTO suppliers(store_id,name) VALUES($1,'Other vendor') RETURNING id",[other])).rows[0].id;
});
test.after(()=>pool.end());
const orderData = (quantity=1, productId=product) => ({customerId:customer,dueDate:'2026-10-01',items:[{productId,itemType:'FRAME',description:'Regression',quantity,unitPrice:100,gstRate:0}]});
const stock = async () => Number((await pool.query('SELECT stock_quantity FROM products WHERE id=$1',[product])).rows[0].stock_quantity);
test('overselling and foreign product references roll back without changing stock', async () => {
  await assert.rejects(orderService.createOrder(store,user,orderData(6)),{code:'INSUFFICIENT_STOCK'});
  await assert.rejects(orderService.createOrder(store,user,orderData(1,otherProduct)),{code:'INSUFFICIENT_STOCK'});
  assert.equal(await stock(),5);
});
test('concurrent cancellation restores stock only once with an audit entry', async () => {
  const order=await orderService.createOrder(store,user,orderData(2));
  assert.equal(await stock(),3);
  const results=await Promise.allSettled([orderService.transitionStatus(store,order.id,'CANCELLED'),orderService.transitionStatus(store,order.id,'CANCELLED')]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(await stock(),5);
  assert.equal(Number((await pool.query("SELECT COUNT(*) FROM inventory_movements WHERE reason=$1 AND product_id=$2 AND store_id=$3",['CANCEL_ORDER '+order.order_number,product,store])).rows[0].count),1);
});
test('concurrent payments cannot overpay the same order', async () => {
  const order=await orderService.createOrder(store,user,orderData(1));
  const pay=()=>paymentService.recordPayment(store,order.id,user,{amount:70,paymentMethod:'CASH'});
  const results=await Promise.allSettled([pay(),pay()]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(results.find(r=>r.status==='rejected').reason.code,'OVERPAYMENT_NOT_ALLOWED');
});
test('purchase validates supplier/product ownership and initial overpayment', async () => {
  const data={supplierId:supplier,items:[{productId:product,itemName:'Frame',quantity:1,unitCost:50}]};
  await assert.rejects(purchaseRepository.createTransactional(store,{...data,supplierId:otherSupplier}),{code:'SUPPLIER_NOT_FOUND'});
  await assert.rejects(purchaseRepository.createTransactional(store,{...data,items:[{...data.items[0],productId:otherProduct}]}),{code:'PRODUCT_NOT_FOUND'});
  await assert.rejects(purchaseRepository.createTransactional(store,{...data,initialPayment:{amount:60}}),{code:'OVERPAYMENT_NOT_ALLOWED'});
  const po=await purchaseRepository.createTransactional(store,data);
  const results=await Promise.allSettled([purchaseRepository.recordPayment(store,po.id,{amount:40}),purchaseRepository.recordPayment(store,po.id,{amount:40})]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(results.find(r=>r.status==='rejected').reason.code,'OVERPAYMENT_NOT_ALLOWED');
});
test('invalid stock adjustment is rejected rather than silently clamped', async () => {
  const before=await stock();
  await assert.rejects(productRepository.adjustStock(store,product,-100),{code:'INSUFFICIENT_STOCK'});
  assert.equal(await stock(),before);
});
