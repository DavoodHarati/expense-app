'use strict';

// پیش‌نمایش فقط‌خواندنی است: اتصال، ذخیره‌سازی و تراکنش‌ها را تغییر نمی‌دهد.
function accountSwitchPreview157(oldOwner, newOwner, hasLocalData, localRows, remoteRows) {
  const owner = value => String(value || '').trim().toLowerCase();
  const oldId = owner(oldOwner), nextId = owner(newOwner);
  if (!nextId) throw new Error('حساب جدید مشخص نیست');
  if (!Array.isArray(localRows) || !Array.isArray(remoteRows)) throw new Error('فهرست تراکنش‌ها معتبر نیست');
  const sameOwner = !!oldId && oldId === nextId;
  const needsChoice = !sameOwner && (!!oldId || !!hasLocalData);
  const normalize = value => String(value ?? '').trim().replace(/\s+/g, ' ');
  const identity = row => row && row.id !== undefined && row.id !== null && String(row.id).trim() ? String(row.id).trim() : null;
  const fingerprint = row => {
    if (!row || row.amount === undefined || row.amount === null || !normalize(row.date) || !normalize(row.desc)) return null;
    const amount = Number(row.amount);
    return Number.isFinite(amount) ? JSON.stringify([normalize(row.date), amount, normalize(row.desc)]) : null;
  };
  const ids = new Set(remoteRows.map(identity).filter(Boolean));
  const fingerprints = new Set(remoteRows.map(fingerprint).filter(Boolean));
  let added = 0, duplicates = 0;
  for (const row of localRows) {
    const id = identity(row), key = fingerprint(row);
    if ((id && ids.has(id)) || (key && fingerprints.has(key))) { duplicates++; continue; }
    added++;
    if (id) ids.add(id);
    if (key) fingerprints.add(key);
  }
  return { sameOwner, needsChoice, added, duplicates };
}

if (typeof module !== 'undefined' && module.exports) module.exports = { accountSwitchPreview157 };
