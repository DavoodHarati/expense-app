'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { parseSms } = require('./parser.js');

async function main() {
  const values = new Map([['legacySyncPaused', '1'], ['legacyInboxUrl', 'https://script.google.com/macros/s/test/exec']]);
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key) };
  const inbox = [{ id: '1', raw: '481670002776322001\n30,000,000+\n1405/8/9-16:48\nمانده:80,023,800' }, { id: '2', raw: 'ورود\nاز:اینترنت بانک\nرمز 123456' }];
  const inserted = [];
  let method, payload = { ok: true, inbox };
  const context = vm.createContext({ URL, Set, JSON, String, Error, localStorage: storage, parseSms,
    load: (key, fallback) => { try { return JSON.parse(storage.getItem(key)) ?? fallback; } catch { return fallback; } },
    document: { getElementById: () => null, visibilityState: 'visible' }, setInterval: () => {},
    fetch: async (url, options) => { method = options.method; return { ok: true, json: async () => payload }; },
    addSms: raw => { inserted.push(raw); return { ok: true }; }, confirm: () => true, tab: 'settings' });
  vm.runInContext(fs.readFileSync('account-owner-lock.js','utf8'), context);
  vm.runInContext(fs.readFileSync('legacy-inbox.js', 'utf8'), context);
  await context.legacyInboxCheck(true);
  assert.equal(method, 'GET');
  assert.equal(inserted.length, 1);
  assert.equal(JSON.parse(storage.getItem('legacyInboxImported')).length, 1);
  await context.legacyInboxCheck(true);
  assert.equal(inserted.length, 1);
  payload = { ok: true };
  await context.legacyInboxCheck(true);
  assert.equal(inserted.length, 1);
  assert.throws(() => context.legacyInboxUrl('https://example.com/'));
  storage.removeItem('legacySyncPaused');
  payload = { ok: true, inbox: [{ ...inbox[0], id: '3' }] };
  await context.legacyInboxCheck(true);
  assert.equal(inserted.length, 1);
  console.log('legacy inbox tests passed');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
