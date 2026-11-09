'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const core = require('./direct-sync-core.js');

function setup() {
  const original = { format: 'expense-app-backup', version: 1, data: { tx: '[{"id":1}]', accounts: '{}' } };
  const rows = [['expense-direct-sync', '1'], ['root', 'ROOT', 'time', '1', JSON.stringify(original)]];
  function device() {
    const values = new Map(Object.entries({ ...original.data, directSyncState: JSON.stringify({ id: 'sheet', email: 'a', base: 'root' }) }));
    let callback, message = '', reloads = 0, downloaded;
    const storage = { getItem: key => values.has(key) ? values.get(key) : null, setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key) };
    const context = vm.createContext({
      console, URL, Date, JSON, Number, String, Math, Array, Object, Error, Set, Map, Uint8Array, Uint32Array,
      crypto: webcrypto, DirectSyncCore: core, localStorage: storage, BACKUP_KEYS: ['tx', 'accounts'],
      googleTestBusy: false, GOOGLE_TEST_CLIENT: 'client', directReceiveLegacyAtBoot: false,
      google: { accounts: { oauth2: { initTokenClient: opts => ({ requestAccessToken() { callback = opts.callback({ access_token: 'token' }); } }) } } },
      document: { visibilityState: 'visible', getElementById: () => ({ value: '' }), addEventListener() {} },
      addEventListener() {}, setInterval() { return 1; }, clearInterval() {},
      load: (key, fallback) => values.has(key) ? JSON.parse(values.get(key)) : fallback,
      makeFullBackup: () => ({ format: 'expense-app-backup', version: 1, data: { tx: values.get('tx'), accounts: values.get('accounts') } }),
      validateFullBackup: backup => { if (!backup || !backup.data || !Array.isArray(JSON.parse(backup.data.tx))) throw Error('bad backup'); },
      googleTestButton() {}, SYNC: () => null, confirm: () => true, alert() {}, location: { reload: () => { reloads++; } },
      fetch: async (url, options = {}) => {
        if (url.includes('userinfo')) return { ok: true, json: async () => ({ email: 'a' }) };
        if (options.method === 'POST') rows.push(...JSON.parse(options.body).values);
        return { ok: true, json: async () => ({ values: JSON.parse(JSON.stringify(rows)) }) };
      }
    });
    for (const file of ['direct-sync-ui.js', 'direct-sync-auto.js', 'direct-sync-receive.js']) vm.runInContext(fs.readFileSync(file, 'utf8'), context);
    context.directSyncButtons = () => {}; context.directSyncLink = () => {};
    context.directSyncMessage = value => { message = value; }; context.directSyncDownload = value => { downloaded = value; };
    return { context, values, start: () => vm.runInContext("directAutoSession = { token:'token', expires:Date.now()+600000, id:'sheet', email:'a' }", context), receive: async () => { context.directSyncAuthorize('receive'); await callback; }, run: async () => { context.directSyncAuthorize('run'); await callback; }, message: () => message, reloads: () => reloads, downloaded: () => downloaded };
  }
  return { a: device(), b: device(), rows };
}

(async () => {
  const { a, b, rows } = setup();
  a.values.set('tx', '[{"id":1},{"id":2}]'); a.start(); await a.context.directAutoTick();
  assert.equal(rows.length, 3); await b.receive();
  assert.equal(b.values.get('tx'), a.values.get('tx')); assert.equal(b.reloads(), 1);
  b.context.directReceiveDownloadPrevious(); assert.equal(b.downloaded().data.tx, '[{"id":1}]');
  b.values.set('tx', '[{"id":1},{"id":2},{"id":3}]'); b.start(); await b.context.directAutoTick();
  assert.equal(rows.length, 4); await a.context.directAutoTick();
  assert.equal(a.values.get('tx'), '[{"id":1},{"id":2}]');
  assert.equal(vm.runInContext('directAutoSession', a.context), null);

  const race = setup();
  race.a.values.set('tx', '[{"id":1},{"id":2}]'); race.b.values.set('tx', '[{"id":1},{"id":3}]');
  race.a.start(); race.b.start(); await Promise.all([race.a.context.directAutoTick(), race.b.context.directAutoTick()]);
  const history = race.a.context.directSyncParse(race.rows);
  assert.equal(core.inspectHistory(history).state, 'conflict');
  assert.equal(race.a.values.get('tx'), '[{"id":1},{"id":2}]');
  assert.equal(race.b.values.get('tx'), '[{"id":1},{"id":3}]');
  assert.equal(race.rows.length, 4);

  const reminders = setup();
  reminders.a.values.set('tx', '[{"id":1},{"id":9}]');
  reminders.b.values.set('rem', '[{"id":42,"title":"test"}]');
  reminders.b.context.directSyncSnapshot = () => ({ format: 'expense-app-backup', version: 1, data: { tx: reminders.b.values.get('tx'), accounts: '{}', rem: reminders.b.values.get('rem') } });
  reminders.b.start(); await reminders.b.context.directAutoTick();
  reminders.a.context.directSyncSnapshot = () => ({ format: 'expense-app-backup', version: 1, data: { tx: reminders.a.values.get('tx'), accounts: '{}', ...(reminders.a.values.has('rem') ? { rem: reminders.a.values.get('rem') } : {}) } });
  reminders.a.context.BACKUP_KEYS.push('rem');
  await reminders.a.run();
  assert.equal(reminders.a.values.get('tx'), '[{"id":1},{"id":9}]');
  assert.equal(reminders.a.values.get('rem'), '[{"id":42,"title":"test"}]');
  assert.equal(reminders.a.reloads(), 1);
  assert.equal(reminders.rows.length, 3);
  assert.equal(JSON.parse(reminders.a.values.get('directReceiveJournal')).phase, 'committed');
  console.log('Two-device direct sync tests passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
