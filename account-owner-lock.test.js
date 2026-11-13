'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
async function run() {
 const data = new Map(), calls = []; let finish;
 const ctx = vm.createContext({ localStorage:{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v))}, fetch:async (url,options)=>{calls.push([url,options]);return {ok:true};} });
 vm.runInContext(fs.readFileSync('account-owner-lock.js','utf8'),ctx);
 await ctx.accountOwnerFetch('https://script.google.com/old');
 ctx.accountOwnerIdentify(' Owner@Example.com '); assert.equal(data.get('dataOwner'),'owner@example.com');
 ctx.accountOwnerIdentify('OWNER@example.com'); assert.equal(ctx.accountOwnerLocked(),false);
 assert.throws(()=>ctx.accountOwnerIdentify('other@example.com'),/متفاوت/); assert.equal(ctx.accountOwnerLocked(),true); assert.equal(data.get('dataOwner'),'owner@example.com');
 for(const url of ['https://script.google.com/old','https://sheets.googleapis.com/v4/spreadsheets/id','https://script.googleapis.com/v1/projects']) await assert.rejects(ctx.accountOwnerFetch(url),/متوقف/);
 assert.equal(calls.length,1); await ctx.accountOwnerFetch('https://openidconnect.googleapis.com/v1/userinfo'); assert.equal(calls.length,2);
 assert.throws(()=>ctx.accountOwnerIdentify('owner@example.com'),/متوقف/);
 const source = ['app.js','legacy-inbox.js','direct-sync-auto.js','direct-sync-ui.js','easy-google-setup.js'];
 for(const file of source){const s=fs.readFileSync(file,'utf8');assert.match(s,/accountOwnerFetch\(/,file);}
 for(const file of ['app.js','easy-google-setup.js']) assert.match(fs.readFileSync(file,'utf8'),/accountOwnerAssert\(\)/,file);
 const pendingData = new Map(), pendingCtx=vm.createContext({localStorage:{getItem:k=>pendingData.get(k)??null,setItem:(k,v)=>pendingData.set(k,String(v))},fetch:()=>new Promise(resolve=>{finish=resolve;})});
 vm.runInContext(fs.readFileSync('account-owner-lock.js','utf8'),pendingCtx);
 const pending=pendingCtx.accountOwnerFetch('https://script.google.com/old'); pendingData.set('accountOwnerMismatchLock','1'); finish({ok:true}); await assert.rejects(pending,/متوقف/);
}
module.exports=run;
if(require.main===module)run().catch(e=>{console.error(e);process.exitCode=1;});
