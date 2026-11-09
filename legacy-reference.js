'use strict';

// Read only: never calls the old Apps Script endpoint, which can write to Sheets.
const LEGACY_REFERENCE_SHEET = '1U_yhqwnlOszzu_wh3FSVbsBbtg1rDeNxSgtzdHY_LpU';
function legacyReferenceParse(valueRanges) {
  if (!Array.isArray(valueRanges) || valueRanges.length !== 5) throw new Error('برگه‌های شیت کامل دریافت نشدند');
  const expected = [['id','date','account','type','amount','balance','cat','desc','pending','xfer','person','loan','raw','json'], ['key','name'], ['id','json'], ['at','time','ok','msg','raw'], ['key','value']];
  for (let i = 0; i < expected.length; i++) if (!valueRanges[i] || !Array.isArray(valueRanges[i].values) || !Array.isArray(valueRanges[i].values[0]) || expected[i].some((name, column) => valueRanges[i].values[0][column] !== name)) throw new Error('سرستون برگه اصلی معتبر نیست؛ عملیات متوقف شد');
  const rows = valueRanges.map(range => { if (!range || !Array.isArray(range.values) || !range.values.length) throw new Error('یکی از برگه‌های اصلی موجود نیست یا سرستون ندارد'); return range.values.slice(1); });
  const parseRows = (list, column, name) => list.map(row => {
    try { const item = JSON.parse(row[column]); if (!item || typeof item !== 'object' || Array.isArray(item)) throw Error(); return item; }
    catch (_) { throw new Error('ردیف نامعتبر در برگه ' + name + '؛ عملیات متوقف شد'); }
  });
  const tx = parseRows(rows[0], 13, 'Transactions');
  const rem = parseRows(rows[2], 1, 'Reminders');
  for (const list of [tx, rem]) { const ids = new Set(); for (const item of list) { if ((typeof item.id !== 'string' && typeof item.id !== 'number') || !String(item.id) || ids.has(String(item.id))) throw new Error('شناسه داده در شیت نامعتبر یا تکراری است'); ids.add(String(item.id)); } }
  const accounts = {};
  for (const row of rows[1]) { if (!row[0] || Object.prototype.hasOwnProperty.call(accounts, row[0])) throw new Error('ردیف حساب نامعتبر یا تکراری است'); accounts[String(row[0])] = String(row[1] || ''); }
  const log = rows[3].map(row => ({ at: Number(row[0]), ok: row[2] === true || row[2] === 'true', msg: String(row[3] || ''), raw: String(row[4] || '') }));
  if (log.some(item => !Number.isFinite(item.at))) throw new Error('تاریخ پیامک در شیت نامعتبر است');
  const profile = {}; for (const row of rows[4]) { if (row[0]) profile[String(row[0])] = String(row[1] || ''); }
  return { tx, accounts, rem, log, profile };
}
function legacyReferenceBackup(file, local) {
  if (!file || file.format !== 'expense-legacy-reference' || file.version !== 1 || file.sheetId !== LEGACY_REFERENCE_SHEET || !file.data || !local || !local.data) throw new Error('فایل مرجع شیت قدیمی معتبر نیست');
  const data = file.data;
  if (!Array.isArray(data.tx) || !Array.isArray(data.rem) || !Array.isArray(data.log) || !data.accounts || typeof data.accounts !== 'object' || Array.isArray(data.accounts)) throw new Error('اطلاعات فایل مرجع ناقص است');
  for (const list of [data.tx, data.rem]) { const ids = new Set(); for (const item of list) { if (!item || (typeof item.id !== 'string' && typeof item.id !== 'number') || !String(item.id) || ids.has(String(item.id))) throw new Error('شناسه اطلاعات فایل مرجع نامعتبر یا تکراری است'); ids.add(String(item.id)); } }
  for (const value of Object.values(data.accounts)) if (typeof value !== 'string') throw new Error('نام حساب فایل مرجع معتبر نیست');
  for (const item of data.log) if (!item || !Number.isFinite(item.at) || typeof item.ok !== 'boolean' || typeof item.msg !== 'string' || typeof item.raw !== 'string') throw new Error('اطلاعات پیامک فایل مرجع معتبر نیست');
  const merged = { ...local, data: { ...local.data, tx: JSON.stringify(data.tx), accounts: JSON.stringify(data.accounts), rem: JSON.stringify(data.rem), log: JSON.stringify(data.log), txDel: '[]', remDel: '[]', logDel: '[]', delAcc: '[]' } };
  validateFullBackup(merged);
  return merged;
}
async function legacyReferenceRestore(file) {
  try {
    if (!file || file.size > 5000000) throw new Error('فایل انتخاب‌شده معتبر نیست یا بیش از حد بزرگ است');
    if (googleTestBusy || directAutoRunning) throw new Error('عملیات اتصال در جریان است؛ پس از پایان دوباره تلاش کن');
    if (SYNC() || directReceiveLegacyAtBoot) throw new Error('ابتدا اتصال قدیمی را متوقف کن و برنامه را دوباره باز کن');
    const source = JSON.parse(await file.text());
    const snapshot = directSyncSnapshot(), value = DirectSyncCore.canonicalData(snapshot.data);
    const backup = legacyReferenceBackup(source, snapshot);
    const state = load('directSyncState', null);
    if (!state || !state.id || !state.base || !state.email) throw new Error('این دستگاه ابتدا باید به شیت اتصال مستقیم وصل شده باشد');
    const message = 'از شیت اصلی ' + source.data.tx.length.toLocaleString('fa-IR') + ' تراکنش و ' + source.data.rem.length.toLocaleString('fa-IR') + ' یادآوری روی این گوشی جایگزین می‌شود. حساب‌ها و پیامک‌های شیت نیز جایگزین می‌شوند؛ فاکتورها، رسیدها و سایر اطلاعات این گوشی حفظ می‌شوند. پشتیبان این گوشی را قبلاً ذخیره کرده‌ای؟';
    if (!confirm(message)) { directSyncMessage('بازگردانی لغو شد؛ اطلاعات تغییر نکرد.'); return; }
    if (!confirm('نسخهٔ قبلی در این گوشی نگهداری می‌شود. بازگردانی فقط روی همین گوشی انجام شود؟')) { directSyncMessage('بازگردانی لغو شد؛ اطلاعات تغییر نکرد.'); return; }
    directAutoStop('ارسال خودکار برای بازگردانی متوقف شد.');
    directReceiveApply(backup, value, state, state.base);
    alert('اطلاعات شیت اصلی روی این گوشی بازگردانی شد. فاکتورها و رسیدهای همین گوشی حفظ شدند. نسخهٔ قبلی در تنظیمات اتصال مستقیم موجود است. هنوز چیزی به شیت ارسال نشده است.');
    location.reload();
  } catch (error) { directSyncMessage('⚠️ بازگردانی انجام نشد: ' + (error.message || error)); }
}
function legacyReferenceRead() {
  if (googleTestBusy) { directSyncMessage('عملیات دیگری در حال انجام است.'); return; }
  const scope = directSyncScope();
  try {
    const client = google.accounts.oauth2.initTokenClient({ client_id: GOOGLE_TEST_CLIENT, scope,
      callback: async response => {
        try {
          if (response.error || !response.access_token) throw new Error('اجازه گوگل صادر نشد');
          directSyncCheckGranted(response, scope);
          const headers = { Authorization: 'Bearer ' + response.access_token };
          const ur = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers });
          if (!ur.ok) throw new Error('حساب گوگل بررسی نشد');
          const user = await ur.json();
          const ranges = ['Transactions!A:N','Accounts!A:B','Reminders!A:B','SMS!A:E','Profile!A:B'];
          const query = ranges.map(range => 'ranges=' + encodeURIComponent(range)).join('&');
          const responseSheet = await fetch('https://sheets.googleapis.com/v4/spreadsheets/' + LEGACY_REFERENCE_SHEET + '/values:batchGet?' + query, { headers });
          if (!responseSheet.ok) throw new Error(await directSyncReadError(responseSheet, user.email || 'نامشخص'));
          const legacy = legacyReferenceParse((await responseSheet.json()).valueRanges);
          const file = { format: 'expense-legacy-reference', version: 1, capturedAt: new Date().toISOString(), sheetId: LEGACY_REFERENCE_SHEET, data: legacy };
          const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob), link = document.createElement('a');
          link.href = url; link.download = 'expense-legacy-reference-' + Date.now() + '.json'; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
          directSyncMessage('✅ شیت قدیمی خوانده شد: ' + legacy.tx.length.toLocaleString('fa-IR') + ' تراکنش و ' + legacy.rem.length.toLocaleString('fa-IR') + ' یادآوری. فایل مرجع در دانلودها آماده شد؛ اطلاعات گوشی و شیت تغییر نکرد.');
        } catch (error) { directSyncMessage('⚠️ خواندن شیت قدیمی انجام نشد: ' + (error.message || error)); }
        finally { googleTestBusy = false; directSyncButtons(false); googleTestButton(); }
      }, error_callback: () => { googleTestBusy = false; directSyncButtons(false); googleTestButton(); directSyncMessage('⚠️ پنجره گوگل بسته شد یا باز نشد.'); }
    });
    googleTestBusy = true; directSyncButtons(true); googleTestButton(); directSyncMessage('در حال باز کردن اجازه گوگل…'); client.requestAccessToken({ prompt: 'select_account' });
  } catch (error) { googleTestBusy = false; directSyncButtons(false); googleTestButton(); directSyncMessage('⚠️ آماده‌سازی خواندن شیت ناموفق بود: ' + (error.message || error)); }
}
