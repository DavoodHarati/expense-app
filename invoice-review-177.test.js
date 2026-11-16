const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const app = fs.readFileSync('app.js', 'utf8');
const invoice = fs.readFileSync('invoice.js', 'utf8');
const display = invoice.slice(invoice.indexOf('function invoiceDisplayPercent177('), invoice.indexOf('// Only an explicit payment link'));
const pct = vm.runInNewContext(display + '; invoiceDisplayPercent177');
const item = { id:'a', assistant:'A', share:200, shareMode:'fixed' };
const payment = { invoicePaymentId:'a', colleague:'A', shareMode:'percent', pct:20, shareAmount:2000 };
assert.strictEqual(pct(item, [payment]), 20);
assert.strictEqual(pct(item, [{...payment, shareAmount:3000}]), null);
assert.strictEqual(pct(item, [payment, {...payment}]), null);
assert.strictEqual(pct({...item, shareValue:'200'}, [payment]), null);
assert.strictEqual(pct({...item, shareMode:'percent', shareValue:'15'}, []), 15);
const fn = app.slice(app.indexOf('function invoiceStartEditing()'), app.indexOf('function invoiceRefreshReport()'));
for (const initial of ['home','report']) {
  const form = {hidden:true}, card = {open:false}, summary = {textContent:''};
  const env = {tab:initial, topic:'invoices', addMode164:'', navigationRender163(){}, document:{getElementById(id){return id==='invoice-form-fields' ? form : id==='invoice-card' ? card : {classList:{remove(){}}};}, querySelector(){return summary;}}};
  vm.runInNewContext(fn + '; invoiceStartEditing()', env);
  assert.strictEqual(env.tab, 'add'); assert.strictEqual(form.hidden, false); assert.strictEqual(card.open, true);
}
assert(app.includes('class="transaction-customer-177"'));
console.log('invoice edit navigation, transaction section and conservative historical share: PASS');
