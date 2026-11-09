'use strict';

// The token remains in this page's memory and is never placed in storage.
let directAutoSession = null;
let directAutoTimer = null;
let directAutoRunning = false;
let directAutoStatus = 'ارسال خودکار غیرفعال است.';

function directAutoShow(message) {
  directAutoStatus = message;
  const status = document.getElementById('direct-auto-status');
  const start = document.getElementById('direct-auto-start');
  const stop = document.getElementById('direct-auto-stop');
  const receive = document.getElementById('direct-auto-receive');
  if (status) status.textContent = message;
  if (start) start.disabled = !!directAutoSession || directAutoRunning;
  if (stop) stop.disabled = !directAutoSession;
  if (receive) receive.disabled = !!directAutoSession || directAutoRunning;
}

function directAutoStop(message = 'ارسال خودکار متوقف شد.') {
  directAutoSession = null;
  if (directAutoTimer !== null) clearInterval(directAutoTimer);
  directAutoTimer = null;
  directAutoShow(message);
}

function directAutoStart() {
  if (googleTestBusy || directAutoRunning || directAutoSession) { directAutoShow('عملیات دیگری در جریان است.'); return; }
  const state = load('directSyncState', null);
  if (!state || !state.id || !state.base || !state.email) { directAutoShow('ابتدا شیت اتصال مستقیم را بساز و یک بار همگام‌سازی دستی را کامل کن.'); return; }
  const receive = !!document.getElementById('direct-auto-receive')?.checked;
  if (!confirm(receive ? 'تا وقتی صفحه باز است، تغییرات این دستگاه ارسال و نسخه جدید شیت در صورت نبود تغییر ارسال‌نشده دریافت شود؟ بعد از دریافت، برنامه دوباره باز می‌شود و برای ادامه باید اتصال خودکار را دوباره فعال کنی.' : 'تا زمانی که این صفحه باز است، تغییرات این دستگاه هر دقیقه به شیت اتصال مستقیم افزوده شود؟ در صورت تغییر شیت از دستگاه دیگر، ارسال متوقف می‌شود.')) return;
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
    const headers = { Authorization: 'Bearer ' + session.token };
    const api = 'https://sheets.googleapis.com/v4/spreadsheets/' + encodeURIComponent(state.id) + '/values/';
    const read = async () => {
      const response = await fetch(api + encodeURIComponent("'DirectSync'!A:GR"), { headers });
      if (!response.ok) throw new Error(await directSyncReadError(response, session.email));
      return directSyncParse((await response.json()).values);
    };
    let records = await read();
    if (directAutoSession !== session) return;
    let graph = DirectSyncCore.inspectHistory(records);
    if (graph.state !== 'linear') throw new Error('سابقه شیت چند شاخه شده است؛ نسخه‌ها حفظ شده‌اند');
    const head = records.find(record => record.id === graph.heads[0]);
    const base = records.find(record => record.id === state.base);
    if (!head || !base) throw new Error('نسخه مبنای این دستگاه در شیت پیدا نشد');
    const local = directSyncSnapshot(), value = DirectSyncCore.canonicalData(local.data);
    const decision = DirectSyncCore.decide(DirectSyncCore.canonicalData(base.backup.data), value, DirectSyncCore.canonicalData(head.backup.data));
    if (decision === 'conflict') throw new Error('هم این گوشی و هم شیت تغییر کرده‌اند؛ دریافت متوقف شد تا اطلاعات جایگزین نشوند. همگام‌سازی دستی را بررسی کن');
    if (decision === 'download' && !session.receive) throw new Error('نسخه جدید در شیت هست، اما دریافت خودکار هنگام فعال‌سازی انتخاب نشده بود؛ توقف را بزن، تیک دریافت خودکار را بزن و دوباره فعال کن');
    if (decision === 'download') {
      if ((typeof busyTyping === 'function' && busyTyping()) || (typeof tab !== 'undefined' && tab === 'add')) { directAutoShow('نسخه جدید آماده است؛ پس از پایان کار با فرم دریافت می‌شود.'); return; }
      if (localStorage.getItem(DIRECT_RECEIVE_JOURNAL)) throw new Error('پشتیبان دریافت قبلی هنوز در گوشی است. ابتدا «دانلود پشتیبان قبل از دریافت» را بزن و ذخیره فایل را بررسی کن؛ سپس «حذف پشتیبان محلی قبلی» و دوباره «فعال‌کردن ارسال خودکار» را بزن. حذف، فقط پشتیبان محلی قبلی را پاک می‌کند');
      const refreshed = await read(), checked = DirectSyncCore.inspectHistory(refreshed);
      const latest = refreshed.find(record => record.id === head.id);
      if (directAutoSession !== session) return;
      if (checked.state !== 'linear' || checked.heads[0] !== head.id || !latest || DirectSyncCore.canonicalData(latest.backup.data) !== DirectSyncCore.canonicalData(head.backup.data)) throw new Error('شیت هنگام دریافت تغییر کرد؛ دوباره بررسی کن');
      if ((typeof busyTyping === 'function' && busyTyping()) || (typeof tab !== 'undefined' && tab === 'add')) { directAutoShow('نسخه جدید آماده است؛ پس از پایان کار با فرم دریافت می‌شود.'); return; }
      directReceiveApply(head.backup, value, state, head.id);
      directAutoStop('نسخه جدید دریافت شد؛ برنامه دوباره باز می‌شود.');
      alert('نسخه جدید شیت دریافت شد. برنامه دوباره باز می‌شود؛ برای ادامه همگام‌سازی خودکار را دوباره فعال کن.');
      location.reload(); return;
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
    if (directAutoSession !== session) return;
    const beforeSend = load('directSyncState', null);
    if (!beforeSend || beforeSend.id !== state.id || beforeSend.base !== state.base || beforeSend.email !== state.email) throw new Error('اتصال هنگام بررسی تغییر کرده است');
    directAutoShow('در حال ارسال نسخه و بررسی مجدد…');
    appendStarted = true;
    const sent = await fetch(api + encodeURIComponent("'DirectSync'!A:A") + ':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ values: [[id, head.id, new Date().toISOString(), String(parts.length), ...parts]] }) });
    if (!sent.ok) throw new Error('ارسال تأیید نشد (کد ' + sent.status + ')؛ پیش از تلاش مجدد شیت را بررسی کن');
    records = await read(); graph = DirectSyncCore.inspectHistory(records);
    const saved = records.find(record => record.id === id);
    if (!saved || DirectSyncCore.canonicalData(saved.backup.data) !== value) throw new Error('نسخه ارسالی تأیید نشد؛ شیت را بررسی کن');
    if (graph.state !== 'linear' || graph.heads[0] !== id) throw new Error('تغییر هم‌زمان تشخیص داده شد؛ نسخه‌ها در شیت حفظ شده‌اند');
    if (directAutoSession !== session) return;
    const current = load('directSyncState', null);
    if (!current || current.id !== state.id || current.base !== state.base || current.email !== state.email) throw new Error('اتصال هنگام ارسال تغییر کرده است؛ شیت را بررسی کن');
    state.base = id; localStorage.setItem('directSyncState', JSON.stringify(state)); directSyncLink(state);
    directAutoShow('✅ نسخه این دستگاه خودکار ارسال و دوباره خوانده شد.');
  } catch (error) { if (directAutoSession === session) directAutoStop('⚠️ ارسال خودکار متوقف شد: ' + (error.message || error) + (appendStarted ? '؛ ممکن است نسخه به شیت اضافه شده باشد، پیش از تلاش دوباره آن را بررسی کن.' : '')); }
  finally { directAutoRunning = false; googleTestBusy = false; directSyncButtons(false); googleTestButton(); directAutoShow(directAutoStatus); }
}

document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') directAutoTick(); });
addEventListener('online', () => directAutoTick());
