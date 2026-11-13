'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { parseSms } = require('./parser.js');
async function run() {
  const values = new Map([['legacySyncPaused', '1'], ['legacyInboxUrl', 'https://script.google.com/macros/s/test/exec']]);
  const localStorage = { getItem: k => values.get(k) ?? null, setItem: (k,v) => values.set(k,String(v)), removeItem: k => values.delete(k) };
  const inbox = [{id:'1',raw:'بانک ملت\nبرداشت: 100,000 ریال'}, {id:'2',raw:'یک پیام ناشناخته'}, {id:'3',raw:'رمز ورود 1234'}];
  const received = [];
  const context = vm.createContext({ URL, Set, JSON, String, Error, localStorage, parseSms,
    load: (key, fallback) => JSON.parse(values.get(key) || 'null') ?? fallback,
    document: { getElementById: () => null, visibilityState: 'visible' }, setInterval() {},
    fetch: async () => ({ok:true,json:async()=>({ok:true,inbox})}),
    addSms: raw => { received.push(raw); return {ok:false,review:true}; }, confirm:()=>true,tab:'settings' });
  vm.runInContext(fs.readFileSync('legacy-inbox.js','utf8'),context);
  await context.legacyInboxCheck(true); assert.equal(received.length,2);
  await context.legacyInboxCheck(true); assert.equal(received.length,2);
  assert.equal(JSON.parse(values.get('legacyInboxImported')).length,2);
}
module.exports=run;
if(require.main===module)run().catch(error=>{console.error(error);process.exitCode=1;});
