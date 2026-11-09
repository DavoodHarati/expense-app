'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const app = fs.readFileSync('app.js', 'utf8');
const source = app.slice(app.indexOf('function directAutoCanApply()'), app.indexOf('async function refresh()'));
const context = vm.createContext({
  Object, Set, JSON,
  localStorage: { getItem: key => key === 'ord' ? 'entry' : null },
  load: (key, fallback) => ({ tx: [{ id: 2 }], accounts: { a: 'new' }, log: [{ id: 3 }], rem: [{ id: 4 }], ppl: [{ id: 5 }], sel: ['a'] }[key] ?? fallback),
  lsj: (key, fallback) => key === 'cats' ? ['جدید'] : fallback,
  busyTyping: () => false, render() { context.renders++; }, renders: 0
});
vm.runInContext("let tab='home', editing=new Set(), drafts={}, pEditing=false, tx=[], accounts={}, log=[], rem=[], ppl=[], sel=null, ord='sms', undo=[1], CATS=['قدیمی'], INC=['قدیمی']; const DEFAULT_CATS=['پیش‌فرض'], DEFAULT_INC=['درآمد'];\n" + source, context);
assert.equal(context.directAutoCanApply(), true);
vm.runInContext("editing.add('1')", context); assert.equal(context.directAutoCanApply(), false);
vm.runInContext("editing.clear(); drafts['1']={};", context); assert.equal(context.directAutoCanApply(), false);
vm.runInContext("delete drafts['1']; tab='settings';", context); assert.equal(context.directAutoCanApply(), false);
vm.runInContext("tab='home'", context); context.directReceiveRefreshView();
assert.equal(vm.runInContext('tx[0].id', context), 2);
assert.equal(vm.runInContext('rem[0].id', context), 4);
assert.equal(vm.runInContext('ppl[0].id', context), 5);
assert.equal(vm.runInContext('CATS[0]', context), 'جدید');
assert.equal(vm.runInContext('INC[0]', context), 'درآمد');
assert.equal(vm.runInContext('undo.length', context), 0);
assert.equal(context.renders, 1);
console.log('Direct refresh tests passed.');
