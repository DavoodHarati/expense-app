'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

(async () => {
  let copied = '', fallback = '', message = '', wide = false;
  const elements = [];
  const container = { children: [], replaceChildren() { this.children = []; }, appendChild(child) { this.children.push(child); } };
  const context = vm.createContext({
    URL, load: () => wide, navigator: { clipboard: { writeText: async value => { copied = value; } } },
    window: { prompt: (_, value) => { fallback = value; } },
    document: { getElementById: () => container, createElement: tag => { const el = { tag }; elements.push(el); return el; } }
  });
  vm.runInContext(fs.readFileSync('direct-sync-ui.js', 'utf8'), context);
  context.directSyncMessage = value => { message = value; };
  assert.doesNotMatch(context.directSyncScope(), /auth\/spreadsheets/);
  wide = true; assert.match(context.directSyncScope(), /auth\/spreadsheets/); wide = false;
  assert.equal(context.directSyncSheetId('https://docs.google.com/spreadsheets/u/0/d/abc_123/edit?x=1'), 'abc_123');
  assert.equal(context.directSyncSheetId('https://docs.google.com/spreadsheets/d/abc_123/edit'), 'abc_123');
  for (const input of ['https://docs.google.com.evil.test/spreadsheets/d/abc/edit', 'http://docs.google.com/spreadsheets/d/abc/edit', 'https://docs.google.com/spreadsheets/u/0/']) assert.equal(context.directSyncSheetId(input), '');
  context.directSyncLink({ id: 'abc_123' });
  const button = container.children.find(child => child.tag === 'button');
  await button.onclick(); assert.equal(copied, 'https://docs.google.com/spreadsheets/d/abc_123/edit'); assert.match(message, /کپی شد/);
  context.navigator.clipboard.writeText = async () => { throw Error('denied'); };
  await button.onclick(); assert.equal(fallback, copied);
  context.directSyncLink({ id: 'invalid/other' }); assert.equal(container.children.length, 0);
  const error = await context.directSyncReadError({ status: 403, json: async () => ({ error: { errors: [{ reason: 'appNotAuthorizedToFile' }] } }) }, 'test@example.invalid');
  assert.match(error, /appNotAuthorizedToFile/); assert.match(error, /test@example.invalid/); assert.match(error, /تأیید نشد/);
  assert.throws(() => context.directSyncCheckGranted({ scope: 'openid email' }, 'openid https://www.googleapis.com/auth/spreadsheets'), /صادر نکرد/);
  context.directSyncCheckGranted({ scope: 'openid https://www.googleapis.com/auth/spreadsheets' }, 'openid https://www.googleapis.com/auth/spreadsheets');
  const detail = await context.directSyncReadError({ status: 403, json: async () => ({ error: { status: 'PERMISSION_DENIED', details: [{ reason: 'SERVICE_DISABLED' }] } }) }, 'test@example.invalid');
  assert.match(detail, /SERVICE_DISABLED/); assert.match(detail, /PERMISSION_DENIED/);
  const unknown = await context.directSyncReadError({ status: 403, json: async () => { throw Error('bad body'); } }, 'test@example.invalid');
  assert.match(unknown, /403/);
  console.log('Direct sync link tests passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
