'use strict';
// Isolated setup proof: it never sends user data or switches either sync method.
const EASY_SETUP_KEY = 'easySetupExperimentV1';
const EASY_SETUP_SCOPE = 'openid email https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/script.projects https://www.googleapis.com/auth/script.deployments';
const EASY_OWNER_EMAIL = 'erfan.hi19@gmail.com';
const EASY_TEST_USERS_KEY = 'easy_local_test_users';
function easyState() { try { return JSON.parse(localStorage.getItem(EASY_SETUP_KEY) || '{}') || {}; } catch (_) { return {}; } }
function easySave(s) { localStorage.setItem(EASY_SETUP_KEY, JSON.stringify(s)); }
function easyMessage(s) { const e = document.getElementById('easy-setup-status'); if (e) e.textContent = s; }
function easyLinks() {
  const e = document.getElementById('easy-setup-links'); if (!e) return; e.replaceChildren();
  const s = easyState();
  if (s.email && typeof s.email === 'string') { const account = document.createElement('div'); account.className = 'mut'; account.textContent = 'حساب انتخاب‌شده در برنامه: ' + s.email; e.appendChild(account); }
  for (const [label, url] of []) {
    if (!url) continue; const a = document.createElement('a'); a.href=url; a.target='_blank'; a.rel='noopener noreferrer'; a.textContent=label; e.appendChild(a); e.appendChild(document.createElement('br'));
  }
}
function easyApiStage(url, method) {
  if (url.includes('openidconnect.googleapis.com')) return 'شناسایی حساب';
  if (url.includes('sheets.googleapis.com')) return method === 'POST' ? 'ساخت شیت آزمایشی' : 'بررسی شیت آزمایشی';
  if (url.endsWith('/projects')) return 'ساخت اسکریپت آزمایشی';
  if (url.endsWith('/content')) return 'ثبت محتوای اسکریپت';
  if (url.endsWith('/versions')) return 'ساخت نسخه اسکریپت';
  if (url.includes('/deployments')) return 'انتشار یا بررسی اسکریپت';
  return 'ارتباط با گوگل';
}
function easyGoogleError(data, response, stage) {
  const payload = data && data.error || {};
  const details = Array.isArray(payload.details) ? payload.details : [];
  const errors = Array.isArray(payload.errors) ? payload.errors : [];
  const reason = [...details, ...errors].map(x => x && x.reason).find(x => typeof x === 'string' && /^[A-Za-z0-9_]{1,80}$/.test(x)) || '';
  const status = typeof payload.status === 'string' && /^[A-Z_]{1,80}$/.test(payload.status) ? payload.status : '';
  let message = typeof payload.message === 'string' ? payload.message : '';
  message = message.replace(/https?:\/\/\S+/gi, '[نشانی حذف شد]').replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[حساب حذف شد]').replace(/\b[A-Za-z0-9_-]{30,}\b/g, '[شناسه حذف شد]').replace(/[\r\n\t]+/g, ' ').slice(0, 350);
  let hint = '';
  if (reason === 'SERVICE_DISABLED' || /has not been used|is disabled/i.test(message)) hint = ' سرویس گوگل برای پروژه فعال نیست یا هنوز تغییرش اعمال نشده؛ چند دقیقه صبر کن و دوباره امتحان کن.';
  else if (/user has not enabled|Apps Script API.*(disabled|turned off)|API.*not enabled/i.test(message)) hint = ' حساب انتخاب‌شده در برنامه را با حساب بالای صفحه تنظیمات Apps Script مقایسه کن؛ برای همان حساب گزینه Google Apps Script API باید On باشد. اگر تازه روشن کردی چند دقیقه صبر کن.';
  else if (/insufficient.*(permission|scope)|insufficient authentication scopes/i.test(message)) hint = ' اجازه‌های درخواست‌شده را هنگام ورود گوگل بررسی و تأیید کن.';
  return 'مرحله: ' + stage + '؛ کد: ' + response.status + (reason ? '؛ دلیل: ' + reason : '') + (status ? '؛ وضعیت: ' + status : '') + '.' + hint + (message ? ' پیام گوگل: ' + message : ' گوگل توضیح بیشتری نفرستاد.');
}
async function easyApi(token, url, method, body) {
  let response; const stage = easyApiStage(url, method);
  try { response = await accountOwnerFetch(url, { method: method || 'GET', headers: { Authorization: 'Bearer ' + token, ...(body ? {'Content-Type':'application/json'} : {}) }, ...(body ? {body:JSON.stringify(body)} : {}) }); }
  catch (_) { throw new Error('مرحله «' + stage + '»: ارتباط قطع شد؛ نتیجه مرحله ممکن است ثبت شده باشد. پیش از تکرار، شیت‌ها و پروژه‌های آزمایشی گوگل را بررسی کن.'); }
  let data = {}; try { data = await response.json(); } catch (_) {}
  if (!response.ok) {
    const error = new Error(easyGoogleError(data, response, stage));
    error.easyUserApiDisabled = /user has not enabled|Apps Script API.*(disabled|turned off)|API.*not enabled/i.test(String(data && data.error && data.error.message || ''));
    error.definite = response.status >= 400 && response.status < 500 && response.status !== 408 && response.status !== 429; throw error;
  }
  return data;
}
function easyPingOnce(url) {
  accountOwnerAssert();
  const u = new URL(url); if (u.protocol !== 'https:' || u.hostname !== 'script.google.com' || !/^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(u.pathname)) return Promise.reject(new Error('نشانی استقرار قابل تأیید نیست.'));
  return new Promise((resolve, reject) => {
    const bytes = new Uint32Array(2); crypto.getRandomValues(bytes); const cb = 'easyPing' + bytes[0] + '_' + bytes[1];
    const tag = document.createElement('script'); let timer;
    const finish = (ok) => { clearTimeout(timer); delete window[cb]; tag.remove(); ok ? resolve() : reject(new Error('آزمون پاسخ اسکریپت کامل نشد؛ ممکن است اجازه اسکریپت یا دسترسی شبکه لازم باشد.')); };
    window[cb] = data => finish(!accountOwnerLocked() && !!data && data.ok === true && data.kind === 'expense-easy-setup-test');
    tag.onerror = () => finish(false); timer = setTimeout(() => finish(false), 20000);
    u.searchParams.set('callback', cb); tag.src = u.href; document.head.appendChild(tag);
  });
}

async function easyPingFetch(url) {
  const u = new URL(url); u.searchParams.set('callback', 'easyPing1_1');
  const c = new AbortController(); const t = setTimeout(() => c.abort(), 20000);
  try { const r = await accountOwnerFetch(u.href, { signal: c.signal, cache: 'no-store' }); const x = await r.text(); if (r.ok && x.includes('expense-easy-setup-test')) return; throw new Error('پاسخ نادرست (' + r.status + ')'); }
  finally { clearTimeout(t); }
}
async function easyPing(url) {
  let last = '';
  for (let i = 0; i < 3; i++) {
    easyMessage('در حال بررسی پاسخ اسکریپت… تلاش ' + (i + 1) + ' از ۳');
    try { await easyPingFetch(url); return; } catch (e) { last = 'fetch: ' + (e.message || e); }
    try { await easyPingOnce(url); return; } catch (e) { last += ' | jsonp: ' + (e.message || e).slice(0, 20); }
    await new Promise(r => setTimeout(r, 4000));
  }
  throw new Error('آزمون پاسخ اسکریپت کامل نشد. جزئیات: ' + last + ' — نشانی: ' + url);
}
let easyAuthChecking = false, easyAuthReturn = false;
function easyAuthUi(message) {
  const card = document.getElementById('easy-authorize');
  if (card) card.hidden = !easyState().mainUrl;
  const status = document.getElementById('easy-authorize-status');
  if (status && message !== undefined) status.textContent = message;
  const button = document.getElementById('easy-authorize-check');
  if (button) button.disabled = easyAuthChecking || !easyWizardState().built;
}
function easyEmailValid(value) {
  const email = String(value || '').trim();
  return email.length <= 254 && /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(email);
}
function easyWizardState() {
  const state = easyState(), marker = localStorage.getItem('easy_wizard_api');
  const api = marker === '1' || (marker !== '0' && !!state.mainUrl);
  const email = localStorage.getItem('easy_wizard_email') || state.email || '';
  const selected = api && easyEmailValid(email);
  const built = selected && !!state.mainUrl && (!state.email || state.email.toLowerCase() === email.toLowerCase());
  const ready = built && !state.pending && localStorage.getItem('easy_wizard_verified') === state.mainUrl;
  return { api, email, selected, built, ready, owner: selected && email.toLowerCase() === EASY_OWNER_EMAIL };
}
function easyWizardRender() {
  const state = easyWizardState();
  const setText = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
  const setDisabled = (id, value) => { const el = document.getElementById(id); if (el) el.disabled = value; };
  setText('easy-step-api', '۱. دسترسی Apps Script: ' + (state.api ? 'انجام شد' : 'در انتظار'));
  setText('easy-step-email', '۲. حساب گوگل: ' + (state.selected ? state.email : 'در انتظار'));
  setText('easy-step-build', '۳. ساخت اتصال: ' + (state.built ? 'انجام شد' : 'در انتظار'));
  setText('easy-step-auth', '۴. اجازه گوگل: ' + (state.ready ? 'تأیید شد' : 'در انتظار'));
  setText('easy-step-result', state.ready ? '✅ اتصال آماده است' : '۵. نتیجه: در انتظار');
  setDisabled('easy-wizard-email-select', !state.api);
  const start = document.getElementById('easy-setup-start'); if (start && !start.dataset.busy) start.disabled = !state.selected;
  const open = document.getElementById('easy-authorize-open'); if (open) open.disabled = !state.built;
  const check = document.getElementById('easy-authorize-check'); if (check) check.disabled = !state.built || easyAuthChecking;
  const admin = document.getElementById('easy-admin'); if (admin) { admin.hidden = !state.owner; if (!state.owner) admin.replaceChildren(); const group = document.getElementById('settings-admin'); if (group) group.hidden = !state.owner; }
  return state;
}
function easyAuthUrl(value, email) {
  email = String(email || '').trim();
  if (!easyEmailValid(email)) throw new Error('ایمیل معتبر وارد کن.');
  const parsed = new URL(value);
  if (parsed.protocol !== 'https:' || parsed.host !== 'script.google.com' || !/^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(parsed.pathname) || parsed.search || parsed.hash || parsed.username || parsed.password) throw new Error('نشانی اصلی معتبر نیست.');
  return parsed.href + '?authuser=' + encodeURIComponent(email);
}
function easyAdminPrepare() {
  const area = document.getElementById('easy-admin');
  if (!area || !easyWizardState().owner) { if (area) area.replaceChildren(); return; }
  if (!document.getElementById('easy-admin-email')) {
    area.innerHTML = `<hr><b>مدیریت — یادداشت محلی</b><div class="mut">این فقط یادداشت است؛ اضافه‌کردن واقعی باید در Cloud Console انجام شود. نمایش این بخش احراز هویت نیست.</div><div id="easy-admin-info" class="mut"></div><input type="email" id="easy-admin-email" dir="ltr" placeholder="ایمیل کاربر آزمایشی"><button type="button" id="easy-admin-add">افزودن</button><div id="easy-admin-list"></div><button type="button" class="sec" id="easy-admin-copy">کپی فهرست</button><p><a href="https://console.cloud.google.com/auth/audience" target="_blank" rel="noopener noreferrer">باز کردن Test users در Google Cloud</a></p><button type="button" class="sec" id="easy-admin-reset">پاک‌کردن وضعیت آزمایش</button><button type="button" class="sec" id="easy-admin-backup">دانلود پشتیبان پیش از ادغام</button><div id="easy-admin-status" class="mut" aria-live="polite"></div>`;
  }
  const input = document.getElementById('easy-admin-email'), add = document.getElementById('easy-admin-add');
  const list = document.getElementById('easy-admin-list'), copy = document.getElementById('easy-admin-copy'), status = document.getElementById('easy-admin-status');
  if (!input || !add || !list || !copy || !status) return;
  const info = document.getElementById('easy-admin-info'), stamp = Number(localStorage.getItem('lastSync'));
  if (info) info.textContent = 'نسخه: ۱۶۰ · کش: exp-v160 · اتصال آسان: ' + (easyWizardState().ready ? 'آماده' : 'آماده نیست') + ' · ارسال خودکار نشست: ' + (typeof directAutoSession !== 'undefined' && directAutoSession ? 'فعال' : 'غیرفعال') + ' · آخرین همگام‌سازی: ' + (stamp ? new Date(stamp).toLocaleString('fa-IR') : 'نامشخص') + ' · ادغام دسته‌ها: ' + (localStorage.getItem('categoryMerge155Done') === '1' ? 'انجام شد' : 'انجام نشده') + ' · پیامک ناشناخته: ' + (typeof log !== 'undefined' ? log.filter(x => String(x.msg || '').includes('نفهمیدم')).length : 0);
  const reset = document.getElementById('easy-admin-reset'), backup = document.getElementById('easy-admin-backup');
  if (reset) reset.onclick = () => { if (easyWizardState().owner) document.getElementById('easy-setup-reset')?.click(); };
  if (backup) backup.onclick = () => { if (easyWizardState().owner) document.getElementById('category-download')?.click(); };
  const read = () => { try { const data = JSON.parse(localStorage.getItem(EASY_TEST_USERS_KEY) || '[]'); return Array.isArray(data) ? data.filter(e => typeof e === 'string' && easyEmailValid(e)) : []; } catch (_) { return []; } };
  const render = () => {
    list.replaceChildren();
    read().forEach(address => {
      const row = document.createElement('div'), label = document.createElement('span'), remove = document.createElement('button');
      label.textContent = address; remove.type = 'button'; remove.className = 'sec'; remove.textContent = 'حذف';
      remove.onclick = () => { if (!easyWizardState().owner) return; localStorage.setItem(EASY_TEST_USERS_KEY, JSON.stringify(read().filter(e => e !== address))); render(); };
      row.appendChild(label); row.appendChild(remove); list.appendChild(row);
    });
  };
  add.onclick = () => {
    if (!easyWizardState().owner) return;
    const address = input.value.trim(); if (!easyEmailValid(address)) { status.textContent = 'ایمیل معتبر وارد کن.'; return; }
    const all = read(); if (!all.some(e => e.toLowerCase() === address.toLowerCase())) all.push(address);
    localStorage.setItem(EASY_TEST_USERS_KEY, JSON.stringify(all)); input.value = ''; status.textContent = 'در یادداشت این دستگاه ذخیره شد.'; render();
  };
  copy.onclick = async () => {
    if (!easyWizardState().owner) return;
    try { await navigator.clipboard.writeText(read().join('\n')); status.textContent = 'فهرست کپی شد.'; }
    catch (_) { status.textContent = 'کپی انجام نشد؛ فهرست را از همین صفحه بردار.'; }
  };
  render();
}
function easyMainProbe(url) {
  accountOwnerAssert();
  const u = new URL(url);
  if (u.protocol !== 'https:' || u.host !== 'script.google.com' || !/^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(u.pathname) || u.search || u.hash || u.username || u.password) return Promise.reject(new Error('نشانی اصلی معتبر نیست'));
  return new Promise((resolve, reject) => {
    const bytes = new Uint32Array(2); crypto.getRandomValues(bytes); const cb = 'easyMain' + bytes[0] + '_' + bytes[1];
    const tag = document.createElement('script'); let done = false;
    const finish = (error) => { if (done) return; done = true; clearTimeout(timer); delete window[cb]; tag.remove(); error ? reject(error) : resolve(); };
    window[cb] = data => finish(!accountOwnerLocked() && data && data.ok === true && Array.isArray(data.tx) && Array.isArray(data.rem) && Array.isArray(data.log) ? null : new Error('پاسخ معتبر شیت دریافت نشد'));
    tag.onerror = () => finish(new Error('بارگذاری پاسخ ناموفق بود'));
    tag.onload = () => { if (!done) finish(new Error('اسکریپت پاسخ JSONP نداد')); };
    const timer = setTimeout(() => finish(new Error('پاسخ تا ۲۰ ثانیه نرسید')), 20000);
    u.searchParams.set('callback', cb); tag.src = u.href; document.head.appendChild(tag);
  });
}
async function easyCheckAuthorization() {
  if (easyAuthChecking) return false;
  const state = easyState(), url = state.mainUrl;
  if (!url) { easyAuthUi('ابتدا ساخت اتصال آسان را کامل کن.'); return false; }
  if (state.pending && state.pending !== 'authorize') { easyAuthUi('نتیجه مرحله قبلی هنوز مشخص نیست؛ ابتدا آن را بررسی کن.'); return false; }
  easyAuthChecking = true; easyAuthUi('در حال بررسی پاسخ اتصال اصلی…');
  try {
    await easyMainProbe(url);
    const latest = easyState();
    if (latest.mainUrl !== url || (latest.pending && latest.pending !== 'authorize')) throw new Error('وضعیت اتصال تغییر کرد');
    if (latest.pending === 'authorize') { delete latest.pending; easySave(latest); }
    localStorage.setItem('easy_wizard_verified', url); easyWizardRender();
    easyAuthUi('✅ اتصال آماده است.'); return true;
  } catch (error) {
    const latest = easyState();
    if (latest.mainUrl === url && (!latest.pending || latest.pending === 'authorize')) { latest.pending = 'authorize'; easySave(latest); }
    easyWizardRender(); easyAuthUi('⚠️ پاسخ معتبر نرسید؛ ممکن است مجوز، شبکه یا انتشار مشکل داشته باشد. ' + (error.message || ''));
    return false;
  } finally { easyAuthChecking = false; easyAuthUi(); }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible' || !easyAuthReturn) return;
  easyAuthReturn = false; void easyCheckAuthorization();
});
const EASY_CODE_GS_BASE = "// Google Apps Script: این کد را در Extensions ← Apps Script همان Google Sheet بچسبانید.\n// Deploy ← New deployment ← Web app ← Execute as: Me ← Who has access: Anyone\nconst TX_HEAD = ['id', 'date', 'account', 'type', 'amount', 'balance', 'cat', 'desc', 'pending', 'xfer', 'person', 'loan', 'raw', 'json'];\nconst LOG_HEAD = ['at', 'time', 'ok', 'msg', 'raw'];\n\nfunction sh_(name, head) {\n  const ss = SpreadsheetApp.getActive() || SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SHEET_ID'));\n  let s = ss.getSheetByName(name);\n  if (!s) { s = ss.insertSheet(name); s.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold'); s.setFrozenRows(1); }\n  s.setRightToLeft(true);\n  return s;\n}\nfunction rows_(s, n) {\n  const last = s.getLastRow();\n  return last < 2 ? [] : s.getRange(2, 1, last - 1, n).getValues();\n}\nfunction put_(s, head, data) {\n  const last = s.getLastRow();\n  if (last > 1) s.getRange(2, 1, last - 1, head.length).clearContent();\n  if (!data.length) return;\n  const r = s.getRange(2, 1, data.length, head.length);\n  r.setNumberFormat('@');\n  r.setValues(data);\n}\nfunction out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }\n\nfunction doGet() {\n  try {\n  const tx = rows_(sh_('Transactions', TX_HEAD), TX_HEAD.length).map(r => { try { return JSON.parse(r[13]); } catch (e) { return null; } }).filter(Boolean);\n  const accounts = {};\n  rows_(sh_('Accounts', ['key', 'name']), 2).forEach(r => { if (r[0] !== '') accounts[String(r[0])] = String(r[1]); });\n  const log = rows_(sh_('SMS', LOG_HEAD), LOG_HEAD.length).map(r => ({ at: Number(r[0]), ok: r[2] === 'true' || r[2] === true, msg: String(r[3]), raw: String(r[4]) }));\n  const rem = rows_(sh_('Reminders', ['id', 'json']), 2).map(r => { try { return JSON.parse(r[1]); } catch (e) { return null; } }).filter(Boolean);\n  const pr = {}; rows_(sh_('Profile', ['key', 'value']), 2).forEach(r => pr[String(r[0])] = String(r[1]));\n  const inbox = rows_(sh_('Inbox', ['id', 'raw']), 2).map(r => ({ id: String(r[0]), raw: String(r[1]) }));\n  return out_({ ok: true, inbox, rem, tx, accounts, log, profile: { job: pr.job || '', work: pr.work || '', cols: pr.cols || '{}', lab: pr.lab || '{}' }, sheetUrl: (SpreadsheetApp.getActive() || SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SHEET_ID'))).getUrl() });\n  } catch (err) { return out_({ ok: false, error: String(err) }); }\n}\n\nfunction doPost(e) {\n  const lock = LockService.getScriptLock(); lock.waitLock(20000);\n  try {\n    const d = JSON.parse(e.postData.contents);\n    if (d.inbox) { sh_('Inbox', ['id', 'raw']).appendRow([String(Date.now()) + Math.floor(Math.random() * 1000), String(d.inbox)]); return out_({ ok: true }); }\n    if (d.ack) {\n      const s = sh_('Inbox', ['id', 'raw']), keep = rows_(s, 2).filter(r => d.ack.indexOf(String(r[0])) < 0);\n      put_(s, ['id', 'raw'], keep); return out_({ ok: true });\n    }\n    if (d.tx) put_(sh_('Transactions', TX_HEAD), TX_HEAD, d.tx.map(t => [String(t.id), t.date || '', t.account || '', t.type || '', String(t.amount), t.balance == null ? '' : String(t.balance), t.cat || '', t.desc || '', String(!!t.pending), String(!!t.xfer), t.person || '', t.loan || '', t.raw || '', JSON.stringify(t)]));\n    if (d.profile) put_(sh_('Profile', ['key', 'value']), ['key', 'value'], [['job', d.profile.job || ''], ['work', d.profile.work || ''], ['cols', d.profile.cols || '{}'], ['lab', d.profile.lab || '{}']]);\n    if (Array.isArray(d.rem)) put_(sh_('Reminders', ['id', 'json']), ['id', 'json'], d.rem.map(r => [String(r.id), JSON.stringify(r)]));\n    if (d.accounts) put_(sh_('Accounts', ['key', 'name']), ['key', 'name'], Object.entries(d.accounts).map(([k, v]) => [k, v]));\n    if (d.log) {\n      const s = sh_('SMS', LOG_HEAD);\n      const old = {}; rows_(s, LOG_HEAD.length).forEach(r => old[String(r[0])] = r);\n      d.log.forEach(l => { old[String(l.at)] = [String(l.at), new Date(l.at).toLocaleString('fa-IR'), String(!!l.ok), l.msg || '', l.raw || '']; });\n      put_(s, LOG_HEAD, Object.values(old).sort((a, b) => Number(b[0]) - Number(a[0])));\n    }\n    return out_({ ok: true });\n  } catch (err) {\n    return out_({ ok: false, error: String(err) });\n  } finally { lock.releaseLock(); }\n}\n";
// The JSONP branch only reads existing sheets. The ordinary endpoint stays unchanged.
const EASY_JSONP_BRANCH = `
function easyJsonpRead_(e) {
  const cb = String((e && e.parameter && e.parameter.callback) || '');
  if (!/^[A-Za-z_][A-Za-z0-9_]*(?:\\.[A-Za-z_][A-Za-z0-9_]*)*$/.test(cb)) return null;
  let result;
  try {
    const ss = SpreadsheetApp.getActive() || SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SHEET_ID'));
    function read(name, n) { const sheet = ss.getSheetByName(name); return sheet ? rows_(sheet, n) : []; }
    const tx = read('Transactions', TX_HEAD.length).map(r => { try { return JSON.parse(r[13]); } catch (_) { return null; } }).filter(Boolean);
    const accounts = {}; read('Accounts', 2).forEach(r => { if (r[0] !== '') accounts[String(r[0])] = String(r[1]); });
    const log = read('SMS', LOG_HEAD.length).map(r => ({ at: Number(r[0]), ok: r[2] === 'true' || r[2] === true, msg: String(r[3]), raw: String(r[4]) }));
    const rem = read('Reminders', 2).map(r => { try { return JSON.parse(r[1]); } catch (_) { return null; } }).filter(Boolean);
    const pr = {}; read('Profile', 2).forEach(r => pr[String(r[0])] = String(r[1]));
    const inbox = read('Inbox', 2).map(r => ({ id: String(r[0]), raw: String(r[1]) }));
    result = { ok: true, inbox, rem, tx, accounts, log, profile: { job: pr.job || '', work: pr.work || '', cols: pr.cols || '{}', lab: pr.lab || '{}' }, sheetUrl: ss.getUrl() };
  } catch (err) { result = { ok: false, error: String(err) }; }
  return ContentService.createTextOutput(cb + '(' + JSON.stringify(result) + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
}
`;
function easyAddJsonp(source) {
  if (source === EASY_CODE_GS_BASE) return source.replace('function doGet() {', EASY_JSONP_BRANCH + '\nfunction doGet(e) {\n  const jsonp = easyJsonpRead_(e); if (jsonp) return jsonp;');
  throw new Error('کد پروژه با نسخه شناخته‌شده یکسان نیست؛ برای حفظ تغییرات، انتشار خودکار متوقف شد.');
}
const EASY_CODE_GS = easyAddJsonp(EASY_CODE_GS_BASE);
async function easyUpgradeMain(token, state) {
  const url = new URL(state.mainUrl);
  if (url.protocol !== 'https:' || url.host !== 'script.google.com' || !/^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url.pathname) || url.search || url.hash || !/^[\w-]+$/.test(state.scriptId || '')) throw new Error('نشانی یا شناسه انتشار اصلی معتبر نیست.');
  const root = 'https://script.googleapis.com/v1/projects/' + encodeURIComponent(state.scriptId);
  const deployment = root + '/deployments/' + encodeURIComponent(url.pathname.split('/')[3]);
  const existing = await easyApi(token, deployment);
  if (!(existing.entryPoints || []).some(x => x.webApp && x.webApp.url === state.mainUrl)) throw new Error('نشانی انتشار اصلی با پروژه مطابقت ندارد؛ چیزی تغییر نکرد.');
  const content = await easyApi(token, root + '/content');
  if (!Array.isArray(content.files)) throw new Error('فایل‌های پروژه دریافت نشد؛ چیزی تغییر نکرد.');
  const files = content.files.map(f => ({ name: f.name, type: f.type, source: f.source }));
  const matches = files.filter(f => f.name === 'Code' && f.type === 'SERVER_JS');
  if (matches.length !== 1) throw new Error('کد اصلی پروژه مشخص نیست؛ چیزی تغییر نکرد.');
  if (matches[0].source !== EASY_CODE_GS) matches[0].source = easyAddJsonp(matches[0].source);
  state.pending = 'به‌روزرسانی انتشار اصلی'; easySave(state);
  try {
    easyMessage('در حال آماده‌سازی کد خواندن در پروژه موجود…');
    await easyApi(token, root + '/content', 'PUT', { files });
    const version = await easyApi(token, root + '/versions', 'POST', { description: 'پشتیبانی دریافت JSONP نسخه ۱۵۱' });
    if (!Number.isInteger(version.versionNumber)) throw new Error('شماره نسخه جدید دریافت نشد.');
    await easyApi(token, deployment, 'PUT', { deploymentConfig: { scriptId: state.scriptId, versionNumber: version.versionNumber, manifestFileName: 'appsscript', description: 'دریافت JSONP نسخه ۱۵۱' } });
    const verified = await easyApi(token, deployment);
    if (!verified.deploymentConfig || verified.deploymentConfig.versionNumber !== version.versionNumber || !(verified.entryPoints || []).some(x => x.webApp && x.webApp.url === state.mainUrl)) throw new Error('تأیید نسخه و نشانی انتشار کامل نشد.');
    state.mainVersion = version.versionNumber; state.mainJsonpVersion = version.versionNumber; state.pending = ''; easySave(state);
  } catch (error) {
    // A request may have reached Google even when its response was lost.
    easySave(state); throw new Error((error.message || 'به‌روزرسانی ناموفق بود') + '؛ نتیجه انتشار را پیش از تلاش دوباره بررسی کن.');
  }
}
async function easyRun(token, email) {
  const state=easyState();
  if (state.email && state.email !== email) throw new Error('آزمایش قبلی با حساب دیگری شروع شده است. همان حساب را انتخاب کن یا ابتدا وضعیت آزمایش را پاک کن.');
  if (state.pending === 'authorize') { await easyCheckAuthorization(); return; }
  if (state.pending) throw new Error('نتیجه مرحله «' + state.pending + '» مشخص نیست. پیش از شروع دوباره، موارد آزمایشی در Google Drive را بررسی کن؛ برای ساخت دوباره وضعیت آزمایش را پاک کن.');
  state.email=email; easySave(state); easyLinks();
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
  if (!state.mainUrl) {
    easyMessage('۵ از ۵: نصب کد اصلی برنامه روی اسکریپت…');
    const manifest={timeZone:'Asia/Tehran',runtimeVersion:'V8',webapp:{access:'ANYONE_ANONYMOUS',executeAs:'USER_DEPLOYING'}};
    await easyApi(token,'https://script.googleapis.com/v1/projects/'+encodeURIComponent(state.scriptId)+'/content','PUT',{files:[{name:'appsscript',type:'JSON',source:JSON.stringify(manifest)},{name:'Code',type:'SERVER_JS',source:EASY_CODE_GS}]});
    await createStep('نسخه اصلی',()=>easyApi(token,'https://script.googleapis.com/v1/projects/'+encodeURIComponent(state.scriptId)+'/versions','POST',{description:'کد اصلی برنامه'}),r=>{if(!Number.isInteger(r.versionNumber)) throw new Error('نسخه اصلی دریافت نشد');state.mainVersion=r.versionNumber;});
    await createStep('انتشار اصلی',()=>easyApi(token,'https://script.googleapis.com/v1/projects/'+encodeURIComponent(state.scriptId)+'/deployments','POST',{versionNumber:state.mainVersion,manifestFileName:'appsscript',description:'کد اصلی برنامه'}),r=>{const entry=(r.entryPoints||[]).find(x=>x.webApp&&x.webApp.url); if(!entry) throw new Error('نشانی وب اصلی دریافت نشد'); state.mainUrl=entry.webApp.url; state.mainJsonpVersion=state.mainVersion;});
  }
  if (!state.mainJsonpVersion) await easyUpgradeMain(token, state);
  easyLinks(); easyAuthUi();
  const ready = await easyCheckAuthorization();
  easyMessage(ready ? '✅ اتصال اصلی پاسخ معتبر داد.' : 'انتشار ساخته شد؛ مجوز و پاسخ اتصال اصلی هنوز تأیید نشده است.');
}
function easySetupPrepare() {
  const card=document.getElementById('easy-setup'); if (!card) return; easyLinks();
  const start=document.getElementById('easy-setup-start'), reset=document.getElementById('easy-setup-reset');
  easyAuthUi(easyState().pending === 'authorize' ? 'پاسخ معتبر هنوز دریافت نشده؛ صفحه مجوز را بررسی کن.' : undefined);
  const open = document.getElementById('easy-authorize-open'), check = document.getElementById('easy-authorize-check');
  const dialog = document.getElementById('easy-auth-dialog'), email = document.getElementById('easy-auth-email');
  const proceed = document.getElementById('easy-auth-continue'), cancel = document.getElementById('easy-auth-cancel');
  const error = document.getElementById('easy-auth-error'), fallback = document.getElementById('easy-auth-fallback');
  const apiDone = document.getElementById('easy-wizard-api'), choose = document.getElementById('easy-wizard-email-select');
  if (apiDone) apiDone.onclick = () => { localStorage.setItem('easy_wizard_api', '1'); easyWizardRender(); };
  let choosingEmail = false;
  if (open && dialog && email && proceed && cancel && error && fallback) {
    const updateLabel = () => { proceed.textContent = 'ادامه با ' + (email.value.trim() || 'ایمیل'); };
    const showEmail = mode => {
      choosingEmail = mode;
      email.value = localStorage.getItem('easy_wizard_email') || localStorage.getItem('easy_auth_email') || easyState().email || '';
      error.textContent = ''; fallback.hidden = true; updateLabel();
      if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
    };
    if (choose) choose.onclick = () => { if (easyWizardState().api) showEmail(true); };
    open.onclick = () => { if (easyWizardState().built) showEmail(false); };
    email.oninput = updateLabel;
    cancel.onclick = () => { if (typeof dialog.close === 'function') dialog.close(); else dialog.removeAttribute('open'); };
    proceed.onclick = () => {
      try {
        const address = email.value.trim();
        if (!easyEmailValid(address)) throw new Error('ایمیل معتبر وارد کن.');
        if (choosingEmail) {
          localStorage.setItem('easy_wizard_email', address); localStorage.setItem('easy_auth_email', address);
          if (typeof dialog.close === 'function') dialog.close(); else dialog.removeAttribute('open');
          easyWizardRender(); easyAdminPrepare(); return;
        }
        const url = easyAuthUrl(easyState().mainUrl, address);
        localStorage.setItem('easy_auth_email', address); easyAuthReturn = true;
        fallback.href = url; fallback.hidden = false; error.textContent = 'اگر صفحه باز نشد، روی «باز کردن در همین صفحه» بزن.';
        window.open(url, '_blank', 'noopener');
        easyAuthUi('در صفحه گوگل با حساب سازنده، مجوز را بررسی کن؛ سپس به برنامه برگرد.');
      } catch (err) { error.textContent = err.message || 'نشانی اصلی معتبر نیست.'; }
    };
  }
  if (check) check.onclick = () => { easyAuthReturn = false; void easyCheckAuthorization(); };
  easyWizardRender(); easyAdminPrepare();
  if (easyState().pending && easyState().pending !== 'authorize') easyMessage('⚠️ نتیجه مرحله قبلی مشخص نیست؛ ابتدا شیت و اسکریپت آزمایشی را در گوگل بررسی کن.');
  reset.onclick=()=>{if(!confirm('فقط وضعیت آزمایش در این دستگاه پاک شود؟ فایل‌های ساخته‌شده در گوگل حذف نمی‌شوند.')) return; localStorage.removeItem(EASY_SETUP_KEY); easyLinks(); easyMessage('وضعیت آزمایش پاک شد؛ فایل‌های گوگل باقی مانده‌اند.');};
  start.onclick=()=>{
    if (!easyWizardState().selected) { easyMessage('ابتدا دسترسی Apps Script و ایمیل را مشخص کن.'); return; }
    if(easyState().pending === 'authorize') { void easyCheckAuthorization(); return; }
    if(easyState().pending) {easyMessage('⚠️ نتیجه مرحله قبلی مشخص نیست. ابتدا فایل‌های آزمایشی در گوگل را بررسی کن.');return;}
    if (!window.google || !google.accounts || !google.accounts.oauth2) {easyMessage('سرویس ورود گوگل بارگذاری نشد؛ اینترنت را بررسی کن و تنظیمات را دوباره باز کن.');return;}
    const updating = !!easyState().mainUrl && !easyState().mainJsonpVersion;
    if (!confirm(updating ? 'کد خواندن انتشار اصلی موجود با همان نشانی به‌روز شود؟ هر کس نشانی انتشار عمومی را داشته باشد می‌تواند اطلاعات شیت را بخواند. پیش از ادامه از شیت پشتیبان بگیر.' : 'یک شیت و اسکریپت آزمایشی جدا در حساب گوگل ساخته می‌شود. هیچ اطلاعات مالی منتقل یا اتصال فعلی عوض نمی‌شود. ادامه می‌دهی؟')) return;
    try { const client=google.accounts.oauth2.initTokenClient({client_id:GOOGLE_TEST_CLIENT,scope:EASY_SETUP_SCOPE,callback:async response=>{
      if(response.error || !response.access_token){easyMessage('اجازه گوگل صادر نشد.');return;}
      start.disabled=true; start.dataset.busy='1'; reset.disabled=true;
      try { easyMessage('در حال شناسایی حساب گوگل…'); const user=await easyApi(response.access_token,'https://openidconnect.googleapis.com/v1/userinfo'); if (!user.email) throw new Error('حساب گوگل مشخص نشد.'); accountOwnerIdentify(user.email); if (user.email.toLowerCase() !== easyWizardState().email.toLowerCase()) throw new Error('حساب انتخاب‌شده در گوگل با ایمیل مرحله دوم یکی نیست.'); await easyRun(response.access_token,user.email); }
      catch(error){if(error.easyUserApiDisabled) localStorage.setItem('easy_wizard_api','0'); easyMessage('⚠️ '+(error.easyUserApiDisabled ? 'دسترسی Apps Script API برای این حساب خاموش است؛ مرحله اول را دوباره انجام بده. ' : '')+(error.message||'آزمایش کامل نشد.'));} finally {delete start.dataset.busy; reset.disabled=false; easyWizardRender();}
    },error_callback:()=>easyMessage('پنجره ورود بسته شد یا باز نشد؛ دوباره امتحان کن.')}); client.requestAccessToken({prompt:'consent'}); }
    catch(_) {easyMessage('پنجره ورود گوگل باز نشد؛ مرورگر و اینترنت را بررسی کن.');}
  };
}
