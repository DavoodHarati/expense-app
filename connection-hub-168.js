'use strict';

// Only Google userinfo and Sheets metadata are read here. Tokens stay in memory.
const CONNECTION_TYPE_KEY = 'connectionType168';
let hubSession = null, hubGeneration = 0;
let hubResult = { state: 'unchecked', reason: '', checkedAt: 0, signature: '' };

function hubType() {
  const saved = localStorage.getItem(CONNECTION_TYPE_KEY);
  if (['easy', 'legacy', 'direct'].includes(saved)) return saved;
  const type = easyState().sheetId ? 'easy' : 'legacy';
  localStorage.setItem(CONNECTION_TYPE_KEY, type);
  return type;
}
function hubTarget() {
  const type = hubType(), easy = easyState(), direct = load('directSyncState', null) || {};
  if (type === 'easy') return { type, label: 'اتصال آسان', email: localStorage.getItem('hubEmail168') || easy.email || '', id: localStorage.getItem('hubSheet168') || easy.sheetId || '' };
  if (type === 'direct') return { type, label: 'مستقیم', email: direct.email || '', id: direct.id || '' };
  return { type, label: 'قدیمی (فقط خواندنی)', email: 'davood.forexalert@gmail.com', id: LEGACY_REFERENCE_SHEET };
}
function hubSignature(t) { return [t.type, t.email.toLowerCase(), t.id].join('|'); }
function connectionStatus() {
  const target = hubTarget(), signature = hubSignature(target);
  const result = hubResult.signature === signature ? hubResult : { state: 'unchecked', reason: '', checkedAt: 0 };
  return { ...target, ...result };
}
function hubUpdate() {
  if (typeof refreshInfo159 === 'function') refreshInfo159();
  const home = document.getElementById('home-sync-status');
  if (home && typeof homeSyncStatus === 'function') home.textContent = homeSyncStatus();
  const container = document.getElementById('connection-hub-168');
  if (container) hubRender(container);
}
function hubToken(target) {
  if (hubSession && hubSession.expires > Date.now()) return hubSession;
  if (typeof directAutoSession !== 'undefined' && directAutoSession && directAutoSession.expires > Date.now()) return directAutoSession;
  return null;
}
async function hubCheck() {
  const target = hubTarget(), signature = hubSignature(target), generation = ++hubGeneration;
  const done = (state, reason = '', checkedAt = 0) => {
    if (generation !== hubGeneration || signature !== hubSignature(hubTarget())) return;
    hubResult = { state, reason, checkedAt, signature }; hubUpdate();
  };
  if (typeof accountOwnerLocked === 'function' && accountOwnerLocked()) { done('error', 'حساب داده‌ها متفاوت است؛ ابتدا مشکل حساب را حل کن.'); return; }
  if (!target.email || !/^[A-Za-z0-9_-]+$/.test(target.id)) { done('unchecked', 'حساب یا شیت هنوز مشخص نشده است.'); return; }
  const session = hubToken(target);
  if (!session) { done('unchecked', 'نشست گوگل پایان یافته؛ دوباره وارد شو.'); return; }
  if (String(session.email || '').toLowerCase() !== target.email.toLowerCase()) { done('error', 'حساب انتخاب‌شده با حساب این اتصال یکی نیست.'); return; }
  done('checking');
  try {
    const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets/' + encodeURIComponent(target.id) + '?fields=spreadsheetId,properties(title)', { method: 'GET', headers: { Authorization: 'Bearer ' + session.token }, cache: 'no-store' });
    if (response.status === 401) { hubSession = null; done('unchecked', 'نشست گوگل پایان یافته؛ دوباره وارد شو.'); return; }
    if (!response.ok) { done('error', response.status === 403 ? 'حساب یا برنامه اجازه خواندن این شیت را ندارد.' : response.status === 404 ? 'شیت پیدا نشد یا این حساب به آن دسترسی ندارد.' : 'خواندن شیت ناموفق بود (کد ' + response.status + ').'); return; }
    const data = await response.json();
    if (data.spreadsheetId !== target.id) throw new Error('شناسهٔ شیت پاسخ با شیت انتخاب‌شده یکی نیست.');
    done('connected', '', Date.now());
  } catch (error) { done('error', 'بررسی شیت انجام نشد؛ اینترنت و دسترسی گوگل را بررسی کن.'); }
}
function hubSignIn() {
  const target = hubTarget();
  if (!window.google || !google.accounts || !google.accounts.oauth2) { const script = document.createElement('script'); script.src = 'https://accounts.google.com/gsi/client'; script.async = true; document.head.appendChild(script); hubResult = { state:'unchecked', reason:'سرویس ورود در حال بارگذاری است؛ دوباره دکمه ورود را بزن.', signature:hubSignature(target), checkedAt:0 }; hubUpdate(); return; }
  const identity = hubSignature(target);
  google.accounts.oauth2.initTokenClient({ client_id: GOOGLE_TEST_CLIENT, scope: 'openid email https://www.googleapis.com/auth/spreadsheets.readonly', callback: async response => {
    if (identity !== hubSignature(hubTarget())) return;
    if (!response.access_token) { hubResult = { state:'unchecked', reason:'ورود انجام نشد؛ دوباره وارد شو.', signature:identity, checkedAt:0 }; hubUpdate(); return; }
    try {
      const r = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { method:'GET', headers:{ Authorization:'Bearer ' + response.access_token }, cache:'no-store' });
      if (!r.ok) throw new Error('userinfo');
      const user = await r.json();
      if (identity !== hubSignature(hubTarget())) return;
      if (!user.email || user.email.toLowerCase() !== target.email.toLowerCase()) { hubSession = null; hubResult = { state:'error', reason:'حساب انتخاب‌شده با حساب این اتصال یکی نیست.', signature:identity, checkedAt:0 }; hubUpdate(); return; }
      hubSession = { token:response.access_token, email:user.email, expires:Date.now() + Math.max(0, Number(response.expires_in || 0) - 60) * 1000 };
      await hubCheck();
    } catch (_) { hubResult = { state:'error', reason:'حساب گوگل بررسی نشد؛ اینترنت را بررسی کن.', signature:identity, checkedAt:0 }; hubUpdate(); }
  } }).requestAccessToken({ prompt:'select_account' });
}
function hubRender(el) {
  const t = hubTarget(), status = connectionStatus(), ready = easyWizardState();
  const backup = localStorage.getItem('hubBackupConfirmed168') === '1';
  const signed = !!hubToken(t) && String(hubToken(t).email || '').toLowerCase() === t.email.toLowerCase();
  const allowed = (!!ready.ready && ready.email.toLowerCase() === t.email.toLowerCase()) || localStorage.getItem('hubAllowed168') === (easyState().mainUrl ? easyState().mainUrl + '|' + t.email.toLowerCase() : 'NO_URL');
  const sheet = /iMmTHhko$/.test(t.id);
  const button = (id, label, disabled) => '<button type="button" class="sec" id="' + id + '"' + (disabled ? ' disabled' : '') + '>' + label + '</button>';
  const step = (label, complete) => '<div class="mut">' + (complete ? '✅ ' : '⏳ ') + label + '</div>';
  let content = '';
  if (t.type === 'easy') content = step('۱. پشتیبان', backup) + button('hub-backup', 'گرفتن پشتیبان', false) + button('hub-backup-confirm', 'پشتیبان را در فایل‌ها ذخیره کردم', !localStorage.getItem('lastBackupAt')) + step('۲. ورود به گوگل', signed) + '<label>ایمیل حساب <input id="hub-email" type="email" dir="ltr" value="' + esc(t.email) + '" ' + (!backup ? 'disabled' : '') + '></label>' + button('hub-email-save', 'ثبت حساب', !backup) + button('hub-signin', 'ورود به گوگل', !backup || !t.email) + step('۳. اجازه در Safari', allowed) + button('hub-authorization', 'باز کردن مرحله اجازه', !backup || !signed || !easyState().mainUrl) + button('hub-allowed', 'اجازه دادم', !backup || !signed || !easyState().mainUrl) + step('۴. انتخاب شیت …iMmTHhko', sheet) + '<label>لینک یا شناسه شیت <input id="hub-sheet" dir="ltr" value="' + esc(t.id) + '" ' + (!backup || !signed || !allowed ? 'disabled' : '') + '></label>' + button('hub-sheet-save', 'انتخاب این شیت', !backup || !signed || !allowed) + step('۵. تست خواندن', status.state === 'connected') + button('hub-check', 'بررسی خواندن', !backup || !signed || !allowed || !sheet) + '<div class="mut">۶. انتقال داده: به‌زودی</div><button type="button" disabled>به‌زودی</button><hr>' + button('hub-easy-tools', 'ابزار اتصال آسان موجود', !backup);
  else content = step('۱. ورود به حساب', signed) + button('hub-signin', 'دوباره وارد شو', !t.email) + step('۲. بررسی خواندن شیت', status.state === 'connected') + button('hub-check', 'بررسی خواندن', !signed) + (t.type === 'legacy' ? '<div class="mut">این بررسی فقط خواندنی است.</div>' : '');
  el.innerHTML = '<b>انتخاب نوع اتصال</b><div class="mut">' + esc(t.label) + ' · ' + esc(t.email || 'حساب مشخص نشده') + ' · ' + esc(t.id ? 'شیت …' + t.id.slice(-8) : 'شیت مشخص نشده') + '</div><div class="row">' + button('hub-type-easy', 'اتصال آسان (پیشنهادی)', false) + button('hub-type-legacy', 'قدیمی (فقط خواندنی)', false) + '<button type="button" id="hub-type-direct" hidden>مستقیم (آزمایشی)</button></div><hr>' + content;
}
document.addEventListener('click', e => {
  const id = e.target.id;
  if (id === 'hub-type-easy' || id === 'hub-type-legacy' || id === 'hub-type-direct') { localStorage.setItem(CONNECTION_TYPE_KEY, id.slice(9)); hubSession = null; hubCheck(); }
  if (id === 'hub-signin' || id === 'hub-fix') hubSignIn();
  if (id === 'hub-check') hubCheck();
  if (id === 'hub-backup') { const b = document.getElementById('full-backup'); if (b) { b.click(); hubUpdate(); } }
  if (id === 'hub-backup-confirm') { localStorage.setItem('hubBackupConfirmed168', '1'); hubUpdate(); }
  if (id === 'hub-email-save') { const value = document.getElementById('hub-email').value.trim(); if (!easyEmailValid(value)) { alert('ایمیل معتبر وارد کن.'); return; } localStorage.setItem('hubEmail168', value); hubSession = null; hubCheck(); }
  if (id === 'hub-sheet-save') { const value = document.getElementById('hub-sheet').value.trim(), match = value.match(/\/spreadsheets\/d\/([A-Za-z0-9_-]+)/), sheetId = match ? match[1] : value; if (!/^[A-Za-z0-9_-]*iMmTHhko$/.test(sheetId)) { alert('شناسه یا لینک شیتی را وارد کن که به iMmTHhko ختم می‌شود.'); return; } localStorage.setItem('hubSheet168', sheetId); hubCheck(); }
  if (id === 'hub-authorization') { try { window.open(easyAuthUrl(easyState().mainUrl, hubTarget().email), '_blank', 'noopener'); } catch (_) { alert('نشانی صفحه اجازه مشخص نیست.'); } }
  if (id === 'hub-allowed') { if (easyState().mainUrl) localStorage.setItem('hubAllowed168', easyState().mainUrl + '|' + hubTarget().email.toLowerCase()); hubUpdate(); }
  if (id === 'hub-easy-tools') { const card = document.getElementById('easy-setup'), group = document.getElementById('settings-advanced'), sync = document.getElementById('legacy-sync-settings'); if (group) group.open = true; if (sync && localStorage.getItem('legacySyncPaused') === '1') sync.hidden = false; if (card) { card.hidden = false; card.open = true; card.scrollIntoView({ behavior:'smooth' }); } }
});
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') hubCheck(); });
setTimeout(hubCheck, 0);
