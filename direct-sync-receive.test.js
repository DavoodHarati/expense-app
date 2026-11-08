'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const core = require('./direct-sync-core.js');

function fixture() {
  const values = new Map([['tx', '[{"id":1}]'], ['accounts', '{}'], ['rem', '[{"id":2}]'], ['noSync', '1'], ['directSyncState', JSON.stringify({ id: 'sheet', email: 'a', base: 'root' })]]);
  const backupKeys = ['tx', 'accounts', 'rem', 'sync', 'sync_bak', 'syncLock', 'sheetUrl', 'noSync', 'googleTestSheet'];
  let failKey = null, downloaded = null, legacyAtBoot = false, reloads = 0;
  const storage = {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem(key, value) { if (key === failKey) { failKey = null; throw new Error('storage full'); } values.set(key, String(value)); },
    removeItem: key => values.delete(key)
  };
  const context = vm.createContext({
    JSON, Object, Array, Set, Date, Error, localStorage: storage, BACKUP_KEYS: backupKeys, DirectSyncCore: core,
    document: { getElementById: () => ({ textContent: '' }) }, location: { reload() { reloads++; } },
    get directReceiveLegacyAtBoot() { return legacyAtBoot; },
    SYNC: () => storage.getItem('sync') || storage.getItem('sync_bak'),
    load: (key, fallback) => { const value = storage.getItem(key); return value === null ? fallback : JSON.parse(value); },
    directSyncSnapshot: () => ({ data: { tx: storage.getItem('tx'), accounts: storage.getItem('accounts'), rem: storage.getItem('rem') } }),
    validateFullBackup: backup => { if (!backup || !backup.data || !Array.isArray(JSON.parse(backup.data.tx))) throw new Error('invalid backup'); },
    makeFullBackup: () => ({ data: { tx: storage.getItem('tx'), accounts: storage.getItem('accounts') } }),
    directSyncDownload: backup => { downloaded = backup; }
  });
  vm.runInContext(fs.readFileSync('direct-sync-receive.js', 'utf8'), context);
  const state = { id: 'sheet', email: 'a', base: 'root' };
  const remote = { format: 'expense-app-backup', version: 1, data: { tx: '[{"id":1},{"id":3}]', accounts: '{}', rem: '[]' } };
  const expected = () => core.canonicalData(context.directSyncSnapshot().data);
  return { values, storage, context, state, remote, expected, fail: key => { failKey = key; }, setLegacy: () => { legacyAtBoot = true; }, downloaded: () => downloaded, reloads: () => reloads };
}

const a = fixture(), before = a.expected();
a.context.directReceiveApply(a.remote, before, a.state, 'next');
assert.equal(a.storage.getItem('tx'), a.remote.data.tx);
assert.equal(JSON.parse(a.storage.getItem('directSyncState')).base, 'next');
assert.equal(JSON.parse(a.storage.getItem('directReceiveJournal')).phase, 'committed');
a.context.directReceiveDownloadPrevious(); assert.equal(a.downloaded().data.tx, '[{"id":1}]');
assert.equal(a.context.directReceiveRecover(), true); assert.equal(a.storage.getItem('tx'), a.remote.data.tx);
assert.throws(() => a.context.directReceiveApply(a.remote, a.expected(), a.state, 'next'), /پشتیبان/);

const b = fixture(); b.setLegacy(); assert.throws(() => b.context.directReceiveApply(b.remote, b.expected(), b.state, 'next'), /قدیمی/);
assert.equal(b.storage.getItem('tx'), '[{"id":1}]'); assert.equal(b.storage.getItem('directReceiveJournal'), null);

const c = fixture(); assert.throws(() => c.context.directReceiveApply(c.remote, 'stale', c.state, 'next'), /تغییر کرد/);
assert.equal(c.storage.getItem('directReceiveJournal'), null);

const d = fixture(); d.fail('directReceiveJournal'); assert.throws(() => d.context.directReceiveApply(d.remote, d.expected(), d.state, 'next'), /storage full/);
assert.equal(d.storage.getItem('tx'), '[{"id":1}]');

const e = fixture(), original = e.expected(); e.fail('rem'); assert.throws(() => e.context.directReceiveApply(e.remote, original, e.state, 'next'), /storage full/);
assert.equal(e.expected(), original); assert.equal(e.storage.getItem('directReceiveJournal'), null); assert.equal(e.reloads(), 0);

const f = fixture(); f.storage.setItem('directReceiveJournal', JSON.stringify({ version: 1, phase: 'pending', old: { tx: '[{"id":1}]', rem: '[{"id":2}]' } }));
f.storage.setItem('tx', '[{"id":9}]'); assert.equal(f.context.directReceiveRecover(), true);
assert.equal(f.storage.getItem('tx'), '[{"id":1}]'); assert.equal(f.storage.getItem('directReceiveJournal'), null);
console.log('Direct receive tests passed.');
