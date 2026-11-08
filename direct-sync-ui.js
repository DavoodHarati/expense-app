'use strict';

function directSyncMessage(text) { const el = document.getElementById('direct-sync-message'); if (el) el.textContent = text; }
function directSyncScope() {
  return 'openid email https://www.googleapis.com/auth/drive.file' + (load('directSyncWideSheets', false) === true ? ' https://www.googleapis.com/auth/spreadsheets' : '');
}
async function directSyncReadError(response, email) {
  let reason = '';
  try {
    const data = await response.json();
    const errors = data && data.error && data.error.errors;
    const candidate = Array.isArray(errors) && errors[0] && errors[0].reason;
    if (typeof candidate === 'string' && /^[A-Za-z0-9_]{1,80}$/.test(candidate)) reason = candidate;
  } catch (_) {}
  let text = 'خواندن شیت ناموفق بود (کد ' + response.status + ')';
  if (response.status === 403) {
    text += '؛ حساب انتخاب‌شده: ' + email + '. دسترسی شیت یا برنامه را بررسی کن.';
    if (reason) text += ' دلیل گوگل: ' + reason + '.';
    text += ' هیچ اطلاعاتی تغییر نکرد.';
  }
  return text;
}
function directSyncButtons(disabled) {
  for (const id of ['direct-sync-create', 'direct-sync-run', 'direct-sync-receipts', 'direct-sync-receive']) { const el = document.getElementById(id); if (el) el.disabled = disabled; }
}
function directSyncLink(state) {
  const el = document.getElementById('direct-sync-link');
  if (!el) return;
  el.replaceChildren();
  if (!state || !/^[A-Za-z0-9_-]+$/.test(state.id || '')) return;
  const url = 'https://docs.google.com/spreadsheets/d/' + state.id + '/edit';
  const a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = 'باز کردن شیت اتصال مستقیم'; el.appendChild(a);
  const copy = document.createElement('button'); copy.type = 'button'; copy.className = 'sec'; copy.textContent = 'کپی لینک برای گوشی دوم';
  copy.onclick = async () => {
    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(url);
      directSyncMessage('✅ لینک کپی شد؛ آن را برای گوشی دوم بفرست.');
    } catch (_) {
      window.prompt('کپی خودکار ممکن نشد. لینک زیر را انتخاب و کپی کن:', url);
    }
  };
  el.appendChild(document.createElement('br')); el.appendChild(copy);
}
function directSyncSheetId(input) {
  try {
    const u = new URL(input);
    if (u.protocol !== 'https:' || u.hostname !== 'docs.google.com' || u.port || u.username || u.password) return '';
    return (u.pathname.match(/^\/spreadsheets\/(?:u\/\d+\/)?d\/([A-Za-z0-9_-]+)(?:\/|$)/) || [])[1] || '';
  } catch (_) { return ''; }
}
function directSyncPrepare() {
  directSyncLink(load('directSyncState', null));
  googleIdentityLoad.then(() => {
    const create = document.getElementById('direct-sync-create'), run = document.getElementById('direct-sync-run'), receipts = document.getElementById('direct-sync-receipts'), receive = document.getElementById('direct-sync-receive');
    if (!create || !run) return;
    directSyncButtons(false);
    create.onclick = () => directSyncAuthorize('create');
    run.onclick = () => directSyncAuthorize('sync');
    const permission = document.createElement('button');
    permission.type = 'button'; permission.className = 'sec';
    const updatePermission = () => { permission.textContent = load('directSyncWideSheets', false) === true ? 'خاموش‌کردن درخواست مجوز گسترده شیت‌ها' : 'رفع خطای دسترسی: درخواست مجوز گسترده شیت‌ها'; };
    updatePermission();
    permission.onclick = () => {
      if (load('directSyncWideSheets', false) === true) {
        localStorage.removeItem('directSyncWideSheets'); directAutoStop(); updatePermission();
        directSyncMessage('درخواست مجوز گسترده در برنامه خاموش شد. برای لغو مجوزی که قبلاً به گوگل داده‌ای، باید از تنظیمات حساب گوگل استفاده کنی.'); return;
      }
      if (!confirm('این گزینه از گوگل اجازه خواندن و ویرایش همه Google Sheets قابل دسترس در حساب انتخابی را می‌خواهد، نه فقط این شیت. فقط اگر با این دسترسی موافقی تأیید کن. اطلاعات گوشی تغییر نمی‌کند.')) return;
      localStorage.setItem('directSyncWideSheets', 'true'); directAutoStop(); updatePermission(); directSyncAuthorize('sync');
    };
    run.insertAdjacentElement('afterend', permission);
    if (receipts) receipts.onclick = () => directSyncAuthorize('receipts');
    if (receive) receive.onclick = () => directSyncAuthorize('receive');
    const previous = document.getElementById('direct-receive-previous'), clear = document.getElementById('direct-receive-clear');
    if (previous) previous.onclick = () => { try { directReceiveDownloadPrevious(); directSyncMessage('فایل پشتیبان قبل از دریافت آماده شد؛ ذخیره‌شدن آن را در دانلودها بررسی کن.'); } catch (error) { directSyncMessage('⚠️ ' + (error.message || error)); } };
    if (clear) clear.onclick = () => { const raw = localStorage.getItem(DIRECT_RECEIVE_JOURNAL); if (!raw) { directSyncMessage('پشتیبانی برای پاک‌کردن وجود ندارد.'); return; } try { if (JSON.parse(raw).phase !== 'committed') throw new Error('پشتیبان در حال بازیابی است'); if (confirm('فقط پس از اطمینان از ذخیره فایل پشتیبان، نسخه محلی قبلی حذف شود؟')) { localStorage.removeItem(DIRECT_RECEIVE_JOURNAL); directSyncMessage('نسخه محلی قبلی حذف شد.'); } } catch (error) { directSyncMessage('⚠️ ' + (error.message || error)); } };
    const autoStart = document.getElementById('direct-auto-start'), autoStop = document.getElementById('direct-auto-stop');
    if (autoStart) autoStart.onclick = directAutoStart;
    if (autoStop) autoStop.onclick = () => directAutoStop('ارسال خودکار متوقف شد. اگر ارسالی در جریان بود ممکن است همان نسخه به شیت افزوده شود.');
    directAutoShow(directAutoStatus);
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
async function directSyncReceiptArchive(sheetId, headers, items) {
  const api = 'https://sheets.googleapis.com/v4/spreadsheets/' + encodeURIComponent(sheetId);
  const valuesApi = api + '/values/';
  const name = 'ReceiptArchive';
  const header = ['شناسه رسید (expense-receipt-v1)', 'گیرنده', 'مبلغ تومان', 'تاریخ', 'حساب هنگام ارسال', 'وضعیت هنگام ارسال', 'متن رسید'];
  const metadata = async () => {
    const response = await fetch(api + '?fields=sheets(properties(title))', { headers });
    if (!response.ok) throw new Error('فهرست برگه‌های شیت دریافت نشد (کد ' + response.status + ')');
    const result = await response.json();
    if (!Array.isArray(result.sheets)) throw new Error('فهرست برگه‌های شیت معتبر نیست');
    return result.sheets.some(sheet => sheet.properties && sheet.properties.title === name);
  };
  if (!(await metadata())) {
    const random = new Uint32Array(1); crypto.getRandomValues(random);
    const tabId = 1 + (random[0] % 2000000000);
    const requests = [
      { addSheet: { properties: { sheetId: tabId, title: name, rightToLeft: true } } },
      { updateCells: { start: { sheetId: tabId, rowIndex: 0, columnIndex: 0 }, rows: [{ values: header.map(value => ({ userEnteredValue: { stringValue: value } })) }], fields: 'userEnteredValue' } }
    ];
    const created = await fetch(api + ':batchUpdate', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ requests }) });
    if (!created.ok && !(await metadata())) throw new Error('ساخت برگه رسیدها تأیید نشد (کد ' + created.status + ')');
  }
  const url = valuesApi + encodeURIComponent("'ReceiptArchive'!A:G");
  const read = async () => {
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('خواندن برگه رسیدها ناموفق بود (کد ' + response.status + ')');
    const result = await response.json(), rows = result.values;
    if (!Array.isArray(rows) || JSON.stringify(rows[0]) !== JSON.stringify(header)) throw new Error('برگه ReceiptArchive قالب معتبر برنامه را ندارد؛ هیچ تغییری داده نشد');
    const existing = new Map();
    for (const row of rows.slice(1)) {
      if (!Array.isArray(row) || !/^[a-f0-9]{64}$/.test(row[0] || '') || typeof row[6] !== 'string' || !row[6]) throw new Error('یک ردیف در برگه رسیدها ناقص است؛ ارسال متوقف شد');
      if (existing.has(row[0]) && existing.get(row[0]) !== row[6]) throw new Error('شناسه‌های رسید در شیت با هم ناسازگارند');
      existing.set(row[0], row[6]);
    }
    return existing;
  };
  const known = await read(), toSend = [];
  for (const item of items) {
    const raw = String(item.raw || '').trim(); if (!raw) continue;
    if (raw.length > 45000) throw new Error('متن یکی از رسیدها برای یک سلول شیت بیش از حد طولانی است');
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
    const id = Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
    if (known.has(id)) { if (known.get(id) !== raw) throw new Error('شناسه رسید با متن شیت مطابقت ندارد'); continue; }
    const txItem = tx.find(entry => entry.receipt === raw.slice(0, 1000));
    const parsed = parseReceipt(raw);
    const nameValue = parsed && parsed.name || txItem && (txItem.person || txItem.seller) || '';
    const amount = parsed && parsed.amount || txItem && txItem.amount;
    const date = parsed && parsed.date || txItem && txItem.date || '';
    const row = [id, String(nameValue), amount ? String(Math.round(amount / 10)) : '', String(date), txItem ? String(accName(txItem.account)) : '', txItem ? 'وصل‌شده' : 'بدون تراکنش متصل', raw];
    toSend.push(row); known.set(id, raw);
  }
  if (!toSend.length) return 0;
  const appended = await fetch(valuesApi + encodeURIComponent("'ReceiptArchive'!A:G") + ':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ values: toSend }) });
  if (!appended.ok) throw new Error('ارسال رسیدها تأیید نشد (کد ' + appended.status + ')؛ پیش از تلاش دوباره برگه رسیدها را بررسی کن');
  const confirmed = await read();
  for (const row of toSend) if (confirmed.get(row[0]) !== row[6]) throw new Error('بررسی رسیدهای ارسال‌شده کامل نشد؛ برگه را بررسی کن');
  return toSend.length;
}
function directSyncAuthorize(action) {
  if (googleTestBusy) { directSyncMessage('عملیات دیگری در حال انجام است؛ پس از پایان آن دوباره تلاش کن.'); return; }
  if (action === 'create' && localStorage.getItem('directSyncCreatePending') && !confirm('ممکن است شیت قبلی ساخته شده باشد. ابتدا گوگل درایو را بررسی کن. شیت دیگری ساخته شود؟')) return;
  if (action === 'create' && load('directSyncState', null) && !confirm('یک شیت اتصال مستقیم روی این دستگاه ثبت شده است. شیت جداگانه دیگری ساخته شود؟')) return;
  try {
    const client = google.accounts.oauth2.initTokenClient({ client_id: GOOGLE_TEST_CLIENT, scope: directSyncScope(),
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
            const id = directSyncSheetId(input);
            if (!id) throw new Error('لینک شیت معتبر نیست');
            if (!state || state.id !== id) state = { id, email: user.email, base: '' };
          }
          if (!state || !/^[A-Za-z0-9_-]+$/.test(state.id || '')) throw new Error('ابتدا شیت جدا بساز یا لینک آن را وارد کن');
          if (state.email && state.email !== user.email) throw new Error('حساب گوگل انتخاب‌شده با حساب شیت متفاوت است');
          const baseUrl = 'https://sheets.googleapis.com/v4/spreadsheets/' + encodeURIComponent(state.id) + '/values/';
          const range = encodeURIComponent("'DirectSync'!A:GR");
          const read = async () => { const r = await fetch(baseUrl + range, { headers }); if (!r.ok) throw new Error(await directSyncReadError(r, user.email)); return directSyncParse((await r.json()).values); };
          directSyncMessage('در حال بررسی نسخه‌های شیت…');
          let records = await read(), graph = DirectSyncCore.inspectHistory(records);
          if (graph.state === 'conflict') throw new Error('دو دستگاه نسخه‌های متفاوت ذخیره کرده‌اند. هر دو در شیت حفظ شده‌اند و همگام‌سازی متوقف است');
          const head = records.find(item => item.id === graph.heads[0]);
          const receiptItems = action === 'receipts' ? receiptArchiveItems() : null;
          const local = directSyncSnapshot(), localValue = DirectSyncCore.canonicalData(local.data);
          if (action === 'receipts') {
            if (!head) throw new Error('ابتدا یک نسخه با همگام‌سازی دستی در این شیت ثبت کن');
            if (!receiptItems.length) { directSyncMessage('هنوز رسیدی برای ارسال وجود ندارد.'); return; }
            if (!confirm('رسیدهای این دستگاه در برگه جداگانه شیت اتصال مستقیم ذخیره شوند؟ اطلاعات شخصی رسیدها در حساب گوگل انتخاب‌شده قرار می‌گیرد.')) { directSyncMessage('ارسال رسیدها لغو شد.'); return; }
            directSyncMessage('در حال آماده‌سازی و بررسی برگه رسیدها…');
            const count = await directSyncReceiptArchive(state.id, headers, receiptItems);
            directSyncMessage(count ? '✅ ' + count.toLocaleString('fa-IR') + ' رسید در برگه جدا اضافه و خوانده شد. حساب و وضعیت مربوط به زمان ارسال است.' : '✅ همه رسیدهای موجود قبلاً در برگه ثبت شده‌اند.');
            return;
          }
          if (action === 'receive') {
            if (!head || !state.base) throw new Error('ابتدا این دستگاه باید به نسخه یکسان شیت متصل باشد');
            const base = records.find(item => item.id === state.base);
            if (!base) throw new Error('نسخه مبنای این دستگاه در شیت پیدا نشد');
            const decision = DirectSyncCore.decide(DirectSyncCore.canonicalData(base.backup.data), localValue, DirectSyncCore.canonicalData(head.backup.data));
            if (decision === 'conflict' || decision === 'upload') throw new Error('این دستگاه تغییرات ارسال‌نشده دارد؛ دریافت متوقف شد تا اطلاعات حفظ شود');
            if (decision === 'unchanged') { directSyncMessage('✅ اطلاعات این دستگاه با شیت یکسان است؛ دریافتی لازم نیست.'); return; }
            if (SYNC() || directReceiveLegacyAtBoot) throw new Error('اتصال قدیمی Apps Script باید غیرفعال باشد و برنامه پس از آن دوباره باز شود؛ دریافت مستقیم متوقف است');
            const count = JSON.parse(head.backup.data.tx).length;
            if (!confirm('نسخه جدید شیت شامل ' + count.toLocaleString('fa-IR') + ' تراکنش است. اطلاعات فعلی این دستگاه با آن جایگزین شود؟ نسخه قبلی در دستگاه نگهداری می‌شود. سایر تب‌های برنامه را ببند.')) { directSyncMessage('دریافت لغو شد.'); return; }
            directReceiveApply(head.backup, localValue, state, head.id);
            directAutoStop('دریافت انجام شد.');
            alert('دریافت انجام شد. پشتیبان نسخه قبلی در تنظیمات اتصال مستقیم در دسترس است.');
            location.reload(); return;
          }
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
            if (decision === 'conflict') {
              const preview = DirectSyncCore.previewMerge(base.backup.data, local.data, head.backup.data);
              const detail = preview.conflicts.length ? preview.conflicts.length.toLocaleString('fa-IR') + ' مورد نیازمند بررسی است.' : 'تغییرها در بررسی اولیه قابل تفکیک‌اند؛ ادغام خودکار هنوز فعال نیست.';
              const download = confirm('اطلاعات این دستگاه و شیت هر دو تغییر کرده‌اند. ' + detail + ' نسخه شیت برای بررسی دانلود شود؟ اطلاعات فعلی تغییر نمی‌کند.');
              if (download) directSyncDownload(head.backup);
              directSyncMessage('⚠️ ' + detail + ' هیچ اطلاعاتی تغییر نکرد.'); return;
            }
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
