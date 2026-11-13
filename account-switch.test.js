'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
async function run() {
  function setup(failKey) {
    const data = new Map(Object.entries({ tx:'[{"id":1}]', accounts:'{"x":"بانک"}', dataOwner:'old@example.com', accountOwnerMismatchLock:'1', accountOwnerPendingEmail:'new@example.com', sync:'https://old.example/exec', sync_bak:'https://old.example/exec', sheetUrl:'old sheet', directSyncState:'{"id":"old"}', unrelated:'preserve me' }));
    let fail = !!failKey;
    const storage = { get length() { return data.size; }, key:i=>[...data.keys()][i]??null, getItem:k=>data.get(k)??null, setItem(k,v) { if (fail && k===failKey) { fail=false; throw Error('storage failure'); } data.set(k,String(v)); }, removeItem:k=>data.delete(k) };
    const ctx = vm.createContext({ localStorage:storage, Date, Math, JSON, Object, Array, Set, String, Error, Promise, setTimeout, document:{getElementById:()=>null}, makeFullBackup:()=>({format:'expense-app-backup',version:1,data:{tx:storage.getItem('tx')||'[]',accounts:storage.getItem('accounts')||'{}',dataOwner:storage.getItem('dataOwner')||'',sync:storage.getItem('sync')||''}}), validateFullBackup:b=>{if(!b?.data||!Array.isArray(JSON.parse(b.data.tx)))throw Error('bad backup');}, accountSwitchArchive:async raw=>raw });
    for (const file of ['account-owner-lock.js','account-switch-backup.js','account-switch.js']) vm.runInContext(fs.readFileSync(file,'utf8'),ctx);
    return { ctx, data, storage };
  }
  const a=setup(), old=[...a.data];
  await a.ctx.accountSwitchSeparate(async raw=>raw);
  assert.equal(a.storage.getItem('accountOwnerMismatchLock'),'1');
  assert.equal(a.storage.getItem('sync'),null); assert.equal(a.storage.getItem('sync_bak'),null); assert.equal(a.storage.getItem('sheetUrl'),null); assert.equal(a.storage.getItem('directSyncState'),null);
  assert.equal(a.storage.getItem('tx'),null); assert.equal(a.storage.getItem('dataOwner'),'new@example.com'); assert.equal(a.storage.getItem('unrelated'),'preserve me');
  let networkCalls=0; a.ctx.fetch=async()=>{networkCalls++; throw Error('unexpected request');}; a.ctx.directSyncMessage=()=>{};
  vm.runInContext(fs.readFileSync('legacy-reference.js','utf8'),a.ctx);
  a.ctx.legacyReferenceRead(); assert.equal(networkCalls,0);
  await assert.rejects(a.ctx.accountOwnerFetch('https://old.example/exec'),/متوقف/); assert.equal(networkCalls,0);
  const archived=JSON.parse(a.storage.getItem('accountArchives'))[0]; assert.equal(archived.owner,'old@example.com'); assert.equal(archived.values.sync,'https://old.example/exec'); assert.equal(archived.backup.data.tx,'[{"id":1}]');
  const app=fs.readFileSync('app.js','utf8'), backupCode=app.slice(app.indexOf('const BACKUP_KEYS'),app.indexOf('let tx ='));
  const backupContext=vm.createContext({}); vm.runInContext(backupCode,backupContext);
  assert.ok(backupContext.validateFullBackup(archived.backup));
  assert.ok(backupContext.validateFullBackup({format:'expense-app-backup',version:1,data:{tx:'[]',accounts:'{}',accountArchives:a.storage.getItem('accountArchives')}}));
  assert.match(app,/connectionKeys = \['directSyncState'/);
  assert.match(app,/setItem\('legacySyncPaused', '1'\); localStorage\.setItem\('dirty'/);
  assert.equal(a.ctx.accountOwnerLocked(),true); // Existing page remains fenced.
  const fresh=vm.createContext({localStorage:a.storage,Date,Math,JSON,Object,Array,Set,String,Error,Promise,setTimeout,document:{getElementById:()=>null}});
  vm.runInContext(fs.readFileSync('account-owner-lock.js','utf8'),fresh); vm.runInContext(fs.readFileSync('account-switch.js','utf8'),fresh);
  assert.equal(fresh.accountSwitchRecover(),true); assert.equal(fresh.accountOwnerLocked(),false); assert.equal(a.storage.getItem('accountSwitchJournal161'),null);
  const b=setup('dataOwner'); await assert.rejects(b.ctx.accountSwitchSeparate(async raw=>raw),/storage failure/);
  for (const [key,value] of old) assert.equal(b.storage.getItem(key),value,key);
  assert.equal(b.storage.getItem('accountSwitchJournal161'),null); assert.equal(b.storage.getItem('accountOwnerMismatchLock'),'1');
  const c=setup(); await assert.rejects(c.ctx.accountSwitchSeparate(async()=>{throw Error('backup failure')}),/backup failure/); assert.deepEqual([...c.data],old);
  const script=fs.readFileSync('direct-sync-ui.js','utf8'); assert.match(script,/googleBackupCopy', 'accountArchives'/);
  const ref=fs.readFileSync('legacy-reference.js','utf8'); assert.match(ref,/accountSwitchEpoch161/); assert.doesNotMatch(ref,/\bfetch\(/);
}
module.exports=run;
if(require.main===module)run().catch(e=>{console.error(e);process.exitCode=1;});
