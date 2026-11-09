'use strict';

const assert = require('node:assert/strict');
const { previewMerge, mergeAddedReminders } = require('./direct-sync-core.js');
const data = (transactions, extra = {}) => ({ tx: JSON.stringify(transactions), accounts: '{}', ...extra });

const base = data([{ id: 1, amount: 10 }]);
const local = data([{ id: 1, amount: 10 }, { id: 2, amount: 20 }]);
const remote = data([{ id: 1, amount: 10 }, { id: 3, amount: 30 }]);
const merged = previewMerge(base, local, remote);
assert.deepEqual(merged.conflicts, []);
assert.deepEqual(JSON.parse(merged.data.tx).map(item => item.id).sort(), [1, 2, 3]);

const edited = data([{ id: 1, amount: 11 }]);
const conflicting = data([{ id: 1, amount: 12 }]);
assert.deepEqual(previewMerge(base, edited, conflicting).conflicts, [{ key: 'tx', id: '1' }]);
assert.deepEqual(previewMerge(base, data([]), edited).conflicts, [{ key: 'tx', id: '1' }]);
assert.deepEqual(JSON.parse(previewMerge(base, data([]), base).data.tx), []);
assert.deepEqual(previewMerge(data([{ id: 1, amount: 10, note: 'old' }]), data([{ id: 1, amount: 11, note: 'old' }]), data([{ id: 1, amount: 10, note: 'new' }])).conflicts, [{ key: 'tx', id: '1' }]);
assert.deepEqual(previewMerge(data([{ id: 1, amount: 10 }]), data([{ amount: 10, id: 1 }]), base).conflicts, []);
assert.deepEqual(previewMerge(base, data([], { txDel: '["1"]' }), base).conflicts, []);
assert.deepEqual(previewMerge(data([], { job: 'one' }), data([], { job: 'two' }), data([], { job: 'three' })).conflicts, [{ key: 'job', id: '' }]);
assert.throws(() => previewMerge(base, data([{ id: 1 }, { id: 1 }]), remote), /duplicate/);
assert.throws(() => previewMerge(base, data([{ amount: 1 }]), remote), /record ID/);
const reminderBase = data([{ id: 1 }], { rem: '[{"id":10,"title":"قبلی"}]' });
const reminderLocal = data([{ id: 1 }, { id: 2 }], { rem: reminderBase.rem });
const reminderRemote = data([{ id: 1 }], { rem: '[{"id":10,"title":"قبلی"},{"id":11,"title":"تست"}]' });
assert.deepEqual(mergeAddedReminders(reminderBase, reminderLocal, reminderRemote), { ...reminderLocal, rem: reminderRemote.rem });
assert.equal(mergeAddedReminders(reminderBase, { ...reminderLocal, rem: '[]' }, reminderRemote), null);
assert.equal(mergeAddedReminders(reminderBase, reminderLocal, { ...reminderRemote, accounts: '{"changed":1}' }), null);
assert.equal(mergeAddedReminders(reminderBase, reminderLocal, { ...reminderRemote, rem: '[{"id":10,"title":"تغییر"},{"id":11}]' }), null);
assert.equal(mergeAddedReminders(reminderBase, reminderLocal, { ...reminderRemote, rem: '[{"id":10,"title":"قبلی"},{"id":10}]' }), null);
const bothAdded = { ...reminderLocal, rem: '[{"id":10,"title":"قبلی"},{"id":12,"title":"گوشی"}]' };
assert.deepEqual(JSON.parse(mergeAddedReminders(reminderBase, bothAdded, reminderRemote).rem).map(x => x.id), [10, 12, 11]);
assert.equal(mergeAddedReminders(reminderBase, { ...bothAdded, rem: '[{"id":10,"title":"قبلی"},{"id":11,"title":"دیگر"}]' }, reminderRemote), null);
assert.equal(mergeAddedReminders(reminderBase, { ...bothAdded, rem: '[{"id":10,"title":"ویرایش"},{"id":12}]' }, reminderRemote), null);
console.log('Direct sync merge preview tests passed.');
