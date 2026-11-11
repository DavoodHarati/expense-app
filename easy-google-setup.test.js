'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
async function run() {
 const storage=new Map(), calls=[], status={textContent:''}; let failAt='';
 const context=vm.createContext({URL,Date,JSON,Number,String,Error,Uint32Array,setTimeout,clearTimeout,crypto:{getRandomValues:a=>a.fill(12)},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},document:{getElementById:k=>k==='easy-setup-status'?status:null},fetch:async(url,options={})=>{calls.push(url);if(url.endsWith(failAt)&&failAt)throw Error('offline'); const data=url.endsWith('/spreadsheets')?{spreadsheetId:'sheet_123'}:url.endsWith('/projects')?{scriptId:'script_123'}:url.endsWith('/versions')?{versionNumber:1}:url.endsWith('/deployments')?{deploymentId:'deploy_123',entryPoints:[{webApp:{url:'https://script.google.com/macros/s/deploy_123/exec'}}]}:{};return{ok:true,status:200,json:async()=>data};}});
 vm.runInContext(fs.readFileSync('easy-google-setup.js','utf8'),context); vm.runInContext('easyPing=async()=>{}',context);
 await context.easyRun('private-token','a@example.com'); let state=JSON.parse(storage.get('easySetupExperimentV1'));
 assert.equal(state.sheetId,'sheet_123'); assert.equal(state.scriptId,'script_123');assert.equal(state.deploymentId,'deploy_123');assert.ok(state.testedAt);assert.ok(!JSON.stringify(state).includes('private-token'));assert.match(status.textContent,/موفق/);
 const count=calls.length; await context.easyRun('private-token','a@example.com'); assert.equal(calls.length,count+1);
 await assert.rejects(context.easyRun('private-token','other@example.com'),/دیگری/);
 storage.clear(); failAt='/spreadsheets'; await assert.rejects(context.easyRun('private-token','a@example.com'),/ارتباط قطع/);state=JSON.parse(storage.get('easySetupExperimentV1'));assert.equal(state.pending,'ساخت شیت');const n=calls.length;await assert.rejects(context.easyRun('private-token','a@example.com'),/مشخص نیست/);assert.equal(calls.length,n);
 console.log('Easy Google setup tests passed.');
}
module.exports=run;
if(require.main===module)run().catch(e=>{console.error(e);process.exitCode=1;});
