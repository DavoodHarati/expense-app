'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function fixture() {
  const data = new Map([['sync', 'https://example.test/exec'], ['sync_bak', 'https://example.test/exec'], ['dirty', '1'], ['tx', '[{"id":1}]']]);
  let resolveFetch, calls = 0;
  const storage = { getItem: k => data.has(k) ? data.get(k) : null, setItem: (k,v) => data.set(k,String(v)), removeItem: k => data.delete(k) };
  const context = vm.createContext({
    localStorage: storage, JSON, Date, Set, Number, String, Error,
    clearTimeout() {}, setTimeout() {}, tx: [{ id: 1 }], accounts: {}, rem: [], log: [],
    job: () => '', work: () => '', matchTransfers() {}, addSms() {},
    fetch: () => { calls++; return new Promise(resolve => { resolveFetch = resolve; }); }
  });
  const source = fs.readFileSync('app.js', 'utf8');
  vm.runInContext(source.slice(source.indexOf('const SYNC ='), source.indexOf('let lastPull =')), context);
  return { data, context, calls: () => calls, resolve: value => resolveFetch(value) };
}

(async () => {
  const idle = fixture();
  idle.context.pauseLegacySync();
  assert.equal(idle.data.get('legacySyncPaused'), '1');
  assert.equal(idle.data.get('noSync'), '1');
  assert.equal(idle.data.get('sync'), 'https://example.test/exec');
  assert.equal(idle.data.get('sync_bak'), 'https://example.test/exec');
  assert.equal(idle.data.get('dirty'), '1');
  await idle.context.pull(); await idle.context.doPush();
  assert.equal(idle.calls(), 0);

  const reading = fixture();
  const pendingRead = reading.context.pull();
  assert.throws(() => reading.context.pauseLegacySync(), /در جریان/);
  reading.data.set('legacySyncPaused', '1');
  reading.resolve({ text: async () => JSON.stringify({ ok: true, tx: [{ id: 999 }], accounts: {}, log: [] }) });
  await pendingRead;
  assert.equal(reading.data.get('tx'), '[{"id":1}]');

  const writing = fixture();
  const pendingWrite = writing.context.doPush();
  assert.throws(() => writing.context.pauseLegacySync(), /در جریان/);
  writing.data.set('legacySyncPaused', '1');
  writing.resolve({ json: async () => ({ ok: true }) });
  await pendingWrite;
  assert.equal(writing.data.get('dirty'), '1');
  console.log('Legacy connection pause tests passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
