'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const core = require('./direct-sync-core.js');

function fixture() {
  const base = { format: 'expense-app-backup', version: 1, data: { tx: '[{"id":1,"amount":10}]', accounts: '{}' } };
  const newer = { format: 'expense-app-backup', version: 1, data: { tx: '[{"id":1,"amount":20}]', accounts: '{}' } };
  const rows = [['expense-direct-sync', '1'], ['root', 'ROOT', 'time', '1', JSON.stringify(base)]];
  let state = { id: 'sheet', email: 'test@example.invalid', base: 'root' }, snapshot = newer, posts = 0, race = false, fail = false, uncertain = false;
  const writes = [];
  const context = vm.createContext({
    console, URL, Date, JSON, Number, String, Math, Array, Object, Error, Set, Map, Uint8Array, Uint32Array,
    crypto: webcrypto, DirectSyncCore: core, googleTestBusy: false,
    document: { visibilityState: 'visible', getElementById: () => null, addEventListener() {} },
    addEventListener() {}, setInterval() { return 1; }, clearInterval() {},
    load: (key, fallback) => key === 'directSyncState' ? { ...state } : fallback,
    localStorage: { setItem(key, value) { writes.push({ key, value }); if (key === 'directSyncState') state = JSON.parse(value); } },
    makeFullBackup: () => snapshot, validateFullBackup() {}, googleTestButton() {},
    fetch: async (url, options = {}) => {
      if (fail) throw new Error('offline');
      if (options.method === 'POST') {
        posts++;
        if (race) rows.push(['other', 'root', 'time', '1', JSON.stringify(newer)]);
        rows.push(...JSON.parse(options.body).values);
        if (uncertain) { uncertain = false; throw new Error('connection lost'); }
      }
      return { ok: true, json: async () => ({ values: rows }) };
    }
  });
  vm.runInContext(fs.readFileSync('direct-sync-ui.js', 'utf8'), context);
  context.directSyncButtons = () => {}; context.directSyncLink = () => {};
  vm.runInContext(fs.readFileSync('direct-sync-auto.js', 'utf8'), context);
  const start = () => vm.runInContext("directAutoSession = { token: 'secret-token', expires: Date.now() + 600000, id: 'sheet', email: 'test@example.invalid' }", context);
  return { context, rows, writes, start, state: () => state, posts: () => posts, setRace: () => { race = true; }, setFail: () => { fail = true; }, setUncertain: () => { uncertain = true; }, setSnapshot: value => { snapshot = value; }, base, newer };
}

(async () => {
  const a = fixture(); a.start(); await a.context.directAutoTick();
  assert.equal(a.posts(), 1); assert.notEqual(a.state().base, 'root');
  assert.ok(a.writes.every(write => !write.value.includes('secret-token')));
  await a.context.directAutoTick(); assert.equal(a.posts(), 1);

  const b = fixture(); b.start(); b.setRace(); await b.context.directAutoTick();
  assert.equal(b.posts(), 1); assert.equal(b.state().base, 'root');
  assert.equal(vm.runInContext('directAutoSession', b.context), null);
  assert.match(vm.runInContext('directAutoStatus', b.context), /هم‌زمان/);

  const c = fixture(); c.rows.push(['other', 'root', 'time', '1', JSON.stringify(c.newer)]); c.setSnapshot(c.base); c.start();
  await c.context.directAutoTick(); assert.equal(c.posts(), 0); assert.equal(vm.runInContext('directAutoSession', c.context), null);

  const d = fixture(); d.start(); d.setFail(); await d.context.directAutoTick();
  assert.equal(d.posts(), 0); assert.equal(d.state().base, 'root'); assert.equal(vm.runInContext('directAutoSession', d.context), null);

  const e = fixture(); e.start(); vm.runInContext('directAutoSession.expires = Date.now() - 1', e.context); await e.context.directAutoTick();
  assert.equal(e.posts(), 0); assert.equal(e.state().base, 'root'); assert.match(vm.runInContext('directAutoStatus', e.context), /منقضی/);

  const f = fixture(); f.start(); await f.context.directAutoTick(); f.setSnapshot(f.base); await f.context.directAutoTick();
  assert.equal(f.posts(), 2); assert.equal(f.rows.length, 4);

  const g = fixture(); g.start(); g.setUncertain(); await g.context.directAutoTick();
  assert.equal(g.state().base, 'root'); assert.match(vm.runInContext('directAutoStatus', g.context), /ممکن است/);
  g.start(); await g.context.directAutoTick(); assert.equal(g.posts(), 1); assert.notEqual(g.state().base, 'root');

  const h = fixture(); let callback, checks = 0;
  h.context.confirm = () => true; h.context.GOOGLE_TEST_CLIENT = 'client';
  h.context.fetch = async () => ({ ok: true, json: async () => ({ email: 'test@example.invalid' }) });
  h.context.google = { accounts: { oauth2: { initTokenClient: options => ({ requestAccessToken() { callback = options.callback({ access_token: 'session-token', expires_in: 3600 }); } }) } } };
  h.context.directAutoTick = () => { checks++; };
  h.context.directAutoStart(); await callback;
  assert.equal(checks, 1); assert.ok(vm.runInContext('!!directAutoSession', h.context));
  assert.ok(h.writes.every(write => !write.value.includes('session-token')));
  h.context.directAutoStop(); assert.equal(vm.runInContext('directAutoSession', h.context), null);
  console.log('Automatic upload tests passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
