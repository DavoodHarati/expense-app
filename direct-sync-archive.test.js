'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function fixture(fail) {
  const journal = JSON.stringify({ version: 1, phase: 'committed', old: { tx: '[]', accounts: '{}' } });
  const values = new Map([['directReceiveJournal', journal]]), archives = [];
  const storage = { getItem: key => values.get(key) || null, removeItem: key => values.delete(key) };
  const database = {
    objectStoreNames: { contains: () => true }, close() {},
    transaction(store, mode) {
      const transaction = { objectStore: () => ({ add(value) { if (!fail) archives.push(value); }, openCursor() { const cursor = {}; setTimeout(() => { cursor.result = archives.length ? { value: archives[archives.length - 1] } : null; cursor.onsuccess(); }, 0); return cursor; } }) };
      setTimeout(() => fail ? transaction.onabort() : transaction.oncomplete(), 0);
      return transaction;
    }
  };
  const indexedDB = { open() { const request = { result: database }; setTimeout(() => request.onsuccess(), 0); return request; } };
  let downloaded = null;
  const context = vm.createContext({ JSON, Promise, Date, Error, localStorage: storage, indexedDB, BACKUP_KEYS: ['tx', 'accounts'], validateFullBackup() {}, directSyncDownload: backup => { downloaded = backup; } });
  vm.runInContext(fs.readFileSync('direct-sync-receive.js', 'utf8'), context);
  return { context, storage, archives, journal, downloaded: () => downloaded };
}

(async () => {
  const success = fixture(false); await success.context.directReceiveArchivePrevious();
  assert.equal(success.storage.getItem('directReceiveJournal'), null);
  assert.equal(success.archives[0].journal, success.journal);
  await success.context.directReceiveDownloadArchived();
  assert.equal(success.downloaded().data.tx, '[]');
  const failure = fixture(true); await assert.rejects(failure.context.directReceiveArchivePrevious());
  assert.equal(failure.storage.getItem('directReceiveJournal'), failure.journal);
  const unsupported = fixture(false); delete unsupported.context.indexedDB;
  await assert.rejects(unsupported.context.directReceiveArchivePrevious());
  assert.equal(unsupported.storage.getItem('directReceiveJournal'), unsupported.journal);
  console.log('Direct backup archive tests passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
