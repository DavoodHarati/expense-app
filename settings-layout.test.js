'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

class Element {
  constructor(tag, id = '', text = '') { this.tagName = tag.toUpperCase(); this.id = id; this.textContent = text; this.children = []; this.open = false; }
  querySelector(selector) { return selector === 'summary' ? this.children.find(child => child.tagName === 'SUMMARY') : null; }
  appendChild(child) {
    if (child.parent) child.parent.children.splice(child.parent.children.indexOf(child), 1);
    child.parent = this; this.children.push(child); return child;
  }
}
const card = (id, title) => { const element = new Element('details', id); element.appendChild(new Element('summary', '', title)); return element; };
const root = new Element('main');
const entries = [
  card('', 'همگام‌سازی با Google Sheets'), card('', 'نام حساب‌ها'), card('', 'پشتیبان‌گیری'),
  card('google-test', 'آزمایش ورود به گوگل'), card('google-copy', 'نسخه پشتیبان در گوگل'),
  card('easy-setup', 'ساخت اتصال آسان گوگل'), card('direct-sync', 'اتصال مستقیم'),
  card('legacy-inbox', 'پیامک‌های شورتکات'), card('jbc', 'شغل من'), card('lbc', 'برچسب‌ها'),
  card('', 'کد راه‌اندازی'), card('', 'پیامک‌های دریافتی'), card('dpc', 'تراکنش‌های تکراری')
];
entries.forEach(entry => root.appendChild(entry));
const reference = entries[5]; reference.onclick = () => 'preserved';
const source = fs.readFileSync('app.js', 'utf8');
const start = source.indexOf('function settingsLayout(el) {');
const end = source.indexOf('// کارت‌ها را کشویی', start);
assert.ok(start >= 0 && end > start);
const context = vm.createContext({ document: { createElement: tag => new Element(tag) } });
vm.runInContext(source.slice(start, end), context);
context.settingsLayout(root);
assert.deepEqual(root.children.map(item => item.querySelector('summary').textContent), ['تنظیمات ساده', 'ابزارهای پرکاربرد', 'پیشرفته و حرفه‌ای', 'مدیریت']);
const simple = root.children[0], tools = root.children[1], advanced = root.children[2];
assert.equal(advanced.id, 'settings-advanced'); assert.equal(advanced.open, false);
assert.ok(simple.children.some(item => item.id === 'jbc'));
assert.ok(tools.children.some(item => item.id === 'legacy-inbox'));
assert.ok(advanced.children.includes(reference)); assert.equal(reference.onclick(), 'preserved');
assert.ok(advanced.children.some(item => item.id === 'direct-sync'));
assert.equal(entries.length, 13);
console.log('settings layout: OK');
