'use strict';
const assert = require('node:assert/strict');
const { accountSwitchBackupPrepare } = require('./account-switch-backup.js');
async function run() {
  const values = new Map([['tx', '[{"id":1}]'], ['dataOwner', 'old@example.com'], ['accountOwnerMismatchLock', '1']]);
  const storage = { get length() { return values.size; }, key: i => [...values.keys()][i], getItem: k => values.get(k) ?? null };
  // Legacy backups without dataOwner must still pass their existing validator.
  const backup = { format: 'expense-app-backup', version: 1, data: { tx: '[{"id":1}]', accounts: '{}' } };
  const validate = b => { assert.equal(b.format, 'expense-app-backup'); assert.ok(Array.isArray(JSON.parse(b.data.tx))); };
  const before = JSON.stringify([...values]);
  const raw = await accountSwitchBackupPrepare(storage, () => backup, validate, async x => x);
  assert.equal(JSON.parse(raw).values.dataOwner, 'old@example.com');
  assert.equal(JSON.stringify([...values]), before);
  await assert.rejects(accountSwitchBackupPrepare(storage, () => backup, validate, async () => { throw Error('disk full'); }), /disk full/);
  await assert.rejects(accountSwitchBackupPrepare(storage, () => backup, validate, async () => 'bad'), /پشتیبان/);
  assert.equal(JSON.stringify([...values]), before);
  await assert.rejects(accountSwitchBackupPrepare(storage, () => backup, validate, async raw => { values.set('tx', '[]'); return raw; }), /تغییر کرد/);
  values.set('tx', '[{"id":1}]');
  assert.equal(JSON.stringify([...values]), before);
}
module.exports = run;
if (require.main === module) run().catch(error => { console.error(error); process.exitCode = 1; });
