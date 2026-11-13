'use strict';

// Preparation only. This does not switch accounts, delete data, or contact Google.
async function accountSwitchBackupPrepare(storage, makeBackup, validateBackup, archive) {
  const backup = makeBackup();
  validateBackup(backup); // Backups created before dataOwner was introduced remain valid.
  const values = Object.create(null);
  const count = storage.length;
  for (let i = 0; i < count; i++) {
    const key = storage.key(i);
    if (typeof key !== 'string') throw new Error('خواندن اطلاعات گوشی کامل نشد');
    const value = storage.getItem(key);
    if (typeof value !== 'string') throw new Error('اطلاعات گوشی هنگام پشتیبان‌گیری تغییر کرد');
    values[key] = value;
  }
  if (storage.length !== count || Object.keys(values).length !== count || Object.keys(values).some(key => storage.getItem(key) !== values[key])) throw new Error('اطلاعات گوشی هنگام پشتیبان‌گیری تغییر کرد');
  const raw = JSON.stringify({ version: 1, createdAt: new Date().toISOString(), backup, values });
  const saved = await archive(raw);
  if (saved !== raw) throw new Error('پشتیبان ذخیره و دوباره بررسی نشد');
  // Another open page may have changed the data while IndexedDB was writing.
  if (storage.length !== count || Object.keys(values).some(key => storage.getItem(key) !== values[key])) throw new Error('اطلاعات هنگام ذخیره پشتیبان تغییر کرد؛ دوباره تلاش کن');
  return raw;
}

// Persist in IndexedDB and read back after the write has committed.
function accountSwitchArchive(raw) {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('ذخیره پشتیبان در این مرورگر در دسترس نیست')); return; }
    const open = indexedDB.open('expense-account-switch-backups', 1);
    open.onupgradeneeded = () => { if (!open.result.objectStoreNames.contains('backups')) open.result.createObjectStore('backups', { autoIncrement: true }); };
    open.onerror = open.onblocked = () => reject(new Error('بازکردن محل پشتیبان ممکن نشد'));
    open.onsuccess = () => {
      const db = open.result;
      try {
        const tx = db.transaction('backups', 'readwrite');
        const request = tx.objectStore('backups').add(raw);
        let id;
        request.onsuccess = () => { id = request.result; };
        tx.onabort = tx.onerror = () => { db.close(); reject(new Error('ذخیره پشتیبان ناموفق بود')); };
        tx.oncomplete = () => {
          try {
            const check = db.transaction('backups', 'readonly');
            const read = check.objectStore('backups').get(id);
            let result;
            read.onsuccess = () => { result = read.result; };
            check.oncomplete = () => { db.close(); resolve(result); };
            check.onabort = check.onerror = () => { db.close(); reject(new Error('بازخوانی پشتیبان ناموفق بود')); };
          } catch (_) { db.close(); reject(new Error('بازخوانی پشتیبان ناموفق بود')); }
        };
      } catch (_) { db.close(); reject(new Error('ذخیره پشتیبان ناموفق بود')); }
    };
  });
}

if (typeof module !== 'undefined' && module.exports) module.exports = { accountSwitchBackupPrepare, accountSwitchArchive };
