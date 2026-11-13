'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('app.js', 'utf8');
const backupCode = source.slice(source.indexOf('const BACKUP_KEYS'), source.indexOf('let tx ='));
const mergeCode = source.slice(source.indexOf('const CATEGORY_MERGE_BACKUP'), source.indexOf('migrateCategoriesOnce();'));
const learningCode = source.slice(source.indexOf('function categorySuggestion('), source.indexOf('function updateCategorySuggestion('));
assert.ok(backupCode && mergeCode && learningCode);

function makeContext(failBackup = false) {
  const map = new Map([['tx', JSON.stringify([{ id: 1, type: 'debit', cat: 'سوپرمارکت', amount: 100 }, { id: 2, type: 'credit', cat: 'سایر', amount: 200 }])], ['accounts', '{}'], ['cats', JSON.stringify(['خرید', 'سوپرمارکت', 'سایر', 'درمان'])]]);
  const storage = { getItem: k => map.has(k) ? map.get(k) : null, removeItem: k => map.delete(k), setItem(k, v) { if (failBackup && k === 'categoryMerge155Backup') throw Error('storage full'); map.set(k, String(v)); } };
  const c = vm.createContext({ localStorage: storage, console: { error() {} } });
  vm.runInContext("const lsj=(key, fallback)=>JSON.parse(localStorage.getItem(key) || 'null') || fallback, DEFAULT_CATS=['خرید']; let tx = JSON.parse(localStorage.getItem('tx')), accounts = {}; const CATS = JSON.parse(localStorage.getItem('cats'));", c);
  vm.runInContext(backupCode + mergeCode, c);
  return { c, map };
}
{
  const { c, map } = makeContext(); c.migrateCategoriesOnce();
  const saved = JSON.parse(map.get('categoryMerge155Backup'));
  assert.equal(JSON.parse(saved.data.tx)[0].cat, 'سوپرمارکت');
  assert.equal(JSON.parse(map.get('tx'))[0].cat, 'خرید');
  assert.equal(JSON.parse(map.get('tx'))[1].cat, 'سایر');
  assert.equal(map.get('categoryMerge155Done'), '1');
  const backup = map.get('categoryMerge155Backup'); c.migrateCategoriesOnce(); assert.equal(map.get('categoryMerge155Backup'), backup);
  vm.runInContext("tx.push({id:3,type:'debit',cat:'خرید',amount:300})", c);
  c.restoreCategoriesBeforeMerge();
  const restored = JSON.parse(map.get('tx')); assert.equal(restored[0].cat, 'سوپرمارکت'); assert.equal(restored[2].id, 3);
  assert.equal(map.get('categoryMerge155Done'), '1');
}
{
  const { c, map } = makeContext(true); const before = map.get('tx'); c.migrateCategoriesOnce();
  assert.equal(map.get('tx'), before); assert.equal(map.has('categoryMerge155Done'), false);
}
{
  const { c, map } = makeContext(); c.migrateCategoriesOnce();
  map.delete('categoryMerge155Done'); map.set('categoryMerge155InProgress', JSON.stringify({dirty:null}));
  c.migrateCategoriesOnce();
  assert.equal(JSON.parse(JSON.parse(map.get('categoryMerge155Backup')).data.tx)[0].cat, 'سوپرمارکت');
  assert.equal(map.has('categoryMerge155InProgress'), false);
}
{
  const c = vm.createContext({});
  vm.runInContext("const nrm = s => String(s).replace(/\\s/g,'').toLowerCase(); const CATS=['درمان','خرید']; let tx=[{id:1,type:'debit',seller:'فروشنده',cat:'درمان'}, {id:2,type:'debit',seller:'فروشنده',cat:'درمان'}];" + learningCode, c);
  assert.equal(c.categorySuggestion({ id: 3 }, 'فروشنده', ''), 'درمان');
  assert.equal(c.categorySuggestion({ id: 1 }, 'فروشنده', ''), '');
}
console.log('category migration and suggestions passed');
