'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const c = vm.createContext({}); vm.runInContext(fs.readFileSync('features-157.js','utf8'),c);
const cats = ['خرید','درمان','سوخت','بدون سقف'];
const transactions = [
  {cat:'خرید',type:'debit',amount:790,date:'1405/08/01'},
  {cat:'درمان',type:'debit',amount:800,date:'1405/08/01'},
  {cat:'سوخت',type:'debit',amount:1000,date:'1405/08/01'},
  {cat:'خرید',type:'debit',amount:5000,date:'1405/07/30'},
  {cat:'خرید',type:'debit',amount:5000,date:'1405/08/02',loan:'lent'},
  {cat:'خرید',type:'debit',amount:5000,date:'1405/08/02',xfer:true}
];
const rows=c.budgetRows157(cats,{'خرید':100,'درمان':100,'سوخت':100,'حذف‌شده':30},transactions,'1405/08');
assert.equal(rows.length,3); assert.equal(rows[0].spent,79); assert.equal(rows[0].color,'green');
assert.equal(rows[1].color,'yellow'); assert.equal(rows[2].color,'red');
console.log('budget tests passed');
