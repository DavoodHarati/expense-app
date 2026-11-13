'use strict';
const ACCOUNT_SWITCH_JOURNAL = 'accountSwitchJournal161';
const ACCOUNT_ARCHIVES = 'accountArchives';
const ACCOUNT_EPOCH = 'accountSwitchEpoch161';
let accountBootEpoch = localStorage.getItem(ACCOUNT_EPOCH) || '';
const ACCOUNT_LOCAL_KEYS = new Set(('tx accounts rem log ppl pplIgnored prc receiptArchive invoices invoiceCatalog cols pjobs cats icats ctypes svq carModels carColors carTypes defaultCustomerType job work bizMode budgets features layout dataOwner sel ord ord_settings ord_add txDel remDel logDel delAcc nameRej xrej sync sync_bak syncLock sheetUrl noSync googleTestSheet legacyInboxImported accountOwnerMismatchLock accountOwnerPendingEmail accountSwitchEpoch161 accountArchives directAutoPending directAutoReceiveEnabled directSyncCreatePending directSyncState directSyncWideSheets directReceiveJournal dirty easySetupExperimentV1 easy_auth_email easy_wizard_api easy_wizard_email easy_wizard_verified easy_local_test_users gcDay googleBackupCopy googleBackupCopyPending googleTestSheetPending lastBackupAt lastSync lastSyncOk legacyInboxAuto legacyInboxUrl legacySyncPaused remShown categoryMerge155Done categoryMerge155InProgress categoryMerge155Backup').split(' '));
function accountSwitchOwnedKey(key) { return ACCOUNT_LOCAL_KEYS.has(key); }

// A pending operation is always rolled back before the app reads its data.
function accountSwitchRecover() {
  const raw = localStorage.getItem(ACCOUNT_SWITCH_JOURNAL);
  if (!raw) return true;
  try {
    const journal = JSON.parse(raw);
    if (!journal || journal.version !== 1 || !journal.old || typeof journal.old !== 'object' || Array.isArray(journal.old)) throw new Error('دفترچه بازیابی معتبر نیست');
    if (journal.phase === 'committed') {
      const archives = JSON.parse(localStorage.getItem(ACCOUNT_ARCHIVES) || 'null');
      const entry = Array.isArray(archives) && archives.find(a => a.id === journal.archiveId);
      const expected = { ...journal.old }; delete expected[ACCOUNT_ARCHIVES]; delete expected[ACCOUNT_SWITCH_JOURNAL];
      let validSpace;
      if (journal.kind === 'restore') {
        const expectedData = journal.expected;
        if (!expectedData || typeof expectedData !== 'object' || Array.isArray(expectedData)) throw new Error('اطلاعات بازیابی معتبر نیست');
        const forbidden = ['sync', 'sync_bak', 'syncLock', 'sheetUrl', 'directSyncState', 'legacyInboxUrl', 'easySetupExperimentV1'];
        const pairs = Object.entries(expectedData);
        const allowed = new Set([ACCOUNT_EPOCH, ACCOUNT_ARCHIVES, 'accountOwnerMismatchLock', ...pairs.map(([key]) => key)]);
        const unexpected = []; for (let i = 0; i < localStorage.length; i++) { const key = localStorage.key(i); if (accountSwitchOwnedKey(key) && !allowed.has(key)) unexpected.push(key); }
        validSpace = pairs.every(([key, value]) => accountSwitchOwnedKey(key) && typeof value === 'string' && !forbidden.includes(key) && localStorage.getItem(key) === value) && !unexpected.length && forbidden.every(key => !localStorage.getItem(key));
      } else {
        const allowed = new Set([ACCOUNT_EPOCH, ACCOUNT_ARCHIVES, 'dataOwner', 'noSync', 'legacySyncPaused', 'accountOwnerMismatchLock']);
        const unexpected = []; for (let i = 0; i < localStorage.length; i++) { const key = localStorage.key(i); if (accountSwitchOwnedKey(key) && !allowed.has(key)) unexpected.push(key); }
        validSpace = !unexpected.length && !localStorage.getItem('sync') && !localStorage.getItem('sync_bak') && !localStorage.getItem('sheetUrl') && !localStorage.getItem('directSyncState');
      }
      if (!entry || entry.owner !== String(journal.old.dataOwner || '').trim().toLowerCase() || JSON.stringify(entry.values) !== JSON.stringify(expected) || !entry.backup || !entry.backup.data || !Array.isArray(JSON.parse(entry.backup.data.tx)) || !entry.backup.data.accounts || !validSpace || localStorage.getItem('dataOwner') !== journal.next) throw new Error('بررسی نهایی حساب کامل نشد');
      localStorage.removeItem('accountOwnerMismatchLock');
      localStorage.removeItem(ACCOUNT_SWITCH_JOURNAL);
      return true;
    }
    if (journal.phase !== 'pending') throw new Error('دفترچه بازیابی معتبر نیست');
    // Remove the partial new archive first to leave room for restoring the old data.
    const keys = []; for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i));
    for (const key of keys) if (accountSwitchOwnedKey(key)) localStorage.removeItem(key);
    for (const [key, value] of Object.entries(journal.old)) {
      if (key === ACCOUNT_SWITCH_JOURNAL || typeof value !== 'string') throw new Error('پشتیبان بازگردانی معتبر نیست');
      localStorage.setItem(key, value);
    }
    localStorage.setItem('accountOwnerMismatchLock', '1');
    localStorage.removeItem(ACCOUNT_SWITCH_JOURNAL);
    accountBootEpoch = localStorage.getItem(ACCOUNT_EPOCH) || '';
    return true;
  } catch (error) {
    try { localStorage.setItem('accountOwnerMismatchLock', '1'); } catch (_) {}
    const el = typeof document !== 'undefined' && document.getElementById('app');
    if (el) el.textContent = 'بازیابی اطلاعات نیمه‌تمام است. برنامه را تغییر نده؛ پشتیبان روی دستگاه حفظ شده است.';
    return false;
  }
}

function accountSwitchArchives() {
  const entries = JSON.parse(localStorage.getItem(ACCOUNT_ARCHIVES) || '[]');
  if (!Array.isArray(entries) || entries.some(a => !a || typeof a.id !== 'string' || typeof a.owner !== 'string' || !a.backup || !a.values || typeof a.values !== 'object')) throw new Error('آرشیو حساب‌ها معتبر نیست');
  return entries;
}

async function accountSwitchSeparate(archiveSave = accountSwitchArchive) {
  if (!accountOwnerLocked()) throw new Error('تعویض حساب در حال انتظار نیست');
  const next = (localStorage.getItem('accountOwnerPendingEmail') || '').trim().toLowerCase();
  const owner = (localStorage.getItem('dataOwner') || '').trim().toLowerCase();
  if (!next || !next.includes('@') || !owner || next === owner) throw new Error('حساب جدید مشخص نیست؛ دوباره با حساب جدید وارد گوگل شو');
  if (localStorage.getItem(ACCOUNT_SWITCH_JOURNAL) || localStorage.getItem('directAutoPending') || (typeof legacyInFlight !== 'undefined' && legacyInFlight) || (typeof directAutoRunning !== 'undefined' && directAutoRunning) || (typeof googleTestBusy !== 'undefined' && googleTestBusy)) throw new Error('عملیات قبلی هنوز تعیین تکلیف نشده است؛ جداسازی متوقف شد');
  const raw = await accountSwitchBackupPrepare(localStorage, makeFullBackup, validateFullBackup, archiveSave);
  if (!accountOwnerLocked() || localStorage.getItem('accountOwnerPendingEmail') !== next) throw new Error('حساب هنگام پشتیبان‌گیری تغییر کرد');
  const snapshot = JSON.parse(raw), old = Object.fromEntries(Object.entries(snapshot.values).filter(([key]) => accountSwitchOwnedKey(key)));
  const archives = accountSwitchArchives();
  const id = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
  const archivedValues = { ...old }; delete archivedValues[ACCOUNT_ARCHIVES]; delete archivedValues[ACCOUNT_SWITCH_JOURNAL];
  const archivedBackup = JSON.parse(JSON.stringify(snapshot.backup)); delete archivedBackup.data[ACCOUNT_ARCHIVES];
  validateFullBackup(archivedBackup);
  archives.push({ id, owner, createdAt: new Date().toISOString(), backup: archivedBackup, values: archivedValues });
  const journal = { version: 1, phase: 'pending', old, next, archiveId: id };
  // If this fails (e.g. insufficient space), no active data has changed.
  localStorage.setItem(ACCOUNT_SWITCH_JOURNAL, JSON.stringify(journal));
  try {
    localStorage.setItem(ACCOUNT_EPOCH, id);
    const keys = []; for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i));
    for (const key of keys) if (accountSwitchOwnedKey(key) && ![ACCOUNT_EPOCH, 'accountOwnerMismatchLock'].includes(key)) localStorage.removeItem(key);
    localStorage.setItem(ACCOUNT_ARCHIVES, JSON.stringify(archives));
    localStorage.setItem('dataOwner', next);
    localStorage.setItem('noSync', '1');
    localStorage.setItem('legacySyncPaused', '1');
    if (localStorage.getItem('dataOwner') !== next || accountSwitchArchives().at(-1).id !== id || localStorage.getItem('sync') || localStorage.getItem('sync_bak') || localStorage.getItem('sheetUrl') || localStorage.getItem('directSyncState')) throw new Error('بررسی جداسازی کامل نشد');
    journal.phase = 'committed'; localStorage.setItem(ACCOUNT_SWITCH_JOURNAL, JSON.stringify(journal));
  } catch (error) {
    if (!accountSwitchRecover()) throw new Error('بازیابی اطلاعات نیمه‌تمام است؛ برنامه را تغییر نده');
    throw error;
  }
  // Remain locked until a fresh page has verified the committed journal.
  return true;
}

// Restoring an archive is local only: old connection addresses never enter the active space.
async function accountSwitchRestore(index, archiveSave = accountSwitchArchive) {
  if (localStorage.getItem(ACCOUNT_SWITCH_JOURNAL) || localStorage.getItem('directAutoPending') || localStorage.getItem('directSyncCreatePending') || localStorage.getItem('googleBackupCopyPending') || (typeof legacyInFlight !== 'undefined' && legacyInFlight) || (typeof directAutoRunning !== 'undefined' && directAutoRunning) || (typeof googleTestBusy !== 'undefined' && googleTestBusy)) throw new Error('عملیات دیگری در حال انجام است؛ بازگردانی متوقف شد.');
  const selected = accountSwitchArchives()[index];
  if (!selected || !selected.owner || !selected.owner.includes('@')) throw new Error('آرشیو انتخاب‌شده یا ایمیل آن معتبر نیست.');
  validateFullBackup(selected.backup);
  const owner = (localStorage.getItem('dataOwner') || '').trim().toLowerCase();
  if (!owner || !owner.includes('@')) throw new Error('مالک فضای فعلی مشخص نیست؛ بازگردانی انجام نشد.');
  localStorage.setItem('accountOwnerMismatchLock', '1');
  if (typeof directAutoStop === 'function') directAutoStop();
  const raw = await accountSwitchBackupPrepare(localStorage, makeFullBackup, validateFullBackup, archiveSave);
  const snapshot = JSON.parse(raw), old = Object.fromEntries(Object.entries(snapshot.values).filter(([key]) => accountSwitchOwnedKey(key)));
  const archives = accountSwitchArchives(), entry = archives[index];
  if (!entry || entry.id !== selected.id || (localStorage.getItem('dataOwner') || '').trim().toLowerCase() !== owner) throw new Error('اطلاعات هنگام پشتیبان‌گیری تغییر کرد؛ بازگردانی متوقف شد.');
  const id = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
  const archivedValues = { ...old }; delete archivedValues[ACCOUNT_ARCHIVES]; delete archivedValues[ACCOUNT_SWITCH_JOURNAL];
  const archivedBackup = JSON.parse(JSON.stringify(snapshot.backup)); delete archivedBackup.data[ACCOUNT_ARCHIVES]; validateFullBackup(archivedBackup);
  archives.push({ id, owner, createdAt: new Date().toISOString(), backup: archivedBackup, values: archivedValues });
  const excluded = new Set(('sync sync_bak syncLock sheetUrl noSync legacySyncPaused directSyncState directAutoPending directAutoReceiveEnabled directSyncCreatePending directSyncWideSheets directReceiveJournal easySetupExperimentV1 easy_auth_email easy_wizard_api easy_wizard_email easy_wizard_verified easy_local_test_users googleBackupCopy googleBackupCopyPending googleTestSheet googleTestSheetPending legacyInboxAuto legacyInboxUrl accountOwnerPendingEmail accountOwnerMismatchLock accountSwitchEpoch161 accountArchives lastSync lastSyncOk').split(' '));
  const expected = {};
  for (const [key, value] of Object.entries(entry.values)) if (accountSwitchOwnedKey(key) && !excluded.has(key) && typeof value === 'string') expected[key] = value;
  expected.tx = entry.backup.data.tx; expected.accounts = entry.backup.data.accounts;
  expected.dataOwner = entry.owner.trim().toLowerCase(); expected.noSync = '1'; expected.legacySyncPaused = '1'; expected.dirty = '1';
  const journal = { version: 1, kind: 'restore', phase: 'pending', old, next: expected.dataOwner, archiveId: id, expected };
  localStorage.setItem(ACCOUNT_SWITCH_JOURNAL, JSON.stringify(journal));
  try {
    localStorage.setItem(ACCOUNT_EPOCH, id);
    const keys = []; for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i));
    for (const key of keys) if (accountSwitchOwnedKey(key) && ![ACCOUNT_EPOCH, 'accountOwnerMismatchLock'].includes(key)) localStorage.removeItem(key);
    localStorage.setItem(ACCOUNT_ARCHIVES, JSON.stringify(archives));
    for (const [key, value] of Object.entries(expected)) localStorage.setItem(key, value);
    if (Object.entries(expected).some(([key, value]) => localStorage.getItem(key) !== value) || accountSwitchArchives().at(-1).id !== id || ['sync','sync_bak','syncLock','sheetUrl','directSyncState','legacyInboxUrl','easySetupExperimentV1'].some(key => localStorage.getItem(key))) throw new Error('بررسی اطلاعات بازگردانی کامل نشد.');
    journal.phase = 'committed'; localStorage.setItem(ACCOUNT_SWITCH_JOURNAL, JSON.stringify(journal));
  } catch (error) {
    if (!accountSwitchRecover()) throw new Error('بازیابی نیمه‌تمام است؛ برنامه را تغییر نده.');
    throw error;
  }
  return true; // The next page load verifies the journal before unlocking.
}

async function accountSwitchRestoreClick() {
  try {
    const select = document.getElementById('account-archive-select');
    const index = select && Number(select.value), entry = accountSwitchArchives()[index];
    if (!entry) throw new Error('ابتدا یک آرشیو انتخاب کن.');
    if (!confirm('بازگردانی آرشیو ' + entry.owner + '؟ ابتدا همه صفحه‌های دیگر برنامه را ببند. از فضای فعلی پشتیبان خودکار گرفته می‌شود.')) return;
    if (!confirm('اطلاعات فعلی جایگزین می‌شود. اتصال شیت قدیمی بازگردانده نمی‌شود. بازگردانی انجام شود؟')) return;
    await accountSwitchRestore(index);
    alert('بازگردانی آماده شد؛ برنامه برای بررسی نهایی دوباره باز می‌شود.');
    location.reload();
  } catch (error) { if (typeof refreshInfo159 === 'function') refreshInfo159(); alert('بازگردانی انجام نشد: ' + (error.message || 'خطای نامشخص') + '؛ قفل حساب را بررسی کن.'); }
}

function accountSwitchDownloadArchive(index) {
  const entries = accountSwitchArchives();
  if (!entries.length) throw new Error('آرشیوی در این دستگاه وجود ندارد');
  const entry = Number.isInteger(index) ? entries[index] : entries[entries.length - 1];
  if (!entry) throw new Error('آرشیو انتخاب‌شده پیدا نشد');
  validateFullBackup(entry.backup);
  const url = URL.createObjectURL(new Blob([JSON.stringify(entry.backup, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = 'expense-account-archive.json'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function accountSwitchOpen() {
  if (!accountOwnerLocked()) return;
  let dialog = document.getElementById('account-switch-dialog');
  if (!dialog) {
    dialog = document.createElement('dialog'); dialog.id = 'account-switch-dialog'; dialog.dir = 'rtl';
    dialog.innerHTML = '<b>حساب گوگل تغییر کرده است</b><p>اطلاعات حساب قبلی آرشیو می‌شود و حساب جدید فضای خالی خواهد داشت. شیت قبلی تغییر نمی‌کند. پیش از ادامه همهٔ صفحه‌های دیگر برنامه را ببند.</p><div id="account-switch-message" aria-live="polite"></div><button type="button" id="account-switch-separate">جدا نگه دار</button> <button type="button" id="account-switch-later" class="sec">بعداً</button>';
    document.body.appendChild(dialog);
    dialog.querySelector('#account-switch-later').onclick = () => dialog.close();
    dialog.querySelector('#account-switch-separate').onclick = async () => {
      const button = dialog.querySelector('#account-switch-separate'), message = dialog.querySelector('#account-switch-message');
      button.disabled = true;
      try {
        if (!localStorage.getItem('accountOwnerPendingEmail')) {
          if (!window.google?.accounts?.oauth2) throw new Error('سرویس گوگل آماده نیست؛ اینترنت را بررسی کن و دوباره تلاش کن.');
          const email = await new Promise((resolve, reject) => {
            const client = google.accounts.oauth2.initTokenClient({ client_id: GOOGLE_TEST_CLIENT, scope: 'openid email', callback: async response => {
              try { if (!response.access_token) throw new Error('اجازه گوگل صادر نشد'); const r = await accountOwnerFetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: 'Bearer ' + response.access_token } }); if (!r.ok) throw new Error('حساب گوگل مشخص نشد'); resolve((await r.json()).email); } catch (error) { reject(error); }
            }, error_callback: () => reject(new Error('پنجره گوگل بسته شد')) });
            client.requestAccessToken({ prompt: 'select_account' });
          });
          try { accountOwnerIdentify(email); } catch (_) {}
        }
        message.textContent = 'در حال ذخیره و بررسی پشتیبان…';
        await accountSwitchSeparate();
        message.textContent = 'جداسازی آماده شد؛ برنامه دوباره باز می‌شود.';
        location.reload();
      } catch (error) { message.textContent = '⚠️ ' + (error.message || 'جداسازی انجام نشد؛ اطلاعات و قفل حفظ شدند.'); button.disabled = false; }
    };
  }
  const message = dialog.querySelector('#account-switch-message');
  message.textContent = 'پیش از جداسازی، پشتیبان کامل روی همین دستگاه ذخیره و بررسی می‌شود.';
  if (!dialog.open) dialog.showModal();
}
