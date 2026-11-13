'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
async function run() {
 const storage=new Map(), calls=[], status={textContent:''}; let failAt='';
 const context=vm.createContext({URL,Date,JSON,Number,String,Error,Uint32Array,setTimeout,clearTimeout,crypto:{getRandomValues:a=>a.fill(12)},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},document:{addEventListener(){},getElementById:k=>k==='easy-setup-status'?status:null},fetch:async(url,options={})=>{calls.push(url);if(url.endsWith(failAt)&&failAt)throw Error('offline'); const data=url.endsWith('/spreadsheets')?{spreadsheetId:'sheet_123'}:url.endsWith('/projects')?{scriptId:'script_123'}:url.endsWith('/versions')?{versionNumber:1}:url.endsWith('/deployments')?{deploymentId:'deploy_123',entryPoints:[{webApp:{url:'https://script.google.com/macros/s/deploy_123/exec'}}]}:{};return{ok:true,status:200,json:async()=>data};}});
 vm.runInContext(fs.readFileSync('easy-google-setup.js','utf8'),context); vm.runInContext('easyPing=async()=>{}; easyMainProbe=async()=>{}',context);
 const execUrl='https://script.google.com/macros/s/deploy_123/exec';
 assert.equal(context.easyAuthUrl(execUrl,'erfan.hi19@gmail.com'),execUrl+'?authuser=erfan.hi19%40gmail.com');
 assert.throws(()=>context.easyAuthUrl(execUrl,'bad address'),/ایمیل معتبر/);
 assert.throws(()=>context.easyAuthUrl('https://example.com/exec','a@example.com'),/نشانی اصلی/);
 assert.throws(()=>context.easyAuthUrl(execUrl+'?x=1','a@example.com'),/نشانی اصلی/);
 await context.easyRun('private-token','a@example.com'); let state=JSON.parse(storage.get('easySetupExperimentV1'));
 assert.equal(state.sheetId,'sheet_123'); assert.equal(state.scriptId,'script_123');assert.equal(state.deploymentId,'deploy_123');assert.ok(state.testedAt);assert.ok(!JSON.stringify(state).includes('private-token'));assert.match(status.textContent,/پاسخ معتبر داد/);
 const count=calls.length; await context.easyRun('private-token','a@example.com'); assert.equal(calls.length,count+1);
 await assert.rejects(context.easyRun('private-token','other@example.com'),/دیگری/);
 storage.clear(); failAt='/spreadsheets'; await assert.rejects(context.easyRun('private-token','a@example.com'),/ارتباط قطع/);state=JSON.parse(storage.get('easySetupExperimentV1'));assert.equal(state.pending,'ساخت شیت');const n=calls.length;await assert.rejects(context.easyRun('private-token','a@example.com'),/مشخص نیست/);assert.equal(calls.length,n);
 // The published JSONP branch must read without creating sheets and validate callbacks.
 const code=vm.runInContext('EASY_CODE_GS',context); let writes=0;
 const server=vm.createContext({JSON,String,ContentService:{MimeType:{JSON:'json',JAVASCRIPT:'js'},createTextOutput:text=>({text,setMimeType(type){this.type=type;return this;}})},SpreadsheetApp:{getActive:()=>({getSheetByName:()=>null,getUrl:()=> 'sheet-url',insertSheet(){writes++;throw Error('unexpected write')}})},PropertiesService:{getScriptProperties:()=>({getProperty:()=>''})}});
 vm.runInContext(code,server);
 const response=server.doGet({parameter:{callback:'expenseRead1_2'}}); assert.equal(response.type,'js'); assert.match(response.text,/^expenseRead1_2\(/); assert.equal(writes,0);
 const invalid=server.doGet({parameter:{callback:'x();bad'}}); assert.equal(invalid.type,'json');
 // Upgrade keeps the existing URL and updates only the verified deployment.
 state={email:'a@example.com',sheetId:'sheet_123',scriptId:'script_123',contentReady:true,version:1,deploymentId:'test_123',url:'https://script.google.com/macros/s/test_123/exec',mainUrl:'https://script.google.com/macros/s/main_123/exec',mainVersion:1};
 storage.set('easySetupExperimentV1',JSON.stringify(state)); const operations=[]; let published=1;
 const base=vm.runInContext('EASY_CODE_GS_BASE',context);
 context.fetch=async(url,opts={})=>{const method=opts.method||'GET';operations.push({url,method,body:opts.body&&JSON.parse(opts.body)}); let data={};
   if(url.endsWith('/deployments/main_123')) { if(method==='PUT') published=JSON.parse(opts.body).deploymentConfig.versionNumber; data={deploymentConfig:{versionNumber:published},entryPoints:[{webApp:{url:state.mainUrl}}]}; }
   else if(url.endsWith('/content')&&method==='GET') data={files:[{name:'Code',type:'SERVER_JS',source:base},{name:'appsscript',type:'JSON',source:'{}'}]};
   else if(url.endsWith('/versions')) data={versionNumber:2};
   return {ok:true,status:200,json:async()=>data};};
 await context.easyRun('private-token','a@example.com'); const upgraded=JSON.parse(storage.get('easySetupExperimentV1'));
 assert.equal(upgraded.mainUrl,state.mainUrl);assert.equal(upgraded.mainJsonpVersion,2);assert.ok(operations.some(x=>x.method==='PUT'&&x.url.endsWith('/deployments/main_123')));assert.ok(!operations.some(x=>x.method==='POST'&&x.url.endsWith('/deployments')));
 storage.set('easySetupExperimentV1',JSON.stringify(state)); let changed=0;
 context.fetch=async(url,opts={})=>{if(opts.method==='PUT'||opts.method==='POST')changed++;let data={};if(url.endsWith('/deployments/main_123'))data={entryPoints:[{webApp:{url:state.mainUrl}}]};else if(url.endsWith('/content'))data={files:[{name:'Code',type:'SERVER_JS',source:'custom code'}]};return{ok:true,status:200,json:async()=>data};};
 await assert.rejects(context.easyRun('private-token','a@example.com'),/یکسان نیست/);assert.equal(changed,0);assert.equal(JSON.parse(storage.get('easySetupExperimentV1')).mainUrl,state.mainUrl);
 storage.set('easySetupExperimentV1',JSON.stringify({...state,mainJsonpVersion:2}));
 for(const [k,v] of Object.entries({sync:'old',sync_bak:'backup',syncLock:'1',sheetUrl:'sheet'}))storage.set(k,v);
 vm.runInContext('easyMainProbe=async()=>{throw new Error("offline")}',context);
 assert.equal(await context.easyCheckAuthorization(),false);assert.equal(JSON.parse(storage.get('easySetupExperimentV1')).pending,'authorize');
 vm.runInContext('easyMainProbe=async()=>{}',context);
 assert.equal(await context.easyCheckAuthorization(),true);assert.equal(JSON.parse(storage.get('easySetupExperimentV1')).pending,undefined);
 for(const [k,v] of Object.entries({sync:'old',sync_bak:'backup',syncLock:'1',sheetUrl:'sheet'}))assert.equal(storage.get(k),v);
 storage.set('easySetupExperimentV1',JSON.stringify({...state,pending:'به‌روزرسانی انتشار اصلی'}));
 assert.equal(await context.easyCheckAuthorization(),false);assert.equal(JSON.parse(storage.get('easySetupExperimentV1')).pending,'به‌روزرسانی انتشار اصلی');
 console.log('Easy Google setup tests passed.');
}
module.exports=run;
if(require.main===module)run().catch(e=>{console.error(e);process.exitCode=1;});
