'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const core = require('./direct-sync-core.js');

async function scenario({ localChanged = false, legacy = false, approve = true } = {}) {
  const original = { tx: '[{"id":1}]', accounts: '{}' };
  const incoming = { tx: '[{"id":1},{"id":2}]', accounts: '{}' };
  const local = localChanged ? { tx: '[{"id":1},{"id":3}]', accounts: '{}' } : original;
  const state = { id: 'sheet', email: 'a', base: 'root' };
  let callback, writes = 0, reloads = 0, message = '';
  const context = vm.createContext({
    JSON, Object, Array, Number, String, Math, Date, Error, Set, Map, URL, DirectSyncCore: core,
    googleTestBusy: false, GOOGLE_TEST_CLIENT: 'client', directReceiveLegacyAtBoot: legacy,
    google: { accounts: { oauth2: { initTokenClient: options => ({ requestAccessToken() { callback = options.callback({ access_token: 'token' }); } }) } } },
    document: { getElementById: () => ({ value: '' }) },
    localStorage: { getItem: () => null, setItem() { throw new Error('unexpected write'); } },
    load: (key, fallback) => key === 'directSyncState' ? { ...state } : fallback,
    fetch: async url => ({ ok: true, json: async () => url.includes('userinfo') ? { email: 'a' } : { values: [] } }),
    SYNC: () => null, googleTestButton() {}, confirm: () => approve, alert() {}, directAutoStop() {},
    directReceiveApply: () => { writes++; }, location: { reload: () => { reloads++; } }
  });
  vm.runInContext(fs.readFileSync('direct-sync-ui.js', 'utf8'), context);
  context.directSyncButtons = () => {}; context.directSyncMessage = value => { message = value; };
  context.directSyncSnapshot = () => ({ data: local });
  context.directSyncParse = () => [{ id: 'root', parent: '', backup: { data: original } }, { id: 'next', parent: 'root', backup: { data: incoming } }];
  context.directSyncAuthorize('receive'); await callback;
  return { writes, reloads, message };
}

(async () => {
  assert.equal((await scenario()).writes, 1);
  assert.equal((await scenario()).reloads, 1);
  const conflict = await scenario({ localChanged: true }); assert.equal(conflict.writes, 0); assert.match(conflict.message, /ارسال‌نشده/);
  const legacy = await scenario({ legacy: true }); assert.equal(legacy.writes, 0); assert.match(legacy.message, /قدیمی/);
  const cancelled = await scenario({ approve: false }); assert.equal(cancelled.writes, 0); assert.match(cancelled.message, /لغو/);
  console.log('Direct receive UI tests passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
