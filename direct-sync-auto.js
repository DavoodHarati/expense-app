'use strict';

// The token remains in this page's memory and is never placed in storage.
let directAutoSession = null;
let directAutoTimer = null;
let directAutoRunning = false;
let directAutoStatus = 'ارسال خودکار غیرفعال است.';
const DIRECT_AUTO_PENDING = 'directAutoPending';

async function directAutoFingerprint(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

function directAutoPendingRead() {
  const raw = localStorage.getItem(DIRECT_AUTO_PENDING);
  if (!raw) return null;
  let pending;
  try { pending = JSON.parse(raw); } catch (_) { throw new Error('اطلاعات بررسی ارسال قبلی معتبر نیست؛ ارسال متوقف شد'); }
  if (!pending || pending.version !== 1 || !/^[a-f0-9]{32}$/.test(pending.id) || !/^[A-Za-z0-9_-]{1,128}$/.test(pending.base) || typeof pending.sheet !== 'string' || typeof pending.email !== 'string' || !/^[a-f0-9]{64}$/.test(pending.hash)) throw new Error('اطلاعات بررسی ارسال قبلی معتبر نیست؛ ارسال متوقف شد');
  return { ...pending, raw };
}

function directAutoPendingClear(raw) {
  if (localStorage.getItem(DIRECT_AUTO_PENDING) !== raw) throw new Error('وضعیت ارسال قبلی تغییر کرده است؛ بررسی دوباره لازم است');
  localStorage.removeItem(DIRECT_AUTO_PENDING);
}

function directAutoResumePending(state) {
  try {
    const pending = JSON.parse(sessionStorage.getItem('directAutoResume') || 'null');
    return !!(pending && state && pending.id === state.id && pending.email === state.email && pending.base === state.base && pending.until > Date.now());
  } catch (_) { return false; }
}

function directAutoResumeClear() {
  try { sessionStorage.removeItem('directAutoResume'); } catch (_) {}
}

function directAutoShow(message) {
  directAutoStatus = message;
  const status = document.getElementById('direct-auto-status');
  const start = document.getElementById('direct-auto-start');
  const stop = document.getElementById('direct-auto-stop');
  const receive = document.getElementById('direct-auto-receive');
  const homeStatus = document.getElementById('home-sync-status');
  const homeStart = document.getElementById('home-direct-start');
  if (homeStatus && typeof homeSyncStatus === 'function') homeStatus.textContent = homeSyncStatus();
  if (homeStart) { homeStart.hidden = !!directAutoSession; homeStart.disabled = directAutoRunning || googleTestBusy; }
  if (status) status.textContent = message;
  if (start) { start.disabled = !!directAutoSession || directAutoRunning; start.textContent = directAutoResumePending(load('directSyncState', null)) ? 'ادامه اتصال خودکار' : 'فعال‌کردن ارسال خودکار'; }
  if (stop) stop.disabled = !directAutoSession;
  if (receive) receive.disabled = !!directAutoSession || directAutoRunning;
}

function directAutoStop(message = 'ارسال خودکار متوقف شد.') {
  directAutoResumeClear();
  directAutoSession = null;
  if (directAutoTimer !== null) clearInterval(directAutoTimer);
  directAutoTimer = null;
  directAutoShow(message);
}

function directAutoStart() {
  if (googleTestBusy || directAutoRunning || directAutoSession) { directAutoShow('عملیات دیگری در جریان است.'); return; }
  const state = load('directSyncState', null);
  if (!state || !state.id || !state.base || !state.email) { directAutoShow('ابتدا شیت اتصال مستقیم را بساز و یک بار همگام‌سازی دستی را کامل کن.'); return; }
  const receiveControl = document.getElementById('direct-auto-receive');
  const receive = receiveControl ? !!receiveControl.checked : load('directAutoReceiveEnabled', false) === true;
  const resume = receive && directAutoResumePending(state);
  if (!resume && !confirm(receive ? 'تا وقتی صفحه باز است، تغییرات این دستگاه ارسال و نسخه جدید شیت در صورت نبود تغییر ارسال‌نشده دریافت شود؟ برای دریافت خودکار به صفحه خانه برو و فرم‌های باز را ببند.' : 'تا زمانی که این صفحه باز است، تغییرات این دستگاه هر دقیقه به شیت اتصال مستقیم افزوده شود؟ در صورت تغییر شیت از دستگاه دیگر، ارسال متوقف می‌شود.')) return;
  directAutoResumeClear();
  try {
    const requestedScope = directSyncScope();
    const client = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_TEST_CLIENT,
      scope: requestedScope,
      callback: async response => {
        try {
          if (response.error || !response.access_token) throw new Error('اجازه گوگل صادر نشد');
          directSyncCheckGranted(response, requestedScope);
          const lifetime = Number(response.expires_in);
          if (!Number.isFinite(lifetime) || lifetime <= 60) throw new Error('زمان اعتبار دسترسی گوگل مشخص نیست');
          const headers = { Authorization: 'Bearer ' + response.access_token };
          const userResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers });
          if (!userResponse.ok) throw new Error('بررسی حساب گوگل ناموفق بود');
          const user = await userResponse.json();
          const current = load('directSyncState', null);
          if (!current || current.id !== state.id || current.base !== state.base || current.email !== state.email) throw new Error('تنظیمات اتصال تغییر کرده؛ دوباره تلاش کن');
          if (!user.email || user.email !== state.email) throw new Error('حساب گوگل با حساب شیت یکسان نیست');
          directAutoSession = { token: response.access_token, expires: Date.now() + (lifetime - 60) * 1000, id: state.id, email: state.email, receive };
          directAutoTimer = setInterval(() => { if (document.visibilityState === 'visible') directAutoTick(); }, 60000);
          directAutoShow('در حال بررسی شیت برای ارسال خودکار…');
        } catch (error) { directAutoStop('⚠️ ' + (error.message || 'فعال‌سازی انجام نشد')); }
        finally { googleTestBusy = false; googleTestButton(); }
        if (directAutoSession) directAutoTick();
      },
      error_callback: () => { googleTestBusy = false; googleTestButton(); directAutoStop('⚠️ پنجره گوگل بسته شد یا باز نشد.'); }
    });
    googleTestBusy = true; googleTestButton(); directAutoShow('در حال باز کردن اجازه گوگل…');
    client.requestAccessToken({ prompt: 'select_account' });
  } catch (error) { googleTestBusy = false; googleTestButton(); directAutoStop('⚠️ آماده‌سازی ناموفق بود: ' + (error.message || error)); }
}

async function directAutoTick() {
  const session = directAutoSession;
  if (!session || directAutoRunning || googleTestBusy) return;
  if (Date.now() >= session.expires) { directAutoStop('دسترسی گوگل منقضی شد؛ برای ادامه دوباره فعال کن.'); return; }
  directAutoRunning = true; googleTestBusy = true; googleTestButton(); directSyncButtons(true);
  let appendStarted = false;
  try {
    const state = load('directSyncState', null);
    if (!state || state.id !== session.id || state.email !== session.email || !state.base) throw new Error('اتصال این دستگاه تغییر کرده است');
    const pending = directAutoPendingRead();
    if (pending && (pending.sheet !== state.id || pending.email !== state.email)) throw new Error('ارسال بررسی‌نشده مربوط به اتصال دیگری است؛ ابتدا همان اتصال را بررسی کن');
    const headers = { Authorization: 'Bearer ' + session.token };
    const api = 'https://sheets.googleapis.com/v4/spreadsheets/' + encodeURIComponent(state.id) + '/values/';
    const read = async () => {
      let response;
      try { response = await fetch(api + encodeURIComponent("'DirectSync'!A:GR"), { headers }); }
      catch (_) { const error = new Error('ارتباط با شیت برقرار نشد'); error.directAutoReadNetwork = true; throw error; }
      if (!response.ok) throw new Error(await directSyncReadError(response, session.email));
      return directSyncParse((await response.json()).values);
    };
    let records = await read();
    if (directAutoSession !== session) return;
    let graph = DirectSyncCore.inspectHistory(records);
    if (graph.state !== 'linear') throw new Error('سابقه شیت چند شاخه شده است؛ نسخه‌ها حفظ شده‌اند');
    if (pending) {
      const saved = records.find(record => record.id === pending.id);
      if (!saved) { directAutoShow('⚠️ نتیجه ارسال قبلی هنوز روشن نیست؛ برنامه بدون ارسال تکراری دوباره بررسی می‌کند.'); return; }
      if ((state.base !== pending.base && state.base !== pending.id) || saved.parent !== pending.base || await directAutoFingerprint(DirectSyncCore.canonicalData(saved.backup.data)) !== pending.hash) throw new Error('نسخه ارسال‌شده با انتظار دستگاه مطابقت ندارد؛ بررسی دستی لازم است');
      if (directAutoSession !== session) return;
      const current = load('directSyncState', null);
      if (!current || current.id !== state.id || current.base !== state.base || current.email !== state.email) throw new Error('اتصال هنگام بررسی تغییر کرده است');
      state.base = pending.id; localStorage.setItem('directSyncState', JSON.stringify(state)); directSyncLink(state);
      directAutoPendingClear(pending.raw);
      directAutoShow('✅ ارسال قبلی در شیت پیدا و تأیید شد؛ اتصال خودکار فعال است.');
      return;
    }
    const head = records.find(record => record.id === graph.heads[0]);
    const base = records.find(record => record.id === state.base);
    if (!head || !base) throw new Error('نسخه مبنای این دستگاه در شیت پیدا نشد');
    const local = directSyncSnapshot(), value = DirectSyncCore.canonicalData(local.data);
    const decision = DirectSyncCore.decide(DirectSyncCore.canonicalData(base.backup.data), value, DirectSyncCore.canonicalData(head.backup.data));
    if (decision === 'conflict') throw new Error('هم این گوشی و هم شیت تغییر کرده‌اند؛ دریافت متوقف شد تا اطلاعات جایگزین نشوند. همگام‌سازی دستی را بررسی کن');
    if (decision === 'download' && !session.receive) throw new Error('نسخه جدید در شیت هست، اما دریافت خودکار هنگام فعال‌سازی انتخاب نشده بود؛ توقف را بزن، تیک دریافت خودکار را بزن و دوباره فعال کن');
    if (decision === 'download') {
      if (typeof directAutoCanApply === 'function' ? !directAutoCanApply() : ((typeof busyTyping === 'function' && busyTyping()) || (typeof tab !== 'undefined' && tab === 'add'))) { directAutoShow('نسخه جدید آماده است؛ فرم‌های باز را ببند و به صفحه خانه برو تا دریافت شود.'); return; }
      if (localStorage.getItem(DIRECT_RECEIVE_JOURNAL)) {
        directAutoShow('در حال نگهداری پشتیبان قبلی در این گوشی…');
        await directReceiveArchivePrevious();
        if (directAutoSession !== session) return;
      }
      const refreshed = await read(), checked = DirectSyncCore.inspectHistory(refreshed);
      const latest = refreshed.find(record => record.id === head.id);
      if (directAutoSession !== session) return;
      if (checked.state !== 'linear' || checked.heads[0] !== head.id || !latest || DirectSyncCore.canonicalData(latest.backup.data) !== DirectSyncCore.canonicalData(head.backup.data)) throw new Error('شیت هنگام دریافت تغییر کرد؛ دوباره بررسی کن');
      if (typeof directAutoCanApply === 'function' ? !directAutoCanApply() : ((typeof busyTyping === 'function' && busyTyping()) || (typeof tab !== 'undefined' && tab === 'add'))) { directAutoShow('نسخه جدید آماده است؛ فرم‌های باز را ببند و به صفحه خانه برو تا دریافت شود.'); return; }
      directReceiveApply(head.backup, value, state, head.id);
      try {
        directReceiveRefreshView();
        directAutoShow('✅ نسخه جدید دریافت شد؛ همگام‌سازی خودکار همچنان فعال است.');
      } catch (_) {
        directAutoStop('نسخه جدید دریافت شد؛ برنامه برای نمایش درست دوباره باز می‌شود.');
        try { sessionStorage.setItem('directAutoResume', JSON.stringify({ id: state.id, email: state.email, base: head.id, until: Date.now() + 300000 })); } catch (_) {}
        alert('نسخه جدید دریافت شد. برنامه دوباره باز می‌شود؛ برای ادامه اتصال خودکار را فعال کن.');
        location.reload();
      }
      return;
    }
    if (decision === 'unchanged') {
      if (state.base !== head.id) { state.base = head.id; localStorage.setItem('directSyncState', JSON.stringify(state)); }
      directAutoShow('✅ ارسال خودکار فعال است؛ اطلاعات این دستگاه و شیت یکسان‌اند.'); return;
    }
    const serialized = JSON.stringify(local), parts = [];
    for (let i = 0; i < serialized.length; i += 12000) parts.push(serialized.slice(i, i + 12000));
    if (parts.length > 196) throw new Error('اطلاعات برای شیت بیش از حد بزرگ است');
    const bytes = new Uint8Array(16); crypto.getRandomValues(bytes);
    const id = Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
    const hash = await directAutoFingerprint(value);
    if (directAutoSession !== session) return;
    const beforeSend = load('directSyncState', null);
    if (!beforeSend || beforeSend.id !== state.id || beforeSend.base !== state.base || beforeSend.email !== state.email) throw new Error('اتصال هنگام بررسی تغییر کرده است');
    if (directAutoPendingRead()) throw new Error('ارسال دیگری در حال بررسی است');
    const pendingRaw = JSON.stringify({ version: 1, id, base: state.base, sheet: state.id, email: state.email, hash });
    localStorage.setItem(DIRECT_AUTO_PENDING, pendingRaw);
    directAutoShow('در حال ارسال نسخه و بررسی مجدد…');
    appendStarted = true;
    let sent;
    try { sent = await fetch(api + encodeURIComponent("'DirectSync'!A:A") + ':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ values: [[id, head.id, new Date().toISOString(), String(parts.length), ...parts]] }) }); }
    catch (_) { const error = new Error('پاسخ ارسال نرسید'); error.directAutoPostNetwork = true; throw error; }
    if (!sent.ok) throw new Error('ارسال تأیید نشد (کد ' + sent.status + ')؛ پیش از تلاش مجدد شیت را بررسی کن');
    records = await read(); graph = DirectSyncCore.inspectHistory(records);
    const saved = records.find(record => record.id === id);
    if (!saved || DirectSyncCore.canonicalData(saved.backup.data) !== value) throw new Error('نسخه ارسالی تأیید نشد؛ شیت را بررسی کن');
    if (graph.state !== 'linear' || graph.heads[0] !== id) throw new Error('تغییر هم‌زمان تشخیص داده شد؛ نسخه‌ها در شیت حفظ شده‌اند');
    if (directAutoSession !== session) return;
    const current = load('directSyncState', null);
    if (!current || current.id !== state.id || current.base !== state.base || current.email !== state.email) throw new Error('اتصال هنگام ارسال تغییر کرده است؛ شیت را بررسی کن');
    state.base = id; localStorage.setItem('directSyncState', JSON.stringify(state)); directSyncLink(state);
    directAutoPendingClear(pendingRaw);
    directAutoShow('✅ نسخه این دستگاه خودکار ارسال و دوباره خوانده شد.');
  } catch (error) {
    if (directAutoSession === session) {
      if (appendStarted && (error.directAutoPostNetwork || error.directAutoReadNetwork)) directAutoShow('⚠️ نتیجه ارسال نامشخص است؛ با برگشت ارتباط نسخه ارسالی بررسی می‌شود و ارسال تکراری انجام نمی‌شود.');
      else if (error.directAutoReadNetwork && !appendStarted) directAutoShow('⚠️ ارتباط با شیت قطع است؛ با برگشت اینترنت دوباره بررسی می‌شود. اطلاعات دستگاه تغییر نکرده است.');
      else directAutoStop('⚠️ ارسال خودکار متوقف شد: ' + (error.message || error) + (appendStarted ? '؛ ممکن است نسخه به شیت اضافه شده باشد، پیش از تلاش دوباره آن را بررسی کن.' : ''));
    }
  }
  finally { directAutoRunning = false; googleTestBusy = false; directSyncButtons(false); googleTestButton(); directAutoShow(directAutoStatus); }
}

document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') directAutoTick(); });
addEventListener('online', () => directAutoTick());
