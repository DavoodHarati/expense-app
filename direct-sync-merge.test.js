'use strict';

const assert = require('node:assert/strict');
const { previewMerge } = require('./direct-sync-core.js');
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
console.log('Direct sync merge preview tests passed.');
