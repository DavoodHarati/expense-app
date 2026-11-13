'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const src=fs.readFileSync('app.js','utf8');
assert.ok(src.includes("localStorage.setItem('lastBackupAt', String(Date.now()))"));
assert.ok(src.indexOf("localStorage.setItem('lastBackupAt'") > src.indexOf('link.click(); link.remove()'));
assert.ok(src.includes('ذخیره در گوشی را بررسی کن'));
const keys=src.slice(src.indexOf('const BACKUP_KEYS'),src.indexOf('function makeFullBackup'));
assert.ok(!keys.includes('lastBackupAt'));
