'use strict';
const assert = require('node:assert/strict');
const { parseSms } = require('./parser.js');
const fs = require('node:fs'), vm = require('node:vm');
for (const bank of ['ملت', 'سامان', 'پاسارگاد', 'صادرات']) {
  const parsed = parseSms(`بانک ${bank}\nبرداشت: 100,000 ریال`);
  assert.equal(parsed.bank, bank); assert.equal(parsed.review, 'experimental');
  assert.equal(parsed.amount, undefined);
}
assert.equal(parseSms('یک متن ناشناخته'), null);
assert.equal(parseSms('بانک ملت رمز ورود 1234').ignored, 'otp');
const national = parseSms('بانک ملی\nبرداشت: 100,000-\nحساب: 123456');
assert.equal(national.bank, 'ملی'); assert.equal(national.amount, 100000); assert.equal(national.type, 'debit');
const blue = parseSms('برداشت پول\n100,000 ریال از حساب\nموجودی: 200,000 ریال');
assert.equal(blue.bank, 'بلو'); assert.equal(blue.amount, 100000);
const mehr = parseSms('123456789012\n100,000 -\n1405/08/22-12:30\nمانده: 200,000');
assert.equal(mehr.bank, 'مهر ایران'); assert.equal(mehr.amount, 100000);
const app = fs.readFileSync('app.js', 'utf8');
const body = app.slice(app.indexOf('function addSms0(raw)'), app.indexOf('\nfunction handleUrl()', app.indexOf('function addSms0(raw)')));
const c = vm.createContext({ parseSms, accounts: {}, tx: [], save() { throw Error('unexpected write'); } });
vm.runInContext(body, c);
assert.equal(c.addSms0('بانک ملت\nبرداشت: 100,000 ریال').review, true);
assert.equal(c.addSms0('پیام نامشخص').review, true);
assert.equal(c.tx.length, 0); assert.equal(Object.keys(c.accounts).length, 0);
console.log('parser experimental and existing banks passed');
