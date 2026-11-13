'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const src=fs.readFileSync('app.js','utf8'), index=fs.readFileSync('index.html','utf8'), sw=fs.readFileSync('sw.js','utf8');
assert.match(src,/const BUILD = '[^']+'; const BUILD_VERSION = '۱۶۶'/);
const after=src.indexOf('settingsLayout(el);'), footer=src.indexOf('زمان آماده‌سازی این نسخه', after);
assert.ok(footer > after); assert.match(index,/app\.js\?v=168/); assert.match(sw,/exp-v168/);
