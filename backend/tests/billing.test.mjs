import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateBilling } from '../../shared/billing.mjs';
test('GST is extracted after order discount and reconciles to the payable amount', () => {
  const result = calculateBilling([{quantity: 1, unitPrice: 118, gstRate: 18}], 59);
  assert.equal(result.totalAmount, 59);
  assert.equal(result.totalTaxableValue, 50);
  assert.equal(result.totalCgst, 4.5);
  assert.equal(result.totalSgst, 4.5);
});
test('mixed rates and paise discounts reconcile exactly', () => {
  for (let discount = 0; discount < 400; discount++) {
    const result = calculateBilling([{quantity: 3,unitPrice: 12.31,gstRate: 18},{quantity: 2,unitPrice: 5.17,gstRate: 5}], discount / 100);
    assert.equal(Math.round((result.totalTaxableValue+result.totalCgst+result.totalSgst)*100),Math.round(result.totalAmount*100));
  }
});
test('non GST and fully discounted orders contain no tax', () => {
  const item = {quantity:1,unitPrice:118,gstRate:18};
  assert.equal(calculateBilling([item],18,false).totalTaxableValue,100);
  assert.equal(calculateBilling([item],118).totalCgst,0);
});
test('invalid discounts and double tax are rejected', () => {
  assert.throws(()=>calculateBilling([{quantity:1,unitPrice:10,discount:11}]),RangeError);
  assert.throws(()=>calculateBilling([{quantity:1,unitPrice:10}],11),RangeError);
  assert.throws(()=>calculateBilling([{quantity:1,unitPrice:10}],0,true,1),RangeError);
});
