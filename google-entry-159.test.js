'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const src=fs.readFileSync('app.js','utf8');
const home=src.slice(src.indexOf('function homeHtml0()'),src.indexOf('function jd(',src.indexOf('function homeHtml0()')));
assert.ok(!home.includes('id="welcome-sync"')); assert.ok(src.includes('id="welcome-sync"'));
assert.ok(src.includes("directAutoStart(e.target.id === 'welcome-google')"));
assert.ok(src.includes("document.getElementById('easy-setup')"));
for(const id of ['sy','gs','ul','easy-main-sync','easy-main-use']) assert.ok(src.includes('id="'+id+'"'),id);
