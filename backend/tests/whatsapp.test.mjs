import test from 'node:test';
import assert from 'node:assert/strict';
import { sendWhatsApp } from '../../frontend/src/lib/whatsapp.js';
function browser(online) {
  const opened=[];
  const element=()=>({style:{},setAttribute(){},appendChild(){},remove(){}});
  test.mock.method(globalThis,'setTimeout',()=>0);
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{onLine:online}});
  globalThis.document={getElementById:()=>null,createElement:element,head:element(),body:element()};
  globalThis.window={open:(...args)=>opened.push(args)};
  return opened;
}
test('WhatsApp offline never opens or marks a message sent',()=>{
  const opened=browser(false);
  const result=sendWhatsApp({phone:'9876543210',message:'Test draft'});
  assert.equal(result.success,false); assert.equal(result.reason,'OFFLINE'); assert.equal(opened.length,0);
});
test('WhatsApp uses encoded manual draft and never claims delivery',()=>{
  const opened=browser(true);
  const result=sendWhatsApp({phone:'9876543210',message:'50% discount & pickup\nHello'});
  assert.equal(result.sent,false);assert.equal(result.opened,true);
  const url=new URL(opened[0][0]);assert.equal(url.hostname,'wa.me');assert.equal(url.pathname,'/919876543210');
  assert.equal(url.searchParams.get('text'),'50% discount & pickup\nHello');
});
test('WhatsApp rejects malformed numbers',()=>{
  const opened=browser(true);assert.equal(sendWhatsApp({phone:'123',message:'test'}).reason,'INVALID_PHONE');assert.equal(opened.length,0);
});
