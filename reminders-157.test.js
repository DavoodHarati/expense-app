'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const c = vm.createContext({}); vm.runInContext(fs.readFileSync('features-157.js','utf8'),c);
const items=[{r:{id:1},days:3},{r:{id:2},days:1},{r:{id:3},days:-1},{r:{id:4,done:true},days:1}];
const first=c.dueNotices157(items,{},'2026-11-13'); assert.equal(first.length,2);
const shown={}; first.forEach(x=>shown[x.key]='shown');
assert.equal(c.dueNotices157(items,shown,'2026-11-13').length,0);
shown['1|3|2026-11-13']='dismissed'; assert.equal(c.dueNotices157(items,shown,'2026-11-13').length,0);
console.log('reminder tests passed');
