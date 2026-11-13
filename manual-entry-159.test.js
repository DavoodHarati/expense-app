'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const src=fs.readFileSync('app.js','utf8');
for(const id of ['sms','go','pst','manual-open-159','manual-entry-159','ma','mg']) assert.ok(src.includes('id="'+id+'"'), id);
assert.ok(src.includes('ثبت پیامک دستی')); assert.ok(src.includes('ثبت تراکنش دستی'));
assert.ok(src.includes("card.open = true; card.scrollIntoView"));
assert.ok(src.indexOf("$('#manual-open-159').onclick") > src.indexOf('<button type="button" id="manual-open-159"'));
