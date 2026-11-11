'use strict';
// Isolated setup proof: it never sends user data or switches either sync method.
const EASY_SETUP_KEY = 'easySetupExperimentV1';
const EASY_SETUP_SCOPE = 'openid email https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/script.projects https://www.googleapis.com/auth/script.deployments';
function easyState() { try { return JSON.parse(localStorage.getItem(EASY_SETUP_KEY) || '{}') || {}; } catch (_) { return {}; } }
function easySave(s) { localStorage.setItem(EASY_SETUP_KEY, JSON.stringify(s)); }
function easyMessage(s) { const e = document.getElementById('easy-setup-status'); if (e) e.textContent = s; }
function easyLinks() {
  const e = document.getElementById('easy-setup-links'); if (!e) return; e.replaceChildren();
  const s = easyState();
  for (const [label, url] of [ ['شیت آزمایشی', /^[\w-]+$/.test(s.sheetId || '') ? 'https://docs.google.com/spreadsheets/d/' + s.sheetId + '/edit' : ''], ['پروژه اسکریپت آزمایشی', /^[\w-]+$/.test(s.scriptId || '') ? 'https://script.google.com/home/projects/' + s.scriptId + '/edit' : ''] ]) {
    if (!url) continue; const a = document.createElement('a'); a.href=url; a.target='_blank'; a.rel='noopener noreferrer'; a.textContent=label; e.appendChild(a); e.appendChild(document.createElement('br'));
  }
}
async function easyApi(token, url, method, body) {
  let response;
  try { response = await fetch(url, { method: method || 'GET', headers: { Authorization: 'Bearer ' + token, ...(body ? {'Content-Type':'application/json'} : {}) }, ...(body ? {body:JSON.stringify(body)} : {}) }); }
  catch (_) { throw new Error('ارتباط قطع شد؛ نتیجه مرحله ممکن است ثبت شده باشد. پیش از تکرار، شیت‌ها و پروژه‌های آزمایشی گوگل را بررسی کن.'); }
  let data = {}; try { data = await response.json(); } catch (_) {}
  if (!response.ok) {
    const reason = data.error && Array.isArray(data.error.details) ? data.error.details.map(x=>x.reason).find(Boolean) : '';
    const error = new Error('گوگل مرحله را نپذیرفت (کد ' + response.status + (reason ? '، دلیل ' + String(reason).replace(/[^A-Z0-9_]/gi,'').slice(0,70) : '') + '). دسترسی مدیریت اسکریپت و فعال‌بودن Apps Script API در پروژه برنامه را بررسی کن.');
    error.definite = response.status >= 400 && response.status < 500 && response.status !== 408 && response.status !== 429; throw error;
  }
  return data;
}
function easyPing(url) {
  const u = new URL(url); if (u.protocol !== 'https:' || u.hostname !== 'script.google.com' || !/^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(u.pathname)) return Promise.reject(new Error('نشانی استقرار قابل تأیید نیست.'));
  return new Promise((resolve, reject) => {
    const bytes = new Uint32Array(2); crypto.getRandomValues(bytes); const cb = 'easyPing' + bytes[0] + '_' + bytes[1];
    const tag = document.createElement('script'); let timer;
    const finish = (ok) => { clearTimeout(timer); delete window[cb]; tag.remove(); ok ? resolve() : reject(new Error('آزمون پاسخ اسکریپت کامل نشد؛ ممکن است اجازه اسکریپت یا دسترسی شبکه لازم باشد.')); };
    window[cb] = data => finish(!!data && data.ok === true && data.kind === 'expense-easy-setup-test');
    tag.onerror = () => finish(false); timer = setTimeout(() => finish(false), 20000);
    u.searchParams.set('callback', cb); tag.src = u.href; document.head.appendChild(tag);
  });
}
async function easyRun(token, email) {
  const state=easyState();
  if (state.email && state.email !== email) throw new Error('آزمایش قبلی با حساب دیگری شروع شده است. همان حساب را انتخاب کن یا ابتدا وضعیت آزمایش را پاک کن.');
  if (state.pending) throw new Error('نتیجه مرحله «' + state.pending + '» مشخص نیست. پیش از شروع دوباره، موارد آزمایشی در Google Drive را بررسی کن؛ برای ساخت دوباره وضعیت آزمایش را پاک کن.');
  state.email=email; easySave(state);
  async function createStep(name, operation, onSuccess) {
    state.pending=name; easySave(state);
    try { const result=await operation(); onSuccess(result); state.pending=''; easySave(state); easyLinks(); }
    catch (error) { if (error.definite) { state.pending=''; easySave(state); } throw error; }
  }
  if (!state.sheetId) {
    easyMessage('۱ از ۴: در حال ساخت شیت آزمایشی خالی…');
    await createStep('ساخت شیت',()=>easyApi(token,'https://sheets.googleapis.com/v4/spreadsheets','POST',{properties:{title:'هزینه‌ها - آزمایش اتصال آسان'}}),r=>{if(!/^[\w-]+$/.test(r.spreadsheetId||'')) throw new Error('شناسه شیت دریافت نشد');state.sheetId=r.spreadsheetId;});
  }
  if (!state.scriptId) {
    easyMessage('۲ از ۴: در حال ساخت پروژه اسکریپت آزمایشی…');
    await createStep('ساخت اسکریپت',()=>easyApi(token,'https://script.googleapis.com/v1/projects','POST',{title:'هزینه‌ها - آزمایش اتصال آسان',parentId:state.sheetId}),r=>{if(!/^[\w-]+$/.test(r.scriptId||'')) throw new Error('شناسه اسکریپت دریافت نشد');state.scriptId=r.scriptId;});
  }
  if (!state.contentReady) {
    easyMessage('۳ از ۴: آماده‌سازی پیام آزمایشی…');
    const manifest={timeZone:'Asia/Tehran',runtimeVersion:'V8',webapp:{access:'ANYONE_ANONYMOUS',executeAs:'USER_DEPLOYING'}};
    const code="function doGet(e) { var c = String((e && e.parameter && e.parameter.callback) || ''); if (!/^easyPing[0-9]+_[0-9]+$/.test(c)) return ContentService.createTextOutput('test only'); return ContentService.createTextOutput(c + '(' + JSON.stringify({ok:true,kind:'expense-easy-setup-test'}) + ');').setMimeType(ContentService.MimeType.JAVASCRIPT); }";
    await easyApi(token,'https://script.googleapis.com/v1/projects/'+encodeURIComponent(state.scriptId)+'/content','PUT',{files:[{name:'appsscript',type:'JSON',source:JSON.stringify(manifest)},{name:'Code',type:'SERVER_JS',source:code}]});
    state.contentReady=true; easySave(state);
  }
  if (!state.version) {
    easyMessage('۴ از ۴: ساخت نسخه آزمایشی…');
    await createStep('ساخت نسخه',()=>easyApi(token,'https://script.googleapis.com/v1/projects/'+encodeURIComponent(state.scriptId)+'/versions','POST',{description:'آزمون اتصال آسان'}),r=>{if(!Number.isInteger(r.versionNumber)) throw new Error('نسخه اسکریپت دریافت نشد');state.version=r.versionNumber;});
  }
  if (!state.deploymentId) {
    easyMessage('۴ از ۴: انتشار آزمایش…');
    await createStep('انتشار',()=>easyApi(token,'https://script.googleapis.com/v1/projects/'+encodeURIComponent(state.scriptId)+'/deployments','POST',{versionNumber:state.version,manifestFileName:'appsscript',description:'آزمون اتصال آسان'}),r=>{if(!/^[\w-]+$/.test(r.deploymentId||'')) throw new Error('شناسه انتشار دریافت نشد');state.deploymentId=r.deploymentId; const entry=(r.entryPoints||[]).find(x=>x.webApp&&x.webApp.url); if(entry) state.url=entry.webApp.url;});
  }
  if (!state.url) { const data=await easyApi(token,'https://script.googleapis.com/v1/projects/'+encodeURIComponent(state.scriptId)+'/deployments/'+encodeURIComponent(state.deploymentId)); const entry=(data.entryPoints||[]).find(x=>x.webApp&&x.webApp.url); if(entry){state.url=entry.webApp.url;easySave(state);} }
  if (!state.url) throw new Error('انتشار ساخته شد ولی گوگل نشانی وب را برنگرداند؛ پروژه آزمایشی را بررسی کن.');
  easyMessage('در حال بررسی دسترسی به شیت آزمایشی و پاسخ اسکریپت…');
  await easyApi(token,'https://sheets.googleapis.com/v4/spreadsheets/'+encodeURIComponent(state.sheetId)+'?fields=spreadsheetId');
  await easyPing(state.url); state.testedAt=new Date().toISOString(); easySave(state);
  easyMessage('✅ ساخت آزمایشی و پاسخ اسکریپت موفق بود. هنوز انتقال اطلاعات و اتصال خودکار فعال نشده است.'); easyLinks();
}
function easySetupPrepare() {
  const card=document.getElementById('easy-setup'); if (!card) return; easyLinks();
  const start=document.getElementById('easy-setup-start'), reset=document.getElementById('easy-setup-reset');
  if (easyState().pending) easyMessage('⚠️ نتیجه مرحله قبلی مشخص نیست؛ ابتدا شیت و اسکریپت آزمایشی را در گوگل بررسی کن.');
  reset.onclick=()=>{if(!confirm('فقط وضعیت آزمایش در این دستگاه پاک شود؟ فایل‌های ساخته‌شده در گوگل حذف نمی‌شوند.')) return; localStorage.removeItem(EASY_SETUP_KEY); easyLinks(); easyMessage('وضعیت آزمایش پاک شد؛ فایل‌های گوگل باقی مانده‌اند.');};
  start.onclick=()=>{
    if(easyState().pending) {easyMessage('⚠️ نتیجه مرحله قبلی مشخص نیست. ابتدا فایل‌های آزمایشی در گوگل را بررسی کن.');return;}
    if (!window.google || !google.accounts || !google.accounts.oauth2) {easyMessage('سرویس ورود گوگل بارگذاری نشد؛ اینترنت را بررسی کن و تنظیمات را دوباره باز کن.');return;}
    if (!confirm('یک شیت و اسکریپت آزمایشی جدا در حساب گوگل ساخته می‌شود. هیچ اطلاعات مالی منتقل یا اتصال فعلی عوض نمی‌شود. ادامه می‌دهی؟')) return;
    try { const client=google.accounts.oauth2.initTokenClient({client_id:GOOGLE_TEST_CLIENT,scope:EASY_SETUP_SCOPE,callback:async response=>{
      if(response.error || !response.access_token){easyMessage('اجازه گوگل صادر نشد.');return;}
      start.disabled=true; reset.disabled=true;
      try { easyMessage('در حال شناسایی حساب گوگل…'); const user=await easyApi(response.access_token,'https://openidconnect.googleapis.com/v1/userinfo'); if (!user.email) throw new Error('حساب گوگل مشخص نشد.'); await easyRun(response.access_token,user.email); }
      catch(error){easyMessage('⚠️ '+(error.message||'آزمایش کامل نشد.'));} finally {start.disabled=false;reset.disabled=false;}
    },error_callback:()=>easyMessage('پنجره ورود بسته شد یا باز نشد؛ دوباره امتحان کن.')}); client.requestAccessToken({prompt:'consent'}); }
    catch(_) {easyMessage('پنجره ورود گوگل باز نشد؛ مرورگر و اینترنت را بررسی کن.');}
  };
}
