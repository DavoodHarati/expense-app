'use strict';
// Separate from syncLock, which protects the legacy URL.
const ACCOUNT_OWNER_LOCK_KEY = 'accountOwnerMismatchLock';
const ACCOUNT_OWNER_LOCK_MESSAGE = 'حساب گوگل با مالک اطلاعات این گوشی متفاوت است؛ همگام‌سازی متوقف شد.';
let accountOwnerMemoryLock = false;
function accountOwnerLocked() { return accountOwnerMemoryLock || localStorage.getItem(ACCOUNT_OWNER_LOCK_KEY) === '1'; }
function accountOwnerAssert() { if (accountOwnerLocked()) throw new Error(ACCOUNT_OWNER_LOCK_MESSAGE); }
function accountOwnerIdentify(email) {
  accountOwnerAssert();
  const next = String(email || '').trim().toLowerCase();
  if (!next || !next.includes('@')) throw new Error('ایمیل حساب گوگل مشخص نیست.');
  const owner = String(localStorage.getItem('dataOwner') || '').trim().toLowerCase();
  if (!owner) { localStorage.setItem('dataOwner', next); if (typeof refreshInfo159 === 'function') refreshInfo159(); return; }
  if (owner !== next) {
    accountOwnerMemoryLock = true;
    try { localStorage.setItem(ACCOUNT_OWNER_LOCK_KEY, '1'); } finally {
      if (typeof directAutoStop === 'function') directAutoStop('⚠️ ' + ACCOUNT_OWNER_LOCK_MESSAGE);
    }
    if (typeof refreshInfo159 === 'function') refreshInfo159();
    throw new Error(ACCOUNT_OWNER_LOCK_MESSAGE);
  }
}
async function accountOwnerFetch(url, options) {
  const isIdentity = String(url) === 'https://openidconnect.googleapis.com/v1/userinfo';
  if (!isIdentity) accountOwnerAssert();
  const result = await fetch(url, options);
  if (!isIdentity) accountOwnerAssert();
  return result;
}
