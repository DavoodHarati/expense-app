'use strict';

function directSyncMessage(text) { const el = document.getElementById('direct-sync-message'); if (el) el.textContent = text; }
function directSyncButtons(disabled) {
  for (const id of ['direct-sync-create', 'direct-sync-run']) { const el = document.getElementById(id); if (el) el.disabled = disabled; }
}
function directSyncLink(state) {
  const el = document.getElementById('direct-sync-link');
  if (!el) return;
  el.replaceChildren();
  if (!state || !/^[A-Za-z0-9_-]+$/.test(state.id || '')) return;
  const a = document.createElement('a'); a.href = 'https://docs.google.com/spreadsheets/d/' + state.id + '/edit'; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = 'باز کردن شیت اتصال مستقیم'; el.appendChild(a);
}
function directSyncPrepare() {
  directSyncLink(load('directSyncState', null));
  googleIdentityLoad.then(() => {
    const create = document.getElementById('direct-sync-create'), run = document.getElementById('direct-sync-run');
    if (!create || !run) return;
    directSyncButtons(false);
    create.onclick = () => directSyncAuthorize('create');
    run.onclick = () => directSyncAuthorize('sync');
  }).catch(() => directSyncMessage('سرویس ورود گوگل بارگذاری نشد.'));
}
function directSyncSnapshot() {
  const backup = makeFullBackup();
  for (const key of ['sync', 'sync_bak', 'syncLock', 'sheetUrl', 'noSync', 'googleTestSheet', 'googleBackupCopy']) delete backup.data[key];
  validateFullBackup(backup);
  return backup;
}
function directSyncParse(rows) {
  if (!Array.isArray(rows) || !rows.length || JSON.stringify(rows[0]) !== JSON.stringify(['expense-direct-sync', '1'])) throw new Error('این شیت، شیت اتصال مستقیم برنامه نیست');
  return rows.slice(1).map(row => {
    if (!Array.isArray(row) || !/^[A-Za-z0-9_-]{1,128}$/.test(row[0] || '') || typeof row[1] !== 'string' || !/^[1-9]\d*$/.test(row[3] || '')) throw new Error('سابقه شیت ناقص است');
    const count = Number(row[3]);
    if (count > 196 || row.length !== count + 4 || row.slice(4).some(part => typeof part !== 'string')) throw new Error('یک نسخه در شیت ناقص است');
    const backup = JSON.parse(row.slice(4).join(''));
    validateFullBackup(backup);
    return { id: row[0], parent: row[1] === 'ROOT' ? '' : row[1], backup };
  });
}
function directSyncDownload(backup) {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = 'expense-direct-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json';
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
}
function directSyncAuthorize(action) {
  if (googleTestBusy) return;
  if (action === 'create' && localStorage.getItem('directSyncCreatePending') && !confirm('ممکن است شیت قبلی ساخته شده باشد. ابتدا گوگل درایو را بررسی کن. شیت دیگری ساخته شود؟')) return;
  if (action === 'create' && load('directSyncState', null) && !confirm('یک شیت اتصال مستقیم روی این دستگاه ثبت شده است. شیت جداگانه دیگری ساخته شود؟')) return;
  try {
    const client = google.accounts.oauth2.initTokenClient({ client_id: GOOGLE_TEST_CLIENT, scope: 'openid email https://www.googleapis.com/auth/drive.file',
      callback: async response => {
        let pending = false;
        try {
          if (response.error || !response.access_token) throw new Error('اجازه گوگل صادر نشد');
          const headers = { Authorization: 'Bearer ' + response.access_token };
          const userResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers });
          if (!userResponse.ok) throw new Error('حساب گوگل مشخص نشد');
          const user = await userResponse.json(); if (!user.email) throw new Error('ایمیل حساب مشخص نشد');
          let state = load('directSyncState', null);
          if (action === 'create') {
            if (!confirm('شیت جدید و جدا در حساب ' + user.email + ' ساخته شود؟ شیت فعلی تغییر نمی‌کند.')) { directSyncMessage('ساخت لغو شد.'); return; }
            directSyncMessage('در حال ساخت شیت جدا…');
            localStorage.setItem('directSyncCreatePending', '1'); pending = true;
            const result = await fetch('https://sheets.googleapis.com/v4/spreadsheets', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ properties: { title: 'هزینه‌ها - اتصال مستقیم آزمایشی' }, sheets: [{ properties: { title: 'DirectSync', gridProperties: { columnCount: 200 } } }] }) });
            if (!result.ok) { if (result.status < 500) { localStorage.removeItem('directSyncCreatePending'); pending = false; } throw new Error('ساخت شیت انجام نشد (کد ' + result.status + ')'); }
            const sheet = await result.json();
            if (!/^[A-Za-z0-9_-]+$/.test(sheet.spreadsheetId || '')) throw new Error('شناسه شیت دریافت نشد');
            state = { id: sheet.spreadsheetId, email: user.email, base: '' };
            localStorage.setItem('directSyncState', JSON.stringify(state)); localStorage.removeItem('directSyncCreatePending'); pending = false; directSyncLink(state);
            const setup = await fetch('https://sheets.googleapis.com/v4/spreadsheets/' + encodeURIComponent(state.id) + '/values/' + encodeURIComponent("'DirectSync'!A1:B1") + '?valueInputOption=RAW', { method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ values: [['expense-direct-sync', '1']] }) });
            if (!setup.ok) throw new Error('شیت ساخته شد اما آماده‌سازی آن کامل نشد');
            directSyncMessage('✅ شیت جدا ساخته شد. برای ارسال اطلاعات، دکمه همگام‌سازی دستی را بزن.'); return;
          }
          const input = document.getElementById('direct-sync-url').value.trim();
          if (input) {
            let id = ''; try { const u = new URL(input); if (u.protocol === 'https:' && u.hostname === 'docs.google.com') id = (u.pathname.match(/^\/spreadsheets\/d\/([A-Za-z0-9_-]+)(?:\/|$)/) || [])[1] || ''; } catch (_) {}
            if (!id) throw new Error('لینک شیت معتبر نیست');
            if (!state || state.id !== id) state = { id, email: user.email, base: '' };
          }
          if (!state || !/^[A-Za-z0-9_-]+$/.test(state.id || '')) throw new Error('ابتدا شیت جدا بساز یا لینک آن را وارد کن');
          if (state.email && state.email !== user.email) throw new Error('حساب گوگل انتخاب‌شده با حساب شیت متفاوت است');
          const baseUrl = 'https://sheets.googleapis.com/v4/spreadsheets/' + encodeURIComponent(state.id) + '/values/';
          const range = encodeURIComponent("'DirectSync'!A:GR");
          const read = async () => { const r = await fetch(baseUrl + range, { headers }); if (!r.ok) throw new Error('خواندن شیت ناموفق بود (کد ' + r.status + ')'); return directSyncParse((await r.json()).values); };
          directSyncMessage('در حال بررسی نسخه‌های شیت…');
          let records = await read(), graph = DirectSyncCore.inspectHistory(records);
          if (graph.state === 'conflict') throw new Error('دو دستگاه نسخه‌های متفاوت ذخیره کرده‌اند. هر دو در شیت حفظ شده‌اند و همگام‌سازی متوقف است');
          const head = records.find(item => item.id === graph.heads[0]);
          const local = directSyncSnapshot(), localValue = DirectSyncCore.canonicalData(local.data);
          if (head && !state.base) {
            if (localValue !== DirectSyncCore.canonicalData(head.backup.data)) {
              if (confirm('اطلاعات این دستگاه با آخرین نسخه شیت متفاوت است. فایل نسخه شیت برای بررسی دانلود شود؟ اطلاعات فعلی تغییر نمی‌کند.')) directSyncDownload(head.backup);
              directSyncMessage('⚠️ اتصال انجام نشد؛ اطلاعات دستگاه و شیت متفاوت‌اند. ابتدا پشتیبان‌ها را بررسی کن.'); return;
            }
            state.base = head.id; state.email = user.email; localStorage.setItem('directSyncState', JSON.stringify(state)); directSyncLink(state); directSyncMessage('✅ دستگاه به نسخه یکسان شیت متصل شد.'); return;
          }
          if (state.base && !head) throw new Error('سابقه شیت خالی شده است؛ همگام‌سازی متوقف شد');
          const base = state.base ? records.find(item => item.id === state.base) : null;
          if (state.base && !base) throw new Error('نسخه مبنای این دستگاه در شیت پیدا نشد');
          if (head && base) {
            const decision = DirectSyncCore.decide(DirectSyncCore.canonicalData(base.backup.data), localValue, DirectSyncCore.canonicalData(head.backup.data));
            if (decision === 'conflict') throw new Error('اطلاعات دستگاه و شیت هر دو تغییر کرده‌اند؛ هیچ‌کدام بازنویسی نشد');
            if (decision === 'download') { const download = confirm('نسخه شیت جدیدتر است. فایل آن برای بررسی دانلود شود؟ اطلاعات فعلی تغییر نمی‌کند.'); if (download) directSyncDownload(head.backup); directSyncMessage(download ? 'فایل نسخه شیت آماده شد؛ برای بازیابی از بخش پشتیبان‌گیری استفاده کن.' : 'دریافت لغو شد؛ اطلاعات دستگاه تغییر نکرد.'); return; }
            if (decision === 'unchanged') { state.base = head.id; localStorage.setItem('directSyncState', JSON.stringify(state)); directSyncLink(state); directSyncMessage('✅ اطلاعات دستگاه و شیت یکسان است.'); return; }
          }
          if (!confirm('یک نسخه از اطلاعات فعلی دستگاه به تاریخچه شیت جداگانه اضافه شود؟')) { directSyncMessage('ارسال لغو شد.'); return; }
          const serialized = JSON.stringify(local), parts = [];
          for (let i = 0; i < serialized.length; i += 12000) parts.push(serialized.slice(i, i + 12000));
          if (parts.length > 196) throw new Error('اطلاعات برای این نسخه آزمایشی بیش از حد بزرگ است');
          const bytes = new Uint8Array(16); crypto.getRandomValues(bytes); const id = Array.from(bytes, x => x.toString(16).padStart(2, '0')).join('');
          const row = [id, head ? head.id : 'ROOT', new Date().toISOString(), String(parts.length), ...parts];
          directSyncMessage('در حال ارسال نسخه و خواندن مجدد…');
          const sent = await fetch(baseUrl + encodeURIComponent("'DirectSync'!A:A") + ':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ values: [row] }) });
          if (!sent.ok) throw new Error('ارسال تأیید نشد (کد ' + sent.status + ')؛ پیش از تلاش دوباره شیت را بررسی کن');
          records = await read(); graph = DirectSyncCore.inspectHistory(records);
          const saved = records.find(item => item.id === id);
          if (!saved || DirectSyncCore.canonicalData(saved.backup.data) !== localValue) throw new Error('نسخه ارسالی با داده خوانده‌شده یکسان نیست');
          if (graph.state !== 'linear' || graph.heads[0] !== id) throw new Error('تغییر هم‌زمان تشخیص داده شد؛ نسخه‌ها در شیت باقی مانده‌اند');
          state.base = id; state.email = user.email; localStorage.setItem('directSyncState', JSON.stringify(state)); directSyncLink(state);
          directSyncMessage('✅ اطلاعات به شیت جدا ارسال و دوباره خوانده و بررسی شد. این اتصال دستی است.');
        } catch (err) { directSyncMessage('⚠️ ' + (err.message || 'عملیات کامل نشد') + (pending ? '؛ ممکن است شیت ساخته شده باشد. پیش از تلاش مجدد گوگل درایو را بررسی کن.' : '')); }
        finally { googleTestBusy = false; directSyncButtons(false); googleTestButton(); }
      },
      error_callback: () => { googleTestBusy = false; directSyncButtons(false); googleTestButton(); directSyncMessage('⚠️ پنجره گوگل بسته شد یا باز نشد.'); }
    });
    googleTestBusy = true; directSyncButtons(true); googleTestButton(); directSyncMessage('در حال باز کردن پنجره گوگل…'); client.requestAccessToken({ prompt: 'select_account' });
  } catch (_) { googleTestBusy = false; directSyncButtons(false); googleTestButton(); directSyncMessage('⚠️ آماده‌سازی اتصال ناموفق بود.'); }
}
