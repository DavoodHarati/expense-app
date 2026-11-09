'use strict';

// The pending journal is written before any existing data is changed.
const DIRECT_RECEIVE_JOURNAL = 'directReceiveJournal';
let directReceiveRecovered = false;

function directReceiveArchivePrevious() {
  const raw = localStorage.getItem(DIRECT_RECEIVE_JOURNAL);
  if (!raw) return Promise.resolve();
  let journal;
  try { journal = JSON.parse(raw); } catch (_) { return Promise.reject(new Error('پشتیبان قبلی نامعتبر است؛ دریافت متوقف شد')); }
  if (journal.version !== 1 || journal.phase !== 'committed' || !journal.old || typeof journal.old !== 'object') return Promise.reject(new Error('پشتیبان قبلی آماده بایگانی نیست؛ دریافت متوقف شد'));
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('بایگانی پشتیبان در این مرورگر در دسترس نیست؛ پشتیبان قبلی را دانلود کن')); return; }
    const request = indexedDB.open('expense-direct-backups', 1);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains('backups')) request.result.createObjectStore('backups', { autoIncrement: true }); };
    request.onerror = () => reject(new Error('بازکردن بایگانی پشتیبان ناموفق بود؛ اطلاعات تغییر نکرد'));
    request.onblocked = () => reject(new Error('بایگانی پشتیبان باز نشد؛ تب‌های دیگر برنامه را ببند'));
    request.onsuccess = () => {
      const db = request.result;
      try {
        const transaction = db.transaction('backups', 'readwrite');
        transaction.objectStore('backups').add({ savedAt: Date.now(), journal: raw });
        transaction.oncomplete = () => {
          db.close();
          try {
            if (localStorage.getItem(DIRECT_RECEIVE_JOURNAL) !== raw) throw new Error('پشتیبان هنگام بایگانی تغییر کرد؛ دوباره تلاش کن');
            localStorage.removeItem(DIRECT_RECEIVE_JOURNAL); resolve();
          } catch (error) { reject(error); }
        };
        transaction.onerror = transaction.onabort = () => { db.close(); reject(new Error('ذخیره پشتیبان قبلی ناموفق بود؛ اطلاعات تغییر نکرد')); };
      } catch (_) { db.close(); reject(new Error('ذخیره پشتیبان قبلی ناموفق بود؛ اطلاعات تغییر نکرد')); }
    };
  });
}

function directReceiveRecover() {
  const raw = localStorage.getItem(DIRECT_RECEIVE_JOURNAL);
  if (!raw) return true;
  try {
    const journal = JSON.parse(raw);
    if (!journal || journal.version !== 1 || !['pending', 'committed'].includes(journal.phase) || !journal.old || typeof journal.old !== 'object' || Array.isArray(journal.old)) throw new Error('invalid journal');
    if (journal.phase === 'committed') return true;
    for (const [key, value] of Object.entries(journal.old)) {
      if (key === DIRECT_RECEIVE_JOURNAL || (value !== null && typeof value !== 'string')) throw new Error('invalid journal value');
      if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value);
    }
    localStorage.removeItem(DIRECT_RECEIVE_JOURNAL);
    directReceiveRecovered = true;
    return true;
  } catch (_) {
    const app = document.getElementById('app');
    if (app) app.textContent = 'بازیابی نسخه قبلی کامل نشد؛ اطلاعات پشتیبان در دستگاه باقی مانده است. برنامه را فعلاً تغییر نده.';
    return false;
  }
}

function directReceiveApply(backup, expectedLocal, state, headId) {
  validateFullBackup(backup);
  if (SYNC() || directReceiveLegacyAtBoot) throw new Error('اتصال قدیمی Apps Script باید غیرفعال باشد و برنامه پس از آن دوباره باز شود؛ دریافت انجام نشد');
  if (localStorage.getItem(DIRECT_RECEIVE_JOURNAL)) throw new Error('ابتدا پشتیبان قبل از دریافت قبلی را دانلود و تعیین تکلیف کن');
  if (DirectSyncCore.canonicalData(directSyncSnapshot().data) !== expectedLocal) throw new Error('اطلاعات دستگاه هنگام بررسی تغییر کرد؛ دوباره تلاش کن');
  const current = load('directSyncState', null);
  if (!current || current.id !== state.id || current.base !== state.base || current.email !== state.email) throw new Error('اتصال دستگاه هنگام بررسی تغییر کرد');
  const excluded = new Set(['sync', 'sync_bak', 'syncLock', 'sheetUrl', 'noSync', 'googleTestSheet', 'googleBackupCopy']);
  const targets = BACKUP_KEYS.filter(key => !excluded.has(key));
  const keys = [...new Set([...BACKUP_KEYS, 'directSyncState', 'dirty'])];
  const old = {};
  for (const key of keys) old[key] = localStorage.getItem(key);
  const fallback = makeFullBackup().data;
  const journal = { version: 1, phase: 'pending', old, missingTx: old.tx === null ? fallback.tx : null, missingAccounts: old.accounts === null ? fallback.accounts : null };
  localStorage.setItem(DIRECT_RECEIVE_JOURNAL, JSON.stringify(journal));
  try {
    for (const key of targets) {
      if (Object.prototype.hasOwnProperty.call(backup.data, key)) localStorage.setItem(key, backup.data[key]);
      else localStorage.removeItem(key);
    }
    localStorage.setItem('noSync', '1');
    localStorage.setItem('dirty', '1');
    localStorage.setItem('directSyncState', JSON.stringify({ ...state, base: headId }));
    journal.phase = 'committed';
    localStorage.setItem(DIRECT_RECEIVE_JOURNAL, JSON.stringify(journal));
  } catch (error) {
    if (!directReceiveRecover()) { location.reload(); throw new Error('دریافت متوقف شد؛ بازیابی نسخه قبلی نیاز به بررسی دارد'); }
    throw error;
  }
}

function directReceiveDownloadPrevious() {
  const raw = localStorage.getItem(DIRECT_RECEIVE_JOURNAL);
  if (!raw) throw new Error('پشتیبان قبل از دریافت وجود ندارد');
  directReceiveDownloadJournal(raw);
}

function directReceiveDownloadJournal(raw) {
  const journal = JSON.parse(raw);
  if (journal.version !== 1 || journal.phase !== 'committed') throw new Error('پشتیبان هنوز آماده نیست');
  const data = {};
  for (const key of BACKUP_KEYS) if (typeof journal.old[key] === 'string') data[key] = journal.old[key];
  if (!data.tx && journal.missingTx) data.tx = journal.missingTx;
  if (!data.accounts && journal.missingAccounts) data.accounts = journal.missingAccounts;
  const backup = { format: 'expense-app-backup', version: 1, createdAt: new Date().toISOString(), data };
  validateFullBackup(backup); directSyncDownload(backup);
}

function directReceiveDownloadArchived() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('بایگانی در این مرورگر در دسترس نیست')); return; }
    const request = indexedDB.open('expense-direct-backups', 1);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains('backups')) request.result.createObjectStore('backups', { autoIncrement: true }); };
    request.onerror = () => reject(new Error('بازکردن بایگانی ناموفق بود'));
    request.onblocked = () => reject(new Error('بایگانی باز نشد؛ تب‌های دیگر برنامه را ببند'));
    request.onsuccess = () => {
      const db = request.result;
      try {
        const transaction = db.transaction('backups', 'readonly');
        const cursor = transaction.objectStore('backups').openCursor(null, 'prev');
        cursor.onsuccess = () => {
          try { if (!cursor.result) throw new Error('پشتیبان بایگانی‌شده‌ای وجود ندارد'); directReceiveDownloadJournal(cursor.result.value.journal); resolve(); }
          catch (error) { reject(error); }
        };
        transaction.oncomplete = () => db.close();
        transaction.onabort = transaction.onerror = () => { db.close(); reject(new Error('خواندن بایگانی ناموفق بود')); };
      } catch (_) { db.close(); reject(new Error('خواندن بایگانی ناموفق بود')); }
    };
  });
}
