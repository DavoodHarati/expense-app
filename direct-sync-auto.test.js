'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const { TextEncoder } = require('node:util');
const core = require('./direct-sync-core.js');

function fixture() {
  const base = { format: 'expense-app-backup', version: 1, data: { tx: '[{"id":1,"amount":10}]', accounts: '{}' } };
  const newer = { format: 'expense-app-backup', version: 1, data: { tx: '[{"id":1,"amount":20}]', accounts: '{}' } };
  const rows = [['expense-direct-sync', '1'], ['root', 'ROOT', 'time', '1', JSON.stringify(base)]];
  let state = { id: 'sheet', email: 'test@example.invalid', base: 'root' }, snapshot = newer, posts = 0, race = false, fail = false, uncertain = false, uncertainMissing = false, failReadAfterPost = false;
  const writes = [];
  const localValues = new Map();
  const sessionValues = new Map();
  const context = vm.createContext({
    console, URL, Date, JSON, Number, String, Math, Array, Object, Error, Set, Map, Uint8Array, Uint32Array,
    crypto: webcrypto, TextEncoder, DirectSyncCore: core, googleTestBusy: false,
    document: { visibilityState: 'visible', getElementById: () => null, addEventListener() {} },
    addEventListener() {}, setInterval() { return 1; }, clearInterval() {},
    load: (key, fallback) => key === 'directSyncState' ? { ...state } : fallback,
    localStorage: { getItem(key) { return localValues.get(key) || null; }, setItem(key, value) { writes.push({ key, value }); localValues.set(key, value); if (key === 'directSyncState') state = JSON.parse(value); }, removeItem(key) { localValues.delete(key); } },
    sessionStorage: { getItem: key => sessionValues.get(key) || null, setItem: (key, value) => sessionValues.set(key, value), removeItem: key => sessionValues.delete(key) },
    makeFullBackup: () => snapshot, validateFullBackup() {}, googleTestButton() {},
    fetch: async (url, options = {}) => {
      if (fail) throw new Error('offline');
      if (options.method === 'POST') {
        posts++;
        if (uncertainMissing) { uncertainMissing = false; throw new Error('connection lost before record'); }
        if (race) rows.push(['other', 'root', 'time', '1', JSON.stringify(newer)]);
        rows.push(...JSON.parse(options.body).values);
        if (uncertain) { uncertain = false; throw new Error('connection lost'); }
      }
      else if (failReadAfterPost && posts) { failReadAfterPost = false; throw new Error('connection lost during verification'); }
      return { ok: true, json: async () => ({ values: rows }) };
    }
  });
  vm.runInContext(fs.readFileSync('direct-sync-ui.js', 'utf8'), context);
  context.directSyncButtons = () => {}; context.directSyncLink = () => {};
  vm.runInContext(fs.readFileSync('direct-sync-auto.js', 'utf8'), context);
  const start = () => vm.runInContext("directAutoSession = { token: 'secret-token', expires: Date.now() + 600000, id: 'sheet', email: 'test@example.invalid' }", context);
  return { context, rows, writes, start, state: () => state, posts: () => posts, setRace: () => { race = true; }, setFail: () => { fail = true; }, restoreNetwork: () => { fail = false; }, setUncertain: () => { uncertain = true; }, setUncertainMissing: () => { uncertainMissing = true; }, setFailReadAfterPost: () => { failReadAfterPost = true; }, setSnapshot: value => { snapshot = value; }, base, newer };
}

(async () => {
  const a = fixture(); a.start(); await a.context.directAutoTick();
  assert.equal(a.posts(), 1); assert.notEqual(a.state().base, 'root');
  assert.ok(a.writes.every(write => !write.value.includes('secret-token')));
  await a.context.directAutoTick(); assert.equal(a.posts(), 1);

  const b = fixture(); b.start(); b.setRace(); await b.context.directAutoTick();
  assert.equal(b.posts(), 1); assert.equal(b.state().base, 'root');
  assert.equal(vm.runInContext('directAutoSession', b.context), null);
  assert.match(vm.runInContext('directAutoStatus', b.context), /هم‌زمان/);

  const c = fixture(); c.rows.push(['other', 'root', 'time', '1', JSON.stringify(c.newer)]); c.setSnapshot(c.base); c.start();
  await c.context.directAutoTick(); assert.equal(c.posts(), 0); assert.equal(vm.runInContext('directAutoSession', c.context), null);
  assert.match(vm.runInContext('directAutoStatus', c.context), /انتخاب نشده بود/);

  const d = fixture(); d.start(); d.setFail(); await d.context.directAutoTick();
  assert.equal(d.posts(), 0); assert.equal(d.state().base, 'root'); assert.ok(vm.runInContext('directAutoSession', d.context));
  assert.match(vm.runInContext('directAutoStatus', d.context), /برگشت اینترنت/);
  d.restoreNetwork(); await d.context.directAutoTick(); assert.equal(d.posts(), 1); assert.ok(vm.runInContext('directAutoSession', d.context));

  const e = fixture(); e.start(); vm.runInContext('directAutoSession.expires = Date.now() - 1', e.context); await e.context.directAutoTick();
  assert.equal(e.posts(), 0); assert.equal(e.state().base, 'root'); assert.match(vm.runInContext('directAutoStatus', e.context), /منقضی/);

  const f = fixture(); f.start(); await f.context.directAutoTick(); f.setSnapshot(f.base); await f.context.directAutoTick();
  assert.equal(f.posts(), 2); assert.equal(f.rows.length, 4);

  const g = fixture(); g.start(); g.setUncertain(); await g.context.directAutoTick();
  assert.equal(g.state().base, 'root'); assert.match(vm.runInContext('directAutoStatus', g.context), /نامشخص/);
  const persisted = JSON.parse(g.context.localStorage.getItem('directAutoPending'));
  assert.equal(persisted.hash.length, 64); assert.ok(!JSON.stringify(persisted).includes('secret-token')); assert.ok(!JSON.stringify(persisted).includes('amount'));
  g.context.directAutoStop();
  const restarted = vm.createContext({ ...g.context });
  vm.runInContext(fs.readFileSync('direct-sync-auto.js', 'utf8'), restarted);
  vm.runInContext("directAutoSession = { token: 'new-token', expires: Date.now() + 600000, id: 'sheet', email: 'test@example.invalid' }", restarted);
  await restarted.directAutoTick(); assert.equal(g.posts(), 1); assert.notEqual(g.state().base, 'root'); assert.ok(vm.runInContext('directAutoSession', restarted));
  assert.equal(g.context.localStorage.getItem('directAutoPending'), null);

  const missing = fixture(); missing.start(); missing.setUncertainMissing(); await missing.context.directAutoTick();
  await missing.context.directAutoTick(); await missing.context.directAutoTick();
  assert.equal(missing.posts(), 1); assert.equal(missing.state().base, 'root');
  assert.match(vm.runInContext('directAutoStatus', missing.context), /بدون ارسال تکراری/);
  let manualMessage = ''; missing.context.directSyncMessage = message => { manualMessage = message; };
  missing.context.directSyncAuthorize('run'); assert.match(manualMessage, /ارسال قبلی/);
  const invalid = fixture(); invalid.context.localStorage.setItem('directAutoPending', '{invalid'); invalid.start();
  await invalid.context.directAutoTick(); assert.equal(invalid.posts(), 0); assert.match(vm.runInContext('directAutoStatus', invalid.context), /معتبر نیست/);

  const interrupted = fixture(); interrupted.start(); interrupted.setFailReadAfterPost();
  await interrupted.context.directAutoTick();
  assert.equal(interrupted.posts(), 1); assert.equal(interrupted.rows.length, 3);
  assert.equal(interrupted.state().base, 'root');
  assert.match(vm.runInContext('directAutoStatus', interrupted.context), /نامشخص/);
  await interrupted.context.directAutoTick();
  assert.equal(interrupted.posts(), 1); assert.notEqual(interrupted.state().base, 'root');

  const h = fixture(); let callback, checks = 0;
  h.context.confirm = () => true; h.context.GOOGLE_TEST_CLIENT = 'client';
  h.context.fetch = async () => ({ ok: true, json: async () => ({ email: 'test@example.invalid' }) });
  h.context.google = { accounts: { oauth2: { initTokenClient: options => ({ requestAccessToken() { callback = options.callback({ access_token: 'session-token', expires_in: 3600 }); } }) } } };
  h.context.directAutoTick = () => { checks++; };
  h.context.directAutoStart(); await callback;
  assert.equal(checks, 1); assert.ok(vm.runInContext('!!directAutoSession', h.context));
  assert.ok(h.writes.every(write => !write.value.includes('session-token')));
  h.context.directAutoStop(); assert.equal(vm.runInContext('directAutoSession', h.context), null);
  const resumed = fixture(); let resumedCallback, confirmations = 0;
  resumed.context.sessionStorage.setItem('directAutoResume', JSON.stringify({ id: 'sheet', email: 'test@example.invalid', base: 'root', until: Date.now() + 60000 }));
  resumed.context.document.getElementById = id => id === 'direct-auto-receive' ? { checked: true } : null;
  resumed.context.confirm = () => { confirmations++; return true; }; resumed.context.GOOGLE_TEST_CLIENT = 'client';
  resumed.context.fetch = async () => ({ ok: true, json: async () => ({ email: 'test@example.invalid' }) });
  resumed.context.google = { accounts: { oauth2: { initTokenClient: options => ({ requestAccessToken() { resumedCallback = options.callback({ access_token: 'session-token', expires_in: 3600 }); } }) } } };
  resumed.context.directAutoTick = () => {};
  resumed.context.directAutoStart(); await resumedCallback;
  assert.equal(confirmations, 0); assert.equal(vm.runInContext('directAutoSession.receive', resumed.context), true);
  assert.equal(resumed.context.sessionStorage.getItem('directAutoResume'), null);
  resumed.context.directAutoStop();
  const home = fixture(); let homeCallback;
  const originalLoad = home.context.load;
  home.context.load = (key, fallback) => key === 'directAutoReceiveEnabled' ? true : originalLoad(key, fallback);
  home.context.confirm = () => true; home.context.GOOGLE_TEST_CLIENT = 'client';
  home.context.fetch = async () => ({ ok: true, json: async () => ({ email: 'test@example.invalid' }) });
  home.context.google = { accounts: { oauth2: { initTokenClient: options => ({ requestAccessToken() { homeCallback = options.callback({ access_token: 'home-token', expires_in: 3600 }); } }) } } };
  home.context.directAutoTick = () => {};
  home.context.directAutoStart(); await homeCallback;
  assert.equal(vm.runInContext('directAutoSession.receive', home.context), true);
  assert.ok(home.writes.every(write => !write.value.includes('home-token')));
  home.context.directAutoStop();
  const incoming = fixture(); incoming.rows.push(['other', 'root', 'time', '1', JSON.stringify(incoming.newer)]); incoming.setSnapshot(incoming.base);
  let applied = 0, reloaded = 0, refreshed = 0; incoming.context.DIRECT_RECEIVE_JOURNAL = 'journal';
  incoming.context.directReceiveApply = (backup, value, state, head) => { applied++; assert.equal(head, 'other'); assert.equal(backup.data.tx, incoming.newer.data.tx); incoming.setSnapshot(backup); incoming.context.localStorage.setItem('directSyncState', JSON.stringify({ ...state, base: head })); };
  incoming.context.directReceiveRefreshView = () => { refreshed++; };
  incoming.context.location = { reload() { reloaded++; } }; incoming.context.alert = () => {};
  incoming.start(); vm.runInContext('directAutoSession.receive = true', incoming.context); await incoming.context.directAutoTick();
  assert.equal(applied, 1); assert.equal(refreshed, 1); assert.equal(reloaded, 0); assert.equal(incoming.posts(), 0); assert.ok(vm.runInContext('directAutoSession', incoming.context));
  await incoming.context.directAutoTick(); assert.equal(applied, 1); assert.equal(incoming.posts(), 0); assert.ok(vm.runInContext('directAutoSession', incoming.context));
  const recovery = fixture(); recovery.rows.push(['other', 'root', 'time', '1', JSON.stringify(recovery.newer)]); recovery.setSnapshot(recovery.base);
  recovery.context.DIRECT_RECEIVE_JOURNAL = 'journal'; recovery.context.directReceiveApply = () => {};
  recovery.context.directReceiveRefreshView = () => { throw Error('render failed'); };
  recovery.context.location = { reload() { reloaded++; } }; recovery.context.alert = () => {};
  recovery.start(); vm.runInContext('directAutoSession.receive = true', recovery.context); await recovery.context.directAutoTick();
  assert.equal(reloaded, 1); assert.equal(vm.runInContext('directAutoSession', recovery.context), null);
  const resume = JSON.parse(recovery.context.sessionStorage.getItem('directAutoResume'));
  assert.deepEqual(Object.keys(resume).sort(), ['base', 'email', 'id', 'until']);
  assert.equal(resume.base, 'other');
  assert.equal(recovery.context.directAutoResumePending({ id: 'sheet', email: 'test@example.invalid', base: 'other' }), true);
  assert.equal(recovery.context.directAutoResumePending({ id: 'sheet', email: 'test@example.invalid', base: 'root' }), false);
  resume.until = Date.now() - 1; recovery.context.sessionStorage.setItem('directAutoResume', JSON.stringify(resume));
  assert.equal(recovery.context.directAutoResumePending({ id: 'sheet', email: 'test@example.invalid', base: 'other' }), false);

  const blocked = fixture(); blocked.rows.push(['other', 'root', 'time', '1', JSON.stringify(blocked.newer)]); blocked.setSnapshot(blocked.base);
  blocked.context.DIRECT_RECEIVE_JOURNAL = 'journal'; blocked.context.localStorage.getItem = key => key === 'journal' ? 'previous backup' : null;
  blocked.context.directReceiveArchivePrevious = async () => { throw Error('پشتیبان بایگانی نشد'); };
  blocked.context.directReceiveApply = () => { throw Error('must not apply'); };
  blocked.start(); vm.runInContext('directAutoSession.receive = true', blocked.context); await blocked.context.directAutoTick();
  assert.equal(blocked.posts(), 0); assert.match(vm.runInContext('directAutoStatus', blocked.context), /پشتیبان/);

  const conflict = fixture(); conflict.rows.push(['other', 'root', 'time', '1', JSON.stringify(conflict.newer)]);
  conflict.setSnapshot({ format: 'expense-app-backup', version: 1, data: { tx: '[{"id":1,"amount":30}]', accounts: '{}' } });
  conflict.context.directReceiveApply = () => { throw Error('must not apply'); };
  conflict.start(); vm.runInContext('directAutoSession.receive = true', conflict.context); await conflict.context.directAutoTick();
  assert.equal(conflict.posts(), 0); assert.equal(vm.runInContext('directAutoSession', conflict.context), null);
  assert.match(vm.runInContext('directAutoStatus', conflict.context), /هم این گوشی و هم شیت/);

  const editing = fixture(); editing.rows.push(['other', 'root', 'time', '1', JSON.stringify(editing.newer)]); editing.setSnapshot(editing.base);
  editing.context.busyTyping = () => true; editing.context.directReceiveApply = () => { throw Error('must not apply'); };
  editing.start(); vm.runInContext('directAutoSession.receive = true', editing.context); await editing.context.directAutoTick();
  assert.equal(editing.posts(), 0); assert.match(vm.runInContext('directAutoStatus', editing.context), /صفحه خانه/);

  const activity = fixture(), handlers = {};
  activity.context.document.addEventListener = (name, handler) => { handlers[name] = handler; };
  const app = fs.readFileSync('app.js', 'utf8');
  vm.runInContext(app.slice(app.indexOf('const fmt ='), app.indexOf('function statusCard()')), activity.context);
  activity.context.SYNC = () => null;
  assert.match(activity.context.homeSyncStatus(), /خودکار فعال نیست/);
  activity.start(); activity.context.directAutoShow('آزمایش فعال');
  assert.match(activity.context.homeSyncStatus(), /آزمایش فعال/);
  activity.context.directAutoStop();
  vm.runInContext(app.slice(app.indexOf('let editingUntil = 0;'), app.indexOf('async function refresh()')), activity.context);
  const target = { closest: selector => selector === '#direct-sync' || selector === '#app' ? {} : null };
  activity.context.document.activeElement = { tagName: 'INPUT', type: 'checkbox', disabled: true };
  handlers.input({ target }); handlers.pointerdown({ target });
  assert.equal(vm.runInContext('busyTyping()', activity.context), false);
  activity.context.document.activeElement = { tagName: 'INPUT', type: 'text', disabled: false };
  assert.equal(vm.runInContext('busyTyping()', activity.context), true);
  activity.context.document.activeElement = { tagName: 'INPUT', type: 'checkbox', disabled: false, closest: () => null };
  assert.equal(vm.runInContext('busyTyping()', activity.context), true);
  console.log('Automatic upload tests passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
